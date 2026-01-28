import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import {
  Clock,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  Bell,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { useCurrentLoans, useOverdueLoans, useNotifyOverdue } from '@/hooks/useCirculation';
import { useRequests, useApproveRequest, useRejectRequest } from '@/hooks/useRequests';
import { useQueryClient } from '@tanstack/react-query';

const DailyOperations: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: currentLoansResponse, isLoading: loansLoading, isFetching: loansFetching } = useCurrentLoans();
  const { data: overdueLoansResponse, isLoading: overdueLoading, isFetching: overdueFetching } = useOverdueLoans();
  const { data: requestsResponse, isLoading: requestsLoading, isFetching: requestsFetching } = useRequests({ status: 'pending' });

  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const notifyOverdue = useNotifyOverdue();

  const currentLoans = currentLoansResponse?.data || [];
  const overdueBooks = overdueLoansResponse?.data || [];
  const pendingRequests = requestsResponse?.data || [];

  const dueToday = currentLoans.filter(loan => {
    try {
      const dueDate = parseISO(loan.dueDate);
      return isToday(dueDate);
    } catch {
      return false;
    }
  });

  const todayCheckouts = currentLoans.filter(loan => {
    try {
      const checkoutDate = parseISO(loan.checkoutDate);
      return isToday(checkoutDate);
    } catch {
      return false;
    }
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['loans'] });
    queryClient.invalidateQueries({ queryKey: ['requests'] });
  };

  const handleApprove = (requestId: string) => {
    const request = pendingRequests.find((r: { id: string }) => r.id === requestId);
    approveRequest.mutate(requestId, {
      onSuccess: () => {
        toast({
          title: "Request Approved",
          description: "Student can now check out the book.",
          action: (
            <ToastAction
              altText="Go to Checkout"
              data-testid="toast-go-to-checkout"
              onClick={() => navigate(`/librarian/circulation?student_id=${request?.studentId}`)}
            >
              Go to Checkout
            </ToastAction>
          )
        });
      }
    });
  };

  const handleReject = (requestId: string) => {
    rejectRequest.mutate({ id: requestId });
  };

  const isLoading = loansLoading || overdueLoading || requestsLoading;
  const isRefreshing = loansFetching || overdueFetching || requestsFetching;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">Daily Operations</h1>
          <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className={pendingRequests.length > 0 ? 'border-orange-500/50 shadow-sm' : ''}>
          <CardContent className="pt-6 text-center">
            <div className="relative inline-block">
              <Bell className={`h-6 w-6 mx-auto mb-2 ${pendingRequests.length > 0 ? 'text-orange-600' : 'text-muted-foreground'}`} />
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
              )}
            </div>
            {requestsLoading ? (
              <Skeleton className="h-8 w-8 mx-auto mb-1" />
            ) : (
              <p className={`text-2xl font-bold ${pendingRequests.length > 0 ? 'text-orange-600' : ''}`}>{pendingRequests.length}</p>
            )}
            <p className={`text-sm ${pendingRequests.length > 0 ? 'text-orange-600/80 font-medium' : 'text-muted-foreground'}`}>Pending Requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-6 w-6 mx-auto mb-2 text-success" />
            {loansLoading ? (
              <Skeleton className="h-8 w-8 mx-auto mb-1" />
            ) : (
              <p className="text-2xl font-bold">{todayCheckouts.length}</p>
            )}
            <p className="text-sm text-muted-foreground">Checkouts Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <RefreshCw className="h-6 w-6 mx-auto mb-2 text-info" />
            {loansLoading ? (
              <Skeleton className="h-8 w-8 mx-auto mb-1" />
            ) : (
              <p className="text-2xl font-bold">{currentLoans.length}</p>
            )}
            <p className="text-sm text-muted-foreground">Active Loans</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-warning-foreground" />
            {loansLoading ? (
              <Skeleton className="h-8 w-8 mx-auto mb-1" />
            ) : (
              <p className="text-2xl font-bold">{dueToday.length}</p>
            )}
            <p className="text-sm text-muted-foreground">Due Today</p>
          </CardContent>
        </Card>
        <Card className={overdueBooks.length > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="pt-6 text-center">
            <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${overdueBooks.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            {overdueLoading ? (
              <Skeleton className="h-8 w-8 mx-auto mb-1" />
            ) : (
              <p className="text-2xl font-bold">{overdueBooks.length}</p>
            )}
            <p className="text-sm text-muted-foreground">Overdue Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="due-today">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="due-today" className="gap-2">
            <Clock className="h-4 w-4" />
            Due Today ({dueToday.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Overdue ({overdueBooks.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className={`gap-2 ${pendingRequests.length > 0 ? "text-orange-600 font-medium" : ""}`}>
            <Bell className={`h-4 w-4 ${pendingRequests.length > 0 ? "text-orange-600 fill-orange-600" : ""}`} />
            Requests ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* Due Today */}
        <TabsContent value="due-today" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Books Due Today</CardTitle>
              <CardDescription>These books should be returned today</CardDescription>
            </CardHeader>
            <CardContent>
            {isLoading ? (

                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : dueToday.length > 0 ? (
                <div className="space-y-3">
                  {dueToday.map((loan) => (
                    <div key={loan.id} className="p-4 rounded-lg border bg-warning/5 border-warning/30 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{loan.bookTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          Borrowed by: {loan.studentName} ({loan.studentNumber})
                        </p>
                      </div>
                      <Badge>Due Today</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success opacity-50" />
                  <p>No books due today!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overdue */}
        <TabsContent value="overdue" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-destructive">Overdue Books</CardTitle>
              <CardDescription>These books need immediate follow-up</CardDescription>
            </CardHeader>
            <CardContent>
              {overdueLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : overdueBooks.length > 0 ? (
                <div className="space-y-3">
                  {overdueBooks.map((loan) => (
                    <div key={loan.id} className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{loan.bookTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {loan.studentName} ({loan.studentNumber})
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Due: {format(parseISO(loan.dueDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <Badge variant="destructive">{loan.daysOverdue} days overdue</Badge>
                          <p className="text-sm font-medium text-destructive">
                            Fine: ₱{loan.fineAmount.toFixed(2)}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => notifyOverdue.mutate(loan.id)}
                            disabled={notifyOverdue.isPending}
                          >
                            <Bell className="h-3 w-3" />
                            Notify Student
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success opacity-50" />
                  <p>No overdue books!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests */}
        <TabsContent value="requests" className="mt-6">
          <Card className={pendingRequests.length > 0 ? "border-orange-200 shadow-md" : ""}>
            <CardHeader className={pendingRequests.length > 0 ? "bg-orange-50/50 rounded-t-lg border-b border-orange-100" : ""}>
              <CardTitle className={`font-display ${pendingRequests.length > 0 ? "text-orange-800" : ""}`}>Pending Requests</CardTitle>
              <CardDescription>Book reservations awaiting approval</CardDescription>
            </CardHeader>
            <CardContent>
            {isLoading ? (

                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-lg border bg-muted/50"
                      data-testid="request-card"
                      data-request-id={req.id}
                      data-request-title={req.bookTitle || 'Unknown Book'}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{req.bookTitle || 'Unknown Book'}</p>
                          <p className="text-sm text-muted-foreground">
                            Requested by: {req.studentName}
                          </p>
                          {req.notes && (
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              "{req.notes}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(parseISO(req.requestDate), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(req.id)}
                            className="text-destructive hover:text-destructive"
                            disabled={rejectRequest.isPending}
                            aria-label="Reject request"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-primary hover:text-primary"
                            onClick={() => navigate(`/librarian/circulation?student_id=${req.studentId}`)}
                            title="Go to Checkout"
                            aria-label="Go to Checkout"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(req.id)}
                            disabled={approveRequest.isPending}
                            aria-label="Approve request"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No pending requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DailyOperations;
