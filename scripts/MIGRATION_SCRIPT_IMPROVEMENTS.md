# Migration Script Code Review & Improvements

## Executive Summary

The `scripts/migrate-existing-users.ts` file has been analyzed for code quality, security, and adherence to project standards. This document outlines critical issues found and provides actionable recommendations.

## ✅ Positive Aspects

1. **Good Error Handling**: Custom `MigrationError` class with proper typing
2. **Transaction Support**: Uses Prisma transactions for batch atomicity
3. **Audit Logging**: GDPR-compliant audit trail for all migrations
4. **Dry-Run Mode**: Safe testing before applying changes
5. **Batch Processing**: Handles large datasets efficiently

## 🔴 Critical Issues & Fixes

### 1. **CRITICAL: Violation of "No Raw SQL" Policy**

**Issue**: The script uses extensive raw SQL queries (`$queryRaw`, `$queryRawUnsafe`, `$executeRawUnsafe`) which violates the project's steering guidelines that mandate "Prisma ORM only (no raw SQL queries)".

**Impact**:
- Bypasses Prisma's type safety
- Potential SQL injection risks with `$queryRawUnsafe`
- Harder to maintain and test
- Inconsistent with project standards

**Fix**: Replace all raw SQL with Prisma Client methods:

```typescript
// ❌ BAD: Raw SQL
const userCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
  SELECT COUNT(*) as count FROM users;
`;

// ✅ GOOD: Prisma Client
const userCount = await prisma.user.count();
```

```typescript
// ❌ BAD: Raw SQL for duplicate check
const duplicateEmails = await prisma.$queryRaw<Array<{ email: string; count: bigint }>>`
  SELECT email, COUNT(*) as count
  FROM users
  GROUP BY email
  HAVING COUNT(*) > 1;
`;

// ✅ GOOD: Prisma groupBy
const emailGroups = await prisma.user.groupBy({
  by: ['email'],
  _count: { email: true },
  having: {
    email: {
      _count: { gt: 1 },
    },
  },
});
```

```typescript
// ❌ BAD: Raw SQL for fetching users
const allUsersRaw = await prisma.$queryRawUnsafe<Array<{...}>>(
  'SELECT * FROM users'
);

// ✅ GOOD: Prisma findMany with include
const allUsers = await prisma.user.findMany({
  include: {
    accounts: {
      select: {
        id: true,
        accountId: true,
        providerId: true,
        userId: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    },
  },
});
```

```typescript
// ❌ BAD: Raw SQL for updates
await tx.$executeRawUnsafe(
  'UPDATE users SET name = $1, updated_at = $2 WHERE id = $3',
  userName, new Date(), user.id
);

// ✅ GOOD: Prisma update
await tx.user.update({
  where: { id: user.id },
  data: {
    name: userName,
    updatedAt: new Date(),
  },
});
```

```typescript
// ❌ BAD: Raw SQL for inserts
await tx.$executeRawUnsafe(
  `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  accountId, user.email, MIGRATION_CONFIG.PROVIDER_ID, user.id, hashedPassword, user.createdAt, new Date()
);

// ✅ GOOD: Prisma create
await tx.account.create({
  data: {
    accountId: user.email,
    providerId: MIGRATION_CONFIG.PROVIDER_ID,
    userId: user.id,
    password: hashedPassword,
    createdAt: user.createdAt,
    updatedAt: new Date(),
  },
});
```

### 2. **SECURITY: Insecure Password Hashing Fallback**

**Issue**: The fallback password hashing uses SHA-256, which is insecure and doesn't match Better Auth's requirements.

```typescript
// ❌ BAD: Insecure fallback
catch (error) {
  console.warn('⚠️  bcryptjs not found, using fallback hash');
  return crypto.createHash('sha256').update(randomPassword).digest('hex');
}
```

**Fix**: Fail fast if bcryptjs is not available (it's a required dependency):

```typescript
// ✅ GOOD: Fail fast with clear error
async function generateHashedPassword(): Promise<string> {
  const randomPassword = crypto.randomBytes(32).toString('base64');
  
  try {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.hash(randomPassword, 10);
  } catch (error) {
    throw new Error(
      'bcryptjs is required for password hashing. Install it with: pnpm add bcryptjs @types/bcryptjs'
    );
  }
}
```

### 3. **GDPR COMPLIANCE: Silent Audit Log Failures**

**Issue**: The `logMigration` function swallows errors silently, which could hide GDPR compliance issues.

```typescript
// ❌ BAD: Silent failure
catch (error) {
  console.warn(`⚠️  Failed to create audit log for ${email}:`, error);
}
```

**Fix**: Log errors prominently and consider failing in production:

```typescript
// ✅ GOOD: Prominent error logging
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`❌ CRITICAL: Failed to create audit log for ${email}: ${errorMessage}`);
  // In production, you might want to throw here or send an alert
}
```

### 4. **PERFORMANCE: Audit Logging Inside Transaction**

**Issue**: Audit logs are created inside the transaction, which can cause blocking and slow down the migration.

**Fix**: Move audit logging outside the transaction:

```typescript
// ✅ GOOD: Audit logs after transaction
await prisma.$transaction(async (tx) => {
  // ... migration logic ...
});

// Create audit logs after successful transaction
for (const user of batch) {
  if (!stats.errors.some(e => e.userId === user.id)) {
    await logMigration(user.id, user.email, true, { ... });
  }
}
```

### 5. **TYPE SAFETY: Missing Return Type Annotations**

**Issue**: Some functions lack explicit return type annotations, violating TypeScript strict mode requirements.

**Fix**: Add explicit return types to all functions:

```typescript
// ✅ GOOD: Explicit return types
async function validatePreMigration(): Promise<{ valid: boolean; errors: string[] }> {
  // ...
}

function isDryRun(): boolean {
  return process.argv.includes(CLI_FLAGS.DRY_RUN);
}

function getBatchSize(): number {
  // ...
}
```

## 📋 Complete Refactored Example

Here's how the validation function should look with all improvements:

```typescript
/**
 * Validate database state before migration
 */
async function validatePreMigration(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  console.log('🔍 Validating database state...');

  // Check database connection and tables
  try {
    await prisma.$connect();
    console.log('  ✅ Database connection successful');
    
    // Check if users table exists by attempting to count users
    const userCount = await prisma.user.count();
    console.log(`  ✅ Users table found (${userCount} users)`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Database error: ${errorMessage}`);
    
    errors.push(
      'Database connection failed. Please check:\n' +
      '    1. Database is running: psql -U voiceflow_ai -h localhost -d voiceflow_ai\n' +
      '    2. DATABASE_URL is correct in .env file\n' +
      `    Error: ${errorMessage}`
    );
    console.log('');
    return { valid: false, errors };
  }

  // Check if Better Auth tables exist
  try {
    await Promise.all([
      prisma.account.findFirst(),
      prisma.session.findFirst(),
      prisma.verification.findFirst(),
    ]);
    console.log('  ✅ Better Auth tables found');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Error checking Better Auth tables: ${errorMessage}`);
    errors.push(
      'Better Auth tables not found. Please run migrations:\n' +
      '    npx prisma migrate deploy    # For production\n' +
      '    npx prisma migrate dev       # For development'
    );
    console.log('');
    return { valid: false, errors };
  }

  // Check for duplicate emails using Prisma groupBy
  try {
    const emailGroups = await prisma.user.groupBy({
      by: ['email'],
      _count: { email: true },
      having: {
        email: {
          _count: { gt: 1 },
        },
      },
    });

    if (emailGroups.length > 0) {
      errors.push(
        `Found ${emailGroups.length} duplicate email addresses. Clean up before migration:\n` +
        emailGroups.map(g => `    - ${g.email} (${g._count.email} occurrences)`).join('\n')
      );
    } else {
      console.log('  ✅ No duplicate emails found');
    }
  } catch (error) {
    console.warn('  ⚠️  Could not check for duplicate emails');
  }

  // Check for users with missing required fields
  try {
    const usersWithoutEmail = await prisma.user.count({
      where: {
        OR: [
          { email: null },
          { email: '' },
        ],
      },
    });

    if (usersWithoutEmail > 0) {
      errors.push(`Found ${usersWithoutEmail} users without email addresses`);
    } else {
      console.log('  ✅ All users have email addresses');
    }
  } catch (error) {
    console.warn('  ⚠️  Could not validate user emails');
  }

  console.log('');
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

## 🎯 Additional Recommendations

### 1. **Add Input Validation with Zod**

```typescript
import { z } from 'zod';

const MigrationConfigSchema = z.object({
  BATCH_SIZE: z.number().min(1).max(1000),
  PROVIDER_ID: z.literal('credential'),
  PASSWORD_RESET_REQUIRED: z.boolean(),
  AUDIT_LOG_ACTION: z.string(),
});

// Validate configuration at startup
MigrationConfigSchema.parse(MIGRATION_CONFIG);
```

### 2. **Add Progress Tracking**

```typescript
console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)...`);
console.log(`   Progress: ${Math.round((i / usersNeedingMigration.length) * 100)}%`);
```

### 3. **Add Rollback Capability**

```typescript
// Store original state before migration
const backupData = await prisma.user.findMany({
  where: { id: { in: usersNeedingMigration.map(u => u.id) } },
  include: { accounts: true },
});

// Save to file for manual rollback if needed
await fs.writeFile(
  `migration-backup-${Date.now()}.json`,
  JSON.stringify(backupData, null, 2)
);
```

### 4. **Add Retry Logic for Transient Failures**

```typescript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.warn(`  ⚠️  Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Unreachable');
}
```

### 5. **Add Verification After Each Batch**

```typescript
// After each batch, verify the migration was successful
const verifyBatch = await prisma.user.findMany({
  where: {
    id: { in: batch.map(u => u.id) },
  },
  include: {
    accounts: {
      where: { providerId: 'credential' },
    },
  },
});

const failedInBatch = verifyBatch.filter(u => u.accounts.length === 0);
if (failedInBatch.length > 0) {
  console.error(`  ❌ Verification failed for ${failedInBatch.length} users in batch`);
}
```

## 📊 Summary of Changes Required

| Issue | Priority | Impact | Effort |
|-------|----------|--------|--------|
| Replace raw SQL with Prisma | 🔴 Critical | High | Medium |
| Fix password hashing fallback | 🔴 Critical | High | Low |
| Improve audit log error handling | 🟡 High | Medium | Low |
| Move audit logs outside transaction | 🟡 High | Medium | Low |
| Add explicit return types | 🟢 Medium | Low | Low |
| Add input validation | 🟢 Medium | Medium | Medium |
| Add progress tracking | 🟢 Low | Low | Low |
| Add rollback capability | 🟢 Low | High | High |

## 🚀 Implementation Steps

1. **Immediate (Critical)**:
   - Replace all raw SQL queries with Prisma Client methods
   - Fix password hashing to fail fast without insecure fallback
   - Test thoroughly with dry-run mode

2. **Short-term (High Priority)**:
   - Improve audit log error handling
   - Verify audit logs are outside transactions
   - Add explicit return types to all functions

3. **Medium-term (Nice to Have)**:
   - Add Zod validation for configuration
   - Add progress tracking
   - Add retry logic for transient failures

4. **Long-term (Future Enhancement)**:
   - Add rollback capability
   - Add per-batch verification
   - Add monitoring and alerting integration

## ✅ Testing Checklist

Before deploying the migration script:

- [ ] Run with `--dry-run` flag to preview changes
- [ ] Test with small batch size (e.g., 5 users)
- [ ] Verify audit logs are created correctly
- [ ] Test error handling with invalid data
- [ ] Verify transaction rollback on errors
- [ ] Test with duplicate emails (should fail validation)
- [ ] Test with users missing required fields
- [ ] Verify Better Auth tables exist before migration
- [ ] Test verification function after migration
- [ ] Check TypeScript compilation with strict mode
- [ ] Run linter to ensure code quality

## 📚 References

- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Project Steering Guidelines](.kiro/steering/tech.md)
- [Security Requirements](.kiro/steering/security.md)
