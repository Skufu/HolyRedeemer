import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  CreditCard,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useMyProfile, useStudentFines } from '@/hooks/useStudents';
import type { StudentFine } from '@/services/students';

const StudentFees = () => {
  const { data: profileData, isLoading: profileLoading } = useMyProfile();
  const studentId = profileData?.data?.id || '';
  const { data: finesData, isLoading: finesLoading } = useStudentFines(studentId);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState<StudentFine | null>(null);
  
  const myFines = finesData?.data || [];
  const pendingFines = myFines.filter((f: StudentFine) => f.status === 'pending');
  const totalPending = pendingFines.reduce((acc: number, f: StudentFine) => acc + f.amount, 0);
  const isLoading = profileLoading || finesLoading;

  const handlePayFine = (fine: StudentFine) => {
    setSelectedFine(fine);
    setPayModalOpen(true);
  };

  const confirmPayment = () => {
    toast({
      title: "Payment Information",
      description: `Please proceed to the library counter to complete your ₱${selectedFine?.amount.toFixed(2)} payment.`,
    });
    setPayModalOpen(false);
    setSelectedFine(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Library Fees
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage your library fees
        </p>
      </div>

      <div className="space-y-4">
        {totalPending > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-semibold text-destructive">Amount Due</p>
                    <p className="text-2xl font-bold">₱{totalPending.toFixed(2)}</p>
                  </div>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    toast({
                      title: "Pay All Fees",
                      description: "Please proceed to the library counter to pay your fees.",
                    });
                  }}
                >
                  Pay All
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {myFines.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500/30 mb-3" />
            <h3 className="text-lg font-semibold mb-1">No fees on record</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Great job! You don't have any library fees. Keep returning books on time!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {myFines.map((fine: StudentFine) => (
              <Card key={fine.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${fine.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{fine.bookTitle || 'Library Fee'}</p>
                      <p className="text-sm text-muted-foreground">{fine.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fine.createdAt ? format(parseISO(fine.createdAt), 'MMM dd, yyyy') : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₱{fine.amount.toFixed(2)}</p>
                    <div className="mt-1">
                      {fine.status === 'pending' ? (
                        <Button size="sm" variant="outline" onClick={() => handlePayFine(fine)}>Pay Now</Button>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200">Paid</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Fee</DialogTitle>
            <DialogDescription>
              Confirm your fee payment
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
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmPayment}>Confirm & Get Receipt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentFees;
