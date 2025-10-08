# VoiceFlow AI Testing Guide

This guide provides comprehensive information about testing VoiceFlow AI, including setup, running tests, and understanding test coverage.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Prerequisites](#prerequisites)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Writing Tests](#writing-tests)
- [Troubleshooting](#troubleshooting)

## Overview

VoiceFlow AI uses **Vitest** as the testing framework with the following test types:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between multiple components and services
- **End-to-End Tests**: Test complete user workflows from start to finish

## Test Structure

```
tests/
├── integration/                    # Integration tests
│   ├── audio-pipeline-e2e.test.ts  # E2E audio processing pipeline
│   ├── auth-registration.test.ts   # User registration flow
│   ├── auth-login.test.ts          # User login flow
│   ├── auth-protected-routes.test.ts # API route protection
│   ├── auth-session-management.test.ts # Session lifecycle
│   ├── auth-data-preservation.test.ts # Data integrity
│   └── README.md                   # Integration test documentation
├── unit/                           # Unit tests
│   ├── auth.test.ts                # Authentication service tests
│   └── migrate-existing-users.test.ts # Migration script tests
├── performance/                    # Performance tests (future)
└── TESTING_GUIDE.md               # This file
```

## Prerequisites

### 1. Database Setup

Ensure PostgreSQL is running and configured:

```bash
# Check if PostgreSQL is running
psql -U voiceflow_ai -h localhost -d voiceflow_ai

# If not running, start it (macOS with Homebrew)
brew services start postgresql@14
```

### 2. Environment Variables

Ensure `.env.local` has all required variables:

```bash
# Database
DATABASE_URL="postgresql://voiceflow_ai:voiceflow_ai@localhost:5432/voiceflow_ai?schema=public"
DIRECT_URL="postgresql://voiceflow_ai:voiceflow_ai@localhost:5432/voiceflow_ai?schema=public"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"

# AI Services (for E2E tests)
DEEPGRAM_API_KEY="your-deepgram-key"
ASSEMBLYAI_API_KEY="your-assemblyai-key"
OPENAI_API_KEY="your-openai-key"
```

### 3. Database Migrations

Run migrations to ensure schema is up to date:

```bash
# Generate Prisma client
pnpm run db:generate

# Apply migrations
pnpm run db:migrate
```

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Specific Test Suites

```bash
# Integration tests only
pnpm test tests/integration/

# Unit tests only
pnpm test tests/unit/

# Specific test file
pnpm test tests/integration/audio-pipeline-e2e.test.ts
```

### Watch Mode

Run tests in watch mode for development:

```bash
pnpm test:watch
```

### Run with Coverage

```bash
pnpm test --coverage
```

## Test Coverage

### Integration Tests

#### 1. Audio Pipeline E2E Test (`audio-pipeline-e2e.test.ts`)

**Purpose**: Tests the complete audio processing workflow from recording to AI processing.

**What it tests:**
- Audio recording → transcription → AI processing pipeline
- Transcription job submission and status tracking
- Fallback mechanism (Deepgram → AssemblyAI)
- AI content processing (summaries, insights, action items)
- Graceful degradation when AI services fail
- Complete user journey (registration → notes → folders → tags)
- Cross-browser compatibility (different audio formats)
- Mobile responsiveness (small chunks, interrupted recordings)
- Performance validation (processing time, concurrent requests)
- Error handling and recovery

**Requirements covered:** 8.2, 8.4, 11.1

**Timeout:** 30 seconds (due to AI service calls)

#### 2. Authentication Tests

**auth-registration.test.ts**
- User registration with Better Auth
- Encryption key generation
- GDPR consent storage
- Duplicate email rejection
- Password validation

**auth-login.test.ts**
- Login with valid credentials
- Session creation
- Invalid credential handling
- Multiple session support

**auth-protected-routes.test.ts**
- Session verification on API routes
- Invalid/expired token handling
- Authorization patterns
- User data access control

**auth-session-management.test.ts**
- Session lifecycle (creation, expiry, refresh)
- Session invalidation on sign out
- Multiple concurrent sessions
- Session timestamp updates

**auth-data-preservation.test.ts**
- Custom field preservation (encryptionKeyHash, gdprConsent)
- Relationship integrity (notes, folders, tags)
- Referential integrity on deletion
- Complex queries with relationships

### Unit Tests

#### Authentication Service Test (`auth.test.ts`)

**Purpose**: Tests the authentication service functions with Better Auth integration.

**What it tests:**
- User registration with Better Auth
  - Successful registration with encryption key generation
  - Custom field preservation (encryptionKeyHash, gdprConsent)
  - Better Auth API integration (signUpEmail)
  - Error handling when Better Auth fails
  - IP address tracking in GDPR consent
- GDPR consent management
  - Updating consent with IP address
  - Updating consent without IP address
  - All consent fields (dataProcessing, voiceRecording, aiProcessing)
- Mocking strategy
  - Better Auth API mocking
  - Prisma database mocking
  - Audit logging mocking

**Requirements covered:** 6.1, 6.2, 6.3

**Key patterns:**
```typescript
// Mock Better Auth
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

// Test registration
const result = await registerUser(mockRequest, '127.0.0.1');
expect(result.encryptionKey).toBeDefined();
expect(result.encryptionKeyHash).toBeDefined();
```

#### Migration Script Test (`migrate-existing-users.test.ts`)

Tests the user migration script for Better Auth:
- Pre-migration validation
- User account creation
- Password hashing
- Audit log creation
- Error handling

## Writing Tests

### Test File Structure

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Feature Name', () => {
  // Setup before all tests
  beforeAll(async () => {
    // Initialize test data
  });

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up test data
  });

  describe('Specific Functionality', () => {
    it('should do something specific', async () => {
      // Arrange: Set up test data
      const testData = { /* ... */ };

      // Act: Execute the functionality
      const result = await someFunction(testData);

      // Assert: Verify the results
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });
  });
});
```

### Best Practices

#### 1. Use Unique Test Data

Always use unique identifiers to avoid conflicts:

```typescript
const testEmail = `test-${Date.now()}@example.com`;
```

#### 2. Clean Up After Tests

Always clean up test data in `afterAll` or `afterEach`:

```typescript
afterAll(async () => {
  if (userId) {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.note.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }
});
```

#### 3. Test Both Success and Failure Cases

```typescript
it('should handle valid input', async () => {
  const result = await processData(validInput);
  expect(result).toBeDefined();
});

it('should reject invalid input', async () => {
  await expect(processData(invalidInput)).rejects.toThrow();
});
```

#### 4. Use Descriptive Test Names

```typescript
// Good
it('should create user with encrypted password and GDPR consent', async () => {});

// Bad
it('should work', async () => {});
```

#### 5. Test Edge Cases

```typescript
it('should handle empty transcription', async () => {});
it('should handle very long transcription', async () => {});
it('should handle special characters and emojis', async () => {});
```

### Integration Test Patterns

#### Testing API Routes

```typescript
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/some-route/route';

it('should protect route with Arcjet and Better Auth', async () => {
  const request = new NextRequest('http://localhost:3000/api/some-route', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `better-auth.session_token=${sessionToken}`,
    },
    body: JSON.stringify({ data: 'test' }),
  });

  const response = await POST(request);
  expect(response.status).toBe(200);
});
```

#### Testing Database Operations

```typescript
it('should maintain referential integrity', async () => {
  // Create parent record
  const user = await prisma.user.create({ data: { /* ... */ } });

  // Create child record
  const note = await prisma.note.create({
    data: { userId: user.id, /* ... */ }
  });

  // Delete parent
  await prisma.user.delete({ where: { id: user.id } });

  // Verify cascade delete
  const deletedNote = await prisma.note.findUnique({
    where: { id: note.id }
  });
  expect(deletedNote).toBeNull();
});
```

#### Testing AI Services

```typescript
it('should process transcription with AI', async () => {
  const transcription = 'Test transcription text';

  const result = await processTranscriptionWithRetry(transcription);

  expect(result.summary).toBeDefined();
  expect(result.summary.keyPoints).toBeInstanceOf(Array);
  expect(result.insights).toBeDefined();
}, 30000); // 30 second timeout for AI calls
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Error**: `Can't reach database server`

**Solution**:
```bash
# Check if PostgreSQL is running
brew services list

# Start PostgreSQL
brew services start postgresql@14

# Verify connection
psql -U voiceflow_ai -h localhost -d voiceflow_ai
```

#### 2. Prisma Client Not Generated

**Error**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
pnpm run db:generate
```

#### 3. Migration Errors

**Error**: `Migration failed`

**Solution**:
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or apply migrations manually
npx prisma migrate deploy
```

#### 4. Test Timeouts

**Error**: `Test timed out after 5000ms`

**Solution**: Increase timeout for slow tests (AI services):
```typescript
it('should process with AI', async () => {
  // Test code
}, 30000); // 30 second timeout
```

#### 5. Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Test Data Cleanup

If tests fail and leave orphaned data:

```bash
# Connect to database
psql -U voiceflow_ai -h localhost -d voiceflow_ai

# Delete test users (be careful!)
DELETE FROM users WHERE email LIKE '%test%@example.com';
```

### Debugging Tests

#### Enable Verbose Logging

```bash
# Run with debug output
DEBUG=* pnpm test

# Or set in test file
process.env.DEBUG = 'true';
```

#### Run Single Test

```bash
# Run specific test by name
pnpm test -t "should process audio through complete pipeline"
```

#### Use Console Logs

```typescript
it('should do something', async () => {
  console.log('Test data:', testData);
  const result = await someFunction(testData);
  console.log('Result:', result);
  expect(result).toBeDefined();
});
```

## Performance Considerations

### Test Execution Time

- **Unit tests**: Should complete in <100ms each
- **Integration tests**: May take 1-5 seconds each
- **E2E tests**: May take 10-30 seconds due to AI service calls

### Parallel Execution

Vitest runs tests in parallel by default. To run sequentially:

```bash
pnpm test --no-threads
```

### Mocking External Services

For faster tests, consider mocking AI services:

```typescript
import { vi } from 'vitest';

vi.mock('@/lib/services/ai', () => ({
  processTranscriptionWithRetry: vi.fn().mockResolvedValue({
    summary: { summary: 'Mock summary', keyPoints: [] },
    insights: { keyTopics: [], sentiment: 'neutral' },
    model: 'gpt-4o',
  }),
}));
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: voiceflow_ai
          POSTGRES_PASSWORD: voiceflow_ai
          POSTGRES_DB: voiceflow_ai
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm run db:generate
      - run: pnpm run db:migrate
      - run: pnpm test
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Better Auth Testing](https://www.better-auth.com/docs/testing)
- [Integration Test README](./integration/README.md)

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Clean up test data in `afterAll`
4. Add appropriate timeouts for slow tests
5. Update this guide if adding new test patterns
6. Update `tests/integration/README.md` for integration tests

## Support

For testing issues:
1. Check this guide for common solutions
2. Review test output for specific error messages
3. Check database connection and migrations
4. Verify environment variables are set correctly
5. Review the integration test README for specific test documentation
