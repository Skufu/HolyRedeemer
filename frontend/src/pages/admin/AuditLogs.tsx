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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, History, Filter, Loader2 } from 'lucide-react';
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
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4" />
          <span>{meta?.total || 0} total entries</span>
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
              <TableHead>Entity ID</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log, index) => (
              <TableRow
                key={log.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.02}s` }}
              >
                <TableCell className="text-sm">{formatTimestamp(log.createdAt)}</TableCell>
                <TableCell className="font-medium">{log.userName || log.username || 'System'}</TableCell>
                <TableCell>
                  <Badge className={actionColors[log.action] || 'bg-muted'}>
                    {log.action.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>{log.entityType || '-'}</TableCell>
                <TableCell className="font-mono text-xs">{log.entityId?.slice(0, 8) || '-'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.ipAddress || '-'}</TableCell>
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
    </div>
  );
};

export default AuditLogs;
