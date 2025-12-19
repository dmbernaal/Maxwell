# Maxwell Coding Conventions

> Rules and patterns for consistent code.

## TypeScript

### Strict Mode

All code must pass TypeScript strict mode.

```json
// tsconfig.json
{
    "compilerOptions": {
        "strict": true
    }
}
```

### Type Imports

Use `type` keyword for type-only imports:

```typescript
// ✅ Good
import type { Source, Message } from '@/app/types';

// ❌ Avoid (works but less clear)
import { Source, Message } from '@/app/types';
```

### Avoid `any`

Use proper types or `unknown`:

```typescript
// ✅ Good
const response = await fetch(...);
const data = await response.json() as SearchResponse;

// ❌ Bad
const data: any = await response.json();
```

Exception: Complex AI SDK types that require `as unknown as`:

```typescript
// Acceptable when AI SDK types are complex
const toolResult = event as unknown as { output: { results?: Source[] } };
```

---

## File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Component | PascalCase.tsx | `ResponseDisplay.tsx` |
| Hook | kebab-case.ts | `use-chat-api.ts` |
| Utility | kebab-case.ts | `models.ts` |
| Types | kebab-case or types.ts | `app/types.ts` |
| API Route | route.ts | `app/api/chat/route.ts` |

---

## Component Patterns

### Client Components

Mark explicitly:

```typescript
'use client';

import { useState } from 'react';

export default function MyComponent() { ... }
```

### Server Components

No directive needed (default in App Router):

```typescript
// No 'use client' = Server Component
export default async function Page() {
    const data = await fetchData();
    return <div>{data}</div>;
}
```

### Props Interface

Define close to component:

```typescript
interface ResponseDisplayProps {
    message: Message | null;
    isHistory?: boolean;
}

export default function ResponseDisplay({ message, isHistory = false }: ResponseDisplayProps) {
    // ...
}
```

---

## Hook Patterns

### Naming

Prefix with `use`:

```typescript
export function useChatApi(options = {}) { ... }
export function useChatStore() { ... }
```

### Return Shape

Use object for flexibility:

```typescript
// ✅ Good - easy to extend
return {
    sendMessage,
    isStreaming,
    error,
    currentModel,
    setModel,
};

// ❌ Avoid arrays for complex returns
return [sendMessage, isStreaming, error];
```

---

## AI SDK v5 Patterns

### Tool Definition

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const searchTool = tool({
    description: 'Search the web...',
    inputSchema: z.object({
        query: z.string().describe('Search query'),
    }),
    execute: async ({ query }) => {
        // Return typed response
        return { results: [...] };
    },
});
```

### Streaming

```typescript
import { streamText, stepCountIs } from 'ai';

const result = streamText({
    model: openrouter(modelId),
    system: SYSTEM_PROMPT,
    messages,
    tools,
    stopWhen: stepCountIs(5),  // v5 syntax
});
```

### Consuming fullStream

```typescript
for await (const event of result.fullStream) {
    if (event.type === 'text-delta') {
        // event.text (not event.textDelta in v5)
    } else if (event.type === 'tool-result') {
        // event.output (not event.result in v5)
    }
}
```

---

## Error Handling

### Try-Catch Pattern

```typescript
try {
    const response = await fetch(...);
    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
} catch (error) {
    console.error('[Module] Error:', error);
    // Return safe default or rethrow
    return { error: String(error), results: [] };
}
```

### Logging Prefix

Use `[Module]` prefix for easy filtering:

```typescript
console.log('[Agent] Starting with model:', modelId);
console.error('[Search] API error:', error);
console.log('[API] Request received');
```

---

## Environment Variables

### Access Pattern

Never access `process.env` directly. Use `env.ts`:

```typescript
// ✅ Good
import { env } from '@/app/lib/env';
const apiKey = env.openRouterApiKey();

// ❌ Bad
const apiKey = process.env.OPENROUTER_API_KEY;
```

### Validation

```typescript
// app/lib/env.ts
export const env = {
    openRouterApiKey: () => {
        const key = process.env.OPENROUTER_API_KEY;
        if (!key) throw new Error('Missing OPENROUTER_API_KEY');
        return key;
    },
};
```

---

## Git Commit Messages

### Format

```
type: short description

Longer explanation if needed.
```

### Types

| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Code restructure |
| `chore` | Build, deps, config |

### Examples

```
feat: add source extraction from tool results
fix: use event.output instead of event.result for AI SDK v5
docs: update ARCHITECTURE with source flow diagram
refactor: extract streaming logic to generator function
```

---

## Import Order

```typescript
// 1. React/Next
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

// 2. External packages
import ReactMarkdown from 'react-markdown';
import { z } from 'zod';

// 3. Internal - lib
import { useChatStore } from '@/app/store';
import { env } from '@/app/lib/env';

// 4. Internal - components
import ResponseDisplay from '@/app/components/ResponseDisplay';

// 5. Types
import type { Source, Message } from '@/app/types';
```

---

## Comments

### When to Comment

- Complex algorithms
- Non-obvious workarounds
- AI SDK quirks

### Style

```typescript
// Single line for brief notes

/**
 * Multi-line for function documentation
 * @param messages Chat history
 * @param modelId Model to use
 */
export async function runAgent(messages: CoreMessage[], modelId: string) {
    // ...
}
```
