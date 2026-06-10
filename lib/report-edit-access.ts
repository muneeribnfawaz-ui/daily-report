const REPORT_EDIT_TIME_ZONE = "Asia/Kolkata";

type EditableReport = {
  [key: string]: unknown;
  reportDate?: unknown;
  isLocked?: unknown;
  editAccessGranted?: unknown;
};

type EditActor = {
  role?: string | null;
};

function getDateKey(value: string | Date, timeZone = REPORT_EDIT_TIME_ZONE) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}

export function isReportDateToday(reportDate?: string | Date | null, now = new Date()) {
  if (!reportDate) return false;
  return getDateKey(reportDate) === getDateKey(now);
}

export function canEditDailyReport(report: EditableReport, actor?: EditActor, now = new Date()) {
  if (report.isLocked) return false;
  const reportDate = report.reportDate instanceof Date || typeof report.reportDate === "string" ? report.reportDate : null;
  if (actor?.role === "team_member") {
    return Boolean(report.editAccessGranted);
  }

  if (actor?.role === "team_lead") {
    return isReportDateToday(reportDate, now) || Boolean(report.editAccessGranted);
  }

  return isReportDateToday(reportDate, now) || Boolean(report.editAccessGranted);
}
