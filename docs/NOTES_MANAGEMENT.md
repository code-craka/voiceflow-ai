# Notes Management and Organization System

This document describes the notes management and organization system implemented for VoiceFlow AI.

## Overview

The notes management system provides comprehensive CRUD operations for notes, hierarchical folder organization, tag-based categorization, and full-text search capabilities. All operations are protected with Better Auth authentication and Arcjet security.

## Features Implemented

### 1. Notes CRUD Operations

**API Endpoints:**
- `GET /api/notes` - List all notes for authenticated user
- `POST /api/notes` - Create a new note
- `GET /api/notes/[id]` - Get a specific note
- `PUT /api/notes/[id]` - Update a note
- `DELETE /api/notes/[id]` - Delete a note

**Features:**
- Metadata tracking (duration, creation date, processing status)
- Folder assignment
- Tag assignment
- Proper error handling and validation
- Audit logging for all operations
- Ownership verification for all operations

**Note Metadata:**
```typescript
interface NoteMetadata {
  processingStatus: "pending" | "transcribing" | "processing_ai" | "completed" | "failed";
  transcriptionProvider?: "deepgram" | "assemblyai";
  transcriptionConfidence?: number;
  aiProcessingStatus?: "pending" | "completed" | "failed";
  errorMessage?: string;
}
```

### 2. Folder Management

**API Endpoints:**
- `GET /api/folders` - List all folders (supports `?rootOnly=true` for root folders only)
- `POST /api/folders` - Create a new folder
- `GET /api/folders/[id]` - Get a specific folder (supports `?hierarchy=true` for full hierarchy)
- `PUT /api/folders/[id]` - Update a folder
- `DELETE /api/folders/[id]` - Delete a folder

**Features:**
- Hierarchical folder structure (parent-child relationships)
- Circular reference prevention
- Descendant validation (cannot move folder to its own descendant)
- Automatic note relocation on folder deletion
- Prevents deletion of folders with subfolders
- Audit logging for all operations

**Folder Hierarchy:**
```
Root Folder 1
├── Subfolder 1.1
│   └── Subfolder 1.1.1
└── Subfolder 1.2
Root Folder 2
```

### 3. Tag Management

**API Endpoints:**
- `GET /api/tags` - List all tags for authenticated user
- `POST /api/tags` - Create a new tag
- `GET /api/tags/[id]` - Get a specific tag
- `PUT /api/tags/[id]` - Update a tag
- `DELETE /api/tags/[id]` - Delete a tag
- `GET /api/notes/[id]/tags` - Get tags for a specific note
- `PUT /api/notes/[id]/tags` - Assign tags to a note

**Features:**
- Unique tag names per user
- Multiple tags per note
- Tag assignment and removal
- Automatic cleanup on tag deletion (cascade)
- Audit logging for all operations

### 4. Full-Text Search

**API Endpoint:**
- `POST /api/search` - Search notes using full-text search

**Features:**
- PostgreSQL full-text search with GIN indexes
- Search across transcriptions
- Filter by folder, tags, and date ranges
- Relevance ranking (ts_rank)
- Search result snippets with highlighting
- Target response time: <100ms (Requirement 4.2)

**Search Request:**
```typescript
{
  "query": "meeting notes",
  "filters": {
    "folderId": "uuid",
    "tagIds": ["uuid1", "uuid2"],
    "dateFrom": "2025-01-01T00:00:00Z",
    "dateTo": "2025-12-31T23:59:59Z"
  },
  "limit": 50,
  "offset": 0
}
```

**Search Response:**
```typescript
{
  "data": [
    {
      "note": { /* full note object */ },
      "rank": 0.85,
      "snippet": "...highlighted search result..."
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 123
  },
  "meta": {
    "responseTime": 45 // milliseconds
  }
}
```

## Security

All API endpoints follow the required security pattern:

1. **Arcjet Protection** - Rate limiting and bot protection
2. **Better Auth Session Verification** - User authentication
3. **Input Validation** - Zod schema validation
4. **Ownership Verification** - Ensures users can only access their own data
5. **Audit Logging** - All operations logged for GDPR compliance

## Database Schema

### Notes Table
- Full-text search index on `transcription` field (GIN index)
- Indexes on `userId`, `createdAt`, `folderId` for performance
- Cascade delete on user deletion
- Nullable `folderId` for notes without folders

### Folders Table
- Self-referential relationship for hierarchy (`parentId`)
- Indexes on `userId` and `parentId`
- Cascade delete on user deletion

### Tags Table
- Unique constraint on `(userId, name)`
- Many-to-many relationship with notes via `note_tags` junction table
- Cascade delete on user and tag deletion

## Services

### NotesService (`lib/services/notes.ts`)
- `createNote()` - Create a new note with metadata
- `getNoteById()` - Get a single note with relations
- `getNotes()` - List notes with optional filtering
- `updateNote()` - Update note with metadata merging
- `deleteNote()` - Delete note with audit logging

### FoldersService (`lib/services/folders.ts`)
- `createFolder()` - Create folder with parent validation
- `getFolderById()` - Get single folder
- `getFolders()` - List all folders
- `getRootFolders()` - List root folders only
- `getFolderHierarchy()` - Get folder with all descendants
- `updateFolder()` - Update with circular reference prevention
- `deleteFolder()` - Delete with subfolder and note checks

### TagsService (`lib/services/tags.ts`)
- `createTag()` - Create tag with uniqueness check
- `getTagById()` - Get single tag
- `getTags()` - List all tags
- `updateTag()` - Update with conflict check
- `deleteTag()` - Delete with cascade
- `assignTagsToNote()` - Assign multiple tags to a note
- `getTagsForNote()` - Get all tags for a note

### SearchService (`lib/services/search.ts`)
- `searchNotes()` - Full-text search with filters
- `prepareSearchQuery()` - Convert user query to PostgreSQL tsquery format

## Performance Optimizations

1. **Database Indexes:**
   - GIN index on `notes.transcription` for full-text search
   - B-tree indexes on foreign keys and frequently queried fields
   - Composite indexes for common query patterns

2. **Query Optimization:**
   - Raw SQL for full-text search (better performance than Prisma)
   - Efficient use of `include` for relations
   - Pagination support to limit result sets

3. **Search Performance:**
   - PostgreSQL full-text search with GIN indexes
   - Relevance ranking for better results
   - Target: <100ms response time

## Error Handling

All services and API routes implement comprehensive error handling:

- **Validation Errors** (400) - Invalid input data
- **Authentication Errors** (401) - Missing or invalid session
- **Not Found Errors** (404) - Resource not found or access denied
- **Conflict Errors** (409) - Duplicate tag names, etc.
- **Server Errors** (500) - Unexpected errors with retry indication

## Audit Logging

All operations are logged for GDPR compliance:

- `NOTE_CREATED`, `NOTE_UPDATED`, `NOTE_DELETED`
- `FOLDER_CREATED`, `FOLDER_UPDATED`, `FOLDER_DELETED`
- `TAG_CREATED`, `TAG_UPDATED`, `TAG_DELETED`
- `NOTE_TAGS_UPDATED`

Each log entry includes:
- User ID
- Action type
- Resource type and ID
- Operation details
- IP address (when available)
- Timestamp

## Usage Examples

### Create a Note
```typescript
POST /api/notes
{
  "title": "Meeting Notes",
  "folderId": "uuid",
  "audioUrl": "https://...",
  "duration": 300,
  "metadata": {
    "processingStatus": "pending"
  }
}
```

### Create a Folder
```typescript
POST /api/folders
{
  "name": "Work",
  "parentId": "uuid" // optional
}
```

### Create and Assign Tags
```typescript
// Create tag
POST /api/tags
{
  "name": "important"
}

// Assign to note
PUT /api/notes/[noteId]/tags
{
  "tagIds": ["tagId1", "tagId2"]
}
```

### Search Notes
```typescript
POST /api/search
{
  "query": "project discussion",
  "filters": {
    "folderId": "uuid",
    "tagIds": ["uuid1"],
    "dateFrom": "2025-01-01T00:00:00Z"
  },
  "limit": 20
}
```

## Requirements Satisfied

- **Requirement 4.1** - Folder and tag organization ✅
- **Requirement 4.2** - Full-text search with <100ms response time ✅
- **Requirement 4.3** - Hierarchical folder structure and multiple tags ✅
- **Requirement 4.4** - Note CRUD operations ✅
- **Requirement 4.5** - Metadata tracking (duration, creation date, processing status) ✅

## Next Steps

The notes management system is now complete and ready for integration with:
- Audio recording and upload (Task 4)
- Transcription pipeline (Task 5)
- AI content processing (Task 6)
- Frontend UI components (Task 8)

All API endpoints are secured, validated, and ready for production use.
