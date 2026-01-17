import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  User,
  Mail,
  Hash,
  GraduationCap,
  Users,
  Phone,
  BookOpen,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useMyProfile, useStudentLoans, useStudentHistory, useStudentFines } from '@/hooks/useStudents';
import { useRenew } from '@/hooks/useCirculation';
import { StudentFine } from '@/services/students';

const StudentAccount = () => {
  const [payFineModalOpen, setPayFineModalOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState<StudentFine | null>(null);

  const { data: profileResponse, isLoading: profileLoading } = useMyProfile();
  const profile = profileResponse?.data;

  const { data: loansResponse, isLoading: loansLoading } = useStudentLoans(profile?.id || '');
  const { data: historyResponse, isLoading: historyLoading } = useStudentHistory(profile?.id || '');
  const { data: finesResponse, isLoading: finesLoading } = useStudentFines(profile?.id || '');

  const renewLoan = useRenew();

  const activeLoans = loansResponse?.data?.filter(l => l.status === 'borrowed' || l.status === 'overdue') || [];
  const history = historyResponse?.data?.filter(l => l.status === 'returned') || [];
  const myFines = finesResponse?.data || [];
  const pendingFines = myFines.filter(f => f.status === 'pending');
  const totalPending = pendingFines.reduce((acc, f) => acc + f.amount, 0);

  const handlePayFine = (fine: StudentFine) => {
    setSelectedFine(fine);
    setPayFineModalOpen(true);
  };

  const confirmPayment = () => {
    toast({
      title: "Payment Initiated",
      description: `Please proceed to the library counter to complete your ₱${selectedFine?.amount.toFixed(2)} payment.`,
    });
    setPayFineModalOpen(false);
    setSelectedFine(null);
  };

  const handleRenew = (transactionId: string) => {
    renewLoan.mutate(transactionId);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'borrowed':
        return <Badge variant="secondary">Active</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'returned':
        return <Badge className="bg-green-600 hover:bg-green-700">Returned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (profileLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">Unable to load profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          My Account
        </h1>
        <p className="text-muted-foreground mt-1">
          View your account information and borrowing history
        </p>
      </div>

      {/* Account Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="font-medium">{profile.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Student ID</p>
                <p className="font-medium">{profile.studentId}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-sm">{profile.email || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Grade Level</p>
                <p className="font-medium">Grade {profile.gradeLevel}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Section</p>
                <p className="font-medium">{profile.section}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Guardian Contact</p>
                <p className="font-medium">{profile.guardianContact || 'N/A'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for History and Fines */}
      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Current Loans ({activeLoans.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Borrowing History
          </TabsTrigger>
          <TabsTrigger value="fines" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Fines ({pendingFines.length})
          </TabsTrigger>
        </TabsList>

        {/* Current Loans Tab */}
        <TabsContent value="current">
          <Card>
            <CardContent className="p-0">
              {loansLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : activeLoans.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No current loans</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Checkout Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Renewals</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{loan.bookTitle}</p>
                            <p className="text-xs text-muted-foreground">{loan.bookAuthor}</p>
                          </div>
                        </TableCell>
                        <TableCell>{loan.checkoutDate ? format(parseISO(loan.checkoutDate), 'MMM dd, yyyy') : '-'}</TableCell>
                        <TableCell>{loan.dueDate ? format(parseISO(loan.dueDate), 'MMM dd, yyyy') : '-'}</TableCell>
                        <TableCell>{loan.renewCount} / 2</TableCell>
                        <TableCell>{getStatusBadge(loan.status)}</TableCell>
                        <TableCell className="text-right">
                          {loan.status === 'borrowed' && loan.renewCount < 2 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRenew(loan.id)}
                              disabled={renewLoan.isPending}
                            >
                              Renew
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Borrowing History Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No borrowing history yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Checkout Date</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{loan.bookTitle}</p>
                            <p className="text-xs text-muted-foreground">{loan.bookAuthor}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {loan.checkoutDate ? format(parseISO(loan.checkoutDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {loan.returnDate ? format(parseISO(loan.returnDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fines Tab */}
        <TabsContent value="fines">
          <div className="space-y-4">
            {/* Total Pending Fines Alert */}
            {totalPending > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="font-semibold text-destructive">Total Pending Fines</p>
                        <p className="text-2xl font-bold">₱{totalPending.toFixed(2)}</p>
                      </div>
                    </div>
                    <Button variant="destructive" onClick={() => {
                      toast({
                        title: "Pay All Fines",
                        description: "Please proceed to the library counter to pay your fines.",
                      });
                    }}>
                      Pay All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fines Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fine History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {finesLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : myFines.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500/30 mb-3" />
                    <p className="text-muted-foreground">No fines on record</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Book</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myFines.map((fine) => (
                        <TableRow key={fine.id}>
                          <TableCell>
                            <p className="font-medium">{fine.bookTitle || 'N/A'}</p>
                          </TableCell>
                          <TableCell>{fine.reason}</TableCell>
                          <TableCell className="font-semibold">
                            ₱{fine.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {fine.createdAt ? format(parseISO(fine.createdAt), 'MMM dd, yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            {fine.status === 'paid' ? (
                              <Badge className="bg-green-600 hover:bg-green-700">Paid</Badge>
                            ) : (
                              <Badge variant="destructive">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {fine.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePayFine(fine)}
                              >
                                Pay
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Pay Fine Modal */}
      <Dialog open={payFineModalOpen} onOpenChange={setPayFineModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Fine</DialogTitle>
            <DialogDescription>
              Confirm your fine payment
            </DialogDescription>
          </DialogHeader>

          {selectedFine && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Amount to Pay</p>
                <p className="text-3xl font-bold text-primary">₱{selectedFine.amount.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground mt-2">{selectedFine.reason}</p>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>To complete payment:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Proceed to the library counter</li>
                  <li>Present your student ID</li>
                  <li>Pay the exact amount</li>
                </ol>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayFineModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmPayment}>Confirm & Get Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentAccount;
