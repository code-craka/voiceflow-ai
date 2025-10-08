/**
 * GDPR Compliance Service
 * Handles data export, deletion, and consent management
 * Requirements: 6.1, 6.2, 6.3
 */

import { prisma } from '@/lib/db';
import { createAuditLog } from './audit';
import type { GDPRConsent } from '@/types/auth';

export interface DataExportResult {
  user: any;
  notes: any[];
  folders: any[];
  tags: any[];
  auditLogs: any[];
  exportedAt: Date;
}

/**
 * Export all user data in structured format
 */
export async function exportUserData(userId: string): Promise<DataExportResult> {
  const [user, notes, folders, tags, auditLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        gdprConsent: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.note.findMany({
      where: { userId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    }),
    prisma.folder.findMany({
      where: { userId },
    }),
    prisma.tag.findMany({
      where: { userId },
    }),
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (!user) {
    throw new Error('User not found');
  }

  await createAuditLog({
    userId,
    action: 'DATA_EXPORT_REQUESTED',
    resourceType: 'user',
    resourceId: userId,
  });

  return {
    user,
    notes,
    folders,
    tags,
    auditLogs,
    exportedAt: new Date(),
  };
}

/**
 * Delete all user data permanently
 */
export async function deleteUserData(
  userId: string,
  ipAddress?: string
): Promise<void> {
  // Create audit log before deletion
  await createAuditLog({
    userId,
    action: 'DATA_DELETION_REQUESTED',
    resourceType: 'user',
    resourceId: userId,
    ipAddress: ipAddress || undefined,
  });

  // Delete user (cascading deletes will handle related data)
  await prisma.user.delete({
    where: { id: userId },
  });

  // Create final audit log (without userId since user is deleted)
  await createAuditLog({
    action: 'DATA_DELETION_COMPLETED',
    resourceType: 'user',
    resourceId: userId,
    details: {
      deletedAt: new Date(),
      deletedUserId: userId,
    },
    ipAddress: ipAddress || undefined,
  });
}

/**
 * Update user's GDPR consent preferences
 */
export async function updateUserConsent(
  userId: string,
  consent: Omit<GDPRConsent, 'consentedAt'>,
  ipAddress?: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      gdprConsent: {
        ...consent,
        consentedAt: new Date(),
        ipAddress,
      },
    },
  });

  await createAuditLog({
    userId,
    action: 'GDPR_CONSENT_UPDATED',
    resourceType: 'user',
    resourceId: userId,
    details: { consent },
    ipAddress: ipAddress || undefined,
  });
}

/**
 * Get user's current GDPR consent status
 */
export async function getUserConsent(userId: string): Promise<GDPRConsent | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gdprConsent: true },
  });

  return user?.gdprConsent as GDPRConsent | null;
}
