# AI Content Processing

This document describes the AI-powered content processing system in VoiceFlow AI.

## Overview

The AI processing system uses OpenAI's GPT-4o to analyze voice transcriptions and extract meaningful insights. The system includes intelligent caching, cost optimization, and graceful degradation for reliability.

## Features

### 1. Summary Generation

Automatically generates concise summaries from transcriptions:

- 2-3 sentence overview
- Key points extraction (max 5)
- Action items with priority levels
- Important dates identification

**Requirement**: 3.1 - Generate intelligent summary using GPT-4o

### 2. Insight Extraction

Extracts structured insights from content:

- Key topics discussed
- Action items with due dates
- Important dates with context
- Sentiment analysis
- Named entity recognition

**Requirement**: 3.2 - Extract key topics, action items, and important dates

### 3. Content Moderation

Safety filters with 98% precision:

- Hate speech detection
- Harassment detection
- Self-harm content detection
- Sexual content detection
- Violence detection

**Requirement**: 3.5 - Content moderation with safety filters

### 4. Intelligent Caching

Redis-based caching for similar content:

- Content similarity detection
- 7-day cache TTL
- Automatic cache key generation
- Cache hit rate tracking

**Requirement**: 3.3 - Cache AI responses for similar content

### 5. Cost Optimization

Intelligent model selection based on content complexity:

- **GPT-3.5-turbo**: Simple content (<200 words, low complexity)
- **GPT-4**: Medium complexity (200-500 words)
- **GPT-4o**: Complex content (>500 words, high complexity)

**Requirements**: 10.1, 10.2 - Cost optimization and efficiency

### 6. Graceful Degradation

Fallback mechanisms for reliability:

- Primary model → Fallback model (GPT-3.5-turbo)
- AI processing → Transcription-only mode
- Exponential backoff retry logic
- User notifications for degraded service

**Requirement**: 3.4 - Graceful degradation for AI failures

## API Endpoints

### POST /api/ai/process

Process a transcription with AI analysis.

**Request:**

```json
{
  "transcription": "string (min 10 characters)",
  "noteId": "uuid (optional)",
  "options": {
    "model": "gpt-4o | gpt-4 | gpt-3.5-turbo (optional)",
    "enableModeration": "boolean (optional, default: true)",
    "cacheKey": "string (optional)"
  }
}
```

**Response:**

```json
{
  "data": {
    "summary": {
      "summary": "string",
      "keyPoints": ["string"],
      "actionItems": [
        {
          "text": "string",
          "priority": "high | medium | low",
          "completed": false
        }
      ],
      "importantDates": ["ISO date"],
      "confidence": 0.85,
      "wordCount": 150,
      "processingTime": 1234
    },
    "insights": {
      "keyTopics": ["string"],
      "actionItems": [...],
      "importantDates": [...],
      "sentiment": "positive | neutral | negative",
      "entities": [...]
    },
    "moderation": {
      "flagged": false,
      "categories": {...},
      "categoryScores": {...},
      "precision": 0.98
    },
    "cached": false,
    "model": "gpt-4o",
    "totalTokens": 1500,
    "cost": 0.0225,
    "notification": {
      "type": "warning",
      "message": "string (if in fallback mode)"
    }
  },
  "requestId": "uuid",
  "timestamp": "ISO date"
}
```

**Error Response:**

```json
{
  "error": {
    "code": "AI_PROCESSING_FAILED",
    "message": "string",
    "retryable": true,
    "fallbackAvailable": true
  },
  "requestId": "uuid",
  "timestamp": "ISO date"
}
```

### GET /api/ai/health

Check AI service health and cache statistics.

**Response:**

```json
{
  "data": {
    "ai": {
      "available": true,
      "model": "gpt-3.5-turbo",
      "latency": 234,
      "error": "string (if unavailable)"
    },
    "cache": {
      "enabled": true,
      "keys": 150,
      "memory": "2.5MB",
      "hitRate": "85.5%"
    },
    "status": "healthy | degraded | unhealthy"
  },
  "timestamp": "ISO date"
}
```

## Service Functions

### processTranscription

Main function for AI processing with caching and fallback.

```typescript
import { processTranscription } from "@/lib/services/ai";

const result = await processTranscription(transcription, {
  model: "gpt-4o", // Optional
  enableModeration: true, // Optional
  cacheKey: "custom-key", // Optional
});
```

### processTranscriptionWithRetry

Process with automatic retry logic (3 attempts with exponential backoff).

```typescript
import { processTranscriptionWithRetry } from "@/lib/services/ai";

const result = await processTranscriptionWithRetry(
  transcription,
  options,
  3 // maxRetries
);
```

### batchProcessTranscriptions

Process multiple transcriptions efficiently.

```typescript
import { batchProcessTranscriptions } from "@/lib/services/ai";

const results = await batchProcessTranscriptions([
  { id: "1", text: "transcription 1" },
  { id: "2", text: "transcription 2" },
]);
```

### estimateCost

Estimate processing cost before execution.

```typescript
import { estimateCost } from "@/lib/services/ai";

const { model, estimatedCost, estimatedTokens } = estimateCost(
  transcription,
  "gpt-4o"
);
```

### checkAIServiceHealth

Check if AI service is available.

```typescript
import { checkAIServiceHealth } from "@/lib/services/ai";

const health = await checkAIServiceHealth();
console.log(`AI available: ${health.available}`);
```

## Caching Functions

### generateCacheKey

Generate cache key from transcription content.

```typescript
import { generateCacheKey } from "@/lib/services/cache";

const cacheKey = generateCacheKey(transcription);
```

### getCachedResult

Retrieve cached AI result.

```typescript
import { getCachedResult } from "@/lib/services/cache";

const cached = await getCachedResult(cacheKey);
if (cached) {
  console.log("Cache hit!");
}
```

### cacheResult

Store AI result in cache.

```typescript
import { cacheResult } from "@/lib/services/cache";

await cacheResult(cacheKey, result, 604800); // 7 days TTL
```

### getCacheStats

Get cache performance statistics.

```typescript
import { getCacheStats } from "@/lib/services/cache";

const stats = await getCacheStats();
console.log(`Cache hit rate: ${stats.hits / (stats.hits + stats.misses)}`);
```

## Cost Management

### Model Costs (per 1K tokens)

| Model | Input | Output |
|-------|-------|--------|
| GPT-4o | $0.005 | $0.015 |
| GPT-4 | $0.030 | $0.060 |
| GPT-3.5-turbo | $0.0005 | $0.0015 |

### Cost Optimization Strategies

1. **Intelligent Model Selection**: Automatically selects the most cost-effective model based on content complexity
2. **Response Caching**: Cache similar content to avoid redundant API calls
3. **Batch Processing**: Process multiple transcriptions efficiently
4. **Usage Monitoring**: Track costs per user and set alerts

### Target Metrics

- Operational cost: ≤$0.31 per active user monthly
- Gross margin: 94-97%
- Cache hit rate: >50%

## Error Handling

### Error Codes

- `SUMMARY_GENERATION_FAILED`: Summary generation failed
- `INSIGHT_EXTRACTION_FAILED`: Insight extraction failed
- `MODERATION_FAILED`: Content moderation failed
- `PROCESSING_FAILED`: General processing failure
- `INVALID_INPUT`: Invalid request data

### Fallback Behavior

1. **Primary Model Failure**: Retry with GPT-3.5-turbo
2. **All AI Failures**: Return transcription-only mode
3. **Cache Failure**: Continue without caching (log error)
4. **Moderation Failure**: Continue without moderation (log warning)

### Retry Logic

- Maximum 3 retry attempts
- Exponential backoff: 1s, 2s, 4s
- Only retry on retryable errors
- Return transcription-only mode after all retries fail

## Environment Variables

```bash
# Required
OPENAI_API_KEY="your_openai_api_key"

# Optional (Redis caching)
REDIS_URL="redis://localhost:6379"
```

## Performance Targets

- API response time: <2s for AI processing
- Cache lookup: <10ms
- Hallucination rate: <2%
- Content moderation precision: 98%

## Monitoring

### Key Metrics

- AI processing success rate
- Cache hit rate
- Average processing time
- Cost per request
- Model usage distribution
- Error rate by type

### Health Checks

Run health check to verify AI service availability:

```bash
curl http://localhost:3000/api/ai/health
```

## Testing

### Unit Tests

Test AI service functions:

```typescript
import { describe, it, expect } from "vitest";
import { selectModel, estimateCost } from "@/lib/services/ai";

describe("AI Service", () => {
  it("should select appropriate model", () => {
    const shortText = "Hello world";
    const model = selectModel(shortText);
    expect(model).toBe("gpt-3.5-turbo");
  });

  it("should estimate cost accurately", () => {
    const text = "Test transcription";
    const { estimatedCost } = estimateCost(text, "gpt-4o");
    expect(estimatedCost).toBeGreaterThan(0);
  });
});
```

### Integration Tests

Test full AI processing pipeline:

```typescript
import { processTranscription } from "@/lib/services/ai";

const result = await processTranscription("Test transcription");
expect(result.summary).toBeDefined();
expect(result.insights).toBeDefined();
```

## Best Practices

1. **Always use caching**: Enable caching for production to reduce costs
2. **Monitor costs**: Track per-user costs and set up alerts
3. **Handle failures gracefully**: Always provide fallback content
4. **Validate input**: Ensure transcriptions are meaningful before processing
5. **Use batch processing**: Process multiple items together when possible
6. **Test with real data**: Use actual transcriptions for testing
7. **Monitor performance**: Track processing times and optimize as needed

## Troubleshooting

### AI Processing Fails

1. Check OpenAI API key is valid
2. Verify API quota and rate limits
3. Check network connectivity
4. Review error logs for specific issues

### Cache Not Working

1. Verify Redis is running
2. Check REDIS_URL environment variable
3. Review Redis connection logs
4. Test cache with simple operations

### High Costs

1. Review model selection logic
2. Check cache hit rate
3. Analyze usage patterns
4. Consider implementing usage caps

### Low Accuracy

1. Review prompt engineering
2. Test with different models
3. Adjust temperature settings
4. Validate input quality

## Future Enhancements

- Fine-tuned models for voice transcriptions
- Multi-language support
- Custom entity extraction
- Advanced sentiment analysis
- Real-time streaming processing
- A/B testing for prompts
