# Frontend Code Style Guide

This document outlines the coding conventions and patterns used in this codebase that should be followed when making modifications or adding new features.

## Type System Conventions

### Colocate Types with Usage
- **Always colocate types, interfaces, and schemas with their usage** rather than creating separate type definition files
- Example: Email schema is defined in `src/store/email.schema.ts` alongside the store that uses it, not in a separate `types/` directory
- This improves code maintainability and makes it easier to understand the relationship between types and their implementations

### Prefer Type Inference Over Manual Mapping
- **Use `z.infer` for automatic type generation from Zod schemas** instead of manually defining TypeScript interfaces
- **Use `.enum` property from Zod enums** to get enum constants instead of manually mapping them
```typescript
// ✅ GOOD - Use inference
export const EmailLocationSchema = z.enum(["inbox", "sent", "archive"]);
export type EmailLocation = z.infer<typeof EmailLocationSchema>;
export const EmailLocation = EmailLocationSchema.enum; // Auto-generated constants

// ❌ BAD - Manual mapping
export enum EmailLocation {
  INBOX = "inbox",
  SENT = "sent",
  // ...manually mapped
}
```

### Runtime Validation with Zod
- **Use Zod's `safeParse`** for runtime validation of external data (JSON files, API responses)
- Store mock data in JSON files and validate with Zod schemas for type safety
```typescript
const parseResult = EmailsArraySchema.safeParse(emailsJson);
if (!parseResult.success) {
  console.error("Failed to parse emails data:", parseResult.error);
  throw new Error("Invalid emails data format");
}
```

## Component System

### Base UI Components Library
- This project uses **@base-ui-components/react**, not shadcn/ui or Radix UI
- **Important: `asChild` prop does not exist in this component system**
- Components are imported from `@/components/ui/` but follow Base UI patterns

### Component Patterns
- Use `cn()` utility for conditional className composition
- Components should accept standard HTML props where appropriate
- Prefer composition over inheritance

## State Management

### Zustand Store Patterns
- Define stores with clear action names that describe what they do
- Use getters for computed values (e.g., `getFilteredEmails`, `getLocationCount`)
- Return to home view when emails are moved/deleted for better UX:
```typescript
moveEmail: (emailId, location) =>
  set((state) => ({
    emails: state.emails.map((email) =>
      email.id === emailId ? { ...email, location } : email
    ),
    // ... other updates
    currentView: "home", // Return to home view when email is moved
  }))
```

## File Organization

### Import Order
- External packages first
- Internal absolute imports (`@/...`)
- Relative imports
- Type imports last (when using `import type`)

### Data Files
- Store mock/static data in JSON files for better separation of concerns
- Validate JSON data with Zod schemas at import time
- Export validated, type-safe data for use in components

## UI/UX Patterns

### Toast Notifications
- Provide undo functionality for destructive or state-changing actions
- Use descriptive titles and descriptions
- Store toast IDs for programmatic dismissal

### Tooltips
- Add tooltips to icon-only buttons for accessibility
- Keep tooltip text concise and descriptive

## Code Quality

### Type Safety
- Never use `any` type
- Prefer `unknown` over `any` when type is truly unknown
- Use proper type narrowing instead of type assertions

### Error Handling
- Use Zod's `safeParse` for validation with proper error handling
- Log errors to console in development
- Provide user-friendly error messages

## Testing Commands
- Run type checking: `pnpm run check:types`
- Format code: `pnpm run fix:format`
- Build project: `pnpm run build`

## Important Notes
- This codebase uses Zod v4 which includes the new `z.email()` method (not `z.string().email()`)
- Enum values are lowercase in the schema definition and should be accessed via the `.enum` property
- Always check existing patterns in nearby files before implementing new features