/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  PlayCircle, 
  History, 
  User, 
  Clock, 
  Calendar,
  DollarSign,
  Layers,
  Sun,
  Moon,
  Palette,
  ShieldCheck,
  LogOut,
  Bike,
  Settings as SettingsIcon,
  Users,
  TrendingUp,
  Layout,
  Grid,
  PieChart,
  BarChart3,
  Activity,
  Zap,
  MessageCircle,
  Settings as Settings2,
  Folder,
  FolderOpen,
  Image,
  Shield,
  Microscope,
  BarChart,
  Clipboard,
  CalendarDays,
} from 'lucide-react';
import { AppSettings, RentalRecord, Vehicle } from '../types';
import { formatCurrency } from '../utils/pricing';
import { DEFAULT_USER, UserAccount, setCurrentUserSession, getUserPermissions } from '../utils/auth';
import { ACCENT_COLORS, AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface DashboardStatsProps {
  activeRentals: RentalRecord[];
  allVehicles: Vehicle[];
  todayCompletedRentals: RentalRecord[];
  settings: AppSettings;
  currentUser?: UserAccount;
  themeMode: ThemeMode;
  accent: AccentColor;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  activeRentals,
  allVehicles,
  todayCompletedRentals,
  settings,
  currentUser,
  themeMode,
  accent,
}) => {
  const t = getThemeClasses(themeMode, accent);

  // Calculate summary statistics
  const totalTodayRevenue = todayCompletedRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalActiveRentals = activeRentals.length;
  const availableVehiclesCount = allVehicles.filter(v => v.status === 'available').length;
  const totalVehiclesCount = allVehicles.length;
  const completedTodayCount = todayCompletedRentals.length;
  const todayDate = new Date().toLocaleDateString(undefined, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  // Rental status distribution
  const statusCounts = {
    available: allVehicles.filter(v => v.status === 'available').length,
    rented: allVehicles.filter(v => v.status === 'rented').length,
    maintenance: allVehicles.filter(v => v.status === 'maintenance').length,
    reserved: allVehicles.filter(v => v.status === 'reserved').length,
  };

  // Top rentals by revenue
  const topRentals = [...todayCompletedRentals]
    .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
    .slice(0, 5);

  // Elapsed time helper
  const getElapsedTime = (startTime: number) => {
    const elapsed = Math.floor((Date.now() - startTime) / 60000);
    if (elapsed < 60) return `${elapsed} min`;
    const h = Math.floor(elapsed / 60);
    const m = elapsed % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className={`${t.cardBg} p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className={`w-8 h-8 text-violet-500 ${t.textHeading}`} />
            <div>
              <h2 className={`text-2xl sm:text-3xl font-bold ${t.textHeading}`}>
                Dashboard
              </h2>
              <p className={`text-sm ${t.textMuted} mt-0.5`}>
                {settings.businessName || 'Mannar Green Ride'}
              </p>
            </div>
          </div>

          {/* Quick actions or user context */}
          <div className="flex items-center gap-2">
            {/* Profile indicator */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${t.textMuted}`}>
              {(currentUser?.name || 'U').charAt(0)}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          
          {/* Total Revenue Card */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} transition-colors hover:${t.inactiveTab}`}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              <span className={`text-xs font-medium uppercase tracking-wider ${t.textMuted}`}>
                Total Revenue
              </span>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold text-emerald-600 ${t.textMain}`}>
              {formatCurrency(totalTodayRevenue, settings.currencySymbol, settings.currencyPosition)}
            </p>
            <p className={`text-xs ${t.textMuted} mt-1`}>
              Today's collections
            </p>
          </div>

          {/* Active Rentals Card */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} transition-colors hover:${t.inactiveTab}`}>
            <div className="flex items-center gap-2 mb-2">
              <PlayCircle className="w-5 h-5 text-emerald-500" />
              <span className={`text-xs font-medium uppercase tracking-wider ${t.textMuted}`}>
                Active Rentals
              </span>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold text-emerald-600 ${t.textMain}`}>
              {totalActiveRentals}
            </p>
            <p className={`text-xs ${t.textMuted} mt-1`}>
              Currently rented
            </p>
          </div>

          {/* Fleet Availability Card */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} transition-colors hover:${t.inactiveTab}`}>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-blue-500" />
              <span className={`text-xs font-medium uppercase tracking-wider ${t.textMuted}`}>
                Fleet Status
              </span>
            </div>
            <p className={`text-2xl sm:text-3xl font-bold ${t.textMain}`}>
              {availableVehiclesCount} / {totalVehiclesCount}
            </p>
            <p className={`text-xs ${t.textMuted} mt-1`}>
              Available vehicles
            </p>
          </div>

        </div>

        {/* Status Distribution Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* Available */}
          <div className={`p-3 rounded-lg ${t.cardSubtleBg} border-l-4 border-emerald-500 ${t.textMuted} transition-colors hover:${t.inactiveTab}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">${statusCounts.available} Available</span>
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </div>
          </div>

          {/* Rented */}
          <div className={`p-3 rounded-lg ${t.cardSubtleBg} border-l-4 border-emerald-400 ${t.textMuted} transition-colors hover:${t.inactiveTab}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">${statusCounts.rented} Rented</span>
              <PlayCircle className="w-3 h-3 text-emerald-400" />
            </div>
          </div>

          {/* Maintenance */}
          <div className={`p-3 rounded-lg ${t.cardSubtleBg} border-l-4 border-slate-400 ${t.textMuted} transition-colors hover:${t.inactiveTab}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">${statusCounts.maintenance} Maintenance</span>
              <Clock className="w-3 h-3 text-slate-400" />
            </div>
          </div>

          {/* Reserved */}
          <div className={`p-3 rounded-lg ${t.cardSubtleBg} border-l-4 border-amber-500 ${t.textMuted} transition-colors hover:${t.inactiveTab}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">${statusCounts.reserved} Reserved</span>
              <Calendar className="w-3 h-3 text-amber-400" />
            </div>
          </div>

        </div>

        {/* Pending Rentals Section */}
        <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} transition-colors mb-4`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-bold ${t.textHeading}`}>Pending Rentals</h3>
              <p className={`text-xs ${t.textMuted}`}>Currently active / out on rent</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              totalActiveRentals > 0 ? 'bg-emerald-500/15 text-emerald-500' : `${t.cardSubtleBg} ${t.textMuted}`
            }`}>
              {totalActiveRentals} active
            </span>
          </div>

          {totalActiveRentals > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activeRentals.map((rental, index) => (
                <div
                  key={rental.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${t.divider} ${themeMode === 'dark' ? 'bg-slate-800/60' : 'bg-white/80'}`}
                >
                  <span className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center text-xs font-bold text-emerald-500 shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold truncate ${t.textHeading}`}>
                        {rental.vehicleSerialNumber}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${t.badge}`}>
                        {rental.vehicleTypeName}
                      </span>
                    </div>
                    <p className={`text-[11px] ${t.textMuted} truncate mt-0.5`}>
                      {rental.customerName || 'Walk-in Customer'}
                      {rental.cashierName ? ` · Cashier: ${rental.cashierName}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getElapsedTime(rental.startTime)}
                    </p>
                    <p className={`text-[10px] ${t.textMuted}`}>
                      #{rental.rentalNumber}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${t.textMuted} text-center py-6`}>
              No active rentals at the moment
            </p>
          )}
        </div>

        {/* Today's Completed Rentals Section */}
        <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} transition-colors`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-medium ${t.textHeading}`}>Today's Completed Rentals</h3>
              <p className={`text-xs ${t.textMuted}`}>{todayDate}</p>
            </div>
            <span className={`text-xs font-bold ${t.textMain}`}>
              {completedTodayCount} rentals
            </span>
          </div>

          {completedTodayCount > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {topRentals.map((rental, index) => (
                <div key={rental.id} className={`flex items-center gap-3 px-2 py-1 rounded ${t.divider}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${t.textMuted}`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${t.textHeading}`}>
                      {rental.vehicleTypeName || rental.vehicleSerialNumber || 'Vehicle'}
                    </p>
                    <p className={`text-[10px] ${t.textMuted} truncate`}>
                      {rental.customerName || 'Customer'}
                      {rental.cashierName ? ` · ${rental.cashierName}` : ''}
                    </p>
                  </div>
                  <span className={`text-sm font-bold text-emerald-600 ${t.textMain}`}>
                    {formatCurrency(rental.totalAmount || 0, settings.currencySymbol, settings.currencyPosition)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${t.textMuted} text-center py-4`}>
              No completed rentals yet today
            </p>
          )}
        </div>

      </div>
    </div>
  );
};