/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  INITIAL_CUSTOMERS,
  INITIAL_COMPLETED_RENTALS,
  INITIAL_SETTINGS, 
  INITIAL_VEHICLES, 
  INITIAL_VEHICLE_TYPES 
} from './data/initialData';
import { AppSettings, Customer, RentalRecord, Vehicle, VehicleType } from './types';
import { Navbar } from './components/Navbar';
import { StartRentalCard } from './components/StartRentalCard';
import { ActiveRentalsList } from './components/ActiveRentalsList';
import { StopRentalModal } from './components/StopRentalModal';
import { SettingsPanel } from './components/SettingsPanel';
import { RentalHistoryPanel } from './components/RentalHistoryPanel';
import { UserRolesManager } from './components/UserRolesManager';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { 
  fetchSupabaseData, 
  subscribeToSupabaseRealtime,
  syncCustomerToSupabase, 
  syncRentalToSupabase, 
  syncVehicleToSupabase 
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
import { DEFAULT_USER, UserAccount, getCurrentUser, setCurrentUserSession } from './utils/auth';

export default function App() {
  // Navigation tabs: 'rentals' | 'history' | 'users' | 'settings'
  const [activeTab, setActiveTab] = useState<'rentals' | 'history' | 'users' | 'settings'>('rentals');

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

  // Load from Supabase on startup and subscribe to realtime changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const loadData = () => {
      fetchSupabaseData().then((cloudData) => {
        if (!cloudData) return;
        if (cloudData.vehicleTypes && cloudData.vehicleTypes.length > 0) setVehicleTypes(cloudData.vehicleTypes);
        if (cloudData.vehicles && cloudData.vehicles.length > 0) setVehicles(cloudData.vehicles);
        if (cloudData.customers && cloudData.customers.length > 0) setCustomers(cloudData.customers);
        if (cloudData.activeRentals) setActiveRentals(cloudData.activeRentals);
        if (cloudData.completedRentals) setCompletedRentals(cloudData.completedRentals);
        if (cloudData.settings) setSettings(cloudData.settings);
      });
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
        syncCustomerToSupabase({
          id: `cust-${Date.now()}`,
          nicPassport: (params.customerNicPassport || '').trim().toUpperCase(),
          name: params.customerName || 'Customer',
          phone: params.customerPhone,
          notes: params.customerNotes,
          lastRentalDate: Date.now(),
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

    // 4. Live sync to Supabase
    if (isSupabaseConfigured()) {
      syncRentalToSupabase(completedRecord);
      const matchedVeh = vehicles.find((v) => v.serialNumber.toUpperCase() === completedRecord.vehicleSerialNumber.toUpperCase());
      if (matchedVeh) {
        syncVehicleToSupabase({ ...matchedVeh, status: 'available', lastRentedAt: Date.now() });
      }
    }

    // 5. Close modal
    setSettlingRental(null);
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
    <div className={`min-h-screen ${t.appBg} flex flex-col font-sans transition-colors duration-300`}>
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
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
        
        {/* Tab 1: Rental Counter Desk */}
        {activeTab === 'rentals' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              {/* Left Column: Start Rental Form */}
              <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
                <StartRentalCard
                  vehicleTypes={vehicleTypes}
                  vehicles={vehicles}
                  customers={customers}
                  settings={settings}
                  themeMode={themeMode}
                  accent={accent}
                  onStartRental={handleStartRental}
                />
              </div>

              {/* Right Column: Live Active Rentals Tracker */}
              <div className="lg:col-span-7 xl:col-span-8">
                <ActiveRentalsList
                  activeRentals={activeRentals}
                  settings={settings}
                  themeMode={themeMode}
                  accent={accent}
                  onStopRental={(rental) => setSettlingRental(rental)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: History & Daily Settlement */}
        {activeTab === 'history' && (
          <RentalHistoryPanel
            completedRentals={completedRentals}
            settings={settings}
            themeMode={themeMode}
            accent={accent}
          />
        )}

        {/* Tab 3: Users & Role Management */}
        {activeTab === 'users' && (
          <UserRolesManager
            currentUser={activeUser}
            themeMode={themeMode}
            accent={accent}
          />
        )}

        {/* Tab 4: Settings & Rates Management */}
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
            onUpdateVehicleTypes={setVehicleTypes}
            onUpdateVehicles={setVehicles}
            onUpdateSettings={setSettings}
            onResetSampleData={handleResetSampleData}
            onToggleTheme={handleToggleTheme}
            onChangeAccent={handleChangeAccent}
          />
        )}
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
