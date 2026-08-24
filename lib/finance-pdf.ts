import PDFDocument from "pdfkit";
import { formatDate } from "@/lib/utils";
import { PDF_PAGE_MARGIN_PT, PDF_PAGE_WIDTH_PT } from "@/lib/pdf-page";
import { formatINRPdf, formatSAR } from "@/lib/currency";

export type FinanceItemPdf = {
  particulars: string;
  description?: string;
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
  rejectionReason?: string;
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
  amber: "#D97706",
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
  ensureSpace(doc, 48);
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(12).text(title, tableX, doc.y);
  doc.y += 12;

  const rowHeight = 20;
  const headerY = doc.y;
  doc.roundedRect(tableX, headerY, contentWidth, rowHeight, 4).fill(COLORS.navy);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(10);
  doc.text("Particulars", tableX + 8, headerY + 5, { width: colParticular - 8 });
  doc.text("Amount (INR)", tableX + colParticular, headerY + 5, { width: colINR - 8, align: "right" });
  doc.text("Amount (Riyal)", tableX + colParticular + colINR, headerY + 5, { width: colSAR - 8, align: "right" });
  doc.y = headerY + rowHeight;

  if (!items || items.length === 0) {
    ensureSpace(doc, rowHeight);
    const emptyY = doc.y;
    doc.rect(tableX, emptyY, contentWidth, rowHeight).fill(COLORS.panel).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(10).text("No records", tableX, emptyY + 5, { width: contentWidth, align: "center" });
    doc.y = emptyY + rowHeight;
  } else {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const bgColor = i % 2 === 0 ? COLORS.panel : COLORS.soft;
      ensureSpace(doc, rowHeight);
      const rowY = doc.y;
      doc.rect(tableX, rowY, contentWidth, rowHeight).fill(bgColor).strokeColor(COLORS.line).lineWidth(0.5).stroke();
      doc.fillColor(COLORS.ink).font("Helvetica").fontSize(9);
      const label = item.description ? `${item.particulars || "-"} (${item.description})` : (item.particulars || "-");
      doc.text(label, tableX + 8, rowY + 5, { width: colParticular - 8 });
      doc.font("Helvetica-Bold").text(formatINRPdf(item.amountINR), tableX + colParticular, rowY + 5, { width: colINR - 8, align: "right" });
      doc.font("Helvetica").fillColor(COLORS.muted).text(formatSAR(item.amountSAR), tableX + colParticular + colINR, rowY + 5, { width: colSAR - 8, align: "right" });
      doc.y = rowY + rowHeight;
    }

    // Total row matching UI preview
    const totalINR = items.reduce((sum, i) => sum + (i.amountINR || 0), 0);
    const totalSAR = items.reduce((sum, i) => sum + (i.amountSAR || 0), 0);
    ensureSpace(doc, rowHeight);
    const totalY = doc.y;
    doc.rect(tableX, totalY, contentWidth, rowHeight).fill(COLORS.soft).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(9);
    doc.text("Total", tableX + 8, totalY + 5, { width: colParticular - 8 });
    doc.fillColor(COLORS.blue).text(formatINRPdf(totalINR), tableX + colParticular, totalY + 5, { width: colINR - 8, align: "right" });
    doc.fillColor(COLORS.muted).text(formatSAR(totalSAR), tableX + colParticular + colINR, totalY + 5, { width: colSAR - 8, align: "right" });
    doc.y = totalY + rowHeight;
  }
  doc.y += 8;
}

function renderBankBalances(
  doc: PDFKit.PDFDocument,
  items: BankBalancePdf[],
  tableX: number,
  contentWidth: number
) {
  ensureSpace(doc, 48);
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(12).text("Bank Balance", tableX, doc.y);
  doc.y += 12;

  const rowHeight = 20;
  const colBank = contentWidth * 0.36;
  const colNum = contentWidth * 0.16;

  const headerY = doc.y;
  doc.roundedRect(tableX, headerY, contentWidth, rowHeight, 4).fill(COLORS.navy);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
  doc.text("Bank Name", tableX + 8, headerY + 5, { width: colBank - 8 });
  doc.text("Opening Bal", tableX + colBank, headerY + 5, { width: colNum - 8, align: "right" });
  doc.text("Receipts", tableX + colBank + colNum, headerY + 5, { width: colNum - 8, align: "right" });
  doc.text("Payments", tableX + colBank + colNum * 2, headerY + 5, { width: colNum - 8, align: "right" });
  doc.text("Closing Bal", tableX + colBank + colNum * 3, headerY + 5, { width: colNum - 8, align: "right" });
  doc.y = headerY + rowHeight;

  if (!items || items.length === 0) {
    ensureSpace(doc, rowHeight);
    const emptyY = doc.y;
    doc.rect(tableX, emptyY, contentWidth, rowHeight).fill(COLORS.panel).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(10).text("No bank accounts", tableX, emptyY + 5, { width: contentWidth, align: "center" });
    doc.y = emptyY + rowHeight;
  } else {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const bgColor = i % 2 === 0 ? COLORS.panel : COLORS.soft;
      ensureSpace(doc, rowHeight);
      const rowY = doc.y;
      doc.rect(tableX, rowY, contentWidth, rowHeight).fill(bgColor).strokeColor(COLORS.line).lineWidth(0.5).stroke();
      doc.fillColor(COLORS.ink).font("Helvetica").fontSize(9);
      doc.text(item.bankName || "-", tableX + 8, rowY + 5, { width: colBank - 8 });
      doc.text(formatINRPdf(item.openingBalance), tableX + colBank, rowY + 5, { width: colNum - 8, align: "right" });
      doc.text(formatINRPdf(item.receipts), tableX + colBank + colNum, rowY + 5, { width: colNum - 8, align: "right" });
      doc.text(formatINRPdf(item.payments), tableX + colBank + colNum * 2, rowY + 5, { width: colNum - 8, align: "right" });
      doc.font("Helvetica-Bold").text(formatINRPdf(item.closingBalance), tableX + colBank + colNum * 3, rowY + 5, { width: colNum - 8, align: "right" });
      doc.y = rowY + rowHeight;
    }
  }
  doc.y += 8;
}

function renderCashBalance(
  doc: PDFKit.PDFDocument,
  cashBalance: { pettyCash: number; total: number },
  tableX: number,
  contentWidth: number
) {
  ensureSpace(doc, 70);
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(12).text("Cash Balance", tableX, doc.y);
  doc.y += 16;

  const boxWidth = (contentWidth - 12) / 2;
  const boxHeight = 44;
  const boxY = doc.y;

  // Petty Cash Box
  doc.roundedRect(tableX, boxY, boxWidth, boxHeight, 4).fill(COLORS.soft).strokeColor(COLORS.line).lineWidth(0.5).stroke();
  doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text("Petty Cash (INR)", tableX + 12, boxY + 8);
  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(11).text(formatINRPdf(cashBalance.pettyCash || 0), tableX + 12, boxY + 24);

  // Total Cash Box
  const totalX = tableX + boxWidth + 12;
  doc.roundedRect(totalX, boxY, boxWidth, boxHeight, 4).fill(COLORS.soft).strokeColor(COLORS.line).lineWidth(0.5).stroke();
  doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text("Total (INR)", totalX + 12, boxY + 8);
  doc.fillColor(COLORS.blue).font("Helvetica-Bold").fontSize(12).text(formatINRPdf(cashBalance.total || 0), totalX + 12, boxY + 24);

  doc.y = boxY + boxHeight + 16;
}

function renderFinancePdfContent(doc: PDFKit.PDFDocument, data: FinanceReportPdfData) {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - PDF_PAGE_MARGIN_PT * 2;
  const mx = PDF_PAGE_MARGIN_PT;

  // Header Banner
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

  doc.y = 154;

  // Status Badge Callout
  const statusColor = data.status === "approved" ? COLORS.emerald : data.status === "rejected" ? COLORS.rose : COLORS.amber;
  const statusBg = data.status === "approved" ? COLORS.emeraldSoft : data.status === "rejected" ? COLORS.roseSoft : COLORS.amberSoft;
  const statusTextMap: Record<string, string> = {
    approved: "Approved",
    rejected: "Rejected",
    forwarded_to_ceo: "Forwarded to CEO",
    pending: "Pending Approval"
  };
  const statusLabel = statusTextMap[data.status] || data.status.charAt(0).toUpperCase() + data.status.slice(1);

  const statusY = doc.y;
  doc.roundedRect(mx, statusY, contentWidth, 32, 6).fill(statusBg);
  doc.fillColor(statusColor).font("Helvetica-Bold").fontSize(10).text(`Status: ${statusLabel}`, mx + 12, statusY + 9);

  if (data.approvedByName && data.approvedAt) {
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text(
      `Approved by ${data.approvedByName} on ${formatDate(data.approvedAt)}`,
      mx + 180,
      statusY + 10,
      { width: contentWidth - 192, align: "right" }
    );
  } else if (data.status === "rejected" && data.rejectionReason) {
    doc.fillColor(COLORS.rose).font("Helvetica").fontSize(9).text(
      `Reason: ${data.rejectionReason}`,
      mx + 180,
      statusY + 10,
      { width: contentWidth - 192, align: "right" }
    );
  }
  doc.y = statusY + 32;

  doc.y += 24;

  // Exchange Rate Banner
  doc.roundedRect(mx, doc.y, contentWidth, 24, 4).fill(COLORS.soft).strokeColor(COLORS.line).lineWidth(0.5).stroke();
  doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(9).text(
    `Exchange Rate: 1 INR = ${(data.exchangeRate || 0).toFixed(4)} SAR`,
    mx + 12,
    doc.y + 7
  );
  doc.y += 24;

  const tableX = mx;
  const colParticular = contentWidth * 0.64;
  const colINR = contentWidth * 0.18;
  const colSAR = contentWidth * 0.18;

  renderTableItems(doc, "Expenses", data.expenses, tableX, contentWidth, colParticular, colINR, colSAR);
  renderTableItems(doc, "Receipts", data.receipts, tableX, contentWidth, colParticular, colINR, colSAR);
  renderTableItems(doc, "Payments", data.payments, tableX, contentWidth, colParticular, colINR, colSAR);
  renderBankBalances(doc, data.bankBalances, tableX, contentWidth);
  renderCashBalance(doc, data.cashBalance || { pettyCash: 0, total: 0 }, tableX, contentWidth);

  if (data.nextDayApprovals && data.nextDayApprovals.length > 0) {
    renderTableItems(doc, "Next Day Approval Required", data.nextDayApprovals, tableX, contentWidth, colParticular, colINR, colSAR);
  }

  // Summary Section
  ensureSpace(doc, 100);
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(12).text("Summary", tableX, doc.y);
  doc.y += 12;

  const summaryHeight = 124;
  doc.roundedRect(tableX, doc.y, contentWidth, summaryHeight, 4).fill(COLORS.panel).strokeColor(COLORS.line).lineWidth(0.5).stroke();
  
  const colLeftWidth = contentWidth * 0.45;
  const colRightWidth = contentWidth * 0.50;
  const startY = doc.y + 12;

  // Left Column - Financial Totals
  let leftY = startY;
  const summaryRows = [
    { label: "Total Expenses", val: formatINRPdf(data.summary.totalExpenses || 0), color: COLORS.rose },
    { label: "Total Receipts", val: formatINRPdf(data.summary.totalReceipts || 0), color: COLORS.emerald },
    { label: "Total Payments", val: formatINRPdf(data.summary.totalPayments || 0), color: COLORS.rose },
    { label: "Bank Balance", val: formatINRPdf(data.summary.bankBalance || 0), color: COLORS.blue },
    { label: "Petty Cash Balance", val: formatINRPdf(data.summary.pettyCashBalance || 0), color: COLORS.ink }
  ];

  for (const row of summaryRows) {
    doc.fillColor(COLORS.ink).font("Helvetica").fontSize(9).text(row.label, tableX + 12, leftY);
    doc.fillColor(row.color).font("Helvetica-Bold").fontSize(9).text(row.val, tableX + 12, leftY, { width: colLeftWidth - 12, align: "right" });
    leftY += 20;
  }

  // Divider Line
  doc.moveTo(tableX + colLeftWidth + 12, startY).lineTo(tableX + colLeftWidth + 12, startY + 116).strokeColor(COLORS.line).lineWidth(0.5).stroke();

  // Right Column - Description / Notes
  const rightX = tableX + colLeftWidth + 24;
  doc.fillColor(COLORS.navy).font("Helvetica-Bold").fontSize(10).text("Description", rightX, startY);
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9).text(
    data.summary?.description || "No description provided.",
    rightX,
    startY + 18,
    { width: colRightWidth - 24 }
  );

  doc.y = startY + summaryHeight + 12;

  // Signatures Section
  ensureSpace(doc, 100);
  doc.moveTo(tableX, doc.y).lineTo(tableX + contentWidth, doc.y).strokeColor(COLORS.line).lineWidth(1).stroke();
  doc.y += 20;

  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(12).text("Approval / Signature", tableX, doc.y);
  doc.y += 24;

  if (data.approvedByName && data.approvedAt) {
    doc.fillColor(COLORS.ink).font("Helvetica").fontSize(9);
    doc.text(`Approved By: ${data.approvedByName}`, tableX, doc.y);
    doc.y += 16;
    doc.text(`Approved At: ${formatDate(data.approvedAt)}`, tableX, doc.y);
    doc.y += 16;
    doc.text(`Status: ${statusLabel}`, tableX, doc.y);
  } else {
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9);
    doc.text("Status: Pending Approval", tableX, doc.y);
    doc.y += 32;

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
    const contentHeight = Math.ceil(probe.y + PDF_PAGE_MARGIN_PT + 40);
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

function renderFinanceApprovalPdfContent(doc: PDFKit.PDFDocument, data: FinanceReportPdfData) {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - PDF_PAGE_MARGIN_PT * 2;
  const mx = PDF_PAGE_MARGIN_PT;

  doc.rect(0, 0, pageWidth, 120).fill(COLORS.navy);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11).text("MIF TECHNOLOGY", mx, 34, {
    width: contentWidth,
    align: "center",
    characterSpacing: 2
  });
  doc.fontSize(24).text("Finance Approval Request", mx, 52, { width: contentWidth, align: "center" });
  doc.fillColor("#CBD5E1").font("Helvetica").fontSize(10).text(
    `Report Date: ${formatDate(data.reportDate)}  |  Submitted by: ${data.submittedByName}`,
    mx, 90,
    { width: contentWidth, align: "center" }
  );

  doc.y = 140;

  const tableX = mx;
  const colParticular = contentWidth * 0.64;
  const colINR = contentWidth * 0.18;
  const colSAR = contentWidth * 0.18;

  renderTableItems(doc, "Next Day Approval Required", data.nextDayApprovals, tableX, contentWidth, colParticular, colINR, colSAR);
  doc.y += 24;

  const statusTextMap: Record<string, string> = {
    approved: "Approved",
    rejected: "Rejected",
    forwarded_to_ceo: "Forwarded to CEO",
    pending: "Pending Approval"
  };
  const statusLabel = statusTextMap[data.status] || data.status.charAt(0).toUpperCase() + data.status.slice(1);

  // Signatures Section
  ensureSpace(doc, 100);
  doc.moveTo(tableX, doc.y).lineTo(tableX + contentWidth, doc.y).strokeColor(COLORS.line).lineWidth(1).stroke();
  doc.y += 20;

  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(12).text("Approval / Signature", tableX, doc.y);
  doc.y += 24;

  if (data.approvedByName && data.approvedAt) {
    doc.fillColor(COLORS.ink).font("Helvetica").fontSize(9);
    doc.text(`Approved By: ${data.approvedByName}`, tableX, doc.y);
    doc.y += 16;
    doc.text(`Approved At: ${formatDate(data.approvedAt)}`, tableX, doc.y);
    doc.y += 16;
    doc.text(`Status: ${statusLabel}`, tableX, doc.y);
  } else {
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9);
    doc.text(`Status: ${statusLabel}`, tableX, doc.y);
    doc.y += 32;

    const sigWidth = (contentWidth - 40) / 2;
    doc.moveTo(tableX, doc.y).lineTo(tableX + sigWidth, doc.y).strokeColor(COLORS.line).stroke();
    doc.moveTo(tableX + sigWidth + 40, doc.y).lineTo(tableX + contentWidth, doc.y).strokeColor(COLORS.line).stroke();
    doc.y += 8;
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8);
    doc.text("Prepared By", tableX, doc.y, { width: sigWidth, align: "center" });
    doc.text("Authorized Signature", tableX + sigWidth + 40, doc.y, { width: sigWidth, align: "center" });
  }
}

export function buildFinanceApprovalPdfBuffer(data: FinanceReportPdfData) {
  return new Promise<Buffer>((resolve, reject) => {
    const probe = new PDFDocument({ size: [PDF_PAGE_WIDTH_PT, 1_000_000], margin: PDF_PAGE_MARGIN_PT });
    probe.on("error", reject);
    renderFinanceApprovalPdfContent(probe, data);
    const contentHeight = Math.ceil(probe.y + PDF_PAGE_MARGIN_PT + 40);
    probe.end();

    const doc = new PDFDocument({ size: [PDF_PAGE_WIDTH_PT, Math.max(contentHeight, 1)], margin: PDF_PAGE_MARGIN_PT });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    renderFinanceApprovalPdfContent(doc, data);
    doc.end();
  });
}
