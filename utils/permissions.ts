

import { Employee, Permission } from '../types';

// Define default permissions per role
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  'Manager': [
    'VIEW_REPORTS',
    'MANAGE_EMPLOYEES',
    'MANAGE_DOCUMENTS',
    'VIEW_ALL_DOCUMENTS',
    'CREATE_NEWS',
    'MANAGE_ONBOARDING',
    'MANAGE_SURVEYS',
    'VIEW_SYSTEM_STATUS',
    'MANAGE_SETTINGS',
    'MANAGE_EVALUATIONS',
    'MANAGE_DEBTORS' // Added: Debt Control
  ],
  'Senior Medewerker': [
    'CREATE_NEWS',
    'MANAGE_ONBOARDING',
    'MANAGE_SURVEYS',
    'MANAGE_EVALUATIONS', // Can do evaluations but maybe not settings
    'VIEW_REPORTS', // Can see reports
    'MANAGE_DEBTORS' // Seniors can also manage debts
  ],
  'Medewerker': [
    // Basic employees mostly just consume, but we might add specific ones later
  ]
};

// Helper to check if a user has a specific permission
export const hasPermission = (user: Employee | null, permission: Permission): boolean => {
  if (!user) return false;

  // 1. Check Custom Overrides
  if (user.customPermissions && user.customPermissions.length > 0) {
    return user.customPermissions.includes(permission);
  }

  // 2. Fallback to Role Defaults
  const roleDefaults = ROLE_PERMISSIONS[user.role] || [];
  return roleDefaults.includes(permission);
};

// Helper to get the effective permission list for display in Settings
export const getEffectivePermissions = (user: Employee): Permission[] => {
  if (user.customPermissions) {
    return user.customPermissions;
  }
  return ROLE_PERMISSIONS[user.role] || [];
};