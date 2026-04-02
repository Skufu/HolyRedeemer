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
import { useOverview, useCategoryUsageByGradeLevel, useTopBorrowedByGradeLevel, useMonthlyTrendsByYear } from '@/hooks/useDashboard';
import { useOverdueLoans, useCurrentLoans } from '@/hooks/useCirculation';
import { useFines } from '@/hooks/useFines';
import { useDamageLostIncidents } from '@/hooks/useDamageLost';
import { exportToPDF, exportToExcel, type ExportColumn } from '@/utils/reportExport';
import { DamageLostIncident } from '@/services/damage_lost';
import { cn } from '@/lib/utils';
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

type ReportTab = 'daily' | 'overdue' | 'fines' | 'popular' | 'students' | 'inventory' | 'damage' | 'advanced';

const LibrarianReports: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<ReportTab>('daily');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const { data: overviewData, isLoading: overviewLoading } = useOverview();
  const { data: overdueData, isLoading: overdueLoading } = useOverdueLoans({ enabled: selectedTab === 'overdue' });
  const { data: currentLoansData } = useCurrentLoans({ enabled: selectedTab === 'daily' });
  const { data: finesData, isLoading: finesLoading } = useFines({ enabled: selectedTab === 'fines' });
  const { data: incidentsData } = useDamageLostIncidents({ per_page: 100, enabled: selectedTab === 'damage' });
  
  // Advanced Analytics hooks
  const { data: categoryUsageData, isLoading: categoryUsageLoading } = useCategoryUsageByGradeLevel();
  const { data: topBorrowedByGradeData, isLoading: topBorrowedByGradeLoading } = useTopBorrowedByGradeLevel();
  const { data: monthlyTrendsData, isLoading: monthlyTrendsLoading } = useMonthlyTrendsByYear();

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

  const filteredOverdue = overdueList.filter(l =>
    !searchTerm || l.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || l.bookTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredFines = finesList.filter(f =>
    !searchTerm || (f.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (f.book_title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = (fmt: 'pdf' | 'excel') => {
    try {
      let title = '';
      let columns: ExportColumn[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rows: Record<string, any>[] = [];
      const sfmt = (d: string | undefined | null) => safeFormatDate(d, 'MMM d, yyyy');

      switch (selectedTab) {
        case 'daily':
          title = 'Daily Operations Report';
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
    { id: 'daily' as const, label: 'Daily Operations', icon: Calendar },
    { id: 'overdue' as const, label: 'Overdue Books', icon: AlertTriangle },
    { id: 'fines' as const, label: 'Fines', icon: DollarSign },
    { id: 'popular' as const, label: 'Popular Books', icon: TrendingUp },
    { id: 'students' as const, label: 'By Grade Level', icon: Users },
    { id: 'inventory' as const, label: 'Inventory', icon: BookOpen },
    { id: 'damage' as const, label: 'Damage & Lost', icon: ShieldAlert },
    { id: 'advanced' as const, label: 'Advanced Analytics', icon: BarChart3 },
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

      {/* Daily Operations */}
      {selectedTab === 'daily' && (
        <div className="space-y-6">
          {/* Big Stat Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Checkouts Today', value: stats?.checkoutsToday ?? 0, icon: ArrowUpRight, color: 'text-success', bg: 'bg-success/10' },
              { label: 'Returns Today', value: stats?.returnsToday ?? 0, icon: ArrowDownRight, color: 'text-info', bg: 'bg-info/10' },
              { label: 'Due Today', value: stats?.dueToday ?? 0, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Overdue', value: stats?.overdueBooks ?? 0, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
            ].map(card => (
              <Card key={card.label} className="library-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                      <p className="text-4xl font-display font-bold mt-2">{card.value}</p>
                    </div>
                    <div className={cn('p-4 rounded-2xl', card.bg)}>
                      <card.icon className={cn('h-7 w-7', card.color)} />
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
                <CardTitle className="font-display">Books by Category</CardTitle>
                <CardDescription>Collection distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {categories.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={categories.map(c => ({ name: c.name, value: c.value }))} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
                        {categories.map((_, i) => <Cell key={i} fill={[chartColors.primary, chartColors.secondary, chartColors.success, chartColors.warning, chartColors.info, chartColors.destructive][i % 6]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-8 text-muted-foreground">No data</p>}
              </CardContent>
            </Card>

            <Card className="library-card">
              <CardHeader>
                <CardTitle className="font-display">Activity by Grade Level</CardTitle>
                <CardDescription>Active loans per grade</CardDescription>
              </CardHeader>
              <CardContent>
                {loansByGrade.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={[7, 8, 9, 10, 11, 12].map(g => ({
                      grade: `G${g}`,
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
                ) : <p className="text-center py-8 text-muted-foreground">No data</p>}
              </CardContent>
            </Card>
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
                    { label: 'Total Books', value: stats?.totalBooks ?? 0, icon: BookOpen },
                    { label: 'Total Copies', value: stats?.totalCopies ?? 0, icon: TrendingUp },
                    { label: 'Active Students', value: stats?.activeStudents ?? 0, icon: Users },
                    { label: 'Pending Fines', value: `₱${(stats?.totalFines ?? 0).toFixed(2)}`, icon: DollarSign },
                    { label: 'Lost Books', value: stats?.lostBooks ?? 0, icon: ShieldAlert },
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
                      <TableCell className="font-medium max-w-[200px] truncate">{loan.bookTitle}</TableCell>
                      <TableCell>{loan.studentName}</TableCell>
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
      )}

      {/* Fines */}
      {selectedTab === 'fines' && (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-3">
            <Card className="library-card">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium">Pending</p>
                <p className="text-3xl font-display font-bold text-warning mt-1">₱{totalPendingAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{pendingFines.length} outstanding</p>
              </CardContent>
            </Card>
            <Card className="library-card">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-medium">Collected</p>
                <p className="text-3xl font-display font-bold text-success mt-1">₱{totalPaidAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">{paidFines.length} paid</p>
              </CardContent>
            </Card>
            <Card className="library-card">
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
                        <TableCell className="font-medium">{fine.student_name || '—'}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{fine.book_title || '—'}</TableCell>
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
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Loans</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-right">Fines</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[7, 8, 9, 10, 11, 12].map(g => (
                    <TableRow key={g}>
                      <TableCell className="font-medium">Grade {g}</TableCell>
                      <TableCell className="text-right">{studentsByGrade.find(s => s.grade_level === g)?.count || 0}</TableCell>
                      <TableCell className="text-right">{loansByGrade.find(l => l.grade_level === g)?.count || 0}</TableCell>
                      <TableCell className="text-right">
                        {(() => { const c = overdueByGrade.find(o => o.grade_level === g)?.count || 0; return c > 0 ? <Badge variant="destructive">{c}</Badge> : '0'; })()}
                      </TableCell>
                      <TableCell className="text-right font-medium">₱{(finesByGrade.find(f => f.grade_level === g)?.total_amount || 0).toFixed(2)}</TableCell>
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
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: [chartColors.primary, chartColors.secondary, chartColors.success, chartColors.warning, chartColors.info, chartColors.destructive][i % 6] }} />
                            {cat.name}
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
                    <Pie data={categories.map(c => ({ name: c.name, value: c.value }))} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value">
                      {categories.map((_, i) => <Cell key={i} fill={[chartColors.primary, chartColors.secondary, chartColors.success, chartColors.warning, chartColors.info, chartColors.destructive][i % 6]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
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
                        <TableCell className="max-w-[180px] truncate font-medium">{i.book_title || '—'}</TableCell>
                        <TableCell>{i.student_name || '—'}</TableCell>
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

      {/* Advanced Analytics */}
      {selectedTab === 'advanced' && (
        <div className="space-y-6">
          {categoryUsageLoading || topBorrowedByGradeLoading || monthlyTrendsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="library-card">
                  <CardHeader>
                    <CardTitle className="font-display">Category Usage by Grade Level</CardTitle>
                    <CardDescription>Which categories each grade borrows most</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {categoryUsageData?.data && categoryUsageData.data.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={categoryUsageData.data}>
                          <XAxis dataKey="category" fontSize={11} angle={-45} textAnchor="end" height={80} />
                          <YAxis fontSize={12} />
                          <Tooltip formatter={(value: number) => [value, 'Borrows']} />
                          <Legend />
                          {[7, 8, 9, 10, 11, 12].map(grade => (
                            <Bar
                              key={grade}
                              dataKey={(entry: { grade_level: number; borrow_count: number }) => entry.grade_level === grade ? entry.borrow_count : 0}
                              name={`Grade ${grade}`}
                              fill={[chartColors.primary, chartColors.secondary, chartColors.success, chartColors.warning, chartColors.info, chartColors.destructive][grade - 7]}
                              radius={[4, 4, 0, 0]}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <p className="text-center py-8 text-muted-foreground">No category usage data</p>}
                  </CardContent>
                </Card>

                <Card className="library-card">
                  <CardHeader>
                    <CardTitle className="font-display">Top Borrowed Books by Grade</CardTitle>
                    <CardDescription>Most popular titles per grade level</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topBorrowedByGradeData?.data && topBorrowedByGradeData.data.length > 0 ? (
                      <div className="space-y-4">
                        {[7, 8, 9, 10, 11, 12].map(grade => {
                          const gradeBooks = topBorrowedByGradeData.data.filter(b => b.grade_level === grade).slice(0, 3);
                          return gradeBooks.length > 0 ? (
                            <div key={grade} className="p-3 rounded-lg bg-muted/30">
                              <p className="text-sm font-semibold mb-2">Grade {grade}</p>
                              <div className="space-y-1">
                                {gradeBooks.map((book, i) => (
                                  <div key={`${grade}-${book.title}-${i}`} className="flex items-center justify-between text-sm">
                                    <span className="truncate max-w-[200px]">{book.title}</span>
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
              </div>

              <Card className="library-card">
                <CardHeader>
                  <CardTitle className="font-display">Monthly Trends by Year</CardTitle>
                  <CardDescription>Checkout and return patterns across years</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyTrendsData?.data && monthlyTrendsData.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={monthlyTrendsData.data}>
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        {Array.from(new Set(monthlyTrendsData.data.map(d => d.year))).sort().map((year, i) => (
                          <Line
                            key={year}
                            type="monotone"
                            dataKey={(entry: { year: number; checkouts: number }) => entry.year === year ? entry.checkouts : undefined}
                            name={`${year} Checkouts`}
                            stroke={[chartColors.primary, chartColors.secondary, chartColors.success, chartColors.warning, chartColors.info][i % 5]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        ))}
                        {Array.from(new Set(monthlyTrendsData.data.map(d => d.year))).sort().map((year, i) => (
                          <Line
                            key={`${year}-returns`}
                            type="monotone"
                            dataKey={(entry: { year: number; returns: number }) => entry.year === year ? entry.returns : undefined}
                            name={`${year} Returns`}
                            stroke={[chartColors.primary, chartColors.secondary, chartColors.success, chartColors.warning, chartColors.info][i % 5]}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 3 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="text-center py-8 text-muted-foreground">No monthly trends data</p>}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LibrarianReports;
