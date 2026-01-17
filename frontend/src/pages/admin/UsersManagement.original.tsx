import React, { useState } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  Edit,
  UserX,
  Trash2,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { useStudents, useCreateStudent, useUpdateStudent } from '@/hooks/useStudents';
import { CreateStudentRequest, Student } from '@/services/students';
import {
  useLibrarians,
  useCreateLibrarian,
  useUpdateLibrarian,
  useDeleteLibrarian,
  useAdmins,
  useCreateAdmin,
  useUpdateAdmin,
} from '@/hooks/useUsers';
import {
  Librarian,
  Admin,
  CreateLibrarianRequest,
  CreateAdminRequest,
} from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';

const UsersManagement: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [librarianSearch, setLibrarianSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLibrarianModalOpen, setIsLibrarianModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [deleteLibrarianId, setDeleteLibrarianId] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingLibrarian, setEditingLibrarian] = useState<Librarian | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    search: searchTerm || undefined,
    per_page: 50,
  });

  const { data: librariansData, isLoading: librariansLoading } = useLibrarians({
    search: librarianSearch || undefined,
    per_page: 50,
  });

  const { data: adminsData, isLoading: adminsLoading } = useAdmins({
    search: adminSearch || undefined,
    per_page: 50,
  }, { enabled: isSuperAdmin });

  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const createLibrarian = useCreateLibrarian();
  const updateLibrarian = useUpdateLibrarian();
  const deleteLibrarian = useDeleteLibrarian();
  const createAdmin = useCreateAdmin();
  const updateAdmin = useUpdateAdmin();

  const students = studentsData?.data || [];
  const librarians = librariansData?.data || [];
  const admins = adminsData?.data || [];

  const [formData, setFormData] = useState<CreateStudentRequest>({
    name: '',
    student_id: '',
    email: '',
    grade_level: 7,
    section: '',
    guardian_name: '',
    guardian_contact: '',
  });

  const [librarianFormData, setLibrarianFormData] = useState<CreateLibrarianRequest & { status?: string }>({
    username: '',
    password: '',
    employee_id: '',
    name: '',
    email: '',
    phone: '',
    department: 'Library',
  });

  const [adminFormData, setAdminFormData] = useState<CreateAdminRequest & { status?: string }>({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'admin',
    status: 'active',
  });

  const filteredStudents = students.filter((student: Student) => {
    const matchesGrade = gradeFilter === 'all' || student.grade_level.toString() === gradeFilter;
    return matchesGrade;
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      student_id: '',
      email: '',
      grade_level: 7,
      section: '',
      guardian_name: '',
      guardian_contact: '',
    });
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setFormData({
      name: student.name || '',
      student_id: student.student_id || '',
      email: student.email || '',
      grade_level: student.grade_level || 7,
      section: student.section || '',
      guardian_name: student.guardian_name || '',
      guardian_contact: student.guardian_contact || '',
    });
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (editingStudent) {
      await updateStudent.mutateAsync({
        id: editingStudent.id,
        data: formData as Partial<Student>,
      });
    } else {
      await createStudent.mutateAsync(formData);
    }
    setIsModalOpen(false);
  };

  const handleDeactivate = async (student: Student) => {
    await updateStudent.mutateAsync({
      id: student.id,
      data: { status: 'inactive' },
    });
  };

  const handleOpenAddLibrarian = () => {
    setLibrarianFormData({
      username: '',
      password: '',
      employee_id: '',
      name: '',
      email: '',
      phone: '',
      department: 'Library',
      status: 'active',
    });
    setEditingLibrarian(null);
    setIsLibrarianModalOpen(true);
  };

  const handleOpenEditLibrarian = (librarian: Librarian) => {
    setLibrarianFormData({
      username: librarian.username || '',
      password: '',
      employee_id: librarian.employeeId || '',
      name: librarian.name || '',
      email: librarian.email || '',
      phone: librarian.phone || '',
      department: librarian.department || 'Library',
      status: librarian.status || 'active',
    });
    setEditingLibrarian(librarian);
    setIsLibrarianModalOpen(true);
  };

  const handleSaveLibrarian = async () => {
    if (editingLibrarian) {
      await updateLibrarian.mutateAsync({
        id: editingLibrarian.id,
        data: {
          employee_id: librarianFormData.employee_id,
          name: librarianFormData.name,
          email: librarianFormData.email,
          phone: librarianFormData.phone,
          department: librarianFormData.department,
          status: librarianFormData.status,
        },
      });
    } else {
      await createLibrarian.mutateAsync(librarianFormData);
    }
    setIsLibrarianModalOpen(false);
  };

  const handleDeleteLibrarian = async () => {
    if (deleteLibrarianId) {
      await deleteLibrarian.mutateAsync(deleteLibrarianId);
      setDeleteLibrarianId(null);
    }
  };

  const handleOpenAddAdmin = () => {
    setAdminFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      role: 'admin',
      status: 'active',
    });
    setEditingAdmin(null);
    setIsAdminModalOpen(true);
  };

  const handleOpenEditAdmin = (admin: Admin) => {
    setAdminFormData({
      username: admin.username || '',
      password: '',
      name: admin.name || '',
      email: admin.email || '',
      role: admin.role || 'admin',
      status: admin.status || 'active',
    });
    setEditingAdmin(admin);
    setIsAdminModalOpen(true);
  };

  const handleSaveAdmin = async () => {
    if (editingAdmin) {
      await updateAdmin.mutateAsync({
        id: editingAdmin.id,
        data: {
          name: adminFormData.name,
          email: adminFormData.email,
          status: adminFormData.status,
        },
      });
    } else {
      await createAdmin.mutateAsync(adminFormData);
    }
    setIsAdminModalOpen(false);
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const isProcessing = createStudent.isPending || updateStudent.isPending;
  const isLibrarianProcessing = createLibrarian.isPending || updateLibrarian.isPending || deleteLibrarian.isPending;
  const isAdminProcessing = createAdmin.isPending || updateAdmin.isPending;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">User Management</h1>
          <p className="text-muted-foreground">Manage students, librarians, and administrators</p>
        </div>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList>
          <TabsTrigger value="students" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Students ({students.length})
          </TabsTrigger>
          <TabsTrigger value="librarians" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Librarians ({librarians.length})
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Admins ({admins.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Grade Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {['7', '8', '9', '10', '11', '12'].map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    Grade {grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleOpenAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden">
            {studentsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Student</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Grade & Section</TableHead>
                    <TableHead className="text-center">Current Loans</TableHead>
                    <TableHead className="text-center">Fines</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student: Student, index: number) => (
                    <TableRow
                      key={student.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(student.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{student.student_id}</TableCell>
                      <TableCell>
                        Grade {student.grade_level} - {student.section}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{student.current_loans || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {(student.total_fines || 0) > 0 ? (
                          <Badge variant="destructive">{student.total_fines}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            student.status === 'active'
                              ? 'bg-success text-success-foreground'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(student)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeactivate(student)}
                            disabled={student.status === 'inactive' || updateStudent.isPending}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 && !studentsLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="librarians" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, employee ID, or email..."
                value={librarianSearch}
                onChange={(e) => setLibrarianSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleOpenAddLibrarian} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Librarian
            </Button>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden">
            {librariansLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Librarian</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {librarians.map((librarian: Librarian, index: number) => (
                    <TableRow
                      key={librarian.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                              {getInitials(librarian.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{librarian.name}</p>
                            <p className="text-xs text-muted-foreground">{librarian.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{librarian.employeeId}</TableCell>
                      <TableCell>{librarian.department}</TableCell>
                      <TableCell>{librarian.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            librarian.status === 'active'
                              ? 'bg-success text-success-foreground'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {librarian.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditLibrarian(librarian)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteLibrarianId(librarian.id)}
                            disabled={isLibrarianProcessing}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {librarians.length === 0 && !librariansLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No librarians found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="admins" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, or email..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {isSuperAdmin && (
              <Button onClick={handleOpenAddAdmin} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Admin
              </Button>
            )}
          </div>

          <div className="rounded-lg border bg-card overflow-hidden">
            {adminsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Administrator</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin: Admin, index: number) => (
                    <TableRow
                      key={admin.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-sm">
                              {getInitials(admin.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{admin.name}</p>
                            <p className="text-xs text-muted-foreground">{admin.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{admin.username}</TableCell>
                      <TableCell>
                        <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            admin.status === 'active'
                              ? 'bg-success text-success-foreground'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {admin.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isSuperAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditAdmin(admin)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {admins.length === 0 && !adminsLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No administrators found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingStudent ? 'Edit Student' : 'Add New Student'}
            </DialogTitle>
            <DialogDescription>
              {editingStudent
                ? 'Update the student information.'
                : 'Enter the student details below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID *</Label>
                <Input
                  id="studentId"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  placeholder="2024-0001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">Grade Level</Label>
                <Select
                  value={formData.grade_level.toString()}
                  onValueChange={(v) => setFormData({ ...formData, grade_level: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['7', '8', '9', '10', '11', '12'].map((g) => (
                      <SelectItem key={g} value={g}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="St. Augustine"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Contact Info (Optional)
              </Label>
              <Input
                id="contact-info"
                value={formData.contact_info || ''}
                onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                placeholder="Phone number or address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guardian">Guardian Name</Label>
                <Input
                  id="guardian"
                  value={formData.guardian_name}
                  onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Guardian Contact</Label>
                <Input
                  id="contact"
                  value={formData.guardian_contact}
                  onChange={(e) => setFormData({ ...formData, guardian_contact: e.target.value })}
                  placeholder="09171234567"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.student_id || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingStudent ? 'Save Changes' : 'Add Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLibrarianModalOpen} onOpenChange={setIsLibrarianModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingLibrarian ? 'Edit Librarian' : 'Add New Librarian'}
            </DialogTitle>
            <DialogDescription>
              {editingLibrarian
                ? 'Update the librarian information.'
                : 'Enter the librarian details below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lib-name">Full Name *</Label>
                <Input
                  id="lib-name"
                  value={librarianFormData.name}
                  onChange={(e) => setLibrarianFormData({ ...librarianFormData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lib-empid">Employee ID *</Label>
                <Input
                  id="lib-empid"
                  value={librarianFormData.employee_id}
                  onChange={(e) => setLibrarianFormData({ ...librarianFormData, employee_id: e.target.value })}
                  placeholder="EMP-001"
                />
              </div>
            </div>
            {!editingLibrarian && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lib-username">Username *</Label>
                  <Input
                    id="lib-username"
                    value={librarianFormData.username}
                    onChange={(e) => setLibrarianFormData({ ...librarianFormData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lib-password">Password *</Label>
                  <Input
                    id="lib-password"
                    type="password"
                    value={librarianFormData.password}
                    onChange={(e) => setLibrarianFormData({ ...librarianFormData, password: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="lib-email">Email</Label>
              <Input
                id="lib-email"
                type="email"
                value={librarianFormData.email}
                onChange={(e) => setLibrarianFormData({ ...librarianFormData, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lib-phone">Phone</Label>
                <Input
                  id="lib-phone"
                  value={librarianFormData.phone}
                  onChange={(e) => setLibrarianFormData({ ...librarianFormData, phone: e.target.value })}
                  placeholder="09171234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lib-dept">Department</Label>
                <Input
                  id="lib-dept"
                  value={librarianFormData.department}
                  onChange={(e) => setLibrarianFormData({ ...librarianFormData, department: e.target.value })}
                  placeholder="Library"
                />
              </div>
            </div>
            {editingLibrarian && (
              <div className="space-y-2">
                <Label htmlFor="lib-status">Status</Label>
                <Select
                  value={librarianFormData.status || 'active'}
                  onValueChange={(v) => setLibrarianFormData({ ...librarianFormData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLibrarianModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveLibrarian}
              disabled={
                !librarianFormData.name ||
                !librarianFormData.employee_id ||
                (!editingLibrarian && (!librarianFormData.username || !librarianFormData.password)) ||
                isLibrarianProcessing
              }
            >
              {isLibrarianProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingLibrarian ? 'Save Changes' : 'Add Librarian'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAdminModalOpen} onOpenChange={setIsAdminModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingAdmin ? 'Edit Admin' : 'Add New Admin'}
            </DialogTitle>
            <DialogDescription>
              {editingAdmin
                ? 'Update the administrator information.'
                : 'Enter the administrator details below.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-name">Full Name *</Label>
              <Input
                id="admin-name"
                value={adminFormData.name}
                onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
              />
            </div>
            {!editingAdmin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-username">Username *</Label>
                  <Input
                    id="admin-username"
                    value={adminFormData.username}
                    onChange={(e) => setAdminFormData({ ...adminFormData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password *</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={adminFormData.password}
                    onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminFormData.email}
                onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
              />
            </div>
            {!editingAdmin && (
              <div className="space-y-2">
                <Label htmlFor="admin-role">Role</Label>
                <Select
                  value={adminFormData.role}
                  onValueChange={(v: 'admin' | 'super_admin') => setAdminFormData({ ...adminFormData, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {editingAdmin && (
              <div className="space-y-2">
                <Label htmlFor="admin-status">Status</Label>
                <Select
                  value={adminFormData.status || 'active'}
                  onValueChange={(v) => setAdminFormData({ ...adminFormData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdminModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAdmin}
              disabled={
                !adminFormData.name ||
                (!editingAdmin && (!adminFormData.username || !adminFormData.password)) ||
                isAdminProcessing
              }
            >
              {isAdminProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingAdmin ? 'Save Changes' : 'Add Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLibrarianId} onOpenChange={() => setDeleteLibrarianId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Librarian</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this librarian? This action cannot be undone.
              The associated user account will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLibrarian}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLibrarian.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersManagement;
