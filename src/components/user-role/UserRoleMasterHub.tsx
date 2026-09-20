import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Bike, 
  Car, 
  HardHat, 
  Sliders, 
  Plus, 
  Trash2, 
  Edit3, 
  Key, 
  Save, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Clock, 
  Settings as SettingsIcon, 
  DollarSign, 
  MessageSquare, 
  History, 
  FileText, 
  Layers, 
  Lock, 
  Search, 
  Compass, 
  RotateCcw, 
  Wrench, 
  Boxes, 
  UserCheck 
} from 'lucide-react';
import { 
  DEFAULT_USER, 
  RoleDefinition, 
  RolePermissionSet, 
  UserAccount, 
  UserRole, 
  createCustomRole, 
  deleteCustomRole, 
  deleteUserAccount, 
  getStoredRoles, 
  getStoredUsers, 
  registerNewUser, 
  updateRolePermissions, 
  updateUserRoleAndDetails, 
  saveStoredUsers, 
  setCurrentUserSession 
} from '../../utils/auth';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  syncUserAccountToSupabase,
  syncAllUsersToSupabase,
  deleteUserAccountFromSupabase,
  syncRoleToSupabase,
  syncAllRolesToSupabase,
  deleteRoleFromSupabase,
} from '../../lib/supabaseSync';
import { AccentColor, ThemeMode } from '../../utils/theme';
import { AppSettings } from '../../types';

export type BusinessScope = 'bicycle_pos' | 'mgr_transport' | 'prh_rental';

interface UserRoleMasterHubProps {
  currentUser: UserAccount;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  settings?: AppSettings;
  activeBusiness?: BusinessScope;
  onSelectBusiness?: (business: BusinessScope) => void;
  onUpdateSettings?: (updated: Partial<AppSettings>) => void;
  onUserListChange?: () => void;
  onRolePermissionsChange?: () => void;
  onOpenPasswordReset?: (email?: string) => void;
}

export const UserRoleMasterHub: React.FC<UserRoleMasterHubProps> = ({
  currentUser,
  themeMode = 'light',
  settings,
  activeBusiness = 'bicycle_pos',
  onUpdateSettings,
  onUserListChange,
  onRolePermissionsChange,
  onOpenPasswordReset,
}) => {
  const isLight = themeMode === 'light';

  // Crisp, high-contrast theme styling for Light & Dark mode
  // Strictly adhering to the 4-color palette: Teal/Emerald (brand), Purple (accent), Rose (destructive), Lime/Green (success)
  const styles = {
    cardBg: isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800 shadow-xl',
    cardSubtleBg: isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50',
    textHeading: isLight ? 'text-slate-900 font-extrabold' : 'text-white font-extrabold',
    textMain: isLight ? 'text-slate-800 font-semibold' : 'text-slate-200 font-semibold',
    textMuted: isLight ? 'text-slate-600 font-medium' : 'text-slate-400 font-medium',
    textSub: isLight ? 'text-slate-500 font-medium' : 'text-slate-400 font-medium',
    divider: isLight ? 'border-slate-200' : 'border-slate-700/60',
    tableHeaderBg: isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-slate-800/80 text-slate-300 border-slate-700',
    tableRowHover: isLight ? 'hover:bg-slate-50 text-slate-800' : 'hover:bg-slate-800/30 text-slate-200',
    tableBorder: isLight ? 'border-slate-200' : 'border-slate-800',
    inputBg: isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm cursor-pointer',
    secondaryBtn: isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 cursor-pointer' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer',
    purpleBadge: isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    emeraldBadge: isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };

  const [users, setUsers] = useState<UserAccount[]>(() => getStoredUsers());
  const [roles, setRoles] = useState<RoleDefinition[]>(() => getStoredRoles());

  // Filter staff users (admin, manager, cashier, custom staff roles)
  const staffUsers = useMemo(() => {
    return users.filter(u => {
      const role = (u.role || '').toLowerCase();
      return role !== 'passenger' && role !== 'owner';
    });
  }, [users]);

  // Roles available for staff assignment
  const staffRoles = useMemo(() => {
    return roles.filter(r => r.id !== 'passenger' && r.id !== 'owner');
  }, [roles]);

  // Selected roles per user
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>(() => {
    const initial: Record<string, UserRole> = {};
    getStoredUsers().forEach((u) => {
      initial[u.id] = u.role;
    });
    return initial;
  });

  // Role permissions state
  const [rolePermsState, setRolePermsState] = useState<Record<string, RolePermissionSet>>(() => {
    const initial: Record<string, RolePermissionSet> = {};
    getStoredRoles().forEach((r) => {
      initial[r.id] = { ...r.permissions };
    });
    return initial;
  });

  const [savedUserIds, setSavedUserIds] = useState<Record<string, boolean>>({});
  const [savedRoleIds, setSavedRoleIds] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Add User Modal
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('cashier');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('cashier');

  // Create Custom Role Modal
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [newRoleColor, setNewRoleColor] = useState<RoleDefinition['color']>('teal');

  const activeAccount = currentUser && currentUser.email ? currentUser : DEFAULT_USER;
  const isAdmin = activeAccount.role === 'admin';

  const refreshState = () => {
    const latestUsers = getStoredUsers();
    const latestRoles = getStoredRoles();
    setUsers(latestUsers);
    setRoles(latestRoles);

    const updatedSelectedRoles: Record<string, UserRole> = {};
    latestUsers.forEach((u) => {
      updatedSelectedRoles[u.id] = u.role;
    });
    setSelectedRoles(updatedSelectedRoles);

    const updatedRolePerms: Record<string, RolePermissionSet> = {};
    latestRoles.forEach((r) => {
      updatedRolePerms[r.id] = { ...r.permissions };
    });
    setRolePermsState(updatedRolePerms);
  };

  useEffect(() => {
    refreshState();
  }, []);

  // Business scope configuration
  const businessConfig = {
    bicycle_pos: {
      name: 'Bicycle POS',
      title: 'Bicycle POS Access Control & Permissions',
      icon: <Bike className="w-5 h-5 text-emerald-600" />,
      topMenuKey: 'accessBicyclePOS' as keyof RolePermissionSet,
      description: 'Manage staff permissions for counter desk, rental timers, bike fleet inventory, rates, and cash settlements.',
      tabs: [
        { key: 'accessDashboard' as keyof RolePermissionSet, label: 'Dashboard', desc: 'Real-time fleet counters, daily KPI charts, revenue widgets', icon: <Compass className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessRentals' as keyof RolePermissionSet, label: 'Rental Desk', desc: 'Live counter checkout, rental timers, return stop modal', icon: <Clock className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessCustomers' as keyof RolePermissionSet, label: 'Customers', desc: 'Customer directory, contact numbers, NIC, and rental history', icon: <Users className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessMessages' as keyof RolePermissionSet, label: 'Message Templates', desc: 'WhatsApp & SMS notification templates, placeholders, alerts', icon: <FileText className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessHistory' as keyof RolePermissionSet, label: 'History', desc: 'Daily completed rental records, settle receipts & audit log', icon: <History className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessSettings' as keyof RolePermissionSet, label: 'Rates & Inventory', desc: 'Bicycle fleet inventory, rates, currency & system settings', icon: <SettingsIcon className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessFinance' as keyof RolePermissionSet, label: 'Finance', desc: 'Income & expenses, cash register, P&L statement, deposits', icon: <DollarSign className="w-4 h-4 text-emerald-600" /> },
      ],
      privileges: [
        { key: 'canRent' as keyof RolePermissionSet, label: 'Start & Process Rentals', desc: 'Permit checking out bicycles and recording active timers' },
        { key: 'canSettle' as keyof RolePermissionSet, label: 'Settle Returns & Payments', desc: 'Permit returning bicycles, collecting cash/card/QR & settling balances' },
        { key: 'canExportReports' as keyof RolePermissionSet, label: 'Export Reports & Receipts', desc: 'Download CSV audit exports and print formal invoices' },
        { key: 'canEditPricing' as keyof RolePermissionSet, label: 'Edit Rates & Pricing', desc: 'Change hourly, daily, and deposit rates for vehicle types' },
        { key: 'canEditFleet' as keyof RolePermissionSet, label: 'Modify Fleet Inventory', desc: 'Add new bicycles, update serial codes, retire damaged units' },
        { key: 'canAddFinanceTransaction' as keyof RolePermissionSet, label: 'Record Finance Transactions', desc: 'Add miscellaneous revenue, shop supplies, maintenance costs' },
        { key: 'canViewPL' as keyof RolePermissionSet, label: 'View P&L & Balance Sheets', desc: 'Inspect profit & loss statements and financial breakdowns' },
      ],
    },
    mgr_transport: {
      name: 'MGR Transport',
      title: 'MGR Transport Access Control & Permissions',
      icon: <Car className="w-5 h-5 text-emerald-600" />,
      topMenuKey: 'accessMGRTransport' as keyof RolePermissionSet,
      description: 'Manage staff permissions for passenger trip requests, planned route schedules, boat charters, and fleet rosters.',
      tabs: [
        { key: 'accessMGRDashboard' as keyof RolePermissionSet, label: 'Dashboard', desc: 'Transport KPI metrics, active trips, daily booking overview', icon: <Compass className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessMGRSearch' as keyof RolePermissionSet, label: 'Find Transport', desc: 'Search available rides, scheduled buses/boats, seat picker', icon: <Search className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessMGRBookings' as keyof RolePermissionSet, label: 'Bookings & Seats', desc: 'Booked seats, passenger manifests, active ride assignments', icon: <Clock className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessMGRHistory' as keyof RolePermissionSet, label: 'History', desc: 'Complete trip history, passed and pending bookings for all users', icon: <History className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessMGRFleet' as keyof RolePermissionSet, label: 'Fleet & Listings', desc: 'Registered vehicles & boats, seat layouts, availability calendar', icon: <Car className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessMGRCustomers' as keyof RolePermissionSet, label: 'Customers (Admin)', desc: 'Directory of registered passengers (Strict Admin Only)', icon: <UserCheck className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessMGROwners' as keyof RolePermissionSet, label: 'Driver / Captain', desc: 'Owner and driver roster, license verification, assignments', icon: <Users className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessMGRSettings' as keyof RolePermissionSet, label: 'Settings & SQL', desc: 'Marketplace commission fee %, convenience rates, SQL admin', icon: <SettingsIcon className="w-4 h-4 text-emerald-600" /> },
      ],
      privileges: [
        { key: 'canEditFleet' as keyof RolePermissionSet, label: 'Manage Transport Fleet', desc: 'Add new vehicles/boats and configure seat matrices' },
        { key: 'canRent' as keyof RolePermissionSet, label: 'Accept & Confirm Bookings', desc: 'Approve charter trip requests and assign available captains' },
        { key: 'canSettle' as keyof RolePermissionSet, label: 'Collect Trip Payments', desc: 'Process LankaQR, Cash, and Card POS payments on arrival' },
        { key: 'canExportReports' as keyof RolePermissionSet, label: 'Export Transport Logs', desc: 'Download passenger manifests, trip manifests & driver reports' },
      ],
    },
    prh_rental: {
      name: 'PRH Rental Hub',
      title: 'PRH Rental Hub Access Control & Permissions',
      icon: <HardHat className="w-5 h-5 text-emerald-600" />,
      topMenuKey: 'accessPRHRental' as keyof RolePermissionSet,
      description: 'Pesalai Rental Hub: Heavy construction machinery, generator sets, tools, and contractor contracts.',
      tabs: [
        { key: 'accessPRHDashboard' as keyof RolePermissionSet, label: 'PRH Dashboard', desc: 'Equipment fleet status, utilisation rates, rental velocity', icon: <Compass className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHNewRental' as keyof RolePermissionSet, label: 'New Rental', desc: 'Heavy equipment dispatch, contractor contracts, security deposit', icon: <HardHat className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHActiveRentals' as keyof RolePermissionSet, label: 'Active Rentals', desc: 'On-hire equipment, meter reading tracking, daily rental status', icon: <Clock className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHReturns' as keyof RolePermissionSet, label: 'Returns & Inspection', desc: 'Equipment check-in, damage audit, deposit refund & deductions', icon: <RotateCcw className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHCustomers' as keyof RolePermissionSet, label: 'Customers & Contractors', desc: 'Contractor accounts, company BR numbers, credit accounts', icon: <Users className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHEquipment' as keyof RolePermissionSet, label: 'Equipment & Rates', desc: 'Machinery catalog, daily/weekly rates, operator hire pricing', icon: <Boxes className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHInventory' as keyof RolePermissionSet, label: 'Inventory / Units', desc: 'Physical machinery units, serial numbers, engine hours', icon: <Boxes className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHReservations' as keyof RolePermissionSet, label: 'Reservations', desc: 'Future contractor bookings, project advance reservations', icon: <History className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHPayments' as keyof RolePermissionSet, label: 'Payments & Deposits', desc: 'Cash, bank deposits, contractor invoices, security bonds', icon: <DollarSign className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHFinance' as keyof RolePermissionSet, label: 'PRH Finance & P&L', desc: 'Equipment rental gross margins, diesel/fuel & repair ledger', icon: <DollarSign className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHMaintenance' as keyof RolePermissionSet, label: 'Maintenance Workshop', desc: 'Scheduled service, engine oil changes, breakdown work orders', icon: <Wrench className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHReminders' as keyof RolePermissionSet, label: 'Messages / Reminders', desc: 'Due date alerts, payment reminders & maintenance notices', icon: <MessageSquare className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHReports' as keyof RolePermissionSet, label: 'Reports & Utilisation', desc: 'Asset ROI, machinery idle time, project contractor billing', icon: <FileText className="w-4 h-4 text-emerald-600" /> },
        { key: 'accessPRHSettings' as keyof RolePermissionSet, label: 'PRH Settings', desc: 'Rental terms, contractor contract templates, terms & conditions', icon: <SettingsIcon className="w-4 h-4 text-emerald-600" /> },
      ],
      privileges: [
        { key: 'canRent' as keyof RolePermissionSet, label: 'Dispatch Heavy Equipment', desc: 'Issue machinery and authorize project site handover' },
        { key: 'canSettle' as keyof RolePermissionSet, label: 'Return Check-In & Deposit Refund', desc: 'Approve machine return condition and release contractor deposit' },
        { key: 'canEditFleet' as keyof RolePermissionSet, label: 'Manage Machinery Fleet', desc: 'Register heavy equipment, log serials and engine hour meters' },
        { key: 'canEditPricing' as keyof RolePermissionSet, label: 'Set Equipment Rates', desc: 'Update contractor hourly, daily, and monthly project rates' },
        { key: 'canExportReports' as keyof RolePermissionSet, label: 'Export PRH Reports', desc: 'Generate contractor statements, machinery maintenance and P&L' },
      ],
    },
  };

  const currentBusinessConfig = businessConfig[activeBusiness];

  // Toggle Top Menu Access for a role
  const handleToggleTopMenuAccess = (roleId: string, business: BusinessScope) => {
    if (!isAdmin || roleId === 'admin') return;

    const targetKey = businessConfig[business].topMenuKey;
    setRolePermsState((prev) => {
      const current = prev[roleId] || roles.find(r => r.id === roleId)?.permissions;
      if (!current) return prev;
      const nextVal = !Boolean(current[targetKey]);
      return {
        ...prev,
        [roleId]: {
          ...current,
          [targetKey]: nextVal,
        },
      };
    });
    setSavedRoleIds((prev) => ({ ...prev, [roleId]: false }));
  };

  // Toggle Side Menu Tab Access for a role
  const handleToggleTabPermission = (roleId: string, tabKey: keyof RolePermissionSet) => {
    if (!isAdmin || roleId === 'admin') return;

    setRolePermsState((prev) => {
      const current = prev[roleId] || roles.find(r => r.id === roleId)?.permissions;
      if (!current) return prev;

      const nextVal = !Boolean(current[tabKey]);
      const updated: RolePermissionSet = {
        ...current,
        [tabKey]: nextVal,
      };

      if (tabKey === 'accessFinance') {
        updated.accessIncome = nextVal;
      } else if (tabKey === 'accessIncome') {
        updated.accessFinance = nextVal;
      }

      return {
        ...prev,
        [roleId]: updated,
      };
    });
    setSavedRoleIds((prev) => ({ ...prev, [roleId]: false }));
  };

  // Toggle Operational Privilege
  const handleTogglePrivilege = (roleId: string, privKey: keyof RolePermissionSet) => {
    if (!isAdmin || roleId === 'admin') return;

    setRolePermsState((prev) => {
      const current = prev[roleId] || roles.find(r => r.id === roleId)?.permissions;
      if (!current) return prev;

      return {
        ...prev,
        [roleId]: {
          ...current,
          [privKey]: !Boolean(current[privKey]),
        },
      };
    });
    setSavedRoleIds((prev) => ({ ...prev, [roleId]: false }));
  };

  // Save Single Role
  const handleSaveRole = async (roleId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const roleObj = roles.find((r) => r.id === roleId);
    if (!roleObj) return;

    const targetPerms = rolePermsState[roleId] || roleObj.permissions;
    const updatedRole: RoleDefinition = { ...roleObj, permissions: targetPerms };

    if (isSupabaseConfigured()) {
      const syncRes = await syncRoleToSupabase(updatedRole);
      if (!syncRes.success) {
        setErrorMessage(`Failed to save permissions to Supabase: ${syncRes.error || 'Unknown error'}`);
        return;
      }
    }

    const res = updateRolePermissions(roleId, targetPerms);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to update role permissions.');
      return;
    }

    setSavedRoleIds((prev) => ({ ...prev, [roleId]: true }));
    refreshState();
    onRolePermissionsChange?.();
    setSuccessMessage(`Permissions for role "${roleObj.name}" saved successfully!`);
    setTimeout(() => {
      setSavedRoleIds((prev) => ({ ...prev, [roleId]: false }));
      setSuccessMessage(null);
    }, 3000);
  };

  // Save All Roles
  const handleSaveAllRoles = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const updatedRolesList: RoleDefinition[] = [];
    roles.forEach((r) => {
      if (rolePermsState[r.id]) {
        updatedRolesList.push({ ...r, permissions: rolePermsState[r.id] });
      } else {
        updatedRolesList.push(r);
      }
    });

    if (isSupabaseConfigured()) {
      const syncRes = await syncAllRolesToSupabase(updatedRolesList);
      if (!syncRes.success) {
        setErrorMessage(`Failed to save roles to Supabase: ${syncRes.error || 'Database error'}`);
        return;
      }
    }

    roles.forEach((r) => {
      if (rolePermsState[r.id]) {
        updateRolePermissions(r.id, rolePermsState[r.id]);
      }
    });

    refreshState();
    onRolePermissionsChange?.();
    setSuccessMessage(`All role permissions and access matrices updated successfully.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // User Role Assignment
  const handleRoleSelection = (userId: string, targetRoleId: string) => {
    if (!isAdmin) return;
    setSelectedRoles((prev) => ({
      ...prev,
      [userId]: targetRoleId,
    }));
    setSavedUserIds((prev) => ({ ...prev, [userId]: false }));
  };

  // Save Single User Role Assignment
  const handleSaveUserRole = async (userId: string) => {
    const targetRoleId = selectedRoles[userId];
    if (!targetRoleId) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const userObj = users.find((u) => u.id === userId);
    if (!userObj) return;

    const updatedUser: UserAccount = { ...userObj, role: targetRoleId };

    if (isSupabaseConfigured()) {
      const syncRes = await syncUserAccountToSupabase(updatedUser);
      if (!syncRes.success) {
        setErrorMessage(`Failed to sync user to Supabase: ${syncRes.error || 'Unknown error'}`);
        return;
      }
    }

    const res = updateUserRoleAndDetails(userId, targetRoleId);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to update user role.');
      return;
    }

    if (currentUser.id === userId || currentUser.email.toLowerCase() === userObj.email.toLowerCase()) {
      setCurrentUserSession(updatedUser);
    }

    setSavedUserIds((prev) => ({ ...prev, [userId]: true }));
    refreshState();
    onUserListChange?.();
    onRolePermissionsChange?.();

    const roleName = roles.find((r) => r.id === targetRoleId)?.name || targetRoleId;
    setSuccessMessage(`User "${userObj.name}" assigned to "${roleName}".`);
    setTimeout(() => {
      setSavedUserIds((prev) => ({ ...prev, [userId]: false }));
      setSuccessMessage(null);
    }, 2500);
  };

  // Save All Users
  const handleSaveAllUsers = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const updatedUsers = users.map((u) => {
      const newRole = selectedRoles[u.id];
      if (newRole && newRole !== u.role) {
        return { ...u, role: newRole };
      }
      return u;
    });

    if (isSupabaseConfigured()) {
      const syncRes = await syncAllUsersToSupabase(updatedUsers);
      if (!syncRes.success) {
        setErrorMessage(`Failed to save users to Supabase: ${syncRes.error || 'Database error'}`);
        return;
      }
    }

    saveStoredUsers(updatedUsers);
    refreshState();
    onUserListChange?.();
    setSuccessMessage(`All user accounts and role assignments updated successfully.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Quick switch active role for testing
  const handleSwitchActiveRole = async (targetRoleId: string) => {
    const targetRoleObj = roles.find((r) => r.id === targetRoleId);
    if (!targetRoleObj) return;

    const allUsers = getStoredUsers();
    const userMatch = allUsers.find(
      (u) => u.id === activeAccount.id || u.email.toLowerCase() === activeAccount.email.toLowerCase()
    ) || activeAccount;

    const updatedUser: UserAccount = { ...userMatch, role: targetRoleId };

    if (isSupabaseConfigured()) {
      await syncUserAccountToSupabase(updatedUser);
    }

    updateUserRoleAndDetails(userMatch.id, targetRoleId);
    setCurrentUserSession(updatedUser);
    setSelectedRoles((prev) => ({ ...prev, [userMatch.id]: targetRoleId }));

    refreshState();
    onUserListChange?.();
    onRolePermissionsChange?.();

    setSuccessMessage(`Switched active role to "${targetRoleObj.name}". Permissions refreshed!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Add User Submit
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = await registerNewUser({
      name: newName,
      email: newEmail,
      phone: newPhone,
      password: newPassword,
      role: newRole,
    });

    if (!res.success || !res.user) {
      setErrorMessage(res.error || 'Failed to create user.');
      return;
    }

    if (isSupabaseConfigured()) {
      await syncUserAccountToSupabase(res.user);
    }

    setIsAddingUser(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('');
    setNewRole('cashier');

    refreshState();
    onUserListChange?.();
    setSuccessMessage(`Staff user "${res.user.name}" created successfully.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Edit User
  const handleOpenEditUser = (user: UserAccount) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPhone(user.phone || '');
    setEditRole(user.role);
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedUser: UserAccount = {
      ...editingUser,
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      role: editRole,
    };

    if (isSupabaseConfigured()) {
      await syncUserAccountToSupabase(updatedUser);
    }

    const allUsers = getStoredUsers();
    const nextList = allUsers.map((u) => (u.id === editingUser.id ? updatedUser : u));
    saveStoredUsers(nextList);

    if (currentUser.id === editingUser.id) {
      setCurrentUserSession(updatedUser);
    }

    setEditingUser(null);
    refreshState();
    onUserListChange?.();
    setSuccessMessage(`User "${updatedUser.name}" updated successfully.`);
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // Delete User
  const handleDeleteUserClick = async (user: UserAccount) => {
    if (user.id === activeAccount.id || user.email.toLowerCase() === DEFAULT_USER.email.toLowerCase()) {
      alert('Cannot delete the root administrator account.');
      return;
    }

    if (confirm(`Are you sure you want to permanently delete user "${user.name}" (${user.email})?`)) {
      if (isSupabaseConfigured()) {
        await deleteUserAccountFromSupabase(user.id);
      }
      deleteUserAccount(user.id);
      refreshState();
      onUserListChange?.();
      setSuccessMessage(`User "${user.name}" removed.`);
      setTimeout(() => setSuccessMessage(null), 2500);
    }
  };

  // Create Custom Role
  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const res = createCustomRole({
      name: newRoleName.trim(),
      description: newRoleDescription.trim(),
      color: newRoleColor,
    });

    if (!res.success || !res.role) {
      setErrorMessage(res.error || 'Failed to create role.');
      return;
    }

    if (isSupabaseConfigured()) {
      await syncRoleToSupabase(res.role);
    }

    setIsCreatingRole(false);
    setNewRoleName('');
    setNewRoleDescription('');
    setNewRoleColor('teal');

    refreshState();
    onRolePermissionsChange?.();
    setSuccessMessage(`Custom role "${res.role.name}" created successfully.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-150">
      {/* 1. MASTER HEADER WITH ACTIVE BUSINESS TITLE */}
      <div className={`${styles.cardBg} rounded-2xl p-5 sm:p-6 border relative overflow-hidden`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${styles.purpleBadge}`}>
              <ShieldCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-lg sm:text-xl font-extrabold tracking-tight ${styles.textHeading}`}>
                  {currentBusinessConfig.title}
                </h1>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${styles.purpleBadge}`}>
                  Admin Console
                </span>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${styles.emeraldBadge}`}>
                  {currentBusinessConfig.name}
                </span>
              </div>
              <p className={`text-xs ${styles.textMuted} mt-1 leading-relaxed`}>
                {currentBusinessConfig.description}
              </p>
            </div>
          </div>

          {/* Quick Active Role Switcher for Admin Live Testing */}
          <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-auto">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${styles.textSub}`}>
              Active Role:
            </span>
            {staffRoles.map((r) => {
              const isActive = activeAccount.role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSwitchActiveRole(r.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer border ${
                    isActive
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : `${styles.cardSubtleBg} ${styles.textMuted} hover:${styles.textHeading}`
                  }`}
                  title={`Switch current session to ${r.name}`}
                >
                  {isActive && <Check className="w-3 h-3" />}
                  <span>{r.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Alerts (Strict 4-color theme: Green for Success, Rose for Errors) */}
        {successMessage && (
          <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 border ${styles.emeraldBadge} animate-in fade-in`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-xs">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold">{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 2. SECTION 1: TOP/MAIN MENU SWITCHER ACCESS */}
      <div className={`${styles.cardBg} rounded-2xl p-5 border space-y-4`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${styles.divider}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${styles.emeraldBadge}`}>
              <Layers className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className={`text-base font-bold ${styles.textHeading}`}>
                1. Top/Main Menu Switcher Access — {currentBusinessConfig.name}
              </h2>
              <p className={`text-xs ${styles.textMuted}`}>
                Control whether {currentBusinessConfig.name} is accessible in the top navigation bar for each staff role.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {staffRoles.map((role) => {
            const isRoleAdmin = role.id === 'admin';
            const rolePerms = rolePermsState[role.id] || role.permissions;
            const isAllowed = isRoleAdmin || Boolean(rolePerms[currentBusinessConfig.topMenuKey]);

            return (
              <div
                key={role.id}
                onClick={() => !isRoleAdmin && handleToggleTopMenuAccess(role.id, activeBusiness)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  isAllowed
                    ? (isLight
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                        : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold')
                    : `${styles.cardSubtleBg} ${styles.textMuted} hover:border-slate-400`
                } ${isRoleAdmin ? 'opacity-90 cursor-not-allowed' : ''}`}
              >
                <div>
                  <span className={`text-xs block ${isAllowed ? (isLight ? 'text-emerald-950 font-extrabold' : 'text-emerald-200 font-bold') : styles.textMain}`}>
                    {role.name}
                  </span>
                  <span className={`text-[10px] block mt-0.5 ${isAllowed ? (isLight ? 'text-emerald-700' : 'text-emerald-400') : styles.textSub}`}>
                    {isAllowed ? 'Visible in Top Switcher' : 'Hidden from Top Switcher'}
                  </span>
                </div>
                {isRoleAdmin ? (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                    <Lock className="w-3 h-3" />
                    <span>Permanent</span>
                  </div>
                ) : (
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                    isAllowed
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isLight ? 'border-slate-300 bg-white' : 'border-slate-600 bg-slate-800'
                  }`}>
                    {isAllowed && <Check className="w-3.5 h-3.5 font-bold" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SECTION 2: SIDE-MENU ACCESS MATRIX (TICK BOXES) */}
      <div className={`${styles.cardBg} rounded-2xl p-5 sm:p-6 border space-y-5`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${styles.divider}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${styles.emeraldBadge}`}>
              <Sliders className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold tracking-tight ${styles.textHeading}`}>
                2. Side-Menu Tab Access Matrix — {currentBusinessConfig.name}
              </h2>
              <p className={`text-xs ${styles.textMuted} mt-0.5`}>
                Tick each box to allow or restrict side-menu access for specific user roles.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAllRoles}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${styles.primaryBtn}`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save All Roles</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingRole(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${styles.secondaryBtn}`}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Custom Role</span>
            </button>
          </div>
        </div>

        {/* Table Matrix */}
        <div className={`overflow-x-auto rounded-xl border ${styles.tableBorder}`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${styles.tableHeaderBg}`}>
                <th className="py-3 px-4 min-w-[220px]">
                  Side-Menu Tab
                </th>
                {staffRoles.map((role) => (
                  <th key={role.id} className="py-3 px-4 text-center min-w-[130px]">
                    <div className="flex flex-col items-center">
                      <span className="font-bold">{role.name}</span>
                      <span className={`text-[9px] font-medium ${styles.textSub}`}>
                        {role.id === 'admin' ? '(Locked Full)' : role.isSystem ? '(System)' : '(Custom)'}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${styles.tableBorder}`}>
              {currentBusinessConfig.tabs.map((tab) => (
                <tr key={tab.key} className={`transition ${styles.tableRowHover}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg border shrink-0 ${styles.cardSubtleBg}`}>
                        {tab.icon}
                      </div>
                      <div>
                        <span className={`font-bold text-xs block ${styles.textHeading}`}>{tab.label}</span>
                        <span className={`text-[11px] leading-tight block ${styles.textMuted}`}>{tab.desc}</span>
                      </div>
                    </div>
                  </td>
                  {staffRoles.map((role) => {
                    const isRoleAdmin = role.id === 'admin';
                    const rolePerms = rolePermsState[role.id] || role.permissions;
                    const isChecked = isRoleAdmin || Boolean(rolePerms[tab.key]);

                    return (
                      <td key={role.id} className="py-3 px-4 text-center">
                        {isRoleAdmin ? (
                          <div className={`inline-flex items-center justify-center w-6 h-6 rounded-md border ${styles.emeraldBadge}`} title="Administrator retains permanent access">
                            <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleTabPermission(role.id, tab.key)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition cursor-pointer mx-auto ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                                : isLight
                                ? 'border-slate-300 bg-white hover:border-slate-400'
                                : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                            }`}
                            title={`Toggle ${tab.label} for ${role.name}`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 font-bold" />}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Row of Save Role Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className={`text-xs ${styles.textMuted}`}>
            Tick box modifications take effect immediately upon clicking Save.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {staffRoles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSaveRole(role.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                  savedRoleIds[role.id]
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : styles.secondaryBtn
                }`}
              >
                {savedRoleIds[role.id] ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3 text-purple-600" />}
                <span>Save {role.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. SECTION 3: OPERATIONAL PRIVILEGES */}
      <div className={`${styles.cardBg} rounded-2xl p-5 border space-y-4`}>
        <div className={`flex items-center gap-2.5 pb-3 border-b ${styles.divider}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${styles.purpleBadge}`}>
            <Lock className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h2 className={`text-base font-bold ${styles.textHeading}`}>
              3. Operational Privileges & Action Levels — {currentBusinessConfig.name}
            </h2>
            <p className={`text-xs ${styles.textMuted}`}>
              Configure functional action privileges (rental creation, settlement, pricing edits, and report exports) per role.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentBusinessConfig.privileges.map((priv) => (
            <div
              key={priv.key}
              className={`p-3.5 rounded-xl border flex flex-col justify-between ${styles.cardSubtleBg}`}
            >
              <div className="mb-2.5">
                <span className={`font-bold text-xs block ${styles.textHeading}`}>{priv.label}</span>
                <span className={`text-[11px] leading-tight block mt-0.5 ${styles.textMuted}`}>{priv.desc}</span>
              </div>

              <div className={`flex flex-wrap items-center gap-1.5 pt-2 border-t ${styles.divider}`}>
                {staffRoles.map((role) => {
                  const isRoleAdmin = role.id === 'admin';
                  const rolePerms = rolePermsState[role.id] || role.permissions;
                  const isAllowed = isRoleAdmin || Boolean(rolePerms[priv.key]);

                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => !isRoleAdmin && handleTogglePrivilege(role.id, priv.key)}
                      disabled={isRoleAdmin}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 border ${
                        isAllowed
                          ? (isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40')
                          : (isLight ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-800 text-slate-500 border-slate-700')
                      } ${isRoleAdmin ? 'cursor-not-allowed opacity-85' : 'cursor-pointer'}`}
                      title={`${role.name}: ${isAllowed ? 'Allowed' : 'Disallowed'}`}
                    >
                      <span>{role.name}</span>
                      {isAllowed && <Check className="w-2.5 h-2.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. SECTION 4: USER ACCOUNTS & ASSIGNED ROLE LEVELS */}
      <div className={`${styles.cardBg} rounded-2xl p-5 sm:p-6 border space-y-5`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${styles.divider}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${styles.purpleBadge}`}>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold tracking-tight ${styles.textHeading}`}>
                4. User Accounts & Assigned Role Levels
              </h2>
              <p className={`text-xs ${styles.textMuted} mt-0.5`}>
                Assign staff members to roles (Administrator, Store Manager, Cashier POS, or Custom Roles).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAllUsers}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${styles.primaryBtn}`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save All Users</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingUser(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${styles.secondaryBtn}`}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Add Staff User</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className={`overflow-x-auto rounded-xl border ${styles.tableBorder}`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${styles.tableHeaderBg}`}>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${styles.tableBorder}`}>
              {staffUsers.map((u) => {
                const currentRole = selectedRoles[u.id] || u.role;
                const isRoot = u.email.toLowerCase() === DEFAULT_USER.email.toLowerCase() || u.email.toLowerCase() === 'absiraiva@gmail.com';
                const initials = u.name
                  ? u.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                  : 'U';

                return (
                  <tr key={u.id} className={`transition ${styles.tableRowHover}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div>
                          <span className={`font-bold text-xs block ${styles.textHeading}`}>{u.name}</span>
                          <span className={`text-[11px] block ${styles.textMuted}`}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`py-3 px-4 ${styles.textMain}`}>
                      {u.phone || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={currentRole}
                        onChange={(e) => handleRoleSelection(u.id, e.target.value)}
                        disabled={isRoot}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold border ${styles.inputBg}`}
                      >
                        {staffRoles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${styles.emeraldBadge}`}>
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Save User */}
                        <button
                          type="button"
                          onClick={() => handleSaveUserRole(u.id)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            savedUserIds[u.id]
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : `${styles.secondaryBtn}`
                          }`}
                          title="Save Assigned Role"
                        >
                          {savedUserIds[u.id] ? <Check className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5 text-purple-600" />}
                        </button>

                        {/* Edit User */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${styles.secondaryBtn}`}
                          title="Edit User Details"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        </button>

                        {/* Password Reset */}
                        {onOpenPasswordReset && (
                          <button
                            type="button"
                            onClick={() => onOpenPasswordReset(u.email)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${styles.secondaryBtn}`}
                            title="Send Password Reset"
                          >
                            <Key className="w-3.5 h-3.5 text-purple-600" />
                          </button>
                        )}

                        {/* Delete User */}
                        {!isRoot && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUserClick(u)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-slate-300 transition cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD STAFF USER */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`${styles.cardBg} rounded-2xl max-w-md w-full border shadow-2xl overflow-hidden`}>
            <div className={`p-5 border-b ${styles.divider} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${styles.emeraldBadge}`}>
                  <Plus className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${styles.textHeading}`}>Add New Staff User</h3>
                  <p className={`text-xs ${styles.textMuted}`}>Create user credentials & assign role</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-5 space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1 ${styles.textHeading}`}>Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Silva"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-medium border ${styles.inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${styles.textHeading}`}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. staff@company.lk"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-medium border ${styles.inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${styles.textHeading}`}>Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="e.g. +94 77 123 4567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-medium border ${styles.inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${styles.textHeading}`}>Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-bold border ${styles.inputBg}`}
                >
                  {staffRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${styles.textHeading}`}>Initial Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-medium border ${styles.inputBg} pr-9`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${styles.divider}`}>
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${styles.secondaryBtn}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${styles.primaryBtn}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`${styles.cardBg} rounded-2xl max-w-md w-full border shadow-2xl overflow-hidden`}>
            <div className={`p-5 border-b ${styles.divider} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${styles.purpleBadge}`}>
                  <Edit3 className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${styles.textHeading}`}>Edit Staff User</h3>
                  <p className={`text-xs ${styles.textMuted}`}>{editingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="p-5 space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1 ${styles.textHeading}`}>Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-medium border ${styles.inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${styles.textHeading}`}>Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-medium border ${styles.inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${styles.textHeading}`}>Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-medium border ${styles.inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${styles.textHeading}`}>Assigned Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-bold border ${styles.inputBg}`}
                >
                  {staffRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${styles.divider}`}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${styles.secondaryBtn}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${styles.primaryBtn}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOM ROLE */}
      {isCreatingRole && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`${styles.cardBg} rounded-2xl max-w-md w-full border shadow-2xl overflow-hidden`}>
            <div className={`p-5 border-b ${styles.divider} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${styles.emeraldBadge}`}>
                  <Plus className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${styles.textHeading}`}>Create Custom Staff Role</h3>
                  <p className={`text-xs ${styles.textMuted}`}>Define custom operational roles & levels</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingRole(false)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoleSubmit} className="p-5 space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1 ${styles.textHeading}`}>Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Workshop Supervisor"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-medium border ${styles.inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${styles.textHeading}`}>Description</label>
                <textarea
                  rows={2}
                  placeholder="Responsibilities & access scope..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-medium border ${styles.inputBg}`}
                />
              </div>

              <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${styles.divider}`}>
                <button
                  type="button"
                  onClick={() => setIsCreatingRole(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${styles.secondaryBtn}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${styles.primaryBtn}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Role</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
