import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDashboardEnhanced,
  useMonthlyTrends,
  useRecentActivity,
} from '@/hooks/useDashboard';
import { BookOpen, AlertTriangle, DollarSign, Clock, Loader2, Activity, Book } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { cn } from '@/lib/utils';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: statsData, isLoading: statsLoading } = useDashboardEnhanced();
  const { data: trendsData, isLoading: trendsLoading } = useMonthlyTrends(6);
  const { data: activityData, isLoading: activityLoading } = useRecentActivity(6);
  
  const stats = statsData?.data;
  const trends = trendsData?.data || [];
  const recentActivity = activityData?.data || [];

  const statCards = [
    {
      title: 'Total Collection',
      value: stats?.totalBooks || 0,
      icon: Book,
      gradient: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary'
    },
    {
      title: 'Currently Borrowed',
      value: stats?.currentLoans || 0,
      icon: BookOpen,
      gradient: 'from-secondary/20 to-secondary/5',
      iconBg: 'bg-secondary/15',
      iconColor: 'text-secondary'
    },
    {
      title: 'Overdue Books',
      value: stats?.overdueBooks || 0,
      icon: AlertTriangle,
      gradient: 'from-destructive/20 to-destructive/5',
      iconBg: 'bg-destructive/15',
      iconColor: 'text-destructive',
      highlight: (stats?.overdueBooks || 0) > 0
    },
    {
      title: 'Pending Fines',
      value: `₱${(stats?.totalFines || 0).toFixed(2)}`,
      icon: DollarSign,
      gradient: 'from-warning/20 to-warning/5',
      iconBg: 'bg-warning/15',
      iconColor: 'text-warning',
      highlight: (stats?.totalFines || 0) > 0
    }
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const chartColors = {
    primary: 'hsl(348, 68%, 25%)',
    secondary: 'hsl(47, 70%, 47%)',
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">{formatDate(new Date())}</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card
            key={stat.title}
            className={cn(
              'library-card overflow-hidden opacity-0 animate-fade-in-up hover-lift',
              stat.highlight && 'ring-2 ring-destructive/30'
            )}
            style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', stat.gradient)} />
            <CardContent className="p-5 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                  <p className="text-3xl font-display font-bold tracking-tight">{stat.value.toLocaleString()}</p>
                </div>
                <div className={cn('p-3 rounded-xl', stat.iconBg)}>
                  <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
                </div>
              </div>
              {stat.highlight && (
                <p className="text-xs text-destructive mt-2 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Needs attention
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trends */}
        <Card className="library-card opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="h-[350px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ left: 0, right: 10, top: 10 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: 'hsl(25, 15%, 40%)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'hsl(25, 15%, 40%)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(38, 35%, 97%)',
                        border: '1px solid hsl(35, 25%, 82%)',
                        borderRadius: '8px',
                        fontFamily: 'Source Serif 4, serif'
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontFamily: 'Source Serif 4, serif', fontSize: '13px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="checkouts"
                      stroke={chartColors.primary}
                      strokeWidth={2.5}
                      dot={{ fill: chartColors.primary, strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="returns"
                      stroke={chartColors.secondary}
                      strokeWidth={2.5}
                      dot={{ fill: chartColors.secondary, strokeWidth: 0, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="library-card opacity-0 animate-fade-in-up" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {recentActivity.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 text-sm opacity-0 animate-slide-in p-3 rounded-lg bg-muted/30"
                    style={{ animationDelay: `${0.7 + index * 0.1}s`, animationFillMode: 'forwards' }}
                  >
                    <div className={cn(
                      'w-2.5 h-2.5 rounded-full mt-1.5 shrink-0',
                      activity.type === 'checkout' && 'bg-primary',
                      activity.type === 'return' && 'bg-success',
                      activity.type === 'overdue' && 'bg-destructive'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-medium">
                        {activity.description}
                      </p>
                      {activity.time && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.time}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {!recentActivity || recentActivity.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;