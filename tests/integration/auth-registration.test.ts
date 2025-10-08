/**
 * Better Auth Registration Integration Tests
 * Tests user registration flow with Better Auth
 * Requirements: 11.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerUser } from '@/lib/services/auth';
import { prisma } from '@/lib/db';
import type { GDPRConsent } from '@/types/auth';

// Test data
const testEmail = `test-${Date.now()}@example.com`;
const testPassword = 'SecurePass123!';
const testGDPRConsent: GDPRConsent = {
  dataProcessing: true,
  voiceRecording: true,
  aiProcessing: true,
  consentedAt: new Date(),
  ipAddress: '127.0.0.1',
};

describe('Better Auth Registration Integration', () => {
  let createdUserId: string | null = null;

  afterEach(async () => {
    // Cleanup: Delete test user and related data
    if (createdUserId) {
      try {
        // Delete related records first (due to foreign key constraints)
        await prisma.session.deleteMany({
          where: { userId: createdUserId },
        });
        await prisma.account.deleteMany({
          where: { userId: createdUserId },
        });
        await prisma.auditLog.deleteMany({
          where: { userId: createdUserId },
        });
        await prisma.user.delete({
          where: { id: createdUserId },
        });
      } catch (error) {
        console.error('Cleanup error:', error);
      }
      createdUserId = null;
    }
  });

  describe('User Registration', () => {
    it('should register a new user with email and password', async () => {
      const result = await registerUser(
        {
          email: testEmail,
          password: testPassword,
          gdprConsent: testGDPRConsent,
        },
        '127.0.0.1'
      );

      createdUserId = result.id;

      // Verify user object structure
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.email).toBe(testEmail);
      expect(result.name).toBeDefined();
      expect(result.encryptionKey).toBeDefined();
      expect(typeof result.encryptionKey).toBe('string');
      expect(result.encryptionKey.length).toBeGreaterThan(0);
    });

    it('should create user in database', async () => {
      const result = await registerUser(
        {
          email: `test-db-${Date.now()}@example.com`,
          password: testPassword,
          gdprConsent: testGDPRConsent,
        },
        '127.0.0.1'
      );

      createdUserId = result.id;

      // Verify user exists in database
      const user = await prisma.user.findUnique({
        where: { id: result.id },
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe(result.email);
      expect(user?.name).toBeDefined();
      expect(user?.emailVerified).toBe(false);
    });

    it('should generate and store encryption key hash', async () => {
      const result = await registerUser(
        {
          email: `test-encryption-${Date.now()}@example.com`,
          password: testPassword,
          gdprConsent: testGDPRConsent,
        },
        '127.0.0.1'
      );

      createdUserId = result.id;

      // Verify encryption key is returned
      expect(result.encryptionKey).toBeDefined();
      expect(typeof result.encryptionKey).toBe('string');

      // Verify encryption key hash is stored in database
      const user = await prisma.user.findUnique({
        where: { id: result.id },
      });

      expect(user?.encryptionKeyHash).toBeDefined();
      expect(user?.encryptionKeyHash).not.toBe(result.encryptionKey);
      expect(user?.encryptionKeyHash.length).toBeGreaterThan(0);
    });

    it('should store GDPR consent', async () => {
      const result = await registerUser(
        {
          email: `test-gdpr-${Date.now()}@example.com`,
          password: testPassword,
          gdprConsent: testGDPRConsent,
        },
        '127.0.0.1'
      );

      createdUserId = result.id;

      // Verify GDPR consent is stored
      const user = await prisma.user.findUnique({
        where: { id: result.id },
      });

      expect(user?.gdprConsent).toBeDefined();
      const consent = user?.gdprConsent as any;
      expect(consent.dataProcessing).toBe(true);
      expect(consent.voiceRecording).toBe(true);
      expect(consent.aiProcessing).toBe(true);
      expect(consent.consentedAt).toBeDefined();
      expect(consent.ipAddress).toBe('127.0.0.1');
    });

    it('should create audit log entry', async () => {
      const result = await registerUser(
        {
          email: `test-audit-${Date.now()}@example.com`,
          password: testPassword,
          gdprConsent: testGDPRConsent,
        },
        '127.0.0.1'
      );

      createdUserId = result.id;

      // Verify audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: result.id,
          action: 'USER_REGISTERED',
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.resourceType).toBe('user');
      expect(auditLog?.resourceId).toBe(result.id);
      expect(auditLog?.ipAddress).toBe('127.0.0.1');
    });

    it('should create Better Auth account with password', async () => {
      const result = await registerUser(
        {
          email: `test-account-${Date.now()}@example.com`,
          password: testPassword,
          gdprConsent: testGDPRConsent,
        },
        '127.0.0.1'
      );

      createdUserId = result.id;

      // Verify Better Auth account was created
      const account = await prisma.account.findFirst({
        where: {
          userId: result.id,
          providerId: 'credential',
        },
      });

      expect(account).toBeDefined();
      expect(account?.password).toBeDefined();
      expect(account?.password).not.toBe(testPassword); // Should be hashed
    });

    it('should reject duplicate email registration', async () => {
      const email = `test-duplicate-${Date.now()}@example.com`;

      // First registration
      const result1 = await registerUser(
        {
          email,
          password: testPassword,
          gdprConsent: testGDPRConsent,
        },
        '127.0.0.1'
      );

      createdUserId = result1.id;

      // Second registration with same email should fail
      await expect(
        registerUser(
          {
            email,
            password: 'DifferentPass123!',
            gdprConsent: testGDPRConsent,
          },
          '127.0.0.1'
        )
      ).rejects.toThrow();
    });

    it('should reject weak passwords', async () => {
      await expect(
        registerUser(
          {
            email: `test-weak-${Date.now()}@example.com`,
            password: 'weak', // Too short
            gdprConsent: testGDPRConsent,
          },
          '127.0.0.1'
        )
      ).rejects.toThrow();
    });
  });
});
