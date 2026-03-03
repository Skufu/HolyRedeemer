import React, { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    FileSpreadsheet,
    Upload,
    Download,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    BookOpen,
    Users,
    ChevronDown,
    X,
    FileUp,
} from 'lucide-react';
import { useImportStudents } from '@/hooks/useSchoolYear';
import { booksService, CreateBookRequest } from '@/services/books';
import { useCategories } from '@/hooks/useBooks';
import { getErrorMessage } from '@/services/api';

// ── CSV helpers ──────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuotes) {
                if (ch === '"') {
                    if (i + 1 < line.length && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current += ch;
                }
            } else {
                if (ch === '"') {
                    inQuotes = true;
                } else if (ch === ',') {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);
    return { headers, rows };
}

function generateCSV(headers: string[], sampleRows?: string[][]): string {
    const lines = [headers.join(',')];
    if (sampleRows) {
        sampleRows.forEach((row) => {
            lines.push(row.map((cell) => (cell.includes(',') ? `"${cell}"` : cell)).join(','));
        });
    }
    return lines.join('\n');
}

function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ── Templates ────────────────────────────────────────────────────────────────

const BOOK_HEADERS = ['isbn', 'title', 'author', 'category', 'publisher', 'publication_year', 'shelf_location', 'initial_copies'];
const BOOK_SAMPLE: string[][] = [
    ['978-0-06-112008-4', 'To Kill a Mockingbird', 'Harper Lee', 'Fiction', 'J. B. Lippincott & Co.', '1960', 'A-101', '3'],
    ['978-0-452-28423-4', '1984', 'George Orwell', 'Fiction', 'Secker & Warburg', '1949', 'A-102', '2'],
];

const STUDENT_HEADERS = ['student_id', 'username', 'name', 'email', 'grade_level', 'section', 'rfid_code', 'contact_info', 'guardian_name', 'guardian_contact'];
const STUDENT_SAMPLE: string[][] = [
    ['2025-00001', 'jdcruz', 'Juan Dela Cruz', 'juan@student.hr.edu.ph', '7', 'St. Peter', '', '09171234567', 'Maria Dela Cruz', '09181234567'],
];

// ── Types ────────────────────────────────────────────────────────────────────

interface ImportError {
    row: number;
    message: string;
    data?: Record<string, string>;
}

interface ImportResult {
    total: number;
    imported: number;
    skipped: number;
    errors: ImportError[];
}

// ── Dropzone component ───────────────────────────────────────────────────────

interface DropzoneProps {
    file: File | null;
    onFile: (file: File | null) => void;
    accept?: string;
}

const Dropzone: React.FC<DropzoneProps> = ({ file, onFile, accept = '.csv' }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f && (f.name.endsWith('.csv') || f.type === 'text/csv')) {
                onFile(f);
            }
        },
        [onFile]
    );

    return (
        <div
            onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`
        relative cursor-pointer rounded-xl border-2 border-dashed
        transition-all duration-200
        ${dragOver
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : file
                        ? 'border-success/50 bg-success/5'
                        : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
        p-8 text-center
      `}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
                <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-success">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                            e.stopPropagation();
                            onFile(null);
                        }}
                    >
                        <X className="h-3 w-3 mr-1" />
                        Remove
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileUp className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-sm">
                            Drop your CSV file here or <span className="text-primary underline">browse</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Supports .csv files</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── CSV Preview ──────────────────────────────────────────────────────────────

const CSVPreview: React.FC<{ headers: string[]; rows: string[][]; maxRows?: number }> = ({
    headers,
    rows,
    maxRows = 10,
}) => {
    const displayRows = rows.slice(0, maxRows);
    return (
        <div className="rounded-lg border overflow-hidden">
            <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                    Preview — showing {displayRows.length} of {rows.length} rows
                </span>
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30">
                            <TableHead className="w-12 text-center">#</TableHead>
                            {headers.map((h) => (
                                <TableHead key={h} className="text-xs font-semibold whitespace-nowrap">
                                    {h}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayRows.map((row, i) => (
                            <TableRow key={i}>
                                <TableCell className="text-center text-xs text-muted-foreground">{i + 1}</TableCell>
                                {headers.map((_, j) => (
                                    <TableCell key={j} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                                        {row[j] || <span className="text-muted-foreground italic">empty</span>}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

// ── Results Summary ──────────────────────────────────────────────────────────

const ResultsSummary: React.FC<{ result: ImportResult }> = ({ result }) => {
    const [errorsOpen, setErrorsOpen] = useState(false);

    return (
        <div className="space-y-4 animate-fade-in-up">
            <div className="grid gap-3 sm:grid-cols-3">
                <Card className="bg-muted/40">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Rows</p>
                            <p className="text-2xl font-bold">{result.total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-success/5 border-success/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-success/10">
                            <CheckCircle2 className="h-5 w-5 text-success" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Imported</p>
                            <p className="text-2xl font-bold text-success">{result.imported}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className={`${result.skipped > 0 ? 'bg-warning/5 border-warning/20' : 'bg-muted/40'}`}>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${result.skipped > 0 ? 'bg-warning/10' : 'bg-muted'}`}>
                            <AlertTriangle className={`h-5 w-5 ${result.skipped > 0 ? 'text-warning-foreground' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Skipped / Errors</p>
                            <p className={`text-2xl font-bold ${result.skipped > 0 ? 'text-warning-foreground' : ''}`}>
                                {result.skipped}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {result.errors.length > 0 && (
                <Collapsible open={errorsOpen} onOpenChange={setErrorsOpen}>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between text-destructive hover:text-destructive">
                            <span className="flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                {result.errors.length} error{result.errors.length !== 1 ? 's' : ''} found
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${errorsOpen ? 'rotate-180' : ''}`} />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="rounded-lg border border-destructive/20 mt-2 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-destructive/5">
                                        <TableHead className="w-16 text-xs">Row</TableHead>
                                        <TableHead className="text-xs">Error Message</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {result.errors.map((err, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-mono text-xs">{err.row}</TableCell>
                                            <TableCell className="text-xs text-destructive">{err.message}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            )}
        </div>
    );
};

// ── Main Component ───────────────────────────────────────────────────────────

const ExcelMigration: React.FC = () => {
    // ─── Books state ───
    const [bookFile, setBookFile] = useState<File | null>(null);
    const [bookPreview, setBookPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
    const [bookImporting, setBookImporting] = useState(false);
    const [bookProgress, setBookProgress] = useState(0);
    const [bookResult, setBookResult] = useState<ImportResult | null>(null);

    // ─── Students state ───
    const [studentFile, setStudentFile] = useState<File | null>(null);
    const [studentPreview, setStudentPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
    const [studentResult, setStudentResult] = useState<ImportResult | null>(null);

    const importStudents = useImportStudents();
    const categoriesQuery = useCategories();

    // ── File handler: parse for preview ──────────────────────────────────────
    const handleFile = useCallback(
        (file: File | null, type: 'book' | 'student') => {
            if (type === 'book') {
                setBookFile(file);
                setBookPreview(null);
                setBookResult(null);
            } else {
                setStudentFile(file);
                setStudentPreview(null);
                setStudentResult(null);
            }

            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const parsed = parseCSV(text);
                if (type === 'book') {
                    setBookPreview(parsed);
                } else {
                    setStudentPreview(parsed);
                }
            };
            reader.readAsText(file);
        },
        []
    );

    // ── Import Books (client-side parsing → sequential API calls) ────────────
    const handleImportBooks = useCallback(async () => {
        if (!bookFile || !bookPreview) return;

        setBookImporting(true);
        setBookProgress(0);
        setBookResult(null);

        const { headers, rows } = bookPreview;
        const categories = categoriesQuery.data?.data || [];
        const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

        const result: ImportResult = { total: rows.length, imported: 0, skipped: 0, errors: [] };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const record: Record<string, string> = {};
            headers.forEach((h, j) => {
                record[h.trim().toLowerCase()] = (row[j] || '').trim();
            });

            // Validate required fields
            if (!record.title) {
                result.errors.push({ row: i + 2, message: 'Missing required field: title', data: record });
                result.skipped++;
                setBookProgress(Math.round(((i + 1) / rows.length) * 100));
                continue;
            }
            if (!record.author) {
                result.errors.push({ row: i + 2, message: 'Missing required field: author', data: record });
                result.skipped++;
                setBookProgress(Math.round(((i + 1) / rows.length) * 100));
                continue;
            }

            // Resolve category
            let categoryId: string | undefined;
            if (record.category) {
                categoryId = categoryMap.get(record.category.toLowerCase());
                if (!categoryId) {
                    // Try to create the category
                    try {
                        const catResult = await booksService.createCategory({ name: record.category });
                        categoryId = catResult.data.id;
                        categoryMap.set(record.category.toLowerCase(), categoryId);
                    } catch {
                        // Category creation failed, proceed without category
                    }
                }
            }

            const bookPayload: CreateBookRequest = {
                isbn: record.isbn || undefined,
                title: record.title,
                author: record.author,
                category_id: categoryId,
                publisher: record.publisher || undefined,
                publication_year: record.publication_year ? parseInt(record.publication_year, 10) : undefined,
                shelf_location: record.shelf_location || undefined,
                initial_copies: record.initial_copies ? parseInt(record.initial_copies, 10) : 1,
            };

            try {
                await booksService.create(bookPayload);
                result.imported++;
            } catch (err) {
                result.errors.push({ row: i + 2, message: getErrorMessage(err), data: record });
                result.skipped++;
            }

            setBookProgress(Math.round(((i + 1) / rows.length) * 100));
        }

        setBookResult(result);
        setBookImporting(false);
    }, [bookFile, bookPreview, categoriesQuery.data]);

    // ── Import Students (backend endpoint) ───────────────────────────────────
    const handleImportStudents = useCallback(async () => {
        if (!studentFile) return;

        try {
            const response = await importStudents.mutateAsync(studentFile);
            setStudentResult({
                total: response.data.result.total,
                imported: response.data.result.imported,
                skipped: response.data.result.skipped,
                errors: response.data.errors.map((e) => ({
                    row: e.row,
                    message: e.message,
                    data: e.data,
                })),
            });
        } catch (error) {
            setStudentResult({
                total: 0,
                imported: 0,
                skipped: 1,
                errors: [{ row: 0, message: getErrorMessage(error) }],
            });
        }
    }, [studentFile, importStudents]);

    // ── Template downloads ───────────────────────────────────────────────────
    const downloadBookTemplate = () => {
        const csv = generateCSV(BOOK_HEADERS, BOOK_SAMPLE);
        downloadCSV(csv, 'book_import_template.csv');
    };

    const downloadStudentTemplate = () => {
        const csv = generateCSV(STUDENT_HEADERS, STUDENT_SAMPLE);
        downloadCSV(csv, 'student_import_template.csv');
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-primary">Excel Migration</h1>
                    <p className="text-muted-foreground">Import books and students from CSV spreadsheets</p>
                </div>
                <Badge variant="outline" className="self-start sm:self-auto gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    CSV Import
                </Badge>
            </div>

            <Tabs defaultValue="books" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="books">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Import Books
                        </div>
                    </TabsTrigger>
                    <TabsTrigger value="students">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Import Students
                        </div>
                    </TabsTrigger>
                </TabsList>

                {/* ── Import Books Tab ──────────────────────────────────────────── */}
                <TabsContent value="books" className="space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-6">
                            {/* Step 1: Template */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold text-sm">Step 1: Download Template</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Get a pre-formatted CSV file with the correct column headers
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={downloadBookTemplate} className="gap-2 self-start">
                                    <Download className="h-4 w-4" />
                                    Download Template
                                </Button>
                            </div>

                            <div className="border-t" />

                            {/* Step 2: Upload */}
                            <div>
                                <h3 className="font-semibold text-sm mb-3">Step 2: Upload CSV File</h3>
                                <Dropzone
                                    file={bookFile}
                                    onFile={(f) => handleFile(f, 'book')}
                                />
                            </div>

                            {/* Step 3: Preview */}
                            {bookPreview && bookPreview.rows.length > 0 && (
                                <>
                                    <div className="border-t" />
                                    <div>
                                        <h3 className="font-semibold text-sm mb-3">Step 3: Preview Data</h3>
                                        <CSVPreview headers={bookPreview.headers} rows={bookPreview.rows} />
                                    </div>
                                </>
                            )}

                            {/* Step 4: Import */}
                            {bookPreview && bookPreview.rows.length > 0 && !bookResult && (
                                <>
                                    <div className="border-t" />
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-sm">Step 4: Import</h3>
                                        {bookImporting && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>Importing books…</span>
                                                    <span>{bookProgress}%</span>
                                                </div>
                                                <Progress value={bookProgress} className="h-2" />
                                            </div>
                                        )}
                                        <Button
                                            onClick={handleImportBooks}
                                            disabled={bookImporting}
                                            className="gap-2"
                                        >
                                            {bookImporting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                            {bookImporting ? 'Importing…' : `Import ${bookPreview.rows.length} Book${bookPreview.rows.length !== 1 ? 's' : ''}`}
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Results */}
                            {bookResult && (
                                <>
                                    <div className="border-t" />
                                    <div>
                                        <h3 className="font-semibold text-sm mb-3">Import Results</h3>
                                        <ResultsSummary result={bookResult} />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-4 gap-2"
                                            onClick={() => {
                                                setBookFile(null);
                                                setBookPreview(null);
                                                setBookResult(null);
                                                setBookProgress(0);
                                            }}
                                        >
                                            <Upload className="h-4 w-4" />
                                            Import Another File
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>CSV Format Tips</AlertTitle>
                        <AlertDescription className="text-xs space-y-1">
                            <p>• Required columns: <strong>title</strong>, <strong>author</strong></p>
                            <p>• Category names are matched or auto-created if new</p>
                            <p>• If <code>initial_copies</code> is omitted, 1 copy is created by default</p>
                        </AlertDescription>
                    </Alert>
                </TabsContent>

                {/* ── Import Students Tab ──────────────────────────────────────── */}
                <TabsContent value="students" className="space-y-6">
                    <Card>
                        <CardContent className="p-6 space-y-6">
                            {/* Step 1: Template */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold text-sm">Step 1: Download Template</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Get a pre-formatted CSV file with the correct column headers
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={downloadStudentTemplate} className="gap-2 self-start">
                                    <Download className="h-4 w-4" />
                                    Download Template
                                </Button>
                            </div>

                            <div className="border-t" />

                            {/* Step 2: Upload */}
                            <div>
                                <h3 className="font-semibold text-sm mb-3">Step 2: Upload CSV File</h3>
                                <Dropzone
                                    file={studentFile}
                                    onFile={(f) => handleFile(f, 'student')}
                                />
                            </div>

                            {/* Step 3: Preview */}
                            {studentPreview && studentPreview.rows.length > 0 && (
                                <>
                                    <div className="border-t" />
                                    <div>
                                        <h3 className="font-semibold text-sm mb-3">Step 3: Preview Data</h3>
                                        <CSVPreview headers={studentPreview.headers} rows={studentPreview.rows} />
                                    </div>
                                </>
                            )}

                            {/* Step 4: Import */}
                            {studentPreview && studentPreview.rows.length > 0 && !studentResult && (
                                <>
                                    <div className="border-t" />
                                    <div className="space-y-3">
                                        <h3 className="font-semibold text-sm">Step 4: Import</h3>
                                        <Button
                                            onClick={handleImportStudents}
                                            disabled={importStudents.isPending}
                                            className="gap-2"
                                        >
                                            {importStudents.isPending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                            {importStudents.isPending
                                                ? 'Importing…'
                                                : `Import ${studentPreview.rows.length} Student${studentPreview.rows.length !== 1 ? 's' : ''}`}
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Results */}
                            {studentResult && (
                                <>
                                    <div className="border-t" />
                                    <div>
                                        <h3 className="font-semibold text-sm mb-3">Import Results</h3>
                                        <ResultsSummary result={studentResult} />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-4 gap-2"
                                            onClick={() => {
                                                setStudentFile(null);
                                                setStudentPreview(null);
                                                setStudentResult(null);
                                            }}
                                        >
                                            <Upload className="h-4 w-4" />
                                            Import Another File
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>CSV Format Tips</AlertTitle>
                        <AlertDescription className="text-xs space-y-1">
                            <p>• Required columns: <strong>student_id</strong>, <strong>username</strong>, <strong>name</strong>, <strong>grade_level</strong>, <strong>section</strong></p>
                            <p>• Default password is <code>student123</code> unless specified</p>
                            <p>• Duplicate usernames will be skipped with an error</p>
                        </AlertDescription>
                    </Alert>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ExcelMigration;
