/**
 * Authentication Validation Schemas
 * Zod schemas for input validation
 */

import { z } from 'zod';

export const gdprConsentSchema = z.object({
  dataProcessing: z.boolean(),
  voiceRecording: z.boolean(),
  aiProcessing: z.boolean(),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  gdprConsent: gdprConsentSchema,
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const updateConsentSchema = z.object({
  gdprConsent: gdprConsentSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateConsentInput = z.infer<typeof updateConsentSchema>;
