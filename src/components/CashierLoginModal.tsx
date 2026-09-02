import React, { useState } from 'react';
import { User, X, Check, Key } from 'lucide-react';
import { AppSettings } from '../types';

interface CashierLoginModalProps {
  settings: AppSettings;
  onUpdateCashier: (name: string) => void;
  onClose: () => void;
}

export const CashierLoginModal: React.FC<CashierLoginModalProps> = ({
  settings,
  onUpdateCashier,
  onClose,
}) => {
  const [cashierName, setCashierName] = useState(settings.cashierName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cashierName.trim()) {
      onUpdateCashier(cashierName.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">Cashier Login / Shift</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Active Cashier Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Rivers, Cashier #2"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Set Cashier</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
