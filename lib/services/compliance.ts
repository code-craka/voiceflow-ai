/**
 * GDPR Compliance Reporting Service
 * Provides compliance reporting and data breach notification
 * Requirements: 5.4, 6.4, 6.5
 */

import { prisma } from '@/lib/db';
import {
  getAuditLogStats,
  getSecurityAuditLogs,
  getDataAccessLogs,
  exportUserAuditLogs,
} from './audit';
import { exportUserData } from './gdpr';
import { monitoringService } from './monitoring';

// ============================================================================
// Types
// ============================================================================

export interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  reportType: 'user_data' | 'security' | 'data_access' | 'breach_notification';
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalUsers: number;
    totalDataRequests: number;
    totalDeletionRequests: number;
    totalSecurityEvents: number;
    totalDataAccessEvents: number;
  };
  details: any;
}

export interface DataBreachNotification {
  breachId: string;
  detectedAt: Date;
  notifiedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: string[];
  breachType: string;
  description: string;
  mitigationSteps: string[];
  status: 'detected' | 'investigating' | 'contained' | 'resolved';
}

export interface UserDataReport {
  userId: string;
  reportDate: Date;
  personalData: {
    email: string;
    createdAt: Date;
    lastLogin?: Date;
  };
  dataVolume: {
    totalNotes: number;
    totalAudioFiles: number;
    totalStorageBytes: number;
  };
  dataAccess: {
    lastAccessed: Date | null;
    accessCount: number;
  };
  consentStatus: any;
  auditTrail: any[];
}

// ============================================================================
// Compliance Reporting Functions
// ============================================================================

/**
 * Generate comprehensive compliance report
 */
export async function generateComplianceReport(
  reportType: ComplianceReport['reportType'],
  startDate: Date,
  endDate: Date
): Promise<ComplianceReport> {
  const reportId = `COMP-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  let details: any = {};
  let summary: any = {
    totalUsers: 0,
    totalDataRequests: 0,
    totalDeletionRequests: 0,
    totalSecurityEvents: 0,
    totalDataAccessEvents: 0,
  };
  
  switch (reportType) {
    case 'user_data':
      details = await generateUserDataReport(startDate, endDate);
      summary.totalUsers = details.totalUsers;
      break;
      
    case 'security':
      details = await generateSecurityReport(startDate, endDate);
      summary.totalSecurityEvents = details.totalEvents;
      break;
      
    case 'data_access':
      details = await generateDataAccessReport(startDate, endDate);
      summary.totalDataAccessEvents = details.totalEvents;
      break;
      
    case 'breach_notification':
      details = await generateBreachNotificationReport(startDate, endDate);
      break;
  }
  
  return {
    reportId,
    generatedAt: new Date(),
    reportType,
    period: { startDate, endDate },
    summary,
    details,
  };
}

/**
 * Generate user data report
 */
async function generateUserDataReport(startDate: Date, endDate: Date) {
  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
      gdprConsent: true,
      _count: {
        select: {
          notes: true,
        },
      },
    },
  });
  
  const dataRequests = await prisma.auditLog.count({
    where: {
      action: 'DATA_EXPORT_REQUESTED',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  
  const deletionRequests = await prisma.auditLog.count({
    where: {
      action: 'DATA_DELETION_REQUESTED',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  
  return {
    totalUsers: users.length,
    totalDataRequests: dataRequests,
    totalDeletionRequests: deletionRequests,
    users: users.map((user) => ({
      userId: user.id,
      email: user.email,
      registeredAt: user.createdAt,
      consentStatus: user.gdprConsent,
      totalNotes: user._count.notes,
    })),
  };
}

/**
 * Generate security report
 */
async function generateSecurityReport(startDate: Date, endDate: Date) {
  const securityLogs = await getSecurityAuditLogs({
    startDate,
    endDate,
    limit: 10000,
  });
  
  const eventsByType: Record<string, number> = {};
  const eventsByUser: Record<string, number> = {};
  const suspiciousActivities: any[] = [];
  
  for (const log of securityLogs) {
    eventsByType[log.action] = (eventsByType[log.action] || 0) + 1;
    
    if (log.userId) {
      eventsByUser[log.userId] = (eventsByUser[log.userId] || 0) + 1;
    }
    
    if (
      log.action.includes('UNAUTHORIZED') ||
      log.action.includes('FAILED') ||
      log.action.includes('SUSPICIOUS')
    ) {
      suspiciousActivities.push({
        timestamp: log.createdAt,
        action: log.action,
        userId: log.userId,
        ipAddress: log.ipAddress,
        details: log.details,
      });
    }
  }
  
  return {
    totalEvents: securityLogs.length,
    eventsByType,
    suspiciousActivities,
    topUsers: Object.entries(eventsByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, eventCount: count })),
  };
}

/**
 * Generate data access report
 */
async function generateDataAccessReport(startDate: Date, endDate: Date) {
  const accessLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          'NOTE_VIEWED',
          'NOTE_CREATED',
          'NOTE_UPDATED',
          'NOTE_DELETED',
          'AUDIO_UPLOADED',
          'AUDIO_DOWNLOADED',
          'AUDIO_DELETED',
        ],
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  
  const accessByUser: Record<string, number> = {};
  const accessByType: Record<string, number> = {};
  
  for (const log of accessLogs) {
    if (log.userId) {
      accessByUser[log.userId] = (accessByUser[log.userId] || 0) + 1;
    }
    accessByType[log.action] = (accessByType[log.action] || 0) + 1;
  }
  
  return {
    totalEvents: accessLogs.length,
    accessByType,
    topUsers: Object.entries(accessByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, accessCount: count })),
  };
}

/**
 * Generate breach notification report
 */
async function generateBreachNotificationReport(startDate: Date, endDate: Date) {
  // Query for breach-related audit logs
  const breachLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: ['DATA_BREACH_DETECTED', 'DATA_BREACH_NOTIFIED', 'SECURITY_INCIDENT'],
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  return {
    totalBreaches: breachLogs.length,
    breaches: breachLogs.map((log) => ({
      breachId: log.id,
      detectedAt: log.createdAt,
      action: log.action,
      details: log.details,
    })),
  };
}

/**
 * Generate individual user data report
 */
export async function generateUserDataReport(userId: string): Promise<UserDataReport> {
  const [user, notes, auditLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        createdAt: true,
        gdprConsent: true,
      },
    }),
    prisma.note.findMany({
      where: { userId },
      select: {
        id: true,
        duration: true,
        createdAt: true,
      },
    }),
    getDataAccessLogs(userId, { limit: 1000 }),
  ]);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const totalStorageBytes = notes.reduce((sum, note) => {
    // Estimate storage: duration in seconds * 8KB per second (64 kbps)
    return sum + (note.duration || 0) * 8 * 1024;
  }, 0);
  
  const lastAccessed = auditLogs.length > 0 ? auditLogs[0].createdAt : null;
  
  return {
    userId,
    reportDate: new Date(),
    personalData: {
      email: user.email,
      createdAt: user.createdAt,
    },
    dataVolume: {
      totalNotes: notes.length,
      totalAudioFiles: notes.length,
      totalStorageBytes,
    },
    dataAccess: {
      lastAccessed,
      accessCount: auditLogs.length,
    },
    consentStatus: user.gdprConsent,
    auditTrail: auditLogs.slice(0, 100), // Last 100 events
  };
}

// ============================================================================
// Data Breach Notification
// ============================================================================

/**
 * Create data breach notification
 */
export async function createDataBreachNotification(
  breach: Omit<DataBreachNotification, 'breachId' | 'notifiedAt'>
): Promise<DataBreachNotification> {
  const breachId = `BREACH-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  const notification: DataBreachNotification = {
    ...breach,
    breachId,
    notifiedAt: new Date(),
  };
  
  // Log the breach
  await prisma.auditLog.create({
    data: {
      action: 'DATA_BREACH_DETECTED',
      resourceType: 'security',
      resourceId: breachId,
      details: {
        severity: breach.severity,
        affectedUserCount: breach.affectedUsers.length,
        breachType: breach.breachType,
        description: breach.description,
      },
    },
  });
  
  // Log security event
  monitoringService.logSecurityEvent({
    type: 'DATA_BREACH',
    severity: breach.severity === 'critical' ? 'critical' : 'high',
    description: breach.description,
    metadata: {
      breachId,
      affectedUserCount: breach.affectedUsers.length,
      breachType: breach.breachType,
    },
  });
  
  // Notify affected users (in production, send emails)
  await notifyAffectedUsers(notification);
  
  return notification;
}

/**
 * Notify affected users of data breach
 */
async function notifyAffectedUsers(breach: DataBreachNotification): Promise<void> {
  // In production, this would send emails to affected users
  // For now, create audit logs for each user
  
  const notifications = breach.affectedUsers.map((userId) => ({
    userId,
    action: 'DATA_BREACH_NOTIFIED',
    resourceType: 'security',
    resourceId: breach.breachId,
    details: {
      breachId: breach.breachId,
      severity: breach.severity,
      breachType: breach.breachType,
      notifiedAt: breach.notifiedAt,
    },
  }));
  
  await prisma.auditLog.createMany({
    data: notifications,
  });
  
  console.log(`Notified ${breach.affectedUsers.length} users of data breach ${breach.breachId}`);
}

/**
 * Get data breach notifications
 */
export async function getDataBreachNotifications(
  options?: {
    startDate?: Date;
    endDate?: Date;
    severity?: DataBreachNotification['severity'];
    status?: DataBreachNotification['status'];
  }
): Promise<any[]> {
  const where: any = {
    action: { in: ['DATA_BREACH_DETECTED', 'DATA_BREACH_NOTIFIED'] },
  };
  
  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }
  
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  
  return logs.map((log) => ({
    breachId: log.resourceId,
    detectedAt: log.createdAt,
    action: log.action,
    details: log.details,
  }));
}

// ============================================================================
// Compliance Dashboard
// ============================================================================

/**
 * Get compliance dashboard data
 */
export async function getComplianceDashboard(
  startDate: Date,
  endDate: Date
) {
  const [
    auditStats,
    securityReport,
    dataAccessReport,
    breachNotifications,
  ] = await Promise.all([
    getAuditLogStats({ startDate, endDate }),
    generateSecurityReport(startDate, endDate),
    generateDataAccessReport(startDate, endDate),
    getDataBreachNotifications({ startDate, endDate }),
  ]);
  
  return {
    period: { startDate, endDate },
    generatedAt: new Date(),
    overview: {
      totalAuditLogs: auditStats.totalLogs,
      securityEvents: auditStats.securityEvents,
      dataAccessEvents: auditStats.dataAccessEvents,
      breachNotifications: breachNotifications.length,
    },
    security: {
      totalEvents: securityReport.totalEvents,
      suspiciousActivities: securityReport.suspiciousActivities.length,
      topEventTypes: Object.entries(securityReport.eventsByType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    },
    dataAccess: {
      totalEvents: dataAccessReport.totalEvents,
      topAccessTypes: Object.entries(dataAccessReport.accessByType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    },
    breaches: breachNotifications,
  };
}
