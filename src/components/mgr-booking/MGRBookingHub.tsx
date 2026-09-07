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
  TransportRequest,
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
  INITIAL_REQUESTS,
  INITIAL_MARKETPLACE_SETTINGS,
} from '../../data/mgrInitialData';
import { PassengerTransportSearch, SearchCriteria } from './PassengerTransportSearch';
import { TransportListingCards } from './TransportListingCards';
import { SeatMapModal } from './SeatMapModal';
import { BookingModal } from './BookingModal';
import { MGRBookingsView } from './MGRBookingsView';
import { MGRFleetView } from './MGRFleetView';
import { MGROwnersDriversView } from './MGROwnersDriversView';
import { MGRRoutesView } from './MGRRoutesView';
import { MGRVehicleRequestsView } from './MGRVehicleRequestsView';
import { MGRMarketplaceAdminView } from './MGRMarketplaceAdminView';
import { MGRCredentialsBanner } from './MGRCredentialsBanner';
import { UserAccount, getMGRPersona } from '../../utils/auth';
import { Search, Calendar, CheckCircle2, DollarSign, Car, Bus, Ship, ShieldCheck } from 'lucide-react';

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
  // State Initialization with LocalStorage Persistence
  const [owners, setOwners] = useState<TransportOwner[]>(() => {
    const saved = localStorage.getItem('mgr_transport_owners');
    return saved ? JSON.parse(saved) : INITIAL_OWNERS;
  });

  const [vehicles, setVehicles] = useState<TransportVehicle[]>(() => {
    const saved = localStorage.getItem('mgr_transport_vehicles');
    return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
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

  const [requests, setRequests] = useState<TransportRequest[]>(() => {
    const saved = localStorage.getItem('mgr_transport_requests');
    return saved ? JSON.parse(saved) : INITIAL_REQUESTS;
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
    localStorage.setItem('mgr_transport_requests', JSON.stringify(requests));
  }, [requests]);
  useEffect(() => {
    localStorage.setItem('mgr_marketplace_settings', JSON.stringify(settings));
  }, [settings]);

  // Search Criteria
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>({
    fromLocation: '',
    toLocation: '',
    travelDate: new Date().toISOString().split('T')[0],
    travelTime: '08:00',
    vehicleType: 'all',
    driverOption: 'all',
    passengersCount: 1,
  });

  // Modals state
  const [seatMapVehicle, setSeatMapVehicle] = useState<TransportVehicle | null>(null);
  const [seatMapSchedule, setSeatMapSchedule] = useState<TransportSchedule | undefined>(undefined);

  const [bookingModalVehicle, setBookingModalVehicle] = useState<TransportVehicle | null>(null);
  const [bookingType, setBookingType] = useState<'whole_vehicle' | 'seat'>('whole_vehicle');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [totalSeatPrice, setTotalSeatPrice] = useState<number | undefined>(undefined);

  // Filter available vehicles based on search criteria
  const filteredVehicles = vehicles.filter(v => {
    if (v.status !== 'active') return false;
    if (searchCriteria.vehicleType !== 'all' && v.type !== searchCriteria.vehicleType) {
      return false;
    }
    if (searchCriteria.driverOption !== 'all') {
      if (searchCriteria.driverOption === 'with_driver' && v.driverOption === 'without_driver') {
        return false;
      }
      if (searchCriteria.driverOption === 'without_driver' && v.driverOption === 'with_driver') {
        return false;
      }
    }
    if (v.totalSeats < searchCriteria.passengersCount) {
      return false;
    }
    return true;
  });

  // Modal Triggers
  const handleOpenSeatMap = (vehicle: TransportVehicle, schedule?: TransportSchedule) => {
    setSeatMapVehicle(vehicle);
    setSeatMapSchedule(schedule);
  };

  const handleProceedFromSeatMap = (seats: string[], price: number) => {
    if (!seatMapVehicle) return;
    const v = seatMapVehicle;
    setSeatMapVehicle(null);
    setBookingModalVehicle(v);
    setBookingType('seat');
    setSelectedSeats(seats);
    setTotalSeatPrice(price);
  };

  const handleOpenWholeVehicleBooking = (vehicle: TransportVehicle) => {
    setBookingModalVehicle(vehicle);
    setBookingType('whole_vehicle');
    setSelectedSeats([]);
    setTotalSeatPrice(undefined);
  };

  // Handlers for data mutations
  const handleConfirmBooking = (newBooking: TransportBooking) => {
    setBookings(prev => [newBooking, ...prev]);
  };

  const handleUpdateBookingStatus = (bookingId: string, newStatus: BookingStatus) => {
    setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status: newStatus } : b)));
  };

  const handleAddVehicle = (newVehicle: TransportVehicle) => {
    setVehicles(prev => [newVehicle, ...prev]);
  };

  const handleUpdateVehicleStatus = (vehicleId: string, status: TransportVehicle['status']) => {
    setVehicles(prev => prev.map(v => (v.id === vehicleId ? { ...v, status } : v)));
  };

  const handleAddOwner = (newOwner: TransportOwner) => {
    setOwners(prev => [newOwner, ...prev]);
  };

  const handleUpdateOwnerStatus = (ownerId: string, status: VerificationStatus) => {
    setOwners(prev => prev.map(o => (o.id === ownerId ? { ...o, status } : o)));
  };

  const handleAddDriver = (newDriver: TransportDriver) => {
    setDrivers(prev => [newDriver, ...prev]);
  };

  const handleAddRoute = (newRoute: TransportRoute) => {
    setRoutes(prev => [newRoute, ...prev]);
  };

  const handleAddSchedule = (newSchedule: TransportSchedule) => {
    setSchedules(prev => [newSchedule, ...prev]);
  };

  const handleAddRequest = (newReq: TransportRequest) => {
    setRequests(prev => [newReq, ...prev]);
  };

  const handleAddQuote = (requestId: string, newQuote: any) => {
    setRequests(prev =>
      prev.map(r => {
        if (r.id === requestId) {
          const quotes = r.quotes || [];
          return {
            ...r,
            status: 'quoted',
            quotesCount: quotes.length + 1,
            quotes: [...quotes, newQuote],
          };
        }
        return r;
      })
    );
  };

  const handleAcceptQuote = (requestId: string, quoteId: string) => {
    setRequests(prev =>
      prev.map(r => {
        if (r.id === requestId) {
          return {
            ...r,
            status: 'accepted',
            quotes: r.quotes?.map(q => ({
              ...q,
              status: q.id === quoteId ? 'accepted' : 'rejected',
            })),
          };
        }
        return r;
      })
    );
  };

  const availableRoutePairs = routes.map(r => ({ from: r.fromLocation, to: r.toLocation }));

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      {/* Passenger, Owner, and Admin Credentials Banner */}
      <MGRCredentialsBanner />

      {/* Sub-Tab Content Rendering */}
      {activeTab === 'mgr-search' && (
        <div className="space-y-6">
          <PassengerTransportSearch
            criteria={searchCriteria}
            onChangeCriteria={setSearchCriteria}
            onSearch={() => {}}
            onReset={() =>
              setSearchCriteria({
                fromLocation: '',
                toLocation: '',
                travelDate: new Date().toISOString().split('T')[0],
                travelTime: '08:00',
                vehicleType: 'all',
                driverOption: 'all',
                passengersCount: 1,
              })
            }
            availableRoutes={availableRoutePairs}
            themeMode="light"
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                Available Transport Services ({filteredVehicles.length})
              </h3>
              <span className="text-xs text-slate-500">
                Sorted by verified operators & instant availability
              </span>
            </div>

            <TransportListingCards
              vehicles={filteredVehicles}
              activeRoute={routes[0]}
              schedules={schedules}
              onOpenSeatMap={handleOpenSeatMap}
              onOpenWholeVehicleBooking={handleOpenWholeVehicleBooking}
              themeMode="light"
            />
          </div>
        </div>
      )}

      {activeTab === 'mgr-bookings' && (
        <MGRBookingsView
          bookings={bookings}
          onUpdateStatus={handleUpdateBookingStatus}
          themeMode="light"
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
          <MGRFleetView
            vehicles={vehicles}
            owners={owners}
            onAddVehicle={handleAddVehicle}
            onUpdateStatus={handleUpdateVehicleStatus}
            themeMode="light"
          />
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
            onAddSchedule={handleAddSchedule}
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
            onAddOwner={handleAddOwner}
            onUpdateOwnerStatus={handleUpdateOwnerStatus}
            onAddDriver={handleAddDriver}
            themeMode="light"
          />
        )
      )}

      {activeTab === 'mgr-requests' && (
        <MGRVehicleRequestsView
          requests={requests}
          owners={owners}
          onAddRequest={handleAddRequest}
          onAddQuote={handleAddQuote}
          onAcceptQuote={handleAcceptQuote}
          themeMode="light"
        />
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

      {/* Seat Map Modal */}
      {seatMapVehicle && (
        <SeatMapModal
          vehicle={seatMapVehicle}
          schedule={seatMapSchedule}
          onClose={() => setSeatMapVehicle(null)}
          onProceedToBooking={handleProceedFromSeatMap}
          themeMode="light"
        />
      )}

      {/* Booking Modal */}
      {bookingModalVehicle && (
        <BookingModal
          vehicle={bookingModalVehicle}
          route={routes[0]}
          bookingType={bookingType}
          selectedSeats={selectedSeats}
          totalSeatPrice={totalSeatPrice}
          travelDate={searchCriteria.travelDate}
          travelTime={searchCriteria.travelTime}
          onClose={() => setBookingModalVehicle(null)}
          onConfirmBooking={handleConfirmBooking}
          themeMode="light"
        />
      )}
    </div>
  );
};
