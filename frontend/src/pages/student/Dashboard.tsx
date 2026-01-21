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
  BookMarked,
  History,
  Loader2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
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
  const maxBooksPerStudent = 5;

  const isLoading = profileLoading || loansLoading || finesLoading || historyLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
          Welcome back, {user?.name?.split(' ')[0] || 'Student'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your library activity
        </p>
      </div>

      {totalPendingFines > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-destructive">Outstanding Fines</p>
                  <p className="text-sm text-muted-foreground">
                    You have {totalPendingFines.toFixed(2)} in pending fines
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm" asChild>
                <Link to="/student/account?tab=fines">Pay Now</Link>
              </Button>

            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              Reading Quota
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-primary">{booksReadThisYear}</span>
                  <span className="text-muted-foreground text-sm">of {requiredBooks} books</span>
                </div>
                <Progress value={quotaProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {Math.max(0, requiredBooks - booksReadThisYear)} more books needed this school year
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Current Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loansLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-primary">{activeLoans.length}</span>
                  <span className="text-muted-foreground text-sm">
                    of {maxBooksPerStudent} allowed
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {maxBooksPerStudent - activeLoans.length} slots available
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Pending Fines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {finesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <span className={`text-3xl font-bold ${totalPendingFines > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {totalPendingFines.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {totalPendingFines === 0 ? 'No outstanding fines' : 'Please pay at the library'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            My Current Loans
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/student/account" className="flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activeLoans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No books currently borrowed</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/student/catalog">Browse Catalog</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeLoans.map((loan: StudentLoan) => {
                const daysUntilDue = loan.dueDate ? differenceInDays(new Date(loan.dueDate), new Date()) : 0;
                const isOverdue = loan.status === 'overdue';

                return (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-16 bg-muted rounded flex-shrink-0 overflow-hidden shadow-sm">
                        <BookCover
                          title={loan.bookTitle}
                          author={loan.bookAuthor}
                          isbn={loan.bookIsbn}
                        />
                      </div>
                      <div>
                        <h4 className="font-medium">{loan.bookTitle}</h4>
                        <p className="text-sm text-muted-foreground">{loan.bookAuthor}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Due: {loan.dueDate ? format(new Date(loan.dueDate), 'MMM dd, yyyy') : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {isOverdue ? (
                        <Badge variant="destructive">
                          {Math.abs(daysUntilDue)} days overdue
                        </Badge>
                      ) : daysUntilDue <= 3 ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600">
                          Due in {daysUntilDue} days
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {daysUntilDue} days left
                        </Badge>
                      )}
                      {(loan.renewCount || 0) < 2 && !isOverdue && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-xs"
                          onClick={() => {
                            if (studentId) {
                              renewLoan.mutate(loan.id, {
                                onError: () => {
                                  navigate('/student/account?tab=current-loans');
                                },
                              });
                            } else {
                              navigate('/student/account?tab=current-loans');
                            }
                          }}
                          disabled={renewLoan.isPending}
                        >
                          {renewLoan.isPending ? 'Renewing...' : 'Renew'}
                        </Button>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : myHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myHistory.slice(0, 4).map((activity: StudentLoan) => {
                const dateToDisplay = activity.returnDate || activity.checkoutDate;
                return (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${activity.returnDate ? 'bg-green-500' : 'bg-blue-500'}`} />
                      <div>
                        <span className="text-sm font-medium">{activity.returnDate ? 'Returned' : 'Borrowed'}</span>
                        <span className="text-sm text-muted-foreground"> - {activity.bookTitle}</span>
                      </div>
                    </div>
                    {dateToDisplay && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(dateToDisplay), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;
