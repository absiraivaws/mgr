/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Percent,
  TrendingUp,
  DollarSign,
  Car,
  Ship,
  Bus,
  Users,
  CheckCircle2,
  Clock,
  Settings,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  TransportOwner,
  TransportVehicle,
  TransportBooking,
  MarketplaceSettings,
} from '../../types/mgrBooking';

interface MGRMarketplaceAdminViewProps {
  owners: TransportOwner[];
  vehicles: TransportVehicle[];
  bookings: TransportBooking[];
  settings: MarketplaceSettings;
  onUpdateSettings: (newSettings: MarketplaceSettings) => void;
  onApproveOwner: (ownerId: string) => void;
  themeMode?: 'dark' | 'light';
}

export const MGRMarketplaceAdminView: React.FC<MGRMarketplaceAdminViewProps> = ({
  owners,
  vehicles,
  bookings,
  settings,
  onUpdateSettings,
  onApproveOwner,
  themeMode = 'light',
}) => {
  const [commissionRate, setCommissionRate] = useState(settings.commissionPercentage || 5);
  const [instantBooking, setInstantBooking] = useState(settings.instantBookingEnabled ?? true);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.contactWhatsAppNumber || '+94 77 987 6543');
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail || 'booking@mannargreenride.lk');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Computed Financials
  const totalGrossRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalMGRCommission = bookings.reduce((sum, b) => sum + (b.mgrCommissionAmount || 0), 0);
  const totalOwnerPayouts = bookings.reduce((sum, b) => sum + (b.ownerPayoutAmount || 0), 0);

  const pendingOwners = owners.filter(o => o.status === 'pending');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      commissionPercentage: Number(commissionRate),
      instantBookingEnabled: instantBooking,
      allowCashOnBoard: true,
      contactWhatsAppNumber: whatsappNumber,
      supportEmail,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Financial & Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Gross Booking Value</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            Rs. {totalGrossRevenue.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across all passenger bookings</p>
        </div>

        {/* MGR Commission */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">MGR Platform Income</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-cyan-700 mt-2">
            Rs. {totalMGRCommission.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Commission earned ({commissionRate}%)</p>
        </div>

        {/* Total Fleet Count */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Active Fleet & Boats</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{vehicles.length} Units</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {vehicles.filter(v => v.type === 'boat').length} Boats •{' '}
            {vehicles.filter(v => v.type === 'bus').length} Buses •{' '}
            {vehicles.filter(v => v.type === 'van').length} Vans
          </p>
        </div>

        {/* Verified Operators */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Registered Operators</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{owners.length} Owners</div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            {owners.filter(o => o.status === 'verified').length} Verified Partners
          </p>
        </div>
      </div>

      {/* Verification Queue & Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Queue */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Owner & Fleet Approval Queue
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
              {pendingOwners.length} Pending
            </span>
          </div>

          {pendingOwners.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-1">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold">
                ✓
              </div>
              <p className="font-semibold text-slate-800">All registered operators are verified!</p>
              <p className="text-slate-500">New submissions will appear here for administrator verification.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOwners.map(owner => (
                <div
                  key={owner.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900">{owner.fullName}</div>
                    <div className="text-[11px] text-slate-500">
                      NIC: {owner.nicPassport} • Phone: {owner.mobileNumber}
                    </div>
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium">
                      Awaiting Verification
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onApproveOwner(owner.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Marketplace Commission & General Settings */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-cyan-600" />
              Marketplace Commission & Rules
            </h3>
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-bold animate-fade-in">
                ✓ Settings Saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                MGR Platform Commission Rate (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={0.5}
                  value={commissionRate}
                  onChange={e => setCommissionRate(Number(e.target.value))}
                  className="flex-1 accent-emerald-600"
                />
                <span className="font-mono font-bold text-emerald-700 text-sm w-12 text-right">
                  {commissionRate}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Deducted automatically from whole vehicle and seat booking amounts before operator payout.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Instant Booking for Verified Operators
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="instant-booking-toggle"
                  checked={instantBooking}
                  onChange={e => setInstantBooking(e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-600"
                />
                <label htmlFor="instant-booking-toggle" className="text-slate-700 font-medium cursor-pointer">
                  Automatically confirm bookings without manual owner approval
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  MGR Official WhatsApp
                </label>
                <input
                  type="tel"
                  value={whatsappNumber}
                  onChange={e => setWhatsappNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Support Email Address
                </label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={e => setSupportEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Marketplace Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
