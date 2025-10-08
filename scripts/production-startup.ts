#!/usr/bin/env tsx
/**
 * Production Startup Script
 * Validates environment and starts production monitoring
 * Requirements: 11.2
 */

import { startProductionMonitoring } from '../lib/monitoring/production';
import { prisma } from '../lib/db';

/**
 * Validate critical environment variables
 */
function validateEnvironment(): boolean {
  const required = [
    'DATABASE_URL',
    'DEEPGRAM_API_KEY',
    'OPENAI_API_KEY',
    'ENCRYPTION_KEY',
    'BETTER_AUTH_SECRET',
    'ARCJET_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    return false;
  }

  console.log('✅ All required environment variables are set');
  return true;
}

/**
 * Test database connection
 */
async function testDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Main startup function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting VoiceFlow AI Production Server...\n');

  // Validate environment
  if (!validateEnvironment()) {
    process.exit(1);
  }

  // Test database
  if (!(await testDatabase())) {
    process.exit(1);
  }

  // Start monitoring
  if (process.env.NODE_ENV === 'production') {
    console.log('📊 Starting production monitoring...');
    startProductionMonitoring();
  }

  console.log('\n✨ Production server ready!\n');
}

// Run startup
main().catch((error) => {
  console.error('❌ Startup failed:', error);
  process.exit(1);
});
