import { describe, it, expect } from "vitest";
import {
  isValidKycTransition,
  isStaffRole,
  canManageKyc,
  canViewAuditLogs,
  canManageFinance,
  canManageTradingDesk,
} from "@/lib/auth/roles";

describe("KYC State Machine & Role Access Control (roles.ts)", () => {
  describe("KYC State Machine Transitions", () => {
    it("should allow unverified -> pending_verification", () => {
      expect(isValidKycTransition("unverified", "pending_verification")).toBe(true);
    });

    it("should reject direct unverified -> verified jump without pending review", () => {
      expect(isValidKycTransition("unverified", "verified")).toBe(false);
    });

    it("should allow pending_verification -> verified", () => {
      expect(isValidKycTransition("pending_verification", "verified")).toBe(true);
    });

    it("should allow pending_verification -> restricted", () => {
      expect(isValidKycTransition("pending_verification", "restricted")).toBe(true);
    });

    it("should allow verified -> restricted upon compliance flag", () => {
      expect(isValidKycTransition("verified", "restricted")).toBe(true);
    });

    it("should allow same state transition (idempotent)", () => {
      expect(isValidKycTransition("verified", "verified")).toBe(true);
      expect(isValidKycTransition("unverified", "unverified")).toBe(true);
    });
  });

  describe("Role Capability Scoping", () => {
    it("should distinguish client from staff roles", () => {
      expect(isStaffRole("client")).toBe(false);
      expect(isStaffRole("compliance")).toBe(true);
      expect(isStaffRole("operations")).toBe(true);
      expect(isStaffRole("finance")).toBe(true);
      expect(isStaffRole("dealer")).toBe(true);
      expect(isStaffRole("admin")).toBe(true);
    });

    it("should scope KYC management to compliance, ops, and admin", () => {
      expect(canManageKyc("compliance")).toBe(true);
      expect(canManageKyc("operations")).toBe(true);
      expect(canManageKyc("admin")).toBe(true);
      expect(canManageKyc("client")).toBe(false);
      expect(canManageKyc("dealer")).toBe(false);
      expect(canManageKyc("finance")).toBe(false);
    });

    it("should scope finance management to finance and admin", () => {
      expect(canManageFinance("finance")).toBe(true);
      expect(canManageFinance("admin")).toBe(true);
      expect(canManageFinance("client")).toBe(false);
      expect(canManageFinance("compliance")).toBe(false);
    });

    it("should scope trading desk management to dealer and admin", () => {
      expect(canManageTradingDesk("dealer")).toBe(true);
      expect(canManageTradingDesk("admin")).toBe(true);
      expect(canManageTradingDesk("client")).toBe(false);
      expect(canManageTradingDesk("finance")).toBe(false);
    });

    it("should scope audit logs to compliance and admin", () => {
      expect(canViewAuditLogs("compliance")).toBe(true);
      expect(canViewAuditLogs("admin")).toBe(true);
      expect(canViewAuditLogs("operations")).toBe(false);
    });
  });
});
