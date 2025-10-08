# Scripts Directory

This directory contains utility scripts for VoiceFlow AI maintenance and operations.

## Available Scripts

### User Migration

#### `migrate-existing-users.ts`

Migrates existing users from the old authentication system to Better Auth.

**Usage:**

```bash
# Preview changes without applying them (recommended first step)
pnpm migrate:users:dry-run

# Apply the migration
pnpm migrate:users
```

**What it does:**
- Identifies users without Better Auth credential accounts
- Creates Account records for those users
- Sets temporary passwords (users must reset)
- Ensures all users have required fields (name, emailVerified)
- Provides detailed migration statistics and error reporting

**Important:** Users migrated by this script will need to reset their passwords using the "Forgot Password" feature.

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed documentation.

### Setup Verification

#### `verify-setup.ts`

Verifies that the development environment is properly configured.

**Usage:**

```bash
pnpm verify-setup
```

**What it checks:**
- Environment variables are set
- Database connection is working
- Required services are accessible
- Better Auth configuration is valid

## Development Guidelines

### Creating New Scripts

When creating new scripts:

1. Use TypeScript for type safety
2. Include comprehensive error handling
3. Add a dry-run mode for destructive operations
4. Provide clear console output with emojis for readability
5. Include JSDoc comments explaining the script's purpose
6. Add corresponding npm scripts to `package.json`
7. Write unit tests in `tests/unit/`
8. Document the script in this README

### Script Naming Conventions

- Use kebab-case for file names: `migrate-existing-users.ts`
- Use descriptive names that indicate the script's purpose
- Prefix with the domain: `migrate-`, `verify-`, `seed-`, etc.

### Error Handling

All scripts should:
- Use try-catch blocks for async operations
- Provide meaningful error messages
- Exit with appropriate exit codes (0 for success, 1 for failure)
- Log errors to console with context

### Database Scripts

Scripts that interact with the database should:
- Use Prisma Client for all database operations
- Disconnect from the database in a `finally` block
- Support dry-run mode for preview
- Include verification steps after completion
- Be idempotent (safe to run multiple times)

## Testing Scripts

Run tests for scripts:

```bash
# Run all script tests
pnpm test tests/unit/

# Run specific script test
pnpm test tests/unit/migrate-existing-users.test.ts
```

## Common Patterns

### Dry Run Mode

```typescript
function isDryRun(): boolean {
  return process.argv.includes('--dry-run');
}

if (!isDryRun()) {
  // Apply changes
} else {
  console.log('[DRY RUN] Would apply changes');
}
```

### Progress Reporting

```typescript
console.log('🔍 Starting operation...');
console.log('✅ Success');
console.log('⚠️  Warning');
console.log('❌ Error');
console.log('ℹ️  Info');
```

### Database Operations

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  // Database operations
} catch (error) {
  console.error('Error:', error);
  throw error;
} finally {
  await prisma.$disconnect();
}
```

## Troubleshooting

### Script Won't Run

```bash
# Ensure tsx is installed
pnpm install

# Check TypeScript compilation
pnpm type-check

# Run with verbose output
tsx --inspect scripts/your-script.ts
```

### Database Connection Issues

```bash
# Verify environment variables
cat .env.local

# Test database connection
pnpm verify-setup

# Check Prisma client is generated
pnpm db:generate
```

### Permission Issues

```bash
# Make script executable (if needed)
chmod +x scripts/your-script.ts

# Run with tsx
tsx scripts/your-script.ts
```

## Resources

- [tsx Documentation](https://github.com/esbuild-kit/tsx)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Node.js Process API](https://nodejs.org/api/process.html)
