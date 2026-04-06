import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  FileText,
  FileSpreadsheet,
  TrendingUp,
  Calendar,
  Loader2,
  BookOpen,
  Users,
  Clock,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOverview } from '@/hooks/useDashboard';
import { useFines } from '@/hooks/useFines';
import { useOverdueLoans, useCurrentLoans } from '@/hooks/useCirculation';
import { useBooks } from '@/hooks/useBooks';
import {
  useCategoriesChart,
  useTopBorrowed,
  useMonthlyTrends,
} from '@/hooks/useDashboard';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { exportToPDF, exportToExcel, filterByDateRange, type ExportColumn } from '@/utils/reportExport';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';
import { cn } from '@/lib/utils';
import { categoryFillAt, CategoryPieLegend } from '@/lib/categoryChartPalette';

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

type ReportTab = 'overview' | 'inventory' | 'transactions' | 'overdue' | 'fines' | 'usage';

const AdminReports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportTab>('overview');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Filter states
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'active' | 'returned'>('all');
  const [overdueFilter, setOverdueFilter] = useState<'all' | 'severe'>('all');
  const [finesFilter, setFinesFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'available' | 'low_stock'>('all');

  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: overviewData, isLoading: overviewLoading } = useOverview();
  const { data: currentLoansData, isLoading: loansLoading } = useCurrentLoans();
  const { data: overdueData, isLoading: overdueLoading } = useOverdueLoans();
  const { data: finesData, isLoading: finesLoading } = useFines();
  const { data: booksData, isLoading: booksLoading } = useBooks({ per_page: 1000 });

  const overview = overviewData?.data;
  const stats = overview?.stats;
  const categories = overview?.categories || [];
  const topBorrowed = overview?.topBorrowed || [];
  const trends = overview?.trends || [];
  const damageLostStats = overview?.damageLostStats;

  const currentLoans = useMemo(
    () => filterByDateRange(currentLoansData?.data || [], 'checkoutDate', startDate, endDate),
    [currentLoansData?.data, startDate, endDate],
  );
  const overdueLoans = useMemo(
    () => filterByDateRange(overdueData?.data || [], 'dueDate', startDate, endDate),
    [overdueData?.data, startDate, endDate],
  );
  const fines = useMemo(
    () => filterByDateRange(finesData?.data || [], 'created_at', startDate, endDate),
    [finesData?.data, startDate, endDate],
  );

  const pendingFines = fines.filter(f => f.status === 'pending');
  const paidFines = fines.filter(f => f.status === 'paid');
  const totalPendingAmount = pendingFines.reduce((s, f) => s + f.amount, 0);
  const totalPaidAmount = paidFines.reduce((s, f) => s + f.amount, 0);

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === 'active') return currentLoans.filter(l => l.status === 'active');
    if (transactionFilter === 'returned') return currentLoans.filter(l => l.status === 'returned');
    return currentLoans;
  }, [currentLoans, transactionFilter]);

  const filteredOverdue = useMemo(() => {
    if (overdueFilter === 'severe') return overdueLoans.filter(l => l.daysOverdue > 7);
    return overdueLoans;
  }, [overdueLoans, overdueFilter]);

  const filteredFines = useMemo(() => {
    if (finesFilter === 'pending') return pendingFines;
    if (finesFilter === 'paid') return paidFines;
    return fines;
  }, [fines, finesFilter, pendingFines, paidFines]);

  const filteredInventory = useMemo(() => {
    const list = booksData?.data || [];
    if (inventoryFilter === 'available') return list.filter(b => b.availableCopies > 0);
    if (inventoryFilter === 'low_stock') return list.filter(b => b.availableCopies === 0);
    return list;
  }, [booksData?.data, inventoryFilter]);

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      paid: { variant: 'default', label: 'Paid' },
      pending: { variant: 'secondary', label: 'Pending' },
      waived: { variant: 'outline', label: 'Waived' },
    };
    const s = map[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  // Chart data preparation
  const categoryChartData = categories.map((c, i) => ({
    name: c.name,
    value: c.value,
    fill: categoryFillAt(i),
  }));

  const statCards = [
    {
      title: 'Total Collection',
      value: stats?.totalBooks || 0,
      icon: BookOpen,
      gradient: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/15',
      iconColor: 'text-primary'
    },
    {
      title: 'Currently Borrowed',
      value: stats?.currentLoans || 0,
      icon: BookOpen,
      gradient: 'from-info/20 to-info/5',
      iconBg: 'bg-info/15',
      iconColor: 'text-info'
    },
    {
      title: 'Overdue Books',
      value: stats?.overdueBooks || 0,
      icon: Clock,
      gradient: 'from-destructive/20 to-destructive/5',
      iconBg: 'bg-destructive/15',
      iconColor: 'text-destructive'
    },
    {
      title: 'Pending Fines',
      value: `₱${(stats?.totalFines || 0).toFixed(2)}`,
      icon: DollarSign,
      gradient: 'from-warning/20 to-warning/5',
      iconBg: 'bg-warning/15',
      iconColor: 'text-warning'
    }
  ];

  const reportColumns: Record<Exclude<ReportTab, 'overview'>, ExportColumn[]> = {
    inventory: [
      { header: 'Title', key: 'title', width: 28 },
      { header: 'Author', key: 'author', width: 22 },
      { header: 'Category', key: 'category', width: 14 },
      { header: 'ISBN', key: 'isbn', width: 16 },
      { header: 'Total', key: 'totalCopies', width: 8 },
      { header: 'Available', key: 'availableCopies', width: 10 },
      { header: 'Location', key: 'shelfLocation', width: 14 },
    ],
    transactions: [
      { header: 'Transaction ID', key: '_shortId', width: 16 },
      { header: 'Student', key: 'studentName', width: 22 },
      { header: 'Book', key: 'bookTitle', width: 28 },
      { header: 'Checkout', key: '_checkoutFmt', width: 14 },
      { header: 'Due Date', key: '_dueFmt', width: 14 },
      { header: 'Status', key: 'status', width: 10 },
    ],
    overdue: [
      { header: 'Student', key: 'studentName', width: 22 },
      { header: 'Book', key: 'bookTitle', width: 28 },
      { header: 'Due Date', key: '_dueFmt', width: 14 },
      { header: 'Days Overdue', key: 'daysOverdue', width: 14 },
      { header: 'Fine Amount', key: '_fineFmt', width: 14 },
    ],
    fines: [
      { header: 'Student', key: 'student_name', width: 22 },
      { header: 'Book', key: 'book_title', width: 28 },
      { header: 'Reason', key: 'fine_type', width: 12 },
      { header: 'Amount', key: '_amountFmt', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Date', key: '_dateFmt', width: 14 },
    ],
    usage: [
      { header: 'Rank', key: '_rank', width: 8 },
      { header: 'Book Title', key: 'name', width: 36 },
      { header: 'Times Borrowed', key: 'value', width: 16 },
    ],
  };

  const handleExport = (fmt: 'pdf' | 'excel') => {
    try {
      const reportTitle = selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1) + ' Report';
      const columns = reportColumns[selectedReport as Exclude<ReportTab, 'overview'>];
      if (!columns) {
        toast({ title: 'Nothing to Export', description: 'Overview charts cannot be exported.' });
        return;
      }
      const rows: Record<string, unknown>[] = [];
      if (selectedReport === 'transactions') {
        rows.push(...currentLoans.map((l) => ({ ...l, _shortId: l.id.slice(0, 8), _checkoutFmt: safeFormatDate(l.checkoutDate), _dueFmt: safeFormatDate(l.dueDate) })));
      } else if (selectedReport === 'overdue') {
        rows.push(...overdueLoans.map((l) => ({ ...l, _dueFmt: safeFormatDate(l.dueDate), _fineFmt: `₱${l.fineAmount.toFixed(2)}` })));
      } else if (selectedReport === 'fines') {
        rows.push(...fines.map((f) => ({ ...f, _amountFmt: `₱${f.amount.toFixed(2)}`, _dateFmt: safeFormatDate(f.created_at) })));
      } else if (selectedReport === 'usage') {
        rows.push(...topBorrowed.map((b, i) => ({ ...b, _rank: `#${i + 1}` })));
      } else if (selectedReport === 'inventory') {
        rows.push(...(booksData?.data || []));
      }
      if (fmt === 'pdf') {
        exportToPDF({ title: reportTitle, columns, rows });
      } else {
        exportToExcel({ title: reportTitle, columns, rows });
      }
      toast({ title: 'Export Complete', description: `${reportTitle} exported as ${fmt.toUpperCase()}.` });
    } catch {
      toast({ title: 'Export Failed', description: 'Something went wrong.', variant: 'destructive' });
    }
  };

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Comprehensive library insights and data exports</p>
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
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
          { id: 'inventory' as const, label: 'Inventory', icon: BookOpen },
          { id: 'transactions' as const, label: 'Transactions', icon: TrendingUp },
          { id: 'overdue' as const, label: 'Overdue', icon: Clock },
          { id: 'fines' as const, label: 'Fines', icon: DollarSign },
          { id: 'usage' as const, label: 'Usage', icon: Users },
        ].map(tab => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setSelectedReport(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              selectedReport === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedReport === 'overview' && (
        <div className="p-4">
          {/* Stat Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
            {statCards.map((stat, index) => (
              <Card 
                key={stat.title} 
                className="library-card overflow-hidden opacity-0 animate-fade-in-up hover-lift"
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
              >
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', stat.gradient)} />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                      <p className="text-2xl font-display font-bold tracking-tight">
                        {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                      </p>
                    </div>
                    <div className={cn('p-3 rounded-xl shrink-0', stat.iconBg)}>
                      <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="library-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Activity className="h-5 w-5" /> Monthly Trends
                </CardTitle>
                <CardDescription>Checkout and return activity (last 6 months)</CardDescription>
              </CardHeader>
              <CardContent>
                {trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={trends}>
                      <XAxis dataKey="month" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="checkouts" stroke={chartColors.primary} strokeWidth={2} name="Checkouts" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="returns" stroke={chartColors.success} strokeWidth={2} name="Returns" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card className="library-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <BookOpen className="h-5 w-5" /> Category Distribution
                </CardTitle>
                <CardDescription>Books by category</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      >
                        {categoryChartData.map((entry, i) => <Cell key={`cat-${entry.name}-${i}`} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                      <Legend content={(props) => <CategoryPieLegend {...props} />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Damage/Lost Stats */}
          {damageLostStats && (damageLostStats.damage_count > 0 || damageLostStats.lost_count > 0) && (
            <Card className="library-card mt-4">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-warning" /> Damage & Loss Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-warning/10">
                    <p className="text-2xl font-display font-bold text-warning">{damageLostStats.damage_count}</p>
                    <p className="text-sm text-muted-foreground">Damage Incidents</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-destructive/10">
                    <p className="text-2xl font-display font-bold text-destructive">{damageLostStats.lost_count}</p>
                    <p className="text-sm text-muted-foreground">Lost Books</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-primary/10">
                    <p className="text-2xl font-display font-bold text-primary">₱{damageLostStats.total_cost.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Report Table Tabs */}
      {selectedReport !== 'overview' && (
        <>
          {/* Date Filters */}
          <Card className="library-card">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="startDate" className="text-sm">From:</Label>
                  <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="endDate" className="text-sm">To:</Label>
                  <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="library-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-display capitalize">{selectedReport} Report</CardTitle>
              <CardDescription>
                {selectedReport === 'inventory' && 'Complete list of all books with availability status'}
                {selectedReport === 'transactions' && 'All checkout and return activities'}
                {selectedReport === 'overdue' && 'Currently overdue books and borrowers'}
                {selectedReport === 'fines' && 'Outstanding and collected fines'}
                {selectedReport === 'usage' && 'Most borrowed books and active readers'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {selectedReport === 'transactions' && loansLoading && (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              )}
              {selectedReport === 'overdue' && overdueLoading && (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              )}
              {selectedReport === 'fines' && finesLoading && (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              )}
              {selectedReport === 'transactions' && !loansLoading && (
                <div className="p-4">
                  <div className="grid gap-4 grid-cols-3 mb-6">
                    <Card 
                      className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", transactionFilter === 'all' ? 'ring-2 ring-primary bg-primary/5' : '')}
                      onClick={() => setTransactionFilter('all')}
                    >
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground font-medium">Total Transactions</p>
                        <p className="text-3xl font-display font-bold mt-1">{currentLoans.length}</p>
                      </CardContent>
                    </Card>
                    <Card 
                      className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", transactionFilter === 'active' ? 'ring-2 ring-primary bg-primary/5' : '')}
                      onClick={() => setTransactionFilter('active')}
                    >
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground font-medium">Active Loans</p>
                        <p className="text-3xl font-display font-bold text-primary mt-1">{currentLoans.filter(l => l.status === 'active').length}</p>
                      </CardContent>
                    </Card>
                    <Card 
                      className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", transactionFilter === 'returned' ? 'ring-2 ring-success bg-success/5' : '')}
                      onClick={() => setTransactionFilter('returned')}
                    >
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground font-medium">Returned</p>
                        <p className="text-3xl font-display font-bold text-success mt-1">{currentLoans.filter(l => l.status === 'returned').length}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50"><TableHead>ID</TableHead><TableHead>Student</TableHead><TableHead>Book</TableHead><TableHead>Checkout</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredTransactions.map((loan) => (
                          <TableRow key={loan.id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{loan.id.slice(0, 8)}</TableCell>
                        <TableCell className="font-medium">
                          <button 
                            className="hover:underline text-primary text-left"
                            onClick={() => navigate(`/admin/users?search=${encodeURIComponent(loan.studentName)}`)}
                          >
                            {loan.studentName}
                          </button>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          <button 
                            className="hover:underline text-primary text-left"
                            onClick={() => navigate(`/admin/books?search=${encodeURIComponent(loan.bookTitle)}`)}
                          >
                            {loan.bookTitle}
                          </button>
                        </TableCell>
                            <TableCell>{safeFormatDate(loan.checkoutDate)}</TableCell>
                            <TableCell>{safeFormatDate(loan.dueDate)}</TableCell>
                            <TableCell>
                              <Badge variant={loan.status === 'active' ? 'default' : loan.status === 'returned' ? 'secondary' : 'destructive'}>
                                {loan.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredTransactions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {selectedReport === 'overdue' && !overdueLoading && (
                <div className="p-4">
                  <div className="grid gap-4 grid-cols-2 mb-6">
                    <Card 
                      className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", overdueFilter === 'all' ? 'ring-2 ring-primary bg-primary/5' : '')}
                      onClick={() => setOverdueFilter('all')}
                    >
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground font-medium">Total Overdue</p>
                        <p className="text-3xl font-display font-bold mt-1">{overdueLoans.length}</p>
                      </CardContent>
                    </Card>
                    <Card 
                      className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", overdueFilter === 'severe' ? 'ring-2 ring-destructive bg-destructive/5' : '')}
                      onClick={() => setOverdueFilter('severe')}
                    >
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground font-medium">Severe (&gt;7 Days Overdue)</p>
                        <p className="text-3xl font-display font-bold text-destructive mt-1">{overdueLoans.filter(l => l.daysOverdue > 7).length}</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50"><TableHead>Student</TableHead><TableHead>Book</TableHead><TableHead>Due Date</TableHead><TableHead className="text-center">Days Overdue</TableHead><TableHead className="text-right">Fine</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredOverdue.map((loan) => (
                          <TableRow key={loan.id} className="hover:bg-destructive/5">
                        <TableCell className="font-medium">
                          <button 
                            className="hover:underline text-primary text-left"
                            onClick={() => navigate(`/admin/users?search=${encodeURIComponent(loan.studentName)}`)}
                          >
                            {loan.studentName}
                          </button>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          <button 
                            className="hover:underline text-primary text-left"
                            onClick={() => navigate(`/admin/books?search=${encodeURIComponent(loan.bookTitle)}`)}
                          >
                            {loan.bookTitle}
                          </button>
                        </TableCell>
                            <TableCell>{safeFormatDate(loan.dueDate)}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="destructive" className="font-mono">{loan.daysOverdue}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">₱{loan.fineAmount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        {filteredOverdue.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No overdue items</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {selectedReport === 'fines' && !finesLoading && (
                <div className="space-y-6 p-4">
                  <div className="grid gap-4 grid-cols-3">
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
                        <p className="text-xs text-muted-foreground mt-1">{fines.length} fines</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50"><TableHead>Student</TableHead><TableHead>Book</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredFines.map((fine) => (
                          <TableRow key={fine.id}>
                        <TableCell className="font-medium">
                          <button 
                            className="hover:underline text-primary text-left"
                            onClick={() => navigate(`/admin/users?search=${encodeURIComponent(fine.student_name || '')}`)}
                          >
                            {fine.student_name || '—'}
                          </button>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          <button 
                            className="hover:underline text-primary text-left"
                            onClick={() => navigate(`/admin/books?search=${encodeURIComponent(fine.book_title || '')}`)}
                          >
                            {fine.book_title || '—'}
                          </button>
                        </TableCell>
                            <TableCell><Badge variant={fine.fine_type === 'overdue' ? 'default' : fine.fine_type === 'lost' ? 'destructive' : 'secondary'}>{fine.fine_type}</Badge></TableCell>
                            <TableCell className="text-right font-medium">₱{fine.amount.toFixed(2)}</TableCell>
                            <TableCell>{statusBadge(fine.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{safeFormatDate(fine.created_at)}</TableCell>
                          </TableRow>
                        ))}
                        {filteredFines.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No fines found</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {selectedReport === 'inventory' && booksLoading && (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              )}
              {selectedReport === 'inventory' && !booksLoading && (
                <div className="p-4">
                  <div className="grid gap-4 grid-cols-2 mb-4">
                    <Card className="library-card">
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground font-medium">Total Titles</p>
                        <p className="text-3xl font-display font-bold mt-1">{(booksData?.data || []).length}</p>
                      </CardContent>
                    </Card>
                    <Card className="library-card">
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground font-medium">Total Copies</p>
                        <p className="text-3xl font-display font-bold text-primary mt-1">
                          {(booksData?.data || []).reduce((sum, book) => sum + book.totalCopies, 0)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="grid gap-4 grid-cols-2 mb-6">
                    <Card 
                      className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", inventoryFilter === 'available' ? 'ring-2 ring-success bg-success/5' : '')}
                      onClick={() => setInventoryFilter(inventoryFilter === 'available' ? 'all' : 'available')}
                    >
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground font-medium">Available Copies</p>
                        <p className="text-3xl font-display font-bold text-success mt-1">
                          {(booksData?.data || []).reduce((sum, book) => sum + book.availableCopies, 0)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card 
                      className={cn("library-card cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", inventoryFilter === 'low_stock' ? 'ring-2 ring-destructive bg-destructive/5' : '')}
                      onClick={() => setInventoryFilter(inventoryFilter === 'low_stock' ? 'all' : 'low_stock')}
                    >
                      <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground font-medium">Low Stock / Unavailable</p>
                        <p className="text-3xl font-display font-bold text-destructive mt-1">
                          {(booksData?.data || []).filter(book => book.availableCopies === 0).length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50"><TableHead>Title</TableHead><TableHead>Author</TableHead><TableHead>Category</TableHead><TableHead>ISBN</TableHead><TableHead className="text-center">Total</TableHead><TableHead className="text-center">Available</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {filteredInventory.map((book) => (
                          <TableRow key={book.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              <button 
                                className="hover:underline text-primary text-left"
                                onClick={() => navigate(`/admin/books?search=${encodeURIComponent(book.title)}`)}
                              >
                                {book.title}
                              </button>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">{book.author}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal">{book.category}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{book.isbn || '—'}</TableCell>
                            <TableCell className="text-center font-medium">{book.totalCopies}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={book.availableCopies > 0 ? 'default' : 'destructive'} className={book.availableCopies > 0 ? 'bg-success hover:bg-success/90' : ''}>
                                {book.availableCopies}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{book.shelfLocation || '—'}</TableCell>
                          </TableRow>
                        ))}
                        {filteredInventory.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No books found</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {selectedReport === 'usage' && (
                <div className="p-4">
                  <div className="grid gap-6 md:grid-cols-2 mb-6">
                    <Card className="library-card">
                      <CardHeader>
                        <CardTitle className="font-display flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" /> Most Borrowed
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topBorrowed.length > 0 ? (
                          <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={topBorrowed.slice(0, 8)} layout="vertical">
                              <XAxis type="number" fontSize={12} />
                              <YAxis type="category" dataKey="name" fontSize={11} width={140} tick={{ fontSize: 11 }} />
                              <Tooltip />
                              <Bar dataKey="value" fill={chartColors.primary} name="Borrows" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : <p className="text-center py-8 text-muted-foreground">No data</p>}
                      </CardContent>
                    </Card>

                    <Card className="library-card">
                      <CardHeader>
                        <CardTitle className="font-display">Ranking</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topBorrowed.length > 0 ? (
                          <div className="space-y-2">
                            {topBorrowed.slice(0, 10).map((book, i) => (
                              <div key={`${book.name}-${i}`} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                                <div className={cn(
                                  'h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm',
                                  i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                                )}>
                                  {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{book.name}</p>
                                </div>
                                <div className="flex items-center gap-1 text-sm font-bold">
                                  {book.value} <Users className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-center py-8 text-muted-foreground">No data</p>}
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50"><TableHead>Rank</TableHead><TableHead>Book Title</TableHead><TableHead className="text-center">Times Borrowed</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {topBorrowed.map((book, index) => (
                          <TableRow key={`top-${book.name}-${index}`}>
                            <TableCell className="font-bold text-muted-foreground">#{index + 1}</TableCell>
                            <TableCell className="font-medium">
                          <button 
                            className="hover:underline text-primary text-left"
                            onClick={() => navigate(`/admin/books?search=${encodeURIComponent(book.name)}`)}
                          >
                            {book.name}
                          </button>
                        </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className="font-mono">{book.value}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {topBorrowed.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No borrowing data</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminReports;
