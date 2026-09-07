/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  Plus,
  Compass,
  Calendar,
  Search,
  CheckCircle2,
  Navigation,
  X,
  Bus,
  Car,
  Ship,
} from 'lucide-react';
import { TransportRoute, TransportSchedule } from '../../types/mgrBooking';

interface MGRRoutesViewProps {
  routes: TransportRoute[];
  schedules: TransportSchedule[];
  onAddRoute: (newRoute: TransportRoute) => void;
  onAddSchedule: (newSchedule: TransportSchedule) => void;
  themeMode?: 'dark' | 'light';
}

export const MGRRoutesView: React.FC<MGRRoutesViewProps> = ({
  routes,
  schedules,
  onAddRoute,
  onAddSchedule,
  themeMode = 'light',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingRoute, setIsAddingRoute] = useState(false);

  // New Route state
  const [fromLoc, setFromLoc] = useState('Mannar Town');
  const [toLoc, setToLoc] = useState('');
  const [viaPoints, setViaPoints] = useState('');
  const [duration, setDuration] = useState('2h 30m');
  const [distanceKm, setDistanceKm] = useState(120);
  const [basePrice, setBasePrice] = useState(15000);

  const filteredRoutes = routes.filter(
    r =>
      r.fromLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.toLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.routeCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLoc || !toLoc) return;

    const newRoute: TransportRoute = {
      id: `ROUTE-${Math.floor(100 + Math.random() * 900)}`,
      routeCode: `MN-${toLoc.slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`,
      fromLocation: fromLoc,
      toLocation: toLoc,
      viaLocations: viaPoints ? viaPoints.split(',').map(s => s.trim()) : [],
      distanceKm: Number(distanceKm),
      estimatedDuration: duration,
      pickupPoints: [`${fromLoc} Central`],
      dropoffPoints: [`${toLoc} Stand`],
      suggestedVehicleTypes: ['car', 'van', 'bus'],
      basePrice: Number(basePrice),
      status: 'active',
    };

    onAddRoute(newRoute);
    setIsAddingRoute(false);
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search routes by departure, destination, or code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsAddingRoute(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Master Route
        </button>
      </div>

      {/* Routes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRoutes.map(route => {
          const matchingSchedules = schedules.filter(s => s.routeId === route.id);

          return (
            <div
              key={route.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {route.routeCode}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Est: <strong className="text-slate-700">{route.estimatedDuration}</strong>
                    {route.distanceKm && <span>({route.distanceKm} km)</span>}
                  </span>
                </div>

                <div className="mt-2.5">
                  <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{route.fromLocation}</span>
                    <span className="text-slate-400">➔</span>
                    <span className="text-cyan-700">{route.toLocation}</span>
                  </div>

                  {route.viaLocations.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span>Via:</span>
                      <span className="text-slate-700 font-medium">{route.viaLocations.join(' • ')}</span>
                    </p>
                  )}
                </div>

                {/* Pickup / Dropoff points tags */}
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="text-slate-700">
                    <strong className="text-slate-500">Boarding Points:</strong> {route.pickupPoints.join(', ')}
                  </div>
                  <div className="text-slate-700">
                    <strong className="text-slate-500">Drop-offs:</strong> {route.dropoffPoints.join(', ')}
                  </div>
                </div>

                {/* Scheduled Departures on this route */}
                {matchingSchedules.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 space-y-1.5">
                    <span className="text-[11px] uppercase font-bold text-slate-500 block">
                      Daily Departures & Fares:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {matchingSchedules.map(sch => (
                        <div
                          key={sch.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2 shadow-xs"
                        >
                          <span className="font-bold text-slate-900">⏰ {sch.departureTime}</span>
                          <span className="text-emerald-700 font-bold">Rs. {sch.farePerSeat} / seat</span>
                          <span className="text-[10px] text-slate-500">({sch.availableSeats} seats left)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Base price reference */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Whole Vehicle Benchmark:</span>
                <span className="font-bold text-emerald-700 text-sm">Rs. {route.basePrice.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Route Modal */}
      {isAddingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm">Add New Master Route</h3>
              <button onClick={() => setIsAddingRoute(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRoute} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Departure Point *</label>
                <input
                  type="text"
                  required
                  value={fromLoc}
                  onChange={e => setFromLoc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Destination *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jaffna City / Colombo Fort"
                  value={toLoc}
                  onChange={e => setToLoc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Via Locations (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Vavuniya, Kilinochchi"
                  value={viaPoints}
                  onChange={e => setViaPoints(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Estimated Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Distance (km)</label>
                  <input
                    type="number"
                    value={distanceKm}
                    onChange={e => setDistanceKm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Standard Whole Vehicle Benchmark (Rs.)</label>
                <input
                  type="number"
                  value={basePrice}
                  onChange={e => setBasePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRoute(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs">
                  Create Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
