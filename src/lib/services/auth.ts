/**
 * Authentication Service
 * Handles user registration, login, and session management
 * Requirements: 5.3, 6.1
 */

import { prisma } from '@/lib/db';
import {
    generateEncryptionKey,
    hashEncryptionKey,
    hashPassword,
    verifyPassword,
} from './encryption';
import type {
    UserRegistrationRequest,
    UserLoginRequest,
    UserWithEncryptionKey,
    GDPRConsent,
} from '@/types/auth';
import { createAuditLog } from './audit';

export class AuthenticationError extends Error {
    constructor(
        message: string,
        public code: string
    ) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

/**
 * Register a new user with encryption key generation
 */
export async function registerUser(
    request: UserRegistrationRequest,
    ipAddress?: string
): Promise<UserWithEncryptionKey> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: request.email },
    });

    if (existingUser) {
        throw new AuthenticationError('User already exists', 'USER_EXISTS');
    }

    // Generate encryption key for user
    const encryptionKey = generateEncryptionKey();
    const encryptionKeyHash = hashEncryptionKey(encryptionKey);

    // Hash password
    const passwordHash = await hashPassword(request.password);

    // Create user with GDPR consent
    const user = await prisma.user.create({
        data: {
            email: request.email,
            passwordHash,
            encryptionKeyHash,
            gdprConsent: {
                ...request.gdprConsent,
                consentedAt: new Date(),
                ipAddress,
            },
        },
    });

    // Create audit log
    await createAuditLog({
        userId: user.id,
        action: 'USER_REGISTERED',
        resourceType: 'user',
        resourceId: user.id,
        details: {
            email: user.email,
            gdprConsent: request.gdprConsent,
        },
        ipAddress: ipAddress || undefined,
    });

    return {
        id: user.id,
        email: user.email,
        encryptionKeyHash: user.encryptionKeyHash,
        gdprConsent: user.gdprConsent as unknown as GDPRConsent,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        encryptionKey,
    };
}

/**
 * Authenticate user and return session
 */
export async function loginUser(
    request: UserLoginRequest,
    ipAddress?: string
): Promise<UserWithEncryptionKey> {
    const user = await prisma.user.findUnique({
        where: { email: request.email },
    });

    if (!user) {
        throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await verifyPassword(request.password, user.passwordHash);
    if (!isValidPassword) {
        throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    await createAuditLog({
        userId: user.id,
        action: 'USER_LOGIN',
        resourceType: 'user',
        resourceId: user.id,
        details: { email: user.email },
        ipAddress: ipAddress || undefined,
    });

    // Derive encryption key from password (simplified - in production use KDF)
    const encryptionKey = generateEncryptionKey();

    return {
        id: user.id,
        email: user.email,
        encryptionKeyHash: user.encryptionKeyHash,
        gdprConsent: user.gdprConsent as unknown as GDPRConsent,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        encryptionKey,
    };
}

/**
 * Update user's GDPR consent
 */
export async function updateGDPRConsent(
    userId: string,
    consent: GDPRConsent,
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
