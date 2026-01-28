import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  FileText,
  FileSpreadsheet,
  BookOpen,
  Users,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBooks } from '@/hooks/useBooks';
import { useFines } from '@/hooks/useFines';
import { useOverdueLoans, useCurrentLoans } from '@/hooks/useCirculation';
import { useTopBorrowed } from '@/hooks/useDashboard';
import { format } from 'date-fns';

const safeFormatDate = (dateStr: string | undefined | null, dateFormat: string = 'MMM d, yyyy') => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? '—' : format(date, dateFormat);
};

type ReportType = 'inventory' | 'transactions' | 'overdue' | 'fines' | 'usage';

const reportTypes = [
  {
    id: 'inventory' as const,
    title: 'Inventory Report',
    description: 'Complete list of all books with availability status',
    icon: BookOpen,
  },
  {
    id: 'transactions' as const,
    title: 'Transaction Report',
    description: 'All checkout and return activities',
    icon: TrendingUp,
  },
  {
    id: 'overdue' as const,
    title: 'Overdue Report',
    description: 'Currently overdue books and borrowers',
    icon: Clock,
  },
  {
    id: 'fines' as const,
    title: 'Fines Report',
    description: 'Outstanding and collected fines',
    icon: DollarSign,
  },
  {
    id: 'usage' as const,
    title: 'Usage Statistics',
    description: 'Most borrowed books and active readers',
    icon: Users,
  },
];

const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('inventory');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  const { data: booksData, isLoading: booksLoading } = useBooks();
  const { data: currentLoansData, isLoading: loansLoading } = useCurrentLoans();
  const { data: overdueData, isLoading: overdueLoading } = useOverdueLoans();
  const { data: finesData, isLoading: finesLoading } = useFines();
  const { data: topBorrowedData, isLoading: topLoading } = useTopBorrowed(10);

  const books = booksData?.data || [];
  const currentLoans = currentLoansData?.data || [];
  const overdueLoans = overdueData?.data || [];
  const fines = finesData?.data || [];
  const topBorrowed = topBorrowedData?.data || [];

  const handleExport = (format: 'pdf' | 'excel') => {
    toast({
      title: 'Export Started',
      description: `Your ${selectedReport} report is being generated as ${format.toUpperCase()}.`,
    });
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'inventory':
        if (booksLoading) {
          return (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          );
        }
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Available</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.category?.name || '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{book.isbn || '—'}</TableCell>
                  <TableCell className="text-center">{book.total_copies}</TableCell>
                  <TableCell className="text-center">{book.available_copies}</TableCell>
                  <TableCell>{book.shelf_location || '—'}</TableCell>
                </TableRow>
              ))}
              {books.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No books found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );

      case 'transactions':
        if (loansLoading) {
          return (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          );
        }
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Transaction ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Checkout</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-mono text-sm">{loan.id.slice(0, 4)}...{loan.id.slice(-4)}</TableCell>
                  <TableCell>{loan.studentName}</TableCell>
                  <TableCell>{loan.bookTitle}</TableCell>
                  <TableCell>{safeFormatDate(loan.checkoutDate)}</TableCell>
                  <TableCell>{safeFormatDate(loan.dueDate)}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${loan.status === 'active'
                          ? 'bg-info/20 text-info-foreground'
                          : loan.status === 'returned'
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                        }`}
                    >
                      {loan.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {currentLoans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No active transactions
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );

      case 'overdue':
        if (overdueLoading) {
          return (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          );
        }
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Student</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Fine Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>{loan.studentName}</TableCell>
                  <TableCell>{loan.bookTitle}</TableCell>
                  <TableCell>{safeFormatDate(loan.dueDate)}</TableCell>
                  <TableCell className="text-destructive font-medium">
                    {loan.daysOverdue} days
                  </TableCell>
                  <TableCell>₱{loan.fineAmount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {overdueLoans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No overdue items
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );

      case 'fines':
        if (finesLoading) {
          return (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          );
        }
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Student</TableHead>
                <TableHead>Book</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fines.map((fine) => (
                <TableRow key={fine.id}>
                  <TableCell>{fine.student_name || '—'}</TableCell>
                  <TableCell>{fine.book_title || '—'}</TableCell>
                  <TableCell>{fine.fine_type}</TableCell>
                  <TableCell className="text-right font-medium">₱{fine.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${fine.status === 'paid'
                          ? 'bg-success/20 text-success'
                          : fine.status === 'pending'
                            ? 'bg-warning/20 text-warning-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                    >
                      {fine.status}
                    </span>
                  </TableCell>
                  <TableCell>{safeFormatDate(fine.created_at)}</TableCell>
                </TableRow>
              ))}
              {fines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No fines found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );

      case 'usage':
        if (topLoading) {
          return (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          );
        }
        return (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Rank</TableHead>
                <TableHead>Book Title</TableHead>
                <TableHead className="text-center">Times Borrowed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topBorrowed.map((book, index) => (
                <TableRow key={index}>
                  <TableCell className="font-bold text-secondary">#{index + 1}</TableCell>
                  <TableCell className="font-medium">{book.name}</TableCell>
                  <TableCell className="text-center">{book.value}</TableCell>
                </TableRow>
              ))}
              {topBorrowed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No borrowing data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-primary">Reports & Analytics</h1>
        <p className="text-muted-foreground">Generate and export library reports</p>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReport === report.id;

          return (
            <Card
              key={report.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-warm ${isSelected ? 'ring-2 ring-primary shadow-warm' : ''
                }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <CardContent className="p-4 text-center">
                <div
                  className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-sm">{report.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters & Export */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="font-display">
                {reportTypes.find((r) => r.id === selectedReport)?.title}
              </CardTitle>
              <CardDescription>
                {reportTypes.find((r) => r.id === selectedReport)?.description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport('pdf')} className="gap-2">
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => handleExport('excel')} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Date filters */}
          <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="startDate" className="text-sm">From:</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="endDate" className="text-sm">To:</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          {/* Report Table */}
          <div className="rounded-lg border overflow-hidden">{renderReportContent()}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
