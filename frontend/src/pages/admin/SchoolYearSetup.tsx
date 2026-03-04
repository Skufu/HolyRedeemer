import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
  Archive,
  CalendarClock,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  RefreshCcw,
  Settings as SettingsIcon,
  ShieldAlert,
  Upload,
  Database,
  ListChecks,
} from 'lucide-react';
import {
  useArchiveGraduates,
  useExportArchive,
  useExportStudents,
  useImportStudents,
  useResetStudentData,
  useUpdatePolicies,
  useYearEndReports,
} from '@/hooks/useSchoolYear';
import { useBackupList, useCreateBackup, useDownloadBackup } from '@/hooks/useBackup';
import { useSettings } from '@/hooks/useSettings';
import { getErrorMessage } from '@/services/api';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const steps: { id: WizardStep; title: string; description: string }[] = [
  { id: 1, title: 'Archive Current Year Data', description: 'Export to CSV and prepare for cleanup' },
  { id: 2, title: 'Archive Graduated Students', description: 'Mark graduates and deactivate accounts' },
  { id: 3, title: 'Import New Students', description: 'Upload CSV of new enrollees' },
  { id: 4, title: 'Year-End Reports', description: 'Generate end-of-year summary' },
  { id: 5, title: 'Reset Student Data', description: 'Export to CSV and delete student activity' },
  { id: 6, title: 'Update Library Policies', description: 'Set new year rules and limits' },
];

const SchoolYearSetup: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const [archiveStartDate, setArchiveStartDate] = useState('');
  const [archiveEndDate, setArchiveEndDate] = useState('');
  const [includeAuditLogs, setIncludeAuditLogs] = useState(true);
  const [includeNotifications, setIncludeNotifications] = useState(true);

  const [graduateIds, setGraduateIds] = useState('');
  const [showArchiveGraduatesConfirm, setShowArchiveGraduatesConfirm] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    total: number;
    imported: number;
    skipped: number;
    errors: { row: number; message: string; data?: Record<string, string> }[];
  } | null>(null);

  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  const [resetStartDate, setResetStartDate] = useState('');
  const [resetEndDate, setResetEndDate] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSummary, setResetSummary] = useState<{
    transactions: number;
    fines: number;
    payments: number;
    requests: number;
    notifications: number;
    auditLogs: number;
    favorites: number;
    achievements: number;
  } | null>(null);

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [schoolYear, setSchoolYear] = useState('');
  const [policySettings, setPolicySettings] = useState<Record<string, string>>({
    max_books_per_student: '',
    loan_duration_days: '',
    max_renewals: '',
    fine_per_day: '',
    fine_grace_period_days: '',
    max_fine_cap: '',
    fine_block_threshold: '',
    reading_quota_per_year: '',
  });

  const exportArchive = useExportArchive();
  const archiveGraduates = useArchiveGraduates();
  const importStudents = useImportStudents();
  const exportStudents = useExportStudents();
  const reportsQuery = useYearEndReports({
    start_date: reportStartDate || undefined,
    end_date: reportEndDate || undefined,
  });
  const resetStudentData = useResetStudentData();
  const updatePolicies = useUpdatePolicies();

  const backupList = useBackupList();
  const createBackup = useCreateBackup();
  const downloadBackup = useDownloadBackup();

  const settingsQuery = useSettings();

  useEffect(() => {
    if (settingsQuery.data?.data && !settingsLoaded) {
      const settingsMap = settingsQuery.data.data.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      setSchoolYear(settingsMap.school_year || '');
      setPolicySettings((prev) => ({
        ...prev,
        max_books_per_student: settingsMap.max_books_per_student || prev.max_books_per_student,
        loan_duration_days: settingsMap.loan_duration_days || prev.loan_duration_days,
        max_renewals: settingsMap.max_renewals || prev.max_renewals,
        fine_per_day: settingsMap.fine_per_day || prev.fine_per_day,
        fine_grace_period_days: settingsMap.fine_grace_period_days || prev.fine_grace_period_days,
        max_fine_cap: settingsMap.max_fine_cap || prev.max_fine_cap,
        fine_block_threshold: settingsMap.fine_block_threshold || prev.fine_block_threshold,
        reading_quota_per_year: settingsMap.reading_quota_per_year || prev.reading_quota_per_year,
      }));
      setSettingsLoaded(true);
    }
  }, [settingsQuery.data, settingsLoaded]);

  const progressValue = useMemo(() => {
    const stepIndex = steps.findIndex((step) => step.id === currentStep) + 1;
    return Math.round((stepIndex / steps.length) * 100);
  }, [currentStep]);

  const graduateIdList = useMemo(() => {
    return graduateIds
      .split(/\s|,/g)
      .map((value) => value.trim())
      .filter(Boolean);
  }, [graduateIds]);

  const handleCompleteStep = (step: WizardStep) => {
    setCompletedSteps((prev) => ({ ...prev, [step]: true }));
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return '—';
    const date = typeof value === 'string' ? new Date(value) : value;
    return isNaN(date.getTime()) ? '—' : date.toLocaleString();
  };

  const formatBytes = (value: number) => {
    if (value === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(value) / Math.log(1024));
    const size = value / Math.pow(1024, index);
    return `${size.toFixed(2)} ${sizes[index]}`;
  };

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">School Year Setup</h1>
          <p className="text-muted-foreground">New year setup is restricted to Super Admins.</p>
        </div>
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            Only Super Admins can run the new year setup workflow. Please contact your system administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-primary">School Year Setup</h1>
          <p className="text-muted-foreground">Guided workflow to close the current school year and prepare for the next.</p>
        </div>
      </div>

      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display">Local Backup System (Recommended)</CardTitle>
              <CardDescription>Local file export only. No cloud storage required.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => createBackup.mutate()} disabled={createBackup.isPending} className="gap-2">
              {createBackup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Local file export (Recommended)
            </Button>
            <Button variant="outline" onClick={() => backupList.refetch()} disabled={backupList.isFetching}>
              Refresh List
            </Button>
          </div>
          <div className="rounded-lg border">
            <div className="grid grid-cols-3 text-xs font-medium text-muted-foreground px-4 py-2 border-b">
              <span>Backup File</span>
              <span>Size</span>
              <span>Created</span>
            </div>
            {backupList.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y">
                {(backupList.data?.data || []).map((item) => (
                  <div key={item.name} className="grid grid-cols-3 items-center px-4 py-3 text-sm">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-muted-foreground">{formatBytes(item.size)}</div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{formatDate(item.createdAt)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadBackup.mutate(item.name)}
                        disabled={downloadBackup.isPending}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
                {(backupList.data?.data || []).length === 0 && (
                  <div className="text-sm text-muted-foreground px-4 py-6 text-center">No backups created yet.</div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display">New Year Setup Wizard</CardTitle>
              <CardDescription>Complete each step in order to finalize the school year.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Step {currentStep} of {steps.length}</span>
              <span>{progressValue}% complete</span>
            </div>
            <Progress value={progressValue} />
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
              {steps.map((step) => {
                const isCompleted = completedSteps[step.id];
                const isCurrent = step.id === currentStep;

                return (
                  <div
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`p-2 rounded-lg border text-center cursor-pointer transition-colors ${isCurrent
                        ? 'border-primary bg-primary/5'
                        : isCompleted
                          ? 'border-success/50 bg-success/5 hover:bg-success/10'
                          : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                      }`}
                  >
                    <div className="font-medium flex items-center justify-center gap-1">
                      {step.title}
                      {isCompleted && !isCurrent && <span className="text-success ml-1">✓</span>}
                    </div>
                    <div className="text-muted-foreground mt-1">{step.description}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {currentStep === 1 && (
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <Archive className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <CardTitle className="font-display">Step 1: Archive Current Year Data</CardTitle>
                    <CardDescription>Export to CSV and prepare for cleanup.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <ListChecks className="h-4 w-4" />
                  <AlertTitle>Export to CSV and delete</AlertTitle>
                  <AlertDescription>
                    This step exports the current year data to CSV. Student data deletion happens in Step 5 after you confirm.
                  </AlertDescription>
                </Alert>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="archiveStart">Start Date</Label>
                    <Input id="archiveStart" type="date" value={archiveStartDate} onChange={(e) => setArchiveStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="archiveEnd">End Date</Label>
                    <Input id="archiveEnd" type="date" value={archiveEndDate} onChange={(e) => setArchiveEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id="includeAuditLogs"
                      checked={includeAuditLogs}
                      onCheckedChange={(checked) => setIncludeAuditLogs(Boolean(checked))}
                    />
                    <Label htmlFor="includeAuditLogs">Include audit logs</Label>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox
                      id="includeNotifications"
                      checked={includeNotifications}
                      onCheckedChange={(checked) => setIncludeNotifications(Boolean(checked))}
                    />
                    <Label htmlFor="includeNotifications">Include notifications</Label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={async () => {
                      await exportArchive.mutateAsync({
                        start_date: archiveStartDate || undefined,
                        end_date: archiveEndDate || undefined,
                        include_audit_logs: includeAuditLogs,
                        include_notifications: includeNotifications,
                      });
                      handleCompleteStep(1);
                    }}
                    disabled={exportArchive.isPending}
                    className="gap-2"
                  >
                    {exportArchive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                    Export Archive CSV
                  </Button>
                  {completedSteps[1] && (
                    <span className="text-xs text-success">Archive export completed.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <GraduationCap className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <CardTitle className="font-display">Step 2: Archive Graduated Students</CardTitle>
                    <CardDescription>Provide student IDs to mark as graduated.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTitle>Tip</AlertTitle>
                  <AlertDescription>
                    Export the current student list to identify graduating students. Students with active loans cannot be archived.
                  </AlertDescription>
                </Alert>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => exportStudents.mutate()}
                    disabled={exportStudents.isPending}
                    className="gap-2"
                  >
                    {exportStudents.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export Students CSV
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="graduateIds">Graduating Student IDs</Label>
                  <Textarea
                    id="graduateIds"
                    value={graduateIds}
                    onChange={(e) => setGraduateIds(e.target.value)}
                    placeholder="Enter student UUIDs separated by commas or new lines"
                  />
                  <p className="text-xs text-muted-foreground">{graduateIdList.length} IDs detected.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => setShowArchiveGraduatesConfirm(true)}
                    disabled={graduateIdList.length === 0 || archiveGraduates.isPending}
                  >
                    Archive Graduates
                  </Button>
                  {completedSteps[2] && (
                    <span className="text-xs text-success">Graduates archived successfully.</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Upload className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <CardTitle className="font-display">Step 3: Import New Students</CardTitle>
                    <CardDescription>Upload CSV of new students.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="importFile">CSV File</Label>
                    <Input
                      id="importFile"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const headers = ['username', 'password', 'student_id', 'name', 'email', 'grade_level', 'section', 'rfid_code', 'contact_info', 'guardian_name', 'guardian_contact'];
                      const sampleRow = ['jdelacruz', 'password123', '2025-0001', 'Juan Dela Cruz', 'juan@example.com', '7', 'St. Augustine', 'RFID-1234', '09123456789', 'Maria Dela Cruz', '09187654321'];
                      const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + sampleRow.join(",");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "student_import_template.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="gap-2 w-full sm:w-auto mt-2 sm:mt-0"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                {importFile && (
                  <p className="text-xs text-muted-foreground">Selected file: {importFile.name}</p>
                )}
                <Button
                  onClick={async () => {
                    if (!importFile) return;
                    try {
                      const result = await importStudents.mutateAsync(importFile);
                      setImportResult({
                        total: result.data.result.total,
                        imported: result.data.result.imported,
                        skipped: result.data.result.skipped,
                        errors: result.data.errors,
                      });
                      handleCompleteStep(3);
                    } catch (error) {
                      setImportResult({
                        total: 0,
                        imported: 0,
                        skipped: 0,
                        errors: [{ row: 0, message: getErrorMessage(error) }],
                      });
                    }
                  }}
                  disabled={!importFile || importStudents.isPending}
                  className="gap-2"
                >
                  {importStudents.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Import Students
                </Button>
                {importResult && (
                  <div className="grid gap-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Card className="bg-muted/40">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Total Rows</p>
                          <p className="text-2xl font-bold">{importResult.total}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-success/5 border-success/20">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Imported</p>
                          <p className="text-2xl font-bold text-success">{importResult.imported}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-warning/5 border-warning/20">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">Skipped</p>
                          <p className="text-2xl font-bold text-warning-foreground">{importResult.skipped}</p>
                        </CardContent>
                      </Card>
                    </div>
                    {importResult.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTitle>Import Errors</AlertTitle>
                        <AlertDescription>
                          {importResult.errors.slice(0, 5).map((err, index) => (
                            <div key={`${err.row}-${index}`} className="text-xs">
                              Row {err.row}: {err.message}
                            </div>
                          ))}
                          {importResult.errors.length > 5 && (
                            <div className="text-xs text-muted-foreground">
                              And {importResult.errors.length - 5} more errors.
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <FileSpreadsheet className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <CardTitle className="font-display">Step 4: Year-End Reports</CardTitle>
                    <CardDescription>Generate a summary of the current academic year.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reportStart">Start Date</Label>
                    <Input id="reportStart" type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportEnd">End Date</Label>
                    <Input id="reportEnd" type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    await reportsQuery.refetch();
                    handleCompleteStep(4);
                  }}
                  disabled={reportsQuery.isFetching}
                  className="gap-2"
                >
                  {reportsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  Generate Reports
                </Button>
                {reportsQuery.data?.data && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-muted/40"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Transactions</p><p className="text-xl font-bold">{reportsQuery.data.data.totalTransactions}</p></CardContent></Card>
                    <Card className="bg-muted/40"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Loans</p><p className="text-xl font-bold">{reportsQuery.data.data.activeLoans}</p></CardContent></Card>
                    <Card className="bg-muted/40"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Fines</p><p className="text-xl font-bold">₱{reportsQuery.data.data.pendingFines.toFixed(2)}</p></CardContent></Card>
                    <Card className="bg-muted/40"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active Students</p><p className="text-xl font-bold">{reportsQuery.data.data.activeStudents}</p></CardContent></Card>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 5 && (
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <RefreshCcw className="h-5 w-5 text-warning-foreground" />
                  </div>
                  <div>
                    <CardTitle className="font-display">Step 5: Reset Student Data</CardTitle>
                    <CardDescription>Export to CSV and delete student activity records.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTitle>Destructive Action</AlertTitle>
                  <AlertDescription>
                    This permanently deletes transactions, fines, payments, requests, notifications, audit logs, favorites, and achievements in the selected date range.
                  </AlertDescription>
                </Alert>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="resetStart">Start Date</Label>
                    <Input id="resetStart" type="date" value={resetStartDate} onChange={(e) => setResetStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resetEnd">End Date</Label>
                    <Input id="resetEnd" type="date" value={resetEndDate} onChange={(e) => setResetEndDate(e.target.value)} />
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={resetStudentData.isPending}
                >
                  Reset Student Data
                </Button>
                {resetSummary && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(resetSummary).map(([key, value]) => (
                      <Card key={key} className="bg-muted/40">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">{key}</p>
                          <p className="text-xl font-bold">{value}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 6 && (
            <Card className="border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <SettingsIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-display">Step 6: Update Library Policies</CardTitle>
                    <CardDescription>Set the new school year and policy defaults.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolYear">School Year</Label>
                  <Input id="schoolYear" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} placeholder="2025-2026" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Object.entries(policySettings).map(([key, value]) => {
                    const fieldId = `policy-${key}`;
                    return (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={fieldId} className="text-xs capitalize">
                          {key.replace(/_/g, ' ')}
                        </Label>
                        <Input
                          id={fieldId}
                          value={value}
                          onChange={(e) => setPolicySettings((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                    );
                  })}
                </div>
                <Button
                  onClick={async () => {
                    await updatePolicies.mutateAsync({
                      school_year: schoolYear.trim() || undefined,
                      settings: Object.fromEntries(
                        Object.entries(policySettings).filter(([, value]) => value.trim() !== '')
                      ),
                    });
                    handleCompleteStep(6);
                  }}
                  disabled={updatePolicies.isPending}
                  className="gap-2"
                >
                  {updatePolicies.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SettingsIcon className="h-4 w-4" />}
                  Save Policies
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
              Previous
            </Button>
            <div className="text-xs text-muted-foreground">
              Completed steps: {Object.values(completedSteps).filter(Boolean).length}/{steps.length}
            </div>
            <Button onClick={handleNext} disabled={currentStep === 6}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showArchiveGraduatesConfirm} onOpenChange={setShowArchiveGraduatesConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Graduated Students</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the selected students as graduated and deactivate their accounts. Students with active loans cannot be archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction
              asChild
              onClick={async () => {
                await archiveGraduates.mutateAsync({ student_ids: graduateIdList });
                handleCompleteStep(2);
                setShowArchiveGraduatesConfirm(false);
              }}
            >
              <Button variant="destructive" disabled={archiveGraduates.isPending}>
                {archiveGraduates.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Archive'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Student Data</AlertDialogTitle>
            <AlertDialogDescription>
              This action permanently deletes student activity records in the selected date range. Make sure you exported the archive CSV.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction
              asChild
              onClick={async () => {
                const response = await resetStudentData.mutateAsync({
                  start_date: resetStartDate || undefined,
                  end_date: resetEndDate || undefined,
                });
                setResetSummary(response.data);
                handleCompleteStep(5);
                setShowResetConfirm(false);
              }}
            >
              <Button variant="destructive" disabled={resetStudentData.isPending}>
                {resetStudentData.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SchoolYearSetup;
