import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  Hash,
  GraduationCap,
  Users,
  Phone,
  BookOpen,
  Heart,
  Trophy,
  Star,
  Calendar,
  MapPin,
  Building,
  BookCopy,
  Loader2,
  Sparkles,
  Zap,
  Shield,
  Compass,
  Award,
  Lock,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMyProfile, useStudentLoans, useStudentHistory, useStudentFines, useFavoriteBooks, useMyAchievements } from '@/hooks/useStudents';
import type { FavoriteBook, Achievement } from '@/services/students';
import { useBook } from '@/hooks/useBooks';
import BookCover from '@/components/BookCover';
import { staggerContainerVariants, staggerItemVariants } from '@/lib/animations';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const BookDetailsModal = ({ bookId, open, onOpenChange }: { bookId: string | null, open: boolean, onOpenChange: (open: boolean) => void }) => {
  const { data: bookResponse, isLoading } = useBook(bookId || '');
  const book = bookResponse?.data;

  if (!bookId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg sm:text-xl pr-4">{isLoading ? 'Loading...' : book?.title}</DialogTitle>
          <DialogDescription>
            View book details and borrowing information
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : book ? (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <div className="w-24 h-36 sm:w-32 sm:h-48 bg-muted rounded-lg flex-shrink-0 mx-auto sm:mx-0 relative overflow-hidden shadow-md">
                <BookCover
                  title={book.title}
                  author={book.author}
                  coverImage={book.coverImage}
                  isbn={book.isbn}
                />
              </div>
              <div className="flex-1 space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{book.author}</span>
                </div>
                {book.publisher && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">{book.publisher}</span>
                  </div>
                )}
                {book.publicationYear && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">Published {book.publicationYear}</span>
                  </div>
                )}
                {book.shelfLocation && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm">Location: {book.shelfLocation}</span>
                  </div>
                )}
                {book.isbn && (
                  <div className="flex items-center gap-2">
                    <BookCopy className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">ISBN: {book.isbn}</span>
                  </div>
                )}
              </div>
            </div>

            {book.description && (
              <div>
                <h4 className="font-semibold mb-2 text-sm sm:text-base">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{book.description}</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Library Availability: </span>
                <Badge variant={(book.availableCopies || 0) > 0 ? "secondary" : "destructive"}>
                  {(book.availableCopies || 0) > 0 ? `${book.availableCopies} Available` : "Out of Stock"}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Book details not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const StudentAccount = () => {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const { data: profileResponse, isLoading: profileLoading } = useMyProfile();
  const profile = profileResponse?.data;

  const { data: loansResponse, isLoading: loansLoading } = useStudentLoans(profile?.id || '');
  const { data: historyResponse, isLoading: historyLoading } = useStudentHistory(profile?.id || '');
  const { data: finesResponse, isLoading: finesLoading } = useStudentFines(profile?.id || '');
  const { data: favoritesResponse, isLoading: favoritesLoading } = useFavoriteBooks();
  const { data: achievementsResponse, isLoading: achievementsLoading } = useMyAchievements();

  const activeLoans = loansResponse?.data?.filter((l) => l.status === 'borrowed' || l.status === 'overdue') || [];
  const history = historyResponse?.data || [];
  const myFines = finesResponse?.data || [];
  const favoriteBooks = favoritesResponse?.data || [];
  const achievements = achievementsResponse?.data || [];
  const pendingFines = myFines.filter((f) => f.status === 'pending');
  const totalPending = pendingFines.reduce((acc, f) => acc + f.amount, 0);

  const booksReadThisYear = history.filter((h) => h.status === 'returned').length;
  const requiredBooks = 12;
  const quotaProgress = Math.min(Math.round((booksReadThisYear / requiredBooks) * 100), 100);

  const isLoading = profileLoading || loansLoading || historyLoading || finesLoading || favoritesLoading || achievementsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
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
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Your reading journey and achievements
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6 text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-background shadow-lg">
                <span className="text-4xl font-bold text-primary">{profile.name.charAt(0)}</span>
              </div>
              <h2 className="text-xl font-bold">{profile.name}</h2>
              <p className="text-muted-foreground">Grade {profile.gradeLevel} - {profile.section}</p>
              <div className="mt-4 flex justify-center gap-2">
                <Badge variant="secondary">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {booksReadThisYear} Books Read
                </Badge>
                {totalPending > 0 && (
                  <Badge variant="destructive">
                    ₱{totalPending.toFixed(2)} Due
                  </Badge>
                )}
              </div>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Hash className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Student ID</p>
                  <p className="font-medium">{profile.studentId}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-sm">{profile.email || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Grade Level</p>
                  <p className="font-medium">Grade {profile.gradeLevel}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Section</p>
                  <p className="font-medium">{profile.section}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guardian Contact</p>
                  <p className="font-medium">{profile.guardianContact || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Reading Goal</h3>
              </div>

              <div className="text-center mb-4">
                <span className="text-4xl font-bold text-primary">{booksReadThisYear}</span>
                <span className="text-muted-foreground"> / {requiredBooks} books</span>
              </div>

              <Progress value={quotaProgress} className="h-3 mb-2" />

              <p className="text-sm text-center text-muted-foreground">
                {quotaProgress >= 100 ? (
                  <span className="text-green-600 font-medium flex items-center justify-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    Goal completed! Amazing!
                  </span>
                ) : (
                  <>
                    {requiredBooks - booksReadThisYear} more books to reach your goal!
                  </>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Quick Stats</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{activeLoans.length}</p>
                  <p className="text-xs text-muted-foreground">Books Borrowed</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{history.filter(h => h.status === 'returned').length}</p>
                  <p className="text-xs text-muted-foreground">Books Read</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{favoriteBooks.length}</p>
                  <p className="text-xs text-muted-foreground">Favorites</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{pendingFines.length}</p>
                  <p className="text-xs text-muted-foreground">Pending Fees</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold">My Favorite Books</h3>
                </div>
                <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0" asChild>
                  <Link to="/student/catalog">
                    <BookOpen className="h-4 w-4 mr-1" />
                    Find Books
                  </Link>
                </Button>
              </div>

              {favoriteBooks.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground mb-2">No favorite books yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start adding books you love to your favorites!
                  </p>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                  initial={prefersReducedMotion ? "visible" : "hidden"}
                  animate="visible"
                  variants={staggerContainerVariants}
                >
                  {favoriteBooks.map((book: FavoriteBook) => (
                    <motion.div
                      key={book.id}
                      variants={staggerItemVariants}
                      className="cursor-pointer group"
                      onClick={() => setSelectedBookId(book.bookId)}
                    >
                      <div className="aspect-[2/3] bg-muted rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                        <BookCover
                          title={book.title}
                          author={book.author}
                          coverImage={book.coverImage}
                          isbn={book.isbn}
                          className="w-full h-full"
                        />
                      </div>
                      <p className="mt-2 text-sm font-medium line-clamp-1">{book.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Currently Borrowed</h3>
                </div>
                <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0" asChild>
                  <Link to="/student/my-books">View All</Link>
                </Button>
              </div>

              {activeLoans.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                  <p className="text-muted-foreground">No books borrowed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeLoans.slice(0, 3).map((loan) => (
                    <div
                      key={loan.id}
                      className="flex gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedBookId(loan.bookId)}
                    >
                      <div className="w-12 h-16 bg-muted rounded overflow-hidden shrink-0">
                        <BookCover title={loan.bookTitle} author={loan.bookAuthor} isbn={loan.bookIsbn} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{loan.bookTitle}</p>
                        <p className="text-xs text-muted-foreground">{loan.bookAuthor}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Due {format(new Date(loan.dueDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activeLoans.length > 3 && (
                    <p className="text-sm text-center text-muted-foreground">
                      +{activeLoans.length - 3} more books
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">My Achievements</h3>
                <Badge variant="secondary" className="ml-auto">
                  {achievements.filter((a: Achievement) => a.isUnlocked).length} / {achievements.length}
                </Badge>
              </div>

              {achievements.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No achievements yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {achievements.map((achievement: Achievement) => {
                    const IconComponent = achievement.icon === 'zap' ? Zap :
                      achievement.icon === 'shield' ? Shield :
                        achievement.icon === 'compass' ? Compass :
                          achievement.icon === 'heart' ? Heart :
                            achievement.icon === 'book-open' ? BookOpen :
                              Award;

                    return (
                      <div
                        key={achievement.id}
                        className={`p-3 rounded-lg border ${achievement.isUnlocked
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-muted/30 border-muted opacity-60'}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${achievement.isUnlocked
                          ? `bg-${achievement.color}-100`
                          : 'bg-muted'}`}
                        >
                          {achievement.isUnlocked ? (
                            <IconComponent className={`h-5 w-5 text-${achievement.color}-600`} />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="font-medium text-sm">{achievement.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{achievement.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <BookDetailsModal
        bookId={selectedBookId}
        open={!!selectedBookId}
        onOpenChange={(open) => !open && setSelectedBookId(null)}
      />
    </div>
  );
};

export default StudentAccount;
