import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  QrCode,
  Search,
  BookOpen,
  User,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Camera,
  XCircle,
  Loader2,
  Keyboard,
  PartyPopper,
  Printer,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRScannerModal from '@/components/circulation/QRScannerModal';
import QRCodeDisplay from '@/components/circulation/QRCodeDisplay';
import { format, addDays } from 'date-fns';
import { useRfidLookup, useCheckout, useReturn } from '@/hooks/useCirculation';
import { useCopyByQRMutation, useBooks } from '@/hooks/useBooks';
import { useStudents, useStudentLoans, useStudent } from '@/hooks/useStudents';
import { Book as BookType, BookCopy } from '@/services/books';
import { StudentLookup as RfidStudentLookup } from '@/services/auth';
import { Student as ApiStudent } from '@/services/students';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { listItemVariants, staggerContainerVariants, fadeInUpVariants } from '@/lib/animations';

type CirculationMode = 'checkout' | 'return';

type StudentDisplay = {
  id: string;
  name: string;
  studentNumber: string;
  gradeLevel: number;
  section: string;
  status: string;
  totalFines?: number;
};

const normalizeStudent = (student: ApiStudent): StudentDisplay => ({
  id: student.id,
  name: student.name,
  studentNumber: student.student_id,
  gradeLevel: student.gradeLevel,
  section: student.section,
  status: student.status,
  totalFines: student.total_fines,
});

const normalizeLookupStudent = (student: RfidStudentLookup): StudentDisplay => ({
  id: student.id,
  name: student.name,
  studentNumber: student.student_id,
  gradeLevel: student.grade_level,
  section: student.section,
  status: student.status,
  totalFines: student.total_fines,
});

type BookSearchResult = BookType & { available_copies?: number };

type BookCopyResponse = BookCopy & { copy_number?: number; qr_code?: string };

interface ScannedBook {
  copy: BookCopy;
  book: BookType;
  /** Book condition for returns */
  returnCondition?: 'excellent' | 'good' | 'fair' | 'poor';
}

interface CheckoutResult {
  bookTitle: string;
  copyNumber: number;
  studentName: string;
  dueDate: string;
  transactionId: string;
}

interface ReturnResult {
  bookTitle: string;
  copyNumber: number;
  daysOverdue: number;
  fineAmount?: number;
  receiptNo?: string;
}

const Circulation: React.FC = () => {
  const [mode, setMode] = useState<CirculationMode>('checkout');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<'student' | 'book'>('student');
  const [searchParams] = useSearchParams();

  // Selected items
  const [selectedStudent, setSelectedStudent] = useState<StudentDisplay | null>(null);
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [manualBookQR, setManualBookQR] = useState('');
  const [manualStudentId, setManualStudentId] = useState('');

  // Success state
  const [checkoutResults, setCheckoutResults] = useState<CheckoutResult[]>([]);
  const [returnResults, setReturnResults] = useState<ReturnResult[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  const { toast } = useToast();

  // API hooks
  const rfidLookup = useRfidLookup();
  const copyByQRMutation = useCopyByQRMutation();
  const checkoutMutation = useCheckout();
  const returnMutation = useReturn();

  // URL Param Student
  const studentIdParam = searchParams.get('student_id');
  const { data: paramStudent } = useStudent(studentIdParam || '');

  useEffect(() => {
    if (paramStudent?.data) {
      const normalizedStudent = normalizeStudent(paramStudent.data);
      setSelectedStudent(normalizedStudent);
    }
  }, [paramStudent]);

  // Search queries
  const studentParams = useMemo(
    () => ({
      search: studentSearch,
      per_page: 5,
    }),
    [studentSearch],
  );

  const bookParams = useMemo(
    () => ({
      search: bookSearch,
      per_page: 5,
      available_only: mode === 'checkout',
    }),
    [bookSearch, mode],
  );

  const { data: studentsData } = useStudents(studentParams);
  const { data: booksData } = useBooks(bookParams);

  // Get student loans when student is selected
  const { data: studentLoansData } = useStudentLoans(selectedStudent?.id || '');

  const filteredStudents: ApiStudent[] = studentSearch.length >= 2
    ? studentsData?.data ?? []
    : [];

  const normalizedStudents: StudentDisplay[] = filteredStudents
    .slice(0, 5)
    .map(normalizeStudent);

  const filteredBooks = bookSearch.length >= 2
    ? (booksData?.data || []).slice(0, 5)
    : [];

  const normalizedBooks: BookType[] = filteredBooks.map((book) => ({
    ...book,
    availableCopies: (book as BookSearchResult).available_copies ?? book.availableCopies,
  }));

  const studentLoans = studentLoansData?.data || [];

  const handleQRScan = async (qrCode: string, targetOverride?: 'student' | 'book') => {
    const target = targetOverride || scanTarget;

    if (target === 'student') {
      try {
        const result = await rfidLookup.mutateAsync(qrCode);
        if (result.data?.student) {
          const student = result.data.student as RfidStudentLookup;
          const normalizedStudent = normalizeLookupStudent(student);
          setSelectedStudent(normalizedStudent);
          toast({
            title: 'Student Found',
            description: `${normalizedStudent.name} (${normalizedStudent.studentNumber})`,
          });
        }
      } catch {
        // Error toast is handled by the hook
      }
    } else {
      try {
        const result = await copyByQRMutation.mutateAsync(qrCode);
        if (result.data) {
          const { book, ...copy } = result.data as { book: BookType } & BookCopyResponse;
          const normalizedCopy: BookCopy = {
            ...copy,
            copyNumber: copy.copy_number ?? copy.copyNumber,
            qrCode: copy.qr_code ?? copy.qrCode,
          };

          // Check if already scanned
          if (scannedBooks.some(sb => sb.copy.id === normalizedCopy.id)) {
            toast({
              title: 'Already Scanned',
              description: 'This book copy has already been scanned.',
              variant: 'destructive',
            });
            return;
          }

          // For checkout mode, check if available or reserved
          if (mode === 'checkout' && normalizedCopy.status !== 'available' && normalizedCopy.status !== 'reserved') {
            toast({
              title: 'Book Not Available',
              description: `This copy is currently ${normalizedCopy.status}.`,
              variant: 'destructive',
            });
            return;
          }

          // For return mode, check if borrowed
          if (mode === 'return' && normalizedCopy.status !== 'borrowed') {
            toast({
              title: 'Not Borrowed',
              description: 'This book is not currently borrowed.',
              variant: 'destructive',
            });
            return;
          }

          setScannedBooks(prev => [...prev, {
            copy: normalizedCopy,
            book,
            returnCondition: 'good',
          }]);
          toast({
            title: 'Book Scanned',
            description: `${book.title} (Copy #${normalizedCopy.copyNumber})`,
          });
        }
      } catch {
        toast({
          title: 'Book Not Found',
          description: 'No book with this QR code was found.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleManualBookSubmit = async () => {
    if (!manualBookQR.trim()) return;
    await handleQRScan(manualBookQR.trim(), 'book');
    setManualBookQR('');
  };

  const handleManualStudentSubmit = async () => {
    const trimmed = manualStudentId.trim();
    if (!trimmed) return;
    setStudentSearch(trimmed);
    setManualStudentId('');
  };

  const handleStudentSelect = (student: StudentDisplay) => {
    setSelectedStudent(student);
    setStudentSearch('');
  };

  const handleBookSelect = async (book: BookType) => {
    try {
      // Ask backend for available copies
      const result = await copyByQRMutation.mutateAsync(book.id);

      if (!result.data) {
        toast({
          title: 'No Available Copies',
          description: 'All copies are currently borrowed.',
          variant: 'destructive',
        });
        return;
      }
      const { book: bookData, ...copy } = result.data as { book: BookType } & BookCopyResponse;

      const normalizedCopy: BookCopy = {
        ...copy,
        copyNumber: copy.copy_number ?? copy.copyNumber,
        qrCode: copy.qr_code ?? copy.qrCode,
      };

      setScannedBooks(prev => [
        ...prev,
        { copy: normalizedCopy, book: bookData },
      ]);
      toast({
        title: 'Book Added',
        description: `${bookData.title} (Copy #${normalizedCopy.copyNumber})`,
      });

      setBookSearch('');

    } catch {
      toast({
        title: 'Error',
        description: 'Failed to fetch available copy.',
        variant: 'destructive',
      });
    }
  };


  const removeScannedBook = (copyId: string) => {
    setScannedBooks(prev => prev.filter(sb => sb.copy.id !== copyId));
  };

  const updateBookCondition = (copyId: string, condition: ScannedBook['returnCondition']) => {
    setScannedBooks(prev =>
      prev.map(sb =>
        sb.copy.id === copyId ? { ...sb, returnCondition: condition } : sb
      )
    );
  };

  const handleCheckout = async () => {
    if (!selectedStudent || scannedBooks.length === 0) return;

    const dueDate = addDays(new Date(), 14).toISOString();
    const results: CheckoutResult[] = [];
    let failureCount = 0;

    for (const { copy, book } of scannedBooks) {
      try {
        const response = await checkoutMutation.mutateAsync({
          student_id: selectedStudent.id,
          copy_id: copy.id,
          due_date: dueDate,
        });
        results.push({
          bookTitle: book.title,
          copyNumber: copy.copyNumber,
          studentName: selectedStudent.name,
          dueDate: response.data.due_date,
          transactionId: response.data.transaction_id,
        });
      } catch {
        failureCount++;
      }
    }

    if (results.length > 0) {
      setCheckoutResults(results);
      setShowSuccess(true);
      setScannedBooks([]);
      if (failureCount === 0) {
        setSelectedStudent(null);
      } else {
        toast({
          title: 'Partial Checkout',
          description: `${results.length} books checked out. ${failureCount} failed.`,
          variant: 'default',
        });
      }
    }
  };

  const handleReturn = async () => {
    if (scannedBooks.length === 0) return;

    const results: ReturnResult[] = [];
    let failureCount = 0;

    for (const { copy, book, returnCondition } of scannedBooks) {
      try {
        const response = await returnMutation.mutateAsync({
          copy_id: copy.id,
          condition: returnCondition,
        });
        results.push({
          bookTitle: book.title,
          copyNumber: copy.copyNumber,
          daysOverdue: response.data.days_overdue,
          fineAmount: response.data.fine?.amount,
          receiptNo: response.data.receiptNo,
        });
      } catch {
        failureCount++;
      }
    }

    if (results.length > 0) {
      setReturnResults(results);
      setShowSuccess(true);
      setScannedBooks([]);
      if (failureCount > 0) {
        toast({
          title: 'Partial Return',
          description: `${results.length} books returned. ${failureCount} failed.`,
          variant: 'default',
        });
      }
    }
  };

  const openScanner = (target: 'student' | 'book') => {
    setScanTarget(target);
    setScannerOpen(true);
  };

  const clearAll = () => {
    setSelectedStudent(null);
    setScannedBooks([]);
    setStudentSearch('');
    setBookSearch('');
    setManualBookQR('');
    setShowSuccess(false);
    setCheckoutResults([]);
    setReturnResults([]);
  };

  const isProcessing = checkoutMutation.isPending || returnMutation.isPending;
  const prefersReducedMotion = useReducedMotion();

  // ----- Success Summary View -----
  if (showSuccess) {
    const isCheckoutSuccess = checkoutResults.length > 0;
    const results = isCheckoutSuccess ? checkoutResults : returnResults;
    const totalFines = returnResults.reduce((sum, r) => sum + (r.fineAmount || 0), 0);

    return (
      <motion.div
        className="space-y-6"
        initial={prefersReducedMotion ? 'visible' : 'hidden'}
        animate="visible"
        variants={fadeInUpVariants}
      >
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                {isCheckoutSuccess ? (
                  <PartyPopper className="h-8 w-8 text-success" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-success" />
                )}
              </div>
            </motion.div>

            <div>
              <h2 className="text-xl font-display font-bold text-success">
                {isCheckoutSuccess ? 'Checkout Complete!' : 'Return Complete!'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {results.length} {results.length === 1 ? 'book' : 'books'}{' '}
                {isCheckoutSuccess ? 'checked out' : 'returned'} successfully
              </p>
            </div>

            {/* Books list */}
            <div className="max-w-md mx-auto space-y-2">
              {isCheckoutSuccess
                ? checkoutResults.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <QRCodeDisplay
                        value={`Transaction: ${r.transactionId.slice(0, 8)}`}
                        size={40}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{r.bookTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          Copy #{r.copyNumber} · Due{' '}
                          {r.dueDate ? format(new Date(r.dueDate), 'MMM dd, yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  </div>
                ))
                : returnResults.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border text-left"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.bookTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        Copy #{r.copyNumber}
                        {r.daysOverdue > 0 && ` · ${r.daysOverdue} days overdue`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Receipt: {r.receiptNo || 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.fineAmount ? (
                        <Badge variant="destructive" className="text-xs">
                          ₱{r.fineAmount.toFixed(2)}
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          On time
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Total fines for returns */}
            {!isCheckoutSuccess && totalFines > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 max-w-md mx-auto">
                <p className="text-sm font-medium text-destructive">
                  Total Fines: ₱{totalFines.toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto mt-4">
              <Button onClick={clearAll} className="gap-2 flex-1">
                <RefreshCw className="h-4 w-4" />
                New Transaction
              </Button>
              {!isCheckoutSuccess && (
                <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 flex-1">
                      <Printer className="h-4 w-4" />
                      Print Receipt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md print:shadow-none print:border-none">
                    <DialogHeader>
                      <DialogTitle className="print:hidden">Return Receipt</DialogTitle>
                    </DialogHeader>
                    <div id="receipt-content" className="print:p-0 space-y-4">
                      <div className="text-center border-b pb-4">
                        <h2 className="font-display font-bold text-lg">Holy Redeemer School Library</h2>
                        <p className="text-sm text-muted-foreground">Return Receipt</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(), 'MMMM dd, yyyy • h:mm a')}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {returnResults.map((r, i) => (
                          <div key={i} className="border-b pb-2 last:border-b-0">
                            <p className="font-medium">{r.bookTitle}</p>
                            <p className="text-xs text-muted-foreground">Copy #{r.copyNumber}</p>
                            <p className="text-xs text-muted-foreground">Receipt No: {r.receiptNo || 'N/A'}</p>
                            {r.daysOverdue > 0 && (
                              <p className="text-xs text-destructive">{r.daysOverdue} days overdue</p>
                            )}
                            {r.fineAmount && (
                              <p className="text-xs font-medium">Fine: ₱{r.fineAmount.toFixed(2)}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {totalFines > 0 && (
                        <div className="border-t pt-2">
                          <p className="font-bold">Total Fines: ₱{totalFines.toFixed(2)}</p>
                        </div>
                      )}

                      <div className="text-center text-xs text-muted-foreground border-t pt-4">
                        <p>Thank you for returning your books!</p>
                        <p className="mt-1">Holy Redeemer School of Cabuyao</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => window.print()}
                      className="gap-2 w-full print:hidden"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ----- Main Circulation View -----
  return (
    <motion.div
      className="space-y-4 sm:space-y-6"
      initial={prefersReducedMotion ? 'visible' : 'hidden'}
      animate="visible"
      variants={fadeInUpVariants}
    >
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-primary">Circulation Station</h1>
          <p className="text-sm text-muted-foreground">Process book checkouts and returns</p>
        </div>
        <Button variant="outline" onClick={clearAll} size="sm" className="gap-2 w-fit">
          <RefreshCw className="h-4 w-4" />
          Clear All
        </Button>
      </div>

      {/* Mode Tabs */}
      <Tabs value={mode} onValueChange={(v) => { setMode(v as CirculationMode); clearAll(); }}>
        <TabsList className="h-auto p-1.5 flex gap-1 max-w-md bg-muted/50">
          <TabsTrigger value="checkout" className="flex-1 flex-col py-3 px-4 h-auto gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Checkout</span>
          </TabsTrigger>
          <TabsTrigger value="return" className="flex-1 flex-col py-3 px-4 h-auto gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            <span>Return</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================== CHECKOUT TAB ==================== */}
        <TabsContent value="checkout" className="mt-4 sm:mt-6">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column - Student & Book Selection */}
            <div className="space-y-4 sm:space-y-6">
              {/* Student Selection */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    1. Select Student
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Scan student ID or search by name</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search student..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      onClick={() => openScanner('student')}
                      variant="secondary"
                      className="gap-2 shrink-0"
                      disabled={rfidLookup.isPending}
                    >
                      {rfidLookup.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      <span className="sm:hidden">Scan</span>
                      <span className="hidden sm:inline">Scan ID</span>
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Manual Student ID (e.g. 2023-0001)"
                        value={manualStudentId}
                        onChange={(e) => setManualStudentId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleManualStudentSubmit()}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      onClick={handleManualStudentSubmit}
                      variant="secondary"
                      className="gap-2 shrink-0"
                      disabled={!manualStudentId.trim()}
                    >
                      {rfidLookup.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Keyboard className="h-4 w-4" />
                      )}
                      Submit
                    </Button>
                  </div>

                  {/* Search Results */}
                  {normalizedStudents.length > 0 && (
                    <div className="border rounded-lg divide-y bg-card">
                      {normalizedStudents.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => handleStudentSelect(student)}
                          className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.studentNumber} - Grade {student.gradeLevel}</p>
                          </div>
                          <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                            {student.status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Student */}
                  {selectedStudent && (
                    <div className="p-3 sm:p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{selectedStudent.name}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {selectedStudent.studentNumber} - {selectedStudent.section}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="shrink-0 h-8 w-8 p-0">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center text-xs sm:text-sm">
                        <div>
                          <p className="text-muted-foreground text-[10px] sm:text-xs">Loans</p>
                          <p className="font-bold text-base sm:text-lg">{studentLoans.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px] sm:text-xs">Fines</p>
                          <p className="font-bold text-base sm:text-lg text-warning-foreground">
                            {selectedStudent.totalFines ? `₱${selectedStudent.totalFines}` : '₱0'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px] sm:text-xs">Status</p>
                          <Badge
                            variant={(selectedStudent.totalFines || 0) > 200 ? 'destructive' : 'default'}
                            className="text-[10px] sm:text-xs mt-0.5"
                          >
                            {(selectedStudent.totalFines || 0) > 200 ? 'Blocked' : 'Active'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Book Selection */}
              <Card>
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
                    <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    2. Scan Books
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Scan book QR codes or search manually</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search book..."
                        value={bookSearch}
                        onChange={(e) => setBookSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      onClick={() => openScanner('book')}
                      className="gap-2 shrink-0"
                      disabled={copyByQRMutation.isPending}
                    >
                      {copyByQRMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      <span className="sm:hidden">Scan</span>
                      <span className="hidden sm:inline">Scan QR</span>
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Manual QR entry (e.g. HR-B001-C1)"
                        value={manualBookQR}
                        onChange={(e) => setManualBookQR(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleManualBookSubmit()}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      onClick={handleManualBookSubmit}
                      variant="secondary"
                      className="gap-2 shrink-0"
                      disabled={!manualBookQR.trim() || copyByQRMutation.isPending}
                    >
                      {copyByQRMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Keyboard className="h-4 w-4" />
                      )}
                      Submit
                    </Button>
                  </div>

                  {/* Book Search Results */}
                  {normalizedBooks.length > 0 && (
                    <div className="border rounded-lg divide-y bg-card">
                      {normalizedBooks.map((book) => (
                        <button
                          key={book.id}
                          onClick={() => handleBookSelect(book)}
                          className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{book.title}</p>
                            <p className="text-sm text-muted-foreground">{book.author}</p>
                          </div>
                          <Badge variant={book.availableCopies > 0 ? 'default' : 'secondary'}>
                            {book.availableCopies} available
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Scanned Books List */}
                  <AnimatePresence mode="popLayout">
                    {scannedBooks.length > 0 && (
                      <motion.div
                        className="space-y-2"
                        initial={prefersReducedMotion ? 'visible' : 'hidden'}
                        animate="visible"
                        exit="exit"
                        variants={staggerContainerVariants}
                      >
                        <p className="text-xs sm:text-sm font-medium">Scanned Books ({scannedBooks.length})</p>
                        <div className="space-y-2">
                          {scannedBooks.map(({ copy, book }) => (
                            <motion.div
                              key={copy.id}
                              layout
                              initial={prefersReducedMotion ? 'visible' : 'hidden'}
                              animate="visible"
                              exit="exit"
                              variants={listItemVariants}
                              className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50 border"
                            >
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                {/* QR Code Display */}
                                <QRCodeDisplay value={copy.qrCode} size={40} />
                                <div className="min-w-0">
                                  <p className="font-medium text-xs sm:text-sm truncate">{book.title}</p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                    Copy #{copy.copyNumber} · {copy.qrCode}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeScannedBook(copy.id)}
                                className="shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary & Confirm */}
            <div>
              <Card className="lg:sticky lg:top-6">
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                    Checkout Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                  {/* Student Info */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Borrower</p>
                    {selectedStudent ? (
                      <p className="font-medium text-sm sm:text-base truncate">{selectedStudent.name}</p>
                    ) : (
                      <p className="text-muted-foreground italic text-sm">No student selected</p>
                    )}
                  </div>

                  {/* Books List */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                      Books ({scannedBooks.length})
                    </p>
                    {scannedBooks.length > 0 ? (
                      <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {scannedBooks.map(({ book, copy }) => (
                          <li key={copy.id} className="text-xs sm:text-sm flex items-center gap-2">
                            <BookOpen className="h-3 w-3 shrink-0" />
                            <span className="truncate">{book.title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground italic text-xs sm:text-sm">No books scanned</p>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Due Date</p>
                    <p className="font-medium text-sm sm:text-base flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {format(addDays(new Date(), 14), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">14-day loan period</p>
                  </div>

                  <Separator />

                  {/* Warnings */}
                  {selectedStudent && (selectedStudent.totalFines || 0) > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning-foreground text-sm">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <div>
                        <p className="font-medium">Outstanding Fines</p>
                        <p>Student has ₱{selectedStudent.totalFines} in unpaid fines.</p>
                      </div>
                    </div>
                  )}

                  {/* Checkout Button */}
                  <Button
                    onClick={handleCheckout}
                    disabled={!selectedStudent || scannedBooks.length === 0 || isProcessing}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )}
                    Complete Checkout
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ==================== RETURN TAB ==================== */}
        <TabsContent value="return" className="mt-4 sm:mt-6">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Book Scanning */}
            <Card>
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
                  <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Scan Books to Return
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Scan QR codes or search by title</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title or ISBN..."
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    onClick={() => openScanner('book')}
                    className="gap-2 shrink-0"
                    disabled={copyByQRMutation.isPending}
                  >
                    {copyByQRMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    <span className="sm:hidden">Scan</span>
                    <span className="hidden sm:inline">Scan QR</span>
                  </Button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Manual QR entry (e.g. HR-B001-C1)"
                      value={manualBookQR}
                      onChange={(e) => setManualBookQR(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualBookSubmit()}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    onClick={handleManualBookSubmit}
                    variant="secondary"
                    className="gap-2 shrink-0"
                    disabled={!manualBookQR.trim() || copyByQRMutation.isPending}
                  >
                    {copyByQRMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Keyboard className="h-4 w-4" />
                    )}
                    Submit
                  </Button>
                </div>

                {/* Scanned Books for Return — with condition selector */}
                {scannedBooks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium">
                      Books to Return ({scannedBooks.length})
                    </p>
                    {scannedBooks.map(({ copy, book, returnCondition }) => (
                      <div
                        key={copy.id}
                        className="p-3 sm:p-4 rounded-lg border bg-muted/50 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <QRCodeDisplay value={copy.qrCode} size={48} />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{book.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Copy #{copy.copyNumber} · {copy.qrCode}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeScannedBook(copy.id)}
                            className="shrink-0 h-7 w-7 p-0"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Condition Selector */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            Condition:
                          </span>
                          <Select
                            value={returnCondition || 'good'}
                            onValueChange={(v) =>
                              updateBookCondition(
                                copy.id,
                                v as ScannedBook['returnCondition']
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="excellent">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  Excellent
                                </span>
                              </SelectItem>
                              <SelectItem value="good">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  Good
                                </span>
                              </SelectItem>
                              <SelectItem value="fair">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  Fair
                                </span>
                              </SelectItem>
                              <SelectItem value="poor">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-red-500" />
                                  Poor
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {scannedBooks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArrowRightLeft className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Scan book QR codes to process returns</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Return Summary */}
            <Card className="lg:sticky lg:top-6 h-fit">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-3">
                <CardTitle className="text-base sm:text-lg font-display flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Return Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Books to Return</p>
                  <p className="text-2xl font-bold">{scannedBooks.length}</p>
                </div>

                {scannedBooks.length > 0 && (
                  <div className="p-2.5 sm:p-3 rounded-lg bg-muted/50">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">Book List</p>
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {scannedBooks.map(({ book, copy, returnCondition }) => (
                        <li key={copy.id} className="text-xs sm:text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2 truncate">
                            <BookOpen className="h-3 w-3 shrink-0" />
                            <span className="truncate">{book.title}</span>
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] ml-2 shrink-0"
                          >
                            {returnCondition || 'good'}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {scannedBooks.length > 0 && (
                  <>
                    <Separator />

                    {/* Poor condition warning */}
                    {scannedBooks.some(sb => sb.returnCondition === 'poor') && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Damaged Books</p>
                          <p className="text-xs">
                            {scannedBooks.filter(sb => sb.returnCondition === 'poor').length} book(s) marked as poor condition will be set to damaged status.
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleReturn}
                      className="w-full gap-2"
                      size="lg"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                      Process Return
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* QR Scanner Modal */}
      <QRScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQRScan}
        continuous={scanTarget === 'book'}
        title={scanTarget === 'student' ? 'Scan Student ID' : 'Scan Book QR Code'}
        description={
          scanTarget === 'student'
            ? 'Position the student ID card within the frame'
            : 'Position the book QR code within the frame'
        }
      />
    </motion.div>
  );
};

export default Circulation;
