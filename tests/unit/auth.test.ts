/**
 * Authentication Service Unit Tests
 * Tests user registration, login, and encryption key management
 * Requirements: 6.1, 6.2, 6.3
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { registerUser, updateGDPRConsent, AuthenticationError } from '@/lib/services/auth';
import {
  generateEncryptionKey,
  hashEncryptionKey,
  verifyEncryptionKey,
} from '@/lib/services/encryption';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import type { UserRegistrationRequest, GDPRConsent } from '@/types/auth';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      signUpEmail: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn(),
}));

describe('Authentication Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerUser', () => {
    const mockRegistrationRequest: UserRegistrationRequest = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      gdprConsent: {
        dataProcessing: true,
        voiceRecording: true,
        aiProcessing: true,
        consentedAt: new Date(),
      },
    };

    it('should successfully register a new user with encryption key', async () => {
      // Arrange
      const mockUserId = 'user-123';
      const mockUser = {
        id: mockUserId,
        email: mockRegistrationRequest.email,
        name: 'test',
        emailVerified: false,
        image: null,
        encryptionKeyHash: 'hashed-key',
        gdprConsent: mockRegistrationRequest.gdprConsent,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(auth.api.signUpEmail).mockResolvedValue({
        data: {
          user: {
            id: mockUserId,
            email: mockRegistrationRequest.email,
            name: 'test',
            emailVerified: false,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          session: {
            id: 'session-123',
            userId: mockUserId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            token: 'session-token',
            createdAt: new Date(),
            updatedAt: new Date(),
            ipAddress: null,
            userAgent: null,
          },
        },
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

      // Act
      const result = await registerUser(mockRegistrationRequest, '127.0.0.1');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockUserId);
      expect(result.email).toBe(mockRegistrationRequest.email);
      expect(result.encryptionKey).toBeDefined();
      expect(typeof result.encryptionKey).toBe('string');
      expect(result.encryptionKeyHash).toBeDefined();

      // Verify Better Auth was called correctly
      expect(auth.api.signUpEmail).toHaveBeenCalledWith({
        body: {
          email: mockRegistrationRequest.email,
          password: mockRegistrationRequest.password,
          name: 'test',
        },
      });

      // Verify user was updated with custom fields
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          encryptionKeyHash: expect.any(String),
          gdprConsent: expect.objectContaining({
            dataProcessing: true,
            voiceRecording: true,
            aiProcessing: true,
            consentedAt: expect.any(Date),
            ipAddress: '127.0.0.1',
          }),
        }),
      });
    });

    it('should throw error when Better Auth fails to create user', async () => {
      // Arrange
      vi.mocked(auth.api.signUpEmail).mockResolvedValue({
        data: null,
      } as any);

      // Act & Assert
      await expect(
        registerUser(mockRegistrationRequest, '127.0.0.1')
      ).rejects.toThrow(AuthenticationError);

      await expect(
        registerUser(mockRegistrationRequest, '127.0.0.1')
      ).rejects.toThrow('Failed to create user');
    });

    it('should include IP address in GDPR consent when provided', async () => {
      // Arrange
      const mockUserId = 'user-123';
      const ipAddress = '192.168.1.1';

      vi.mocked(auth.api.signUpEmail).mockResolvedValue({
        data: {
          user: {
            id: mockUserId,
            email: mockRegistrationRequest.email,
            name: 'test',
            emailVerified: false,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          session: {} as any,
        },
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: mockUserId,
        email: mockRegistrationRequest.email,
        name: 'test',
        emailVerified: false,
        image: null,
        encryptionKeyHash: 'hashed-key',
        gdprConsent: mockRegistrationRequest.gdprConsent,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Act
      await registerUser(mockRegistrationRequest, ipAddress);

      // Assert
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: expect.objectContaining({
          gdprConsent: expect.objectContaining({
            ipAddress,
          }),
        }),
      });
    });
  });

  describe('updateGDPRConsent', () => {
    const userId = 'user-123';
    const mockConsent: GDPRConsent = {
      dataProcessing: true,
      voiceRecording: false,
      aiProcessing: true,
      consentedAt: new Date(),
    };

    it('should successfully update GDPR consent', async () => {
      // Arrange
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      // Act
      await updateGDPRConsent(userId, mockConsent, '127.0.0.1');

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

    it('should update consent without IP address when not provided', async () => {
      // Arrange
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);

      // Act
      await updateGDPRConsent(userId, mockConsent);

      // Assert
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          gdprConsent: expect.objectContaining({
            dataProcessing: true,
            voiceRecording: false,
            aiProcessing: true,
          }),
        },
      });
    });
  });
});
