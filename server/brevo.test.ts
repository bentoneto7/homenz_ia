import { describe, it, expect } from "vitest";

describe("Brevo API Key Validation", () => {
  it("should have BREVO_API_KEY configured", () => {
    expect(process.env.BREVO_API_KEY).toBeDefined();
    expect(process.env.BREVO_API_KEY?.length).toBeGreaterThan(20);
  });

  it("should connect to Brevo API and validate key", { timeout: 15000 }, async () => {
    const response = await fetch("https://api.brevo.com/v3/account", {
      headers: {
        "api-key": process.env.BREVO_API_KEY!,
        "accept": "application/json",
      },
    });
    expect(response.status).toBe(200);
    const data = await response.json() as { email: string; plan: unknown[] };
    expect(data.email).toBeDefined();
    console.log("[Brevo] Account validated:", data.email);
  });
});
