import PDFDocument from "pdfkit";
import { formatDate } from "@/lib/utils";
import { PDF_PAGE_MARGIN_PT, PDF_PAGE_WIDTH_PT } from "@/lib/pdf-page";
import { formatINR, formatSAR } from "@/lib/currency";

export type FinanceItemPdf = {
  particulars: string;
  amountINR: number;
  amountSAR: number;
};

export type BankBalancePdf = {
  bankName: string;
  openingBalance: number;
  receipts: number;
  payments: number;
  closingBalance: number;
};

export type FinanceReportPdfData = {
  reportDate: Date | string;
  submittedByName: string;
  expenses: FinanceItemPdf[];
  receipts: FinanceItemPdf[];
  payments: FinanceItemPdf[];
  bankBalances: BankBalancePdf[];
  cashBalance: { pettyCash: number; total: number };
  nextDayApprovals: FinanceItemPdf[];
  summary: {
    totalExpenses: number;
    totalReceipts: number;
    totalPayments: number;
    bankBalance: number;
    pettyCashBalance: number;
    description: string;
  };
  exchangeRate: number;
  status: string;
  approvedByName?: string;
  approvedAt?: Date | string | null;
};

const COLORS = {
  ink: "#1E293B",
  muted: "#64748B",
  line: "#E2E8F0",
  soft: "#F8FAFC",
  panel: "#FFFFFF",
  navy: "#1E293B",
  blue: "#2563EB",
  emerald: "#059669",
  emeraldSoft: "#ECFDF5",
  amber: "#F59E0B",
  amberSoft: "#FEF3C7",
  rose: "#E11D48",
  roseSoft: "#FFF1F2"
};

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed <= doc.page.height - PDF_PAGE_MARGIN_PT) return;
  doc.addPage();
}

function renderTableItems(
  doc: PDFKit.PDFDocument,
  title: string,
  items: FinanceItemPdf[],
  tableX: number,
  contentWidth: number,
  colParticular: number,
  colINR: number,
  colSAR: number
) {
  ensureSpace(doc, 60);
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(12).text(title, tableX, doc.y);
  doc.y += 16;
  
  const rowHeight = 24;
  doc.roundedRect(tableX, doc.y, contentWidth, rowHeight, 4).fill(COLORS.navy);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
  doc.text("Particulars", tableX + 8, doc.y + 7, { width: colParticular - 8 });
  doc.text("Amount (INR)", tableX + colParticular, doc.y + 7, { width: colINR, align: "right" });
  doc.text("Amount (SAR)", tableX + colParticular + colINR, doc.y + 7, { width: colSAR - 8, align: "right" });
  doc.y += rowHeight;

  if (!items || items.length === 0) {
    ensureSpace(doc, rowHeight);
    doc.rect(tableX, doc.y, contentWidth, rowHeight).fill(COLORS.panel).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(10).text("No records", tableX, doc.y + 7, { width: contentWidth, align: "center" });
    doc.y += rowHeight;
  } else {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const bgColor = i % 2 === 0 ? COLORS.panel : COLORS.soft;
      ensureSpace(doc, rowHeight);
      doc.rect(tableX, doc.y, contentWidth, rowHeight).fill(bgColor).strokeColor(COLORS.line).lineWidth(0.5).stroke();
      doc.fillColor(COLORS.ink).font("Helvetica").fontSize(9);
      doc.text(item.particulars || "-", tableX + 8, doc.y + 7, { width: colParticular - 8 });
      doc.font("Helvetica-Bold").text(formatINR(item.amountINR), tableX + colParticular, doc.y + 7, { width: colINR, align: "right" });
      doc.font("Helvetica").fillColor(COLORS.muted).text(formatSAR(item.amountSAR), tableX + colParticular + colINR, doc.y + 7, { width: colSAR - 8, align: "right" });
      doc.y += rowHeight;
    }
  }
  doc.y += 12;
}

function renderBankBalances(
  doc: PDFKit.PDFDocument,
  items: BankBalancePdf[],
  tableX: number,
  contentWidth: number
) {
  ensureSpace(doc, 60);
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(12).text("Bank Balances", tableX, doc.y);
  doc.y += 16;

  const rowHeight = 24;
  const colW = contentWidth / 5;
  
  doc.roundedRect(tableX, doc.y, contentWidth, rowHeight, 4).fill(COLORS.navy);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
  doc.text("Bank Name", tableX + 8, doc.y + 7, { width: colW - 8 });
  doc.text("Opening", tableX + colW, doc.y + 7, { width: colW, align: "right" });
  doc.text("Receipts", tableX + colW * 2, doc.y + 7, { width: colW, align: "right" });
  doc.text("Payments", tableX + colW * 3, doc.y + 7, { width: colW, align: "right" });
  doc.text("Closing", tableX + colW * 4, doc.y + 7, { width: colW - 8, align: "right" });
  doc.y += rowHeight;

  if (!items || items.length === 0) {
    ensureSpace(doc, rowHeight);
    doc.rect(tableX, doc.y, contentWidth, rowHeight).fill(COLORS.panel).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(10).text("No bank balances", tableX, doc.y + 7, { width: contentWidth, align: "center" });
    doc.y += rowHeight;
  } else {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const bgColor = i % 2 === 0 ? COLORS.panel : COLORS.soft;
      ensureSpace(doc, rowHeight);
      doc.rect(tableX, doc.y, contentWidth, rowHeight).fill(bgColor).strokeColor(COLORS.line).lineWidth(0.5).stroke();
      doc.fillColor(COLORS.ink).font("Helvetica").fontSize(9);
      doc.text(item.bankName || "-", tableX + 8, doc.y + 7, { width: colW - 8 });
      doc.text(formatINR(item.openingBalance), tableX + colW, doc.y + 7, { width: colW, align: "right" });
      doc.text(formatINR(item.receipts), tableX + colW * 2, doc.y + 7, { width: colW, align: "right" });
      doc.text(formatINR(item.payments), tableX + colW * 3, doc.y + 7, { width: colW, align: "right" });
      doc.font("Helvetica-Bold").text(formatINR(item.closingBalance), tableX + colW * 4, doc.y + 7, { width: colW - 8, align: "right" });
      doc.y += rowHeight;
    }
  }
  doc.y += 12;
}

function renderFinancePdfContent(doc: PDFKit.PDFDocument, data: FinanceReportPdfData) {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - PDF_PAGE_MARGIN_PT * 2;
  const mx = PDF_PAGE_MARGIN_PT;

  // Header
  doc.rect(0, 0, pageWidth, 140).fill(COLORS.navy);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11).text("MIF TECHNOLOGY", mx, 30, {
    width: contentWidth,
    align: "center",
    characterSpacing: 2
  });
  doc.fontSize(24).text("Finance Report", mx, 52, { width: contentWidth, align: "center" });
  doc.fillColor("#CBD5E1").font("Helvetica").fontSize(10).text(
    `Report Date: ${formatDate(data.reportDate)}  |  Submitted by: ${data.submittedByName}`,
    mx, 90,
    { width: contentWidth, align: "center" }
  );

  doc.y = 164;

  const statusColor = data.status === "approved" ? COLORS.emerald : data.status === "rejected" ? COLORS.rose : COLORS.amber;
  const statusBg = data.status === "approved" ? COLORS.emeraldSoft : data.status === "rejected" ? COLORS.roseSoft : COLORS.amberSoft;
  const statusLabel = data.status.charAt(0).toUpperCase() + data.status.slice(1);
  const statusWidth = 120;
  const statusX = mx + contentWidth - statusWidth;
  doc.roundedRect(statusX, doc.y, statusWidth, 24, 12).fill(statusBg);
  doc.fillColor(statusColor).font("Helvetica-Bold").fontSize(10).text(statusLabel, statusX, doc.y + 7, { width: statusWidth, align: "center" });
  doc.y += 44;

  const tableX = mx;
  const colParticular = contentWidth * 0.5;
  const colINR = contentWidth * 0.25;
  const colSAR = contentWidth * 0.25;

  renderTableItems(doc, "Receipts", data.receipts, tableX, contentWidth, colParticular, colINR, colSAR);
  renderTableItems(doc, "Expenses", data.expenses, tableX, contentWidth, colParticular, colINR, colSAR);
  renderTableItems(doc, "Payments", data.payments, tableX, contentWidth, colParticular, colINR, colSAR);
  renderBankBalances(doc, data.bankBalances, tableX, contentWidth);
  renderTableItems(doc, "Next Day Approvals", data.nextDayApprovals, tableX, contentWidth, colParticular, colINR, colSAR);

  // Totals Section
  ensureSpace(doc, 80);
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(12).text("Summary", tableX, doc.y);
  doc.y += 16;
  const rowHeight = 24;

  const summaryItems = [
    { label: "Total Receipts", val: data.summary.totalReceipts },
    { label: "Total Expenses", val: data.summary.totalExpenses },
    { label: "Total Payments", val: data.summary.totalPayments },
    { label: "Bank Balance", val: data.summary.bankBalance },
    { label: "Petty Cash", val: data.summary.pettyCashBalance }
  ];

  for (let i = 0; i < summaryItems.length; i++) {
    const item = summaryItems[i];
    ensureSpace(doc, rowHeight);
    doc.rect(tableX, doc.y, contentWidth, rowHeight).fill(i % 2 === 0 ? COLORS.soft : COLORS.panel).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(10);
    doc.text(item.label, tableX + 8, doc.y + 7, { width: contentWidth / 2 });
    doc.text(formatINR(item.val), tableX + contentWidth / 2, doc.y + 7, { width: contentWidth / 2 - 8, align: "right" });
    doc.y += rowHeight;
  }
  
  if (data.summary.description) {
    ensureSpace(doc, 40);
    doc.y += 8;
    doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(10).text("Notes / Description:", tableX, doc.y);
    doc.y += 14;
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted).text(data.summary.description, tableX, doc.y, { width: contentWidth });
    doc.y += 24;
  }

  // Exchange Rate Note
  doc.y += 12;
  ensureSpace(doc, 30);
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8);
  doc.text(`Exchange Rate: 1 INR = ${data.exchangeRate.toFixed(6)} SAR (as of report generation)`, tableX, doc.y, { width: contentWidth, align: "center" });
  doc.y += 24;

  // Approval Section
  ensureSpace(doc, 120);
  doc.moveTo(tableX, doc.y).lineTo(tableX + contentWidth, doc.y).strokeColor(COLORS.line).lineWidth(1).stroke();
  doc.y += 20;

  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(13).text("Approval / Signature", tableX, doc.y);
  doc.y += 28;

  if (data.approvedByName && data.approvedAt) {
    doc.fillColor(COLORS.ink).font("Helvetica").fontSize(10);
    doc.text(`Approved By: ${data.approvedByName}`, tableX, doc.y);
    doc.y += 18;
    doc.text(`Approved At: ${formatDate(data.approvedAt)}`, tableX, doc.y);
    doc.y += 18;
    doc.text(`Status: ${statusLabel}`, tableX, doc.y);
  } else {
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(10);
    doc.text("Status: Pending Approval", tableX, doc.y);
    doc.y += 36;
    const sigWidth = (contentWidth - 40) / 2;
    doc.moveTo(tableX, doc.y).lineTo(tableX + sigWidth, doc.y).strokeColor(COLORS.line).stroke();
    doc.moveTo(tableX + sigWidth + 40, doc.y).lineTo(tableX + contentWidth, doc.y).strokeColor(COLORS.line).stroke();
    doc.y += 8;
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8);
    doc.text("Prepared By", tableX, doc.y, { width: sigWidth, align: "center" });
    doc.text("Authorized Signature", tableX + sigWidth + 40, doc.y, { width: sigWidth, align: "center" });
  }
}

export function buildFinanceReportPdfBuffer(data: FinanceReportPdfData) {
  return new Promise<Buffer>((resolve, reject) => {
    const probe = new PDFDocument({ size: [PDF_PAGE_WIDTH_PT, 1_000_000], margin: PDF_PAGE_MARGIN_PT });
    probe.on("error", reject);
    renderFinancePdfContent(probe, data);
    const contentHeight = Math.ceil(probe.y + PDF_PAGE_MARGIN_PT + 80);
    probe.end();

    const doc = new PDFDocument({ size: [PDF_PAGE_WIDTH_PT, Math.max(contentHeight, 1)], margin: PDF_PAGE_MARGIN_PT });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    renderFinancePdfContent(doc, data);
    doc.end();
  });
}
