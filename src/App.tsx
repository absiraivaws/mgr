/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { 
  INITIAL_CUSTOMERS,
  INITIAL_COMPLETED_RENTALS,
  INITIAL_SETTINGS, 
  INITIAL_VEHICLES,
  INITIAL_VEHICLE_TYPES 
} from './data/initialData';
import { AppSettings, Customer, IncomeEntry, RentalRecord, Vehicle, VehicleType } from './types';
import { Navbar, NavTabType } from './components/Navbar';
import { StartRentalCard } from './components/StartRentalCard';
import { ActiveRentalsList } from './components/ActiveRentalsList';
import { StopRentalModal } from './components/StopRentalModal';
import { SettingsPanel } from './components/SettingsPanel';
import { RentalHistoryPanel } from './components/RentalHistoryPanel';
import { UserRolesManager } from './components/UserRolesManager';
import { DashboardStats } from './components/DashboardStats';
import { IncomeExpensesPanel } from './components/IncomeExpensesPanel';
import { CustomerManagementPanel } from './components/CustomerManagementPanel';
import { AuthModal } from './components/AuthModal';
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
  syncAllUsersToSupabase,
  syncAllRolesToSupabase,
  fetchIncomeEntries,
  deleteIncomeEntryFromSupabase,
  deleteRentalFromSupabase
} from './lib/supabaseSync';
import { isSupabaseConfigured } from './lib/supabase';
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
  UserAccount, 
  getCurrentUser, 
  setCurrentUserSession,
  getStoredUsers,
  getStoredRoles,
  saveStoredUsers,
  saveStoredRoles
} from './utils/auth';

export default function App() {
  // Navigation tabs: 'rentals' | 'history' | 'users' | 'settings' | 'income' | 'dashboard' | 'customers'
  const [activeTab, setActiveTab] = useState<NavTabType>('rentals');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // Authenticated User Session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFullLoginPage, setIsFullLoginPage] = useState(false);

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
      return saved ? JSON.parse(saved) : [];
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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_COMPLETED_RENTALS;
    } catch {
      return INITIAL_COMPLETED_RENTALS;
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

  // Load from Supabase on startup and subscribe to realtime changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const loadData = async () => {
      const [cloudData, cloudIncome] = await Promise.all([
        fetchSupabaseData(),
        fetchIncomeEntries(),
      ]);
      if (cloudData) {
        // Only overwrite local data if cloud data exists AND has content
        if (cloudData.vehicleTypes && cloudData.vehicleTypes.length > 0) setVehicleTypes(cloudData.vehicleTypes);
        if (cloudData.vehicles && cloudData.vehicles.length > 0) setVehicles(cloudData.vehicles);
        if (cloudData.customers && cloudData.customers.length > 0) setCustomers(cloudData.customers);
        // Always load rentals from Supabase to ensure history is up to date
        if (cloudData.activeRentals !== undefined) setActiveRentals(cloudData.activeRentals);
        if (cloudData.completedRentals !== undefined) setCompletedRentals(cloudData.completedRentals);
        if (cloudData.settings) setSettings(cloudData.settings);

        if (cloudData.userAccounts && cloudData.userAccounts.length > 0) {
          saveStoredUsers(cloudData.userAccounts);
        } else {
          syncAllUsersToSupabase(getStoredUsers());
        }

        if (cloudData.roles && cloudData.roles.length > 0) {
          saveStoredRoles(cloudData.roles);
        } else {
          syncAllRolesToSupabase(getStoredRoles());
        }
      }
      // If cloud data is empty/missing, keep local initial data as fallback
      else {
        console.log('No cloud data found, keeping local data as fallback');
      }
      if (cloudIncome && cloudIncome.length > 0) {
        setIncomeEntries(cloudIncome);
      }
    };

    loadData();

    // Live subscription across devices / tabs
    const unsubscribe = subscribeToSupabaseRealtime(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handlers for Settings, Vehicles, and Types with real-time Supabase sync
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('v_rental_settings', JSON.stringify(newSettings));
    if (isSupabaseConfigured()) {
      syncSettingsToSupabase(newSettings);
    }
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
          : prev.findIndex((c) => c.name.toLowerCase() === (params.customerName || '').trim().toLowerCase());

        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            name: params.customerName || next[existingIdx].name,
            phone: params.customerPhone || next[existingIdx].phone,
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
            phone: params.customerPhone?.trim() || '',
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

    const rentalCount = completedRentals.length + activeRentals.length + 101;
    const newRental: RentalRecord = {
      id: `rental-${Date.now()}`,
      rentalNumber: `${settings.rentalNumberPrefix || 'REN'}-${rentalCount}`,
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
      startTime: Date.now(),
      status: 'active',
      rateSnapshot: { ...typeObj.rates },
      totalAmount: typeObj.rates.firstHour,
      cashierName: currentUser?.name || settings.cashierName || 'Cashier',
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

    // 4. Automatically add rental revenue to Income & Expenses Ledger
    if (completedRecord.totalAmount && completedRecord.totalAmount > 0) {
      const rentalIncomeEntry: IncomeEntry = {
        id: `inc-rent-${completedRecord.id}`,
        date: new Date(completedRecord.completedAt || Date.now()).toISOString().slice(0, 10),
        description: `Rental #${completedRecord.rentalNumber} — ${completedRecord.vehicleTypeName} (${completedRecord.vehicleSerialNumber})`,
        type: 'income',
        amount: completedRecord.totalAmount,
        category: 'Rental Revenue',
        who: 'Mark',
        createdAt: Date.now(),
        cashierName: completedRecord.cashierName || currentUser?.name || settings.cashierName || 'Cashier',
      };

      setIncomeEntries((prev) => [rentalIncomeEntry, ...prev]);

      if (isSupabaseConfigured()) {
        syncIncomeEntryToSupabase(rentalIncomeEntry);
      }
    }

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

  const handleDeleteCustomer = (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    if (isSupabaseConfigured()) {
      deleteCustomerFromSupabase(customerId);
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

    if (isSupabaseConfigured()) {
      deleteRentalFromSupabase(target.id, target.rentalNumber);
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

  const handleLogout = () => {
    setCurrentUserSession(null);
    setCurrentUser(DEFAULT_USER);
    setIsFullLoginPage(true);
  };

  // If user explicitly navigated to full login page
  if (isFullLoginPage) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsFullLoginPage(false);
          setSettings((prev) => ({ ...prev, cashierName: user.name }));
          setActiveTab('rentals');
        }}
        settings={settings}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        accent={accent}
        onChangeAccent={handleChangeAccent}
      />
    );
  }

  const activeUser = currentUser || DEFAULT_USER;

  return (
    <div className={`flex flex-col min-h-screen ${t.appBg} w-full overflow-auto font-sans transition-colors duration-300`}>
      {/* Top Navigation Bar with Theme Toggles, Palette Picker, Inactive Bordered Tabs & User Login */}
      <Navbar
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
        onLogout={handleLogout}
        themeMode={themeMode}
        accent={accent}
        onToggleTheme={handleToggleTheme}
        onChangeAccent={handleChangeAccent}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
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
                themeMode={themeMode}
                accent={accent}
                onStartRental={handleStartRental}
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
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
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
              onUserListChange={() => {
                const refreshed = getCurrentUser();
                if (refreshed) setCurrentUser(refreshed);
              }}
              onRolePermissionsChange={() => {
                const refreshed = getCurrentUser();
                if (refreshed) setCurrentUser(refreshed);
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

          {/* Tab 6: Income & Expenses */}
          {activeTab === 'income' && (
            <IncomeExpensesPanel
              entries={incomeEntries}
              settings={settings}
              themeMode={themeMode}
              accent={accent}
              currentUser={activeUser}
              onAddEntry={(entry) => {
                setIncomeEntries((prev) => [entry, ...prev]);
                if (isSupabaseConfigured()) {
                  syncIncomeEntryToSupabase(entry);
                }
              }}
              onDeleteEntry={(id) => {
                setIncomeEntries((prev) => prev.filter((e) => e.id !== id));
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
              settings={settings}
              currentUser={activeUser}
              themeMode={themeMode}
              accent={accent}
            />
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
          setSettings((prev) => ({ ...prev, cashierName: u.name }));
        }}
        onOpenUserRoles={() => {
          setActiveTab('users');
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
    </div>
  );
}
