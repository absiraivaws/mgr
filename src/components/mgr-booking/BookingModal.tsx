/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, MessageSquare, Phone, Calendar, Clock, MapPin, ShieldCheck, Sparkles, User } from 'lucide-react';
import { TransportVehicle, TransportRoute, TransportBooking, DriverOption } from '../../types/mgrBooking';

interface BookingModalProps {
  vehicle: TransportVehicle;
  route?: TransportRoute;
  bookingType: 'whole_vehicle' | 'seat';
  selectedSeats?: string[];
  totalSeatPrice?: number;
  travelDate: string;
  travelTime: string;
  onClose: () => void;
  onConfirmBooking: (newBooking: TransportBooking) => void;
  themeMode?: 'dark' | 'light';
}

export const BookingModal: React.FC<BookingModalProps> = ({
  vehicle,
  route,
  bookingType,
  selectedSeats = [],
  totalSeatPrice,
  travelDate,
  travelTime,
  onClose,
  onConfirmBooking,
  themeMode = 'light',
}) => {
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerWhatsApp, setPassengerWhatsApp] = useState('');
  const [passengerNic, setPassengerNic] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [pickupLocation, setPickupLocation] = useState(route?.pickupPoints[0] || 'Mannar Town Center');
  const [dropoffLocation, setDropoffLocation] = useState(route?.dropoffPoints[0] || route?.toLocation || 'Destination');
  const [driverOption, setDriverOption] = useState<DriverOption>('with_driver');
  const [specialNotes, setSpecialNotes] = useState('');
  const [bookingConfirmed, setBookingConfirmed] = useState<TransportBooking | null>(null);

  // Calculate pricing
  const baseTotal = bookingType === 'whole_vehicle'
    ? (vehicle.basePrice || 18000)
    : (totalSeatPrice || (selectedSeats.length * (vehicle.pricePerSeat || 1200)));

  const commissionRate = 5;
  const mgrCommissionAmount = Math.round((baseTotal * commissionRate) / 100);
  const ownerPayoutAmount = baseTotal - mgrCommissionAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passengerName || !passengerPhone) return;

    const bookingNumber = `MGR-BK-${Math.floor(10000 + Math.random() * 90000)}`;
    const newBooking: TransportBooking = {
      id: `BK-${Date.now()}`,
      bookingNumber,
      bookingType,
      vehicleId: vehicle.id,
      vehicleName: `${vehicle.make} ${vehicle.model}`,
      vehicleType: vehicle.type,
      vehicleRegNumber: vehicle.registrationNumber,
      routeId: route?.id || 'ROUTE-CUSTOM',
      routeFrom: route?.fromLocation || 'Mannar Town',
      routeTo: route?.toLocation || 'Custom Destination',
      travelDate: travelDate || new Date().toISOString().split('T')[0],
      travelTime: travelTime || '08:00',
      passengerName,
      passengerPhone,
      passengerWhatsApp: passengerWhatsApp || passengerPhone,
      passengerEmail,
      passengerNic,
      driverOption,
      selectedSeats: bookingType === 'seat' ? selectedSeats : undefined,
      seatCount: bookingType === 'seat' ? selectedSeats.length : vehicle.totalSeats,
      totalAmount: baseTotal,
      commissionRate,
      mgrCommissionAmount,
      ownerPayoutAmount,
      status: 'confirmed',
      pickupLocation,
      dropoffLocation,
      specialNotes,
      createdAt: Date.now(),
    };

    onConfirmBooking(newBooking);
    setBookingConfirmed(newBooking);
  };

  const getWhatsAppMessageUrl = (b: TransportBooking) => {
    const rawNumber = (b.passengerWhatsApp || b.passengerPhone).replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `*MANNAR GREEN RIDE — BOOKING CONFIRMATION*\n\n` +
      `Booking Ref: *${b.bookingNumber}*\n` +
      `Vehicle: *${b.vehicleName}* (${b.vehicleRegNumber})\n` +
      `Type: ${b.vehicleType.toUpperCase()} (${b.bookingType === 'seat' ? `Seats: ${b.selectedSeats?.join(', ')}` : 'Entire Vehicle'})\n` +
      `Route: ${b.routeFrom} ➔ ${b.routeTo}\n` +
      `Date & Time: ${b.travelDate} at ${b.travelTime}\n` +
      `Pickup: ${b.pickupLocation}\n` +
      `Total Fare: Rs. ${b.totalAmount.toLocaleString()}\n` +
      `Status: CONFIRMED\n\n` +
      `Thank you for traveling with Mannar Green Ride!`
    );
    return `https://wa.me/${rawNumber}?text=${text}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              {bookingType === 'whole_vehicle' ? 'Whole Vehicle Booking' : 'Seat Reservation'}
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              {vehicle.make} {vehicle.model}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {bookingConfirmed ? (
          /* SUCCESS SCREEN */
          <div className="p-6 text-center space-y-4 bg-white">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-bold shadow-xs">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Booking Confirmed!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Booking Reference: <span className="font-mono font-bold text-emerald-700">{bookingConfirmed.bookingNumber}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle:</span>
                <span className="font-semibold text-slate-800">{bookingConfirmed.vehicleName} ({bookingConfirmed.vehicleRegNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Route:</span>
                <span className="font-semibold text-slate-800">{bookingConfirmed.routeFrom} ➔ {bookingConfirmed.routeTo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="font-semibold text-slate-800">{bookingConfirmed.travelDate} at {bookingConfirmed.travelTime}</span>
              </div>
              {bookingConfirmed.selectedSeats && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Seats Booked:</span>
                  <span className="font-bold text-emerald-700">{bookingConfirmed.selectedSeats.join(', ')}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold">
                <span className="text-slate-700">Total Payable:</span>
                <span className="text-emerald-700 text-sm">Rs. {bookingConfirmed.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href={getWhatsAppMessageUrl(bookingConfirmed)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition"
              >
                <MessageSquare className="w-4 h-4" />
                Send Confirmation WhatsApp
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          /* BOOKING FORM */
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
            {/* Route & Schedule Preview Card */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  {route?.fromLocation || 'Mannar'} ➔ {route?.toLocation || 'Destination'}
                </div>
                <div className="text-slate-600 text-[11px] flex items-center gap-2">
                  <span>📅 {travelDate}</span>
                  <span>⏰ {travelTime}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500">Total Fare</span>
                <div className="text-sm font-bold text-emerald-700">Rs. {baseTotal.toLocaleString()}</div>
                {bookingType === 'seat' && (
                  <div className="text-[10px] text-slate-500 font-semibold">Seats: {selectedSeats.join(', ')}</div>
                )}
              </div>
            </div>

            {/* Passenger Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                Passenger Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kamal Perera"
                    value={passengerName}
                    onChange={e => setPassengerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mobile / Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 077 123 4567"
                    value={passengerPhone}
                    onChange={e => setPassengerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    WhatsApp Number (for alerts)
                  </label>
                  <input
                    type="tel"
                    placeholder="Same as mobile if blank"
                    value={passengerWhatsApp}
                    onChange={e => setPassengerWhatsApp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    NIC or Passport No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 199012345678"
                    value={passengerNic}
                    onChange={e => setPassengerNic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Journey Details */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Pickup & Drop-off Points
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pickup Location
                  </label>
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={e => setPickupLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Drop-off Location
                  </label>
                  <input
                    type="text"
                    value={dropoffLocation}
                    onChange={e => setDropoffLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              {vehicle.driverOption === 'both' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Driver Preference
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDriverOption('with_driver')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        driverOption === 'with_driver'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      With Driver (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDriverOption('without_driver')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        driverOption === 'without_driver'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      Self Drive (Without Driver)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Special Instructions / Requests
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Extra luggage space needed, child traveling, etc."
                  value={specialNotes}
                  onChange={e => setSpecialNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 resize-none transition"
                />
              </div>
            </div>

            {/* Price Summary Breakdown */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>{bookingType === 'whole_vehicle' ? 'Vehicle Rental Rate' : `Seats (${selectedSeats.length} x Rs. ${vehicle.pricePerSeat || 1200})`}:</span>
                <span className="text-slate-800 font-semibold">Rs. {baseTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>MGR Service & Booking Fee ({commissionRate}%):</span>
                <span className="text-slate-800">Included (Rs. {mgrCommissionAmount.toLocaleString()})</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-slate-200">
                <span className="text-slate-900">Total Amount to Pay:</span>
                <span className="text-emerald-700 font-extrabold">Rs. {baseTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Confirm & Create Booking
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
