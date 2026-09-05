/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseCredentials, getSupabase, isSupabaseConfigured } from '../lib/supabase';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseAuth(): SupabaseClient {
  if (!supabaseInstance) {
    const { url, anonKey } = getSupabaseCredentials();
    if (url && anonKey) {
      supabaseInstance = createClient(url, anonKey);
    }
  }
  return supabaseInstance || null;
}

export type UserRole = string;

export interface RolePermissionSet {
  // Main Tab Access (Ticked active by Admin)
  accessDashboard?: boolean; // "Dashboard"
  accessRentals: boolean;    // "Rental Desk"
  accessHistory: boolean;    // "History"
  accessCustomers?: boolean; // "Customers"
  accessUsers: boolean;      // "Users & Role"
  accessSettings: boolean;   // "Rates & Inventory"
  accessIncome?: boolean;    // "Income & Expenses"

  // Functional operational privileges
  canRent: boolean;
  canSettle: boolean;
  canExportReports: boolean;
  canEditPricing: boolean;
  canEditFleet: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
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
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
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
      accessUsers: true,
      accessSettings: true,
      accessIncome: true,
      canRent: true,
      canSettle: true,
      canExportReports: true,
      canEditPricing: true,
      canEditFleet: true,
      canManageUsers: true,
      canManageRoles: true,
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
      accessUsers: false,
      accessSettings: true,
      accessIncome: true,
      canRent: true,
      canSettle: true,
      canExportReports: true,
      canEditPricing: true,
      canEditFleet: true,
      canManageUsers: false,
      canManageRoles: false,
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
      accessUsers: false,
      accessSettings: false,
      accessIncome: false,
      canRent: true,
      canSettle: true,
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
      accessDashboard: true,
      accessRentals: true,
      accessHistory: false,
      accessCustomers: true,
      accessUsers: false,
      accessSettings: false,
      accessIncome: false,
      canRent: true,
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
      accessUsers: true,
      accessSettings: true,
      accessIncome: true,
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
    accessUsers: false,
    accessSettings: false,
    accessIncome: false,
    canRent: true,
    canSettle: true,
    canExportReports: false,
    canEditPricing: false,
    canEditFleet: false,
    canManageUsers: false,
    canManageRoles: false,
  };
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
  password: 'Ab@12345',
  role: 'admin',
  phone: '+94 77 123 4567',
  createdAt: 1700000000000,
  avatarColor: 'emerald',
};

export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      const initial = [DEFAULT_USER];
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [DEFAULT_USER];
    }
    // Filter out invalid items
    const validUsers: UserAccount[] = parsed.filter(
      (u): u is UserAccount => Boolean(u && typeof u === 'object' && typeof u.email === 'string' && u.email.trim().length > 0)
    );

    // Ensure default admin user exists
    const hasDefault = validUsers.some(
      (u) => u.email && u.email.toLowerCase() === DEFAULT_USER.email.toLowerCase()
    );
    if (!hasDefault) {
      const updated = [DEFAULT_USER, ...validUsers];
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));
      return updated;
    }
    return validUsers.length > 0 ? validUsers : [DEFAULT_USER];
  } catch (err) {
    return [DEFAULT_USER];
  }
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
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
          return found;
        }
        return {
          id: parsed.id || DEFAULT_USER.id,
          name: parsed.name || DEFAULT_USER.name,
          email: parsed.email || DEFAULT_USER.email,
          password: parsed.password || DEFAULT_USER.password,
          role: parsed.role || DEFAULT_USER.role,
          phone: parsed.phone || DEFAULT_USER.phone,
          createdAt: parsed.createdAt || DEFAULT_USER.createdAt,
          avatarColor: parsed.avatarColor || DEFAULT_USER.avatarColor,
        };
      }
    }
  } catch (err) {
    // fallback
  }
  // Default to pre-configured admin user
  return DEFAULT_USER;
}

export function setCurrentUserSession(user: UserAccount | null): void {
  try {
    if (user && user.email) {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Failed to update current user in storage', err);
  }
}

export async function authenticateUser(email: string, password: string): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  // Try Supabase Auth first if configured
  const supaAuth = getSupabaseAuth();
  if (supaAuth) {
    try {
      const { data, error } = await supaAuth.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        // Fall through to localStorage fallback
      } else if (data.user) {
        // Map Supabase user to App UserAccount
        const users = getStoredUsers();
        const found = users.find((u) => u && u.email && u.email.toLowerCase() === data.user.email.toLowerCase());
        if (found) {
          setCurrentUserSession(found);
          return { success: true, user: found };
        }
        // Create new user profile from Supabase auth
        const newUser: UserAccount = {
          id: `supa-${data.user.id}`,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Supabase User',
          email: data.user.email,
          role: 'cashier', // default role for new Supabase users
          password: '', // placeholder - auth happens via Supabase, not localStorage password check
          phone: data.user.phone || undefined,
          createdAt: data.user.created_at ? Number(data.user.created_at) : Date.now(),
          avatarColor: 'emerald',
        };
        const usersUpdated = [newUser, ...users];
        saveStoredUsers(usersUpdated);
        setCurrentUserSession(newUser);
        return { success: true, user: newUser };
      }
    } catch (e) {
      // Supabase Auth not available or error, fall through to localStorage
    }
  }

  // Fallback to localStorage-based authentication
  const users = getStoredUsers();
  const normalizedEmail = (email || '').trim().toLowerCase();
  let found = users.find((u) => u && u.email && u.email.toLowerCase() === normalizedEmail);

  // If not found in localStorage or password doesn't match, check Supabase user_accounts table
  if (isSupabaseConfigured()) {
    const supa = getSupabase();
    if (supa) {
      try {
        const { data: supaRow } = await supa
          .from('user_accounts')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (supaRow && (supaRow.password_hash === password || !supaRow.password_hash)) {
          const syncedUser: UserAccount = {
            id: supaRow.id,
            name: supaRow.name,
            email: supaRow.email,
            phone: supaRow.phone || undefined,
            role: supaRow.role,
            password: supaRow.password_hash || password,
            createdAt: supaRow.created_at ? Number(supaRow.created_at) : Date.now(),
          };
          const updatedUsers = users.some(u => u.id === syncedUser.id)
            ? users.map(u => u.id === syncedUser.id ? syncedUser : u)
            : [...users, syncedUser];
          saveStoredUsers(updatedUsers);
          setCurrentUserSession(syncedUser);
          return { success: true, user: syncedUser };
        }
      } catch (err) {
        console.warn('Supabase auth check fallback:', err);
      }
    }
  }

  if (!found) {
    return { success: false, error: 'No account found with this email address.' };
  }

  if (found.password !== password) {
    return { success: false, error: 'Incorrect password. Please verify and try again.' };
  }

  setCurrentUserSession(found);
  return { success: true, user: found };
}

export async function registerNewUser(params: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  phone?: string;
}): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const normalizedEmail = (params.email || '').trim().toLowerCase();

  // Try Supabase Auth first if configured
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
          },
        },
      });
      if (!error && data.user) {
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
          name: data.user.user_metadata?.name || params.name.trim(),
          email: data.user.email || normalizedEmail,
          role: params.role || 'cashier',
          password: params.password,
          phone: params.phone?.trim() || undefined,
          createdAt: Date.now(),
          avatarColor: 'emerald',
        };
        const usersUpdated = [newUser, ...users];
        saveStoredUsers(usersUpdated);
        setCurrentUserSession(newUser);
        // Also save to user_accounts table
        if (isSupabaseConfigured()) {
          const supa = getSupabase();
          if (supa) {
            await supa.from('user_accounts').upsert({
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              phone: newUser.phone || null,
              role: newUser.role,
              password_hash: newUser.password,
              created_at: newUser.createdAt,
            }, { onConflict: 'id' });
          }
        }
        return { success: true, user: newUser };
      }
    } catch (e) {
      // Supabase Auth not available or error, fall through to localStorage
    }
  }

  // Fallback to localStorage-based registration
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
    password: params.password,
    role: params.role || 'cashier',
    phone: params.phone?.trim() || '',
    createdAt: Date.now(),
    avatarColor,
  };

  const updatedUsers = [...users, newUser];
  saveStoredUsers(updatedUsers);

  // Sync to Supabase user_accounts table if configured
  if (isSupabaseConfigured()) {
    const supa = getSupabase();
    if (supa) {
      try {
        await supa.from('user_accounts').upsert({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone || null,
          role: newUser.role,
          password_hash: newUser.password,
          created_at: newUser.createdAt,
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('Failed to sync new user to Supabase:', err);
      }
    }
  }

  return { success: true, user: newUser };
}

export async function resetUserPassword(email: string, newPassword?: string): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid registered email address.' };
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }

    // 1. Update in localStorage
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u && u.email && u.email.toLowerCase() === normalizedEmail);

    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        password: newPassword,
      };
      saveStoredUsers(users);

      // If current logged-in user is this one, update session too
      const current = getCurrentUser();
      if (current && current.email && current.email.toLowerCase() === normalizedEmail) {
        setCurrentUserSession(users[idx]);
      }
    }

    // 2. Update directly in Supabase user_accounts table
    if (isSupabaseConfigured()) {
      const supa = getSupabase();
      if (supa) {
        try {
          await supa
            .from('user_accounts')
            .update({ password_hash: newPassword })
            .eq('email', normalizedEmail);
        } catch (err) {
          console.warn('Failed to update password in Supabase user_accounts:', err);
        }
      }
    }

    // 3. Update in Supabase Auth if session active
    const supaAuth = getSupabaseAuth();
    if (supaAuth) {
      try {
        await supaAuth.auth.updateUser({
          password: newPassword,
        });
      } catch (e) {
        // Active Supabase Auth session might not be present, ignore
      }
    }

    return { success: true };
  }

  // If no newPassword provided, send reset link via Supabase Auth
  const supaAuth = getSupabaseAuth();
  if (supaAuth) {
    try {
      const { error } = await supaAuth.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Failed to send password reset email. Please try again.' };
    }
  }

  return { success: true };
}

/**
 * Admin action: Update a user's role and details
 */
export function updateUserRoleAndDetails(
  userId: string, 
  newRole: UserRole,
  updatedData?: Partial<Pick<UserAccount, 'name' | 'phone' | 'password'>>
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
    password: updatedData?.password || users[idx].password,
  };

  saveStoredUsers(users);

  // Sync to Supabase user_accounts table
  if (isSupabaseConfigured()) {
    const supa = getSupabase();
    if (supa) {
      supa.from('user_accounts').upsert({
        id: users[idx].id,
        name: users[idx].name,
        email: users[idx].email,
        phone: users[idx].phone || null,
        role: users[idx].role,
        password_hash: users[idx].password,
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
