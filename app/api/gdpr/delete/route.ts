/**
 * GDPR Data Deletion API
 * DELETE /api/gdpr/delete
 * Requirements: 6.3
 */

import { NextResponse } from 'next/server';
import { ajSensitive, handleArcjetDecision } from '@/lib/arcjet';
import { getUserIdFromRequest } from '@/lib/services/jwt';
import { deleteUserData } from '@/lib/services/gdpr';

export async function DELETE(request: Request) {
  // 1. Arcjet security protection
  const decision = await ajSensitive.protect(request, { requested: 1 });
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

    // 3. Get IP address for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 4. Delete all user data
    await deleteUserData(userId, ipAddress);

    // 5. Return success response
    return NextResponse.json({
      success: true,
      message: 'All user data has been permanently deleted',
    });

  } catch (error) {
    console.error('Data deletion error:', error);
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred during data deletion',
    }, { status: 500 });
  }
}
