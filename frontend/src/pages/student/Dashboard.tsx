import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { useMyProfile, useStudentLoans, useStudentFines, useStudentHistory } from '@/hooks/useStudents';
import { useRenew } from '@/hooks/useCirculation';
import { StudentLoan } from '@/services/students';
import BookCover from '@/components/BookCover';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const renewLoan = useRenew();

  // First fetch the student profile to get the student ID
  const { data: profileData, isLoading: profileLoading } = useMyProfile();
  const studentId = profileData?.data?.id || '';

  const { data: loansData, isLoading: loansLoading } = useStudentLoans(studentId);
  const { data: finesData, isLoading: finesLoading } = useStudentFines(studentId);
  const { data: historyData, isLoading: historyLoading } = useStudentHistory(studentId, { per_page: 4 });

  const myLoans = loansData?.data || [];
  const myFines = finesData?.data || [];
  const myHistory = historyData?.data || [];

  const activeLoans = myLoans.filter((t: { status: string }) => t.status === 'borrowed' || t.status === 'overdue');
  const pendingFines = myFines.filter((f: { status: string }) => f.status === 'pending');
  const totalPendingFines = pendingFines.reduce((acc: number, f: { amount: number }) => acc + f.amount, 0);

  const booksReadThisYear = myHistory.length;
  const requiredBooks = 12;
  const quotaProgress = Math.min(Math.round((booksReadThisYear / requiredBooks) * 100), 100);
  const maxBooksPerStudent = 3;
  const availableSlots = Math.max(0, maxBooksPerStudent - activeLoans.length);

  const isLoading = profileLoading || loansLoading || finesLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading your library info...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-10">
      {/* Hero Section - Purpose & Welcome */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-3xl p-6 md:p-10 border border-primary/10 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <Badge variant="secondary" className="mb-2 bg-background/50 text-primary border-primary/20 backdrop-blur-sm">
              👋 Welcome Back
            </Badge>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground tracking-tight">
              Hello, <span className="text-primary">{user?.name?.split(' ')[0] || 'Student'}</span>!
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Ready for your next adventure? Search the catalog to find exciting new books to read.
            </p>
            
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" className="rounded-full h-12 px-6 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all" asChild>
                <Link to="/student/catalog">
                  <Search className="mr-2 h-5 w-5" />
                  Find Books to Read
                </Link>
              </Button>
              {activeLoans.length > 0 && (
                 <Button variant="outline" size="lg" className="rounded-full h-12 px-6 bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-background/80" onClick={() => {
                   document.getElementById('my-books')?.scrollIntoView({ behavior: 'smooth' });
                 }}>
                   View My Books
                 </Button>
              )}
            </div>
          </div>
          
          <div className="hidden md:block opacity-10 absolute right-0 bottom-[-50px] pointer-events-none">
            <BookOpen className="h-80 w-80" />
          </div>
        </div>
      </section>

      {/* Urgent Alerts - Fines */}
      {totalPendingFines > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-white shadow-sm shrink-0">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-destructive">Unpaid Fines</h3>
              <p className="text-muted-foreground">
                You have an amount to pay of <span className="font-bold text-foreground">₱{totalPendingFines.toFixed(2)}</span>. Please visit the librarian.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: My Books (Priority) */}
        <div className="lg:col-span-2 space-y-6" id="my-books">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-display flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              My Books
            </h2>
            <span className="text-sm bg-secondary/20 px-3 py-1 rounded-full font-medium text-secondary-foreground">
              {activeLoans.length} of {maxBooksPerStudent} borrowed
            </span>
          </div>

          {activeLoans.length === 0 ? (
            <Card className="border-dashed border-2 shadow-none bg-muted/20">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-primary/10 p-4 rounded-full mb-4">
                  <BookOpen className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No books borrowed yet</h3>
                <p className="text-muted-foreground max-w-xs mb-6">
                  You have {availableSlots} empty slots! Check out the catalog to find something interesting.
                </p>
                <Button asChild>
                  <Link to="/student/catalog">Browse Library Catalog</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeLoans.map((loan: StudentLoan) => {
                const daysUntilDue = loan.dueDate ? differenceInDays(new Date(loan.dueDate), new Date()) : 0;
                const isOverdue = loan.status === 'overdue' || daysUntilDue < 0;
                const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0;

                return (
                  <Card key={loan.id} className={`overflow-hidden transition-all hover:shadow-md ${isOverdue ? 'border-destructive/50 ring-1 ring-destructive/20' : ''}`}>
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row">
                        {/* Book Cover */}
                        <div className="w-full sm:w-32 h-48 sm:h-auto bg-muted shrink-0 flex items-center justify-center relative group">
                          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors" />
                          <div className="scale-90 shadow-lg transition-transform group-hover:scale-95">
                             <BookCover
                               title={loan.bookTitle}
                               author={loan.bookAuthor}
                               isbn={loan.bookIsbn}
                             />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-5 flex flex-col justify-between flex-grow">
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-bold text-lg line-clamp-2 leading-tight">{loan.bookTitle}</h3>
                                {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                            </div>
                            <p className="text-muted-foreground mb-4">{loan.bookAuthor}</p>
                            
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                              isOverdue ? 'bg-destructive/10 text-destructive' :
                              isDueSoon ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              <Clock className="h-4 w-4" />
                              {isOverdue 
                                ? `Overdue by ${Math.abs(daysUntilDue)} days!` 
                                : isDueSoon 
                                  ? `Due soon: ${daysUntilDue === 0 ? 'Today' : `in ${daysUntilDue} days`}`
                                  : `Due in ${daysUntilDue} days`
                              }
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-2 ml-1">
                              Return by: {loan.dueDate ? format(new Date(loan.dueDate), 'MMMM d, yyyy') : '-'}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
                            {(loan.renewCount || 0) < 2 && !isOverdue ? (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="ml-auto"
                                  onClick={() => {
                                    if (studentId) {
                                      renewLoan.mutate(loan.id, {
                                        onError: () => navigate('/student/account?tab=current-loans'),
                                        onSuccess: () => {
                                            // Optional: Add toast here
                                        }
                                      });
                                    }
                                  }}
                                  disabled={renewLoan.isPending}
                                >
                                  {renewLoan.isPending ? 'Renewing...' : 'Renew Book'}
                                </Button>
                            ) : (
                                <div className="ml-auto text-xs text-muted-foreground italic">
                                    {isOverdue ? 'Cannot renew overdue books' : 'Max renewals reached'}
                                </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Progress & Stats */}
        <div className="space-y-6">
          {/* Reading Goal */}
          <Card className="border-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4 border-b border-primary/5">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                My Reading Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                 <span className="text-5xl font-bold text-primary block mb-1">{booksReadThisYear}</span>
                 <span className="text-muted-foreground font-medium">books read this year</span>
              </div>
              
              <div className="space-y-2 mb-2">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Progress</span>
                  <span>{quotaProgress}%</span>
                </div>
                <Progress value={quotaProgress} className="h-3 rounded-full bg-primary/10" />
              </div>
              
              <p className="text-xs text-center text-muted-foreground mt-4">
                {Math.max(0, requiredBooks - booksReadThisYear)} more to reach the goal of {requiredBooks} books!
              </p>
            </CardContent>
          </Card>

          {/* Recent Activity (Simplified) */}
          <Card>
             <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Recent History
                </CardTitle>
             </CardHeader>
            <CardContent>
               {myHistory.length === 0 ? (
                 <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
               ) : (
                 <div className="space-y-4">
                    {myHistory.slice(0, 3).map((activity: StudentLoan) => (
                      <div key={activity.id} className="flex items-start gap-3 text-sm">
                         <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${activity.returnDate ? 'bg-green-500' : 'bg-blue-500'}`} />
                         <div>
                           <p className="font-medium line-clamp-1">{activity.bookTitle}</p>
                           <p className="text-xs text-muted-foreground">
                             {activity.returnDate ? 'Returned' : 'Borrowed'} • {format(new Date(activity.returnDate || activity.checkoutDate || new Date()), 'MMM d')}
                           </p>
                         </div>
                      </div>
                    ))}
                    <Button variant="ghost" className="w-full text-xs h-8 mt-2" asChild>
                      <Link to="/student/account">View Full History</Link>
                    </Button>
                 </div>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
