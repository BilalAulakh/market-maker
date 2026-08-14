"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema, kycSubmissionSchema } from "@/lib/validations/auth";
import { ActionResponse, KycStatus, UserProfile } from "@/types/auth";
import { createClientRefusal } from "@/lib/auth/refusal";
import { isValidKycTransition } from "@/lib/auth/roles";
import { revalidatePath } from "next/cache";

/**
 * Client Registration Server Action
 */
export async function signUpAction(formData: unknown): Promise<ActionResponse<{ userId: string }>> {
  const parsed = registerSchema.safeParse(formData);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return createClientRefusal({
      code: "INVALID_REGISTRATION_DATA",
      whatHappened: "Registration form submission contains invalid fields.",
      why: issue ? issue.message : "One or more fields failed validation checks.",
      howToResolve: "Please correct the highlighted form errors and submit again.",
      whereToGo: {
        label: "Registration Page",
        url: "/register",
      },
    });
  }

  const { email, password, firstName, lastName, phone, country } = parsed.data;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        country,
        role: "client",
      },
    },
  });

  if (error || !data.user) {
    return createClientRefusal({
      code: "SIGNUP_FAILED",
      whatHappened: "We were unable to create your brokerage account.",
      why: error?.message || "User registration failed due to database rejection.",
      howToResolve: "If you already have an account with this email, please log in instead.",
      whereToGo: {
        label: "Go to Login",
        url: "/login",
      },
    });
  }

  return {
    success: true,
    data: { userId: data.user.id },
    message: "Registration successful. Welcome to Market Maker Brokerage.",
  };
}

/**
 * Authentication / Sign In Server Action
 */
export async function signInAction(formData: unknown): Promise<ActionResponse<{ profile: UserProfile }>> {
  const parsed = loginSchema.safeParse(formData);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return createClientRefusal({
      code: "INVALID_CREDENTIALS_FORMAT",
      whatHappened: "Login form format is invalid.",
      why: issue ? issue.message : "Email or password format does not meet required specifications.",
      howToResolve: "Please provide a valid email and minimum 6-character password.",
      whereToGo: {
        label: "Login Page",
        url: "/login",
      },
    });
  }

  const { email, password } = parsed.data;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return createClientRefusal({
      code: "AUTHENTICATION_FAILED",
      whatHappened: "Authentication failed. Unable to access account.",
      why: error?.message || "Invalid email or password combination.",
      howToResolve: "Please verify your email address and password, or create a new account.",
      whereToGo: {
        label: "Create New Account",
        url: "/register",
      },
    });
  }

  // Fetch user profile
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profileData) {
    // Fallback profile representation if trigger is delayed
    const fallbackProfile: UserProfile = {
      id: data.user.id,
      email: data.user.email ?? email,
      first_name: (data.user.user_metadata?.first_name as string) ?? "Trader",
      last_name: (data.user.user_metadata?.last_name as string) ?? "Client",
      phone: (data.user.user_metadata?.phone as string) ?? null,
      country: (data.user.user_metadata?.country as string) ?? "United Kingdom",
      role: (data.user.user_metadata?.role as UserProfile["role"]) ?? "client",
      kyc_status: "unverified",
      created_at: data.user.created_at,
      updated_at: data.user.created_at,
    };

    return {
      success: true,
      data: { profile: fallbackProfile },
      message: "Successfully logged in.",
    };
  }

  return {
    success: true,
    data: { profile: profileData as UserProfile },
    message: "Successfully authenticated.",
  };
}

/**
 * Sign Out Server Action
 */
export async function signOutAction(): Promise<ActionResponse<null>> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return createClientRefusal({
      code: "SIGNOUT_FAILED",
      whatHappened: "Unable to complete sign out.",
      why: error.message,
      howToResolve: "Please refresh the browser or clear your cookies.",
      whereToGo: {
        label: "Home Page",
        url: "/",
      },
    });
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    data: null,
    message: "You have been securely signed out.",
  };
}

/**
 * Fetch Current Authenticated Profile
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? "",
      first_name: (user.user_metadata?.first_name as string) ?? "Trader",
      last_name: (user.user_metadata?.last_name as string) ?? "Client",
      phone: (user.user_metadata?.phone as string) ?? null,
      country: (user.user_metadata?.country as string) ?? "United Kingdom",
      role: (user.user_metadata?.role as UserProfile["role"]) ?? "client",
      kyc_status: "unverified",
      created_at: user.created_at,
      updated_at: user.created_at,
    };
  }

  return profile as UserProfile;
}

/**
 * Submit Identity Verification (KYC)
 */
export async function submitKycAction(formData: unknown): Promise<ActionResponse<{ newStatus: KycStatus }>> {
  const parsed = kycSubmissionSchema.safeParse(formData);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return createClientRefusal({
      code: "INVALID_KYC_DATA",
      whatHappened: "Identity verification submission failed validation.",
      why: issue ? issue.message : "Document details are incomplete or invalid.",
      howToResolve: "Please provide a valid document number, country of issue, and expiration date.",
      whereToGo: {
        label: "Verification Portal",
        url: "/kyc",
      },
    });
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    return createClientRefusal({
      code: "UNAUTHENTICATED",
      whatHappened: "You must be logged in to submit identity verification.",
      why: "No active user session was found.",
      howToResolve: "Please log in to your account first.",
      whereToGo: {
        label: "Login",
        url: "/login",
      },
    });
  }

  if (!isValidKycTransition(profile.kyc_status, "pending_verification")) {
    return createClientRefusal({
      code: "INVALID_KYC_STATUS_TRANSITION",
      whatHappened: "Cannot submit KYC under current account status.",
      why: `Your KYC status is currently "${profile.kyc_status}", which cannot transition to "pending_verification".`,
      howToResolve: "If your account is restricted or already verified, contact compliance support.",
      whereToGo: {
        label: "Support Portal",
        url: "/support",
      },
    });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      kyc_status: "pending_verification",
    })
    .eq("id", profile.id);

  if (error) {
    return createClientRefusal({
      code: "KYC_UPDATE_FAILED",
      whatHappened: "Database update for identity verification failed.",
      why: error.message,
      howToResolve: "Please try submitting again in a few moments.",
      whereToGo: {
        label: "Verification Portal",
        url: "/kyc",
      },
    });
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    data: { newStatus: "pending_verification" },
    message: "Identity documents submitted for compliance review.",
  };
}
