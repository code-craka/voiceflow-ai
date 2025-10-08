# Integration Tests

This directory contains comprehensive integration tests for VoiceFlow AI, covering authentication, audio processing, and end-to-end workflows.

## Test Files

### 1. audio-pipeline-e2e.test.ts
**End-to-End Audio Processing Pipeline Test**

Tests the complete user journey from audio recording through transcription to AI processing.

**Coverage:**
- Complete audio processing workflow (recording → transcription → AI)
- Transcription pipeline with job submission and status tracking
- Transcription fallback mechanism (Deepgram → AssemblyAI)
- AI content processing with summary and insights generation
- Graceful degradation for AI processing failures
- User journey: registration → note creation → folder organization → tag management
- Folder organization and hierarchical structure
- Tag management and note tagging
- Cross-browser compatibility (different audio formats)
- Text encoding handling (ASCII, Unicode, emojis)
- Mobile responsiveness (small audio chunks, interrupted recordings)
- Performance validation (processing time limits, concurrent requests)
- Error handling and recovery (invalid audio, missing notes, service failures)

**Requirements Covered:** 8.2, 8.4, 11.1

### 2. auth-registration.test.ts
Tests user registration flow with Better Auth.

**Coverage:**
- User registration with email and password
- Database user creation
- Encryption key generation and storage
- GDPR consent storage
- Audit log creation
- Better Auth account creation with password hashing
- Duplicate email rejection
- Weak password rejection

### 2. auth-login.test.ts
Tests user login flow with Better Auth.

**Coverage:**
- Login with valid credentials
- Session creation on successful login
- Invalid email rejection
- Invalid password rejection
- Empty email/password handling
- User data return on successful login
- Multiple session creation
- Session expiry (7 days)

### 3. auth-protected-routes.test.ts
Tests authentication on protected API routes.

**Coverage:**
- Session verification with headers
- Invalid session token handling
- Missing session token handling
- Expired session token handling
- User ID access from session
- User email access from session
- User data querying with session user ID
- User notes querying with session user ID
- Authorization patterns (preventing access to other users' data)
- Consistent user ID across multiple requests
- Multiple cookie format handling
- Malformed session token handling

### 4. auth-session-management.test.ts
Tests session lifecycle, expiration, and refresh.

**Coverage:**
- Session creation on login
- Session creation on registration
- Session expiry (7 days)
- Expired session rejection
- Valid session acceptance before expiry
- Session at exact expiry time handling
- Session maintenance across multiple requests
- Session timestamp updates on activity
- Session invalidation on sign out
- Session deletion from database on sign out
- New login after sign out
- Multiple concurrent sessions support
- Signing out one session without affecting others

### 5. auth-data-preservation.test.ts
Tests that custom fields and relationships are preserved.

**Coverage:**
- encryptionKeyHash field preservation
- gdprConsent field preservation
- gdprConsent updates
- Better Auth fields preservation
- User-folder relationship preservation
- User-note relationship preservation
- Folder-note relationship preservation
- User-tag relationship preservation
- Note-tag relationship preservation
- User-auditLog relationship preservation
- Complex queries with all relationships
- Nested relationship queries
- Filtering notes by folder
- Filtering notes by tag
- Referential integrity on user deletion
- Data consistency across transactions
- Note metadata preservation
- Encrypted audio key preservation
- Timestamp preservation

## Running the Tests

### Prerequisites

1. Ensure PostgreSQL is running
2. Database is set up with correct credentials in `.env`
3. Run migrations: `pnpm db:push` or `pnpm db:migrate`
4. Generate Prisma client: `pnpm db:generate`

### Run All Integration Tests

```bash
pnpm test tests/integration/
```

### Run Specific Test File

```bash
pnpm test tests/integration/audio-pipeline-e2e.test.ts
pnpm test tests/integration/auth-registration.test.ts
pnpm test tests/integration/auth-login.test.ts
pnpm test tests/integration/auth-protected-routes.test.ts
pnpm test tests/integration/auth-session-management.test.ts
pnpm test tests/integration/auth-data-preservation.test.ts
```

### Run in Watch Mode

```bash
pnpm test:watch tests/integration/
```

## Test Data Cleanup

All tests include proper cleanup in `afterEach` or `afterAll` hooks to:
- Delete test sessions
- Delete test accounts
- Delete test audit logs
- Delete test users
- Delete test notes, folders, and tags

This ensures tests don't interfere with each other and the database remains clean.

## Environment Variables

Tests use the same environment variables as the application:

```bash
DATABASE_URL="postgresql://voiceflow_ai:voiceflow_ai@localhost:5432/voiceflow_ai?schema=public"
DIRECT_URL="postgresql://voiceflow_ai:voiceflow_ai@localhost:5432/voiceflow_ai?schema=public"
BETTER_AUTH_SECRET="your-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
```

## Test Coverage

These tests cover requirements from both the VoiceFlow AI specification and Better Auth migration:

### Audio Processing & E2E Tests
- **Requirement 8.2**: Audio recording interface and browser compatibility
- **Requirement 8.4**: Mobile responsiveness and cross-browser validation
- **Requirement 11.1**: Complete user journey and end-to-end workflows

### Authentication Tests
- **Requirement 11.1**: User registration testing
- **Requirement 11.2**: User login testing
- **Requirement 11.3**: Protected routes testing
- **Requirement 11.4**: Session management testing
- **Requirement 11.5**: Data preservation testing

## Notes

- Tests use real database connections (not mocked)
- Tests create and clean up their own test data
- Tests use unique email addresses with timestamps to avoid conflicts
- Tests verify both application logic and database state
- Tests check Better Auth integration and custom VoiceFlow AI fields
- E2E tests may take longer (up to 30 seconds) due to AI service calls
- Audio pipeline tests simulate real-world scenarios including failures and edge cases
