/**
 * GDPR Data Export API
 * GET /api/gdpr/export
 * Requirements: 6.2
 */

import { NextResponse } from 'next/server';
import { ajAuthAPI, handleArcjetDecision } from '@/lib/arcjet';
import { getUserIdFromRequest } from '@/lib/services/jwt';
import { exportUserData } from '@/lib/services/gdpr';

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
