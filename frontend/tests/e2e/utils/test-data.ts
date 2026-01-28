export const testUsers = {
  admin: {
    username: process.env.E2E_ADMIN_USERNAME || 'admin',
    password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
    role: 'admin' as const,
  },
  librarian: {
    username: process.env.E2E_LIBRARIAN_USERNAME || 'librarian',
    password: process.env.E2E_LIBRARIAN_PASSWORD || 'lib123',
    role: 'librarian' as const,
  },
  student: {
    username: process.env.E2E_STUDENT_USERNAME || 'student001',
    password: process.env.E2E_STUDENT_PASSWORD || 'student123',
    role: 'student' as const,
  },
};

export const dashboardPaths = {
  admin: '/admin/dashboard',
  librarian: '/librarian/dashboard',
  student: '/student/dashboard',
};
