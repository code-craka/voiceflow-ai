#!/usr/bin/env tsx
/**
 * Setup Verification Script
 * Verifies that all required configuration is in place for VoiceFlow AI
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, condition: boolean, message: string, isWarning = false): void {
  results.push({
    name,
    status: condition ? 'pass' : isWarning ? 'warn' : 'fail',
    message,
  });
}

// Check Node.js version
const nodeVersion = process.version;
const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
check(
  'Node.js Version',
  nodeMajor >= 22,
  nodeMajor >= 22 ? `✓ Node.js ${nodeVersion}` : `✗ Node.js ${nodeVersion} (requires 22.15.0+)`
);

// Check required files
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  '.eslintrc.json',
  '.prettierrc',
  'next.config.ts',
  'vitest.config.ts',
  'prisma/schema.prisma',
  '.env.local',
];

requiredFiles.forEach((file) => {
  const exists = existsSync(resolve(process.cwd(), file));
  check('File Check', exists, exists ? `✓ ${file}` : `✗ Missing: ${file}`);
});

// Check environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'DIRECT_URL',
  'DEEPGRAM_API_KEY',
  'ASSEMBLYAI_API_KEY',
  'OPENAI_API_KEY',
  'S3_BUCKET_NAME',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'REDIS_URL',
  'ARCJET_KEY',
];

requiredEnvVars.forEach((envVar) => {
  const value = process.env[envVar];
  const isSet = Boolean(value && value !== `your_${envVar.toLowerCase()}_here`);
  check(
    'Environment Variables',
    isSet,
    isSet ? `✓ ${envVar}` : `⚠ ${envVar} not configured`,
    true
  );
});

// Check Prisma client
try {
  require('@prisma/client');
  check('Prisma Client', true, '✓ Prisma client generated');
} catch {
  check('Prisma Client', false, '✗ Prisma client not generated (run: pnpm run db:generate)');
}

// Print results
console.log('\n🔍 VoiceFlow AI Setup Verification\n');
console.log('═'.repeat(60));

const grouped = results.reduce(
  (acc, result) => {
    if (!acc[result.name]) acc[result.name] = [];
    acc[result.name].push(result);
    return acc;
  },
  {} as Record<string, CheckResult[]>
);

Object.entries(grouped).forEach(([category, checks]) => {
  console.log(`\n${category}:`);
  checks.forEach((check) => {
    console.log(`  ${check.message}`);
  });
});

const failCount = results.filter((r) => r.status === 'fail').length;
const warnCount = results.filter((r) => r.status === 'warn').length;

console.log(`\n${'═'.repeat(60)}`);
console.log(`\nSummary: ${results.length} checks`);
console.log(`  ✓ Passed: ${results.length - failCount - warnCount}`);
if (warnCount > 0) console.log(`  ⚠ Warnings: ${warnCount}`);
if (failCount > 0) console.log(`  ✗ Failed: ${failCount}`);

if (failCount > 0) {
  console.log('\n❌ Setup verification failed. Please fix the issues above.\n');
  process.exit(1);
} else if (warnCount > 0) {
  console.log('\n⚠️  Setup complete with warnings. Configure environment variables before running.\n');
  process.exit(0);
} else {
  console.log('\n✅ All checks passed! Your environment is ready.\n');
  process.exit(0);
}
