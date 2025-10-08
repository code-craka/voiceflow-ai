/**
 * Encryption Service
 * 
 * Provides AES-256-GCM encryption/decryption for audio files
 * with user-controlled encryption keys.
 * 
 * Requirements:
 * - 5.1: AES-256-GCM encryption for all audio files
 * - 5.3: User-controlled encryption keys
 * - 9.1: Encryption at rest and in transit
 */

import crypto from "crypto";

// ============================================================================
// Constants
// ============================================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32;

// ============================================================================
// Types
// ============================================================================

export interface EncryptionResult {
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
}

export interface DecryptionResult {
  decryptedData: Buffer;
}

// ============================================================================
// Key Management
// ============================================================================

/**
 * Generate a secure encryption key for a user
 * 
 * @returns Base64-encoded 256-bit encryption key
 * 
 * @example
 * ```typescript
 * const userKey = generateEncryptionKey();
 * // Store hash of this key in database
 * // Give actual key to user (one-time display)
 * ```
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("base64");
}

/**
 * Hash encryption key for storage in database
 * 
 * @param key - Base64-encoded encryption key
 * @returns Hashed key for database storage
 * 
 * @example
 * ```typescript
 * const keyHash = hashEncryptionKey(userKey);
 * await prisma.user.update({
 *   where: { id: userId },
 *   data: { encryptionKeyHash: keyHash }
 * });
 * ```
 */
export function hashEncryptionKey(key: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(
    Buffer.from(key, "base64"),
    salt,
    100000,
    KEY_LENGTH,
    "sha256"
  );
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify encryption key against stored hash
 * 
 * @param key - Base64-encoded encryption key to verify
 * @param storedHash - Hash from database
 * @returns True if key matches hash
 * 
 * @example
 * ```typescript
 * const isValid = verifyEncryptionKey(providedKey, user.encryptionKeyHash);
 * if (!isValid) {
 *   throw new Error('Invalid encryption key');
 * }
 * ```
 */
export function verifyEncryptionKey(key: string, storedHash: string): boolean {
  try {
    const [saltHex, hashHex] = storedHash.split(":");
    const salt = Buffer.from(saltHex, "hex");
    const storedHashBuffer = Buffer.from(hashHex, "hex");

    const hash = crypto.pbkdf2Sync(
      Buffer.from(key, "base64"),
      salt,
      100000,
      KEY_LENGTH,
      "sha256"
    );

    return crypto.timingSafeEqual(hash, storedHashBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Derive encryption key from user password (alternative to user-provided key)
 * 
 * @param password - User password
 * @param salt - Salt for key derivation
 * @returns Derived encryption key
 */
export function deriveKeyFromPassword(
  password: string,
  salt: Buffer
): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, "sha256");
}

// ============================================================================
// Encryption/Decryption
// ============================================================================

/**
 * Encrypt audio data using AES-256-GCM
 * 
 * @param data - Audio data to encrypt
 * @param key - Base64-encoded encryption key
 * @returns Encrypted data with IV and auth tag
 * 
 * @example
 * ```typescript
 * const { encryptedData, iv, authTag } = await encryptAudio(
 *   audioBuffer,
 *   userEncryptionKey
 * );
 * // Store encryptedData, iv, and authTag
 * ```
 */
export async function encryptAudio(
  data: Buffer,
  key: string
): Promise<EncryptionResult> {
  try {
    // Convert base64 key to buffer
    const keyBuffer = Buffer.from(key, "base64");

    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes`);
    }

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

    // Encrypt data
    const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      encryptedData,
      iv,
      authTag,
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error(
      `Failed to encrypt audio: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypt audio data using AES-256-GCM
 * 
 * @param encryptedData - Encrypted audio data
 * @param key - Base64-encoded encryption key
 * @param iv - Initialization vector
 * @param authTag - Authentication tag
 * @returns Decrypted audio data
 * 
 * @example
 * ```typescript
 * const decryptedAudio = await decryptAudio(
 *   encryptedData,
 *   userEncryptionKey,
 *   iv,
 *   authTag
 * );
 * // Use decryptedAudio for playback
 * ```
 */
export async function decryptAudio(
  encryptedData: Buffer,
  key: string,
  iv: Buffer,
  authTag: Buffer
): Promise<Buffer> {
  try {
    // Convert base64 key to buffer
    const keyBuffer = Buffer.from(key, "base64");

    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes`);
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);

    // Set authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt data
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return decryptedData;
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error(
      `Failed to decrypt audio: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Encrypt text data (for metadata, transcriptions, etc.)
 * 
 * @param text - Text to encrypt
 * @param key - Base64-encoded encryption key
 * @returns Encrypted text with IV and auth tag (base64-encoded)
 */
export async function encryptText(
  text: string,
  key: string
): Promise<string> {
  const { encryptedData, iv, authTag } = await encryptAudio(
    Buffer.from(text, "utf8"),
    key
  );

  // Combine IV, auth tag, and encrypted data into single base64 string
  const combined = Buffer.concat([iv, authTag, encryptedData]);
  return combined.toString("base64");
}

/**
 * Decrypt text data
 * 
 * @param encryptedText - Base64-encoded encrypted text
 * @param key - Base64-encoded encryption key
 * @returns Decrypted text
 */
export async function decryptText(
  encryptedText: string,
  key: string
): Promise<string> {
  const combined = Buffer.from(encryptedText, "base64");

  // Extract IV, auth tag, and encrypted data
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encryptedData = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decryptedBuffer = await decryptAudio(encryptedData, key, iv, authTag);
  return decryptedBuffer.toString("utf8");
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a secure random token (for verification codes, etc.)
 * 
 * @param length - Token length in bytes
 * @returns Hex-encoded token
 */
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Hash data using SHA-256
 * 
 * @param data - Data to hash
 * @returns Hex-encoded hash
 */
export function hashData(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Constant-time string comparison (prevents timing attacks)
 * 
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export function secureCompare(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
