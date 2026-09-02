/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Bike, 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  RotateCcw, 
  Key, 
  AlertCircle, 
  CheckCircle2, 
  Sun, 
  Moon, 
  Palette 
} from 'lucide-react';
import { AppSettings } from '../types';
import { 
  UserAccount, 
  authenticateUser, 
  resetUserPassword 
} from '../utils/auth';
import { ACCENT_COLORS, AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  settings: AppSettings;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  accent: AccentColor;
  onChangeAccent: (accent: AccentColor) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  settings,
  themeMode,
  onToggleTheme,
  accent,
  onChangeAccent,
}) => {
  const [view, setView] = useState<'login' | 'forgot'>('login');

  // Form State - Username / Email & Password
  const [email, setEmail] = useState('absiraiva@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('absiraiva@gmail.com');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const t = getThemeClasses(themeMode, accent);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both username/email and password.');
      return;
    }

    const res = await authenticateUser(email, password);
    if (res.success && res.user) {
      setSuccessMessage(`Welcome, ${res.user.name}!`);
      setTimeout(() => {
        onLoginSuccess(res.user!);
      }, 400);
    } else {
      setErrorMessage(res.error || 'Invalid username or password.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your registered username / email address.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const res = await resetUserPassword(forgotEmail, newPassword);
    if (res.success) {
      setSuccessMessage('Password reset successfully. You can now log in.');
      setEmail(forgotEmail);
      setPassword('');
      setTimeout(() => {
        setView('login');
        setSuccessMessage(null);
      }, 1200);
    } else {
      setErrorMessage(res.error || 'Could not reset password.');
    }
  };

  return (
    <div className={`min-h-screen ${t.appBg} flex flex-col justify-center items-center p-4 sm:p-6 transition-colors`}>
      
      {/* Top right settings bar */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
        {/* Color Palette Toggle */}
        <div className="relative">
          <button
            id="btn-login-palette"
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${t.inactiveTab}`}
            title="Change Color Theme"
          >
            <Palette className="w-4 h-4" />
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ACCENT_COLORS.find(c => c.id === accent)?.hex || '#10b981' }} />
          </button>

          {showColorPicker && (
            <div 
              className={`absolute right-0 mt-2 w-44 p-2 rounded-xl shadow-xl z-50 border ${t.modalBg}`}
              onMouseLeave={() => setShowColorPicker(false)}
            >
              <div className="space-y-1">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onChangeAccent(c.id);
                      setShowColorPicker(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                      accent === c.id ? `${t.badge} font-bold` : `hover:bg-slate-500/10 ${t.textMain}`
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                      <span>{c.name}</span>
                    </div>
                    {accent === c.id && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Theme mode toggle */}
        <button
          id="btn-login-theme"
          type="button"
          onClick={onToggleTheme}
          className={`p-2.5 rounded-xl border flex items-center justify-center transition cursor-pointer ${t.inactiveTab}`}
          title={themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>
      </div>

      {/* Main Login Card */}
      <div className={`${t.cardBg} rounded-3xl w-full max-w-md p-6 sm:p-8 border shadow-2xl space-y-6 transition-all`}>
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg text-white">
            <Bike className="w-8 h-8" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${t.textHeading}`}>
              {settings.businessName || 'Mannar Green Ride'}
            </h1>
            <p className={`text-xs ${t.textMuted} mt-1`}>
              {view === 'login' ? 'Cashier & Staff Login' : 'Password Recovery'}
            </p>
          </div>
        </div>

        {/* Notifications */}
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

        {/* 1. SIGN IN VIEW: Username, Password, Forgot Password */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-login-username"
                  type="text"
                  required
                  placeholder="Username or email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl font-medium ${t.textInput}`}
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-semibold ${t.textHeading}`}>
                  Password
                </label>
                <button
                  id="btn-forgot-pwd"
                  type="button"
                  onClick={() => { setView('forgot'); clearMessages(); }}
                  className="text-xs text-emerald-500 hover:underline font-semibold cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl font-medium ${t.textInput}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-submit-login"
              type="submit"
              className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${t.primaryBtn}`}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </form>
        )}

        {/* 2. FORGOT PASSWORD VIEW */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className={`text-xs ${t.textMuted}`}>
              Enter your registered username or email to reset your password.
            </p>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                Registered Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="absiraiva@gmail.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl font-medium ${t.textInput}`}
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>New Password</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 6 chars"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-xl font-medium ${t.textInput}`}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Confirm</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-xl font-medium ${t.textInput}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { setView('login'); clearMessages(); }}
                className="text-xs text-emerald-500 hover:underline font-semibold cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
              <button
                type="submit"
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn} cursor-pointer`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Reset Password</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
