/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, DollarSign, Calendar, Clock, Phone, User, CheckCircle2, XCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { TransportVehicle, VehicleBid } from '../../types/mgrBooking';

interface VehicleBidModalProps {
  vehicle: TransportVehicle;
  mode: 'create' | 'review';
  isOpen: boolean;
  onClose: () => void;
  onCreateBid?: (vehicleId: string, bidData: Omit<VehicleBid, 'id' | 'createdAt' | 'status'>) => void;
  onAcceptBid?: (vehicleId: string, bidId: string) => void;
  onRejectBid?: (vehicleId: string, bidId: string) => void;
  isAdmin?: boolean;
}

export const VehicleBidModal: React.FC<VehicleBidModalProps> = ({
  vehicle,
  mode,
  isOpen,
  onClose,
  onCreateBid,
  onAcceptBid,
  onRejectBid,
  isAdmin = false,
}) => {
  if (!isOpen) return null;

  // Passenger bid form state
  const oneDayPrice = vehicle.oneDayPrice || vehicle.basePrice || 25000;
  const [proposedPrice, setProposedPrice] = useState<number>(Math.round(oneDayPrice * 0.9));
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);
  const [travelTime, setTravelTime] = useState('08:00');
  const [notes, setNotes] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName || !passengerPhone || !proposedPrice) return;

    if (onCreateBid) {
      onCreateBid(vehicle.id, {
        vehicleId: vehicle.id,
        passengerName,
        passengerPhone,
        proposedPrice: Number(proposedPrice),
        travelDate,
        travelTime,
        notes: notes || undefined,
      });
    }

    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      onClose();
    }, 1800);
  };

  const bids = vehicle.bids || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {vehicle.registrationNumber}
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {vehicle.make} {vehicle.model}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {mode === 'create' ? 'Make a Price Bid / Custom Offer' : 'Manage Passenger Bids'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vehicle Fixed One Day Price Banner */}
        <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
              Driver Fixed One Day Vehicle Price
            </span>
            <span className="text-slate-600">Standard rate set by driver/owner (Non-negotiable by driver)</span>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-amber-900">
              Rs. {oneDayPrice.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-500 block">/ Day</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {mode === 'create' ? (
            submittedSuccess ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Bid Submitted to Driver!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Your proposed price of <strong>Rs. {Number(proposedPrice).toLocaleString()}</strong> has been submitted. The driver/owner will review and can accept or reject your offer.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitBid} className="space-y-4">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <span>
                    Drivers cannot bid on their own vehicles. Only passengers can propose a custom offer price for the driver to accept or reject.
                  </span>
                </div>

                {/* Proposed Price Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Proposed Price (Rs.) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                      Rs.
                    </span>
                    <input
                      type="number"
                      required
                      min={1000}
                      step={500}
                      value={proposedPrice}
                      onChange={e => setProposedPrice(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Fixed Day Price is Rs. {oneDayPrice.toLocaleString()}. You can propose higher or lower.
                  </span>
                </div>

                {/* Contact Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Passenger Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. S. Kamal"
                        value={passengerName}
                        onChange={e => setPassengerName(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mobile / WhatsApp Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="+94 77 123 4567"
                        value={passengerPhone}
                        onChange={e => setPassengerPhone(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Travel Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Wanted Travel Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        required
                        value={travelDate}
                        onChange={e => setTravelDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Wanted Pickup Time *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="time"
                        required
                        value={travelTime}
                        onChange={e => setTravelTime(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trip Notes / Route Specifics (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Mannar Town to Colombo round trip with 6 family passengers."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" />
                    Submit Offer to Driver
                  </button>
                </div>
              </form>
            )
          ) : (
            // Review Bids Mode (Driver / Owner / Admin)
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Passenger Price Bids ({bids.length})
                </h4>
                <span className="text-[11px] text-slate-500">
                  Driver / Owner can Accept or Reject each offer
                </span>
              </div>

              {bids.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 text-xs">
                  No bids have been submitted for this vehicle yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {bids.map(bid => (
                    <div
                      key={bid.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        bid.status === 'accepted'
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : bid.status === 'rejected'
                          ? 'border-rose-300 bg-rose-50/40 opacity-75'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-xs font-bold text-slate-900">
                              {bid.passengerName}
                            </strong>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                bid.status === 'accepted'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : bid.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {bid.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1 flex flex-wrap items-center gap-3">
                            <span>📞 {bid.passengerPhone}</span>
                            <span>📅 {bid.travelDate} at {bid.travelTime}</span>
                          </div>
                          {bid.notes && (
                            <p className="text-[11px] text-slate-500 mt-1 italic">
                              "{bid.notes}"
                            </p>
                          )}
                        </div>

                        {/* Bid Amount */}
                        <div className="text-right shrink-0">
                          <span className="text-sm sm:text-base font-extrabold text-emerald-700">
                            Rs. {bid.proposedPrice.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-500 block">Offer Price</span>
                        </div>
                      </div>

                      {/* Driver Actions (Accept / Reject / WhatsApp) */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <a
                          href={`https://wa.me/${bid.passengerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hello ${bid.passengerName}, regarding your bid of Rs. ${bid.proposedPrice.toLocaleString()} for vehicle ${vehicle.registrationNumber} on ${bid.travelDate}...`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          WhatsApp Passenger
                        </a>

                        <div className="flex items-center gap-1.5">
                          {bid.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onRejectBid && onRejectBid(vehicle.id, bid.id)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 border border-rose-300 cursor-pointer"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => onAcceptBid && onAcceptBid(vehicle.id, bid.id)}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                              >
                                Accept Offer
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-500">
                              {bid.status === 'accepted' ? 'Accepted by driver' : 'Rejected by driver'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
