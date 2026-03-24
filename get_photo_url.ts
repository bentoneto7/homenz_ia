import { getDb } from './server/db';
import { leadPhotos } from './drizzle/schema';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const db = getDb();
  const photos = await db.select({
    id: leadPhotos.id,
    leadId: leadPhotos.leadId,
    photoType: leadPhotos.photoType,
    s3Url: leadPhotos.s3Url,
  })
  .from(leadPhotos)
  .where(eq(leadPhotos.photoType, 'front'))
  .orderBy(desc(leadPhotos.id))
  .limit(5);
  
  console.log('Front photos found:', photos.length);
  for (const p of photos) {
    console.log(`ID:${p.id} Lead:${p.leadId} Type:${p.photoType} URL:${p.s3Url}`);
  }
  process.exit(0);
}
main().catch(console.error);
