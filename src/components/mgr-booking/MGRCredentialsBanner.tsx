/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, ShieldCheck, Car, Key, Copy, Check, Info, Sparkles, ChevronDown, ChevronUp, LogIn } from 'lucide-react';
import { setCurrentUserSession, MGR_INITIAL_ACCOUNTS, getCurrentUser } from '../../utils/auth';

interface MGRCredentialsBannerProps {
  onSelectRole?: (role: 'passenger' | 'owner' | 'admin') => void;
}

export const MGRCredentialsBanner: React.FC<MGRCredentialsBannerProps> = ({ onSelectRole }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentEmail, setCurrentEmail] = useState<string>(() => getCurrentUser()?.email || '');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleInstantLogin = (key: 'passenger' | 'owner' | 'admin') => {
    const target = MGR_INITIAL_ACCOUNTS.find(u => u.email.startsWith(key));
    if (target) {
      setCurrentUserSession(target);
      setCurrentEmail(target.email);
      if (onSelectRole) onSelectRole(key);
      window.location.reload();
    }
  };

  const personas = [
    {
      key: 'passenger',
      title: 'Passenger Account',
      roleBadge: 'Passenger Role',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: <User className="w-5 h-5 text-emerald-600" />,
      email: 'passenger@mannargreenride.lk',
      phone: '+94 77 345 6789',
      password: 'passenger123',
      description: 'Search routes, choose seats on Bus & Boat seat maps, book whole vehicles, and submit custom ride requests.',
      cardBg: 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-300',
    },
    {
      key: 'owner',
      title: 'Vehicle & Boat Owner',
      roleBadge: 'Owner / Partner',
      badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      icon: <Car className="w-5 h-5 text-cyan-600" />,
      email: 'owner@mannargreenride.lk',
      phone: '+94 77 123 4567',
      password: 'owner123',
      description: 'Register Cars, Vans, Buses & Boats, manage captains/drivers, track document expiry, and bid quotations.',
      cardBg: 'bg-cyan-50/70 border-cyan-200 hover:border-cyan-300',
    },
    {
      key: 'admin',
      title: 'MGR Administrator',
      roleBadge: 'Super Admin',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: <ShieldCheck className="w-5 h-5 text-purple-600" />,
      email: 'admin@mannargreenride.lk',
      phone: '+94 77 987 6543',
      password: 'admin123',
      description: 'Verify owner profiles, approve vehicles/boats, configure platform commission (%), and monitor gross revenues.',
      cardBg: 'bg-purple-50/70 border-purple-200 hover:border-purple-300',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6 transition-all">
      {/* Header bar */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                MGR Transport Testing & Demo Credentials
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Light Mode
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Credentials provided separately for Passenger, Fleet/Boat Owner, and System Administrator.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 transition cursor-pointer"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hide</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Show Credentials</span>
            </>
          )}
        </button>
      </div>

      {/* Expanded Credentials Cards */}
      {isExpanded && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white">
          {personas.map(p => (
            <div
              key={p.key}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition shadow-xs ${p.cardBg}`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-white shadow-xs border border-slate-200/60">
                      {p.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{p.title}</h4>
                      <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md border ${p.badgeClass}`}>
                        {p.roleBadge}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {p.description}
                </p>

                {/* Credential Details */}
                <div className="p-3 rounded-lg bg-white/90 border border-slate-200 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-sans">Email:</span>
                    <strong className="text-slate-800">{p.email}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-sans">Password:</span>
                    <strong className="text-emerald-700 font-bold">{p.password}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-sans">Phone:</span>
                    <span className="text-slate-700">{p.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Instant Login & Copy */}
              <div className="pt-2 space-y-2">
                {currentEmail.toLowerCase() === p.email.toLowerCase() ? (
                  <div className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                    <span>Active Session</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleInstantLogin(p.key as any)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign in as {p.title.split(' ')[0]}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(`Email: ${p.email}\nPassword: ${p.password}`, p.key)
                  }
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition shadow-xs cursor-pointer ${
                    copiedKey === p.key
                      ? 'bg-slate-800 text-white'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                  }`}
                >
                  {copiedKey === p.key ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Credentials</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
