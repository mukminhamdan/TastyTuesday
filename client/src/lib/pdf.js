// PDF generation (jsPDF + autotable), loaded on demand.
import { translate } from './i18n.jsx';
import { downloadBlob, fmtDateTime } from './format.js';

let libs;
async function loadLibs() {
  if (!libs) {
    const [{ jsPDF }, at] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    libs = { jsPDF, autoTable: at.autoTable || at.default };
  }
  return libs;
}

const hexRgb = (hex) => {
  const h = String(hex || '#1e40af').replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const tint = (rgb, f) => rgb.map((c) => Math.round(c + (255 - c) * f));

const PAGE_W = 210;
const PAGE_H = 297;
const M = 15;
const CW = PAGE_W - M * 2;
const BOTTOM = PAGE_H - 22;
const INK = [30, 41, 59];
const MUTED = [100, 116, 139];
const LINE = [226, 232, 240];

function imageFormat(dataUrl) {
  return /^data:image\/png/.test(dataUrl) ? 'PNG' : 'JPEG';
}

function drawLogo(doc, logo, x, y, maxW, maxH, align = 'left') {
  if (!logo) return { w: 0, h: 0 };
  try {
    const p = doc.getImageProperties(logo);
    const ratio = Math.min(maxW / p.width, maxH / p.height);
    const w = p.width * ratio;
    const h = p.height * ratio;
    const lx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    doc.addImage(logo, imageFormat(logo), lx, y, w, h, undefined, 'FAST');
    return { w, h };
  } catch {
    return { w: 0, h: 0 };
  }
}

/** Draws the letterhead; returns the y position below it. */
function drawHeader(doc, m) {
  const accent = hexRgb(m.accent);
  const b = m.business;
  const tpl = m.template;
  let y = M;

  if (tpl === 'classic') {
    const logo = drawLogo(doc, b.logo, PAGE_W / 2, y, 40, 20, 'center');
    y += logo.h ? logo.h + 3 : 0;
    doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...INK);
    doc.text(b.name + (b.regNo ? ' ' : ''), PAGE_W / 2, y + 5, { align: 'center' });
    y += 6;
    if (b.regNo) {
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
      doc.text(b.regNo, PAGE_W / 2, y + 3.5, { align: 'center' });
      y += 4;
    }
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...MUTED);
    for (const line of b.lines) {
      doc.text(line, PAGE_W / 2, y + 4.5, { align: 'center' });
      y += 4;
    }
    y += 4;
    doc.setDrawColor(...accent).setLineWidth(0.8).line(M, y, PAGE_W - M, y);
    doc.setLineWidth(0.2).line(M, y + 1.2, PAGE_W - M, y + 1.2);
    y += 9;
    doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(...accent);
    doc.text(m.title, PAGE_W / 2, y, { align: 'center', charSpace: 1 });
    return y + 7;
  }

  if (tpl === 'modern') {
    doc.setFillColor(...accent).rect(0, 0, PAGE_W, 5, 'F');
    y = M + 1;
  }
  const logo = drawLogo(doc, b.logo, M, y, 32, 22);
  const tx = M + (logo.w ? logo.w + 4 : 0);
  const maxTextW = 112 - (logo.w ? logo.w + 4 : 0);
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(...INK);
  const nameLines = doc.splitTextToSize(b.name, maxTextW);
  doc.text(nameLines, tx, y + 5);
  let ty = y + 5 + (nameLines.length - 1) * 5;
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED);
  if (b.regNo) {
    ty += 4;
    doc.text(b.regNo, tx, ty);
  }
  for (const line of b.lines) {
    const wrapped = doc.splitTextToSize(line, maxTextW);
    ty += 3.8;
    doc.text(wrapped, tx, ty);
    ty += (wrapped.length - 1) * 3.8;
  }
  const titleColor = tpl === 'minimal' ? INK : accent;
  doc.setFont('helvetica', 'bold').setFontSize(tpl === 'minimal' ? 18 : 20).setTextColor(...titleColor);
  doc.text(m.title, PAGE_W - M, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTED);
  doc.text(m.number || '', PAGE_W - M, y + 13, { align: 'right' });
  y = Math.max(ty, y + logo.h, y + 14) + 5;
  doc.setDrawColor(...(tpl === 'minimal' ? LINE : tint(accent, 0.6))).setLineWidth(0.4).line(M, y, PAGE_W - M, y);
  return y + 6;
}

function drawFooters(doc, m) {
  const n = doc.getNumberOfPages();
  const t = (k, v) => translate(m.lang, k, v);
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE).setLineWidth(0.3).line(M, PAGE_H - 14, PAGE_W - M, PAGE_H - 14);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
    if (m.footer) doc.text(doc.splitTextToSize(m.footer, CW - 30), M, PAGE_H - 10);
    doc.text(t('doc.pageOf', { n: i, total: n }), PAGE_W - M, PAGE_H - 10, { align: 'right' });
  }
}

function ensure(doc, y, needed) {
  if (y + needed > BOTTOM) {
    doc.addPage();
    return M + 4;
  }
  return y;
}

function drawStamp(doc, m) {
  if (!m.stamp) return;
  const rgb = m.stampTone === 'green' ? [22, 163, 74] : m.stampTone === 'red' ? [220, 38, 38] : hexRgb(m.accent);
  doc.setPage(1);
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.18 }));
  doc.setFont('helvetica', 'bold').setFontSize(64).setTextColor(...rgb);
  doc.text(m.stamp.toUpperCase(), PAGE_W / 2, 170, { align: 'center', angle: 25 });
  doc.restoreGraphicsState();
}

/** Two-column label/value block. */
function kvBlock(doc, rows, x, y, labelW, valueW, { size = 9, bold = false } = {}) {
  doc.setFontSize(size);
  for (const [label, value] of rows) {
    doc.setFont('helvetica', 'normal').setTextColor(...MUTED);
    doc.text(String(label), x, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setTextColor(...INK);
    const lines = doc.splitTextToSize(String(value ?? '-'), valueW);
    doc.text(lines, x + labelW, y);
    y += lines.length * (size * 0.42) + 1.6;
  }
  return y;
}

function partyAndMeta(doc, m, y) {
  const t = (k, v) => translate(m.lang, k, v);
  const accent = hexRgb(m.accent);
  // Bill to (left)
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...(m.template === 'minimal' ? MUTED : accent));
  doc.text(m.billTo.title.toUpperCase(), M, y);
  doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(...INK);
  const nameLines = doc.splitTextToSize(m.billTo.name || '', 100);
  doc.text(nameLines, M, y + 5.5);
  let ly = y + 5.5 + nameLines.length * 4.6;
  doc.setFont('helvetica', 'normal').setFontSize(8.8).setTextColor(...INK);
  for (const line of m.billTo.lines) {
    const w = doc.splitTextToSize(line, 100);
    doc.text(w, M, ly);
    ly += w.length * 3.9;
  }
  // Meta (right)
  let ry = y;
  if (m.template === 'classic') {
    ry = kvBlock(doc, m.meta, 122, y + 1, 30, 43, { size: 8.8, bold: true });
  } else {
    doc.setFontSize(8.8);
    for (const [label, value] of m.meta) {
      doc.setFont('helvetica', 'normal').setTextColor(...MUTED);
      doc.text(label, 150, ry + 1, { align: 'right' });
      doc.setFont('helvetica', 'bold').setTextColor(...INK);
      doc.text(String(value), PAGE_W - M, ry + 1, { align: 'right' });
      ry += 5;
    }
  }
  void t;
  return Math.max(ly, ry) + 4;
}

function eventBox(doc, m, y) {
  if (!m.event) return y;
  const t = (k, v) => translate(m.lang, k, v);
  const accent = hexRgb(m.accent);
  doc.setFontSize(8.8);
  const lines = m.event.map(([l, v]) => [l, doc.splitTextToSize(String(v), CW - 40)]);
  const h = 8 + lines.reduce((s, [, v]) => s + v.length * 3.9 + 1.2, 0);
  y = ensure(doc, y, h + 4);
  if (m.template === 'minimal') doc.setDrawColor(...LINE).setLineWidth(0.3).rect(M, y, CW, h, 'S');
  else doc.setFillColor(...tint(accent, 0.92)).roundedRect(M, y, CW, h, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...(m.template === 'minimal' ? MUTED : accent));
  doc.text(t('doc.eventDetails').toUpperCase(), M + 4, y + 5);
  let ey = y + 9.5;
  for (const [l, v] of lines) {
    doc.setFont('helvetica', 'normal').setFontSize(8.8).setTextColor(...MUTED);
    doc.text(l, M + 4, ey);
    doc.setTextColor(...INK);
    doc.text(v, M + 38, ey);
    ey += v.length * 3.9 + 1.2;
  }
  return y + h + 6;
}

function itemsTable(doc, autoTable, m, y) {
  const t = (k, v) => translate(m.lang, k, v);
  const accent = hexRgb(m.accent);
  const minimal = m.template === 'minimal';
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: 24 },
    head: [['#', t('doc.description'), t('doc.qty'), t('doc.unitPrice'), t('doc.amountRM')]],
    body: m.items.map((it) => [it.no, it.details ? `${it.description}\n${it.details}` : it.description, it.qty, it.unitPrice, it.amount]),
    theme: minimal ? 'plain' : 'striped',
    styles: { font: 'helvetica', fontSize: 8.8, cellPadding: 2.2, textColor: INK, lineColor: LINE, valign: 'top' },
    headStyles: minimal
      ? { fontStyle: 'bold', textColor: INK, lineWidth: { bottom: 0.4 }, lineColor: INK }
      : { fillColor: accent, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: minimal ? {} : { fillColor: tint(accent, 0.95) },
    bodyStyles: minimal ? { lineWidth: { bottom: 0.1 }, lineColor: LINE } : {},
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index >= 3) data.cell.styles.halign = 'right';
      if (data.section === 'head' && data.column.index === 2) data.cell.styles.halign = 'center';
    },
  });
  return doc.lastAutoTable.finalY + 4;
}

function totalsBlock(doc, m, y) {
  const accent = hexRgb(m.accent);
  const x1 = 112;
  const x2 = PAGE_W - M;
  const rows = m.totals.length + 1 + (m.afterTotals?.length || 0) + (m.balance ? 1 : 0);
  y = ensure(doc, y, rows * 6.5 + 8);
  doc.setFontSize(9);
  const row = (label, value, opts = {}) => {
    if (opts.fill) {
      doc.setFillColor(...opts.fill).rect(x1 - 2, y - 4.4, x2 - x1 + 2, 7, 'F');
    }
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal').setTextColor(...(opts.color || INK));
    doc.setFontSize(opts.size || 9);
    doc.text(label, x1 + 1, y);
    doc.text(value, x2 - 1, y, { align: 'right' });
    y += opts.fill ? 8 : 5.6;
  };
  for (const [l, v] of m.totals) row(l, v, { color: MUTED });
  const minimal = m.template === 'minimal';
  y += 1;
  row(m.grandTotal[0], m.grandTotal[1], { bold: true, size: 10.5, fill: minimal ? [241, 245, 249] : accent, color: minimal ? INK : [255, 255, 255] });
  for (const [l, v] of m.afterTotals || []) row(l, v, { color: MUTED });
  if (m.balance) row(m.balance[0], m.balance[1], { bold: true, size: 10.5, fill: minimal ? [241, 245, 249] : tint(accent, 0.85), color: INK });
  return y + 2;
}

function textSections(doc, m, y) {
  for (const s of m.sections) {
    doc.setFontSize(8.3);
    const lines = doc.splitTextToSize(s.text, CW);
    y = ensure(doc, y, 8 + Math.min(lines.length, 6) * 3.6);
    doc.setFont('helvetica', 'bold').setFontSize(8.8).setTextColor(...INK);
    doc.text(s.title, M, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal').setFontSize(8.3).setTextColor(...MUTED);
    for (const line of lines) {
      y = ensure(doc, y, 4);
      doc.text(line, M, y);
      y += 3.6;
    }
    y += 3;
  }
  return y;
}

function bankBox(doc, m, y) {
  if (!m.bank) return y;
  const t = (k, v) => translate(m.lang, k, v);
  const accent = hexRgb(m.accent);
  y = ensure(doc, y, 26);
  doc.setDrawColor(...(m.template === 'minimal' ? LINE : tint(accent, 0.5))).setLineWidth(0.3).roundedRect(M, y, 110, 22, 1.5, 1.5, 'S');
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...(m.template === 'minimal' ? MUTED : accent));
  doc.text(t('doc.bankDetails').toUpperCase(), M + 4, y + 5);
  kvBlock(doc, m.bank, M + 4, y + 10, 38, 64, { size: 8.5, bold: true });
  return y + 28;
}

function signatureLines(doc, m, y) {
  const t = (k, v) => translate(m.lang, k, v);
  y = ensure(doc, y, 32);
  y += 16;
  doc.setDrawColor(...MUTED).setLineWidth(0.3);
  doc.line(M, y, M + 70, y);
  doc.line(PAGE_W - M - 70, y, PAGE_W - M, y);
  doc.setFont('helvetica', 'normal').setFontSize(8.3).setTextColor(...MUTED);
  doc.text(t('doc.preparedBy'), M, y + 4.5);
  doc.text(m.business.name, M, y + 8.5);
  doc.text(t('doc.customerAcceptance'), PAGE_W - M - 70, y + 4.5);
  doc.text(t('doc.signNameDate'), PAGE_W - M - 70, y + 8.5);
  return y + 12;
}

function receiptBody(doc, autoTable, m, y) {
  const t = (k, v) => translate(m.lang, k, v);
  const accent = hexRgb(m.accent);
  y = partyAndMeta(doc, m, y);
  // Amount box
  const minimal = m.template === 'minimal';
  doc.setFillColor(...(minimal ? [248, 250, 252] : tint(accent, 0.92)));
  doc.setDrawColor(...(minimal ? LINE : tint(accent, 0.5)));
  doc.roundedRect(M, y, CW, 22, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...(minimal ? MUTED : accent));
  doc.text(t('doc.amountReceived').toUpperCase(), M + 5, y + 7);
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...INK);
  doc.text(m.amount, PAGE_W - M - 5, y + 10, { align: 'right' });
  doc.setFont('helvetica', 'italic').setFontSize(8.5).setTextColor(...MUTED);
  doc.text(doc.splitTextToSize(m.amountWords, CW - 10), M + 5, y + 17);
  y += 28;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    body: m.details,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 1.8, bottom: 1.8, left: 0, right: 2 }, textColor: INK, lineColor: LINE, lineWidth: { bottom: 0.1 } },
    columnStyles: { 0: { cellWidth: 45, textColor: MUTED } },
  });
  y = doc.lastAutoTable.finalY + 6;
  // Balance summary (right)
  const x1 = 112;
  for (let i = 0; i < m.summary.length; i++) {
    const [l, v] = m.summary[i];
    const last = i === m.summary.length - 1;
    if (last) doc.setFillColor(...(minimal ? [241, 245, 249] : tint(accent, 0.85))).rect(x1 - 2, y - 4.4, PAGE_W - M - x1 + 2, 7, 'F');
    doc.setFont('helvetica', last ? 'bold' : 'normal').setFontSize(9).setTextColor(...(last ? INK : MUTED));
    doc.text(l, x1 + 1, y);
    doc.text(v, PAGE_W - M - 1, y, { align: 'right' });
    y += last ? 8 : 5.6;
  }
  if (m.voidReason) {
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(220, 38, 38);
    doc.text(`${t('doc.voidReason')}: ${m.voidReason}`, M, y + 2);
    y += 6;
  }
  y = ensure(doc, y, 30) + 14;
  doc.setDrawColor(...MUTED).setLineWidth(0.3).line(M, y, M + 70, y);
  doc.setFont('helvetica', 'normal').setFontSize(8.3).setTextColor(...MUTED);
  doc.text(`${t('doc.receivedBy')}: ${m.receivedBy}`, M, y + 4.5);
  doc.text(m.business.name, M, y + 8.5);
  doc.setFont('helvetica', 'italic').setFontSize(7.8);
  doc.text(t('doc.computerGenerated'), PAGE_W - M, y + 8.5, { align: 'right' });
  return y + 12;
}

export async function renderDocPdf(m) {
  const { jsPDF, autoTable } = await loadLibs();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `${m.title} ${m.number}`, author: m.business.name, creator: m.business.name });
  let y = drawHeader(doc, m);

  if (m.kind === 'receipt') {
    receiptBody(doc, autoTable, m, y);
  } else {
    y = partyAndMeta(doc, m, y);
    y = eventBox(doc, m, y);
    y = itemsTable(doc, autoTable, m, y);
    y = totalsBlock(doc, m, y);
    if (m.payments?.length) {
      const t = (k, v) => translate(m.lang, k, v);
      y = ensure(doc, y, 20);
      doc.setFont('helvetica', 'bold').setFontSize(8.8).setTextColor(...INK);
      doc.text(t('doc.paymentsReceived'), M, y);
      autoTable(doc, {
        startY: y + 2,
        margin: { left: M, right: M, bottom: 24 },
        head: [[t('doc.date'), t('doc.receiptNo'), t('doc.paymentMethod'), t('doc.amount')]],
        body: m.payments,
        theme: 'plain',
        styles: { fontSize: 8.3, cellPadding: 1.6, textColor: INK },
        headStyles: { textColor: MUTED, fontStyle: 'bold', lineWidth: { bottom: 0.2 }, lineColor: LINE },
        columnStyles: { 3: { halign: 'right' } },
        didParseCell: (d) => d.section === 'head' && d.column.index === 3 && (d.cell.styles.halign = 'right'),
      });
      y = doc.lastAutoTable.finalY + 6;
    }
    y = bankBox(doc, m, y);
    y = textSections(doc, m, y);
    if (m.acceptance) signatureLines(doc, m, y);
  }
  drawStamp(doc, m);
  drawFooters(doc, m);
  return doc;
}

const fileName = (m) => `${m.number || m.title}.pdf`.replace(/[^\w.-]+/g, '_');

export async function downloadDocPdf(m) {
  const doc = await renderDocPdf(m);
  doc.save(fileName(m));
}

export async function docPdfFile(m) {
  const doc = await renderDocPdf(m);
  return new File([doc.output('blob')], fileName(m), { type: 'application/pdf' });
}

/** Open the PDF in a new tab with the print dialog. */
export async function printDocPdf(m) {
  const doc = await renderDocPdf(m);
  printPdf(doc);
}

function printPdf(doc) {
  doc.autoPrint();
  const url = doc.output('bloburl');
  const w = window.open(url, '_blank');
  if (!w) downloadBlob(doc.output('blob'), 'print.pdf');
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
/**
 * columns: [{ label, value(row) -> string, align }]
 * summary: [[label, value]]
 */
export async function renderReportPdf({ title, period, columns, rows, summary, settings, lang, totalsRow }) {
  const { jsPDF, autoTable } = await loadLibs();
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: columns.length > 6 ? 'landscape' : 'portrait', compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const accent = hexRgb(settings.accent_color);
  const t = (k, v) => translate(lang, k, v);
  doc.setFillColor(...accent).rect(0, 0, W, 4, 'F');
  const logo = drawLogo(doc, settings.logo, M, 9, 24, 14);
  const tx = M + (logo.w ? logo.w + 4 : 0);
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...INK).text(settings.business_name || '', tx, 14);
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED).text(`${t('reports.generated')}: ${fmtDateTime(new Date().toISOString())}`, tx, 19);
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...accent).text(title, W - M, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTED).text(period, W - M, 19.5, { align: 'right' });
  let y = 29;
  if (summary?.length) {
    const colW = (W - M * 2) / Math.min(summary.length, 4);
    summary.forEach(([l, v], i) => {
      const cx = M + (i % 4) * colW;
      const cy = y + Math.floor(i / 4) * 15;
      doc.setFillColor(...tint(accent, 0.93)).roundedRect(cx, cy, colW - 3, 12, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED).text(String(l), cx + 3, cy + 4.5);
      doc.setFont('helvetica', 'bold').setFontSize(10.5).setTextColor(...INK).text(String(v), cx + 3, cy + 9.8);
    });
    y += Math.ceil(summary.length / 4) * 15 + 3;
  }
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: 18 },
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => c.value(r))),
    foot: totalsRow ? [totalsRow] : undefined,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 1.8, textColor: INK },
    headStyles: { fillColor: accent, textColor: [255, 255, 255] },
    footStyles: { fillColor: [241, 245, 249], textColor: INK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: tint(accent, 0.96) },
    columnStyles: Object.fromEntries(columns.map((c, i) => [i, { halign: c.align || 'left' }])),
    didParseCell: (d) => {
      if (d.section !== 'body' && columns[d.column.index]?.align) d.cell.styles.halign = columns[d.column.index].align;
    },
  });
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTED);
    doc.text(t('doc.pageOf', { n: i, total: n }), W - M, H - 8, { align: 'right' });
    doc.text(settings.business_name || '', M, H - 8);
  }
  return doc;
}

export async function downloadReportPdf(opts, filename) {
  const doc = await renderReportPdf(opts);
  doc.save(filename);
}

export async function printReportPdf(opts) {
  printPdf(await renderReportPdf(opts));
}
