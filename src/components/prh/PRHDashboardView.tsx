import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Clock,
  DollarSign,
  FileText,
  HardHat,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  PRHCustomer,
  PRHEquipment,
  PRHFinanceTransaction,
  PRHRental,
  PRHTabType,
} from '../../types/prhTypes';
import { prhTheme } from './prhTheme';

interface PRHDashboardViewProps {
  rentals: PRHRental[];
  customers: PRHCustomer[];
  equipment: PRHEquipment[];
  finance: PRHFinanceTransaction[];
  onNavigateTab: (tab: PRHTabType) => void;
}

export const PRHDashboardView: React.FC<PRHDashboardViewProps> = ({
  rentals,
  customers,
  equipment,
  finance,
  onNavigateTab,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Calculated Stats
  const activeRentals = rentals.filter((r) => r.status === 'active' || r.status === 'partially_returned');
  const overdueRentals = rentals.filter((r) => {
    if (r.status !== 'active' && r.status !== 'partially_returned') return false;
    return r.expectedReturnDate < todayStr;
  });
  const todayNewRentals = rentals.filter((r) => r.startDate === todayStr);

  const totalEquipmentCount = equipment.reduce((acc, eq) => acc + eq.totalQty, 0);
  const availableEquipmentCount = equipment.reduce((acc, eq) => acc + eq.availableQty, 0);
  const rentedEquipmentCount = equipment.reduce((acc, eq) => acc + eq.rentedQty, 0);
  const maintenanceCount = equipment.reduce((acc, eq) => acc + eq.maintenanceQty + eq.damagedQty, 0);

  const securityDepositsHeld = rentals
    .filter((r) => r.status === 'active' || r.status === 'partially_returned')
    .reduce((acc, r) => acc + (r.securityDepositTotal || 0), 0);

  // Financial calculations
  const totalIncome = finance
    .filter((f) => f.type === 'income')
    .reduce((acc, f) => acc + f.amount, 0);
  const totalExpenses = finance
    .filter((f) => f.type === 'expense')
    .reduce((acc, f) => acc + f.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const todayIncome = finance
    .filter((f) => f.type === 'income' && f.date === todayStr)
    .reduce((acc, f) => acc + f.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 dark:from-blue-950 dark:via-slate-900 dark:to-indigo-950 border border-blue-600/30 dark:border-slate-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 dark:bg-white/10 text-white text-xs font-bold uppercase tracking-wider mb-2">
            <HardHat className="w-3.5 h-3.5 text-blue-200" />
            Pesalai Rental Hub – PRH
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Construction Equipment Rental Dashboard
          </h1>
          <p className="text-blue-100 dark:text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
            Day-wise scaffolding, iron jacks, safety plates, welding machines & construction rental operations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-blue-200 dark:text-slate-400 uppercase font-semibold">Today's Collections</div>
            <div className="text-xl font-black text-white font-mono">Rs. {todayIncome.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Critical Alerts Banner (if overdue) */}
      {overdueRentals.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 text-rose-900 dark:text-rose-200 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-rose-950 dark:text-rose-100">
                {overdueRentals.length} Construction Rental(s) Overdue for Return
              </div>
              <div className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                Expected return date has elapsed. Review active sites and dispatch return notices.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('prh-active-rentals')}
            className={prhTheme.btnDanger}
          >
            Review Overdue
          </button>
        </div>
      )}

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Rentals */}
        <div
          onClick={() => onNavigateTab('prh-active-rentals')}
          className={`${prhTheme.card} p-4.5 hover:border-blue-500 transition cursor-pointer group`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Active Rentals</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            {activeRentals.length}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">{todayNewRentals.length} rented today</span>
            <span>•</span>
            <span className={overdueRentals.length > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}>
              {overdueRentals.length} overdue
            </span>
          </div>
        </div>

        {/* Equipment Availability */}
        <div
          onClick={() => onNavigateTab('prh-inventory')}
          className={`${prhTheme.card} p-4.5 hover:border-emerald-500 transition cursor-pointer group`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Available / Total Units</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            {availableEquipmentCount} <span className="text-sm font-normal text-slate-400">/ {totalEquipmentCount}</span>
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{rentedEquipmentCount} on site</span>
            <span>•</span>
            <span>{maintenanceCount} repair</span>
          </div>
        </div>

        {/* Security Deposits Held */}
        <div
          onClick={() => onNavigateTab('prh-payments')}
          className={`${prhTheme.card} p-4.5 hover:border-blue-500 transition cursor-pointer group`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Deposits Held</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 transition">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            Rs. {securityDepositsHeld.toLocaleString()}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Refundable upon return inspection
          </div>
        </div>

        {/* PRH Net Profit */}
        <div
          onClick={() => onNavigateTab('prh-finance')}
          className={`${prhTheme.card} p-4.5 hover:border-emerald-500 transition cursor-pointer group`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>PRH Net Profit (P&L)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl sm:text-3xl font-extrabold font-mono ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            Rs. {netProfit.toLocaleString()}
          </div>
          <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Rev: Rs. {totalIncome.toLocaleString()}</span>
            <span>•</span>
            <span>Exp: Rs. {totalExpenses.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Operations Quick Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Rentals Snapshot */}
        <div className={`lg:col-span-2 ${prhTheme.card} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Active Site Rentals
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Contractors and private builders with current equipment on site</p>
            </div>
            <button
              onClick={() => onNavigateTab('prh-active-rentals')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline transition"
            >
              View All ({activeRentals.length}) →
            </button>
          </div>

          {activeRentals.length === 0 ? (
            <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
              No active equipment rentals at the moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={prhTheme.tableHeader}>
                    <th className="py-2.5 px-3">Rental #</th>
                    <th className="py-2.5 px-3">Customer / Site</th>
                    <th className="py-2.5 px-3">Start Date</th>
                    <th className="py-2.5 px-3">Expected Return</th>
                    <th className="py-2.5 px-3 text-right">Rental Total</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeRentals.slice(0, 5).map((rental) => {
                    const isOverdue = rental.expectedReturnDate < todayStr;
                    return (
                      <tr key={rental.id} className={prhTheme.tableRow}>
                        <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {rental.rentalNumber}
                        </td>
                        <td className="py-3 px-3 break-words whitespace-normal max-w-xs">
                          <div className="font-bold text-slate-900 dark:text-white">{rental.customerName}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 break-words">{rental.siteAddress}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                          {rental.startDate}
                        </td>
                        <td className="py-3 px-3 font-mono whitespace-nowrap">
                          <span className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                            {rental.expectedReturnDate}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          Rs. {rental.totalRentalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isOverdue ? (
                            <span className={prhTheme.badgeDanger}>
                              OVERDUE
                            </span>
                          ) : (
                            <span className={prhTheme.badgeSuccess}>
                              ACTIVE
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Equipment Inventory Availability */}
        <div className={`${prhTheme.card} p-5 flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Equipment Rates & Stock
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Scaffolding & rental tools status</p>
              </div>
              <button
                onClick={() => onNavigateTab('prh-equipment')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline transition"
              >
                Rates →
              </button>
            </div>

            <div className="space-y-3">
              {equipment.slice(0, 5).map((eq) => {
                const availPct = Math.round((eq.availableQty / (eq.totalQty || 1)) * 100);
                return (
                  <div key={eq.id} className={`${prhTheme.cardSubtle} p-3 text-xs`}>
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                      <span className="truncate max-w-[170px]">{eq.name}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-mono">Rs. {eq.dailyRate}/day</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <span>Available: <strong className="text-emerald-600 dark:text-emerald-400">{eq.availableQty}</strong> {eq.uom}</span>
                      <span>Total: {eq.totalQty}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          availPct > 50 ? 'bg-emerald-500' : availPct > 20 ? 'bg-blue-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${availPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onNavigateTab('prh-inventory')}
              className={prhTheme.btnSecondary}
            >
              <Boxes className="w-4 h-4" />
              View Full Live Inventory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
