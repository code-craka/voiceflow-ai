/**
 * Audio Processing Service
 * Handles audio upload, encryption, validation, and storage
 * Requirements: 1.4, 5.1, 5.3
 */

import { encryptAudioFile } from './encryption';
import type {
  AudioUploadResult,
  AudioValidationResult,
  AudioFormat,
} from '@/types/audio';

// Supported audio formats and codecs
const SUPPORTED_MIME_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MIN_FILE_SIZE = 100; // 100 bytes

export interface AudioUploadOptions {
  userId: string;
  userEncryptionKey: string;
  metadata?: {
    title?: string;
    folderId?: string;
    tags?: string[];
  };
}

export interface EncryptedAudioData {
  encrypted: Buffer;
  iv: string;
  authTag: string;
  originalSize: number;
  encryptedSize: number;
}

/**
 * Validate audio file format and size
 */
export function validateAudioFile(
  file: File | Blob,
  mimeType?: string
): AudioValidationResult {
  // Check file size
  if (file.size < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: 'Audio file is too small. Minimum size is 100 bytes.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Audio file is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
    };
  }

  // Check MIME type
  const fileType = mimeType || (file as File).type;
  if (!fileType) {
    return {
      valid: false,
      error: 'Audio file type could not be determined.',
    };
  }

  const isSupported = SUPPORTED_MIME_TYPES.some((type) =>
    fileType.toLowerCase().includes(type.split(';')[0])
  );

  if (!isSupported) {
    return {
      valid: false,
      error: `Unsupported audio format. Supported formats: ${SUPPORTED_MIME_TYPES.join(', ')}`,
    };
  }

  // Extract format information
  const format: AudioFormat = {
    mimeType: fileType,
    codec: fileType.includes('opus') ? 'opus' : 'unknown',
    bitrate: 64000, // Default, actual bitrate may vary
    sampleRate: 48000, // Default
  };

  return {
    valid: true,
    format,
  };
}

/**
 * Convert Blob to Buffer
 */
async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Encrypt audio file data
 */
export async function encryptAudio(
  audioBlob: Blob,
  userEncryptionKey: string
): Promise<EncryptedAudioData> {
  // Convert blob to buffer
  const audioBuffer = await blobToBuffer(audioBlob);
  const originalSize = audioBuffer.length;

  // Encrypt the audio data
  const { encrypted, iv, authTag } = encryptAudioFile(
    audioBuffer,
    userEncryptionKey
  );

  return {
    encrypted,
    iv,
    authTag,
    originalSize,
    encryptedSize: encrypted.length,
  };
}

/**
 * Generate a unique audio ID
 */
function generateAudioId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `audio_${timestamp}_${randomStr}`;
}

/**
 * Upload and encrypt audio file
 * This is a placeholder that will be integrated with actual storage (S3)
 */
export async function uploadAudio(
  audioBlob: Blob,
  options: AudioUploadOptions
): Promise<AudioUploadResult> {
  const { userId, userEncryptionKey, metadata } = options;

  // Validate audio file
  const validation = validateAudioFile(audioBlob);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Encrypt audio data
  const encryptedData = await encryptAudio(audioBlob, userEncryptionKey);

  // Generate audio ID
  const audioId = generateAudioId();

  // TODO: Upload to S3-compatible storage
  // For now, we'll return a placeholder URL
  // In production, this would upload to encrypted object storage
  const encryptedUrl = `/api/audio/${audioId}`;

  // Calculate duration (placeholder - actual duration should come from metadata)
  const duration = 0; // Will be calculated from audio metadata

  return {
    audioId,
    encryptedUrl,
    duration,
    format: validation.format!,
  };
}

/**
 * Validate audio format from buffer
 */
export function validateAudioBuffer(
  buffer: Buffer,
  mimeType: string
): AudioValidationResult {
  // Check buffer size
  if (buffer.length < MIN_FILE_SIZE) {
    return {
      valid: false,
      error: 'Audio data is too small.',
    };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'Audio data is too large.',
    };
  }

  // Validate MIME type
  const isSupported = SUPPORTED_MIME_TYPES.some((type) =>
    mimeType.toLowerCase().includes(type.split(';')[0])
  );

  if (!isSupported) {
    return {
      valid: false,
      error: 'Unsupported audio format.',
    };
  }

  const format: AudioFormat = {
    mimeType,
    codec: mimeType.includes('opus') ? 'opus' : 'unknown',
    bitrate: 64000,
    sampleRate: 48000,
  };

  return {
    valid: true,
    format,
  };
}

/**
 * Get audio file metadata
 */
export async function getAudioMetadata(audioBlob: Blob): Promise<{
  duration: number;
  size: number;
  mimeType: string;
}> {
  return {
    duration: 0, // Would be extracted from audio file
    size: audioBlob.size,
    mimeType: audioBlob.type,
  };
}
