import React, { useMemo, useState } from 'react';
import { useBooks, useCreateBook, useUpdateBook, useDeleteBook, useCategories } from '@/hooks/useBooks';
import { Book, CreateBookRequest, Category } from '@/services/books';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  Edit,
  Archive,
  BookOpen,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

const BooksManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const bookParams = useMemo(
    () => ({
      search: searchTerm || undefined,
      category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
      page: currentPage,
      per_page: itemsPerPage,
    }),
    [searchTerm, categoryFilter, currentPage, itemsPerPage],
  );

  const { data: booksData, isLoading: booksLoading } = useBooks(bookParams);

  const { data: categoriesData } = useCategories();
  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  const deleteBook = useDeleteBook();

  const books = booksData?.data || [];
  const categories = categoriesData?.data || [];
  const totalBooks = booksData?.meta?.total || 0;
  const totalPages = booksData?.meta?.total_pages || 1;

  const [formData, setFormData] = useState<CreateBookRequest>(() => ({
    title: '',
    author: '',
    isbn: '',
    category_id: '',
    publisher: '',
    publication_year: new Date().getFullYear(),
    description: '',
    shelf_location: '',
    replacement_cost: 0,
    initial_copies: 1,
  }));

  const paginatedBooks = books;

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category_id: categories[0]?.id || '',
      publisher: '',
      publication_year: new Date().getFullYear(),
      description: '',
      shelf_location: '',
      replacement_cost: 0,
      initial_copies: 1,
    });
    setEditingBook(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (book: Book) => {
    setFormData({
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      category_id: book.categoryId || '',
      publisher: book.publisher || '',
      publication_year: book.publicationYear || new Date().getFullYear(),
      description: book.description || '',
      shelf_location: book.shelfLocation || '',
      replacement_cost: book.replacementCost || 0,
      initial_copies: book.totalCopies,
    });
    setEditingBook(book);
    setIsAddModalOpen(true);
  };

  const handleSave = async () => {
    if (editingBook) {
      await updateBook.mutateAsync({
        id: editingBook.id,
        data: {
          title: formData.title,
          author: formData.author,
          isbn: formData.isbn,
          categoryId: formData.category_id,
          publisher: formData.publisher,
          publicationYear: formData.publication_year,
          description: formData.description,
          shelfLocation: formData.shelf_location,
          replacementCost: formData.replacement_cost,
        },
      });
    } else {
      await createBook.mutateAsync(formData);
    }
    setIsAddModalOpen(false);
  };

  const handleArchive = async (book: Book) => {
    await deleteBook.mutateAsync(book.id);
  };

  const getAvailabilityBadge = (book: Book) => {
    const ratio = book.availableCopies / book.totalCopies;
    if (ratio === 0) return <Badge variant="destructive">Unavailable</Badge>;
    if (ratio < 0.5) return <Badge className="bg-warning text-warning-foreground">Low Stock</Badge>;
    return <Badge className="bg-success text-success-foreground">Available</Badge>;
  };

  const isProcessing = createBook.isPending || updateBook.isPending || deleteBook.isPending;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">Books Management</h1>
          <p className="text-muted-foreground">Manage the library book catalog</p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Book
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, author, or ISBN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
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
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        {booksLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Copies</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBooks.map((book: Book, index: number) => (
                <TableRow
                  key={book.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <TableCell>
                    <div className="w-10 h-12 rounded bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{book.title}</p>
                      <p className="text-xs text-muted-foreground">{book.isbn || 'No ISBN'}</p>
                    </div>
                  </TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{book.category || 'Uncategorized'}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-success">{book.availableCopies}</span>
                    <span className="text-muted-foreground">/{book.totalCopies}</span>
                  </TableCell>
                  <TableCell>{getAvailabilityBadge(book)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(book)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleArchive(book)}
                        disabled={deleteBook.isPending}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedBooks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No books found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, totalBooks)} of{' '}
              {totalBooks} books
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingBook ? 'Edit Book' : 'Add New Book'}
            </DialogTitle>
            <DialogDescription>
              {editingBook
                ? 'Update the book details below.'
                : 'Enter the book details to add it to the catalog.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter book title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="author">Author *</Label>
                    <Input
                      id="author"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="Author name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="isbn">ISBN</Label>
                    <Input
                      id="isbn"
                      value={formData.isbn}
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                      placeholder="978-0-00-000000-0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat: Category) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="copies">Number of Copies</Label>
                    <Input
                      id="copies"
                      type="number"
                      min={1}
                      value={formData.initial_copies}
                      onChange={(e) => setFormData({ ...formData, initial_copies: parseInt(e.target.value) || 1 })}
                      disabled={!!editingBook}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="publisher">Publisher</Label>
                    <Input
                      id="publisher"
                      value={formData.publisher}
                      onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Publication Year</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.publication_year}
                      onChange={(e) => setFormData({ ...formData, publication_year: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shelf">Shelf Location</Label>
                    <Input
                      id="shelf"
                      value={formData.shelf_location}
                      onChange={(e) => setFormData({ ...formData, shelf_location: e.target.value })}
                      placeholder="e.g., A-01-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Replacement Cost</Label>
                    <Input
                      id="cost"
                      type="number"
                      min={0}
                      value={formData.replacement_cost}
                      onChange={(e) => setFormData({ ...formData, replacement_cost: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.title || !formData.author || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingBook ? 'Save Changes' : 'Add Book'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BooksManagement;
