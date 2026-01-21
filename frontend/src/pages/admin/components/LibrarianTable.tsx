import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Edit,
  UserX,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Librarian } from '@/services/users';

interface LibrarianTableProps {
  librarians: Librarian[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEdit: (librarian: Librarian) => void;
  onDelete: (id: string) => void;
}

const LibrarianTable: React.FC<LibrarianTableProps> = ({
  librarians,
  isLoading,
  searchTerm,
  onSearchChange,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search librarians..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Librarian</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {librarians.map((librarian) => (
              <TableRow key={librarian.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {librarian.name?.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{librarian.name}</p>
                      <p className="text-sm text-muted-foreground">{librarian.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{librarian.employee_id}</TableCell>
                <TableCell>{librarian.department}</TableCell>
                <TableCell>
                  <Badge variant={librarian.status === 'active' ? 'default' : 'secondary'}>
                    {librarian.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(librarian)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(librarian.id)}
                    >
                      <UserX className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LibrarianTable;
