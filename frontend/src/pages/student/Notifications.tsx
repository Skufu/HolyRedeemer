import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell,
  BookOpen,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  CreditCard,
  Bookmark,
  Loader2,
  ExternalLink,
  Sparkles,
  ThumbsUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, useUnreadNotificationsCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/hooks/useNotifications';
import { Notification } from '@/services/notifications';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainerVariants, staggerItemVariants, transitions } from '@/lib/animations';

const StudentNotifications = () => {
  const { data: notificationsData, isLoading } = useNotifications();
  const { data: unreadCountData } = useUnreadNotificationsCount();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const notifications = notificationsData?.data || [];
  const unreadCount = unreadCountData?.data?.count || 0;

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const readNotifications = notifications.filter(n => n.isRead);

  // Kid-friendly icon mapping
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      case 'due_reminder':
        return <Clock className="h-6 w-6 text-amber-500" />;
      case 'fine':
        return <CreditCard className="h-6 w-6 text-red-500" />;
      case 'request_update':
        return <Bookmark className="h-6 w-6 text-blue-500" />;
      case 'checkout':
        return <BookOpen className="h-6 w-6 text-green-500" />;
      default:
        return <Bell className="h-6 w-6 text-primary" />;
    }
  };

  // Kid-friendly badge text
  const getNotificationBadge = (type: string) => {
    switch (type) {
      case 'overdue':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">Your book is late!</Badge>;
      case 'due_reminder':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Due soon</Badge>;
      case 'fine':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">You have a fine</Badge>;
      case 'request_update':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Your book is ready!</Badge>;
      default:
        return <Badge variant="outline">News</Badge>;
    }
  };

  // Kid-friendly stats card text
  const getStatsLabel = (type: string) => {
    switch (type) {
      case 'unread':
        return 'New messages';
      case 'overdue':
        return 'Late books';
      case 'due_reminder':
        return 'Due soon';
      case 'request_update':
        return 'Books ready';
      default:
        return type;
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

  // Kid-friendly button text based on notification type
  const getActionButtonText = (type: string) => {
    switch (type) {
      case 'overdue':
        return 'Return your book';
      case 'due_reminder':
        return 'See when to return';
      case 'fine':
        return 'See your fine';
      case 'request_update':
        return 'Get your book';
      default:
        return 'View details';
    }
  };

  const NotificationCard = ({ notification, showMarkAsRead = false }: {
    notification: Notification,
    showMarkAsRead?: boolean
  }) => {
    const actionLink = getNotificationActionLink(notification.type);
    const isNew = !notification.isRead;

    return (
      <motion.div
        layout
        variants={staggerItemVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={transitions.normal}
      >
        <Card className={`transition-all overflow-hidden ${
          isNew 
            ? 'border-2 border-amber-400 bg-amber-50 shadow-md' 
            : 'border border-gray-200'
        }`}>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className={`p-3 rounded-full ${
                  isNew ? 'bg-amber-100' : 'bg-gray-100'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {getNotificationBadge(notification.type)}
                      {isNew && (
                        <span className="px-2 py-0.5 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
                          NEW!
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-lg text-gray-900">{notification.title}</h4>
                    <p className="text-gray-700 mt-1">{notification.message}</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </div>

                  <div className="flex items-center gap-2">
                    {isNew && showMarkAsRead && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        disabled={markAsReadMutation.isPending}
                        className="border-amber-400 text-amber-700 hover:bg-amber-100"
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        Got it!
                      </Button>
                    )}
                    
                    {actionLink && (
                      <Button 
                        variant={isNew ? "default" : "outline"} 
                        size="sm" 
                        className={isNew ? "bg-primary" : ""}
                        asChild
                      >
                        <Link to={actionLink} className="flex items-center gap-1">
                          {getActionButtonText(notification.type)}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
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
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Your Messages
          </h1>
          <p className="text-gray-600 mt-1">
            Here are important things about your library books!
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            className="self-start"
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            I read all ({unreadCount})
          </Button>
        )}
      </div>

      {/* Stats Cards - Kid friendly */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`${unreadCount > 0 ? 'bg-amber-50 border-amber-300' : ''}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-3 rounded-full ${unreadCount > 0 ? 'bg-amber-200' : 'bg-gray-100'}`}>
              <Bell className={`h-6 w-6 ${unreadCount > 0 ? 'text-amber-700' : 'text-gray-500'}`} />
            </div>
            <div>
              <p className={`text-3xl font-bold ${unreadCount > 0 ? 'text-amber-700' : 'text-gray-700'}`}>
                {unreadCount}
              </p>
              <p className="text-xs text-gray-600 font-medium">{getStatsLabel('unread')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {notifications.filter(n => n.type === 'overdue').length}
              </p>
              <p className="text-xs text-gray-600 font-medium">{getStatsLabel('overdue')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-amber-100">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {notifications.filter(n => n.type === 'due_reminder').length}
              </p>
              <p className="text-xs text-gray-600 font-medium">{getStatsLabel('due_reminder')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100">
              <Bookmark className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {notifications.filter(n => n.type === 'request_update').length}
              </p>
              <p className="text-xs text-gray-600 font-medium">{getStatsLabel('request_update')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          {unreadCount > 0 ? (
            <>
              <Sparkles className="h-5 w-5 text-amber-500" />
              You have {unreadCount} new message{unreadCount !== 1 ? 's' : ''}!
            </>
          ) : (
            'All Messages'
          )}
        </h2>

        <motion.div
          className="space-y-3"
          variants={staggerContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {notifications.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="p-12 text-center">
                <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No messages right now!</h3>
                <p className="text-gray-600">
                  You're all caught up. Great job keeping track of your books!
                </p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="popLayout">
              {notifications
                .sort((a, b) => {
                  // Show unread first, then by date
                  if (!a.isRead && b.isRead) return -1;
                  if (a.isRead && !b.isRead) return 1;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    showMarkAsRead={true}
                  />
                ))}
            </AnimatePresence>
          )}
        </motion.div>
      </div>

      {/* All caught up message */}
      {notifications.length > 0 && unreadCount === 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-800 font-medium">
              You've read all your messages! Keep up the good work!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentNotifications;
