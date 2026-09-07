/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, Users, ShieldAlert, Sparkles, Navigation } from 'lucide-react';
import { TransportVehicle, TransportSchedule } from '../../types/mgrBooking';

interface SeatMapModalProps {
  vehicle: TransportVehicle;
  schedule?: TransportSchedule;
  onClose: () => void;
  onProceedToBooking: (selectedSeats: string[], totalSeatPrice: number) => void;
  themeMode?: 'dark' | 'light';
}

export const SeatMapModal: React.FC<SeatMapModalProps> = ({
  vehicle,
  schedule,
  onClose,
  onProceedToBooking,
  themeMode = 'light',
}) => {
  const isBus = vehicle.type === 'bus';
  const isBoat = vehicle.type === 'boat';
  const pricePerSeat = schedule?.farePerSeat || vehicle.pricePerSeat || 1200;

  // Generate seats based on vehicle capacity
  const totalSeats = vehicle.totalSeats || (isBus ? 40 : isBoat ? 24 : 12);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Simulated pre-booked seats
  const bookedSeats = React.useMemo(() => {
    const booked = new Set<string>();
    if (isBus) {
      ['01', '02', '07', '08', '15', '16', '23', '24'].forEach(s => booked.add(s));
    } else if (isBoat) {
      ['A1', 'A2', 'B4', 'C2', 'C3'].forEach(s => booked.add(s));
    } else {
      ['03', '06'].forEach(s => booked.add(s));
    }
    return booked;
  }, [isBus, isBoat]);

  const toggleSeat = (seatId: string) => {
    if (bookedSeats.has(seatId)) return;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatId));
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const totalPrice = selectedSeats.length * pricePerSeat;

  // Generate Bus rows (2 x 2 layout)
  const busRows = React.useMemo(() => {
    if (!isBus) return [];
    const rows = [];
    const rowsCount = Math.ceil(totalSeats / 4);
    for (let r = 1; r <= rowsCount; r++) {
      const leftWindow = String((r - 1) * 4 + 1).padStart(2, '0');
      const leftAisle = String((r - 1) * 4 + 2).padStart(2, '0');
      const rightAisle = String((r - 1) * 4 + 3).padStart(2, '0');
      const rightWindow = String((r - 1) * 4 + 4).padStart(2, '0');
      rows.push({ r, leftWindow, leftAisle, rightAisle, rightWindow });
    }
    return rows;
  }, [isBus, totalSeats]);

  // Generate Boat layout (Forward deck + Main cabin)
  const boatSeats = React.useMemo(() => {
    if (!isBoat) return [];
    const sections = [
      { name: 'Forward Viewing Deck', rows: ['A1', 'A2', 'A3', 'A4'] },
      { name: 'Main Passenger Cabin (Shaded)', rows: ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'] },
      { name: 'Aft Ocean Lounge', rows: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12'] },
    ];
    return sections;
  }, [isBoat]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                {isBoat ? '🚤 Boat Seating Plan' : '🚌 Bus Seat Layout'}
              </span>
              <span className="text-xs text-slate-500 font-mono font-semibold">
                ({vehicle.registrationNumber})
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
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

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 py-2.5 px-6 border-b border-slate-200 bg-slate-100/60 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border border-slate-300 bg-white" />
            <span className="text-slate-600">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              ✓
            </div>
            <span className="text-emerald-700 font-bold">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300 text-slate-400 flex items-center justify-center text-[10px]">
              ✕
            </div>
            <span className="text-slate-400">Booked</span>
          </div>
        </div>

        {/* Seat Map Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-white">
          {/* BUS SEATING MAP */}
          {isBus && (
            <div className="w-full max-w-sm p-5 rounded-3xl border-2 border-slate-300 bg-slate-50/60 shadow-xs flex flex-col gap-3">
              {/* Driver Cabin */}
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-300">
                <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-blue-600 rotate-45" />
                  Front / Windshield
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-1 shadow-xs">
                  <span>👨‍✈️ Driver</span>
                </div>
              </div>

              {/* Passenger Rows (2 x 2) */}
              <div className="space-y-2.5">
                {busRows.map(row => (
                  <div key={row.r} className="flex items-center justify-between">
                    {/* Left Pair (Window & Aisle) */}
                    <div className="flex items-center gap-1.5">
                      <SeatButton
                        seatId={row.leftWindow}
                        isBooked={bookedSeats.has(row.leftWindow)}
                        isSelected={selectedSeats.includes(row.leftWindow)}
                        onToggle={() => toggleSeat(row.leftWindow)}
                      />
                      <SeatButton
                        seatId={row.leftAisle}
                        isBooked={bookedSeats.has(row.leftAisle)}
                        isSelected={selectedSeats.includes(row.leftAisle)}
                        onToggle={() => toggleSeat(row.leftAisle)}
                      />
                    </div>

                    {/* Aisle Space */}
                    <div className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-widest">
                      Aisle
                    </div>

                    {/* Right Pair (Aisle & Window) */}
                    <div className="flex items-center gap-1.5">
                      <SeatButton
                        seatId={row.rightAisle}
                        isBooked={bookedSeats.has(row.rightAisle)}
                        isSelected={selectedSeats.includes(row.rightAisle)}
                        onToggle={() => toggleSeat(row.rightAisle)}
                      />
                      <SeatButton
                        seatId={row.rightWindow}
                        isBooked={bookedSeats.has(row.rightWindow)}
                        isSelected={selectedSeats.includes(row.rightWindow)}
                        onToggle={() => toggleSeat(row.rightWindow)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOAT SEATING MAP */}
          {isBoat && (
            <div className="w-full max-w-md space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-blue-600" />
                <span>Life jackets are provided on board and mandatory for all seated passengers.</span>
              </div>

              {boatSeats.map(section => (
                <div key={section.name} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                    <span>{section.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Capacity: {section.rows.length} Seats
                    </span>
                  </h4>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {section.rows.map(seatId => (
                      <SeatButton
                        key={seatId}
                        seatId={seatId}
                        isBooked={bookedSeats.has(seatId)}
                        isSelected={selectedSeats.includes(seatId)}
                        onToggle={() => toggleSeat(seatId)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary & Proceed */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-600">
              Selected Seats:{' '}
              <strong className="text-emerald-700 font-bold">
                {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}
              </strong>
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              Total Fare: <span className="text-emerald-700 font-extrabold">Rs. {totalPrice.toLocaleString()}</span>
              <span className="text-xs font-normal text-slate-500 ml-1.5">(Rs. {pricePerSeat} / seat)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedSeats.length === 0}
              onClick={() => onProceedToBooking(selectedSeats, totalPrice)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                selectedSeats.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <Check className="w-4 h-4" />
              Book Selected Seats ({selectedSeats.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SeatButtonProps {
  seatId: string;
  isBooked: boolean;
  isSelected: boolean;
  onToggle: () => void;
}

const SeatButton: React.FC<SeatButtonProps> = ({ seatId, isBooked, isSelected, onToggle }) => {
  if (isBooked) {
    return (
      <div
        title={`Seat ${seatId} (Already Booked)`}
        className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-xs font-semibold select-none cursor-not-allowed"
      >
        {seatId}
      </div>
    );
  }

  if (isSelected) {
    return (
      <button
        type="button"
        onClick={onToggle}
        title={`Seat ${seatId} (Selected - Click to unselect)`}
        className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold border-2 border-emerald-400 flex items-center justify-center text-xs shadow-xs hover:scale-105 transition cursor-pointer"
      >
        {seatId}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      title={`Seat ${seatId} (Available)`}
      className="w-10 h-10 rounded-xl bg-white border border-slate-300 text-slate-800 hover:border-emerald-600 hover:bg-emerald-50 flex items-center justify-center text-xs font-semibold hover:scale-105 transition cursor-pointer shadow-xs"
    >
      {seatId}
    </button>
  );
};
