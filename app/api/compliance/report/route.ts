/**
 * Compliance Report API
 * Generate compliance reports for administrators
 * Requirements: 5.4, 6.4, 6.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ajAuthAPI, handleArcjetDecision } from '@/lib/arcjet';
import { generateComplianceReport } from '@/lib/services/compliance';
import { createAuditLog } from '@/lib/services/audit';
import { z } from 'zod';

const reportRequestSchema = z.object({
  reportType: z.enum(['user_data', 'security', 'data_access', 'breach_notification']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  // 1. Arcjet protection
  const decision = await ajAuthAPI.protect(request);
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
    const { reportType, startDate, endDate } = reportRequestSchema.parse(body);

    // 4. Generate compliance report
    const report = await generateComplianceReport(
      reportType,
      new Date(startDate),
      new Date(endDate)
    );

    // 5. Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: 'COMPLIANCE_REPORT_GENERATED',
      resourceType: 'compliance',
      resourceId: report.reportId,
      details: {
        reportType,
        startDate,
        endDate,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Compliance report generation error:', error);

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
        error: 'Failed to generate compliance report',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
