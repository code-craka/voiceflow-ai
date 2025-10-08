---
inclusion: always
---

# VoiceFlow AI Product Context

VoiceFlow AI is a voice note-taking application with AI-powered transcription and content processing. Users record audio, get automatic transcription, and receive AI-generated summaries and insights.

## Core Feature Set

### Audio Recording
- Browser-based capture using Web Audio API with MediaRecorder
- Opus codec at 64 kbps for optimal quality/size balance
- Real-time visual feedback during recording

### Transcription Pipeline
- Primary: Deepgram Nova-2 (target 90%+ accuracy)
- Fallback: AssemblyAI (always implement fallback pattern)
- Processing speed: 5-10x real-time
- All transcription endpoints must handle both services

### AI Content Processing
- Model: GPT-4o for summaries and insights
- Features: Summaries, key points, action item extraction
- Cache AI responses in Redis for similar content
- Implement graceful degradation (transcription-only mode if AI fails)

### Data Organization
- Hierarchical folder structure
- Tag-based categorization
- Full-text search via PostgreSQL GIN indexes
- All search queries must use indexed fields

### Security & Privacy
- AES-256-GCM encryption for all audio files before storage
- User-controlled encryption keys
- GDPR-compliant data export and deletion
- Audit logging for all data operations

## Performance Requirements

When implementing features, ensure:
- API P95 response time: <500ms
- Time to First Byte: <200ms
- Search response: <100ms
- Database queries use proper indexing
- CDN cache hit rate target: 99%

## Cost Optimization Rules

- Cache AI responses for similar content (Redis)
- Monitor per-user costs (alert threshold: $0.35/user)
- Implement usage caps per user tier
- Use intelligent model selection based on content complexity
- Target operational cost: ≤$0.31 per active user monthly
- Maintain 94-97% gross margins

## User Experience Priorities

1. **Speed**: Fast feedback on all operations
2. **Reliability**: Fallback mechanisms for all AI services
3. **Privacy**: User control over data and encryption
4. **Simplicity**: Minimal friction in recording and organizing notes

## GDPR Compliance Requirements

When handling user data:
- Implement audit logging for all data operations
- Provide data export functionality (JSON format)
- Support complete data deletion on request
- Store user consent preferences
- Include data retention policies