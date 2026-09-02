import React, { useState, useEffect } from 'react';
import { 
  X, 
  Receipt, 
  CheckCircle2, 
  Printer, 
  Clock, 
  Calendar,
  DollarSign, 
  CreditCard, 
  Banknote, 
  QrCode, 
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  User,
  Phone,
  IdCard,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppSettings, PricingBreakdown, RentalRecord } from '../types';
import { VehicleIcon } from './VehicleIcon';
import { 
  calculateRentalBreakdown, 
  formatCurrency, 
  formatDate, 
  formatDateTime, 
  formatTime, 
  playSoundEffect 
} from '../utils/pricing';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface StopRentalModalProps {
  rental: RentalRecord;
  settings: AppSettings;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onClose: () => void;
  onConfirmStopAndSettle: (completedRecord: RentalRecord) => void;
}

export const StopRentalModal: React.FC<StopRentalModalProps> = ({
  rental,
  settings,
  themeMode = 'dark',
  accent = 'emerald',
  onClose,
  onConfirmStopAndSettle,
}) => {
  const [stopTimestamp] = useState<number>(Date.now());
  const [breakdown, setBreakdown] = useState<PricingBreakdown>(() =>
    calculateRentalBreakdown(rental.startTime, stopTimestamp, rental.rateSnapshot)
  );
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'qr_transfer'>('cash');
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>('');
  const [damageAmountInput, setDamageAmountInput] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<string>('');

  const t = getThemeClasses(themeMode, accent);

  useEffect(() => {
    // Recalculate based on fixed stopTimestamp
    const res = calculateRentalBreakdown(rental.startTime, stopTimestamp, rental.rateSnapshot);
    setBreakdown(res);
    setAmountReceivedInput(res.totalAmount.toString());
  }, [rental, stopTimestamp]);

  const totalDue = breakdown.totalAmount;
  const amountReceived = parseFloat(amountReceivedInput) || 0;
  const damageAmount = parseFloat(damageAmountInput) || 0;
  const discountAmount = parseFloat(discountInput) || 0;
  const changeDue = Math.max(0, amountReceived - totalDue + discountAmount - damageAmount);

  const handleComplete = () => {
    if (settings.soundEnabled) {
      playSoundEffect('stop');
    }

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    const finalRecord: RentalRecord = {
      ...rental,
      endTime: stopTimestamp,
      status: 'completed',
      breakdown: breakdown,
      totalAmount: totalDue,
      paymentMethod: paymentMethod,
      amountReceived: amountReceived,
      changeAmount: changeDue,
      damageAmount: damageAmount,
      discountAmount: discountAmount,
      completedAt: stopTimestamp,
    };

    onConfirmStopAndSettle(finalRecord);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className={`${t.modalBg} rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col`}>
        
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b ${t.divider} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base sm:text-lg ${t.textHeading}`}>
                Settle & Return Vehicle
              </h3>
              <p className={`text-xs ${t.textMuted}`}>
                #{rental.rentalNumber} • {rental.vehicleSerialNumber} ({rental.vehicleTypeName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textMain} cursor-pointer`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          
          {/* Customer info reminder if present */}
          {(rental.customerName || rental.customerNicPassport || rental.customerPhone) && (
            <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${t.cardSubtleBg}`}>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <span className={`font-bold ${t.textHeading}`}>{rental.customerName || 'Customer'}</span>
                {rental.customerNicPassport && (
                  <span className="font-mono text-emerald-500 font-bold">
                    ({rental.customerNicPassport})
                  </span>
                )}
              </div>
              {rental.customerPhone && (
                <span className={`font-mono text-[11px] ${t.textMuted}`}>
                  📞 {rental.customerPhone}
                </span>
              )}
            </div>
          )}

          {/* Time & Duration Calculation Card */}
          <div className={`p-4 rounded-xl border space-y-2.5 ${t.cardSubtleBg}`}>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-500/20">
              <span className={`flex items-center gap-1.5 ${t.textMuted}`}>
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>Start Time:</span>
              </span>
              <span className={`font-mono font-medium ${t.textMain}`}>{formatTime(rental.startTime)} • {formatDate(rental.startTime)}</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-500/20">
              <span className={`flex items-center gap-1.5 ${t.textMuted}`}>
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>End / Stop Time:</span>
              </span>
              <span className={`font-mono font-medium text-rose-500`}>{formatTime(stopTimestamp)} (Now)</span>
            </div>
            <div className="flex items-center justify-between text-sm pt-1">
              <span className={`font-bold ${t.textHeading}`}>Total Duration:</span>
              <span className="font-mono font-extrabold text-emerald-500 text-base">
                {breakdown.durationFormatted} ({breakdown.totalMinutes} mins)
              </span>
            </div>
          </div>

          {/* Itemized Price Breakdown */}
          <div className={`p-4 rounded-xl border space-y-2 text-xs ${t.cardSubtleBg}`}>
            <div className={`font-semibold uppercase tracking-wider text-[11px] mb-2 ${t.textMuted}`}>
              Rate Calculation Breakdown
            </div>

            {/* First 60 min */}
            <div className="flex justify-between items-center">
              <span className={t.textMuted}>
                First 60 Mins Base Charge:
              </span>
              <span className={`font-mono font-semibold ${t.textMain}`}>
                {formatCurrency(breakdown.firstHourAmount, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>

            {/* Continuing 30 mins */}
            {breakdown.every30MinCount > 0 && (
              <div className="flex justify-between items-center">
                <span className={t.textMuted}>
                  Additional {breakdown.every30MinCount} × 30-min block(s) @ {formatCurrency(breakdown.every30MinRate, settings.currencySymbol, settings.currencyPosition)}:
                </span>
                <span className="font-mono font-semibold text-teal-500">
                  +{formatCurrency(breakdown.every30MinAmount, settings.currencySymbol, settings.currencyPosition)}
                </span>
              </div>
            )}

            {/* Total Grand Bill */}
            <div className={`border-t ${t.divider} pt-2.5 flex justify-between items-center text-sm sm:text-base font-black`}>
              <span className={t.textHeading}>TOTAL AMOUNT DUE:</span>
              <span className="font-mono text-emerald-500 text-lg sm:text-xl">
                {formatCurrency(totalDue, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>
          </div>

          {/* Damages, Discount & Total Payment */}
          <div className={`p-4 rounded-xl border space-y-2 text-xs ${t.cardSubtleBg}`}>
            <div className={`font-semibold uppercase tracking-wider text-[11px] mb-2 ${t.textMuted}`}>
              Payment Adjustments
            </div>
            
            {/* Damage Amount */}
            <div className="flex items-center justify-between">
              <span className={t.textMuted}>Damage Amount:</span>
              <div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={damageAmountInput}
                  onChange={(e) => setDamageAmountInput(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold ${t.textInput}`}
                />
              </div>
            </div>

            {/* Discount Amount */}
            <div className="flex items-center justify-between">
              <span className={t.textMuted}>Discount:</span>
              <div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold ${t.textInput}`}
                />
              </div>
            </div>

            {/* Final Total Calculation */}
            <div className={`border-t ${t.divider} pt-2.5 flex justify-between items-center text-sm sm:text-base font-black text-emerald-600`}>
              <span>Final Total:</span>
              <span>
                {formatCurrency(totalDue - discountAmount + damageAmount, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector with BORDERED Inactive States */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${t.textHeading}`}>
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'cash' ? t.activeTab : t.inactiveTab
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'card' ? t.activeTab : t.inactiveTab
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card / POS</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('qr_transfer')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  paymentMethod === 'qr_transfer' ? t.activeTab : t.inactiveTab
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QR / Transfer</span>
              </button>
            </div>
          </div>

          {/* Cash Received and Change Calculator */}
          {paymentMethod === 'cash' && (
            <div className={`p-4 rounded-xl border space-y-3 ${t.cardSubtleBg}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Cash Received (Key-in)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountReceivedInput}
                    onChange={(e) => setAmountReceivedInput(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Change Due to Customer
                  </label>
                  <div className="w-full bg-slate-950/40 border border-slate-700/60 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-400">
                    {formatCurrency(changeDue, settings.currencySymbol, settings.currencyPosition)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className={`p-4 sm:p-5 border-t ${t.divider} flex items-center justify-end gap-3 shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer ${t.inactiveTab}`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleComplete}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg cursor-pointer ${t.primaryBtn}`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Payment & Print Receipt</span>
          </button>
        </div>

      </div>
    </div>
  );
};
