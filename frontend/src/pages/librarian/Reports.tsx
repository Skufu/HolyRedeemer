import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Calendar,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  Loader2,
  FileText,
  FileSpreadsheet,
  Users,
  DollarSign,
  ShieldAlert,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useOverview, useTopBorrowedByGradeLevel } from '@/hooks/useDashboard';
import { useOverdueLoans, useCurrentLoans } from '@/hooks/useCirculation';
import { useFines } from '@/hooks/useFines';
import { useDamageLostIncidents } from '@/hooks/useDamageLost';
import { exportToPDF, exportToExcel, type ExportColumn } from '@/utils/reportExport';
import { DamageLostIncident } from '@/services/damage_lost';
import { cn } from '@/lib/utils';
import { categoryFillAt, CategoryPieLegend } from '@/lib/categoryChartPalette';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';

const safeFormatDate = (dateStr: string | undefined | null, dateFormat: string = 'MMM d, yyyy') => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? '—' : format(date, dateFormat);
};

const chartColors = {
  primary: '#8B1538',
  secondary: '#D4AF37',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  destructive: '#EF4444',
};

const statusBadge = (status: string) => {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon?: React.ReactNode }> = {
    paid: { variant: 'default', label: 'Paid', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    pending: { variant: 'secondary', label: 'Pending', icon: <Clock className="h-3 w-3 mr-1" /> },
    waived: { variant: 'outline', label: 'Waived' },
    resolved: { variant: 'default', label: 'Resolved', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    assessed: { variant: 'secondary', label: 'Assessed' },
    disputed: { variant: 'destructive', label: 'Disputed', icon: <XCircle className="h-3 w-3 mr-1" /> },
  };
  const s = map[status] || { variant: 'outline' as const, label: status };
  return <Badge variant={s.variant} className="gap-1">{s.icon}{s.label}</Badge>;
};

type ReportTab = 'overview' | 'overdue' | 'fines' | 'popular' | 'students' | 'inventory' | 'damage';

const LibrarianReports: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<ReportTab>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Filter states
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'active' | 'returned'>('all');
  const [overdueFilter, setOverdueFilter] = useState<'all' | 'severe'>('all');
  const [finesFilter, setFinesFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'available' | 'low_stock'>('all');
  const [damageFilter, setDamageFilter] = useState<'all' | 'damage' | 'lost'>('all');

  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: overviewData, isLoading: overviewLoading } = useOverview();
  const { data: overdueData, isLoading: overdueLoading } = useOverdueLoans({ enabled: selectedTab === 'overdue' });
  const { data: currentLoansData } = useCurrentLoans({ enabled: selectedTab === 'overview' });
  const { data: finesData, isLoading: finesLoading } = useFines({ enabled: selectedTab === 'fines' });
  const { data: incidentsData } = useDamageLostIncidents({ per_page: 100, enabled: selectedTab === 'damage' });
  
  // Advanced Analytics hooks (only keeping what's needed for popular tab)
  const { data: topBorrowedByGradeData, isLoading: topBorrowedByGradeLoading } = useTopBorrowedByGradeLevel();

  const overview = overviewData?.data;
  const stats = overview?.stats;
  const studentsByGrade = overview?.studentsByGrade || [];
  const loansByGrade = overview?.loansByGrade || [];
  const overdueByGrade = overview?.overdueByGrade || [];
  const finesByGrade = overview?.finesByGrade || [];
  const categories = overview?.categories || [];
  const topBorrowed = overview?.topBorrowed || [];
  const damageLostStats = overview?.damageLostStats;

  const overdueList = overdueData?.data || [];
  const currentLoans = currentLoansData?.data || [];
  const finesList = finesData?.data || [];
  const incidents = incidentsData?.data || [];

  const pendingFines = finesList.filter(f => f.status === 'pending');
  const paidFines = finesList.filter(f => f.status === 'paid');
  const totalPendingAmount = pendingFines.reduce((s, f) => s + f.amount, 0);
  const totalPaidAmount = paidFines.reduce((s, f) => s + f.amount, 0);

  const filteredTransactions = React.useMemo(() => {
    if (transactionFilter === 'active') return currentLoans.filter(l => l.status === 'active');
    if (transactionFilter === 'returned') return currentLoans.filter(l => l.status === 'returned');
    return currentLoans;
  }, [currentLoans, transactionFilter]);

  const filteredOverdue = React.useMemo(() => {
    const list = overdueList.filter(l =>
      !searchTerm || l.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || l.bookTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (overdueFilter === 'severe') return list.filter(l => l.daysOverdue > 7);
    return list;
  }, [overdueList, searchTerm, overdueFilter]);

  const filteredFines = React.useMemo(() => {
    const list = finesList.filter(f =>
      !searchTerm || (f.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (f.book_title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (finesFilter === 'pending') return list.filter(f => f.status === 'pending');
    if (finesFilter === 'paid') return list.filter(f => f.status === 'paid');
    return list;
  }, [finesList, searchTerm, finesFilter]);

  const filteredInventory = React.useMemo(() => {
    const list = categories || [];
    return list;
  }, [categories]);

  const filteredIncidents = React.useMemo(() => {
    if (damageFilter === 'damage') return incidents.filter((i: DamageLostIncident) => i.incident_type === 'damage');
    if (damageFilter === 'lost') return incidents.filter((i: DamageLostIncident) => i.incident_type === 'lost');
    return incidents;
  }, [incidents, damageFilter]);

  const handleExport = (fmt: 'pdf' | 'excel') => {
    try {
      let title = '';
      let columns: ExportColumn[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows: Record<string, any>[] = [];
      const sfmt = (d: string | undefined | null) => safeFormatDate(d, 'MMM d, yyyy');

      switch (selectedTab) {
        case 'overview':
          title = 'Overview Report';
          columns = [
            { header: 'Metric', key: 'metric', width: 30 },
            { header: 'Value', key: 'value', width: 20 },
          ];
          rows = [
            { metric: 'Checkouts Today', value: stats?.checkoutsToday ?? 0 },
            { metric: 'Returns Today', value: stats?.returnsToday ?? 0 },
            { metric: 'Active Loans', value: stats?.currentLoans ?? 0 },
            { metric: 'Overdue Books', value: stats?.overdueBooks ?? 0 },
            { metric: 'Due Today', value: stats?.dueToday ?? 0 },
            { metric: 'Active Students', value: stats?.activeStudents ?? 0 },
          ];
          break;
        case 'overdue':
          title = 'Overdue Books Report';
          columns = [
            { header: 'Book', key: 'bookTitle', width: 28 },
            { header: 'Student', key: 'studentName', width: 22 },
            { header: 'Due Date', key: '_dueFmt', width: 14 },
            { header: 'Days Overdue', key: 'daysOverdue', width: 14 },
            { header: 'Fine', key: '_fineFmt', width: 12 },
          ];
          rows = filteredOverdue.map(l => ({ ...l, _dueFmt: sfmt(l.dueDate), _fineFmt: `₱${l.fineAmount.toFixed(2)}` }));
          break;
        case 'fines':
          title = 'Fines Collection Report';
          columns = [
            { header: 'Student', key: 'student_name', width: 22 },
            { header: 'Book', key: 'book_title', width: 28 },
            { header: 'Type', key: 'fine_type', width: 12 },
            { header: 'Amount', key: '_amountFmt', width: 12 },
            { header: 'Status', key: 'status', width: 10 },
            { header: 'Date', key: '_dateFmt', width: 14 },
          ];
          rows = filteredFines.map(f => ({ ...f, _amountFmt: `₱${f.amount.toFixed(2)}`, _dateFmt: sfmt(f.created_at) }));
          break;
        case 'popular':
          title = 'Most Popular Books';
          columns = [
            { header: 'Rank', key: '_rank', width: 8 },
            { header: 'Book Title', key: 'name', width: 36 },
            { header: 'Times Borrowed', key: 'value', width: 16 },
          ];
          rows = topBorrowed.map((b, i) => ({ ...b, _rank: `#${i + 1}` }));
          break;
        case 'students':
          title = 'Student Activity by Grade Level';
          columns = [
            { header: 'Grade Level', key: 'gradeLevel', width: 16 },
            { header: 'Students', key: 'students', width: 12 },
            { header: 'Active Loans', key: 'loans', width: 14 },
            { header: 'Overdue', key: 'overdue', width: 12 },
            { header: 'Pending Fines', key: 'fines', width: 16 },
          ];
          rows = [7, 8, 9, 10, 11, 12].map(g => ({
            gradeLevel: `Grade ${g}`,
            students: studentsByGrade.find(s => s.grade_level === g)?.count || 0,
            loans: loansByGrade.find(l => l.grade_level === g)?.count || 0,
            overdue: overdueByGrade.find(o => o.grade_level === g)?.count || 0,
            fines: `₱${(finesByGrade.find(f => f.grade_level === g)?.total_amount || 0).toFixed(2)}`,
          }));
          break;
        case 'inventory':
          title = 'Inventory Report';
          columns = [
            { header: 'Category', key: 'name', width: 30 },
            { header: 'Book Count', key: 'value', width: 16 },
          ];
          rows = categories.map(c => ({ ...c }));
          break;
        case 'damage':
          title = 'Damage & Lost Report';
          columns = [
            { header: 'Receipt No', key: 'receipt_no', width: 20 },
            { header: 'Book', key: 'book_title', width: 28 },
            { header: 'Student', key: 'student_name', width: 22 },
            { header: 'Type', key: 'incident_type', width: 10 },
            { header: 'Severity', key: 'severity', width: 14 },
            { header: 'Cost', key: '_costFmt', width: 12 },
            { header: 'Status', key: 'status', width: 12 },
          ];
          rows = incidents.map((i: DamageLostIncident) => ({ ...i, _costFmt: `₱${(i.assessed_cost || 0).toFixed(2)}` }));
          break;
      }

      if (fmt === 'pdf') exportToPDF({ title, columns, rows });
      else exportToExcel({ title, columns, rows });
      toast({ title: 'Export Complete', description: `${title} exported as ${fmt.toUpperCase()}.` });
    } catch {
      toast({ title: 'Export Failed', description: 'Something went wrong.', variant: 'destructive' });
    }
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'overdue' as const, label: 'Overdue Books', icon: AlertTriangle },
    { id: 'fines' as const, label: 'Fines', icon: DollarSign },
    { id: 'popular' as const, label: 'Popular Books', icon: TrendingUp },
    { id: 'students' as const, label: 'By Grade Level', icon: Users },
    { id: 'inventory' as const, label: 'Inventory', icon: BookOpen },
    { id: 'damage' as const, label: 'Damage & Lost', icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Library operations and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('pdf')} className="gap-2">
            <FileText className="h-4 w-4" /> Export PDF
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setSelectedTab(tab.id); setSearchTerm(''); }}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              selectedTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {(selectedTab === 'overdue' || selectedTab === 'fines') && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={selectedTab === 'overdue' ? 'Search student or book...' : 'Search student or book...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Overview */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Big Stat Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Checkouts Today', value: stats?.checkoutsToday ?? 0, icon: ArrowUpRight, gradient: 'from-success/20 to-success/5', iconBg: 'bg-success/15', iconColor: 'text-success' },
              { label: 'Returns Today', value: stats?.returnsToday ?? 0, icon: ArrowDownRight, gradient: 'from-info/20 to-info/5', iconBg: 'bg-info/15', iconColor: 'text-info' },
              { label: 'Due Today', value: stats?.dueToday ?? 0, icon: Clock, gradient: 'from-warning/20 to-warning/5', iconBg: 'bg-warning/15', iconColor: 'text-warning' },
              { label: 'Overdue', value: stats?.overdueBooks ?? 0, icon: AlertTriangle, gradient: 'from-destructive/20 to-destructive/5', iconBg: 'bg-destructive/15', iconColor: 'text-destructive' },
            ].map((card, index) => (
              <Card 
                key={card.label} 
                className="library-card overflow-hidden opacity-0 animate-fade-in-up hover-lift"
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
              >
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', card.gradient)} />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                      <p className="text-3xl font-display font-bold tracking-tight">{card.value}</p>
                    </div>
                    <div className={cn('p-3 rounded-xl shrink-0', card.iconBg)}>
                      <card.icon className={cn('h-6 w-6', card.iconColor)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity + Active Loans */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="library-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Clock className="h-5 w-5" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentLoans.length > 0 ? (
                  <div className="space-y-3">
                    {currentLoans.slice(0, 6).map(loan => (
                      <div key={loan.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{loan.bookTitle}</p>
                          <p className="text-xs text-muted-foreground">{loan.studentName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Due</p>
                          <p className="text-sm font-medium">{safeFormatDate(loan.dueDate, 'MMM d')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-center py-6 text-muted-foreground">No recent activity</p>}
              </CardContent>
            </Card>

            <Card className="library-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Library Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                    {[
                      { label: 'Total Collection', value: stats?.totalBooks ?? 0, icon: BookOpen },
                      { label: 'Total Copies', value: stats?.totalCopies ?? 0, icon: TrendingUp },
                      { label: 'Pending Fines', value: `₱${(stats?.totalFines ?? 0).toFixed(2)}`, icon: DollarSign },
                      { label: 'Reservations', value: stats?.totalReservations ?? 0, icon: Calendar },
                    ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <span className="font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Overdue Books */}
      {selectedTab === 'overdue' && (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 mb-6">
            <Card 
              className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", overdueFilter === 'all' ? 'ring-2 ring-primary bg-primary/5' : '')}
              onClick={() => setOverdueFilter('all')}
            >
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium">Total Overdue</p>
                <p className="text-3xl font-display font-bold mt-1">{overdueList.length}</p>
              </CardContent>
            </Card>
            <Card 
              className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", overdueFilter === 'severe' ? 'ring-2 ring-destructive bg-destructive/5' : '')}
              onClick={() => setOverdueFilter('severe')}
            >
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium">Severe (&gt;7 Days Overdue)</p>
                <p className="text-3xl font-display font-bold text-destructive mt-1">{overdueList.filter(l => l.daysOverdue > 7).length}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="library-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Overdue Books
              </CardTitle>
              <CardDescription>{filteredOverdue.length} books past due date</CardDescription>
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
                          <button 
                            className="hover:underline text-primary text-left"
                            onClick={() => navigate(`/librarian/student-lookup?search=${encodeURIComponent(loan.studentName)}`)}
                          >
                            {loan.studentName}
                          </button>
                        </TableCell>
                        <TableCell>{safeFormatDate(loan.dueDate, 'MMM d, yyyy')}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive" className="font-mono">{loan.daysOverdue}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">₱{loan.fineAmount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-success/50 mb-3" />
                  <p className="text-muted-foreground">No overdue books — great job!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fines */}
      {selectedTab === 'fines' && (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-3 mb-6">
            <Card 
              className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", finesFilter === 'pending' ? 'ring-2 ring-warning bg-warning/5' : '')}
              onClick={() => setFinesFilter(finesFilter === 'pending' ? 'all' : 'pending')}
            >
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium">Pending</p>
                <p className="text-3xl font-display font-bold text-warning mt-1">₱{totalPendingAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{pendingFines.length} outstanding</p>
              </CardContent>
            </Card>
            <Card 
              className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", finesFilter === 'paid' ? 'ring-2 ring-success bg-success/5' : '')}
              onClick={() => setFinesFilter(finesFilter === 'paid' ? 'all' : 'paid')}
            >
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium">Collected</p>
                <p className="text-3xl font-display font-bold text-success mt-1">₱{totalPaidAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{paidFines.length} paid</p>
              </CardContent>
            </Card>
            <Card 
              className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", finesFilter === 'all' ? 'ring-2 ring-primary bg-primary/5' : '')}
              onClick={() => setFinesFilter('all')}
            >
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium">Total</p>
                <p className="text-3xl font-display font-bold mt-1">₱{(totalPendingAmount + totalPaidAmount).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{finesList.length} fines</p>
              </CardContent>
            </Card>
          </div>

          <Card className="library-card">
            <CardHeader>
              <CardTitle className="font-display">All Fines</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {finesLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : filteredFines.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Student</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFines.map(fine => (
                      <TableRow key={fine.id}>
                            <TableCell className="font-medium">
                              <button 
                                className="hover:underline text-primary text-left"
                                onClick={() => navigate(`/librarian/student-lookup?search=${encodeURIComponent(fine.student_name || '')}`)}
                              >
                                {fine.student_name || '—'}
                              </button>
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate">
                              <button 
                                className="hover:underline text-primary text-left"
                                onClick={() => navigate(`/librarian/books?search=${encodeURIComponent(fine.book_title || '')}`)}
                              >
                                {fine.book_title || '—'}
                              </button>
                            </TableCell>
                        <TableCell><Badge variant={fine.fine_type === 'overdue' ? 'default' : fine.fine_type === 'lost' ? 'destructive' : 'secondary'}>{fine.fine_type}</Badge></TableCell>
                        <TableCell className="text-right font-medium">₱{fine.amount.toFixed(2)}</TableCell>
                        <TableCell>{statusBadge(fine.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{safeFormatDate(fine.created_at, 'MMM d')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-12 text-muted-foreground">No fines found</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Popular Books */}
      {selectedTab === 'popular' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="library-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Top Borrowed Books by Grade
              </CardTitle>
              <CardDescription>Most popular titles per grade level</CardDescription>
            </CardHeader>
            <CardContent>
              {topBorrowedByGradeLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : topBorrowedByGradeData?.data && topBorrowedByGradeData.data.length > 0 ? (
                <div className="space-y-4">
                  {[7, 8, 9, 10, 11, 12].map(grade => {
                    const gradeBooks = topBorrowedByGradeData.data.filter(b => b.grade_level === grade).slice(0, 3);
                    return gradeBooks.length > 0 ? (
                      <div key={grade} className="p-3 rounded-lg bg-muted/30">
                        <p className="text-sm font-semibold mb-2">Grade {grade}</p>
                        <div className="space-y-1">
                          {gradeBooks.map((book, i) => (
                            <div key={`${grade}-${book.title}-${i}`} className="flex items-center justify-between text-sm">
                              <button 
                                className="truncate max-w-[200px] hover:underline text-primary text-left"
                                onClick={() => navigate(`/librarian/books?search=${encodeURIComponent(book.title)}`)}
                              >
                                {book.title}
                              </button>
                              <Badge variant="secondary" className="font-mono">{book.borrow_count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              ) : <p className="text-center py-8 text-muted-foreground">No top borrowed data</p>}
            </CardContent>
          </Card>

          <Card className="library-card">
            <CardHeader>
              <CardTitle className="font-display">Overall Ranking</CardTitle>
            </CardHeader>
            <CardContent>
              {topBorrowed.length > 0 ? (
                <div className="space-y-2">
                  {topBorrowed.slice(0, 10).map((book, i) => (
                    <div key={`${book.name}-${i}`} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                        i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <button 
                          className="font-medium text-sm truncate hover:underline text-primary text-left"
                          onClick={() => navigate(`/librarian/books?search=${encodeURIComponent(book.name)}`)}
                        >
                          {book.name}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-bold shrink-0">
                        {book.value} <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center py-8 text-muted-foreground">No data</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student Activity */}
      {selectedTab === 'students' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="library-card">
            <CardHeader>
              <CardTitle className="font-display">By Grade Level</CardTitle>
              <CardDescription>Students, loans, overdue, and fines</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="whitespace-nowrap">Grade</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Students</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Loans</TableHead>
                    <TableHead className="text-center whitespace-nowrap">Overdue</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Fines</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[7, 8, 9, 10, 11, 12].map(g => (
                    <TableRow key={g} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium whitespace-nowrap">Grade {g}</TableCell>
                      <TableCell className="text-center">{studentsByGrade.find(s => s.grade_level === g)?.count || 0}</TableCell>
                      <TableCell className="text-center">{loansByGrade.find(l => l.grade_level === g)?.count || 0}</TableCell>
                      <TableCell className="text-center">
                        {(() => { const c = overdueByGrade.find(o => o.grade_level === g)?.count || 0; return c > 0 ? <Badge variant="destructive" className="font-mono">{c}</Badge> : <span className="text-muted-foreground">0</span>; })()}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {(() => { const f = finesByGrade.find(f => f.grade_level === g)?.total_amount || 0; return f > 0 ? `₱${f.toFixed(2)}` : <span className="text-muted-foreground">₱0.00</span>; })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="library-card">
            <CardHeader>
              <CardTitle className="font-display">Loans vs Overdue by Grade</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[7, 8, 9, 10, 11, 12].map(g => ({
                  grade: `Grade ${g}`,
                  loans: loansByGrade.find(l => l.grade_level === g)?.count || 0,
                  overdue: overdueByGrade.find(o => o.grade_level === g)?.count || 0,
                }))}>
                  <XAxis dataKey="grade" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="loans" fill={chartColors.info} name="Active Loans" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" fill={chartColors.destructive} name="Overdue" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inventory */}
      {selectedTab === 'inventory' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="library-card">
            <CardHeader>
              <CardTitle className="font-display">Books by Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {categories.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40"><TableHead>Category</TableHead><TableHead className="text-right">Count</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat, i) => (
                      <TableRow key={cat.name}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryFillAt(i) }} />
                            <button 
                              className="hover:underline text-primary text-left"
                              onClick={() => navigate(`/librarian/books?search=${encodeURIComponent(cat.name)}`)}
                            >
                              {cat.name}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">{cat.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-center py-8 text-muted-foreground">No data</p>}
            </CardContent>
          </Card>

          <Card className="library-card">
            <CardHeader><CardTitle className="font-display">Distribution</CardTitle></CardHeader>
            <CardContent>
              {categories.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categories.map(c => ({ name: c.name, value: c.value }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    >
                      {categories.map((_, i) => <Cell key={i} fill={categoryFillAt(i)} />)}
                    </Pie>
                    <Tooltip />
                    <Legend content={(props) => <CategoryPieLegend {...props} />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-center py-8 text-muted-foreground">No data</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Damage & Lost */}
      {selectedTab === 'damage' && (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-3">
            <Card className="library-card">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium">Damage</p>
                <p className="text-3xl font-display font-bold text-warning mt-1">{damageLostStats?.damage_count ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="library-card">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium">Lost</p>
                <p className="text-3xl font-display font-bold text-destructive mt-1">{damageLostStats?.lost_count ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="library-card">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium">Total Cost</p>
                <p className="text-3xl font-display font-bold mt-1">₱{(damageLostStats?.total_cost ?? 0).toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="library-card">
            <CardHeader><CardTitle className="font-display">All Incidents</CardTitle></CardHeader>
            <CardContent className="p-0">
              {incidents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Receipt</TableHead>
                      <TableHead>Book</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {incidents.map((i: DamageLostIncident) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-xs">{i.receipt_no}</TableCell>
                      <TableCell className="max-w-[180px] truncate font-medium">
                        <button 
                          className="hover:underline text-primary text-left"
                          onClick={() => navigate(`/librarian/books?search=${encodeURIComponent(i.book_title || '')}`)}
                        >
                          {i.book_title || '—'}
                        </button>
                      </TableCell>
                      <TableCell>
                        <button 
                          className="hover:underline text-primary text-left"
                          onClick={() => navigate(`/librarian/student-lookup?search=${encodeURIComponent(i.student_name || '')}`)}
                        >
                          {i.student_name || '—'}
                        </button>
                      </TableCell>
                      <TableCell><Badge variant={i.incident_type === 'lost' ? 'destructive' : 'default'}>{i.incident_type}</Badge></TableCell>
                      <TableCell className="text-sm">{i.severity.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right font-medium">₱{(i.assessed_cost || 0).toFixed(2)}</TableCell>
                      <TableCell>{statusBadge(i.status)}</TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              ) : <p className="text-center py-12 text-muted-foreground">No incidents recorded</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LibrarianReports;
