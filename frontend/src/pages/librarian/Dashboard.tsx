import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  AlertTriangle,
  ArrowRightLeft,
  Clock,
  TrendingUp,
  QrCode,
  Search,
  Loader2,
  CalendarCheck,
  BookMarked,
  ArrowUpRight,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  useLibrarianDashboard,
  useStudentsByGradeLevel,
  useLoansByGradeLevel,
  useOverdueByGradeLevel,
  useFinesByGradeLevel,
} from '@/hooks/useDashboard';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { staggerContainerVariants, staggerItemVariants, cardHoverVariants } from '@/lib/animations';

const CountUp = ({ value, className }: { value: number, className?: string }) => {
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const duration = 1500;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = value / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(start));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);

  return <span className={className}>{display}</span>;
};

const LibrarianDashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: dashboardData, isLoading: statsLoading } = useLibrarianDashboard();
  const { data: studentsByGradeData, isLoading: studentsByGradeLoading } = useStudentsByGradeLevel();
  const { data: loansByGradeData, isLoading: loansByGradeLoading } = useLoansByGradeLevel();
  const { data: overdueByGradeData, isLoading: overdueByGradeLoading } = useOverdueByGradeLevel();
  const { data: finesByGradeData, isLoading: finesByGradeLoading } = useFinesByGradeLevel();

  const stats = dashboardData?.data?.stats;
  const studentsByGrade = studentsByGradeData?.data || [];
  const loansByGrade = loansByGradeData?.data || [];
  const overdueByGrade = overdueByGradeData?.data || [];
  const finesByGrade = finesByGradeData?.data || [];
  const currentLoans = dashboardData?.data?.currentLoans || [];
  const overdueLoans = dashboardData?.data?.overdueLoans || [];
  const recentActivity = dashboardData?.data?.recentActivity || [];

  const dueSoon = currentLoans.filter(loan => {
    try {
      const daysUntilDue = differenceInDays(new Date(loan.dueDate), new Date());
      return daysUntilDue >= 0 && daysUntilDue <= 3;
    } catch { return false; }
  });

  const isLoading = statsLoading;
  const yearLevelLoading = studentsByGradeLoading || loansByGradeLoading || overdueByGradeLoading || finesByGradeLoading;

  const quickStats = [
    { label: 'Active Loans', value: stats?.currentLoans ?? currentLoans.length, icon: BookOpen, color: 'text-info' },
    { label: 'Overdue', value: stats?.overdueBooks ?? overdueLoans.length, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Due Soon', value: dueSoon.length, icon: Clock, color: 'text-warning-foreground' },
    { label: 'Today\'s Checkouts', value: stats?.checkoutsToday ?? 0, icon: TrendingUp, color: 'text-success' },
  ];

  const gradeLevels = [7, 8, 9, 10, 11, 12];
  const yearLevelChartData = gradeLevels.map(grade => ({
    gradeLevel: `Grade ${grade}`,
    students: studentsByGrade.find(s => s.grade_level === grade)?.count || 0,
    activeLoans: loansByGrade.find(l => l.grade_level === grade)?.count || 0,
    overdue: overdueByGrade.find(o => o.grade_level === grade)?.count || 0,
    fines: Math.round(finesByGrade.find(f => f.grade_level === grade)?.total_amount || 0),
  }));
  const chartColors = { primary: 'hsl(348, 68%, 25%)', success: 'hsl(150, 50%, 35%)', warning: 'hsl(38, 85%, 50%)', info: 'hsl(200, 60%, 40%)', destructive: 'hsl(0, 72%, 51%)' };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">Good Morning, Librarian</h1>
          <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/librarian/circulation')} className="gap-2">
            <QrCode className="h-4 w-4" />
            Open Circulation
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial="hidden"
        animate="visible"
        variants={staggerContainerVariants}
      >
        {quickStats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={staggerItemVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <motion.div variants={cardHoverVariants} initial="initial" className="h-full">
              <Card className="h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin mt-2" />
                      ) : (
                        <div className="text-3xl font-bold font-display flex items-center">
                          <CountUp value={stat.value} />
                        </div>
                      )}
                    </div>
                    <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { label: 'Checkout/Return', icon: ArrowRightLeft, path: '/librarian/circulation' },
              { label: 'Student Lookup', icon: Search, path: '/librarian/student-lookup' },
              { label: 'Book Search', icon: BookOpen, path: '/librarian/books' },
              { label: 'Damage & Lost', icon: AlertTriangle, path: '/librarian/damage-lost' },
              { label: 'Daily Operations', icon: Clock, path: '/librarian/daily-operations' },
              { label: 'Reports', icon: TrendingUp, path: '/librarian/reports' },
            ].map((action) => (
              <motion.div key={action.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="h-20 w-full flex-col gap-2"
                  onClick={() => navigate(action.path)}
                >
                  <action.icon className="h-6 w-6" />
                  <span>{action.label}</span>
                </Button>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Overdue Books Alert */}
        <Card className={overdueLoans.length > 0 ? 'border-destructive/50' : ''}>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${overdueLoans.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              Overdue Books
            </CardTitle>
            <CardDescription>Books that need immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : overdueLoans.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {overdueLoans.slice(0, 5).map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div>
                      <p className="font-medium text-sm">{loan.bookTitle}</p>
                      <p className="text-xs text-muted-foreground">{loan.studentName}</p>
                    </div>
                    <Badge variant="destructive">{loan.daysOverdue} days</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No overdue books!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Due Soon */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning-foreground" />
            Due Within 3 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
            {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dueSoon.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dueSoon.map((loan) => {
                const daysUntilDue = differenceInDays(new Date(loan.dueDate), new Date());

                return (
                  <div key={loan.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm line-clamp-1">{loan.bookTitle}</p>
                      <Badge variant={daysUntilDue === 0 ? 'destructive' : 'secondary'}>
                        {daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} days`}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{loan.studentName}</p>
                    <p className="text-xs text-muted-foreground">Due: {format(new Date(loan.dueDate), 'MMM d')}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No books due soon</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics by Year Level */}
      <Card className="library-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-display">Analytics by Year Level</CardTitle>
        </CardHeader>
        <CardContent>
          {yearLevelLoading ? (
            <div className="h-[320px] flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearLevelChartData} margin={{ left: 0, right: 20 }}>
                  <XAxis
                    dataKey="gradeLevel"
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
                  <Bar
                    dataKey="students"
                    name="Students"
                    fill={chartColors.info}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Bar
                    dataKey="activeLoans"
                    name="Active Loans"
                    fill={chartColors.primary}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Bar
                    dataKey="overdue"
                    name="Overdue"
                    fill={chartColors.warning}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Bar
                    dataKey="fines"
                    name="Fines (₱)"
                    fill={chartColors.destructive}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LibrarianDashboard;
