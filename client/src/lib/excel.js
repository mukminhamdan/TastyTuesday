// Excel (.xlsx) export via ExcelJS, loaded on demand.
import { downloadBlob } from './format.js';

/**
 * columns: [{ label, value(row), type?: 'money' | 'number' | 'text', width? }]
 * money values are sen (converted to RM numbers with currency format).
 */
export async function exportExcel({ filename, sheetName, title, period, businessName, columns, rows, summary, totalsRow }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = businessName || 'BMS';
  wb.created = new Date();
  const ws = wb.addWorksheet((sheetName || 'Report').slice(0, 31));
  let r = 1;
  ws.getCell(r, 1).value = businessName || '';
  ws.getCell(r, 1).font = { bold: true, size: 13 };
  r++;
  ws.getCell(r, 1).value = title;
  ws.getCell(r, 1).font = { bold: true, size: 12, color: { argb: 'FF1E40AF' } };
  r++;
  if (period) {
    ws.getCell(r, 1).value = period;
    ws.getCell(r, 1).font = { italic: true, color: { argb: 'FF64748B' } };
    r++;
  }
  if (summary?.length) {
    r++;
    for (const [label, value] of summary) {
      ws.getCell(r, 1).value = label;
      ws.getCell(r, 1).font = { color: { argb: 'FF64748B' } };
      ws.getCell(r, 2).value = value;
      ws.getCell(r, 2).font = { bold: true };
      r++;
    }
  }
  r++;
  const headerRow = ws.getRow(r);
  columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { vertical: 'middle', horizontal: c.type === 'money' || c.type === 'number' ? 'right' : 'left' };
  });
  r++;
  const firstData = r;
  for (const row of rows) {
    const xr = ws.getRow(r);
    columns.forEach((c, i) => {
      const raw = c.value(row);
      const cell = xr.getCell(i + 1);
      if (c.type === 'money') {
        cell.value = Math.round(Number(raw) || 0) / 100;
        cell.numFmt = '"RM" #,##0.00';
      } else if (c.type === 'number') {
        cell.value = Number(raw) || 0;
      } else {
        cell.value = raw == null ? '' : String(raw);
      }
    });
    r++;
  }
  if (totalsRow && rows.length) {
    const xr = ws.getRow(r);
    columns.forEach((c, i) => {
      const cell = xr.getCell(i + 1);
      const tv = totalsRow[i];
      if (tv === undefined || tv === null || tv === '') return;
      if (tv === 'SUM') {
        const col = ws.getColumn(i + 1).letter;
        cell.value = { formula: `SUM(${col}${firstData}:${col}${r - 1})` };
        if (c.type === 'money') cell.numFmt = '"RM" #,##0.00';
      } else cell.value = tv;
      cell.font = { bold: true };
      cell.border = { top: { style: 'thin' } };
    });
  }
  columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width || (c.type === 'money' ? 16 : Math.min(40, Math.max(12, c.label.length + 4)));
  });
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}
