import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Start seeding...');

  // Create a test user for development
  const testUser = await prisma.user.upsert({
    where: { email: 'test@voiceflow.ai' },
    update: {},
    create: {
      name: 'Test User',
      email: 'test@voiceflow.ai',
      emailVerified: true,
      encryptionKeyHash: crypto.createHash('sha256').update('test-encryption-key').digest('hex'),
      gdprConsent: {
        dataProcessing: true,
        voiceRecording: true,
        aiProcessing: true,
        consentDate: new Date().toISOString(),
      },
      // Password will be set via Better Auth Account table
      accounts: {
        create: {
          accountId: 'test@voiceflow.ai',
          providerId: 'credential',
          password: crypto.createHash('sha256').update('test-password').digest('hex'), // Temporary - use Better Auth in production
        },
      },
    },
  });

  console.log(`Created test user: ${testUser.email}`);

  // Create sample folders
  const workFolder = await prisma.folder.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      userId: testUser.id,
      name: 'Work',
    },
  });

  const personalFolder = await prisma.folder.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      userId: testUser.id,
      name: 'Personal',
    },
  });

  console.log(`Created folders: ${workFolder.name}, ${personalFolder.name}`);

  // Create sample tags
  const meetingTag = await prisma.tag.upsert({
    where: { userId_name: { userId: testUser.id, name: 'meeting' } },
    update: {},
    create: {
      userId: testUser.id,
      name: 'meeting',
    },
  });

  const ideaTag = await prisma.tag.upsert({
    where: { userId_name: { userId: testUser.id, name: 'idea' } },
    update: {},
    create: {
      userId: testUser.id,
      name: 'idea',
    },
  });

  console.log(`Created tags: ${meetingTag.name}, ${ideaTag.name}`);

  // Create a sample note
  const sampleNote = await prisma.note.create({
    data: {
      userId: testUser.id,
      folderId: workFolder.id,
      title: 'Sample Voice Note',
      transcription: 'This is a sample transcription of a voice note for testing purposes.',
      summary: 'A test note demonstrating the voice note functionality.',
      duration: 30,
      metadata: {
        processingStatus: 'completed',
        transcriptionProvider: 'deepgram',
        confidence: 0.95,
      },
      tags: {
        create: [
          { tag: { connect: { id: meetingTag.id } } },
        ],
      },
    },
  });

  console.log(`Created sample note: ${sampleNote.title}`);

  // Create audit log entry
  await prisma.auditLog.create({
    data: {
      userId: testUser.id,
      action: 'USER_CREATED',
      resourceType: 'user',
      resourceId: testUser.id,
      details: {
        email: testUser.email,
        source: 'seed',
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Prisma Seed Script',
    },
  });

  console.log('Seeding finished successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });