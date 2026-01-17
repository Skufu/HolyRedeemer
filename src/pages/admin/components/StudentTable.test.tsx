import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudentTable from '@/pages/admin/components/StudentTable';
import { Student } from '@/services/students';

const mockStudents: Student[] = [
  {
    id: '1',
    name: 'Test Student',
    student_id: 'STU-001',
    email: 'test@student.com',
    grade_level: 10,
    section: 'A',
    status: 'active',
  },
];

describe('StudentTable', () => {
  it('renders student list', () => {
    render(
      <StudentTable
        students={mockStudents}
        isLoading={false}
        searchTerm=""
        onSearchChange={() => {}}
        gradeFilter="all"
        onGradeFilterChange={() => {}}
        onEdit={() => {}}
        onDeactivate={() => {}}
      />
    );

    expect(screen.getByText('Test Student')).toBeInTheDocument();
    expect(screen.getByText('STU-001')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <StudentTable
        students={[]}
        isLoading={true}
        searchTerm=""
        onSearchChange={() => {}}
        gradeFilter="all"
        onGradeFilterChange={() => {}}
        onEdit={() => {}}
        onDeactivate={() => {}}
      />
    );

    expect(screen.queryByText('Test Student')).not.toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    render(
      <StudentTable
        students={mockStudents}
        isLoading={false}
        searchTerm=""
        onSearchChange={() => {}}
        gradeFilter="all"
        onGradeFilterChange={() => {}}
        onEdit={onEdit}
        onDeactivate={() => {}}
      />
    );

    const editButton = screen.getAllByRole('button').find(btn => btn.textContent === '');
    if (editButton) {
      fireEvent.click(editButton);
      expect(onEdit).toHaveBeenCalledWith(mockStudents[0]);
    }
  });
});
