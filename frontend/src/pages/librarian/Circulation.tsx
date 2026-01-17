import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Keyboard
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRScannerModal from '@/components/circulation/QRScannerModal';
import { format, addDays } from 'date-fns';
import { useRfidLookup, useCheckout, useReturn } from '@/hooks/useCirculation';
import { useCopyByQRMutation, useBooks } from '@/hooks/useBooks';
import { useStudents, useStudentLoans } from '@/hooks/useStudents';
import { Book as BookType, BookCopy } from '@/services/books';

type CirculationMode = 'checkout' | 'return';

interface Student {
  id: string;
  name: string;
  student_number: string;
  grade_level: string;
  section: string;
  status: string;
  total_fines?: number;
}

interface ScannedBook {
  copy: BookCopy;
  book: BookType;
}

const Circulation: React.FC = () => {
  const [mode, setMode] = useState<CirculationMode>('checkout');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<'student' | 'book'>('student');
  
  // Selected items
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [scannedBooks, setScannedBooks] = useState<ScannedBook[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [manualBookQR, setManualBookQR] = useState('');
  
  const { toast } = useToast();

  // API hooks
  const rfidLookup = useRfidLookup();
  const copyByQRMutation = useCopyByQRMutation();
  const checkoutMutation = useCheckout();
  const returnMutation = useReturn();
  
  // Search queries
  const { data: studentsData } = useStudents({ 
    search: studentSearch, 
    per_page: 5 
  });
  const { data: booksData } = useBooks({ 
    search: bookSearch, 
    per_page: 5,
    available_only: mode === 'checkout'
  });
  
  // Get student loans when student is selected
  const { data: studentLoansData } = useStudentLoans(selectedStudent?.id || '');

  const filteredStudents = studentSearch.length >= 2 
    ? (studentsData?.data || []).slice(0, 5)
    : [];

  const filteredBooks = bookSearch.length >= 2 
    ? (booksData?.data || []).slice(0, 5)
    : [];

  const studentLoans = studentLoansData?.data || [];

  const handleQRScan = async (qrCode: string, targetOverride?: 'student' | 'book') => {
    const target = targetOverride || scanTarget;

    if (target === 'student') {
      // RFID lookup for student
      try {
        const result = await rfidLookup.mutateAsync(qrCode);
        if (result.data) {
          const student = result.data as unknown as Student;
          setSelectedStudent(student);
          toast({
            title: 'Student Found',
            description: `${student.name} (${student.student_number})`,
          });
        }
      } catch {
        // Error toast is handled by the hook
      }
    } else {
      // QR code lookup for book copy
      try {
        const result = await copyByQRMutation.mutateAsync(qrCode);
        if (result.data) {
          const { book, ...copy } = result.data;
          
          // Check if already scanned
          if (scannedBooks.some(sb => sb.copy.id === copy.id)) {
            toast({
              title: 'Already Scanned',
              description: 'This book copy has already been scanned.',
              variant: 'destructive',
            });
            return;
          }

          // For checkout mode, check if available
          if (mode === 'checkout' && copy.status !== 'available') {
            toast({
              title: 'Book Not Available',
              description: `This copy is currently ${copy.status}.`,
              variant: 'destructive',
            });
            return;
          }

          // For return mode, check if borrowed
          if (mode === 'return' && copy.status !== 'borrowed') {
            toast({
              title: 'Not Borrowed',
              description: 'This book is not currently borrowed.',
              variant: 'destructive',
            });
            return;
          }
          
          setScannedBooks(prev => [...prev, { copy, book }]);
          toast({
            title: 'Book Scanned',
            description: `${book.title} (Copy #${copy.copy_number})`,
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

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setStudentSearch('');
  };

  const handleBookSelect = async (book: BookType) => {
    if (book.available_copies <= 0) {
      toast({
        title: 'No Copies Available',
        description: 'All copies of this book are currently borrowed.',
        variant: 'destructive',
      });
      return;
    }

    // For now, just show the book info - they need to scan the actual copy QR
    toast({
      title: 'Scan Book Copy',
      description: `Please scan the QR code on a copy of "${book.title}"`,
    });
    setBookSearch('');
  };

  const removeScannedBook = (copyId: string) => {
    setScannedBooks(prev => prev.filter(sb => sb.copy.id !== copyId));
  };

  const handleCheckout = async () => {
    if (!selectedStudent || scannedBooks.length === 0) return;

    const dueDate = addDays(new Date(), 14).toISOString();
    
    // Process each book checkout
    for (const { copy } of scannedBooks) {
      try {
        await checkoutMutation.mutateAsync({
          student_id: selectedStudent.id,
          copy_id: copy.id,
          due_date: dueDate,
        });
      } catch {
        // Error is handled by the mutation hook
        return;
      }
    }
    
    // Reset after successful checkout
    setScannedBooks([]);
    setSelectedStudent(null);
  };

  const handleReturn = async () => {
    if (scannedBooks.length === 0) return;

    // Process each book return
    for (const { copy } of scannedBooks) {
      try {
        await returnMutation.mutateAsync({
          copy_id: copy.id,
        });
      } catch {
        // Error is handled by the mutation hook
        return;
      }
    }
    
    setScannedBooks([]);
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
  };

  const isProcessing = checkoutMutation.isPending || returnMutation.isPending;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checkout" className="gap-2 text-sm">
            <BookOpen className="h-4 w-4" />
            <span className="hidden xs:inline">Checkout</span>
            <span className="xs:hidden">Out</span>
          </TabsTrigger>
          <TabsTrigger value="return" className="gap-2 text-sm">
            <ArrowRightLeft className="h-4 w-4" />
            <span className="hidden xs:inline">Return</span>
            <span className="xs:hidden">In</span>
          </TabsTrigger>
        </TabsList>

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

                  {/* Search Results */}
                  {filteredStudents.length > 0 && (
                    <div className="border rounded-lg divide-y bg-card">
                      {filteredStudents.map((student: Student) => (
                        <button
                          key={student.id}
                          onClick={() => handleStudentSelect(student)}
                          className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.student_number} - Grade {student.grade_level}</p>
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
                              {selectedStudent.student_number} - {selectedStudent.section}
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
                            {selectedStudent.total_fines ? `₱${selectedStudent.total_fines}` : '₱0'}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-[10px] sm:text-xs">Status</p>
                          <Badge 
                            variant={(selectedStudent.total_fines || 0) > 200 ? 'destructive' : 'default'} 
                            className="text-[10px] sm:text-xs mt-0.5"
                          >
                            {(selectedStudent.total_fines || 0) > 200 ? 'Blocked' : 'Active'}
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
                  {filteredBooks.length > 0 && (
                    <div className="border rounded-lg divide-y bg-card">
                      {filteredBooks.map((book: BookType) => (
                        <button
                          key={book.id}
                          onClick={() => handleBookSelect(book)}
                          className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{book.title}</p>
                            <p className="text-sm text-muted-foreground">{book.author}</p>
                          </div>
                          <Badge variant={book.available_copies > 0 ? 'default' : 'secondary'}>
                            {book.available_copies} available
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Scanned Books List */}
                  {scannedBooks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs sm:text-sm font-medium">Scanned Books ({scannedBooks.length})</p>
                      <div className="space-y-2">
                        {scannedBooks.map(({ copy, book }) => (
                          <div 
                            key={copy.id}
                            className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-muted/50 border"
                          >
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-xs sm:text-sm truncate">{book.title}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                  Copy #{copy.copy_number}
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                  {selectedStudent && (selectedStudent.total_fines || 0) > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning-foreground text-sm">
                      <AlertTriangle className="h-4 w-4 mt-0.5" />
                      <div>
                        <p className="font-medium">Outstanding Fines</p>
                        <p>Student has ₱{selectedStudent.total_fines} in unpaid fines.</p>
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

        <TabsContent value="return" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Book Scanning */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  Scan Books to Return
                </CardTitle>
                <CardDescription>Scan QR codes or search by title</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
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
                    className="gap-2"
                    disabled={copyByQRMutation.isPending}
                  >
                    {copyByQRMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    Scan QR
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

                {/* Scanned Books for Return */}
                {scannedBooks.length > 0 && (
                  <div className="space-y-2">
                    {scannedBooks.map(({ copy, book }) => (
                      <div 
                        key={copy.id}
                        className="p-4 rounded-lg border bg-muted/50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{book.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Copy #{copy.copy_number} - {copy.qr_code}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeScannedBook(copy.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
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
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                  Return Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Books to Return</p>
                  <p className="text-2xl font-bold">{scannedBooks.length}</p>
                </div>

                {scannedBooks.length > 0 && (
                  <>
                    <Separator />

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
        title={scanTarget === 'student' ? 'Scan Student ID' : 'Scan Book QR Code'}
        description={
          scanTarget === 'student'
            ? 'Position the student ID card within the frame'
            : 'Position the book QR code within the frame'
        }
      />
    </div>
  );
};

export default Circulation;
