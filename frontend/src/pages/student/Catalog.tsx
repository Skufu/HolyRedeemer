import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Search,
  BookOpen,
  Grid3X3,
  List,
  MapPin,
  Calendar,
  User,
  Building,
  BookCopy,
  Loader2,
  Filter,
  CheckCircle,
  History,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  Rows,
  Heart
} from 'lucide-react';
import { useBooks, useCategories } from '@/hooks/useBooks';
import { Book, Category } from '@/services/books';
import { useReserveBook, useFavoriteBooks, useAddFavorite, useRemoveFavorite } from '@/hooks/useStudents';
import BookCover from '@/components/BookCover';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { staggerContainerVariants, staggerItemVariants, cardHoverVariants, fadeInUpVariants } from '@/lib/animations';

const StudentCatalog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const [sortOption, setSortOption] = useState('relevance');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState('');
  const [isReserving, setIsReserving] = useState(false);
  const [page, setPage] = useState(1);

  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const reserveBook = useReserveBook();
  const { data: favoritesData } = useFavoriteBooks();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const favoriteBookIds = useMemo(
    () => new Set(favoritesData?.data?.map((f) => f.bookId) || []),
    [favoritesData?.data],
  );

  const { data: booksData, isLoading: booksLoading } = useBooks({
    search: searchQuery || undefined,
    category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
    available_only: availabilityFilter === 'available' ? true : undefined,
    page,
    per_page: 24
  });

  const { data: categoriesData } = useCategories();

  const meta = booksData?.meta;
  const categories = categoriesData?.data || [];

  const filteredBooks = useMemo(
    () => (booksData?.data || []).filter((book) => {
      if (availabilityFilter === 'checked_out' && (book.availableCopies || 0) > 0) return false;
      if (availabilityFilter === 'out_of_stock' && (book.availableCopies || 0) > 0) return false;
      return true;
    }),
    [booksData?.data, availabilityFilter],
  );

  const sortedBooks = useMemo(
    () => [...filteredBooks].sort((a, b) => {
      switch (sortOption) {
        case 'title': return a.title.localeCompare(b.title);
        case 'author': return a.author.localeCompare(b.author);
        case 'newest': return (b.publicationYear || 0) - (a.publicationYear || 0);
        default: return 0;
      }
    }),
    [filteredBooks, sortOption],
  );

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setAvailabilityFilter('all');
    setSortOption('relevance');
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getAvailabilityBadge = (available: number, total: number) => {
    if (available === 0) {
      return <Badge variant="destructive" className="h-5 text-[10px] px-1.5">Out of Stock</Badge>;
    }
    if (available <= 2) {
      return <Badge className="bg-amber-500 hover:bg-amber-600 h-5 text-[10px] px-1.5">{available} left</Badge>;
    }
    return <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{available} available</Badge>;
  };

  const handleReserveBook = async () => {
    if (!selectedBook) return;

    setIsReserving(true);
    try {
      await reserveBook.mutateAsync({ bookId: selectedBook.id, notes });
      setSelectedBook(null);
      setNotes('');
      navigate('/student/account?tab=reservations');
    } finally {
      setIsReserving(false);
    }
  };

  const handleQuickReserve = async (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    if (!book.id) return;

    try {
      await reserveBook.mutateAsync({ bookId: book.id, notes: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (!bookId) return;

    try {
      if (favoriteBookIds.has(bookId)) {
        await removeFavorite.mutateAsync(bookId);
      } else {
        await addFavorite.mutateAsync(bookId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      className="space-y-4 relative pb-20"
      initial={prefersReducedMotion ? "visible" : "hidden"}
      animate="visible"
      variants={fadeInUpVariants}
    >
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 transition-all">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between max-w-[1920px] mx-auto">
          <div className="relative w-full md:w-64 lg:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 sm:h-8 text-sm bg-muted/50 focus:bg-background transition-colors w-full"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex flex-row items-center gap-2 sm:gap-2 w-full md:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 sm:h-8 w-full sm:w-[130px] text-xs">
                <Filter className="h-3 w-3 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat: Category) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="h-11 sm:h-8 w-full sm:w-[130px] text-xs">
                <CheckCircle className="h-3 w-3 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="checked_out">Checked Out</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOption} onValueChange={setSortOption}>
              <SelectTrigger className="h-11 sm:h-8 w-full sm:w-[130px] col-span-2 sm:col-span-1 text-xs">
                <span className="mr-2 text-muted-foreground">Sort:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="author">Author A-Z</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>

            <div className="h-8 w-px bg-border mx-1 shrink-0 hidden sm:block" />

            <div className="col-span-2 sm:col-span-1 flex justify-center w-full mt-1 sm:mt-0">
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(v) => v && setViewMode(v as 'grid' | 'compact')}
                className="shrink-0"
              >
                <ToggleGroupItem value="grid" size="sm" className="h-11 w-11 sm:h-8 sm:w-8 p-0" aria-label="Grid view">
                  <LayoutGrid className="h-5 w-5 sm:h-4 sm:w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="compact" size="sm" className="h-11 w-11 sm:h-8 sm:w-8 p-0" aria-label="Compact view">
                  <Rows className="h-5 w-5 sm:h-4 sm:w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{sortedBooks.length}</span> results
        </p>
      </div>

      {booksLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sortedBooks.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-lg border border-dashed">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No books found</h3>
          <p className="text-xs text-muted-foreground mb-4">Try adjusting your filters</p>
          <Button variant="outline" size="sm" onClick={handleClearFilters} className="h-11 sm:h-8 min-w-[120px] gap-2">
            <X className="h-4 w-4 sm:h-3 sm:w-3" />
            Clear filters
          </Button>
        </div>
      ) : viewMode === 'compact' ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
          initial={prefersReducedMotion ? "visible" : "hidden"}
          animate="visible"
          variants={staggerContainerVariants}
        >
          {sortedBooks.map((book) => (
            <motion.div
              key={book.id}
              variants={staggerItemVariants}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.01 }}
              className="group"
            >
              <Card
                className="cursor-pointer overflow-hidden hover:shadow-md transition-all flex h-auto sm:h-32 border-transparent hover:border-border"
                onClick={() => setSelectedBook(book)}
              >
                <div className="w-[100px] sm:w-24 shrink-0 bg-muted relative">
                  <BookCover
                    title={book.title}
                    author={book.author}
                    coverImage={book.coverImage}
                    isbn={book.isbn}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                        {book.title}
                      </h3>
                      {getAvailabilityBadge(book.availableCopies || 0, book.totalCopies || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{book.author}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal text-muted-foreground">
                        {book.category || 'General'}
                      </Badge>
                      {book.publicationYear && (
                        <span className="text-[10px] text-muted-foreground">{book.publicationYear}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 mt-3 sm:mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-11 w-11 sm:h-7 sm:w-7 p-0"
                      onClick={(e) => handleToggleFavorite(e, book.id)}
                    >
                      <Heart className={`h-5 w-5 sm:h-4 sm:w-4 ${favoriteBookIds.has(book.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-11 sm:h-7 text-sm sm:text-xs">Details</Button>
                    {(book.availableCopies || 0) > 0 && (
                      <Button
                        size="sm"
                        className="h-11 sm:h-7 text-sm sm:text-xs px-4 sm:px-3"
                        onClick={(e) => handleQuickReserve(e, book)}
                      >
                        Reserve
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 sm:gap-4"
          initial={prefersReducedMotion ? "visible" : "hidden"}
          animate="visible"
          variants={staggerContainerVariants}
        >
          {sortedBooks.map((book) => (
            <motion.div
              key={book.id}
              variants={staggerItemVariants}
              whileHover={prefersReducedMotion ? undefined : "hover"}
            >
              <Card
                className="cursor-pointer overflow-hidden group h-full relative border-transparent hover:border-border hover:shadow-md transition-all"
                onClick={() => setSelectedBook(book)}
              >
                <motion.div
                  className="aspect-[2/3] bg-muted relative overflow-hidden"
                  variants={cardHoverVariants}
                  initial="initial"
                >
                  <BookCover
                    title={book.title}
                    author={book.author}
                    coverImage={book.coverImage}
                    isbn={book.isbn}
                  />
                  <button
                    className="absolute top-2 right-2 z-10 p-2 sm:p-1.5 rounded-full bg-background/80 flex items-center justify-center h-[44px] w-[44px] sm:h-auto sm:w-auto min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 backdrop-blur-sm shadow-sm md:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                    onClick={(e) => handleToggleFavorite(e, book.id)}
                  >
                    <Heart className={`h-5 w-5 sm:h-4 sm:w-4 ${favoriteBookIds.has(book.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                  </button>
                  {(book.availableCopies || 0) > 0 && (
                    <div className="absolute inset-0 bg-black/40 md:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                      <Button
                        size="sm"
                        className="w-[90%] sm:w-full min-h-[44px] sm:min-h-0 font-semibold shadow-lg translate-y-2 group-hover:translate-y-0 transition-transform duration-200"
                        onClick={(e) => handleQuickReserve(e, book)}
                      >
                        Reserve
                      </Button>
                    </div>
                  )}
                </motion.div>
                <CardContent className="p-2">
                  <h3 className="font-semibold text-sm line-clamp-1 mb-0.5 group-hover:text-primary transition-colors">{book.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">{book.author}</p>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <Badge variant="outline" className="text-[10px] h-4 px-1 rounded-sm border-transparent bg-muted text-muted-foreground group-hover:border-border group-hover:bg-background transition-colors">
                      {book.category?.substring(0, 12) || 'Gen'}
                    </Badge>
                    <div className="scale-90 origin-right">
                      {getAvailabilityBadge(book.availableCopies || 0, book.totalCopies || 0)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!booksLoading && filteredBooks.length > 0 && meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-center py-6 gap-1">
          <Button
            variant="outline"
            size="icon"
            className="min-h-[44px] min-w-[44px] sm:h-8 sm:w-8"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>

          <div className="flex items-center gap-1 mx-2">
            {Array.from({ length: Math.min(5, meta.total_pages) }, (_, i) => {
              let p = page;
              if (meta.total_pages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= meta.total_pages - 2) p = meta.total_pages - 4 + i;
              else p = page - 2 + i;

              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 sm:p-0 text-sm sm:text-xs ${p === page ? "" : "text-muted-foreground"}`}
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </Button>
              );
            })}
            {meta.total_pages > 5 && page < meta.total_pages - 2 && (
              <>
                <span className="text-muted-foreground font-bold text-center w-8">...</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 sm:p-0 text-sm sm:text-xs text-muted-foreground"
                  onClick={() => handlePageChange(meta.total_pages)}
                >
                  {meta.total_pages}
                </Button>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="min-h-[44px] min-w-[44px] sm:h-8 sm:w-8"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= meta.total_pages}
          >
            <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      )}

      <Dialog open={!!selectedBook} onOpenChange={(open) => {
        if (!open) {
          setSelectedBook(null);
          setNotes('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-start justify-between">
            <DialogTitle className="font-display text-lg sm:text-xl pr-4">{selectedBook?.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Book details and availability
            </DialogDescription>
            {selectedBook && (
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] min-w-[44px] sm:h-8 sm:w-8 p-0 shrink-0 flex items-center justify-center"
                onClick={() => {
                  if (favoriteBookIds.has(selectedBook.id)) {
                    removeFavorite.mutate(selectedBook.id);
                  } else {
                    addFavorite.mutate(selectedBook.id);
                  }
                }}
              >
                <Heart className={`h-5 w-5 ${favoriteBookIds.has(selectedBook.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
              </Button>
            )}
          </DialogHeader>

          {selectedBook && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="w-24 h-36 sm:w-32 sm:h-48 bg-muted rounded-lg flex-shrink-0 mx-auto sm:mx-0 relative overflow-hidden shadow-md">
                  <BookCover
                    title={selectedBook.title}
                    author={selectedBook.author}
                    coverImage={selectedBook.coverImage}
                    isbn={selectedBook.isbn}
                  />
                </div>
                <div className="flex-1 space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{selectedBook.author}</span>
                  </div>
                  {selectedBook.publisher && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">{selectedBook.publisher}</span>
                    </div>
                  )}
                  {selectedBook.publicationYear && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">Published {selectedBook.publicationYear}</span>
                    </div>
                  )}
                  {selectedBook.shelfLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm">Location: {selectedBook.shelfLocation}</span>
                    </div>
                  )}
                  {selectedBook.isbn && (
                    <div className="flex items-center gap-2">
                      <BookCopy className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">ISBN: {selectedBook.isbn}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedBook.description && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Description</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedBook.description}</p>
                </div>
              )}

              {(selectedBook.availableCopies || 0) > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Reservation Notes (Optional)</h4>
                  <Input
                    placeholder="Add a note for the librarian..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
                <div>
                  <span className="text-sm text-muted-foreground">Availability: </span>
                  <span className="font-semibold text-sm sm:text-base">
                    {selectedBook.availableCopies || 0} of {selectedBook.totalCopies || 0} copies
                  </span>
                </div>
                {(selectedBook.availableCopies || 0) > 0 ? (
                  <Button
                    onClick={handleReserveBook}
                    disabled={isReserving}
                    className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                  >
                    {isReserving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Reserving...
                      </>
                    ) : (
                      'Confirm Reservation'
                    )}
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="w-full sm:w-auto opacity-50">
                    Out of Stock
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default StudentCatalog;
