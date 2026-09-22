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
  Palette,
  UserPlus,
  Car,
  Bus,
  Ship,
  Compass,
  Phone,
  Calendar,
  CreditCard,
  User,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { AppSettings } from '../types';
import { 
  UserAccount, 
  authenticateUser, 
  resetUserPassword,
  registerNewUser,
  setCurrentUserSession,
  getStoredUsers,
  getSupabaseAuth
} from '../utils/auth';
import { 
  syncUserAccountToSupabase,
  syncTransportOwnerToSupabase,
  syncTransportVehicleToSupabase,
  syncTransportDriverToSupabase,
  syncCustomerToSupabase
} from '../lib/supabaseSync';
import { ACCENT_COLORS, AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  settings: AppSettings;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  accent: AccentColor;
  onChangeAccent: (accent: AccentColor) => void;
  preselectedRole?: 'passenger' | 'owner' | 'admin' | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  settings,
  themeMode,
  onToggleTheme,
  accent,
  onChangeAccent,
  preselectedRole = null,
}) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');

  // Form State - Username / Email & Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration State: strictly Passenger and Owner self-registration
  const [regRole, setRegRole] = useState<'passenger' | 'owner'>('passenger');
  const [regName, setRegName] = useState('');
  const [regNic, setRegNic] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Google Sign-In & Profile Auto-Fill Modal
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleCustomName, setGoogleCustomName] = useState('');
  const [googleCustomEmail, setGoogleCustomEmail] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');

  // Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const t = getThemeClasses(themeMode, accent);

  const clearMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSelectGoogleAccount = (gName: string, gEmail: string) => {
    const cleanEmail = gEmail.trim().toLowerCase();
    const cleanName = gName.trim() || cleanEmail.split('@')[0];

    if (view === 'login') {
      const users = getStoredUsers();
      let matched = users.find(u => u.email.toLowerCase() === cleanEmail);
      if (!matched) {
        // Auto-register as passenger
        matched = {
          id: `usr-google-${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          role: 'passenger',
          username: cleanEmail.split('@')[0],
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
        };
        const updatedUsers = [...users, matched];
        localStorage.setItem('all_users', JSON.stringify(updatedUsers));
      }
      setShowGoogleModal(false);
      setSuccessMessage(`Signed in with Google as ${cleanName} (${cleanEmail})`);
      setTimeout(() => {
        onLoginSuccess(matched!);
      }, 500);
      return;
    }

    setRegName(cleanName);
    setRegEmail(cleanEmail);
    setShowGoogleModal(false);
    setSuccessMessage(`Google account linked: ${cleanEmail}. Profile details auto-filled.`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const handleGoogleSignInClick = () => {
    clearMessages();
    setShowGoogleModal(true);
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

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMessage('Please enter a valid registered email address.');
      return;
    }

    const res = await resetUserPassword(forgotEmail);
    if (res.success) {
      setSuccessMessage('Password reset link sent! Check your inbox to reset your password via Supabase Auth.');
      setTimeout(() => {
        setView('login');
        setSuccessMessage(null);
      }, 3500);
    } else {
      setErrorMessage(res.error || 'Failed to send reset email. Please try again.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!regName.trim() || !regNic.trim() || !regDob || !regPhone.trim() || !regEmail.trim() || !regAddress.trim() || !regPassword) {
      setErrorMessage('Please fill in all required fields marked with * (including Address).');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const users = getStoredUsers();
    const existing = users.find(u => u.email.toLowerCase() === regEmail.trim().toLowerCase());
    if (existing) {
      setErrorMessage('An account with this email already exists. Please sign in instead.');
      return;
    }

    const assignedRole = regRole === 'owner' ? 'owner' : 'passenger';
    const res = await registerNewUser({
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      role: assignedRole,
      phone: regPhone.trim(),
      address: regAddress.trim(),
    });

    if (!res.success || !res.user) {
      setErrorMessage(res.error || 'Failed to register account with Supabase Auth.');
      return;
    }

    const newUser = res.user;

    // 1. OWNER REGISTRATION (Profile & Contact only - Vehicle fields moved to "Add Vehicle / Boat")
    if (regRole === 'owner') {
      try {
        const ownerId = `OWN-MGR-${newUser.id.replace('supa-', '').slice(-5)}`;
        const newOwner: any = {
          id: ownerId,
          fullName: regName.trim(),
          nicPassport: regNic.trim(),
          address: regAddress.trim(),
          mobileNumber: regPhone.trim(),
          whatsappNumber: regWhatsapp.trim() || regPhone.trim(),
          email: regEmail.trim().toLowerCase(),
          status: 'verified',
          vehiclesCount: 0,
          totalEarnings: 0,
          rating: 5.0,
          createdAt: Date.now(),
        };

        const existingOwnersRaw = localStorage.getItem('mgr_transport_owners');
        const ownersList = existingOwnersRaw ? JSON.parse(existingOwnersRaw) : [];
        ownersList.unshift(newOwner);
        localStorage.setItem('mgr_transport_owners', JSON.stringify(ownersList));

        // Immediately sync owner to Supabase
        await syncTransportOwnerToSupabase(newOwner);
      } catch (err) {
        console.error('Error syncing owner registration data to Supabase:', err);
      }
    } 
    // 2. PASSENGER REGISTRATION
    else {
      try {
        const existingCustRaw = localStorage.getItem('v_rental_customers');
        const custs = existingCustRaw ? JSON.parse(existingCustRaw) : [];
        const newCust: any = {
          id: `CUST-${Date.now()}`,
          nicPassport: regNic.trim(),
          name: regName.trim(),
          fullName: regName.trim(),
          dob: regDob,
          phone: regPhone.trim(),
          whatsappNumber: regWhatsapp.trim() || regPhone.trim(),
          address: regAddress.trim(),
          status: 'active',
          groups: ['Passenger'],
          totalRentalsCount: 0,
          notes: 'Registered Passenger',
          createdAt: Date.now(),
        };
        custs.unshift(newCust);
        localStorage.setItem('v_rental_customers', JSON.stringify(custs));
        await syncCustomerToSupabase(newCust);
      } catch (err) {
        console.error('Error syncing passenger customer to Supabase:', err);
      }
    }

    setSuccessMessage(`Registration successful! Welcome to Mannar Green Ride, ${newUser.name}.`);
    setTimeout(() => {
      onLoginSuccess(newUser);
    }, 600);
  };

  return (
    <div className={`min-h-screen ${t.appBg} flex flex-col justify-center items-center p-4 sm:p-6 transition-colors`}>
      
      {/* Top right settings bar */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
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

      {/* Main Login / Register Card */}
      <div className={`${t.cardBg} rounded-3xl w-full ${view === 'register' ? 'max-w-lg' : 'max-w-md'} p-6 sm:p-8 border shadow-2xl space-y-5 transition-all`}>
        
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
              {view === 'login' && 'Passenger & Owner Sign In'}
              {view === 'register' && 'Passenger & Owner Registration Portal'}
              {view === 'forgot' && 'Password Recovery'}
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

            {/* Register button under signin row */}
            <div className="pt-2 text-center border-t border-slate-200 dark:border-slate-800">
              <p className={`text-xs ${t.textMuted}`}>
                Don't have an account?{' '}
                <button
                  id="btn-switch-to-register"
                  type="button"
                  onClick={() => { setView('register'); clearMessages(); }}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer ml-1"
                >
                  Register as Passenger or Owner
                </button>
              </p>
            </div>

          </form>
        )}

        {/* 2. REGISTRATION VIEW: Passenger / Owner with vehicle details */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Google / Gmail Sign-In / Auto-Fill Option */}
            <div className="pb-1">
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={handleGoogleSignInClick}
                className="w-full py-2.5 px-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                )}
                <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google / Auto-fill Profile'}</span>
              </button>
              <div className="flex items-center my-3">
                <div className="grow border-t border-slate-200 dark:border-slate-700" />
                <span className="px-2 text-[10px] text-slate-400 font-semibold uppercase">Or Enter Details</span>
                <div className="grow border-t border-slate-200 dark:border-slate-700" />
              </div>
            </div>

            {/* Role Radio Selection: Passenger, Owner, Driver */}
            {/* Role Radio Selection: Passenger or Owner Only (Requirement: Self-registration strictly for Owner and Passenger) */}
            <div>
              <label className={`block text-xs font-bold mb-2 ${t.textHeading}`}>
                Register As <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex flex-col items-center justify-center p-3 rounded-2xl border cursor-pointer transition text-center ${
                  regRole === 'passenger'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold ring-2 ring-emerald-500/20'
                    : `border-slate-200 dark:border-slate-700 hover:bg-slate-500/5 ${t.textMain}`
                }`}>
                  <input
                    id="radio-register-passenger"
                    type="radio"
                    name="regRole"
                    value="passenger"
                    checked={regRole === 'passenger'}
                    onChange={() => setRegRole('passenger')}
                    className="w-3.5 h-3.5 text-emerald-600 mb-1"
                  />
                  <span className="text-xs font-bold block">Passenger</span>
                  <span className="text-[10px] text-slate-400">Book and manage rides</span>
                </label>

                <label className={`flex flex-col items-center justify-center p-3 rounded-2xl border cursor-pointer transition text-center ${
                  regRole === 'owner'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold ring-2 ring-emerald-500/20'
                    : `border-slate-200 dark:border-slate-700 hover:bg-slate-500/5 ${t.textMain}`
                }`}>
                  <input
                    id="radio-register-owner"
                    type="radio"
                    name="regRole"
                    value="owner"
                    checked={regRole === 'owner'}
                    onChange={() => setRegRole('owner')}
                    className="w-3.5 h-3.5 text-emerald-600 mb-1"
                  />
                  <span className="text-xs font-bold block">Owner</span>
                  <span className="text-[10px] text-slate-400">Fleet & Boat Partner</span>
                </label>
              </div>
            </div>

            {/* Personal Details: Name, Address, NIC, DOB, Phone, WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-reg-name"
                    type="text"
                    required
                    placeholder="e.g. Sivaranjan Kumar"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl font-medium ${t.textInput}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-reg-address"
                    type="text"
                    required
                    placeholder="e.g. Main Street, Mannar"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl font-medium ${t.textInput}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  NIC / Passport <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-reg-nic"
                    type="text"
                    required
                    placeholder="e.g. 199512345678"
                    value={regNic}
                    onChange={(e) => setRegNic(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl font-medium ${t.textInput}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-reg-dob"
                    type="date"
                    required
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl font-medium ${t.textInput}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-reg-phone"
                    type="tel"
                    required
                    placeholder="e.g. +94 77 123 4567"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl font-medium ${t.textInput}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <input
                    id="input-reg-whatsapp"
                    type="tel"
                    required
                    placeholder="e.g. +94 77 123 4567"
                    value={regWhatsapp}
                    onChange={(e) => setRegWhatsapp(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl font-medium ${t.textInput}`}
                  />
                </div>
              </div>
            </div>

            {/* Email & Password for Login */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Account Email Address (For Sign In) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-reg-email"
                    type="email"
                    required
                    placeholder="you@email.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl font-medium ${t.textInput}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 chars"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl font-medium ${t.textInput}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="input-reg-confirm-password"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl font-medium ${t.textInput}`}
                  />
                </div>
              </div>
            </div>

            <button
              id="btn-submit-register"
              type="submit"
              className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${t.primaryBtn}`}
            >
              <UserPlus className="w-4 h-4" />
              <span>
                Register as {regRole === 'owner' ? 'Vehicle / Boat Owner' : 'Passenger'}
              </span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => { setView('login'); clearMessages(); }}
                className="text-xs text-emerald-500 hover:underline font-semibold cursor-pointer"
              >
                Already have an account? Sign in here
              </button>
            </div>
          </form>
        )}

        {/* 2. FORGOT PASSWORD VIEW - Send reset email */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className={`text-xs ${t.textMuted}`}>
              Enter your registered email address. We will send a secure Supabase password recovery link directly to your inbox.
            </p>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${t.textHeading}`}>
                Registered Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl font-medium ${t.textInput}`}
                  autoFocus
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
                className={`py-2.5 px-5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${t.primaryBtn}`}
              >
                <Mail className="w-4 h-4" />
                <span>Send Reset Link</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Google Account Selector Modal (Requirements: Google/Gmail sign-in to select account and auto-fill profile details from device session) */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <h3 className="font-bold text-sm text-slate-800">Sign in with Google / Gmail</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {view === 'login'
                ? 'Select or enter your Google account from your device to sign in securely:'
                : 'Enter your Google account from your device to auto-fill your profile details into the registration form:'}
            </p>

            {/* Custom Google account entry (Strictly user-provided; admin/staff emails never exposed) */}
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Your Full Name (from Google)</label>
                <input
                  type="text"
                  placeholder="e.g. John Silva"
                  value={googleCustomName}
                  onChange={(e) => setGoogleCustomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Your Google / Gmail Address</label>
                <input
                  type="email"
                  placeholder="e.g. yourname@gmail.com"
                  value={googleCustomEmail}
                  onChange={(e) => setGoogleCustomEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={!googleCustomName.trim() || !googleCustomEmail.trim()}
                  onClick={() => handleSelectGoogleAccount(googleCustomName.trim(), googleCustomEmail.trim())}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {view === 'login'
                      ? 'Sign In with this Google Account'
                      : 'Auto-fill Profile with this Google Account'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
