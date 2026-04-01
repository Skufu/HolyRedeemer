import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getRoleDisplayName, getRoleBadgeColor } from '@/contexts/AuthContext';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  BookOpen, Bell, ChevronDown, LogOut, User, Menu, Home, Upload, Book, QrCode,
  Users, BarChart3, Settings, ClipboardList, ScanLine, Search, CalendarDays,
  BookMarked, UserCircle, BellRing, Clock, CalendarClock, CreditCard, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

const adminNavItems = [
  { to: '/admin/reports', icon: BarChart3, label: 'Reports & Analytics' },
  { to: '/admin/users', icon: Users, label: 'Users Management' },
  { to: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
  { to: '/admin/school-year-setup', icon: CalendarDays, label: 'School Year Setup' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
  { to: '/admin/user-settings', icon: UserCircle, label: 'User Settings' },
  { to: '/admin/damage-lost', icon: ShieldAlert, label: 'Damage & Lost' },
];

const librarianNavItems = [
  { to: '/librarian/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/librarian/circulation', icon: ScanLine, label: 'Circulation' },
  { to: '/librarian/books', icon: BookOpen, label: 'Books Catalog' },
  { to: '/librarian/books-management', icon: Book, label: 'Book Management' },
  { to: '/librarian/qr-management', icon: QrCode, label: 'QR Management' },
  { to: '/librarian/excel-migration', icon: Upload, label: 'Excel Migration' },
  { to: '/librarian/student-lookup', icon: Search, label: 'Student Lookup' },
  { to: '/librarian/daily-operations', icon: CalendarDays, label: 'Daily Operations' },
  { to: '/librarian/reports', icon: BarChart3, label: 'Reports' },
  { to: '/librarian/damage-lost', icon: ShieldAlert, label: 'Damage & Lost' },
  { to: '/librarian/settings', icon: Settings, label: 'Settings' },
];

const studentNavItems = [
  { to: '/student/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/student/catalog', icon: BookMarked, label: 'Book Catalog' },
  { to: '/student/my-books', icon: BookOpen, label: 'My Books' },
  { to: '/student/reservations', icon: CalendarClock, label: 'My Reservations' },
  { to: '/student/history', icon: Clock, label: 'History' },
  { to: '/student/fees', icon: CreditCard, label: 'Library Fees' },
  { to: '/student/account', icon: UserCircle, label: 'My Profile' },
  { to: '/student/notifications', icon: BellRing, label: 'Notifications' },
];

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { data: unreadCountData } = useUnreadNotificationsCount();
  const unreadCount = unreadCountData?.data?.count || 0;

  const navItems = user?.role === 'student' ? studentNavItems :
    user?.role === 'librarian'
      ? librarianNavItems
      : user?.role === 'super_admin'
        ? [...adminNavItems, { to: '/admin/school-year-setup', icon: CalendarClock, label: 'School Year Setup' }]
        : adminNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get current page title for breadcrumb
  const currentPage = navItems.find(item => location.pathname.startsWith(item.to));

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className={cn("border-b border-sidebar-border/50", isMobile ? "p-4" : "p-5")}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "rounded-xl bg-white/5 backdrop-blur-sm flex items-center justify-center shadow-lg overflow-hidden border border-sidebar-primary/20",
            isMobile ? "w-10 h-10" : "w-11 h-11"
          )}>
            <img src="/logo.png" alt="Holy Redeemer School Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-display font-semibold text-sidebar-foreground truncate">Holy Redeemer</h2>
            <p className="text-xs text-sidebar-foreground/60 truncate">Library System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1 overflow-y-auto", isMobile ? "p-2" : "p-3")}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'nav-link',
                isMobile && 'py-3.5 text-base',
                isActive && 'nav-link-active'
              )
            }
          >
            <item.icon className={cn(isMobile ? "w-5 h-5" : "w-5 h-5")} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className={cn("border-t border-sidebar-border/50", isMobile ? "p-3" : "p-4")}>
        <div className="flex items-center justify-between text-xs text-sidebar-foreground/50">
          <span>Version</span>
          <span className="font-mono">1.0.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex w-full bg-library-gradient overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar shadow-warm-lg relative">
        {/* Decorative gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sidebar-primary/80 via-sidebar-primary to-sidebar-primary/80" />
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-72 p-0 bg-sidebar border-sidebar-border">
          <SidebarContent isMobile />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
        {/* Header */}
        <header className="z-50 bg-card border-b border-border px-3 sm:px-4 lg:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 transition-all shrink-0 w-full">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0 h-9 w-9"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {/* Mobile: Just show current page */}
            <div className="flex flex-col min-w-0 sm:hidden">
              {currentPage && (
                <h1 className="text-base font-display font-semibold text-foreground truncate pr-2">
                  {currentPage.label}
                </h1>
              )}
            </div>
            {/* Desktop: Show school name + page */}
            <div className="hidden sm:flex flex-col">
              <h1 className="text-lg font-display font-semibold text-primary leading-tight">
                Holy Redeemer School
              </h1>
              {currentPage && (
                <p className="text-xs text-muted-foreground">
                  {currentPage.label}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Notification Bell */}
            <NotificationPopover>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-accent h-9 w-9"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-destructive text-destructive-foreground text-[10px] sm:text-xs rounded-full flex items-center justify-center font-medium shadow-sm ring-1 ring-background">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </NotificationPopover>

            {/* Role Badge - hidden on mobile */}
            {user && (
              <Badge className={cn(getRoleBadgeColor(user.role), 'hidden md:inline-flex shadow-sm text-xs')}>
                {getRoleDisplayName(user.role)}
              </Badge>
            )}

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 sm:gap-2 px-2 sm:pl-2 sm:pr-3 hover:bg-accent h-9">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  </div>
                  <span className="hidden md:inline-block max-w-[100px] truncate text-sm font-medium">
                    {user?.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 shadow-warm">
                <DropdownMenuItem className="cursor-pointer" onClick={() => {
                  if (user?.role === 'student') navigate('/student/account');
                  else if (user?.role === 'admin') navigate('/admin/settings');
                  else toast({ title: "Not Available", description: "Profile page is not available for your role yet." });
                }}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => {
                  if (user?.role === 'student') navigate('/student/settings');
                  else if (user?.role === 'librarian') navigate('/librarian/settings');
                  else if (user?.role === 'admin') navigate('/admin/settings');
                  else toast({ title: "Not Available", description: "Settings page is not available for your role yet." });
                }}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto w-full">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8 pt-0 sm:pt-0 md:pt-0 lg:pt-0 pb-16 sm:pb-8 max-w-full overflow-x-hidden">
            <Outlet />
          </div>
        </main>

        {/* Footer - hidden on mobile for more space */}
        <footer className="hidden sm:block border-t border-border/60 bg-card/50 px-4 py-3">
          <p className="text-xs text-center text-muted-foreground">
            Holy Redeemer School of Cabuyao © {new Date().getFullYear()} • Library Management System
          </p>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
