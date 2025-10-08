# Security and Compliance Documentation

## Overview

VoiceFlow AI implements comprehensive security and GDPR compliance features to protect user data and meet regulatory requirements.

## Security Features

### 1. Encryption

#### Data at Rest
- **AES-256-GCM encryption** for all audio files
- User-controlled encryption keys
- Secure key derivation using PBKDF2
- Encrypted storage via Appwrite Cloud Storage

#### Data in Transit
- **TLS 1.3** enforced for all connections
- HTTPS redirect in production
- Strict Transport Security (HSTS) headers
- Certificate pinning support

### 2. Input Validation and Sanitization

#### File Upload Validation
- Magic byte verification for audio files
- File size limits (max 100MB)
- Duration limits (max 2 hours)
- MIME type validation
- Suspicious pattern detection
- Virus scanning support (ClamAV integration ready)

#### Input Sanitization
- XSS prevention through HTML sanitization
- SQL injection prevention via Prisma ORM
- Path traversal protection
- Control character removal
- URL validation and protocol checking

### 3. Rate Limiting and DDoS Protection

Implemented via Arcjet with different configurations:

| Endpoint Type | Rate Limit | Use Case |
|--------------|------------|----------|
| Public API | 20 req/min | Public endpoints |
| Authenticated | 100 req/min | User operations |
| Sensitive | 5 req/min | Auth/payments |
| AI Processing | 10 req/min | Transcription/AI |

### 4. Security Headers

All responses include comprehensive security headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Content-Security-Policy: [comprehensive CSP]
Permissions-Policy: microphone=(self), camera=(), geolocation=()
```

### 5. Authentication and Session Management

- Better Auth for secure authentication
- HTTP-only cookies (XSS protection)
- CSRF protection built-in
- 7-day session expiry with refresh
- Password hashing with scrypt (OWASP recommended)

## GDPR Compliance

### 1. Audit Logging

All user actions are logged for compliance:

#### Security Actions
- User registration/login/logout
- Password changes
- Data exports/deletions
- Encryption key access
- Unauthorized access attempts

#### Data Access Actions
- Note creation/viewing/updating/deletion
- Audio upload/download/deletion
- Transcription access

### 2. Compliance Reporting

#### Report Types

**User Data Report**
- Total users in period
- Data export requests
- Data deletion requests
- User consent status

**Security Report**
- Security events by type
- Suspicious activities
- Top users by event count
- Failed login attempts

**Data Access Report**
- Data access events by type
- Top users by access count
- Access patterns

**Breach Notification Report**
- Data breach incidents
- Affected users
- Notification status

### 3. Data Breach Notification

Automated system for handling data breaches:

1. **Detection**: Log breach with severity level
2. **Investigation**: Track investigation status
3. **Notification**: Automatically notify affected users
4. **Resolution**: Track mitigation steps

Severity levels:
- **Low**: Minor incident, no user data exposed
- **Medium**: Limited data exposure
- **High**: Significant data exposure
- **Critical**: Widespread data breach

### 4. User Rights

#### Right to Access
- Users can view their audit logs
- Export all personal data in JSON format
- View data access history

#### Right to Deletion
- Complete data deletion within 30 days
- Cascading deletion of all related data
- Audit trail maintained for compliance

#### Right to Data Portability
- Export data in structured JSON format
- Includes notes, audio metadata, audit logs
- ZIP format for large exports

## API Endpoints

### Compliance Endpoints

#### Generate Compliance Report
```
POST /api/compliance/report
Authorization: Bearer <token>

{
  "reportType": "user_data" | "security" | "data_access" | "breach_notification",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

#### Get Compliance Dashboard
```
GET /api/compliance/dashboard?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

#### Create Breach Notification
```
POST /api/compliance/breach
Authorization: Bearer <token>

{
  "detectedAt": "2024-01-01T00:00:00Z",
  "severity": "high",
  "affectedUsers": ["user-id-1", "user-id-2"],
  "breachType": "Unauthorized access",
  "description": "Description of the breach",
  "mitigationSteps": ["Step 1", "Step 2"],
  "status": "investigating"
}
```

#### Get Breach Notifications
```
GET /api/compliance/breach?startDate=2024-01-01&severity=high
Authorization: Bearer <token>
```

### Audit Endpoints

#### Get User Audit Logs
```
GET /api/audit/logs?limit=100&offset=0&includeStats=true
Authorization: Bearer <token>
```

## File Validation

### Audio File Validation

```typescript
import { validateFileUpload } from '@/lib/services/fileValidation';

const result = await validateFileUpload(
  fileBuffer,
  filename,
  mimeType,
  {
    maxSize: 100 * 1024 * 1024, // 100MB
    maxDuration: 7200, // 2 hours
    requireMagicByteCheck: true,
  }
);

if (!result.isValid) {
  console.error('Validation errors:', result.errors);
}

if (!result.virusScan.isClean) {
  console.error('Virus detected:', result.virusScan.threats);
}
```

### Supported Audio Formats

- WebM (audio/webm)
- Ogg Vorbis (audio/ogg)
- Opus (audio/opus)
- WAV (audio/wav)
- MP3 (audio/mp3, audio/mpeg)
- M4A (audio/x-m4a)

## Input Sanitization

### Text Sanitization

```typescript
import { sanitizeText, sanitizeHtml } from '@/lib/services/sanitization';

// Remove control characters and normalize whitespace
const cleanText = sanitizeText(userInput);

// Strip HTML tags and prevent XSS
const safeHtml = sanitizeHtml(htmlInput);
```

### Filename Sanitization

```typescript
import { sanitizeFilename } from '@/lib/services/sanitization';

// Prevent path traversal and unsafe characters
const safeFilename = sanitizeFilename(userFilename);
```

### URL Validation

```typescript
import { sanitizeUrl } from '@/lib/services/sanitization';

// Only allow HTTP/HTTPS protocols
const safeUrl = sanitizeUrl(userUrl);
if (!safeUrl) {
  throw new Error('Invalid URL');
}
```

## Virus Scanning

### ClamAV Integration (Optional)

To enable virus scanning:

1. Install ClamAV:
```bash
# Ubuntu/Debian
sudo apt-get install clamav clamav-daemon

# macOS
brew install clamav
```

2. Enable in environment:
```bash
CLAMAV_ENABLED=true
```

3. Files are automatically scanned during upload

## Best Practices

### For Developers

1. **Always validate input** using Zod schemas
2. **Sanitize user input** before storage or display
3. **Use Arcjet protection** on all API routes
4. **Log security events** for audit trail
5. **Encrypt sensitive data** before storage
6. **Use parameterized queries** (Prisma handles this)
7. **Implement rate limiting** appropriate to endpoint sensitivity

### For Administrators

1. **Review audit logs** regularly
2. **Monitor security events** for suspicious activity
3. **Generate compliance reports** monthly
4. **Test breach notification** procedures
5. **Keep encryption keys** secure
6. **Rotate secrets** periodically
7. **Update dependencies** for security patches

## Compliance Checklist

- [x] Audit logging for all user actions
- [x] Data export functionality (JSON format)
- [x] Data deletion with cascading
- [x] Consent management
- [x] Breach notification system
- [x] Compliance reporting tools
- [x] Security event monitoring
- [x] Encryption at rest and in transit
- [x] Input validation and sanitization
- [x] Rate limiting and DDoS protection
- [x] Secure session management
- [x] GDPR-compliant data handling

## Monitoring and Alerts

### Security Events

The system automatically monitors and alerts on:

- Failed login attempts (>5 in 10 minutes)
- Unauthorized access attempts
- Suspicious file uploads
- Rate limit violations
- Data breach detection
- Encryption key access

### Compliance Metrics

Track these metrics for compliance:

- Data export requests (response time <30 days)
- Data deletion requests (completion time <30 days)
- Audit log retention (minimum 1 year)
- Security event response time (<24 hours)
- Breach notification time (<72 hours)

## References

- [GDPR Official Text](https://gdpr-info.eu/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Arcjet Security](https://docs.arcjet.com/)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/security)
