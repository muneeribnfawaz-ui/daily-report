import { describe, it, expect } from 'vitest';
import {
  canManageUsers,
  canEditLockedReport,
  canAccessAdminArea,
  canViewFinanceReport,
  canForwardFinanceReport,
  canApproveFinanceReport,
} from './permissions';
import { SessionUser } from './types';
import { FINANCE_TEAM_INTERNAL_NAME } from './team-types';

describe('permissions', () => {
  const admin: SessionUser = { id: '1', role: 'admin', name: 'Admin', teamName: 'Admin', employeeId: '1' };
  const ceo: SessionUser = { id: '2', role: 'ceo', name: 'CEO', teamName: 'Exec', employeeId: '2' };
  const hodFinance: SessionUser = { id: '3', role: 'hod', name: 'HOD', teamName: FINANCE_TEAM_INTERNAL_NAME, teamNames: [FINANCE_TEAM_INTERNAL_NAME], employeeId: '3' };
  const financeMember: SessionUser = { id: '4', role: 'finance_team', name: 'Finance', teamName: FINANCE_TEAM_INTERNAL_NAME, employeeId: '4' };
  const regularUser: SessionUser = { id: '5', role: 'user', name: 'User', teamName: 'Tech', employeeId: '5' };

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
