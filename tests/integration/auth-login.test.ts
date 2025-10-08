/**
 * Better Auth Login Integration Tests
 * Tests user login flow with Better Auth
 * Requirements: 11.2
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { registerUser } from '@/lib/services/auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { GDPRConsent } from '@/types/auth';

// Test data
const testEmail = `test-login-${Date.now()}@example.com`;
const testPassword = 'SecurePass123!';
const testGDPRConsent: GDPRConsent = {
  dataProcessing: true,
  voiceRecording: true,
  aiProcessing: true,
  consentedAt: new Date(),
  ipAddress: '127.0.0.1',
};

describe('Better Auth Login Integration', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user for login tests
    const result = await registerUser(
      {
        email: testEmail,
        password: testPassword,
        gdprConsent: testGDPRConsent,
      },
      '127.0.0.1'
    );
    testUserId = result.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test user and related data
    try {
      await prisma.session.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.account.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.auditLog.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.user.delete({
        where: { id: testUserId },
      });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(result.data).toBeDefined();
      expect(result.data?.user).toBeDefined();
      expect(result.data?.user.email).toBe(testEmail);
      expect(result.data?.session).toBeDefined();
      expect(result.data?.session.token).toBeDefined();
    });

    it('should create session on successful login', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(result.data?.session).toBeDefined();
      expect(result.data?.session.token).toBeDefined();
      expect(result.data?.session.expiresAt).toBeDefined();

      // Verify session exists in database
      const session = await prisma.session.findUnique({
        where: { token: result.data!.session.token },
      });

      expect(session).toBeDefined();
      expect(session?.userId).toBe(testUserId);
      expect(session?.expiresAt).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: 'nonexistent@example.com',
          password: testPassword,
        },
      });

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it('should reject login with invalid password', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: 'WrongPassword123!',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it('should handle empty email', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: '',
          password: testPassword,
        },
      });

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it('should handle empty password', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: '',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it('should return user data on successful login', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(result.data?.user).toBeDefined();
      expect(result.data?.user.id).toBe(testUserId);
      expect(result.data?.user.email).toBe(testEmail);
      expect(result.data?.user.name).toBeDefined();
      expect(result.data?.user.emailVerified).toBeDefined();
    });

    it('should create new session for each login', async () => {
      // First login
      const result1 = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const token1 = result1.data?.session.token;

      // Second login
      const result2 = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const token2 = result2.data?.session.token;

      // Tokens should be different
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);

      // Both sessions should exist in database
      const session1 = await prisma.session.findUnique({
        where: { token: token1! },
      });
      const session2 = await prisma.session.findUnique({
        where: { token: token2! },
      });

      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
    });

    it('should set session expiry to 7 days', async () => {
      const result = await auth.api.signInEmail({
        body: {
          email: testEmail,
          password: testPassword,
        },
      });

      const session = await prisma.session.findUnique({
        where: { token: result.data!.session.token },
      });

      expect(session?.expiresAt).toBeDefined();

      // Calculate expected expiry (7 days from now)
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiryTime = new Date(session!.expiresAt).getTime();

      // Allow 1 minute tolerance for test execution time
      const tolerance = 60 * 1000;
      expect(expiryTime).toBeGreaterThan(sevenDaysFromNow.getTime() - tolerance);
      expect(expiryTime).toBeLessThan(sevenDaysFromNow.getTime() + tolerance);
    });
  });
});
