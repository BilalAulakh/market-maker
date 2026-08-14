export type UserRole =
  | "client"
  | "admin"
  | "operations"
  | "compliance"
  | "finance"
  | "dealer";

export type KycStatus =
  | "unverified"
  | "pending_verification"
  | "verified"
  | "restricted";

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  country: string;
  role: UserRole;
  kyc_status: KycStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Non-Negotiable Rule 6:
 * Every client-facing refusal states what happened, why, what resolves it, and where to go.
 * Never return a bare rejection.
 */
export interface ClientRefusal {
  success: false;
  code: string;
  whatHappened: string;
  why: string;
  howToResolve: string;
  whereToGo: {
    label: string;
    url: string;
  };
}

export interface ActionSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export type ActionResponse<T = unknown> = ActionSuccess<T> | ClientRefusal;
