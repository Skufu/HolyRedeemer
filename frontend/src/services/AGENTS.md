# AGENTS.md - Frontend Services

Axios API layer. Each domain has a service object.

## STRUCTURE

```
services/
├── api.ts            # Axios instance, interceptors, error handling
├── auth.ts           # Login, logout, refresh
├── books.ts          # Book + category + copy operations
├── students.ts       # Student CRUD, lookup
├── circulation.ts    # Checkout, return, renew
├── fines.ts          # Fine management
├── requests.ts       # Book requests/reservations
├── notifications.ts  # User notifications
├── settings.ts       # Library settings
├── reports.ts        # Dashboard data, charts
├── audit.ts          # Audit logs
└── index.ts          # Re-exports
```

## PATTERN

```typescript
// services/books.ts
import { api, ApiResponse } from './api';

export interface Book {
  id: string;
  title: string;
  author: string;
  // ...
}

export const booksService = {
  list: async (params?: ListParams): Promise<ApiResponse<Book[]>> => {
    const response = await api.get<ApiResponse<Book[]>>('/books', { params });
    return response.data;
  },
  
  get: async (id: string): Promise<ApiResponse<Book>> => {
    const response = await api.get<ApiResponse<Book>>(`/books/${id}`);
    return response.data;
  },
  
  create: async (data: CreateBookDto): Promise<ApiResponse<Book>> => {
    const response = await api.post<ApiResponse<Book>>('/books', data);
    return response.data;
  },
  
  update: async (id: string, data: UpdateBookDto): Promise<ApiResponse<Book>> => {
    const response = await api.put<ApiResponse<Book>>(`/books/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/books/${id}`);
    return response.data;
  },
};
```

## ERROR HANDLING

```typescript
import { getErrorMessage } from '@/services/api';

try {
  await booksService.create(data);
} catch (error) {
  const message = getErrorMessage(error);
  toast.error(message);
}
```

## API RESPONSE TYPE

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: { page: number; per_page: number; total: number };
  error?: { code: string; message: string };
}
```

## AUTO TOKEN REFRESH

`api.ts` interceptor handles 401 responses:
1. Attempts refresh with stored refresh token
2. Retries original request with new access token
3. Redirects to /login if refresh fails

## TESTING

```bash
# Run specific test file
npm run test:run -- src/services/auth.test.ts

# Run tests matching pattern
npm run test:run -- --grep "login"

# Verbose output
npm run test -- --reporter=verbose
```

## CONVENTIONS

- Service names: `{domain}Service` (camelCase)
- Methods: `list`, `get`, `create`, `update`, `delete`
- Always return `Promise<ApiResponse<T>>`
- Use `@/services/` import alias
- Never use `as any`, `@ts-ignore`, or `@ts-expect-error`
