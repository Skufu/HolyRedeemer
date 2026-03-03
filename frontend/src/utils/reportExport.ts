import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportOptions {
  title: string;
  columns: ExportColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[];
  dateRange?: { from?: string; to?: string };
  orientation?: 'portrait' | 'landscape';
}

/**
 * Export report data to a styled PDF document
 */
export function exportToPDF(options: ExportOptions): void {
  const { title, columns, rows, dateRange, orientation = 'landscape' } = options;
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const now = format(new Date(), 'MMMM d, yyyy h:mm a');

  // ── Header ──
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Holy Redeemer School of Cabuyao', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Library Management System', pageWidth / 2, 21, { align: 'center' });

  // ── Report title ──
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 30, { align: 'center' });

  // ── Date range ──
  let startY = 35;
  if (dateRange?.from || dateRange?.to) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const rangeText = `Date Range: ${dateRange.from || 'Start'} — ${dateRange.to || 'Present'}`;
    doc.text(rangeText, pageWidth / 2, startY, { align: 'center' });
    startY += 5;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on ${now}`, pageWidth / 2, startY, { align: 'center' });
  startY += 5;

  // ── Table ──
  const head = [columns.map((c) => c.header)];
  const body = rows.map((row) => columns.map((c) => {
    const val = row[c.key];
    if (val === null || val === undefined) return '—';
    return String(val);
  }));

  autoTable(doc, {
    startY,
    head,
    body,
    theme: 'grid',
    headStyles: {
      fillColor: [139, 69, 19],    // brown, matching the school theme
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 240],
    },
    styles: {
      overflow: 'linebreak',
      lineWidth: 0.1,
    },
    margin: { left: 10, right: 10 },
    didDrawPage: (data) => {
      // Footer on each page
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      );
    },
  });

  // ── Download ──
  const filename = `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}

/**
 * Export report data to an Excel (.xlsx) file
 */
export function exportToExcel(options: ExportOptions): void {
  const { title, columns, rows, dateRange } = options;

  // Build header rows
  const headerRows: string[][] = [];
  headerRows.push(['Holy Redeemer School of Cabuyao — Library']);
  headerRows.push([title]);
  if (dateRange?.from || dateRange?.to) {
    headerRows.push([`Date Range: ${dateRange.from || 'Start'} — ${dateRange.to || 'Present'}`]);
  }
  headerRows.push([`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`]);
  headerRows.push([]); // blank row

  // Column headers
  headerRows.push(columns.map((c) => c.header));

  // Data rows
  const dataRows = rows.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      if (val === null || val === undefined) return '';
      return val;
    }),
  );

  const allRows = [...headerRows, ...dataRows];

  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths
  ws['!cols'] = columns.map((c) => ({ wch: c.width || 18 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31)); // sheet name max 31 chars

  const filename = `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Filter an array of objects by a date field within a range.
 */
export function filterByDateRange<T>(
  data: T[],
  dateField: keyof T,
  startDate?: string,
  endDate?: string,
): T[] {
  if (!startDate && !endDate) return data;

  return data.filter((item) => {
    const dateStr = item[dateField];
    if (!dateStr || typeof dateStr !== 'string') return true;

    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (itemDate < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (itemDate > end) return false;
    }

    return true;
  });
}
