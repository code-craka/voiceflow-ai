/**
 * Metrics API
 * Expose performance metrics and monitoring data
 * Requirements: 9.1, 9.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajAuthAPI, handleArcjetDecision } from '@/lib/arcjet';
import { monitoringService, MetricType } from '@/lib/services/monitoring';

export async function GET(request: NextRequest) {
  try {
    // Arcjet protection
    const decision = await ajAuthAPI.protect(request);
    const errorResponse = handleArcjetDecision(decision);
    if (errorResponse) return errorResponse;

    // Require authentication for metrics access
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get metrics summaries
    const apiMetrics = monitoringService.getMetricsSummary(
      MetricType.API_RESPONSE_TIME
    );
    const transcriptionMetrics = monitoringService.getMetricsSummary(
      MetricType.TRANSCRIPTION_TIME
    );
    const aiMetrics = monitoringService.getMetricsSummary(
      MetricType.AI_PROCESSING_TIME
    );
    const dbMetrics = monitoringService.getMetricsSummary(
      MetricType.DATABASE_QUERY_TIME
    );

    const errorRate = monitoringService.getErrorRate(5);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      metrics: {
        api: {
          responseTime: {
            p95: Math.round(apiMetrics.p95),
            average: Math.round(apiMetrics.average),
            min: Math.round(apiMetrics.min),
            max: Math.round(apiMetrics.max),
            count: apiMetrics.count,
          },
          errorRate: `${(errorRate).toFixed(2)}%`,
          target: {
            p95: 500,
            unit: 'ms',
          },
        },
        transcription: {
          processingTime: {
            p95: Math.round(transcriptionMetrics.p95),
            average: Math.round(transcriptionMetrics.average),
            count: transcriptionMetrics.count,
          },
          target: {
            speedMultiplier: '5-10x',
            description: 'Process audio 5-10x faster than real-time',
          },
        },
        ai: {
          processingTime: {
            p95: Math.round(aiMetrics.p95),
            average: Math.round(aiMetrics.average),
            count: aiMetrics.count,
          },
        },
        database: {
          queryTime: {
            p95: Math.round(dbMetrics.p95),
            average: Math.round(dbMetrics.average),
            count: dbMetrics.count,
          },
          target: {
            p95: 100,
            unit: 'ms',
          },
        },
      },
      system: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB',
        },
      },
    });
  } catch (error) {
    monitoringService.logError('Metrics endpoint error', error as Error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
