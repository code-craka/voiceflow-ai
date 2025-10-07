/**
 * Audit Logging Service
 * Handles GDPR-compliant audit trail for all user actions
 * Requirements: 5.4, 6.4, 6.5
 */

import { prisma } from '@/lib/db';

export interface AuditLogEntry {
  userId?: string | undefined;
  action: string;
  resourceType: string;
  resourceId?: string | undefined;
  details?: any;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  const data: any = {
    action: entry.action,
    resourceType: entry.resourceType,
  };
  
  if (entry.userId) data.userId = entry.userId;
  if (entry.resourceId) data.resourceId = entry.resourceId;
  if (entry.details) data.details = entry.details;
  if (entry.ipAddress) data.ipAddress = entry.ipAddress;
  if (entry.userAgent) data.userAgent = entry.userAgent;
  
  await prisma.auditLog.create({ data });
}

/**
 * Get audit logs for a user
 */
export async function getUserAuditLogs(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }
) {
  return prisma.auditLog.findMany({
    where: {
      userId,
      ...(options?.startDate && {
        createdAt: { gte: options.startDate },
      }),
      ...(options?.endDate && {
        createdAt: { lte: options.endDate },
      }),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
    skip: options?.offset || 0,
  });
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string
) {
  return prisma.auditLog.findMany({
    where: {
      resourceType,
      resourceId,
    },
    orderBy: { createdAt: 'desc' },
  });
}
