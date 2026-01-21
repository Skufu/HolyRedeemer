// User & Authentication Types
export type UserRole = 'super_admin' | 'admin' | 'librarian' | 'student';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
}

export interface Student extends User {
  role: 'student';
  studentId: string;
  gradeLevel: number;
  section: string;
  rfid?: string;
  guardianName?: string;
  guardianContact?: string;
  status: 'active' | 'inactive' | 'graduated';
  currentLoans: number;
  totalFines: number;
}

export interface Staff extends User {
  role: 'admin' | 'librarian' | 'super_admin';
  employeeId: string;
  department: string;
}

// Book Types
export type BookCategory = 
  | 'Fiction' 
  | 'Non-Fiction' 
  | 'Reference' 
  | 'Textbook' 
  | 'Periodical'
  | 'Science'
  | 'Mathematics'
  | 'History'
  | 'Literature'
  | 'Biography';

export type BookStatus = 'available' | 'borrowed' | 'reserved' | 'archived' | 'lost';
export type CopyCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: BookCategory;
  publisher?: string;
  publicationYear?: number;
  description?: string;
  shelfLocation?: string;
  coverImage?: string;
  replacementCost: number;
  totalCopies: number;
  availableCopies: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookCopy {
  id: string;
  bookId: string;
  copyNumber: number;
  qrCode: string;
  condition: CopyCondition;
  status: BookStatus;
  notes?: string;
  acquiredDate: Date;
}

// Transaction Types
export type TransactionStatus = 'active' | 'returned' | 'overdue' | 'lost';

export interface Transaction {
  id: string;
  bookId: string;
  bookCopyId: string;
  studentId: string;
  librarianId: string;
  checkoutDate: Date;
  dueDate: Date;
  returnDate?: Date;
  status: TransactionStatus;
  renewCount: number;
  fineAmount: number;
  returnCondition?: CopyCondition;
}

// Fine Types
export type FineStatus = 'pending' | 'paid' | 'waived';

export interface Fine {
  id: string;
  transactionId: string;
  studentId: string;
  bookId: string;
  amount: number;
  reason: string;
  status: FineStatus;
  paidDate?: Date;
  createdAt: Date;
}

// Request Types
export type RequestType = 'reservation' | 'purchase_request';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled';

export interface BookRequest {
  id: string;
  studentId: string;
  bookId?: string;
  requestType: RequestType;
  status: RequestStatus;
  notes?: string;
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string;
}

// Notification Types
export type NotificationType = 'due_reminder' | 'overdue' | 'fine' | 'request_update' | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

// Settings Types
export interface LibrarySettings {
  schoolYear: string;
  libraryName: string;
  maxBooksPerStudent: number;
  loanDurationDays: number;
  maxRenewals: number;
  finePerDay: number;
  gracePeriodDays: number;
  maxFineCap: number;
  blockThreshold: number;
  requiredBooksPerYear: number;
}

// Dashboard Stats
export interface DashboardStats {
  totalBooks: number;
  activeStudents: number;
  currentLoans: number;
  overdueBooks: number;
  totalFines: number;
  checkoutsToday: number;
  returnsToday: number;
  dueToday: number;
}

// Chart Data
export interface ChartDataPoint {
  name: string;
  value: number;
  fill?: string;
}

export interface TrendDataPoint {
  month: string;
  checkouts: number;
  returns: number;
}
