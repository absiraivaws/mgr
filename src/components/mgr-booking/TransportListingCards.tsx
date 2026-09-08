/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Car,
  Bus,
  Ship,
  Star,
  Users,
  Wind,
  ShieldCheck,
  Compass,
  Luggage,
  Sparkles,
  DollarSign,
  Clock,
} from 'lucide-react';
import { TransportVehicle, TransportRoute, TransportSchedule } from '../../types/mgrBooking';

interface TransportListingCardsProps {
  vehicles: TransportVehicle[];
  activeRoute?: TransportRoute;
  schedules: TransportSchedule[];
  columnsCount?: number; // 1, 2, 3, 4
  onOpenSeatMap: (vehicle: TransportVehicle, schedule?: TransportSchedule) => void;
  onOpenWholeVehicleBooking: (vehicle: TransportVehicle) => void;
  onCreateBid?: (vehicle: TransportVehicle) => void;
  onViewBids?: (vehicle: TransportVehicle) => void;
  themeMode?: 'dark' | 'light';
  isAdmin?: boolean;
}

export const TransportListingCards: React.FC<TransportListingCardsProps> = ({
  vehicles,
  activeRoute,
  schedules,
  columnsCount = 2,
  onOpenSeatMap,
  onOpenWholeVehicleBooking,
  onCreateBid,
  onViewBids,
  themeMode = 'light',
  isAdmin = false,
}) => {
  if (vehicles.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-xl">
          🔍
        </div>
        <h3 className="text-sm font-bold text-slate-900">No Transport Services Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No vehicles or boats matched your search criteria. Try adjusting the departure location, destination, or vehicle type.
        </p>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bus':
      case 'bus_trip':
        return <Bus className="w-4 h-4 text-emerald-700" />;
      case 'route_bus':
        return <Bus className="w-4 h-4 text-blue-700" />;
      case 'safari':
        return <Compass className="w-4 h-4 text-amber-700" />;
      case 'boat':
        return <Ship className="w-4 h-4 text-cyan-700" />;
      case 'van':
        return <Car className="w-4 h-4 text-teal-700" />;
      default:
        return <Car className="w-4 h-4 text-blue-700" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bus_trip':
        return 'Bus for Trip (Whole)';
      case 'route_bus':
        return 'Route Bus (Scheduled)';
      case 'safari':
        return 'Safari 4x4 Jeep';
      case 'van':
        return 'Van';
      case 'car':
        return 'Car';
      case 'boat':
        return 'Boat / Cruise';
      default:
        return type;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'bus':
      case 'bus_trip':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'route_bus':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'safari':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'boat':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'van':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getGridColsClass = (cols: number) => {
    switch (cols) {
      case 1:
        return 'grid-cols-1';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      case 2:
      default:
        return 'grid-cols-1 lg:grid-cols-2';
    }
  };

  return (
    <div className={`grid ${getGridColsClass(columnsCount)} gap-4`}>
      {vehicles.map(vehicle => {
        const schedule = schedules.find(s => s.vehicleId === vehicle.id);
        const isRouteBus = vehicle.type === 'route_bus';
        const isTripBus = vehicle.type === 'bus_trip';
        const isSafari = vehicle.type === 'safari';
        const isSeatBookingAvailable = isRouteBus || (vehicle.type === 'boat' && vehicle.pricePerSeat);
        const seatPrice = schedule?.farePerSeat || vehicle.pricePerSeat;
        const oneDayPrice = vehicle.oneDayPrice || vehicle.basePrice;
        const pendingBidsCount = vehicle.bids?.filter(b => b.status === 'pending').length || 0;

        return (
          <div
            key={vehicle.id}
            className="rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
          >
            {/* Upper Content */}
            <div className="p-5 space-y-3.5">
              {/* Top Meta Bar */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getTypeBadgeClass(
                        vehicle.type
                      )}`}
                    >
                      {getTypeIcon(vehicle.type)}
                      {getTypeLabel(vehicle.type)}
                    </span>
                    <span className="font-mono text-xs text-slate-500 font-semibold">
                      {vehicle.registrationNumber}
                    </span>

                    {/* Bids indicator */}
                    {pendingBidsCount > 0 && onViewBids && (
                      <button
                        type="button"
                        onClick={() => onViewBids(vehicle)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300 hover:bg-amber-200 cursor-pointer"
                        title="View passenger bids for this vehicle"
                      >
                        <DollarSign className="w-3 h-3 text-amber-700" />
                        <span>{pendingBidsCount} Bid{pendingBidsCount > 1 ? 's' : ''}</span>
                      </button>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {vehicle.make} {vehicle.model}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">({vehicle.year})</span>
                  </h3>
                  {vehicle.ownerName && (
                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <span>Operator:</span>
                      <strong className="text-slate-800 font-medium">{vehicle.ownerName}</strong>
                    </p>
                  )}
                </div>

                {/* Rating Badge */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shrink-0">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{vehicle.rating || '4.9'}</span>
                  <span className="text-[10px] text-amber-600/80 font-normal">({vehicle.tripsCount || 30})</span>
                </div>
              </div>

              {/* Special Vehicle Feature Note */}
              {isTripBus && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                  <Bus className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span><strong>Bus for Trip:</strong> Customer books whole coach with customizable date & time for private events.</span>
                </div>
              )}

              {isRouteBus && (
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                  <span><strong>Route Bus:</strong> Runs everyday on owner-scheduled timetables. Reserve your passenger seat.</span>
                </div>
              )}

              {isSafari && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-700 shrink-0" />
                  <span><strong>Safari 4x4:</strong> Select your desired date & time from available wildlife & bird park tour slots.</span>
                </div>
              )}

              {/* Photo preview (if available) or vehicle feature banner */}
              {vehicle.photos && vehicle.photos.length > 0 ? (
                <div className="relative h-36 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={vehicle.photos[0]}
                    alt={vehicle.model}
                    className="w-full h-full object-cover transition hover:scale-105 duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
                    <p className="text-xs text-white font-medium line-clamp-1">{vehicle.description}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  {vehicle.description}
                </div>
              )}

              {/* One Day Vehicle Price (Prominently displayed) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    One Day Vehicle Price
                  </span>
                  <span className="text-xs text-slate-600">Fixed rate set by driver / owner</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-emerald-700">
                    Rs. {oneDayPrice.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-500 block">/ Day</span>
                </div>
              </div>

              {/* Vehicle Specs Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  <span>{vehicle.totalSeats} Seats</span>
                </div>

                {vehicle.hasAC ? (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
                    <Wind className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Air Conditioned</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
                    <span>Non-AC</span>
                  </div>
                )}

                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {vehicle.driverOption === 'with_driver'
                      ? 'Driver Included'
                      : vehicle.driverOption === 'both'
                      ? 'Driver / Self Drive'
                      : 'Self Drive'}
                  </span>
                </div>

                {vehicle.luggageCapacity && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
                    <Luggage className="w-3.5 h-3.5" />
                    <span>{vehicle.luggageCapacity}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price & Booking Actions Bar */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  {isSeatBookingAvailable ? 'Fare / Seat' : 'Trip Rate'}
                </span>
                <div className="text-base font-bold text-slate-900">
                  {isSeatBookingAvailable && seatPrice ? (
                    <div>
                      <span className="text-emerald-700 font-extrabold">Rs. {seatPrice.toLocaleString()}</span>
                      <span className="text-xs font-normal text-slate-500 ml-1">/ seat</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-emerald-700 font-extrabold">Rs. {vehicle.basePrice.toLocaleString()}</span>
                      <span className="text-xs font-normal text-slate-500 ml-1">/ whole vehicle</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Buttons (Standardized Button Name: "Book") */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Passenger Bid button */}
                {onCreateBid && (
                  <button
                    type="button"
                    onClick={() => onCreateBid(vehicle)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 shadow-xs transition cursor-pointer"
                    title="Passengers can create a price bid for driver approval"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                    <span>Make a Bid</span>
                  </button>
                )}

                {isSeatBookingAvailable && (
                  <button
                    type="button"
                    onClick={() => onOpenSeatMap(vehicle, schedule)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Book Seats</span>
                  </button>
                )}

                {/* Primary Button Named "Book" */}
                <button
                  type="button"
                  onClick={() => onOpenWholeVehicleBooking(vehicle)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Book</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
