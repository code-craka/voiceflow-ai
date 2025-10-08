/**
 * Better Auth Server Instance
 * Handles authentication and session management
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/db";

export const auth = betterAuth({
  // Database configuration
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false, // Can be enabled later
    autoSignIn: true, // Auto sign in after registration
  },

  // Base URL configuration
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",

  // Secret for encryption and hashing
  secret: process.env.BETTER_AUTH_SECRET!,

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (matching current JWT expiry)
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Cache for 5 minutes
    },
  },

  // Trusted origins for CORS (for future OAuth support)
  trustedOrigins: ["https://appleid.apple.com"],

  // Advanced options
  advanced: {
    generateId: () => crypto.randomUUID(), // Use UUID for consistency
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
