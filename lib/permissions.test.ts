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
import { FINANCE_TEAM_INTERNAL_NAME } from './constants';

describe('permissions', () => {
  const admin: SessionUser = { id: '1', email: 'admin@example.com', role: 'admin', name: 'Admin', teamName: 'Admin' };
  const ceo: SessionUser = { id: '2', email: 'ceo@example.com', role: 'ceo', name: 'CEO', teamName: 'Exec' };
  const hodFinance: SessionUser = { id: '3', email: 'hod@example.com', role: 'hod', name: 'HOD', teamName: FINANCE_TEAM_INTERNAL_NAME, teamNames: [FINANCE_TEAM_INTERNAL_NAME] };
  const financeMember: SessionUser = { id: '4', email: 'finance@example.com', role: 'finance_team', name: 'Finance', teamName: FINANCE_TEAM_INTERNAL_NAME };
  const regularUser: SessionUser = { id: '5', email: 'user@example.com', role: 'team_member', name: 'User', teamName: 'Tech' };
  const reportManager: SessionUser = { id: '6', email: 'rm@example.com', role: 'report_manager', name: 'Report Manager', teamName: 'Management', departments: [{ name: 'Finance' }] };

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

    it('allows report_manager to view finance reports but not create or edit them', () => {
      expect(canViewFinanceReport(reportManager)).toBe(true);
      
      // Even if they are in the Finance department, report managers should be blocked from creating or editing
      expect(canCreateFinanceReport(reportManager)).toBe(false);
      expect(canEditFinanceReport(reportManager)).toBe(false);
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
});
