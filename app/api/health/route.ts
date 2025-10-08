/**
 * Application Health Check API
 * Comprehensive health check for all services
 * Requirements: 9.1, 9.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { aj, handleArcjetDecision } from '@/lib/arcjet';
import { prisma } from '@/lib/db';
import { getCacheStats } from '@/lib/services/cache';
import { checkAIServiceHealth } from '@/lib/services/ai';
import { transcriptionService } from '@/lib/services/transcription';
import { monitoringService, MetricType } from '@/lib/services/monitoring';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    ai: ServiceHealth;
    transcription: ServiceHealth;
    storage: ServiceHealth;
  };
  metrics: {
    apiResponseTime: MetricSummary;
    errorRate: number;
    uptime: number;
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  details?: any;
}

interface MetricSummary {
  p95: number;
  average: number;
  count: number;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Basic Arcjet protection
    const decision = await aj.protect(request);
    const errorResponse = handleArcjetDecision(decision);
    if (errorResponse) return errorResponse;

    // Check all services in parallel
    const [
      databaseHealth,
      cacheHealth,
      aiHealth,
      transcriptionHealth,
      storageHealth,
    ] = await Promise.allSettled([
      checkDatabaseHealth(),
      checkCacheHealth(),
      checkAIHealth(),
      checkTranscriptionHealth(),
      checkStorageHealth(),
    ]);

    // Get performance metrics
    const apiMetrics = monitoringService.getMetricsSummary(
      MetricType.API_RESPONSE_TIME
    );
    const errorRate = monitoringService.getErrorRate(5);

    // Determine overall status
    const services = {
      database: getHealthResult(databaseHealth),
      cache: getHealthResult(cacheHealth),
      ai: getHealthResult(aiHealth),
      transcription: getHealthResult(transcriptionHealth),
      storage: getHealthResult(storageHealth),
    };

    const overallStatus = determineOverallStatus(services);

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      metrics: {
        apiResponseTime: {
          p95: Math.round(apiMetrics.p95),
          average: Math.round(apiMetrics.average),
          count: apiMetrics.count,
        },
        errorRate: Math.round(errorRate * 100) / 100,
        uptime: process.uptime(),
      },
    };

    const duration = Date.now() - startTime;
    monitoringService.trackAPIResponseTime('/api/health', 'GET', duration, 200);

    return NextResponse.json(result, {
      status: overallStatus === 'unhealthy' ? 503 : 200,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    monitoringService.logError('Health check failed', error as Error);
    monitoringService.trackAPIResponseTime('/api/health', 'GET', duration, 500);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Check database connectivity and performance
 */
async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();

  try {
    // Simple query to check connectivity
    await prisma.$queryRaw`SELECT 1`;

    const latency = Date.now() - startTime;
    monitoringService.trackDatabaseQueryTime('health_check', latency);

    return {
      status: latency < 100 ? 'up' : 'degraded',
      latency,
    };
  } catch (error) {
    monitoringService.logError('Database health check failed', error as Error);
    return {
      status: 'down',
      details: { error: (error as Error).message },
    };
  }
}

/**
 * Check cache service health
 */
async function checkCacheHealth(): Promise<ServiceHealth> {
  try {
    const stats = await getCacheStats();

    return {
      status: 'up',
      details: {
        keys: stats.keys,
        memory: stats.memory,
        hitRate:
          stats.hits + stats.misses > 0
            ? `${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1)}%`
            : '0%',
      },
    };
  } catch (error) {
    monitoringService.logError('Cache health check failed', error as Error);
    return {
      status: 'down',
      details: { error: (error as Error).message },
    };
  }
}

/**
 * Check AI service health
 */
async function checkAIHealth(): Promise<ServiceHealth> {
  try {
    const health = await checkAIServiceHealth();

    return {
      status: health.available ? 'up' : 'down',
      latency: health.latency,
      details: {
        model: health.model,
        error: health.error,
      },
    };
  } catch (error) {
    monitoringService.logError('AI health check failed', error as Error);
    return {
      status: 'down',
      details: { error: (error as Error).message },
    };
  }
}

/**
 * Check transcription service health
 */
async function checkTranscriptionHealth(): Promise<ServiceHealth> {
  try {
    const health = await transcriptionService.healthCheck();

    const status = health.overall
      ? 'up'
      : health.deepgram || health.assemblyai
        ? 'degraded'
        : 'down';

    return {
      status,
      details: {
        deepgram: health.deepgram ? 'available' : 'unavailable',
        assemblyai: health.assemblyai ? 'available' : 'unavailable',
      },
    };
  } catch (error) {
    monitoringService.logError(
      'Transcription health check failed',
      error as Error
    );
    return {
      status: 'down',
      details: { error: (error as Error).message },
    };
  }
}

/**
 * Check storage service health
 */
async function checkStorageHealth(): Promise<ServiceHealth> {
  try {
    // Check if Appwrite environment variables are configured
    const configured =
      !!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT &&
      !!process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID &&
      !!process.env.APPWRITE_API_KEY;

    return {
      status: configured ? 'up' : 'degraded',
      details: {
        configured,
        endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'not configured',
      },
    };
  } catch (error) {
    return {
      status: 'down',
      details: { error: (error as Error).message },
    };
  }
}

/**
 * Extract health result from Promise.allSettled result
 */
function getHealthResult(
  result: PromiseSettledResult<ServiceHealth>
): ServiceHealth {
  if (result.status === 'fulfilled') {
    return result.value;
  }
  return {
    status: 'down',
    details: { error: result.reason?.message || 'Unknown error' },
  };
}

/**
 * Determine overall system status
 */
function determineOverallStatus(services: {
  [key: string]: ServiceHealth;
}): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map((s) => s.status);

  if (statuses.every((s) => s === 'up')) {
    return 'healthy';
  }

  if (statuses.some((s) => s === 'down')) {
    // Critical services down
    if (
      services.database.status === 'down' ||
      services.transcription.status === 'down'
    ) {
      return 'unhealthy';
    }
    return 'degraded';
  }

  return 'degraded';
}
