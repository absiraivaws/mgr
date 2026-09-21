/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  Car,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Search,
  Plus,
  ArrowRight,
  MessageSquare,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  TransportVehicle,
  TransportOwner,
  TransportDriver,
  TransportBooking,
  MarketplaceSettings,
  MGRTabType,
} from '../../types/mgrBooking';
import { UserAccount, getMGRPersona, getOwnerIdForUser, isOwnedByUser } from '../../utils/auth';
import { getWhatsAppUrl } from '../../utils/mgrTransportNotifications';

interface MGRDashboardViewProps {
  vehicles: TransportVehicle[];
  owners: TransportOwner[];
  drivers: TransportDriver[];
  bookings: TransportBooking[];
  settings: MarketplaceSettings;
  onNavigate: (tab: MGRTabType) => void;
  currentUser?: UserAccount;
  themeMode?: 'dark' | 'light';
}

export const MGRDashboardView: React.FC<MGRDashboardViewProps> = ({
  vehicles,
  owners,
  drivers,
  bookings,
  settings,
  onNavigate,
  currentUser,
}) => {
  const persona = getMGRPersona(currentUser);
  const isAdmin = persona === 'admin';
  const isOwner = persona === 'owner';
  const isPassenger = persona === 'passenger';

  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const userName = (currentUser?.name || '').toLowerCase().trim();
  const userPhone = (currentUser?.phone || '').trim();

  // Read V2 requests from localStorage to include in metrics
  let v2Requests: any[] = [];
  try {
    const raw = localStorage.getItem('mgr_transport_v2_requests');
    if (raw) v2Requests = JSON.parse(raw);
  } catch {}

  // Scoped datasets based on user persona
  const scopedVehicles = isOwner
    ? vehicles.filter(v => isOwnedByUser(v.ownerId, currentUser, owners))
    : vehicles;
  const scopedVehicleIds = new Set(scopedVehicles.map(v => v.id));

  const scopedDrivers = isOwner
    ? drivers.filter(d => isOwnedByUser(d.ownerId, currentUser, owners))
    : drivers;

  const scopedBookings = isOwner
    ? bookings.filter(b => isOwnedByUser(b.ownerId, currentUser, owners) || scopedVehicleIds.has(b.vehicleId))
    : isPassenger
    ? bookings.filter(b => (userEmail && b.passengerEmail?.toLowerCase().trim() === userEmail) || (userPhone && b.passengerPhone === userPhone))
    : bookings;

  const scopedV2Requests = isOwner
    ? v2Requests.filter(r => isOwnedByUser(r.ownerId, currentUser, owners) || scopedVehicleIds.has(r.vehicleId))
    : isPassenger
    ? v2Requests.filter(r => (userEmail && r.passenger?.email?.toLowerCase().trim() === userEmail) || (userPhone && r.passenger?.phone === userPhone))
    : v2Requests;

  // Financial Metrics
  const totalGrossRevenue = scopedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) +
    scopedV2Requests.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + (r.finalAmount || r.ownerTravelCharge || 0), 0);
  const convenienceFeeRate = settings.convenienceFeePercentage ?? settings.commissionPercentage ?? 5;
  const platformIncome = Math.round(totalGrossRevenue * (convenienceFeeRate / 100));
  const ownerNetEarnings = isOwner ? Math.max(0, totalGrossRevenue - platformIncome) : totalGrossRevenue;

  // Counts
  const pendingRequests = scopedV2Requests.filter(r => r.requestStatus === 'pending_owner').length;
  const awaitingPayment = scopedV2Requests.filter(r => r.requestStatus === 'awaiting_payment').length;
  const confirmedTrips = scopedBookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length +
    scopedV2Requests.filter(r => r.requestStatus === 'confirmed' || r.paymentStatus === 'paid').length;
  const activeFleetCount = scopedVehicles.filter(v => v.status === 'active').length;
  const activeDriversCount = scopedDrivers.filter(d => d.status === 'verified').length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              {isOwner ? 'Vehicle & Boat Owner Operations Dashboard' : isPassenger ? 'Passenger Travel Dashboard' : 'MGR Transport Operations Dashboard'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
              {persona.toUpperCase()} MODE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isOwner
              ? 'Real-time performance of your registered vehicles, incoming ride requests, and earnings.'
              : isPassenger
              ? 'Your booking requests, confirmed passenger trips, and travel history.'
              : 'Real-time transport bookings, fleet availability, fee earnings, and passenger pipeline.'}
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate('mgr-search')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find Transport</span>
          </button>

          {!['passenger'].includes(persona) && (
            <button
              type="button"
              onClick={() => onNavigate('mgr-fleet')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-xs transition cursor-pointer"
            >
              <Car className="w-3.5 h-3.5 text-slate-600" />
              <span>Fleet & Listings</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('mgr-settings')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Settings & SQL</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Primary KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross / Net Revenue */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">
              {isOwner ? 'Owner Net Earnings' : isPassenger ? 'Trip Spendings' : 'Gross Booking Value'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            Rs. {(isOwner ? ownerNetEarnings : totalGrossRevenue).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isOwner ? 'Your net payout after platform fees' : isPassenger ? 'Total spendings on transport' : 'Across all passenger transport bookings'}
          </p>
        </div>

        {/* Platform Revenue / Bookings */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">
              {isOwner ? 'Platform Fee (5%)' : isPassenger ? 'Bookings Placed' : 'Platform Convenience Fee'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-cyan-700 mt-2">
            {isPassenger ? scopedBookings.length + scopedV2Requests.length : `Rs. ${platformIncome.toLocaleString()}`}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isPassenger ? 'Total rides requested or booked' : `Calculated dynamically at ${convenienceFeeRate}%`}
          </p>
        </div>

        {/* Confirmed Trips Count */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Confirmed Trips</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-700 mt-2">
            {confirmedTrips}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isOwner ? 'Trips completed or paid for your fleet' : 'Successfully scheduled passenger rides'}
          </p>
        </div>

        {/* Active Fleet & Crew */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">
              {isOwner ? 'My Vehicles' : isPassenger ? 'Available Fleet' : 'Fleet & Crew'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-2">
            {isOwner ? `${scopedVehicles.length} Vehicles` : `${activeFleetCount} / ${vehicles.length}`}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isOwner ? `${activeFleetCount} Active • ${scopedDrivers.length} Drivers` : `Active Vehicles • ${activeDriversCount} Drivers`}
          </p>
        </div>
      </div>

      {/* Booking Pipeline Status Cards */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">MGR Transport Booking Request Pipeline</h3>
            <p className="text-xs text-slate-500">
              Live status breakdown of passenger requests from submission to payment confirmation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('mgr-bookings')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Bookings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* 1. Pending Owner */}
          <div
            onClick={() => onNavigate('mgr-bookings')}
            className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Pending Owner Review</span>
              <span className="text-xl font-extrabold text-amber-900">{pendingRequests} Requests</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Awaiting owner travel charge entry</p>
            </div>
            <Clock3 className="w-6 h-6 text-amber-500" />
          </div>

          {/* 2. Awaiting Payment */}
          <div
            onClick={() => onNavigate('mgr-bookings')}
            className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-800 block">Awaiting Passenger Payment</span>
              <span className="text-xl font-extrabold text-blue-900">{awaitingPayment} Bookings</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Price accepted, ready for payment</p>
            </div>
            <DollarSign className="w-6 h-6 text-blue-500" />
          </div>

          {/* 3. Confirmed Trips */}
          <div
            onClick={() => onNavigate('mgr-bookings')}
            className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Confirmed & Paid</span>
              <span className="text-xl font-extrabold text-emerald-900">{confirmedTrips} Trips</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Dates locked & seats confirmed</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
        </div>
      </div>

      {/* RECENT BOOKINGS TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Recent Passenger Transport Bookings</h3>
          <span className="text-xs text-slate-500">Sorted by newest activity</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 break-words">Booking Ref</th>
                <th className="py-3 px-4 break-words">Passenger</th>
                <th className="py-3 px-4 break-words">Vehicle & Reg #</th>
                <th className="py-3 px-4 break-words">Route & Date</th>
                <th className="py-3 px-4 break-words">Fare Total</th>
                <th className="py-3 px-4 break-words">Status</th>
                <th className="py-3 px-4 text-center break-words">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.slice(0, 6).map(booking => (
                <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 break-words font-mono font-bold text-slate-900">
                    {booking.bookingNumber}
                  </td>
                  <td className="py-3 px-4 break-words">
                    <div className="font-bold text-slate-900">{booking.passengerName}</div>
                    <span className="text-[11px] text-slate-500">{booking.passengerPhone}</span>
                  </td>
                  <td className="py-3 px-4 break-words">
                    <div className="font-semibold text-slate-800">{booking.vehicleName}</div>
                    <span className="font-mono text-[10px] text-slate-400">{booking.vehicleRegNumber}</span>
                  </td>
                  <td className="py-3 px-4 break-words">
                    <div className="font-medium text-slate-800">
                      {booking.routeFrom} ➔ {booking.routeTo}
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {booking.travelDate} at {booking.travelTime}
                    </span>
                  </td>
                  <td className="py-3 px-4 break-words font-extrabold text-emerald-700">
                    Rs. {booking.totalAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 break-words">
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        booking.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : booking.status === 'completed'
                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                          : booking.status === 'trip_started'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 break-words text-center">
                    <a
                      href={getWhatsAppUrl(
                        booking.passengerWhatsApp || booking.passengerPhone,
                        `Hello ${booking.passengerName}, regarding your booking ${booking.bookingNumber} for ${booking.vehicleName}...`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp Passenger"
                      className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition inline-flex items-center gap-1 font-bold text-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
