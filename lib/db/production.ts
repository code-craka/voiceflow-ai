/**
 * Production Database Configuration
 * Optimized connection pooling and error handling for production
 * Requirements: 7.4, 11.2
 */

import { PrismaClient } from '@prisma/client';

// Production database configuration
const productionConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log:
    process.env.NODE_ENV === 'production'
      ? (['error', 'warn'] as const)
      : (['query', 'error', 'warn'] as const),
};

// Connection pool configuration
const poolConfig = {
  pool: {
    min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(
      process.env.DATABASE_POOL_IDLE_TIMEOUT || '30000',
      10
    ),
    connectionTimeoutMillis: parseInt(
      process.env.DATABASE_POOL_CONNECTION_TIMEOUT || '20000',
      10
    ),
  },
};

/**
 * Create Prisma client with production optimizations
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient(productionConfig);

  // Add connection lifecycle logging
  client.$on('beforeExit' as never, async () => {
    console.log('Prisma client disconnecting...');
  });

  return client;
}

// Singleton pattern for production
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prismaProduction =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaProduction;
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    await prismaProduction.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';

    return {
      healthy: false,
      latency,
      error: message,
    };
  }
}

/**
 * Get connection pool statistics
 */
export async function getPoolStats(): Promise<{
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
}> {
  try {
    // Query PostgreSQL for connection stats
    const result = await prismaProduction.$queryRaw<
      Array<{ count: bigint; state: string }>
    >`
      SELECT state, COUNT(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `;

    const active =
      result.find((r) => r.state === 'active')?.count || BigInt(0);
    const idle = result.find((r) => r.state === 'idle')?.count || BigInt(0);

    return {
      activeConnections: Number(active),
      idleConnections: Number(idle),
      totalConnections: Number(active) + Number(idle),
    };
  } catch (error) {
    console.error('Failed to get pool stats:', error);
    return {
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
    };
  }
}

/**
 * Graceful shutdown handler
 */
export async function gracefulShutdown(): Promise<void> {
  console.log('Initiating graceful database shutdown...');

  try {
    await prismaProduction.$disconnect();
    console.log('Database connections closed successfully');
  } catch (error) {
    console.error('Error during database shutdown:', error);
    throw error;
  }
}

/**
 * Monitor connection pool and alert on issues
 */
export async function monitorConnectionPool(): Promise<void> {
  const stats = await getPoolStats();
  const maxConnections = parseInt(process.env.DATABASE_POOL_MAX || '10', 10);

  // Alert if we're using > 80% of max connections
  if (stats.totalConnections > maxConnections * 0.8) {
    console.warn(
      `⚠️  High database connection usage: ${stats.totalConnections}/${maxConnections}`
    );
  }

  // Alert if too many idle connections
  if (stats.idleConnections > maxConnections * 0.5) {
    console.warn(
      `⚠️  High idle connection count: ${stats.idleConnections}/${stats.totalConnections}`
    );
  }
}

// Set up periodic monitoring in production
if (process.env.NODE_ENV === 'production') {
  // Monitor every 5 minutes
  setInterval(monitorConnectionPool, 5 * 60 * 1000);

  // Set up graceful shutdown handlers
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await gracefulShutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await gracefulShutdown();
    process.exit(0);
  });
}
