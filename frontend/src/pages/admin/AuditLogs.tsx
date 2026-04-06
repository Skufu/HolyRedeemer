import React, { useState } from 'react';
import type { AuditLog } from '@/services/audit';
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
import { Search, History, Filter, Loader2, Eye, Code } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAudit';

const actionColors: Record<string, string> = {
  checkout: 'bg-info/20 text-info-foreground',
  return: 'bg-success/20 text-success',
  create: 'bg-secondary/20 text-secondary-foreground',
  update: 'bg-warning/20 text-warning-foreground',
  delete: 'bg-destructive/20 text-destructive',
  login: 'bg-primary/20 text-primary',
  logout: 'bg-muted text-muted-foreground',
  renew: 'bg-info/20 text-info-foreground',
  fine_created: 'bg-warning/20 text-warning-foreground',
  payment_received: 'bg-success/20 text-success',
  settings_changed: 'bg-secondary/20 text-secondary-foreground',
};

const AuditLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logsData, isLoading } = useAuditLogs({
    page,
    per_page: 50,
    action: actionFilter !== 'all' ? actionFilter : undefined,
  });

  const logs = logsData?.data || [];
  const meta = logsData?.meta;

  const uniqueActions = [
    'login', 'logout', 'create', 'update', 'delete',
    'checkout', 'return', 'renew', 'fine_created', 'payment_received', 'settings_changed'
  ];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.entityType?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (log.action?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">Audit Logs</h1>
          <p className="text-muted-foreground">Track all system activities and changes</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg border border-primary/10">
          <History className="h-5 w-5 text-primary" />
          <span className="font-medium text-primary">{meta?.total || 0} total entries</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, entity, or action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map((action) => (
              <SelectItem key={action} value={action}>
                {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log, index) => (
              <TableRow
                key={log.id}
                className="animate-fade-in-up cursor-pointer hover:bg-muted/30"
                style={{ animationDelay: `${index * 0.02}s` }}
                onClick={() => setSelectedLog(log)}
              >
                <TableCell className="text-sm">{formatTimestamp(log.createdAt)}</TableCell>
                <TableCell className="font-medium">{log.userName || log.username || 'System'}</TableCell>
                <TableCell>
                  <Badge className={actionColors[log.action] || 'bg-muted'}>
                    {log.action.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>{log.entityType || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.ipAddress || '-'}</TableCell>
                <TableCell className="text-right">
                  <button type="button" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground mt-4">No audit logs found</p>
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= meta.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" /> Audit Log Details
            </DialogTitle>
            <DialogDescription>
              {selectedLog?.action?.replace('_', ' ')} — {formatTimestamp(selectedLog?.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User</p>
                  <p className="font-medium">{selectedLog.userName || selectedLog.username || 'System'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Action</p>
                  <Badge className={actionColors[selectedLog.action] || 'bg-muted'}>
                    {selectedLog.action.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Entity Type</p>
                  <p className="font-medium">{selectedLog.entityType || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Entity ID</p>
                  <p className="font-mono text-xs">{selectedLog.entityId || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                  <p className="font-mono text-sm">{selectedLog.ipAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User Agent</p>
                  <p className="text-xs truncate">{selectedLog.userAgent || '-'}</p>
                </div>
              </div>
              {selectedLog.oldValues && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Old Values</p>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.newValues && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">New Values</p>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.newValues, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
