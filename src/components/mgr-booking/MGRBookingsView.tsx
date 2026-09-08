/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  Car,
  Bus,
  Ship,
  Users,
  Eye,
  Edit2,
  Trash2,
  Lock,
  X,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { TransportBooking, BookingStatus } from '../../types/mgrBooking';

interface MGRBookingsViewProps {
  bookings: TransportBooking[];
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus) => void;
  onEditBooking?: (booking: TransportBooking) => void;
  onDeleteBooking?: (bookingId: string) => void;
  isAdmin?: boolean;
  themeMode?: 'dark' | 'light';
}

export const MGRBookingsView: React.FC<MGRBookingsViewProps> = ({
  bookings,
  onUpdateStatus,
  onEditBooking,
  onDeleteBooking,
  isAdmin = false,
  themeMode = 'light',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingBooking, setViewingBooking] = useState<TransportBooking | null>(null);
  const [editingBooking, setEditingBooking] = useState<TransportBooking | null>(null);

  // Pagination & Sorting State (Max 20 rows per page)
  const [sortField, setSortField] = useState('bookingNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const renderSortHeader = (label: string, field: string, alignCenter = false) => (
    <th
      onClick={() => handleSort(field)}
      className={`py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100 transition-colors ${
        alignCenter ? 'text-center' : ''
      }`}
    >
      <div className={`inline-flex items-center gap-1 ${alignCenter ? 'justify-center' : ''}`}>
        <span>{label}</span>
        {sortField !== field ? (
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
        ) : sortDir === 'asc' ? (
          <ChevronUp className="w-3.5 h-3.5 text-emerald-600 font-bold" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-emerald-600 font-bold" />
        )}
      </div>
    </th>
  );

  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.passengerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.passengerPhone.includes(searchQuery) ||
      b.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.routeFrom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.routeTo.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    let valA: any = (a as any)[sortField] ?? '';
    let valB: any = (b as any)[sortField] ?? '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedBookings.length / pageSize));
  const paginatedBookings = sortedBookings.slice((page - 1) * pageSize, page * pageSize);

  const getWhatsAppUrl = (b: TransportBooking) => {
    const rawNumber = (b.passengerWhatsApp || b.passengerPhone).replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `*MANNAR GREEN RIDE — BOOKING STATUS UPDATE*\n\n` +
      `Booking Reference: *${b.bookingNumber}*\n` +
      `Passenger: ${b.passengerName}\n` +
      `Vehicle: *${b.vehicleName}* (${b.vehicleRegNumber})\n` +
      `Route: ${b.routeFrom} ➔ ${b.routeTo}\n` +
      `Date & Time: ${b.travelDate} at ${b.travelTime}\n` +
      `Status: *${b.status.toUpperCase()}*\n` +
      `Total Payable: Rs. ${b.totalAmount.toLocaleString()}\n\n` +
      `Need help? Call or WhatsApp us at +94 77 987 6543.`
    );
    return `https://wa.me/${rawNumber}?text=${text}`;
  };

  const handleDelete = (bookingId: string, bookingNum: string) => {
    if (!isAdmin) {
      alert('Only administrators can delete booking records.');
      return;
    }
    if (confirm(`Are you sure you want to delete booking ${bookingNum}?`)) {
      if (onDeleteBooking) onDeleteBooking(bookingId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls: Search & Filter Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookings by ref #, passenger, vehicle, or route..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Bookings' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'pending', label: 'Pending' },
            { id: 'trip_started', label: 'On Trip' },
            { id: 'completed', label: 'Completed' },
            { id: 'passenger_cancelled', label: 'Cancelled' },
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                statusFilter === s.id
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table Format */}
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                {renderSortHeader('Booking Ref', 'bookingNumber')}
                {renderSortHeader('Passenger Details', 'passengerName')}
                {renderSortHeader('Vehicle / Reg #', 'vehicleName')}
                {renderSortHeader('Route', 'routeFrom')}
                {renderSortHeader('Date & Time', 'travelDate')}
                {renderSortHeader('Booking Type', 'bookingType')}
                {renderSortHeader('Total Fare', 'totalAmount')}
                {renderSortHeader('Status', 'status')}
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No bookings found matching your search.
                  </td>
                </tr>
              ) : (
                paginatedBookings.map(booking => (
                  <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 break-words">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block break-words">
                        {booking.bookingNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4 break-words">
                      <div className="font-bold text-slate-900 break-words">{booking.passengerName}</div>
                      <span className="text-[11px] text-slate-500 break-words">{booking.passengerPhone}</span>
                    </td>
                    <td className="py-3 px-4 break-words">
                      <div className="font-semibold text-slate-800 break-words">{booking.vehicleName}</div>
                      <span className="font-mono text-[10px] text-slate-400 break-words">{booking.vehicleRegNumber}</span>
                    </td>
                    <td className="py-3 px-4 break-words">
                      <div className="text-slate-800 font-medium break-words">
                        {booking.routeFrom} ➔ {booking.routeTo}
                      </div>
                    </td>
                    <td className="py-3 px-4 break-words">
                      <div className="text-slate-800 break-words">{booking.travelDate}</div>
                      <span className="text-[10px] text-slate-400 block break-words">{booking.travelTime}</span>
                    </td>
                    <td className="py-3 px-4 break-words">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border break-words ${
                        booking.bookingType === 'seat'
                          ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}>
                        {booking.bookingType === 'seat' ? `Seat (${booking.seatNumbers?.join(', ') || '1'})` : 'Whole Vehicle'}
                      </span>
                    </td>
                    <td className="py-3 px-4 break-words">
                      <div className="font-extrabold text-emerald-700 break-words">
                        Rs. {booking.totalAmount.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400 block break-words">{booking.paymentStatus}</span>
                    </td>
                    <td className="py-3 px-4 break-words">
                      {/* Inline Status Change (Operator/User can update status) */}
                      <select
                        value={booking.status}
                        onChange={e => onUpdateStatus(booking.id, e.target.value as BookingStatus)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border bg-white cursor-pointer focus:outline-none ${
                          booking.status === 'confirmed'
                            ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                            : booking.status === 'trip_started'
                            ? 'text-blue-700 border-blue-300 bg-blue-50'
                            : booking.status === 'completed'
                            ? 'text-purple-700 border-purple-300 bg-purple-50'
                            : booking.status === 'pending'
                            ? 'text-amber-700 border-amber-300 bg-amber-50'
                            : 'text-rose-700 border-rose-300 bg-rose-50'
                        }`}
                      >
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending</option>
                        <option value="trip_started">On Trip</option>
                        <option value="completed">Completed</option>
                        <option value="passenger_cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => setViewingBooking(booking)}
                          title="View Booking Details"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* WhatsApp Notification */}
                        <a
                          href={getWhatsAppUrl(booking)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="WhatsApp Status Update"
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </a>

                        {/* Edit Button (Admin Only) */}
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => setEditingBooking(booking)}
                            title="Edit Booking (Admin Only)"
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
                            onClick={() => handleDelete(booking.id, booking.bookingNumber)}
                            title="Delete Booking (Admin Only)"
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls (Max 20 rows per page) */}
        {sortedBookings.length > pageSize && (
          <div className="p-3 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500">
              Showing <strong className="text-slate-800">{(page - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-800">{Math.min(page * pageSize, sortedBookings.length)}</strong> of{' '}
              <strong className="text-slate-800">{sortedBookings.length}</strong> bookings
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                      page === p
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
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW BOOKING MODAL */}
      {viewingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono font-bold text-slate-500">{viewingBooking.bookingNumber}</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{viewingBooking.passengerName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingBooking(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Vehicle & Reg #</span>
                <strong className="text-slate-800">{viewingBooking.vehicleName} ({viewingBooking.vehicleRegNumber})</strong>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Route Itinerary</span>
                <strong className="text-slate-800">{viewingBooking.routeFrom} ➔ {viewingBooking.routeTo}</strong>
                {viewingBooking.pickupPoint && (
                  <div className="text-[11px] text-slate-500 mt-1">
                    Pickup: {viewingBooking.pickupPoint} • Drop: {viewingBooking.dropoffPoint}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">Travel Date</span>
                  <strong className="text-slate-800">{viewingBooking.travelDate}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">Pickup Time</span>
                  <strong className="text-slate-800">{viewingBooking.travelTime}</strong>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Amount</span>
                  <span className="text-slate-600 capitalize">Payment: {viewingBooking.paymentStatus}</span>
                </div>
                <span className="text-base font-extrabold text-emerald-800">
                  Rs. {viewingBooking.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setViewingBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT BOOKING MODAL (ADMIN ONLY) */}
      {editingBooking && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">Admin Mode</span>
                <h3 className="text-base font-bold text-slate-900">Edit Booking: {editingBooking.bookingNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (onEditBooking && editingBooking) {
                  onEditBooking(editingBooking);
                  setEditingBooking(null);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Passenger Name</label>
                <input
                  type="text"
                  required
                  value={editingBooking.passengerName}
                  onChange={e => setEditingBooking({ ...editingBooking, passengerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Passenger Phone</label>
                <input
                  type="text"
                  required
                  value={editingBooking.passengerPhone}
                  onChange={e =>
                    setEditingBooking({
                      ...editingBooking,
                      passengerPhone: e.target.value,
                      passengerWhatsApp: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Travel Date</label>
                  <input
                    type="date"
                    required
                    value={editingBooking.travelDate}
                    onChange={e => setEditingBooking({ ...editingBooking, travelDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Travel Time</label>
                  <input
                    type="time"
                    required
                    value={editingBooking.travelTime}
                    onChange={e => setEditingBooking({ ...editingBooking, travelTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Total Payable Amount (Rs.)</label>
                <input
                  type="number"
                  required
                  value={editingBooking.totalAmount}
                  onChange={e => setEditingBooking({ ...editingBooking, totalAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-emerald-700"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
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
    </div>
  );
};
