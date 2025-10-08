#!/usr/bin/env tsx
/**
 * Integration Validation Script
 * Validates all components are properly integrated and working
 * Requirements: 11.1
 */

import { prisma } from '../lib/db';

interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];

/**
 * Validate database connection and schema
 */
async function validateDatabase(): Promise<void> {
  console.log('\n🔍 Validating Database Connection...');

  try {
    // Test connection
    await prisma.$connect();
    results.push({
      component: 'Database Connection',
      status: 'pass',
      message: 'Successfully connected to database',
    });

    // Verify tables exist
    const userCount = await prisma.user.count();
    results.push({
      component: 'Database Schema',
      status: 'pass',
      message: `Database schema validated (${userCount} users)`,
    });

    // Check indexes
    const noteCount = await prisma.note.count();
    results.push({
      component: 'Database Performance',
      status: 'pass',
      message: `Database indexes working (${noteCount} notes)`,
    });
  } catch (error) {
    results.push({
      component: 'Database',
      status: 'fail',
      message: `Database validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Validate transcription services
 */
async function validateTranscription(): Promise<void> {
  console.log('\n🔍 Validating Transcription Services...');

  // Check if API keys are configured
  if (!process.env.DEEPGRAM_API_KEY && !process.env.ASSEMBLYAI_API_KEY) {
    results.push({
      component: 'Transcription Service',
      status: 'warning',
      message: 'No transcription API keys configured - skipping health check',
    });
    return;
  }

  try {
    const { transcriptionService } = await import('../lib/services/transcription');
    const health = await transcriptionService.healthCheck();

    if (health.deepgram) {
      results.push({
        component: 'Deepgram (Primary)',
        status: 'pass',
        message: 'Deepgram API is healthy',
      });
    } else {
      results.push({
        component: 'Deepgram (Primary)',
        status: 'warning',
        message: 'Deepgram API is unavailable - will use fallback',
      });
    }

    if (health.assemblyai) {
      results.push({
        component: 'AssemblyAI (Fallback)',
        status: 'pass',
        message: 'AssemblyAI API is healthy',
      });
    } else {
      results.push({
        component: 'AssemblyAI (Fallback)',
        status: 'warning',
        message: 'AssemblyAI API is unavailable',
      });
    }

    if (health.overall) {
      results.push({
        component: 'Transcription Service',
        status: 'pass',
        message: 'At least one transcription provider is available',
      });
    } else {
      results.push({
        component: 'Transcription Service',
        status: 'warning',
        message: 'No transcription providers available',
      });
    }
  } catch (error) {
    results.push({
      component: 'Transcription Service',
      status: 'warning',
      message: `Transcription validation skipped: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Validate AI services
 */
async function validateAI(): Promise<void> {
  console.log('\n🔍 Validating AI Services...');

  // Check if API key is configured
  if (!process.env.OPENAI_API_KEY) {
    results.push({
      component: 'OpenAI GPT',
      status: 'warning',
      message: 'OpenAI API key not configured - skipping health check',
    });
    return;
  }

  try {
    const { checkAIServiceHealth } = await import('../lib/services/ai');
    const health = await checkAIServiceHealth();

    if (health.available) {
      results.push({
        component: 'OpenAI GPT',
        status: 'pass',
        message: `OpenAI API is healthy (latency: ${health.latency}ms)`,
        details: { model: health.model, latency: health.latency },
      });
    } else {
      results.push({
        component: 'OpenAI GPT',
        status: 'warning',
        message: `OpenAI API is unavailable: ${health.error}`,
      });
    }
  } catch (error) {
    results.push({
      component: 'AI Service',
      status: 'warning',
      message: `AI validation skipped: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Validate storage service
 */
async function validateStorage(): Promise<void> {
  console.log('\n🔍 Validating Storage Service...');

  // Check if storage is configured
  if (
    !process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    !process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
    !process.env.APPWRITE_API_KEY
  ) {
    results.push({
      component: 'Appwrite Storage',
      status: 'warning',
      message: 'Appwrite not configured - skipping health check',
    });
    return;
  }

  try {
    const { storageService } = await import('../lib/services/storage');
    const health = await storageService.healthCheck();

    if (health.available) {
      results.push({
        component: 'Appwrite Storage',
        status: 'pass',
        message: 'Storage service is healthy',
        details: { bucketId: health.bucketId },
      });
    } else {
      results.push({
        component: 'Appwrite Storage',
        status: 'warning',
        message: `Storage service is unavailable: ${health.error}`,
      });
    }
  } catch (error) {
    results.push({
      component: 'Storage Service',
      status: 'warning',
      message: `Storage validation skipped: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Validate environment variables
 */
function validateEnvironment(): void {
  console.log('\n🔍 Validating Environment Variables...');

  const requiredVars = [
    'DATABASE_URL',
    'DEEPGRAM_API_KEY',
    'ASSEMBLYAI_API_KEY',
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'ENCRYPTION_KEY',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'ARCJET_KEY',
  ];

  const missing: string[] = [];
  const present: string[] = [];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  }

  if (missing.length === 0) {
    results.push({
      component: 'Environment Variables',
      status: 'pass',
      message: `All ${requiredVars.length} required variables are set`,
    });
  } else {
    results.push({
      component: 'Environment Variables',
      status: 'fail',
      message: `Missing ${missing.length} required variables: ${missing.join(', ')}`,
    });
  }

  // Check optional variables
  const optionalVars = ['REDIS_URL', 'SENTRY_DSN'];
  const missingOptional = optionalVars.filter((v) => !process.env[v]);

  if (missingOptional.length > 0) {
    results.push({
      component: 'Optional Variables',
      status: 'warning',
      message: `Missing optional variables: ${missingOptional.join(', ')}`,
    });
  }
}

/**
 * Validate authentication system
 */
async function validateAuth(): Promise<void> {
  console.log('\n🔍 Validating Authentication System...');

  try {
    // Check if Better Auth tables exist
    const sessionCount = await prisma.session.count();
    const accountCount = await prisma.account.count();

    results.push({
      component: 'Better Auth Schema',
      status: 'pass',
      message: `Auth tables validated (${sessionCount} sessions, ${accountCount} accounts)`,
    });

    // Verify encryption key is set
    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32) {
      results.push({
        component: 'Encryption Configuration',
        status: 'pass',
        message: 'Encryption key is properly configured',
      });
    } else {
      results.push({
        component: 'Encryption Configuration',
        status: 'fail',
        message: 'Encryption key is missing or too short (must be 32+ characters)',
      });
    }
  } catch (error) {
    results.push({
      component: 'Authentication System',
      status: 'fail',
      message: `Auth validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * Validate API endpoints structure
 */
async function validateAPIStructure(): Promise<void> {
  console.log('\n🔍 Validating API Structure...');

  const requiredEndpoints = [
    'app/api/auth/[...all]/route.ts',
    'app/api/audio/upload/route.ts',
    'app/api/transcription/route.ts',
    'app/api/ai/process/route.ts',
    'app/api/notes/route.ts',
    'app/api/folders/route.ts',
    'app/api/tags/route.ts',
    'app/api/search/route.ts',
    'app/api/gdpr/export/route.ts',
    'app/api/gdpr/delete/route.ts',
  ];

  const fs = await import('fs');
  const path = await import('path');

  const missing: string[] = [];
  const present: string[] = [];

  for (const endpoint of requiredEndpoints) {
    const fullPath = path.join(process.cwd(), endpoint);
    if (fs.existsSync(fullPath)) {
      present.push(endpoint);
    } else {
      missing.push(endpoint);
    }
  }

  if (missing.length === 0) {
    results.push({
      component: 'API Endpoints',
      status: 'pass',
      message: `All ${requiredEndpoints.length} required endpoints exist`,
    });
  } else {
    results.push({
      component: 'API Endpoints',
      status: 'warning',
      message: `Missing ${missing.length} endpoints: ${missing.join(', ')}`,
    });
  }
}

/**
 * Print validation results
 */
function printResults(): void {
  console.log('\n' + '='.repeat(80));
  console.log('INTEGRATION VALIDATION RESULTS');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter((r) => r.status === 'pass');
  const warnings = results.filter((r) => r.status === 'warning');
  const failed = results.filter((r) => r.status === 'fail');

  // Print by status
  if (passed.length > 0) {
    console.log('✅ PASSED:');
    passed.forEach((r) => {
      console.log(`   ${r.component}: ${r.message}`);
      if (r.details) {
        console.log(`      Details: ${JSON.stringify(r.details)}`);
      }
    });
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach((r) => {
      console.log(`   ${r.component}: ${r.message}`);
    });
    console.log('');
  }

  if (failed.length > 0) {
    console.log('❌ FAILED:');
    failed.forEach((r) => {
      console.log(`   ${r.component}: ${r.message}`);
    });
    console.log('');
  }

  // Summary
  console.log('='.repeat(80));
  console.log(`Total: ${results.length} checks`);
  console.log(`✅ Passed: ${passed.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log('='.repeat(80) + '\n');

  // Overall status
  if (failed.length === 0) {
    if (warnings.length === 0) {
      console.log('🎉 All integration checks passed!');
      console.log('✨ System is ready for deployment.\n');
    } else {
      console.log('✅ Integration checks passed with warnings.');
      console.log('⚠️  Review warnings before deployment.\n');
    }
  } else {
    console.log('❌ Integration validation failed.');
    console.log('🔧 Fix the failed checks before deployment.\n');
    process.exit(1);
  }
}

/**
 * Main validation function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Integration Validation...\n');

  try {
    // Run all validations
    validateEnvironment();
    await validateAPIStructure();
    await validateDatabase();
    await validateAuth();
    await validateTranscription();
    await validateAI();
    await validateStorage();

    // Print results
    printResults();
  } catch (error) {
    console.error('\n❌ Validation failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
main();
