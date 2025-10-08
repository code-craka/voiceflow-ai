/**
 * Monitoring and Logging Service
 * Structured logging with error tracking and performance metrics
 * Requirements: 9.1, 9.2, 9.4
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum MetricType {
  API_RESPONSE_TIME = 'api_response_time',
  TRANSCRIPTION_TIME = 'transcription_time',
  AI_PROCESSING_TIME = 'ai_processing_time',
  DATABASE_QUERY_TIME = 'database_query_time',
  CACHE_HIT_RATE = 'cache_hit_rate',
  ERROR_RATE = 'error_rate',
  ACTIVE_USERS = 'active_users',
  COST_PER_USER = 'cost_per_user',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  userId?: string;
  requestId?: string;
  duration?: number;
}

export interface PerformanceMetric {
  type: MetricType;
  value: number;
  unit: string;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private securityEvents: SecurityEvent[] = [];
  private readonly MAX_METRICS_BUFFER = 1000;
  private readonly MAX_EVENTS_BUFFER = 500;

  /**
   * Structured logging with context
   */
  log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    this.writeLog(entry);
  }

  /**
   * Log error with stack trace
   */
  logError(
    message: string,
    error: Error,
    context?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    this.writeLog(entry);
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.securityEvents.push(securityEvent);

    // Keep buffer size manageable
    if (this.securityEvents.length > this.MAX_EVENTS_BUFFER) {
      this.securityEvents.shift();
    }

    // Log critical security events immediately
    if (event.severity === 'critical' || event.severity === 'high') {
      this.log(LogLevel.CRITICAL, `Security Event: ${event.type}`, {
        event: securityEvent,
      });
    }
  }

  /**
   * Record performance metric
   */
  recordMetric(
    type: MetricType,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      type,
      value,
      unit,
      timestamp: new Date().toISOString(),
      tags,
    };

    this.metrics.push(metric);

    // Keep buffer size manageable
    if (this.metrics.length > this.MAX_METRICS_BUFFER) {
      this.metrics.shift();
    }
  }

  /**
   * Track API response time
   */
  trackAPIResponseTime(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number
  ): void {
    this.recordMetric(MetricType.API_RESPONSE_TIME, duration, 'ms', {
      endpoint,
      method,
      status: statusCode.toString(),
    });

    // Log slow requests
    if (duration > 500) {
      this.log(LogLevel.WARN, 'Slow API response detected', {
        endpoint,
        method,
        duration,
        statusCode,
      });
    }
  }

  /**
   * Track transcription processing time
   */
  trackTranscriptionTime(
    provider: string,
    duration: number,
    audioLength: number
  ): void {
    const speedMultiplier = audioLength / duration;

    this.recordMetric(MetricType.TRANSCRIPTION_TIME, duration, 'ms', {
      provider,
      speedMultiplier: speedMultiplier.toFixed(2),
    });

    // Log if not meeting 5-10x real-time target
    if (speedMultiplier < 5) {
      this.log(LogLevel.WARN, 'Transcription processing slower than target', {
        provider,
        duration,
        audioLength,
        speedMultiplier,
      });
    }
  }

  /**
   * Track AI processing time
   */
  trackAIProcessingTime(model: string, duration: number, cached: boolean): void {
    this.recordMetric(MetricType.AI_PROCESSING_TIME, duration, 'ms', {
      model,
      cached: cached.toString(),
    });
  }

  /**
   * Track database query time
   */
  trackDatabaseQueryTime(operation: string, duration: number): void {
    this.recordMetric(MetricType.DATABASE_QUERY_TIME, duration, 'ms', {
      operation,
    });

    // Log slow queries
    if (duration > 100) {
      this.log(LogLevel.WARN, 'Slow database query detected', {
        operation,
        duration,
      });
    }
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(type?: MetricType): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  } {
    const filteredMetrics = type
      ? this.metrics.filter((m) => m.type === type)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0, p95: 0 };
    }

    const values = filteredMetrics.map((m) => m.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const p95Index = Math.floor(values.length * 0.95);

    return {
      count: values.length,
      average: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p95: values[p95Index] || values[values.length - 1],
    };
  }

  /**
   * Get error rate
   */
  getErrorRate(timeWindowMinutes: number = 5): number {
    const cutoffTime = new Date(
      Date.now() - timeWindowMinutes * 60 * 1000
    ).toISOString();

    const recentMetrics = this.metrics.filter(
      (m) => m.timestamp >= cutoffTime
    );

    if (recentMetrics.length === 0) return 0;

    const errorMetrics = recentMetrics.filter(
      (m) => m.tags?.status && parseInt(m.tags.status) >= 500
    );

    return (errorMetrics.length / recentMetrics.length) * 100;
  }

  /**
   * Get security events
   */
  getSecurityEvents(
    severity?: SecurityEvent['severity'],
    limit: number = 100
  ): SecurityEvent[] {
    let events = [...this.securityEvents];

    if (severity) {
      events = events.filter((e) => e.severity === severity);
    }

    return events.slice(-limit);
  }

  /**
   * Clear old metrics (for memory management)
   */
  clearOldMetrics(olderThanMinutes: number = 60): void {
    const cutoffTime = new Date(
      Date.now() - olderThanMinutes * 60 * 1000
    ).toISOString();

    this.metrics = this.metrics.filter((m) => m.timestamp >= cutoffTime);
    this.securityEvents = this.securityEvents.filter(
      (e) => e.timestamp >= cutoffTime
    );
  }

  /**
   * Write log entry (can be extended to send to external logging service)
   */
  private writeLog(entry: LogEntry): void {
    const logMessage = JSON.stringify(entry);

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(logMessage);
        break;
      case LogLevel.INFO:
        console.info(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage);
        break;
    }
  }
}

// Singleton instance
export const monitoringService = new MonitoringService();

/**
 * Middleware helper to track API performance
 */
export function withMonitoring<T>(
  handler: () => Promise<T>,
  context: {
    endpoint: string;
    method: string;
    userId?: string;
  }
): Promise<T> {
  const startTime = Date.now();

  return handler()
    .then((result) => {
      const duration = Date.now() - startTime;
      monitoringService.trackAPIResponseTime(
        context.endpoint,
        context.method,
        duration,
        200
      );
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      monitoringService.trackAPIResponseTime(
        context.endpoint,
        context.method,
        duration,
        500
      );
      monitoringService.logError(
        `Error in ${context.endpoint}`,
        error,
        context
      );
      throw error;
    });
}

/**
 * Track event
 */
export function trackEvent(
  eventName: string,
  metadata?: Record<string, any>
): void {
  monitoringService.log(LogLevel.INFO, `Event: ${eventName}`, metadata);
}

/**
 * Track error
 */
export function trackError(
  error: Error,
  metadata?: Record<string, any>
): void {
  monitoringService.logError('Error tracked', error, metadata);
}

/**
 * Track performance
 */
export function trackPerformance(operation: string, duration: number): void {
  monitoringService.recordMetric(
    MetricType.API_RESPONSE_TIME,
    duration,
    'ms',
    { operation }
  );
}

/**
 * Get system health status
 */
export async function getSystemHealth(): Promise<{
  database: boolean;
  transcription: boolean;
  ai: boolean;
  storage: boolean;
  overall: boolean;
}> {
  try {
    // Check database
    const dbHealthy = await checkDatabaseHealth();

    // Check transcription services
    const { transcriptionService } = await import('./transcription');
    const transcriptionHealth = await transcriptionService.healthCheck();

    // Check AI service
    const { checkAIServiceHealth } = await import('./ai');
    const aiHealth = await checkAIServiceHealth();

    // Check storage service
    const { storageService } = await import('./storage');
    const storageHealth = await storageService.healthCheck();

    const health = {
      database: dbHealthy,
      transcription: transcriptionHealth.overall,
      ai: aiHealth.available,
      storage: storageHealth.available,
      overall: false,
    };

    // Overall health requires database and at least one other service
    health.overall =
      health.database &&
      (health.transcription || health.ai || health.storage);

    return health;
  } catch (error) {
    console.error('System health check failed:', error);
    return {
      database: false,
      transcription: false,
      ai: false,
      storage: false,
      overall: false,
    };
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const { prisma } = await import('@/lib/db');
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Get cost metrics
 */
export async function getCostMetrics(): Promise<{
  costPerUser: number;
  monthlyTotal: number;
  breakdown: {
    transcription: number;
    ai: number;
    storage: number;
  };
}> {
  // This would integrate with your billing/usage tracking system
  // For now, return mock data based on monitoring metrics
  return {
    costPerUser: 0.25,
    monthlyTotal: 500,
    breakdown: {
      transcription: 200,
      ai: 250,
      storage: 50,
    },
  };
}

/**
 * Get performance metrics
 */
export async function getPerformanceMetrics(): Promise<{
  errorRate: number;
  p95ResponseTime: number;
  averageResponseTime: number;
  requestCount: number;
}> {
  const summary = monitoringService.getMetricsSummary(
    MetricType.API_RESPONSE_TIME
  );
  const errorRate = monitoringService.getErrorRate(5);

  return {
    errorRate: errorRate / 100, // Convert to decimal
    p95ResponseTime: summary.p95,
    averageResponseTime: summary.average,
    requestCount: summary.count,
  };
}
