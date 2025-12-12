
import { Employee, Permission, ViewState, GlobalSettings } from '../types';

// Define default permissions per role
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  'Manager': [
    'VIEW_REPORTS',
    'MANAGE_EMPLOYEES',
    'DELETE_EMPLOYEES', // Specific
    'MANAGE_DOCUMENTS',
    'DELETE_DOCUMENTS', // Specific
    'VIEW_ALL_DOCUMENTS',
    'CREATE_NEWS',
    'DELETE_NEWS', // Specific
    'MANAGE_ONBOARDING',
    'VIEW_SYSTEM_STATUS',
    'MANAGE_SETTINGS',
    'MANAGE_EVALUATIONS',
    'DELETE_EVALUATIONS', // Specific
    'MANAGE_DEBTORS',
    'MANAGE_RECRUITMENT',
    'VIEW_CALENDAR',
    'MANAGE_CASES',
    'MANAGE_KNOWLEDGE',
    'MANAGE_OPERATIONS',
    'MANAGE_TICKETS',
    'MANAGE_RENTALS',
    'MANAGE_ACADEMY',
    'MANAGE_COMPENSATION',
    'DELETE_COMPENSATION' // Specific
  ],
  'Senior Medewerker': [
    'CREATE_NEWS',
    'MANAGE_ONBOARDING',
    'MANAGE_EVALUATIONS', 
    'VIEW_REPORTS', 
    'MANAGE_DEBTORS',
    'MANAGE_RECRUITMENT',
    'VIEW_CALENDAR',
    'MANAGE_OPERATIONS',
    'MANAGE_RENTALS',
    'MANAGE_ACADEMY',
    'MANAGE_COMPENSATION'
    // Seniors do NOT get DELETE permissions by default anymore
  ],
  'Medewerker': [
    'VIEW_CALENDAR',
    'MANAGE_RENTALS'
  ]
};

// Helper to check if a user has a specific permission
// LOGIC: Role Permissions OR Custom Permissions (Additive)
export const hasPermission = (user: Employee | null, permission: Permission): boolean => {
  if (!user) return false;

  // 1. Check Role Defaults
  const roleDefaults = ROLE_PERMISSIONS[user.role] || [];
  if (roleDefaults.includes(permission)) {
    return true; // Always allowed if in role
  }

  // 2. Check Custom Additions
  if (user.customPermissions && user.customPermissions.includes(permission)) {
    return true; // Allowed if explicitly added
  }

  return false;
};

// Helper to get the list of permissions that are strictly custom (not in role)
export const getCustomPermissionsOnly = (user: Employee): Permission[] => {
  const roleDefaults = ROLE_PERMISSIONS[user.role] || [];
  const custom = user.customPermissions || [];
  
  // Return only permissions that are in custom BUT NOT in role
  // (Cleaning up redundancy)
  return custom.filter(p => !roleDefaults.includes(p));
};

// NEW: Helper to check if a module is enabled globally/specifically
export const isModuleEnabled = (view: ViewState, user: Employee | null, settings: GlobalSettings | null): boolean => {
    if (!user) return false;
    
    // Core modules always available
    if (view === ViewState.HOME || view === ViewState.SETTINGS || view === ViewState.SYSTEM_STATUS) return true;

    // If no settings loaded yet, default to ENABLED (fail-open for UX, or closed for security - chosen Open for now)
    if (!settings) return true;

    const config = settings.modules[view];
    
    // If not configured, assume enabled
    if (!config) return true;

    // 1. Global Switch
    if (!config.enabled) return false;

    // 2. Check exclusions
    if (config.hiddenForRoles && config.hiddenForRoles.includes(user.role)) return false;
    if (config.hiddenForUsers && config.hiddenForUsers.includes(user.id)) return false;

    return true;
};
