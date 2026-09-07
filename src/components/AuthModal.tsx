/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Key, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  LogIn, 
  RotateCcw, 
  AlertCircle,
  CheckCircle2,
  Users
} from 'lucide-react';
import { AppSettings } from '../types';
import { 
  DEFAULT_USER, 
  UserAccount, 
  authenticateUser, 
  resetUserPassword 
} from '../utils/auth';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUserChange: (user: UserAccount) => void;
  onOpenUserRoles?: () => void;
  settings: AppSettings;
  themeMode: ThemeMode;
  accent: AccentColor;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  onOpenUserRoles,
  settings,
  themeMode,
  accent,
}) => {
  const [activeView, setActiveView] = useState<'login' | 'forgot'>('login');
  
  // Login form state - username / email & password
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Feedback messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const t = getThemeClasses(themeMode, accent);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Handle Login Submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please enter both username/email and password.');
      return;
    }

    const res = await authenticateUser(loginEmail, loginPassword);
    if (res.success && res.user) {
      onUserChange(res.user);
      setSuccessMessage(`Welcome back, ${res.user.name}! Logged in as ${res.user.role.toUpperCase()}.`);
      setTimeout(() => {
        onClose();
      }, 700);
    } else {
      setErrorMessage(res.error || 'Invalid credentials. Please verify your email and password.');
    }
  };

  // Handle Forgot Password - Update or Send reset email
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMessage('Please enter a valid registered email address.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMessage('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New password and confirmation do not match.');
        return;
      }

      const res = await resetUserPassword(forgotEmail, newPassword);
      if (res.success) {
        setSuccessMessage('Password successfully updated and synced with Supabase! You can now log in.');
        setTimeout(() => {
          setActiveView('login');
          setLoginEmail(forgotEmail);
          setLoginPassword(newPassword);
          setNewPassword('');
          setConfirmPassword('');
          setSuccessMessage(null);
        }, 1500);
      } else {
        setErrorMessage(res.error || 'Failed to update password.');
      }
      return;
    }

    // Otherwise send reset link
    const res = await resetUserPassword(forgotEmail);
    if (res.success) {
      setSuccessMessage('Password reset request processed. If Supabase email is active, check your inbox.');
      setTimeout(() => {
        setActiveView('login');
        setSuccessMessage(null);
      }, 2000);
    } else {
      setErrorMessage(res.error || 'Failed to send reset email. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className={`${t.modalBg} rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-5 shadow-2xl transition-all border ${t.divider}`}>
        
        {/* Modal Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${t.divider}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base ${t.textHeading}`}>
                {activeView === 'login' ? 'Cashier & User Login' : 'Reset Password'}
              </h3>
              <p className={`text-xs ${t.textMuted}`}>
                {settings.businessName || 'Mannar Green Ride'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textMain} hover:bg-slate-800/20 transition cursor-pointer`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active User Session Strip */}
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${t.cardSubtleBg}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {(currentUser?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold ${t.textHeading}`}>{currentUser?.name || 'User'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-500 font-bold uppercase border border-emerald-500/30">
                  {currentUser?.role || 'cashier'}
                </span>
              </div>
              <p className={`text-[11px] font-mono ${t.textMuted}`}>{currentUser?.email}</p>
            </div>
          </div>

          {currentUser?.role === 'admin' && onOpenUserRoles && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUserRoles();
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer ${t.inactiveTab}`}
              title="Go to User Roles & Permissions Tab"
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Users Tab</span>
            </button>
          )}
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 1. LOGIN SCREEN: Username, Password, Forgot Password */}
        {activeView === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Username / Email Input */}
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Username or email address"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-xl font-medium ${t.textInput}`}
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-semibold ${t.textHeading}`}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => { setActiveView('forgot'); clearMessages(); }}
                  className="text-xs text-emerald-500 hover:underline font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full pl-9 pr-10 py-2.5 text-sm rounded-xl font-medium ${t.textInput}`}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Test Accounts */}
            <div className="pt-2 border-t border-slate-500/20">
              <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1.5 ${t.textMuted}`}>
                Quick Demo Login (MGR Transport):
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('passenger@mannargreenride.lk');
                    setLoginPassword('passenger123');
                    clearMessages();
                  }}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer text-center"
                >
                  👤 Passenger
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('owner@mannargreenride.lk');
                    setLoginPassword('owner123');
                    clearMessages();
                  }}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition cursor-pointer text-center"
                >
                  🚐 Fleet Owner
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail('admin@mannargreenride.lk');
                    setLoginPassword('admin123');
                    clearMessages();
                  }}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 hover:bg-purple-500/25 transition cursor-pointer text-center"
                >
                  🛡️ Admin
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${t.inactiveTab} cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn} shadow-md cursor-pointer`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. FORGOT PASSWORD SCREEN - Send reset email or enter new password directly */}
        {activeView === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-3.5">
            <p className={`text-xs ${t.textMuted}`}>
              Enter your registered email address and set your new password. This updates immediately and syncs with Supabase.
            </p>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                Registered Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl font-medium ${t.textInput}`}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                New Password (minimum 6 characters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new secure password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full pl-9 pr-10 py-2 text-sm rounded-xl font-medium ${t.textInput}`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password to confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl font-medium ${t.textInput}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { setActiveView('login'); clearMessages(); }}
                className="text-xs text-emerald-500 hover:underline font-semibold cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn} cursor-pointer shadow-md`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>{newPassword ? 'Update & Sync Password' : 'Send Reset Link'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
