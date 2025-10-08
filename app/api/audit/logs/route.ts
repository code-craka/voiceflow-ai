/**
 * Audit Logs API
 * Get audit logs for users
 * Requirements: 5.4, 6.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajAuthAPI, handleArcjetDecision } from '@/lib/arcjet';
import { getUserAuditLogs, getAuditLogStats } from '@/lib/services/audit';
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
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeStats = searchParams.get('includeStats') === 'true';

    // 4. Get audit logs for the user
    const logs = await getUserAuditLogs(session.user.id, {
      limit: Math.min(limit, 1000), // Max 1000 logs per request
      offset,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    // 5. Get statistics if requested
    let stats = null;
    if (includeStats) {
      stats = await getAuditLogStats({
        userId: session.user.id,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
    }

    // 6. Create audit log for this access
    await createAuditLog({
      userId: session.user.id,
      action: 'AUDIT_LOGS_ACCESSED',
      resourceType: 'audit',
      details: {
        limit,
        offset,
        startDate,
        endDate,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      logs,
      stats,
      pagination: {
        limit,
        offset,
        total: stats?.totalLogs || logs.length,
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
