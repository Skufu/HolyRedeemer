import React, { useState, useCallback } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ChevronDown,
  Loader2,
  BookOpen,
  Users,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// Book template fields
const bookFields = [
  { key: 'title', label: 'Title', required: true },
  { key: 'author', label: 'Author', required: true },
  { key: 'isbn', label: 'ISBN', required: true },
  { key: 'category', label: 'Category', required: false },
  { key: 'publisher', label: 'Publisher', required: false },
  { key: 'publishYear', label: 'Publish Year', required: false },
  { key: 'copies', label: 'Total Copies', required: false },
  { key: 'location', label: 'Shelf Location', required: false },
];

// Student template fields
const studentFields = [
  { key: 'studentId', label: 'Student ID', required: true },
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'gradeLevel', label: 'Grade Level', required: true },
  { key: 'section', label: 'Section', required: false },
  { key: 'contactNumber', label: 'Contact Number', required: false },
  { key: 'guardianName', label: 'Guardian Name', required: false },
  { key: 'guardianContact', label: 'Guardian Contact', required: false },
];

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; message: string; data: Record<string, string | number> }[];
}

interface FileData {
  headers: string[];
  rows: Record<string, string | number>[];
  fileName: string;
}

const ExcelMigration: React.FC = () => {
  const [activeTab, setActiveTab] = useState('books');
  
  // Books state
  const [bookFile, setBookFile] = useState<FileData | null>(null);
  const [bookMapping, setBookMapping] = useState<Record<string, string>>({});
  const [bookImportProgress, setBookImportProgress] = useState(0);
  const [bookImporting, setBookImporting] = useState(false);
  const [bookResult, setBookResult] = useState<ImportResult | null>(null);
  
  // Students state
  const [studentFile, setStudentFile] = useState<FileData | null>(null);
  const [studentMapping, setStudentMapping] = useState<Record<string, string>>({});
  const [studentImportProgress, setStudentImportProgress] = useState(0);
  const [studentImporting, setStudentImporting] = useState(false);
  const [studentResult, setStudentResult] = useState<ImportResult | null>(null);

  // Download template
  const downloadTemplate = (type: 'books' | 'students') => {
    const fields = type === 'books' ? bookFields : studentFields;
    const headers = fields.map(f => f.label);
    
    // Create sample data
    const sampleData = type === 'books' 
      ? [
          ['The Great Gatsby', 'F. Scott Fitzgerald', '978-0743273565', 'Fiction', 'Scribner', '1925', '5', 'A-101'],
          ['To Kill a Mockingbird', 'Harper Lee', '978-0061120084', 'Fiction', 'HarperCollins', '1960', '3', 'A-102'],
        ]
      : [
          ['STU-2024-001', 'Juan', 'Dela Cruz', 'juan@school.edu', 'Grade 7', 'Section A', '09171234567', 'Maria Dela Cruz', '09189876543'],
          ['STU-2024-002', 'Maria', 'Santos', 'maria@school.edu', 'Grade 8', 'Section B', '09181234567', 'Jose Santos', '09171234567'],
        ];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'books' ? 'Books' : 'Students');
    
    // Set column widths
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    
    XLSX.writeFile(wb, `${type}_import_template.xlsx`);
    toast.success(`${type === 'books' ? 'Books' : 'Students'} template downloaded`);
  };

  // Handle file upload
  const handleFileUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>,
    type: 'books' | 'students'
  ) => {
    e.preventDefault();
    
    let file: File | undefined;
    
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files[0];
    } else {
      file = e.target.files?.[0];
    }
    
    if (!file) return;
    
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload an Excel file (.xlsx, .xls) or CSV file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | boolean)[][];
        
        if (jsonData.length < 2) {
          toast.error('File must contain headers and at least one data row');
          return;
        }
        
        const headers = jsonData[0].map(h => String(h || '').trim());
        const rows = jsonData.slice(1, 11).map(row => {
          const obj: Record<string, string | number> = {};
          headers.forEach((h, i) => {
            obj[h] = row[i] ?? '';
          });
          return obj;
        });
        
        const fileData: FileData = {
          headers,
          rows,
          fileName: file.name,
        };
        
        // Auto-map fields
        const fields = type === 'books' ? bookFields : studentFields;
        const autoMapping: Record<string, string> = {};
        
        fields.forEach(field => {
          const matchingHeader = headers.find(h => 
            h.toLowerCase().includes(field.key.toLowerCase()) ||
            h.toLowerCase().includes(field.label.toLowerCase()) ||
            field.label.toLowerCase().includes(h.toLowerCase())
          );
          if (matchingHeader) {
            autoMapping[field.key] = matchingHeader;
          }
        });
        
        if (type === 'books') {
          setBookFile(fileData);
          setBookMapping(autoMapping);
          setBookResult(null);
        } else {
          setStudentFile(fileData);
          setStudentMapping(autoMapping);
          setStudentResult(null);
        }
        
        toast.success(`File loaded: ${jsonData.length - 1} rows found`);
      } catch (error) {
        toast.error('Error parsing file. Please check the format.');
      }
    };
    
    reader.readAsBinaryString(file);
  }, []);

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Simulate import
  const handleImport = async (type: 'books' | 'students') => {
    const file = type === 'books' ? bookFile : studentFile;
    const mapping = type === 'books' ? bookMapping : studentMapping;
    const fields = type === 'books' ? bookFields : studentFields;
    const setProgress = type === 'books' ? setBookImportProgress : setStudentImportProgress;
    const setImporting = type === 'books' ? setBookImporting : setStudentImporting;
    const setResult = type === 'books' ? setBookResult : setStudentResult;
    
    if (!file) return;
    
    // Check required fields
    const missingRequired = fields
      .filter(f => f.required && !mapping[f.key])
      .map(f => f.label);
    
    if (missingRequired.length > 0) {
      toast.error(`Please map required fields: ${missingRequired.join(', ')}`);
      return;
    }
    
    setImporting(true);
    setProgress(0);
    
    const result: ImportResult = {
      total: file.rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };
    
    // Simulate importing each row
    for (let i = 0; i < file.rows.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const row = file.rows[i];
      const mappedData: Record<string, string | number> = {};
      
      fields.forEach(field => {
        if (mapping[field.key]) {
          mappedData[field.key] = row[mapping[field.key]];
        }
      });
      
      // Simulate validation
      const requiredMissing = fields
        .filter(f => f.required && !mappedData[f.key])
        .map(f => f.label);
      
      if (requiredMissing.length > 0) {
        result.errors.push({
          row: i + 2,
          message: `Missing required: ${requiredMissing.join(', ')}`,
          data: row,
        });
        result.skipped++;
      } else if (Math.random() > 0.9) {
        // Random error for demo
        result.errors.push({
          row: i + 2,
          message: type === 'books' ? 'Duplicate ISBN found' : 'Duplicate Student ID',
          data: row,
        });
        result.skipped++;
      } else {
        result.imported++;
      }
      
      setProgress(((i + 1) / file.rows.length) * 100);
    }
    
    setResult(result);
    setImporting(false);
    
    if (result.imported > 0) {
      toast.success(`Successfully imported ${result.imported} ${type}`);
    }
    if (result.errors.length > 0) {
      toast.warning(`${result.errors.length} rows had errors`);
    }
  };

  // Render import section
  const renderImportSection = (type: 'books' | 'students') => {
    const file = type === 'books' ? bookFile : studentFile;
    const mapping = type === 'books' ? bookMapping : studentMapping;
    const setMapping = type === 'books' ? setBookMapping : setStudentMapping;
    const progress = type === 'books' ? bookImportProgress : studentImportProgress;
    const importing = type === 'books' ? bookImporting : studentImporting;
    const result = type === 'books' ? bookResult : studentResult;
    const fields = type === 'books' ? bookFields : studentFields;
    
    return (
      <div className="space-y-4 md:space-y-6">
        {/* Download Template */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Download className="h-4 w-4 md:h-5 md:w-5" />
              Step 1: Download Template
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Download the Excel template to see the required format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => downloadTemplate(type)} variant="outline" className="w-full sm:w-auto">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download {type === 'books' ? 'Books' : 'Students'} Template
            </Button>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Upload className="h-4 w-4 md:h-5 md:w-5" />
              Step 2: Upload File
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Upload your Excel or CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-6 md:p-8 text-center transition-colors
                ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
              onDrop={(e) => handleFileUpload(e, type)}
              onDragOver={handleDragOver}
            >
              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-10 w-10 md:h-12 md:w-12 mx-auto text-primary" />
                  <p className="font-medium text-sm md:text-base">{file.fileName}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {file.headers.length} columns, {file.rows.length} preview rows
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => type === 'books' ? setBookFile(null) : setStudentFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm md:text-base text-muted-foreground">
                    Drag and drop your file here, or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    id={`${type}-file-upload`}
                    onChange={(e) => handleFileUpload(e, type)}
                  />
                  <label htmlFor={`${type}-file-upload`} className="cursor-pointer">
                    <Button variant="secondary" type="button" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview & Mapping */}
        {file && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Step 3: Preview Data</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  First 10 rows of your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="min-w-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          {file.headers.map((h, i) => (
                            <TableHead key={i} className="min-w-[120px]">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {file.rows.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{i + 2}</TableCell>
                            {file.headers.map((h, j) => (
                              <TableCell key={j} className="max-w-[200px] truncate">
                                {String(row[h] || '-')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Step 4: Map Fields</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Match your columns to the system fields
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {fields.map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs md:text-sm flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      <div className="flex items-center gap-2">
                        <Select
                          value={mapping[field.key] || ''}
                          onValueChange={(value) => setMapping({ ...mapping, [field.key]: value })}
                        >
                          <SelectTrigger className="text-xs md:text-sm">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">-- Not mapped --</SelectItem>
                            {file.headers.map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {mapping[field.key] && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Import Button & Progress */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg">Step 5: Import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {importing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Importing...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
                
                <Button 
                  onClick={() => handleImport(type)}
                  disabled={importing}
                  className="w-full sm:w-auto"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Start Import
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Results */}
        {result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Import Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="text-center p-3 md:p-4 bg-muted rounded-lg">
                  <p className="text-xl md:text-2xl font-bold">{result.total}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Total Rows</p>
                </div>
                <div className="text-center p-3 md:p-4 bg-green-500/10 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-green-600">{result.imported}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Imported</p>
                </div>
                <div className="text-center p-3 md:p-4 bg-yellow-500/10 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-yellow-600">{result.skipped}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Skipped</p>
                </div>
                <div className="text-center p-3 md:p-4 bg-red-500/10 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-red-600">{result.errors.length}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Errors</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        View Error Details ({result.errors.length})
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <ScrollArea className="h-[200px] md:h-[300px] border rounded-lg">
                      <div className="p-3 space-y-2">
                        {result.errors.map((error, i) => (
                          <div key={i} className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                            <div className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">Row {error.row}</p>
                                <p className="text-xs md:text-sm text-muted-foreground">{error.message}</p>
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  Data: {JSON.stringify(error.data)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {result.imported > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm text-green-700">
                    Successfully imported {result.imported} {type}!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">Excel Migration</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Import books and students from Excel files
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="books" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span> Books
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span> Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="mt-4 md:mt-6">
          {renderImportSection('books')}
        </TabsContent>

        <TabsContent value="students" className="mt-4 md:mt-6">
          {renderImportSection('students')}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExcelMigration;
