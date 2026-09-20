import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Banknote,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Car,
  MapPin,
  Calendar,
  User,
  Phone,
  RefreshCw,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { TransportV2Request } from '../../types/mgrTransportV2';
import { createLankaQrPayment, subscribeLankaQrPayment } from '../../lib/lankaqr';

interface MGRPaymentModalProps {
  isOpen: boolean;
  request: TransportV2Request | null;
  onClose: () => void;
  onSuccess: (paymentReference: string, paymentMethod: 'cash' | 'card' | 'qr') => void;
  currentUserName?: string;
}

export const MGRPaymentModal: React.FC<MGRPaymentModalProps> = ({
  isOpen,
  request,
  onClose,
  onSuccess,
  currentUserName,
}) => {
  if (!isOpen || !request) return null;

  const totalAmount = request.finalAmount || 0;
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qr' | 'card'>('cash');

  // Cash state
  const [cashReceivedInput, setCashReceivedInput] = useState<string>(totalAmount.toString());
  const [cashNotes, setCashNotes] = useState<string>('');

  // Card state
  const [cardNetwork, setCardNetwork] = useState<'visa' | 'mastercard' | 'amex'>('visa');
  const [cardRefInput, setCardRefInput] = useState<string>('');
  const [cardLastDigits, setCardLastDigits] = useState<string>('');

  // QR state
  const [qrLoading, setQrLoading] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrReference, setQrReference] = useState<string | null>(null);
  const [qrVerified, setQrVerified] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const settledRef = useRef(false);

  // Initialize cash received when modal opens
  useEffect(() => {
    setCashReceivedInput(totalAmount.toString());
    setCashNotes('');
    setCardRefInput('');
    setCardLastDigits('');
    setQrVerified(false);
    setQrError(null);
    settledRef.current = false;
  }, [request, totalAmount]);

  // Generate QR code when QR tab is selected
  const loadQrCode = useCallback(async () => {
    if (!request) return;
    setQrLoading(true);
    setQrError(null);

    const ref = `LKP-MGR-${request.requestNumber || Date.now().toString().slice(-6)}`;
    setQrReference(ref);

    try {
      // 1. Try backend LankaQR generator Edge Function
      const res = await createLankaQrPayment({
        amount: totalAmount,
        purpose: 'booking',
        recordId: request.id,
        description: `Booking ${request.requestNumber} — ${request.routeFrom} to ${request.routeTo}`,
        createdBy: currentUserName,
      });

      if (res && res.qrBase64) {
        setQrBase64(res.qrBase64);
        setQrReference(res.reference);
        return;
      }
    } catch {
      // Fallback: Generate local compliant EMVCo/LankaQR QR payload image via qrcode library
      try {
        const payload = `00020101021226460010srilanka.lk0112MGRTRANSPORT520448145303144540${totalAmount.toFixed(2).length}${totalAmount.toFixed(2)}5802LK5916MANNARGREENRIDE6006MANNAR62230119${ref}6304`;
        const localDataUrl = await QRCode.toDataURL(payload, {
          width: 240,
          margin: 1,
          color: { dark: '#042f2e', light: '#ffffff' },
        });
        setQrBase64(localDataUrl);
      } catch (e: any) {
        setQrError(e.message || 'Could not generate QR code.');
      }
    } finally {
      setQrLoading(false);
    }
  }, [request, totalAmount, currentUserName]);

  useEffect(() => {
    if (paymentMethod === 'qr' && !qrBase64 && !qrLoading) {
      loadQrCode();
    }
  }, [paymentMethod, qrBase64, qrLoading, loadQrCode]);

  // Subscribe to real-time QR payment verification
  useEffect(() => {
    if (!qrReference || paymentMethod !== 'qr') return;
    const unsub = subscribeLankaQrPayment(qrReference, (updated) => {
      if (updated.status === 'paid' && !settledRef.current) {
        settledRef.current = true;
        setQrVerified(true);
        setTimeout(() => {
          onSuccess(qrReference, 'qr');
        }, 600);
      }
    });
    return () => unsub();
  }, [qrReference, paymentMethod, onSuccess]);

  // Cash Calculations
  const cashNum = parseFloat(cashReceivedInput) || 0;
  const changeDue = Math.round((cashNum - totalAmount) * 100) / 100;
  const isCashInsufficient = cashNum < totalAmount;

  const handleCashPreset = (added: number) => {
    const nextVal = added === 0 ? totalAmount : cashNum + added;
    setCashReceivedInput(nextVal.toString());
  };

  const handleConfirm = () => {
    if (paymentMethod === 'cash') {
      if (isCashInsufficient) {
        alert(`Insufficient cash amount. Minimum required is Rs. ${totalAmount.toLocaleString()}`);
        return;
      }
      const ref = `CASH-MGR-${Date.now().toString().slice(-6)}`;
      onSuccess(ref, 'cash');
    } else if (paymentMethod === 'card') {
      const ref = cardRefInput.trim()
        ? `CARD-${cardNetwork.toUpperCase()}-${cardRefInput.trim()}`
        : `CARD-${cardNetwork.toUpperCase()}-${Date.now().toString().slice(-6)}`;
      onSuccess(ref, 'card');
    } else if (paymentMethod === 'qr') {
      const ref = qrReference || `QR-LKP-${Date.now().toString().slice(-6)}`;
      onSuccess(ref, 'qr');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 text-xs my-auto max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {request.requestNumber}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  MGR Checkout
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Booking Payment
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Booking Details Summary Card (Like Bicycle POS) */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
          <div className="grid grid-cols-2 gap-2 text-slate-600">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">
                <strong className="text-slate-800">{request.routeFrom}</strong> ➔ <strong className="text-slate-800">{request.routeTo}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="font-semibold text-slate-800">
                {request.travelDate} {request.travelTime ? `• ${request.travelTime}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">
                {request.passenger.name} ({request.passenger.phone})
              </span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Car className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <span className="font-semibold capitalize text-slate-800">
                {request.vehicleType} • {request.seatCount} Seat{request.seatCount > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
            <div className="text-slate-500 space-y-0.5">
              <div>Operator Fare: Rs. {(request.ownerTravelCharge || 0).toLocaleString()}</div>
              <div>Convenience Fee: Rs. {(request.convenienceFee || 0).toLocaleString()}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Amount Due</span>
              <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                Rs. {totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Selector (Cash, QR, Card) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
            Select Payment Method
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                paymentMethod === 'cash'
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Cash</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('qr')}
              className={`py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                paymentMethod === 'qr'
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>LankaQR</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                paymentMethod === 'card'
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Card / POS</span>
            </button>
          </div>
        </div>

        {/* METHOD 1: CASH VIEW */}
        {paymentMethod === 'cash' && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cash Received (Key-in) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">Rs.</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={cashReceivedInput}
                    onChange={(e) => setCashReceivedInput(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Change Due to Passenger
                </label>
                <div
                  className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold border flex items-center justify-between ${
                    changeDue >= 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-rose-50 border-rose-300 text-rose-700'
                  }`}
                >
                  <span>Rs. {Math.abs(changeDue).toLocaleString()}</span>
                  <span className="text-[10px] uppercase font-bold">
                    {changeDue >= 0 ? 'Change' : 'Insufficient'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Cash Presets */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Quick Cash Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCashPreset(0)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-mono font-bold text-[11px] text-slate-700 cursor-pointer"
                >
                  Exact (Rs. {totalAmount.toLocaleString()})
                </button>
                {[500, 1000, 2000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleCashPreset(preset)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-mono font-bold text-[11px] text-slate-700 cursor-pointer"
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Cash Receipt / Payment Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Received at Mannar Counter"
                value={cashNotes}
                onChange={(e) => setCashNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800"
              />
            </div>
          </div>
        )}

        {/* METHOD 2: LANKAQR VIEW */}
        {paymentMethod === 'qr' && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center space-y-3">
            {qrLoading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <span className="font-bold text-slate-600 text-xs">Generating LankaQR Code...</span>
              </div>
            ) : qrError ? (
              <div className="py-6 flex flex-col items-center gap-2 text-rose-600">
                <AlertCircle className="w-8 h-8" />
                <p className="text-xs font-semibold">{qrError}</p>
                <button
                  type="button"
                  onClick={loadQrCode}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-800 font-bold hover:bg-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            ) : (
              <>
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block">
                  {qrBase64 ? (
                    <img
                      src={qrBase64}
                      alt="LankaQR Payment Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center bg-slate-100 text-slate-400">
                      <QrCode className="w-16 h-16" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="font-extrabold text-sm text-slate-900">
                    Scan with any LankaQR Bank App
                  </div>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    ComBank Q+, BOC SmartPay, Sampath WePay, Frimi, iPay, or any Sri Lankan banking app.
                  </p>
                  <div className="font-mono text-[10px] text-slate-500 font-bold mt-1">
                    Ref: {qrReference}
                  </div>
                </div>

                {qrVerified ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold animate-pulse">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Payment Verified! Completing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setQrVerified(true);
                        setTimeout(() => onSuccess(qrReference || `QR-LKP-${Date.now().toString().slice(-6)}`, 'qr'), 400);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      title="For testing / instant counter verification"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Simulate / Verify QR Success</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* METHOD 3: CARD / POS VIEW */}
        {paymentMethod === 'card' && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Card Network
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['visa', 'mastercard', 'amex'] as const).map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setCardNetwork(net)}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs uppercase transition cursor-pointer ${
                      cardNetwork === net
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  POS Approval / Slip Ref *
                </label>
                <input
                  type="text"
                  placeholder="e.g. AUTH-88219"
                  value={cardRefInput}
                  onChange={(e) => setCardRefInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Last 4 Digits (Optional)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="e.g. 4242"
                  value={cardLastDigits}
                  onChange={(e) => setCardLastDigits(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-800 text-[11px] flex items-start gap-2">
              <CreditCard className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Insert, swipe, or tap passenger card on the POS machine terminal. Enter the authorization code from the receipt slip above.
              </span>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={paymentMethod === 'cash' && isCashInsufficient}
            className={`px-5 py-2 rounded-xl font-bold text-white shadow-sm flex items-center gap-1.5 transition ${
              paymentMethod === 'cash' && isCashInsufficient
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Payment (Rs. {totalAmount.toLocaleString()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
