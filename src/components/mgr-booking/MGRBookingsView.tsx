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
  Filter,
  CheckCircle2,
  XCircle,
  Clock3,
  Car,
  Bus,
  Ship,
  Users,
  Check,
} from 'lucide-react';
import { TransportBooking, BookingStatus } from '../../types/mgrBooking';

interface MGRBookingsViewProps {
  bookings: TransportBooking[];
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus) => void;
  themeMode?: 'dark' | 'light';
}

export const MGRBookingsView: React.FC<MGRBookingsViewProps> = ({
  bookings,
  onUpdateStatus,
  themeMode = 'light',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </span>
        );
      case 'trip_started':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Clock3 className="w-3 h-3" /> On Trip
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            ✓ Completed
          </span>
        );
      case 'passenger_cancelled':
      case 'owner_cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock3 className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookings by reference, passenger, phone, vehicle, or route..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'confirmed', 'pending', 'trip_started', 'completed'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            📋
          </div>
          <h4 className="text-sm font-bold text-slate-900">No Bookings Found</h4>
          <p className="text-xs text-slate-500">There are no bookings matching your selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredBookings.map(booking => (
            <div
              key={booking.id}
              className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {booking.bookingNumber}
                  </span>
                  {getStatusBadge(booking.status)}
                  <span className="text-[11px] font-semibold text-slate-600">
                    {booking.bookingType === 'seat' ? (
                      <span className="text-teal-700 font-bold">
                        {booking.seatCount} Seat{booking.seatCount > 1 ? 's' : ''} ({booking.selectedSeats?.join(', ')})
                      </span>
                    ) : (
                      <span className="text-blue-700 font-bold">Whole Vehicle</span>
                    )}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{booking.passengerName}</span>
                  <span className="text-xs font-normal text-slate-500">({booking.passengerPhone})</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <strong className="text-slate-800">{booking.routeFrom}</strong> ➔ <strong className="text-slate-800">{booking.routeTo}</strong>
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    {booking.travelDate} at {booking.travelTime}
                  </span>
                  <span className="text-slate-500">
                    Vehicle: <strong className="text-slate-700">{booking.vehicleName}</strong> ({booking.vehicleRegNumber})
                  </span>
                </div>

                {booking.specialNotes && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
                    Note: {booking.specialNotes}
                  </p>
                )}
              </div>

              {/* Price & Financials */}
              <div className="lg:text-right border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Booking Fare</span>
                <div className="text-base font-extrabold text-emerald-700">Rs. {booking.totalAmount.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">
                  Fee: Rs. {booking.mgrCommissionAmount.toLocaleString()} | Payout: Rs. {booking.ownerPayoutAmount.toLocaleString()}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <a
                  href={getWhatsAppUrl(booking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-xs"
                  title="Send status message via WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  WhatsApp
                </a>

                {/* Status Dropdown / Action */}
                {booking.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(booking.id, 'confirmed')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Confirm Booking
                  </button>
                )}

                {booking.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(booking.id, 'trip_started')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Start Trip
                  </button>
                )}

                {booking.status === 'trip_started' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(booking.id, 'completed')}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Mark Completed
                  </button>
                )}

                {booking.status !== 'completed' && !booking.status.includes('cancelled') && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(booking.id, 'owner_cancelled')}
                    className="px-2.5 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
