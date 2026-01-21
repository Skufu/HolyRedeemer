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
    per_page: 8,
  });

  const { data: loansData, isLoading: loansLoading } = useStudentLoans(selectedStudent?.id || '');
  const { data: historyData, isLoading: historyLoading } = useStudentHistory(selectedStudent?.id || '', { per_page: 10 });
  const { data: finesData, isLoading: finesLoading } = useStudentFines(selectedStudent?.id || '');

  const normalizedStudents: StudentDisplay[] = search.length >= 2
    ? (studentsData?.data ?? []).map((student) => normalizeStudent(student))
    : [];
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

          {studentsLoading && search.length >= 2 && (
            <div className="mt-4 flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {normalizedStudents.length > 0 && !selectedStudent && (
            <div className="mt-4 border rounded-lg divide-y">
                      {normalizedStudents.slice(0, 8).map((student) => (

                <button
                  key={student.id}
                  onClick={() => { setSelectedStudent(student); setSearch(''); }}
                  className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
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
                </button>
              ))}
            </div>
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
            <Card>
              <CardContent className="pt-6 text-center">
                <BookOpen className="h-6 w-6 mx-auto mb-2 text-info" />
                <p className="text-2xl font-bold">{activeLoans.length}</p>
                <p className="text-sm text-muted-foreground">Active Loans</p>
              </CardContent>
            </Card>
            <Card className={overdueLoans.length > 0 ? 'border-destructive/50' : ''}>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${overdueLoans.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                <p className="text-2xl font-bold">{overdueLoans.length}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-warning-foreground" />
                <p className="text-2xl font-bold">
                  {pendingFines.reduce((a: number, f: { amount: number }) => a + f.amount, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Pending Fines</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{studentHistory.length}</p>
                <p className="text-sm text-muted-foreground">Total Borrowed</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="loans">
            <TabsList>
              <TabsTrigger value="loans" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Current Loans ({activeLoans.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <Clock className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="fines" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Fines ({pendingFines.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="loans" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {loansLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : activeLoans.length > 0 ? (
                    <div className="space-y-3">
                      {activeLoans.map((loan) => {
                        const isOverdue = loan.status === 'overdue';
                        const daysRemaining = differenceInDays(new Date(loan.dueDate), new Date());
                        
                        return (
                          <div 
                            key={loan.id} 
                            className={`p-4 rounded-lg border ${isOverdue ? 'border-destructive/50 bg-destructive/5' : 'bg-muted/50'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{loan.bookTitle}</p>
                                <p className="text-sm text-muted-foreground">
                                  Borrowed: {format(new Date(loan.checkoutDate), 'MMM d, yyyy')}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
                                  {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days left`}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Due: {format(new Date(loan.dueDate), 'MMM d')}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No active loans</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {historyLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : studentHistory.length > 0 ? (
                    <div className="space-y-3">
                      {studentHistory.map((txn) => (
                        <div key={txn.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{txn.bookTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(txn.checkoutDate), 'MMM d')} - {txn.returnDate && format(new Date(txn.returnDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge variant="outline">Returned</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No borrowing history</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fines" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {finesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : studentFines.length > 0 ? (
                    <div className="space-y-3">
                      {studentFines.map((fine) => (
                        <div 
                          key={fine.id} 
                          className={`p-4 rounded-lg border ${fine.status === 'pending' ? 'border-warning/50 bg-warning/5' : 'bg-muted/50'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{fine.bookTitle || 'Unknown Book'}</p>
                              <p className="text-sm text-muted-foreground">{fine.reason || fine.description || ''}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-lg">{fine.amount}</p>
                                <Badge variant={fine.status === 'pending' ? 'destructive' : 'outline'}>
                                  {fine.status}
                                </Badge>
                              </div>
                              {fine.status === 'pending' && (
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    onClick={() => {
                                      if (confirm(`Confirm payment of ₱${fine.amount}?`)) {
                                        payFine.mutate({ 
                                          id: fine.id, 
                                          payment: { amount: fine.amount, payment_method: 'cash' } 
                                        });
                                      }
                                    }}
                                    disabled={payFine.isPending}
                                  >
                                    Pay
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
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
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No fines</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {!selectedStudent && normalizedStudents.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Search for a Student</p>
              <p>Enter a name, student ID, or scan their library card</p>
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
