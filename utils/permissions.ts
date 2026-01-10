
import { Employee, Permission, ViewState, GlobalSettings } from '../types';

// Define default permissions per role
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
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
    'MANAGE_KNOWLEDGE',
    'MANAGE_OPERATIONS',
    'MANAGE_ACADEMY',
    'MANAGE_COMPENSATION',
    'DELETE_COMPENSATION', // Specific
    'MANAGE_TICKETS',
    'MANAGE_CHECKLISTS',
    'MANAGE_TASKS',
    'MANAGE_COMPLAINTS', // Added
    'MANAGE_STOCK', // Added
    // VIEW PERMISSIONS
    'VIEW_ACADEMY',
    'VIEW_KNOWLEDGE_BASE',
    'VIEW_DIRECTORY',
    'VIEW_CHECKLISTS',
    'VIEW_ONBOARDING',
    'VIEW_TASKS',
    'VIEW_NEWS',
    'VIEW_COMPENSATION'
  ],
  'Senior Medewerker': [
    'CREATE_NEWS',
    'MANAGE_ONBOARDING',
    'MANAGE_EVALUATIONS', 
    'VIEW_REPORTS', 
    'MANAGE_DEBTORS',
    'MANAGE_RECRUITMENT',
    'MANAGE_OPERATIONS',
    'MANAGE_ACADEMY',
    'MANAGE_COMPENSATION',
    'MANAGE_CHECKLISTS',
    'MANAGE_COMPLAINTS', // Added
    'MANAGE_STOCK', // Added
    // VIEW PERMISSIONS
    'VIEW_ACADEMY',
    'VIEW_KNOWLEDGE_BASE',
    'VIEW_DIRECTORY',
    'VIEW_CHECKLISTS',
    'VIEW_ONBOARDING',
    'VIEW_TASKS',
    'VIEW_NEWS',
    'VIEW_COMPENSATION'
  ],
  'Medewerker': [
     // EMPTY DEFAULTS to ensure settings dictate visibility. 
     // Add 'VIEW_DIRECTORY' etc here ONLY if you want them on by default.
     // Empty means user sees NOTHING unless added in settings.
  ]
};

// Export original constant for backward compatibility
export const ROLE_PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

// Helper to check if a user has a specific permission
// LOGIC: Custom Permissions (Override) OR Role Permissions (Fallback)
export const hasPermission = (user: Employee | null, permission: Permission, customRoles?: Record<string, Permission[]>): boolean => {
  if (!user) return false;

  // 1. Check Custom Permissions (OVERRIDE MODEL)
  // If customPermissions is an array (even empty), it overrides the role completely.
  if (Array.isArray(user.customPermissions)) {
    return user.customPermissions.includes(permission);
  }

  // 2. Fallback to Role Defaults
  const roles = customRoles || ROLE_PERMISSIONS;
  const roleDefaults = roles[user.role] || [];
  
  return roleDefaults.includes(permission);
};

// Helper to get the list of permissions that are strictly custom (not in role)
export const getCustomPermissionsOnly = (user: Employee): Permission[] => {
  const roleDefaults = ROLE_PERMISSIONS[user.role] || [];
  const custom = user.customPermissions || [];
  
  // Return only permissions that are in custom BUT NOT in role
  return custom.filter(p => !roleDefaults.includes(p));
};

// NEW: Helper to check if a module is enabled globally/specifically
export const isModuleEnabled = (view: ViewState, user: Employee | null, settings: GlobalSettings | null): boolean => {
    if (!user) return false;
    
    // Core modules always available
    if (view === ViewState.HOME || view === ViewState.SETTINGS || view === ViewState.SYSTEM_STATUS) return true;

    // If no settings loaded yet, default to ENABLED (fail-open for UX)
    if (!settings) return true;

    const config = settings.modules[view];
    
    // If not configured, assume enabled
    if (!config) return true;

    // 1. Global Switch
    if (!config.enabled) return false;

    // 2. Access Mode Logic
    if (config.accessMode === 'restricted') {
        // WHITELIST LOGIC: Only allow if in allowedUsers list
        return config.allowedUsers ? config.allowedUsers.includes(user.id) : false;
    } else {
        // BLACKLIST LOGIC (Default/Open)
        // Check exclusions
        if (config.hiddenForRoles && config.hiddenForRoles.includes(user.role)) return false;
        if (config.hiddenForUsers && config.hiddenForUsers.includes(user.id)) return false;
    }

    return true;
};
