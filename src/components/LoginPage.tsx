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
  Check
} from 'lucide-react';
import { AppSettings } from '../types';
import { 
  UserAccount, 
  authenticateUser, 
  resetUserPassword,
  registerNewUser,
  getStoredUsers,
  saveStoredUsers,
  setCurrentUserSession
} from '../utils/auth';
import { syncUserAccountToSupabase } from '../lib/supabaseSync';
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
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');

  // Form State - Username / Email & Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration State
  const [regRole, setRegRole] = useState<'passenger' | 'driver'>('passenger');
  const [regName, setRegName] = useState('');
  const [regNic, setRegNic] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Driver Specifics
  const [regVehicleType, setRegVehicleType] = useState<'car' | 'van' | 'bus' | 'boat' | 'safari'>('car');
  const [regVehicleNumber, setRegVehicleNumber] = useState('');
  const [regDriverOption, setRegDriverOption] = useState<'with_driver' | 'without_driver' | 'both'>('with_driver');

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

    if (!regName.trim() || !regNic.trim() || !regDob || !regPhone.trim() || !regEmail.trim() || !regPassword) {
      setErrorMessage('Please fill in all required fields marked with *');
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

    if (regRole === 'driver' && !regVehicleNumber.trim()) {
      setErrorMessage('Please provide your vehicle number.');
      return;
    }

    const users = getStoredUsers();
    const existing = users.find(u => u.email.toLowerCase() === regEmail.trim().toLowerCase());
    if (existing) {
      setErrorMessage('An account with this email already exists. Please sign in instead.');
      return;
    }

    const assignedRole = regRole === 'driver' ? 'owner' : 'passenger';
    const res = await registerNewUser({
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      password: regPassword,
      role: assignedRole,
      phone: regPhone.trim(),
    });

    if (!res.success || !res.user) {
      setErrorMessage(res.error || 'Failed to register account with Supabase Auth.');
      return;
    }

    const newUser = res.user;

    // If driver, also create owner & vehicle (with status: 'pending' for admin approval)
    if (regRole === 'driver') {
      try {
        const ownerId = `OWN-MGR-${Date.now().toString().slice(-5)}`;
        const newOwner = {
          id: ownerId,
          fullName: regName.trim(),
          nicPassport: regNic.trim(),
          address: 'Mannar',
          mobileNumber: regPhone.trim(),
          whatsappNumber: regWhatsapp.trim() || regPhone.trim(),
          email: regEmail.trim().toLowerCase(),
          status: 'verified',
          vehiclesCount: 1,
          totalEarnings: 0,
          rating: 5.0,
          createdAt: Date.now(),
        };

        const existingOwnersRaw = localStorage.getItem('mgr_transport_owners');
        const ownersList = existingOwnersRaw ? JSON.parse(existingOwnersRaw) : [];
        ownersList.unshift(newOwner);
        localStorage.setItem('mgr_transport_owners', JSON.stringify(ownersList));

        const vehicleTypePrefix = regVehicleType.toUpperCase();
        const vehicleDefaults: Record<string, { make: string; model: string; seats: number; price: number; photo: string }> = {
          car: { make: 'Toyota', model: 'Prius Luxury Hybrid', seats: 4, price: 12500, photo: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' },
          van: { make: 'Toyota', model: 'HiAce KDH High Roof', seats: 12, price: 18000, photo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80' },
          bus: { make: 'Ashok Leyland', model: 'Viking Luxury Coach', seats: 40, price: 50000, photo: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80' },
          boat: { make: 'Neil Marine', model: 'Mannar Pearl Cruiser', seats: 20, price: 28000, photo: 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d17?auto=format&fit=crop&w=600&q=80' },
          safari: { make: 'Toyota', model: 'Land Cruiser Open 4x4 Jeep', seats: 6, price: 24000, photo: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80' },
        };

        const vInfo = vehicleDefaults[regVehicleType] || vehicleDefaults.car;
        const newVehicle = {
          id: `MGR-${vehicleTypePrefix}-${Date.now().toString().slice(-5)}`,
          ownerId: ownerId,
          ownerName: regName.trim(),
          type: regVehicleType,
          registrationNumber: regVehicleNumber.trim().toUpperCase(),
          make: vInfo.make,
          model: vInfo.model,
          year: 2022,
          color: 'White',
          hasAC: regVehicleType !== 'boat' && regVehicleType !== 'safari',
          totalSeats: vInfo.seats,
          luggageCapacity: 'Standard Luggage',
          driverOption: regDriverOption,
          description: `Registered by ${regName.trim()}. Vehicle Number: ${regVehicleNumber.trim().toUpperCase()}.`,
          photos: [vInfo.photo],
          insuranceExpiry: '2027-12-31',
          revenueLicenceExpiry: '2027-12-31',
          status: 'pending', // Pending Admin Approval!
          basePrice: vInfo.price,
          oneDayPrice: Math.round(vInfo.price * 1.2),
          pricingMethod: regVehicleType === 'bus' || regVehicleType === 'boat' ? 'per_seat' : 'fixed',
          pricePerSeat: regVehicleType === 'bus' ? 1200 : regVehicleType === 'boat' ? 1500 : undefined,
          rating: 5.0,
          tripsCount: 0,
          createdAt: Date.now(),
        };

        const existingVehiclesRaw = localStorage.getItem('mgr_transport_vehicles');
        const vehiclesList = existingVehiclesRaw ? JSON.parse(existingVehiclesRaw) : [];
        vehiclesList.unshift(newVehicle);
        localStorage.setItem('mgr_transport_vehicles', JSON.stringify(vehiclesList));

        // Create initial driver record
        const newDriver = {
          id: `DRV-MGR-${Date.now().toString().slice(-5)}`,
          ownerId: ownerId,
          fullName: regName.trim(),
          nic: regNic.trim(),
          mobile: regPhone.trim(),
          whatsapp: regWhatsapp.trim() || regPhone.trim(),
          address: 'Mannar',
          driverType: regVehicleType === 'boat' ? 'captain' : 'driver',
          licenceNumber: 'B' + Math.floor(1000000 + Math.random() * 9000000),
          licenceClass: 'Light & Heavy Passenger Vehicles',
          licenceExpiry: '2028-12-31',
          rating: 5.0,
          status: 'verified',
          createdAt: Date.now(),
        };
        const existingDriversRaw = localStorage.getItem('mgr_transport_drivers');
        const driversList = existingDriversRaw ? JSON.parse(existingDriversRaw) : [];
        driversList.unshift(newDriver);
        localStorage.setItem('mgr_transport_drivers', JSON.stringify(driversList));
      } catch (err) {
        console.warn('Could not save driver registration data:', err);
      }
    } else {
      // Passenger registration: also register as customer in Cycly Rent customers
      try {
        const existingCustRaw = localStorage.getItem('v_rental_customers');
        const custs = existingCustRaw ? JSON.parse(existingCustRaw) : [];
        const newCust = {
          id: `CUST-${Date.now()}`,
          nicPassport: regNic.trim(),
          name: regName.trim(),
          fullName: regName.trim(),
          dob: regDob,
          phone: regPhone.trim(),
          whatsappNumber: regWhatsapp.trim() || regPhone.trim(),
          status: 'active',
          createdAt: Date.now(),
          totalRentalsCount: 0,
        };
        custs.unshift(newCust);
        localStorage.setItem('v_rental_customers', JSON.stringify(custs));
      } catch {}
    }

    setSuccessMessage(`Account registered successfully as ${regRole === 'driver' ? 'Driver / Fleet Owner' : 'Passenger'}! Logging in...`);
    setTimeout(() => {
      onLoginSuccess(newUser);
    }, 700);
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
              {view === 'login' && 'Cashier, Staff, Passenger & Driver Sign In'}
              {view === 'register' && 'Passenger & Driver Registration Portal'}
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
                  Register as Passenger or Driver
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 2. REGISTRATION VIEW: Passenger / Driver with vehicle details */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Role Radio Selection */}
            <div>
              <label className={`block text-xs font-bold mb-2 ${t.textHeading}`}>
                Register As <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition ${
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
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold block">Passenger</span>
                    <span className="text-[10px] text-slate-500">Book trips, cars, seats</span>
                  </div>
                </label>

                <label className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition ${
                  regRole === 'driver'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold ring-2 ring-emerald-500/20'
                    : `border-slate-200 dark:border-slate-700 hover:bg-slate-500/5 ${t.textMain}`
                }`}>
                  <input
                    id="radio-register-driver"
                    type="radio"
                    name="regRole"
                    value="driver"
                    checked={regRole === 'driver'}
                    onChange={() => setRegRole('driver')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold block">Driver</span>
                    <span className="text-[10px] text-slate-500">Vehicle owner & driver</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Personal Details: Name, NIC/Passport, DOB, Phone, WhatsApp */}
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

              <div className="sm:col-span-2">
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

            {/* If Driver: Vehicle Type, Vehicle Number, Driver Option (with driver, without driver, both) */}
            {regRole === 'driver' && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-emerald-500" />
                    Vehicle & Driver Details
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                    Pending Admin Approval
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Vehicle Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['car', 'van', 'bus', 'boat', 'safari'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setRegVehicleType(type)}
                        className={`py-2 px-1 text-center rounded-xl border text-[11px] font-bold capitalize transition cursor-pointer flex flex-col items-center gap-1 ${
                          regVehicleType === type
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {type === 'car' && <Car className="w-3.5 h-3.5" />}
                        {type === 'van' && <Bus className="w-3.5 h-3.5" />}
                        {type === 'bus' && <Bus className="w-3.5 h-3.5" />}
                        {type === 'boat' && <Ship className="w-3.5 h-3.5" />}
                        {type === 'safari' && <Compass className="w-3.5 h-3.5" />}
                        <span>{type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vehicle Number (Registration Number) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-reg-vehicle-number"
                    type="text"
                    required={regRole === 'driver'}
                    placeholder="e.g. WP CAD-8921 or SL-MN-BT-09"
                    value={regVehicleNumber}
                    onChange={(e) => setRegVehicleNumber(e.target.value.toUpperCase())}
                    className={`w-full px-3 py-2 text-xs rounded-xl font-mono uppercase font-medium ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Driving Service Option <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'with_driver' as const, label: 'With Driver' },
                      { id: 'without_driver' as const, label: 'Without Driver' },
                      { id: 'both' as const, label: 'Both' },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-bold cursor-pointer transition text-center ${
                          regDriverOption === opt.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="driverOption"
                          value={opt.id}
                          checked={regDriverOption === opt.id}
                          onChange={() => setRegDriverOption(opt.id)}
                          className="w-3.5 h-3.5 text-emerald-600"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
              <span>Register as {regRole === 'driver' ? 'Driver / Vehicle Owner' : 'Passenger'}</span>
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
    </div>
  );
};
