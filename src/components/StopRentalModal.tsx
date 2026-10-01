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
  Sparkles,
  AlertCircle,
  Edit3,
  Check,
  Gauge,
  Wallet,
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
import { cleanWhatsAppPhoneNumber } from '../utils/customer';
import { isMotorbikeVehicle, dispatchRentalNotification } from '../utils/bicyclePosUtils';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { LankaQrPaymentModal } from './LankaQrPaymentModal';

interface StopRentalModalProps {
  rental: RentalRecord;
  settings: AppSettings;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onClose: () => void;
  onConfirmStopAndSettle: (completedRecord: RentalRecord) => void;
}

// Helper to format a timestamp into local YYYY-MM-DDTHH:mm for datetime-local inputs
function toDateTimeLocalString(timestamp: number): string {
  const validTs = typeof timestamp === 'number' && !isNaN(timestamp) && timestamp > 0 ? timestamp : Date.now();
  const d = new Date(validTs);
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

function parseDateTimeLocal(str: string): number {
  const t = new Date(str).getTime();
  return isNaN(t) ? Date.now() : t;
}

export const StopRentalModal: React.FC<StopRentalModalProps> = ({
  rental,
  settings,
  themeMode = 'dark',
  accent = 'emerald',
  onClose,
  onConfirmStopAndSettle,
}) => {
  const safeStartTime = typeof rental?.startTime === 'number' && !isNaN(rental.startTime) && rental.startTime > 0
    ? rental.startTime
    : Date.now();
  // Effective start and stop timestamps (saved to record)
  const [effectiveStartTime, setEffectiveStartTime] = useState<number>(safeStartTime);
  const [effectiveStopTime, setEffectiveStopTime] = useState<number>(Date.now());

  // Custom time adjustment state
  const [isCustomTimeOpen, setIsCustomTimeOpen] = useState<boolean>(false);
  const [customStartInput, setCustomStartInput] = useState<string>(() => toDateTimeLocalString(safeStartTime));
  const [customStopInput, setCustomStopInput] = useState<string>(() => toDateTimeLocalString(Date.now()));
  const [timeError, setTimeError] = useState<string | null>(null);
  const [timeSuccessMsg, setTimeSuccessMsg] = useState<string | null>(null);

  const [breakdown, setBreakdown] = useState<PricingBreakdown>(() =>
    calculateRentalBreakdown(safeStartTime, Date.now(), rental?.rateSnapshot)
  );
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'qr_transfer'>('cash');
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>('');
  const [damageAmountInput, setDamageAmountInput] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<string>('');
  const [retainRefundAsAdvance, setRetainRefundAsAdvance] = useState<boolean>(false);
  const [sendThankYouWhatsApp, setSendThankYouWhatsApp] = useState<boolean>(rental.sendEndWhatsApp ?? true);
  const [showQrPayment, setShowQrPayment] = useState<boolean>(false);

  // Motorbike KM tracking state
  const isMotorbike = isMotorbikeVehicle({ name: rental.vehicleTypeName, icon: rental.vehicleIcon });
  const startKmVal = rental.startKm ?? rental.breakdown?.startKm;
  const [endKm, setEndKm] = useState<string>(() => (rental.endKm !== undefined ? String(rental.endKm) : ''));

  const t = getThemeClasses(themeMode, accent);

  // Initialize breakdown on mount
  useEffect(() => {
    const res = calculateRentalBreakdown(effectiveStartTime, effectiveStopTime, rental.rateSnapshot);
    setBreakdown(res);
    const adv = rental.depositAmount || 0;
    const initialGross = res.totalAmount;
    const initialBal = Math.max(0, initialGross - adv);
    setAmountReceivedInput(initialBal.toString());
  }, []);

  // Time Validation & Save Handler
  const handleSaveCustomTime = () => {
    setTimeError(null);
    setTimeSuccessMsg(null);

    const parsedStart = parseDateTimeLocal(customStartInput);
    const parsedStop = parseDateTimeLocal(customStopInput);

    if (isNaN(parsedStart) || isNaN(parsedStop)) {
      setTimeError('Please provide valid start and end dates and times.');
      return;
    }

    if (parsedStop <= parsedStart) {
      setTimeError('Invalid time range: End / Return time must be after Start time.');
      return;
    }

    const durationMin = Math.ceil((parsedStop - parsedStart) / (1000 * 60));
    if (durationMin < 1) {
      setTimeError('Invalid time range: Duration must be at least 1 minute.');
      return;
    }

    // Apply effective timestamps
    setEffectiveStartTime(parsedStart);
    setEffectiveStopTime(parsedStop);

    // Recalculate breakdown with new validated custom time range
    const newBreakdown = calculateRentalBreakdown(parsedStart, parsedStop, rental.rateSnapshot);
    setBreakdown(newBreakdown);

    // Update amount received to match new balance to collect
    const dmg = parseFloat(damageAmountInput) || 0;
    const disc = parseFloat(discountInput) || 0;
    const adv = rental.depositAmount || 0;
    const newGross = newBreakdown.totalAmount + dmg;
    const newNet = Math.max(0, newGross - disc);
    const newBal = Math.max(0, newNet - adv);
    setAmountReceivedInput(newBal.toString());

    setTimeSuccessMsg(`✓ Time saved! Duration: ${newBreakdown.durationFormatted} (${durationMin} mins). Total bill recalculated.`);
    setTimeout(() => setTimeSuccessMsg(null), 4000);
  };

  const handleResetToLiveTime = () => {
    const liveStop = Date.now();
    const liveStart = rental.startTime;
    setCustomStartInput(toDateTimeLocalString(liveStart));
    setCustomStopInput(toDateTimeLocalString(liveStop));
    setEffectiveStartTime(liveStart);
    setEffectiveStopTime(liveStop);
    setTimeError(null);
    const res = calculateRentalBreakdown(liveStart, liveStop, rental.rateSnapshot);
    setBreakdown(res);
    const dmg = parseFloat(damageAmountInput) || 0;
    const disc = parseFloat(discountInput) || 0;
    const adv = rental.depositAmount || 0;
    const gross = res.totalAmount + dmg;
    const net = Math.max(0, gross - disc);
    const bal = Math.max(0, net - adv);
    setAmountReceivedInput(bal.toString());
    setTimeSuccessMsg('Reset to original start time and current live stop time.');
    setTimeout(() => setTimeSuccessMsg(null), 3000);
  };

  // Finance Structure:
  // - Rental Value: Base time/trip charge
  // - Damage Charge: Penalties & repairs
  // - Gross Rental Amount: Rental Value + Damage Charge
  // - Advance Paid: Upfront deposit paid at start
  // - Discount: Deductions/waivers
  // - Balance to Collect: Gross Rental Amount - Advance Paid - Discount
  // - Total Rental Revenue Received: Advance Paid + Balance Collected = (Gross - Discount)
  const rentalValue = breakdown.totalAmount;
  const damageAmount = parseFloat(damageAmountInput) || 0;
  const grossRentalAmount = rentalValue + damageAmount;
  const advancePaid = rental.depositAmount || 0;
  const discountAmount = parseFloat(discountInput) || 0;
  const netBill = Math.max(0, grossRentalAmount - discountAmount);

  const balanceToCollect = Math.max(0, netBill - advancePaid);
  const refundDue = advancePaid > netBill ? (advancePaid - netBill) : 0;
  const totalRevenueReceived = advancePaid > netBill ? netBill : (advancePaid + balanceToCollect);
  const finalTotalAmount = balanceToCollect;

  const amountReceived = parseFloat(amountReceivedInput) || 0;
  const changeDue = Math.max(0, amountReceived - balanceToCollect);

  // Auto-update amountReceivedInput when damage/discount changes if user hasn't typed custom cash
  const handleDamageChange = (val: string) => {
    setDamageAmountInput(val);
    const dmg = parseFloat(val) || 0;
    const disc = parseFloat(discountInput) || 0;
    const gross = rentalValue + dmg;
    const net = Math.max(0, gross - disc);
    const bal = Math.max(0, net - advancePaid);
    setAmountReceivedInput(bal.toString());
  };

  const handleDiscountChange = (val: string) => {
    setDiscountInput(val);
    const disc = parseFloat(val) || 0;
    const dmg = parseFloat(damageAmountInput) || 0;
    const gross = rentalValue + dmg;
    const net = Math.max(0, gross - disc);
    const bal = Math.max(0, net - advancePaid);
    setAmountReceivedInput(bal.toString());
  };

  const handleComplete = (overrides?: {
    paymentMethod?: 'cash' | 'card' | 'qr_transfer';
    amountReceived?: number;
    paymentRef?: string;
  }) => {
    const settledMethod = overrides?.paymentMethod ?? paymentMethod;
    const settledAmountReceived = overrides?.amountReceived ?? amountReceived;
    const settledChangeDue = Math.max(0, settledAmountReceived - balanceToCollect);
    const settledPaymentRef = overrides?.paymentRef ?? rental.paymentRef;

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

    const numericEndKm = endKm ? parseFloat(endKm) : undefined;
    const distanceTraveled = (numericEndKm !== undefined && startKmVal !== undefined && numericEndKm >= startKmVal)
      ? numericEndKm - startKmVal
      : undefined;

    const updatedBreakdown: PricingBreakdown = {
      ...breakdown,
      startKm: startKmVal,
      endKm: numericEndKm,
      distanceKm: distanceTraveled,
    };

    const finalRecord: RentalRecord = {
      ...rental,
      startTime: effectiveStartTime,
      endTime: effectiveStopTime,
      status: 'completed',
      breakdown: updatedBreakdown,
      rentalAmount: rentalValue,
      damageAmount: damageAmount,
      grossRentalAmount: grossRentalAmount,
      depositAmount: advancePaid,
      discountAmount: discountAmount,
      balanceAmount: balanceToCollect,
      refundAmount: refundDue,
      refundRetainedAsAdvance: retainRefundAsAdvance,
      creditedAdvanceBalance: retainRefundAsAdvance ? refundDue : 0,
      totalAmount: totalRevenueReceived, // Only final Total Rental Revenue Received is recorded for Finance Income
      paymentMethod: settledMethod,
      amountReceived: settledAmountReceived,
      changeAmount: settledChangeDue,
      paymentRef: settledPaymentRef,
      completedAt: effectiveStopTime,
      startKm: startKmVal,
      endKm: numericEndKm,
    };

    // Automated Return Notification (Customer + Additional WhatsApp Contacts + Group):
    if (sendThankYouWhatsApp) {
      dispatchRentalNotification({
        type: 'end',
        rental: finalRecord,
        settings,
      }).catch((err) => {
        console.error('Failed to trigger return rental notification:', err);
      });
    }

    onConfirmStopAndSettle(finalRecord);
    onClose();
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

          {/* Cashier Info */}
          {rental.cashierName && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${t.cardSubtleBg} border ${t.divider}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
              <span className={t.textMuted}>Cashier:</span>
              <span className={`font-semibold ${t.textHeading}`}>{rental.cashierName}</span>
            </div>
          )}

          {/* Time & Duration Calculation Card with Custom Time Option */}
          <div className={`p-4 rounded-xl border space-y-3 ${t.cardSubtleBg}`}>
            <div className="flex items-center justify-between">
              <span className={`font-bold text-xs uppercase tracking-wider ${t.textHeading}`}>
                Rental Timing & Duration
              </span>
              <button
                type="button"
                onClick={() => setIsCustomTimeOpen(!isCustomTimeOpen)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
                title="Adjust start and end times manually"
              >
                <Edit3 className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                <span>{isCustomTimeOpen ? 'Close Time Editor' : 'Custom Time / Adjust'}</span>
              </button>
            </div>

            {/* Default Display of Times */}
            <div className="space-y-2">
              <div className={`flex items-center justify-between text-xs pb-1.5 border-b ${t.divider}`}>
                <span className={`flex items-center gap-1.5 ${t.textMuted}`}>
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Start Time:</span>
                </span>
                <span className={`font-mono font-medium ${t.textMain}`}>
                  {formatTime(effectiveStartTime)} • {formatDate(effectiveStartTime)}
                </span>
              </div>
              <div className={`flex items-center justify-between text-xs pb-1.5 border-b ${t.divider}`}>
                <span className={`flex items-center gap-1.5 ${t.textMuted}`}>
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Stop / Return Time:</span>
                </span>
                <span className={`font-mono font-medium text-rose-500 dark:text-rose-400`}>
                  {formatTime(effectiveStopTime)} • {formatDate(effectiveStopTime)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-1">
                <span className={`font-bold ${t.textHeading}`}>Calculated Duration:</span>
                <span className="font-mono font-extrabold text-emerald-500 text-base">
                  {breakdown.durationFormatted} ({breakdown.totalMinutes} mins)
                </span>
              </div>
            </div>

            {/* Motorbike Odometer & KM Tracking (Requirement 2) */}
            {isMotorbike && (
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2.5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Motorbike KM Tracking (Odometer)</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    Motorbike Return
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700/50">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Start KM</span>
                    <span className="font-mono text-sm font-bold text-slate-200">
                      {startKmVal !== undefined ? `${startKmVal} km` : 'Not recorded'}
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-amber-300 block uppercase font-bold mb-1">
                      End KM (Return) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="input-end-km"
                        type="number"
                        step="any"
                        min={startKmVal || 0}
                        placeholder="e.g. 12510"
                        value={endKm}
                        onChange={(e) => setEndKm(e.target.value)}
                        className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold border ${t.inputBg} focus:border-amber-400`}
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-[11px] font-bold text-amber-400">
                        KM
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Distance Calculation */}
                {endKm && startKmVal !== undefined && (
                  <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold">
                    <span>Distance Traveled:</span>
                    <span className="font-mono text-sm">
                      {parseFloat(endKm) >= startKmVal
                        ? `${(parseFloat(endKm) - startKmVal).toFixed(1)} km`
                        : 'End KM cannot be less than Start KM'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Custom Time Modification Panel */}
            {isCustomTimeOpen && (
              <div className={`p-3.5 rounded-xl border border-indigo-500/30 ${t.cardBg} space-y-3 mt-2 shadow-sm`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    <span>Adjust Start & Return Times</span>
                  </span>
                  <span className={`text-[10px] ${t.textMuted}`}>
                    Duration updates automatically
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold ${t.textHeading} mb-1`}>
                      Start Date & Time:
                    </label>
                    <input
                      type="datetime-local"
                      value={customStartInput}
                      onChange={(e) => {
                        setCustomStartInput(e.target.value);
                        setTimeError(null);
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold ${t.textHeading} mb-1`}>
                      End / Return Date & Time:
                    </label>
                    <input
                      type="datetime-local"
                      value={customStopInput}
                      onChange={(e) => {
                        setCustomStopInput(e.target.value);
                        setTimeError(null);
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                    />
                  </div>
                </div>

                {/* Validation Error Message */}
                {timeError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-600 dark:text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{timeError}</span>
                  </div>
                )}

                {/* Success Feedback Message */}
                {timeSuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-emerald-600 dark:text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>{timeSuccessMsg}</span>
                  </div>
                )}

                {/* Action Buttons: Save & Recalculate vs Reset */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleResetToLiveTime}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${t.cardSubtleBg} ${t.textHeading} ${t.border} hover:border-slate-400 flex items-center gap-1 cursor-pointer transition shadow-xs`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Live Time</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveCustomTime}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Recalculate Time</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Settle & Return Specified Settlement Format Box */}
          <div className={`p-4 rounded-xl border space-y-2.5 ${t.cardSubtleBg} border-emerald-500/30`}>
            <div className={`font-bold uppercase tracking-wider text-[11px] pb-2 border-b ${t.divider} flex items-center justify-between`}>
              <span className={t.textHeading}>Settlement Calculation</span>
              <span className="text-[10px] text-emerald-500 font-mono">
                Duration: {breakdown.durationFormatted}
              </span>
            </div>

            {/* 1. Rental Value */}
            <div className="flex justify-between items-center text-xs">
              <span className={`font-semibold ${t.textHeading}`}>Rental Value:</span>
              <span className={`font-mono font-bold text-sm ${t.textMain}`}>
                {formatCurrency(rentalValue, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>

            {/* 2. + Damage Charge */}
            <div className="flex justify-between items-center text-xs gap-3">
              <label className="font-semibold text-amber-500 flex items-center gap-1">
                <span>+ Damage Charge:</span>
              </label>
              <div className="w-36">
                <input
                  id="input-damage-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={damageAmountInput}
                  onChange={(e) => handleDamageChange(e.target.value)}
                  className={`w-full rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-right text-amber-500 ${t.textInput}`}
                />
              </div>
            </div>

            {/* 3. = Gross Rental Amount */}
            <div className="flex justify-between items-center text-xs pt-1.5 pb-1 border-t border-dashed border-slate-300 dark:border-slate-700">
              <span className={`font-bold ${t.textHeading}`}>Gross Rental Amount:</span>
              <span className={`font-mono font-extrabold text-sm ${t.textHeading}`}>
                {formatCurrency(grossRentalAmount, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>

            {/* 4. - Less Advance Paid */}
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-sky-600 dark:text-sky-400">Less Advance Paid:</span>
              <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
                {advancePaid > 0 ? `-${formatCurrency(advancePaid, settings.currencySymbol, settings.currencyPosition)}` : formatCurrency(0, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>

            {/* 5. - Less Discount */}
            <div className="flex justify-between items-center text-xs gap-3">
              <label className="font-semibold text-teal-400 flex items-center gap-1">
                <span>- Less Discount:</span>
              </label>
              <div className="w-36">
                <input
                  id="input-discount-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={discountInput}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  className={`w-full rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-right text-teal-400 ${t.textInput}`}
                />
              </div>
            </div>

            {/* 6. Balance to Collect / Refund */}
            <div className={`border-t ${t.divider} pt-2`}>
              {refundDue > 0 ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-xs text-rose-500 block">Refund Due to Customer:</span>
                      <span className="text-[10px] text-slate-400">Advance deposit exceeds net bill</span>
                    </div>
                    <span className="font-mono text-rose-500 text-lg font-black">
                      {formatCurrency(refundDue, settings.currencySymbol, settings.currencyPosition)}
                    </span>
                  </div>

                  {/* Destination of Refund: Return Cash vs. Keep as Advance Balance */}
                  <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Select Refund Payout Option:</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRetainRefundAsAdvance(false)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                          !retainRefundAsAdvance
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-xs'
                            : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-700/30'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Cash Refund</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRetainRefundAsAdvance(true)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                          retainRefundAsAdvance
                            ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm ring-2 ring-emerald-500/30'
                            : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:bg-slate-700/30'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Keep as Advance</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight">
                      {retainRefundAsAdvance
                        ? `✓ ${formatCurrency(refundDue, settings.currencySymbol, settings.currencyPosition)} will be stored in ${rental.customerName || 'customer'}'s account and automatically deducted on their next rental.`
                        : `Pay ${formatCurrency(refundDue, settings.currencySymbol, settings.currencyPosition)} cash to the customer now.`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className={`font-bold text-sm ${t.textHeading}`}>Balance to Collect:</span>
                  <span className="font-mono text-amber-500 text-xl font-black">
                    {formatCurrency(balanceToCollect, settings.currencySymbol, settings.currencyPosition)}
                  </span>
                </div>
              )}
            </div>

            {/* 7. Total Rental Revenue Received Banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 flex justify-between items-center mt-1">
              <div>
                <span className="block font-black text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                  Total Rental Revenue Received
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  Advance ({formatCurrency(advancePaid, settings.currencySymbol, settings.currencyPosition)}) + Balance ({formatCurrency(balanceToCollect, settings.currencySymbol, settings.currencyPosition)})
                </span>
              </div>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 text-lg sm:text-xl font-black">
                {formatCurrency(totalRevenueReceived, settings.currencySymbol, settings.currencyPosition)}
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
            {paymentMethod === 'qr_transfer' && (
              <p className={`text-[11px] mt-2 ${t.textMuted}`}>
                A LankaQR code will be generated on confirm. Payment is verified automatically; switch to Cash/Card if the customer prefers.
              </p>
            )}
          </div>

          {/* Cash Received and Change Calculator */}
          {paymentMethod === 'cash' && (
            <div className={`p-4 rounded-xl border space-y-3 ${t.cardSubtleBg}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Cash Received for Balance (Key-in)
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
                    {refundDue > 0 ? 'Refund to Customer' : 'Change Due to Customer'}
                  </label>
                  <div className={`w-full border rounded-xl px-3 py-2 text-sm font-mono font-bold ${
                    refundDue > 0 
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' 
                      : 'bg-slate-950/40 border-slate-700/60 text-emerald-400'
                  }`}>
                    {formatCurrency(refundDue > 0 ? refundDue : changeDue, settings.currencySymbol, settings.currencyPosition)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Return Thank-you Dispatch Checkbox */}
          <div className="pt-2 px-1">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendThankYouWhatsApp}
                onChange={(e) => setSendThankYouWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Send WhatsApp Return Receipt & Thank You message to customer</span>
              </span>
            </label>
            {!rental.customerPhone && (
              <p className="text-[10px] text-slate-400 italic mt-0.5 ml-6">
                * Customer has no phone number recorded on file.
              </p>
            )}
          </div>
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
            onClick={() => {
              if (paymentMethod === 'qr_transfer' && balanceToCollect > 0) {
                setShowQrPayment(true);
              } else {
                handleComplete();
              }
            }}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg cursor-pointer ${t.primaryBtn}`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {paymentMethod === 'qr_transfer' && balanceToCollect > 0
                ? 'Generate LankaQR & Settle'
                : 'Confirm Payment & Print Receipt'}
            </span>
          </button>
        </div>

        <LankaQrPaymentModal
          isOpen={showQrPayment}
          amount={balanceToCollect}
          purpose="rental_final"
          recordId={rental.id}
          description={`Rental ${rental.rentalNumber} settlement (${rental.vehicleSerialNumber})`}
          createdBy={rental.cashierName}
          themeMode={themeMode}
          accent={accent}
          onSuccess={(reference) => {
            setShowQrPayment(false);
            handleComplete({
              paymentMethod: 'qr_transfer',
              amountReceived: balanceToCollect,
              paymentRef: reference,
            });
          }}
          onClose={() => setShowQrPayment(false)}
        />

      </div>
    </div>
  );
};
