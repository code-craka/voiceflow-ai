/**
 * Authentication and User Types
 * Updated for Better Auth migration
 */

import type { Session } from "@/lib/auth";

// Re-export Better Auth Session type for convenience
export type { Session };

/**
 * GDPR Consent structure
 * Preserved from original implementation
 */
export interface GDPRConsent {
  dataProcessing: boolean;
  voiceRecording: boolean;
  aiProcessing: boolean;
  consentedAt: Date;
  ipAddress?: string;
}

/**
 * User type with custom VoiceFlow AI fields
 */
export interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string;
  encryptionKeyHash: string;
  gdprConsent: GDPRConsent;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User registration request payload
 */
export interface UserRegistrationRequest {
  email: string;
  password: string;
  gdprConsent: GDPRConsent;
}

/**
 * User login request payload
 */
export interface UserLoginRequest {
  email: string;
  password: string;
}

/**
 * User with encryption key (returned after registration)
 */
export interface UserWithEncryptionKey extends User {
  encryptionKey: string;
}

/**
 * Registration response from auth service
 */
export interface RegistrationResponse {
  user: Session["user"];
  session: Session["session"];
  encryptionKey: string;
}

/**
 * API response types for authentication endpoints
 */
export interface AuthSuccessResponse {
  user: Session["user"];
  session: Session["session"];
}

export interface AuthErrorResponse {
  error: string;
  code?: string;
}
