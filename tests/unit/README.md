# Authentication Unit Tests

This directory contains comprehensive unit tests for the authentication system, encryption services, and GDPR compliance features.

## Test Files

### `auth.test.ts`
Tests the authentication service including:
- **User Registration**: Tests user creation with Better Auth integration, encryption key generation, and GDPR consent handling
- **GDPR Consent Updates**: Tests consent preference updates with IP address tracking
- **Error Handling**: Tests authentication failures and error scenarios

**Coverage**: 5 tests covering Requirements 6.1

### `encryption.test.ts`
Tests the encryption service including:
- **Key Generation**: Tests secure encryption key generation and uniqueness
- **Key Hashing**: Tests PBKDF2-based key hashing with salt
- **Key Verification**: Tests constant-time key verification to prevent timing attacks
- **Audio Encryption/Decryption**: Tests AES-256-GCM encryption for audio files
- **Text Encryption/Decryption**: Tests encryption for transcriptions and metadata
- **Security Features**: Tests tamper detection, wrong key rejection, and large file handling
- **Utility Functions**: Tests secure token generation, data hashing, and secure comparison

**Coverage**: 28 tests covering Requirements 5.1, 5.3, 6.1

### `gdpr.test.ts`
Tests the GDPR compliance service including:
- **Data Export**: Tests complete user data export in structured JSON format
- **Data Deletion**: Tests permanent deletion of all user data with audit logging
- **Consent Management**: Tests consent preference updates and retrieval
- **Edge Cases**: Tests handling of missing users, empty data, and error scenarios

**Coverage**: 14 tests covering Requirements 6.1, 6.2, 6.3

## Running Tests

### Run all authentication tests
```bash
pnpm vitest tests/unit/auth.test.ts tests/unit/encryption.test.ts tests/unit/gdpr.test.ts --run
```

### Run individual test files
```bash
pnpm vitest tests/unit/auth.test.ts --run
pnpm vitest tests/unit/encryption.test.ts --run
pnpm vitest tests/unit/gdpr.test.ts --run
```

### Run with coverage
```bash
pnpm vitest tests/unit --coverage --run
```

### Run in watch mode (for development)
```bash
pnpm vitest tests/unit/auth.test.ts
```

## Test Results

All 47 tests pass successfully:
- ✅ 5 authentication service tests
- ✅ 28 encryption service tests
- ✅ 14 GDPR compliance tests

## Key Testing Patterns

### Mocking Dependencies
Tests use Vitest's `vi.mock()` to mock:
- Database operations (`@/lib/db`)
- Better Auth API (`@/lib/auth`)
- Audit logging (`@/lib/services/audit`)

### Test Structure
All tests follow the Arrange-Act-Assert pattern:
```typescript
it('should do something', async () => {
  // Arrange: Set up test data and mocks
  const mockData = { ... };
  vi.mocked(dependency).mockResolvedValue(mockData);
  
  // Act: Execute the function under test
  const result = await functionUnderTest(input);
  
  // Assert: Verify the results
  expect(result).toBeDefined();
  expect(dependency).toHaveBeenCalledWith(expectedArgs);
});
```

### Security Testing
Encryption tests include:
- Timing attack prevention verification
- Tamper detection validation
- Wrong key rejection
- Large file handling (1MB+)
- Unicode and special character support

### GDPR Compliance Testing
GDPR tests verify:
- Complete data export functionality
- Permanent data deletion with cascading
- Consent tracking with timestamps and IP addresses
- Audit logging for all data operations

## Requirements Coverage

### Requirement 6.1 (GDPR Consent)
- ✅ User registration with explicit consent
- ✅ Consent preference updates
- ✅ IP address tracking for consent
- ✅ Timestamp tracking for consent

### Requirement 6.2 (Data Export)
- ✅ Complete user data export
- ✅ Structured JSON format
- ✅ Includes all related data (notes, folders, tags, audit logs)
- ✅ Export timestamp tracking

### Requirement 6.3 (Data Deletion)
- ✅ Permanent data deletion
- ✅ Cascading deletion of related data
- ✅ Audit logging before and after deletion
- ✅ IP address tracking for deletion requests

### Requirement 5.1 (Encryption)
- ✅ AES-256-GCM encryption for audio files
- ✅ Secure key generation
- ✅ Tamper detection with authentication tags

### Requirement 5.3 (User-Controlled Keys)
- ✅ User-specific encryption key generation
- ✅ Secure key hashing for storage
- ✅ Key verification with timing-safe comparison

## Notes

- The stderr output during encryption tests is expected - it's from intentional decryption failures being tested
- All tests use mocked dependencies to ensure isolation and fast execution
- Tests verify both success and failure scenarios
- Security features like timing-safe comparison are explicitly tested
