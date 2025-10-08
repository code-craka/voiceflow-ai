# Better Auth User Migration Guide

## Overview

This guide explains how to migrate existing users from the old authentication system to Better Auth.

## Migration Scenario

The Better Auth migration involves moving from a custom JWT-based authentication system to Better Auth's credential provider system. The database schema has been updated to:

1. Remove `password_hash` column from the `users` table
2. Add Better Auth tables: `session`, `account`, `verification`
3. Store passwords in the `account` table instead

## What the Migration Script Does

The `migrate-existing-users.ts` script performs the following operations:

### 1. User Discovery
- Finds all users in the database
- Identifies users without a credential account (Better Auth account)

### 2. Account Creation
- Creates an `account` record for each user with `providerId: 'credential'`
- Sets a secure random temporary password
- Uses the user's email as the `accountId`

### 3. Data Validation
- Ensures all users have a `name` field (defaults to email prefix if missing)
- Preserves all custom fields (`encryptionKeyHash`, `gdprConsent`)
- Maintains all relationships (notes, folders, tags, audit logs)

### 4. Verification
- Checks that all users have accounts after migration
- Verifies all users have required fields

## Running the Migration

### Step 1: Dry Run (Recommended)

First, run the migration in dry-run mode to preview changes without modifying the database:

```bash
pnpm migrate:users:dry-run
```

This will show you:
- How many users exist
- How many users need migration
- What changes would be made

### Step 2: Run the Migration

If the dry run looks correct, run the actual migration:

```bash
pnpm migrate:users
```

### Step 3: Verify Results

The script automatically verifies the migration, but you can also manually check:

```bash
# Check users without accounts
pnpm prisma studio
# Navigate to User table and check that all users have related Account records
```

## Important Notes

### Password Reset Required

**⚠️ CRITICAL**: Users who are migrated will have their passwords set to a secure random value. They will need to reset their passwords using the "Forgot Password" feature on their first login attempt.

### Communication Plan

Before running the migration in production:

1. **Notify Users**: Send an email informing users about the authentication system upgrade
2. **Password Reset Instructions**: Provide clear instructions on how to reset passwords
3. **Support Preparation**: Ensure support team is ready to help users with password resets
4. **Timing**: Run migration during low-traffic periods

### Sample User Communication

```
Subject: VoiceFlow AI Authentication System Upgrade

Dear VoiceFlow AI User,

We're upgrading our authentication system to provide better security and features.

What this means for you:
- You'll need to reset your password on your next login
- Click "Forgot Password" on the login page
- Follow the instructions to set a new password

Your data, notes, and settings remain completely safe and unchanged.

If you have any questions, please contact support.

Thank you,
The VoiceFlow AI Team
```

## Migration Scenarios

### Scenario 1: Fresh Installation (No Existing Users)

If you're setting up Better Auth on a fresh installation:

```bash
# No migration needed
pnpm db:migrate dev --name add_better_auth_tables
```

The migration script will detect no users and exit gracefully.

### Scenario 2: Existing Users with Old Auth System

If you have existing users from the old JWT system:

```bash
# 1. Run database migration
pnpm db:migrate dev --name add_better_auth_tables

# 2. Preview user migration
pnpm migrate:users:dry-run

# 3. Run user migration
pnpm migrate:users

# 4. Notify users about password reset requirement
```

### Scenario 3: Partial Migration (Some Users Already Migrated)

The script is idempotent and safe to run multiple times:

```bash
# Run migration - it will skip users who already have accounts
pnpm migrate:users
```

## Rollback Plan

If you need to rollback the migration:

### Database Rollback

```bash
# Rollback the Prisma migration
pnpm prisma migrate resolve --rolled-back 20251008013212_add_better_auth_tables

# Revert to previous migration
pnpm prisma migrate deploy
```

### Code Rollback

```bash
# Revert to previous commit
git revert <migration-commit-hash>

# Or reset to previous state
git reset --hard <previous-commit-hash>
```

## Troubleshooting

### Issue: Users can't log in after migration

**Solution**: Users need to reset their passwords using "Forgot Password" feature.

### Issue: Migration script fails with "name field required"

**Solution**: The script automatically generates names from email addresses. Check the error logs for specific users.

### Issue: Some users still don't have accounts

**Solution**: 
1. Check the error logs from the migration script
2. Manually inspect those users in Prisma Studio
3. Run the migration script again (it's safe to re-run)

### Issue: Duplicate account error

**Solution**: This means the user already has an account. The script will skip them automatically.

## Verification Checklist

After migration, verify:

- [ ] All users have at least one account record
- [ ] All users have a `name` field
- [ ] All users have `emailVerified` field (defaults to false)
- [ ] Custom fields preserved (`encryptionKeyHash`, `gdprConsent`)
- [ ] All relationships intact (notes, folders, tags)
- [ ] Audit logs preserved
- [ ] Users can reset passwords via "Forgot Password"
- [ ] New user registration works
- [ ] Existing users can log in after password reset

## Database Schema Changes

### Before Migration

```sql
-- User table had password_hash
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),  -- Removed
  encryption_key_hash VARCHAR(255),
  gdpr_consent JSON,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### After Migration

```sql
-- User table without password_hash
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name VARCHAR(255),              -- Added
  email VARCHAR(255) UNIQUE,
  email_verified BOOLEAN,         -- Added
  image TEXT,                     -- Added
  encryption_key_hash VARCHAR(255),
  gdpr_consent JSON,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- New Account table stores passwords
CREATE TABLE account (
  id UUID PRIMARY KEY,
  account_id VARCHAR(255),
  provider_id VARCHAR(255),
  user_id UUID REFERENCES users(id),
  password TEXT,                  -- Passwords stored here
  -- ... other fields
);
```

## Security Considerations

### Password Storage

- **Old System**: bcrypt hashes in `users.password_hash`
- **New System**: scrypt hashes in `account.password` (Better Auth handles this)
- **Migration**: Temporary secure random passwords (users must reset)

### Why Not Migrate Passwords Directly?

We cannot migrate password hashes directly because:

1. **Different Hashing Algorithms**: Old system used bcrypt, Better Auth uses scrypt
2. **Hash Format Incompatibility**: The hash formats are not compatible
3. **Security Best Practice**: Password reset ensures users create strong passwords
4. **Verification**: Users verify their email during password reset

### Session Handling

- **Old Sessions**: JWT tokens will expire naturally (7-day expiry)
- **New Sessions**: Better Auth creates new sessions on login
- **Transition Period**: Both systems can coexist briefly during rollout

## Support Resources

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Prisma Migration Guide](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [VoiceFlow AI Authentication Docs](../docs/AUTHENTICATION.md)

## Questions?

If you encounter issues not covered in this guide:

1. Check the error logs from the migration script
2. Review the [Better Auth documentation](https://www.better-auth.com/docs)
3. Open an issue in the project repository
4. Contact the development team
