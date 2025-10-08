# Monitoring and Alerting System

## Overview

VoiceFlow AI implements comprehensive monitoring, logging, and alerting to ensure optimal performance, security, and cost management.

## Components

### 1. Monitoring Service (`lib/services/monitoring.ts`)

**Purpose**: Structured logging and performance metrics collection

**Features**:
- Structured JSON logging with context
- Performance metric tracking
- Security event logging
- Error tracking with stack traces
- Metric aggregation and analysis

**Usage**:
```typescript
import { monitoringService, LogLevel, MetricType } from '@/lib/services/monitoring';

// Log with context
monitoringService.log(LogLevel.INFO, 'User action completed', {
  userId: '123',
  action: 'note_created',
});

// Track API performance
monitoringService.trackAPIResponseTime('/api/notes', 'POST', 245, 200);

// Track transcription performance
monitoringService.trackTranscriptionTime('deepgram', 1200, 10000);

// Log errors
monitoringService.logError('Failed to process audio', error, { userId });
```

### 2. Alerting Service (`lib/services/alerting.ts`)

**Purpose**: Threshold monitoring and anomaly detection

**Features**:
- Performance threshold monitoring
- Error rate tracking
- Cost threshold alerts
- Security event alerts
- Anomaly detection
- Alert handlers for notifications

**Default Thresholds**:
- API P95 response time: >500ms (WARNING)
- Database query time: >100ms (WARNING)
- Error rate: >1% (CRITICAL)
- Cost per user: >$0.35 (WARNING)

**Usage**:
```typescript
import { alertingService, AlertType, AlertSeverity } from '@/lib/services/alerting';

// Create custom alert
alertingService.createAlert(
  AlertType.PERFORMANCE_THRESHOLD,
  AlertSeverity.WARNING,
  'Custom Alert',
  'Something needs attention',
  { customData: 'value' }
);

// Register alert handler
alertingService.onAlert((alert) => {
  // Send to external service (email, Slack, etc.)
  console.log('Alert:', alert);
});

// Get alerts
const alerts = alertingService.getAlerts({
  severity: AlertSeverity.CRITICAL,
  resolved: false,
});
```

### 3. Cost Monitoring Service (`lib/services/costMonitoring.ts`)

**Purpose**: Track operational costs and usage

**Features**:
- Per-service cost tracking
- Cost per user calculation
- Usage metrics
- Cost projections
- Automatic threshold alerts

**Usage**:
```typescript
import { costMonitoringService } from '@/lib/services/costMonitoring';

// Track transcription cost
costMonitoringService.trackTranscriptionCost('deepgram', 120);

// Track AI processing cost
costMonitoringService.trackAIProcessingCost(1500, 500);

// Get cost metrics
const costs = costMonitoringService.getCostMetrics();
console.log('Cost per user:', costs.costPerUser);
```

## API Endpoints

### Health Check: `GET /api/health`

Comprehensive health check for all services.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-08T10:00:00Z",
  "services": {
    "database": { "status": "up", "latency": 45 },
    "cache": { "status": "up", "details": { "hitRate": "85%" } },
    "ai": { "status": "up", "latency": 120 },
    "transcription": { "status": "up" },
    "storage": { "status": "up" }
  },
  "metrics": {
    "apiResponseTime": { "p95": 320, "average": 180, "count": 1250 },
    "errorRate": 0.5,
    "uptime": 86400
  }
}
```

### Metrics: `GET /api/metrics`

Performance metrics and statistics (requires authentication).

**Response**:
```json
{
  "timestamp": "2025-01-08T10:00:00Z",
  "metrics": {
    "api": {
      "responseTime": { "p95": 320, "average": 180, "count": 1250 },
      "errorRate": "0.5%",
      "target": { "p95": 500, "unit": "ms" }
    },
    "transcription": {
      "processingTime": { "p95": 1200, "average": 800, "count": 45 },
      "target": { "speedMultiplier": "5-10x" }
    }
  }
}
```

### Alerts: `GET /api/alerts`

Access system alerts (requires authentication).

**Query Parameters**:
- `severity`: Filter by severity (info, warning, critical)
- `type`: Filter by type
- `resolved`: Filter by resolution status (true/false)
- `limit`: Maximum number of alerts (default: 100)

**Response**:
```json
{
  "alerts": [
    {
      "id": "alert_123",
      "type": "performance_threshold",
      "severity": "warning",
      "title": "API Response Time Threshold Exceeded",
      "message": "API P95 response time is 520ms (target: <500ms)",
      "timestamp": "2025-01-08T10:00:00Z",
      "resolved": false
    }
  ],
  "stats": {
    "total": 15,
    "unresolved": 3
  }
}
```

**Resolve Alert**: `POST /api/alerts`
```json
{
  "alertId": "alert_123",
  "action": "resolve"
}
```

### Security Events: `GET /api/security/events`

Access security event logs (requires authentication).

**Query Parameters**:
- `severity`: Filter by severity (low, medium, high, critical)
- `limit`: Maximum number of events (default: 100)

### Cost Monitoring: `GET /api/costs`

Cost metrics and projections (requires authentication).

**Response**:
```json
{
  "costs": {
    "current": {
      "transcription": 12.50,
      "aiProcessing": 8.30,
      "storage": 2.10,
      "database": 0.50,
      "total": 23.40,
      "costPerUser": 0.29
    },
    "breakdown": [
      { "category": "Transcription", "cost": 12.50, "percentage": 53.4 },
      { "category": "AI Processing", "cost": 8.30, "percentage": 35.5 }
    ]
  },
  "usage": {
    "activeUsers": 80,
    "transcriptionMinutes": 2900,
    "aiRequests": 1660,
    "storageGB": 91.3
  },
  "projection": {
    "currentDaily": 23.40,
    "projectedMonthly": 702.00,
    "projectedPerUser": 0.29,
    "daysElapsed": 8
  },
  "targets": {
    "costPerUser": 0.31,
    "alertThreshold": 0.35,
    "criticalThreshold": 0.40
  }
}
```

## Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API P95 Response Time | <500ms | >500ms |
| Time to First Byte | <200ms | >300ms |
| Database Query P95 | <100ms | >100ms |
| Error Rate | <1% | >1% |
| Cost Per User | $0.31 | >$0.35 |
| Cache Hit Rate | 99% | <95% |

## Automatic Monitoring

### Periodic Checks

The system automatically runs checks every minute:
- Performance threshold monitoring
- Anomaly detection
- Cost threshold verification
- Security event analysis

### Automatic Alerts

Alerts are automatically created when:
- API P95 response time exceeds 500ms
- Database queries exceed 100ms
- Error rate exceeds 1%
- Cost per user exceeds $0.35
- Multiple high-severity security events detected
- Response time spikes (5x average)

## Integration with Services

### Audit Logging Integration

Security-relevant audit log entries automatically create security events:
- User registration/login/logout
- Data exports and deletions
- Encryption key access
- Unauthorized access attempts

### Cost Tracking Integration

Services automatically track costs:
- Transcription service tracks per-minute costs
- AI service tracks token usage costs
- Storage service tracks GB costs
- Database queries tracked for cost estimation

## Best Practices

### 1. Use Monitoring Wrapper

Wrap API handlers with monitoring:
```typescript
import { withMonitoring } from '@/lib/services/monitoring';

export async function POST(request: NextRequest) {
  return withMonitoring(
    async () => {
      // Your handler logic
    },
    {
      endpoint: '/api/notes',
      method: 'POST',
      userId: session?.user.id,
    }
  );
}
```

### 2. Log Contextual Information

Always include relevant context:
```typescript
monitoringService.log(LogLevel.INFO, 'Note created', {
  userId: session.user.id,
  noteId: note.id,
  duration: Date.now() - startTime,
});
```

### 3. Track Performance Metrics

Track key operations:
```typescript
const startTime = Date.now();
const result = await expensiveOperation();
const duration = Date.now() - startTime;

monitoringService.trackAPIResponseTime(
  '/api/operation',
  'POST',
  duration,
  200
);
```

### 4. Handle Alerts

Register alert handlers for notifications:
```typescript
alertingService.onAlert((alert) => {
  if (alert.severity === AlertSeverity.CRITICAL) {
    // Send to PagerDuty, Slack, etc.
    sendCriticalAlert(alert);
  }
});
```

## Troubleshooting

### High Error Rate

1. Check `/api/metrics` for error details
2. Review logs for error patterns
3. Check `/api/health` for service status
4. Review recent deployments

### Performance Degradation

1. Check `/api/metrics` for slow endpoints
2. Review database query times
3. Check cache hit rates
4. Review transcription/AI processing times

### Cost Overruns

1. Check `/api/costs` for breakdown
2. Review usage metrics
3. Check for inefficient caching
4. Review AI token usage

### Missing Metrics

1. Verify monitoring service is initialized
2. Check that services are tracking metrics
3. Review metric buffer size
4. Check for service errors

## Future Enhancements

- [ ] Integration with external monitoring (Datadog, New Relic)
- [ ] Custom dashboard for metrics visualization
- [ ] Webhook support for alert notifications
- [ ] Advanced anomaly detection with ML
- [ ] Historical metric storage and analysis
- [ ] Custom alert rules configuration
- [ ] SLA tracking and reporting
