# Database Setup and Migrations

This directory contains the Prisma schema, migrations, and seed data for VoiceFlow AI.

## Prerequisites

- PostgreSQL 14+ running locally or remotely
- Database connection configured in `.env` file

## Database Schema

The schema includes the following models:

- **User**: User accounts with encryption key hashes and GDPR consent
- **Note**: Voice notes with transcriptions, summaries, and metadata
- **Folder**: Hierarchical folder structure for organizing notes
- **Tag**: User-defined tags for categorizing notes
- **NoteTag**: Many-to-many relationship between notes and tags
- **AuditLog**: GDPR-compliant audit trail for all data operations

## Performance Optimizations

The schema includes several performance optimizations:

- **Indexes**: Strategic indexes on frequently queried fields (userId, createdAt, folderId, etc.)
- **Full-text Search**: GIN index on transcription field using PostgreSQL's `to_tsvector`
- **Connection Pooling**: Configured to use connection pooling via DATABASE_URL
- **Cascading Deletes**: Proper foreign key relationships with CASCADE for data integrity

## Running Migrations

### Initial Setup

The initial schema has been created with two migrations:
1. `20251007180411_initial_schema` - Core database tables
2. `20251007180500_add_fulltext_search` - Full-text search optimization

```bash
# Generate Prisma Client
pnpm run db:generate

# Apply migrations (already applied)
pnpm run db:migrate

# Seed the database with test data
pnpm run db:seed
```

### Development Workflow

```bash
# After schema changes, create a new migration
npx prisma migrate dev --name description_of_changes

# Push schema changes without creating migration (for prototyping)
pnpm run db:push

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Production Deployment

```bash
# Apply pending migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## Seed Data

The seed script (`seed.ts`) creates:

- A test user account (test@voiceflow.ai)
- Sample folders (Work, Personal)
- Sample tags (meeting, idea)
- A sample voice note with transcription
- Initial audit log entries

This data is useful for development and testing.

## Connection Pooling

The schema is configured to support connection pooling:

- **DATABASE_URL**: Should point to a connection pooler (e.g., PgBouncer) for application queries
- **DIRECT_URL**: Should be a direct database connection for migrations

Example configuration:

```env
# Via connection pooler (for app)
DATABASE_URL="postgresql://user:pass@pooler:6543/voiceflow_ai?pgbouncer=true"

# Direct connection (for migrations)
DIRECT_URL="postgresql://user:pass@localhost:5432/voiceflow_ai"
```

## Troubleshooting

### Migration Conflicts

If you encounter migration conflicts:

```bash
# Mark migration as applied without running it
npx prisma migrate resolve --applied migration_name

# Roll back to a specific migration
npx prisma migrate resolve --rolled-back migration_name
```

### Connection Issues

Ensure your `.env` file has the correct database credentials and the PostgreSQL server is running.

### Full-text Search

The full-text search requires the `pg_trgm` extension. This is automatically enabled in the migration, but if you encounter issues:

```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## Requirements Coverage

This database implementation satisfies:

- **Requirement 4.3**: Hierarchical folder structure with proper relationships
- **Requirement 6.5**: GDPR compliance with audit logging
- **Requirement 7.2**: Encrypted audio storage with key management
- **Requirement 7.4**: Connection pooling for performance optimization
