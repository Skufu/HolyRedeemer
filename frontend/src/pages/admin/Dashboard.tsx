import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDashboardStats,
  useCategoriesChart,
  useTopBorrowed,
  useMonthlyTrends,
  useRecentActivity
} from '@/hooks/useDashboard';
import { Book, Users, BookOpen, AlertTriangle, DollarSign, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: statsData, isLoading: statsLoading } = useDashboardStats();
  const { data: categoriesData, isLoading: categoriesLoading } = useCategoriesChart();
  const { data: topBorrowedData, isLoading: topBorrowedLoading } = useTopBorrowed(5);
  const { data: trendsData, isLoading: trendsLoading } = useMonthlyTrends(6);
  const { data: activityData, isLoading: activityLoading } = useRecentActivity(4);

  const stats = statsData?.data;
  const categories = categoriesData?.data || [];
  const topBorrowed = topBorrowedData?.data || [];
  const trends = trendsData?.data || [];
  const recentActivity = activityData?.data || [];

  const statCards = [
    {
      title: 'Total Books',
      value: stats?.totalBooks || 0,
      icon: Book,
      gradient: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary'
    },
    {
      title: 'Active Students',
      value: stats?.activeStudents || 0,
      icon: Users,
      gradient: 'from-info/20 to-info/5',
      iconBg: 'bg-info/15',
      iconColor: 'text-info'
    },
    {
      title: 'Current Loans',
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
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const chartColors = {
    primary: 'hsl(348, 68%, 25%)',
    secondary: 'hsl(47, 70%, 47%)',
    success: 'hsl(150, 50%, 35%)',
    warning: 'hsl(38, 85%, 50%)',
    info: 'hsl(200, 60%, 40%)',
    muted: 'hsl(35, 20%, 70%)',
  };

  const categoryChartData = categories.map((cat, index) => ({
    name: cat.name,
    value: cat.value,
    fill: cat.fill || Object.values(chartColors)[index % Object.values(chartColors).length],
  }));

  const topBorrowedChartData = topBorrowed.map(book => ({
    name: book.name?.length > 20 ? book.name.substring(0, 20) + '...' : (book.name || 'Unknown'),
    value: book.value,
  }));

  const transactionStatusData = [
    { name: 'Active', value: stats?.currentLoans || 0, fill: chartColors.primary },
    { name: 'Overdue', value: stats?.overdueBooks || 0, fill: chartColors.warning },
  ];

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
        <Card className="library-card opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Transaction Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={transactionStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {transactionStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(38, 35%, 97%)',
                      border: '1px solid hsl(35, 25%, 82%)',
                      borderRadius: '8px',
                      fontFamily: 'Source Serif 4, serif'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {transactionStatusData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                  <span className="text-sm text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="library-card opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Books by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoriesLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        dataKey="value"
                        stroke="hsl(38, 35%, 97%)"
                        strokeWidth={2}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(38, 35%, 97%)',
                          border: '1px solid hsl(35, 25%, 82%)',
                          borderRadius: '8px',
                          fontFamily: 'Source Serif 4, serif'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
                  {categoryChartData.slice(0, 6).map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                      <span className="text-xs text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="library-card opacity-0 animate-fade-in-up" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Top 5 Most Borrowed</CardTitle>
          </CardHeader>
          <CardContent>
            {topBorrowedLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBorrowedChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(25, 15%, 40%)' }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 11, fill: 'hsl(25, 25%, 15%)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(38, 35%, 97%)',
                        border: '1px solid hsl(35, 25%, 82%)',
                        borderRadius: '8px',
                        fontFamily: 'Source Serif 4, serif'
                      }}
                    />
                    <Bar
                      dataKey="value"
                      fill={chartColors.primary}
                      radius={[0, 6, 6, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="library-card opacity-0 animate-fade-in-up" style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ left: 0, right: 10 }}>
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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="library-card opacity-0 animate-fade-in-up" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5">
                  <DollarSign className="h-7 w-7 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Outstanding Fines</p>
                  <p className="text-3xl font-display font-bold">
                    ₱{(stats?.totalFines || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              <button className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors group">
                <span className="text-sm font-medium">View all fines</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="library-card opacity-0 animate-fade-in-up" style={{ animationDelay: '0.9s', animationFillMode: 'forwards' }}>
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
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 text-sm opacity-0 animate-slide-in"
                    style={{ animationDelay: `${1 + index * 0.1}s`, animationFillMode: 'forwards' }}
                  >
                    <div className={cn(
                      'w-2 h-2 rounded-full mt-2 shrink-0',
                      activity.type === 'checkout' && 'bg-primary',
                      activity.type === 'return' && 'bg-success',
                      activity.type === 'overdue' && 'bg-destructive'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">
                        {activity.description}
                      </p>
                      {activity.time && (
                        <p className="text-xs text-muted-foreground">
                          {activity.time}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {!recentActivity || recentActivity.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">No recent activity</p>
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
