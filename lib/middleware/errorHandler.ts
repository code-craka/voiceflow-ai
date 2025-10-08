/**
 * Production Error Handler Middleware
 * Comprehensive error handling with user-friendly messages
 * Requirements: 11.2
 */

import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/monitoring/production';
import { monitoringService } from '@/lib/services/monitoring';

const logger = createLogger('ErrorHandler');

/**
 * Error types
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL = 'INTERNAL_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Application error class
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number,
    public retryable: boolean = false,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error response format
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
    fallbackAvailable?: boolean;
  };
  requestId: string;
  timestamp: string;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: Error | AppError,
  requestId?: string
): NextResponse<ErrorResponse> {
  // Determine if this is an AppError
  const isAppError = error instanceof AppError;

  // Extract error details
  const errorType = isAppError ? error.type : ErrorType.INTERNAL;
  const statusCode = isAppError ? error.statusCode : 500;
  const retryable = isAppError ? error.retryable : false;
  const metadata = isAppError ? error.metadata : undefined;

  // Get user-friendly message
  const userMessage = getUserFriendlyMessage(errorType, error.message);

  // Log error
  logger.error('Request failed', error, {
    errorType,
    statusCode,
    retryable,
    requestId,
    ...metadata,
  });

  // Track error in monitoring
  monitoringService.trackError(error, {
    errorType,
    statusCode,
    requestId,
    ...metadata,
  });

  // Create response
  const response: ErrorResponse = {
    error: {
      code: errorType,
      message: userMessage,
      details: process.env.NODE_ENV === 'production' ? undefined : metadata,
      retryable,
      fallbackAvailable: isAppError && metadata?.fallbackAvailable,
    },
    requestId: requestId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(type: ErrorType, originalMessage: string): string {
  const messages: Record<ErrorType, string> = {
    [ErrorType.VALIDATION]:
      'The information provided is invalid. Please check your input and try again.',
    [ErrorType.AUTHENTICATION]:
      'You must be logged in to access this resource. Please sign in and try again.',
    [ErrorType.AUTHORIZATION]:
      'You do not have permission to access this resource.',
    [ErrorType.NOT_FOUND]:
      'The requested resource was not found. Please check the URL and try again.',
    [ErrorType.RATE_LIMIT]:
      'Too many requests. Please wait a moment and try again.',
    [ErrorType.SERVICE_UNAVAILABLE]:
      'The service is temporarily unavailable. Please try again in a few moments.',
    [ErrorType.INTERNAL]:
      'An unexpected error occurred. Our team has been notified and is working on a fix.',
    [ErrorType.EXTERNAL_SERVICE]:
      'An external service is temporarily unavailable. We are using fallback options where possible.',
  };

  // In development, show original message
  if (process.env.NODE_ENV !== 'production') {
    return originalMessage;
  }

  // In production, use user-friendly message
  return messages[type] || messages[ErrorType.INTERNAL];
}

/**
 * Handle validation errors
 */
export function handleValidationError(
  errors: any[],
  requestId?: string
): NextResponse {
  const error = new AppError(
    ErrorType.VALIDATION,
    'Validation failed',
    400,
    false,
    { errors }
  );

  return createErrorResponse(error, requestId);
}

/**
 * Handle authentication errors
 */
export function handleAuthError(
  message: string = 'Authentication required',
  requestId?: string
): NextResponse {
  const error = new AppError(
    ErrorType.AUTHENTICATION,
    message,
    401,
    false
  );

  return createErrorResponse(error, requestId);
}

/**
 * Handle authorization errors
 */
export function handleAuthorizationError(
  message: string = 'Insufficient permissions',
  requestId?: string
): NextResponse {
  const error = new AppError(
    ErrorType.AUTHORIZATION,
    message,
    403,
    false
  );

  return createErrorResponse(error, requestId);
}

/**
 * Handle not found errors
 */
export function handleNotFoundError(
  resource: string,
  requestId?: string
): NextResponse {
  const error = new AppError(
    ErrorType.NOT_FOUND,
    `${resource} not found`,
    404,
    false
  );

  return createErrorResponse(error, requestId);
}

/**
 * Handle rate limit errors
 */
export function handleRateLimitError(
  retryAfter?: number,
  requestId?: string
): NextResponse {
  const error = new AppError(
    ErrorType.RATE_LIMIT,
    'Rate limit exceeded',
    429,
    true,
    { retryAfter }
  );

  const response = createErrorResponse(error, requestId);

  // Add Retry-After header
  if (retryAfter) {
    response.headers.set('Retry-After', retryAfter.toString());
  }

  return response;
}

/**
 * Handle external service errors
 */
export function handleExternalServiceError(
  service: string,
  originalError: Error,
  fallbackAvailable: boolean = false,
  requestId?: string
): NextResponse {
  const error = new AppError(
    ErrorType.EXTERNAL_SERVICE,
    `${service} service error: ${originalError.message}`,
    503,
    true,
    { service, fallbackAvailable }
  );

  return createErrorResponse(error, requestId);
}

/**
 * Handle internal server errors
 */
export function handleInternalError(
  originalError: Error,
  requestId?: string
): NextResponse {
  const error = new AppError(
    ErrorType.INTERNAL,
    originalError.message,
    500,
    false
  );

  return createErrorResponse(error, requestId);
}

/**
 * Wrap async handler with error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  return handler().catch((error) => {
    // Handle known error types
    if (error instanceof AppError) {
      return createErrorResponse(error);
    }

    // Handle unknown errors
    return handleInternalError(error);
  });
}

/**
 * API route error handler wrapper
 */
export function apiErrorHandler(
  handler: (request: Request) => Promise<NextResponse>
) {
  return async (request: Request): Promise<NextResponse> => {
    const requestId = crypto.randomUUID();

    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof AppError) {
        return createErrorResponse(error, requestId);
      }

      return handleInternalError(error as Error, requestId);
    }
  };
}
