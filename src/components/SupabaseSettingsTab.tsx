import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Terminal, 
  Key, 
  RefreshCw,
  UploadCloud,
  CheckCircle,
  XCircle,
  Sparkles,
  Link
} from 'lucide-react';
import { 
  getSupabaseCredentials, 
  isSupabaseConfigured, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials,
  getSupabase,
  normalizeSupabaseUrl
} from '../lib/supabase';
import { pushAllLocalDataToSupabase, fetchSupabaseData } from '../lib/supabaseSync';
import { AppSettings, Customer, RentalRecord, Vehicle, VehicleType } from '../types';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface SupabaseSettingsTabProps {
  vehicleTypes: VehicleType[];
  vehicles: Vehicle[];
  customers: Customer[];
  activeRentals: RentalRecord[];
  completedRentals: RentalRecord[];
  settings: AppSettings;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onDataRefreshed?: (data: any) => void;
}

export const SupabaseSettingsTab: React.FC<SupabaseSettingsTabProps> = ({
  vehicleTypes,
  vehicles,
  customers,
  activeRentals,
  completedRentals,
  settings,
  themeMode = 'dark',
  accent = 'emerald',
  onDataRefreshed,
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const [copiedSql, setCopiedSql] = useState(false);
  const t = getThemeClasses(themeMode, accent);

  useEffect(() => {
    const creds = getSupabaseCredentials();
    setSupabaseUrl(creds.url);
    setAnonKey(creds.anonKey);
  }, []);

  const handleSaveCredentials = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = normalizeSupabaseUrl(supabaseUrl);
    const cleanKey = anonKey.trim();
    
    setSupabaseUrl(cleanUrl);
    setAnonKey(cleanKey);
    saveSupabaseCredentials(cleanUrl, cleanKey);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    runTestWith(cleanUrl, cleanKey);
  };

  const handleClearCredentials = () => {
    clearSupabaseCredentials();
    setSupabaseUrl('');
    setAnonKey('');
    setTestStatus('idle');
    setTestMessage('');
  };

  const runTestWith = async (url: string, key: string) => {
    setTestStatus('testing');
    setTestMessage('Testing connection to Supabase database...');
    
    const client = getSupabase();

    if (!client) {
      setTestStatus('failed');
      setTestMessage('Please provide a valid Project URL (https://<project-ref>.supabase.co) and anon public key.');
      return;
    }

    try {
      const { data, error } = await client.from('customers').select('id').limit(1);
      
      if (error) {
        if (error.code === '42P01' || error.message.includes('relation "public.customers" does not exist') || error.message.includes('not found')) {
          setTestStatus('success');
          setTestMessage('Connected to Supabase project successfully! Note: Run the SQL schema script below in your Supabase SQL Editor to create tables.');
        } else {
          setTestStatus('failed');
          setTestMessage(`Supabase error (${error.code || 'ERR'}): ${error.message}`);
        }
      } else {
        setTestStatus('success');
        setTestMessage('Connected to Supabase successfully! Tables are verified.');
      }
    } catch (err: any) {
      setTestStatus('failed');
      setTestMessage(`Connection test failed: ${err.message || err}`);
    }
  };

  const handlePushAllData = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await pushAllLocalDataToSupabase({
        vehicleTypes,
        vehicles,
        customers,
        activeRentals,
        completedRentals,
        settings,
      });

      setSyncResult(res);
    } catch (err: any) {
      setSyncResult({ success: false, message: `Upload error: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFetchAllData = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const data = await fetchSupabaseData();
      if (data) {
        setSyncResult({ success: true, message: 'Cloud fleet data downloaded and synchronized!' });
        if (onDataRefreshed) {
          onDataRefreshed(data);
        }
      } else {
        setSyncResult({ success: false, message: 'Could not fetch data. Check credentials and SQL schema.' });
      }
    } catch (err: any) {
      setSyncResult({ success: false, message: `Download error: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const sqlSchemaScript = `-- Run this in your Supabase SQL Editor (https://app.supabase.com/project/_/sql)

create table if not exists public.vehicle_types (
  id text primary key,
  name text not null,
  icon text not null default 'bicycle',
  description text,
  rates jsonb not null default '{"firstHour": 5.0, "every30Min": 2.5}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.vehicles (
  id text primary key,
  serial_number text not null unique,
  type_id text references public.vehicle_types(id) on delete set null,
  model_name text,
  status text not null default 'available',
  notes text,
  last_rented_at bigint,
  total_rentals_count integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.customers (
  id text primary key,
  nic_passport text not null unique,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz default now(),
  last_rental_date bigint,
  total_rentals_count integer default 1
);

create table if not exists public.rentals (
  id text primary key,
  rental_number text not null unique,
  vehicle_id text,
  vehicle_serial_number text not null,
  vehicle_type_id text,
  vehicle_type_name text,
  vehicle_icon text,
  customer_name text,
  customer_phone text,
  customer_nic_passport text,
  customer_notes text,
  deposit_amount numeric default 0,
  start_time bigint not null,
  end_time bigint,
  status text not null default 'active',
  rate_snapshot jsonb,
  breakdown jsonb,
  total_amount numeric not null default 0,
  cashier_name text,
  payment_method text,
  amount_received numeric,
  change_amount numeric,
  completed_at bigint,
  created_at timestamptz default now()
);

create table if not exists public.app_settings (
  id text primary key default 'global_settings',
  business_name text,
  business_phone text,
  business_address text,
  receipt_footer text,
  currency_symbol text default '$',
  currency_position text default 'prefix',
  cashier_name text,
  sound_enabled boolean default true,
  rental_number_prefix text default 'REN',
  updated_at timestamptz default now()
);

alter publication supabase_realtime add table public.vehicles, public.rentals, public.customers;
`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchemaScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className={`${t.cardBg} rounded-2xl p-5 sm:p-6 border shadow-xl space-y-6`}>
        
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${t.divider}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                Supabase Cloud Database Synchronization
              </h2>
              <p className={`text-xs ${t.textMuted}`}>
                Sync vehicles, customers, rentals, and rates to your Supabase PostgreSQL cloud database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSupabaseConfigured() ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
                Cloud Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                <AlertCircle className="w-4 h-4" />
                Not Configured
              </span>
            )}
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSaveCredentials} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                Supabase Project URL
              </label>
              <input
                type="text"
                required
                placeholder="https://abcdefghijklmnop.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono ${t.textInput}`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                Supabase Anon / Public API Key
              </label>
              <input
                type="password"
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono ${t.textInput}`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${t.primaryBtn}`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Save Credentials & Test</span>
              </button>

              <button
                type="button"
                onClick={() => runTestWith(supabaseUrl, anonKey)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${t.inactiveTab}`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Test Connection</span>
              </button>
            </div>

            {isSupabaseConfigured() && (
              <button
                type="button"
                onClick={handleClearCredentials}
                className="text-xs text-rose-500 hover:underline cursor-pointer"
              >
                Disconnect & Clear
              </button>
            )}
          </div>
        </form>

        {/* Connection status notification */}
        {testStatus !== 'idle' && (
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
            testStatus === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              : testStatus === 'failed'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-500'
          }`}>
            {testStatus === 'success' && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {testStatus === 'failed' && <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {testStatus === 'testing' && <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />}
            <span className="font-medium">{testMessage}</span>
          </div>
        )}

        {/* Data Sync Operations */}
        {isSupabaseConfigured() && (
          <div className={`p-4 sm:p-5 rounded-xl border space-y-4 ${t.cardSubtleBg}`}>
            <h3 className={`font-bold text-xs uppercase tracking-wider ${t.textHeading}`}>
              Fleet & Customer Cloud Data Synchronization
            </h3>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isSyncing}
                onClick={handlePushAllData}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${t.primaryBtn}`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isSyncing ? 'Synchronizing...' : 'Upload Local Data to Supabase Now'}</span>
              </button>

              <button
                type="button"
                disabled={isSyncing}
                onClick={handleFetchAllData}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${t.inactiveTab}`}
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Pull Cloud Data from Supabase</span>
              </button>
            </div>

            {syncResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                syncResult.success
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-500'
              }`}>
                {syncResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{syncResult.message}</span>
              </div>
            )}
          </div>
        )}

        {/* SQL Schema helper box */}
        <div className={`p-4 sm:p-5 rounded-xl border space-y-3 ${t.cardSubtleBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              <span className={`font-bold text-xs ${t.textHeading}`}>Supabase PostgreSQL SQL Schema</span>
            </div>
            <button
              type="button"
              onClick={copySql}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${t.inactiveTab}`}
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSql ? 'Copied!' : 'Copy SQL Schema'}</span>
            </button>
          </div>

          <pre className="p-3 bg-slate-950 text-slate-300 font-mono text-[11px] rounded-lg overflow-x-auto max-h-48 border border-slate-800">
            {sqlSchemaScript}
          </pre>
        </div>

      </div>
    </div>
  );
};
