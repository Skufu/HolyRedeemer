import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Printer, QrCode, Check, BookOpen, Loader2, Download, MoreHorizontal, RefreshCw, Edit } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { useBooks, useBookCopies, useRegenerateQRCode } from '@/hooks/useBooks';
import { BookCopy } from '@/services/books';
import './QRManagement.print.css';

const QRManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [bookFilter, setBookFilter] = useState<string>('all');
  const [selectedCopies, setSelectedCopies] = useState<Set<string>>(new Set());
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingCopy, setEditingCopy] = useState<BookCopy | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const regenerateQRCode = (copyId: string) => {
    toast({
      title: 'Regenerating QR Code',
      description: 'QR code is being regenerated...',
    });
    setIsEditDialogOpen(false);
  };

  const { mutate: regenerateMutate, isPending: isRegenerating } = useRegenerateQRCode();

  const { data: booksData, isLoading: booksLoading } = useBooks();
  const books = useMemo(() => booksData?.data || [], [booksData]);

  const selectedBookId = bookFilter !== 'all' ? bookFilter : (books[0]?.id || '');
  const { data: copiesData, isLoading: copiesLoading } = useBookCopies(selectedBookId);

  const allCopies = useMemo(() => {
    if (bookFilter !== 'all' && copiesData?.data) {
      return copiesData.data.map(copy => ({
        ...copy,
        bookTitle: books.find(b => b.id === copy.bookId)?.title || copy.bookTitle,
      }));
    }
    return [];
  }, [copiesData, books, bookFilter]);

  const getBook = (bookId: string) => books.find((b) => b.id === bookId);

  const filteredCopies = allCopies.filter((copy) => {
    const book = getBook(copy.bookId);
    const matchesSearch =
      book?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      copy.qrCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const uniqueBooks = books;

  const toggleSelect = (copyId: string) => {
    setSelectedCopies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(copyId)) {
        newSet.delete(copyId);
      } else {
        newSet.add(copyId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedCopies.size === filteredCopies.length) {
      setSelectedCopies(new Set());
    } else {
      setSelectedCopies(new Set(filteredCopies.map((c) => c.id)));
    }
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const executePrint = () => {
    if (selectedCopies.size === 0) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Labels</title>
          <link rel="stylesheet" href="/src/pages/admin/QRManagement.print.css">
          <style>
            body { margin: 0; padding: 20px; }
          </style>
        </head>
        <body>
          ${Array.from(selectedCopies).map((copyId) => {
        const copy = allCopies.find((c) => c.id === copyId);
        if (!copy) return '';
        const book = getBook(copy.bookId);

        return `
              <div class="qr-label">
                <div class="qr-label-header">Holy Redeemer School Library</div>
                <div class="qr-label-title">${book?.title || copy.bookTitle}</div>
                <div class="qr-label-copy-number">Copy #${copy.copyNumber}</div>
                <div class="qr-label-qr-code">${copy.qrCode}</div>
                <div class="qr-label-footer">
                  ${copy.condition ? `<span class="badge">${copy.condition}</span>` : ''}
                  ${copy.status ? `<span class="badge">${copy.status}</span>` : ''}
                </div>
              </div>
            `;
      }).join('')}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();

      toast({
        title: 'Print Job Sent',
        description: `${selectedCopies.size} QR labels have been sent to print.`,
      });
      setIsPrintModalOpen(false);
      setSelectedCopies(new Set());
    }
  };

  const downloadPDF = () => {
    toast({
      title: 'Feature Coming Soon',
      description: 'PDF download will be available in a future update.',
    });
  };

  const regenerateOne = () => {
    if (selectedCopies.size !== 1) {
      toast({
        title: 'Error',
        description: 'Please select exactly one copy to regenerate its QR code',
        variant: 'destructive',
      });
      return;
    }

    const copyId = Array.from(selectedCopies)[0];
    regenerateQRCode(copyId);
  };

  const updateCopyStatus = (copyId: string, newStatus: string, newCondition?: string) => {
    const copy = allCopies.find((c) => c.id === copyId);
    if (!copy) return;

    toast({
      title: 'Copy Updated',
      description: 'Copy status has been updated',
    });
  };

  const generateAllLabels = () => {
    setSelectedCopies(new Set(allCopies.map((c) => c.id)));
    setIsPrintModalOpen(true);
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'bg-success text-success-foreground';
      case 'good':
        return 'bg-info text-info-foreground';
      case 'fair':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-destructive text-destructive-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-success/10 text-success border-success/20';
      case 'borrowed':
        return 'bg-warning/10 text-warning-foreground border-warning/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">QR Code Management</h1>
          <p className="text-muted-foreground">Generate and print QR labels for book copies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={selectedCopies.size === 0} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Selected ({selectedCopies.size})
          </Button>
          <Button onClick={generateAllLabels} className="gap-2">
            <QrCode className="h-4 w-4" />
            Generate All Labels
          </Button>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)} disabled={selectedCopies.size !== 1}>
            <Edit className="h-4 w-4" />
            Edit Selected
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by book title or QR code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={bookFilter} onValueChange={setBookFilter}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Filter by book" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Books</SelectItem>
            {uniqueBooks.map((book) => (
              <SelectItem key={book.id} value={book.id}>
                {book.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={selectAll}>
          {selectedCopies.size === filteredCopies.length ? 'Deselect All' : 'Select All'}
        </Button>
      </div>

      {/* Grid */}
      {booksLoading || copiesLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : bookFilter === 'all' ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">Select a book to view its copies</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
          {filteredCopies.map((copy, index) => {
            const book = getBook(copy.bookId);
            const isSelected = selectedCopies.has(copy.id);

            return (
              <Card
                key={copy.id}
                className={`relative cursor-pointer transition-all duration-200 animate-fade-in-up hover:shadow-warm ${isSelected ? 'ring-2 ring-primary shadow-warm' : ''
                  }`}
                style={{ animationDelay: `${index * 0.02}s` }}
                onClick={() => toggleSelect(copy.id)}
              >
                {/* Selection indicator */}
                <div
                  className={`absolute top-2 right-2 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                    ? 'bg-primary border-primary'
                    : 'border-muted-foreground/30 bg-background/80'
                    }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  {editingCopy?.id === copy.id && (
                    <RefreshCw className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>

                <CardContent className="p-3 md:p-4">
                  <div className="flex justify-center mb-3">
                    <div className="bg-white p-2 rounded-lg shadow-inner-gold">
                      <QRCodeSVG
                        value={copy.qrCode}
                        size={72}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium text-xs md:text-sm line-clamp-2 leading-tight min-h-[2.5em]">
                      {book?.title || copy.bookTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">Copy #{copy.copyNumber}</p>
                    <p className="text-[10px] md:text-xs font-mono text-muted-foreground truncate">
                      {copy.qrCode}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {editingCopy?.id === copy.id ? copy.status : copy.status}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {bookFilter !== 'all' && !copiesLoading && filteredCopies.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">No book copies found</p>
        </div>
      )}

      {/* Edit Copy Status Dialog */}
      <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Copy Status</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Update copy condition or status for {editingCopy?.qrCode}
          </AlertDialogDescription>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Condition</label>
                <Select value={editingCopy?.condition || 'good'} onValueChange={(value) => setEditingCopy({ ...editingCopy!, condition: value as BookCopy['condition'] })}>
                  <SelectTrigger>
                    {editingCopy?.condition || 'good'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={editingCopy?.status || 'available'} onValueChange={(value) => setEditingCopy({ ...editingCopy!, status: value as BookCopy['status'] })}>
                  <SelectTrigger>
                    {editingCopy?.status || 'available'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="borrowed">Borrowed</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={editingCopy?.notes || ''}
                onChange={(e) => setEditingCopy({ ...editingCopy!, notes: (e.target as HTMLInputElement).value })}
                placeholder="Add notes about this copy..."
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (editingCopy) {
                updateCopyStatus(editingCopy.id, editingCopy.status || 'available', editingCopy.condition);
              }
              setIsEditDialogOpen(false);
            }} disabled={isRegenerating}>
              {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Preview Modal */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Print QR Labels</DialogTitle>
            <DialogDescription>
              Preview of {selectedCopies.size} QR labels to print
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 p-4 bg-white rounded-lg">
            {Array.from(selectedCopies).map((copyId, index) => {
              const copy = allCopies.find((c) => c.id === copyId);
              if (!copy) return null;
              const book = getBook(copy.bookId);
              const isSelected = selectedCopies.has(copy.id);

              return (
                <div
                  key={copyId}
                  className={`relative p-4 border rounded-lg transition-all duration-200 animate-fade-in-up hover:shadow-warm ${isSelected ? 'ring-2 ring-primary shadow-warm' : ''
                    }`}
                  style={{ animationDelay: `${index * 0.02}s` }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: '#000' }}>
                    Holy Redeemer School Library
                  </div>
                  <div style={{ fontSize: '9px', marginBottom: '4px', color: '#333', maxWidth: '2.5in', wordWrap: 'break-word' }}>
                    {book?.title || copy.bookTitle}
                  </div>
                  <div style={{ fontSize: '8px', marginBottom: '4px', color: '#666' }}>
                    Copy #{copy.copyNumber}
                  </div>
                  <QRCodeSVG
                    value={copy.qrCode}
                    size={80}
                    level="M"
                    includeMargin={false}
                  />
                  <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #ddd', fontSize: '7px', color: '#888', display: 'flex', gap: '4px' }}>
                    {copy.condition && (
                      <span style={{ padding: '2px 6px', borderRadius: '2px', color: '#fff', fontSize: '8px', backgroundColor: copy.condition === 'excellent' ? '#10B981' : copy.condition === 'good' ? '#3B82F6' : copy.condition === 'fair' ? '#F59E0B' : '#EF4444' }}>
                        {copy.condition}
                      </span>
                    )}
                    {copy.status && (
                      <span style={{ padding: '2px 6px', borderRadius: '2px', color: '#fff', fontSize: '8px', backgroundColor: copy.status === 'available' ? '#10B981' : copy.status === 'borrowed' ? '#F59E0B' : '#6B7280' }}>
                        {copy.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={executePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
            <Button variant="outline" onClick={downloadPDF} className="w-full sm:w-auto gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QRManagement;
