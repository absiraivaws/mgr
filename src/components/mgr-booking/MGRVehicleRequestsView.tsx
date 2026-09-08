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
  Eye,
  Edit2,
  Trash2,
  Lock,
} from 'lucide-react';
import { TransportRequest, TransportQuote, TransportType, TransportOwner } from '../../types/mgrBooking';

interface MGRVehicleRequestsViewProps {
  requests: TransportRequest[];
  owners: TransportOwner[];
  onAddRequest: (newReq: TransportRequest) => void;
  onUpdateRequestStatus?: (requestId: string, status: TransportRequest['status']) => void;
  onEditRequest?: (request: TransportRequest) => void;
  onDeleteRequest?: (requestId: string) => void;
  onAddQuote: (requestId: string, newQuote: TransportQuote) => void;
  onAcceptQuote: (requestId: string, quoteId: string) => void;
  isAdmin?: boolean;
  themeMode?: 'dark' | 'light';
}

export const MGRVehicleRequestsView: React.FC<MGRVehicleRequestsViewProps> = ({
  requests,
  owners,
  onAddRequest,
  onUpdateRequestStatus,
  onEditRequest,
  onDeleteRequest,
  onAddQuote,
  onAcceptQuote,
  isAdmin = false,
  themeMode = 'light',
}) => {
  const [isAddingRequest, setIsAddingRequest] = useState(false);
  const [activeQuoteRequestId, setActiveQuoteRequestId] = useState<string | null>(null);
  const [viewingRequest, setViewingRequest] = useState<TransportRequest | null>(null);
  const [editingRequest, setEditingRequest] = useState<TransportRequest | null>(null);

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
    setReqPassengerName('');
    setReqPhone('');
    setReqNotes('');
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
      ownerWhatsApp: matchedOwner?.whatsappNumber || '+94771234567',
      vehicleId: 'VEH-MGR-001',
      vehicleName: quoteVehicleName,
      vehicleType: 'van',
      quoteAmount: Number(quoteAmount),
      status: 'pending',
      notes: quoteNotes,
      createdAt: Date.now(),
    };

    onAddQuote(activeQuoteRequestId, newQuote);
    setActiveQuoteRequestId(null);
  };

  const handleDelete = (requestId: string, reqNum: string) => {
    if (!isAdmin) {
      alert('Only administrators can delete travel requests.');
      return;
    }
    if (confirm(`Are you sure you want to delete request ${reqNum}?`)) {
      if (onDeleteRequest) onDeleteRequest(requestId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Custom Vehicle & Charter Requests</h3>
          <p className="text-xs text-slate-500">
            Passengers post travel requirements; vehicle owners and operators submit competitive bids.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingRequest(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Post Custom Request
        </button>
      </div>

      {/* Requests Table Format */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4">Request # & Type</th>
              <th className="py-3.5 px-4">Passenger Details</th>
              <th className="py-3.5 px-4">Route Itinerary</th>
              <th className="py-3.5 px-4">Travel Date(s)</th>
              <th className="py-3.5 px-4">Pax Count</th>
              <th className="py-3.5 px-4">Target Budget</th>
              <th className="py-3.5 px-4">Quotes</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  No charter requests found.
                </td>
              </tr>
            ) : (
              requests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 break-words">
                    <div className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block break-words">
                      {req.requestNumber}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200 capitalize block mt-1 w-max">
                      {req.vehicleType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 break-words">
                    <div className="font-bold text-slate-900 break-words">{req.passengerName}</div>
                    <span className="text-[11px] text-slate-500 break-words">{req.passengerPhone}</span>
                  </td>
                  <td className="py-3 px-4 break-words">
                    <div className="font-medium text-slate-800 break-words">
                      {req.fromLocation} ➔ {req.toLocation}
                    </div>
                  </td>
                  <td className="py-3 px-4 break-words">
                    <div className="text-slate-800 font-medium">{req.travelDate}</div>
                    {req.returnDate && (
                      <span className="text-[10px] text-slate-400 block">Return: {req.returnDate}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 break-words">
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{req.passengersCount} Pax</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 break-words">
                    <div className="font-extrabold text-emerald-700">
                      Rs. {req.expectedBudget.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400 block">Target Budget</span>
                  </td>
                  <td className="py-3 px-4 break-words">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      {req.quotesCount || req.quotes?.length || 0} Quote(s)
                    </span>
                  </td>
                  <td className="py-3 px-4 break-words">
                    {/* Inline Status Change (Operator/User can update status) */}
                    <select
                      value={req.status}
                      onChange={e => {
                        if (onUpdateRequestStatus) {
                          onUpdateRequestStatus(req.id, e.target.value as TransportRequest['status']);
                        }
                      }}
                      className={`text-xs font-bold px-2 py-1 rounded-lg border bg-white cursor-pointer focus:outline-none ${
                        req.status === 'open'
                          ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                          : req.status === 'quoted'
                          ? 'text-blue-700 border-blue-300 bg-blue-50'
                          : req.status === 'accepted'
                          ? 'text-purple-700 border-purple-300 bg-purple-50'
                          : 'text-slate-600 border-slate-300 bg-slate-50'
                      }`}
                    >
                      <option value="open">Open</option>
                      <option value="quoted">Quoted</option>
                      <option value="accepted">Accepted</option>
                      <option value="expired">Expired</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* View Details Button */}
                      <button
                        type="button"
                        onClick={() => setViewingRequest(req)}
                        title="View Request & Quotes"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Submit Operator Quote Button */}
                      <button
                        type="button"
                        onClick={() => setActiveQuoteRequestId(req.id)}
                        title="Submit Operator Quote"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>

                      {/* Edit Button (Admin Only) */}
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setEditingRequest(req)}
                          title="Edit Request (Admin Only)"
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
                          onClick={() => handleDelete(req.id, req.requestNumber)}
                          title="Delete Request (Admin Only)"
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

      {/* VIEW REQUEST & QUOTES MODAL */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono font-bold text-slate-500">{viewingRequest.requestNumber}</span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{viewingRequest.passengerName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Route & Vehicle</span>
                <strong className="text-slate-800">
                  {viewingRequest.fromLocation} ➔ {viewingRequest.toLocation} ({viewingRequest.vehicleType.toUpperCase()})
                </strong>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Travel: {viewingRequest.travelDate} {viewingRequest.returnDate ? `(Return: ${viewingRequest.returnDate})` : ''} • {viewingRequest.passengersCount} Passengers
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">Passenger Target Budget</span>
                  <span className="text-slate-600">Contact: {viewingRequest.passengerPhone}</span>
                </div>
                <span className="text-base font-extrabold text-emerald-800">
                  Rs. {viewingRequest.expectedBudget.toLocaleString()}
                </span>
              </div>

              {viewingRequest.notes && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">Passenger Notes</span>
                  <p className="text-slate-700 mt-1 italic">"{viewingRequest.notes}"</p>
                </div>
              )}

              {/* Received Quotes Section */}
              <div className="pt-2">
                <h4 className="font-bold text-slate-800 mb-2">
                  Received Operator Quotes ({viewingRequest.quotes?.length || 0})
                </h4>
                {(!viewingRequest.quotes || viewingRequest.quotes.length === 0) ? (
                  <p className="text-slate-400 italic">No quotes submitted yet.</p>
                ) : (
                  <div className="space-y-2">
                    {viewingRequest.quotes.map(q => (
                      <div key={q.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900 block">{q.ownerName}</strong>
                          <span className="text-[11px] text-slate-500">{q.vehicleName} • {q.notes}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-emerald-700 block">
                            Rs. {q.quoteAmount.toLocaleString()}
                          </span>
                          {q.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => {
                                onAcceptQuote(viewingRequest.id, q.id);
                                setViewingRequest(null);
                              }}
                              className="mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white"
                            >
                              Accept Quote
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT REQUEST MODAL (ADMIN ONLY) */}
      {editingRequest && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">Admin Mode</span>
                <h3 className="text-base font-bold text-slate-900">Edit Request: {editingRequest.requestNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (onEditRequest && editingRequest) {
                  onEditRequest(editingRequest);
                  setEditingRequest(null);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Passenger Name</label>
                <input
                  type="text"
                  required
                  value={editingRequest.passengerName}
                  onChange={e => setEditingRequest({ ...editingRequest, passengerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={editingRequest.passengerPhone}
                    onChange={e => setEditingRequest({ ...editingRequest, passengerPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Budget (Rs.)</label>
                  <input
                    type="number"
                    required
                    value={editingRequest.expectedBudget}
                    onChange={e => setEditingRequest({ ...editingRequest, expectedBudget: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Travel Date</label>
                  <input
                    type="date"
                    required
                    value={editingRequest.travelDate}
                    onChange={e => setEditingRequest({ ...editingRequest, travelDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Passengers Count</label>
                  <input
                    type="number"
                    required
                    value={editingRequest.passengersCount}
                    onChange={e => setEditingRequest({ ...editingRequest, passengersCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
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

      {/* SUBMIT QUOTE MODAL */}
      {activeQuoteRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Submit Charter Quote</h3>
              <button
                type="button"
                onClick={() => setActiveQuoteRequestId(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Operator Profile *</label>
                <select
                  value={quoteOwnerId}
                  onChange={e => setQuoteOwnerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                >
                  {owners.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.fullName} ({o.businessName || 'Operator'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Offered Vehicle Model *</label>
                  <input
                    type="text"
                    required
                    value={quoteVehicleName}
                    onChange={e => setQuoteVehicleName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quote Total (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={quoteAmount}
                    onChange={e => setQuoteAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Terms & Inclusions</label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={e => setQuoteNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveQuoteRequestId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Send Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST REQUEST MODAL */}
      {isAddingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Post Custom Vehicle Request</h3>
              <button
                type="button"
                onClick={() => setIsAddingRequest(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRequest} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Passenger Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S. Kamal"
                    value={reqPassengerName}
                    onChange={e => setReqPassengerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile & WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+94 77 123 4567"
                    value={reqPhone}
                    onChange={e => setReqPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Type *</label>
                  <select
                    value={reqVehicleType}
                    onChange={e => setReqVehicleType(e.target.value as TransportType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  >
                    <option value="van">Passenger Van</option>
                    <option value="car">Car (Sedan)</option>
                    <option value="bus_trip">Bus for Trip (Whole Bus)</option>
                    <option value="route_bus">Route Bus</option>
                    <option value="safari">Safari 4x4 Jeep</option>
                    <option value="boat">Boat Tour</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Passengers *</label>
                  <input
                    type="number"
                    required
                    value={reqPassengers}
                    onChange={e => setReqPassengers(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Budget (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={reqBudget}
                    onChange={e => setReqBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pickup Location *</label>
                  <input
                    type="text"
                    required
                    value={reqFrom}
                    onChange={e => setReqFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    value={reqTo}
                    onChange={e => setReqTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Departure Date *</label>
                  <input
                    type="date"
                    required
                    value={reqTravelDate}
                    onChange={e => setReqTravelDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Return Date (Optional)</label>
                  <input
                    type="date"
                    value={reqReturnDate}
                    onChange={e => setReqReturnDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Trip Details / Specifics</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Wedding party, needs AC, luggage space for 10 bags."
                  value={reqNotes}
                  onChange={e => setReqNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingRequest(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
