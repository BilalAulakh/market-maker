import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const registerSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/[0-9]/, "Password must include at least one number"),
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  phone: z.string().trim().optional(),
  country: z.string().trim().min(2, "Please select your country of residence"),
});

export const kycSubmissionSchema = z.object({
  documentType: z.enum(["passport", "national_id", "drivers_license"], {
    errorMap: () => ({ message: "Please select a valid identity document type" }),
  }),
  documentNumber: z
    .string()
    .trim()
    .min(5, "Document number must be at least 5 characters"),
  countryOfIssue: z
    .string()
    .trim()
    .min(2, "Country of issue is required"),
  expirationDate: z
    .string()
    .trim()
    .min(10, "Valid expiration date is required (YYYY-MM-DD)"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type KycSubmissionInput = z.infer<typeof kycSubmissionSchema>;
