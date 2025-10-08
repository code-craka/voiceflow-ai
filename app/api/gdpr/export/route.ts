/**
 * GDPR Data Export API
 * GET /api/gdpr/export
 * Requirements: 6.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajAuthAPI, handleArcjetDecision } from '@/lib/arcjet';
import { exportUserData } from '@/lib/services/gdpr';

export async function GET(request: NextRequest) {
  // 1. Arcjet security protection
  const decision = await ajAuthAPI.protect(request, { requested: 1 });
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;

  // 2. Better Auth session verification
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    }, { status: 401 });
  }

  // Extract userId from session
  const userId = session.user.id;

  try {

    // 3. Export user data
    const exportData = await exportUserData(userId);

    // 4. Return JSON export
    return NextResponse.json({
      success: true,
      data: exportData,
    });

  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'An error occurred during data export',
    }, { status: 500 });
  }
}
