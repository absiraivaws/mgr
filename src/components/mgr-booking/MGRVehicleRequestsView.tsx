/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Plus,
  MessageSquare,
  Users,
  Calendar,
  MapPin,
  Car,
  Bus,
  Ship,
  CheckCircle2,
  Clock,
  DollarSign,
  X,
  Send,
} from 'lucide-react';
import { TransportRequest, TransportQuote, TransportType, TransportOwner } from '../../types/mgrBooking';

interface MGRVehicleRequestsViewProps {
  requests: TransportRequest[];
  owners: TransportOwner[];
  onAddRequest: (newReq: TransportRequest) => void;
  onAddQuote: (requestId: string, newQuote: TransportQuote) => void;
  onAcceptQuote: (requestId: string, quoteId: string) => void;
  themeMode?: 'dark' | 'light';
}

export const MGRVehicleRequestsView: React.FC<MGRVehicleRequestsViewProps> = ({
  requests,
  owners,
  onAddRequest,
  onAddQuote,
  onAcceptQuote,
  themeMode = 'light',
}) => {
  const [isAddingRequest, setIsAddingRequest] = useState(false);
  const [activeQuoteRequestId, setActiveQuoteRequestId] = useState<string | null>(null);

  // New Request state
  const [reqPassengerName, setReqPassengerName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqVehicleType, setReqVehicleType] = useState<TransportType>('van');
  const [reqFrom, setReqFrom] = useState('Mannar Town');
  const [reqTo, setReqTo] = useState('Colombo Fort');
  const [reqTravelDate, setReqTravelDate] = useState('2026-09-25');
  const [reqReturnDate, setReqReturnDate] = useState('2026-09-27');
  const [reqPassengers, setReqPassengers] = useState(10);
  const [reqBudget, setReqBudget] = useState(65000);
  const [reqNotes, setReqNotes] = useState('');

  // Submit Quote state
  const [quoteOwnerId, setQuoteOwnerId] = useState(owners[0]?.id || 'OWN-MGR-00001');
  const [quoteAmount, setQuoteAmount] = useState(60000);
  const [quoteVehicleName, setQuoteVehicleName] = useState('Toyota HiAce KDH High Roof');
  const [quoteNotes, setQuoteNotes] = useState('Includes fuel, expressway toll, and driver accommodation.');

  const handleSaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqPassengerName || !reqPhone) return;

    const newReq: TransportRequest = {
      id: `REQ-${Math.floor(100 + Math.random() * 900)}`,
      requestNumber: `REQ-MGR-${Math.floor(100 + Math.random() * 900)}`,
      passengerName: reqPassengerName,
      passengerPhone: reqPhone,
      passengerWhatsApp: reqPhone,
      vehicleType: reqVehicleType,
      fromLocation: reqFrom,
      toLocation: reqTo,
      travelDate: reqTravelDate,
      returnDate: reqReturnDate || undefined,
      passengersCount: Number(reqPassengers),
      expectedBudget: Number(reqBudget),
      notes: reqNotes,
      status: 'open',
      quotesCount: 0,
      createdAt: Date.now(),
      quotes: [],
    };

    onAddRequest(newReq);
    setIsAddingRequest(false);
  };

  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuoteRequestId) return;

    const matchedOwner = owners.find(o => o.id === quoteOwnerId);
    const newQuote: TransportQuote = {
      id: `QUO-${Math.floor(100 + Math.random() * 900)}`,
      requestId: activeQuoteRequestId,
      ownerId: quoteOwnerId,
      ownerName: matchedOwner?.fullName || 'Verified Operator',
      ownerWhatsApp: matchedOwner?.whatsappNumber || '+94 77 123 4567',
      vehicleId: 'MGR-FLEET-V1',
      vehicleName: quoteVehicleName,
      vehicleType: 'van',
      quoteAmount: Number(quoteAmount),
      notes: quoteNotes,
      status: 'pending',
      createdAt: Date.now(),
    };

    onAddQuote(activeQuoteRequestId, newQuote);
    setActiveQuoteRequestId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Vehicle Requests & Quotation Marketplace
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Can't find a scheduled route? Passengers post custom journey requirements and verified operators submit competitive bids.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingRequest(true)}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Post New Transport Request
        </button>
      </div>

      {/* Requests List */}
      <div className="grid grid-cols-1 gap-4">
        {requests.map(req => (
          <div
            key={req.id}
            className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all space-y-4"
          >
            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {req.requestNumber}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                    {req.vehicleType}
                  </span>
                  <span className="text-xs text-slate-600 font-semibold">
                    Passengers: <strong className="text-slate-800">{req.passengersCount} Persons</strong>
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>{req.fromLocation}</span>
                  <span className="text-slate-400">➔</span>
                  <span className="text-emerald-700">{req.toLocation}</span>
                </h3>
              </div>

              {/* Budget & Quote Status */}
              <div className="sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500">Target Budget</span>
                <div className="text-sm font-extrabold text-emerald-700">
                  {req.expectedBudget ? `Rs. ${req.expectedBudget.toLocaleString()}` : 'Open to Bids'}
                </div>
                <div className="text-xs text-slate-500">
                  📅 {req.travelDate} {req.returnDate ? `to ${req.returnDate}` : '(One Way)'}
                </div>
              </div>
            </div>

            {/* Middle: Notes & Passenger info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                <span className="text-slate-500">Requested by:</span>{' '}
                <strong className="text-slate-800">{req.passengerName}</strong> ({req.passengerPhone})
                {req.notes && (
                  <p className="text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    Instructions: {req.notes}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveQuoteRequestId(req.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Submit Quotation Bid
              </button>
            </div>

            {/* Quotations Section */}
            {req.quotes && req.quotes.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <span>Operator Quotation Bids ({req.quotes.length})</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {req.quotes.map(quote => (
                    <div
                      key={quote.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs shadow-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">{quote.ownerName}</div>
                        <div className="text-[11px] text-slate-600">Vehicle: {quote.vehicleName}</div>
                        {quote.notes && (
                          <div className="text-[10px] text-slate-500 italic">"{quote.notes}"</div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-extrabold text-emerald-700">
                          Rs. {quote.quoteAmount.toLocaleString()}
                        </div>
                        {quote.status === 'accepted' ? (
                          <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                            ✓ Accepted
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onAcceptQuote(req.id, quote.id)}
                            className="mt-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-xs transition cursor-pointer"
                          >
                            Accept Bid
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Post New Request Modal */}
      {isAddingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm">Post Custom Transport Request</h3>
              <button onClick={() => setIsAddingRequest(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRequest} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Passenger Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dilshan Perera"
                    value={reqPassengerName}
                    onChange={e => setReqPassengerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mobile / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 077 889 9001"
                    value={reqPhone}
                    onChange={e => setReqPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Vehicle Type Required</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['car', 'van', 'bus', 'boat'] as TransportType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setReqVehicleType(t)}
                      className={`py-1.5 rounded-lg font-bold uppercase transition ${
                        reqVehicleType === t
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">From (Departure)</label>
                  <input
                    type="text"
                    value={reqFrom}
                    onChange={e => setReqFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">To (Destination)</label>
                  <input
                    type="text"
                    value={reqTo}
                    onChange={e => setReqTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Travel Date</label>
                  <input
                    type="date"
                    value={reqTravelDate}
                    onChange={e => setReqTravelDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Return Date (Optional)</label>
                  <input
                    type="date"
                    value={reqReturnDate}
                    onChange={e => setReqReturnDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Passengers</label>
                  <input
                    type="number"
                    value={reqPassengers}
                    onChange={e => setReqPassengers(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Expected Budget (Rs.)</label>
                  <input
                    type="number"
                    value={reqBudget}
                    onChange={e => setReqBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Special Requirements</label>
                <textarea
                  rows={2}
                  placeholder="e.g. AC needed, experienced tour driver, airport pickup..."
                  value={reqNotes}
                  onChange={e => setReqNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRequest(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Quotation Modal */}
      {activeQuoteRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm">Submit Quotation Bid</h3>
              <button onClick={() => setActiveQuoteRequestId(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveQuote} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Quoting Operator</label>
                <select
                  value={quoteOwnerId}
                  onChange={e => setQuoteOwnerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                >
                  {owners.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.fullName} ({o.businessName || 'Independent'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Vehicle Proposed</label>
                <input
                  type="text"
                  required
                  value={quoteVehicleName}
                  onChange={e => setQuoteVehicleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Quotation Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  value={quoteAmount}
                  onChange={e => setQuoteAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-emerald-800 font-bold focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Inclusions / Terms</label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={e => setQuoteNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveQuoteRequestId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-xs">
                  Submit Bid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
