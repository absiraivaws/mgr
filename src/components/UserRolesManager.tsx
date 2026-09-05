import React, { useState, useEffect, useMemo } from 'react';
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
  Users,
  DollarSign,
  MessageSquare,
  Clock,
  Edit3,
  Send,
  Copy,
  RotateCcw,
  FileText,
  Timer,
  Bell,
  ChevronRight,
  CheckSquare
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
  getCurrentUser,
  setCurrentUserSession
} from '../utils/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  syncUserAccountToSupabase,
  syncAllUsersToSupabase,
  deleteUserAccountFromSupabase,
  syncRoleToSupabase,
  syncAllRolesToSupabase,
  deleteRoleFromSupabase,
  syncMessageTemplateToSupabase,
  deleteMessageTemplateFromSupabase,
  syncSettingsToSupabase,
} from '../lib/supabaseSync';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { AppSettings, MessageTemplate, MessageTemplateCategory } from '../types';
import {
  DEFAULT_MESSAGE_TEMPLATES,
  getStoredMessageTemplates,
  saveStoredMessageTemplates,
} from '../utils/customer';

interface UserRolesManagerProps {
  currentUser: UserAccount;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  settings?: AppSettings;
  onUpdateSettings?: (updated: Partial<AppSettings>) => void;
  onUserListChange?: () => void;
  onRolePermissionsChange?: () => void;
}

export const UserRolesManager: React.FC<UserRolesManagerProps> = ({
  currentUser,
  themeMode = 'dark',
  accent = 'emerald',
  settings,
  onUpdateSettings,
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
    accessDashboard: true,
    accessRentals: true,
    accessCustomers: true,
    accessMessages: true,
    accessHistory: true,
    accessUsers: false,
    accessSettings: false,
    accessIncome: false,
  });

  const t = getThemeClasses(themeMode, accent);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.email?.toLowerCase() === DEFAULT_USER.email.toLowerCase();

  // Definition of all Side Menu Tabs as rows in the matrix
  const SIDE_MENU_TABS: {
    key: keyof Pick<RolePermissionSet, 'accessDashboard' | 'accessRentals' | 'accessCustomers' | 'accessMessages' | 'accessHistory' | 'accessUsers' | 'accessSettings' | 'accessIncome'>;
    label: string;
    icon: React.ReactNode;
    badgeColor: string;
    description: string;
  }[] = [
    {
      key: 'accessDashboard',
      label: 'Dashboard',
      icon: <Sparkles className="w-4 h-4 text-violet-400" />,
      badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
      description: 'Fleet metrics, live counters, and daily revenue stats',
    },
    {
      key: 'accessRentals',
      label: 'Rental Desk',
      icon: <PlayCircle className="w-4 h-4 text-emerald-400" />,
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description: 'Start live rentals, view active fleet timers, and stop & settle',
    },
    {
      key: 'accessCustomers',
      label: 'Customers',
      icon: <Users className="w-4 h-4 text-cyan-400" />,
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      description: 'View customer registry, add & edit customer profiles, WhatsApp link',
    },
    {
      key: 'accessMessages',
      label: 'Messages',
      icon: <MessageSquare className="w-4 h-4 text-emerald-400" />,
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      description: 'Customer WhatsApp broadcast campaigns, automated alerts, templates, and message logs',
    },
    {
      key: 'accessHistory',
      label: 'History',
      icon: <History className="w-4 h-4 text-teal-400" />,
      badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
      description: 'Historical trip logs, printable receipts, and CSV export',
    },
    {
      key: 'accessUsers',
      label: 'Users & Role',
      icon: <ShieldCheck className="w-4 h-4 text-purple-400" />,
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      description: 'Manage staff accounts, assign roles, and configure permissions',
    },
    {
      key: 'accessSettings',
      label: 'Rates & Inventory',
      icon: <SettingsIcon className="w-4 h-4 text-blue-400" />,
      badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      description: 'Hourly rate plans, fleet inventory management, and shop settings',
    },
    {
      key: 'accessIncome',
      label: 'Income & Expenses',
      icon: <DollarSign className="w-4 h-4 text-amber-400" />,
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      description: 'Log and track operating expenses, income receipts, and net profit',
    },
  ];

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
    tabKey: keyof Pick<RolePermissionSet, 'accessDashboard' | 'accessRentals' | 'accessCustomers' | 'accessMessages' | 'accessHistory' | 'accessUsers' | 'accessSettings' | 'accessIncome'>
  ) => {
    if (!isAdmin) return;
    if (roleId === 'admin') {
      // Administrator always retains full access
      return;
    }

    setRolePermsState((prev) => {
      const current = prev[roleId] || {
        accessDashboard: true,
        accessRentals: true,
        accessCustomers: true,
        accessMessages: true,
        accessHistory: true,
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
      if (roleObj && isSupabaseConfigured()) {
        syncRoleToSupabase({ ...roleObj, permissions: targetPerms });
      }
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
    const updatedRolesList: RoleDefinition[] = [];
    roles.forEach((r) => {
      if (r.id !== 'admin' && rolePermsState[r.id]) {
        updateRolePermissions(r.id, rolePermsState[r.id]);
        updatedRolesList.push({ ...r, permissions: rolePermsState[r.id] });
        count++;
      } else {
        updatedRolesList.push(r);
      }
    });

    if (isSupabaseConfigured()) {
      syncAllRolesToSupabase(updatedRolesList);
    }

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
      if (res.user && isSupabaseConfigured()) {
        syncUserAccountToSupabase(res.user);
      }
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
    const allUsers = getStoredUsers();
    let updatedCount = 0;
    const newSavedMap: Record<string, boolean> = {};

    const updatedUsers = allUsers.map((u) => {
      const targetRole = selectedRoles[u.id];
      newSavedMap[u.id] = true;

      // Primary default admin cannot be demoted
      if (u.email.toLowerCase() === DEFAULT_USER.email.toLowerCase()) {
        return { ...u, role: 'admin' as const };
      }

      if (targetRole) {
        if (targetRole !== u.role) {
          updatedCount++;
        }
        return { ...u, role: targetRole };
      }
      return u;
    });

    saveStoredUsers(updatedUsers);

    // Update active session if logged in user's role changed
    const current = getCurrentUser();
    if (current) {
      const found = updatedUsers.find((u) => u.id === current.id);
      if (found) setCurrentUserSession(found);
    }

    if (isSupabaseConfigured()) {
      syncAllUsersToSupabase(updatedUsers);
    }

    setSavedUserIds(newSavedMap);
    refreshState();

    setSuccessMessage(
      updatedCount > 0
        ? `Successfully saved all user roles! (${updatedCount} role assignments updated)`
        : 'All user roles are already saved and up to date.'
    );

    setTimeout(() => {
      setSavedUserIds({});
      setSuccessMessage(null);
    }, 2500);
  };

  const handleDeleteUser = (user: UserAccount) => {
    if (user.email.toLowerCase() === DEFAULT_USER.email.toLowerCase()) {
      alert('Cannot delete root administrator account.');
      return;
    }
    if (confirm(`Are you sure you want to delete user "${user.name}" (${user.email})?`)) {
      const res = deleteUserAccount(user.id);
      if (res.success) {
        if (isSupabaseConfigured()) {
          deleteUserAccountFromSupabase(user.id);
        }
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
      if (isSupabaseConfigured()) {
        syncUserAccountToSupabase(res.user);
      }
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
        accessDashboard: roleTabAccess.accessDashboard,
        accessRentals: roleTabAccess.accessRentals,
        accessCustomers: roleTabAccess.accessCustomers,
        accessMessages: roleTabAccess.accessMessages,
        accessHistory: roleTabAccess.accessHistory,
        accessUsers: roleTabAccess.accessUsers,
        accessSettings: roleTabAccess.accessSettings,
        accessIncome: roleTabAccess.accessIncome,
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
      if (isSupabaseConfigured()) {
        syncRoleToSupabase(res.role);
      }
      setSuccessMessage(`New custom user level "${res.role.name}" created with configured active tab tick boxes!`);
      setRoleName('');
      setRoleDesc('');
      setRoleColor('teal');
      setRoleTabAccess({
        accessDashboard: true,
        accessRentals: true,
        accessCustomers: true,
        accessMessages: true,
        accessHistory: true,
        accessUsers: false,
        accessSettings: false,
        accessIncome: false,
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
        if (isSupabaseConfigured()) {
          deleteRoleFromSupabase(role.id);
        }
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

  // --- SECTION 3: MESSAGE TEMPLATES STATE & HANDLERS ---
  const [templates, setTemplates] = useState<MessageTemplate[]>(() => getStoredMessageTemplates());
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('all');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplCategory, setTmplCategory] = useState<MessageTemplateCategory>('general');
  const [tmplContent, setTmplContent] = useState('');
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const matchTemplateCategory = (tmplCat: string, filterCat: string): boolean => {
    if (filterCat === 'all') return true;
    const cat = (tmplCat || '').toLowerCase().trim();
    if (cat === filterCat) return true;

    if (filterCat === 'birthday') {
      return cat === 'birthday' || cat.includes('birthday');
    }
    if (filterCat === 'rental') {
      return cat === 'rental' || cat === 'welcome' || cat === 'return_reminder' || cat.includes('rental') || cat.includes('return') || cat.includes('start');
    }
    if (filterCat === 'reminder') {
      return cat === 'reminder' || cat === 'rental_reminder' || cat === 'payment_reminder' || cat.includes('reminder');
    }
    if (filterCat === 'marketing') {
      return (
        cat === 'marketing' ||
        cat === 'promotion' ||
        cat === 'tourist_promo' ||
        cat === 'fitness_promo' ||
        cat === 'special_offer' ||
        cat === 'holiday_greeting' ||
        cat.includes('promo') ||
        cat.includes('offer') ||
        cat.includes('greeting')
      );
    }
    if (filterCat === 'general') {
      return cat === 'general' || cat === 'thank_you' || cat === 'other';
    }
    return false;
  };

  const getCategoryBadgeDetails = (cat: string) => {
    if (matchTemplateCategory(cat, 'birthday')) {
      return { label: 'Birthday Wishes', badge: 'bg-pink-500/15 text-pink-400 border-pink-500/30' };
    }
    if (matchTemplateCategory(cat, 'rental')) {
      return { label: 'Rental Desk', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    }
    if (matchTemplateCategory(cat, 'reminder')) {
      return { label: 'Reminder', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    if (matchTemplateCategory(cat, 'marketing')) {
      return { label: 'Marketing & Promo', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    }
    return { label: 'General', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((tmpl) => matchTemplateCategory(tmpl.category, templateCategoryFilter));
  }, [templates, templateCategoryFilter]);

  const handleOpenAddTemplate = () => {
    setEditingTemplateId(null);
    setTmplTitle('');
    const defaultCat = (templateCategoryFilter !== 'all' && ['birthday', 'rental', 'reminder', 'marketing', 'general'].includes(templateCategoryFilter))
      ? (templateCategoryFilter as MessageTemplateCategory)
      : 'general';
    setTmplCategory(defaultCat);
    setTmplContent('');
    setTemplateError(null);
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: MessageTemplate) => {
    setEditingTemplateId(tmpl.id);
    setTmplTitle(tmpl.title);
    setTmplCategory(tmpl.category);
    setTmplContent(tmpl.content);
    setTemplateError(null);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplTitle.trim()) {
      setTemplateError('Template title is required');
      return;
    }
    if (!tmplContent.trim()) {
      setTemplateError('Template content cannot be empty');
      return;
    }

    let updatedList: MessageTemplate[];
    let targetTemplate: MessageTemplate;

    if (editingTemplateId) {
      targetTemplate = {
        id: editingTemplateId,
        title: tmplTitle.trim(),
        category: tmplCategory,
        content: tmplContent.trim(),
        updatedAt: Date.now(),
      };
      updatedList = templates.map((t) => (t.id === editingTemplateId ? targetTemplate : t));
    } else {
      targetTemplate = {
        id: `tmpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: tmplTitle.trim(),
        category: tmplCategory,
        content: tmplContent.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      updatedList = [targetTemplate, ...templates];
    }

    setTemplates(updatedList);
    saveStoredMessageTemplates(updatedList);
    if (isSupabaseConfigured()) {
      syncMessageTemplateToSupabase(targetTemplate);
    }

    setIsTemplateModalOpen(false);
    setTemplateSuccess(editingTemplateId ? 'Template updated successfully!' : 'New template created!');
    setTimeout(() => setTemplateSuccess(null), 3000);
  };

  const handleDeleteTemplate = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete template "${title}"?`)) {
      const updatedList = templates.filter((t) => t.id !== id);
      setTemplates(updatedList);
      saveStoredMessageTemplates(updatedList);
      if (isSupabaseConfigured()) {
        deleteMessageTemplateFromSupabase(id);
      }
      setTemplateSuccess(`Template "${title}" deleted.`);
      setTimeout(() => setTemplateSuccess(null), 2500);
    }
  };

  const handleResetDefaultTemplates = () => {
    if (confirm('Reset to standard system default message templates? Custom changes may be replaced.')) {
      setTemplates(DEFAULT_MESSAGE_TEMPLATES);
      saveStoredMessageTemplates(DEFAULT_MESSAGE_TEMPLATES);
      if (isSupabaseConfigured()) {
        DEFAULT_MESSAGE_TEMPLATES.forEach((t) => syncMessageTemplateToSupabase(t));
      }
      setTemplateSuccess('Templates reset to system defaults.');
      setTimeout(() => setTemplateSuccess(null), 3000);
    }
  };

  const handleInsertTag = (tag: string) => {
    setTmplContent((prev) => (prev ? `${prev} ${tag}` : tag));
  };

  // --- SECTION 4: AUTO-LOGOUT SETTINGS ---
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState<number>(() => settings?.autoLogoutMinutes ?? 15);
  const [autoLogoutSaved, setAutoLogoutSaved] = useState(false);

  useEffect(() => {
    if (settings?.autoLogoutMinutes !== undefined) {
      setAutoLogoutMinutes(settings.autoLogoutMinutes);
    }
  }, [settings?.autoLogoutMinutes]);

  const handleSaveAutoLogout = () => {
    if (onUpdateSettings) {
      onUpdateSettings({ autoLogoutMinutes });
    }
    if (settings && isSupabaseConfigured()) {
      syncSettingsToSupabase({ ...settings, autoLogoutMinutes });
    }
    setAutoLogoutSaved(true);
    setTimeout(() => setAutoLogoutSaved(false), 3000);
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
                Active Side Menu Tabs Access (Tick Boxes)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SIDE_MENU_TABS.map((tab) => (
                  <label key={`new-${tab.key}`} className="flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer border-slate-700 bg-slate-900/40">
                    <input
                      type="checkbox"
                      checked={Boolean(roleTabAccess[tab.key])}
                      onChange={(e) => setRoleTabAccess(prev => ({ ...prev, [tab.key]: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5">
                      {tab.icon}
                      <span>{tab.label}</span>
                    </div>
                  </label>
                ))}
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

        {/* ROLE ACCESS TICK BOX MATRIX TABLE (Columns: User Level / Role | Rows: Side Menu Tabs) */}
        <div className={`overflow-x-auto rounded-2xl border ${t.divider}`}>
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className={`${t.cardSubtleBg} uppercase font-semibold border-b ${t.divider} ${t.textMuted}`}>
              <tr>
                {/* Column 1: Row header title */}
                <th className="px-4 py-3.5 min-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-emerald-500" />
                    <span>User Role (Side Menu)</span>
                  </div>
                </th>

                {/* Subsequent Columns: Each User Level / Role */}
                {roles.map((role) => {
                  const badgeClasses = getRoleBadgeClasses(role.color);
                  const assignedUsersCount = users.filter(u => u.role === role.id).length;
                  const isRootAdmin = role.id === 'admin';
                  const isSaved = savedRoleIds[role.id];

                  return (
                    <th key={role.id} className="px-4 py-3.5 text-center min-w-[170px]">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-xl border text-xs font-bold ${badgeClasses}`}>
                            {role.name}
                          </span>
                          {!role.isSystem && isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role)}
                              className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition cursor-pointer"
                              title={`Delete ${role.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <span className={`text-[10px] font-normal normal-case ${t.textMuted} truncate max-w-[150px]`}>
                          {role.description}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-mono normal-case ${t.textMuted}`}>
                            {assignedUsersCount} active {assignedUsersCount === 1 ? 'user' : 'users'}
                          </span>
                          {!isRootAdmin && isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleSaveRolePermissions(role.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                isSaved
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : `${t.cardSubtleBg} text-emerald-400 hover:border-emerald-500/40`
                              }`}
                              title={`Save permissions for ${role.name}`}
                            >
                              {isSaved ? '✓ Saved' : 'Save'}
                            </button>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className={`divide-y ${t.divider}`}>
              {SIDE_MENU_TABS.map((tab) => (
                <tr key={tab.key} className="hover:bg-slate-500/5 transition">
                  {/* Row title: Side Menu item */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-xl border shrink-0 ${tab.badgeColor}`}>
                        {tab.icon}
                      </div>
                      <div>
                        <span className={`font-bold text-xs block ${t.textHeading}`}>
                          {tab.label}
                        </span>
                        <span className={`text-[10px] ${t.textMuted}`}>
                          {tab.description}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Columns for each User Level */}
                  {roles.map((role) => {
                    const perms = rolePermsState[role.id] || role.permissions;
                    const isRootAdmin = role.id === 'admin';
                    const isAllowed = isRootAdmin ? true : Boolean(perms[tab.key]);

                    return (
                      <td key={`${role.id}-${tab.key}`} className="px-4 py-3.5 text-center">
                        <label className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition ${
                          isAllowed
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold ring-1 ring-emerald-500/20'
                            : `${t.cardSubtleBg} ${t.divider} ${t.textMuted} opacity-40`
                        } ${!isAdmin || isRootAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                          <input
                            id={`tick-${role.id}-${tab.key}`}
                            type="checkbox"
                            disabled={!isAdmin || isRootAdmin}
                            checked={isAllowed}
                            onChange={() => handleToggleTabPermission(role.id, tab.key)}
                            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className="text-[11px] select-none">
                            {isAllowed ? 'Allowed' : 'Disabled'}
                          </span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
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

      {/* 3. SECTION 3: MESSAGE TEMPLATES (WHATSAPP & SMS) */}
      <div className={`${t.cardBg} rounded-2xl p-4 sm:p-6 border shadow-xl space-y-5`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${t.divider}`}>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                  User Accounts & Assigned Role Levels Templates
                </h2>
                <p className={`text-xs ${t.textMuted} mt-0.5`}>
                  Create, customize and manage WhatsApp & notification message templates for birthdays, rental starts, returns, and promos.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaultTemplates}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${t.inactiveTab}`}
              title="Restore standard system templates"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <button
              id="btn-add-message-template"
              type="button"
              onClick={handleOpenAddTemplate}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${t.primaryBtn}`}
            >
              <Plus className="w-4 h-4" />
              <span>+ New Template</span>
            </button>
          </div>
        </div>

        {templateSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{templateSuccess}</span>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2">
          {[
            { id: 'all', label: 'All Templates' },
            { id: 'birthday', label: '🎂 Birthday Wishes' },
            { id: 'rental', label: '🚴 Rental Desk' },
            { id: 'reminder', label: '🔔 Reminders' },
            { id: 'marketing', label: '🌟 Marketing & Promos' },
            { id: 'general', label: '💬 General' },
          ].map((tab) => {
            const isActive = templateCategoryFilter === tab.id;
            const count = tab.id === 'all'
              ? templates.length
              : templates.filter((t) => matchTemplateCategory(t.category, tab.id)).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTemplateCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  isActive ? t.activeTab : t.inactiveTab
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-slate-700/50 text-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full p-8 rounded-2xl border border-dashed border-slate-700 text-center space-y-2">
              <p className={`text-sm font-semibold ${t.textHeading}`}>
                No message templates found in this category.
              </p>
              <button
                type="button"
                onClick={handleOpenAddTemplate}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${t.primaryBtn}`}
              >
                + Create New Template
              </button>
            </div>
          ) : (
            filteredTemplates.map((tmpl) => {
              const badgeInfo = getCategoryBadgeDetails(tmpl.category);

              return (
                <div
                  key={tmpl.id}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between ${t.cardSubtleBg} hover:border-emerald-500/30`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeInfo.badge}`}>
                            {badgeInfo.label}
                          </span>
                          <h4 className={`text-sm font-bold ${t.textHeading}`}>
                            {tmpl.title}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTemplate(tmpl)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                          title="Edit Template"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tmpl.id, tmpl.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* WhatsApp Message Preview Bubble */}
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 text-slate-200 text-xs font-mono leading-relaxed whitespace-pre-wrap select-all">
                      {tmpl.content}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-700/30 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-[10px]">ID: {tmpl.id}</span>
                    <span>Last updated: {new Date(tmpl.updatedAt || tmpl.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. SECTION 4: SYSTEM AUTO-LOGOUT TIME MANAGEMENT */}
      <div className={`${t.cardBg} rounded-2xl p-4 sm:p-6 border shadow-xl space-y-4`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${t.divider}`}>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                  System Inactivity & Auto-Logout Security
                </h2>
                <p className={`text-xs ${t.textMuted} mt-0.5`}>
                  Manage when user sessions automatically lock upon inactivity. Automatically syncs across system roles and Supabase.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveAutoLogout}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${
              autoLogoutSaved ? 'bg-emerald-600 text-white' : t.primaryBtn
            }`}
          >
            {autoLogoutSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved & Active!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Auto-Logout Setting</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { value: 5, label: '5 Minutes', desc: 'High Security' },
            { value: 10, label: '10 Minutes', desc: 'Active Cashier' },
            { value: 15, label: '15 Minutes', desc: 'Recommended' },
            { value: 30, label: '30 Minutes', desc: 'Relaxed' },
            { value: 60, label: '60 Minutes', desc: '1 Hour' },
            { value: 0, label: 'Disabled', desc: 'Never Auto-Logout' },
          ].map((opt) => {
            const isSelected = autoLogoutMinutes === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAutoLogoutMinutes(opt.value)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 ring-2 ring-amber-500/20'
                    : `${t.cardSubtleBg} border-slate-700/40 text-slate-400 hover:border-slate-600`
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">{opt.label}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <span className="text-[10px] opacity-70 block">{opt.desc}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-3.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs text-slate-300 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Security Tip: </span>
            Setting auto-logout to 15 minutes prevents unauthorized rental cancellations or cash modifications when staff members step away from the counter desk.
          </div>
        </div>
      </div>

      {/* MODAL: CREATE / EDIT MESSAGE TEMPLATE */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className={`${t.cardBg} rounded-2xl max-w-xl w-full border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
            {/* Modal Header */}
            <div className={`p-5 border-b ${t.divider} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${t.textHeading}`}>
                    {editingTemplateId ? 'Edit Message Template' : 'Create New Message Template'}
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    Customize placeholders and message body
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className={`p-1.5 rounded-xl text-slate-400 hover:text-white cursor-pointer ${t.inactiveTab}`}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 overflow-y-auto">
              {templateError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{templateError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                    Template Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Birthday Special 10% Off"
                    value={tmplTitle}
                    onChange={(e) => setTmplTitle(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-medium ${t.textInput}`}
                    autoFocus
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                    Category
                  </label>
                  <select
                    value={tmplCategory}
                    onChange={(e) => setTmplCategory(e.target.value as MessageTemplateCategory)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${t.dropdownInput}`}
                  >
                    <option value="birthday">🎂 Birthday Wishes</option>
                    <option value="rental">🚴 Rental Desk</option>
                    <option value="reminder">🔔 Reminder / Notification</option>
                    <option value="marketing">🌟 Marketing & Promo</option>
                    <option value="general">💬 General</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Placeholder Tag Chips */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                  Insert Dynamic Placeholder Tag (Click to insert):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: '{customer_name}', label: 'Customer Name' },
                    { tag: '{shop_name}', label: 'Shop Name' },
                    { tag: '{phone}', label: 'Phone' },
                    { tag: '{nic_passport}', label: 'NIC / Passport' },
                    { tag: '{vehicle_name}', label: 'Vehicle Name' },
                    { tag: '{rental_number}', label: 'Rental Number' },
                    { tag: '{amount}', label: 'Amount' },
                    { tag: '{date}', label: 'Date' },
                  ].map((p) => (
                    <button
                      key={p.tag}
                      type="button"
                      onClick={() => handleInsertTag(p.tag)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer"
                    >
                      + {p.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Content */}
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                  Message Content (WhatsApp Formatted)
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder="Enter message text... You can use *bold*, _italics_, and placeholders."
                  value={tmplContent}
                  onChange={(e) => setTmplContent(e.target.value)}
                  className={`w-full rounded-xl p-3 text-xs font-mono ${t.textInput}`}
                />
              </div>

              {/* Live Preview */}
              <div>
                <span className={`block text-[11px] font-bold uppercase tracking-wider mb-1 text-emerald-400`}>
                  Live Preview:
                </span>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                  {tmplContent || <span className="text-slate-500 italic">Type message content above to see live preview...</span>}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-700/30">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${t.inactiveTab}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingTemplateId ? 'Update Template' : 'Save Template'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
