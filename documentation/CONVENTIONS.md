# Maxwell Coding Conventions

> Rules and patterns to follow when working on this codebase.

## TypeScript Rules

### Strict Typing
- **NO `any`** unless absolutely necessary and documented
- Use `unknown` + type guards instead of `any`
- Define interfaces for all data structures

```typescript
// ❌ Bad
const data: any = await response.json();

// ✅ Good
interface SearchResult {
    title: string;
    url: string;
}
const data = await response.json() as SearchResult;
```

### Explicit Return Types
Always type function return values for public functions:

```typescript
// ❌ Bad
export async function getData() { ... }

// ✅ Good
export async function getData(): Promise<SearchResult[]> { ... }
```

---

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserMessage.tsx` |
| Lib files | kebab-case or camelCase | `prompts.ts`, `agent.ts` |
| Types | index.ts in `/types` folder | `app/types/index.ts` |
| API routes | `route.ts` in folder | `api/chat/route.ts` |

---

## Component Patterns

### Client Components
Mark with `'use client'` directive at top:

```typescript
'use client';

import React from 'react';

export default function MyComponent() { ... }
```

### Props Interface
Define props interface above component:

```typescript
interface UserMessageProps {
    content: string;
    timestamp?: Date;
}

export default function UserMessage({ content, timestamp }: UserMessageProps) {
    // ...
}
```

---

## AI SDK v5 Patterns

### Tool Definition
Use `inputSchema` (not `parameters`):

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
    description: 'What this tool does',
    inputSchema: z.object({
        param: z.string().describe('What this param is'),
    }),
    execute: async ({ param }) => {
        // Implementation
    },
});
```

### Agent Loop
Use `stopWhen` (not `maxSteps`):

```typescript
import { streamText, stepCountIs } from 'ai';

streamText({
    model,
    messages,
    tools,
    stopWhen: stepCountIs(5),  // Max 5 steps
});
```

### Streaming Response
Use `toTextStreamResponse()`:

```typescript
const result = await runAgent(messages);
return result.toTextStreamResponse();
```

---

## Error Handling

### API Routes
Always catch and return proper error responses:

```typescript
try {
    // Logic
} catch (error) {
    console.error('[API Error]', error);
    return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
}
```

### Tools
Return error in result, don't throw:

```typescript
execute: async ({ query }) => {
    if (!query) {
        return { error: 'No query provided', results: [] };
    }
    // ...
}
```

---

## Logging

### Prefix with Context
Always prefix logs for easy filtering:

```typescript
console.log('[Agent] Starting with model:', modelId);
console.log('[Search] Executing search for:', query);
console.error('[API Error]', error);
```

### Log Levels
- `console.log` - Info, flow tracking
- `console.error` - Errors
- Don't use `console.warn` or `console.debug`

---

## Environment Variables

### Access Pattern
Use the `env` helper, never `process.env` directly:

```typescript
// ❌ Bad
const key = process.env.OPENROUTER_API_KEY;

// ✅ Good
import { env } from './env';
const key = env.openRouterApiKey();
```

### Required Variables
Document in `env.sample`:

```
OPENROUTER_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here
```

---

## Git Commit Messages

Follow Conventional Commits:

```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update documentation
refactor(scope): refactor code
chore(scope): maintenance tasks
```

Examples:
```
feat(agent): add multi-step tool execution
fix(tools): handle Gemini array input format
docs(readme): add setup instructions
```

---

## Testing Before Commit

Always run before committing:

```bash
npm run build    # TypeScript check + build
npm run lint     # ESLint check
```
