/**
 * Authentication Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerUser, AuthenticationError } from '../auth';
import { prisma } from '@/lib/db';

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe('Authentication Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user with encryption key', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        encryptionKeyHash: 'hashed-key',
        gdprConsent: {
          dataProcessing: true,
          voiceRecording: true,
          aiProcessing: true,
          consentedAt: new Date(),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

      const result = await registerUser({
        email: 'test@example.com',
        password: 'Test123!',
        gdprConsent: {
          dataProcessing: true,
          voiceRecording: true,
          aiProcessing: true,
          consentedAt: new Date(),
        },
      });

      expect(result.email).toBe('test@example.com');
      expect(result.encryptionKey).toBeDefined();
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      } as any);

      await expect(
        registerUser({
          email: 'test@example.com',
          password: 'Test123!',
          gdprConsent: {
            dataProcessing: true,
            voiceRecording: true,
            aiProcessing: true,
            consentedAt: new Date(),
          },
        })
      ).rejects.toThrow(AuthenticationError);
    });
  });
});
