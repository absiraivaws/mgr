/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseCredentials, getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { recordAuditLog } from './audit';

export function getSupabaseAuth(): SupabaseClient {
  const supa = getSupabase();
  if (!supa) {
    const { url, anonKey } = getSupabaseCredentials();
    return createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder');
  }
  return supa;
}

export type UserRole = string;

export interface RolePermissionSet {
  // Main Tab Access (Ticked active by Admin)
  accessDashboard?: boolean; // "Dashboard"
  accessRentals: boolean;    // "Rental Desk"
  accessHistory: boolean;    // "History"
  accessCustomers?: boolean; // "Customers"
  accessMessages?: boolean;  // "Messages"
  accessUsers: boolean;      // "Users & Role"
  accessSettings: boolean;   // "Rates & Inventory"
  accessIncome?: boolean;    // Legacy "Income & Expenses" fallback
  accessFinance?: boolean;   // "Finance"

  // Functional operational privileges
  canRent: boolean;
  canSettle: boolean;
  canExportReports: boolean;
  canEditPricing: boolean;
  canEditFleet: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;

  // Finance Privileges
  canAddFinanceTransaction?: boolean;
  canEditFinanceTransaction?: boolean;
  canDeleteFinanceTransaction?: boolean;
  canViewPL?: boolean;
  canViewStatement?: boolean;
  canExportFinanceReports?: boolean;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'teal' | 'indigo' | 'cyan';
  isSystem?: boolean;
  permissions: RolePermissionSet;
}

export interface UserAccount {
  id: string;
  auth_user_id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  status?: 'active' | 'suspended' | 'inactive';
  must_change_password?: boolean;
  createdAt: number;
  avatarColor?: string;
}

const STORAGE_USERS_KEY = 'v_rental_users';
const STORAGE_CURRENT_USER_KEY = 'v_rental_current_user';
const STORAGE_ROLES_KEY = 'v_rental_roles';

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full unrestricted access across all primary tabs, pricing rates, customer records, and user administration.',
    color: 'emerald',
    isSystem: true,
    permissions: {
      accessDashboard: true,
      accessRentals: true,
      accessHistory: true,
      accessCustomers: true,
      accessMessages: true,
      accessUsers: true,
      accessSettings: true,
      accessIncome: true,
      accessFinance: true,
      canRent: true,
      canSettle: true,
      canExportReports: true,
      canEditPricing: true,
      canEditFleet: true,
      canManageUsers: true,
      canManageRoles: true,
      canAddFinanceTransaction: true,
      canEditFinanceTransaction: true,
      canDeleteFinanceTransaction: true,
      canViewPL: true,
      canViewStatement: true,
      canExportFinanceReports: true,
    },
  },
  {
    id: 'manager',
    name: 'Store Manager',
    description: 'Manages fleet vehicle inventory, rates, customers, views historical settlement reports, and executes daily cash audits.',
    color: 'blue',
    isSystem: true,
    permissions: {
      accessDashboard: true,
      accessRentals: true,
      accessHistory: true,
      accessCustomers: true,
      accessMessages: true,
      accessUsers: false,
      accessSettings: true,
      accessIncome: true,
      accessFinance: true,
      canRent: true,
      canSettle: true,
      canExportReports: true,
      canEditPricing: true,
      canEditFleet: true,
      canManageUsers: false,
      canManageRoles: false,
      canAddFinanceTransaction: true,
      canEditFinanceTransaction: true,
      canDeleteFinanceTransaction: false,
      canViewPL: true,
      canViewStatement: true,
      canExportFinanceReports: true,
    },
  },
  {
    id: 'cashier',
    name: 'Cashier POS',
    description: 'Operates the live rental counter, registers customers, starts rental timers, checks in returned vehicles, and issues receipts.',
    color: 'purple',
    isSystem: true,
    permissions: {
      accessDashboard: false,
      accessRentals: true,
      accessHistory: true,
      accessCustomers: true,
      accessMessages: true,
      accessUsers: false,
      accessSettings: false,
      accessIncome: false,
      accessFinance: false,
      canRent: true,
      canSettle: true,
      canExportReports: false,
      canEditPricing: false,
      canEditFleet: false,
      canManageUsers: false,
      canManageRoles: false,
      canAddFinanceTransaction: false,
      canEditFinanceTransaction: false,
      canDeleteFinanceTransaction: false,
      canViewPL: false,
      canViewStatement: false,
      canExportFinanceReports: false,
    },
  },
  {
    id: 'owner',
    name: 'Fleet / Boat Owner',
    description: 'Manages owned vehicles & boats, captain/driver assignments, schedules, and quotes on ride requests.',
    color: 'cyan',
    isSystem: true,
    permissions: {
      accessDashboard: false,
      accessRentals: false,
      accessHistory: false,
      accessCustomers: false,
      accessMessages: false,
      accessUsers: false,
      accessSettings: false,
      accessIncome: false,
      canRent: false,
      canSettle: false,
      canExportReports: false,
      canEditPricing: false,
      canEditFleet: true,
      canManageUsers: false,
      canManageRoles: false,
    },
  },
  {
    id: 'passenger',
    name: 'Passenger',
    description: 'Searches routes, books whole vehicles and individual seats on bus/boat seat maps, requests custom trips.',
    color: 'emerald',
    isSystem: true,
    permissions: {
      accessDashboard: false,
      accessRentals: false,
      accessHistory: false,
      accessCustomers: false,
      accessMessages: false,
      accessUsers: false,
      accessSettings: false,
      accessIncome: false,
      canRent: false,
      canSettle: false,
      canExportReports: false,
      canEditPricing: false,
      canEditFleet: false,
      canManageUsers: false,
      canManageRoles: false,
    },
  },
];

export function getStoredRoles(): RoleDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_ROLES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_ROLES_KEY, JSON.stringify(DEFAULT_ROLES));
      return DEFAULT_ROLES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return DEFAULT_ROLES;
    }
    // Ensure all standard system roles exist and have proper tab access permissions
    const systemIds = DEFAULT_ROLES.map(r => r.id);
    const existingIds = parsed.map((r: any) => r.id);
    const missingSystemRoles = DEFAULT_ROLES.filter(r => !existingIds.includes(r.id));
    
    // Normalize permissions to make sure tab access flags are present
    const normalized: RoleDefinition[] = [...parsed, ...missingSystemRoles].map((role) => {
      const defaultMatch = DEFAULT_ROLES.find(d => d.id === role.id);
      return {
        ...role,
        permissions: {
          accessDashboard: role.permissions?.accessDashboard ?? (defaultMatch?.permissions?.accessDashboard ?? true),
          accessRentals: role.permissions?.accessRentals ?? (defaultMatch ? defaultMatch.permissions.accessRentals : true),
          accessHistory: role.permissions?.accessHistory ?? (defaultMatch ? defaultMatch.permissions.accessHistory : true),
          accessCustomers: role.permissions?.accessCustomers ?? (defaultMatch?.permissions?.accessCustomers ?? true),
          accessMessages: role.permissions?.accessMessages ?? (defaultMatch?.permissions?.accessMessages ?? true),
          accessUsers: role.permissions?.accessUsers ?? (defaultMatch ? defaultMatch.permissions.accessUsers : false),
          accessSettings: role.permissions?.accessSettings ?? (defaultMatch ? defaultMatch.permissions.accessSettings : false),
          accessIncome: role.permissions?.accessIncome ?? (defaultMatch?.permissions?.accessIncome ?? false),
          canRent: role.permissions?.canRent ?? true,
          canSettle: role.permissions?.canSettle ?? true,
          canExportReports: role.permissions?.canExportReports ?? false,
          canEditPricing: role.permissions?.canEditPricing ?? false,
          canEditFleet: role.permissions?.canEditFleet ?? false,
          canManageUsers: role.permissions?.canManageUsers ?? false,
          canManageRoles: role.permissions?.canManageRoles ?? false,
        },
      };
    });

    return normalized;
  } catch (err) {
    return DEFAULT_ROLES;
  }
}

export function saveStoredRoles(roles: RoleDefinition[]): void {
  try {
    localStorage.setItem(STORAGE_ROLES_KEY, JSON.stringify(roles));
  } catch (err) {
    console.error('Failed to save roles to localStorage', err);
  }
}

export function updateRolePermissions(
  roleId: string, 
  newPermissions: Partial<RolePermissionSet>
): { success: boolean; error?: string } {
  const roles = getStoredRoles();
  const idx = roles.findIndex(r => r.id === roleId);
  if (idx === -1) {
    return { success: false, error: 'Role not found.' };
  }

  // Admin role should always retain user management & role editing
  const updatedPerms: RolePermissionSet = {
    ...roles[idx].permissions,
    ...newPermissions,
  };

  if (roleId === 'admin') {
    updatedPerms.accessDashboard = true;
    updatedPerms.accessRentals = true;
    updatedPerms.accessHistory = true;
    updatedPerms.accessCustomers = true;
    updatedPerms.accessMessages = true;
    updatedPerms.accessUsers = true;
    updatedPerms.accessSettings = true;
    updatedPerms.accessIncome = true;
    updatedPerms.canManageUsers = true;
    updatedPerms.canManageRoles = true;
  }

  roles[idx] = {
    ...roles[idx],
    permissions: updatedPerms,
  };

  saveStoredRoles(roles);
  return { success: true };
}

export function getUserPermissions(user: UserAccount | null | undefined): RolePermissionSet {
  if (!user) {
    return {
      accessDashboard: false,
      accessRentals: false,
      accessHistory: false,
      accessCustomers: false,
      accessMessages: false,
      accessUsers: false,
      accessSettings: false,
      accessIncome: false,
      canRent: false,
      canSettle: false,
      canExportReports: false,
      canEditPricing: false,
      canEditFleet: false,
      canManageUsers: false,
      canManageRoles: false,
    };
  }

  if (user.email.toLowerCase() === DEFAULT_USER.email.toLowerCase() || user.role === 'admin') {
    return {
      accessDashboard: true,
      accessRentals: true,
      accessHistory: true,
      accessCustomers: true,
      accessMessages: true,
      accessUsers: true,
      accessSettings: true,
      accessIncome: true,
      accessFinance: true,
      canAddFinanceTransaction: true,
      canEditFinanceTransaction: true,
      canDeleteFinanceTransaction: true,
      canViewPL: true,
      canViewStatement: true,
      canExportFinanceReports: true,
      canRent: true,
      canSettle: true,
      canExportReports: true,
      canEditPricing: true,
      canEditFleet: true,
      canManageUsers: true,
      canManageRoles: true,
    };
  }

  const roles = getStoredRoles();
  const found = roles.find(r => r.id === user.role);
  if (found) {
    return found.permissions;
  }

  // Default fallback for any unspecified role
  return {
    accessDashboard: true,
    accessRentals: true,
    accessHistory: true,
    accessCustomers: true,
    accessMessages: true,
    accessUsers: false,
    accessSettings: false,
    accessIncome: false,
    accessFinance: false,
    canAddFinanceTransaction: false,
    canEditFinanceTransaction: false,
    canDeleteFinanceTransaction: false,
    canViewPL: false,
    canViewStatement: false,
    canExportFinanceReports: false,
    canRent: true,
    canSettle: true,
    canExportReports: false,
    canEditPricing: false,
    canEditFleet: false,
    canManageUsers: false,
    canManageRoles: false,
  };
}

export function hasPermission(
  user: UserAccount | null | undefined,
  permission: keyof RolePermissionSet
): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.email.toLowerCase() === DEFAULT_USER.email.toLowerCase()) {
    return true;
  }
  const perms = getUserPermissions(user);
  return Boolean(perms[permission]);
}

export function createCustomRole(params: {
  name: string;
  description?: string;
  color?: RoleDefinition['color'];
  permissions?: Partial<RolePermissionSet>;
}): { success: boolean; role?: RoleDefinition; error?: string } {
  const roles = getStoredRoles();
  const trimmedName = params.name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Role name cannot be empty.' };
  }

  const generatedId = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  if (roles.some(r => r.id === generatedId || r.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { success: false, error: `A role with the name "${trimmedName}" already exists.` };
  }

  const newRole: RoleDefinition = {
    id: generatedId,
    name: trimmedName,
    description: params.description?.trim() || `Custom role for ${trimmedName}`,
    color: params.color || 'teal',
    isSystem: false,
    permissions: {
      accessDashboard: params.permissions?.accessDashboard ?? true,
      accessRentals: params.permissions?.accessRentals ?? true,
      accessHistory: params.permissions?.accessHistory ?? true,
      accessCustomers: params.permissions?.accessCustomers ?? true,
      accessMessages: params.permissions?.accessMessages ?? true,
      accessUsers: params.permissions?.accessUsers ?? false,
      accessSettings: params.permissions?.accessSettings ?? false,
      accessIncome: params.permissions?.accessIncome ?? false,
      canRent: params.permissions?.canRent ?? true,
      canSettle: params.permissions?.canSettle ?? true,
      canExportReports: params.permissions?.canExportReports ?? false,
      canEditPricing: params.permissions?.canEditPricing ?? false,
      canEditFleet: params.permissions?.canEditFleet ?? false,
      canManageUsers: params.permissions?.canManageUsers ?? false,
      canManageRoles: params.permissions?.canManageRoles ?? false,
    },
  };

  const updated = [...roles, newRole];
  saveStoredRoles(updated);
  return { success: true, role: newRole };
}

export function deleteCustomRole(roleId: string): { success: boolean; error?: string } {
  const roles = getStoredRoles();
  const target = roles.find(r => r.id === roleId);
  if (!target) {
    return { success: false, error: 'Role not found.' };
  }
  if (target.isSystem) {
    return { success: false, error: 'System standard roles (Administrator, Store Manager, Cashier POS) cannot be deleted.' };
  }

  // Check if any users have this role, reassign them to cashier
  const users = getStoredUsers();
  let usersUpdated = false;
  const updatedUsers = users.map(u => {
    if (u.role === roleId) {
      usersUpdated = true;
      return { ...u, role: 'cashier' };
    }
    return u;
  });

  if (usersUpdated) {
    saveStoredUsers(updatedUsers);
  }

  const filteredRoles = roles.filter(r => r.id !== roleId);
  saveStoredRoles(filteredRoles);
  return { success: true };
}

export const DEFAULT_USER: UserAccount = {
  id: 'user-default-admin',
  name: 'Absir Aiva',
  email: 'absiraiva@gmail.com',
  role: 'admin',
  status: 'active',
  phone: '+94 77 123 4567',
  createdAt: 1700000000000,
  avatarColor: 'emerald',
};

export const MGR_INITIAL_ACCOUNTS: UserAccount[] = [
  {
    id: 'user-mgr-passenger',
    name: 'Sivaranjan K (Passenger)',
    email: 'passenger@mannargreenride.lk',
    role: 'passenger',
    status: 'active',
    phone: '+94 77 345 6789',
    createdAt: 1700000000000,
    avatarColor: 'emerald',
  },
  {
    id: 'user-mgr-owner',
    name: 'Mohamed Farook (Fleet Owner)',
    email: 'owner@mannargreenride.lk',
    role: 'owner',
    status: 'active',
    phone: '+94 77 123 4567',
    createdAt: 1700000000000,
    avatarColor: 'cyan',
  },
  {
    id: 'user-mgr-admin',
    name: 'MGR Transport Admin',
    email: 'admin@mannargreenride.lk',
    role: 'admin',
    status: 'active',
    phone: '+94 77 987 6543',
    createdAt: 1700000000000,
    avatarColor: 'purple',
  },
];

export type MGRUserPersona = 'passenger' | 'owner' | 'admin' | 'staff';

export function getMGRPersona(user: UserAccount | null | undefined): MGRUserPersona {
  if (!user) return 'passenger';
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();

  if (role === 'admin' || email === 'admin@mannargreenride.lk' || email === DEFAULT_USER.email.toLowerCase()) {
    return 'admin';
  }
  if (role === 'owner' || email.includes('owner')) {
    return 'owner';
  }
  if (role === 'passenger' || email.includes('passenger')) {
    return 'passenger';
  }
  return 'staff';
}

export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    let validUsers: UserAccount[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          validUsers = parsed
            .filter((u): u is UserAccount => Boolean(u && typeof u === 'object' && typeof u.email === 'string' && u.email.trim().length > 0))
            .map((u) => {
              // Strip plaintext passwords from local caches
              const { password: _, ...rest } = u;
              return { ...rest, status: rest.status || 'active' };
            });
        }
      } catch {}
    }

    let updatedUsers = [...validUsers];
    let needsUpdate = false;

    const allStandardUsers = [DEFAULT_USER, ...MGR_INITIAL_ACCOUNTS];
    for (const standardUser of allStandardUsers) {
      const idx = updatedUsers.findIndex(
        (u) => u.email && u.email.toLowerCase() === standardUser.email.toLowerCase()
      );
      if (idx === -1) {
        updatedUsers.push({ ...standardUser });
        needsUpdate = true;
      }
    }

    if (needsUpdate || !raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
    }
    return updatedUsers.length > 0 ? updatedUsers : allStandardUsers;
  } catch (err) {
    return [DEFAULT_USER, ...MGR_INITIAL_ACCOUNTS];
  }
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    // Strip passwords before persisting to localStorage
    const sanitized = users.map((u) => {
      const { password: _, ...clean } = u;
      return clean;
    });
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Failed to save users to localStorage', err);
  }
}

export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.email === 'string' && parsed.email.trim().length > 0) {
        // Validate against current users in storage
        const users = getStoredUsers();
        const found = users.find((u) => u.email.toLowerCase() === parsed.email.toLowerCase());
        if (found) {
          const { password: _, ...cleanFound } = found;
          return cleanFound;
        }
        return {
          id: parsed.id || DEFAULT_USER.id,
          name: parsed.name || DEFAULT_USER.name,
          email: parsed.email || DEFAULT_USER.email,
          role: parsed.role || DEFAULT_USER.role,
          phone: parsed.phone || DEFAULT_USER.phone,
          status: parsed.status || 'active',
          createdAt: parsed.createdAt || DEFAULT_USER.createdAt,
          avatarColor: parsed.avatarColor || DEFAULT_USER.avatarColor,
        };
      }
    }
  } catch (err) {
    // fallback
  }
  // No active authenticated session found
  return null;
}

export function setCurrentUserSession(user: UserAccount | null): void {
  try {
    if (user && user.email) {
      const { password: _, ...cleanUser } = user;
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(cleanUser));
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Failed to update current user in storage', err);
  }
}

/**
 * Authenticate user with Supabase Auth as the single source of truth.
 * Passwords are never stored in localStorage, user_accounts table, or frontend memory.
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserAccount; error?: string; requiresPasswordChange?: boolean }> {
  let normalizedEmail = (email || '').trim().toLowerCase();
  if (normalizedEmail === 'passenger') normalizedEmail = 'passenger@mannargreenride.lk';
  if (normalizedEmail === 'owner') normalizedEmail = 'owner@mannargreenride.lk';
  if (normalizedEmail === 'admin') normalizedEmail = 'admin@mannargreenride.lk';

  if (!isSupabaseConfigured()) {
    // Offline / Demo mode fallback when Supabase credentials are not configured
    const users = getStoredUsers();
    const found = users.find(
      (u) =>
        u &&
        ((u.email && u.email.toLowerCase() === normalizedEmail) ||
         (u.name && u.name.toLowerCase() === normalizedEmail))
    );
    if (found) {
      setCurrentUserSession(found);
      return { success: true, user: found };
    }
    return {
      success: false,
      error: 'Supabase authentication is not configured.',
    };
  }

  // 1. PRIMARY CHECK: Supabase Auth is the ONLY password authority
  const supaAuth = getSupabaseAuth();
  if (!supaAuth) {
    return {
      success: false,
      error: 'Supabase authentication client is not available.',
    };
  }

  try {
    const { data: authData, error: authError } = await supaAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    });

    if (authError || !authData?.user) {
      return {
        success: false,
        error: authError?.message || 'Invalid login credentials.',
      };
    }

    // 2. Load user profile and authorization details from user_accounts
    const supa = getSupabase();
    let profileRow: any = null;
    if (supa) {
      const { data: row } = await supa
        .from('user_accounts')
        .select('*')
        .or(`email.ilike.${normalizedEmail},auth_user_id.eq.${authData.user.id}`)
        .maybeSingle();
      profileRow = row;
    }

    const isRootEmail = normalizedEmail === DEFAULT_USER.email.toLowerCase() || normalizedEmail === 'admin@mannargreenride.lk';
    const resolvedRole = profileRow?.role || (isRootEmail ? 'admin' : (authData.user.user_metadata?.role || 'staff'));
    const resolvedName = profileRow?.name || authData.user.user_metadata?.name || (isRootEmail ? DEFAULT_USER.name : (authData.user.email?.split('@')[0] || 'Staff Member'));
    const resolvedPhone = profileRow?.phone || authData.user.user_metadata?.phone || undefined;
    const resolvedStatus = profileRow?.status || 'active';
    const mustChange = Boolean(profileRow?.must_change_password || authData.user.user_metadata?.must_change_password);

    const authenticatedUser: UserAccount = {
      id: profileRow?.id || `supa-${authData.user.id}`,
      auth_user_id: authData.user.id,
      name: resolvedName,
      email: authData.user.email || normalizedEmail,
      phone: resolvedPhone,
      role: resolvedRole,
      status: resolvedStatus,
      must_change_password: mustChange,
      createdAt: profileRow?.created_at ? Number(profileRow.created_at) : Date.now(),
      avatarColor: 'emerald',
    };

    // Save profile to user_accounts table if not yet present (NO password or password_hash!)
    if (supa && !profileRow) {
      try {
        await supa.from('user_accounts').upsert({
          id: authenticatedUser.id,
          auth_user_id: authData.user.id,
          name: authenticatedUser.name,
          email: authenticatedUser.email,
          phone: authenticatedUser.phone || null,
          role: authenticatedUser.role,
          status: authenticatedUser.status,
          must_change_password: mustChange,
          created_at: authenticatedUser.createdAt,
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('[Auth] Error syncing profile to user_accounts:', err);
      }
    } else if (supa && profileRow && !profileRow.auth_user_id) {
      try {
        await supa.from('user_accounts').update({ auth_user_id: authData.user.id }).eq('id', profileRow.id);
      } catch {}
    }

    // Cache profile in localStorage WITHOUT password
    const users = getStoredUsers().filter(u => u.email.toLowerCase() !== normalizedEmail);
    saveStoredUsers([authenticatedUser, ...users]);
    setCurrentUserSession(authenticatedUser);

    return {
      success: true,
      user: authenticatedUser,
      requiresPasswordChange: mustChange,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Authentication failed. Please verify credentials.',
    };
  }
}

/**
 * Change password for the current authenticated user using Supabase Auth.
 * Explicitly validates the result and does not report false successes.
 */
export async function changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const supaAuth = getSupabaseAuth();
  if (!supaAuth) {
    return { success: false, error: 'Supabase authentication is not configured.' };
  }

  try {
    const { data, error } = await supaAuth.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.user) {
      return { success: false, error: 'Failed to update password. Please check your session.' };
    }

    // Clear must_change_password flag if set
    const current = getCurrentUser();
    if (current) {
      current.must_change_password = false;
      setCurrentUserSession(current);

      if (isSupabaseConfigured()) {
        const supa = getSupabase();
        if (supa) {
          await supa
            .from('user_accounts')
            .update({ must_change_password: false })
            .ilike('email', current.email);
        }
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('v_rental_must_change_password');
    }

    recordAuditLog({
      user: current?.name || 'User',
      userEmail: current?.email,
      action: 'Password Reset Requested',
      reference: 'AUTH-PW-UPDATE',
      details: 'User password successfully changed in Supabase Auth',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred while updating password.' };
  }
}

/**
 * Logout current user: explicitly calls supabase.auth.signOut() and clears session
 */
export async function logoutUser(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supaAuth = getSupabaseAuth();
    if (supaAuth) {
      try {
        await supaAuth.auth.signOut();
      } catch (err) {
        console.warn('[Auth] SignOut error:', err);
      }
    }
  }
  setCurrentUserSession(null);
}

export async function registerNewUser(params: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  phone?: string;
}): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const normalizedEmail = (params.email || '').trim().toLowerCase();

  // Register in Supabase Auth
  const supaAuth = getSupabaseAuth();
  if (supaAuth) {
    try {
      const { data, error } = await supaAuth.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
          data: {
            name: params.name.trim(),
            role: params.role || 'cashier',
            phone: params.phone?.trim() || '',
            must_change_password: true,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const users = getStoredUsers();
        const existing = users.find(
          (u) => u && u.email && u.email.toLowerCase() === data.user.email?.toLowerCase()
        );
        if (existing) {
          setCurrentUserSession(existing);
          return { success: true, user: existing };
        }

        const newUser: UserAccount = {
          id: `supa-${data.user.id}`,
          auth_user_id: data.user.id,
          name: data.user.user_metadata?.name || params.name.trim(),
          email: data.user.email || normalizedEmail,
          role: params.role || 'cashier',
          phone: params.phone?.trim() || undefined,
          status: 'active',
          must_change_password: true,
          createdAt: Date.now(),
          avatarColor: 'emerald',
        };

        const usersUpdated = [newUser, ...users];
        saveStoredUsers(usersUpdated);
        setCurrentUserSession(newUser);

        // Also save profile to user_accounts table (NO password_hash!)
        if (isSupabaseConfigured()) {
          const supa = getSupabase();
          if (supa) {
            await supa.from('user_accounts').upsert({
              id: newUser.id,
              auth_user_id: data.user.id,
              name: newUser.name,
              email: newUser.email,
              phone: newUser.phone || null,
              role: newUser.role,
              status: 'active',
              must_change_password: true,
              created_at: newUser.createdAt,
            }, { onConflict: 'id' });
          }
        }
        return { success: true, user: newUser };
      }
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to register account with Supabase Auth.' };
    }
  }

  // Fallback to local profile (only if Supabase Auth is not configured)
  const users = getStoredUsers();
  if (users.some((u) => u && u.email && u.email.toLowerCase() === normalizedEmail)) {
    return { success: false, error: 'An account with this email already exists. Please sign in.' };
  }

  const colors = ['emerald', 'blue', 'violet', 'amber', 'rose', 'teal'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  const newUser: UserAccount = {
    id: `user-${Date.now()}`,
    name: params.name.trim(),
    email: normalizedEmail,
    role: params.role || 'cashier',
    phone: params.phone?.trim() || '',
    status: 'active',
    must_change_password: false,
    createdAt: Date.now(),
    avatarColor,
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);

  return { success: true, user: newUser };
}

/**
 * Admin action: Send Supabase password recovery email to a user
 */
export async function sendStaffPasswordResetEmail(
  email: string, 
  adminUser?: UserAccount
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { success: false, error: 'Please provide a valid registered email address.' };
  }

  const supaAuth = getSupabaseAuth();
  if (supaAuth) {
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/#type=recovery` : undefined;
      const { error } = await supaAuth.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Record in audit log
      recordAuditLog({
        user: adminUser?.name || 'Admin',
        userEmail: adminUser?.email,
        action: 'Password Reset Requested',
        reference: normalizedEmail,
        details: `Password recovery email dispatched via Supabase Auth for ${normalizedEmail}`,
      });

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to send password reset email. Please try again.' };
    }
  }

  return { success: false, error: 'Supabase authentication is not configured.' };
}

/**
 * Request password recovery email via Supabase Auth
 */
export async function resetUserPassword(email: string): Promise<{ success: boolean; error?: string }> {
  return sendStaffPasswordResetEmail(email);
}

/**
 * Admin action: Update a user's role and details (NO passwords stored in user_accounts)
 */
export function updateUserRoleAndDetails(
  userId: string, 
  newRole: UserRole,
  updatedData?: Partial<Pick<UserAccount, 'name' | 'phone' | 'status'>>
): { success: boolean; user?: UserAccount; error?: string } {
  const users = getStoredUsers();
  const idx = users.findIndex((u) => u.id === userId);

  if (idx === -1) {
    return { success: false, error: 'User not found in system records.' };
  }

  // Prevent demoting the primary admin if it's the only admin
  if (users[idx].email.toLowerCase() === DEFAULT_USER.email.toLowerCase() && newRole !== 'admin') {
    return { success: false, error: 'Cannot remove admin role from primary root administrator.' };
  }

  users[idx] = {
    ...users[idx],
    role: newRole,
    name: updatedData?.name?.trim() || users[idx].name,
    phone: updatedData?.phone !== undefined ? updatedData.phone.trim() : users[idx].phone,
    status: updatedData?.status || users[idx].status || 'active',
  };

  saveStoredUsers(users);

  // Sync to Supabase user_accounts table (profile fields only, NO passwords)
  if (isSupabaseConfigured()) {
    const supa = getSupabase();
    if (supa) {
      supa.from('user_accounts').upsert({
        id: users[idx].id,
        name: users[idx].name,
        email: users[idx].email,
        phone: users[idx].phone || null,
        role: users[idx].role,
        status: users[idx].status || 'active',
      }, { onConflict: 'id' }).then(() => {});
    }
  }

  // Update session if it's the current user
  const current = getCurrentUser();
  if (current && current.id === userId) {
    setCurrentUserSession(users[idx]);
  }

  return { success: true, user: users[idx] };
}

/**
 * Admin action: Delete user account
 */
export function deleteUserAccount(userId: string): { success: boolean; error?: string } {
  const users = getStoredUsers();
  const target = users.find((u) => u.id === userId);

  if (!target) {
    return { success: false, error: 'User not found.' };
  }

  if (target.email.toLowerCase() === DEFAULT_USER.email.toLowerCase()) {
    return { success: false, error: 'Primary root admin account cannot be deleted.' };
  }

  const filtered = users.filter((u) => u.id !== userId);
  saveStoredUsers(filtered);

  // Sync delete to Supabase user_accounts table
  if (isSupabaseConfigured()) {
    const supa = getSupabase();
    if (supa) {
      supa.from('user_accounts').delete().eq('id', userId).then(() => {});
    }
  }

  return { success: true };
}
