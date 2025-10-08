/**
 * Alerting and Anomaly Detection Service
 * Monitor thresholds and detect anomalies
 * Requirements: 9.3, 10.4
 */

import { monitoringService, MetricType } from './monitoring';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertType {
  PERFORMANCE_THRESHOLD = 'performance_threshold',
  ERROR_RATE = 'error_rate',
  COST_THRESHOLD = 'cost_threshold',
  SECURITY_EVENT = 'security_event',
  SERVICE_DOWN = 'service_down',
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
  resolved: boolean;
}

export interface AlertThreshold {
  metric: MetricType | string;
  threshold: number;
  comparison: 'gt' | 'lt' | 'eq';
  severity: AlertSeverity;
  message: string;
}

class AlertingService {
  private alerts: Alert[] = [];
  private readonly MAX_ALERTS = 1000;
  private alertHandlers: Array<(alert: Alert) => void> = [];

  // Default thresholds based on requirements
  private thresholds: AlertThreshold[] = [
    {
      metric: MetricType.API_RESPONSE_TIME,
      threshold: 500, // P95 < 500ms (Requirement 7.2)
      comparison: 'gt',
      severity: AlertSeverity.WARNING,
      message: 'API response time P95 exceeds 500ms target',
    },
    {
      metric: MetricType.DATABASE_QUERY_TIME,
      threshold: 100,
      comparison: 'gt',
      severity: AlertSeverity.WARNING,
      message: 'Database query time exceeds 100ms',
    },
    {
      metric: 'error_rate',
      threshold: 1, // Error rate > 1%
      comparison: 'gt',
      severity: AlertSeverity.CRITICAL,
      message: 'Error rate exceeds 1%',
    },
    {
      metric: 'cost_per_user',
      threshold: 0.35, // Alert at $0.35 (target is $0.31)
      comparison: 'gt',
      severity: AlertSeverity.WARNING,
      message: 'Cost per user exceeds budget threshold',
    },
  ];

  /**
   * Register alert handler
   */
  onAlert(handler: (alert: Alert) => void): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Create and dispatch alert
   */
  createAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Alert {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      metadata,
      resolved: false,
    };

    this.alerts.push(alert);

    // Keep buffer size manageable
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts.shift();
    }

    // Log alert
    monitoringService.log(
      severity === AlertSeverity.CRITICAL ? 'critical' : 'warn',
      `Alert: ${title}`,
      { alert }
    );

    // Dispatch to handlers
    this.alertHandlers.forEach((handler) => {
      try {
        handler(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    });

    return alert;
  }

  /**
   * Check performance thresholds
   */
  checkPerformanceThresholds(): Alert[] {
    const newAlerts: Alert[] = [];

    // Check API response time
    const apiMetrics = monitoringService.getMetricsSummary(
      MetricType.API_RESPONSE_TIME
    );
    if (apiMetrics.p95 > 500 && apiMetrics.count > 10) {
      newAlerts.push(
        this.createAlert(
          AlertType.PERFORMANCE_THRESHOLD,
          AlertSeverity.WARNING,
          'API Response Time Threshold Exceeded',
          `API P95 response time is ${Math.round(apiMetrics.p95)}ms (target: <500ms)`,
          { p95: apiMetrics.p95, count: apiMetrics.count }
        )
      );
    }

    // Check database query time
    const dbMetrics = monitoringService.getMetricsSummary(
      MetricType.DATABASE_QUERY_TIME
    );
    if (dbMetrics.p95 > 100 && dbMetrics.count > 10) {
      newAlerts.push(
        this.createAlert(
          AlertType.PERFORMANCE_THRESHOLD,
          AlertSeverity.WARNING,
          'Database Query Time Threshold Exceeded',
          `Database P95 query time is ${Math.round(dbMetrics.p95)}ms (target: <100ms)`,
          { p95: dbMetrics.p95, count: dbMetrics.count }
        )
      );
    }

    // Check error rate
    const errorRate = monitoringService.getErrorRate(5);
    if (errorRate > 1) {
      newAlerts.push(
        this.createAlert(
          AlertType.ERROR_RATE,
          AlertSeverity.CRITICAL,
          'High Error Rate Detected',
          `Error rate is ${errorRate.toFixed(2)}% (threshold: 1%)`,
          { errorRate }
        )
      );
    }

    return newAlerts;
  }

  /**
   * Check cost thresholds
   */
  checkCostThresholds(costPerUser: number): Alert | null {
    if (costPerUser > 0.35) {
      return this.createAlert(
        AlertType.COST_THRESHOLD,
        costPerUser > 0.40 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        'Cost Per User Threshold Exceeded',
        `Cost per user is $${costPerUser.toFixed(2)} (target: $0.31, alert: $0.35)`,
        { costPerUser, target: 0.31, threshold: 0.35 }
      );
    }
    return null;
  }

  /**
   * Detect anomalies in metrics
   */
  detectAnomalies(): Alert[] {
    const newAlerts: Alert[] = [];

    // Check for sudden spike in response times
    const apiMetrics = monitoringService.getMetricsSummary(
      MetricType.API_RESPONSE_TIME
    );
    if (apiMetrics.max > apiMetrics.average * 5 && apiMetrics.count > 20) {
      newAlerts.push(
        this.createAlert(
          AlertType.PERFORMANCE_THRESHOLD,
          AlertSeverity.WARNING,
          'Response Time Spike Detected',
          `Max response time (${Math.round(apiMetrics.max)}ms) is 5x higher than average (${Math.round(apiMetrics.average)}ms)`,
          { max: apiMetrics.max, average: apiMetrics.average }
        )
      );
    }

    // Check for security events
    const securityEvents = monitoringService.getSecurityEvents('high');
    if (securityEvents.length > 5) {
      newAlerts.push(
        this.createAlert(
          AlertType.SECURITY_EVENT,
          AlertSeverity.CRITICAL,
          'Multiple High-Severity Security Events',
          `${securityEvents.length} high-severity security events detected`,
          { count: securityEvents.length, events: securityEvents.slice(0, 5) }
        )
      );
    }

    return newAlerts;
  }

  /**
   * Get all alerts
   */
  getAlerts(options?: {
    severity?: AlertSeverity;
    type?: AlertType;
    resolved?: boolean;
    limit?: number;
  }): Alert[] {
    let filtered = [...this.alerts];

    if (options?.severity) {
      filtered = filtered.filter((a) => a.severity === options.severity);
    }

    if (options?.type) {
      filtered = filtered.filter((a) => a.type === options.type);
    }

    if (options?.resolved !== undefined) {
      filtered = filtered.filter((a) => a.resolved === options.resolved);
    }

    const limit = options?.limit || 100;
    return filtered.slice(-limit);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      monitoringService.log('info', `Alert resolved: ${alert.title}`, {
        alertId,
      });
      return true;
    }
    return false;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    total: number;
    unresolved: number;
    bySeverity: Record<AlertSeverity, number>;
    byType: Record<AlertType, number>;
  } {
    const stats = {
      total: this.alerts.length,
      unresolved: this.alerts.filter((a) => !a.resolved).length,
      bySeverity: {
        [AlertSeverity.INFO]: 0,
        [AlertSeverity.WARNING]: 0,
        [AlertSeverity.CRITICAL]: 0,
      },
      byType: {
        [AlertType.PERFORMANCE_THRESHOLD]: 0,
        [AlertType.ERROR_RATE]: 0,
        [AlertType.COST_THRESHOLD]: 0,
        [AlertType.SECURITY_EVENT]: 0,
        [AlertType.SERVICE_DOWN]: 0,
      },
    };

    this.alerts.forEach((alert) => {
      stats.bySeverity[alert.severity]++;
      stats.byType[alert.type]++;
    });

    return stats;
  }
}

// Singleton instance
export const alertingService = new AlertingService();

// Set up periodic threshold checks (every minute)
setInterval(() => {
  alertingService.checkPerformanceThresholds();
  alertingService.detectAnomalies();
}, 60 * 1000);
