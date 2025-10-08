# User Migration to Better Auth

## Overview

This document provides a quick reference for the user migration process from the old authentication system to Better Auth.

## Quick Start

### For Development/Testing

```bash
# 1. Preview the migration (no changes made)
pnpm migrate:users:dry-run

# 2. Apply the migration
pnpm migrate:users
```

### For Production

```bash
# 1. Backup your database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Preview the migration
pnpm migrate:users:dry-run

# 3. Apply the migration during low-traffic period
pnpm migrate:users

# 4. Verify results
# Check the console output for verification results
```

## What Gets Migrated

### User Data
- ✅ All existing user records preserved
- ✅ Custom fields maintained (`encryptionKeyHash`, `gdprConsent`)
- ✅ All relationships intact (notes, folders, tags, audit logs)
- ✅ User metadata and timestamps preserved

### Authentication Data
- ✅ Account records created for each user
- ✅ Passwords set to secure random values (users must reset)
- ✅ Email used as account identifier
- ✅ Credential provider configured

### What Changes
- ❌ Old password hashes are NOT migrated (incompatible formats)
- ⚠️ Users must reset passwords on first login
- ✅ New session management via Better Auth
- ✅ Enhanced security with scrypt hashing

## User Impact

### What Users Need to Do

1. **First Login Attempt**: Users will need to click "Forgot Password"
2. **Password Reset**: Follow the email link to set a new password
3. **Login**: Use the new password to access their account

### What Stays the Same

- All notes and recordings are preserved
- Folder structure remains intact
- Tags and organization unchanged
- GDPR preferences maintained
- Encryption keys preserved

## Migration Script Features

### Safety Features
- **Dry Run Mode**: Preview changes before applying
- **Idempotent**: Safe to run multiple times
- **Error Handling**: Detailed error reporting
- **Verification**: Automatic post-migration checks
- **Rollback Support**: Database migration can be rolled back

### What It Does

1. **Discovery Phase**
   - Finds all users in the database
   - Identifies users without Better Auth accounts
   - Reports statistics

2. **Migration Phase**
   - Creates Account records for users
   - Sets secure temporary passwords
   - Ensures all users have required fields
   - Preserves all custom data

3. **Verification Phase**
   - Checks all users have accounts
   - Verifies required fields are present
   - Reports any issues

## Monitoring Migration

### Console Output

The script provides detailed output:

```
🔍 Starting user migration to Better Auth...
Mode: LIVE

📊 Found 150 total users

✅ Users with accounts: 50
⚠️  Users needing migration: 100

🔄 Migrating users...

  Processing user: user@example.com (uuid-here)
    ✅ Created credential account (password reset required)

📊 Migration Summary:
  Total users: 150
  Users with accounts: 50
  Users migrated: 100
  Errors: 0

✅ Migration complete!

⚠️  IMPORTANT: Users who were migrated will need to reset their passwords.
   They should use the "Forgot Password" feature on first login.

🔍 Verifying migration...
✅ Verification passed: All users have accounts
✅ Verification passed: All users have names
```

### Error Handling

If errors occur, they're reported clearly:

```
❌ Errors encountered:
  - user@example.com: Duplicate account
  - another@example.com: Invalid email format
```

## Troubleshooting

### Common Issues

#### "Users can't log in"
**Solution**: Users need to reset passwords via "Forgot Password"

#### "Migration script fails"
**Solution**: 
1. Check database connection: `pnpm verify-setup`
2. Ensure Prisma client is generated: `pnpm db:generate`
3. Review error logs in console output

#### "Some users still don't have accounts"
**Solution**: 
1. Check error logs from migration
2. Run migration again (it's safe to re-run)
3. Manually inspect users in Prisma Studio

## Rollback Procedure

If you need to rollback:

```bash
# 1. Rollback database migration
pnpm prisma migrate resolve --rolled-back 20251008013212_add_better_auth_tables

# 2. Restore from backup
psql $DATABASE_URL < backup_file.sql

# 3. Revert code changes
git revert <migration-commit>
```

## Verification Checklist

After migration:

- [ ] Run `pnpm migrate:users:dry-run` first
- [ ] Review dry-run output
- [ ] Apply migration with `pnpm migrate:users`
- [ ] Check console output for errors
- [ ] Verify all users have accounts
- [ ] Test password reset flow
- [ ] Test new user registration
- [ ] Verify existing data is intact

## Support

For detailed documentation, see:
- [Migration Guide](../scripts/MIGRATION_GUIDE.md) - Comprehensive guide
- [Scripts README](../scripts/README.md) - Script documentation
- [Better Auth Steering](../.kiro/steering/better-auth.md) - Implementation patterns

## Timeline

### Recommended Migration Steps

1. **Week 1**: Test migration in development
2. **Week 2**: Test migration in staging
3. **Week 3**: Notify users about upcoming changes
4. **Week 4**: Execute production migration
5. **Week 5**: Monitor and support users

### Communication Template

```
Subject: Action Required: Password Reset for VoiceFlow AI

Dear [User],

We're upgrading our authentication system for better security.

What you need to do:
1. Visit voiceflow-ai.com/login
2. Click "Forgot Password"
3. Check your email for reset link
4. Set your new password

Your data is safe and unchanged. This is just a security upgrade.

Questions? Contact support@voiceflow-ai.com

Thank you,
VoiceFlow AI Team
```

## Technical Details

### Database Changes

**Before:**
- Passwords in `users.password_hash` (bcrypt)
- No Better Auth tables

**After:**
- Passwords in `account.password` (scrypt via Better Auth)
- Better Auth tables: `session`, `account`, `verification`
- User table updated with `name`, `emailVerified`, `image` fields

### Security Improvements

- **Hashing**: bcrypt → scrypt (OWASP recommended)
- **Sessions**: JWT tokens → HTTP-only cookies
- **CSRF**: Built-in protection
- **Session Management**: Automatic expiry and refresh

## Performance Impact

- **Migration Time**: ~1 second per 100 users
- **Downtime**: None (users can continue using the app)
- **Database Load**: Minimal (single transaction per user)

## Compliance

### GDPR Considerations

- ✅ User data preserved
- ✅ Consent preferences maintained
- ✅ Audit logs updated
- ✅ Data export still works
- ✅ Data deletion still works

### Security Audit

- ✅ Password reset required (security best practice)
- ✅ Secure random temporary passwords
- ✅ Email verification maintained
- ✅ Session security enhanced
