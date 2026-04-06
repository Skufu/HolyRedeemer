import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  User,
  BookOpen,
  DollarSign,
  Clock,
  AlertTriangle,
  GraduationCap,
  Phone,
  Mail,
  Camera,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import QRScannerModal from '@/components/circulation/QRScannerModal';
import { useToast } from '@/hooks/use-toast';
import { useStudents, useStudentLoans, useStudentHistory, useStudentFines } from '@/hooks/useStudents';
import { usePayFine, useWaiveFine } from '@/hooks/useFines';
import { useRfidLookup } from '@/hooks/useCirculation';
import { motion } from 'framer-motion';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations';

import type { StudentLookup as RfidStudentLookup } from '@/services/auth';
import type { Student as ApiStudent } from '@/services/students';

type StudentDisplay = {
  id: string;
  name: string;
  studentNumber: string;
  email: string;
  gradeLevel: string;
  section: string;
  status: string;
  rfidCode?: string;
  guardianName?: string;
  guardianContact?: string;
  totalFines?: number;
  activeLoans?: number;
};

const normalizeStudent = (student: ApiStudent): StudentDisplay => ({
  id: student.id,
  name: student.name,
  studentNumber: student.student_id,
  email: student.email ?? '',
  gradeLevel: String(student.gradeLevel),
  section: student.section,
  status: student.status,
  rfidCode: student.rfid,
  guardianName: student.guardian_name,
  guardianContact: student.guardian_contact,
  totalFines: student.total_fines,
  activeLoans: student.current_loans,
});

const normalizeLookupStudent = (student: RfidStudentLookup): StudentDisplay => ({
  id: student.id,
  name: student.name,
  studentNumber: student.student_id,
  email: '',
  gradeLevel: String(student.grade_level),
  section: student.section,
  status: student.status,
  totalFines: student.total_fines,
  activeLoans: student.current_loans,
});

const StudentLookup: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentDisplay | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const rfidLookup = useRfidLookup();
  const payFine = usePayFine();
  const waiveFine = useWaiveFine();

  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    search: search.length >= 2 ? search : undefined,
    per_page: search.length >= 2 ? 8 : 50,
  });

  const { data: loansData, isLoading: loansLoading } = useStudentLoans(selectedStudent?.id || '');
  const { data: historyData, isLoading: historyLoading } = useStudentHistory(selectedStudent?.id || '', { per_page: 10 });
  const { data: finesData, isLoading: finesLoading } = useStudentFines(selectedStudent?.id || '');

  const normalizedStudents: StudentDisplay[] = (studentsData?.data ?? []).map((student) => normalizeStudent(student));
  const studentLoans = loansData?.data || [];
  const studentHistory = historyData?.data || [];
  const studentFines = finesData?.data || [];

  const activeLoans = studentLoans.filter((t: { status: string }) => t.status === 'borrowed' || t.status === 'overdue');
  const overdueLoans = studentLoans.filter((t: { status: string }) => t.status === 'overdue');
  const pendingFines = studentFines.filter((f: { status: string }) => f.status === 'pending');

  const handleQRScan = async (qrCode: string) => {
    try {
      const result = await rfidLookup.mutateAsync(qrCode);
      if (result.data?.student) {
        const student = result.data.student as RfidStudentLookup;
        const normalizedStudent = normalizeLookupStudent(student);
        setSelectedStudent(normalizedStudent);
        setSearch('');
        toast({ title: 'Student Found', description: normalizedStudent.name });
      }
    } catch {
      toast({ title: 'Not Found', description: 'No student found with this ID', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-display font-bold text-primary">Student Lookup</h1>
        <p className="text-muted-foreground">Search and view student library accounts</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, student ID, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => setScannerOpen(true)}
              variant="secondary"
              className="gap-2"
              disabled={rfidLookup.isPending}
            >
              {rfidLookup.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              Scan ID
            </Button>
          </div>

          {studentsLoading && (
            <div className="mt-4 flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {normalizedStudents.length > 0 && !selectedStudent && (
            <motion.div
              className="mt-4 border rounded-lg divide-y"
              initial="hidden"
              animate="visible"
              variants={staggerContainerVariants}
            >
              {normalizedStudents.map((student) => (
                <motion.button
                  key={student.id}
                  onClick={() => { setSelectedStudent(student); setSearch(''); }}
                  className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                  variants={staggerItemVariants}
                  whileHover={{ backgroundColor: "rgba(var(--muted), 0.8)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.studentNumber} - Grade {student.gradeLevel} - {student.section}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(student.totalFines || 0) > 0 && (
                      <Badge variant="destructive">{student.totalFines}</Badge>
                    )}
                    <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                      {student.status}
                    </Badge>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-10 w-10 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-xl font-display font-bold">{selectedStudent.name}</h2>
                      <Badge variant={selectedStudent.status === 'active' ? 'default' : 'secondary'}>
                        {selectedStudent.status}
                      </Badge>
                      {(selectedStudent.totalFines || 0) > 200 && (
                        <Badge variant="destructive">Blocked</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{selectedStudent.studentNumber}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Grade & Section</p>
                      <p className="font-medium flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        Grade {selectedStudent.gradeLevel} - {selectedStudent.section}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center gap-1 text-sm">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{selectedStudent.email}</span>
                      </p>
                    </div>
                    {selectedStudent.guardianContact && (
                      <div>
                        <p className="text-xs text-muted-foreground">Guardian Contact</p>
                        <p className="font-medium flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {selectedStudent.guardianContact}
                        </p>
                      </div>
                    )}
                    {selectedStudent.rfidCode && (
                      <div>
                        <p className="text-xs text-muted-foreground">RFID</p>
                        <p className="font-medium text-sm">{selectedStudent.rfidCode}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    onClick={() => navigate(`/librarian/circulation?student_id=${selectedStudent.id}`)}
                    className="gap-2"
                  >
                    Go to Circulation
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedStudent(null)}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card hover:bg-accent/50 transition-colors border-transparent shadow-sm">
              <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                <BookOpen className="h-6 w-6 mb-3 text-info" />
                <p className="text-3xl font-display font-bold">{activeLoans.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Active Loans</p>
              </CardContent>
            </Card>
            <Card className={`bg-card hover:bg-accent/50 transition-colors shadow-sm ${overdueLoans.length > 0 ? 'border-destructive/50 bg-destructive/5' : 'border-transparent'}`}>
              <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                <AlertTriangle className={`h-6 w-6 mb-3 ${overdueLoans.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                <p className={`text-3xl font-display font-bold ${overdueLoans.length > 0 ? 'text-destructive' : ''}`}>{overdueLoans.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Overdue</p>
              </CardContent>
            </Card>
            <Card className="bg-card hover:bg-accent/50 transition-colors border-transparent shadow-sm">
              <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                <DollarSign className="h-6 w-6 mb-3 text-warning-foreground" />
                <p className="text-3xl font-display font-bold">
                  ₱{pendingFines.reduce((a: number, f: { amount: number }) => a + f.amount, 0).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Pending Fines</p>
              </CardContent>
            </Card>
            <Card className="bg-card hover:bg-accent/50 transition-colors border-transparent shadow-sm">
              <CardContent className="pt-6 pb-6 flex flex-col items-center justify-center text-center">
                <Clock className="h-6 w-6 mb-3 text-muted-foreground" />
                <p className="text-3xl font-display font-bold">{studentHistory.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Borrowed</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="loans" className="w-full">
            <TabsList className="bg-muted/50 p-1 h-auto inline-flex rounded-lg mb-4">
              <TabsTrigger value="loans" className="gap-2 px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <BookOpen className="h-4 w-4" />
                Current Loans <span className="text-xs text-muted-foreground ml-1">({activeLoans.length})</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2 px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Clock className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="fines" className="gap-2 px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <DollarSign className="h-4 w-4" />
                Fines <span className="text-xs text-muted-foreground ml-1">({pendingFines.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="loans" className="mt-0">
              <Card className="border-transparent shadow-sm">
                <CardContent className="p-0">
                  {loansLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : activeLoans.length > 0 ? (
                    <div className="divide-y divide-border">
                      {activeLoans.map((loan) => {
                        const isOverdue = loan.status === 'overdue';
                        const daysRemaining = differenceInDays(new Date(loan.dueDate), new Date());

                        return (
                          <div
                            key={loan.id}
                            className={`p-5 transition-colors hover:bg-accent/30 ${isOverdue ? 'bg-destructive/5' : 'bg-card'}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h3 className="font-display font-semibold text-lg text-foreground mb-1">{loan.bookTitle}</h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  Borrowed: {format(new Date(loan.checkoutDate), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1.5">
                                <Badge 
                                  variant={isOverdue ? 'destructive' : 'secondary'}
                                  className={`px-3 py-1 text-xs font-medium ${!isOverdue && daysRemaining <= 3 ? 'bg-warning text-warning-foreground hover:bg-warning/90' : ''}`}
                                >
                                  {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
                                </Badge>
                                <p className="text-sm text-muted-foreground font-medium">
                                  Due: {format(new Date(loan.dueDate), 'MMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">No active loans</p>
                      <p className="text-sm mt-1">This student has returned all their books.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <Card className="border-transparent shadow-sm">
                <CardContent className="p-0">
                  {historyLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : studentHistory.length > 0 ? (
                    <div className="divide-y divide-border">
                      {studentHistory.map((txn) => (
                        <div key={txn.id} className="p-5 bg-card hover:bg-accent/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="font-display font-semibold text-lg text-foreground mb-1">{txn.bookTitle}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {format(new Date(txn.checkoutDate), 'MMM d, yyyy')} - {txn.returnDate ? format(new Date(txn.returnDate), 'MMM d, yyyy') : 'Present'}
                            </p>
                          </div>
                          <Badge variant="outline" className="w-fit bg-muted/50 text-muted-foreground px-3 py-1">Returned</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">No borrowing history</p>
                      <p className="text-sm mt-1">This student hasn't borrowed any books yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fines" className="mt-0">
              <Card className="border-transparent shadow-sm">
                <CardContent className="p-0">
                  {finesLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : studentFines.length > 0 ? (
                    <div className="divide-y divide-border">
                      {studentFines.map((fine) => (
                        <div
                          key={fine.id}
                          className={`p-5 transition-colors hover:bg-accent/30 ${fine.status === 'pending' ? 'bg-warning/5' : 'bg-card'}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <h3 className="font-display font-semibold text-lg text-foreground mb-1">{fine.bookTitle || 'Unknown Book'}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {fine.reason || fine.description || 'Fine'}
                              </p>
                            </div>
                            <div className="flex flex-col sm:items-end gap-3">
                              <div className="text-left sm:text-right flex items-center sm:block gap-3">
                                <p className="font-display font-bold text-2xl text-foreground">₱{fine.amount}</p>
                                <Badge 
                                  variant={fine.status === 'pending' ? 'destructive' : 'outline'}
                                  className={`px-3 py-1 ${fine.status === 'pending' ? '' : 'bg-muted/50 text-muted-foreground border-transparent'}`}
                                >
                                  {fine.status}
                                </Badge>
                              </div>
                              {fine.status === 'pending' && (
                                <div className="flex gap-2 w-full sm:w-auto">
                                  <Button
                                    size="sm"
                                    className="flex-1 sm:flex-none"
                                    onClick={() => {
                                      if (confirm(`Confirm payment of ₱${fine.amount}?`)) {
                                        const paymentAmount = Number(fine.amount);
                                        payFine.mutate({
                                          id: fine.id,
                                          payment: { amount: paymentAmount, payment_method: 'cash' }
                                        });
                                      }
                                    }}
                                    disabled={payFine.isPending}
                                  >
                                    Pay Fine
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 sm:flex-none"
                                    onClick={() => {
                                      const reason = prompt("Enter reason for waiving:");
                                      if (reason) {
                                        waiveFine.mutate({ id: fine.id, reason });
                                      }
                                    }}
                                    disabled={waiveFine.isPending}
                                  >
                                    Waive
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">No fines</p>
                      <p className="text-sm mt-1">This student has a clean record.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {!selectedStudent && normalizedStudents.length === 0 && !studentsLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">{search ? 'No results found' : 'No students found'}</p>
              <p>{search ? 'Try a different search term' : 'There are no students registered in the system'}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <QRScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleQRScan}
        title="Scan Student ID"
        description="Scan the student's library card or ID"
      />
    </div>
  );
};

export default StudentLookup;
