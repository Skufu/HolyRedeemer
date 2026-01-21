import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BookOpen, 
  AlertTriangle, 
  Clock, 
  CheckCircle2,
  Calendar,
  CreditCard,
  Bookmark,
  Check,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, useUnreadNotificationsCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks/useNotifications';
import { Notification } from '@/services/notifications';
import { Link } from 'react-router-dom';

const StudentNotifications = () => {
  const { data: notificationsData, isLoading } = useNotifications();
  const { data: unreadCountData } = useUnreadNotificationsCount();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const notifications = notificationsData?.data || [];
  const unreadCount = unreadCountData?.data?.count || 0;

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'due_reminder':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'fine':
        return <CreditCard className="h-5 w-5 text-destructive" />;
      case 'request_update':
        return <Bookmark className="h-5 w-5 text-blue-500" />;
      case 'checkout':
        return <BookOpen className="h-5 w-5 text-green-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'due_reminder':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Due Soon</Badge>;
      case 'fine':
        return <Badge variant="destructive">Fine</Badge>;
      case 'request_update':
        return <Badge variant="secondary">Request</Badge>;
      default:
        return <Badge variant="outline">General</Badge>;
    }
  };

  const markAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationActionLink = (type: string) => {
    switch (type) {
      case 'overdue':
      case 'due_reminder':
        return '/student/account?tab=current-loans';
      case 'fine':
        return '/student/account?tab=fines';
      case 'request_update':
        return '/student/account?tab=reservations';
      default:
        return null;
    }
  };

  const NotificationCard = ({ notification, showMarkAsRead = false }: { 
    notification: Notification, 
    showMarkAsRead?: boolean 
  }) => {
    const actionLink = getNotificationActionLink(notification.type);
    
    return (
      <Card className={`transition-all ${!notification.isRead ? 'border-primary/30 bg-primary/5' : ''}`}>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className={`p-2 rounded-full ${!notification.isRead ? 'bg-primary/10' : 'bg-muted'}`}>
                {getNotificationIcon(notification.type)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold">{notification.title}</h4>
                    {getNotificationBadge(notification.type)}
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                </div>
                {showMarkAsRead && !notification.isRead && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => markAsRead(notification.id)}
                    disabled={markAsReadMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </div>
                
                {actionLink && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
                    <Link to={actionLink} className="flex items-center gap-1">
                      View details <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your library activity
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={markAllAsRead}
            disabled={markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">Unread</p>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {notifications.filter(n => n.type === 'overdue').length}
              </p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {notifications.filter(n => n.type === 'due_reminder').length}
              </p>
              <p className="text-xs text-muted-foreground">Due Soon</p>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-500/10">
              <Bookmark className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {notifications.filter(n => n.type === 'request_update').length}
              </p>
              <p className="text-xs text-muted-foreground">Requests</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex items-center gap-2">
            <span className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
              )}
            </span>
            Unread ({unreadCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </CardContent>
              </Card>
            ) : (
              notifications
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((notification) => (
                  <NotificationCard 
                    key={notification.id} 
                    notification={notification}
                    showMarkAsRead={true}
                  />
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="unread">
          <div className="space-y-3">
            {unreadNotifications.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500/30 mb-3" />
                  <p className="text-muted-foreground">All caught up! No unread notifications.</p>
                </CardContent>
              </Card>
            ) : (
              unreadNotifications
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((notification) => (
                  <NotificationCard 
                    key={notification.id} 
                    notification={notification}
                    showMarkAsRead={true}
                  />
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentNotifications;
