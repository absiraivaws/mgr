import React, { useState } from 'react';
import {
  X,
  Receipt,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Phone,
  IdCard,
  AlertCircle,
  Banknote,
  ShieldCheck,
  Tag,
  Coins,
  Wallet,
  Gauge,
  Plus,
} from 'lucide-react';
import { AppSettings, PricingBreakdown, RentalRecord, Vehicle } from '../types';
import { formatCurrency } from '../utils/pricing';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { isMotorbikeVehicle } from '../utils/bicyclePosUtils';

interface HistoricalRentalModalProps {
  isOpen: boolean;
  rental?: RentalRecord | null; // If provided, Edit mode; if null/undefined, Add mode
  vehicles: Vehicle[];
  settings: AppSettings;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onClose: () => void;
  onSave: (rental: RentalRecord) => void;
}

function toDateTimeLocalString(timestamp?: number): string {
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

export const HistoricalRentalModal: React.FC<HistoricalRentalModalProps> = ({
  isOpen,
  rental,
  vehicles,
  settings,
  themeMode = 'light',
  accent = 'emerald',
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const t = getThemeClasses(themeMode, accent);
  const isDark = themeMode !== 'light';
  const isEditMode = Boolean(rental);

  // Form States
  const [rentalNumber, setRentalNumber] = useState(
    rental?.rentalNumber || `${settings.rentalNumberPrefix || 'REN'}-${String(Date.now()).slice(-7)}`
  );
  const [vehicleSerial, setVehicleSerial] = useState(rental?.vehicleSerialNumber || (vehicles[0]?.serialNumber || '01-001'));
  const [customerName, setCustomerName] = useState(rental?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(rental?.customerPhone || '');
  const [customerNic, setCustomerNic] = useState(rental?.customerNicPassport || '');
  const [customerWhatsapp, setCustomerWhatsapp] = useState(rental?.customerWhatsapp || rental?.customerPhone || '');
  const [cashierName, setCashierName] = useState(rental?.cashierName || settings.cashierName || 'Staff');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'qr_transfer' | 'other'>(
    (rental?.paymentMethod as any) || 'cash'
  );

  const [startInput, setStartInput] = useState(() => toDateTimeLocalString(rental?.startTime || Date.now() - 3600000));
  const [endInput, setEndInput] = useState(() => toDateTimeLocalString(rental?.endTime || rental?.completedAt || Date.now()));

  // Financial Breakdown Values
  const [rentalValueInput, setRentalValueInput] = useState(String(rental?.rentalAmount ?? rental?.totalAmount ?? 300));
  const [damageInput, setDamageInput] = useState(String(rental?.damageAmount ?? 0));
  const [advanceInput, setAdvanceInput] = useState(String(rental?.depositAmount ?? 0));
  const [discountInput, setDiscountInput] = useState(String(rental?.discountAmount ?? 0));

  // KM Readings (for Motorbikes)
  const [startKmInput, setStartKmInput] = useState(String(rental?.startKm ?? ''));
  const [endKmInput, setEndKmInput] = useState(String(rental?.endKm ?? ''));
  const [customerNotes, setCustomerNotes] = useState(rental?.customerNotes || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived Financial Calculations
  const rentalVal = Math.max(0, parseFloat(rentalValueInput) || 0);
  const damageVal = Math.max(0, parseFloat(damageInput) || 0);
  const grossVal = rentalVal + damageVal;
  const advanceVal = Math.max(0, parseFloat(advanceInput) || 0);
  const discountVal = Math.max(0, parseFloat(discountInput) || 0);
  const netDue = Math.max(0, grossVal - discountVal);
  const balanceToCollect = Math.max(0, netDue - advanceVal);
  const refundDue = advanceVal > netDue ? advanceVal - netDue : 0;
  const totalRevenue = advanceVal > netDue ? netDue : advanceVal + balanceToCollect;

  // Selected vehicle lookup
  const matchedVehicle = vehicles.find(
    (v) => v.serialNumber.trim().toUpperCase() === vehicleSerial.trim().toUpperCase()
  );
  const isMotorbike = isMotorbikeVehicle({
    name: matchedVehicle?.modelName || rental?.vehicleTypeName || '',
    icon: rental?.vehicleIcon || 'motorcycle',
  });

  const startKmNum = parseFloat(startKmInput) || undefined;
  const endKmNum = parseFloat(endKmInput) || undefined;
  const distanceKm = endKmNum !== undefined && startKmNum !== undefined && endKmNum >= startKmNum
    ? endKmNum - startKmNum
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const startTs = new Date(startInput).getTime();
    const endTs = new Date(endInput).getTime();

    if (isNaN(startTs) || isNaN(endTs)) {
      setErrorMessage('Please provide valid start and end dates and times.');
      return;
    }
    if (endTs < startTs) {
      setErrorMessage('Return / End time cannot be earlier than Start time.');
      return;
    }

    if (!rentalNumber.trim()) {
      setErrorMessage('Please enter a rental receipt number.');
      return;
    }

    const durationMin = Math.max(1, Math.round((endTs - startTs) / (1000 * 60)));
    const durationFormatted = durationMin < 60 ? `${durationMin} mins` : `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`;

    const breakdown: PricingBreakdown = {
      ...(rental?.breakdown || {}),
      subtotal: grossVal,
      totalAmount: totalRevenue,
      totalMinutes: durationMin,
      durationFormatted,
      startKm: startKmNum,
      endKm: endKmNum,
      distanceKm,
      rentalAmount: rentalVal,
      damageAmount: damageVal,
      grossRentalAmount: grossVal,
      discountAmount: discountVal,
      balanceAmount: balanceToCollect,
      appliedAdvanceBalance: 0,
      refundAmount: refundDue,
      creditedAdvanceBalance: 0,
    };

    const finalRecord: RentalRecord = {
      id: rental?.id || `rental-${Date.now()}`,
      rentalNumber: rentalNumber.trim(),
      vehicleId: matchedVehicle?.id || rental?.vehicleId || `veh-${vehicleSerial.trim().toLowerCase()}`,
      vehicleSerialNumber: vehicleSerial.trim().toUpperCase(),
      vehicleTypeId: matchedVehicle?.typeId || rental?.vehicleTypeId || 'type-general',
      vehicleTypeName: rental?.vehicleTypeName || matchedVehicle?.modelName || 'Fleet Vehicle',
      vehicleIcon: rental?.vehicleIcon || (isMotorbike ? 'motorcycle' : 'bicycle'),
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim(),
      customerNicPassport: customerNic.trim().toUpperCase(),
      customerWhatsapp: customerWhatsapp.trim() || customerPhone.trim(),
      customerNotes: customerNotes.trim() || undefined,
      depositAmount: advanceVal,
      rentalAmount: rentalVal,
      damageAmount: damageVal,
      grossRentalAmount: grossVal,
      discountAmount: discountVal,
      balanceAmount: balanceToCollect,
      refundAmount: refundDue,
      totalAmount: totalRevenue, // Only final Total Rental Revenue Received is recorded for Finance Income
      paymentMethod,
      amountReceived: balanceToCollect,
      changeAmount: 0,
      startTime: startTs,
      endTime: endTs,
      completedAt: endTs,
      status: 'completed',
      cashierName: cashierName.trim(),
      startKm: startKmNum,
      endKm: endKmNum,
      distanceKm,
      breakdown,
      rateSnapshot: rental?.rateSnapshot || {
        firstHour: rentalVal,
        next30Min: 0,
        every30Min: 0,
        continuingHour: rentalVal,
      },
    };

    onSave(finalRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className={`w-full max-w-2xl ${t.cardBg} rounded-2xl border shadow-2xl p-5 sm:p-6 space-y-4 my-auto max-h-[95vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3.5 ${t.divider}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base sm:text-lg ${t.textHeading}`}>
                {isEditMode ? `Edit Completed Rental #${rentalNumber}` : 'Record Historical Completed Rental'}
              </h3>
              <p className={`text-xs ${t.textMuted}`}>
                Admin module: Directly update or create settled rental records and synchronize financial revenue
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Basic Rental Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>
                Rental Receipt #
              </label>
              <input
                type="text"
                value={rentalNumber}
                onChange={(e) => setRentalNumber(e.target.value)}
                required
                className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold ${t.textInput}`}
                placeholder="e.g. REN-0000170"
              />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>
                Vehicle Serial
              </label>
              <select
                value={vehicleSerial}
                onChange={(e) => setVehicleSerial(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold ${t.dropdownInput} cursor-pointer`}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.serialNumber}>
                    {v.serialNumber} - {v.modelName || 'Fleet Unit'} ({v.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>
                Cashier / Staff
              </label>
              <input
                type="text"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs ${t.textInput}`}
                placeholder="Cashier name"
              />
            </div>
          </div>

          {/* 2. Customer Profile Details */}
          <div className={`p-3.5 rounded-xl border ${t.cardSubtleBg} space-y-2.5`}>
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Customer Information</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div>
                <label className={`block text-[10px] font-semibold mb-1 ${t.textMuted}`}>Full Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${t.textInput}`}
                  placeholder="Customer Name"
                  required
                />
              </div>
              <div>
                <label className={`block text-[10px] font-semibold mb-1 ${t.textMuted}`}>NIC / Passport</label>
                <input
                  type="text"
                  value={customerNic}
                  onChange={(e) => setCustomerNic(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono ${t.textInput}`}
                  placeholder="NIC / Passport"
                  required
                />
              </div>
              <div>
                <label className={`block text-[10px] font-semibold mb-1 ${t.textMuted}`}>Mobile Phone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (!customerWhatsapp || customerWhatsapp === customerPhone) {
                      setCustomerWhatsapp(e.target.value);
                    }
                  }}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono ${t.textInput}`}
                  placeholder="Mobile"
                />
              </div>
              <div>
                <label className={`block text-[10px] font-semibold mb-1 ${t.textMuted}`}>WhatsApp</label>
                <input
                  type="text"
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono ${t.textInput}`}
                  placeholder="WhatsApp Number"
                />
              </div>
            </div>
          </div>

          {/* 3. Date & Time Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                required
                className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput} cursor-pointer`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>
                Return / Stop Time
              </label>
              <input
                type="datetime-local"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                required
                className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput} cursor-pointer`}
              />
            </div>
          </div>

          {/* 4. Financial Structure (Exact 7-part Breakdown) */}
          <div className={`p-4 rounded-xl border ${t.cardSubtleBg} space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Banknote className="w-4 h-4" />
                <span>Financial Settlement Breakdown</span>
              </span>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${t.badge}`}>
                Final Revenue: {formatCurrency(totalRevenue, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 ${t.textMuted}`}>
                  1. Rental Value (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rentalValueInput}
                  onChange={(e) => setRentalValueInput(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold ${t.textInput}`}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 text-amber-500`}>
                  2. + Damage (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={damageInput}
                  onChange={(e) => setDamageInput(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-500 ${t.textInput}`}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 text-purple-500`}>
                  3. Gross Rental (Rs.)
                </label>
                <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-black text-purple-500 ${t.cardBg}`}>
                  {formatCurrency(grossVal, settings.currencySymbol, settings.currencyPosition)}
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 text-sky-500`}>
                  4. - Advance Paid (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={advanceInput}
                  onChange={(e) => setAdvanceInput(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-sky-500 ${t.textInput}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 text-teal-500`}>
                  5. - Discount (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-teal-500 ${t.textInput}`}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 text-blue-500`}>
                  6. Balance Collected (Rs.)
                </label>
                <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold text-blue-500 ${t.cardBg}`}>
                  {formatCurrency(balanceToCollect, settings.currencySymbol, settings.currencyPosition)}
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 text-emerald-500`}>
                  7. Total Revenue Posted
                </label>
                <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-black text-emerald-500 ${t.cardBg}`}>
                  {formatCurrency(totalRevenue, settings.currencySymbol, settings.currencyPosition)}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Payment Method & Motorbike KM */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className={`w-full rounded-xl px-3 py-2 text-xs font-bold ${t.dropdownInput} cursor-pointer`}
              >
                <option value="cash">Cash Settlement</option>
                <option value="card">Card / Electronic POS</option>
                <option value="qr_transfer">LankaQR Transfer</option>
                <option value="other">Other Method</option>
              </select>
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>
                Start KM (Odometer)
              </label>
              <input
                type="number"
                value={startKmInput}
                onChange={(e) => setStartKmInput(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                placeholder="e.g. 12500"
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>
                End KM (Return)
              </label>
              <input
                type="number"
                value={endKmInput}
                onChange={(e) => setEndKmInput(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                placeholder="e.g. 12540"
              />
            </div>
          </div>

          <div>
            <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>
              Remarks / Inspection Notes
            </label>
            <input
              type="text"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className={`w-full rounded-xl px-3 py-2 text-xs ${t.textInput}`}
              placeholder="e.g. Returned in good condition, helmet returned"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-700/20">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold ${t.inactiveTab} cursor-pointer`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${t.primaryBtn}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditMode ? 'Update Rental Record' : 'Save Completed Rental'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
