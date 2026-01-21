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
  Loader2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useCurrentLoans, useOverdueLoans } from '@/hooks/useCirculation';

const LibrarianDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  const { data: dashboardData, isLoading: statsLoading } = useDashboardStats();
  const { data: currentLoansData, isLoading: loansLoading } = useCurrentLoans();
  const { data: overdueData, isLoading: overdueLoading } = useOverdueLoans();
  
  const stats = dashboardData?.data;
  const currentLoans = currentLoansData?.data || [];
  const overdueLoans = overdueData?.data || [];
  
  const dueSoon = currentLoans.filter(loan => {
    const daysUntilDue = differenceInDays(new Date(loan.dueDate), new Date());
    return daysUntilDue >= 0 && daysUntilDue <= 3;
  });

  const isLoading = statsLoading || loansLoading || overdueLoading;

  const quickStats = [
    { label: 'Active Loans', value: stats?.currentLoans ?? currentLoans.length, icon: BookOpen, color: 'text-info' },
    { label: 'Overdue', value: stats?.overdueBooks ?? overdueLoans.length, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Due Soon', value: dueSoon.length, icon: Clock, color: 'text-warning-foreground' },
    { label: 'Today\'s Checkouts', value: stats?.checkoutsToday ?? 0, icon: TrendingUp, color: 'text-success' },
  ];

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin mt-2" />
                  ) : (
                    <p className="text-3xl font-bold font-display">{stat.value}</p>
                  )}
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/librarian/circulation')}
            >
              <ArrowRightLeft className="h-6 w-6" />
              <span>Checkout/Return</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/librarian/student-lookup')}
            >
              <Search className="h-6 w-6" />
              <span>Student Lookup</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/librarian/books')}
            >
              <BookOpen className="h-6 w-6" />
              <span>Book Search</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/librarian/daily-operations')}
            >
              <Clock className="h-6 w-6" />
              <span>Daily Operations</span>
            </Button>
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
            {overdueLoading ? (
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
          {loansLoading ? (
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
    </div>
  );
};

export default LibrarianDashboard;
