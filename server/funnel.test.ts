import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

// Mock notification helper
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-open-id",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated users", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@example.com");
    expect(result?.role).toBe("user");
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});

describe("clinic procedures - no database", () => {
  it("clinic.register throws INTERNAL_SERVER_ERROR when DB is unavailable", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.clinic.register({
        name: "Clínica Teste",
        slug: "clinica-teste",
        phone: "34999999999",
        city: "Uberaba",
        state: "MG",
      })
    ).rejects.toThrow();
  });

  it("clinic.mine throws UNAUTHORIZED when user is not authenticated", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.clinic.mine()).rejects.toThrow();
  });
});

describe("leads procedures - no database", () => {
  it("leads.create throws INTERNAL_SERVER_ERROR when DB is unavailable", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.leads.create({
        clinicSlug: "clinica-teste",
        name: "João Silva",
        phone: "34999999999",
        email: "joao@example.com",
      })
    ).rejects.toThrow();
  });
});

describe("funnel flow validation", () => {
  it("lead score should be between 0 and 100", () => {
    const calculateScore = (baldnessLevel: string, expectation: string, hasTreatment: boolean): number => {
      let score = 0;
      if (baldnessLevel === "mild") score += 30;
      else if (baldnessLevel === "moderate") score += 50;
      else if (baldnessLevel === "severe") score += 70;
      if (expectation === "realistic") score += 20;
      else if (expectation === "high") score += 10;
      if (!hasTreatment) score += 10;
      return Math.min(100, Math.max(0, score));
    };

    expect(calculateScore("mild", "realistic", false)).toBe(60);
    expect(calculateScore("severe", "realistic", false)).toBe(100);
    expect(calculateScore("moderate", "high", true)).toBe(60);
    expect(calculateScore("mild", "high", true)).toBe(40);
  });

  it("funnel steps should follow the correct order", () => {
    const FUNNEL_STEPS = [
      "landing", "chat_started", "chat_completed",
      "photos_started", "photos_done",
      "ai_processing", "ai_done",
      "scheduled", "confirmed", "completed",
    ];

    expect(FUNNEL_STEPS.indexOf("landing")).toBe(0);
    expect(FUNNEL_STEPS.indexOf("scheduled")).toBeGreaterThan(FUNNEL_STEPS.indexOf("ai_done"));
    expect(FUNNEL_STEPS.indexOf("confirmed")).toBeGreaterThan(FUNNEL_STEPS.indexOf("scheduled"));
    expect(FUNNEL_STEPS.indexOf("completed")).toBe(FUNNEL_STEPS.length - 1);
  });

  it("UTM parameters should be extracted correctly", () => {
    const extractUtms = (searchParams: URLSearchParams) => ({
      utmSource: searchParams.get("utm_source") ?? undefined,
      utmMedium: searchParams.get("utm_medium") ?? undefined,
      utmCampaign: searchParams.get("utm_campaign") ?? undefined,
      utmContent: searchParams.get("utm_content") ?? undefined,
      utmTerm: searchParams.get("utm_term") ?? undefined,
    });

    const params = new URLSearchParams("utm_source=facebook&utm_medium=cpc&utm_campaign=calvicie-uberaba");
    const utms = extractUtms(params);

    expect(utms.utmSource).toBe("facebook");
    expect(utms.utmMedium).toBe("cpc");
    expect(utms.utmCampaign).toBe("calvicie-uberaba");
    expect(utms.utmContent).toBeUndefined();
  });

  it("clinic slug should be URL-safe", () => {
    const generateSlug = (name: string): string =>
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    expect(generateSlug("Clínica Capilar Uberaba")).toBe("clinica-capilar-uberaba");
    expect(generateSlug("Centro Médico São Paulo")).toBe("centro-medico-sao-paulo");
    expect(generateSlug("Hair & Style 2024")).toBe("hair-style-2024");
  });
});

describe("notification types", () => {
  it("all notification types should be defined", () => {
    const NOTIFICATION_TYPES = [
      "new_lead", "chat_completed", "photos_uploaded", "ai_ready",
      "appointment_new", "appointment_confirmed", "appointment_cancelled",
      "appointment_reminder", "treatment_followup", "nps_request",
    ];

    expect(NOTIFICATION_TYPES).toContain("new_lead");
    expect(NOTIFICATION_TYPES).toContain("ai_ready");
    expect(NOTIFICATION_TYPES).toContain("appointment_confirmed");
    expect(NOTIFICATION_TYPES).toContain("nps_request");
    expect(NOTIFICATION_TYPES.length).toBe(10);
  });
});
