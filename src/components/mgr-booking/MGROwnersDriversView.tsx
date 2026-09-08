/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Star,
  Phone,
  MessageSquare,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  Ship,
  X,
  Award,
  AlertTriangle,
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
import { TransportOwner, TransportDriver, TransportVehicle, VerificationStatus } from '../../types/mgrBooking';
import { UserAccount, getMGRPersona } from '../../utils/auth';

interface MGROwnersDriversViewProps {
  owners: TransportOwner[];
  drivers: TransportDriver[];
  vehicles?: TransportVehicle[];
  currentUser?: UserAccount;
  onAddOwner: (newOwner: TransportOwner) => void;
  onUpdateOwnerStatus: (ownerId: string, status: VerificationStatus) => void;
  onEditOwner?: (owner: TransportOwner) => void;
  onDeleteOwner?: (ownerId: string) => void;
  onAddDriver: (newDriver: TransportDriver) => void;
  onUpdateDriverStatus?: (driverId: string, status: TransportDriver['status']) => void;
  onEditDriver?: (driver: TransportDriver) => void;
  onDeleteDriver?: (driverId: string) => void;
  isAdmin?: boolean;
  themeMode?: 'dark' | 'light';
}

export const MGROwnersDriversView: React.FC<MGROwnersDriversViewProps> = ({
  owners,
  drivers,
  vehicles = [],
  currentUser,
  onAddOwner,
  onUpdateOwnerStatus,
  onEditOwner,
  onDeleteOwner,
  onAddDriver,
  onUpdateDriverStatus,
  onEditDriver,
  onDeleteDriver,
  isAdmin = false,
  themeMode = 'light',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingDriver, setIsAddingDriver] = useState(false);

  // View Modals
  const [viewingDriver, setViewingDriver] = useState<TransportDriver | null>(null);

  // Edit Modals (Admin only)
  const [editingDriver, setEditingDriver] = useState<TransportDriver | null>(null);

  // New Driver Form State
  const [driverName, setDriverName] = useState('');
  const [driverNic, setDriverNic] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [driverType, setDriverType] = useState<'driver' | 'captain'>('driver');
  const [driverLicenceNo, setDriverLicenceNo] = useState('');
  const [driverLicenceClass, setDriverLicenceClass] = useState('Light & Heavy Passenger');
  const [driverLicenceExpiry, setDriverLicenceExpiry] = useState('2028-12-31');
  const [driverOwnerId, setDriverOwnerId] = useState(isAdmin ? 'all' : (owners[0]?.id || ''));
  const [driverAssignedVehicleId, setDriverAssignedVehicleId] = useState<string>('');

  // Delete driver confirmation modal state
  const [deletingDriver, setDeletingDriver] = useState<TransportDriver | null>(null);

  // Pagination & Sorting State (Max 20 rows per page)
  const [driverPage, setDriverPage] = useState(1);
  const [driverSortField, setDriverSortField] = useState('fullName');
  const [driverSortDir, setDriverSortDir] = useState<'asc' | 'desc'>('asc');
  const pageSize = 20;

  const userEmail = (currentUser?.email || '').toLowerCase();
  const userName = (currentUser?.name || '').toLowerCase();
  const userPhone = (currentUser?.phone || '').trim();
  const persona = getMGRPersona(currentUser);
  const isOwnerUser = persona === 'owner';

  // Identify registered owner from logged-in user or fallback
  const registeredOwner = owners.find(o =>
    (userEmail && o.email && o.email.toLowerCase() === userEmail) ||
    (userName && o.fullName && o.fullName.toLowerCase() === userName) ||
    (userPhone && (o.mobileNumber === userPhone || o.whatsappNumber === userPhone)) ||
    (currentUser?.id && o.id === currentUser.id)
  ) || (isOwnerUser ? owners[0] : undefined);

  const filteredDrivers = drivers.filter(d => {
    if (!isAdmin) {
      const isMine = registeredOwner && d.ownerId === registeredOwner.id;
      if (!isMine) return false;
    }

    return (
      d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.licenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.mobile.includes(searchQuery)
    );
  });

  // Sorting helper
  const handleSort = (
    field: string,
    currentField: string,
    currentDir: 'asc' | 'desc',
    setField: (f: string) => void,
    setDir: (d: 'asc' | 'desc') => void,
    setPage: (p: number) => void
  ) => {
    if (currentField === field) {
      setDir(currentDir === 'asc' ? 'desc' : 'asc');
    } else {
      setField(field);
      setDir('asc');
    }
    setPage(1);
  };

  const renderSortHeader = (
    label: string,
    field: string,
    currentField: string,
    currentDir: 'asc' | 'desc',
    onClick: () => void,
    alignCenter = false
  ) => (
    <th
      onClick={onClick}
      className={`py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100 transition-colors ${
        alignCenter ? 'text-center' : ''
      }`}
    >
      <div className={`inline-flex items-center gap-1 ${alignCenter ? 'justify-center' : ''}`}>
        <span>{label}</span>
        {currentField !== field ? (
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
        ) : currentDir === 'asc' ? (
          <ChevronUp className="w-3.5 h-3.5 text-emerald-600 font-bold" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-emerald-600 font-bold" />
        )}
      </div>
    </th>
  );

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    let valA: any = (a as any)[driverSortField] ?? '';
    let valB: any = (b as any)[driverSortField] ?? '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return driverSortDir === 'asc' ? -1 : 1;
    if (valA > valB) return driverSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const driverTotalPages = Math.max(1, Math.ceil(sortedDrivers.length / pageSize));
  const paginatedDrivers = sortedDrivers.slice((driverPage - 1) * pageSize, driverPage * pageSize);

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !driverMobile || !driverLicenceNo) return;

    const finalOwnerId = (!isAdmin && registeredOwner)
      ? registeredOwner.id
      : (driverOwnerId || registeredOwner?.id || owners[0]?.id || 'OWN-MGR-00001');

    const newDriver: TransportDriver = {
      id: `DRV-MGR-${Math.floor(10000 + Math.random() * 90000)}`,
      ownerId: finalOwnerId,
      fullName: driverName,
      nic: driverNic || 'N/A',
      mobile: driverMobile,
      whatsapp: driverMobile,
      address: 'Mannar Town',
      driverType,
      licenceNumber: driverLicenceNo,
      licenceClass: driverLicenceClass,
      licenceExpiry: driverLicenceExpiry,
      assignedVehicleId: driverAssignedVehicleId || undefined,
      status: 'verified',
      rating: 5.0,
      createdAt: Date.now(),
    };

    onAddDriver(newDriver);
    setIsAddingDriver(false);
    setDriverName('');
    setDriverNic('');
    setDriverMobile('');
    setDriverLicenceNo('');
    setDriverAssignedVehicleId('');
  };



  const handleDeleteDriver = (driverId: string, name: string) => {
    if (!isAdmin) {
      alert('Only administrators can delete driver records.');
      return;
    }
    if (confirm(`Delete driver ${name}? This action cannot be undone.`)) {
      if (onDeleteDriver) onDeleteDriver(driverId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search & Add Driver */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-purple-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Driver & Captain Roster</h3>
            <p className="text-xs text-slate-500">
              {isAdmin ? 'All registered drivers and captains across the fleet' : `Drivers assigned to your fleet (${registeredOwner?.fullName || 'My Fleet'})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search drivers by name, mobile, or licence..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Add Driver Button */}
          <button
            type="button"
            onClick={() => {
              setDriverOwnerId(registeredOwner?.id || owners[0]?.id || '');
              setIsAddingDriver(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Driver / Captain
          </button>
        </div>
      </div>

      {/* DRIVERS TABLE FORMAT (MAX 20 ROWS) */}
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  {renderSortHeader('Driver ID', 'id', driverSortField, driverSortDir, () => handleSort('id', driverSortField, driverSortDir, setDriverSortField, setDriverSortDir, setDriverPage))}
                  {renderSortHeader('Full Name & Role', 'fullName', driverSortField, driverSortDir, () => handleSort('fullName', driverSortField, driverSortDir, setDriverSortField, setDriverSortDir, setDriverPage))}
                  <th className="py-3.5 px-4">Assigned Vehicle (Reg #)</th>
                  {renderSortHeader('NIC / Passport', 'nic', driverSortField, driverSortDir, () => handleSort('nic', driverSortField, driverSortDir, setDriverSortField, setDriverSortDir, setDriverPage))}
                  {renderSortHeader('Mobile', 'mobile', driverSortField, driverSortDir, () => handleSort('mobile', driverSortField, driverSortDir, setDriverSortField, setDriverSortDir, setDriverPage))}
                  {renderSortHeader('Licence No & Expiry', 'licenceNumber', driverSortField, driverSortDir, () => handleSort('licenceNumber', driverSortField, driverSortDir, setDriverSortField, setDriverSortDir, setDriverPage))}
                  {renderSortHeader('Rating', 'rating', driverSortField, driverSortDir, () => handleSort('rating', driverSortField, driverSortDir, setDriverSortField, setDriverSortDir, setDriverPage))}
                  {renderSortHeader('Status', 'status', driverSortField, driverSortDir, () => handleSort('status', driverSortField, driverSortDir, setDriverSortField, setDriverSortDir, setDriverPage))}
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No drivers found matching your search.
                    </td>
                  </tr>
                ) : (
                  paginatedDrivers.map(driver => {
                    const assignedV = vehicles.find(v => v.id === driver.assignedVehicleId);

                    return (
                      <tr key={driver.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 break-words">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block break-words">
                            {driver.id}
                          </span>
                        </td>
                        <td className="py-3 px-4 break-words">
                          <div className="font-bold text-slate-900 break-words">{driver.fullName}</div>
                          <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                            driver.driverType === 'captain'
                              ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {driver.driverType === 'captain' ? 'Boat Captain' : 'Vehicle Driver'}
                          </span>
                        </td>

                        {/* Assigned Vehicle column with clear Reg # */}
                        <td className="py-3 px-4 break-words">
                          {assignedV ? (
                            <div>
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs inline-block">
                                {assignedV.registrationNumber}
                              </span>
                              <span className="text-[11px] text-slate-600 block mt-0.5 font-medium">
                                {assignedV.make} {assignedV.model}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3 px-4 break-words font-mono text-slate-600">
                          {driver.nic}
                        </td>
                        <td className="py-3 px-4 break-words text-slate-800 font-medium">
                          {driver.mobile}
                        </td>
                        <td className="py-3 px-4 break-words">
                          <div className="font-mono font-semibold text-slate-800">{driver.licenceNumber}</div>
                          <span className="text-[10px] text-slate-400 block">Exp: {driver.licenceExpiry}</span>
                        </td>
                        <td className="py-3 px-4 break-words">
                          <div className="flex items-center gap-1 text-amber-600 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            <span>{driver.rating}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">{driver.experienceYears || 5}y exp</span>
                        </td>
                        <td className="py-3 px-4 break-words">
                          <select
                            value={driver.status}
                            onChange={e => {
                              if (onUpdateDriverStatus) {
                                onUpdateDriverStatus(driver.id, e.target.value as VerificationStatus);
                              }
                            }}
                            className={`text-xs font-bold px-2 py-1 rounded-lg border bg-white cursor-pointer focus:outline-none ${
                              driver.status === 'verified'
                                ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                                : driver.status === 'pending'
                                ? 'text-amber-700 border-amber-300 bg-amber-50'
                                : 'text-rose-700 border-rose-300 bg-rose-50'
                            }`}
                          >
                            <option value="verified">Verified</option>
                            <option value="pending">Pending</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 break-words text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingDriver(driver)}
                            title="View Driver Details"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <a
                            href={`https://wa.me/${driver.mobile.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp Driver"
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>

                          {/* Edit Driver */}
                          {isAdmin || driver.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => setEditingDriver(driver)}
                              title={isAdmin ? "Edit Driver (Admin)" : "Edit Pending Driver"}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span title="Edit locked once verified" className="p-1.5 text-slate-300 cursor-not-allowed">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          )}

                          {/* Delete Driver (Admin Only) */}
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => setDeletingDriver(driver)}
                              title="Delete Driver (Admin Only)"
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

          {/* Pagination Controls for Drivers (Max 20 rows per page) */}
          {sortedDrivers.length > pageSize && (
            <div className="p-3 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-500">
                Showing <strong className="text-slate-800">{(driverPage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-800">{Math.min(driverPage * pageSize, sortedDrivers.length)}</strong> of{' '}
                <strong className="text-slate-800">{sortedDrivers.length}</strong> drivers
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={driverPage === 1}
                  onClick={() => setDriverPage(p => Math.max(1, p - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: driverTotalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDriverPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                        driverPage === p
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={driverPage === driverTotalPages}
                  onClick={() => setDriverPage(p => Math.min(driverTotalPages, p + 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      {/* VIEW DRIVER MODAL */}
      {viewingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono font-bold text-slate-500">{viewingDriver.id}</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{viewingDriver.fullName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingDriver(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Role</span>
                <strong className="text-slate-800 capitalize">
                  {viewingDriver.driverType === 'captain' ? 'Certified Boat Captain' : 'Commercial Vehicle Driver'}
                </strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Driving Licence Number</span>
                <strong className="font-mono text-slate-800">{viewingDriver.licenceNumber}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Licence Expiry & Class</span>
                <strong className="text-slate-800">{viewingDriver.licenceExpiry} ({viewingDriver.licenceClass})</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Mobile Number</span>
                <strong className="text-slate-800">{viewingDriver.mobile}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Assigned Vehicle / Boat</span>
                {(() => {
                  const assignedV = vehicles.find(v => v.id === viewingDriver.assignedVehicleId);
                  if (assignedV) {
                    return (
                      <div>
                        <strong className="text-emerald-700 font-mono text-sm block">
                          [{assignedV.registrationNumber}] {assignedV.make} {assignedV.model}
                        </strong>
                        <span className="text-slate-500 text-[11px] block mt-0.5">
                          Type: {assignedV.type.toUpperCase()} • Capacity: {assignedV.totalSeats} seats
                        </span>
                      </div>
                    );
                  }
                  return <span className="text-slate-400 italic">No specific vehicle assigned</span>;
                })()}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Rating & Completed Trips</span>
                <strong className="text-amber-600">
                  ★ {viewingDriver.rating} ({viewingDriver.completedTrips || 0} Trips)
                </strong>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setViewingDriver(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



      {/* EDIT DRIVER MODAL (ADMIN ONLY) */}
      {editingDriver && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">Admin Mode</span>
                <h3 className="text-base font-bold text-slate-900">Edit Driver: {editingDriver.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (onEditDriver && editingDriver) {
                  onEditDriver(editingDriver);
                  setEditingDriver(null);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingDriver.fullName}
                  onChange={e => setEditingDriver({ ...editingDriver, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile</label>
                <input
                  type="text"
                  required
                  value={editingDriver.mobile}
                  onChange={e => setEditingDriver({ ...editingDriver, mobile: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Licence Number</label>
                <input
                  type="text"
                  required
                  value={editingDriver.licenceNumber}
                  onChange={e => setEditingDriver({ ...editingDriver, licenceNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Licence Expiry</label>
                <input
                  type="date"
                  required
                  value={editingDriver.licenceExpiry}
                  onChange={e => setEditingDriver({ ...editingDriver, licenceExpiry: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
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



      {/* ADD DRIVER MODAL */}
      {isAddingDriver && (() => {
        const currentAssignedOwnerId = (!isAdmin && registeredOwner)
          ? registeredOwner.id
          : (driverOwnerId || registeredOwner?.id || owners[0]?.id || '');

        const eligibleVehiclesForDriver = vehicles.filter(v => {
          if (!isAdmin) {
            return (registeredOwner && v.ownerId === registeredOwner.id) ||
                   (v.ownerName && userName && v.ownerName.toLowerCase() === userName) ||
                   (currentUser?.id && v.ownerId === currentUser.id);
          }
          if (driverOwnerId && driverOwnerId !== 'all') {
            return v.ownerId === driverOwnerId;
          }
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-slate-900">Register Driver or Boat Captain</h3>
                <button
                  type="button"
                  onClick={() => setIsAddingDriver(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDriver} className="space-y-4 text-xs">
                {/* Owner Assignment (Requirement 6) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Fleet Owner *</label>
                  {!isAdmin ? (
                    <div className="space-y-1">
                      <input
                        type="text"
                        readOnly
                        value={`${registeredOwner?.fullName || currentUser?.name || 'Fleet Owner'} (${registeredOwner?.businessName || registeredOwner?.id || 'My Fleet'})`}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 font-bold text-slate-800 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-500 block">
                        Assigned automatically to your logged-in owner account. Owners cannot assign drivers to another owner.
                      </span>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={driverOwnerId}
                        onChange={e => {
                          setDriverOwnerId(e.target.value);
                          setDriverAssignedVehicleId('');
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white cursor-pointer"
                      >
                        <option value="all">-- All Owners & Fleets --</option>
                        {owners.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.fullName} ({o.businessName || o.id})
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-purple-600 font-semibold mt-0.5 block">
                        Admin Portal: Can view and assign all owners, vehicles, and boats.
                      </span>
                    </div>
                  )}
                </div>

                {/* Vehicle Selection (Requirement 6) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Vehicle or Boat</label>
                  <select
                    value={driverAssignedVehicleId}
                    onChange={e => setDriverAssignedVehicleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold bg-white cursor-pointer"
                  >
                    <option value="">-- No Vehicle Assigned (Assign Later) --</option>
                    {eligibleVehiclesForDriver.map(v => (
                      <option key={v.id} value={v.id}>
                        {isAdmin ? `[${v.ownerName || v.ownerId}] ` : ''}[{v.registrationNumber}] {v.make} {v.model} ({v.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {!isAdmin
                      ? `Showing only ${eligibleVehiclesForDriver.length} vehicle(s) / boat(s) belonging to your logged-in fleet.`
                      : `Admin Portal: Displaying ${eligibleVehiclesForDriver.length} vehicle(s) / boat(s).`}
                  </span>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Role *</label>
                  <select
                    value={driverType}
                    onChange={e => setDriverType(e.target.value as 'driver' | 'captain')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="driver">Road Vehicle Driver</option>
                    <option value="captain">Boat Captain / Skipper</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. K. Pathmanathan"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIC or Passport *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 198534120987"
                    value={driverNic}
                    onChange={e => setDriverNic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+94 77 987 6543"
                    value={driverMobile}
                    onChange={e => setDriverMobile(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Licence Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B8765432"
                    value={driverLicenceNo}
                    onChange={e => setDriverLicenceNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Licence Expiry *</label>
                  <input
                    type="date"
                    required
                    value={driverLicenceExpiry}
                    onChange={e => setDriverLicenceExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingDriver(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save Driver / Skipper
                </button>
              </div>
            </form>
          </div>
        </div>
      );})()}
      {/* ─────────────────────────────────────────────────────────────
          DELETE DRIVER CONFIRMATION MODAL (Admin Only, Requirement 11)
      ───────────────────────────────────────────────────────────── */}
      {deletingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Driver Deletion</h3>
                <p className="text-[11px] text-slate-500">
                  Are you sure you want to permanently remove driver <strong className="text-slate-800">{deletingDriver.fullName}</strong> ({deletingDriver.licenceNumber})?
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px]">
              This action cannot be undone. This driver/skipper will be unassigned from any associated vehicles or boats.
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingDriver(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteDriver) onDeleteDriver(deletingDriver.id);
                  setDeletingDriver(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
