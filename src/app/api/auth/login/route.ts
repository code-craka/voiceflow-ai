/**
 * User Login API
 * POST /api/auth/login
 * Requirements: 5.3, 6.1
 */

import { NextResponse } from 'next/server';
import { ajSensitive, handleArcjetDecision } from '@/lib/arcjet';
import { loginUser, AuthenticationError } from '@/lib/services/auth';
import { generateToken } from '@/lib/services/jwt';
import { loginSchema } from '@/lib/validation/auth';

export async function POST(request: Request) {
  // 1. Arcjet security protection
  const decision = await ajSensitive.protect(request, { requested: 1 });
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;

  try {
    // 2. Parse and validate input
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // 3. Get IP address for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 4. Authenticate user
    const user = await loginUser(
      {
        email: validatedData.email,
        password: validatedData.password,
      },
      ipAddress
    );

    // 5. Generate JWT token
    const token = generateToken(user.id, user.email);

    // 6. Return success response
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        token,
        encryptionKey: user.encryptionKey,
      },
    });

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({
        error: error.code,
        message: error.message,
      }, { status: 401 });
    }

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: error,
      }, { status: 400 });
    }

    console.error('Login error:', error);
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred during login',
    }, { status: 500 });
  }
}
