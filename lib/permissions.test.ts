import { describe, it, expect } from 'vitest';
import {
  canManageUsers,
  canEditLockedReport,
  canAccessAdminArea,
  canViewFinanceReport,
  canForwardFinanceReport,
  canApproveFinanceReport,
  canCreateFinanceReport,
  canEditFinanceReport,
  canCreateMoneyRequest,
  canUpdateEmail
} from './permissions';
import { SessionUser } from './types';
import { SIDEBAR_NAV_ITEMS_BY_ROLE } from './constants';

describe('permissions', () => {
  const admin: SessionUser = { id: "1", email: "admin@test.com", role: "admin", name: "Admin", teamName: "", workspaceId: "ws1" };
  const ceo: SessionUser = { id: "2", email: "ceo@test.com", role: "ceo", name: "CEO", teamName: "", workspaceId: "ws1" };
  const hodFinance: SessionUser = { id: "3", email: "hod@test.com", role: "hod", name: "HOD", teamName: "", departments: [{ name: "Finance" as any, subTeams: [] }], workspaceId: "ws1" };
  const financeLead: SessionUser = { id: "4a", email: "tl-finance@test.com", role: "team_lead", name: "Finance Lead", teamName: "Finance API", departments: [{ name: "Finance" as any, subTeams: [] }], workspaceId: "ws1" };
  const financeMember: SessionUser = { id: "4", email: "finance@test.com", role: "team_member", name: "Finance", teamName: "Finance Core", departments: [{ name: "Finance" as any, subTeams: [] }], workspaceId: "ws1" };
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

    it('denies ceo from creating and editing finance reports (view only)', () => {
      expect(canCreateFinanceReport(ceo)).toBe(false);
      expect(canEditFinanceReport(ceo)).toBe(false);
    });

    it('denies regular user to view finance reports', () => {
      expect(canViewFinanceReport(regularUser)).toBe(false);
    });

    it('allows report_manager inside Finance department to view, create, and edit finance reports', () => {
      expect(canViewFinanceReport(reportManager)).toBe(true);
      expect(canCreateFinanceReport(reportManager)).toBe(true);
      expect(canEditFinanceReport(reportManager)).toBe(true);
    });

    it('allows admin to view, create, and edit finance reports', () => {
      expect(canViewFinanceReport(admin)).toBe(true);
      expect(canCreateFinanceReport(admin)).toBe(true);
      expect(canEditFinanceReport(admin)).toBe(true);
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

    it('allows only finance team lead and finance team member to create money requests', () => {
      expect(canCreateMoneyRequest(financeLead)).toBe(true);
      expect(canCreateMoneyRequest(financeMember)).toBe(true);
      expect(canCreateMoneyRequest(admin)).toBe(false);
      expect(canCreateMoneyRequest(ceo)).toBe(false);
      expect(canCreateMoneyRequest(hodFinance)).toBe(false);
      expect(canCreateMoneyRequest(regularUser)).toBe(false);
      expect(canCreateMoneyRequest(reportManager)).toBe(false);
    });
  });

  describe('sidebar nav items', () => {
    it('includes Companies option for admin role but not for ceo role', () => {
      const adminItems = SIDEBAR_NAV_ITEMS_BY_ROLE.admin;
      const ceoItems = SIDEBAR_NAV_ITEMS_BY_ROLE.ceo;

      expect(adminItems.some((item) => item.href === '/admin/companies' && item.label === 'Companies')).toBe(true);
      expect(ceoItems.some((item: any) => item.label === 'Companies')).toBe(false);
    });
  });

  describe('canUpdateEmail', () => {
    it('allows admin to update any email including self', () => {
      expect(canUpdateEmail('admin', 'admin', true)).toBe(true);
      expect(canUpdateEmail('admin', 'ceo', false)).toBe(true);
      expect(canUpdateEmail('admin', 'team_member', false)).toBe(true);
    });

    it('denies non-admins from self-updating email', () => {
      expect(canUpdateEmail('ceo', 'ceo', true)).toBe(false);
      expect(canUpdateEmail('hod', 'hod', true)).toBe(false);
      expect(canUpdateEmail('team_lead', 'team_lead', true)).toBe(false);
      expect(canUpdateEmail('team_member', 'team_member', true)).toBe(false);
    });

    it('allows heads to update junior emails', () => {
      expect(canUpdateEmail('ceo', 'hod', false)).toBe(true);
      expect(canUpdateEmail('ceo', 'team_lead', false)).toBe(true);
      expect(canUpdateEmail('ceo', 'team_member', false)).toBe(true);

      expect(canUpdateEmail('hod', 'team_lead', false)).toBe(true);
      expect(canUpdateEmail('hod', 'team_member', false)).toBe(true);

      expect(canUpdateEmail('team_lead', 'team_member', false)).toBe(true);
    });

    it('denies updating senior or peer emails', () => {
      expect(canUpdateEmail('ceo', 'ceo', false)).toBe(false);
      expect(canUpdateEmail('ceo', 'admin', false)).toBe(false);

      expect(canUpdateEmail('hod', 'ceo', false)).toBe(false);
      expect(canUpdateEmail('hod', 'hod', false)).toBe(false);
      expect(canUpdateEmail('hod', 'admin', false)).toBe(false);

      expect(canUpdateEmail('team_lead', 'team_lead', false)).toBe(false);
      expect(canUpdateEmail('team_lead', 'hod', false)).toBe(false);
      expect(canUpdateEmail('team_lead', 'ceo', false)).toBe(false);
      expect(canUpdateEmail('team_lead', 'admin', false)).toBe(false);
    });
  });
});
