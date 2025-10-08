# VoiceFlow AI - Development Guidelines

## Code Quality Standards

### TypeScript Usage (100% of analyzed files)
- **Strict Type Safety**: All files use comprehensive TypeScript with explicit type annotations
- **Interface Definitions**: Clear interfaces for props, state, and function parameters
- **Type Imports**: Use `import type` for type-only imports to optimize bundle size
- **Generic Types**: Leverage generics for reusable components and functions
- **Union Types**: Use union types for state management and error handling

### Import Organization Pattern (100% of files)
- **Absolute Imports**: Always use `@/` path alias for internal imports
- **Import Grouping**: 
  1. External libraries (React, Next.js, third-party)
  2. Internal services and utilities (`@/lib/services/`, `@/lib/`)
  3. Type imports (`@/types/`)
  4. Relative imports (rare, only for co-located files)
- **Named Imports**: Prefer named imports over default imports for better tree-shaking

### Error Handling Standards (100% of API routes)
- **Structured Error Objects**: Consistent error format with `code`, `message`, `details`, `retryable`
- **Error Codes**: Semantic error codes like `MISSING_AUDIO_FILE`, `ENCRYPTION_FAILED`, `DATABASE_ERROR`
- **Retry Indicators**: Boolean `retryable` field to indicate if operation can be retried
- **Error Logging**: Always log errors with `console.error()` before returning responses
- **Graceful Degradation**: Handle errors without breaking the entire application flow

## Architectural Patterns

### API Route Structure (100% of API files)
- **Security First**: Every API route starts with Arcjet protection
- **Request Validation**: Use Zod schemas for input validation with detailed error messages
- **Numbered Steps**: Comment-numbered workflow steps for clarity (1. Security, 2. Validation, etc.)
- **Consistent Response Format**: Standardized JSON responses with `success`, `data`, `error` fields
- **Resource-Based Endpoints**: RESTful design with clear resource identification

### React Component Patterns (100% of components)
- **Client Components**: Use `'use client'` directive for interactive components
- **Props Interfaces**: Explicit TypeScript interfaces for all component props
- **Callback Props**: Optional callback props with proper typing (`onError?`, `onRecordingComplete`)
- **State Management**: Local state with `useState` and complex state with custom hooks
- **Conditional Rendering**: Extensive use of conditional rendering for different states

### Custom Hook Design (100% of hooks)
- **State Encapsulation**: Encapsulate complex state logic in custom hooks
- **Callback Dependencies**: Proper dependency arrays in `useCallback` and `useEffect`
- **Cleanup Functions**: Always implement cleanup for resources (streams, intervals, contexts)
- **Return Object Pattern**: Return objects with named functions and state for better API
- **Error State Management**: Include error state in hook return values

### Service Layer Architecture (100% of services)
- **Single Responsibility**: Each service handles one specific domain
- **Async/Await**: Consistent use of modern async patterns
- **Error Propagation**: Throw meaningful errors that can be caught by callers
- **Resource Management**: Proper cleanup of external resources (streams, connections)
- **Configuration Injection**: Accept configuration as parameters rather than hardcoding

## Security Implementation Patterns

### Arcjet Integration (100% of API routes)
- **Universal Protection**: Every API endpoint protected with `ajAI.protect()`
- **Token-Based Limiting**: Consistent token costs (1 for GET, 2 for POST operations)
- **Decision Handling**: Use `handleArcjetDecision()` helper for consistent error responses
- **Early Return**: Security checks happen before any business logic

### Encryption Standards (100% of security-sensitive operations)
- **AES-256-GCM**: Standard encryption algorithm for all sensitive data
- **User-Controlled Keys**: Individual encryption keys per user for maximum security
- **Metadata Storage**: Store encryption metadata (IV, auth tags) separately from data
- **Error Handling**: Specific error codes for encryption failures with retry logic

### Input Validation (100% of API endpoints)
- **Zod Schemas**: Comprehensive validation schemas for all inputs
- **UUID Validation**: Strict UUID validation for all ID fields
- **File Validation**: Audio format validation with detailed error messages
- **Sanitization**: Proper input sanitization before processing

## Performance Optimization Patterns

### Resource Management (100% of components with resources)
- **Cleanup on Unmount**: Always implement cleanup in `useEffect` return functions
- **Reference Management**: Use `useRef` for DOM elements and mutable values
- **Memory Leak Prevention**: Clear intervals, cancel animation frames, close contexts
- **Stream Management**: Properly stop media streams and close audio contexts

### Async Operation Handling (100% of async operations)
- **Promise Chains**: Proper error handling in async/await chains
- **Timeout Management**: Implement timeouts for long-running operations
- **Background Processing**: Use job queues for heavy processing tasks
- **Caching Strategy**: Implement caching where appropriate (Redis integration)

### Database Interaction (100% of database operations)
- **Prisma Client**: Consistent use of Prisma for type-safe database access
- **Transaction Handling**: Proper error handling for database operations
- **Upsert Operations**: Use upsert for idempotent operations in seeding
- **Relationship Management**: Proper handling of foreign key relationships

## Code Formatting & Style

### Naming Conventions (100% of codebase)
- **camelCase**: Variables, functions, and methods
- **PascalCase**: Components, interfaces, types, and classes
- **SCREAMING_SNAKE_CASE**: Constants and environment variables
- **kebab-case**: File names and CSS classes
- **Descriptive Names**: Clear, self-documenting variable and function names

### Function Organization (100% of functions)
- **Arrow Functions**: Prefer arrow functions for callbacks and short functions
- **Function Declarations**: Use function declarations for main component functions
- **Parameter Destructuring**: Destructure props and parameters for cleaner code
- **Default Parameters**: Use default parameters instead of manual checks
- **Early Returns**: Use early returns to reduce nesting

### Comment Standards (80% of complex functions)
- **JSDoc Comments**: Document complex functions with parameter and return types
- **Inline Comments**: Explain complex business logic and algorithms
- **TODO Comments**: Mark incomplete features with TODO and context
- **Requirement References**: Link code to requirements (e.g., "Requirements: 1.4, 5.1, 5.3")

### CSS and Styling (100% of components)
- **Tailwind Classes**: Extensive use of Tailwind utility classes
- **Responsive Design**: Mobile-first responsive design patterns
- **State-Based Styling**: Dynamic classes based on component state
- **Accessibility**: ARIA labels and semantic HTML elements
- **Color Consistency**: Consistent color palette across components

## Testing and Quality Assurance

### Type Safety (100% of codebase)
- **No Any Types**: Avoid `any` type, use proper type definitions
- **Strict Mode**: TypeScript strict mode enabled
- **Type Guards**: Use type guards for runtime type checking
- **Generic Constraints**: Proper generic constraints for type safety

### Error Boundaries (100% of user-facing features)
- **Graceful Failures**: Components handle errors without crashing
- **User Feedback**: Clear error messages for users
- **Retry Mechanisms**: Provide retry options for recoverable errors
- **Fallback UI**: Alternative UI states for error conditions

### Development Workflow
- **Incremental Development**: Build features incrementally with proper testing
- **Code Reviews**: Structured code review process
- **Documentation**: Keep documentation in sync with code changes
- **Version Control**: Meaningful commit messages and proper branching