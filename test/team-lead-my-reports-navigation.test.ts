import { describe, it, expect } from "vitest";
import { SIDEBAR_NAV_ITEMS_BY_ROLE } from "@/lib/constants";
import { isInMarketing, isInConstruction, isInFinance } from "@/lib/permissions";

describe("Team Lead My Reports Navigation & Active Route Highlighting", () => {
  // Helper to compute sidebar items for a given user session
  function computeSidebarItems(
    sessionUser: {
      role: string;
      departments?: Array<{ name: string; subTeams?: string[] }> | string[] | any;
      teamName?: string;
      teamNames?: string[];
    }
  ) {
    const resolvedRole = sessionUser.role as keyof typeof SIDEBAR_NAV_ITEMS_BY_ROLE;
    if (resolvedRole === "report_manager") {
      return [...SIDEBAR_NAV_ITEMS_BY_ROLE.report_manager];
    }
    let rawItems: Array<{ href: string; label: string }> = [...SIDEBAR_NAV_ITEMS_BY_ROLE[resolvedRole]];
    const userIsInFinance = isInFinance(sessionUser as any);
    const userIsInMarketing = isInMarketing(sessionUser as any);
    const userIsInConstruction = isInConstruction(sessionUser as any);

    if (userIsInFinance && (resolvedRole === "team_lead" || resolvedRole === "team_member")) {
      const financeNav: Array<{ href: string; label: string }> = [];
      if (resolvedRole === "team_lead") {
        financeNav.push({ href: "/team-lead/dashboard", label: "Dashboard" });
        financeNav.push({ href: "/finance/my-reports", label: "My Reports" });
        financeNav.push({ href: "/finance", label: "All Reports" });
        financeNav.push({ href: "/team-lead/users", label: "Employees" });
      } else {
        financeNav.push({ href: "/tm/dashboard", label: "Dashboard" });
        financeNav.push({ href: "/finance/my-reports", label: "My Reports" });
      }
      financeNav.push({ href: "/finance/requests", label: "Money Request" });
      return financeNav;
    }

    if (resolvedRole === "team_lead" || resolvedRole === "team_member") {
      let targetMyReportsHref = resolvedRole === "team_member" ? "/tm/my-reports" : "/daily-report/my-reports";
      if (userIsInMarketing) {
        targetMyReportsHref = "/marketing/my-reports";
      } else if (userIsInConstruction) {
        targetMyReportsHref = "/construction/my-reports";
      } else if (userIsInFinance) {
        targetMyReportsHref = "/finance/my-reports";
      }

      rawItems = rawItems.map((item) => {
        if (item.label === "My Reports" || item.label === "My Report" || item.href.includes("my-reports")) {
          return { ...item, href: targetMyReportsHref };
        }
        return item;
      });
    }

    return rawItems;
  }

  // Helper to compute active state for a sidebar item on a given pathname
  function isItemActive(item: { href: string; label: string }, pathname: string): boolean {
    const isMyReportsItem =
      item.label === "My Reports" ||
      item.label === "My Report" ||
      item.href === "/daily-report/my-reports" ||
      item.href === "/tm/my-reports" ||
      item.href === "/marketing/my-reports" ||
      item.href === "/construction/my-reports" ||
      item.href === "/finance/my-reports";

    const isMyReportsPath =
      pathname === "/daily-report/my-reports" ||
      pathname.startsWith("/daily-report/my-reports/") ||
      pathname.startsWith("/daily-report/create") ||
      pathname.startsWith("/daily-report/preview") ||
      pathname.startsWith("/daily-report/edit") ||
      pathname === "/tm/my-reports" ||
      pathname.startsWith("/tm/my-reports/") ||
      pathname === "/marketing/my-reports" ||
      pathname.startsWith("/marketing/my-reports/") ||
      pathname.startsWith("/marketing/create") ||
      pathname.startsWith("/marketing/edit") ||
      pathname.startsWith("/marketing/preview") ||
      (pathname.startsWith("/marketing/") && !pathname.startsWith("/marketing/reports")) ||
      pathname === "/construction/my-reports" ||
      pathname.startsWith("/construction/my-reports/") ||
      pathname.startsWith("/construction/create") ||
      pathname.startsWith("/construction/edit") ||
      pathname.startsWith("/construction/preview") ||
      (pathname.startsWith("/construction/") && !pathname.startsWith("/construction/reports")) ||
      pathname === "/finance/my-reports" ||
      pathname.startsWith("/finance/my-reports/") ||
      pathname === "/finance/create";

    if (isMyReportsItem) {
      return isMyReportsPath;
    }

    if (item.href === "/finance") {
      return (
        pathname === "/finance" ||
        (pathname.startsWith("/finance/") &&
          !pathname.startsWith("/finance/requests") &&
          !pathname.startsWith("/finance/banks") &&
          !pathname.startsWith("/finance/petty-cash") &&
          !pathname.startsWith("/finance/create") &&
          !pathname.startsWith("/finance/my-reports"))
      );
    }

    return pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
  }

  it("1. Maps direct /marketing/my-reports href for Marketing Team Lead to prevent server redirect flash", () => {
    const marketingTL = {
      role: "team_lead",
      departments: [{ name: "Marketing", subTeams: ["Digital"] }],
      teamName: "Digital Marketing"
    };

    const items = computeSidebarItems(marketingTL);
    const myReportsItem = items.find((i) => i.label === "My Reports");

    expect(myReportsItem).toBeDefined();
    expect(myReportsItem?.href).toBe("/marketing/my-reports");
  });

  it("2. Maps direct /construction/my-reports href for Construction Team Lead", () => {
    const constructionTL = {
      role: "team_lead",
      departments: [{ name: "Construction" }],
      teamName: "Civil Engineer"
    };

    const items = computeSidebarItems(constructionTL);
    const myReportsItem = items.find((i) => i.label === "My Reports");

    expect(myReportsItem).toBeDefined();
    expect(myReportsItem?.href).toBe("/construction/my-reports");
  });

  it("3. Maps direct /finance/my-reports href for Finance Team Lead", () => {
    const financeTL = {
      role: "team_lead",
      departments: [{ name: "Finance" }],
      teamName: "Accounts"
    };

    const items = computeSidebarItems(financeTL);
    const myReportsItem = items.find((i) => i.label === "My Reports");

    expect(myReportsItem).toBeDefined();
    expect(myReportsItem?.href).toBe("/finance/my-reports");
  });

  it("4. Keeps /daily-report/my-reports for Software / General Team Lead", () => {
    const softwareTL = {
      role: "team_lead",
      departments: [{ name: "Software" }],
      teamName: "Core Dev"
    };

    const items = computeSidebarItems(softwareTL);
    const myReportsItem = items.find((i) => i.label === "My Reports");

    expect(myReportsItem).toBeDefined();
    expect(myReportsItem?.href).toBe("/daily-report/my-reports");
  });

  it("5. Keeps HOD, Report Manager, Admin, and CEO navigation intact", () => {
    const hod = { role: "hod", departments: [{ name: "Marketing" }, { name: "Software" }] };
    const hodItems = computeSidebarItems(hod);
    expect(hodItems.find((i) => i.label === "My Reports")?.href).toBe("/daily-report/my-reports");

    const rm = { role: "report_manager", departments: [{ name: "Marketing" }] };
    const rmItems = computeSidebarItems(rm);
    expect(rmItems.find((i) => i.label === "My Reports")?.href).toBe("/daily-report/my-reports");
    expect(rmItems.find((i) => i.label === "TL Reports")?.href).toBe("/reports");
  });

  it("6. Correctly evaluates active highlight for Marketing My Reports and its subroutes", () => {
    const myReportsItem = { href: "/marketing/my-reports", label: "My Reports" };
    const dashboardItem = { href: "/team-lead/dashboard", label: "Dashboard" };
    const usersItem = { href: "/team-lead/users", label: "Employees" };

    // On /marketing/my-reports
    expect(isItemActive(myReportsItem, "/marketing/my-reports")).toBe(true);
    expect(isItemActive(dashboardItem, "/marketing/my-reports")).toBe(false);
    expect(isItemActive(usersItem, "/marketing/my-reports")).toBe(false);

    // On /marketing/create
    expect(isItemActive(myReportsItem, "/marketing/create")).toBe(true);
    expect(isItemActive(dashboardItem, "/marketing/create")).toBe(false);

    // On /marketing/rep-123 (edit page)
    expect(isItemActive(myReportsItem, "/marketing/rep-123")).toBe(true);
    expect(isItemActive(dashboardItem, "/marketing/rep-123")).toBe(false);

    // On /marketing/my-reports/page-2
    expect(isItemActive(myReportsItem, "/marketing/my-reports/page-2")).toBe(true);
  });

  it("7. Correctly evaluates active highlight for Daily Report, TM, Construction, and Finance My Reports", () => {
    const dailyMyReportsItem = { href: "/daily-report/my-reports", label: "My Reports" };
    expect(isItemActive(dailyMyReportsItem, "/daily-report/my-reports")).toBe(true);
    expect(isItemActive(dailyMyReportsItem, "/daily-report/create")).toBe(true);
    expect(isItemActive(dailyMyReportsItem, "/daily-report/edit-hod")).toBe(true);

    const tmMyReportsItem = { href: "/tm/my-reports", label: "My Reports" };
    expect(isItemActive(tmMyReportsItem, "/tm/my-reports")).toBe(true);

    const constructionMyReportsItem = { href: "/construction/my-reports", label: "My Reports" };
    expect(isItemActive(constructionMyReportsItem, "/construction/my-reports")).toBe(true);
    expect(isItemActive(constructionMyReportsItem, "/construction/create")).toBe(true);

    const financeMyReportsItem = { href: "/finance/my-reports", label: "My Reports" };
    expect(isItemActive(financeMyReportsItem, "/finance/my-reports")).toBe(true);
    expect(isItemActive(financeMyReportsItem, "/finance/create")).toBe(true);
  });

  it("8. Does NOT highlight My Reports on unrelated pages", () => {
    const myReportsItem = { href: "/marketing/my-reports", label: "My Reports" };

    expect(isItemActive(myReportsItem, "/team-lead/dashboard")).toBe(false);
    expect(isItemActive(myReportsItem, "/team-lead/users")).toBe(false);
    expect(isItemActive(myReportsItem, "/team-lead/reports")).toBe(false);
    expect(isItemActive(myReportsItem, "/team-lead/consolidated-reports")).toBe(false);
    expect(isItemActive(myReportsItem, "/finance")).toBe(false);
    expect(isItemActive(myReportsItem, "/finance/requests")).toBe(false);
    expect(isItemActive(myReportsItem, "/finance/banks")).toBe(false);
    expect(isItemActive(myReportsItem, "/finance/petty-cash")).toBe(false);
  });
});
