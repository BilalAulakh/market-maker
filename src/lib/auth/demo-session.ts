import { UserProfile, UserRole } from "@/types/auth";

export const DEMO_TRADER_PROFILE: UserProfile = {
  id: "demo_trader_usr_001",
  email: "trader@marketmaker.com",
  first_name: "Alexander",
  last_name: "Wright",
  phone: "+44 7911 123456",
  country: "United Kingdom",
  role: "client",
  kyc_status: "verified",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

export const DEMO_PROFILES: Record<UserRole, UserProfile> = {
  client: DEMO_TRADER_PROFILE,
  compliance: {
    id: "demo_compliance_usr_002",
    email: "compliance@marketmaker.com",
    first_name: "Eleanor",
    last_name: "Vance",
    phone: "+44 7911 998877",
    country: "United Kingdom",
    role: "compliance",
    kyc_status: "verified",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  operations: {
    id: "demo_ops_usr_003",
    email: "ops@marketmaker.com",
    first_name: "Marcus",
    last_name: "Brody",
    phone: "+44 7911 445566",
    country: "United Kingdom",
    role: "operations",
    kyc_status: "verified",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  finance: {
    id: "demo_finance_usr_004",
    email: "finance@marketmaker.com",
    first_name: "Sarah",
    last_name: "Jenkins",
    phone: "+44 7911 778899",
    country: "United Kingdom",
    role: "finance",
    kyc_status: "verified",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  dealer: {
    id: "demo_dealer_usr_005",
    email: "dealer@marketmaker.com",
    first_name: "David",
    last_name: "Sterling",
    phone: "+44 7911 112233",
    country: "United Kingdom",
    role: "dealer",
    kyc_status: "verified",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
  admin: {
    id: "demo_admin_usr_006",
    email: "admin@marketmaker.com",
    first_name: "Chief",
    last_name: "Executive",
    phone: "+44 7911 000000",
    country: "United Kingdom",
    role: "admin",
    kyc_status: "verified",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
};

/**
 * Returns the default active demo trader profile to bypass login friction for quick testing.
 */
export function getActiveDemoSession(role: UserRole = "client"): UserProfile {
  return DEMO_PROFILES[role] || DEMO_TRADER_PROFILE;
}
