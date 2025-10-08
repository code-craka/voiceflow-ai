/**
 * Production Monitoring and Logging
 * Comprehensive monitoring, error tracking, and alerting for production
 * Requirements: 9.1, 11.2
 */

import { monitoringService } from '@/lib/services/monitoring';
import { alertingService } from '@/lib/services/alerting';

/**
 * Production logger with structured logging
 */
export class ProductionLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    if (process.env.LOG_LEVEL === 'error' || process.env.LOG_LEVEL === 'warn') {
      return;
    }

    const log = this.formatLog('info', message, metadata);
    console.log(JSON.stringify(log));
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    if (process.env.LOG_LEVEL === 'error') {
      return;
    }

    const log = this.formatLog('warn', message, metadata);
    console.warn(JSON.stringify(log));

    // Track warning in monitoring
    monitoringService.trackEvent('warning', {
      context: this.context,
      message,
      ...metadata,
    });
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const log = this.formatLog('error', message, {
      ...metadata,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });

    console.error(JSON.stringify(log));

    // Track error in monitoring
    monitoringService.trackError(error || new Error(message), {
      context: this.context,
      ...metadata,
    });

    // Send alert for critical errors
    if (metadata?.critical) {
      alertingService.sendAlert({
        severity: 'critical',
        title: `Critical Error in ${this.context}`,
        message,
        metadata: {
          error: error?.message,
          ...metadata,
        },
      });
    }
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, metadata?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    const log = this.formatLog('debug', message, metadata);
    console.debug(JSON.stringify(log));
  }

  /**
   * Format log entry
   */
  private formatLog(
    level: string,
    message: string,
    metadata?: Record<string, any>
  ): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...metadata,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
    };
  }
}

/**
 * Request logger middleware
 */
export function createRequestLogger(context: string) {
  const logger = new ProductionLogger(context);

  return {
    logRequest: (
      method: string,
      path: string,
      metadata?: Record<string, any>
    ) => {
      if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
        logger.info(`${method} ${path}`, metadata);
      }
    },

    logResponse: (
      method: string,
      path: string,
      status: number,
      duration: number
    ) => {
      if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
        logger.info(`${method} ${path} - ${status}`, { duration });
      }

      // Track performance metrics
      monitoringService.trackPerformance(path, duration);

      // Alert on slow requests
      if (duration > 5000) {
        logger.warn(`Slow request detected: ${method} ${path}`, {
          duration,
          threshold: 5000,
        });
      }
    },

    logError: (
      method: string,
      path: string,
      error: Error,
      metadata?: Record<string, any>
    ) => {
      logger.error(`${method} ${path} failed`, error, metadata);
    },
  };
}

/**
 * Performance monitoring wrapper
 */
export function withPerformanceMonitoring<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const logger = new ProductionLogger('Performance');

  return fn()
    .then((result) => {
      const duration = Date.now() - startTime;
      monitoringService.trackPerformance(operation, duration);

      if (duration > 1000) {
        logger.warn(`Slow operation: ${operation}`, { duration });
      }

      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      logger.error(`Operation failed: ${operation}`, error, { duration });
      throw error;
    });
}

/**
 * Error boundary for production
 */
export function withErrorBoundary<T>(
  operation: string,
  fn: () => Promise<T>,
  fallback?: T
): Promise<T> {
  const logger = new ProductionLogger('ErrorBoundary');

  return fn().catch((error) => {
    logger.error(`Error in ${operation}`, error, {
      hasFallback: fallback !== undefined,
    });

    if (fallback !== undefined) {
      logger.info(`Using fallback value for ${operation}`);
      return fallback;
    }

    throw error;
  });
}

/**
 * Health check monitoring
 */
export async function monitorSystemHealth(): Promise<void> {
  const logger = new ProductionLogger('HealthCheck');

  try {
    // Check all critical services
    const health = await monitoringService.getSystemHealth();

    // Log health status
    logger.info('System health check', health);

    // Alert on unhealthy services
    if (!health.database) {
      alertingService.sendAlert({
        severity: 'critical',
        title: 'Database Unhealthy',
        message: 'Database health check failed',
        metadata: health,
      });
    }

    if (!health.transcription) {
      alertingService.sendAlert({
        severity: 'high',
        title: 'Transcription Service Unhealthy',
        message: 'Transcription service health check failed',
        metadata: health,
      });
    }

    if (!health.ai) {
      alertingService.sendAlert({
        severity: 'high',
        title: 'AI Service Unhealthy',
        message: 'AI service health check failed',
        metadata: health,
      });
    }

    if (!health.storage) {
      alertingService.sendAlert({
        severity: 'high',
        title: 'Storage Service Unhealthy',
        message: 'Storage service health check failed',
        metadata: health,
      });
    }
  } catch (error) {
    logger.error('Health check failed', error as Error, { critical: true });
  }
}

/**
 * Cost monitoring
 */
export async function monitorCosts(): Promise<void> {
  const logger = new ProductionLogger('CostMonitoring');

  if (process.env.ENABLE_COST_MONITORING !== 'true') {
    return;
  }

  try {
    const costs = await monitoringService.getCostMetrics();
    const threshold = parseFloat(process.env.COST_ALERT_THRESHOLD || '0.35');

    logger.info('Cost metrics', costs);

    // Alert if cost per user exceeds threshold
    if (costs.costPerUser > threshold) {
      alertingService.sendAlert({
        severity: 'high',
        title: 'Cost Threshold Exceeded',
        message: `Cost per user (${costs.costPerUser}) exceeds threshold (${threshold})`,
        metadata: costs,
      });
    }

    // Alert if monthly budget is exceeded
    const monthlyBudget = parseFloat(process.env.MONTHLY_BUDGET || '1000');
    if (costs.monthlyTotal > monthlyBudget) {
      alertingService.sendAlert({
        severity: 'critical',
        title: 'Monthly Budget Exceeded',
        message: `Monthly costs (${costs.monthlyTotal}) exceed budget (${monthlyBudget})`,
        metadata: costs,
      });
    }
  } catch (error) {
    logger.error('Cost monitoring failed', error as Error);
  }
}

/**
 * Performance metrics monitoring
 */
export async function monitorPerformance(): Promise<void> {
  const logger = new ProductionLogger('PerformanceMonitoring');

  try {
    const metrics = await monitoringService.getPerformanceMetrics();

    logger.info('Performance metrics', metrics);

    // Alert on high error rate
    if (metrics.errorRate > 0.01) {
      // > 1%
      alertingService.sendAlert({
        severity: 'high',
        title: 'High Error Rate',
        message: `Error rate (${(metrics.errorRate * 100).toFixed(2)}%) exceeds threshold (1%)`,
        metadata: metrics,
      });
    }

    // Alert on slow response times
    if (metrics.p95ResponseTime > 500) {
      alertingService.sendAlert({
        severity: 'medium',
        title: 'Slow Response Times',
        message: `P95 response time (${metrics.p95ResponseTime}ms) exceeds target (500ms)`,
        metadata: metrics,
      });
    }
  } catch (error) {
    logger.error('Performance monitoring failed', error as Error);
  }
}

/**
 * Start production monitoring
 */
export function startProductionMonitoring(): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Skipping production monitoring in non-production environment');
    return;
  }

  const logger = new ProductionLogger('Monitoring');
  logger.info('Starting production monitoring...');

  // Health checks every 5 minutes
  setInterval(monitorSystemHealth, 5 * 60 * 1000);

  // Cost monitoring every 15 minutes
  setInterval(monitorCosts, 15 * 60 * 1000);

  // Performance monitoring every 10 minutes
  setInterval(monitorPerformance, 10 * 60 * 1000);

  // Run initial checks
  monitorSystemHealth();
  monitorCosts();
  monitorPerformance();

  logger.info('Production monitoring started');
}

/**
 * Export logger factory
 */
export function createLogger(context: string): ProductionLogger {
  return new ProductionLogger(context);
}
