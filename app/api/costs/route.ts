/**
 * Cost Monitoring API
 * Access cost metrics and projections
 * Requirements: 10.1, 10.2, 10.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajAuthAPI, handleArcjetDecision } from '@/lib/arcjet';
import { costMonitoringService } from '@/lib/services/costMonitoring';

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

    // Get cost and usage metrics
    const costMetrics = costMonitoringService.getCostMetrics();
    const usageMetrics = costMonitoringService.getUsageMetrics();
    const breakdown = costMonitoringService.getCostBreakdown();

    // Calculate days elapsed (example: from start of month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysElapsed = Math.ceil(
      (now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)
    );

    const projection = costMonitoringService.getCostProjection(daysElapsed);

    return NextResponse.json({
      costs: {
        current: costMetrics,
        breakdown: breakdown.breakdown,
      },
      usage: usageMetrics,
      projection: {
        ...projection,
        daysElapsed,
      },
      targets: {
        costPerUser: 0.31,
        alertThreshold: 0.35,
        criticalThreshold: 0.40,
        grossMargin: '94-97%',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cost monitoring endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve cost metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
