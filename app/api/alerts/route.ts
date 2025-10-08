/**
 * Alerts API
 * Access and manage system alerts
 * Requirements: 9.3, 10.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajAuthAPI, handleArcjetDecision } from '@/lib/arcjet';
import { alertingService, AlertSeverity, AlertType } from '@/lib/services/alerting';

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
    const severity = searchParams.get('severity') as AlertSeverity | null;
    const type = searchParams.get('type') as AlertType | null;
    const resolved = searchParams.get('resolved');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get alerts
    const alerts = alertingService.getAlerts({
      severity: severity || undefined,
      type: type || undefined,
      resolved: resolved ? resolved === 'true' : undefined,
      limit,
    });

    // Get statistics
    const stats = alertingService.getAlertStats();

    return NextResponse.json({
      alerts,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Alerts endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { alertId, action } = body;

    if (action === 'resolve' && alertId) {
      const resolved = alertingService.resolveAlert(alertId);
      
      if (resolved) {
        return NextResponse.json({
          success: true,
          message: 'Alert resolved',
        });
      } else {
        return NextResponse.json(
          { error: 'Alert not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Alerts action error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process alert action',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
