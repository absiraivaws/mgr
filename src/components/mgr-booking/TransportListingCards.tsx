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
} from 'lucide-react';
import { TransportVehicle, TransportRoute, TransportSchedule } from '../../types/mgrBooking';

interface TransportListingCardsProps {
  vehicles: TransportVehicle[];
  activeRoute?: TransportRoute;
  schedules: TransportSchedule[];
  onOpenSeatMap: (vehicle: TransportVehicle, schedule?: TransportSchedule) => void;
  onOpenWholeVehicleBooking: (vehicle: TransportVehicle) => void;
  themeMode?: 'dark' | 'light';
}

export const TransportListingCards: React.FC<TransportListingCardsProps> = ({
  vehicles,
  activeRoute,
  schedules,
  onOpenSeatMap,
  onOpenWholeVehicleBooking,
  themeMode = 'light',
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
        return <Bus className="w-4 h-4 text-emerald-700" />;
      case 'boat':
        return <Ship className="w-4 h-4 text-cyan-700" />;
      case 'van':
        return <Car className="w-4 h-4 text-teal-700" />;
      default:
        return <Car className="w-4 h-4 text-blue-700" />;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'bus':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'boat':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'van':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {vehicles.map(vehicle => {
        const schedule = schedules.find(s => s.vehicleId === vehicle.id);
        const isSeatBookingAvailable = vehicle.type === 'bus' || (vehicle.type === 'boat' && vehicle.pricePerSeat);
        const seatPrice = schedule?.farePerSeat || vehicle.pricePerSeat;

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
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getTypeBadgeClass(
                        vehicle.type
                      )}`}
                    >
                      {getTypeIcon(vehicle.type)}
                      {vehicle.type}
                    </span>
                    <span className="font-mono text-xs text-slate-500 font-semibold">
                      {vehicle.registrationNumber}
                    </span>
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

              {/* Boat specific features */}
              {vehicle.type === 'boat' && vehicle.boatDetails && (
                <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-cyan-900 font-semibold">
                    <span className="flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-cyan-700" />
                      {vehicle.boatDetails.boatName || 'Coastal Cruiser'}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold">
                      {vehicle.boatDetails.lifeJacketsAvailable ? '✓ Life Jackets On Board' : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Departure: {vehicle.boatDetails.departurePoint}</span>
                    <span>Captain: {vehicle.boatDetails.captainName || 'Certified Skipper'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Price & Booking Actions Bar */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  {isSeatBookingAvailable ? 'Fare / Price' : 'Fixed Rental Rate'}
                </span>
                <div className="text-base font-bold text-slate-900">
                  {isSeatBookingAvailable && seatPrice ? (
                    <div>
                      <span className="text-emerald-700 font-extrabold">Rs. {seatPrice.toLocaleString()}</span>
                      <span className="text-xs font-normal text-slate-500 ml-1">/ passenger seat</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-emerald-700 font-extrabold">Rs. {vehicle.basePrice.toLocaleString()}</span>
                      <span className="text-xs font-normal text-slate-500 ml-1">/ whole vehicle</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Buttons */}
              <div className="flex items-center gap-2">
                {isSeatBookingAvailable && (
                  <button
                    type="button"
                    onClick={() => onOpenSeatMap(vehicle, schedule)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Select Seats
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenWholeVehicleBooking(vehicle)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isSeatBookingAvailable ? 'Book Whole' : 'Book Vehicle'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
