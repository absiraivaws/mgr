import React, { useState } from 'react';
import {
  CheckCircle2,
  HardHat,
  Save,
  Settings,
} from 'lucide-react';
import { PRHSettings } from '../../types/prhTypes';
import { prhTheme } from './prhTheme';

interface PRHSettingsViewProps {
  settings: PRHSettings;
  onSaveSettings: (settings: PRHSettings) => void;
}

export const PRHSettingsView: React.FC<PRHSettingsViewProps> = ({
  settings,
  onSaveSettings,
}) => {
  const [formData, setFormData] = useState<PRHSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          PRH Business & Rental Rules Configuration
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure Pesalai Rental Hub depot credentials, contract prefixes, default grace hours, and late fee charges.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`${prhTheme.card} p-6 space-y-6 text-xs`}>
        {/* Depot Identity */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HardHat className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Depot Business Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={prhTheme.label}>Business Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className={prhTheme.input}
              />
            </div>

            <div>
              <label className={prhTheme.label}>Depot Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={prhTheme.input}
              />
            </div>

            <div>
              <label className={prhTheme.label}>Official Mobile Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={prhTheme.input}
              />
            </div>

            <div>
              <label className={prhTheme.label}>Official WhatsApp Number</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className={prhTheme.input}
              />
            </div>
          </div>
        </div>

        {/* Rental & Numbering Prefixes */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Rental & Numbering Prefixes</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={prhTheme.label}>Rental Contract Prefix</label>
              <input
                type="text"
                value={formData.rentalPrefix}
                onChange={(e) => setFormData({ ...formData, rentalPrefix: e.target.value })}
                className={`${prhTheme.input} font-mono font-bold text-blue-600 dark:text-blue-400`}
              />
            </div>

            <div>
              <label className={prhTheme.label}>Invoice Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                className={`${prhTheme.input} font-mono font-bold text-blue-600 dark:text-blue-400`}
              />
            </div>

            <div>
              <label className={prhTheme.label}>Customer Prefix</label>
              <input
                type="text"
                value={formData.customerPrefix}
                onChange={(e) => setFormData({ ...formData, customerPrefix: e.target.value })}
                className={`${prhTheme.input} font-mono font-bold text-blue-600 dark:text-blue-400`}
              />
            </div>
          </div>
        </div>

        {/* Calculation Rules */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Default Day-Wise Calculation Rules</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={prhTheme.label}>Minimum Rental Days</label>
              <input
                type="number"
                min={1}
                value={formData.minRentalDays}
                onChange={(e) => setFormData({ ...formData, minRentalDays: parseInt(e.target.value, 10) || 1 })}
                className={`${prhTheme.input} font-mono`}
              />
            </div>

            <div>
              <label className={prhTheme.label}>Grace Return Hours</label>
              <input
                type="number"
                min={0}
                value={formData.graceHours}
                onChange={(e) => setFormData({ ...formData, graceHours: parseInt(e.target.value, 10) || 0 })}
                className={`${prhTheme.input} font-mono`}
              />
            </div>

            <div>
              <label className={prhTheme.label}>Default Late Fee (% / day)</label>
              <input
                type="number"
                min={0}
                value={formData.defaultLateChargePercent}
                onChange={(e) => setFormData({ ...formData, defaultLateChargePercent: parseFloat(e.target.value) || 0 })}
                className={`${prhTheme.input} font-mono`}
              />
            </div>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">PRH Business Settings saved successfully!</span>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className={prhTheme.btnPrimary}
          >
            <Save className="w-4 h-4" />
            Save PRH Settings
          </button>
        </div>
      </form>
    </div>
  );
};
