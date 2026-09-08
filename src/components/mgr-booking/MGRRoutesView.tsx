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
  Eye,
  Edit2,
  Trash2,
  Lock,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TransportRoute, TransportSchedule } from '../../types/mgrBooking';

interface MGRRoutesViewProps {
  routes: TransportRoute[];
  schedules: TransportSchedule[];
  onAddRoute: (newRoute: TransportRoute) => void;
  onUpdateRouteStatus?: (routeId: string, status: TransportRoute['status']) => void;
  onEditRoute?: (route: TransportRoute) => void;
  onDeleteRoute?: (routeId: string) => void;
  onAddSchedule: (newSchedule: TransportSchedule) => void;
  isAdmin?: boolean;
  themeMode?: 'dark' | 'light';
}

export const MGRRoutesView: React.FC<MGRRoutesViewProps> = ({
  routes,
  schedules,
  onAddRoute,
  onUpdateRouteStatus,
  onEditRoute,
  onDeleteRoute,
  onAddSchedule,
  isAdmin = false,
  themeMode = 'light',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [viewingRoute, setViewingRoute] = useState<TransportRoute | null>(null);
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);

  // Sorting & 20-row pagination
  type RouteSortField = 'routeCode' | 'fromLocation' | 'distanceKm' | 'basePrice' | 'status';
  const [sortField, setSortField] = useState<RouteSortField>('routeCode');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const handleSort = (field: RouteSortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const renderSortHeader = (field: RouteSortField, label: string) => {
    const isActive = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1.5 hover:text-slate-900 transition font-bold uppercase tracking-wider text-[11px] group cursor-pointer"
      >
        <span>{label}</span>
        {isActive ? (
          sortDir === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
          )
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
        )}
      </button>
    );
  };

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

  const sortedRoutes = [...filteredRoutes].sort((a, b) => {
    let comp = 0;
    if (sortField === 'routeCode') comp = a.routeCode.localeCompare(b.routeCode);
    else if (sortField === 'fromLocation') comp = `${a.fromLocation}-${a.toLocation}`.localeCompare(`${b.fromLocation}-${b.toLocation}`);
    else if (sortField === 'distanceKm') comp = a.distanceKm - b.distanceKm;
    else if (sortField === 'basePrice') comp = a.basePrice - b.basePrice;
    else if (sortField === 'status') comp = a.status.localeCompare(b.status);
    return sortDir === 'asc' ? comp : -comp;
  });

  const totalPages = Math.max(1, Math.ceil(sortedRoutes.length / pageSize));
  const paginatedRoutes = sortedRoutes.slice((page - 1) * pageSize, page * pageSize);

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
      suggestedVehicleTypes: ['car', 'van', 'bus', 'bus_trip', 'route_bus', 'safari'],
      basePrice: Number(basePrice),
      status: 'active',
    };

    onAddRoute(newRoute);
    setIsAddingRoute(false);
    setToLoc('');
    setViaPoints('');
  };

  const handleDelete = (routeId: string, code: string) => {
    if (!isAdmin) {
      alert('Only administrators can delete routes.');
      return;
    }
    if (confirm(`Are you sure you want to delete route ${code}?`)) {
      if (onDeleteRoute) onDeleteRoute(routeId);
    }
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

      {/* Routes Table Format */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4">{renderSortHeader('routeCode', 'Route Code')}</th>
              <th className="py-3.5 px-4">{renderSortHeader('fromLocation', 'Origin ➔ Destination')}</th>
              <th className="py-3.5 px-4">Via Transit Stops</th>
              <th className="py-3.5 px-4">{renderSortHeader('distanceKm', 'Distance & Duration')}</th>
              <th className="py-3.5 px-4">{renderSortHeader('basePrice', 'Base Rate')}</th>
              <th className="py-3.5 px-4">Schedules</th>
              <th className="py-3.5 px-4">{renderSortHeader('status', 'Status')}</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRoutes.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No routes found matching your criteria.
                </td>
              </tr>
            ) : (
              paginatedRoutes.map(route => {
                const routeSchedules = schedules.filter(s => s.routeId === route.id);

                return (
                  <tr key={route.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 break-words">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block break-words">
                        {route.routeCode}
                      </span>
                    </td>
                    <td className="py-3 px-4 break-words">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 break-words">
                        <span>{route.fromLocation}</span>
                        <span className="text-slate-400">➔</span>
                        <span>{route.toLocation}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 break-words">
                      <div className="text-slate-600 break-words">
                        {route.viaLocations && route.viaLocations.length > 0 ? (
                          route.viaLocations.join(', ')
                        ) : (
                          <span className="text-slate-400">Direct Route</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 break-words">
                      <div className="font-semibold text-slate-800">{route.distanceKm} km</div>
                      <span className="text-[10px] text-slate-500 block">Est: {route.estimatedDuration}</span>
                    </td>
                    <td className="py-3 px-4 break-words">
                      <div className="font-bold text-emerald-700">Rs. {route.basePrice.toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-4 break-words">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {routeSchedules.length} Timetable(s)
                      </span>
                    </td>
                    <td className="py-3 px-4 break-words">
                      {/* Inline Status Change */}
                      <select
                        value={route.status}
                        onChange={e => {
                          if (onUpdateRouteStatus) {
                            onUpdateRouteStatus(route.id, e.target.value as TransportRoute['status']);
                          }
                        }}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border bg-white cursor-pointer focus:outline-none ${
                          route.status === 'active'
                            ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                            : 'text-rose-700 border-rose-300 bg-rose-50'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => setViewingRoute(route)}
                          title="View Route Details"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Button (Admin Only) */}
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => setEditingRoute(route)}
                            title="Edit Route (Admin Only)"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span title="Edit restricted to Admin" className="p-1.5 text-slate-300 cursor-not-allowed">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}

                        {/* Delete Button (Admin Only) */}
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(route.id, route.routeCode)}
                            title="Delete Route (Admin Only)"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span title="Delete restricted to Admin" className="p-1.5 text-slate-300 cursor-not-allowed">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 20-Row Pagination Controls */}
      {sortedRoutes.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-600 shadow-sm">
          <span className="text-slate-500">
            Showing <strong className="text-slate-800">{(page - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-800">{Math.min(page * pageSize, sortedRoutes.length)}</strong> of{' '}
            <strong className="text-slate-800">{sortedRoutes.length}</strong> routes (Max 20/page)
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold text-slate-700 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="px-3 py-1 text-slate-700 font-bold bg-slate-100 rounded-lg">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-semibold text-slate-700 transition cursor-pointer"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW ROUTE MODAL */}
      {viewingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono font-bold text-slate-500">{viewingRoute.routeCode}</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {viewingRoute.fromLocation} ➔ {viewingRoute.toLocation}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRoute(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">Distance</span>
                  <strong className="text-slate-800">{viewingRoute.distanceKm} km</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">Est. Duration</span>
                  <strong className="text-slate-800">{viewingRoute.estimatedDuration}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Via Transit Locations</span>
                <strong className="text-slate-800">
                  {viewingRoute.viaLocations && viewingRoute.viaLocations.length > 0
                    ? viewingRoute.viaLocations.join(' ➔ ')
                    : 'Direct Highway / Coastal Route'}
                </strong>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">Baseline Fare</span>
                  <span className="text-slate-600">Standard route charter baseline</span>
                </div>
                <span className="text-base font-extrabold text-emerald-800">
                  Rs. {viewingRoute.basePrice.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRoute(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT ROUTE MODAL (ADMIN ONLY) */}
      {editingRoute && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">Admin Mode</span>
                <h3 className="text-base font-bold text-slate-900">Edit Route: {editingRoute.routeCode}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRoute(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (onEditRoute && editingRoute) {
                  onEditRoute(editingRoute);
                  setEditingRoute(null);
                }
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departure</label>
                  <input
                    type="text"
                    required
                    value={editingRoute.fromLocation}
                    onChange={e => setEditingRoute({ ...editingRoute, fromLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination</label>
                  <input
                    type="text"
                    required
                    value={editingRoute.toLocation}
                    onChange={e => setEditingRoute({ ...editingRoute, toLocation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Distance (km)</label>
                  <input
                    type="number"
                    required
                    value={editingRoute.distanceKm}
                    onChange={e => setEditingRoute({ ...editingRoute, distanceKm: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    required
                    value={editingRoute.estimatedDuration}
                    onChange={e => setEditingRoute({ ...editingRoute, estimatedDuration: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Base Price (Rs.)</label>
                <input
                  type="number"
                  required
                  value={editingRoute.basePrice}
                  onChange={e => setEditingRoute({ ...editingRoute, basePrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-emerald-700"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoute(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ROUTE MODAL */}
      {isAddingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Add Transport Master Route</h3>
              <button
                type="button"
                onClick={() => setIsAddingRoute(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Origin City / Town *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mannar Town"
                    value={fromLoc}
                    onChange={e => setFromLoc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jaffna City"
                    value={toLoc}
                    onChange={e => setToLoc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Via Stops (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Medawachchiya, Vavuniya"
                  value={viaPoints}
                  onChange={e => setViaPoints(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Distance (km) *</label>
                  <input
                    type="number"
                    required
                    value={distanceKm}
                    onChange={e => setDistanceKm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration *</label>
                  <input
                    type="text"
                    required
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Price (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={basePrice}
                    onChange={e => setBasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRoute(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
