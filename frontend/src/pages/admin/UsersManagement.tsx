import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { useStudents, useCreateStudent, useUpdateStudent } from '@/hooks/useStudents';
import { useLibrarians, useCreateLibrarian, useUpdateLibrarian, useDeleteLibrarian, useAdmins, useCreateAdmin, useUpdateAdmin } from '@/hooks/useUsers';
import { CreateStudentRequest, Student } from '@/services/students';
import { Librarian, Admin, CreateLibrarianRequest, CreateAdminRequest } from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';
import StudentTable from './components/StudentTable';
import LibrarianTable from './components/LibrarianTable';
import AdminTable from './components/AdminTable';

const UsersManagement: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [librarianSearch, setLibrarianSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');

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
    username: '',
    password: '',
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLibrarianModalOpen, setIsLibrarianModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingLibrarian, setEditingLibrarian] = useState<Librarian | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [deleteLibrarianId, setDeleteLibrarianId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setFormData({
      username: '',
      password: '',
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
      username: student.username || '',
      password: '',
      name: student.name || '',
      student_id: student.student_id || '',
      email: student.email || '',
      grade_level: student.gradeLevel || 7,
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
        data: librarianFormData as Partial<Librarian>,
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
        data: adminFormData as Partial<Admin>,
      });
    } else {
      await createAdmin.mutateAsync(adminFormData);
    }
    setIsAdminModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage students, librarians, and administrators</p>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="librarians">Librarians</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="admins">Admins</TabsTrigger>}
        </TabsList>

        <TabsContent value="students">
          <div className="space-y-4">
            <Button onClick={handleOpenAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
            <StudentTable
              students={students}
              isLoading={studentsLoading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              gradeFilter="all"
              onGradeFilterChange={() => { }}
              onEdit={handleOpenEdit}
              onDeactivate={handleDeactivate}
            />
          </div>
        </TabsContent>

        <TabsContent value="librarians">
          <div className="space-y-4">
            <Button onClick={handleOpenAddLibrarian}>
              <Plus className="mr-2 h-4 w-4" />
              Add Librarian
            </Button>
            <LibrarianTable
              librarians={librarians}
              isLoading={librariansLoading}
              searchTerm={librarianSearch}
              onSearchChange={setLibrarianSearch}
              onEdit={handleOpenEditLibrarian}
              onDelete={setDeleteLibrarianId}
            />
          </div>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="admins">
            <div className="space-y-4">
              <Button onClick={handleOpenAddAdmin}>
                <Plus className="mr-2 h-4 w-4" />
                Add Admin
              </Button>
              <AdminTable
                admins={admins}
                isLoading={adminsLoading}
                searchTerm={adminSearch}
                onSearchChange={setAdminSearch}
                onEdit={handleOpenEditAdmin}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
            <DialogDescription>
              {editingStudent ? 'Update student information below.' : 'Fill in the details to add a new student.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingStudent}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="student_id">Student ID *</Label>
                <Input
                  id="student_id"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                />
              </div>
            </div>

            {!editingStudent && (
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="grade_level">Grade Level *</Label>
                <Input
                  id="grade_level"
                  type="number"
                  value={formData.grade_level}
                  onChange={(e) => setFormData({ ...formData, grade_level: parseInt(e.target.value) || 7 })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="guardian_name">Guardian Name</Label>
              <Input
                id="guardian_name"
                value={formData.guardian_name}
                onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="guardian_contact">Guardian Contact</Label>
              <Input
                id="guardian_contact"
                value={formData.guardian_contact}
                onChange={(e) => setFormData({ ...formData, guardian_contact: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createStudent.isPending || updateStudent.isPending}>
              {createStudent.isPending || updateStudent.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingStudent ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLibrarianModalOpen} onOpenChange={setIsLibrarianModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLibrarian ? 'Edit Librarian' : 'Add Librarian'}</DialogTitle>
            <DialogDescription>
              {editingLibrarian ? 'Update librarian information below.' : 'Fill in the details to add a new librarian.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="librarian-name">Full Name *</Label>
              <Input
                id="librarian-name"
                value={librarianFormData.name}
                onChange={(e) => setLibrarianFormData({ ...librarianFormData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={librarianFormData.username}
                onChange={(e) => setLibrarianFormData({ ...librarianFormData, username: e.target.value })}
              />
            </div>
            {!editingLibrarian && (
              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={librarianFormData.password}
                  onChange={(e) => setLibrarianFormData({ ...librarianFormData, password: e.target.value })}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                value={librarianFormData.employee_id}
                onChange={(e) => setLibrarianFormData({ ...librarianFormData, employee_id: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={librarianFormData.email}
                onChange={(e) => setLibrarianFormData({ ...librarianFormData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={librarianFormData.phone}
                onChange={(e) => setLibrarianFormData({ ...librarianFormData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={librarianFormData.department}
                onChange={(e) => setLibrarianFormData({ ...librarianFormData, department: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLibrarianModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLibrarian} disabled={createLibrarian.isPending || updateLibrarian.isPending}>
              {createLibrarian.isPending || updateLibrarian.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingLibrarian ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAdminModalOpen} onOpenChange={setIsAdminModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAdmin ? 'Edit Admin' : 'Add Admin'}</DialogTitle>
            <DialogDescription>
              {editingAdmin ? 'Update admin information below.' : 'Fill in the details to add a new admin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-name">Full Name *</Label>
              <Input
                id="admin-name"
                value={adminFormData.name}
                onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="admin-username">Username *</Label>
              <Input
                id="admin-username"
                value={adminFormData.username}
                onChange={(e) => setAdminFormData({ ...adminFormData, username: e.target.value })}
              />
            </div>
            {!editingAdmin && (
              <div className="grid gap-2">
                <Label htmlFor="admin-password">Password *</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminFormData.password}
                  onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminFormData.email}
                onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={adminFormData.role}
                onChange={(e) => setAdminFormData({ ...adminFormData, role: e.target.value as 'admin' | 'super_admin' })}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdminModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdmin} disabled={createAdmin.isPending || updateAdmin.isPending}>
              {createAdmin.isPending || updateAdmin.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editingAdmin ? 'Update' : 'Create'}
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
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild onClick={handleDeleteLibrarian}>
              <Button variant="destructive">
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersManagement;
