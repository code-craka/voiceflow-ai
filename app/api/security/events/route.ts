/**
 * Security Events API
 * Access security event logs and audit trails
 * Requirements: 9.1, 9.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajAuthAPI, handleArcjetDecision } from '@/lib/arcjet';
import { monitoringService } from '@/lib/services/monitoring';

export async function GET(request: NextRequest) {
  try {
    // Arcjet protection
    const decision = await ajAuthAPI.protect(request);
    const errorResponse = handleArcjetDecision(decision);
    if (errorResponse) return errorResponse;

    // Require authentication
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity') as
      | 'low'
      | 'medium'
      | 'high'
      | 'critical'
      | null;
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get security events
    const events = monitoringService.getSecurityEvents(
      severity || undefined,
      limit
    );

    return NextResponse.json({
      events,
      count: events.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    monitoringService.logError('Security events endpoint error', error as Error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve security events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
