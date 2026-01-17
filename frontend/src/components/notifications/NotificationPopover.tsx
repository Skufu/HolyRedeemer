import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkAllNotificationsAsRead, useMarkNotificationAsRead } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Notification } from '@/services/notifications';

interface NotificationPopoverProps {
  children: React.ReactNode;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);

  const { data: notificationsData, isLoading } = useNotifications({
    page: 1,
    per_page: 5
  });

  const markAllAsRead = useMarkAllNotificationsAsRead();
  const markAsRead = useMarkNotificationAsRead();

  const notifications = notificationsData?.data || [];
  const hasUnread = notifications.some(n => !n.isRead);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }

    // Navigate based on notification type/reference if needed
    // For now just close the popover
    setOpen(false);

    // Optional: navigation logic could go here
    if (user?.role === 'student' && notification.type === 'overdue') {
      navigate('/student/account');
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    if (user?.role === 'student') {
      navigate('/student/notifications');
    } else if (user?.role === 'librarian') {
      // Librarian notifications page if exists, otherwise fallback
      navigate('/librarian/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold leading-none">Notifications</h4>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mb-2" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground p-4 text-center">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start gap-1 p-4 text-left transition-colors hover:bg-muted/50 border-b last:border-0",
                    !notification.isRead && "bg-muted/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span className={cn("text-sm font-semibold", !notification.isRead && "text-primary")}>
                      {notification.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t bg-muted/20">
          <Button variant="ghost" className="w-full h-8 text-xs" onClick={handleViewAll}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
