/**
 * Appwrite Client Configuration
 * 
 * Provides both client-side and server-side Appwrite SDK instances
 * for storage operations with proper authentication and permissions.
 * 
 * Storage Bucket: voiceflow-ai (ID: 68e5eb26002366989566)
 * Region: Frankfurt (fra.cloud.appwrite.io)
 */

import { Client as AppwriteClient, Storage as AppwriteStorage } from "appwrite";
import { Client as ServerClient, Storage as ServerStorage } from "node-appwrite";

// ============================================================================
// Client-Side Appwrite (Browser)
// ============================================================================

/**
 * Client-side Appwrite instance for browser usage
 * Used in React components for file uploads with user authentication
 */
export const appwriteClient = new AppwriteClient()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

/**
 * Client-side Storage instance
 * Automatically uses user session for permissions
 */
export const clientStorage = new AppwriteStorage(appwriteClient);

// ============================================================================
// Server-Side Appwrite (Node.js)
// ============================================================================

/**
 * Server-side Appwrite instance for API routes
 * Uses API key for elevated permissions
 */
export const appwriteServer = new ServerClient()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

/**
 * Server-side Storage instance
 * Has full access to storage operations
 */
export const serverStorage = new ServerStorage(appwriteServer);

// ============================================================================
// Storage Configuration
// ============================================================================

/**
 * Appwrite storage bucket ID for audio files
 * Bucket name: voiceflow-ai
 */
export const STORAGE_BUCKET_ID = "68e5eb26002366989566";

/**
 * Storage configuration constants
 */
export const STORAGE_CONFIG = {
  BUCKET_ID: STORAGE_BUCKET_ID,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_MIME_TYPES: [
    "audio/webm",
    "audio/opus",
    "audio/ogg",
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
  ],
  CHUNK_SIZE: 5 * 1024 * 1024, // 5MB chunks for large files
} as const;

/**
 * Helper to validate environment variables
 */
function validateAppwriteConfig(): void {
  const required = [
    "NEXT_PUBLIC_APPWRITE_ENDPOINT",
    "NEXT_PUBLIC_APPWRITE_PROJECT_ID",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Appwrite environment variables: ${missing.join(", ")}`
    );
  }

  // Server-side only validation
  if (typeof window === "undefined" && !process.env.APPWRITE_API_KEY) {
    throw new Error("Missing APPWRITE_API_KEY for server-side operations");
  }
}

// Validate configuration on module load
validateAppwriteConfig();
