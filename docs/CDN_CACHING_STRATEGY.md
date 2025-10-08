# CDN and Caching Strategy

## Overview

VoiceFlow AI implements a comprehensive multi-level caching strategy to achieve optimal performance and meet the 99% cache hit rate target for static assets.

## Caching Levels

### 1. CDN/Edge Caching (Vercel Edge Network)

**Purpose**: Global content delivery with minimal latency

**Configuration**: Implemented in `middleware.ts` and `next.config.ts`

**Cache Rules**:
- **Static Assets** (`/_next/static/*`, images, fonts): 1 year immutable
- **Health Checks** (`/api/health`): 10 seconds with stale-while-revalidate
- **API Routes** (`/api/*`): No caching (dynamic content)
- **HTML Pages**: No cache, must revalidate

**Headers Used**:
- `Cache-Control`: Browser caching directives
- `CDN-Cache-Control`: Edge network caching
- `Vercel-CDN-Cache-Control`: Vercel-specific edge caching

### 2. Redis Caching

**Purpose**: Cache AI responses and expensive operations

**Implementation**: `lib/services/cache.ts`

**Use Cases**:
- AI processing results (7-day TTL)
- Transcription results
- Search results
- User session data

**Features**:
- Content-based cache keys (similar content reuses cache)
- Automatic expiration (TTL-based)
- Cache statistics tracking
- Graceful degradation on Redis failures

### 3. In-Memory Caching

**Purpose**: Ultra-fast access to frequently used data

**Implementation**: `lib/services/cacheStrategy.ts`

**Use Cases**:
- Hot data (frequently accessed)
- Configuration data
- User preferences
- Temporary computation results

**Features**:
- LRU eviction (max 1000 entries)
- Automatic expiration cleanup
- Memory-efficient storage

## Caching Strategy by Content Type

### Static Assets
```
Browser → CDN (1 year) → Origin
```
- Images, fonts, CSS, JavaScript
- Immutable with content hashing
- 99%+ cache hit rate target

### API Responses
```
Browser → No Cache → API → Redis (if applicable)
```
- Dynamic content, no CDN caching
- Redis caching for expensive operations
- Fresh data on every request

### AI Processing
```
Request → Memory Cache → Redis Cache → OpenAI API
```
- Multi-level cache lookup
- Content-based cache keys
- 7-day TTL for AI results

### Health Checks
```
Browser → CDN (10s) → API
```
- Short TTL with stale-while-revalidate
- Reduces load on health check endpoints
- Always returns recent data

## Performance Targets

| Metric | Target | Implementation |
|--------|--------|----------------|
| Static Asset Cache Hit Rate | 99% | CDN with 1-year TTL |
| API P95 Response Time | <500ms | Redis caching + optimization |
| Time to First Byte | <200ms | Edge functions + CDN |
| AI Response Cache Hit | >30% | Content-based caching |

## Cache Invalidation

### Automatic Invalidation
- TTL-based expiration
- Memory cache cleanup (every 5 minutes)
- Redis automatic expiration

### Manual Invalidation
```typescript
import { invalidateCache } from '@/lib/services/cache';

// Invalidate specific cache key
await invalidateCache('ai:result:abc123');
```

## Monitoring

### Cache Statistics
Access via `/api/metrics` endpoint:
- Cache hit rate
- Memory usage
- Key count
- Hits vs misses

### Health Checks
Access via `/api/health` endpoint:
- Redis connectivity
- Cache service status
- Performance metrics

## Best Practices

### 1. Use Appropriate Cache Levels
```typescript
import { getFromCache, setInCache, CacheLevel } from '@/lib/services/cacheStrategy';

// Hot data - use memory cache
const config = await getFromCache('app:config', {
  levels: [CacheLevel.MEMORY],
  ttl: 300,
});

// AI results - use Redis
const aiResult = await getFromCache('ai:result:xyz', {
  levels: [CacheLevel.REDIS],
  ttl: 604800, // 7 days
});

// Frequently accessed - use both
const userData = await getFromCache('user:123', {
  levels: [CacheLevel.MEMORY, CacheLevel.REDIS],
  ttl: 3600,
});
```

### 2. Set Appropriate TTLs
- **Static assets**: 1 year (immutable)
- **AI results**: 7 days
- **User data**: 1 hour
- **Configuration**: 5 minutes
- **Health checks**: 10 seconds

### 3. Handle Cache Misses Gracefully
```typescript
const cached = await getFromCache<AIResult>('ai:result:xyz');

if (!cached) {
  // Generate fresh result
  const result = await generateAIResult(input);
  
  // Cache for future requests
  await setInCache('ai:result:xyz', result, { ttl: 604800 });
  
  return result;
}

return cached;
```

### 4. Monitor Cache Performance
- Track cache hit rates
- Monitor memory usage
- Alert on cache failures
- Analyze cache effectiveness

## Vercel Edge Functions

### Configuration
Vercel automatically deploys Next.js API routes as Edge Functions with:
- Global distribution (300+ edge locations)
- Automatic scaling
- Built-in DDoS protection
- Edge caching support

### Edge-Optimized Routes
Routes that benefit from edge deployment:
- `/api/health` - Health checks
- Static asset serving
- Authentication checks
- Rate limiting (via Arcjet)

## Cost Optimization

### CDN Bandwidth Savings
- 99% cache hit rate reduces origin requests by 99%
- Estimated bandwidth savings: 95%+
- Lower Vercel function invocations

### Redis Cost Management
- Efficient cache key design
- Appropriate TTLs
- Memory usage monitoring
- Automatic cleanup of expired keys

## Troubleshooting

### Low Cache Hit Rate
1. Check cache headers in browser DevTools
2. Verify CDN configuration in `next.config.ts`
3. Check middleware cache headers
4. Review Vercel deployment logs

### Redis Connection Issues
1. Check `REDIS_URL` environment variable
2. Verify Redis service is running
3. Check network connectivity
4. Review error logs in monitoring

### Memory Cache Issues
1. Monitor memory usage via `/api/metrics`
2. Adjust max cache size if needed
3. Review TTL settings
4. Check for memory leaks

## Future Enhancements

- [ ] Implement cache warming for popular content
- [ ] Add cache preloading for predictable requests
- [ ] Implement distributed caching for multi-region
- [ ] Add cache analytics dashboard
- [ ] Implement smart cache invalidation based on content changes
