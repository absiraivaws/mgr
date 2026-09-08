/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  MGRTabType,
  TransportOwner,
  TransportVehicle,
  TransportDriver,
  TransportRoute,
  TransportSchedule,
  TransportBooking,
  MarketplaceSettings,
  BookingStatus,
  VerificationStatus,
} from '../../types/mgrBooking';
import {
  INITIAL_OWNERS,
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_ROUTES,
  INITIAL_SCHEDULES,
  INITIAL_BOOKINGS,
  INITIAL_MARKETPLACE_SETTINGS,
} from '../../data/mgrInitialData';
import { MGRTransportBooking } from './MGRTransportBooking';
import { MGRFleetView } from './MGRFleetView';
import { MGROwnersDriversView } from './MGROwnersDriversView';
import { MGRRoutesView } from './MGRRoutesView';
import { MGRMarketplaceAdminView } from './MGRMarketplaceAdminView';
import { MGRDashboardView } from './MGRDashboardView';
import { MGRSettingsView } from './MGRSettingsView';
import { UserAccount, getMGRPersona } from '../../utils/auth';
import { ShieldCheck, Car } from 'lucide-react';

interface MGRBookingHubProps {
  activeTab: MGRTabType;
  setActiveTab: (tab: MGRTabType) => void;
  themeMode?: 'dark' | 'light';
  currentUser?: UserAccount;
}

export const MGRBookingHub: React.FC<MGRBookingHubProps> = ({
  activeTab,
  setActiveTab,
  themeMode = 'light',
  currentUser,
}) => {
  const persona = getMGRPersona(currentUser);
  const isPassenger = persona === 'passenger';
  const isOwner = persona === 'owner';
  const isAdminUser = persona === 'admin';

  // Dynamic Grid Columns Selector State (1, 2, 3, 4)
  const [columnsCount, setColumnsCount] = useState<number>(3);

  // State Initialization with LocalStorage Persistence
  const [owners, setOwners] = useState<TransportOwner[]>(() => {
    const saved = localStorage.getItem('mgr_transport_owners');
    return saved ? JSON.parse(saved) : INITIAL_OWNERS;
  });

  const [vehicles, setVehicles] = useState<TransportVehicle[]>(() => {
    try {
      const saved = localStorage.getItem('mgr_transport_vehicles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 50) {
          return parsed;
        }
        const existingIds = new Set(parsed.map((v: any) => v.id));
        const combined = [...parsed, ...INITIAL_VEHICLES.filter((v) => !existingIds.has(v.id))];
        localStorage.setItem('mgr_transport_vehicles', JSON.stringify(combined));
        return combined;
      }
    } catch {}
    localStorage.setItem('mgr_transport_vehicles', JSON.stringify(INITIAL_VEHICLES));
    return INITIAL_VEHICLES;
  });

  const [drivers, setDrivers] = useState<TransportDriver[]>(() => {
    const saved = localStorage.getItem('mgr_transport_drivers');
    return saved ? JSON.parse(saved) : INITIAL_DRIVERS;
  });

  const [routes, setRoutes] = useState<TransportRoute[]>(() => {
    const saved = localStorage.getItem('mgr_transport_routes');
    return saved ? JSON.parse(saved) : INITIAL_ROUTES;
  });

  const [schedules, setSchedules] = useState<TransportSchedule[]>(() => {
    const saved = localStorage.getItem('mgr_transport_schedules');
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULES;
  });

  const [bookings, setBookings] = useState<TransportBooking[]>(() => {
    const saved = localStorage.getItem('mgr_transport_bookings');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  const [settings, setSettings] = useState<MarketplaceSettings>(() => {
    const saved = localStorage.getItem('mgr_marketplace_settings');
    return saved ? JSON.parse(saved) : INITIAL_MARKETPLACE_SETTINGS;
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('mgr_transport_owners', JSON.stringify(owners));
  }, [owners]);
  useEffect(() => {
    localStorage.setItem('mgr_transport_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);
  useEffect(() => {
    localStorage.setItem('mgr_transport_drivers', JSON.stringify(drivers));
  }, [drivers]);
  useEffect(() => {
    localStorage.setItem('mgr_transport_routes', JSON.stringify(routes));
  }, [routes]);
  useEffect(() => {
    localStorage.setItem('mgr_transport_schedules', JSON.stringify(schedules));
  }, [schedules]);
  useEffect(() => {
    localStorage.setItem('mgr_transport_bookings', JSON.stringify(bookings));
  }, [bookings]);
  useEffect(() => {
    localStorage.setItem('mgr_marketplace_settings', JSON.stringify(settings));
  }, [settings]);





  const handleUpdateBookingStatus = (bookingId: string, newStatus: BookingStatus) => {
    setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status: newStatus } : b)));
  };

  const handleEditBooking = (updated: TransportBooking) => {
    setBookings(prev => prev.map(b => (b.id === updated.id ? updated : b)));
  };

  const handleDeleteBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  const handleAddVehicle = (newVehicle: TransportVehicle) => {
    setVehicles(prev => [newVehicle, ...prev]);
  };

  const handleUpdateVehicleStatus = (vehicleId: string, status: TransportVehicle['status']) => {
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, status } : v)));
  };

  const handleEditVehicle = (updated: TransportVehicle) => {
    setVehicles(prev => prev.map(v => (v.id === updated.id ? updated : v)));
  };

  const handleDeleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const handleAddOwner = (newOwner: TransportOwner) => {
    setOwners(prev => [newOwner, ...prev]);
  };

  const handleUpdateOwnerStatus = (ownerId: string, status: VerificationStatus) => {
    setOwners(prev => prev.map(o => (o.id === ownerId ? { ...o, status } : o)));
  };

  const handleEditOwner = (updated: TransportOwner) => {
    setOwners(prev => prev.map(o => (o.id === updated.id ? updated : o)));
  };

  const handleDeleteOwner = (id: string) => {
    setOwners(prev => prev.filter(o => o.id !== id));
  };

  const handleAddDriver = (newDriver: TransportDriver) => {
    setDrivers(prev => [newDriver, ...prev]);
  };

  const handleUpdateDriverStatus = (driverId: string, status: TransportDriver['status']) => {
    setDrivers(prev => prev.map(d => (d.id === driverId ? { ...d, status } : d)));
  };

  const handleEditDriver = (updated: TransportDriver) => {
    setDrivers(prev => prev.map(d => (d.id === updated.id ? updated : d)));
  };

  const handleDeleteDriver = (id: string) => {
    setDrivers(prev => prev.filter(d => d.id !== id));
  };

  const handleAddRoute = (newRoute: TransportRoute) => {
    setRoutes(prev => [newRoute, ...prev]);
  };

  const handleUpdateRouteStatus = (routeId: string, status: TransportRoute['status']) => {
    setRoutes(prev => prev.map(r => (r.id === routeId ? { ...r, status } : r)));
  };

  const handleEditRoute = (updated: TransportRoute) => {
    setRoutes(prev => prev.map(r => (r.id === updated.id ? updated : r)));
  };

  const handleDeleteRoute = (id: string) => {
    setRoutes(prev => prev.filter(r => r.id !== id));
  };

  const handleAddSchedule = (newSchedule: TransportSchedule) => {
    setSchedules(prev => [newSchedule, ...prev]);
  };



  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      {/* Sub-Tab Content Rendering */}
      {activeTab === 'mgr-dashboard' && (
        <MGRDashboardView
          vehicles={vehicles}
          owners={owners}
          drivers={drivers}
          bookings={bookings}
          settings={settings}
          onNavigate={(tab) => setActiveTab(tab)}
          currentUser={currentUser}
          themeMode={themeMode}
        />
      )}

      {activeTab === 'mgr-search' && (
        <MGRTransportBooking
          view="search"
          vehicles={vehicles}
          owners={owners}
          currentUser={currentUser}
          convenienceFeePercentage={settings.convenienceFeePercentage ?? settings.commissionPercentage ?? 5}
        />
      )}

      {activeTab === 'mgr-bookings' && (
        <MGRTransportBooking
          view="requests"
          vehicles={vehicles}
          owners={owners}
          currentUser={currentUser}
          convenienceFeePercentage={settings.convenienceFeePercentage ?? settings.commissionPercentage ?? 5}
        />
      )}

      {activeTab === 'mgr-fleet' && (
        isPassenger ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Fleet Management Restricted</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Passenger accounts do not have access to fleet and boat management. Please use Find Transport to search and book rides.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('mgr-search')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
            >
              Go to Find Transport
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <MGRFleetView
              vehicles={vehicles}
              owners={owners}
              currentUser={currentUser}
              onAddVehicle={handleAddVehicle}
              onUpdateStatus={handleUpdateVehicleStatus}
              onEditVehicle={handleEditVehicle}
              onDeleteVehicle={handleDeleteVehicle}
              isAdmin={isAdminUser}
              themeMode="light"
            />
          </div>
        )
      )}

      {activeTab === 'mgr-routes' && (
        !isAdminUser ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Admin Restricted</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Master route creation and fare configuration are restricted to MGR System Administrators.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab(isOwner ? 'mgr-fleet' : 'mgr-search')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
            >
              Return to Allowed Tabs
            </button>
          </div>
        ) : (
          <MGRRoutesView
            routes={routes}
            schedules={schedules}
            onAddRoute={handleAddRoute}
            onUpdateRouteStatus={handleUpdateRouteStatus}
            onEditRoute={handleEditRoute}
            onDeleteRoute={handleDeleteRoute}
            onAddSchedule={handleAddSchedule}
            isAdmin={isAdminUser}
            themeMode="light"
          />
        )
      )}

      {activeTab === 'mgr-owners' && (
        isPassenger ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Owner and driver rosters are restricted to operators and administrators.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('mgr-search')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
            >
              Go to Find Transport
            </button>
          </div>
        ) : (
          <MGROwnersDriversView
            owners={owners}
            drivers={drivers}
            vehicles={vehicles}
            currentUser={currentUser}
            onAddOwner={handleAddOwner}
            onUpdateOwnerStatus={handleUpdateOwnerStatus}
            onEditOwner={handleEditOwner}
            onDeleteOwner={handleDeleteOwner}
            onAddDriver={handleAddDriver}
            onUpdateDriverStatus={handleUpdateDriverStatus}
            onEditDriver={handleEditDriver}
            onDeleteDriver={handleDeleteDriver}
            isAdmin={isAdminUser}
            themeMode="light"
          />
        )
      )}

      {activeTab === 'mgr-requests' && (
        <MGRTransportBooking
          view="requests"
          vehicles={vehicles}
          owners={owners}
          currentUser={currentUser}
          convenienceFeePercentage={settings.convenienceFeePercentage ?? settings.commissionPercentage ?? 5}
        />
      )}

      {activeTab === 'mgr-settings' && (
        !isAdminUser ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Administrator Access Required</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Global marketplace settings, convenience fee rate, and SQL Query Console are restricted to MGR System Administrators.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab(isOwner ? 'mgr-fleet' : 'mgr-search')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
            >
              Return to Allowed Tabs
            </button>
          </div>
        ) : (
          <MGRSettingsView
            settings={settings}
            onUpdateSettings={setSettings}
            isAdmin={isAdminUser}
            themeMode={themeMode}
          />
        )
      )}

      {activeTab === 'mgr-admin' && (
        !isAdminUser ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Administrator Access Required</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Marketplace oversight, settings, and partner verification queues are restricted to MGR System Administrators.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab(isOwner ? 'mgr-fleet' : 'mgr-search')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
            >
              Return to Allowed Tabs
            </button>
          </div>
        ) : (
          <MGRMarketplaceAdminView
            owners={owners}
            vehicles={vehicles}
            bookings={bookings}
            settings={settings}
            onUpdateSettings={setSettings}
            onApproveOwner={ownerId => handleUpdateOwnerStatus(ownerId, 'verified')}
            themeMode="light"
          />
        )
      )}

    </div>
  );
};
