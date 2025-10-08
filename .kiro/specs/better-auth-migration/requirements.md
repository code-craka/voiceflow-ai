# Better Auth Migration Requirements

## Introduction

This specification outlines the migration from the current custom JWT-based authentication system to Better Auth, a comprehensive authentication framework for TypeScript. The migration will modernize the authentication infrastructure while maintaining all existing security features, GDPR compliance, and user data integrity. Better Auth provides built-in support for email/password authentication, session management, and extensibility through plugins, eliminating the need for custom JWT implementation and reducing maintenance overhead.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to migrate from custom JWT authentication to Better Auth, so that we have a more maintainable and feature-rich authentication system.

#### Acceptance Criteria

1. WHEN Better Auth is installed THEN the system SHALL include `better-auth` package and remove `jsonwebtoken` and `bcryptjs` dependencies
2. WHEN configuring Better Auth THEN the system SHALL use Prisma adapter with PostgreSQL provider
3. WHEN setting up authentication THEN the system SHALL enable email and password authentication with the same security standards (min 8 characters)
4. IF migration is complete THEN the system SHALL have no references to NextAuth or custom JWT implementation
5. WHEN Better Auth is configured THEN the system SHALL use environment variables `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`

### Requirement 2

**User Story:** As a developer, I want to update the Prisma schema to support Better Auth, so that the database structure aligns with Better Auth's requirements.

#### Acceptance Criteria

1. WHEN updating the schema THEN the system SHALL add Better Auth core tables (user, session, account, verification)
2. WHEN migrating user data THEN the system SHALL preserve existing user records with email and password hash
3. WHEN creating new tables THEN the system SHALL maintain existing custom fields (encryptionKeyHash, gdprConsent)
4. IF schema changes are applied THEN the system SHALL run Prisma migrations successfully without data loss
5. WHEN schema is updated THEN the system SHALL maintain all existing relationships (notes, folders, tags, audit logs)

### Requirement 3

**User Story:** As a developer, I want to create a Better Auth server instance, so that authentication endpoints are properly configured.

#### Acceptance Criteria

1. WHEN creating auth instance THEN the system SHALL configure it in `src/lib/auth.ts` file
2. WHEN setting up the instance THEN the system SHALL use Prisma adapter with proper database connection
3. WHEN configuring authentication THEN the system SHALL enable email/password with custom password requirements
4. IF Arcjet is configured THEN the system SHALL add `https://appleid.apple.com` to trustedOrigins for future OAuth support
5. WHEN auth instance is created THEN the system SHALL export it for use in API routes and server components

### Requirement 4

**User Story:** As a developer, I want to set up Better Auth API routes, so that authentication requests are handled properly.

#### Acceptance Criteria

1. WHEN creating API routes THEN the system SHALL add catch-all route at `/api/auth/[...all]/route.ts`
2. WHEN handling requests THEN the system SHALL use `toNextJsHandler` helper for Next.js 15 compatibility
3. WHEN routes are configured THEN the system SHALL handle both GET and POST methods
4. IF routes are set up THEN the system SHALL remove old custom auth endpoints (`/api/auth/register`, `/api/auth/login`)
5. WHEN API is ready THEN the system SHALL maintain Arcjet security protection on authentication endpoints

### Requirement 5

**User Story:** As a developer, I want to create a Better Auth client instance, so that frontend components can authenticate users.

#### Acceptance Criteria

1. WHEN creating client THEN the system SHALL configure it in `src/lib/auth-client.ts` using React client
2. WHEN setting base URL THEN the system SHALL use environment variable or default to same domain
3. WHEN client is configured THEN the system SHALL export authentication methods (signIn, signUp, signOut, useSession)
4. IF client is ready THEN the system SHALL provide TypeScript types for all authentication operations
5. WHEN using the client THEN the system SHALL support both client-side and server-side session access

### Requirement 6

**User Story:** As a developer, I want to migrate authentication service logic, so that user registration and login use Better Auth.

#### Acceptance Criteria

1. WHEN updating auth service THEN the system SHALL remove custom JWT generation and bcrypt hashing logic
2. WHEN handling registration THEN the system SHALL use Better Auth's `signUp.email` API method
3. WHEN handling login THEN the system SHALL use Better Auth's `signIn.email` API method
4. IF custom logic is needed THEN the system SHALL preserve encryption key generation and GDPR consent handling
5. WHEN migration is complete THEN the system SHALL maintain audit logging for authentication events

### Requirement 7

**User Story:** As a developer, I want to update API routes to use Better Auth sessions, so that protected endpoints verify authentication properly.

#### Acceptance Criteria

1. WHEN protecting routes THEN the system SHALL use `auth.api.getSession()` with request headers
2. WHEN session is invalid THEN the system SHALL return 401 Unauthorized response
3. WHEN session is valid THEN the system SHALL extract user ID from session for authorization
4. IF routes need user data THEN the system SHALL query database using session user ID
5. WHEN all routes are updated THEN the system SHALL remove custom JWT verification middleware

### Requirement 8

**User Story:** As a developer, I want to update frontend components to use Better Auth client, so that users can authenticate through the UI.

#### Acceptance Criteria

1. WHEN creating auth forms THEN the system SHALL use `authClient.signUp.email()` for registration
2. WHEN handling login THEN the system SHALL use `authClient.signIn.email()` with proper error handling
3. WHEN displaying user info THEN the system SHALL use `authClient.useSession()` hook for reactive session state
4. IF user logs out THEN the system SHALL call `authClient.signOut()` and redirect appropriately
5. WHEN components are updated THEN the system SHALL maintain existing UI/UX and error messaging

### Requirement 9

**User Story:** As a developer, I want to update documentation to reflect Better Auth usage, so that the team understands the new authentication system.

#### Acceptance Criteria

1. WHEN updating docs THEN the system SHALL revise `docs/AUTHENTICATION.md` to describe Better Auth implementation
2. WHEN documenting setup THEN the system SHALL include environment variable configuration instructions
3. WHEN explaining usage THEN the system SHALL provide examples for registration, login, and session management
4. IF security features change THEN the system SHALL update security documentation accordingly
5. WHEN docs are complete THEN the system SHALL remove all references to NextAuth and custom JWT implementation

### Requirement 10

**User Story:** As a developer, I want to update steering documentation, so that AI assistants understand the Better Auth architecture.

#### Acceptance Criteria

1. WHEN updating tech guidelines THEN the system SHALL replace NextAuth references with Better Auth patterns
2. WHEN documenting API routes THEN the system SHALL show Better Auth session verification examples
3. WHEN explaining authentication THEN the system SHALL describe Better Auth's email/password flow
4. IF Arcjet integration exists THEN the system SHALL document how it works with Better Auth endpoints
5. WHEN steering docs are updated THEN the system SHALL ensure consistency across all documentation files

### Requirement 11

**User Story:** As a developer, I want to test the migration thoroughly, so that authentication works correctly after the change.

#### Acceptance Criteria

1. WHEN testing registration THEN the system SHALL successfully create users with email and password
2. WHEN testing login THEN the system SHALL authenticate users and create valid sessions
3. WHEN testing protected routes THEN the system SHALL properly authorize authenticated requests
4. IF testing session management THEN the system SHALL handle session expiration and refresh correctly
5. WHEN all tests pass THEN the system SHALL verify GDPR consent and encryption key handling still work

### Requirement 12

**User Story:** As a developer, I want to clean up old authentication code, so that the codebase is maintainable and doesn't have unused dependencies.

#### Acceptance Criteria

1. WHEN removing dependencies THEN the system SHALL uninstall `jsonwebtoken`, `bcryptjs`, and `@types/jsonwebtoken`, `@types/bcryptjs`
2. WHEN cleaning up code THEN the system SHALL remove old auth service files that are no longer needed
3. WHEN removing types THEN the system SHALL delete custom JWT-related TypeScript interfaces
4. IF old endpoints exist THEN the system SHALL remove `/api/auth/register` and `/api/auth/login` routes
5. WHEN cleanup is complete THEN the system SHALL have no unused imports or dead code related to old auth system
