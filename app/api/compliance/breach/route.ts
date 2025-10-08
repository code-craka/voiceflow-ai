/**
 * Data Breach Notification API
 * Create and manage data breach notifications
 * Requirements: 5.4, 6.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajSensitive, handleArcjetDecision } from '@/lib/arcjet';
import {
  createDataBreachNotification,
  getDataBreachNotifications,
} from '@/lib/services/compliance';
import { createAuditLog } from '@/lib/services/audit';
import { z } from 'zod';

const breachNotificationSchema = z.object({
  detectedAt: z.string().datetime(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  affectedUsers: z.array(z.string().uuid()),
  breachType: z.string().min(1).max(255),
  description: z.string().min(1).max(2000),
  mitigationSteps: z.array(z.string()),
  status: z.enum(['detected', 'investigating', 'contained', 'resolved']),
});

export async function POST(request: NextRequest) {
  // 1. Arcjet protection (sensitive operation)
  const decision = await ajSensitive.protect(request);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;

  // 2. Better Auth session verification
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // 3. Parse and validate request
    const body = await request.json();
    const breachData = breachNotificationSchema.parse(body);

    // 4. Create breach notification
    const notification = await createDataBreachNotification({
      detectedAt: new Date(breachData.detectedAt),
      severity: breachData.severity,
      affectedUsers: breachData.affectedUsers,
      breachType: breachData.breachType,
      description: breachData.description,
      mitigationSteps: breachData.mitigationSteps,
      status: breachData.status,
    });

    // 5. Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'DATA_BREACH_NOTIFICATION_CREATED',
      resourceType: 'security',
      resourceId: notification.breachId,
      details: {
        severity: breachData.severity,
        affectedUserCount: breachData.affectedUsers.length,
        breachType: breachData.breachType,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Breach notification error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create breach notification',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // 1. Arcjet protection
  const decision = await ajSensitive.protect(request);
  const errorResponse = handleArcjetDecision(decision);
  if (errorResponse) return errorResponse;

  // 2. Better Auth session verification
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const severity = searchParams.get('severity') as any;

    // 4. Get breach notifications
    const notifications = await getDataBreachNotifications({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      severity,
    });

    // 5. Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'BREACH_NOTIFICATIONS_ACCESSED',
      resourceType: 'security',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('Get breach notifications error:', error);

    return NextResponse.json(
      {
        error: 'Failed to get breach notifications',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
