/**
 * Audio Upload Validation Schemas
 * Requirements: 1.3, 1.4, 5.1, 5.2
 */

import { z } from 'zod';
import { audioMetadataSchema, uuidSchema } from './common';

/**
 * Audio upload request schema
 */
export const audioUploadSchema = z.object({
  userId: uuidSchema,
  filename: z.string().min(1).max(255),
  mimeType: z.enum([
    'audio/webm',
    'audio/ogg',
    'audio/opus',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/x-m4a',
  ]),
  size: z.number().int().positive().max(100 * 1024 * 1024), // Max 100MB
  duration: z.number().positive().max(7200).optional(), // Max 2 hours
});

/**
 * Audio processing request schema
 */
export const audioProcessingSchema = z.object({
  audioId: uuidSchema,
  userId: uuidSchema,
  options: z
    .object({
      transcribe: z.boolean().default(true),
      processAI: z.boolean().default(true),
      speakerDiarization: z.boolean().default(false),
    })
    .optional(),
});

/**
 * Audio download request schema
 */
export const audioDownloadSchema = z.object({
  audioId: uuidSchema,
  userId: uuidSchema,
  encryptionKey: z.string().min(1),
});

/**
 * Audio deletion request schema
 */
export const audioDeletionSchema = z.object({
  audioId: uuidSchema,
  userId: uuidSchema,
});

export type AudioUploadInput = z.infer<typeof audioUploadSchema>;
export type AudioProcessingInput = z.infer<typeof audioProcessingSchema>;
export type AudioDownloadInput = z.infer<typeof audioDownloadSchema>;
export type AudioDeletionInput = z.infer<typeof audioDeletionSchema>;
