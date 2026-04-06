import React, { useState } from 'react';
import type { BookRequest } from '@/services/requests';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  TrendingUp,
  Eye,
  Loader2,
} from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import { useCurrentLoans, useOverdueLoans, useNotifyOverdue } from '@/hooks/useCirculation';
import { useRequests, useApproveRequest, useRejectRequest } from '@/hooks/useRequests';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

const safeFormatDate = (dateStr: string | undefined | null, dateFormat: string = 'MMM d, yyyy') => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? '—' : format(date, dateFormat);
};

type TabType = 'due-today' | 'overdue' | 'requests';

const DailyOperations: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('due-today');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<BookRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: currentLoansResponse, isLoading: loansLoading } = useCurrentLoans();
  const { data: overdueLoansResponse, isLoading: overdueLoading } = useOverdueLoans();
  const { data: requestsResponse, isLoading: requestsLoading } = useRequests({ status: 'pending' });

  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const notifyOverdue = useNotifyOverdue();

  const currentLoans = currentLoansResponse?.data || [];
  const overdueBooks = overdueLoansResponse?.data || [];
  const pendingRequests = requestsResponse?.data || [];

  const dueToday = currentLoans.filter(loan => {
    try { return isToday(parseISO(loan.dueDate)); } catch { return false; }
  });

  const todayCheckouts = currentLoans.filter(loan => {
    try { return isToday(parseISO(loan.checkoutDate)); } catch { return false; }
  });

  const filteredDueToday = dueToday.filter(l =>
    !searchTerm || l.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || l.bookTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOverdue = overdueBooks.filter(l =>
    !searchTerm || l.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || l.bookTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['loans'] });
    queryClient.invalidateQueries({ queryKey: ['requests'] });
  };

  const handleApprove = (requestId: string) => {
    const request = pendingRequests.find((r: { id: string }) => r.id === requestId);
    approveRequest.mutate(requestId, {
      onSuccess: () => {
        toast({
          title: 'Reservation Approved',
          description: 'Book reserved for student pickup.',
          action: (
            <ToastAction
              altText="Go to Checkout"
              onClick={() => navigate(`/librarian/circulation?student_id=${request?.studentId}`)}
            >
              Go to Checkout
            </ToastAction>
          ),
        });
      },
    });
  };

  const handleReject = (requestId: string) => {
    const request = pendingRequests.find((r: { id: string }) => r.id === requestId);
    setSelectedRequest(request);
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (selectedRequest) {
      rejectRequest.mutate({ id: selectedRequest.id, reason: rejectReason || undefined });
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedRequest(null);
    }
  };

  const isLoading = loansLoading || overdueLoading || requestsLoading;

  const tabs = [
    { id: 'due-today' as const, label: `Due Today`, count: dueToday.length, icon: Clock, color: 'text-warning' },
    { id: 'overdue' as const, label: 'Overdue', count: overdueBooks.length, icon: AlertTriangle, color: 'text-destructive' },
    { id: 'requests' as const, label: 'Requests', count: pendingRequests.length, icon: Bell, color: pendingRequests.length > 0 ? 'text-orange-600' : 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Daily Operations</h1>
          <p className="text-muted-foreground mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-2">
        {[
          { id: 'requests', label: 'Pending Requests', value: pendingRequests.length, icon: Bell, color: 'text-orange-600', bg: 'bg-orange-500/10', pulse: pendingRequests.length > 0, action: () => setActiveTab('requests') },
          { id: 'checkouts', label: 'Checkouts Today', value: todayCheckouts.length, icon: ArrowUpRight, color: 'text-success', bg: 'bg-success/10', action: () => navigate('/librarian/reports') },
          { id: 'active', label: 'Active Loans', value: currentLoans.length, icon: BookOpen, color: 'text-info', bg: 'bg-info/10', action: () => navigate('/librarian/reports') },
          { id: 'due-today', label: 'Due Today', value: dueToday.length, icon: Clock, color: 'text-warning', bg: 'bg-warning/10', action: () => setActiveTab('due-today') },
          { id: 'overdue', label: 'Overdue', value: overdueBooks.length, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', action: () => setActiveTab('overdue') },
        ].map(card => (
          <Card 
            key={card.label} 
            className={cn(
              "library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
              activeTab === card.id ? 'ring-2 ring-primary bg-primary/5' : ''
            )}
            onClick={card.action}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                  <p className="text-3xl font-display font-bold mt-1">{isLoading ? '—' : card.value}</p>
                </div>
                <div className={cn('p-3 rounded-xl', card.bg, card.pulse && 'animate-pulse')}>
                  <card.icon className={cn('h-6 w-6', card.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                'ml-1 px-2 py-0.5 rounded-full text-xs font-bold',
                activeTab === tab.id ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      {(activeTab === 'due-today' || activeTab === 'overdue') && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student or book..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Due Today */}
      {activeTab === 'due-today' && (
        <Card className="library-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" /> Books Due Today
            </CardTitle>
            <CardDescription>{filteredDueToday.length} books should be returned today</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : filteredDueToday.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Book</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Checkout Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDueToday.map(loan => (
                    <TableRow key={loan.id} className="hover:bg-warning/5">
                      <TableCell className="font-medium max-w-[200px] truncate">
                        <button 
                          className="hover:underline text-primary text-left"
                          onClick={() => navigate(`/librarian/books?search=${encodeURIComponent(loan.bookTitle)}`)}
                        >
                          {loan.bookTitle}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button 
                          className="hover:underline text-primary text-left"
                          onClick={() => navigate(`/librarian/student-lookup?search=${encodeURIComponent(loan.studentName)}`)}
                        >
                          {loan.studentName}
                        </button>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{loan.studentNumber}</TableCell>
                      <TableCell>{safeFormatDate(loan.checkoutDate)}</TableCell>
                      <TableCell className="text-center"><Badge variant="secondary">Due Today</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-success/50 mb-3" />
                <p className="text-muted-foreground">No books due today!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Overdue */}
      {activeTab === 'overdue' && (
        <Card className="library-card">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Overdue Books
            </CardTitle>
            <CardDescription>{filteredOverdue.length} books need immediate follow-up</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {overdueLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : filteredOverdue.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Book</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-center">Days Overdue</TableHead>
                    <TableHead className="text-right">Fine</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOverdue.map(loan => (
                    <TableRow key={loan.id} className="hover:bg-destructive/5">
                      <TableCell className="font-medium max-w-[200px] truncate">
                        <button 
                          className="hover:underline text-primary text-left"
                          onClick={() => navigate(`/librarian/books?search=${encodeURIComponent(loan.bookTitle)}`)}
                        >
                          {loan.bookTitle}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <button 
                            className="font-medium hover:underline text-primary text-left"
                            onClick={() => navigate(`/librarian/student-lookup?search=${encodeURIComponent(loan.studentName)}`)}
                          >
                            {loan.studentName}
                          </button>
                          <p className="text-xs text-muted-foreground font-mono">{loan.studentNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>{safeFormatDate(loan.dueDate, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" className="font-mono">{loan.daysOverdue} days</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">₱{loan.fineAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          onClick={() => notifyOverdue.mutate(loan.id)}
                          disabled={notifyOverdue.isPending}
                        >
                          <Bell className="h-3 w-3" /> Notify
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-success/50 mb-3" />
                <p className="text-muted-foreground">No overdue books — great job!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Requests */}
      {activeTab === 'requests' && (
        <Card className={cn('library-card', pendingRequests.length > 0 && 'border-orange-200')}>
          <CardHeader className={pendingRequests.length > 0 ? 'bg-orange-500/5' : ''}>
            <CardTitle className="font-display flex items-center gap-2">
              <Bell className={cn('h-5 w-5', pendingRequests.length > 0 ? 'text-orange-600' : 'text-muted-foreground')} />
              Pending Requests
            </CardTitle>
            <CardDescription>{pendingRequests.length} reservations awaiting approval</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {requestsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : pendingRequests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Book</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map(req => (
                    <TableRow key={req.id} className="hover:bg-orange-500/5">
                      <TableCell className="font-medium max-w-[200px] truncate">
                        <button 
                          className="hover:underline text-primary text-left"
                          onClick={() => navigate(`/librarian/books?search=${encodeURIComponent(req.bookTitle || '')}`)}
                        >
                          {req.bookTitle || 'Unknown'}
                        </button>
                      </TableCell>
                      <TableCell>
                        <div>
                          <button 
                            className="font-medium hover:underline text-primary text-left"
                            onClick={() => navigate(`/librarian/student-lookup?search=${encodeURIComponent(req.studentName)}`)}
                          >
                            {req.studentName}
                          </button>
                          <p className="text-xs text-muted-foreground font-mono">{req.studentNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>{safeFormatDate(req.requestDate, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground italic">
                        {req.notes || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            onClick={() => navigate(`/librarian/circulation?student_id=${req.studentId}`)}
                          >
                            <ExternalLink className="h-3 w-3" /> Checkout
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-destructive hover:text-destructive"
                            onClick={() => handleReject(req.id)}
                            disabled={rejectRequest.isPending}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => handleApprove(req.id)}
                            disabled={approveRequest.isPending}
                          >
                            <CheckCircle className="h-3 w-3" /> Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No pending requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              {selectedRequest?.bookTitle} — {selectedRequest?.studentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason (optional)</Label>
              <Textarea
                id="reject-reason"
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={rejectRequest.isPending}>
              {rejectRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DailyOperations;
