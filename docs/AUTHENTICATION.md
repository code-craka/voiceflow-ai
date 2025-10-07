# Authentication & GDPR Compliance

## Overview

This document describes the authentication and GDPR compliance implementation for VoiceFlow AI.

## Features Implemented

### Authentication (Task 3.1)

#### User Registration
- **Endpoint**: `POST /api/auth/register`
- **Security**: Arcjet sensitive operations protection
- **Features**:
  - Email/password authentication
  - Automatic encryption key generation per user
  - Password hashing with bcrypt (12 rounds)
  - GDPR consent collection during registration
  - Audit logging for compliance

#### User Login
- **Endpoint**: `POST /api/auth/login`
- **Security**: Arcjet sensitive operations protection
- **Features**:
  - Email/password authentication
  - JWT token generation (7-day expiry)
  - Encryption key retrieval
  - Audit logging

#### Session Management
- JWT-based authentication
- Bearer token in Authorization header
- 7-day token expiry
- User ID extraction from tokens

### GDPR Compliance (Task 3.2)

#### Consent Management
- **Endpoint**: `GET /api/gdpr/consent` - Get current consent
- **Endpoint**: `PUT /api/gdpr/consent` - Update consent
- **Features**:
  - Data processing consent
  - Voice recording consent
  - AI processing consent
  - IP address tracking
  - Audit trail

#### Data Export
- **Endpoint**: `GET /api/gdpr/export`
- **Format**: JSON
- **Includes**:
  - User profile data
  - All notes with transcriptions
  - Folders and tags
  - Complete audit logs
  - Export timestamp

#### Data Deletion
- **Endpoint**: `DELETE /api/gdpr/delete`
- **Features**:
  - Permanent deletion of all user data
  - Cascading deletes (notes, folders, tags)
  - Audit trail before and after deletion
  - 30-day compliance window

## Security Features

### Encryption
- AES-256-GCM for audio files
- User-controlled encryption keys
- Bcrypt password hashing (12 rounds)
- PBKDF2 for encryption key derivation

### API Protection
- Arcjet security on all endpoints
- Rate limiting (5 requests/minute for sensitive ops)
- Bot detection and blocking
- Shield protection against common attacks

### Audit Logging
- All authentication events
- GDPR consent changes
- Data export requests
- Data deletion operations
- IP address and user agent tracking

## TypeScript Type Definitions

The authentication system uses strongly-typed interfaces defined in `src/types/auth.ts`:

### Core Types

#### User
```typescript
interface User {
  id: string;
  email: string;
  encryptionKeyHash: string;
  gdprConsent: GDPRConsent;
  createdAt: Date;
  updatedAt: Date;
}
```

#### GDPRConsent
```typescript
interface GDPRConsent {
  dataProcessing: boolean;
  voiceRecording: boolean;
  aiProcessing: boolean;
  consentedAt: Date;
  ipAddress?: string;
}
```

### Request Types

#### UserRegistrationRequest
```typescript
interface UserRegistrationRequest {
  email: string;
  password: string;
  gdprConsent: GDPRConsent;
}
```

#### UserLoginRequest
```typescript
interface UserLoginRequest {
  email: string;
  password: string;
}
```

### Session Types

#### AuthSession
```typescript
interface AuthSession {
  userId: string;
  email: string;
  encryptionKey: string;
  expiresAt: Date;
}
```

#### AuthToken
```typescript
interface AuthToken {
  token: string;
  expiresAt: Date;
}
```

#### UserWithEncryptionKey
```typescript
interface UserWithEncryptionKey extends User {
  encryptionKey: string;
}
```

## Database Schema

### User Model
```prisma
model User {
  id                String   @id @default(uuid())
  email             String   @unique
  passwordHash      String
  encryptionKeyHash String
  gdprConsent       Json
  createdAt         DateTime
  updatedAt         DateTime
}
```

### Audit Log Model
```prisma
model AuditLog {
  id           String   @id @default(uuid())
  userId       String?
  action       String
  resourceType String
  resourceId   String?
  details      Json?
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime
}
```

## Usage Examples

### Register a New User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "gdprConsent": {
      "dataProcessing": true,
      "voiceRecording": true,
      "aiProcessing": true
    }
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Export User Data
```bash
curl -X GET http://localhost:3000/api/gdpr/export \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Delete User Data
```bash
curl -X DELETE http://localhost:3000/api/gdpr/delete \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Requirements Satisfied

- ✅ Requirement 5.3: User-controlled encryption keys
- ✅ Requirement 6.1: GDPR consent collection
- ✅ Requirement 6.2: Data export in JSON format
- ✅ Requirement 6.3: Data deletion with audit trail
- ✅ Requirement 5.4: Security event logging
- ✅ Requirement 6.4: Compliance reporting
- ✅ Requirement 6.5: Detailed audit logs

## Next Steps

Task 4: Develop audio recording and processing system
