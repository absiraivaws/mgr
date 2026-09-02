/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  User, 
  Save, 
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  Tag,
  Settings,
  Sparkles,
  Shield,
  Layers,
  PlayCircle,
  History,
  Settings as SettingsIcon,
  Sliders,
  Users
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
  updateUserRoleAndDetails 
} from '../utils/auth';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface UserRolesManagerProps {
  currentUser: UserAccount;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onUserListChange?: () => void;
  onRolePermissionsChange?: () => void;
}

export const UserRolesManager: React.FC<UserRolesManagerProps> = ({
  currentUser,
  themeMode = 'dark',
  accent = 'emerald',
  onUserListChange,
  onRolePermissionsChange,
}) => {
  const [users, setUsers] = useState<UserAccount[]>(() => getStoredUsers());
  const [roles, setRoles] = useState<RoleDefinition[]>(() => getStoredRoles());
  
  // User to Role assignment state
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>(() => {
    const initial: Record<string, UserRole> = {};
    getStoredUsers().forEach((u) => {
      initial[u.id] = u.role;
    });
    return initial;
  });

  // Role Level Tab & Action Permissions state
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

  // Add User Drawer
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('cashier');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Add Role Drawer / Modal
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleColor, setRoleColor] = useState<RoleDefinition['color']>('teal');
  const [roleTabAccess, setRoleTabAccess] = useState({
    accessRentals: true,
    accessHistory: true,
    accessUsers: false,
    accessSettings: false,
  });

  const t = getThemeClasses(themeMode, accent);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.toLowerCase() === DEFAULT_USER.email.toLowerCase();

  const refreshState = () => {
    const freshUsers = getStoredUsers();
    const freshRoles = getStoredRoles();
    setUsers(freshUsers);
    setRoles(freshRoles);

    const updatedRolesMap: Record<string, UserRole> = {};
    freshUsers.forEach((u) => {
      updatedRolesMap[u.id] = u.role;
    });
    setSelectedRoles(updatedRolesMap);

    const updatedPermsMap: Record<string, RolePermissionSet> = {};
    freshRoles.forEach((r) => {
      updatedPermsMap[r.id] = { ...r.permissions };
    });
    setRolePermsState(updatedPermsMap);

    if (onUserListChange) onUserListChange();
    if (onRolePermissionsChange) onRolePermissionsChange();
  };

  // Toggle Tab Access for a Role Level (Tick box)
  const handleToggleTabPermission = (
    roleId: string, 
    tabKey: keyof Pick<RolePermissionSet, 'accessRentals' | 'accessHistory' | 'accessUsers' | 'accessSettings'>
  ) => {
    if (!isAdmin) return;
    if (roleId === 'admin') {
      // Administrator always retains full access
      return;
    }

    setRolePermsState((prev) => {
      const current = prev[roleId] || {
        accessRentals: true,
        accessHistory: true,
        accessUsers: false,
        accessSettings: false,
        canRent: true,
        canSettle: true,
        canExportReports: false,
        canEditPricing: false,
        canEditFleet: false,
        canManageUsers: false,
        canManageRoles: false,
      };

      return {
        ...prev,
        [roleId]: {
          ...current,
          [tabKey]: !current[tabKey],
        },
      };
    });

    setSavedRoleIds((prev) => ({ ...prev, [roleId]: false }));
  };

  // Save Role Level Tab Permissions
  const handleSaveRolePermissions = (roleId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetPerms = rolePermsState[roleId];
    if (!targetPerms) return;

    const res = updateRolePermissions(roleId, targetPerms);
    if (res.success) {
      setSavedRoleIds((prev) => ({ ...prev, [roleId]: true }));
      const roleObj = roles.find((r) => r.id === roleId);
      setSuccessMessage(`Access permissions for user level "${roleObj?.name || roleId}" saved successfully.`);
      refreshState();
      setTimeout(() => {
        setSavedRoleIds((prev) => ({ ...prev, [roleId]: false }));
        setSuccessMessage(null);
      }, 2500);
    } else {
      setErrorMessage(res.error || 'Failed to update role permissions.');
    }
  };

  // Save All Role Level Tab Permissions
  const handleSaveAllRolePermissions = () => {
    setErrorMessage(null);
    let count = 0;
    roles.forEach((r) => {
      if (r.id !== 'admin' && rolePermsState[r.id]) {
        updateRolePermissions(r.id, rolePermsState[r.id]);
        count++;
      }
    });

    refreshState();
    setSuccessMessage(`Updated tab access permissions for all ${count} user levels.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // User Role Assignment Tick Box
  const handleRoleCheckboxChange = (userId: string, targetRoleId: string) => {
    if (!isAdmin) return;
    setSelectedRoles((prev) => ({
      ...prev,
      [userId]: targetRoleId,
    }));
    setSavedUserIds((prev) => ({ ...prev, [userId]: false }));
  };

  const handleSaveUserRole = (userId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetRole = selectedRoles[userId];
    if (!targetRole) return;

    const res = updateUserRoleAndDetails(userId, targetRole);
    if (res.success) {
      setSavedUserIds((prev) => ({ ...prev, [userId]: true }));
      const roleObj = roles.find((r) => r.id === targetRole);
      setSuccessMessage(`User "${res.user?.name}" assigned to level "${roleObj?.name || targetRole}".`);
      refreshState();
      setTimeout(() => {
        setSavedUserIds((prev) => ({ ...prev, [userId]: false }));
        setSuccessMessage(null);
      }, 2500);
    } else {
      setErrorMessage(res.error || 'Failed to update user role.');
    }
  };

  const handleSaveAllUserRoles = () => {
    setErrorMessage(null);
    let successCount = 0;
    users.forEach((u) => {
      const targetRole = selectedRoles[u.id];
      if (targetRole && targetRole !== u.role) {
        const res = updateUserRoleAndDetails(u.id, targetRole);
        if (res.success) successCount++;
      }
    });

    refreshState();
    setSuccessMessage(`Successfully updated roles for ${successCount} user(s).`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteUser = (user: UserAccount) => {
    if (user.email.toLowerCase() === DEFAULT_USER.email.toLowerCase()) {
      alert('Cannot delete root administrator account.');
      return;
    }
    if (confirm(`Are you sure you want to delete user "${user.name}" (${user.email})?`)) {
      const res = deleteUserAccount(user.id);
      if (res.success) {
        setSuccessMessage(`User ${user.name} removed from system.`);
        refreshState();
        setTimeout(() => setSuccessMessage(null), 2500);
      } else {
        setErrorMessage(res.error || 'Failed to delete user.');
      }
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newName.trim()) {
      setErrorMessage('Please enter full name.');
      return;
    }
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    const res = await registerNewUser({
      name: newName,
      email: newEmail,
      password: newPassword,
      role: newRole,
      phone: newPhone,
    });

    if (res.success && res.user) {
      setSuccessMessage(`Staff member "${res.user.name}" registered with role "${roles.find(r => r.id === newRole)?.name || newRole}".`);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setIsAddingUser(false);
      refreshState();
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(res.error || 'Failed to create user.');
    }
  };

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!roleName.trim()) {
      setErrorMessage('Please provide a role name.');
      return;
    }

    const res = createCustomRole({
      name: roleName,
      description: roleDesc,
      color: roleColor,
      permissions: {
        accessRentals: roleTabAccess.accessRentals,
        accessHistory: roleTabAccess.accessHistory,
        accessUsers: roleTabAccess.accessUsers,
        accessSettings: roleTabAccess.accessSettings,
        canRent: roleTabAccess.accessRentals,
        canSettle: roleTabAccess.accessRentals,
        canExportReports: roleTabAccess.accessHistory,
        canEditPricing: roleTabAccess.accessSettings,
        canEditFleet: roleTabAccess.accessSettings,
        canManageUsers: roleTabAccess.accessUsers,
        canManageRoles: roleTabAccess.accessUsers,
      },
    });

    if (res.success && res.role) {
      setSuccessMessage(`New custom user level "${res.role.name}" created with configured active tab tick boxes!`);
      setRoleName('');
      setRoleDesc('');
      setRoleColor('teal');
      setRoleTabAccess({
        accessRentals: true,
        accessHistory: true,
        accessUsers: false,
        accessSettings: false,
      });
      setIsAddingRole(false);
      refreshState();
      setTimeout(() => setSuccessMessage(null), 3500);
    } else {
      setErrorMessage(res.error || 'Failed to create new user level.');
    }
  };

  const handleDeleteRole = (role: RoleDefinition) => {
    if (role.isSystem) {
      alert('System standard roles cannot be deleted.');
      return;
    }

    if (confirm(`Delete user level "${role.name}"? Any users assigned to this role will default back to "Cashier POS".`)) {
      const res = deleteCustomRole(role.id);
      if (res.success) {
        setSuccessMessage(`Role "${role.name}" deleted.`);
        refreshState();
        setTimeout(() => setSuccessMessage(null), 2500);
      } else {
        setErrorMessage(res.error || 'Failed to delete role.');
      }
    }
  };

  const getRoleBadgeClasses = (color: RoleDefinition['color']) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'blue':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'purple':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'amber':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'rose':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'teal':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'indigo':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'cyan':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. SECTION 1: ROLE LEVEL ACCESS MATRIX (MAIN TABS TICK BOXES) */}
      <div className={`${t.cardBg} rounded-2xl p-4 sm:p-6 border shadow-xl space-y-5`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${t.divider}`}>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                  User Level & Tab Access Permissions
                </h2>
                <p className={`text-xs ${t.textMuted} mt-0.5`}>
                  Configure which main tabs (<strong>Rental Desk</strong>, <strong>Daily History</strong>, <strong>User & Role</strong>, <strong>Rate & Inventory</strong>) are active for each user level using the tick boxes below.
                </p>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-save-all-tab-permissions"
                type="button"
                onClick={handleSaveAllRolePermissions}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${t.inactiveTab}`}
              >
                <Save className="w-3.5 h-3.5 text-emerald-500" />
                <span>Save All Levels</span>
              </button>

              {!isAddingRole && (
                <button
                  id="btn-open-add-role"
                  type="button"
                  onClick={() => {
                    setIsAddingRole(true);
                    setIsAddingUser(false);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-purple-500/30 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition cursor-pointer`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>+ Add Role Level</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Non-admin warning */}
        {!isAdmin && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>You are logged in with role <strong>{currentUser?.role?.toUpperCase()}</strong>. Only the root administrator (<strong>{DEFAULT_USER.email}</strong>) can modify role access tick boxes.</span>
          </div>
        )}

        {/* DRAWER: ADD NEW ROLE LEVEL */}
        {isAddingRole && isAdmin && (
          <form onSubmit={handleCreateRoleSubmit} className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${t.cardSubtleBg} border-purple-500/30`}>
            <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-400" />
                <h3 className={`font-bold text-sm ${t.textHeading}`}>
                  Create New User Role Level
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingRole(false)}
                className={`text-xs px-2 py-1 rounded-lg ${t.inactiveTab} cursor-pointer`}
              >
                ✕ Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Role Level Name</label>
                <input
                  id="input-role-name"
                  type="text"
                  required
                  placeholder="e.g. Store Manager, Supervisor"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium ${t.textInput}`}
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Role Badge Color</label>
                <select
                  id="select-role-color"
                  value={roleColor}
                  onChange={(e) => setRoleColor(e.target.value as any)}
                  className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold cursor-pointer ${t.dropdownInput}`}
                >
                  <option value="teal">Teal Cyan</option>
                  <option value="indigo">Indigo Blue</option>
                  <option value="blue">Royal Blue</option>
                  <option value="amber">Amber Gold</option>
                  <option value="rose">Rose Red</option>
                  <option value="emerald">Emerald Green</option>
                  <option value="purple">Purple Violet</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Description</label>
                <input
                  id="input-role-desc"
                  type="text"
                  placeholder="Brief role responsibilities"
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium ${t.textInput}`}
                />
              </div>
            </div>

            {/* Initial Tab Access Tick Boxes */}
            <div>
              <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${t.textMuted}`}>
                Active Main Tabs Access (Tick Boxes)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer border-slate-700 bg-slate-900/40">
                  <input
                    type="checkbox"
                    checked={roleTabAccess.accessRentals}
                    onChange={(e) => setRoleTabAccess(prev => ({ ...prev, accessRentals: e.target.checked }))}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Rental Desk</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer border-slate-700 bg-slate-900/40">
                  <input
                    type="checkbox"
                    checked={roleTabAccess.accessHistory}
                    onChange={(e) => setRoleTabAccess(prev => ({ ...prev, accessHistory: e.target.checked }))}
                    className="w-4 h-4 accent-teal-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-teal-400" />
                    <span>Daily History</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer border-slate-700 bg-slate-900/40">
                  <input
                    type="checkbox"
                    checked={roleTabAccess.accessUsers}
                    onChange={(e) => setRoleTabAccess(prev => ({ ...prev, accessUsers: e.target.checked }))}
                    className="w-4 h-4 accent-purple-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>User & Role</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer border-slate-700 bg-slate-900/40">
                  <input
                    type="checkbox"
                    checked={roleTabAccess.accessSettings}
                    onChange={(e) => setRoleTabAccess(prev => ({ ...prev, accessSettings: e.target.checked }))}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <SettingsIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Rate & Inventory</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingRole(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${t.inactiveTab}`}
              >
                Cancel
              </button>
              <button
                id="btn-submit-create-role"
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save New Role Level</span>
              </button>
            </div>
          </form>
        )}

        {/* ROLE ACCESS TICK BOX MATRIX TABLE */}
        <div className={`overflow-x-auto rounded-2xl border ${t.divider}`}>
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className={`${t.cardSubtleBg} uppercase font-semibold border-b ${t.divider} ${t.textMuted}`}>
              <tr>
                <th className="px-4 py-3.5">User Level / Role</th>
                <th className="px-3.5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Rental Desk</span>
                  </div>
                </th>
                <th className="px-3.5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-teal-400" />
                    <span>Daily History</span>
                  </div>
                </th>
                <th className="px-3.5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>User & Role</span>
                  </div>
                </th>
                <th className="px-3.5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <SettingsIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Rate & Inventory</span>
                  </div>
                </th>
                <th className="px-4 py-3.5 text-right">Active Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${t.divider}`}>
              {roles.map((role) => {
                const perms = rolePermsState[role.id] || role.permissions;
                const isRootAdmin = role.id === 'admin';
                const isSaved = savedRoleIds[role.id];
                const badgeClasses = getRoleBadgeClasses(role.color);
                const assignedUsersCount = users.filter(u => u.role === role.id).length;

                return (
                  <tr key={role.id} className="hover:bg-slate-500/5 transition">
                    {/* Role Level Name & Badge */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`px-2.5 py-1 rounded-xl border text-xs font-bold ${badgeClasses}`}>
                          {role.name}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[11px] ${t.textMuted}`}>{role.description}</span>
                          <span className={`text-[10px] font-mono ${t.textMuted}`}>
                            {assignedUsersCount} active {assignedUsersCount === 1 ? 'user' : 'users'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Tick Box: Rental Desk */}
                    <td className="px-3.5 py-3.5 text-center">
                      <label className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        perms.accessRentals
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold ring-1 ring-emerald-500/20'
                          : `${t.cardSubtleBg} ${t.divider} ${t.textMuted} opacity-40`
                      } ${!isAdmin || isRootAdmin ? 'cursor-not-allowed opacity-75' : ''}`}>
                        <input
                          id={`tick-${role.id}-rentals`}
                          type="checkbox"
                          disabled={!isAdmin || isRootAdmin}
                          checked={perms.accessRentals}
                          onChange={() => handleToggleTabPermission(role.id, 'accessRentals')}
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span>Rental Desk</span>
                      </label>
                    </td>

                    {/* Tick Box: Daily History */}
                    <td className="px-3.5 py-3.5 text-center">
                      <label className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        perms.accessHistory
                          ? 'bg-teal-500/10 text-teal-400 border-teal-500/30 font-bold ring-1 ring-teal-500/20'
                          : `${t.cardSubtleBg} ${t.divider} ${t.textMuted} opacity-40`
                      } ${!isAdmin || isRootAdmin ? 'cursor-not-allowed opacity-75' : ''}`}>
                        <input
                          id={`tick-${role.id}-history`}
                          type="checkbox"
                          disabled={!isAdmin || isRootAdmin}
                          checked={perms.accessHistory}
                          onChange={() => handleToggleTabPermission(role.id, 'accessHistory')}
                          className="w-4 h-4 accent-teal-500 rounded cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span>Daily History</span>
                      </label>
                    </td>

                    {/* Tick Box: User & Role */}
                    <td className="px-3.5 py-3.5 text-center">
                      <label className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        perms.accessUsers
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-bold ring-1 ring-purple-500/20'
                          : `${t.cardSubtleBg} ${t.divider} ${t.textMuted} opacity-40`
                      } ${!isAdmin || isRootAdmin ? 'cursor-not-allowed opacity-75' : ''}`}>
                        <input
                          id={`tick-${role.id}-users`}
                          type="checkbox"
                          disabled={!isAdmin || isRootAdmin}
                          checked={perms.accessUsers}
                          onChange={() => handleToggleTabPermission(role.id, 'accessUsers')}
                          className="w-4 h-4 accent-purple-500 rounded cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span>User & Role</span>
                      </label>
                    </td>

                    {/* Tick Box: Rate & Inventory */}
                    <td className="px-3.5 py-3.5 text-center">
                      <label className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        perms.accessSettings
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold ring-1 ring-blue-500/20'
                          : `${t.cardSubtleBg} ${t.divider} ${t.textMuted} opacity-40`
                      } ${!isAdmin || isRootAdmin ? 'cursor-not-allowed opacity-75' : ''}`}>
                        <input
                          id={`tick-${role.id}-settings`}
                          type="checkbox"
                          disabled={!isAdmin || isRootAdmin}
                          checked={perms.accessSettings}
                          onChange={() => handleToggleTabPermission(role.id, 'accessSettings')}
                          className="w-4 h-4 accent-blue-500 rounded cursor-pointer disabled:cursor-not-allowed"
                        />
                        <span>Rate & Inventory</span>
                      </label>
                    </td>

                    {/* Action: Save & Status */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isRootAdmin ? (
                          <span className="text-[10px] uppercase font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            Full Root Access
                          </span>
                        ) : isSaved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved</span>
                          </span>
                        ) : (
                          <button
                            id={`btn-save-role-access-${role.id}`}
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleSaveRolePermissions(role.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${t.primaryBtn}`}
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Level Access</span>
                          </button>
                        )}

                        {!role.isSystem && isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                            title={`Delete custom role "${role.name}"`}
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

      {/* 2. SECTION 2: USERS & ROLE ASSIGNMENT TABLE */}
      <div className={`${t.cardBg} rounded-2xl p-4 sm:p-6 border shadow-xl space-y-5`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${t.divider}`}>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                  User Accounts & Assigned Role Levels
                </h2>
                <p className={`text-xs ${t.textMuted} mt-0.5`}>
                  Assign which user belongs to which user level (e.g. Administrator, Store Manager, Cashier POS) by selecting the active tick box.
                </p>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-save-all-users"
                type="button"
                onClick={handleSaveAllUserRoles}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${t.inactiveTab}`}
              >
                <Save className="w-3.5 h-3.5 text-purple-400" />
                <span>Save All Users</span>
              </button>

              {!isAddingUser && (
                <button
                  id="btn-add-new-user"
                  type="button"
                  onClick={() => {
                    setIsAddingUser(true);
                    setIsAddingRole(false);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${t.primaryBtn}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add User</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* DRAWER: ADD USER */}
        {isAddingUser && isAdmin && (
          <form onSubmit={handleCreateUserSubmit} className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${t.cardSubtleBg} border-emerald-500/30`}>
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <h3 className={`font-bold text-sm ${t.textHeading}`}>
                  Register New System Staff / User
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className={`text-xs px-2 py-1 rounded-lg ${t.inactiveTab} cursor-pointer`}
              >
                ✕ Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Full Name</label>
                <input
                  id="input-new-user-name"
                  type="text"
                  required
                  placeholder="e.g. Samantha Perera"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium ${t.textInput}`}
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Email Address</label>
                <input
                  id="input-new-user-email"
                  type="email"
                  required
                  placeholder="staff@mannargreenride.lk"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium ${t.textInput}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Phone (Optional)</label>
                <input
                  id="input-new-user-phone"
                  type="tel"
                  placeholder="+94 77 123 4567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium ${t.textInput}`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Initial Password</label>
                <div className="relative">
                  <input
                    id="input-new-user-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full rounded-xl pl-3 pr-10 py-2 text-xs sm:text-sm font-medium ${t.textInput}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Assign User Level</label>
                <select
                  id="select-new-user-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold cursor-pointer ${t.dropdownInput}`}
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.isSystem ? '(System)' : '(Custom)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${t.inactiveTab}`}
              >
                Cancel
              </button>
              <button
                id="btn-submit-new-user"
                type="submit"
                className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Save & Register User</span>
              </button>
            </div>
          </form>
        )}

        {/* USERS TABLE WITH ROLE LEVEL TICK BOXES */}
        <div className={`overflow-x-auto rounded-2xl border ${t.divider}`}>
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className={`${t.cardSubtleBg} uppercase font-semibold border-b ${t.divider} ${t.textMuted}`}>
              <tr>
                <th className="px-4 py-3.5">User & Credentials</th>
                {roles.map((role) => (
                  <th key={role.id} className="px-3.5 py-3.5 text-center">
                    <span>{role.name}</span>
                  </th>
                ))}
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${t.divider}`}>
              {users.map((user) => {
                const assignedRole = selectedRoles[user.id] || user.role;
                const hasChanged = assignedRole !== user.role;
                const isSaved = savedUserIds[user.id];
                const isDefaultAdmin = user.email.toLowerCase() === DEFAULT_USER.email.toLowerCase();

                return (
                  <tr key={user.id} className="hover:bg-slate-500/5 transition">
                    {/* User Profile */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs ${
                          assignedRole === 'admin' ? 'bg-emerald-600' : assignedRole === 'manager' ? 'bg-blue-600' : 'bg-purple-600'
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold ${t.textHeading}`}>{user.name}</span>
                            {isDefaultAdmin && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                                Primary Root
                              </span>
                            )}
                          </div>
                          <div className={`text-[11px] font-mono ${t.textMuted} flex items-center gap-1 mt-0.5`}>
                            <Mail className="w-3 h-3 shrink-0" />
                            <span>{user.email}</span>
                            {user.phone && (
                              <>
                                <span className="opacity-40">•</span>
                                <Phone className="w-3 h-3 shrink-0" />
                                <span>{user.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role Level Tick Boxes */}
                    {roles.map((role) => {
                      const isChecked = assignedRole === role.id;
                      const isDisabled = !isAdmin || (isDefaultAdmin && role.id !== 'admin');
                      const badgeClasses = getRoleBadgeClasses(role.color);

                      return (
                        <td key={role.id} className="px-3.5 py-3.5 text-center">
                          <label className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                            isChecked 
                              ? `${badgeClasses} font-bold ring-1 ring-emerald-500/30` 
                              : `${t.cardSubtleBg} ${t.divider} ${t.textMuted} opacity-50`
                          } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <input
                              type="checkbox"
                              disabled={isDisabled}
                              checked={isChecked}
                              onChange={() => handleRoleCheckboxChange(user.id, role.id)}
                              className="w-4 h-4 rounded accent-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <span className="text-xs">{role.name}</span>
                          </label>
                        </td>
                      );
                    })}

                    {/* Save Button & User Deletion */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isSaved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved</span>
                          </span>
                        ) : (
                          <button
                            id={`btn-save-user-role-${user.id}`}
                            type="button"
                            disabled={!isAdmin || (!hasChanged && !isSaved)}
                            onClick={() => handleSaveUserRole(user.id)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                              hasChanged
                                ? `${t.primaryBtn} shadow-md ring-2 ring-emerald-500/30`
                                : `${t.inactiveTab} opacity-60 disabled:opacity-30 disabled:cursor-not-allowed`
                            }`}
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                        )}

                        {!isDefaultAdmin && isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                            title={`Delete user account for ${user.name}`}
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

    </div>
  );
};
