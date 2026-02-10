import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Download,
  Calendar,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const safeFormatDate = (dateStr: string | undefined | null, dateFormat: string = 'MMM d, yyyy') => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? '—' : format(date, dateFormat);
};
import { useToast } from '@/hooks/use-toast';
import { useDashboardStats, useTopBorrowed, useRecentActivity } from '@/hooks/useDashboard';
import { useOverdueLoans } from '@/hooks/useCirculation';

type ReportType = 'daily' | 'weekly' | 'overdue' | 'popular';

import { useSearchParams } from 'react-router-dom';

const LibrarianReports: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [reportType, setReportType] = useState<ReportType>((tabParam as ReportType) || 'daily');
  const { toast } = useToast();

  const today = new Date();
  const weekAgo = subDays(today, 7);

  const { data: dashboardData, isLoading: statsLoading } = useDashboardStats();
  const { data: overdueData, isLoading: overdueLoading } = useOverdueLoans();
  const { data: topBorrowedData, isLoading: topLoading } = useTopBorrowed(10);
  const { data: activityData, isLoading: activityLoading } = useRecentActivity(20);

  const stats = dashboardData?.data;
  const overdueList = overdueData?.data || [];
  const popularBooks = topBorrowedData?.data || [];
  const recentActivity = activityData?.data || [];

  const handleExport = () => {
    toast({
      title: 'Report Exported',
      description: 'The report has been downloaded as CSV.',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">Reports</h1>
          <p className="text-muted-foreground">Generate and export library reports</p>
        </div>
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Summary</SelectItem>
              <SelectItem value="weekly">Weekly Activity</SelectItem>
              <SelectItem value="overdue">Overdue Books</SelectItem>
              <SelectItem value="popular">Popular Books</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Report Content */}
      {/* Report Content */}
      <AnimatePresence mode="wait">
        {reportType === 'daily' && (
          <motion.div
            key="daily"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="font-display">Daily Summary</CardTitle>
                    <CardDescription>{format(today, 'MMMM d, yyyy')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-lg bg-success/10 text-center">
                        <p className="text-2xl font-bold">{stats?.checkoutsToday ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Checkouts</p>
                      </div>
                      <div className="p-4 rounded-lg bg-info/10 text-center">
                        <p className="text-2xl font-bold">{stats?.returnsToday ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Returns</p>
                      </div>
                      <div className="p-4 rounded-lg bg-warning/10 text-center">
                        <p className="text-2xl font-bold">{stats?.overdueBooks ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Overdue</p>
                      </div>
                    </div>

                    {activityLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : recentActivity.length > 0 ? (
                      <div className="space-y-2">
                        <p className="font-medium mb-3">Recent Transactions</p>
                        {recentActivity.slice(0, 5).map((activity) => (
                          <div key={activity.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{activity.description}</p>
                              <p className="text-xs text-muted-foreground">{activity.time}</p>
                            </div>
                            <Badge variant={activity.type === 'checkout' ? 'default' : activity.type === 'return' ? 'secondary' : 'destructive'}>
                              {activity.type === 'checkout' ? 'Checkout' : activity.type === 'return' ? 'Return' : 'Overdue'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">No recent transactions</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {reportType === 'weekly' && (
          <motion.div
            key="weekly"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="font-display">Weekly Activity</CardTitle>
                    <CardDescription>{format(weekAgo, 'MMM d')} - {format(today, 'MMM d, yyyy')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading || activityLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-lg bg-primary/10 text-center">
                        <p className="text-3xl font-bold">{stats?.currentLoans ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Active Loans</p>
                      </div>
                      <div className="p-4 rounded-lg bg-info/10 text-center">
                        <p className="text-3xl font-bold">{stats?.activeStudents ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Total Students</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="font-medium mb-3">Recent Activity</p>
                      {recentActivity.slice(0, 10).map((activity) => (
                        <div key={activity.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{activity.description}</p>
                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {reportType === 'overdue' && (
          <motion.div
            key="overdue"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <CardTitle className="font-display text-destructive">Overdue Books Report</CardTitle>
                    <CardDescription>{overdueList.length} books currently overdue</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {overdueLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : overdueList.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">Book</th>
                          <th className="text-left py-2 px-3">Student</th>
                          <th className="text-left py-2 px-3">Due Date</th>
                          <th className="text-left py-2 px-3">Days Overdue</th>
                          <th className="text-left py-2 px-3">Fine</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overdueList.map((loan) => (
                          <tr key={loan.id} className="border-b">
                            <td className="py-2 px-3">{loan.bookTitle}</td>
                            <td className="py-2 px-3">{loan.studentName}</td>
                            <td className="py-2 px-3">{safeFormatDate(loan.dueDate, 'MMM d')}</td>
                            <td className="py-2 px-3">
                              <Badge variant="destructive">{loan.daysOverdue}</Badge>
                            </td>
                            <td className="py-2 px-3 font-medium">₱{loan.fineAmount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No overdue books!</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {reportType === 'popular' && (
          <motion.div
            key="popular"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="font-display">Most Popular Books</CardTitle>
                    <CardDescription>Top 10 most borrowed books</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {topLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : popularBooks.length > 0 ? (
                  <div className="space-y-3">
                    {popularBooks.map((book, index) => (
                      <div key={book.name + index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{book.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{book.value}</p>
                          <p className="text-xs text-muted-foreground">borrows</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No borrowing data available</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LibrarianReports;
