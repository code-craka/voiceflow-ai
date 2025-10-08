/**
 * File Upload Validation Service
 * Provides comprehensive file validation and security checks
 * Requirements: 5.1, 5.2, 5.4
 */

import crypto from 'crypto';
import { sanitizeFilename, sanitizeAudioMetadata } from './sanitization';

// ============================================================================
// Constants
// ============================================================================

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_DURATION = 7200; // 2 hours in seconds

const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/opus',
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/x-m4a',
] as const;

const ALLOWED_AUDIO_EXTENSIONS = [
  '.webm',
  '.ogg',
  '.opus',
  '.wav',
  '.mp3',
  '.m4a',
] as const;

// Magic bytes for audio file validation
const AUDIO_MAGIC_BYTES: Record<string, Buffer[]> = {
  'audio/webm': [Buffer.from([0x1A, 0x45, 0xDF, 0xA3])],
  'audio/ogg': [Buffer.from([0x4F, 0x67, 0x67, 0x53])],
  'audio/wav': [Buffer.from([0x52, 0x49, 0x46, 0x46])],
  'audio/mp3': [
    Buffer.from([0xFF, 0xFB]),
    Buffer.from([0xFF, 0xF3]),
    Buffer.from([0xFF, 0xF2]),
    Buffer.from([0x49, 0x44, 0x33]), // ID3
  ],
  'audio/mpeg': [
    Buffer.from([0xFF, 0xFB]),
    Buffer.from([0xFF, 0xF3]),
  ],
};

// ============================================================================
// Types
// ============================================================================

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    filename: string;
    mimeType: string;
    size: number;
    hash: string;
    extension: string;
  };
}

export interface AudioFileValidationOptions {
  maxSize?: number;
  maxDuration?: number;
  allowedMimeTypes?: readonly string[];
  requireMagicByteCheck?: boolean;
}

// ============================================================================
// File Validation Functions
// ============================================================================

/**
 * Validate audio file upload
 * 
 * @param file - File buffer or Blob
 * @param filename - Original filename
 * @param mimeType - Declared MIME type
 * @param options - Validation options
 * @returns Validation result
 */
export async function validateAudioFile(
  file: Buffer | Blob,
  filename: string,
  mimeType: string,
  options: AudioFileValidationOptions = {}
): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const maxSize = options.maxSize || MAX_FILE_SIZE;
  const allowedMimeTypes = options.allowedMimeTypes || ALLOWED_AUDIO_MIME_TYPES;
  const requireMagicByteCheck = options.requireMagicByteCheck ?? true;
  
  // Convert Blob to Buffer if needed
  const buffer = file instanceof Buffer ? file : Buffer.from(await file.arrayBuffer());
  
  // 1. Validate file size
  if (buffer.length === 0) {
    errors.push('File is empty');
  } else if (buffer.length > maxSize) {
    errors.push(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
  }
  
  // 2. Validate filename
  const sanitizedFilename = sanitizeFilename(filename);
  if (!sanitizedFilename) {
    errors.push('Invalid filename');
  }
  
  // 3. Validate file extension
  const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  if (!ALLOWED_AUDIO_EXTENSIONS.includes(extension as any)) {
    errors.push(`Invalid file extension: ${extension}. Allowed: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`);
  }
  
  // 4. Validate MIME type
  if (!allowedMimeTypes.includes(mimeType)) {
    errors.push(`Invalid MIME type: ${mimeType}. Allowed: ${allowedMimeTypes.join(', ')}`);
  }
  
  // 5. Validate magic bytes (file signature)
  if (requireMagicByteCheck && buffer.length >= 4) {
    const isValidMagicBytes = validateMagicBytes(buffer, mimeType);
    if (!isValidMagicBytes) {
      errors.push('File content does not match declared MIME type (magic byte mismatch)');
    }
  }
  
  // 6. Check for suspicious patterns
  const suspiciousPatterns = detectSuspiciousPatterns(buffer);
  if (suspiciousPatterns.length > 0) {
    warnings.push(...suspiciousPatterns);
  }
  
  // 7. Calculate file hash for integrity
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      filename: sanitizedFilename,
      mimeType,
      size: buffer.length,
      hash,
      extension,
    },
  };
}

/**
 * Validate magic bytes of audio file
 * 
 * @param buffer - File buffer
 * @param mimeType - Declared MIME type
 * @returns True if magic bytes match
 */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const magicBytes = AUDIO_MAGIC_BYTES[mimeType];
  if (!magicBytes) {
    return true; // No magic bytes defined for this type
  }
  
  return magicBytes.some(magic => {
    if (buffer.length < magic.length) {
      return false;
    }
    return buffer.subarray(0, magic.length).equals(magic);
  });
}

/**
 * Detect suspicious patterns in file content
 * 
 * @param buffer - File buffer
 * @returns Array of warnings
 */
function detectSuspiciousPatterns(buffer: Buffer): string[] {
  const warnings: string[] = [];
  
  // Check for embedded scripts (basic check)
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1024));
  
  if (content.includes('<script')) {
    warnings.push('File contains suspicious script tags');
  }
  
  if (content.includes('javascript:')) {
    warnings.push('File contains suspicious JavaScript protocol');
  }
  
  if (content.includes('data:text/html')) {
    warnings.push('File contains suspicious data URI');
  }
  
  // Check for null bytes in unexpected places
  const nullByteIndex = buffer.indexOf(0x00, 100);
  if (nullByteIndex > 0 && nullByteIndex < 1000) {
    warnings.push('File contains suspicious null bytes');
  }
  
  return warnings;
}

/**
 * Scan file for viruses using ClamAV (if available)
 * Note: This requires ClamAV to be installed and running
 * 
 * @param buffer - File buffer
 * @returns Scan result
 */
export async function scanFileForViruses(
  buffer: Buffer
): Promise<{ isClean: boolean; threats: string[] }> {
  // In production, integrate with ClamAV or cloud-based virus scanning service
  // For now, return a basic implementation
  
  try {
    // Check if ClamAV is available via environment variable
    const clamavEnabled = process.env.CLAMAV_ENABLED === 'true';
    
    if (!clamavEnabled) {
      // Skip virus scanning if not enabled
      return { isClean: true, threats: [] };
    }
    
    // TODO: Integrate with ClamAV or cloud-based scanning service
    // Example: Use clamd or cloud service API
    
    // For now, perform basic heuristic checks
    const threats: string[] = [];
    
    // Check for EICAR test file (standard antivirus test)
    const eicarSignature = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    if (buffer.toString('utf8').includes(eicarSignature)) {
      threats.push('EICAR-Test-File');
    }
    
    return {
      isClean: threats.length === 0,
      threats,
    };
  } catch (error) {
    console.error('Virus scanning error:', error);
    // Fail closed - treat as potentially unsafe
    return {
      isClean: false,
      threats: ['Virus scan failed'],
    };
  }
}

/**
 * Validate file upload with comprehensive security checks
 * 
 * @param file - File buffer
 * @param filename - Original filename
 * @param mimeType - Declared MIME type
 * @param options - Validation options
 * @returns Validation result with virus scan
 */
export async function validateFileUpload(
  file: Buffer,
  filename: string,
  mimeType: string,
  options: AudioFileValidationOptions = {}
): Promise<FileValidationResult & { virusScan: { isClean: boolean; threats: string[] } }> {
  // 1. Validate file format and content
  const validation = await validateAudioFile(file, filename, mimeType, options);
  
  // 2. Scan for viruses
  const virusScan = await scanFileForViruses(file);
  
  if (!virusScan.isClean) {
    validation.errors.push(`Virus detected: ${virusScan.threats.join(', ')}`);
    validation.isValid = false;
  }
  
  return {
    ...validation,
    virusScan,
  };
}

/**
 * Generate secure upload token for file uploads
 * 
 * @param userId - User ID
 * @param expiresIn - Token expiration in seconds
 * @returns Upload token
 */
export function generateUploadToken(userId: string, expiresIn = 3600): string {
  const payload = {
    userId,
    expiresAt: Date.now() + expiresIn * 1000,
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  
  const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.ENCRYPTION_KEY || 'default-key')
    .update(token)
    .digest('base64url');
  
  return `${token}.${signature}`;
}

/**
 * Verify upload token
 * 
 * @param token - Upload token
 * @returns User ID if valid, null otherwise
 */
export function verifyUploadToken(token: string): string | null {
  try {
    const [payload, signature] = token.split('.');
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.ENCRYPTION_KEY || 'default-key')
      .update(payload)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode payload
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    // Check expiration
    if (decoded.expiresAt < Date.now()) {
      return null;
    }
    
    return decoded.userId;
  } catch {
    return null;
  }
}
