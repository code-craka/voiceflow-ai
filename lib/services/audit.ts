/**
 * Audit Logging Service
 * Handles GDPR-compliant audit trail for all user actions
 * Requirements: 5.4, 6.4, 6.5
 */

import { prisma } from '@/lib/db';
import { monitoringService } from './monitoring';

export interface AuditLogEntry {
  userId?: string | undefined;
  action: string;
  resourceType: string;
  resourceId?: string | undefined;
  details?: any;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface AuditLogQuery {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  actionBreakdown: Record<string, number>;
  resourceTypeBreakdown: Record<string, number>;
  securityEvents: number;
  dataAccessEvents: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

// Security-relevant actions that require special monitoring
const SECURITY_ACTIONS = [
  'USER_REGISTERED',
  'USER_LOGIN',
  'USER_LOGIN_FAILED',
  'USER_LOGOUT',
  'USER_DELETED',
  'DATA_EXPORTED',
  'DATA_DELETED',
  'ENCRYPTION_KEY_ACCESSED',
  'ENCRYPTION_KEY_GENERATED',
  'UNAUTHORIZED_ACCESS_ATTEMPT',
  'PASSWORD_CHANGED',
  'EMAIL_CHANGED',
  'GDPR_CONSENT_UPDATED',
  'GDPR_CONSENT_WITHDRAWN',
  'SUSPICIOUS_ACTIVITY_DETECTED',
] as const;

// Data access actions for GDPR compliance
const DATA_ACCESS_ACTIONS = [
  'NOTE_VIEWED',
  'NOTE_CREATED',
  'NOTE_UPDATED',
  'NOTE_DELETED',
  'AUDIO_UPLOADED',
  'AUDIO_DOWNLOADED',
  'AUDIO_DELETED',
  'TRANSCRIPTION_ACCESSED',
  'DATA_EXPORTED',
] as const;

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

  // Log security-relevant actions
  if (SECURITY_ACTIONS.includes(entry.action as any)) {
    const severity = entry.action.includes('UNAUTHORIZED') || entry.action.includes('FAILED')
      ? 'high'
      : entry.action.includes('DELETED')
      ? 'medium'
      : 'low';
    
    monitoringService.logSecurityEvent({
      type: entry.action,
      severity,
      description: `User action: ${entry.action}`,
      userId: entry.userId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: entry.details,
    });
  }
}

/**
 * Create multiple audit log entries in batch
 */
export async function createAuditLogBatch(entries: AuditLogEntry[]): Promise<void> {
  const data = entries.map((entry) => ({
    userId: entry.userId,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    details: entry.details,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
  }));
  
  await prisma.auditLog.createMany({ data });
}

/**
 * Get audit logs with flexible filtering
 */
export async function getAuditLogs(query: AuditLogQuery) {
  const where: any = {};
  
  if (query.userId) where.userId = query.userId;
  if (query.action) where.action = query.action;
  if (query.resourceType) where.resourceType = query.resourceType;
  if (query.resourceId) where.resourceId = query.resourceId;
  
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = query.startDate;
    if (query.endDate) where.createdAt.lte = query.endDate;
  }
  
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: query.limit || 100,
    skip: query.offset || 0,
  });
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
  return getAuditLogs({
    userId,
    ...options,
  });
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceType: string,
  resourceId: string
) {
  return getAuditLogs({
    resourceType,
    resourceId,
  });
}

/**
 * Get security-related audit logs
 */
export async function getSecurityAuditLogs(
  options?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = {
    action: { in: SECURITY_ACTIONS },
  };
  
  if (options?.userId) where.userId = options.userId;
  
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }
  
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
    skip: options?.offset || 0,
  });
}

/**
 * Get data access audit logs for GDPR compliance
 */
export async function getDataAccessLogs(
  userId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = {
    userId,
    action: { in: DATA_ACCESS_ACTIONS },
  };
  
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }
  
  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
    skip: options?.offset || 0,
  });
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(
  options?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<AuditLogStats> {
  const where: any = {};
  
  if (options?.userId) where.userId = options.userId;
  
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options?.startDate) where.createdAt.gte = options.startDate;
    if (options?.endDate) where.createdAt.lte = options.endDate;
  }
  
  const [totalLogs, logs, dateRange] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      select: {
        action: true,
        resourceType: true,
      },
    }),
    prisma.auditLog.aggregate({
      where,
      _min: { createdAt: true },
      _max: { createdAt: true },
    }),
  ]);
  
  // Calculate breakdowns
  const actionBreakdown: Record<string, number> = {};
  const resourceTypeBreakdown: Record<string, number> = {};
  let securityEvents = 0;
  let dataAccessEvents = 0;
  
  for (const log of logs) {
    actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
    resourceTypeBreakdown[log.resourceType] = (resourceTypeBreakdown[log.resourceType] || 0) + 1;
    
    if (SECURITY_ACTIONS.includes(log.action as any)) {
      securityEvents++;
    }
    
    if (DATA_ACCESS_ACTIONS.includes(log.action as any)) {
      dataAccessEvents++;
    }
  }
  
  return {
    totalLogs,
    actionBreakdown,
    resourceTypeBreakdown,
    securityEvents,
    dataAccessEvents,
    dateRange: {
      earliest: dateRange._min.createdAt,
      latest: dateRange._max.createdAt,
    },
  };
}

/**
 * Delete old audit logs (for data retention policy)
 */
export async function deleteOldAuditLogs(olderThan: Date): Promise<number> {
  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: olderThan },
    },
  });
  
  return result.count;
}

/**
 * Export audit logs for a user (GDPR compliance)
 */
export async function exportUserAuditLogs(userId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  
  return {
    userId,
    exportedAt: new Date(),
    totalLogs: logs.length,
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      details: log.details,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.createdAt,
    })),
  };
}
