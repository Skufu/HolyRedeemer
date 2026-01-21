# AGENTS.md - Frontend Hooks

TanStack Query wrappers for services. Server state management.

## STRUCTURE

```
hooks/
├── useAuth.ts         # Auth state + login/logout
├── useBooks.ts        # Book queries + mutations
├── useStudents.ts     # Student queries
├── useCirculation.ts  # Checkout/return operations
├── useFines.ts        # Fine queries + payment mutations
├── useRequests.ts     # Book request management
├── useNotifications.ts # User notifications
├── useSettings.ts     # Library settings
├── useReports.ts      # Dashboard data
├── useAudit.ts        # Audit log queries
├── use-mobile.tsx     # Mobile detection utility
└── use-toast.ts       # Toast notifications
```

## PATTERN

```typescript
// hooks/useBooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksService, Book } from '@/services/books';

export function useBooks(params?: ListParams) {
  return useQuery({
    queryKey: ['books', params],
    queryFn: () => booksService.list(params),
  });
}

export function useBook(id: string) {
  return useQuery({
    queryKey: ['books', id],
    queryFn: () => booksService.get(id),
    enabled: !!id,
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: booksService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
}
```

## QUERY KEYS

| Domain | Key Pattern |
|--------|-------------|
| Books | `['books']`, `['books', id]`, `['books', params]` |
| Students | `['students']`, `['students', id]` |
| Circulation | `['circulation', 'current']`, `['circulation', 'overdue']` |
| Fines | `['fines']`, `['fines', studentId]` |
| Reports | `['reports', 'dashboard']`, `['reports', 'charts']` |

## INVALIDATION

After mutations, invalidate related queries:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['books'] });
  queryClient.invalidateQueries({ queryKey: ['circulation'] });
}
```

## CONVENTIONS

- Hook names: `use{Domain}` (singular for single item, plural for list)
- Always use `queryKey` arrays for caching
- Use `enabled` option for conditional queries
- Handle loading/error states in components
