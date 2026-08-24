import { describe, it, expect } from 'vitest';
import {
  canManageUsers,
  canEditLockedReport,
  canAccessAdminArea,
  canViewFinanceReport,
  canForwardFinanceReport,
  canApproveFinanceReport,
  canCreateFinanceReport,
  canEditFinanceReport
} from './permissions';
import { SessionUser } from './types';
import { getFinanceTeamInternalNames } from './team-types';
import { FINANCE_TEAM_INTERNAL_NAME, SIDEBAR_NAV_ITEMS_BY_ROLE } from './constants';

describe('permissions', () => {
  const admin: SessionUser = { id: "1", email: "admin@test.com", role: "admin", name: "Admin", teamName: "", workspaceId: "ws1" };
  const ceo: SessionUser = { id: "2", email: "ceo@test.com", role: "ceo", name: "CEO", teamName: "", workspaceId: "ws1" };
  const hodFinance: SessionUser = { id: "3", email: "hod@test.com", role: "hod", name: "HOD", teamName: FINANCE_TEAM_INTERNAL_NAME, teamNames: [FINANCE_TEAM_INTERNAL_NAME], workspaceId: "ws1" };
  const financeMember: SessionUser = { id: "4", email: "finance@test.com", role: "team_member", name: "Finance", teamName: FINANCE_TEAM_INTERNAL_NAME, workspaceId: "ws1" };
  const regularUser: SessionUser = { id: "5", email: "tm@test.com", role: "team_member", name: "TM", teamName: "Team A", workspaceId: "ws1" };
  const reportManager: SessionUser = { id: '6', email: 'rm@example.com', role: 'report_manager', name: 'Report Manager', teamName: 'Management', departments: [{ name: 'Finance' as any, subTeams: [] }], workspaceId: "ws1" };

  describe('canManageUsers', () => {
    it('allows admin and ceo', () => {
      expect(canManageUsers(admin)).toBe(true);
      expect(canManageUsers(ceo)).toBe(true);
    });
    it('denies regular user', () => {
      expect(canManageUsers(regularUser)).toBe(false);
    });
  });

  describe('canAccessAdminArea', () => {
    it('allows admin and ceo', () => {
      expect(canAccessAdminArea(admin)).toBe(true);
      expect(canAccessAdminArea(ceo)).toBe(true);
    });
    it('denies hod', () => {
      expect(canAccessAdminArea(hodFinance)).toBe(false);
    });
  });

  describe('finance permissions', () => {
    it('allows ceo, finance team, and finance hod to view finance reports', () => {
      expect(canViewFinanceReport(ceo)).toBe(true);
      expect(canViewFinanceReport(financeMember)).toBe(true);
      expect(canViewFinanceReport(hodFinance)).toBe(true);
    });

    it('denies regular user to view finance reports', () => {
      expect(canViewFinanceReport(regularUser)).toBe(false);
    });

    it('denies report_manager from viewing, creating, or editing finance reports', () => {
      expect(canViewFinanceReport(reportManager)).toBe(false);
      expect(canCreateFinanceReport(reportManager)).toBe(false);
      expect(canEditFinanceReport(reportManager)).toBe(false);
    });

    it('denies admin from viewing, creating, or editing finance reports', () => {
      expect(canViewFinanceReport(admin)).toBe(false);
      expect(canCreateFinanceReport(admin)).toBe(false);
      expect(canEditFinanceReport(admin)).toBe(false);
    });

    it('allows finance hod to forward finance report', () => {
      expect(canForwardFinanceReport(hodFinance)).toBe(true);
    });

    it('denies finance member from forwarding finance report', () => {
      expect(canForwardFinanceReport(financeMember)).toBe(false);
    });

    it('allows ceo to approve finance report', () => {
      expect(canApproveFinanceReport(ceo)).toBe(true);
    });
  });

  describe('sidebar nav items', () => {
    it('includes Companies option for admin role but not for ceo role', () => {
      const adminItems = SIDEBAR_NAV_ITEMS_BY_ROLE.admin;
      const ceoItems = SIDEBAR_NAV_ITEMS_BY_ROLE.ceo;

      expect(adminItems.some((item) => item.href === '/admin/companies' && item.label === 'Companies')).toBe(true);
      expect(ceoItems.some((item) => item.href === '/admin/companies' && item.label === 'Companies')).toBe(false);
    });
  });
});
