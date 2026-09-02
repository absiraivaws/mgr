import React, { useState, useEffect } from 'react';
import { 
  Square, 
  Clock, 
  Calendar,
  Search, 
  DollarSign, 
  User, 
  Phone,
  IdCard, 
  Sparkles, 
  Zap,
  Info,
  X
} from 'lucide-react';
import { AppSettings, RentalRecord } from '../types';
import { VehicleIcon } from './VehicleIcon';
import { 
  calculateRentalBreakdown, 
  formatCurrency, 
  formatDurationTimer, 
  formatTime 
} from '../utils/pricing';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface ActiveRentalsListProps {
  activeRentals: RentalRecord[];
  settings: AppSettings;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onStopRental: (rental: RentalRecord) => void;
}

export const ActiveRentalsList: React.FC<ActiveRentalsListProps> = ({
  activeRentals,
  settings,
  themeMode = 'dark',
  accent = 'emerald',
  onStopRental,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [now, setNow] = useState<number>(Date.now());

  const t = getThemeClasses(themeMode, accent);

  // Update timer every second for live accurate durations and amounts
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredRentals = activeRentals.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.vehicleSerialNumber.toLowerCase().includes(term) ||
      r.vehicleTypeName.toLowerCase().includes(term) ||
      r.rentalNumber.toLowerCase().includes(term) ||
      (r.customerName && r.customerName.toLowerCase().includes(term)) ||
      (r.customerPhone && r.customerPhone.includes(term)) ||
      (r.customerNicPassport && r.customerNicPassport.toLowerCase().includes(term))
    );
  });

  const totalCurrentActiveAmount = activeRentals.reduce((sum, r) => {
    const calc = calculateRentalBreakdown(r.startTime, now, r.rateSnapshot);
    return sum + calc.totalAmount;
  }, 0);

  return (
    <div className={`${t.cardBg} rounded-2xl p-4 sm:p-6 border shadow-xl transition-all`}>
      
      {/* Header & Stats */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b ${t.divider} mb-4 sm:mb-5`}>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className={`text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 ${t.textHeading}`}>
              <span>Active Rented Fleet</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs ${t.badge}`}>
                {activeRentals.length} Active
              </span>
            </h2>
          </div>
          <p className={`text-xs ${t.textMuted} mt-0.5`}>
            Real-time duration ticking & live billing calculator
          </p>
        </div>

        {/* Live Running Total */}
        {activeRentals.length > 0 && (
          <div className={`flex items-center justify-between sm:justify-end gap-2.5 px-3.5 py-2 rounded-xl border text-xs ${t.cardSubtleBg}`}>
            <span className={t.textMuted}>Total Live Running:</span>
            <span className="font-mono font-bold text-emerald-500 text-sm">
              {formatCurrency(totalCurrentActiveAmount, settings.currencySymbol, settings.currencyPosition)}
            </span>
          </div>
        )}
      </div>

      {/* DISTINCT FIND / SEARCH BAR (Cyan theme) */}
      {activeRentals.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-cyan-500 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Search Active Fleet</span>
            </label>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${t.searchBadge}`}>
              Search Bar
            </span>
          </div>
          <div className="relative">
            <input
              id="input-search-active-rentals"
              type="text"
              placeholder="Search by serial number, NIC, customer name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm font-medium ${t.searchInput}`}
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-500">
              <Search className="w-4 h-4" />
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-cyan-500 hover:text-cyan-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Rentals Table / Cards */}
      {activeRentals.length === 0 ? (
        <div className={`text-center py-10 sm:py-12 px-4 border border-dashed rounded-xl ${t.cardSubtleBg} ${t.divider}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${t.textMuted} bg-slate-500/10`}>
            <Clock className="w-6 h-6" />
          </div>
          <h3 className={`text-sm font-semibold mb-1 ${t.textHeading}`}>No Vehicles Currently Rented</h3>
          <p className={`text-xs max-w-sm mx-auto ${t.textMuted}`}>
            Select a vehicle type and serial number from the desk panel to start a new rental timer.
          </p>
        </div>
      ) : filteredRentals.length === 0 ? (
        <div className={`text-center py-8 text-xs ${t.textMuted}`}>
          No active rental matches "{searchTerm}".
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredRentals.map((rental) => {
            const elapsedMs = Math.max(0, now - rental.startTime);
            const breakdown = calculateRentalBreakdown(rental.startTime, now, rental.rateSnapshot);

            return (
              <div
                key={rental.id}
                id={`rental-card-${rental.vehicleSerialNumber}`}
                className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-md space-y-3 ${t.cardBg}`}
              >
                {/* Top Section: Vehicle + Live Tickers + Stop Button */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Vehicle Icon, Serial, Type, Start Time */}
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <VehicleIcon type={rental.vehicleIcon} className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-mono font-extrabold text-base sm:text-lg tracking-wider ${t.textHeading}`}>
                          {rental.vehicleSerialNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap ${t.badge}`}>
                          {rental.vehicleTypeName}
                        </span>
                        <span className={`text-[11px] font-mono ${t.textMuted}`}>
                          #{rental.rentalNumber}
                        </span>
                      </div>

                      <div className={`flex items-center gap-2 text-xs mt-1 ${t.textMuted}`}>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                          <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                          Started: <strong className={t.textMain}>{formatTime(rental.startTime)}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle & Right on mobile: duration & price ticker + stop button */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    
                    {/* Live Duration Ticker & Calculated Amount */}
                    <div className={`flex items-center justify-between sm:justify-start gap-4 px-3.5 py-2.5 rounded-xl border ${t.cardSubtleBg}`}>
                      <div className="text-left">
                        <div className={`text-[10px] uppercase font-semibold flex items-center gap-1.5 ${t.textMuted}`}>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          Live Duration
                        </div>
                        <div className="font-mono text-base sm:text-lg font-bold text-emerald-500 tracking-wider">
                          {formatDurationTimer(elapsedMs)}
                        </div>
                        <div className={`text-[10px] font-medium truncate max-w-[120px] ${t.textMuted}`}>
                          {breakdown.durationFormatted}
                        </div>
                      </div>

                      <div className={`w-px h-8 ${t.divider} border-r`} />

                      {/* Live Calculated Amount */}
                      <div className="text-right">
                        <div className={`text-[10px] uppercase font-semibold ${t.textMuted}`}>
                          Current Total
                        </div>
                        <div className={`font-mono text-base sm:text-lg font-extrabold ${t.textHeading}`}>
                          {formatCurrency(breakdown.totalAmount, settings.currencySymbol, settings.currencyPosition)}
                        </div>
                        <div className="text-[10px] text-teal-500 font-medium">
                          {breakdown.every30MinCount > 0
                            ? `+${breakdown.every30MinCount} × 30m (+${formatCurrency(breakdown.every30MinAmount, settings.currencySymbol, settings.currencyPosition)})`
                            : 'First 60 Min Base'}
                        </div>
                      </div>
                    </div>

                    {/* Stop & Settle Action */}
                    <button
                      id={`btn-stop-${rental.vehicleSerialNumber}`}
                      type="button"
                      onClick={() => onStopRental(rental)}
                      className="w-full sm:w-auto px-4 py-3 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25 transition cursor-pointer shrink-0 min-h-[44px]"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>Stop & Settle</span>
                    </button>
                  </div>
                </div>

                {/* Customer Details Row (Name, Phone, NIC / Passport) */}
                {(rental.customerName || rental.customerPhone || rental.customerNicPassport) && (
                  <div className={`pt-2.5 border-t ${t.divider} flex flex-wrap items-center gap-2 sm:gap-4 text-xs`}>
                    <span className={`text-[11px] uppercase tracking-wider font-semibold ${t.textMuted}`}>
                      Customer:
                    </span>

                    {rental.customerName && (
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium ${t.cardSubtleBg} ${t.textMain}`}>
                        <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{rental.customerName}</span>
                      </span>
                    )}

                    {rental.customerPhone && (
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono ${t.cardSubtleBg} ${t.textMuted}`}>
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{rental.customerPhone}</span>
                      </span>
                    )}

                    {rental.customerNicPassport && (
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono ${t.cardSubtleBg}`}>
                        <IdCard className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className={`font-sans text-[11px] ${t.textMuted}`}>NIC/Passport:</span>
                        <strong className={t.textHeading}>{rental.customerNicPassport}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Pricing Rules Mini-Bar */}
                <div className={`pt-2 border-t ${t.divider} flex flex-wrap items-center justify-between gap-2 text-[11px] ${t.textMuted}`}>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span>Plan:</span>
                    <span>1st 60m: {formatCurrency(rental.rateSnapshot.firstHour, settings.currencySymbol, settings.currencyPosition)}</span>
                    <span>•</span>
                    <span>Every +30m: +{formatCurrency(rental.rateSnapshot.every30Min ?? rental.rateSnapshot.next30Min ?? 0, settings.currencySymbol, settings.currencyPosition)}</span>
                  </div>
                  {rental.depositAmount && rental.depositAmount > 0 && (
                    <span className="text-amber-500 font-bold">
                      Deposit Retained: {formatCurrency(rental.depositAmount, settings.currencySymbol, settings.currencyPosition)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
