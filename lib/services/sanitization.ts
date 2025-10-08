/**
 * Input Sanitization Service
 * Provides XSS prevention and input sanitization utilities
 * Requirements: 5.2, 5.4
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * Basic implementation - strips all HTML tags
 * 
 * @param html - HTML string to sanitize
 * @returns Sanitized text string
 * 
 * @example
 * ```typescript
 * const safeText = sanitizeHtml(userInput);
 * ```
 */
export function sanitizeHtml(html: string): string {
  // Strip all HTML tags and decode entities
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
    .replace(/<[^>]+>/g, '') // Remove all other HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim();
}

/**
 * Sanitize plain text by removing control characters and normalizing whitespace
 * 
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Sanitize filename to prevent path traversal attacks
 * 
 * @param filename - Filename to sanitize
 * @returns Safe filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe characters
    .replace(/\.{2,}/g, '.') // Prevent directory traversal
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 255); // Limit length
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 * 
 * @param url - URL to sanitize
 * @returns Safe URL or null if invalid
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize email address
 * 
 * @param email - Email to sanitize
 * @returns Sanitized email
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Escape special characters for SQL LIKE queries
 * 
 * @param value - Value to escape
 * @returns Escaped value
 */
export function escapeLikeQuery(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

/**
 * Sanitize JSON input to prevent prototype pollution
 * 
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  // Remove dangerous properties
  delete (sanitized as any).__proto__;
  delete (sanitized as any).constructor;
  delete (sanitized as any).prototype;
  
  return sanitized;
}

/**
 * Validate and sanitize audio file metadata
 * 
 * @param metadata - Audio metadata
 * @returns Sanitized metadata
 */
export function sanitizeAudioMetadata(metadata: {
  filename?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
}): {
  filename: string;
  mimeType: string;
  size: number;
  duration: number;
} {
  const allowedMimeTypes = [
    'audio/webm',
    'audio/ogg',
    'audio/opus',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
  ];
  
  const mimeType = metadata.mimeType || 'audio/webm';
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error(`Invalid audio MIME type: ${mimeType}`);
  }
  
  const size = metadata.size || 0;
  if (size <= 0 || size > 100 * 1024 * 1024) { // Max 100MB
    throw new Error(`Invalid audio file size: ${size}`);
  }
  
  const duration = metadata.duration || 0;
  if (duration < 0 || duration > 7200) { // Max 2 hours
    throw new Error(`Invalid audio duration: ${duration}`);
  }
  
  return {
    filename: sanitizeFilename(metadata.filename || 'audio.webm'),
    mimeType,
    size,
    duration,
  };
}
