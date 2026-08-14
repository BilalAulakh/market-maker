import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema, kycSubmissionSchema } from "@/lib/validations/auth";

describe("Authentication & KYC Validation Schemas (auth.ts)", () => {
  describe("loginSchema", () => {
    it("should accept valid email and password", () => {
      const valid = {
        email: "trader@aurafx.demo",
        password: "Password123!",
      };
      const res = loginSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const invalid = {
        email: "not-an-email",
        password: "Password123!",
      };
      const res = loginSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain("valid email address");
      }
    });

    it("should reject password shorter than 6 characters", () => {
      const invalid = {
        email: "user@example.com",
        password: "123",
      };
      const res = loginSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    it("should accept a complete, valid registration form", () => {
      const valid = {
        firstName: "Alexander",
        lastName: "Wright",
        email: "alexander@example.com",
        password: "SecurePassword1",
        phone: "+447911123456",
        country: "United Kingdom",
      };
      const res = registerSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("should reject registration password without uppercase letter", () => {
      const invalid = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123", // no uppercase
        country: "United Kingdom",
      };
      const res = registerSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain("uppercase letter");
      }
    });

    it("should reject registration password without number", () => {
      const invalid = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "PasswordOnly", // no number
        country: "United Kingdom",
      };
      const res = registerSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toContain("number");
      }
    });

    it("should reject missing first or last name", () => {
      const invalid = {
        firstName: "",
        lastName: "Doe",
        email: "john@example.com",
        password: "Password123",
        country: "United Kingdom",
      };
      const res = registerSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe("kycSubmissionSchema", () => {
    it("should accept valid KYC passport submission", () => {
      const valid = {
        documentType: "passport",
        documentNumber: "GBR123456789",
        countryOfIssue: "United Kingdom",
        expirationDate: "2032-12-31",
      };
      const res = kycSubmissionSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it("should reject invalid document type", () => {
      const invalid = {
        documentType: "credit_card",
        documentNumber: "123456789",
        countryOfIssue: "United Kingdom",
        expirationDate: "2032-12-31",
      };
      const res = kycSubmissionSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });
});
