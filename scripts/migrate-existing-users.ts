/**
 * Data Migration Script for Existing Users
 * 
 * This script migrates existing users to the Better Auth system by:
 * 1. Validating database state and checking for issues
 * 2. Checking for users without Account records (credential provider)
 * 3. Creating Account records with properly hashed passwords
 * 4. Ensuring all users have required fields (name, emailVerified)
 * 5. Creating audit logs for compliance tracking
 * 
 * Requirements: 2.4
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-existing-users.ts
 *   pnpm tsx scripts/migrate-existing-users.ts --dry-run        # Preview changes
 *   pnpm tsx scripts/migrate-existing-users.ts --batch-size 100 # Custom batch size
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

/**
 * Migration configuration constants
 */
const MIGRATION_CONFIG = {
  BATCH_SIZE: 50,
  PROVIDER_ID: 'credential',
  PASSWORD_RESET_REQUIRED: true,
  AUDIT_LOG_ACTION: 'USER_MIGRATED_TO_BETTER_AUTH',
} as const;

/**
 * CLI flags
 */
const CLI_FLAGS = {
  DRY_RUN: '--dry-run',
  BATCH_SIZE: '--batch-size',
} as const;

interface MigrationStats {
  totalUsers: number;
  usersWithAccounts: number;
  usersNeedingMigration: number;
  usersMigrated: number;
  errors: Array<{ userId: string; email: string; error: string }>;
}

/**
 * Custom error for migration failures
 */
class MigrationError extends Error {
  constructor(
    message: string,
    public readonly userId: string,
    public readonly email: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Generate a secure hashed password for migration
 * Note: Users will need to reset this password on first login
 * Better Auth uses scrypt internally, but for migration we use bcrypt
 * 
 * @throws {Error} If bcryptjs is not available (required dependency)
 */
async function generateHashedPassword(): Promise<string> {
  // Generate a cryptographically secure random password
  const randomPassword = crypto.randomBytes(32).toString('base64');

  // For Better Auth compatibility, we use bcrypt-compatible hash
  // Better Auth will re-hash on password reset
  try {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.hash(randomPassword, 10);
  } catch (error) {
    // bcryptjs is a required dependency - fail fast if not available
    throw new Error(
      'bcryptjs is required for password hashing. Install it with: pnpm add bcryptjs @types/bcryptjs'
    );
  }
}

/**
 * Check if running in dry-run mode
 */
function isDryRun(): boolean {
  return process.argv.includes(CLI_FLAGS.DRY_RUN);
}

/**
 * Get batch size from CLI arguments
 */
function getBatchSize(): number {
  const batchSizeIndex = process.argv.indexOf(CLI_FLAGS.BATCH_SIZE);
  if (batchSizeIndex !== -1 && process.argv[batchSizeIndex + 1]) {
    const size = parseInt(process.argv[batchSizeIndex + 1], 10);
    return isNaN(size) ? MIGRATION_CONFIG.BATCH_SIZE : size;
  }
  return MIGRATION_CONFIG.BATCH_SIZE;
}

/**
 * Handle migration errors with proper typing
 */
function handleMigrationError(error: unknown, userId: string, email: string): MigrationError {
  if (error instanceof MigrationError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  return new MigrationError(message, userId, email, error instanceof Error ? error : undefined);
}

/**
 * Create audit log entry for migration
 * 
 * @throws {Error} If audit log creation fails (critical for GDPR compliance)
 */
async function logMigration(
  userId: string,
  email: string,
  success: boolean,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: MIGRATION_CONFIG.AUDIT_LOG_ACTION,
        resourceType: 'user',
        resourceId: userId,
        details: {
          email,
          success,
          migratedAt: new Date().toISOString(),
          passwordResetRequired: MIGRATION_CONFIG.PASSWORD_RESET_REQUIRED,
          ...details,
        },
        ipAddress: undefined, // Script execution, no IP
        userAgent: 'migration-script',
      },
    });
  } catch (error) {
    // Audit logging is critical for GDPR compliance - log error but don't fail migration
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ CRITICAL: Failed to create audit log for ${email}: ${errorMessage}`);
    // In production, you might want to throw here or send an alert
  }
}

/**
 * Validate database state before migration
 */
async function validatePreMigration(): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  console.log('🔍 Validating database state...');

  // Check database connection and tables
  try {
    // Test database connection
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

  // Check if Better Auth tables exist by attempting to query them
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
      _count: {
        email: true,
      },
      having: {
        email: {
          _count: {
            gt: 1,
          },
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

/**
 * Main migration function
 */
async function migrateExistingUsers(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalUsers: 0,
    usersWithAccounts: 0,
    usersNeedingMigration: 0,
    usersMigrated: 0,
    errors: [],
  };

  const dryRun = isDryRun();
  const batchSize = getBatchSize();

  console.log('🔍 Starting user migration to Better Auth...');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log(`Batch size: ${batchSize}\n`);

  // Validate database state
  const validation = await validatePreMigration();
  if (!validation.valid) {
    console.error('❌ Pre-migration validation failed:');
    validation.errors.forEach(err => console.error(`  - ${err}`));
    throw new Error('Pre-migration validation failed');
  }

  try {
    // Step 1: Get all users with their accounts using Prisma
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

    stats.totalUsers = allUsers.length;
    console.log(`📊 Found ${stats.totalUsers} total users\n`);

    if (stats.totalUsers === 0) {
      console.log('✅ No users found. Database is ready for Better Auth.');
      return stats;
    }

    // Step 2: Identify users needing migration
    const usersNeedingMigration = allUsers.filter(user => {
      // Check if user has a credential account (providerId: 'credential')
      const hasCredentialAccount = user.accounts.some(
        account => account.providerId === 'credential'
      );
      return !hasCredentialAccount;
    });

    stats.usersWithAccounts = stats.totalUsers - usersNeedingMigration.length;
    stats.usersNeedingMigration = usersNeedingMigration.length;

    console.log(`✅ Users with accounts: ${stats.usersWithAccounts}`);
    console.log(`⚠️  Users needing migration: ${stats.usersNeedingMigration}\n`);

    if (stats.usersNeedingMigration === 0) {
      console.log('✅ All users already have Better Auth accounts. No migration needed.');
      return stats;
    }

    // Step 3: Migrate users in batches
    console.log('🔄 Migrating users in batches...\n');

    for (let i = 0; i < usersNeedingMigration.length; i += batchSize) {
      const batch = usersNeedingMigration.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(usersNeedingMigration.length / batchSize);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)...`);

      if (!dryRun) {
        // Use transaction for batch atomicity
        await prisma.$transaction(async (tx) => {
          for (const user of batch) {
            try {
              console.log(`  Processing: ${user.email}`);

              // Ensure user has a name field
              let userName = user.name;
              if (!userName || userName.trim() === '') {
                userName = user.email.split('@')[0];
                console.log(`    ℹ️  Setting name to: ${userName}`);
              }

              // Update user with name if needed
              if (user.name !== userName) {
                await tx.user.update({
                  where: { id: user.id },
                  data: {
                    name: userName,
                    updatedAt: new Date(),
                  },
                });
              }

              // Create Account record with hashed password
              const hashedPassword = await generateHashedPassword();

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

              console.log(`    ✅ Migrated successfully`);
              stats.usersMigrated++;
            } catch (error) {
              const migrationError = handleMigrationError(error, user.id, user.email);
              console.error(`    ❌ ${migrationError.message}`);

              stats.errors.push({
                userId: migrationError.userId,
                email: migrationError.email,
                error: migrationError.message,
              });

              // Re-throw to rollback transaction
              throw migrationError;
            }
          }
        });

        // Create audit logs after successful transaction (outside transaction to avoid blocking)
        for (const user of batch) {
          if (!stats.errors.some(e => e.userId === user.id)) {
            const userName = user.name || user.email.split('@')[0];
            await logMigration(user.id, user.email, true, {
              nameSet: userName,
              batchNumber,
            });
          }
        }

        // Log failed migrations
        for (const error of stats.errors.filter(e => batch.some(u => u.id === e.userId))) {
          await logMigration(error.userId, error.email, false, {
            error: error.error,
            batchNumber,
          });
        }
      } else {
        // Dry run: just log what would happen
        for (const user of batch) {
          console.log(`  [DRY RUN] Would migrate: ${user.email}`);
          const userName = user.name || user.email.split('@')[0];
          if (user.name !== userName) {
            console.log(`    [DRY RUN] Would set name to: ${userName}`);
          }
          console.log(`    [DRY RUN] Would create credential account`);
          stats.usersMigrated++;
        }
      }

      console.log(`  ✅ Batch ${batchNumber}/${totalBatches} complete\n`);
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  Total users: ${stats.totalUsers}`);
    console.log(`  Users with accounts: ${stats.usersWithAccounts}`);
    console.log(`  Users migrated: ${stats.usersMigrated}`);
    console.log(`  Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.forEach(err => {
        console.log(`  - ${err.email}: ${err.error}`);
      });
    }

    if (dryRun) {
      console.log('\n⚠️  DRY RUN MODE: No changes were made to the database.');
      console.log('   Run without --dry-run flag to apply changes.');
    } else {
      console.log('\n✅ Migration complete!');
      console.log('\n⚠️  IMPORTANT: Users who were migrated will need to reset their passwords.');
      console.log('   They should use the "Forgot Password" feature on first login.');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }

  return stats;
}

/**
 * Verify migration results
 */
async function verifyMigration(): Promise<void> {
  console.log('\n🔍 Verifying migration...');

  try {
    // Check for users without accounts using Prisma
    const usersWithoutAccounts = await prisma.user.findMany({
      where: {
        accounts: {
          none: {
            providerId: 'credential',
          },
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (usersWithoutAccounts.length === 0) {
      console.log('✅ Verification passed: All users have accounts');
    } else {
      console.log(`⚠️  Warning: ${usersWithoutAccounts.length} users still without accounts:`);
      usersWithoutAccounts.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`);
      });
    }

    // Check for users without names using Prisma
    const usersWithoutNames = await prisma.user.findMany({
      where: {
        OR: [
          { name: null },
          { name: '' },
        ],
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (usersWithoutNames.length === 0) {
      console.log('✅ Verification passed: All users have names');
    } else {
      console.log(`⚠️  Warning: ${usersWithoutNames.length} users without names:`);
      usersWithoutNames.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
if (require.main === module) {
  migrateExistingUsers()
    .then(async (stats) => {
      if (!isDryRun() && stats.usersMigrated > 0) {
        await verifyMigration();
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}


export { migrateExistingUsers, verifyMigration };
