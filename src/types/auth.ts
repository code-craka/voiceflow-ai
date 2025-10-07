/**
 * Authentication and User Types
 */

export interface User {
  id: string;
  email: string;
  encryptionKeyHash: string;
  gdprConsent: GDPRConsent;
  createdAt: Date;
  updatedAt: Date;
}

export interface GDPRConsent {
  dataProcessing: boolean;
  voiceRecording: boolean;
  aiProcessing: boolean;
  consentedAt: Date;
  ipAddress?: string;
}

export interface UserRegistrationRequest {
  email: string;
  password: string;
  gdprConsent: GDPRConsent;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  encryptionKey: string;
  expiresAt: Date;
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
}

export interface UserWithEncryptionKey extends User {
  encryptionKey: string;
}
