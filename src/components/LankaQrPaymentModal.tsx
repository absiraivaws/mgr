import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, RefreshCw, QrCode } from 'lucide-react';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import {
  createLankaQrPayment,
  getLankaQrPayment,
  subscribeLankaQrPayment,
  LankaQrPurpose,
} from '../lib/lankaqr';

interface LankaQrPaymentModalProps {
  isOpen: boolean;
  amount: number;
  purpose: LankaQrPurpose;
  recordId?: string;
  description?: string;
  createdBy?: string;
  title?: string;
  onSuccess: (reference: string) => void;
  onClose: () => void;
  themeMode?: ThemeMode;
  accent?: AccentColor;
}

export const LankaQrPaymentModal: React.FC<LankaQrPaymentModalProps> = ({
  isOpen,
  amount,
  purpose,
  recordId,
  description,
  createdBy,
  title = 'Scan to Pay with LankaQR',
  onSuccess,
  onClose,
  themeMode = 'dark',
  accent = 'emerald',
}) => {
  const t = getThemeClasses(themeMode, accent);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const settledRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const markPaid = useCallback((ref: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    setPaid(true);
    setTimeout(() => onSuccessRef.current(ref), 600);
  }, []);

  // Reset + create the payment intent whenever the modal opens
  useEffect(() => {
    if (!isOpen) {
      settledRef.current = false;
      setPaid(false);
      setReference(null);
      setQrBase64(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setQrBase64(null);
    setReference(null);
    setPaid(false);
    settledRef.current = false;

    createLankaQrPayment({ amount, purpose, recordId, description, createdBy })
      .then((res) => {
        if (cancelled) return;
        setReference(res.reference);
        setQrBase64(res.qrBase64);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to generate QR code.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, amount, purpose, recordId, description, createdBy]);

  // Realtime subscription + polling fallback while the QR is displayed
  useEffect(() => {
    if (!isOpen || !reference || paid) return;

    const unsubscribe = subscribeLankaQrPayment(reference, (payment) => {
      markPaid(payment.reference);
    });

    const poll = setInterval(async () => {
      const payment = await getLankaQrPayment(reference);
      if (payment?.status === 'paid') {
        markPaid(reference);
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  }, [isOpen, reference, paid, markPaid]);

  if (!isOpen) return null;

  const amountLabel = `Rs. ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className={`${t.modalBg} rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden`}>
        <div className={`p-4 border-b ${t.divider} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${t.textHeading}`}>{title}</h3>
              <p className={`text-xs ${t.textMuted}`}>LankaQR • People's Bank</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textMain} cursor-pointer`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className={`p-3 rounded-xl border text-center ${t.cardSubtleBg}`}>
            <p className={`text-xs ${t.textMuted}`}>Amount due</p>
            <p className={`text-2xl font-extrabold ${t.textHeading}`}>{amountLabel}</p>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p className={`text-xs ${t.textMuted}`}>Generating secure QR…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <p className="text-xs text-rose-500">{error}</p>
              <button
                type="button"
                onClick={() => {
                  // Re-trigger by closing/reopening would need parent cooperation; retry locally
                  setError(null);
                  setLoading(true);
                  createLankaQrPayment({ amount, purpose, recordId, description, createdBy })
                    .then((res) => {
                      setReference(res.reference);
                      setQrBase64(res.qrBase64);
                    })
                    .catch((err: Error) => setError(err?.message || 'Failed to generate QR code.'))
                    .finally(() => setLoading(false));
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {qrBase64 && !loading && !error && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white rounded-2xl p-2 border border-slate-200">
                <img src={qrBase64} alt="LankaQR payment code" className="w-60 h-60 object-contain" />
              </div>
              {reference && (
                <p className={`text-[11px] font-mono ${t.textMuted}`}>Ref: {reference}</p>
              )}
              {paid ? (
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Payment received!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-600 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Waiting for payment confirmation…</span>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer ${t.inactiveTab}`}
          >
            {paid ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
