/**
 * Common Validation Schemas
 * Shared validation utilities and schemas
 * Requirements: 5.2, 5.4
 */

import { z } from 'zod';

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Email validation schema with additional checks
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email too long')
  .transform((email) => email.toLowerCase().trim());

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

/**
 * Date range schema
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * IP address validation
 */
export const ipAddressSchema = z
  .string()
  .ip({ version: 'v4' })
  .or(z.string().ip({ version: 'v6' }));

/**
 * URL validation schema
 */
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: 'URL must use HTTP or HTTPS protocol' }
  );

/**
 * Sanitized text schema (removes control characters)
 */
export const sanitizedTextSchema = z
  .string()
  .transform((text) =>
    text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );

/**
 * Filename validation schema
 */
export const filenameSchema = z
  .string()
  .min(1, 'Filename cannot be empty')
  .max(255, 'Filename too long')
  .refine(
    (filename) => {
      // Prevent path traversal
      return !filename.includes('..') && !filename.includes('/') && !filename.includes('\\');
    },
    { message: 'Invalid filename' }
  )
  .transform((filename) =>
    filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .replace(/^\.+/, '')
  );

/**
 * Audio file metadata schema
 */
export const audioMetadataSchema = z.object({
  filename: filenameSchema,
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
  duration: z.number().positive().max(7200), // Max 2 hours
});

/**
 * Request metadata schema (for audit logging)
 */
export const requestMetadataSchema = z.object({
  ipAddress: ipAddressSchema.optional(),
  userAgent: z.string().max(500).optional(),
  timestamp: z.date().default(() => new Date()),
});

/**
 * Validate and sanitize user input
 */
export function validateInput<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
}

/**
 * Safe parse with error handling
 */
export function safeValidate<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(
    (err) => `${err.path.join('.')}: ${err.message}`
  );
  
  return { success: false, errors };
}
