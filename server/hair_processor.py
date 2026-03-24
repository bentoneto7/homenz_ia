#!/usr/bin/env python3
"""
Hair Density Processor - Server-side script
Called by Node.js to process hair density on a photo.
Input: image URL or local path
Output: processed image saved to output path

Usage: python3 hair_processor.py <input_url_or_path> <output_path>
"""

import sys
import os
import cv2
import numpy as np
import urllib.request
import tempfile

def download_image(url):
    """Download image from URL to temp file"""
    suffix = '.jpg' if 'jpg' in url.lower() or 'jpeg' in url.lower() else '.png'
    tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    urllib.request.urlretrieve(url, tmp.name)
    return tmp.name

def detect_face_region(img):
    """Detect face using OpenCV Haar Cascade — returns (face_mask, face_rect)"""
    h, w = img.shape[:2]
    face_mask = np.zeros((h, w), dtype=np.uint8)
    face_rect = None
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    faces = face_cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=3, minSize=(50, 50)
    )
    
    if len(faces) > 0:
        largest = max(faces, key=lambda f: f[2] * f[3])
        x, y, fw, fh = largest
        face_rect = (x, y, fw, fh)
        pad_x = int(fw * 0.20)
        pad_y_top = int(fh * 0.05)
        pad_y_bot = int(fh * 0.40)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y_top)
        x2 = min(w, x + fw + pad_x)
        y2 = min(h, y + fh + pad_y_bot)
        face_mask[y1:y2, x1:x2] = 255
    else:
        # Fallback: protect bottom 65% of image
        face_start = int(h * 0.35)
        face_mask[face_start:, :] = 255
        face_rect = (int(w*0.15), int(h*0.35), int(w*0.7), int(h*0.55))
    
    return face_mask, face_rect

def detect_hair_color(img, face_rect):
    """Sample hair color from dark pixels in scalp region above face"""
    h, w = img.shape[:2]
    x, y, fw, fh = face_rect
    
    # Look for hair in the top portion above the face
    top_y = max(0, y - int(fh * 0.5))
    hair_region = img[top_y:y, max(0, x - int(fw*0.1)):min(w, x + fw + int(fw*0.1))]
    
    if hair_region.size == 0:
        hair_region = img[:int(h * 0.30), :]
    
    gray_top = cv2.cvtColor(hair_region, cv2.COLOR_BGR2GRAY)
    dark_mask = gray_top < 80
    
    if np.sum(dark_mask) > 50:
        pixels = hair_region[dark_mask]
        return np.mean(pixels, axis=0), np.std(pixels, axis=0)
    
    # Fallback: use darkest 20% of pixels
    threshold = np.percentile(gray_top, 20)
    dark_mask = gray_top < threshold
    if np.sum(dark_mask) > 10:
        pixels = hair_region[dark_mask]
        return np.mean(pixels, axis=0), np.std(pixels, axis=0)
    
    return np.array([25, 20, 18], dtype=np.float32), np.array([8, 6, 6], dtype=np.float32)

def create_scalp_mask(img, face_mask, face_rect):
    """Find scalp/thinning areas: skin-colored pixels in scalp zone above face"""
    h, w = img.shape[:2]
    x, y, fw, fh = face_rect
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Skin-like pixels: medium brightness, warm hue
    brightness_ok = (gray >= 50) & (gray <= 200)
    skin_hue = (hsv[:, :, 0] <= 25) | (hsv[:, :, 0] >= 165)
    skin_sat = (hsv[:, :, 1] >= 10) & (hsv[:, :, 1] <= 220)
    scalp_candidate = brightness_ok & skin_hue & skin_sat
    
    # Only in scalp zone: from top to just above face + small margin
    scalp_bottom = min(h, y + int(fh * 0.10))  # Slightly into hairline
    region = np.zeros((h, w), dtype=bool)
    region[:scalp_bottom, :] = True
    scalp_candidate = scalp_candidate & region
    
    # Exclude face
    scalp_candidate = scalp_candidate & (face_mask == 0)
    
    # Also include medium-dark areas that are lighter than hair (thinning)
    # These are areas where scalp is visible through thin hair
    medium_dark = (gray >= 35) & (gray <= 130)
    thinning_zone = medium_dark & region & (face_mask == 0)
    
    # Combine both
    combined = scalp_candidate | thinning_zone
    
    # Morphological cleanup
    kernel = np.ones((9, 9), np.uint8)
    mask = combined.astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    
    return mask

def apply_hair_fill(img, scalp_mask, hair_color, hair_std, face_mask):
    """Apply hair color fill to scalp areas with feathered blending"""
    output = img.copy().astype(np.float32)
    
    filled_area = np.sum(scalp_mask > 0)
    if filled_area < 20:
        # Very little to fill — still darken hair area for volume effect
        return enhance_hair_volume(img, face_mask)
    
    # Feathered mask with strong blend
    feathered = cv2.GaussianBlur(scalp_mask.astype(np.float32) / 255.0, (21, 21), 0)
    
    # Hair fill with subtle noise for realism
    np.random.seed(42)
    noise_std = float(np.mean(hair_std) * 0.3)
    noise_std = max(noise_std, 5.0)
    noise = np.random.normal(0, noise_std, img.shape).astype(np.float32)
    hair_fill = np.full_like(output, hair_color) + noise
    hair_fill = np.clip(hair_fill, 0, 255)
    
    # Strong blend: 85% hair color in sparse areas
    alpha = feathered[:, :, np.newaxis] * 0.85
    output = alpha * hair_fill + (1.0 - alpha) * output
    
    # Darken the filled area slightly to match hair density
    darken_alpha = feathered[:, :, np.newaxis] * 0.25
    output = output * (1.0 - darken_alpha)
    
    # Restore face region EXACTLY — pixel-perfect
    face_bool = (face_mask > 0)[:, :, np.newaxis]
    output = np.where(face_bool, img.astype(np.float32), output)
    
    return np.clip(output, 0, 255).astype(np.uint8)

def enhance_hair_volume(img, face_mask):
    """Enhance existing hair to look denser when there's little scalp to fill"""
    output = img.copy().astype(np.float32)
    h, w = img.shape[:2]
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Find hair pixels (dark) in non-face area
    hair_pixels = (gray < 90) & (face_mask == 0)
    
    if np.sum(hair_pixels) > 100:
        # Darken hair pixels to increase density appearance
        darken_mask = hair_pixels[:, :, np.newaxis].astype(np.float32) * 0.20
        output = output * (1.0 - darken_mask)
        
        # Restore face
        face_bool = (face_mask > 0)[:, :, np.newaxis]
        output = np.where(face_bool, img.astype(np.float32), output)
    
    return np.clip(output, 0, 255).astype(np.uint8)

def add_hair_density_overlay(img, face_mask, face_rect, hair_color):
    """Add a subtle hair density overlay on top of the scalp zone"""
    h, w = img.shape[:2]
    x, y, fw, fh = face_rect
    output = img.copy().astype(np.float32)
    
    # Create a gradient overlay in the scalp zone
    scalp_top = 0
    scalp_bottom = y + int(fh * 0.05)
    scalp_left = max(0, x - int(fw * 0.15))
    scalp_right = min(w, x + fw + int(fw * 0.15))
    
    if scalp_bottom <= scalp_top or scalp_right <= scalp_left:
        return img
    
    # Create hair strand texture using random dark lines
    np.random.seed(123)
    overlay = np.zeros((h, w, 3), dtype=np.float32)
    
    zone_h = scalp_bottom - scalp_top
    zone_w = scalp_right - scalp_left
    
    # Add hair strands as thin dark lines
    num_strands = max(50, zone_w * zone_h // 30)
    for _ in range(num_strands):
        sx = np.random.randint(scalp_left, scalp_right)
        sy = np.random.randint(scalp_top, scalp_bottom)
        length = np.random.randint(5, 20)
        angle = np.random.uniform(-30, 30)  # Mostly vertical
        
        ex = int(sx + length * np.sin(np.radians(angle)))
        ey = int(sy + length * np.cos(np.radians(angle)))
        
        # Clip to bounds
        ex = max(scalp_left, min(scalp_right-1, ex))
        ey = max(scalp_top, min(scalp_bottom-1, ey))
        
        color = (
            float(hair_color[0]) * np.random.uniform(0.7, 1.0),
            float(hair_color[1]) * np.random.uniform(0.7, 1.0),
            float(hair_color[2]) * np.random.uniform(0.7, 1.0),
        )
        cv2.line(overlay, (sx, sy), (ex, ey), color, 1)
    
    # Blur overlay for realism
    overlay = cv2.GaussianBlur(overlay, (3, 3), 1)
    
    # Apply overlay only where there's no face and in scalp zone
    scalp_region = np.zeros((h, w), dtype=np.float32)
    scalp_region[scalp_top:scalp_bottom, scalp_left:scalp_right] = 1.0
    face_exclude = (face_mask == 0).astype(np.float32)
    apply_region = (scalp_region * face_exclude)[:, :, np.newaxis]
    
    # Check if overlay has content
    overlay_strength = (overlay.sum(axis=2) > 0).astype(np.float32)[:, :, np.newaxis]
    
    # Blend overlay
    blend = 0.60
    output = output * (1.0 - apply_region * overlay_strength * blend) + overlay * apply_region * overlay_strength * blend + output * apply_region * overlay_strength * (1.0 - blend)
    
    # Restore face
    face_bool = (face_mask > 0)[:, :, np.newaxis]
    output = np.where(face_bool, img.astype(np.float32), output)
    
    return np.clip(output, 0, 255).astype(np.uint8)

def process(input_path_or_url, output_path):
    # Download if URL
    tmp_file = None
    if input_path_or_url.startswith('http'):
        tmp_file = download_image(input_path_or_url)
        input_path = tmp_file
    else:
        input_path = input_path_or_url
    
    img = cv2.imread(input_path)
    if img is None:
        print(f"ERROR: Cannot load image from {input_path}", file=sys.stderr)
        sys.exit(1)
    
    # Step 1: Detect face (protected zone)
    face_mask, face_rect = detect_face_region(img)
    
    # Step 2: Get hair color
    hair_color, hair_std = detect_hair_color(img, face_rect)
    
    # Step 3: Find scalp/thinning areas
    scalp_mask = create_scalp_mask(img, face_mask, face_rect)
    
    # Step 4: Fill sparse areas with hair
    result = apply_hair_fill(img, scalp_mask, hair_color, hair_std, face_mask)
    
    # Step 5: Add hair strand overlay for density
    result = add_hair_density_overlay(result, face_mask, face_rect, hair_color)
    
    # Step 6: Final face protection — CRITICAL
    # Copy face region pixel-perfectly from original
    face_bool = face_mask > 0
    result[face_bool] = img[face_bool]
    
    # Save
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
    cv2.imwrite(output_path, result)
    
    if tmp_file:
        try:
            os.unlink(tmp_file)
        except:
            pass
    
    print(output_path)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 hair_processor.py <input> <output>", file=sys.stderr)
        sys.exit(1)
    process(sys.argv[1], sys.argv[2])
