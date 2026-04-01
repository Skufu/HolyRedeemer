import React, { useMemo, useState } from 'react';
import { useDamageLostIncidents } from '@/hooks/useDamageLost';
import { DamageLostIncident, ListIncidentsParams } from '@/services/damage_lost';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Search,
  AlertTriangle,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const severityColors: Record<string, string> = {
  minor: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  severe: 'bg-orange-100 text-orange-800',
  total_loss: 'bg-red-100 text-red-800',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  assessed: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
};

const LibrarianDamageLost: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState<DamageLostIncident | null>(null);
  const itemsPerPage = 10;

  const params: ListIncidentsParams = useMemo(
    () => ({
      page: currentPage,
      per_page: itemsPerPage,
      incident_type: typeFilter !== 'all' ? typeFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      student_id: searchTerm || undefined,
    }),
    [currentPage, typeFilter, statusFilter, searchTerm],
  );

  const { data: incidentsData, isLoading } = useDamageLostIncidents(params);

  const incidents = incidentsData?.data || [];
  const totalItems = incidentsData?.meta?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-display font-bold text-foreground">Damage & Lost Incidents</h1>
        <p className="text-muted-foreground mt-1">View incident reports and details</p>
      </div>

      <Card className="library-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="lib-incident-search" className="text-sm font-medium mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="lib-incident-search"
                  placeholder="Search by student name or ID..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-[180px]">
              <label htmlFor="lib-incident-type" className="text-sm font-medium mb-1 block">Incident Type</label>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger id="lib-incident-type"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="damage">Damage</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <label htmlFor="lib-incident-status" className="text-sm font-medium mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger id="lib-incident-status"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assessed">Assessed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="library-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No incidents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    incidents.map((incident: DamageLostIncident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-mono text-xs">{incident.receipt_no}</TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="font-medium truncate">{incident.book_title || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{incident.book_author || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{incident.student_name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{incident.student_number || ''}</p>
                          </div>
                        </TableCell>
                        <TableCell>{incident.grade_level ? `Grade ${incident.grade_level}` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={incident.incident_type === 'lost' ? 'destructive' : 'default'}>
                            {incident.incident_type === 'lost' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {incident.incident_type === 'lost' ? 'Lost' : 'Damage'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('font-normal', severityColors[incident.severity] || '')}>
                            {incident.severity.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{(incident.assessed_cost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('font-normal', statusColors[incident.status] || '')}>
                            {incident.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {incident.reported_at ? new Date(incident.reported_at).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
                            onClick={() => setSelectedIncident(incident)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-8 px-3 rounded-md border bg-background hover:bg-accent transition-colors disabled:opacity-50"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-8 px-3 rounded-md border bg-background hover:bg-accent transition-colors disabled:opacity-50"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Incident Details</DialogTitle>
            <DialogDescription>Receipt: {selectedIncident?.receipt_no}</DialogDescription>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Book</p>
                  <p className="font-medium">{selectedIncident.book_title || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Student</p>
                  <p className="font-medium">{selectedIncident.student_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Grade / Section</p>
                  <p>Grade {selectedIncident.grade_level || '-'} - {selectedIncident.section || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Incident Type</p>
                  <Badge variant={selectedIncident.incident_type === 'lost' ? 'destructive' : 'default'}>
                    {selectedIncident.incident_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Severity</p>
                  <Badge className={severityColors[selectedIncident.severity] || ''}>
                    {selectedIncident.severity.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Assessed Cost</p>
                  <p className="font-bold text-lg">₱{(selectedIncident.assessed_cost || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={statusColors[selectedIncident.status] || ''}>
                    {selectedIncident.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reported</p>
                  <p>{selectedIncident.reported_at ? new Date(selectedIncident.reported_at).toLocaleString() : '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-sm mt-1">{selectedIncident.description || 'No description provided'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LibrarianDamageLost;
