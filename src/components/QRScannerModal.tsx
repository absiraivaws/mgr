/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  title?: string;
  subtitle?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  themeMode = 'dark',
  accent = 'emerald',
  title = 'Scan Vehicle QR',
  subtitle = 'Point camera at vehicle QR tag or simulate test scan',
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'vehicle-qr-reader-region';

  const t = getThemeClasses(themeMode, accent);

  const parseSerial = (raw: string): string => {
    let clean = raw.trim();
    // In case payload was JSON formatted e.g. {"serialNumber":"BIC-001"}
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        if (parsed.serialNumber) return String(parsed.serialNumber).trim();
        if (parsed.serial) return String(parsed.serial).trim();
        if (parsed.id) return String(parsed.id).trim();
      } catch {}
    }
    return clean;
  };

  const handleSuccessfulScan = (decodedText: string) => {
    const cleanSerial = parseSerial(decodedText);
    if (!cleanSerial) return;
    stopScanner();
    onScan(cleanSerial);
    onClose();
  };

  const stopScanner = async () => {
    if (qrReaderRef.current) {
      try {
        if (qrReaderRef.current.isScanning) {
          await qrReaderRef.current.stop();
        }
        await qrReaderRef.current.clear();
      } catch (err) {
        // Ignore stop error
      }
      qrReaderRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanner = async () => {
    setCameraError(null);
    try {
      if (!qrReaderRef.current) {
        qrReaderRef.current = new Html5Qrcode(scannerContainerId);
      }

      setIsScanning(true);
      await qrReaderRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Frame decode failure (normal during scanning)
        }
      );
    } catch (err: any) {
      console.warn('Camera scan initialization error:', err);
      setIsScanning(false);
      setCameraError(
        err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings or use manual input below.'
          : 'Unable to access live camera. Please use manual input below.'
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow DOM container to render
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className={`w-full max-w-md ${t.cardBg} rounded-2xl border shadow-2xl p-5 sm:p-6 space-y-4`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`font-bold text-sm sm:text-base ${t.textHeading}`}>{title}</h3>
              <p className={`text-xs ${t.textMuted}`}>{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Camera Viewport */}
        <div className="relative overflow-hidden rounded-xl bg-black border border-slate-700 aspect-square flex flex-col items-center justify-center">
          <div id={scannerContainerId} className="w-full h-full" />
          
          {cameraError && (
            <div className="absolute inset-0 p-4 bg-black/90 flex flex-col items-center justify-center text-center space-y-3 z-10">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-xs text-amber-300 px-2">{cameraError}</p>
              <button
                type="button"
                onClick={startScanner}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Manual Test / Key-in Input */}
        <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${t.cardSubtleBg}`}>
          <label className={`block font-semibold ${t.textHeading}`}>
            Manual / Simulated QR Input
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualInput.trim()) {
                handleSuccessfulScan(manualInput);
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="e.g. BIC-001 or serial..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
            />
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-40 ${t.primaryBtn}`}
            >
              <span>Submit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${t.inactiveTab}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
