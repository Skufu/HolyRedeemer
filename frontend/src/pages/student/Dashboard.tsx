import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { useMyDashboard } from '@/hooks/useStudents';
import { useRenew } from '@/hooks/useCirculation';
import { StudentLoan } from '@/services/students';
import BookCover from '@/components/BookCover';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const renewLoan = useRenew();

  const { data: dashboardData, isLoading: dashboardLoading } = useMyDashboard({ history_per_page: 4 });
  const profile = dashboardData?.data?.profile;
  const studentId = profile?.id || '';
  const myLoans = dashboardData?.data?.loans || [];
  const myFines = dashboardData?.data?.fines || [];
  const myHistory = dashboardData?.data?.history || [];

  const activeLoans = myLoans.filter((t: { status: string }) => t.status === 'borrowed' || t.status === 'overdue');
  const pendingFines = myFines.filter((f: { status: string }) => f.status === 'pending');
  const totalPendingFines = pendingFines.reduce((acc: number, f: { amount: number }) => acc + f.amount, 0);

  const booksReadThisYear = myHistory.length;
  const requiredBooks = 12;
  const quotaProgress = Math.min(Math.round((booksReadThisYear / requiredBooks) * 100), 100);
  const maxBooksPerStudent = 3;
  const availableSlots = Math.max(0, maxBooksPerStudent - activeLoans.length);

  const isLoading = dashboardLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Preparing your digital library...</p>
      </div>
    );
  }

  // Helper functions for student-friendly UI
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.name?.split(' ')[0] || 'Student';

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-16 pt-4 font-sans px-4 sm:px-6 lg:px-8">
      {/* Hero Section - Using system scholarly-header (Light Cream Profile) */}
      <div className="rounded-[2rem] p-8 md:p-14 border border-border/50 shadow-sm relative overflow-hidden scholarly-header">
        {/* Soft floating background abstract elements */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 left-2/3 -translate-y-1/2 w-64 h-64 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12">
          <div className="space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 backdrop-blur-md text-sm font-bold tracking-widest uppercase border border-primary/20 shadow-sm text-primary">
              <Sparkles className="w-4 h-4 text-primary" />
              Your Personal Library
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black tracking-tight leading-tight text-foreground drop-shadow-sm">
              {getGreeting()}, <span className="text-primary">{firstName}</span>!
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-lg leading-relaxed font-serif">
              Ready for your next adventure? Explore thousands of incredible stories waiting just for you.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" className="rounded-full h-14 px-8 text-base font-bold bg-[#6B1528] border-2 border-transparent text-white hover:bg-[#551120] shadow-xl shadow-primary/10 transition-all hover:-translate-y-1" asChild>
                <Link to="/student/catalog">
                  <Search className="mr-3 h-5 w-5 text-white" />
                  Explore Catalog
                </Link>
              </Button>
              {activeLoans.length > 0 && (
                <Button variant="outline" size="lg" className="rounded-full h-14 px-8 text-base font-bold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 backdrop-blur-md transition-all group" onClick={() => {
                  document.getElementById('my-books')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  View My Books
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
            </div>
          </div>

          <div className="hidden lg:flex relative pointer-events-none flex-shrink-0 pr-8">
            {/* Glowing floated book illustration */}
            <div className="relative w-64 h-64 md:w-80 md:h-80 bg-background/50 backdrop-blur-lg rounded-3xl rotate-6 flex items-center justify-center border border-border shadow-2xl transform hover:rotate-12 transition-transform duration-700 glass-card">
              <BookOpen className="w-32 h-32 md:w-40 md:h-40 text-primary/20 drop-shadow-sm" strokeWidth={1} />
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center shadow-xl border-4 border-background transform -rotate-12 animate-bounce">
                <span className="text-3xl filter drop-shadow-sm text-primary">⭐</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Alerts - High Contrast & Actionable */}
      {totalPendingFines > 0 && (
        <div className="bg-background border-l-[6px] border-l-destructive border border-border rounded-2xl p-5 md:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="flex-grow text-center sm:text-left">
            <h3 className="font-display font-extrabold text-2xl text-foreground mb-1">Outstanding Fines</h3>
            <p className="text-muted-foreground font-medium text-lg">
              You have a balance of <strong className="text-destructive font-bold">₱{totalPendingFines.toFixed(2)}</strong>. Let's get this settled soon!
            </p>
          </div>
          <Button className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold px-8 h-12 w-full sm:w-auto">
            View Details
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: My Books Bento Box */}
        <div className="lg:col-span-2 space-y-6" id="my-books">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-2 border-border/40 mb-6">
            <h2 className="text-3xl font-display font-black flex items-center gap-3 text-foreground">
              <div className="p-2.5 bg-primary/10 text-primary rounded-2xl shadow-sm border border-primary/20">
                <BookOpen className="h-7 w-7" />
              </div>
              Currently Reading
            </h2>
            <div className="bg-card border shadow-sm px-5 py-2.5 rounded-full flex items-center gap-4">
              <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Capacity</span>
              <div className="flex gap-1.5">
                {[...Array(maxBooksPerStudent)].map((_, i) => (
                  <div key={i} className={`w-3.5 h-3.5 rounded-full shadow-inner ${i < activeLoans.length ? 'bg-primary' : 'bg-muted inset-shadow-sm'}`} />
                ))}
              </div>
              <span className="text-sm font-black text-foreground ml-1">{activeLoans.length}/{maxBooksPerStudent}</span>
            </div>
          </div>

          {activeLoans.length === 0 ? (
            <div className="bg-card rounded-[2rem] border-2 border-dashed border-border shadow-sm overflow-hidden flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-32 h-32 mb-8 relative">
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl flex items-center justify-center" />
                <div className="relative bg-background w-full h-full rounded-full shadow-xl flex items-center justify-center border-4 border-card">
                  <span className="text-6xl drop-shadow-sm">📚</span>
                </div>
              </div>
              <h3 className="text-3xl font-display font-black mb-4 text-foreground">Your shelf is empty!</h3>
              <p className="text-muted-foreground text-lg max-w-sm mb-10 font-medium">
                You have <strong className="text-primary">{availableSlots} slots</strong> open. Let's find your next story.
              </p>
              <Button size="lg" className="rounded-full h-14 px-10 font-bold text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:-translate-y-1 transition-transform" asChild>
                <Link to="/student/catalog">Browse Library Catalog</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {activeLoans.map((loan: StudentLoan, indexNum: number) => {
                const daysUntilDue = loan.dueDate ? differenceInDays(new Date(loan.dueDate), new Date()) : 0;
                const isOverdue = loan.status === 'overdue' || daysUntilDue < 0;
                const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0;

                return (
                  <div
                    key={loan.id}
                    className={`bg-card rounded-[2rem] overflow-hidden shadow-sm hover:shadow-warm transition-all duration-300 border border-border group relative flex flex-col sm:flex-row ${isOverdue ? 'ring-2 ring-destructive/50 border-destructive/30' : ''}`}
                    style={{ animationDelay: `${indexNum * 0.1}s` }}
                  >
                    {/* Left Cover area */}
                    <div className="w-full sm:w-48 bg-muted/30 shrink-0 p-6 flex flex-col items-center justify-center relative overflow-hidden border-r border-border/50">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                      <div className="relative z-10 w-32 aspect-[2/3] shadow-lg rounded-md transform transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2 bg-background">
                        <BookCover
                          title={loan.bookTitle}
                          author={loan.bookAuthor}
                          isbn={loan.bookIsbn}
                          className="w-full h-full rounded-md object-cover"
                        />
                      </div>
                    </div>

                    {/* Right Details content */}
                    <div className="p-6 md:p-8 flex flex-col flex-grow justify-between bg-card z-10">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-display font-black text-2xl md:text-3xl text-foreground leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                              {loan.bookTitle}
                            </h3>
                            <p className="text-muted-foreground font-serif text-lg">{loan.bookAuthor}</p>
                          </div>

                          {/* Alert Icon Badge for critical states */}
                          {isOverdue && (
                            <div className="shrink-0 w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
                              <AlertCircle className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        {/* Status Tags */}
                        <div className="flex flex-wrap items-center gap-3 mt-6">
                          <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${isOverdue ? 'bg-destructive/15 text-destructive border border-destructive/20' :
                            isDueSoon ? 'bg-warning/15 text-warning-foreground border border-warning/30 font-bold' :
                              'bg-success/15 text-success border border-success/20'
                            }`}>
                            <Clock className="w-4 h-4" />
                            {isOverdue ? `Overdue by ${Math.abs(daysUntilDue)} days` :
                              isDueSoon ? `Due ${daysUntilDue === 0 ? 'Today!' : `in ${daysUntilDue} days`}` :
                                `Due in ${daysUntilDue} days`
                            }
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 pt-6 border-t border-border/60">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Return By</span>
                          <span className="font-bold text-lg text-foreground font-sans">
                            {loan.dueDate ? format(new Date(loan.dueDate), 'MMMM d, yyyy') : 'Unknown'}
                          </span>
                        </div>

                        {(loan.renewCount || 0) < 2 && !isOverdue ? (
                          <Button
                            className={`rounded-full px-8 py-6 h-auto font-bold text-base shadow-sm hover:shadow-md transition-all ${isDueSoon
                              ? 'bg-warning/15 hover:bg-warning/20 text-warning-foreground border border-warning/20'
                              : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20'
                              }`}
                            variant={isDueSoon ? "default" : "outline"}
                            onClick={() => {
                              if (studentId) {
                                renewLoan.mutate(loan.id, {
                                  onError: () => navigate('/student/account?tab=current-loans'),
                                });
                              }
                            }}
                            disabled={renewLoan.isPending}
                          >
                            {renewLoan.isPending ? (
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : null}
                            Renew Book
                          </Button>
                        ) : (
                          <div className="bg-muted px-4 py-2 rounded-xl text-center">
                            <span className="text-sm font-bold text-muted-foreground">
                              {isOverdue ? 'Cannot Renew (Overdue)' : 'Renewal Limit Reached'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Gamified Stats Container */}
        <div className="space-y-8">
          {/* Reading Goal Card */}
          <div className="bg-card rounded-[2rem] p-8 shadow-sm border relative overflow-hidden card-stat">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-secondary/20 text-secondary-foreground rounded-2xl">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-display font-black text-foreground">Reading Goal</h2>
            </div>

            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="relative mb-2">
                <div className="text-7xl font-display font-black text-foreground drop-shadow-sm">
                  {booksReadThisYear}
                </div>
              </div>
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 px-4 py-1.5 rounded-full border">Books Read</div>
            </div>

            <div className="space-y-4 mt-6">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-secondary-foreground">{quotaProgress}%</span>
              </div>
              {/* Thick Progress Bar */}
              <div className="h-4 bg-muted rounded-full overflow-hidden border shadow-inner">
                <div
                  className="h-full bg-secondary rounded-full shadow-sm relative transition-all duration-1000 ease-out"
                  style={{ width: `${Math.max(5, quotaProgress)}%` }}
                >
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/60">
              <p className="text-base text-center font-medium">
                {booksReadThisYear >= requiredBooks ? (
                  <span className="text-secondary-foreground font-bold flex items-center justify-center gap-2">
                    <span className="text-2xl">🏆</span> Goal smashed!
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Just <strong className="text-foreground font-bold text-lg mx-1">{requiredBooks - booksReadThisYear}</strong> more to hit the target!
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="bg-card rounded-[2rem] p-8 shadow-sm border card-stat">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <Clock className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-display font-black text-foreground">Activity Log</h2>
            </div>

            {myHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-muted/30 rounded-2xl border-2 border-dashed border-border/60">
                <span className="text-4xl mb-3">👻</span>
                <p className="font-bold text-foreground text-lg">It's quiet here...</p>
                <p className="text-sm text-muted-foreground">Borrow a book to start tracking!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myHistory.slice(0, 4).map((activity: StudentLoan) => (
                  <div key={activity.id} className="group flex items-center gap-4 p-4 rounded-2xl bg-card hover:bg-muted/50 border border-transparent hover:border-border transition-all cursor-default">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${activity.returnDate
                      ? 'bg-secondary/10 text-secondary-foreground'
                      : 'bg-primary/10 text-primary'
                      }`}>
                      {activity.returnDate ? <CheckCircle2 className="w-6 h-6" /> : <BookOpen className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{activity.bookTitle}</p>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1 font-sans">
                        {activity.returnDate ? 'Returned' : 'Borrowed'} • {format(new Date(activity.returnDate || activity.checkoutDate || new Date()), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="pt-4">
                  <Button variant="outline" className="w-full rounded-2xl h-14 font-bold text-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 border-2" asChild>
                    <Link to="/student/account">See All History</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
