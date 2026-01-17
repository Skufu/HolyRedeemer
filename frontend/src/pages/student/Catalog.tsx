import { useState } from 'react';
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
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { useBooks, useCategories } from '@/hooks/useBooks';
import { Book, Category } from '@/services/books';
import { useReserveBook } from '@/hooks/useStudents';
import BookCover from '@/components/BookCover';

const StudentCatalog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [notes, setNotes] = useState('');
  const [isReserving, setIsReserving] = useState(false);

  const reserveBook = useReserveBook();

  const { data: booksData, isLoading: booksLoading } = useBooks({
    search: searchQuery || undefined,
    category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
    available_only: availabilityFilter === 'available' ? true : undefined,
  });

  const { data: categoriesData } = useCategories();

  const books = booksData?.data || [];
  const categories = categoriesData?.data || [];

  const filteredBooks = books.filter((book) => {
    if (availabilityFilter === 'unavailable' && (book.availableCopies || 0) > 0) return false;
    return true;
  });

  const getAvailabilityBadge = (available: number, total: number) => {
    if (available === 0) {
      return <Badge variant="destructive">Unavailable</Badge>;
    }
    if (available <= 2) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">{available} left</Badge>;
    }
    return <Badge variant="secondary">{available} available</Badge>;
  };

  const handleReserveBook = async () => {
    if (!selectedBook) return;

    setIsReserving(true);
    try {
      await reserveBook.mutateAsync({ bookId: selectedBook.id, notes });
      setSelectedBook(null);
      setNotes('');
    } finally {
      setIsReserving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in relative">
      <div className="sticky top-0 z-20 bg-background border-b border-border/50 pb-4 pt-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-primary">Book Catalog</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Search and browse our library collection</p>
        </div>

        <Card className="shadow-sm border-primary/10">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 sm:h-10 text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9 text-xs sm:text-sm">
                    <Filter className="h-3.5 w-3.5 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat: Category) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center bg-muted rounded-lg p-1 w-full sm:w-auto overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'All', icon: CheckCircle },
                    { id: 'available', label: 'Available', icon: CheckCircle },
                    { id: 'unavailable', label: 'Waitlist', icon: History },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setAvailabilityFilter(filter.id as 'all' | 'available' | 'unavailable')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${availabilityFilter === filter.id
                        ? 'bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <filter.icon className={`h-3 w-3 ${availabilityFilter === filter.id ? 'text-primary' : ''}`} />
                      {filter.label}
                    </button>
                  ))}
                </div>
                {/* The ToggleGroup for viewMode is kept as it was not part of the replacement snippet */}
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(v) => v && setViewMode(v as 'grid' | 'list')}
                  className="hidden sm:flex ml-auto"
                >
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <Grid3X3 className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredBooks.length}</span> books
        </p>
      </div>

      {booksLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredBooks.map((book) => (
            <Card
              key={book.id}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 active:scale-[0.98] overflow-hidden group"
              onClick={() => setSelectedBook(book)}
            >
              <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                <BookCover
                  title={book.title}
                  author={book.author}
                  coverImage={book.coverImage}
                  isbn={book.isbn}
                />
              </div>
              <CardContent className="p-2.5 sm:p-4">
                <h3 className="font-semibold text-sm sm:text-base line-clamp-2 mb-1">{book.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-1">{book.author}</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:justify-between">
                  <Badge variant="outline" className="text-[10px] sm:text-xs w-fit">
                    {book.category || 'Uncategorized'}
                  </Badge>
                  <div className="mt-1 sm:mt-0">
                    {getAvailabilityBadge(book.availableCopies || 0, book.totalCopies || 0)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!booksLoading && filteredBooks.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-muted-foreground">No books found</h3>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}

      <Dialog open={!!selectedBook} onOpenChange={(open) => {
        if (!open) {
          setSelectedBook(null);
          setNotes('');
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="font-display text-lg sm:text-xl pr-4">{selectedBook?.title}</DialogTitle>
          </DialogHeader>

          {selectedBook && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div className="w-24 h-32 sm:w-32 sm:h-44 bg-muted rounded-lg flex-shrink-0 mx-auto sm:mx-0 relative overflow-hidden shadow-md">
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
                    <span className="text-sm">{selectedBook.author}</span>
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
                  <p className="text-sm text-muted-foreground">{selectedBook.description}</p>
                </div>
              )}

              {(selectedBook.availableCopies || 0) > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Reservation Notes (Optional)</h4>
                  <Input
                    placeholder="Add a note for the librarian (e.g., needed for research project)"
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
                      'Reserve Book'
                    )}
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="w-full sm:w-auto">
                    Currently Unavailable
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentCatalog;
