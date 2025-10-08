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

interface VerificationSummary {
  total: number;
  passed: number;
  warnings: number;
  failed: number;
}

const results: CheckResult[] = [];

/**
 * Add a check result to the results array
 */
function check(name: string, condition: boolean, message: string, isWarning = false): void {
  results.push({
    name,
    status: condition ? 'pass' : isWarning ? 'warn' : 'fail',
    message,
  });
}

/**
 * Calculate verification summary statistics
 */
function calculateSummary(): VerificationSummary {
  const failCount = results.filter((r) => r.status === 'fail').length;
  const warnCount = results.filter((r) => r.status === 'warn').length;
  
  return {
    total: results.length,
    passed: results.length - failCount - warnCount,
    warnings: warnCount,
    failed: failCount,
  };
}

/**
 * Verify Node.js version meets minimum requirements
 */
function checkNodeVersion(): void {
  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  const meetsRequirement = nodeMajor >= 22;
  
  check(
    'Node.js Version',
    meetsRequirement,
    meetsRequirement 
      ? `✓ Node.js ${nodeVersion}` 
      : `✗ Node.js ${nodeVersion} (requires 22.15.0+)`
  );
}

checkNodeVersion();

/**
 * Verify all required configuration files exist
 */
function checkRequiredFiles(): void {
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'eslint.config.js', // Updated from .eslintrc.json
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
}

checkRequiredFiles();

/**
 * Verify all required environment variables are configured
 */
function checkEnvironmentVariables(): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'DIRECT_URL',
    'DEEPGRAM_API_KEY',
    'ASSEMBLYAI_API_KEY',
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'ENCRYPTION_KEY',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'REDIS_URL',
    'ARCJET_KEY',
  ];

  requiredEnvVars.forEach((envVar) => {
    const value = process.env[envVar];
    const isPlaceholder = value === `your_${envVar.toLowerCase()}_here`;
    const isSet = Boolean(value && !isPlaceholder);
    
    check(
      'Environment Variables',
      isSet,
      isSet ? `✓ ${envVar}` : `⚠ ${envVar} not configured`,
      true // Treat as warning, not failure
    );
  });
}

checkEnvironmentVariables();

/**
 * Verify Prisma client has been generated
 */
function checkPrismaClient(): void {
  try {
    require('@prisma/client');
    check('Prisma Client', true, '✓ Prisma client generated');
  } catch (error) {
    check(
      'Prisma Client', 
      false, 
      '✗ Prisma client not generated (run: pnpm run db:generate)'
    );
  }
}

checkPrismaClient();

/**
 * Group check results by category
 */
function groupResultsByCategory(): Record<string, CheckResult[]> {
  return results.reduce(
    (acc, result) => {
      if (!acc[result.name]) {
        acc[result.name] = [];
      }
      acc[result.name].push(result);
      return acc;
    },
    {} as Record<string, CheckResult[]>
  );
}

/**
 * Print verification results in a formatted manner
 */
function printResults(): void {
  console.log('\n🔍 VoiceFlow AI Setup Verification\n');
  console.log('═'.repeat(60));

  const grouped = groupResultsByCategory();

  Object.entries(grouped).forEach(([category, checks]) => {
    console.log(`\n${category}:`);
    checks.forEach((checkResult) => {
      console.log(`  ${checkResult.message}`);
    });
  });
}

/**
 * Print summary statistics
 */
function printSummary(summary: VerificationSummary): void {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`\nSummary: ${summary.total} checks`);
  console.log(`  ✓ Passed: ${summary.passed}`);
  if (summary.warnings > 0) {
    console.log(`  ⚠ Warnings: ${summary.warnings}`);
  }
  if (summary.failed > 0) {
    console.log(`  ✗ Failed: ${summary.failed}`);
  }
}

/**
 * Determine exit code and message based on verification results
 */
function exitWithStatus(summary: VerificationSummary): never {
  if (summary.failed > 0) {
    console.log('\n❌ Setup verification failed. Please fix the issues above.\n');
    process.exit(1);
  } else if (summary.warnings > 0) {
    console.log('\n⚠️  Setup complete with warnings. Configure environment variables before running.\n');
    process.exit(0);
  } else {
    console.log('\n✅ All checks passed! Your environment is ready.\n');
    process.exit(0);
  }
}

// Execute verification and print results
printResults();
const summary = calculateSummary();
printSummary(summary);
exitWithStatus(summary);
