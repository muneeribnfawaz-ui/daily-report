import type { ReportSheetTeamGroup } from "@/components/reports/report-sheet-preview";

export type ConsolidatedReportPdfData = {
  date: string;
  reportCount: number;
  teamCount: number;
  teamGroups: ReportSheetTeamGroup[];
  title: string;
  generatedBy: string;
  companyName?: string;
  projectName?: string;
  subtitle?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDisplayDate(value: string | Date) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function taskCell(value?: string | null) {
  const text = (value ?? "").trim();
  if (!text) {
    return `<div class="muted">-</div>`;
  }

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 1) {
    return `<div class="task-text">${escapeHtml(lines[0])}</div>`;
  }

  return `<ul class="task-list">${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
}

export function buildConsolidatedReportHtml(data: ConsolidatedReportPdfData) {
  const companyName = data.companyName ?? "MIF TECHNOLOGY";
  const projectName = data.projectName ?? "MIF Cortex";
  const subtitle = data.subtitle ?? "Completed Work · Pending Work · Blockers · Clarifications";
  const totalLeaveCount = data.teamGroups.reduce((total, teamGroup) => total + (teamGroup.leaveMembers?.length ?? 0), 0);
  const totalNotSharedCount = data.teamGroups.reduce((total, teamGroup) => total + (teamGroup.notSharedMembers?.length ?? 0), 0);

  const body = data.teamGroups
    .map((teamGroup) => {
      const resolvedTeamLabel =
        !teamGroup.teamName?.trim() || teamGroup.teamName.toLowerCase() === "undefined"
          ? "MIF Tech Members"
          : teamGroup.teamName;
      const memberCount = new Set([
        ...teamGroup.reports.map((report) => report.employeeId ?? report.name),
        ...(teamGroup.leaveMembers ?? []).map((member) => member.employeeId),
        ...(teamGroup.notSharedMembers ?? []).map((member) => member.employeeId)
      ]).size;

      return `
        <section class="team-card">
          <div class="team-head">
            <div>
              <div class="team-title">${escapeHtml(resolvedTeamLabel)}</div>
              <div class="team-subtitle">${memberCount} member${memberCount === 1 ? "" : "s"}</div>
            </div>
          </div>
          ${teamGroup.leaveMembers?.length ? `
            <div class="leave-strip">
              <div class="leave-strip-title">On Leave (${teamGroup.leaveMembers.length})</div>
              <div class="leave-strip-list">
                ${teamGroup.leaveMembers
                  .map((member) => `
                    <span class="leave-strip-item ${member.status === "approved" ? "approved" : "requested"}">
                      ${escapeHtml(member.name)} · ${escapeHtml(member.status === "approved" ? "On Leave" : "Leave Requested")}${member.leaveDuration ? ` · ${escapeHtml(member.leaveDuration === "full_day" ? "Full Day" : "Half Day")}` : ""}${member.leaveDuration === "half_day" && member.leaveHalf ? ` · ${escapeHtml(member.leaveHalf === "first_half" ? "First Half" : "Second Half")}` : ""}${member.reviewedByName ? ` · ${escapeHtml(member.status === "approved" ? "Approved by" : "Reviewed by")} ${escapeHtml(member.reviewedByName)}` : ""}
                    </span>
                  `)
                  .join("")}
              </div>
            </div>
          ` : ""}
          ${teamGroup.notSharedMembers?.length ? `
            <div class="not-shared-strip">
              <div class="not-shared-strip-title">Not Shared (${teamGroup.notSharedMembers.length})</div>
              <div class="not-shared-strip-list">
                ${teamGroup.notSharedMembers
                  .map((member) => `
                    <span class="not-shared-strip-item">
                      ${escapeHtml(member.name)} · Not Shared
                    </span>
                  `)
                  .join("")}
              </div>
            </div>
          ` : ""}
          ${teamGroup.dailyMeetingUpdate?.trim() ? `
            <div class="update-box">
              <div class="section-label">Daily Meeting Update</div>
              <div class="update-text">${escapeHtml(teamGroup.dailyMeetingUpdate)}</div>
            </div>
          ` : ""}
          <div class="reports">
            ${teamGroup.reports
              .map((report) => {
                const isLead = report.employeeRole === "team_lead";
                const leaveLabel = report.leaveStatus === "approved" ? "On Leave" : "Leave Requested";
                return `
                  <article class="report-card ${isLead ? "report-lead" : ""}">
                    <div class="report-head ${isLead ? "report-head-lead" : ""}">
                      <div class="report-name-row">
                        <div class="report-name">${escapeHtml(report.name)}</div>
                        ${report.employeeRole ? `<span class="role-badge ${isLead ? "role-lead" : "role-member"}">${isLead ? "Team Lead" : "Team Member"}</span>` : ""}
                        ${report.leaveStatus ? `<span class="leave-badge ${report.leaveStatus === "approved" ? "leave-approved" : "leave-requested"}">${escapeHtml(leaveLabel)}${report.leaveType ? ` · ${escapeHtml(report.leaveType)}` : ""}${report.leaveReviewedByName ? ` · Approved by ${escapeHtml(report.leaveReviewedByName)}` : ""}</span>` : ""}
                      </div>
                      <div class="report-meta">
                        <span>${escapeHtml(formatDisplayDate(report.reportDate))}</span>
                        <span>${escapeHtml(report.reportType)}</span>
                      </div>
                    </div>
                    <div class="report-body">
                      ${report.attachmentLink?.trim() ? `
                        <div class="field-row">
                          <div class="field-label">Attachment Link</div>
                          <div class="field-value">
                            <a href="${escapeHtml(report.attachmentLink)}">${escapeHtml(report.attachmentLink)}</a>
                          </div>
                        </div>
                      ` : ""}
                      <div class="field-row">
                        <div class="field-label">Completed Work</div>
                        <div class="field-value">${taskCell(report.completedWork)}</div>
                      </div>
                      <div class="field-row">
                        <div class="field-label">Pending Work</div>
                        <div class="field-value">${taskCell(report.pendingWork)}</div>
                      </div>
                      <div class="field-row">
                        <div class="field-label">Blockers</div>
                        <div class="field-value">${taskCell(report.blockers)}</div>
                      </div>
                      <div class="field-row">
                        <div class="field-label">Required Clarification</div>
                        <div class="field-value">${taskCell(report.requiredClarification)}</div>
                      </div>
                      ${report.leaveStatus ? `
                        <div class="field-row">
                          <div class="field-label">Leave Status</div>
                          <div class="field-value">
                            ${escapeHtml(leaveLabel)}${report.leaveType ? ` · ${escapeHtml(report.leaveType)}` : ""}
                            ${report.leaveReviewedByName ? `<div class="leave-reason">Approved by ${escapeHtml(report.leaveReviewedByName)}</div>` : ""}
                            ${report.leaveReason ? `<div class="leave-reason">${escapeHtml(report.leaveReason)}</div>` : ""}
                          </div>
                        </div>
                      ` : ""}
                    </div>
                    ${(() => {
                      const items = (report as unknown as { nextDayApprovalItems?: Array<{ particulars: string; amountINR: number; amountRiyal: number; reason: string; review: string; approval: string }> }).nextDayApprovalItems;
                      if (!items?.length) return "";
                      return `
                        <div class="approval-section">
                          <div class="approval-title">Next Day Approval Required</div>
                          <table class="approval-table">
                            <thead>
                              <tr>
                                <th>Particulars</th>
                                <th style="text-align:right">Amount (INR)</th>
                                <th style="text-align:right">Amount (Riyal)</th>
                                <th>Reason</th>
                                <th>Review</th>
                                <th style="text-align:center">Approval</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${items.map((item) => `
                                <tr>
                                  <td>${escapeHtml(item.particulars)}</td>
                                  <td style="text-align:right">${Number(item.amountINR).toLocaleString("en-IN")}</td>
                                  <td style="text-align:right">${Number(item.amountRiyal).toLocaleString("en-SA")}</td>
                                  <td>${item.reason ? escapeHtml(item.reason) : "—"}</td>
                                  <td>${item.review ? escapeHtml(item.review) : "—"}</td>
                                  <td style="text-align:center">
                                    <span class="approval-badge approval-${item.approval || "pending"}">${item.approval === "yes" ? "Yes" : item.approval === "no" ? "No" : "Pending"}</span>
                                  </td>
                                </tr>
                              `).join("")}
                            </tbody>
                          </table>
                        </div>
                      `;
                    })()}
                  </article>
                `;
              })
              .join("")}
          </div>
        </section>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        --page-width: 210mm;
        --page-pad: 12mm;
        --primary: #2563EB;
        --primary-dark: #1D4ED8;
        --sidebar: #1E3A5F;
        --navbar: #1E293B;
        --bg: #F0F4F8;
        --card: #FFFFFF;
        --ink: #1E293B;
        --muted: #64748b;
        --line: #E2E8F0;
        --soft: #F0F4F8;
        --success: #10B981;
        --warning: #F59E0B;
        --danger: #EF4444;
        --warning-soft: #FEF3C7;
        --danger-soft: #FEE2E2;
      }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); }
      body { font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page {
        width: var(--page-width);
        margin: 0 auto;
        padding: var(--page-pad);
        background: var(--card);
      }
      .header {
        border-bottom: 3px solid var(--navbar);
        padding-bottom: 14px;
      }
      .brand {
        text-align: center;
      }
      .brand h1 {
        margin: 0;
        font-size: 42px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        line-height: 1.1;
        color: var(--navbar);
      }
      .brand p {
        margin: 6px 0 0;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .title-row {
        margin-top: 18px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
      }
      .title-row h2 {
        margin: 0;
        font-size: 32px;
        line-height: 1.15;
        color: var(--ink);
      }
      .subtitle {
        margin-top: 6px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--muted);
      }
      .date-pill {
        border-radius: 9999px;
        border: 0;
        background: var(--soft);
        box-shadow: 0 1px 2px rgb(30 41 59 / 0.08);
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 600;
        color: var(--primary-dark);
        white-space: nowrap;
      }
      .summary {
        margin-top: 18px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--soft);
        padding: 16px 24px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        text-align: center;
      }
      .summary-project {
        justify-content: center;
      }
      .summary-row {
        display: flex;
        justify-content: center;
        gap: 24px 32px;
        flex-wrap: wrap;
      }
      .summary-item {
        display: flex;
        align-items: baseline;
        gap: 10px;
      }
      .summary-label {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .summary-value {
        font-size: 20px;
        font-weight: 800;
        color: var(--ink);
      }
      .summary-value.accent {
        color: var(--primary-dark);
      }
      .team-card {
        margin-top: 18px;
        border: 1px solid var(--line);
        border-radius: 24px;
        overflow: hidden;
        break-inside: avoid;
        page-break-inside: avoid;
        background: var(--card);
        box-shadow: 0 10px 30px rgb(30 41 59 / 0.08);
      }
      .team-head {
        padding: 16px 20px;
        background: linear-gradient(90deg, var(--sidebar) 0%, var(--navbar) 100%);
        color: #E2E8F0;
      }
      .leave-strip {
        padding: 14px 20px;
        background: var(--warning-soft);
        border-bottom: 1px solid var(--line);
      }
      .leave-strip-title {
        margin-bottom: 6px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        color: var(--warning);
      }
      .leave-strip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .leave-strip-item {
        display: inline-flex;
        align-items: center;
        border-radius: 9999px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 700;
      }
      .leave-strip-item.approved {
        background: var(--warning);
        color: var(--ink);
      }
      .leave-strip-item.requested {
        background: var(--danger-soft);
        color: var(--danger);
      }
      .not-shared-strip {
        padding: 14px 20px;
        background: var(--danger-soft);
        border-bottom: 1px solid var(--line);
      }
      .not-shared-strip-title {
        margin-bottom: 6px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        color: var(--danger);
      }
      .not-shared-strip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .not-shared-strip-item {
        display: inline-flex;
        align-items: center;
        border-radius: 9999px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 700;
        background: var(--card);
        color: var(--danger);
        border: 1px solid rgb(239 68 68 / 0.3);
      }
      .team-title {
        font-size: 24px;
        font-weight: 800;
        line-height: 1.2;
        color: #E2E8F0;
      }
      .team-subtitle {
        margin-top: 4px;
        font-size: 13px;
        color: #E2E8F0;
      }
      .update-box {
        padding: 4px 20px;
        background: var(--warning-soft);
        border-left: 5px solid var(--warning);
      }
      .section-label {
        margin-bottom: 6px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.3em;
        text-transform: uppercase;
        color: var(--warning);
      }
      .update-text {
        font-size: 14px;
        line-height: 1.4;
        font-weight: 700;
        color: var(--primary-dark);
        white-space: pre-line;
      }
      .reports { padding: 0 16px 16px; background: var(--card); }
      .report-card {
        border: 1px solid var(--line);
        border-radius: 18px;
        overflow: hidden;
        background: var(--card);
      }
      .report-card + .report-card { margin-top: 14px; }
      .report-lead { box-shadow: inset 0 0 0 1px rgb(245 158 11 / 0.35); }
      .report-head {
        padding: 12px 14px;
        border-bottom: 1px solid var(--line);
        background: var(--soft);
      }
      .report-head-lead { background: var(--warning-soft); }
      .report-name-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .report-name {
        font-size: 15px;
        font-weight: 800;
        line-height: 1.2;
        color: var(--ink);
      }
      .role-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 9999px;
        padding: 2px 10px;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        line-height: 1.4;
      }
      .role-lead {
        background: var(--warning);
        color: var(--ink);
      }
      .role-member {
        background: var(--success);
        color: #ffffff;
      }
      .leave-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 9999px;
        padding: 2px 10px;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        line-height: 1.4;
      }
      .leave-approved {
        background: var(--warning);
        color: var(--ink);
      }
      .leave-requested {
        background: var(--danger-soft);
        color: var(--danger);
      }
      .report-meta {
        margin-top: 6px;
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .report-body { padding: 14px; }
      .field-row {
        display: grid;
        grid-template-columns: 170px 1fr;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid var(--line);
      }
      .field-row:last-child { border-bottom: 0; }
      .field-label {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .field-value {
        min-width: 0;
        font-size: 13px;
        line-height: 1.65;
        color: var(--ink);
      }
      .field-value a {
        color: var(--primary-dark);
        text-decoration: none;
        overflow-wrap: anywhere;
      }
      .leave-reason {
        margin-top: 6px;
        font-size: 12px;
        line-height: 1.5;
        color: var(--warning);
      }
      .task-text {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        color: var(--ink);
      }
      .task-list {
        margin: 0;
        padding-left: 18px;
      }
      .task-list li {
        margin: 0 0 4px;
      }
      .muted { color: #94a3b8; }
      .approval-section {
        padding: 12px 14px;
        border-top: 1px solid var(--line);
        background: #FFFBEB;
      }
      .approval-title {
        margin-bottom: 8px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.25em;
        text-transform: uppercase;
        color: #B45309;
      }
      .approval-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .approval-table th {
        padding: 6px 8px;
        border-bottom: 2px solid #FCD34D;
        font-weight: 700;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #92400E;
        text-align: left;
      }
      .approval-table td {
        padding: 6px 8px;
        border-bottom: 1px solid #FEF3C7;
        color: var(--ink);
      }
      .approval-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 9999px;
        padding: 2px 8px;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .approval-yes {
        background: #D1FAE5;
        color: #065F46;
      }
      .approval-no {
        background: #FEE2E2;
        color: #991B1B;
      }
      .approval-pending {
        background: #FEF3C7;
        color: #92400E;
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="header">
        <div class="brand">
          <h1>${escapeHtml(companyName)}</h1>
          <p>Enterprise Technology Solutions</p>
        </div>
        <div class="title-row">
          <div>
            <h2>${escapeHtml(data.title)}</h2>
            <div class="subtitle">${escapeHtml(subtitle)}</div>
          </div>
          <div class="date-pill">${escapeHtml(data.date)}</div>
        </div>
      </header>

      <section class="summary">
        <div class="summary-item summary-project">
          <span class="summary-label">Project Name</span>
          <span class="summary-value accent">${escapeHtml(projectName)}</span>
        </div>
        <div class="summary-row">
          <div class="summary-item">
            <span class="summary-label">Total Teams</span>
            <span class="summary-value">${data.teamCount}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Reports</span>
            <span class="summary-value">${data.reportCount}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">On Leave</span>
            <span class="summary-value">${totalLeaveCount}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Not Shared</span>
            <span class="summary-value">${totalNotSharedCount}</span>
          </div>
        </div>
      </section>

      ${body}
    </main>
  </body>
</html>`;
}
