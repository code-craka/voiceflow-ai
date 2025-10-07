/**
 * Encryption Service
 * Handles AES-256-GCM encryption for audio files and user data
 * Requirements: 5.1, 5.3
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export interface EncryptionResult {
  encrypted: Buffer;
  iv: string;
  authTag: string;
  salt?: string;
}

export interface DecryptionInput {
  encrypted: Buffer;
  iv: string;
  authTag: string;
  key: Buffer;
}

/**
 * Generate a secure encryption key for a user
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Hash an encryption key for storage
 */
export function hashEncryptionKey(key: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = crypto.pbkdf2Sync(
    Buffer.from(key, 'base64'),
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
  
  return `${salt.toString('base64')}:${hash.toString('base64')}`;
}

/**
 * Verify an encryption key against its hash
 */
export function verifyEncryptionKey(key: string, hash: string): boolean {
  const [saltBase64, hashBase64] = hash.split(':');
  const salt = Buffer.from(saltBase64, 'base64');
  const storedHash = Buffer.from(hashBase64, 'base64');
  
  const testHash = crypto.pbkdf2Sync(
    Buffer.from(key, 'base64'),
    salt,
    ITERATIONS,
    KEY_LENGTH,
    'sha512'
  );
  
  return crypto.timingSafeEqual(storedHash, testHash);
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(data: Buffer, key: Buffer): EncryptionResult {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(data),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(input: DecryptionInput): Buffer {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    input.key,
    Buffer.from(input.iv, 'base64')
  );
  
  decipher.setAuthTag(Buffer.from(input.authTag, 'base64'));
  
  return Buffer.concat([
    decipher.update(input.encrypted),
    decipher.final()
  ]);
}

/**
 * Encrypt audio file with user's encryption key
 */
export function encryptAudioFile(
  audioData: Buffer,
  userEncryptionKey: string
): EncryptionResult {
  const key = Buffer.from(userEncryptionKey, 'base64');
  return encrypt(audioData, key);
}

/**
 * Decrypt audio file with user's encryption key
 */
export function decryptAudioFile(
  encryptedData: Buffer,
  iv: string,
  authTag: string,
  userEncryptionKey: string
): Buffer {
  const key = Buffer.from(userEncryptionKey, 'base64');
  return decrypt({ encrypted: encryptedData, iv, authTag, key });
}

/**
 * Generate a secure password hash
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}
