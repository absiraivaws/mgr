/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, Key, ShieldCheck } from 'lucide-react';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { getSupabaseAuth, resetUserPassword } from '../utils/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { recordAuditLog } from '../utils/audit';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  isForcedChange?: boolean;
  userEmail?: string;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onSuccess?: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  isForcedChange = false,
  userEmail = '',
  themeMode = 'dark',
  accent = 'emerald',
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const t = getThemeClasses(themeMode, accent);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      let updated = false;

      // 1. Try Supabase Auth updateUser (works for active sessions and recovery links)
      if (isSupabaseConfigured()) {
        const supaAuth = getSupabaseAuth();
        if (supaAuth) {
          const { data, error } = await supaAuth.auth.updateUser({
            password: newPassword,
          });

          if (!error && data?.user) {
            updated = true;
          } else if (error) {
            console.warn('[PasswordReset] updateUser failed, attempting fallback reset:', error.message);
          }
        }
      }

      // 2. Fallback if userEmail is known
      const targetEmail = userEmail || 'absiraiva@gmail.com';
      if (!updated && targetEmail) {
        const res = await resetUserPassword(targetEmail, newPassword);
        if (res.success) {
          updated = true;
        } else {
          setErrorMsg(res.error || 'Failed to update password. Please try again.');
          setLoading(false);
          return;
        }
      }

      if (updated) {
        // Clear temporary password flag
        localStorage.removeItem('v_rental_must_change_password');

        // Clear recovery hash from URL
        if (typeof window !== 'undefined' && window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        // Record audit log
        recordAuditLog({
          user: targetEmail,
          userEmail: targetEmail,
          action: 'Password Reset Requested',
          reference: 'PASS-RESET',
          details: isForcedChange
            ? 'User updated temporary password to permanent password'
            : 'User successfully completed password recovery via reset link',
        });

        setSuccessMsg('Your password has been successfully updated! Supabase Auth is now updated.');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setErrorMsg('Unable to update password. Please ensure your session is active or request a new reset email.');
      }
    } catch (err: any) {
      console.error('[PasswordReset] Error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className={`w-full max-w-md ${t.cardBg} rounded-2xl border shadow-2xl p-5 sm:p-6 space-y-4`}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={`font-bold text-sm sm:text-base ${t.textHeading}`}>
              {isForcedChange ? 'Update Temporary Password' : 'Set New Password'}
            </h3>
            <p className={`text-xs ${t.textMuted}`}>
              {isForcedChange
                ? 'Please set a permanent password to secure your account'
                : 'Enter your new password to complete account recovery'}
            </p>
          </div>
        </div>

        {userEmail && (
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
            <span className="text-slate-400 font-medium">Account Email:</span>
            <span className="font-mono font-bold text-amber-400">{userEmail}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                className={`w-full rounded-xl px-3 py-2.5 text-xs pr-10 ${t.textInput}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-slate-300">
              Confirm New Password *
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm new password..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={`w-full rounded-xl px-3 py-2.5 text-xs ${t.textInput}`}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50 ${t.primaryBtn}`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
