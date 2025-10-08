# Production Deployment Guide

## Overview

This guide covers deploying VoiceFlow AI to production with proper configuration, monitoring, and error handling.

## Prerequisites

- Node.js 22.15.0 or higher
- pnpm 10.17.1 or higher
- PostgreSQL 14+ database
- Redis instance (for caching)
- Vercel account (recommended) or alternative hosting

## Environment Setup

### 1. Copy Production Environment Template

```bash
cp .env.production.example .env.production
```

### 2. Configure Required Variables

Edit `.env.production` and set all required values:

#### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string with connection pooling
- `DIRECT_URL`: Direct PostgreSQL connection (for migrations)

#### AI Service Keys
- `DEEPGRAM_API_KEY`: Production Deepgram API key
- `ASSEMBLYAI_API_KEY`: Production AssemblyAI API key
- `OPENAI_API_KEY`: Production OpenAI API key

#### Storage Configuration
- `NEXT_PUBLIC_APPWRITE_ENDPOINT`: Appwrite Cloud endpoint
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`: Production project ID
- `APPWRITE_API_KEY`: Production API key

#### Security Configuration
- `ENCRYPTION_KEY`: 32+ character encryption key (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_SECRET`: Auth secret (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL`: Production domain URL
- `ARCJET_KEY`: Production Arcjet API key

#### Redis Configuration
- `REDIS_URL`: Production Redis connection string
- `REDIS_PASSWORD`: Redis password
- `REDIS_TLS`: Set to "true" for production


## Database Setup

### 1. Run Migrations

```bash
pnpm db:migrate
```

### 2. Verify Database Connection

```bash
pnpm verify-setup
```

### 3. Configure Connection Pooling

Set these environment variables for optimal performance:

```bash
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_POOL_CONNECTION_TIMEOUT=20000
```

## Build and Deploy

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Link project:
```bash
vercel link
```

3. Set environment variables:
```bash
vercel env add DATABASE_URL production
vercel env add DEEPGRAM_API_KEY production
# ... add all other variables
```

4. Deploy:
```bash
vercel --prod
```

### Option 2: Docker

1. Build Docker image:
```bash
docker build -t voiceflow-ai .
```

2. Run container:
```bash
docker run -p 3000:3000 --env-file .env.production voiceflow-ai
```

### Option 3: Manual Deployment

1. Build application:
```bash
pnpm build
```

2. Start production server:
```bash
pnpm start
```

## Post-Deployment Validation

### 1. Run Integration Validation

```bash
pnpm validate:integration
```

This checks:
- Database connectivity
- AI service availability
- Storage service health
- Authentication system
- API endpoint structure

### 2. Monitor Initial Traffic

Watch logs for:
- Error rates
- Response times
- Database connection usage
- AI service costs

### 3. Test Critical Flows

- User registration
- Audio upload and transcription
- AI processing
- Note management
- Search functionality

## Monitoring Setup

### Health Checks

The application exposes health check endpoints:

- `/api/health` - Overall system health
- `/api/transcription/health` - Transcription service health
- `/api/ai/health` - AI service health

### Logging

Production logs are structured JSON format:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "context": "API",
  "message": "Request processed",
  "duration": 150,
  "environment": "production"
}
```

### Alerting

Configure alerts for:
- Error rate > 1%
- P95 response time > 500ms
- Database connection pool > 80% usage
- Cost per user > $0.35
- Service health check failures

## Performance Optimization

### CDN Configuration

Static assets are cached with these headers:
- Images/fonts: 1 year cache
- JavaScript/CSS: 1 year cache (versioned)
- API responses: No cache
- HTML pages: Revalidate on each request

### Database Optimization

- Connection pooling enabled (2-10 connections)
- Indexes on frequently queried fields
- Full-text search with GIN indexes
- Query timeout: 20 seconds

### Caching Strategy

- AI responses cached in Redis
- Cache hit rate target: > 30%
- Cache TTL: 24 hours for AI responses
- CDN cache hit rate target: > 99%

## Security Checklist

- [ ] All environment variables set
- [ ] HTTPS enabled (TLS 1.3)
- [ ] Arcjet protection on all API routes
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Encryption keys rotated
- [ ] Database credentials secured
- [ ] API keys restricted to production domains

## Cost Monitoring

### Target Metrics

- Cost per active user: ≤ $0.31/month
- Gross margin: 94-97%
- Monthly budget alerts enabled

### Cost Optimization

- AI response caching enabled
- Intelligent model selection
- Batch processing for efficiency
- Usage caps per user tier

## Troubleshooting

### High Error Rate

1. Check service health: `pnpm validate:integration`
2. Review error logs for patterns
3. Verify external service availability
4. Check database connection pool

### Slow Response Times

1. Monitor database query performance
2. Check AI service latency
3. Verify CDN cache hit rate
4. Review connection pool usage

### Database Connection Issues

1. Check connection pool configuration
2. Verify database credentials
3. Monitor active connections
4. Review connection timeout settings

### AI Service Failures

1. Verify API keys are valid
2. Check service quotas and limits
3. Monitor fallback provider usage
4. Review error logs for patterns

## Rollback Procedure

If issues occur after deployment:

1. Revert to previous deployment:
```bash
vercel rollback
```

2. Check database migrations:
```bash
pnpm db:migrate
```

3. Verify environment variables
4. Run integration validation
5. Monitor error rates and performance

## Maintenance

### Regular Tasks

- Weekly: Review error logs and performance metrics
- Monthly: Rotate encryption keys
- Monthly: Review and optimize database queries
- Quarterly: Update dependencies
- Quarterly: Review and optimize AI costs

### Backup Strategy

- Database: Daily automated backups
- Retention: 30 days
- Test restore procedure monthly

## Support and Monitoring

### Key Metrics Dashboard

Monitor these metrics:
- Request rate and error rate
- P95/P99 response times
- Database connection pool usage
- AI service costs
- Cache hit rates
- User growth and engagement

### On-Call Procedures

1. Check health endpoints
2. Review recent deployments
3. Check external service status
4. Review error logs
5. Escalate if needed

## Additional Resources

- [Configuration Guide](./CONFIGURATION.md)
- [Monitoring and Alerting](./MONITORING_ALERTING.md)
- [Security and Compliance](./SECURITY_COMPLIANCE.md)
- [API Documentation](./API.md)
