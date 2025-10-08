/**
 * GDPR Consent Management API
 * GET /api/gdpr/consent - Get current consent
 * PUT /api/gdpr/consent - Update consent
 * Requirements: 6.1
 */

import { NextResponse } from 'next/server';
import { ajAuthAPI, handleArcjetDecision } from '@/lib/arcjet';
import { getUserIdFromRequest } from '@/lib/services/jwt';
import { getUserConsent, updateUserConsent } from '@/lib/services/gdpr';
import { updateConsentSchema } from '@/lib/validation/auth';

export async function GET(request: Request) {
  // 1. Arcjet security protection
  const decision = await ajAuthAPI.protect(request, { requested: 1 });
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;

  try {
    // 2. Authenticate user
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      }, { status: 401 });
    }

    // 3. Get consent status
    const consent = await getUserConsent(userId);

    // 4. Return consent data
    return NextResponse.json({
      success: true,
      data: { consent },
    });

  } catch (error) {
    console.error('Get consent error:', error);
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred while retrieving consent',
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  // 1. Arcjet security protection
  const decision = await ajAuthAPI.protect(request, { requested: 1 });
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;

  try {
    // 2. Authenticate user
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      }, { status: 401 });
    }

    // 3. Parse and validate input
    const body = await request.json();
    const validatedData = updateConsentSchema.parse(body);

    // 4. Get IP address for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 5. Update consent
    await updateUserConsent(userId, validatedData.gdprConsent, ipAddress);

    // 6. Return success response
    return NextResponse.json({
      success: true,
      message: 'Consent preferences updated successfully',
    });

  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: error,
      }, { status: 400 });
    }

    console.error('Update consent error:', error);
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred while updating consent',
    }, { status: 500 });
  }
}
