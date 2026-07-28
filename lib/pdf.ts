import PDFDocument from "pdfkit";
import { formatDate } from "@/lib/utils";
import { PDF_PAGE_MARGIN_PT, PDF_PAGE_WIDTH_PT } from "@/lib/pdf-page";

type ReportLike = {
  name: string;
  teamName: string;
  reportType?: string;
  attachmentLink?: string;
  dailyMeetingUpdate: string;
  completedWork: string;
  pendingWork: string;
  blockers: string;
  requiredClarification: string;
  status: string;
  leaveStatus?: "pending_tl" | "forwarded_to_hod" | "approved" | null;
  leaveType?: string;
  leaveReason?: string;
  leaveReviewedByName?: string | null;
  constructionWorkPlan?: Array<{ activity: string; location: string; unit: string; plannedQuantity: string; executedQuantity: string; completionPercentage: string; remarks: string; }>;
  constructionMaterialUtilization?: Array<{ material: string; unit: string; openingStock: string; received: string; closingStock: string; }>;
  constructionTomorrowWorkPlan?: Array<{ activity: string; location: string; unit: string; plannedQuantity: string; }>;
  nextDayApprovalItems?: Array<{ particulars: string; amountINR: number; amountRiyal: number; reason: string; review: string; approval: string; }>;
};

type TextValue = string | number | Date | null | undefined;

type ReportPdfOptions = {
  title: string;
  generatedBy: string;
  generatedAt?: Date;
  summary: {
    totalEmployees: number;
    totalReports: number;
    teamSummary: Record<string, number>;
    statusSummary: Record<string, number>;
  };
  reports: ReportLike[];
  missingReports: string[];
};

const COLORS = {
  ink: "#1E293B",
  muted: "#64748B",
  line: "#E2E8F0",
  soft: "#F8FAFC",
  panel: "#FFFFFF",
  navy: "#1E293B",
  blue: "#2563EB",
  blueSoft: "#EFF6FF",
  amber: "#F59E0B",
  amberSoft: "#FEF3C7",
  rose: "#E11D48",
  roseSoft: "#FFF1F2",
  emerald: "#059669",
  emeraldSoft: "#ECFDF5"
};

function toText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return formatDate(value);
  return String(value);
}

function cleanTeamName(value: TextValue) {
  const text = toText(value).trim();
  return !text || text.toLowerCase() === "undefined" ? "MIF Tech Members" : text;
}

function statusLabel(value?: ReportLike["leaveStatus"]) {
  if (!value) return "";
  return value === "approved" ? "On Leave" : "Leave Requested";
}

function textHeight(doc: PDFKit.PDFDocument, text: string, width: number, fontSize = 9) {
  doc.font("Helvetica").fontSize(fontSize);
  return doc.heightOfString(text || "-", { width, lineGap: 2 });
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed <= doc.page.height - PDF_PAGE_MARGIN_PT) return;
  doc.addPage();
}

function drawPill(doc: PDFKit.PDFDocument, label: string, x: number, y: number, fill: string, color: string) {
  const width = Math.max(58, doc.font("Helvetica-Bold").fontSize(8).widthOfString(label) + 16);
  doc.roundedRect(x, y, width, 18, 9).fill(fill);
  doc.fillColor(color).font("Helvetica-Bold").fontSize(8).text(label, x + 8, y + 5, { width: width - 16, align: "center" });
  return width;
}

function drawSummaryCard(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.roundedRect(x, y, width, 66, 8).fill(COLORS.soft).strokeColor(COLORS.line).lineWidth(1).stroke();
  doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(8).text(label.toUpperCase(), x + 14, y + 13, {
    width: width - 28,
    characterSpacing: 0.5
  });
  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(22).text(value, x + 14, y + 30, { width: width - 28 });
}

function drawField(doc: PDFKit.PDFDocument, label: string, value: TextValue, x: number, y: number, width: number) {
  const text = toText(value).trim() || "-";
  const labelWidth = 136;
  const valueWidth = width - labelWidth - 18;
  const height = Math.max(34, textHeight(doc, text, valueWidth, 9) + 19);

  doc.roundedRect(x, y, width, height, 6).fill("#F8FAFC").strokeColor(COLORS.line).stroke();
  doc.fillColor(COLORS.muted).font("Helvetica-Bold").fontSize(8).text(label.toUpperCase(), x + 12, y + 12, {
    width: labelWidth,
    characterSpacing: 0.3
  });
  doc.fillColor(COLORS.ink).font("Helvetica").fontSize(9).text(text, x + labelWidth + 12, y + 10, {
    width: valueWidth,
    lineGap: 2
  });

  return height;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  title: string,
  columns: { header: string; key: string; align?: "left" | "right" | "center"; width: number }[],
  data: any[],
  x: number,
  y: number,
  width: number
) {
  if (!data || data.length === 0) return 0;
  let cursorY = y;
  const rowHeight = 20;

  // Title
  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(10).text(title, x, cursorY);
  cursorY += 16;

  // Headers
  doc.roundedRect(x, cursorY, width, rowHeight, 4).fill(COLORS.navy);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8);
  let currentX = x + 8;
  for (const col of columns) {
    doc.text(col.header, currentX, cursorY + 6, { width: col.width, align: col.align || "left" });
    currentX += col.width;
  }
  cursorY += rowHeight;

  // Rows
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const bgColor = i % 2 === 0 ? COLORS.panel : COLORS.soft;
    doc.rect(x, cursorY, width, rowHeight).fill(bgColor).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    doc.fillColor(COLORS.ink).font("Helvetica").fontSize(8);
    currentX = x + 8;
    for (const col of columns) {
      doc.text(toText(item[col.key]), currentX, cursorY + 6, { width: col.width, align: col.align || "left" });
      currentX += col.width;
    }
    cursorY += rowHeight;
  }
  return cursorY - y + 8; // return total height used + 8px padding
}

function renderReportPdfContent(doc: PDFKit.PDFDocument, options: ReportPdfOptions) {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - PDF_PAGE_MARGIN_PT * 2;

  doc.rect(0, 0, pageWidth, 154).fill(COLORS.navy);
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(11).text("MIF TECHNOLOGY", PDF_PAGE_MARGIN_PT, 34, {
    width: contentWidth,
    align: "center",
    characterSpacing: 2
  });
  doc.fontSize(26).text(toText(options.title), PDF_PAGE_MARGIN_PT, 58, {
    width: contentWidth,
    align: "center"
  });
  doc.fillColor("#CBD5E1").font("Helvetica").fontSize(10).text(`Generated by ${toText(options.generatedBy)}  |  ${formatDate(options.generatedAt ?? new Date())}`, PDF_PAGE_MARGIN_PT, 96, {
    width: contentWidth,
    align: "center"
  });

  doc.y = 184;
  const cardGap = 14;
  const cardWidth = (contentWidth - cardGap * 2) / 3;
  drawSummaryCard(doc, "Employees", String(options.summary.totalEmployees), PDF_PAGE_MARGIN_PT, doc.y, cardWidth);
  drawSummaryCard(doc, "Reports", String(options.summary.totalReports), PDF_PAGE_MARGIN_PT + cardWidth + cardGap, doc.y, cardWidth);
  drawSummaryCard(doc, "Teams", String(Object.keys(options.summary.teamSummary).length), PDF_PAGE_MARGIN_PT + (cardWidth + cardGap) * 2, doc.y, cardWidth);
  doc.y += 92;

  const groupedReports = new Map<string, ReportLike[]>();
  for (const report of options.reports) {
    const teamName = cleanTeamName(report.teamName);
    groupedReports.set(teamName, [...(groupedReports.get(teamName) ?? []), report]);
  }

  for (const [teamName, reports] of groupedReports.entries()) {
    ensureSpace(doc, 116);
    const teamY = doc.y;
    doc.roundedRect(PDF_PAGE_MARGIN_PT, teamY, contentWidth, 44, 8).fill(COLORS.navy);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(15).text(teamName, PDF_PAGE_MARGIN_PT + 18, teamY + 13, {
      width: contentWidth - 180
    });
    doc.fillColor("#CBD5E1").font("Helvetica").fontSize(9).text(`${reports.length} member${reports.length === 1 ? "" : "s"}`, pageWidth - PDF_PAGE_MARGIN_PT - 130, teamY + 16, {
      width: 112,
      align: "right"
    });
    doc.y = teamY + 62;

    for (const report of reports) {
      const cardX = PDF_PAGE_MARGIN_PT;
      const cardWidth = contentWidth;
      const fields = [
        ["Daily Meeting Update", report.dailyMeetingUpdate],
        ["Completed Work", report.completedWork],
        ["Pending Work", report.pendingWork],
        ["Blockers", report.blockers],
        ["Required Clarification", report.requiredClarification],
        ...(report.attachmentLink ? [["Attachment Link", report.attachmentLink] as [string, TextValue]] : [])
      ] as Array<[string, TextValue]>;
      const fieldHeights = fields.map(([, value]) => Math.max(34, textHeight(doc, toText(value).trim() || "-", cardWidth - 178, 9) + 19));
      
      let extraHeight = 0;
      if (report.constructionWorkPlan?.length) extraHeight += 36 + report.constructionWorkPlan.length * 20;
      if (report.constructionMaterialUtilization?.length) extraHeight += 36 + report.constructionMaterialUtilization.length * 20;
      if (report.constructionTomorrowWorkPlan?.length) extraHeight += 36 + report.constructionTomorrowWorkPlan.length * 20;
      if (report.nextDayApprovalItems?.length) extraHeight += 36 + report.nextDayApprovalItems.length * 20;

      const bodyHeight = 62 + fieldHeights.reduce((sum, height) => sum + height + 8, 0) + (report.leaveStatus ? 28 : 0) + extraHeight;
      ensureSpace(doc, Math.min(bodyHeight + 20, doc.page.height - PDF_PAGE_MARGIN_PT * 2));

      const y = doc.y;
      doc.roundedRect(cardX, y, cardWidth, bodyHeight, 8).fill(COLORS.panel).strokeColor(COLORS.line).lineWidth(1).stroke();
      doc.roundedRect(cardX, y, cardWidth, 52, 8).fill(COLORS.soft);
      doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(13).text(toText(report.name), cardX + 16, y + 13, {
        width: cardWidth - 250
      });
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8).text(`${toText(report.reportType) || "Daily Update"}  |  ${cleanTeamName(report.teamName)}`, cardX + 16, y + 32, {
        width: cardWidth - 250
      });

      let pillX = cardX + cardWidth - 18;
      if (report.leaveStatus) {
        const label = statusLabel(report.leaveStatus);
        const pillWidth = Math.max(90, doc.font("Helvetica-Bold").fontSize(8).widthOfString(label) + 16);
        pillX -= pillWidth;
        drawPill(doc, label, pillX, y + 16, report.leaveStatus === "approved" ? COLORS.amberSoft : COLORS.roseSoft, report.leaveStatus === "approved" ? "#92400E" : COLORS.rose);
        pillX -= 8;
      }
      const statusText = toText(report.status) || "submitted";
      const statusWidth = Math.max(74, doc.font("Helvetica-Bold").fontSize(8).widthOfString(statusText) + 16);
      drawPill(doc, statusText, pillX - statusWidth, y + 16, COLORS.emeraldSoft, COLORS.emerald);

      let cursorY = y + 66;
      for (let index = 0; index < fields.length; index += 1) {
        const [label, value] = fields[index];
        const height = drawField(doc, label, value, cardX + 14, cursorY, cardWidth - 28);
        cursorY += height + 8;
      }

      if (report.leaveStatus) {
        const leaveText = [statusLabel(report.leaveStatus), report.leaveType, report.leaveReviewedByName ? `Approved by ${report.leaveReviewedByName}` : "", report.leaveReason]
          .map(toText)
          .filter(Boolean)
          .join(" | ");
        doc.fillColor(report.leaveStatus === "approved" ? "#92400E" : COLORS.rose)
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(leaveText, cardX + 16, cursorY, { width: cardWidth - 32 });
        cursorY += 28;
      }

      const tableW = cardWidth - 28;
      const tableX = cardX + 14;

      if (report.constructionWorkPlan?.length) {
        cursorY += 8;
        const used = drawTable(doc, "Construction Work Plan", [
          { header: "Activity", key: "activity", width: tableW * 0.25 },
          { header: "Loc", key: "location", width: tableW * 0.15 },
          { header: "Unit", key: "unit", width: tableW * 0.1 },
          { header: "Plan Qty", key: "plannedQuantity", width: tableW * 0.15 },
          { header: "Exec Qty", key: "executedQuantity", width: tableW * 0.15 },
          { header: "Done %", key: "completionPercentage", width: tableW * 0.1 },
          { header: "Remarks", key: "remarks", width: tableW * 0.1 }
        ], report.constructionWorkPlan, tableX, cursorY, tableW);
        cursorY += used;
      }

      if (report.constructionMaterialUtilization?.length) {
        cursorY += 8;
        const used = drawTable(doc, "Material Utilization", [
          { header: "Material", key: "material", width: tableW * 0.3 },
          { header: "Unit", key: "unit", width: tableW * 0.1 },
          { header: "Open Stock", key: "openingStock", width: tableW * 0.2 },
          { header: "Received", key: "received", width: tableW * 0.2 },
          { header: "Close Stock", key: "closingStock", width: tableW * 0.2 }
        ], report.constructionMaterialUtilization, tableX, cursorY, tableW);
        cursorY += used;
      }

      if (report.constructionTomorrowWorkPlan?.length) {
        cursorY += 8;
        const used = drawTable(doc, "Tomorrow's Plan", [
          { header: "Activity", key: "activity", width: tableW * 0.4 },
          { header: "Location", key: "location", width: tableW * 0.25 },
          { header: "Unit", key: "unit", width: tableW * 0.1 },
          { header: "Plan Qty", key: "plannedQuantity", width: tableW * 0.25 }
        ], report.constructionTomorrowWorkPlan, tableX, cursorY, tableW);
        cursorY += used;
      }

      if (report.nextDayApprovalItems?.length) {
        cursorY += 8;
        const used = drawTable(doc, "Next Day Approvals", [
          { header: "Particulars", key: "particulars", width: tableW * 0.3 },
          { header: "INR", key: "amountINR", width: tableW * 0.15, align: "right" },
          { header: "SAR", key: "amountRiyal", width: tableW * 0.15, align: "right" },
          { header: "Reason", key: "reason", width: tableW * 0.2 },
          { header: "Approval", key: "approval", width: tableW * 0.2 }
        ], report.nextDayApprovalItems, tableX, cursorY, tableW);
        cursorY += used;
      }

      doc.y = y + bodyHeight + 18;
    }
  }

  ensureSpace(doc, 82);
  doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(15).text("Final Section", PDF_PAGE_MARGIN_PT, doc.y);
  doc.y += 26;
  const missing = options.missingReports.map(toText).filter(Boolean);
  doc.roundedRect(PDF_PAGE_MARGIN_PT, doc.y, contentWidth, Math.max(48, textHeight(doc, missing.join(", ") || "None", contentWidth - 28, 10) + 28), 8)
    .fill(missing.length ? COLORS.roseSoft : COLORS.emeraldSoft)
    .strokeColor(missing.length ? "#FECDD3" : "#BBF7D0")
    .stroke();
  doc.fillColor(missing.length ? COLORS.rose : COLORS.emerald)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`Missing Reports: ${missing.join(", ") || "None"}`, PDF_PAGE_MARGIN_PT + 14, doc.y + 14, {
      width: contentWidth - 28,
      lineGap: 3
    });
}

export function buildReportPdfBuffer(options: ReportPdfOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    const heightProbe = new PDFDocument({ size: [PDF_PAGE_WIDTH_PT, 1_000_000], margin: PDF_PAGE_MARGIN_PT });
    heightProbe.on("error", reject);
    renderReportPdfContent(heightProbe, options);
    const contentHeight = Math.ceil(heightProbe.y + PDF_PAGE_MARGIN_PT + 120);
    heightProbe.end();

    const doc = new PDFDocument({ size: [PDF_PAGE_WIDTH_PT, Math.max(contentHeight, 1)], margin: PDF_PAGE_MARGIN_PT });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    renderReportPdfContent(doc, options);
    doc.end();
  });
}
