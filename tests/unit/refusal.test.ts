import { describe, it, expect } from "vitest";
import { createClientRefusal, isClientRefusal } from "@/lib/auth/refusal";

describe("Rule 6 Client Refusal Compliance (refusal.ts)", () => {
  it("should create a valid refusal with what happened, why, resolution, and destination", () => {
    const refusal = createClientRefusal({
      code: "WITHDRAWAL_KYC_REQUIRED",
      whatHappened: "Withdrawal request could not be processed.",
      why: "Your account KYC status is currently unverified.",
      howToResolve: "Please upload your identity documents in the verification portal.",
      whereToGo: {
        label: "Go to KYC Verification",
        url: "/kyc",
      },
    });

    expect(refusal.success).toBe(false);
    expect(refusal.code).toBe("WITHDRAWAL_KYC_REQUIRED");
    expect(refusal.whatHappened).toBe("Withdrawal request could not be processed.");
    expect(refusal.why).toBe("Your account KYC status is currently unverified.");
    expect(refusal.howToResolve).toBe("Please upload your identity documents in the verification portal.");
    expect(refusal.whereToGo.url).toBe("/kyc");
    expect(isClientRefusal(refusal)).toBe(true);
  });

  it("should throw error if any required refusal component is missing", () => {
    expect(() =>
      createClientRefusal({
        code: "BARE_ERROR",
        whatHappened: "Failed",
        why: "",
        howToResolve: "Fix it",
        whereToGo: { label: "Home", url: "/" },
      })
    ).toThrow("Client refusal must include what happened, why, how to resolve, and a destination link.");
  });

  it("should identify non-refusal objects via isClientRefusal type guard", () => {
    expect(isClientRefusal(null)).toBe(false);
    expect(isClientRefusal(undefined)).toBe(false);
    expect(isClientRefusal({ success: true, data: {} })).toBe(false);
    expect(isClientRefusal({ success: false, error: "generic error" })).toBe(false);
  });
});
