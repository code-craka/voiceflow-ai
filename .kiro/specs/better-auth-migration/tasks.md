# Better Auth Migration Implementation Plan

## Task List

- [ ] 1. Install Better Auth and update dependencies
  - Install `better-auth` package using pnpm
  - Remove `jsonwebtoken`, `bcryptjs`, `@types/jsonwebtoken`, and `@types/bcryptjs` packages
  - Update package.json scripts if needed
  - _Requirements: 1.1, 12.1_

- [ ] 2. Set up environment variables
  - Add `BETTER_AUTH_SECRET` to .env files (.env, .env.local, .env.example)
  - Add `BETTER_AUTH_URL` to .env files with appropriate values
  - Add `NEXT_PUBLIC_BETTER_AUTH_URL` for client-side usage
  - Update docs/CONFIGURATION.md with new environment variables
  - _Requirements: 1.5_

- [ ] 3. Update Prisma schema for Better Auth
  - [ ] 3.1 Add Better Auth core tables to schema
    - Add Session model with required fields and relations
    - Add Account model for credential storage
    - Add Verification model for email verification
    - Update User model with Better Auth required fields (name, emailVerified, image)
    - Preserve custom fields (encryptionKeyHash, gdprConsent)
    - Add proper indexes for performance
    - _Requirements: 2.1, 2.3, 2.5_
  
  - [ ] 3.2 Generate and run Prisma migrations
    - Run `pnpm db:generate` to generate Prisma client
    - Create migration with `pnpm db:migrate` named "add_better_auth_tables"
    - Verify migration success and database schema
    - _Requirements: 2.4_

- [ ] 4. Create Better Auth server instance
  - [ ] 4.1 Create auth configuration file
    - Create `src/lib/auth.ts` file
    - Import Better Auth and Prisma adapter
    - Configure database connection with Prisma adapter
    - Set up email and password authentication
    - Configure session settings (7-day expiry)
    - Add trusted origins for future OAuth support
    - Export auth instance and Session type
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. Set up Better Auth API routes
  - [ ] 5.1 Create catch-all auth route
    - Create `src/app/api/auth/[...all]/route.ts` file
    - Import auth instance and toNextJsHandler
    - Export GET and POST handlers
    - Configure runtime settings
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 5.2 Remove old authentication endpoints
    - Delete `src/app/api/auth/register/route.ts`
    - Delete `src/app/api/auth/login/route.ts`
    - Verify no other code references these endpoints
    - _Requirements: 4.4_

- [ ] 6. Create Better Auth client instance
  - [ ] 6.1 Create client configuration file
    - Create `src/lib/auth-client.ts` file
    - Import createAuthClient from better-auth/react
    - Configure base URL from environment variable
    - Export authClient and commonly used methods
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7. Update authentication service
  - [ ] 7.1 Refactor registration logic
    - Update `src/lib/services/auth.ts` registerUser function
    - Use Better Auth signUp.email API method
    - Preserve encryption key generation logic
    - Update user record with custom fields after registration
    - Maintain audit logging for registration events
    - Remove custom JWT and bcrypt logic
    - _Requirements: 6.1, 6.2, 6.4, 6.5_
  
  - [ ] 7.2 Create server session helper
    - Add getServerSession function to auth service
    - Use auth.api.getSession with headers
    - Export for use in API routes
    - _Requirements: 6.5_
  
  - [ ] 7.3 Preserve GDPR consent logic
    - Keep updateGDPRConsent function unchanged
    - Ensure it works with Better Auth user model
    - Maintain audit logging
    - _Requirements: 6.4_

- [ ] 8. Update protected API routes
  - [ ] 8.1 Update audio upload route
    - Modify `src/app/api/audio/upload/route.ts`
    - Replace JWT verification with Better Auth session check
    - Use auth.api.getSession with request headers
    - Return 401 if session is invalid
    - Extract userId from session.user.id
    - Maintain Arcjet security protection
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 8.2 Update transcription routes
    - Modify `src/app/api/transcription/route.ts`
    - Replace JWT verification with Better Auth session
    - Update health check route if needed
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 8.3 Update GDPR routes
    - Modify `src/app/api/gdpr/consent/route.ts`
    - Modify `src/app/api/gdpr/export/route.ts`
    - Modify `src/app/api/gdpr/delete/route.ts`
    - Replace JWT verification with Better Auth session
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 9. Create authentication UI components
  - [ ] 9.1 Create sign-up form component
    - Create `src/components/auth/SignUpForm.tsx`
    - Use authClient.signUp.email method
    - Implement proper error handling
    - Add loading states
    - Include GDPR consent checkboxes
    - Redirect to dashboard on success
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  
  - [ ] 9.2 Create sign-in form component
    - Create `src/components/auth/SignInForm.tsx`
    - Use authClient.signIn.email method
    - Implement error handling with user-friendly messages
    - Add loading states
    - Redirect to dashboard on success
    - _Requirements: 8.2, 8.4, 8.5_
  
  - [ ] 9.3 Create user profile component
    - Create `src/components/auth/UserProfile.tsx`
    - Use authClient.useSession hook
    - Display user information
    - Add sign-out button with authClient.signOut
    - Handle loading and error states
    - _Requirements: 8.3, 8.4, 8.5_
  
  - [ ] 9.4 Create authentication pages
    - Create `src/app/auth/signup/page.tsx` with SignUpForm
    - Create `src/app/auth/signin/page.tsx` with SignInForm
    - Add proper layouts and styling
    - _Requirements: 8.5_

- [ ] 10. Update documentation
  - [ ] 10.1 Update authentication documentation
    - Revise `docs/AUTHENTICATION.md` completely
    - Remove NextAuth and JWT references
    - Add Better Auth setup instructions
    - Document registration and login flows
    - Update API endpoint documentation
    - Add session management examples
    - Update TypeScript type definitions section
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 10.2 Update configuration documentation
    - Update `docs/CONFIGURATION.md`
    - Add Better Auth environment variables
    - Remove old JWT-related configuration
    - _Requirements: 9.2_

- [ ] 11. Update steering documentation
  - [ ] 11.1 Update tech guidelines
    - Modify `.kiro/steering/tech.md`
    - Replace NextAuth patterns with Better Auth
    - Update API route structure examples
    - Update authentication flow descriptions
    - Document Better Auth + Arcjet integration
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 11.2 Update structure guidelines
    - Modify `.kiro/steering/structure.md`
    - Update authentication service patterns
    - Update API route examples
    - Update component structure for auth
    - _Requirements: 10.5_
  
  - [ ] 11.3 Update security guidelines
    - Modify `.kiro/steering/security.md`
    - Document Better Auth security features
    - Update session management documentation
    - Update password hashing information (scrypt)
    - _Requirements: 10.4, 10.5_

- [ ] 12. Update TypeScript types
  - [ ] 12.1 Remove old auth types
    - Remove JWT-related interfaces from `src/types/auth.ts`
    - Remove AuthToken, AuthSession interfaces
    - Keep GDPRConsent and other custom types
    - _Requirements: 12.3_
  
  - [ ] 12.2 Add Better Auth types
    - Import Session type from Better Auth
    - Create type aliases for common auth operations
    - Update API response types
    - _Requirements: 12.3_

- [ ] 13. Testing and verification
  - [ ] 13.1 Test user registration
    - Test registration with email and password
    - Verify user is created in database
    - Verify session is created
    - Verify encryption key is generated
    - Verify GDPR consent is stored
    - Verify audit log is created
    - _Requirements: 11.1_
  
  - [ ] 13.2 Test user login
    - Test login with valid credentials
    - Test login with invalid credentials
    - Verify session is created on success
    - Verify error handling
    - _Requirements: 11.2_
  
  - [ ] 13.3 Test protected routes
    - Test accessing protected routes with valid session
    - Test accessing protected routes without session
    - Verify 401 response for unauthorized requests
    - Verify user data is accessible in routes
    - _Requirements: 11.3_
  
  - [ ] 13.4 Test session management
    - Test session expiration after 7 days
    - Test session refresh
    - Test sign-out functionality
    - _Requirements: 11.4_
  
  - [ ] 13.5 Test data preservation
    - Verify existing user data is intact
    - Verify custom fields (encryptionKeyHash, gdprConsent) are preserved
    - Verify relationships (notes, folders, tags) work correctly
    - _Requirements: 11.5_

- [ ] 14. Clean up old code
  - [ ] 14.1 Remove old authentication utilities
    - Remove JWT generation functions from auth service
    - Remove bcrypt hashing functions (use Better Auth's)
    - Remove custom session verification middleware
    - _Requirements: 12.2_
  
  - [ ] 14.2 Remove unused imports
    - Search for and remove jsonwebtoken imports
    - Search for and remove bcryptjs imports
    - Update import statements across codebase
    - _Requirements: 12.5_
  
  - [ ] 14.3 Final verification
    - Run TypeScript type checking
    - Run linter
    - Verify no dead code remains
    - Verify all tests pass
    - _Requirements: 12.5_

- [ ] 15. Update README and setup instructions
  - Update README.md with Better Auth setup steps
  - Update docs/SETUP.md with new authentication flow
  - Add migration notes for existing installations
  - _Requirements: 9.5_
