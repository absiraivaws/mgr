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
import { MGRCustomersView } from './MGRCustomersView';
import { MGRHistoryView } from './MGRHistoryView';
import { Customer } from '../../types';
import { UserAccount, getMGRPersona } from '../../utils/auth';
import { ShieldCheck, Car } from 'lucide-react';
import {
  fetchMGRTransportData,
  syncTransportVehicleToSupabase,
  deleteTransportVehicleFromSupabase,
  syncTransportOwnerToSupabase,
  deleteTransportOwnerFromSupabase,
  syncTransportDriverToSupabase,
  deleteTransportDriverFromSupabase,
  syncTransportRouteToSupabase,
  deleteTransportRouteFromSupabase,
  syncTransportBookingToSupabase,
  deleteTransportBookingFromSupabase,
  syncMarketplaceSettingsToSupabase,
} from '../../lib/supabaseSync';

interface MGRBookingHubProps {
  activeTab: MGRTabType;
  setActiveTab: (tab: MGRTabType) => void;
  themeMode?: 'dark' | 'light';
  currentUser?: UserAccount;
  customers?: Customer[];
  onAddCustomer?: (newCustomer: Customer) => void;
  onEditCustomer?: (updated: Customer) => void;
  onDeleteCustomer?: (id: string) => void;
}

export const MGRBookingHub: React.FC<MGRBookingHubProps> = ({
  activeTab,
  setActiveTab,
  themeMode = 'light',
  currentUser,
  customers = [],
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
}) => {
  const persona = getMGRPersona(currentUser);
  const isPassenger = persona === 'passenger';
  const isOwner = persona === 'owner';
  const isAdminUser = persona === 'admin';

  // Dynamic Grid Columns Selector State (1, 2, 3, 4)
  const [columnsCount, setColumnsCount] = useState<number>(3);

  // State Initialization with LocalStorage Persistence (Hardcoded mock data stripped)
  const [owners, setOwners] = useState<TransportOwner[]>(() => {
    try {
      const saved = localStorage.getItem('mgr_transport_owners');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((o: any) => !o.id?.startsWith('OWN-MGR-0000')) : [];
      }
    } catch {}
    return INITIAL_OWNERS;
  });

  const [vehicles, setVehicles] = useState<TransportVehicle[]>(() => {
    try {
      const saved = localStorage.getItem('mgr_transport_vehicles');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((v: any) => 
          !v.id?.startsWith('MGR-CAR-0000') &&
          !v.id?.startsWith('MGR-VAN-0000') &&
          !v.id?.startsWith('MGR-BUS-0000') &&
          !v.id?.startsWith('MGR-BOAT-0000') &&
          !v.id?.startsWith('MGR-SAFARI-0000') &&
          !v.id?.startsWith('MGR-VEH-0000010') &&
          v.registrationNumber !== 'WP NG-9911' &&
          v.registrationNumber !== 'EP CAB-3180'
        ) : [];
      }
    } catch {}
    return INITIAL_VEHICLES;
  });

  const [drivers, setDrivers] = useState<TransportDriver[]>(() => {
    try {
      const saved = localStorage.getItem('mgr_transport_drivers');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((d: any) => !d.id?.startsWith('DRV-MGR-0000')) : [];
      }
    } catch {}
    return INITIAL_DRIVERS;
  });

  const [routes, setRoutes] = useState<TransportRoute[]>(() => {
    try {
      const saved = localStorage.getItem('mgr_transport_routes');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((r: any) => !r.id?.startsWith('ROUTE-00')) : [];
      }
    } catch {}
    return INITIAL_ROUTES;
  });

  const [schedules, setSchedules] = useState<TransportSchedule[]>(() => {
    try {
      const saved = localStorage.getItem('mgr_transport_schedules');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((s: any) => !s.id?.startsWith('SCH-00')) : [];
      }
    } catch {}
    return INITIAL_SCHEDULES;
  });

  const [bookings, setBookings] = useState<TransportBooking[]>(() => {
    try {
      const saved = localStorage.getItem('mgr_transport_bookings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((b: any) => 
          !b.id?.startsWith('BK-00') &&
          b.vehicleRegNumber !== 'VAN' &&
          b.vehicleRegNumber !== 'KR - 1927' &&
          b.vehicleRegNumber !== 'WP NG-9911' &&
          b.vehicleRegNumber !== 'EP CAB-3180' &&
          !b.vehicleName?.includes('Aquasports') &&
          !b.vehicleName?.includes('Scania Metrolink')
        ) : [];
      }
    } catch {}
    return INITIAL_BOOKINGS;
  });

  const [settings, setSettings] = useState<MarketplaceSettings>(() => {
    try {
      const saved = localStorage.getItem('mgr_marketplace_settings');
      return saved ? JSON.parse(saved) : INITIAL_MARKETPLACE_SETTINGS;
    } catch {}
    return INITIAL_MARKETPLACE_SETTINGS;
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
    syncMarketplaceSettingsToSupabase(settings);
  }, [settings]);

  // Initial load from Supabase if connected
  // Initial load from Supabase if connected with bidirectional merge
  useEffect(() => {
    fetchMGRTransportData().then((remote) => {
      if (!remote) return;

      // Vehicles sync: bidirectional merge
      setVehicles((prevVehicles) => {
        const remoteList = remote.vehicles || [];
        const unsynced = prevVehicles.filter(
          (pv) =>
            !remoteList.some(
              (rv) =>
                rv.id === pv.id ||
                (rv.registrationNumber &&
                  pv.registrationNumber &&
                  rv.registrationNumber.trim().toUpperCase() === pv.registrationNumber.trim().toUpperCase())
            )
        );
        unsynced.forEach((v) => syncTransportVehicleToSupabase(v));
        const merged = [...remoteList, ...unsynced];
        try {
          localStorage.setItem('mgr_transport_vehicles', JSON.stringify(merged));
        } catch {}
        return merged;
      });

      // Owners sync: bidirectional merge
      setOwners((prevOwners) => {
        const remoteList = remote.owners || [];
        const unsynced = prevOwners.filter(
          (po) =>
            !remoteList.some(
              (ro) =>
                ro.id === po.id ||
                (ro.email && po.email && ro.email.trim().toLowerCase() === po.email.trim().toLowerCase())
            )
        );
        unsynced.forEach((o) => syncTransportOwnerToSupabase(o));
        const merged = [...remoteList, ...unsynced];
        try {
          localStorage.setItem('mgr_transport_owners', JSON.stringify(merged));
        } catch {}
        return merged;
      });

      // Drivers sync: bidirectional merge
      setDrivers((prevDrivers) => {
        const remoteList = remote.drivers || [];
        const unsynced = prevDrivers.filter(
          (pd) =>
            !remoteList.some(
              (rd) =>
                rd.id === pd.id ||
                (rd.licenceNumber &&
                  pd.licenceNumber &&
                  rd.licenceNumber.trim().toUpperCase() === pd.licenceNumber.trim().toUpperCase())
            )
        );
        unsynced.forEach((d) => syncTransportDriverToSupabase(d));
        const merged = [...remoteList, ...unsynced];
        try {
          localStorage.setItem('mgr_transport_drivers', JSON.stringify(merged));
        } catch {}
        return merged;
      });

      // Routes sync: bidirectional merge
      setRoutes((prevRoutes) => {
        const remoteList = remote.routes || [];
        const unsynced = prevRoutes.filter((pr) => !remoteList.some((rr) => rr.id === pr.id));
        unsynced.forEach((r) => syncTransportRouteToSupabase(r));
        const merged = [...remoteList, ...unsynced];
        try {
          localStorage.setItem('mgr_transport_routes', JSON.stringify(merged));
        } catch {}
        return merged;
      });

      // Schedules sync
      if (remote.schedules && remote.schedules.length > 0) {
        setSchedules(remote.schedules);
        try {
          localStorage.setItem('mgr_transport_schedules', JSON.stringify(remote.schedules));
        } catch {}
      }

      // Bookings sync: bidirectional merge
      setBookings((prevBookings) => {
        const remoteList = remote.bookings || [];
        const unsynced = prevBookings.filter(
          (pb) =>
            !remoteList.some(
              (rb) =>
                rb.id === pb.id ||
                (rb.bookingNumber && pb.bookingNumber && rb.bookingNumber === pb.bookingNumber)
            )
        );
        unsynced.forEach((b) => syncTransportBookingToSupabase(b));
        const merged = [...remoteList, ...unsynced];
        try {
          localStorage.setItem('mgr_transport_bookings', JSON.stringify(merged));
        } catch {}
        return merged;
      });

      if (remote.settings) {
        setSettings(remote.settings);
        try {
          localStorage.setItem('mgr_marketplace_settings', JSON.stringify(remote.settings));
        } catch {}
      }
    });
  }, []);

  // Periodic background data sync based on Admin Settings (10s, 30s, 1m, 2m)
  useEffect(() => {
    const intervalMs = settings.dataSyncInterval || 30000;
    const timer = setInterval(() => {
      fetchTransportDataFromSupabase().then(remote => {
        if (!remote) return;
        if (remote.vehicles && remote.vehicles.length > 0) {
          setVehicles(remote.vehicles);
        }
        if (remote.owners && remote.owners.length > 0) {
          setOwners(remote.owners);
        }
        if (remote.bookings && remote.bookings.length > 0) {
          setBookings(prev => {
            const remoteList = remote.bookings || [];
            const unsynced = prev.filter(
              pb => !remoteList.some(rb => rb.id === pb.id || (rb.bookingNumber && pb.bookingNumber && rb.bookingNumber === pb.bookingNumber))
            );
            return [...remoteList, ...unsynced];
          });
        }
        if (remote.settings) {
          setSettings(remote.settings);
        }
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [settings.dataSyncInterval]);

  const handleUpdateBookingStatus = (bookingId: string, newStatus: BookingStatus) => {
    setBookings(prev => {
      const updated = prev.map(b => (b.id === bookingId ? { ...b, status: newStatus } : b));
      const target = updated.find(b => b.id === bookingId);
      if (target) syncTransportBookingToSupabase(target);
      return updated;
    });
  };

  const handleEditBooking = (updated: TransportBooking) => {
    setBookings(prev => prev.map(b => (b.id === updated.id ? updated : b)));
    syncTransportBookingToSupabase(updated);
  };

  const handleDeleteBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
    deleteTransportBookingFromSupabase(id);
  };

  const handleAddVehicle = (newVehicle: TransportVehicle) => {
    setVehicles(prev => [newVehicle, ...prev]);
    syncTransportVehicleToSupabase(newVehicle);
  };

  const handleUpdateVehicleStatus = (vehicleId: string, status: TransportVehicle['status']) => {
    setVehicles(prev => {
      const updated = prev.map(v => (v.id === vehicleId ? { ...v, status } : v));
      const target = updated.find(v => v.id === vehicleId);
      if (target) syncTransportVehicleToSupabase(target);
      return updated;
    });
  };

  const handleEditVehicle = (updated: TransportVehicle) => {
    setVehicles(prev => prev.map(v => (v.id === updated.id ? updated : v)));
    syncTransportVehicleToSupabase(updated);
  };

  const handleDeleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
    deleteTransportVehicleFromSupabase(id);
  };

  const handleAddOwner = (newOwner: TransportOwner) => {
    setOwners(prev => [newOwner, ...prev]);
    syncTransportOwnerToSupabase(newOwner);
  };

  const handleUpdateOwnerStatus = (ownerId: string, status: VerificationStatus) => {
    setOwners(prev => {
      const updated = prev.map(o => (o.id === ownerId ? { ...o, status } : o));
      const target = updated.find(o => o.id === ownerId);
      if (target) syncTransportOwnerToSupabase(target);
      return updated;
    });
  };

  const handleEditOwner = (updated: TransportOwner) => {
    setOwners(prev => prev.map(o => (o.id === updated.id ? updated : o)));
    syncTransportOwnerToSupabase(updated);
  };

  const handleDeleteOwner = (id: string) => {
    setOwners(prev => prev.filter(o => o.id !== id));
    deleteTransportOwnerFromSupabase(id);
  };

  const handleAddDriver = (newDriver: TransportDriver) => {
    setDrivers(prev => [newDriver, ...prev]);
    syncTransportDriverToSupabase(newDriver);
  };

  const handleUpdateDriverStatus = (driverId: string, status: TransportDriver['status']) => {
    setDrivers(prev => {
      const updated = prev.map(d => (d.id === driverId ? { ...d, status } : d));
      const target = updated.find(d => d.id === driverId);
      if (target) syncTransportDriverToSupabase(target);
      return updated;
    });
  };

  const handleEditDriver = (updated: TransportDriver) => {
    setDrivers(prev => prev.map(d => (d.id === updated.id ? updated : d)));
    syncTransportDriverToSupabase(updated);
  };

  const handleDeleteDriver = (id: string) => {
    setDrivers(prev => prev.filter(d => d.id !== id));
    deleteTransportDriverFromSupabase(id);
  };

  const handleAddRoute = (newRoute: TransportRoute) => {
    setRoutes(prev => [newRoute, ...prev]);
    syncTransportRouteToSupabase(newRoute);
  };

  const handleUpdateRouteStatus = (routeId: string, status: TransportRoute['status']) => {
    setRoutes(prev => {
      const updated = prev.map(r => (r.id === routeId ? { ...r, status } : r));
      const target = updated.find(r => r.id === routeId);
      if (target) syncTransportRouteToSupabase(target);
      return updated;
    });
  };

  const handleEditRoute = (updated: TransportRoute) => {
    setRoutes(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    syncTransportRouteToSupabase(updated);
  };

  const handleDeleteRoute = (id: string) => {
    setRoutes(prev => prev.filter(r => r.id !== id));
    deleteTransportRouteFromSupabase(id);
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
          settings={settings}
        />
      )}

      {activeTab === 'mgr-bookings' && (
        <MGRTransportBooking
          view="requests"
          vehicles={vehicles}
          owners={owners}
          currentUser={currentUser}
          convenienceFeePercentage={settings.convenienceFeePercentage ?? settings.commissionPercentage ?? 5}
          settings={settings}
        />
      )}

      {activeTab === 'mgr-history' && (
        <MGRHistoryView
          currentUser={currentUser}
          isAdmin={isAdminUser}
          themeMode={themeMode}
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

      {activeTab === 'mgr-customers' && (
        !isAdminUser ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              The Customers directory is restricted to system administrators.
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
          <MGRCustomersView
            customers={customers || []}
            owners={owners}
            drivers={drivers}
            vehicles={vehicles}
            currentUser={currentUser}
            isAdmin={isAdminUser}
            onAddCustomer={onAddCustomer || (() => {})}
            onEditCustomer={onEditCustomer || (() => {})}
            onDeleteCustomer={onDeleteCustomer || (() => {})}
            onAddOwner={handleAddOwner}
            onEditOwner={handleEditOwner}
            onDeleteOwner={handleDeleteOwner}
            onAddDriver={handleAddDriver}
            onEditDriver={handleEditDriver}
            onDeleteDriver={handleDeleteDriver}
            themeMode={themeMode}
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
          settings={settings}
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
