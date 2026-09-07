/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Bike,
  Settings as SettingsIcon,
  History,
  PlayCircle,
  User,
  Clock,
  Calendar,
  DollarSign,
  Sun,
  Moon,
  Palette,
  ChevronDown,
  ShieldCheck,
  LogOut,
  Menu,
  Sparkles,
  ChevronUp,
  Users,
  MessageSquare,
  Car,
  Compass,
  FileText,
  Search,
} from 'lucide-react';
import { AppSettings, RentalRecord, Vehicle } from '../types';
import { DEFAULT_USER, UserAccount, getUserPermissions, getMGRPersona } from '../utils/auth';
import { ACCENT_COLORS, AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { MGRTabType } from '../types/mgrBooking';

export type NavTabType = 'rentals' | 'history' | 'users' | 'settings' | 'income' | 'dashboard' | 'customers' | 'messages';

interface NavbarProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
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
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  systemMode?: 'bicycle_pos' | 'mgr_booking';
  onToggleSystemMode?: (mode: 'bicycle_pos' | 'mgr_booking') => void;
  mgrActiveTab?: MGRTabType;
  onSelectMGRTab?: (tab: MGRTabType) => void;
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
  onLogout,
  themeMode,
  onToggleTheme,
  accent,
  onChangeAccent,
  onSelectAccent,
  sidebarCollapsed,
  setSidebarCollapsed,
  systemMode = 'bicycle_pos',
  onToggleSystemMode,
  mgrActiveTab = 'mgr-search',
  onSelectMGRTab,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const activeUser: UserAccount = currentUser && currentUser.email ? currentUser : DEFAULT_USER;
  const isAdmin = activeUser.role === 'admin' || activeUser.email.toLowerCase() === DEFAULT_USER.email.toLowerCase();
  const persona = getMGRPersona(activeUser);
  const isPassenger = persona === 'passenger';
  const isOwner = persona === 'owner';
  const isAdminUser = persona === 'admin' || isAdmin;
  const userPerms = getUserPermissions(activeUser);
  const handleOpenAuth = onOpenAuthModal || onOpenCashierModal || (() => {});
  const handleAccentChange = onSelectAccent || onChangeAccent || (() => {});

  const t = getThemeClasses(themeMode, accent);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const updateScrollState = () => {
    const el = navScrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  };

  useEffect(() => {
    const el = navScrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [sidebarCollapsed]);

  const scrollNav = (dir: 'up' | 'down') => {
    const el = navScrollRef.current;
    if (!el) return;
    el.scrollBy({ top: dir === 'up' ? -80 : 80, behavior: 'smooth' });
  };

  const totalTodayRevenue = todayCompletedRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const availableVehiclesCount = allVehicles.filter(v => v.status === 'available').length;

  const sidebarW = sidebarCollapsed ? '4rem' : '15rem';

  const avatarInitials = activeUser.name
    ? activeUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AA';

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: <Sparkles className="w-4 h-4 shrink-0" />,
      show: userPerms.accessDashboard ?? (userPerms.accessSettings || isAdmin),
      badge: null as number | null,
      activeClass: 'bg-violet-500/20 text-violet-400 border border-violet-500/40',
    },
    {
      id: 'rentals' as const,
      label: 'Rental Desk',
      icon: <PlayCircle className="w-4 h-4 shrink-0" />,
      show: userPerms.accessRentals || isAdmin,
      badge: activeRentals.length > 0 ? activeRentals.length : null,
      activeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
    },
    {
      id: 'customers' as const,
      label: 'Customers',
      icon: <Users className="w-4 h-4 shrink-0" />,
      show: userPerms.accessCustomers ?? (userPerms.accessRentals || isAdmin),
      badge: null as number | null,
      activeClass: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40',
    },
    {
      id: 'messages' as const,
      label: 'Messages',
      icon: <MessageSquare className="w-4 h-4 shrink-0" />,
      show: userPerms.accessMessages ?? (userPerms.accessCustomers ?? (userPerms.accessRentals || isAdmin)),
      badge: null as number | null,
      activeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
    },
    {
      id: 'history' as const,
      label: 'History',
      icon: <History className="w-4 h-4 shrink-0" />,
      show: userPerms.accessHistory || isAdmin,
      badge: todayCompletedRentals.length > 0 ? todayCompletedRentals.length : null,
      activeClass: 'bg-teal-500/20 text-teal-400 border border-teal-500/40',
    },
    {
      id: 'users' as const,
      label: 'Users & Role',
      icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
      show: userPerms.accessUsers || isAdmin,
      badge: null as number | null,
      activeClass: 'bg-purple-500/20 text-purple-400 border border-purple-500/40',
    },
    {
      id: 'settings' as const,
      label: 'Rates & Inventory',
      icon: <SettingsIcon className="w-4 h-4 shrink-0" />,
      show: userPerms.accessSettings || isAdmin,
      badge: null as number | null,
      activeClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
    },
    {
      id: 'income' as const,
      label: 'Income & Expenses',
      icon: <DollarSign className="w-4 h-4 shrink-0" />,
      show: userPerms.accessIncome ?? (userPerms.accessSettings || isAdmin),
      badge: null as number | null,
      activeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
    },
  ];

  // MGR Transport Marketplace Dedicated Side Menu Items with Role-Based Access Control
  const mgrNavItems = [
    {
      id: 'mgr-search' as const,
      label: 'Find Transport',
      icon: <Search className="w-4 h-4 shrink-0" />,
      badge: null as number | null,
      show: true,
      activeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shadow-xs',
    },
    {
      id: 'mgr-bookings' as const,
      label: isPassenger ? 'My Bookings' : 'Bookings & Seats',
      icon: <Calendar className="w-4 h-4 shrink-0" />,
      badge: null as number | null,
      show: true,
      activeClass: 'bg-cyan-50 text-cyan-800 border border-cyan-300 font-bold shadow-xs',
    },
    {
      id: 'mgr-fleet' as const,
      label: 'Fleet & Boats',
      icon: <Car className="w-4 h-4 shrink-0" />,
      badge: null as number | null,
      show: !isPassenger, // Blocked for Passenger (Passenger no need Fleet/Boats)
      activeClass: 'bg-teal-50 text-teal-800 border border-teal-300 font-bold shadow-xs',
    },
    {
      id: 'mgr-routes' as const,
      label: 'Routes & Fares',
      icon: <Compass className="w-4 h-4 shrink-0" />,
      badge: null as number | null,
      show: isAdminUser, // Blocked for Passenger & Owner (Admin only)
      activeClass: 'bg-blue-50 text-blue-800 border border-blue-300 font-bold shadow-xs',
    },
    {
      id: 'mgr-owners' as const,
      label: isOwner ? 'Captains & Drivers' : 'Owners & Drivers',
      icon: <Users className="w-4 h-4 shrink-0" />,
      badge: null as number | null,
      show: !isPassenger, // Blocked for Passenger (Passenger no need Owners/Drivers)
      activeClass: 'bg-purple-50 text-purple-800 border border-purple-300 font-bold shadow-xs',
    },
    {
      id: 'mgr-requests' as const,
      label: isPassenger ? 'My Trip Requests' : (isOwner ? 'Trip Bidding Board' : 'Vehicle Requests'),
      icon: <FileText className="w-4 h-4 shrink-0" />,
      badge: null as number | null,
      show: true,
      activeClass: 'bg-amber-50 text-amber-800 border border-amber-300 font-bold shadow-xs',
    },
    {
      id: 'mgr-admin' as const,
      label: 'Marketplace Admin',
      icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
      badge: null as number | null,
      show: isAdminUser, // Blocked for Passenger & Owner (Admin only)
      activeClass: 'bg-rose-50 text-rose-800 border border-rose-300 font-bold shadow-xs',
    },
  ];

  const sidebarBg = systemMode === 'mgr_booking'
    ? 'bg-white border-slate-200'
    : (themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200');

  const inactiveItemClass = systemMode === 'mgr_booking'
    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    : (themeMode === 'dark'
        ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900');

  return (
    <>
      {/* TOP NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 border-b transition-colors ${
          systemMode === 'mgr_booking'
            ? 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-900'
            : t.headerBg
        }`}
        style={{ height: '4rem' }}
      >
        {/* Left: Menu Toggle + Logo */}
        <div className="flex items-center gap-2.5">
          <button
            id="btn-navbar-menu-toggle"
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
              systemMode === 'mgr_booking' ? 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50' : t.inactiveTab
            } hover:scale-105`}
            title={sidebarCollapsed ? 'Expand side menu' : 'Collapse side menu'}
            aria-label={sidebarCollapsed ? 'Expand side menu' : 'Collapse side menu'}
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5">
            {settings.companyLogo ? (
              <img
                src={settings.companyLogo}
                alt="Company Logo"
                className="w-8 h-8 rounded-xl object-cover shadow-md"
              />
            ) : (
              <div
                className="flex items-center justify-center w-8 h-8 rounded-xl text-white shadow-md"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
              >
                <Bike className="w-4 h-4" />
              </div>
            )}
            <span className={`font-bold text-base sm:text-lg tracking-tight ${systemMode === 'mgr_booking' ? 'text-slate-900' : t.textHeading}`}>
              {settings.businessName || (settings as any).shopName || 'Cycly Rent'}
            </span>
          </div>
        </div>

        {/* Center: Module Switcher (Bicycle POS <-> MGR Transport Booking) */}
        {onToggleSystemMode && (
          !isPassenger && !isOwner ? (
            <div className={`flex items-center p-1 rounded-xl shadow-inner border ${
              systemMode === 'mgr_booking'
                ? 'bg-slate-100 border-slate-300'
                : 'bg-slate-800/80 border-slate-700/80'
            }`}>
              <button
                type="button"
                onClick={() => onToggleSystemMode('bicycle_pos')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  systemMode === 'bicycle_pos'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : (systemMode === 'mgr_booking' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
                }`}
              >
                <Bike className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bicycle POS</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleSystemMode('mgr_booking')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  systemMode === 'mgr_booking'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">MGR Transport</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-xs">
              <Car className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-xs font-bold tracking-tight">MGR Transport</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 border border-emerald-300 uppercase tracking-wide">
                {isPassenger ? 'Passenger' : 'Owner'}
              </span>
            </div>
          )
        )}

        {/* Right: Controls + Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Date */}
          <div className={`hidden lg:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${t.cardSubtleBg} ${t.textHeading}`}>
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span>{currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          {/* Clock */}
          <div className={`hidden md:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg border ${t.cardSubtleBg} ${t.textMuted}`}>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>

          {/* Accent Picker */}
          <div className="relative">
            <button
              id="btn-theme-palette"
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${t.inactiveTab}`}
              title="Change Global Color Theme Accent"
            >
              <Palette className="w-4 h-4" />
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ACCENT_COLORS.find(c => c.id === accent)?.hex || '#10b981' }}
              />
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
                      onClick={() => { handleAccentChange(c.id); setShowColorPicker(false); }}
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



          {/* Profile Avatar */}
          <div className="relative">
            <button
              id="btn-profile-avatar"
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-0.5 cursor-pointer group"
              title={activeUser.name}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-offset-1 transition-all group-hover:scale-105"
                style={{
                  background: activeUser.avatarColor === 'blue'
                    ? 'linear-gradient(135deg,#3b82f6,#2563eb)'
                    : activeUser.avatarColor === 'violet'
                    ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)'
                    : activeUser.avatarColor === 'amber'
                    ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                    : activeUser.avatarColor === 'rose'
                    ? 'linear-gradient(135deg,#f43f5e,#e11d48)'
                    : 'linear-gradient(135deg,#10b981,#059669)',
                }}
              >
                {avatarInitials}
              </div>
            </button>
            {showUserMenu && (
              <div
                className={`absolute right-0 mt-2 w-52 rounded-xl shadow-2xl z-50 border overflow-hidden ${t.modalBg}`}
                onMouseLeave={() => setShowUserMenu(false)}
              >
                <div className={`px-4 py-3 border-b ${t.divider}`}>
                  <p className={`text-sm font-bold ${t.textHeading}`}>{activeUser.name}</p>
                  <p className={`text-xs ${t.textMuted}`}>{activeUser.email}</p>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.badge}`}>
                    {activeUser.role}
                  </span>
                </div>
                <div className="p-1">
                  {/* Dark / Light Mode Toggle */}
                  <button
                    type="button"
                    onClick={() => { onToggleTheme(); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition cursor-pointer ${t.textMain} hover:bg-slate-500/10`}
                  >
                    {themeMode === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
                    {themeMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleOpenAuth(); setShowUserMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition cursor-pointer ${t.textMain} hover:bg-slate-500/10`}
                  >
                    <User className="w-3.5 h-3.5" />
                    My Account
                  </button>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => { onLogout(); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* LEFT SIDEBAR */}
      <aside
        className={`fixed left-0 bottom-0 z-40 flex flex-col border-r transition-all duration-300 ease-in-out ${sidebarBg}`}
        style={{ top: '4rem', width: sidebarW }}
      >
        {/* Sidebar header */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 border-b shrink-0 ${
          systemMode === 'mgr_booking' ? 'border-slate-200' : t.divider
        }`}>
          {!sidebarCollapsed && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              systemMode === 'mgr_booking'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {systemMode === 'mgr_booking' ? 'MGR Transport' : 'Bicycle Rental POS'}
            </span>
          )}
          <button
            id="btn-sidebar-toggle"
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-1.5 rounded-lg transition cursor-pointer ${inactiveItemClass} hover:scale-105`}
            title={sidebarCollapsed ? 'Expand side menu' : 'Collapse side menu'}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Scroll up */}
        {canScrollUp && (
          <button
            type="button"
            onClick={() => scrollNav('up')}
            className={`flex items-center justify-center py-1.5 shrink-0 transition cursor-pointer ${inactiveItemClass}`}
            aria-label="Scroll nav up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        )}

        {/* Nav items */}
        <div
          ref={navScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden py-2"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className={`flex flex-col gap-1 ${sidebarCollapsed ? 'px-1.5' : 'px-2'}`}>
            {systemMode === 'mgr_booking' ? (
              /* MGR Transport Marketplace Nav Items */
              mgrNavItems.filter(item => item.show).map(item => {
                const isActive = mgrActiveTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`tab-${item.id}`}
                    type="button"
                    onClick={() => onSelectMGRTab && onSelectMGRTab(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`
                      relative flex items-center gap-2.5 rounded-xl transition-all cursor-pointer
                      ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                      ${isActive ? item.activeClass : inactiveItemClass}
                      text-xs sm:text-sm font-semibold whitespace-nowrap
                    `}
                  >
                    {item.icon}
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })
            ) : (
              /* Bicycle Rental POS Nav Items (Existing untouched items) */
              navItems.filter(item => item.show).map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`tab-${item.id}`}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`
                      relative flex items-center gap-2.5 rounded-xl transition-all cursor-pointer
                      ${sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                      ${isActive ? item.activeClass : inactiveItemClass}
                      text-xs sm:text-sm font-semibold whitespace-nowrap
                    `}
                  >
                    {item.icon}
                    {!sidebarCollapsed && <span>{item.label}</span>}
                    {!sidebarCollapsed && item.badge && (
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold ${t.badge}`}>
                        {item.badge}
                      </span>
                    )}
                    {sidebarCollapsed && item.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Scroll down */}
        {canScrollDown && (
          <button
            type="button"
            onClick={() => scrollNav('down')}
            className={`flex items-center justify-center py-1.5 shrink-0 transition cursor-pointer ${inactiveItemClass}`}
            aria-label="Scroll nav down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}


      </aside>
    </>
  );
};
