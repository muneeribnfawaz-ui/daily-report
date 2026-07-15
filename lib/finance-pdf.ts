import PDFDocument from "pdfkit";
import { formatDate } from "@/lib/utils";
import { PDF_PAGE_MARGIN_PT, PDF_PAGE_WIDTH_PT } from "@/lib/pdf-page";
import { formatINR, formatSAR } from "@/lib/currency";
import { FINANCE_REPORT_FIELDS } from "@/lib/constants";

type FinanceReportPdfData = {
  reportDate: Date | string;
  submittedByName: string;
  openingBalance: number;
  cashReceived: number;
  cardSales: number;
  onlinePayments: number;
  expenses: number;
  refunds: number;
  pettyCash: number;
  bankDeposit: number;
  closingCashBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  exchangeRate: number;
  closingCashBalanceSAR: number;
  totalIncomeSAR: number;
  totalExpensesSAR: number;
  netBalanceSAR: number;
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

function getFieldValue(data: FinanceReportPdfData, key: string): number {
  return (data as unknown as Record<string, number>)[key] ?? 0;
}

function renderFinancePdfContent(doc: PDFKit.PDFDocument, data: FinanceReportPdfData) {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - PDF_PAGE_MARGIN_PT * 2;
  const mx = PDF_PAGE_MARGIN_PT;

  // ── Header ──
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

  // ── Status Badge ──
  const statusColor = data.status === "approved" ? COLORS.emerald : data.status === "rejected" ? COLORS.rose : COLORS.amber;
  const statusBg = data.status === "approved" ? COLORS.emeraldSoft : data.status === "rejected" ? COLORS.roseSoft : COLORS.amberSoft;
  const statusLabel = data.status.charAt(0).toUpperCase() + data.status.slice(1);
  const statusWidth = 120;
  const statusX = mx + contentWidth - statusWidth;
  doc.roundedRect(statusX, doc.y, statusWidth, 24, 12).fill(statusBg);
  doc.fillColor(statusColor).font("Helvetica-Bold").fontSize(10).text(statusLabel, statusX, doc.y + 7, { width: statusWidth, align: "center" });
  doc.y += 44;

  // ── Finance Summary Table ──
  const tableX = mx;
  const colParticular = contentWidth * 0.4;
  const colINR = contentWidth * 0.3;
  const colSAR = contentWidth * 0.3;
  const rowHeight = 36;

  // Table header
  doc.roundedRect(tableX, doc.y, contentWidth, rowHeight, 6).fill(COLORS.navy);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
  doc.text("Particular", tableX + 14, doc.y + 12, { width: colParticular - 14 });
  doc.text("Amount (INR)", tableX + colParticular, doc.y + 12, { width: colINR, align: "right" });
  doc.text("Amount (SAR)", tableX + colParticular + colINR, doc.y + 12, { width: colSAR - 14, align: "right" });
  doc.y += rowHeight;

  // Data rows
  for (let i = 0; i < FINANCE_REPORT_FIELDS.length; i++) {
    const field = FINANCE_REPORT_FIELDS[i];
    const value = getFieldValue(data, field.key);
    const sarValue = value * data.exchangeRate;
    const bgColor = i % 2 === 0 ? COLORS.panel : COLORS.soft;

    ensureSpace(doc, rowHeight);
    doc.rect(tableX, doc.y, contentWidth, rowHeight).fill(bgColor).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    doc.fillColor(COLORS.ink).font("Helvetica").fontSize(10);
    doc.text(field.label, tableX + 14, doc.y + 12, { width: colParticular - 14 });
    doc.font("Helvetica-Bold").text(formatINR(value), tableX + colParticular, doc.y + 12, { width: colINR, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted).text(formatSAR(sarValue), tableX + colParticular + colINR, doc.y + 12, { width: colSAR - 14, align: "right" });
    doc.y += rowHeight;
  }

  // ── Separator ──
  doc.y += 6;
  doc.moveTo(tableX, doc.y).lineTo(tableX + contentWidth, doc.y).strokeColor(COLORS.navy).lineWidth(2).stroke();
  doc.y += 12;

  // ── Totals Section ──
  const totals = [
    { label: "Total Income", inr: data.totalIncome, sar: data.totalIncomeSAR, color: COLORS.emerald },
    { label: "Total Expenses", inr: data.totalExpenses, sar: data.totalExpensesSAR, color: COLORS.rose },
    { label: "Net Balance", inr: data.netBalance, sar: data.netBalanceSAR, color: data.netBalance >= 0 ? COLORS.emerald : COLORS.rose },
    { label: "Closing Cash Balance", inr: data.closingCashBalance, sar: data.closingCashBalanceSAR, color: COLORS.blue }
  ];

  for (const total of totals) {
    ensureSpace(doc, rowHeight + 4);
    doc.roundedRect(tableX, doc.y, contentWidth, rowHeight, 4).fill(COLORS.soft).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    doc.fillColor(total.color).font("Helvetica-Bold").fontSize(11);
    doc.text(total.label, tableX + 14, doc.y + 11, { width: colParticular - 14 });
    doc.text(formatINR(total.inr), tableX + colParticular, doc.y + 11, { width: colINR, align: "right" });
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9);
    doc.text(formatSAR(total.sar), tableX + colParticular + colINR, doc.y + 11, { width: colSAR - 14, align: "right" });
    doc.y += rowHeight + 4;
  }

  // ── Exchange Rate Note ──
  doc.y += 12;
  ensureSpace(doc, 30);
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8);
  doc.text(`Exchange Rate: 1 INR = ${data.exchangeRate.toFixed(6)} SAR (as of report generation)`, tableX, doc.y, { width: contentWidth, align: "center" });
  doc.y += 24;

  // ── Approval Section ──
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

    // Signature lines
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
    // First pass: measure content height
    const probe = new PDFDocument({ size: [PDF_PAGE_WIDTH_PT, 1_000_000], margin: PDF_PAGE_MARGIN_PT });
    probe.on("error", reject);
    renderFinancePdfContent(probe, data);
    const contentHeight = Math.ceil(probe.y + PDF_PAGE_MARGIN_PT + 80);
    probe.end();

    // Second pass: render into correctly-sized document
    const doc = new PDFDocument({ size: [PDF_PAGE_WIDTH_PT, Math.max(contentHeight, 1)], margin: PDF_PAGE_MARGIN_PT });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    renderFinancePdfContent(doc, data);
    doc.end();
  });
}
