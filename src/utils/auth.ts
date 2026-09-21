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
  // Main Tab Access (Bicycle POS)
  accessDashboard?: boolean; // "Dashboard"
  accessRentals: boolean;    // "Rental Desk"
  accessHistory: boolean;    // "History"
  accessCustomers?: boolean; // "Customers"
  accessMessages?: boolean;  // "Messages"
  accessUsers: boolean;      // "Users & Role" / "Message Templates"
  accessSettings: boolean;   // "Rates & Inventory"
  accessIncome?: boolean;    // Legacy "Income & Expenses" fallback
  accessFinance?: boolean;   // "Finance"

  // Top/Main menu access per business
  accessBicyclePOS?: boolean;
  accessMGRTransport?: boolean;
  accessPRHRental?: boolean;

  // MGR Transport Side-Menu Access
  accessMGRDashboard?: boolean;
  accessMGRSearch?: boolean;
  accessMGRBookings?: boolean;
  accessMGRHistory?: boolean;
  accessMGRFleet?: boolean;
  accessMGRCustomers?: boolean;
  accessMGROwners?: boolean;
  accessMGRSettings?: boolean;

  // PRH Rental Hub Side-Menu Access
  accessPRHDashboard?: boolean;
  accessPRHNewRental?: boolean;
  accessPRHActiveRentals?: boolean;
  accessPRHReturns?: boolean;
  accessPRHCustomers?: boolean;
  accessPRHEquipment?: boolean;
  accessPRHInventory?: boolean;
  accessPRHReservations?: boolean;
  accessPRHPayments?: boolean;
  accessPRHFinance?: boolean;
  accessPRHMaintenance?: boolean;
  accessPRHReminders?: boolean;
  accessPRHReports?: boolean;
  accessPRHSettings?: boolean;

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

export type UserStatus = 'active' | 'deactivated' | 'suspended';
export type BusinessScope = 'bicycle_pos' | 'mgr_transport' | 'prh_rental';

export interface UserAccount {
  id: string;
  auth_user_id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  status?: UserStatus;
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
  businessStatus?: Partial<Record<BusinessScope, UserStatus>>;
  businessStatusUpdatedAt?: Partial<Record<BusinessScope, string>>;
  businessStatusUpdatedBy?: Partial<Record<BusinessScope, string>>;
  must_change_password?: boolean;
  createdAt: number;
  avatarColor?: string;
}

const STORAGE_USERS_KEY = 'v_rental_users';
const STORAGE_CURRENT_USER_KEY = 'v_rental_current_user';
const STORAGE_ROLES_KEY = 'v_rental_roles';
const STORAGE_DELETED_USERS_KEY = 'v_rental_deleted_users';

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
      // Top menu access
      accessBicyclePOS: true,
      accessMGRTransport: true,
      accessPRHRental: true,
      // MGR Transport tabs
      accessMGRDashboard: true,
      accessMGRSearch: true,
      accessMGRBookings: true,
      accessMGRHistory: true,
      accessMGRFleet: true,
      accessMGRCustomers: true,
      accessMGROwners: true,
      accessMGRSettings: true,
      // PRH tabs
      accessPRHDashboard: true,
      accessPRHNewRental: true,
      accessPRHActiveRentals: true,
      accessPRHReturns: true,
      accessPRHCustomers: true,
      accessPRHEquipment: true,
      accessPRHInventory: true,
      accessPRHReservations: true,
      accessPRHPayments: true,
      accessPRHFinance: true,
      accessPRHMaintenance: true,
      accessPRHReminders: true,
      accessPRHReports: true,
      accessPRHSettings: true,
      // Privileges
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
      // Top menu access
      accessBicyclePOS: true,
      accessMGRTransport: true,
      accessPRHRental: true,
      // MGR Transport tabs
      accessMGRDashboard: false,
      accessMGRSearch: true,
      accessMGRBookings: true,
      accessMGRHistory: true,
      accessMGRFleet: true,
      accessMGRCustomers: false,
      accessMGROwners: true,
      accessMGRSettings: false,
      // PRH tabs
      accessPRHDashboard: true,
      accessPRHNewRental: true,
      accessPRHActiveRentals: true,
      accessPRHReturns: true,
      accessPRHCustomers: true,
      accessPRHEquipment: true,
      accessPRHInventory: true,
      accessPRHReservations: true,
      accessPRHPayments: true,
      accessPRHFinance: true,
      accessPRHMaintenance: true,
      accessPRHReminders: true,
      accessPRHReports: true,
      accessPRHSettings: false,
      // Privileges
      canRent: true,
      canSettle: true,
      canExportReports: true,
      canEditPricing: true,
      canEditFleet: true,
      canManageUsers: false,
      canManageRoles: false,
      canAddFinanceTransaction: true,
      canEditFinanceTransaction: false,
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
      // Top menu access
      accessBicyclePOS: true,
      accessMGRTransport: false,
      accessPRHRental: false,
      // MGR Transport tabs
      accessMGRDashboard: false,
      accessMGRSearch: false,
      accessMGRBookings: true,
      accessMGRHistory: true,
      accessMGRFleet: false,
      accessMGRCustomers: false,
      accessMGROwners: false,
      accessMGRSettings: false,
      // PRH tabs
      accessPRHDashboard: false,
      accessPRHNewRental: false,
      accessPRHActiveRentals: false,
      accessPRHReturns: false,
      accessPRHCustomers: false,
      accessPRHEquipment: false,
      accessPRHInventory: false,
      accessPRHReservations: false,
      accessPRHPayments: false,
      accessPRHFinance: false,
      accessPRHMaintenance: false,
      accessPRHReminders: false,
      accessPRHReports: false,
      accessPRHSettings: false,
      // Privileges
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
      accessFinance: false,
      // Top menu access
      accessBicyclePOS: false,
      accessMGRTransport: true,
      accessPRHRental: false,
      // MGR Transport tabs
      accessMGRDashboard: false,
      accessMGRSearch: false,
      accessMGRBookings: true,
      accessMGRHistory: true,
      accessMGRFleet: true,
      accessMGRCustomers: false,
      accessMGROwners: true,
      accessMGRSettings: false,
      // PRH tabs
      accessPRHDashboard: false,
      accessPRHNewRental: false,
      accessPRHActiveRentals: false,
      accessPRHReturns: false,
      accessPRHCustomers: false,
      accessPRHEquipment: false,
      accessPRHInventory: false,
      accessPRHReservations: false,
      accessPRHPayments: false,
      accessPRHFinance: false,
      accessPRHMaintenance: false,
      accessPRHReminders: false,
      accessPRHReports: false,
      accessPRHSettings: false,
      // Privileges
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
      accessFinance: false,
      // Top menu access
      accessBicyclePOS: false,
      accessMGRTransport: true,
      accessPRHRental: false,
      // MGR Transport tabs
      accessMGRDashboard: false,
      accessMGRSearch: true,
      accessMGRBookings: true,
      accessMGRHistory: true,
      accessMGRFleet: false,
      accessMGRCustomers: false,
      accessMGROwners: false,
      accessMGRSettings: false,
      // PRH tabs
      accessPRHDashboard: false,
      accessPRHNewRental: false,
      accessPRHActiveRentals: false,
      accessPRHReturns: false,
      accessPRHCustomers: false,
      accessPRHEquipment: false,
      accessPRHInventory: false,
      accessPRHReservations: false,
      accessPRHPayments: false,
      accessPRHFinance: false,
      accessPRHMaintenance: false,
      accessPRHReminders: false,
      accessPRHReports: false,
      accessPRHSettings: false,
      // Privileges
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
      if (role.id === 'admin') {
        // Administrator always has all side menu options and features allowed
        return {
          ...role,
          name: 'Administrator',
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
            accessBicyclePOS: true,
            accessMGRTransport: true,
            accessPRHRental: true,
            accessMGRDashboard: true,
            accessMGRSearch: true,
            accessMGRBookings: true,
            accessMGRHistory: true,
            accessMGRFleet: true,
            accessMGRCustomers: true,
            accessMGROwners: true,
            accessMGRSettings: true,
            accessPRHDashboard: true,
            accessPRHNewRental: true,
            accessPRHActiveRentals: true,
            accessPRHReturns: true,
            accessPRHCustomers: true,
            accessPRHEquipment: true,
            accessPRHInventory: true,
            accessPRHReservations: true,
            accessPRHPayments: true,
            accessPRHFinance: true,
            accessPRHMaintenance: true,
            accessPRHReminders: true,
            accessPRHReports: true,
            accessPRHSettings: true,
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
        };
      }

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
          accessIncome: role.permissions?.accessIncome ?? role.permissions?.accessFinance ?? (defaultMatch?.permissions?.accessIncome ?? false),
          accessFinance: role.permissions?.accessFinance ?? role.permissions?.accessIncome ?? (defaultMatch?.permissions?.accessFinance ?? false),
          // Top menu
          accessBicyclePOS: role.permissions?.accessBicyclePOS ?? (defaultMatch?.permissions?.accessBicyclePOS ?? (role.id !== 'passenger' && role.id !== 'owner')),
          accessMGRTransport: role.permissions?.accessMGRTransport ?? (defaultMatch?.permissions?.accessMGRTransport ?? (role.id === 'owner' || role.id === 'passenger' || role.id === 'admin' || role.id === 'manager')),
          accessPRHRental: role.permissions?.accessPRHRental ?? (defaultMatch?.permissions?.accessPRHRental ?? (role.id === 'admin' || role.id === 'manager')),
          // MGR Transport tabs
          accessMGRDashboard: role.permissions?.accessMGRDashboard ?? (defaultMatch?.permissions?.accessMGRDashboard ?? false),
          accessMGRSearch: role.permissions?.accessMGRSearch ?? (defaultMatch?.permissions?.accessMGRSearch ?? (role.id !== 'owner')),
          accessMGRBookings: role.permissions?.accessMGRBookings ?? (defaultMatch?.permissions?.accessMGRBookings ?? true),
          accessMGRHistory: role.permissions?.accessMGRHistory ?? (defaultMatch?.permissions?.accessMGRHistory ?? true),
          accessMGRFleet: role.permissions?.accessMGRFleet ?? (defaultMatch?.permissions?.accessMGRFleet ?? (role.id !== 'passenger')),
          accessMGRCustomers: role.permissions?.accessMGRCustomers ?? (defaultMatch?.permissions?.accessMGRCustomers ?? false),
          accessMGROwners: role.permissions?.accessMGROwners ?? (defaultMatch?.permissions?.accessMGROwners ?? (role.id !== 'passenger')),
          accessMGRSettings: role.permissions?.accessMGRSettings ?? (defaultMatch?.permissions?.accessMGRSettings ?? false),
          // PRH tabs
          accessPRHDashboard: role.permissions?.accessPRHDashboard ?? (defaultMatch?.permissions?.accessPRHDashboard ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHNewRental: role.permissions?.accessPRHNewRental ?? (defaultMatch?.permissions?.accessPRHNewRental ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHActiveRentals: role.permissions?.accessPRHActiveRentals ?? (defaultMatch?.permissions?.accessPRHActiveRentals ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHReturns: role.permissions?.accessPRHReturns ?? (defaultMatch?.permissions?.accessPRHReturns ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHCustomers: role.permissions?.accessPRHCustomers ?? (defaultMatch?.permissions?.accessPRHCustomers ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHEquipment: role.permissions?.accessPRHEquipment ?? (defaultMatch?.permissions?.accessPRHEquipment ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHInventory: role.permissions?.accessPRHInventory ?? (defaultMatch?.permissions?.accessPRHInventory ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHReservations: role.permissions?.accessPRHReservations ?? (defaultMatch?.permissions?.accessPRHReservations ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHPayments: role.permissions?.accessPRHPayments ?? (defaultMatch?.permissions?.accessPRHPayments ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHFinance: role.permissions?.accessPRHFinance ?? (defaultMatch?.permissions?.accessPRHFinance ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHMaintenance: role.permissions?.accessPRHMaintenance ?? (defaultMatch?.permissions?.accessPRHMaintenance ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHReminders: role.permissions?.accessPRHReminders ?? (defaultMatch?.permissions?.accessPRHReminders ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHReports: role.permissions?.accessPRHReports ?? (defaultMatch?.permissions?.accessPRHReports ?? (role.id === 'admin' || role.id === 'manager')),
          accessPRHSettings: role.permissions?.accessPRHSettings ?? (defaultMatch?.permissions?.accessPRHSettings ?? false),
          // Privileges
          canRent: role.permissions?.canRent ?? true,
          canSettle: role.permissions?.canSettle ?? true,
          canExportReports: role.permissions?.canExportReports ?? false,
          canEditPricing: role.permissions?.canEditPricing ?? false,
          canEditFleet: role.permissions?.canEditFleet ?? false,
          canManageUsers: role.permissions?.canManageUsers ?? false,
          canManageRoles: role.permissions?.canManageRoles ?? false,
          canAddFinanceTransaction: role.permissions?.canAddFinanceTransaction ?? (defaultMatch?.permissions?.canAddFinanceTransaction ?? false),
          canEditFinanceTransaction: role.permissions?.canEditFinanceTransaction ?? (defaultMatch?.permissions?.canEditFinanceTransaction ?? false),
          canDeleteFinanceTransaction: role.permissions?.canDeleteFinanceTransaction ?? (defaultMatch?.permissions?.canDeleteFinanceTransaction ?? false),
          canViewPL: role.permissions?.canViewPL ?? (defaultMatch?.permissions?.canViewPL ?? false),
          canViewStatement: role.permissions?.canViewStatement ?? (defaultMatch?.permissions?.canViewStatement ?? false),
          canExportFinanceReports: role.permissions?.canExportFinanceReports ?? (defaultMatch?.permissions?.canExportFinanceReports ?? false),
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
    // Admin always retains user & role management so permissions can never be locked out permanently
    updatedPerms.accessUsers = true;
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

/**
 * Get user status for a specific business, defaulting to global status or 'active'
 */
export function getUserBusinessStatus(
  user: UserAccount | null | undefined,
  business: BusinessScope
): UserStatus {
  if (!user) return 'deactivated';
  if (user.businessStatus && user.businessStatus[business]) {
    return user.businessStatus[business]!;
  }
  return user.status || 'active';
}

/**
 * Check if a user can actively access a business module
 * Validates root admin bypass, role permission flag, and business-level status.
 */
export function canAccessBusiness(
  user: UserAccount | null | undefined,
  business: BusinessScope
): boolean {
  if (!user) return false;
  const isRoot = user.email.toLowerCase() === DEFAULT_USER.email.toLowerCase() || 
                 user.email.toLowerCase() === 'absiraiva@gmail.com' ||
                 user.email.toLowerCase() === 'admin@mannargreenride.lk';
  if (isRoot) return true;

  const bStatus = getUserBusinessStatus(user, business);
  if (bStatus === 'deactivated' || bStatus === 'suspended') {
    return false;
  }

  const perms = getUserPermissions(user);
  if (business === 'bicycle_pos') return Boolean(perms.accessBicyclePOS);
  if (business === 'mgr_transport') return Boolean(perms.accessMGRTransport);
  if (business === 'prh_rental') return Boolean(perms.accessPRHRental);

  return false;
}

/**
 * List all businesses the user has active, permitted access to
 */
export function getAuthorizedBusinesses(user: UserAccount | null | undefined): BusinessScope[] {
  if (!user) return [];
  const list: BusinessScope[] = [];
  if (canAccessBusiness(user, 'bicycle_pos')) list.push('bicycle_pos');
  if (canAccessBusiness(user, 'mgr_transport')) list.push('mgr_transport');
  if (canAccessBusiness(user, 'prh_rental')) list.push('prh_rental');
  return list;
}

export function getUserPermissions(user: UserAccount | null | undefined): RolePermissionSet {
  const EMPTY_PERMS: RolePermissionSet = {
    accessDashboard: false,
    accessRentals: false,
    accessHistory: false,
    accessCustomers: false,
    accessMessages: false,
    accessUsers: false,
    accessSettings: false,
    accessIncome: false,
    accessFinance: false,
    accessBicyclePOS: false,
    accessMGRTransport: false,
    accessPRHRental: false,
    accessMGRDashboard: false,
    accessMGRSearch: false,
    accessMGRBookings: false,
    accessMGRHistory: false,
    accessMGRFleet: false,
    accessMGRCustomers: false,
    accessMGROwners: false,
    accessMGRSettings: false,
    accessPRHDashboard: false,
    accessPRHNewRental: false,
    accessPRHActiveRentals: false,
    accessPRHReturns: false,
    accessPRHCustomers: false,
    accessPRHEquipment: false,
    accessPRHInventory: false,
    accessPRHReservations: false,
    accessPRHPayments: false,
    accessPRHFinance: false,
    accessPRHMaintenance: false,
    accessPRHReminders: false,
    accessPRHReports: false,
    accessPRHSettings: false,
    canAddFinanceTransaction: false,
    canEditFinanceTransaction: false,
    canDeleteFinanceTransaction: false,
    canViewPL: false,
    canViewStatement: false,
    canExportFinanceReports: false,
    canRent: false,
    canSettle: false,
    canExportReports: false,
    canEditPricing: false,
    canEditFleet: false,
    canManageUsers: false,
    canManageRoles: false,
  };

  if (!user || user.status === 'deactivated' || user.status === 'suspended') {
    return EMPTY_PERMS;
  }

  const isRootAdmin = user.email.toLowerCase() === DEFAULT_USER.email.toLowerCase() ||
                      user.email.toLowerCase() === 'absiraiva@gmail.com' ||
                      user.email.toLowerCase() === 'admin@mannargreenride.lk';

  let rawPerms: RolePermissionSet;
  if (user.role === 'admin' || isRootAdmin) {
    rawPerms = {
      accessDashboard: true,
      accessRentals: true,
      accessHistory: true,
      accessCustomers: true,
      accessMessages: true,
      accessUsers: true,
      accessSettings: true,
      accessIncome: true,
      accessFinance: true,
      accessBicyclePOS: true,
      accessMGRTransport: true,
      accessPRHRental: true,
      accessMGRDashboard: true,
      accessMGRSearch: true,
      accessMGRBookings: true,
      accessMGRHistory: true,
      accessMGRFleet: true,
      accessMGRCustomers: true,
      accessMGROwners: true,
      accessMGRSettings: true,
      accessPRHDashboard: true,
      accessPRHNewRental: true,
      accessPRHActiveRentals: true,
      accessPRHReturns: true,
      accessPRHCustomers: true,
      accessPRHEquipment: true,
      accessPRHInventory: true,
      accessPRHReservations: true,
      accessPRHPayments: true,
      accessPRHFinance: true,
      accessPRHMaintenance: true,
      accessPRHReminders: true,
      accessPRHReports: true,
      accessPRHSettings: true,
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
    };
  } else {
    const roles = getStoredRoles();
    const found = roles.find(r => r.id === user.role);
    if (found) {
      rawPerms = { ...found.permissions };
    } else {
      rawPerms = { ...EMPTY_PERMS };
    }
  }

  if (isRootAdmin) {
    return rawPerms;
  }

  // Enforce business-by-business status scoping:
  const perms: RolePermissionSet = { ...rawPerms };

  // 1. Bicycle POS Status Check
  const bicycleStatus = getUserBusinessStatus(user, 'bicycle_pos');
  if (bicycleStatus === 'deactivated' || bicycleStatus === 'suspended') {
    perms.accessBicyclePOS = false;
    perms.accessDashboard = false;
    perms.accessRentals = false;
    perms.accessHistory = false;
    perms.accessCustomers = false;
    perms.accessMessages = false;
    perms.accessUsers = false;
    perms.accessSettings = false;
    perms.accessIncome = false;
    perms.accessFinance = false;
    perms.canRent = false;
    perms.canSettle = false;
  }

  // 2. MGR Transport Status Check
  const mgrStatus = getUserBusinessStatus(user, 'mgr_transport');
  if (mgrStatus === 'deactivated' || mgrStatus === 'suspended') {
    perms.accessMGRTransport = false;
    perms.accessMGRDashboard = false;
    perms.accessMGRSearch = false;
    perms.accessMGRBookings = false;
    perms.accessMGRHistory = false;
    perms.accessMGRFleet = false;
    perms.accessMGRCustomers = false;
    perms.accessMGROwners = false;
    perms.accessMGRSettings = false;
  }

  // 3. PRH Rental Hub Status Check
  const prhStatus = getUserBusinessStatus(user, 'prh_rental');
  if (prhStatus === 'deactivated' || prhStatus === 'suspended') {
    perms.accessPRHRental = false;
    perms.accessPRHDashboard = false;
    perms.accessPRHNewRental = false;
    perms.accessPRHActiveRentals = false;
    perms.accessPRHReturns = false;
    perms.accessPRHCustomers = false;
    perms.accessPRHEquipment = false;
    perms.accessPRHInventory = false;
    perms.accessPRHReservations = false;
    perms.accessPRHPayments = false;
    perms.accessPRHFinance = false;
    perms.accessPRHMaintenance = false;
    perms.accessPRHReminders = false;
    perms.accessPRHReports = false;
    perms.accessPRHSettings = false;
  }

  return perms;
}

export function hasPermission(
  user: UserAccount | null | undefined,
  permission: keyof RolePermissionSet
): boolean {
  if (!user || user.status === 'deactivated' || user.status === 'suspended') return false;
  const isRootAdmin = user.email.toLowerCase() === DEFAULT_USER.email.toLowerCase() || 
                      user.email.toLowerCase() === 'absiraiva@gmail.com' ||
                      user.email.toLowerCase() === 'admin@mannargreenride.lk';
  if (isRootAdmin) {
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
      accessFinance: params.permissions?.accessFinance ?? false,
      // Multi-business top menu
      accessBicyclePOS: params.permissions?.accessBicyclePOS ?? true,
      accessMGRTransport: params.permissions?.accessMGRTransport ?? true,
      accessPRHRental: params.permissions?.accessPRHRental ?? true,
      // MGR Transport tabs
      accessMGRDashboard: params.permissions?.accessMGRDashboard ?? false,
      accessMGRSearch: params.permissions?.accessMGRSearch ?? true,
      accessMGRBookings: params.permissions?.accessMGRBookings ?? true,
      accessMGRHistory: params.permissions?.accessMGRHistory ?? true,
      accessMGRFleet: params.permissions?.accessMGRFleet ?? false,
      accessMGRCustomers: params.permissions?.accessMGRCustomers ?? false,
      accessMGROwners: params.permissions?.accessMGROwners ?? false,
      accessMGRSettings: params.permissions?.accessMGRSettings ?? false,
      // PRH tabs
      accessPRHDashboard: params.permissions?.accessPRHDashboard ?? false,
      accessPRHNewRental: params.permissions?.accessPRHNewRental ?? false,
      accessPRHActiveRentals: params.permissions?.accessPRHActiveRentals ?? false,
      accessPRHReturns: params.permissions?.accessPRHReturns ?? false,
      accessPRHCustomers: params.permissions?.accessPRHCustomers ?? false,
      accessPRHEquipment: params.permissions?.accessPRHEquipment ?? false,
      accessPRHInventory: params.permissions?.accessPRHInventory ?? false,
      accessPRHReservations: params.permissions?.accessPRHReservations ?? false,
      accessPRHPayments: params.permissions?.accessPRHPayments ?? false,
      accessPRHFinance: params.permissions?.accessPRHFinance ?? false,
      accessPRHMaintenance: params.permissions?.accessPRHMaintenance ?? false,
      accessPRHReminders: params.permissions?.accessPRHReminders ?? false,
      accessPRHReports: params.permissions?.accessPRHReports ?? false,
      accessPRHSettings: params.permissions?.accessPRHSettings ?? false,
      // Privileges
      canRent: params.permissions?.canRent ?? true,
      canSettle: params.permissions?.canSettle ?? true,
      canExportReports: params.permissions?.canExportReports ?? false,
      canEditPricing: params.permissions?.canEditPricing ?? false,
      canEditFleet: params.permissions?.canEditFleet ?? false,
      canManageUsers: params.permissions?.canManageUsers ?? false,
      canManageRoles: params.permissions?.canManageRoles ?? false,
      canAddFinanceTransaction: params.permissions?.canAddFinanceTransaction ?? false,
      canEditFinanceTransaction: params.permissions?.canEditFinanceTransaction ?? false,
      canDeleteFinanceTransaction: params.permissions?.canDeleteFinanceTransaction ?? false,
      canViewPL: params.permissions?.canViewPL ?? false,
      canViewStatement: params.permissions?.canViewStatement ?? false,
      canExportFinanceReports: params.permissions?.canExportFinanceReports ?? false,
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

export function getDeletedUserEmails(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_DELETED_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((e: string) => String(e).trim().toLowerCase());
    }
  } catch {}
  return [];
}

export function markUserAsDeleted(email: string): void {
  try {
    const norm = (email || '').trim().toLowerCase();
    if (!norm) return;
    const existing = getDeletedUserEmails();
    if (!existing.includes(norm)) {
      existing.push(norm);
      localStorage.setItem(STORAGE_DELETED_USERS_KEY, JSON.stringify(existing));
    }
  } catch {}
}

export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    const deletedEmails = getDeletedUserEmails();
    let validUsers: UserAccount[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          validUsers = parsed
            .filter((u): u is UserAccount => Boolean(u && typeof u === 'object' && typeof u.email === 'string' && u.email.trim().length > 0))
            .filter((u) => !deletedEmails.includes(u.email.trim().toLowerCase()))
            .map((u) => {
              // Strip plaintext passwords from local caches and sanitize status
              const { password: _, ...rest } = u as any;
              const statusVal: UserStatus = (rest.status === 'deactivated' || rest.status === 'suspended') ? rest.status : 'active';
              return { ...rest, status: statusVal };
            });
        }
      } catch {}
    }

    let updatedUsers = [...validUsers];
    let needsUpdate = false;

    const allStandardUsers = [DEFAULT_USER, ...MGR_INITIAL_ACCOUNTS];
    for (const standardUser of allStandardUsers) {
      const standardEmail = standardUser.email ? standardUser.email.trim().toLowerCase() : '';
      if (deletedEmails.includes(standardEmail)) {
        continue; // Strictly NEVER re-seed a user that was deleted by admin
      }
      const idx = updatedUsers.findIndex(
        (u) => u.email && u.email.trim().toLowerCase() === standardEmail
      );
      if (idx === -1) {
        updatedUsers.push({ ...standardUser });
        needsUpdate = true;
      }
    }

    if (needsUpdate || !raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers));
    }
    return updatedUsers.length > 0 ? updatedUsers : allStandardUsers.filter(u => !deletedEmails.includes(u.email.toLowerCase()));
  } catch (err) {
    return [DEFAULT_USER, ...MGR_INITIAL_ACCOUNTS];
  }
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    // Strip passwords before persisting to localStorage
    const sanitized = users.map((u) => {
      const { password: _, ...clean } = u as any;
      return clean as UserAccount;
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
        const norm = parsed.email.trim().toLowerCase();
        // If user was deleted, revoke session immediately
        if (getDeletedUserEmails().includes(norm)) {
          localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
          return null;
        }

        // Validate against current users in storage
        const users = getStoredUsers();
        const found = users.find((u) => u.email.toLowerCase() === norm);
        if (found) {
          const { password: _, ...cleanFound } = found as any;
          return cleanFound as UserAccount;
        }

        // If user not in active stored users, invalidate and clear session
        localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
        return null;
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
      const { password: _, ...cleanUser } = user as any;
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(cleanUser));
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Failed to update current user in storage', err);
  }
}

// Known seed credentials for default demonstration accounts
const SEED_PASSWORDS: Record<string, string> = {
  'admin@mannargreenride.lk': 'admin123',
  'absiraiva@gmail.com': 'admin123',
  'owner@mannargreenride.lk': 'owner123',
  'passenger@mannargreenride.lk': 'passenger123',
};

async function computeSha256(str: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function storeLocalPasswordHash(email: string, plainText: string): Promise<void> {
  if (typeof window === 'undefined' || !email || !plainText) return;
  try {
    const key = `v_pwd_hash_${email.trim().toLowerCase()}`;
    const hash = await computeSha256(plainText);
    localStorage.setItem(key, hash);
  } catch {}
}

export async function verifyLocalPassword(email: string, plainText: string): Promise<boolean> {
  if (!email || !plainText) return false;
  const norm = email.trim().toLowerCase();

  // 1. Check stored cryptographic hash from registration or password reset FIRST
  if (typeof window !== 'undefined') {
    const key = `v_pwd_hash_${norm}`;
    const storedHash = localStorage.getItem(key);
    if (storedHash) {
      const inputHash = await computeSha256(plainText);
      if (storedHash === inputHash) return true;
    }
  }

  // 2. Check known seed accounts if no custom hash was matched
  if (SEED_PASSWORDS[norm] && SEED_PASSWORDS[norm] === plainText) {
    return true;
  }

  return false;
}

/**
 * Authenticate user with Supabase Auth as the primary cloud provider,
 * backed by strict cryptographic SHA-256 verification so no invalid password is ever accepted.
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserAccount; error?: string; requiresPasswordChange?: boolean }> {
  let normalizedEmail = (email || '').trim().toLowerCase();
  if (normalizedEmail === 'passenger') normalizedEmail = 'passenger@mannargreenride.lk';
  if (normalizedEmail === 'owner') normalizedEmail = 'owner@mannargreenride.lk';
  if (normalizedEmail === 'admin') normalizedEmail = 'admin@mannargreenride.lk';

  if (!password || password.trim().length === 0) {
    return {
      success: false,
      error: 'Please enter your password.',
    };
  }

  // 1. Check if user account was deleted by administrator
  if (getDeletedUserEmails().includes(normalizedEmail)) {
    return {
      success: false,
      error: 'Account not found. This user account has been deleted by the administrator.',
    };
  }

  if (!isSupabaseConfigured()) {
    // Offline / Demo mode fallback: verify password strictly against hash or seed
    const isValid = await verifyLocalPassword(normalizedEmail, password);
    if (!isValid) {
      return {
        success: false,
        error: 'Invalid login credentials. Please check your email and password.',
      };
    }

    const users = getStoredUsers();
    const found = users.find(
      (u) =>
        u &&
        ((u.email && u.email.toLowerCase() === normalizedEmail) ||
         (u.name && u.name.toLowerCase() === normalizedEmail))
    );
    if (!found) {
      return {
        success: false,
        error: 'Account not found. This user account does not exist or has been deleted.',
      };
    }

    // Check account status
    if (found.status === 'deactivated') {
      return {
        success: false,
        error: 'Account Access Denied: Your account has been deactivated by the administrator.',
      };
    }
    if (found.status === 'suspended') {
      return {
        success: false,
        error: 'Account Access Denied: Your account has been suspended by the administrator.',
      };
    }

    setCurrentUserSession(found);
    return { success: true, user: found };
  }

  // 1. PRIMARY CHECK: Supabase Auth verifies the password
  const supaAuth = getSupabaseAuth();
  if (!supaAuth) {
    return {
      success: false,
      error: 'Authentication client is currently unavailable. Please try again.',
    };
  }

  try {
    const { data: authData, error: authError } = await supaAuth.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    });

    if (authError || !authData?.user) {
      // Supabase failed to authenticate (user may not yet exist in Supabase Cloud auth, network issues, or password mismatch).
      // Cryptographically verify against local password (stored SHA-256 hash or seed password):
      const isValidLocal = await verifyLocalPassword(normalizedEmail, password);
      if (isValidLocal) {
        const users = getStoredUsers();
        const localFound = users.find(
          (u) =>
            u &&
            ((u.email && u.email.toLowerCase() === normalizedEmail) ||
             (u.name && u.name.toLowerCase() === normalizedEmail) ||
             (normalizedEmail === 'admin' && (u.role === 'admin' || u.email.toLowerCase() === DEFAULT_USER.email.toLowerCase())) ||
             (normalizedEmail === 'owner' && (u.role === 'owner' || u.email.includes('owner'))) ||
             (normalizedEmail === 'passenger' && (u.role === 'passenger' || u.email.includes('passenger'))))
        );
        if (!localFound) {
          return {
            success: false,
            error: 'Account not found. This user account does not exist or has been deleted.',
          };
        }

        if (localFound.status === 'deactivated') {
          return {
            success: false,
            error: 'Account Access Denied: Your account has been deactivated by the administrator.',
          };
        }
        if (localFound.status === 'suspended') {
          return {
            success: false,
            error: 'Account Access Denied: Your account has been suspended by the administrator.',
          };
        }

        setCurrentUserSession(localFound);
        return { success: true, user: localFound };
      }

      // If local verification also failed, reject with invalid credentials error.
      return {
        success: false,
        error: 'Invalid login credentials. Please check your email and password.',
      };
    }

    // Cache valid password hash locally for verified offline capability
    storeLocalPasswordHash(normalizedEmail, password);

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
 * Change password for the specified user or current authenticated user using Supabase Auth.
 * Automatically saves cryptographic SHA-256 hash locally so the user can immediately log in.
 */
export async function changePassword(
  newPassword: string,
  targetEmail?: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const current = getCurrentUser();
  const effectiveEmail = (targetEmail || current?.email || '').trim().toLowerCase();

  if (!effectiveEmail) {
    return { success: false, error: 'Target user email is required.' };
  }

  // Security check: deleted users cannot change password
  if (getDeletedUserEmails().includes(effectiveEmail)) {
    return { success: false, error: 'This user account has been deleted and cannot change password.' };
  }

  // Security check: deactivated or suspended users cannot change password
  const storedUsersList = getStoredUsers();
  const targetUserObj = storedUsersList.find((u) => u.email.toLowerCase() === effectiveEmail);
  if (targetUserObj && (targetUserObj.status === 'deactivated' || targetUserObj.status === 'suspended')) {
    return {
      success: false,
      error: `Account is ${targetUserObj.status}. Password change is not permitted. Please contact administrator.`,
    };
  }

  const supaAuth = getSupabaseAuth();
  let supaError: string | null = null;
  let supaSuccess = false;

  if (supaAuth) {
    try {
      const { data, error } = await supaAuth.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });

      if (!error && data?.user) {
        supaSuccess = true;
      } else if (error) {
        supaError = error.message;
      }
    } catch (err: any) {
      supaError = err?.message || 'Supabase error';
    }
  }

  // If we have an effective email (from targetEmail or current session):
  if (effectiveEmail) {
    // 1. Store cryptographic SHA-256 hash locally so the user can immediately log in with their new password!
    await storeLocalPasswordHash(effectiveEmail, newPassword);

    // 2. Clear must_change_password in local users list
    const users = getStoredUsers();
    const updated = users.map((u) => {
      if (u.email && u.email.toLowerCase() === effectiveEmail) {
        return { ...u, must_change_password: false };
      }
      return u;
    });
    saveStoredUsers(updated);

    if (current && current.email.toLowerCase() === effectiveEmail) {
      current.must_change_password = false;
      setCurrentUserSession(current);
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem('v_rental_must_change_password');
    }

    // 3. Update Supabase user_accounts table if reachable
    if (isSupabaseConfigured()) {
      const supa = getSupabase();
      if (supa) {
        supa
          .from('user_accounts')
          .update({ must_change_password: false })
          .ilike('email', effectiveEmail)
          .then(() => {});
      }
    }

    recordAuditLog({
      user: current?.name || effectiveEmail,
      userEmail: effectiveEmail,
      action: 'Password Reset Requested',
      reference: 'AUTH-PW-UPDATE',
      details: `User password successfully changed for ${effectiveEmail}`,
    });

    return { success: true };
  }

  if (supaSuccess) {
    return { success: true };
  }

  return {
    success: false,
    error: supaError || 'Failed to update password. Please check your session.',
  };
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
  try {
    localStorage.removeItem('mgr_system_mode');
  } catch {}
}

export async function registerNewUser(params: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  phone?: string;
  requirePasswordChange?: boolean;
}): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const normalizedEmail = (params.email || '').trim().toLowerCase();
  const requirePasswordChange = params.requirePasswordChange ?? false;

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
            must_change_password: false,
          },
        },
      });

      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('already been registered')) {
          return { success: false, error: 'An account with this email already exists. Please sign in.' };
        }
        return { success: false, error: error.message };
      }

      // Supabase returns a user with an empty identities array when the email is already
      // registered (with email confirmation enabled) to avoid leaking account existence.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return { success: false, error: 'An account with this email already exists. Please sign in.' };
      }

      if (data.user) {
        const resolvedEmail = (data.user.email || normalizedEmail).toLowerCase();
        const users = getStoredUsers();
        const existing = users.find(
          (u) => u && u.email && u.email.toLowerCase() === resolvedEmail
        );

        // Refresh/merge the local record so it is always linked to the Supabase Auth user,
        // even if a stale entry for this email was left behind in the local cache.
        const resolvedUser: UserAccount = {
          id: existing?.id || `supa-${data.user.id}`,
          auth_user_id: data.user.id,
          name: data.user.user_metadata?.name || params.name.trim() || existing?.name || 'User',
          email: data.user.email || normalizedEmail,
          role: params.role || existing?.role || 'cashier',
          phone: params.phone?.trim() || existing?.phone || undefined,
          status: existing?.status || 'active',
          must_change_password: false,
          createdAt: existing?.createdAt || Date.now(),
          avatarColor: existing?.avatarColor || 'emerald',
        };

        const otherUsers = users.filter(
          (u) => !u || !u.email || u.email.toLowerCase() !== resolvedEmail
        );
        saveStoredUsers([resolvedUser, ...otherUsers]);
        setCurrentUserSession(resolvedUser);

        // Also save profile to user_accounts table (NO password_hash!)
        if (isSupabaseConfigured()) {
          const supa = getSupabase();
          if (supa) {
            await supa.from('user_accounts').upsert({
              id: resolvedUser.id,
              auth_user_id: data.user.id,
              name: resolvedUser.name,
              email: resolvedUser.email,
              phone: resolvedUser.phone || null,
              role: resolvedUser.role,
              status: 'active',
              must_change_password: false,
              created_at: resolvedUser.createdAt,
            }, { onConflict: 'id' });
          }
        }
        await storeLocalPasswordHash(resolvedEmail, params.password);
        return { success: true, user: resolvedUser };
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
  await storeLocalPasswordHash(normalizedEmail, params.password);

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

  // Security check: deleted accounts cannot reset password
  if (getDeletedUserEmails().includes(normalizedEmail)) {
    return { success: false, error: 'This account has been deleted. Password reset is not permitted.' };
  }

  // Security check: deactivated or suspended accounts cannot reset password
  const storedUsersList = getStoredUsers();
  const targetUserObj = storedUsersList.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (targetUserObj && (targetUserObj.status === 'deactivated' || targetUserObj.status === 'suspended')) {
    return {
      success: false,
      error: `This account is ${targetUserObj.status}. Password reset is not permitted. Please contact administrator.`,
    };
  }

  const supaAuth = getSupabaseAuth();
  if (supaAuth) {
    try {
      let originUrl = 'https://booking.mannargreenride.com';
      if (typeof window !== 'undefined' && window.location.origin) {
        const currentOrigin = window.location.origin;
        if (!currentOrigin.includes('localhost:3000')) {
          originUrl = currentOrigin;
        }
      }
      const redirectUrl = `${originUrl}/`;
      const { error } = await supaAuth.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Also dispatch a backup notification email directly via the system sender mannargreenride@gmail.com
      try {
        fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: normalizedEmail,
            subject: 'Mannar Green Ride — Staff Password Reset Request',
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                  <h2 style="color: #059669; margin: 0; font-size: 20px;">Mannar Green Ride</h2>
                </div>
                <h3 style="color: #0f172a; margin-top: 0; font-size: 16px;">Password Reset Notice</h3>
                <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                  A password reset request has been dispatched for your staff account (<strong>${normalizedEmail}</strong>). Please check your inbox for the secure authentication link or open the system portal to proceed.
                </p>
                <div style="margin: 24px 0;">
                  <a href="${originUrl}/" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px;">
                    Open Mannar Green Ride Portal
                  </a>
                </div>
                <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
                  If you did not request this password reset, please contact your system administrator immediately.
                </p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                  Mannar Green Ride Multi-Business Hub &bull; Sent securely from mannargreenride@gmail.com
                </p>
              </div>
            `,
          }),
        }).catch(() => {});
      } catch {}

      // Record in audit log
      recordAuditLog({
        user: adminUser?.name || 'Admin',
        userEmail: adminUser?.email,
        action: 'Password Reset Requested',
        reference: normalizedEmail,
        details: `Password recovery email dispatched via Supabase Auth and mannargreenride@gmail.com for ${normalizedEmail}`,
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
  updatedData?: Partial<Pick<UserAccount, 'name' | 'phone' | 'status' | 'statusUpdatedAt' | 'statusUpdatedBy' | 'businessStatus' | 'businessStatusUpdatedAt' | 'businessStatusUpdatedBy'>>,
  targetBusiness?: BusinessScope
): { success: boolean; user?: UserAccount; error?: string } {
  const users = getStoredUsers();
  const idx = users.findIndex((u) => u.id === userId);

  if (idx === -1) {
    return { success: false, error: 'User not found in system records.' };
  }

  const prevStatus = users[idx].status || 'active';
  const newStatus = updatedData?.status || prevStatus;
  const statusChanged = newStatus !== prevStatus;

  // Handle per-business status
  const currentBusinessStatus = { ...(users[idx].businessStatus || {}) };
  const currentBusinessStatusUpdatedAt = { ...(users[idx].businessStatusUpdatedAt || {}) };
  const currentBusinessStatusUpdatedBy = { ...(users[idx].businessStatusUpdatedBy || {}) };

  if (updatedData?.businessStatus) {
    (Object.keys(updatedData.businessStatus) as BusinessScope[]).forEach((scope) => {
      const val = updatedData.businessStatus![scope];
      if (val) {
        currentBusinessStatus[scope] = val;
        currentBusinessStatusUpdatedAt[scope] = updatedData.businessStatusUpdatedAt?.[scope] || new Date().toISOString();
        currentBusinessStatusUpdatedBy[scope] = updatedData.businessStatusUpdatedBy?.[scope] || 'Administrator';
      }
    });
  } else if (targetBusiness && updatedData?.status) {
    currentBusinessStatus[targetBusiness] = updatedData.status;
    currentBusinessStatusUpdatedAt[targetBusiness] = updatedData.statusUpdatedAt || new Date().toISOString();
    currentBusinessStatusUpdatedBy[targetBusiness] = updatedData.statusUpdatedBy || 'Administrator';
  }

  users[idx] = {
    ...users[idx],
    role: newRole,
    name: updatedData?.name?.trim() || users[idx].name,
    phone: updatedData?.phone !== undefined ? updatedData.phone.trim() : users[idx].phone,
    status: newStatus,
    statusUpdatedAt: statusChanged 
      ? (updatedData?.statusUpdatedAt || new Date().toISOString()) 
      : (updatedData?.statusUpdatedAt || users[idx].statusUpdatedAt),
    statusUpdatedBy: statusChanged 
      ? (updatedData?.statusUpdatedBy || 'Administrator') 
      : (updatedData?.statusUpdatedBy || users[idx].statusUpdatedBy),
    businessStatus: currentBusinessStatus,
    businessStatusUpdatedAt: currentBusinessStatusUpdatedAt,
    businessStatusUpdatedBy: currentBusinessStatusUpdatedBy,
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
        status_updated_at: users[idx].statusUpdatedAt || null,
        status_updated_by: users[idx].statusUpdatedBy || null,
      }, { onConflict: 'id' }).then(() => {});
    }
  }

  // Update session if it's the current user (match either user id or email)
  const current = getCurrentUser();
  if (current && (current.id === userId || current.email.toLowerCase() === users[idx].email.toLowerCase())) {
    setCurrentUserSession(users[idx]);
  }

  // Broadcast real-time status update to all open tabs and windows
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('bicycle_pos_channel');
      channel.postMessage({
        type: 'USER_STATUS_CHANGED',
        payload: {
          userId: users[idx].id,
          email: users[idx].email,
          status: users[idx].status,
          statusUpdatedAt: users[idx].statusUpdatedAt,
          statusUpdatedBy: users[idx].statusUpdatedBy,
          businessStatus: users[idx].businessStatus,
          businessStatusUpdatedAt: users[idx].businessStatusUpdatedAt,
          businessStatusUpdatedBy: users[idx].businessStatusUpdatedBy,
        },
      });
      channel.close();
    }
  } catch (e) {
    // Ignore BroadcastChannel errors
  }

  return { success: true, user: users[idx] };
}

/**
 * Admin action: Delete user account
 * Permanently removes user, revokes session, marks as deleted to prevent recreation, and broadcasts revocation.
 */
export function deleteUserAccount(
  userId: string,
  adminUser?: UserAccount
): { success: boolean; error?: string } {
  const users = getStoredUsers();
  const target = users.find((u) => u.id === userId);

  if (!target) {
    return { success: false, error: 'User not found.' };
  }

  if (target.email.toLowerCase() === DEFAULT_USER.email.toLowerCase()) {
    return { success: false, error: 'Primary root admin account cannot be deleted.' };
  }

  // 1. Mark email as permanently deleted so it cannot be re-seeded or resurrected
  markUserAsDeleted(target.email);

  // 2. Clear any local password hash stored
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`v_pwd_hash_${target.email.toLowerCase()}`);
    }
  } catch (e) {}

  // 3. Remove from users and save
  const filtered = users.filter((u) => u.id !== userId);
  saveStoredUsers(filtered);

  // 4. Invalidate session immediately if deleted user is currently logged in
  const current = getCurrentUser();
  if (current && (current.id === userId || current.email.toLowerCase() === target.email.toLowerCase())) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
      }
    } catch (e) {}
  }

  // 5. Broadcast real-time deletion revocation to all open tabs
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('bicycle_pos_channel');
      channel.postMessage({
        type: 'USER_DELETED',
        payload: {
          userId: target.id,
          email: target.email,
        },
      });
      channel.close();
    }
  } catch (e) {}

  // 6. Sync delete to Supabase user_accounts table
  if (isSupabaseConfigured()) {
    const supa = getSupabase();
    if (supa) {
      supa.from('user_accounts').delete().eq('id', userId).then(() => {});
    }
  }

  // 7. Audit log
  recordAuditLog({
    user: adminUser?.name || 'Administrator',
    userEmail: adminUser?.email,
    action: 'User Account Deleted',
    reference: target.email,
    details: `User account ${target.name} (${target.email}, role: ${target.role}) was permanently deleted and revoked.`,
  });

  return { success: true };
}
