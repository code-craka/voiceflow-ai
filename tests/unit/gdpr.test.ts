/**
 * GDPR Compliance Service Unit Tests
 * Tests data export, deletion, and consent management
 * Requirements: 6.1, 6.2, 6.3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  exportUserData,
  deleteUserData,
  updateUserConsent,
  getUserConsent,
} from '@/lib/services/gdpr';
import { prisma } from '@/lib/db';
import type { GDPRConsent } from '@/types/auth';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    note: {
      findMany: vi.fn(),
    },
    folder: {
      findMany: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn(),
}));

describe('GDPR Compliance Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportUserData', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      gdprConsent: {
        dataProcessing: true,
        voiceRecording: true,
        aiProcessing: true,
        consentedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockNotes = [
      {
        id: 'note-1',
        userId,
        title: 'Test Note 1',
        transcription: 'Test transcription',
        summary: 'Test summary',
        tags: [],
      },
    ];

    const mockFolders = [
      {
        id: 'folder-1',
        userId,
        name: 'Test Folder',
      },
    ];

    const mockTags = [
      {
        id: 'tag-1',
        userId,
        name: 'test-tag',
      },
    ];

    const mockAuditLogs = [
      {
        id: 'log-1',
        userId,
        action: 'USER_REGISTERED',
        resourceType: 'user',
        createdAt: new Date(),
      },
    ];

    it('should export all user data successfully', async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue(mockNotes as any);
      vi.mocked(prisma.folder.findMany).mockResolvedValue(mockFolders as any);
      vi.mocked(prisma.tag.findMany).mockResolvedValue(mockTags as any);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockAuditLogs as any);

      // Act
      const result = await exportUserData(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.user).toEqual(mockUser);
      expect(result.notes).toEqual(mockNotes);
      expect(result.folders).toEqual(mockFolders);
      expect(result.tags).toEqual(mockTags);
      expect(result.auditLogs).toEqual(mockAuditLogs);
      expect(result.exportedAt).toBeInstanceOf(Date);

      // Verify all data was queried
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          gdprConsent: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(prisma.note.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      });

      expect(prisma.folder.findMany).toHaveBeenCalledWith({
        where: { userId },
      });

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: { userId },
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw error when user not found', async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.folder.findMany).mockResolvedValue([]);
      vi.mocked(prisma.tag.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      // Act & Assert
      await expect(exportUserData(userId)).rejects.toThrow('User not found');
    });

    it('should handle user with no data', async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.folder.findMany).mockResolvedValue([]);
      vi.mocked(prisma.tag.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      // Act
      const result = await exportUserData(userId);

      // Assert
      expect(result.user).toEqual(mockUser);
      expect(result.notes).toEqual([]);
      expect(result.folders).toEqual([]);
      expect(result.tags).toEqual([]);
      expect(result.auditLogs).toEqual([]);
    });

    it('should include export timestamp', async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.note.findMany).mockResolvedValue([]);
      vi.mocked(prisma.folder.findMany).mockResolvedValue([]);
      vi.mocked(prisma.tag.findMany).mockResolvedValue([]);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

      const beforeExport = new Date();

      // Act
      const result = await exportUserData(userId);

      const afterExport = new Date();

      // Assert
      expect(result.exportedAt).toBeInstanceOf(Date);
      expect(result.exportedAt.getTime()).toBeGreaterThanOrEqual(beforeExport.getTime());
      expect(result.exportedAt.getTime()).toBeLessThanOrEqual(afterExport.getTime());
    });
  });

  describe('deleteUserData', () => {
    const userId = 'user-123';
    const ipAddress = '127.0.0.1';

    it('should delete user data successfully', async () => {
      // Arrange
      vi.mocked(prisma.user.delete).mockResolvedValue({} as any);

      // Act
      await deleteUserData(userId, ipAddress);

      // Assert
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should delete user data without IP address', async () => {
      // Arrange
      vi.mocked(prisma.user.delete).mockResolvedValue({} as any);

      // Act
      await deleteUserData(userId);

      // Assert
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should handle deletion errors', async () => {
      // Arrange
      const error = new Error('Database error');
      vi.mocked(prisma.user.delete).mockRejectedValue(error);

      // Act & Assert
      await expect(deleteUserData(userId, ipAddress)).rejects.toThrow('Database error');
    });
  });

  describe('updateUserConsent', () => {
    const userId = 'user-123';
    const mockConsent: Omit<GDPRConsent, 'consentedAt'> = {
      dataProcessing: true,
      voiceRecording: false,
      aiProcessing: true,
    };

    it('should update user consent successfully', async () => {
      // Arrange
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      // Act
      await updateUserConsent(userId, mockConsent, '127.0.0.1');

      // Assert
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          gdprConsent: expect.objectContaining({
            dataProcessing: true,
            voiceRecording: false,
            aiProcessing: true,
            consentedAt: expect.any(Date),
            ipAddress: '127.0.0.1',
          }),
        },
      });
    });

    it('should update consent without IP address', async () => {
      // Arrange
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      // Act
      await updateUserConsent(userId, mockConsent);

      // Assert
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          gdprConsent: expect.objectContaining({
            dataProcessing: true,
            voiceRecording: false,
            aiProcessing: true,
            consentedAt: expect.any(Date),
          }),
        },
      });
    });

    it('should handle partial consent updates', async () => {
      // Arrange
      const partialConsent: Omit<GDPRConsent, 'consentedAt'> = {
        dataProcessing: false,
        voiceRecording: false,
        aiProcessing: false,
      };
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      // Act
      await updateUserConsent(userId, partialConsent);

      // Assert
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          gdprConsent: expect.objectContaining({
            dataProcessing: false,
            voiceRecording: false,
            aiProcessing: false,
          }),
        },
      });
    });

    it('should add timestamp to consent', async () => {
      // Arrange
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
      const beforeUpdate = new Date();

      // Act
      await updateUserConsent(userId, mockConsent);

      const afterUpdate = new Date();

      // Assert
      const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0];
      const consentedAt = (updateCall.data as any).gdprConsent.consentedAt;
      
      expect(consentedAt).toBeInstanceOf(Date);
      expect(consentedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(consentedAt.getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });
  });

  describe('getUserConsent', () => {
    const userId = 'user-123';
    const mockConsent: GDPRConsent = {
      dataProcessing: true,
      voiceRecording: true,
      aiProcessing: true,
      consentedAt: new Date(),
    };

    it('should retrieve user consent successfully', async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        gdprConsent: mockConsent,
      } as any);

      // Act
      const result = await getUserConsent(userId);

      // Assert
      expect(result).toEqual(mockConsent);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { gdprConsent: true },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Act
      const result = await getUserConsent(userId);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return null when user has no consent', async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        gdprConsent: null,
      } as any);

      // Act
      const result = await getUserConsent(userId);

      // Assert
      expect(result).toBeNull();
    });
  });
});
