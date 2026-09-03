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
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import { AppSettings, RentalRecord, Vehicle } from '../types';
import { DEFAULT_USER, UserAccount, getUserPermissions } from '../utils/auth';
import { ACCENT_COLORS, AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface NavbarProps {
  activeTab: 'rentals' | 'history' | 'users' | 'settings' | 'income' | 'dashboard';
  setActiveTab: (tab: 'rentals' | 'history' | 'users' | 'settings' | 'income' | 'dashboard') => void;
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
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const activeUser: UserAccount = currentUser && currentUser.email ? currentUser : DEFAULT_USER;
  const isAdmin = activeUser.role === 'admin' || activeUser.email.toLowerCase() === DEFAULT_USER.email.toLowerCase();
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

  const sidebarBg = themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inactiveItemClass = themeMode === 'dark'
    ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';

  return (
    <>
      {/* TOP NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 border-b transition-colors ${t.headerBg}`}
        style={{ height: '4rem' }}
      >
        {/* Left: Sidebar toggle + Logo */}
        <div className="flex items-center gap-3">
          <button
            id="btn-sidebar-toggle"
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${t.inactiveTab}`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-xl text-white shadow-md"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
            >
              <Bike className="w-4 h-4" />
            </div>
            <span className={`font-bold text-base sm:text-lg tracking-tight ${t.textHeading}`}>
              {settings.businessName || (settings as any).shopName || 'Cycly Rent'}
            </span>
          </div>
        </div>

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

          {/* Theme Toggle */}
          <button
            id="btn-theme-toggle"
            type="button"
            onClick={onToggleTheme}
            className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer ${t.inactiveTab}`}
            title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* Profile Avatar */}
          <div className="relative">
            <button
              id="btn-profile-avatar"
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex flex-col items-center gap-0.5 cursor-pointer group"
              title={activeUser.name}
            >
              <span className={`text-[10px] font-semibold ${t.textMuted} hidden sm:block`}>Profile</span>
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
        <div className={`flex items-center justify-between px-3 py-2.5 border-b shrink-0 ${t.divider}`}>
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center gap-1">
                <button
                  id="btn-sidebar-collapse"
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${inactiveItemClass}`}
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className={`text-xs font-semibold ${t.textMuted}`}>Side Menu</span>
              </div>
              <button
                id="btn-sidebar-menu-icon"
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${inactiveItemClass}`}
                title="Collapse sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              id="btn-sidebar-expand"
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className={`mx-auto p-1.5 rounded-lg transition cursor-pointer ${inactiveItemClass}`}
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
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
            {navItems.filter(item => item.show).map(item => {
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
            })}
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

        {/* Bottom user strip */}
        {!sidebarCollapsed && (
          <div className={`shrink-0 border-t px-3 py-3 ${t.divider}`}>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
              >
                {avatarInitials}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-semibold truncate ${t.textMain}`}>{activeUser.name}</p>
                <p className={`text-[10px] truncate ${t.textMuted}`}>{activeUser.role}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
