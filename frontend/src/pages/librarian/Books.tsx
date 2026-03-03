import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  BookOpen,
  Filter,
  MapPin,
  Calendar,
  Tag,
  Copy,
  CheckCircle,
  QrCode,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useBooks, useCategories, useBookCopies } from '@/hooks/useBooks';
import { Book, BookCopy, Category } from '@/services/books';
import BookCover from '@/components/BookCover';

const BooksPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  const { data: booksData, isLoading: booksLoading } = useBooks({
    search: search.length >= 2 ? search : undefined,
    category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
    page,
    per_page: perPage,
  });

  const { data: categoriesData } = useCategories();
  const {
  data: copiesData,
  isLoading: copiesLoading,
  isError: copiesIsError,
  error: copiesError,
} = useBookCopies(selectedBook?.id || '');

  const books = booksData?.data || [];
  const categories = categoriesData?.data || [];
  const bookCopies = copiesData?.data || [];

  const norm = (s?: string) => (s || '').toLowerCase();
  const getStatusColor = (status: BookCopy['status']) => {
    switch (norm(status)) {
      case 'available': return 'bg-success/10 text-success border-success/30';
      case 'borrowed': return 'bg-info/10 text-info border-info/30';
      case 'reserved': return 'bg-warning/10 text-warning-foreground border-warning/30';
      case 'overdue': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-display font-bold text-primary">Book Catalog</h1>
        <p className="text-muted-foreground">Search and browse the library collection</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, or ISBN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat: Category) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {books.length} of {booksData?.meta?.total || 0} books found
            </p>
            {booksData?.meta && booksData.meta.total > perPage && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="h-8 px-2"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-sm">
                  Page {page} of {Math.ceil((booksData.meta.total || 0) / perPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil((booksData.meta.total || 0) / perPage)}
                  className="h-8 px-2"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {booksLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {books.map((book: Book) => (
                <Card
                  key={book.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${selectedBook?.id === book.id ? 'border-primary ring-1 ring-primary/20' : ''}`}
                  onClick={() => setSelectedBook(book)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-12 rounded bg-muted flex-shrink-0 relative overflow-hidden shadow-sm">
                        <BookCover
                          title={book.title}
                          author={book.author}
                          coverImage={book.coverImage}
                          isbn={book.isbn}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium line-clamp-1">{book.title}</h3>
                        <p className="text-sm text-muted-foreground">{book.author}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {book.category || 'Uncategorized'}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Copy className="h-3 w-3" />
                            {book.availableCopies}/{book.totalCopies}
                          </span>
                        </div>
                      </div>
                      <Badge variant={(book.availableCopies || 0) > 0 ? 'default' : 'secondary'}>
                        {(book.availableCopies || 0) > 0 ? 'Available' : 'All Out'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {books.length === 0 && !booksLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No books found</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6">
          {selectedBook ? (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="h-24 w-16 rounded-lg bg-muted flex-shrink-0 relative overflow-hidden shadow-md">
                    <BookCover
                      title={selectedBook.title}
                      author={selectedBook.author}
                      coverImage={selectedBook.coverImage}
                      isbn={selectedBook.isbn}
                    />
                  </div>
                  <div>
                    <CardTitle className="font-display">{selectedBook.title}</CardTitle>
                    <CardDescription className="text-base">{selectedBook.author}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">ISBN</p>
                    <p className="text-sm font-medium">{selectedBook.isbn || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {selectedBook.category || 'Uncategorized'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedBook.shelfLocation || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Publisher</p>
                    <p className="text-sm font-medium">{selectedBook.publisher || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Year</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {selectedBook.publicationYear || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Replacement Cost</p>
                    <p className="text-sm font-medium">
                      {selectedBook.replacementCost ? `₱${selectedBook.replacementCost}` : 'N/A'}
                    </p>
                  </div>
                </div>

                {selectedBook.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedBook.description}</p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium">Copies ({bookCopies.length})</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex items-center gap-1 text-success">
                        <CheckCircle className="h-3 w-3" />
                        {bookCopies.filter((c: BookCopy) => norm(c.status) === 'available').length} available
                      </span>
                    </div>
                  </div>

                  {copiesIsError ? (
  <p className="text-sm text-destructive">
    Failed to load copies: {String(copiesError)}
  </p>
) : null}

                  {copiesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {bookCopies.map((copy: BookCopy) => (
                        <div
                          key={copy.id}
                          className={`p-3 rounded-lg border ${getStatusColor(copy.status)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <QrCode className="h-4 w-4" />
                              <span className="font-medium text-sm">Copy #{copy.copyNumber}</span>
                            </div>
                            <Badge variant="outline" className={getStatusColor(copy.status)}>
                              {copy.status}
                            </Badge>
                          </div>
                          <p className="text-xs mt-1 opacity-70">
                            {copy.qrCode} - Condition: {copy.condition}
                          </p>

                          {norm(copy.status) === 'borrowed' && (copy.borrowerName || copy.borrowerStudentNumber) ? (
                          <div className="mt-2 text-xs opacity-90">
                            <p>
                              <b>Borrower:</b> {copy.borrowerName || 'Unknown'}
                              {copy.borrowerStudentNumber ? ` (${copy.borrowerStudentNumber})` : ''}
                            </p>
                            {copy.checkoutDate && <p><b>Checked out:</b> {copy.checkoutDate}</p>}
                            {copy.dueDate && <p><b>Due:</b> {copy.dueDate}</p>}
                          </div>
                        ) : null}
                        </div>
                      ))}
                      {bookCopies.length === 0 && !copiesLoading && (
                        <p className="text-sm text-muted-foreground text-center py-4">No copies found</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a Book</p>
                  <p>Click on a book to view its details and copies</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default BooksPage;
