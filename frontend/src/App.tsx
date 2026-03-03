import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Loader2 } from "lucide-react";

// Lazy load page components for code-splitting
const Login = lazy(() => import("@/pages/Login"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const BooksManagement = lazy(() => import("@/pages/admin/BooksManagement"));
const UsersManagement = lazy(() => import("@/pages/admin/UsersManagement"));
const QRManagement = lazy(() => import("@/pages/admin/QRManagement"));
const AdminReports = lazy(() => import("@/pages/admin/Reports"));
const Settings = lazy(() => import("@/pages/admin/Settings"));
const AuditLogs = lazy(() => import("@/pages/admin/AuditLogs"));
const ExcelMigration = lazy(() => import("@/pages/admin/ExcelMigration"));
const SchoolYearSetup = lazy(() => import("@/pages/admin/SchoolYearSetup"));
const LibrarianDashboard = lazy(() => import("@/pages/librarian/Dashboard"));
const Circulation = lazy(() => import("@/pages/librarian/Circulation"));
const StudentLookup = lazy(() => import("@/pages/librarian/StudentLookup"));
const LibrarianBooks = lazy(() => import("@/pages/librarian/Books"));
const DailyOperations = lazy(() => import("@/pages/librarian/DailyOperations"));
const LibrarianReports = lazy(() => import("@/pages/librarian/Reports"));
const StudentDashboard = lazy(() => import("@/pages/student/Dashboard"));
const StudentCatalog = lazy(() => import("@/pages/student/Catalog"));
const StudentMyBooks = lazy(() => import("@/pages/student/MyBooks"));
const StudentReservations = lazy(() => import("@/pages/student/Reservations"));
const StudentHistory = lazy(() => import("@/pages/student/History"));
const StudentFees = lazy(() => import("@/pages/student/Fees"));
const StudentAccount = lazy(() => import("@/pages/student/Account"));
const StudentNotifications = lazy(() => import("@/pages/student/Notifications"));
const UserSettings = lazy(() => import("@/pages/UserSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading fallback component for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="library-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Login />
                  </Suspense>
                }
              />
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
                <Route path="books" element={<Suspense fallback={<PageLoader />}><BooksManagement /></Suspense>} />
                <Route path="qr-management" element={<Suspense fallback={<PageLoader />}><QRManagement /></Suspense>} />
                <Route path="excel-migration" element={<Suspense fallback={<PageLoader />}><ExcelMigration /></Suspense>} />
                <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersManagement /></Suspense>} />
                <Route path="reports" element={<Suspense fallback={<PageLoader />}><AdminReports /></Suspense>} />
                <Route path="school-year-setup" element={<Suspense fallback={<PageLoader />}><SchoolYearSetup /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
                <Route path="audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogs /></Suspense>} />
                <Route path="user-settings" element={<Suspense fallback={<PageLoader />}><UserSettings /></Suspense>} />
              </Route>

              {/* Librarian Routes */}
              <Route path="/librarian" element={
                <ProtectedRoute allowedRoles={['librarian']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><LibrarianDashboard /></Suspense>} />
                <Route path="circulation" element={<Suspense fallback={<PageLoader />}><Circulation /></Suspense>} />
                <Route path="student-lookup" element={<Suspense fallback={<PageLoader />}><StudentLookup /></Suspense>} />
                <Route path="books" element={<Suspense fallback={<PageLoader />}><LibrarianBooks /></Suspense>} />
                <Route path="daily-operations" element={<Suspense fallback={<PageLoader />}><DailyOperations /></Suspense>} />
                <Route path="reports" element={<Suspense fallback={<PageLoader />}><LibrarianReports /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<PageLoader />}><UserSettings /></Suspense>} />
              </Route>

              {/* Student Routes */}
              <Route path="/student" element={
                <ProtectedRoute allowedRoles={['student']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><StudentDashboard /></Suspense>} />
                <Route path="catalog" element={<Suspense fallback={<PageLoader />}><StudentCatalog /></Suspense>} />
                <Route path="my-books" element={<Suspense fallback={<PageLoader />}><StudentMyBooks /></Suspense>} />
                <Route path="reservations" element={<Suspense fallback={<PageLoader />}><StudentReservations /></Suspense>} />
                <Route path="history" element={<Suspense fallback={<PageLoader />}><StudentHistory /></Suspense>} />
                <Route path="fees" element={<Suspense fallback={<PageLoader />}><StudentFees /></Suspense>} />
                <Route path="account" element={<Suspense fallback={<PageLoader />}><StudentAccount /></Suspense>} />
                <Route path="notifications" element={<Suspense fallback={<PageLoader />}><StudentNotifications /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<PageLoader />}><UserSettings /></Suspense>} />
              </Route>

              {/* Redirect /dashboard to role-specific dashboard */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              } />

              <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

// Helper component to redirect to role-specific dashboard
const DashboardRedirect = () => {
  const user = JSON.parse(localStorage.getItem('lms_user') || '{}');
  const routes: Record<string, string> = {
    super_admin: '/admin/dashboard',
    admin: '/admin/dashboard',
    librarian: '/librarian/dashboard',
    student: '/student/dashboard',
  };
  return <Navigate to={routes[user.role] || '/login'} replace />;
};

export default App;
