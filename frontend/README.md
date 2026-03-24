# Holy Redeemer Library Management System - Frontend

A modern React 18.3 web application for the Holy Redeemer School Library Management System, providing role-based portals for Admin, Librarian, and Student users.

## Documentation

- [Root Project README](../README.md) - Main project documentation
- [Backend API](../backend/README.md) - Backend API documentation
- [API Reference](../docs/api/API.md) - Complete endpoint documentation
- [Architecture](../docs/architecture/ARCHITECTURE.md) - System architecture overview
- [Contributing](../docs/guides/CONTRIBUTING.md) - Development guidelines

## Quick Start

### Using Setup Script (Recommended)

```bash
# From project root
./setup_and_run.sh --setup   # Full setup (first time)
./setup_and_run.sh --run     # Run both backend + frontend
```

### Manual Setup

```bash
cd frontend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start dev server
npm run dev
```

**URL:** http://localhost:4127

## Requirements

- Node.js 18+ or 20+
- npm or pnpm
- Backend API running on port 8080 (see backend setup)

## Project Structure

```
frontend/
├── public/                     # Static assets
├── src/
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components (Radix UI primitives)
│   │   ├── circulation/        # Feature-specific components
│   │   ├── layouts/            # Layout components (DashboardLayout)
│   │   ├── BookCover.tsx       # Book display component
│   │   ├── NavLink.tsx         # Navigation link component
│   │   └── ProtectedRoute.tsx  # Auth/role guard
│   ├── contexts/               # React Context providers
│   │   └── AuthContext.tsx     # Authentication context
│   ├── hooks/                  # Custom React hooks
│   │   └── use-mobile.tsx      # Mobile detection hook
│   ├── pages/                  # Page components by role
│   │   ├── admin/              # Admin-only pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── BooksManagement.tsx
│   │   │   ├── UsersManagement.tsx
│   │   │   ├── QRManagement.tsx
│   │   │   ├── ExcelMigration.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── AuditLogs.tsx
│   │   ├── librarian/          # Librarian-only pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Circulation.tsx
│   │   │   ├── Books.tsx
│   │   │   ├── StudentLookup.tsx
│   │   │   ├── DailyOperations.tsx
│   │   │   └── Reports.tsx
│   │   ├── student/            # Student-only pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Catalog.tsx
│   │   │   ├── Account.tsx
│   │   │   ├── Notifications.tsx
│   │   │   └── Favorites.tsx
│   │   ├── Login.tsx           # Authentication page
│   │   ├── Index.tsx           # Landing/redirect page
│   │   └── NotFound.tsx        # 404 page
│   ├── services/               # API service layer
│   │   ├── api.ts              # Axios instance with interceptors
│   │   ├── auth.ts             # Authentication API
│   │   ├── books.ts            # Books API
│   │   ├── students.ts         # Students API
│   │   ├── circulation.ts      # Circulation API
│   │   ├── fines.ts            # Fines API
│   │   ├── requests.ts         # Book requests API
│   │   ├── settings.ts         # Settings API
│   │   ├── reports.ts          # Reports API
│   │   ├── audit.ts            # Audit logs API
│   │   ├── notifications.ts    # Notifications API
│   │   └── index.ts            # Service exports
│   ├── stores/                 # Zustand state stores
│   │   ├── authStore.ts        # Authentication state
│   │   └── authStore.test.ts
│   ├── test/                   # Testing utilities
│   │   └── test-utils.tsx
│   ├── App.tsx                 # Root component with routing
│   └── main.tsx                # Application entry point
├── index.html                  # HTML template
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
└── .env.example                # Environment variables template
```

## Tech Stack

### Core Framework
- React 18.3.1 - UI library
- TypeScript 5.8.3 - Type-safe development
- Vite 5.4.19 - Build tool and dev server

### State Management
- TanStack Query 5.83.0 (React Query) - Server state management, caching, and synchronization
- Zustand 5.0.9 - Client state management (authentication)

### UI Components
- shadcn/ui - Pre-built component library based on Radix UI
  - 40+ components including: Button, Dialog, Table, Form, Select, etc.
- Tailwind CSS 3.4.17 - Utility-first styling
- Radix UI - Accessible, unstyled component primitives
- Lucide React 0.462.0 - Icon library

### Data Fetching and API
- Axios 1.13.2 - HTTP client with interceptors
- React Router DOM 6.30.1 - Client-side routing
- React Hook Form 7.61.1 - Form management
- Zod 3.25.76 - Schema validation

### Specialized Libraries
- html5-qrcode 2.3.8 - QR/Barcode scanning
- qrcode.react 4.2.0 - QR code generation
- Recharts 2.15.4 - Charting library for reports
- date-fns 3.6.0 - Date manipulation
- xlsx 0.18.5 - Excel file handling (import/export)
- Framer Motion 12.29.2 - Animations

### Testing
- Vitest 3.0.0 - Unit testing framework
- React Testing Library - Component testing
- MSW 2.7.3 - API mocking for tests
- Playwright 1.57.0 - E2E testing

## Authentication

### Token Management
- Access Token: Stored in `localStorage` as `lms_access_token` (15 min expiry)
- Refresh Token: Stored in `localStorage` as `lms_refresh_token` (7 days expiry)
- User Data: Stored in `localStorage` as `lms_user`

### Authentication Flow
1. User logs in via `/login` page
2. Tokens received from `/api/v1/auth/login` endpoint
3. Access token added to all API requests via `Authorization: Bearer <token>` header
4. Automatic Token Refresh: Axios interceptor handles 401 responses by:
   - Using refresh token to get new access token
   - Retrying failed requests with new token
   - Redirecting to login if refresh fails

### Role-Based Access
Three user roles with different access levels:

| Role | Access | Default Page |
|------|--------|--------------|
| Super Admin | Full system access, settings, audit logs, admin management, cache management | `/admin/dashboard` |
| Admin | Full system access, settings, audit logs | `/admin/dashboard` |
| Librarian | Circulation, books, reports, daily operations | `/librarian/dashboard` |
| Student | Catalog, account, notifications, requests, favorites, achievements | `/student/dashboard` |

## Development

### Available Scripts

```bash
npm run dev           # Start development server (Vite)
npm run build         # Production build
npm run build:dev     # Development build
npm run preview       # Preview production build
npm run lint          # Run ESLint
npm run test          # Run Vitest tests
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage
npm run test:e2e      # Run Playwright E2E tests
npm run test:e2e:ui   # Run E2E tests with UI
```

### Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:8080
```

### API Client Configuration

The `services/api.ts` file configures the central Axios instance:

```typescript
// Base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Axios instance
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**Features:**
- Automatic token injection from localStorage
- Request/response logging
- Automatic token refresh on 401 errors
- Error handling with typed responses

### Service Layer Pattern

Each API domain has a dedicated service file in `src/services/`:

```typescript
// Example: books.ts
import { api, ApiResponse } from './api';

export interface Book {
  id: string;
  title: string;
  author: string;
  // ...
}

export const getBooks = async (params?: GetBooksParams): Promise<ApiResponse<Book[]>> => {
  const response = await api.get('/books', { params });
  return response.data;
};

export const createBook = async (data: CreateBookDto): Promise<ApiResponse<Book>> => {
  const response = await api.post('/books', data);
  return response.data;
};
```

### Routing Structure

Routes defined in `App.tsx` using React Router:

**Public Routes:**
- `/` - Landing page (redirects based on auth)
- `/login` - Login page

**Admin Routes:**
- `/admin/dashboard` - Dashboard with statistics
- `/admin/books` - Book management
- `/admin/users` - User management
- `/admin/qr` - QR code management
- `/admin/excel` - Excel import/export
- `/admin/reports` - Reports and analytics
- `/admin/settings` - Library settings
- `/admin/audit` - Audit logs

**Librarian Routes:**
- `/librarian/dashboard` - Dashboard
- `/librarian/circulation` - Circulation station
- `/librarian/books` - Book catalog
- `/librarian/students` - Student lookup
- `/librarian/operations` - Daily operations
- `/librarian/reports` - Reports

**Student Routes:**
- `/student/dashboard` - Student dashboard
- `/student/catalog` - Book catalog
- `/student/account` - Account details
- `/student/notifications` - Notifications
- `/student/favorites` - Favorite books

## UI Components

### shadcn/ui Component Library

The project uses shadcn/ui components based on Radix UI primitives:

**Available Components:**
- Form Components: Button, Input, Select, Checkbox, Radio Group, Switch
- Layout Components: Card, Dialog, Sheet, Sidebar, Separator
- Feedback Components: Alert, Toast (Sonner), Progress, Badge
- Data Display: Table, Avatar, Skeleton, Code
- Navigation: Tabs, Breadcrumb, Menu, Command
- Other: Tooltip, Dropdown, Popover, Calendar, DatePicker

### Custom Components

**Feature-Specific:**
- `QRScannerModal` - QR/barcode scanning for circulation
- `BookCover` - Book cover display with fallback
- `ProtectedRoute` - Auth and role-based route guard
- `DashboardLayout` - Main layout with sidebar

### Design System

**Colors:**
```css
/* Primary - School Maroon */
--primary: #8B1538;

/* Secondary - Gold */
--secondary: #D4AF37;

/* Semantic Colors */
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;
```

## State Management

### TanStack Query (Server State)

Used for all API data fetching:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBooks } from '@/services/books';

function BookList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['books'],
    queryFn: getBooks,
  });

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteBook,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  // ...
}
```

**Features:**
- Automatic caching and revalidation
- Optimistic updates
- Loading and error states
- Query invalidation strategies

### Zustand (Client State)

Used for authentication state:

```typescript
// stores/authStore.ts
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // ... implementation
}));
```

**Usage:**
```typescript
const { user, isAuthenticated, logout } = useAuthStore();
```

## Testing

### Test Structure

- Unit tests in `src/services/*.test.ts`
- Component tests can be added in `src/components/*.test.tsx`
- E2E tests in `tests/e2e/`
- Test utilities in `src/test/test-utils.tsx`

### Running Tests

```bash
# Run all tests
npm run test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## Data Synchronization

### Automatic Refetching

TanStack Query automatically refetches data on:
- Window focus
- Network reconnection
- Component remount
- Manual invalidation

### Real-Time Updates

For features requiring real-time updates:
- Polling (set `refetchInterval` in useQuery)
- Manual refetch on specific actions

## Build and Deployment

### Production Build

```bash
npm run build
```

Creates optimized static files in `dist/` directory.

### Preview Build

```bash
npm run preview
```

Serves the production build locally for testing.

### Deployment Options

1. Vercel (Recommended for React)
   - Automatic builds from GitHub
   - Edge network CDN
   - Easy environment variable management

2. Netlify
   - Drag-and-drop deployment
   - Build command: `npm run build`
   - Publish directory: `dist`

3. Render
   - Static site deployment
   - Custom domain support

## Common Issues and Solutions

### CORS Errors

Ensure backend `CORS_ORIGINS` includes frontend URL:
```env
# Backend .env
CORS_ORIGINS=http://localhost:4127,https://your-frontend.com
```

### API Connection Refused

Ensure backend is running on port 8080:
```bash
# Terminal 1
cd backend && make dev

# Terminal 2
cd frontend && npm run dev
```

### Token Refresh Fails

Clear localStorage and login again:
```javascript
localStorage.clear();
window.location.href = '/login';
```

### QR Scanner Issues

- Ensure HTTPS (required for camera access in production)
- Check browser permissions
- Use USB barcode scanner as alternative

## License

MIT License
