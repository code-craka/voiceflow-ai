/**
 * Compliance Dashboard API
 * Get compliance dashboard data for administrators
 * Requirements: 5.4, 6.4, 6.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajAuthAPI, handleArcjetDecision } from '@/lib/arcjet';
import { getComplianceDashboard } from '@/lib/services/compliance';
import { createAuditLog } from '@/lib/services/audit';

export async function GET(request: NextRequest) {
  // 1. Arcjet protection
  const decision = await ajAuthAPI.protect(request);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;

  // 2. Better Auth session verification
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Default to last 30 days if not specified
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // 4. Get compliance dashboard data
    const dashboard = await getComplianceDashboard(start, end);

    // 5. Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'COMPLIANCE_DASHBOARD_ACCESSED',
      resourceType: 'compliance',
      details: {
        startDate: start,
        endDate: end,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      dashboard,
    });
  } catch (error) {
    console.error('Compliance dashboard error:', error);

    return NextResponse.json(
      {
        error: 'Failed to load compliance dashboard',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
