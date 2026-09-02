/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Bike, 
  Settings as SettingsIcon, 
  History, 
  PlayCircle, 
  User, 
  Clock, 
  Calendar,
  DollarSign, 
  Layers,
  Sun,
  Moon,
  Palette,
  ChevronDown,
  ShieldCheck,
  LogOut,
  UserCheck,
  LogIn
} from 'lucide-react';
import { AppSettings, RentalRecord, Vehicle } from '../types';
import { formatCurrency } from '../utils/pricing';
import { DEFAULT_USER, UserAccount, setCurrentUserSession, getUserPermissions } from '../utils/auth';
import { ACCENT_COLORS, AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface NavbarProps {
  activeTab: 'rentals' | 'history' | 'users' | 'settings';
  setActiveTab: (tab: 'rentals' | 'history' | 'users' | 'settings') => void;
  activeRentals: RentalRecord[];
  allVehicles: Vehicle[];
  todayCompletedRentals: RentalRecord[];
  settings: AppSettings;
  currentUser?: UserAccount;
  onOpenAuthModal?: () => void;
  onOpenCashierModal?: () => void;
  onOpenUserRoles?: () => void;
  onLogout?: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  accent: AccentColor;
  onChangeAccent?: (accent: AccentColor) => void;
  onSelectAccent?: (accent: AccentColor) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeRentals,
  allVehicles,
  todayCompletedRentals,
  settings,
  currentUser,
  onOpenAuthModal,
  onOpenCashierModal,
  onOpenUserRoles,
  onLogout,
  themeMode,
  onToggleTheme,
  accent,
  onChangeAccent,
  onSelectAccent,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const activeUser: UserAccount = currentUser && currentUser.email ? currentUser : DEFAULT_USER;
  const isAdmin = activeUser.role === 'admin' || activeUser.email.toLowerCase() === DEFAULT_USER.email.toLowerCase();
  const userPerms = getUserPermissions(activeUser);
  const handleOpenAuth = onOpenAuthModal || onOpenCashierModal || (() => {});
  const handleAccentChange = onSelectAccent || onChangeAccent || (() => {});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalTodayRevenue = todayCompletedRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const availableVehiclesCount = allVehicles.filter(v => v.status === 'available').length;
  const t = getThemeClasses(themeMode, accent);

  return (
    <header className={`${t.headerBg} backdrop-blur sticky top-0 z-40 transition-colors`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          
          {/* Logo & Business Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg text-white shrink-0">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold text-base sm:text-lg tracking-tight leading-none ${t.textHeading}`}>
                  {settings.businessName || 'Mannar Green Ride'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.badge}`}>
                  POS v2.4
                </span>
              </div>
              <p className={`text-xs ${t.textMuted} hidden sm:block mt-0.5`}>
                Bicycle & Motorcycle Billing Desk
              </p>
            </div>
          </div>

          {/* Quick Real-Time Metrics Bar */}
          <div className={`hidden lg:flex items-center gap-4 ${t.cardSubtleBg} px-4 py-1.5 rounded-xl border`}>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className={t.textMuted}>Active Rented:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${t.badge}`}>
                {activeRentals.length}
              </span>
            </div>
            <div className={`w-px h-4 ${t.divider} border-r`} />
            <div className="flex items-center gap-2 text-xs">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span className={t.textMuted}>Fleet Available:</span>
              <span className={`font-semibold ${t.textMain}`}>
                {availableVehiclesCount} / {allVehicles.length}
              </span>
            </div>
            <div className={`w-px h-4 ${t.divider} border-r`} />
            <div className="flex items-center gap-2 text-xs">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span className={t.textMuted}>Today Revenue:</span>
              <span className="font-bold text-emerald-500">
                {formatCurrency(totalTodayRevenue, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>
          </div>

          {/* Controls: Date Calendar, Real-time Clock, Color Accent, Dark/Light Mode, User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Calendar Date Badge */}
            <div className={`hidden lg:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${t.cardSubtleBg} ${t.textHeading}`}>
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>{currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>

            {/* Real-time Clock */}
            <div className={`hidden md:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg border ${t.cardSubtleBg} ${t.textMuted}`}>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>

            {/* Global Color Accent Switcher Button */}
            <div className="relative">
              <button
                id="btn-theme-palette"
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${t.inactiveTab}`}
                title="Change Global Color Theme Accent"
              >
                <Palette className="w-4 h-4" />
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ACCENT_COLORS.find(c => c.id === accent)?.hex || '#10b981' }} />
              </button>

              {showColorPicker && (
                <div 
                  className={`absolute right-0 mt-2 w-48 p-2 rounded-xl shadow-xl z-50 border ${t.modalBg}`}
                  onMouseLeave={() => setShowColorPicker(false)}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${t.textMuted}`}>
                    Global Accent Color
                  </div>
                  <div className="space-y-1 mt-1">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          handleAccentChange(c.id);
                          setShowColorPicker(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
                          accent === c.id 
                            ? `${t.badge} font-bold` 
                            : `hover:bg-slate-500/10 ${t.textMain}`
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: c.hex }} />
                          <span>{c.name}</span>
                        </div>
                        {accent === c.id && <span className="text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dark / Light Mode Switch Toggle */}
            <button
              id="btn-theme-toggle"
              type="button"
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer ${t.inactiveTab}`}
              title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Logged-in User Profile Dropdown */}
            <div className="relative">
              <button
                id="btn-user-auth"
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${t.inactiveTab}`}
                title={`Logged in as ${activeUser.email}. Click to view account options.`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${
                  activeUser.role === 'admin' ? 'bg-emerald-600' : 'bg-blue-600'
                }`}>
                  {(activeUser.name || 'User').charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1">
                    <span className={`font-bold leading-none truncate max-w-[90px] ${t.textHeading}`}>
                      {activeUser.name || 'User'}
                    </span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-500 uppercase font-semibold">
                      {activeUser.role || 'user'}
                    </span>
                  </div>
                  <p className={`text-[10px] ${t.textMuted} truncate max-w-[110px] leading-tight font-mono`}>
                    {activeUser.email}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 ${t.textMuted}`} />
              </button>

              {showUserMenu && (
                <div 
                  className={`absolute right-0 mt-2 w-56 p-2 rounded-xl shadow-2xl z-50 border ${t.modalBg} space-y-1`}
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <div className={`px-3 py-2 border-b ${t.divider}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${t.textHeading}`}>{activeUser.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-500 font-bold uppercase border border-emerald-500/30">
                        {activeUser.role}
                      </span>
                    </div>
                    <p className={`text-[10px] font-mono ${t.textMuted} truncate mt-0.5`}>
                      {activeUser.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      if (onLogout) {
                        onLogout();
                      } else {
                        handleOpenAuth();
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg hover:bg-slate-500/10 ${t.textMain} transition cursor-pointer text-left`}
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Navigation Tabs with DISTINCT SEPARATING BORDERS for Inactive Tabs */}
        <div className={`flex items-center space-x-2 border-t ${t.divider} pt-2.5 pb-2.5 overflow-x-auto`}>
          
          {/* Tab 1: Rental Desk */}
          {(userPerms.accessRentals || isAdmin) && (
            <button
              id="tab-rentals"
              type="button"
              onClick={() => setActiveTab('rentals')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rentals'
                  ? t.activeTab
                  : t.inactiveTab
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>Rental Desk</span>
              {activeRentals.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold shadow-xs ${
                  activeTab === 'rentals' ? 'bg-black/30 text-white' : t.badge
                }`}>
                  {activeRentals.length}
                </span>
              )}
            </button>
          )}

          {/* Tab 2: Daily History & Settlement */}
          {(userPerms.accessHistory || isAdmin) && (
            <button
              id="tab-history"
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'history'
                  ? t.activeTab
                  : t.inactiveTab
              }`}
            >
              <History className="w-4 h-4" />
              <span>Daily History & Settlement</span>
              {todayCompletedRentals.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold shadow-xs ${
                  activeTab === 'history' ? 'bg-black/30 text-white' : t.badge
                }`}>
                  {todayCompletedRentals.length}
                </span>
              )}
            </button>
          )}

          {/* Tab 4: Rates & Inventory Settings */}
          {(userPerms.accessSettings || isAdmin) && (
            <button
              id="tab-settings"
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'settings'
                  ? t.activeTab
                  : t.inactiveTab
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Rates & Inventory Settings</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
