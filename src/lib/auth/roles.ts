import { KycStatus, UserRole } from "@/types/auth";

export const ALL_ROLES: readonly UserRole[] = [
  "client",
  "admin",
  "operations",
  "compliance",
  "finance",
  "dealer",
] as const;

export const STAFF_ROLES: readonly UserRole[] = [
  "admin",
  "operations",
  "compliance",
  "finance",
  "dealer",
] as const;

export function isStaffRole(role: UserRole): boolean {
  return role !== "client";
}

export function canManageKyc(role: UserRole): boolean {
  return role === "admin" || role === "compliance" || role === "operations";
}

export function canViewAuditLogs(role: UserRole): boolean {
  return role === "admin" || role === "compliance";
}

export function canManageFinance(role: UserRole): boolean {
  return role === "admin" || role === "finance";
}

export function canManageTradingDesk(role: UserRole): boolean {
  return role === "admin" || role === "dealer";
}

/**
 * KYC State Machine Transitions
 * Unverified -> Pending Verification -> Verified OR Restricted
 * Restricted can be cleared by Compliance back to Pending or Verified.
 */
export function isValidKycTransition(from: KycStatus, to: KycStatus): boolean {
  if (from === to) return true;

  switch (from) {
    case "unverified":
      return to === "pending_verification";
    case "pending_verification":
      return to === "verified" || to === "restricted" || to === "unverified";
    case "verified":
      return to === "restricted";
    case "restricted":
      return to === "pending_verification" || to === "verified";
    default:
      return false;
  }
}
