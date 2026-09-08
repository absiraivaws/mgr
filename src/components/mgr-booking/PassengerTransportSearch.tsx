/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, MapPin, Calendar, Clock, Users, Car, Bus, Ship, Filter, RotateCcw, Compass } from 'lucide-react';
import { TransportType, DriverOption } from '../../types/mgrBooking';

export interface SearchCriteria {
  fromLocation: string;
  toLocation: string;
  travelDate: string;
  travelTime: string;
  vehicleType: TransportType | 'all';
  driverOption: DriverOption | 'all';
  passengersCount: number;
}

interface PassengerTransportSearchProps {
  criteria: SearchCriteria;
  onChangeCriteria: (newCriteria: SearchCriteria) => void;
  onSearch: () => void;
  onReset: () => void;
  availableRoutes: { from: string; to: string }[];
  themeMode?: 'dark' | 'light';
}

export const PassengerTransportSearch: React.FC<PassengerTransportSearchProps> = ({
  criteria,
  onChangeCriteria,
  onSearch,
  onReset,
  availableRoutes,
  themeMode = 'light',
}) => {
  const update = (partial: Partial<SearchCriteria>) => {
    onChangeCriteria({ ...criteria, ...partial });
  };

  const vehicleTypeButtons: { type: TransportType | 'all'; label: string; icon: React.ReactNode }[] = [
    { type: 'all', label: 'All Transport', icon: <Filter className="w-3.5 h-3.5" /> },
    { type: 'car', label: 'Cars', icon: <Car className="w-3.5 h-3.5" /> },
    { type: 'van', label: 'Vans (HiAce/KDH)', icon: <Car className="w-3.5 h-3.5" /> },
    { type: 'bus_trip', label: 'Bus for Trip (Whole Bus)', icon: <Bus className="w-3.5 h-3.5" /> },
    { type: 'route_bus', label: 'Route Bus (Daily Schedule)', icon: <Bus className="w-3.5 h-3.5" /> },
    { type: 'safari', label: 'Safari (4x4 Jeep)', icon: <Compass className="w-3.5 h-3.5" /> },
    { type: 'boat', label: 'Boats (Island Tours)', icon: <Ship className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Search className="w-4 h-4 text-emerald-600" />
          Find Transport & Bookings
        </h2>
        <p className="text-xs text-slate-500">
          Book whole cars, luxury vans, private trip buses, scheduled daily route buses, safari jeeps, or island cruises.
        </p>
      </div>

      {/* Main Search Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* From Location */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-600" />
              From (Departure Location)
            </span>
          </label>
          <input
            type="text"
            placeholder="e.g. Mannar Town, Thalaimannar..."
            value={criteria.fromLocation}
            onChange={e => update({ fromLocation: e.target.value })}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>

        {/* To Location */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-cyan-600" />
              To (Destination)
            </span>
          </label>
          <input
            type="text"
            placeholder="e.g. Jaffna, Colombo, Sandbanks..."
            value={criteria.toLocation}
            onChange={e => update({ toLocation: e.target.value })}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
        </div>

        {/* Travel Date & Time */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-600" />
                Travel Date
              </span>
            </label>
            <input
              type="date"
              value={criteria.travelDate}
              onChange={e => update({ travelDate: e.target.value })}
              className="w-full px-2.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-600" />
                Time
              </span>
            </label>
            <input
              type="time"
              value={criteria.travelTime}
              onChange={e => update({ travelTime: e.target.value })}
              className="w-full px-2.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        {/* Passenger Counter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-teal-600" />
              Passengers / Seats
            </span>
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => update({ passengersCount: Math.max(1, criteria.passengersCount - 1) })}
              className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 transition flex items-center justify-center cursor-pointer"
            >
              -
            </button>
            <div className="flex-1 text-center py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900">
              {criteria.passengersCount} {criteria.passengersCount === 1 ? 'Person' : 'People'}
            </div>
            <button
              type="button"
              onClick={() => update({ passengersCount: criteria.passengersCount + 1 })}
              className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 font-bold hover:bg-slate-200 transition flex items-center justify-center cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Vehicle Category Filter Tabs & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        {/* Vehicle Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {vehicleTypeButtons.map(btn => {
            const isSelected = criteria.vehicleType === btn.type;
            return (
              <button
                key={btn.type}
                type="button"
                onClick={() => update({ vehicleType: btn.type })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {btn.icon}
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Driver preference & Reset */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-100 transition cursor-pointer"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={onSearch}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            Apply Search
          </button>
        </div>
      </div>
    </div>
  );
};
