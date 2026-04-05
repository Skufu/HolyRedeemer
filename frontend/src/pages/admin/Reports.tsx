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
import { exportToPDF, exportToExcel, filterByDateRange, type ExportColumn } from '@/utils/reportExport';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend } from 'recharts';
import { cn } from '@/lib/utils';

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
  const { toast } = useToast();

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
  const studentsByGrade = overview?.studentsByGrade || [];
  const loansByGrade = overview?.loansByGrade || [];
  const overdueByGrade = overview?.overdueByGrade || [];
  const finesByGrade = overview?.finesByGrade || [];
  const circulationStatus = overview?.circulationStatus || [];
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

  // Chart data preparation
  const gradeLevels = [7, 8, 9, 10, 11, 12];
  const yearLevelChartData = gradeLevels.map(grade => ({
    gradeLevel: `Grade ${grade}`,
    students: studentsByGrade.find(s => s.grade_level === grade)?.count || 0,
    activeLoans: loansByGrade.find(l => l.grade_level === grade)?.count || 0,
    overdue: overdueByGrade.find(o => o.grade_level === grade)?.count || 0,
    fines: Math.round(finesByGrade.find(f => f.grade_level === grade)?.total_amount || 0),
  }));

  const circulationChartData = circulationStatus.map((item, index) => ({
    name: item.circulation_status,
    value: item.count,
    fill: [chartColors.primary, chartColors.success, chartColors.warning, chartColors.destructive, chartColors.info][index % 5],
  }));

  const categoryChartData = categories.map((c, i) => ({
    name: c.name,
    value: c.value,
    fill: [chartColors.primary, chartColors.secondary, chartColors.success, chartColors.warning, chartColors.info, chartColors.destructive][i % 6],
  }));

  const statCards = [
    { title: 'Total Books', value: stats?.totalBooks || 0, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Active Loans', value: stats?.currentLoans || 0, icon: BookOpen, color: 'text-info', bg: 'bg-info/10' },
    { title: 'Overdue', value: stats?.overdueBooks || 0, icon: Clock, color: 'text-destructive', bg: 'bg-destructive/10' },
    { title: 'Active Students', value: stats?.activeStudents || 0, icon: Users, color: 'text-success', bg: 'bg-success/10' },
    { title: 'Pending Fines', value: `₱${(stats?.totalFines || 0).toFixed(2)}`, icon: DollarSign, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Lost Books', value: stats?.lostBooks || 0, icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10' },
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
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {statCards.map((stat) => (
              <Card key={stat.title} className="library-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2.5 rounded-lg', stat.bg)}>
                      <stat.icon className={cn('h-5 w-5', stat.color)} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{stat.title}</p>
                      <p className="text-lg font-display font-bold">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Year Level Analytics */}
          <Card className="library-card">
            <CardHeader>
              <CardTitle className="font-display">Analytics by Year Level</CardTitle>
              <CardDescription>Student count, active loans, overdue items, and fines per grade</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yearLevelChartData}>
                  <XAxis dataKey="gradeLevel" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="students" fill={chartColors.primary} name="Students" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="activeLoans" fill={chartColors.info} name="Active Loans" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" fill={chartColors.warning} name="Overdue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fines" fill={chartColors.destructive} name="Fines (₱)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="library-card">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" /> Circulation Status
                </CardTitle>
                <CardDescription>Last 30 days transaction distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {circulationChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={circulationChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                        {circulationChartData.map((entry, i) => <Cell key={`circ-${entry.name}-${i}`} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
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
                      <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                        {categoryChartData.map((entry, i) => <Cell key={`cat-${entry.name}-${i}`} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Trends + Top Books Row */}
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
                  <TrendingUp className="h-5 w-5" /> Top Borrowed Books
                </CardTitle>
                <CardDescription>Most popular titles in the library</CardDescription>
              </CardHeader>
              <CardContent>
                {topBorrowed.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={topBorrowed} layout="vertical">
                      <XAxis type="number" fontSize={12} />
                      <YAxis type="category" dataKey="name" fontSize={11} width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill={chartColors.secondary} name="Times Borrowed" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Damage/Lost Stats */}
          {damageLostStats && (damageLostStats.damage_count > 0 || damageLostStats.lost_count > 0) && (
            <Card className="library-card">
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
        </>
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
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>ID</TableHead><TableHead>Student</TableHead><TableHead>Book</TableHead><TableHead>Checkout</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {currentLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-mono text-sm">{loan.id.slice(0, 8)}</TableCell>
                        <TableCell>{loan.studentName}</TableCell>
                        <TableCell>{loan.bookTitle}</TableCell>
                        <TableCell>{safeFormatDate(loan.checkoutDate)}</TableCell>
                        <TableCell>{safeFormatDate(loan.dueDate)}</TableCell>
                        <TableCell><Badge variant={loan.status === 'active' ? 'default' : loan.status === 'returned' ? 'secondary' : 'destructive'}>{loan.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                    {currentLoans.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
              {selectedReport === 'overdue' && !overdueLoading && (
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Student</TableHead><TableHead>Book</TableHead><TableHead>Due Date</TableHead><TableHead>Days Overdue</TableHead><TableHead>Fine</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {overdueLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>{loan.studentName}</TableCell>
                        <TableCell>{loan.bookTitle}</TableCell>
                        <TableCell>{safeFormatDate(loan.dueDate)}</TableCell>
                        <TableCell className="text-destructive font-medium">{loan.daysOverdue} days</TableCell>
                        <TableCell>₱{loan.fineAmount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {overdueLoans.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No overdue items</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
              {selectedReport === 'fines' && !finesLoading && (
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Student</TableHead><TableHead>Book</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {fines.map((fine) => (
                      <TableRow key={fine.id}>
                        <TableCell>{fine.student_name || '—'}</TableCell>
                        <TableCell>{fine.book_title || '—'}</TableCell>
                        <TableCell>{fine.fine_type}</TableCell>
                        <TableCell className="text-right font-medium">₱{fine.amount.toFixed(2)}</TableCell>
                        <TableCell><Badge variant={fine.status === 'paid' ? 'default' : fine.status === 'pending' ? 'secondary' : 'outline'}>{fine.status}</Badge></TableCell>
                        <TableCell>{safeFormatDate(fine.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {fines.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No fines found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
              {selectedReport === 'inventory' && booksLoading && (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              )}
              {selectedReport === 'inventory' && !booksLoading && (
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Title</TableHead><TableHead>Author</TableHead><TableHead>Category</TableHead><TableHead>ISBN</TableHead><TableHead className="text-center">Total</TableHead><TableHead className="text-center">Available</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(booksData?.data || []).map((book) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>{book.category}</TableCell>
                        <TableCell className="font-mono text-sm">{book.isbn || '—'}</TableCell>
                        <TableCell className="text-center">{book.totalCopies}</TableCell>
                        <TableCell className="text-center"><Badge variant={book.availableCopies > 0 ? 'default' : 'destructive'}>{book.availableCopies}</Badge></TableCell>
                        <TableCell className="text-sm">{book.shelfLocation || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {(booksData?.data || []).length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No books found</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
              {selectedReport === 'usage' && (
                <Table>
                  <TableHeader><TableRow className="bg-muted/50"><TableHead>Rank</TableHead><TableHead>Book Title</TableHead><TableHead className="text-center">Times Borrowed</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {topBorrowed.map((book, index) => (
                      <TableRow key={`top-${book.name}-${index}`}>
                        <TableCell className="font-bold text-secondary">#{index + 1}</TableCell>
                        <TableCell className="font-medium">{book.name}</TableCell>
                        <TableCell className="text-center">{book.value}</TableCell>
                      </TableRow>
                    ))}
                    {topBorrowed.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No borrowing data</TableCell></TableRow>}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminReports;
