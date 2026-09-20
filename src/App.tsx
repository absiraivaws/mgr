/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bike, 
  Settings as SettingsIcon, 
  History, 
  PlayCircle, 
  User, 
  Clock, 
  Calendar,
  DollarSign, 
  Layers,
  Sun,
  Moon,
  Palette,
  ChevronDown,
  ShieldCheck,
  LogOut,
  UserCheck,
  LogIn,
  Menu,
  Sparkles,
  TrendingUp,
  BarChart3,
  Activity,
  Zap,
  MessageCircle,
  Settings as Settings2,
  Folder,
  FolderOpen,
  Image,
  Shield,
  Microscope,
  BarChart,
  Clipboard,
  CalendarDays,
  MessageSquare,
  Tag,
} from 'lucide-react';
import { 
  INITIAL_CUSTOMERS,
  INITIAL_COMPLETED_RENTALS,
  INITIAL_SETTINGS, 
  INITIAL_VEHICLES,
  INITIAL_VEHICLE_TYPES 
} from './data/initialData';
import { AppSettings, Customer, CustomerGroup, IncomeEntry, MessageHistoryEntry, MessageTemplate, RentalRecord, Vehicle, VehicleType } from './types';
import { Navbar, NavTabType } from './components/Navbar';
import { StartRentalCard } from './components/StartRentalCard';
import { ActiveRentalsList } from './components/ActiveRentalsList';
import { StopRentalModal } from './components/StopRentalModal';
import { SettingsPanel } from './components/SettingsPanel';
import { RentalHistoryPanel } from './components/RentalHistoryPanel';
import { UserRolesManager } from './components/UserRolesManager';
import { DashboardStats } from './components/DashboardStats';
import { IncomeExpensesPanel } from './components/IncomeExpensesPanel';
import { FinancePanel } from './components/FinancePanel';
import { recordAuditLog } from './utils/audit';
import { CustomerManagementPanel } from './components/CustomerManagementPanel';
import { CustomerMessagingTab } from './components/CustomerMessagingTab';
import { CustomerGroupsModal } from './components/CustomerGroupsModal';
import { AuthModal } from './components/AuthModal';
import { PasswordResetModal } from './components/PasswordResetModal';
import { LoginPage } from './components/LoginPage';
import { 
  fetchSupabaseData, 
  subscribeToSupabaseRealtime,
  syncCustomerToSupabase, 
  deleteCustomerFromSupabase,
  syncRentalToSupabase, 
  syncVehicleToSupabase,
  syncVehicleTypeToSupabase,
  deleteVehicleTypeFromSupabase,
  deleteVehicleFromSupabase,
  syncIncomeEntryToSupabase,
  syncSettingsToSupabase,
  syncAllRolesToSupabase,
  fetchIncomeEntries,
  deleteIncomeEntryFromSupabase,
  deleteRentalFromSupabase,
  fetchMessageTemplatesFromSupabase,
} from './lib/supabaseSync';
import { getStoredMessageTemplates, saveStoredMessageTemplates, getStoredCustomerGroups, saveStoredCustomerGroups, getStoredMessageHistory, saveStoredMessageHistory, DEFAULT_MESSAGE_TEMPLATES } from './utils/customer';
import { getNextRentalNumber, formatRentalNumber } from './utils/pricing';
import { isSupabaseConfigured, getSupabase } from './lib/supabase';
import { MGRBookingHub } from './components/mgr-booking/MGRBookingHub';
import { MGRTabType } from './types/mgrBooking';
import { PRHHub } from './components/prh/PRHHub';
import { PRHTabType } from './types/prhTypes';
import {
  buildRolePath,
  DEFAULT_TAB_BY_PERSONA,
  navigate,
  ParsedRolePath,
  parseRolePath,
  RolePersona,
  sanitizeMGRTabForPersona,
  useRoleRouting,
} from './utils/roleRouting';

function sanitizeRentalRecordNumber(r: RentalRecord): RentalRecord {
  if (!r || !r.rentalNumber) return r;
  let rn = String(r.rentalNumber).trim();
  if (/^[A-Z0-9]+-\d{7}$/i.test(rn)) {
    return { ...r, rentalNumber: rn.toUpperCase() };
  }
  if (rn === 'REN-101' || rn === '101' || rn === 'REN-156' || rn === '156') rn = 'REN-0000001';
  else if (rn === 'REN-102' || rn === '102') rn = 'REN-0000002';
  else if (rn === 'REN-103' || rn === '103') rn = 'REN-0000003';
  else {
    const matches = rn.match(/\d+/g);
    if (matches && matches.length > 0) {
      const num = parseInt(matches[matches.length - 1], 10);
      if (!isNaN(num)) {
        rn = formatRentalNumber(num);
      }
    }
  }
  return { ...r, rentalNumber: rn };
}
import { 
  AccentColor, 
  ThemeMode, 
  getSavedAccent, 
  getSavedTheme, 
  getThemeClasses, 
  saveAccent, 
  saveTheme 
} from './utils/theme';
import { 
  DEFAULT_USER, 
  MGR_INITIAL_ACCOUNTS,
  UserAccount, 
  getCurrentUser, 
  setCurrentUserSession,
  getStoredUsers,
  getStoredRoles,
  saveStoredUsers,
  saveStoredRoles,
  getMGRPersona,
  logoutUser,
  getUserPermissions,
  hasPermission
} from './utils/auth';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTabType>(() => {
    try {
      const saved = localStorage.getItem('v_rental_active_tab');
      return (saved as NavTabType) || 'rentals';
    } catch {
      return 'rentals';
    }
  });

  // System Mode (Bicycle Rental POS vs MGR Transport Booking Marketplace vs PRH Rental Hub)
  const [systemMode, setSystemMode] = useState<'bicycle_pos' | 'mgr_booking' | 'prh_rental'>(() => {
    try {
      if (parseRolePath(window.location.pathname).persona) {
        return 'mgr_booking';
      }
      const saved = localStorage.getItem('mgr_system_mode');
      return (saved as any) || 'bicycle_pos';
    } catch {
      return 'bicycle_pos';
    }
  });
  const [mgrActiveTab, setMgrActiveTab] = useState<MGRTabType>(() => {
    const parsed = parseRolePath(typeof window !== 'undefined' ? window.location.pathname : '/');
    if (parsed.tab) return parsed.tab;
    if (parsed.persona) return DEFAULT_TAB_BY_PERSONA[parsed.persona];
    return 'mgr-search';
  });
  const [prhActiveTab, setPrhActiveTab] = useState<PRHTabType>('prh-dashboard');

  // URL routing state (role paths: /passenger, /owner, /admin + nested tab slugs)
  const [route, setRoute] = useState<ParsedRolePath>(() =>
    parseRolePath(typeof window !== 'undefined' ? window.location.pathname : '/')
  );

  // Marks the next route change as coming from browser back/forward so state follows the URL
  const popNavRef = useRef(false);

  const go = useCallback((path: string, options: { replace?: boolean } = {}) => {
    navigate(path, options);
    setRoute(parseRolePath(path));
  }, []);

  useRoleRouting(
    useCallback((parsed: ParsedRolePath) => {
      popNavRef.current = true;
      setRoute(parsed);
    }, [])
  );


  // Authenticated User Session - Always require login on page refresh or direct link open
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFullLoginPage, setIsFullLoginPage] = useState<boolean>(true);

  const activeUser = currentUser || DEFAULT_USER;
  const userPersona = getMGRPersona(activeUser);
  const isPassenger = userPersona === 'passenger';
  const isOwner = userPersona === 'owner';
  const isMGRTransportAdmin = (activeUser.email || '').toLowerCase() === 'admin@mannargreenride.lk';
  const rolePersona: RolePersona | null = isPassenger
    ? 'passenger'
    : isOwner
      ? 'owner'
      : isMGRTransportAdmin
        ? 'admin'
        : null;

  const handleToggleSystemMode = (mode: 'bicycle_pos' | 'mgr_booking' | 'prh_rental') => {
    if ((isPassenger || isOwner || isMGRTransportAdmin) && mode !== 'mgr_booking') {
      return; // Block access outside MGR Transport for Passenger, Owner, and MGR Transport Admin
    }
    setSystemMode(mode);
    try {
      localStorage.setItem('mgr_system_mode', mode);
    } catch {}
  };

  // Central helper: set the active MGR tab and keep the browser URL in sync
  const applyMGRTab = useCallback(
    (tab: MGRTabType, options: { push?: boolean } = {}) => {
      if (!rolePersona) return;
      const sanitized = sanitizeMGRTabForPersona(rolePersona, tab);
      setMgrActiveTab(sanitized);
      go(buildRolePath(rolePersona, sanitized), { replace: !options.push });
    },
    [go, rolePersona]
  );

  // User-initiated tab navigation (adds a history entry so back/forward works)
  const navigateToMGRTab = useCallback(
    (tab: MGRTabType) => {
      applyMGRTab(tab, { push: true });
    },
    [applyMGRTab]
  );

  // Route protection for MGR Transport personas (Passenger, Owner, and MGR Transport Admin)
  useEffect(() => {
    if (isPassenger || isOwner || isMGRTransportAdmin) {
      if (systemMode !== 'mgr_booking') {
        setSystemMode('mgr_booking');
        try {
          localStorage.setItem('mgr_system_mode', 'mgr_booking');
        } catch {}
      }
      if (isPassenger && ['mgr-dashboard', 'mgr-fleet', 'mgr-customers', 'mgr-routes', 'mgr-owners', 'mgr-admin', 'mgr-settings'].includes(mgrActiveTab)) {
        applyMGRTab('mgr-search');
      }
      if (isOwner && ['mgr-dashboard', 'mgr-search', 'mgr-routes', 'mgr-customers', 'mgr-admin', 'mgr-settings'].includes(mgrActiveTab)) {
        applyMGRTab('mgr-fleet');
      }
    }
  }, [currentUser, isPassenger, isOwner, isMGRTransportAdmin, systemMode, mgrActiveTab, applyMGRTab]);

  // On login/refresh: land on the URL's tab (or the persona default) and normalize the URL
  useEffect(() => {
    if (!currentUser || !rolePersona) return;
    const parsed = parseRolePath(window.location.pathname);
    const targetTab =
      parsed.persona === rolePersona
        ? parsed.tab
          ? sanitizeMGRTabForPersona(rolePersona, parsed.tab)
          : DEFAULT_TAB_BY_PERSONA[rolePersona]
        : DEFAULT_TAB_BY_PERSONA[rolePersona];

    setSystemMode('mgr_booking');
    try {
      localStorage.setItem('mgr_system_mode', 'mgr_booking');
    } catch {}
    setMgrActiveTab(targetTab);
    go(buildRolePath(rolePersona, targetTab), { replace: true });
  }, [currentUser, rolePersona, go]);

  // Unknown paths fall back to the root entry point
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parsed = parseRolePath(window.location.pathname);
    if (!parsed.isRoot && !parsed.persona) {
      go('/', { replace: true });
    }
  }, [go]);

  // Bicycle POS / staff users only live at the root
  useEffect(() => {
    if (!currentUser || rolePersona) return;
    const parsed = parseRolePath(window.location.pathname);
    if (!parsed.isRoot) {
      go('/', { replace: true });
    }
  }, [currentUser, rolePersona, go]);

  // Apply browser back/forward navigation to the active role/tab
  useEffect(() => {
    if (!popNavRef.current) return;
    popNavRef.current = false;

    if (!currentUser || !rolePersona) return;

    if (route.persona && route.persona === rolePersona) {
      const nextTab = route.tab
        ? sanitizeMGRTabForPersona(rolePersona, route.tab)
        : DEFAULT_TAB_BY_PERSONA[rolePersona];
      setSystemMode('mgr_booking');
      try {
        localStorage.setItem('mgr_system_mode', 'mgr_booking');
      } catch {}
      setMgrActiveTab(nextTab);
      return;
    }

    // Mismatched role path -> go to this persona's default
    const fallback = DEFAULT_TAB_BY_PERSONA[rolePersona];
    setMgrActiveTab(fallback);
    go(buildRolePath(rolePersona, fallback), { replace: true });
  }, [route, currentUser, rolePersona, go]);


  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Dynamic permissions version to immediately reflect role & tab access changes across the entire app
  const [permissionsVersion, setPermissionsVersion] = useState(0);

  const handleRefreshPermissions = () => {
    const refreshed = getCurrentUser();
    if (refreshed) {
      setCurrentUser({ ...refreshed });
    } else {
      setCurrentUser((prev) => (prev ? { ...prev } : { ...DEFAULT_USER }));
    }
    setPermissionsVersion((v) => v + 1);
  };

  // Route protection: automatically redirect if activeTab is not permitted after admin changes
  useEffect(() => {
    if (systemMode !== 'bicycle_pos') return;
    const isRoot = activeUser.email.toLowerCase() === DEFAULT_USER.email.toLowerCase();
    const perms = getUserPermissions(activeUser);
    const tabPermMap: Partial<Record<NavTabType, boolean>> = {
      dashboard: perms.accessDashboard,
      rentals: perms.accessRentals,
      customers: perms.accessCustomers,
      messages: perms.accessMessages,
      history: perms.accessHistory,
      users: perms.accessUsers || isRoot,
      settings: perms.accessSettings,
      finance: perms.accessFinance ?? perms.accessIncome,
    };

    if (activeTab in tabPermMap && tabPermMap[activeTab] === false) {
      const allTabs: NavTabType[] = ['rentals', 'dashboard', 'customers', 'messages', 'history', 'finance', 'settings', 'users'];
      const allowed = allTabs.find((t) => tabPermMap[t] !== false);
      if (allowed) {
        setActiveTab(allowed);
      }
    }
  }, [activeUser, permissionsVersion, activeTab, systemMode]);

  // Income & Expenses entries
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>(() => {
    try {
      const saved = localStorage.getItem('v_rental_income');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Theme & Accent State
  const [themeMode, setThemeMode] = useState<ThemeMode>(getSavedTheme);
  const [accent, setAccent] = useState<AccentColor>(getSavedAccent);

  const t = getThemeClasses(themeMode, accent);

  const handleToggleTheme = () => {
    const nextTheme: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
    saveTheme(nextTheme);
  };

  const handleChangeAccent = (newAccent: AccentColor) => {
    setAccent(newAccent);
    saveAccent(newAccent);
  };

  // App Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('v_rental_settings');
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  // Vehicle Types & Rates
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(() => {
    try {
      const saved = localStorage.getItem('v_rental_types');
      return saved ? JSON.parse(saved) : INITIAL_VEHICLE_TYPES;
    } catch {
      return INITIAL_VEHICLE_TYPES;
    }
  });

  // Fleet Inventory (Serial Numbers)
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      const saved = localStorage.getItem('v_rental_vehicles');
      return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
    } catch {
      return INITIAL_VEHICLES;
    }
  });

  // Active Rentals
  const [activeRentals, setActiveRentals] = useState<RentalRecord[]>(() => {
    try {
      const saved = localStorage.getItem('v_rental_active');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.map(sanitizeRentalRecordNumber) : [];
    } catch {
      return [];
    }
  });

  // Completed Rentals History
  const [completedRentals, setCompletedRentals] = useState<RentalRecord[]>(() => {
    try {
      const saved = localStorage.getItem('v_rental_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(sanitizeRentalRecordNumber);
        }
      }
      return INITIAL_COMPLETED_RENTALS.map(sanitizeRentalRecordNumber);
    } catch {
      return INITIAL_COMPLETED_RENTALS.map(sanitizeRentalRecordNumber);
    }
  });

  // Customer Profiles Database
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('v_rental_customers');
      if (saved) {
        return JSON.parse(saved);
      }
      return INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  // Stopping / Settlement Modal state
  const [settlingRental, setSettlingRental] = useState<RentalRecord | null>(null);

  // Message Templates
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(() => getStoredMessageTemplates());

  // Customer Groups
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>(() => getStoredCustomerGroups());

  // Message History (WhatsApp send log)
  const [messageHistory, setMessageHistory] = useState<MessageHistoryEntry[]>(() => getStoredMessageHistory());

  // Modal for managing customer groups from dedicated Messages tab
  const [isMessagesGroupsModalOpen, setIsMessagesGroupsModalOpen] = useState(false);

  // Password Recovery and Forced Password Reset State
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
  const [isForcedPasswordChange, setIsForcedPasswordChange] = useState(false);
  const [resetModalEmail, setResetModalEmail] = useState('');

  // Listen for Supabase password recovery link (#type=recovery) or PASSWORD_RECOVERY event
  useEffect(() => {
    // 1. URL hash detection
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('error=')) {
        try {
          const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
          const errorDesc = hashParams.get('error_description') || hashParams.get('error') || 'The authentication link is invalid or has expired.';
          console.warn('[App] Supabase Auth error in URL hash:', errorDesc);
          window.history.replaceState(null, '', window.location.pathname);
          alert(`Password Reset Notice:\n\n${decodeURIComponent(errorDesc.replace(/\+/g, ' '))}\n\nThe recovery link has expired or was already used. Please request a new password reset link.`);
        } catch (e) {
          console.warn('[App] Error parsing auth error in hash:', e);
        }
      } else if (hash.includes('type=recovery') || hash.includes('access_token=')) {
        setIsPasswordResetModalOpen(true);
        setIsForcedPasswordChange(false);

        try {
          const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken) {
            const parts = accessToken.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload?.email) {
                setResetModalEmail(payload.email);
              }
            }
            if (isSupabaseConfigured()) {
              const supa = getSupabase();
              if (supa && refreshToken) {
                supa.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
              }
            }
          }
        } catch (e) {
          console.warn('[App] Error parsing recovery token:', e);
        }
      }

      // Clean up any stale temporary password flag
      if (typeof window !== 'undefined') {
        localStorage.removeItem('v_rental_must_change_password');
      }
    }

    // 2. Supabase Auth listener
    if (isSupabaseConfigured()) {
      const supa = getSupabase();
      if (supa) {
        const { data: authListener } = supa.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordResetModalOpen(true);
            setIsForcedPasswordChange(false);
            if (session?.user?.email) {
              setResetModalEmail(session.user.email);
            }
          }
        });

        return () => {
          authListener?.subscription?.unsubscribe();
        };
      }
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('v_rental_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('v_rental_types', JSON.stringify(vehicleTypes));
  }, [vehicleTypes]);

  useEffect(() => {
    localStorage.setItem('v_rental_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('v_rental_active', JSON.stringify(activeRentals));
  }, [activeRentals]);

  useEffect(() => {
    localStorage.setItem('v_rental_history', JSON.stringify(completedRentals));
  }, [completedRentals]);

  useEffect(() => {
    localStorage.setItem('v_rental_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('v_rental_income', JSON.stringify(incomeEntries));
  }, [incomeEntries]);

  // Reconcile and synchronize rental history with income entries
  const reconcileRentalIncomeLedger = (
    rentals: RentalRecord[],
    incomes: IncomeEntry[],
    fallbackCashier: string
  ) => {
    let hasChanges = false;
    const currentIncomes = [...incomes];
    const newItems: IncomeEntry[] = [];
    const updatedItems: IncomeEntry[] = [];

    for (const r of rentals) {
      if (!r.totalAmount || r.totalAmount <= 0) continue;
      const expectedId = `inc-rent-${r.id}`;
      const existing = currentIncomes.find(
        (i) => i.id === expectedId || i.description.includes(`Rental #${r.rentalNumber}`)
      );
      const cashier = r.cashierName || fallbackCashier || 'Staff';

      if (!existing) {
        const newEntry: IncomeEntry = {
          id: expectedId,
          date: new Date(r.completedAt || Date.now()).toISOString().slice(0, 10),
          description: `Rental #${r.rentalNumber} — ${r.vehicleTypeName} (${r.vehicleSerialNumber})`,
          type: 'income',
          amount: r.totalAmount,
          category: 'Rental Revenue',
          who: cashier,
          createdAt: r.completedAt || Date.now(),
          cashierName: cashier,
        };
        currentIncomes.unshift(newEntry);
        newItems.push(newEntry);
        hasChanges = true;
      } else {
        let entryChanged = false;
        const copy = { ...existing };
        if (copy.who === 'Mark') {
          copy.who = cashier;
          entryChanged = true;
        }
        if (copy.amount !== r.totalAmount) {
          copy.amount = r.totalAmount;
          entryChanged = true;
        }
        if (!copy.cashierName && cashier) {
          copy.cashierName = cashier;
          entryChanged = true;
        }
        if (entryChanged) {
          const idx = currentIncomes.findIndex((i) => i.id === existing.id);
          if (idx !== -1) {
            currentIncomes[idx] = copy;
            updatedItems.push(copy);
            hasChanges = true;
          }
        }
      }
    }

    return { reconciledIncomes: currentIncomes, hasChanges, newItems, updatedItems };
  };

  // Local reconciliation to ensure completed rentals always match income entries and sanitize legacy 'Mark' entries
  useEffect(() => {
    const fallbackCashier = activeUser.name || currentUser?.name || settings.cashierName || 'Staff';
    const { reconciledIncomes, hasChanges } = reconcileRentalIncomeLedger(
      completedRentals,
      incomeEntries,
      fallbackCashier
    );
    if (hasChanges) {
      setIncomeEntries(reconciledIncomes);
    }
  }, []);

  // Load from Supabase on startup and subscribe to realtime changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const loadData = async () => {
      const [cloudData, cloudIncome, cloudTemplates] = await Promise.all([
        fetchSupabaseData(),
        fetchIncomeEntries(),
        fetchMessageTemplatesFromSupabase(),
      ]);
      if (cloudData) {
        // Only overwrite local data if cloud data exists AND has content
        if (cloudData.vehicleTypes && cloudData.vehicleTypes.length > 0) setVehicleTypes(cloudData.vehicleTypes);
        if (cloudData.vehicles && cloudData.vehicles.length > 0) setVehicles(cloudData.vehicles);
        if (cloudData.customers && cloudData.customers.length > 0) setCustomers(cloudData.customers);
        // Always load rentals from Supabase to ensure history is up to date
        if (cloudData.activeRentals !== undefined) setActiveRentals(cloudData.activeRentals.map(sanitizeRentalRecordNumber));
        if (cloudData.completedRentals !== undefined) {
          const sanitized = cloudData.completedRentals.map(sanitizeRentalRecordNumber);
          setCompletedRentals(sanitized);
        }
        if (cloudData.settings) {
          setSettings(cloudData.settings);
          localStorage.setItem('v_rental_settings', JSON.stringify(cloudData.settings));
        }

        if (cloudData.userAccounts !== undefined) {
          // Cloud is authoritative for user accounts. Only keep the built-in accounts
          // locally when they are missing from the cloud, so deleted users do not linger
          // or get re-created in Supabase.
          const standardEmails = new Set(
            [DEFAULT_USER, ...MGR_INITIAL_ACCOUNTS].map((u) => u.email.toLowerCase())
          );
          const mergedMap = new Map<string, UserAccount>();
          for (const u of cloudData.userAccounts) {
            if (u && u.email) mergedMap.set(u.email.toLowerCase(), u);
          }
          for (const u of getStoredUsers()) {
            const email = u?.email?.toLowerCase();
            if (email && standardEmails.has(email) && !mergedMap.has(email)) {
              mergedMap.set(email, u);
            }
          }
          saveStoredUsers(Array.from(mergedMap.values()));
        }

        if (cloudData.roles && cloudData.roles.length > 0) {
          saveStoredRoles(cloudData.roles);
          const refreshed = getCurrentUser();
          if (refreshed) setCurrentUser({ ...refreshed });
        } else {
          syncAllRolesToSupabase(getStoredRoles());
        }

        if (cloudData.messageTemplates && cloudData.messageTemplates.length > 0) {
          const merged = new Map<string, MessageTemplate>();
          for (const def of DEFAULT_MESSAGE_TEMPLATES) {
            merged.set(def.id, def);
          }
          for (const ct of cloudData.messageTemplates) {
            merged.set(ct.id, ct);
          }
          const fullList = Array.from(merged.values());
          setMessageTemplates(fullList);
          saveStoredMessageTemplates(fullList);
        }

        // Load customer groups from Supabase
        if (cloudData.customerGroups && cloudData.customerGroups.length > 0) {
          setCustomerGroups(cloudData.customerGroups);
          saveStoredCustomerGroups(cloudData.customerGroups);
        }
      }
      // If cloud data is empty/missing, keep local initial data as fallback
      else {
        console.log('No cloud data found, keeping local data as fallback');
      }

      // Reconcile rental history with income entries
      const effectiveRentals = cloudData?.completedRentals !== undefined
        ? cloudData.completedRentals.map(sanitizeRentalRecordNumber)
        : completedRentals;

      // Merge local incomeEntries with cloudIncome so newly added local entries (e.g. by Store Manager) are never wiped
      const mergedIncomesMap = new Map<string, IncomeEntry>();

      // 1. Load latest from localStorage first
      let storedLocalIncomes: IncomeEntry[] = [];
      try {
        const raw = localStorage.getItem('v_rental_income');
        if (raw) storedLocalIncomes = JSON.parse(raw);
      } catch {}

      const localPool = storedLocalIncomes.length > 0 ? storedLocalIncomes : incomeEntries;
      for (const item of localPool) {
        if (item && item.id) mergedIncomesMap.set(item.id, item);
      }

      // 2. Overlay cloud income entries while keeping rich local details if present
      const cloudList = cloudIncome || [];
      const unsyncedLocalItems: IncomeEntry[] = [];
      for (const cloudItem of cloudList) {
        if (cloudItem && cloudItem.id) {
          const localItem = mergedIncomesMap.get(cloudItem.id);
          mergedIncomesMap.set(cloudItem.id, {
            ...cloudItem,
            ...(localItem ? {
              reference: localItem.reference || cloudItem.reference,
              paymentMethod: localItem.paymentMethod || cloudItem.paymentMethod,
              remarks: localItem.remarks || cloudItem.remarks,
            } : {}),
          });
        }
      }

      // 3. Identify local entries that are not yet in cloud and queue them for sync
      const cloudIdSet = new Set(cloudList.map((c) => c.id));
      for (const localItem of localPool) {
        if (localItem && localItem.id && !cloudIdSet.has(localItem.id)) {
          unsyncedLocalItems.push(localItem);
        }
      }

      const mergedIncomesList = Array.from(mergedIncomesMap.values());
      const effectiveIncome = mergedIncomesList.length > 0 ? mergedIncomesList : incomeEntries;

      const { reconciledIncomes, hasChanges, newItems, updatedItems } = reconcileRentalIncomeLedger(
        effectiveRentals,
        effectiveIncome,
        currentUser?.name || settings.cashierName || 'Staff'
      );

      const finalIncomes = hasChanges ? reconciledIncomes : effectiveIncome;
      setIncomeEntries(finalIncomes);
      try {
        localStorage.setItem('v_rental_income', JSON.stringify(finalIncomes));
      } catch {}

      if (isSupabaseConfigured()) {
        const itemsToSync = [...unsyncedLocalItems, ...(hasChanges ? [...newItems, ...updatedItems] : [])];
        itemsToSync.forEach((entry) => {
          syncIncomeEntryToSupabase(entry);
        });
      }

      if (cloudTemplates && cloudTemplates.length > 0) {
        setMessageTemplates(cloudTemplates);
        saveStoredMessageTemplates(cloudTemplates);
      }
    };

    loadData();

    // Live subscription across devices / tabs
    const unsubscribe = subscribeToSupabaseRealtime(() => {
      loadData();
    });

    // Window focus / visibility change recheck so changes from other devices apply promptly
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  // Multi-tab / multi-window immediate broadcast sync
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('bicycle_pos_channel');
      bc.onmessage = (event) => {
        const { type, settings: newSettings, types, vehicles: newVehicles } = event.data || {};
        if (type === 'SETTINGS_UPDATED' && newSettings) {
          setSettings(newSettings);
        } else if (type === 'TYPES_UPDATED' && types) {
          setVehicleTypes(types);
        } else if (type === 'VEHICLES_UPDATED' && newVehicles) {
          setVehicles(newVehicles);
        } else if (type === 'LOGOUT') {
          setCurrentUser(null);
          setIsFullLoginPage(true);
        }
      };
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'v_rental_settings' && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
        } catch {}
      } else if (e.key === 'v_rental_types' && e.newValue) {
        try {
          setVehicleTypes(JSON.parse(e.newValue));
        } catch {}
      } else if (e.key === 'v_rental_vehicles' && e.newValue) {
        try {
          setVehicles(JSON.parse(e.newValue));
        } catch {}
      } else if (e.key === 'v_rental_current_user' && !e.newValue) {
        setCurrentUser(null);
        setIsFullLoginPage(true);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      bc?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Handlers for Settings, Vehicles, and Types with real-time Supabase sync & broadcast
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('v_rental_settings', JSON.stringify(newSettings));
    if (isSupabaseConfigured()) {
      syncSettingsToSupabase(newSettings);
    }
    try {
      const bc = new BroadcastChannel('bicycle_pos_channel');
      bc.postMessage({ type: 'SETTINGS_UPDATED', settings: newSettings });
      bc.close();
    } catch {}
  };

  const handleUpdateVehicleTypes = (newTypes: VehicleType[]) => {
    const oldIds = new Set(newTypes.map(t => t.id));
    const deleted = vehicleTypes.filter(t => !oldIds.has(t.id));

    setVehicleTypes(newTypes);
    localStorage.setItem('v_rental_types', JSON.stringify(newTypes));

    if (isSupabaseConfigured()) {
      newTypes.forEach(t => syncVehicleTypeToSupabase(t));
      deleted.forEach(t => deleteVehicleTypeFromSupabase(t.id));
    }
    try {
      const bc = new BroadcastChannel('bicycle_pos_channel');
      bc.postMessage({ type: 'TYPES_UPDATED', types: newTypes });
      bc.close();
    } catch {}
  };

  const handleUpdateVehicles = (newVehicles: Vehicle[]) => {
    const newIds = new Set(newVehicles.map(v => v.id));
    const deleted = vehicles.filter(v => !newIds.has(v.id));

    setVehicles(newVehicles);
    localStorage.setItem('v_rental_vehicles', JSON.stringify(newVehicles));

    if (isSupabaseConfigured()) {
      newVehicles.forEach(v => syncVehicleToSupabase(v));
      deleted.forEach(v => deleteVehicleFromSupabase(v.id));
    }
    try {
      const bc = new BroadcastChannel('bicycle_pos_channel');
      bc.postMessage({ type: 'VEHICLES_UPDATED', vehicles: newVehicles });
      bc.close();
    } catch {}
  };

  // Handler: Start New Rental
  const handleStartRental = (params: {
    vehicleTypeId: string;
    vehicleSerialNumber: string;
    customerName?: string;
    customerPhone?: string;
    customerNicPassport?: string;
    customerNotes?: string;
    depositAmount?: number;
    depositPaymentRef?: string;
    customStartTime?: number;
    sendWelcomeWhatsApp?: boolean;
    sendEndWhatsApp?: boolean;
  }) => {
    const typeObj = vehicleTypes.find((t) => t.id === params.vehicleTypeId) || vehicleTypes[0];
    
    // Find or create vehicle in inventory
    let vehicleObj = vehicles.find(
      (v) => v.serialNumber.toUpperCase() === params.vehicleSerialNumber.toUpperCase()
    );

    let updatedVehicles = [...vehicles];
    if (!vehicleObj) {
      vehicleObj = {
        id: `v-custom-${Date.now()}`,
        serialNumber: params.vehicleSerialNumber.toUpperCase(),
        typeId: params.vehicleTypeId,
        status: 'rented',
      };
      updatedVehicles.push(vehicleObj);
    } else {
      updatedVehicles = updatedVehicles.map((v) =>
        v.id === vehicleObj!.id ? { ...v, status: 'rented' as const } : v
      );
    }
    setVehicles(updatedVehicles);

    // If customer details (NIC or Name) provided, save or update in Customer database
    if (params.customerNicPassport || params.customerName) {
      setCustomers((prev) => {
        const nicKey = (params.customerNicPassport || '').trim().toUpperCase();
        const existingIdx = nicKey
          ? prev.findIndex((c) => c.nicPassport.trim().toUpperCase() === nicKey)
          : -1;

        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            name: params.customerName || next[existingIdx].name,
            fullName: params.customerName || next[existingIdx].fullName || next[existingIdx].name,
            phone: params.customerPhone || next[existingIdx].phone,
            whatsappNumber: params.customerPhone || next[existingIdx].whatsappNumber || next[existingIdx].phone,
            nicPassport: params.customerNicPassport || next[existingIdx].nicPassport,
            notes: params.customerNotes || next[existingIdx].notes,
            lastRentalDate: Date.now(),
            totalRentalsCount: (next[existingIdx].totalRentalsCount || 1) + 1,
          };
          return next;
        } else if (nicKey || params.customerName) {
          const newCust: Customer = {
            id: `cust-${Date.now()}`,
            nicPassport: nicKey,
            name: params.customerName?.trim() || 'Guest Customer',
            fullName: params.customerName?.trim() || 'Guest Customer',
            phone: params.customerPhone?.trim() || '',
            whatsappNumber: params.customerPhone?.trim() || '',
            notes: params.customerNotes?.trim() || '',
            createdAt: Date.now(),
            lastRentalDate: Date.now(),
            totalRentalsCount: 1,
          };
          return [newCust, ...prev];
        }
        return prev;
      });
    }

    const nextRentalNumber = getNextRentalNumber(activeRentals, completedRentals, settings.rentalNumberPrefix || 'REN');
    const newRental: RentalRecord = {
      id: `rental-${Date.now()}`,
      rentalNumber: nextRentalNumber,
      vehicleId: vehicleObj.id,
      vehicleSerialNumber: params.vehicleSerialNumber.toUpperCase(),
      vehicleTypeId: typeObj.id,
      vehicleTypeName: typeObj.name,
      vehicleIcon: typeObj.icon,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      customerNicPassport: params.customerNicPassport,
      customerNotes: params.customerNotes,
      depositAmount: params.depositAmount,
      depositPaymentRef: params.depositPaymentRef,
      startTime: params.customStartTime || Date.now(),
      status: 'active',
      rateSnapshot: { ...typeObj.rates },
      totalAmount: typeObj.rates.firstHour,
      cashierName: currentUser?.name || settings.cashierName || 'Cashier',
      sendWelcomeWhatsApp: params.sendWelcomeWhatsApp ?? true,
      sendEndWhatsApp: params.sendEndWhatsApp ?? true,
    };

    setActiveRentals((prev) => [newRental, ...prev]);

    // Live sync to Supabase if configured
    if (isSupabaseConfigured()) {
      syncRentalToSupabase(newRental);
      if (vehicleObj) syncVehicleToSupabase(vehicleObj);
      if (params.customerNicPassport || params.customerName) {
        const cleanNic = (params.customerNicPassport || '').trim().toUpperCase();
        const matched = customers.find(c => c.nicPassport.trim().toUpperCase() === cleanNic);
        syncCustomerToSupabase({
          id: matched?.id || `cust-${Date.now()}`,
          nicPassport: cleanNic,
          name: params.customerName || matched?.name || 'Customer',
          fullName: params.customerName || matched?.fullName || matched?.name || 'Customer',
          phone: params.customerPhone || matched?.phone || '',
          whatsappNumber: matched?.whatsappNumber || params.customerPhone || '',
          address: matched?.address || '',
          dob: matched?.dob || '',
          notes: params.customerNotes || matched?.notes || '',
          lastRentalDate: Date.now(),
          totalRentalsCount: (matched?.totalRentalsCount || 0) + 1,
        });
      }
    }
  };

  // Handler: Stop & Settle Rental
  const handleConfirmStopAndSettle = (completedRecord: RentalRecord) => {
    // 1. Remove from active rentals
    setActiveRentals((prev) => prev.filter((r) => r.id !== completedRecord.id));

    // 2. Add to completed rentals history
    setCompletedRentals((prev) => [completedRecord, ...prev]);

    // 3. Mark vehicle as available in inventory
    setVehicles((prev) =>
      prev.map((v) =>
        v.serialNumber.toUpperCase() === completedRecord.vehicleSerialNumber.toUpperCase()
          ? { ...v, status: 'available' as const, lastRentedAt: Date.now() }
          : v
      )
    );

    // 4. Automatically add rental revenue to Income & Expenses / Finance Ledger with unique de-duplicated reference
    const rentRef = `RENT-${completedRecord.rentalNumber}`;
    const activeCashier = completedRecord.cashierName || activeUser.name || currentUser?.name || settings.cashierName || 'Staff';

    if (completedRecord.totalAmount && completedRecord.totalAmount > 0) {
      setIncomeEntries((prev) => {
        const alreadyExists = prev.some((e) => e.reference === rentRef);
        if (alreadyExists) return prev;

        const rentalIncomeEntry: IncomeEntry = {
          id: `inc-rent-${completedRecord.id}`,
          date: new Date(completedRecord.completedAt || Date.now()).toISOString().slice(0, 10),
          description: `Rental #${completedRecord.rentalNumber} — ${completedRecord.vehicleTypeName} (${completedRecord.vehicleSerialNumber})`,
          type: 'income',
          amount: completedRecord.totalAmount,
          category: 'Rental Income',
          reference: rentRef,
          paymentMethod: completedRecord.paymentMethod || 'cash',
          who: activeCashier,
          cashierName: activeCashier,
          createdAt: Date.now(),
        };

        if (isSupabaseConfigured()) {
          syncIncomeEntryToSupabase(rentalIncomeEntry);
        }

        return [rentalIncomeEntry, ...prev];
      });
    }

    // Record audit log for stopping / settling rental
    recordAuditLog({
      user: activeCashier,
      userEmail: activeUser.email,
      action: 'Rental Stopped by QR',
      reference: rentRef,
      details: `Settled rental #${completedRecord.rentalNumber} for ${completedRecord.vehicleSerialNumber} (${completedRecord.vehicleTypeName}) with amount ${completedRecord.totalAmount || 0}`,
    });

    // 5. Live sync to Supabase
    if (isSupabaseConfigured()) {
      syncRentalToSupabase(completedRecord);
      const matchedVeh = vehicles.find((v) => v.serialNumber.toUpperCase() === completedRecord.vehicleSerialNumber.toUpperCase());
      if (matchedVeh) {
        syncVehicleToSupabase({ ...matchedVeh, status: 'available', lastRentedAt: Date.now() });
      }
    }

    // 6. Close modal
    setSettlingRental(null);
  };

  // Handlers for Customer Management
  const handleAddCustomer = (newCustomer: Customer) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    if (isSupabaseConfigured()) {
      syncCustomerToSupabase(newCustomer);
    }
  };

  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updatedCustomer.id ? updatedCustomer : c)));
    if (isSupabaseConfigured()) {
      syncCustomerToSupabase(updatedCustomer);
    }
  };

  const handleDeleteCustomer = (customerId: string, nicPassport?: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId && (!nicPassport || c.nicPassport !== nicPassport)));
    if (isSupabaseConfigured()) {
      deleteCustomerFromSupabase(customerId, nicPassport);
    }
  };

  const handleBulkImportCustomers = (importedCustomers: Customer[]) => {
    setCustomers((prev) => {
      const existingMap = new Map(prev.map((c) => [(c.nicPassport || '').trim().toUpperCase(), c]));
      const updated = [...prev];
      for (const imported of importedCustomers) {
        const key = (imported.nicPassport || '').trim().toUpperCase();
        if (key && existingMap.has(key)) {
          const index = updated.findIndex((c) => (c.nicPassport || '').trim().toUpperCase() === key);
          if (index !== -1) {
            updated[index] = { ...updated[index], ...imported };
          }
        } else {
          updated.unshift(imported);
        }
      }
      return updated;
    });

    if (isSupabaseConfigured()) {
      importedCustomers.forEach((c) => {
        syncCustomerToSupabase(c);
      });
    }
  };

  // Handler: Delete Completed Rental (Admin user only)
  const handleDeleteRental = (rentalId: string) => {
    const isRootAdmin = activeUser.email.toLowerCase() === DEFAULT_USER.email.toLowerCase();
    const isAdmin = activeUser.role === 'admin' || isRootAdmin;
    if (!isAdmin) {
      alert('Permission Denied: Only an administrator can delete settled rental records.');
      return;
    }

    const target = completedRentals.find((r) => r.id === rentalId);
    if (!target) return;

    setCompletedRentals((prev) => prev.filter((r) => r.id !== rentalId));

    // Also remove associated rental revenue entry from incomeEntries to keep history & ledger in sync
    setIncomeEntries((prev) =>
      prev.filter(
        (entry) =>
          entry.id !== `inc-rent-${target.id}` &&
          !entry.description.includes(`Rental #${target.rentalNumber}`)
      )
    );

    if (isSupabaseConfigured()) {
      deleteRentalFromSupabase(target.id, target.rentalNumber);
      deleteIncomeEntryFromSupabase(`inc-rent-${target.id}`);
    }
  };

  // Reset to default sample fleet
  const handleResetSampleData = () => {
    setVehicleTypes(INITIAL_VEHICLE_TYPES);
    setVehicles(INITIAL_VEHICLES);
    setSettings(INITIAL_SETTINGS);
    setCustomers(INITIAL_CUSTOMERS);
    setActiveRentals([]);
    setCompletedRentals([]);
    localStorage.clear();
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setIsFullLoginPage(true);
    go('/', { replace: true });
    try {
      localStorage.removeItem('v_rental_current_user');
      localStorage.removeItem('mgr_system_mode');
      const bc = new BroadcastChannel('bicycle_pos_channel');
      bc.postMessage({ type: 'LOGOUT' });
      bc.close();
    } catch {}
  };

  // Auto-logout inactivity monitor based on settings.autoLogoutMinutes
  useEffect(() => {
    const timeoutMinutes = settings.autoLogoutMinutes ?? 15;
    if (timeoutMinutes <= 0 || isFullLoginPage || !currentUser) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        console.warn(`[Security] Session auto-logout triggered after ${timeoutMinutes}m of inactivity.`);
        handleLogout();
      }, timeoutMs);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [settings.autoLogoutMinutes, isFullLoginPage, currentUser]);

  // CRITICAL SECURITY: If user is not authenticated or login page is requested, ALWAYS display LoginPage
  if (!currentUser || isFullLoginPage) {
    return (
      <>
        <LoginPage
          preselectedRole={route.persona}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setCurrentUserSession(user);
            setIsFullLoginPage(false);
            setSidebarCollapsed(true);
            setSettings((prev) => ({ ...prev, cashierName: user.name }));
            const persona = getMGRPersona(user);
            const isAdminEmail = (user.email || '').toLowerCase() === 'admin@mannargreenride.lk';
            const mgrRole: RolePersona | null =
              persona === 'passenger'
                ? 'passenger'
                : persona === 'owner'
                  ? 'owner'
                  : isAdminEmail
                    ? 'admin'
                    : null;
            if (mgrRole) {
              setSystemMode('mgr_booking');
              try {
                localStorage.setItem('mgr_system_mode', 'mgr_booking');
              } catch {}
              const tab = DEFAULT_TAB_BY_PERSONA[mgrRole];
              setMgrActiveTab(tab);
              go(buildRolePath(mgrRole, tab), { replace: true });
            } else {
              setSystemMode('bicycle_pos');
              try {
                localStorage.setItem('mgr_system_mode', 'bicycle_pos');
              } catch {}
              setActiveTab('rentals');
              go('/', { replace: true });
            }
          }}
          settings={settings}
          themeMode={themeMode}
          onToggleTheme={handleToggleTheme}
          accent={accent}
          onChangeAccent={handleChangeAccent}
        />
        <PasswordResetModal
          isOpen={isPasswordResetModalOpen}
          onClose={() => {
            if (!isForcedPasswordChange) {
              setIsPasswordResetModalOpen(false);
            }
          }}
          isForcedChange={isForcedPasswordChange}
          userEmail={resetModalEmail || 'absiraiva@gmail.com'}
          themeMode={themeMode}
          accent={accent}
          onSuccess={() => {
            setIsPasswordResetModalOpen(false);
            setIsForcedPasswordChange(false);
            localStorage.removeItem('v_rental_must_change_password');
          }}
        />
      </>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${systemMode === 'mgr_booking' ? 'bg-slate-50 text-slate-900' : t.appBg} w-full overflow-auto font-sans transition-colors duration-300`}>
      {/* Top Navigation Bar with Theme Toggles, Palette Picker, Inactive Bordered Tabs & User Login */}
      <Navbar
        key={`navbar-${permissionsVersion}-${activeUser.role}-${activeUser.email}`}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRentals={activeRentals}
        allVehicles={vehicles}
        todayCompletedRentals={completedRentals}
        settings={settings}
        currentUser={activeUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenUserRoles={() => {
          setActiveTab('users');
        }}
        onOpenPasswordReset={() => {
          setIsPasswordResetModalOpen(true);
          setIsForcedPasswordChange(false);
          setResetModalEmail(activeUser.email);
        }}
        onLogout={handleLogout}
        themeMode={themeMode}
        accent={accent}
        onToggleTheme={handleToggleTheme}
        onChangeAccent={handleChangeAccent}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        systemMode={systemMode}
        onToggleSystemMode={handleToggleSystemMode}
        mgrActiveTab={mgrActiveTab}
        onSelectMGRTab={navigateToMGRTab}
        prhActiveTab={prhActiveTab}
        onSelectPRHTab={setPrhActiveTab}
      />

      {/* Main Container */}
      <main
        className="flex-1 w-full overflow-auto pb-8"
        style={{
          paddingTop: '4rem',
          paddingLeft: sidebarCollapsed ? '4rem' : '15rem',
          transition: 'padding-left 0.3s ease-in-out',
        }}
      >
        <div className="px-4 sm:px-6 lg:px-8 pt-6">

          {/* PRH Construction Equipment Rental Hub */}
          {systemMode === 'prh_rental' ? (
            <PRHHub
              activeTab={prhActiveTab}
              setActiveTab={setPrhActiveTab}
              currentUserEmail={activeUser.email || 'admin@mannargreenride.lk'}
              themeMode={themeMode}
            />
          ) : systemMode === 'mgr_booking' ? (
            <MGRBookingHub
              activeTab={mgrActiveTab}
              setActiveTab={navigateToMGRTab}
              themeMode="light"
              currentUser={activeUser}
              customers={customers}
              onAddCustomer={handleAddCustomer}
              onEditCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          ) : (
            <>
              {/* Tab 1: Rental Counter Desk */}
          {activeTab === 'rentals' && (
            <div className="space-y-6">
              <StartRentalCard
                vehicleTypes={vehicleTypes}
                vehicles={vehicles}
                customers={customers}
                activeRentals={activeRentals}
                completedRentals={completedRentals}
                settings={settings}
                currentUser={activeUser}
                themeMode={themeMode}
                accent={accent}
                onStartRental={handleStartRental}
                onOpenStopRentalModal={(rental) => setSettlingRental(rental)}
              />
              <ActiveRentalsList
                activeRentals={activeRentals}
                settings={settings}
                themeMode={themeMode}
                accent={accent}
                onStopRental={(rental) => setSettlingRental(rental)}
              />
            </div>
          )}

          {/* Tab 2: Customers Management */}
          {activeTab === 'customers' && (
            <CustomerManagementPanel
              customers={customers}
              completedRentals={completedRentals}
              settings={settings}
              currentUser={activeUser}
              themeMode={themeMode}
              accent={accent}
              templates={messageTemplates}
              customerGroups={customerGroups}
              messageHistory={messageHistory}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onBulkImportCustomers={handleBulkImportCustomers}
              onSaveCustomerGroup={(group) => {
                setCustomerGroups((prev) => {
                  const exists = prev.findIndex((g) => g.id === group.id);
                  const next = exists >= 0
                    ? prev.map((g) => g.id === group.id ? group : g)
                    : [group, ...prev];
                  saveStoredCustomerGroups(next);
                  return next;
                });
              }}
              onDeleteCustomerGroup={(groupId) => {
                setCustomerGroups((prev) => {
                  const next = prev.filter((g) => g.id !== groupId);
                  saveStoredCustomerGroups(next);
                  return next;
                });
              }}
              onAddMessageHistory={(entry) => {
                setMessageHistory((prev) => {
                  const next = [entry, ...prev].slice(0, 1000); // keep last 1000
                  saveStoredMessageHistory(next);
                  return next;
                });
              }}
            />
          )}

          {/* Tab: Customer Messages & Bulk WhatsApp Campaigns */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              {/* Header card with contrast from background page colour */}
              <div className={`p-5 sm:p-6 rounded-2xl border ${t.divider} ${t.cardBg} shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                <div>
                  <h2 className={`text-xl sm:text-2xl font-black ${t.textHeading} tracking-tight flex items-center gap-2.5`}>
                    <MessageSquare className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                    <span>Customer Messages & Bulk Campaigns</span>
                  </h2>
                  <p className={`text-xs sm:text-sm ${t.textMuted} mt-1`}>
                    Broadcast templates, customer segment filtering, automated notifications, and complete WhatsApp dispatch logs
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsMessagesGroupsModalOpen(true)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer shadow-sm ${t.cardSubtleBg} ${t.border} ${t.textHeading} hover:border-cyan-500`}
                  >
                    <Tag className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                    <span>Manage Customer Groups ({customerGroups.length})</span>
                  </button>
                </div>
              </div>

              {/* Messaging Suite Component */}
              <CustomerMessagingTab
                customers={customers}
                templates={messageTemplates}
                customerGroups={customerGroups}
                messageHistory={messageHistory}
                currentUser={activeUser}
                themeMode={themeMode}
                accent={accent}
                shopName={settings.businessName || 'Cycly Rent'}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onAddMessageHistory={(entry) => {
                  setMessageHistory((prev) => {
                    const next = [entry, ...prev].slice(0, 1000); // keep last 1000
                    saveStoredMessageHistory(next);
                    return next;
                  });
                }}
              />

              {/* Customer Groups Management Modal */}
              {isMessagesGroupsModalOpen && (
                <CustomerGroupsModal
                  groups={customerGroups}
                  customers={customers}
                  currentUser={activeUser}
                  themeMode={themeMode}
                  accent={accent}
                  onClose={() => setIsMessagesGroupsModalOpen(false)}
                  onSaveGroup={(group) => {
                    setCustomerGroups((prev) => {
                      const exists = prev.findIndex((g) => g.id === group.id);
                      const next = exists >= 0
                        ? prev.map((g) => g.id === group.id ? group : g)
                        : [group, ...prev];
                      saveStoredCustomerGroups(next);
                      return next;
                    });
                  }}
                  onDeleteGroup={(groupId) => {
                    setCustomerGroups((prev) => {
                      const next = prev.filter((g) => g.id !== groupId);
                      saveStoredCustomerGroups(next);
                      return next;
                    });
                  }}
                />
              )}
            </div>
          )}

          {/* Tab 3: History & Daily Settlement */}
          {activeTab === 'history' && (
            <RentalHistoryPanel
              completedRentals={completedRentals}
              settings={settings}
              currentUser={activeUser}
              onDeleteRental={handleDeleteRental}
              themeMode={themeMode}
              accent={accent}
            />
          )}

          {/* Tab 4: Users & Role Management */}
          {activeTab === 'users' && (
            <UserRolesManager
              currentUser={activeUser}
              themeMode={themeMode}
              accent={accent}
              settings={settings}
              onUpdateSettings={(updated) => {
                const nextSettings = { ...settings, ...updated };
                handleUpdateSettings(nextSettings);
              }}
              onUserListChange={handleRefreshPermissions}
              onRolePermissionsChange={handleRefreshPermissions}
              onOpenPasswordReset={(email) => {
                setIsPasswordResetModalOpen(true);
                setIsForcedPasswordChange(false);
                setResetModalEmail(email || activeUser.email);
              }}
            />
          )}

          {/* Tab 5: Settings & Rates Management */}
          {activeTab === 'settings' && (
            <SettingsPanel
              vehicleTypes={vehicleTypes}
              vehicles={vehicles}
              customers={customers}
              activeRentals={activeRentals}
              completedRentals={completedRentals}
              settings={settings}
              currentUser={activeUser}
              themeMode={themeMode}
              accent={accent}
              onUpdateVehicleTypes={handleUpdateVehicleTypes}
              onUpdateVehicles={handleUpdateVehicles}
              onUpdateSettings={handleUpdateSettings}
              onResetSampleData={handleResetSampleData}
              onToggleTheme={handleToggleTheme}
              onChangeAccent={handleChangeAccent}
            />
          )}

          {/* Tab 6: Finance & Accounts */}
          {(activeTab === 'finance' || activeTab === 'income') && (
            <FinancePanel
              entries={incomeEntries}
              settings={settings}
              themeMode={themeMode}
              accent={accent}
              currentUser={activeUser}
              onAddEntry={(entry) => {
                const canAdd = hasPermission(activeUser, 'canAddFinanceTransaction') || activeUser.role === 'admin';
                if (!canAdd) {
                  console.warn('[Finance] Action rejected: Active role does not have permission to add finance records.');
                  return;
                }
                setIncomeEntries((prev) => {
                  const updated = [entry, ...prev];
                  try {
                    localStorage.setItem('v_rental_income', JSON.stringify(updated));
                  } catch {}
                  return updated;
                });
                if (isSupabaseConfigured()) {
                  syncIncomeEntryToSupabase(entry);
                }
              }}
              onUpdateEntry={(updated) => {
                const canEdit = hasPermission(activeUser, 'canEditFinanceTransaction') || activeUser.role === 'admin';
                if (!canEdit) {
                  console.warn('[Finance] Action rejected: Active role does not have permission to update finance records.');
                  return;
                }
                setIncomeEntries((prev) => {
                  const list = prev.map((e) => (e.id === updated.id ? updated : e));
                  try {
                    localStorage.setItem('v_rental_income', JSON.stringify(list));
                  } catch {}
                  return list;
                });
                if (isSupabaseConfigured()) {
                  syncIncomeEntryToSupabase(updated);
                }
              }}
              onDeleteEntry={(id) => {
                const canDelete = hasPermission(activeUser, 'canDeleteFinanceTransaction') || activeUser.role === 'admin';
                if (!canDelete) {
                  console.warn('[Finance] Action rejected: Active role does not have permission to delete finance records.');
                  return;
                }
                setIncomeEntries((prev) => {
                  const list = prev.filter((e) => e.id !== id);
                  try {
                    localStorage.setItem('v_rental_income', JSON.stringify(list));
                  } catch {}
                  return list;
                });
                if (isSupabaseConfigured()) {
                  deleteIncomeEntryFromSupabase(id);
                }
              }}
            />
          )}

          {/* Tab 7: Dashboard */}
          {activeTab === 'dashboard' && (
            <DashboardStats
              activeRentals={activeRentals}
              allVehicles={vehicles}
              todayCompletedRentals={completedRentals}
              messageHistory={messageHistory}
              settings={settings}
              currentUser={activeUser}
              themeMode={themeMode}
              accent={accent}
            />
          )}
            </>
          )}

        </div>{/* end inner px wrapper */}
      </main>

      {/* User Authentication & Account Management Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={activeUser}
        onUserChange={(u) => {
          setCurrentUser(u);
          setSidebarCollapsed(true);
          setSettings((prev) => ({ ...prev, cashierName: u.name }));
        }}
        onOpenUserRoles={() => {
          setActiveTab('users');
        }}
        onOpenPasswordReset={() => {
          setIsPasswordResetModalOpen(true);
          setIsForcedPasswordChange(false);
          setResetModalEmail(activeUser.email);
        }}
        settings={settings}
        themeMode={themeMode}
        accent={accent}
      />

      {/* Settlement & Stop Modal */}
      {settlingRental && (
        <StopRentalModal
          rental={settlingRental}
          settings={settings}
          themeMode={themeMode}
          accent={accent}
          onClose={() => setSettlingRental(null)}
          onConfirmStopAndSettle={handleConfirmStopAndSettle}
        />
      )}

      {/* Password Reset / Recovery / Forced Change Modal */}
      <PasswordResetModal
        isOpen={isPasswordResetModalOpen}
        onClose={() => {
          if (!isForcedPasswordChange) {
            setIsPasswordResetModalOpen(false);
          }
        }}
        isForcedChange={isForcedPasswordChange}
        userEmail={resetModalEmail || activeUser.email}
        themeMode={themeMode}
        accent={accent}
        onSuccess={() => {
          setIsPasswordResetModalOpen(false);
          setIsForcedPasswordChange(false);
          localStorage.removeItem('v_rental_must_change_password');
        }}
      />
    </div>
  );
}
