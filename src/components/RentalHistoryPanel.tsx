/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Receipt, 
  Search, 
  Calendar, 
  DollarSign, 
  Download, 
  Printer, 
  Bike, 
  Clock, 
  User, 
  Phone,
  IdCard, 
  Filter, 
  Eye, 
  X,
  CreditCard,
  Banknote,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Lock,
  AlertTriangle,
  ShieldCheck,
  Plus,
  Minus,
  Wallet,
  Tag,
  Coins,
  Edit2,
} from 'lucide-react';
import { AppSettings, RentalRecord, Vehicle } from '../types';
import { VehicleIcon } from './VehicleIcon';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime, 
  formatTime,
  computeRentalFinance,
  RentalFinanceStructure,
} from '../utils/pricing';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { DEFAULT_USER, UserAccount } from '../utils/auth';
import { HistoricalRentalModal } from './HistoricalRentalModal';

interface RentalHistoryPanelProps {
  completedRentals: RentalRecord[];
  settings: AppSettings;
  currentUser?: UserAccount;
  vehicles?: Vehicle[];
  onAddRental?: (rental: RentalRecord) => void;
  onUpdateRental?: (rental: RentalRecord) => void;
  onDeleteRental?: (id: string) => void;
  themeMode?: ThemeMode;
  accent?: AccentColor;
}

type SortKey =
  | 'rentalNumber'
  | 'vehicleTypeName'
  | 'vehicleSerialNumber'
  | 'customerName'
  | 'startTime'
  | 'endTime'
  | 'breakdown.totalMinutes'
  | 'rentalAmount'
  | 'damageAmount'
  | 'grossRentalAmount'
  | 'depositAmount'
  | 'discountAmount'
  | 'balanceAmount'
  | 'totalAmount'
  | 'paymentMethod';

type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

export function getRentalCollectedAmount(rental: RentalRecord): number {
  return computeRentalFinance(rental).totalRevenueReceived;
}

function getSortValue(rental: RentalRecord, key: SortKey): string | number {
  const fin = computeRentalFinance(rental);
  switch (key) {
    case 'rentalNumber':          return rental.rentalNumber || '';
    case 'vehicleTypeName':       return (rental.vehicleTypeName || '').toLowerCase();
    case 'vehicleSerialNumber':   return (rental.vehicleSerialNumber || '').toLowerCase();
    case 'customerName':          return (rental.customerName || 'Walk-in').toLowerCase();
    case 'startTime':             return rental.startTime || 0;
    case 'endTime':               return rental.endTime || 0;
    case 'breakdown.totalMinutes': return rental.breakdown?.totalMinutes || 0;
    case 'rentalAmount':          return fin.rentalValue;
    case 'damageAmount':          return fin.damageCharge;
    case 'grossRentalAmount':     return fin.grossRentalAmount;
    case 'depositAmount':         return fin.advancePaid;
    case 'discountAmount':        return fin.discountAmount;
    case 'balanceAmount':         return fin.balanceToCollect;
    case 'totalAmount':           return fin.totalRevenueReceived;
    case 'paymentMethod':         return (rental.paymentMethod || 'cash').toLowerCase();
    default: return '';
  }
}

export const RentalHistoryPanel: React.FC<RentalHistoryPanelProps> = ({
  completedRentals,
  settings,
  currentUser,
  vehicles = [],
  onAddRental,
  onUpdateRental,
  onDeleteRental,
  themeMode = 'dark',
  accent = 'emerald',
}) => {
  // Admin Authorization check - Strictly root admin or admin role
  const isRootAdmin = currentUser?.email?.toLowerCase() === DEFAULT_USER.email.toLowerCase();
  const isAdmin = currentUser?.role === 'admin' || isRootAdmin;

  // Historical Rental Add / Edit modal state (Admin only)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [rentalToEdit, setRentalToEdit] = useState<RentalRecord | null>(null);

  // Get today's ISO date string (YYYY-MM-DD)
  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Start with empty dates by default to display all history details from Supabase
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [selectedRentalForReceipt, setSelectedRentalForReceipt] = useState<RentalRecord | null>(null);

  // Delete modal confirmation state (Admin only)
  const [rentalToDelete, setRentalToDelete] = useState<RentalRecord | null>(null);

  // Sorting state — default: descending order showing newest/latest records first (Requirement 1)
  const [sortKey, setSortKey] = useState<SortKey>('endTime');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination state (Max 20 rows per page)
  const [currentPage, setCurrentPage] = useState(1);

  const t = getThemeClasses(themeMode, accent);

  const handleSetToday = () => {
    const today = getTodayISO();
    setFromDate(today);
    setToDate(today);
    setCurrentPage(1);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setFromDate(yStr);
    setToDate(yStr);
    setCurrentPage(1);
  };

  const handleSetThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    const monStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    setFromDate(monStr);
    setToDate(getTodayISO());
    setCurrentPage(1);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    setFromDate(firstDay);
    setToDate(getTodayISO());
    setCurrentPage(1);
  };

  const handleClearDates = () => {
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  // Handle column header click for sorting
  const handleSort = (key: SortKey, explicitDir?: SortDir) => {
    if (explicitDir) {
      setSortKey(key);
      setSortDir(explicitDir);
    } else if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // Filter logic
  const filteredRentals = useMemo(() => {
    return completedRentals.filter((rental) => {
      const rentalDate = new Date(rental.endTime || rental.startTime);
      const rentalDateISO = `${rentalDate.getFullYear()}-${String(rentalDate.getMonth() + 1).padStart(2, '0')}-${String(rentalDate.getDate()).padStart(2, '0')}`;

      // 1. Calendar Date Range Filter
      if (fromDate && rentalDateISO < fromDate) return false;
      if (toDate && rentalDateISO > toDate) return false;

      // 2. Search Term Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTerm =
          rental.vehicleSerialNumber.toLowerCase().includes(term) ||
          rental.rentalNumber.toLowerCase().includes(term) ||
          rental.vehicleTypeName.toLowerCase().includes(term) ||
          (rental.customerName && rental.customerName.toLowerCase().includes(term)) ||
          (rental.customerNicPassport && rental.customerNicPassport.toLowerCase().includes(term)) ||
          (rental.customerPhone && rental.customerPhone.includes(term)) ||
          (rental.cashierName && rental.cashierName.toLowerCase().includes(term));
        if (!matchesTerm) return false;
      }

      // 3. Vehicle Type Filter
      if (filterType !== 'all' && rental.vehicleTypeId !== filterType) return false;

      // 4. Payment Method Filter
      if (filterPayment !== 'all' && (rental.paymentMethod || 'cash') !== filterPayment) return false;

      return true;
    });
  }, [completedRentals, fromDate, toDate, searchTerm, filterType, filterPayment]);

  // Sorted rentals: Vehicle Category and Vehicle Serial Number ordered A-Z by default
  const sortedRentals = useMemo(() => {
    return [...filteredRentals].sort((a, b) => {
      // 1. Sorting by Vehicle Category
      if (sortKey === 'vehicleTypeName') {
        const catCompare = (a.vehicleTypeName || '').localeCompare(b.vehicleTypeName || '', undefined, { sensitivity: 'base' });
        if (catCompare !== 0) {
          return sortDir === 'asc' ? catCompare : -catCompare;
        }
        // Within same Category: Vehicle Serial Number in A-Z order
        return (a.vehicleSerialNumber || '').localeCompare(b.vehicleSerialNumber || '', undefined, { numeric: true, sensitivity: 'base' });
      }

      // 2. Sorting by Vehicle Serial Number
      if (sortKey === 'vehicleSerialNumber') {
        const serialCompare = (a.vehicleSerialNumber || '').localeCompare(b.vehicleSerialNumber || '', undefined, { numeric: true, sensitivity: 'base' });
        if (serialCompare !== 0) {
          return sortDir === 'asc' ? serialCompare : -serialCompare;
        }
        return (a.vehicleTypeName || '').localeCompare(b.vehicleTypeName || '', undefined, { sensitivity: 'base' });
      }

      // 3. Other fields
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const strComp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
        if (strComp !== 0) return sortDir === 'asc' ? strComp : -strComp;
      } else {
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      }

      // Tie-breaker: Latest rental timestamp first (Requirement 1: descending order default)
      const timeA = a.endTime || a.startTime || 0;
      const timeB = b.endTime || b.startTime || 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.rentalNumber || '').localeCompare(a.rentalNumber || '');
    });
  }, [filteredRentals, sortKey, sortDir]);

  // Pagination (Max 20 rows per page)
  const totalPages = Math.max(1, Math.ceil(sortedRentals.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pageRentals = sortedRentals.slice(pageStart, pageEnd);

  // Aggregated Total Values for Filtered View (7-part Rental Finance Structure)
  const filteredRentalValueTotal = filteredRentals.reduce((sum, r) => sum + computeRentalFinance(r).rentalValue, 0);
  const filteredDamageTotal = filteredRentals.reduce((sum, r) => sum + computeRentalFinance(r).damageCharge, 0);
  const filteredGrossTotal = filteredRentals.reduce((sum, r) => sum + computeRentalFinance(r).grossRentalAmount, 0);
  const filteredAdvanceTotal = filteredRentals.reduce((sum, r) => sum + computeRentalFinance(r).advancePaid, 0);
  const filteredDiscountTotal = filteredRentals.reduce((sum, r) => sum + computeRentalFinance(r).discountAmount, 0);
  const filteredBalanceTotal = filteredRentals.reduce((sum, r) => sum + computeRentalFinance(r).balanceToCollect, 0);
  const filteredRevenueTotal = filteredRentals.reduce((sum, r) => sum + computeRentalFinance(r).totalRevenueReceived, 0);
  const filteredTotalMinutes = filteredRentals.reduce((sum, r) => sum + (r.breakdown?.totalMinutes || 0), 0);
  const filteredCashValue = filteredRentals.filter(r => (r.paymentMethod || 'cash') === 'cash').reduce((sum, r) => sum + computeRentalFinance(r).totalRevenueReceived, 0);
  const filteredDigitalValue = filteredRevenueTotal - filteredCashValue;

  // All-Time Overall History Details
  const totalAllTimeRentalValue = completedRentals.reduce((sum, r) => sum + computeRentalFinance(r).rentalValue, 0);
  const totalAllTimeDamage = completedRentals.reduce((sum, r) => sum + computeRentalFinance(r).damageCharge, 0);
  const totalAllTimeGross = completedRentals.reduce((sum, r) => sum + computeRentalFinance(r).grossRentalAmount, 0);
  const totalAllTimeAdvance = completedRentals.reduce((sum, r) => sum + computeRentalFinance(r).advancePaid, 0);
  const totalAllTimeDiscount = completedRentals.reduce((sum, r) => sum + computeRentalFinance(r).discountAmount, 0);
  const totalAllTimeBalance = completedRentals.reduce((sum, r) => sum + computeRentalFinance(r).balanceToCollect, 0);
  const totalAllTimeRevenue = completedRentals.reduce((sum, r) => sum + computeRentalFinance(r).totalRevenueReceived, 0);
  const totalAllTimeMinutes = completedRentals.reduce((sum, r) => sum + (r.breakdown?.totalMinutes || 0), 0);
  const totalAllTimeCash = completedRentals.filter(r => (r.paymentMethod || 'cash') === 'cash').reduce((sum, r) => sum + computeRentalFinance(r).totalRevenueReceived, 0);
  const totalAllTimeDigital = totalAllTimeRevenue - totalAllTimeCash;
  const isDateFiltered = Boolean(fromDate || toDate);
  const isHistoryFiltered = Boolean(fromDate || toDate || searchTerm.trim() || filterType !== 'all' || filterPayment !== 'all');

  const exportToCSV = () => {
    if (filteredRentals.length === 0) {
      alert('No rental records in current filtered view to export.');
      return;
    }

    const headers = [
      'Rental Number',
      'Serial Number',
      'Vehicle Type',
      'Customer Name',
      'Customer Phone',
      'Customer NIC/Passport',
      'Start Time',
      'End Time',
      'Duration (Minutes)',
      'Rental Value',
      'Damage Charge',
      'Gross Rental Amount',
      'Advance Paid',
      'Discount',
      'Balance Collected',
      'Total Rental Revenue Received',
      'Payment Method',
      'Cashier',
    ];

    const rows = filteredRentals.map((r) => {
      const fin = computeRentalFinance(r);
      return [
        r.rentalNumber,
        r.vehicleSerialNumber,
        r.vehicleTypeName,
        r.customerName || '',
        r.customerPhone || '',
        r.customerNicPassport || '',
        new Date(r.startTime).toISOString(),
        r.endTime ? new Date(r.endTime).toISOString() : '',
        r.breakdown?.totalMinutes || 0,
        fin.rentalValue,
        fin.damageCharge,
        fin.grossRentalAmount,
        fin.advancePaid,
        fin.discountAmount,
        fin.balanceToCollect,
        fin.totalRevenueReceived,
        r.paymentMethod || 'cash',
        r.cashierName,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateLabel = fromDate && toDate ? `${fromDate}_to_${toDate}` : fromDate ? `From_${fromDate}` : toDate ? `UpTo_${toDate}` : 'All_Time';
    link.setAttribute('download', `Rental_History_Report_${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sortable column header component with compact Up / Down symbol buttons
  const SortTh: React.FC<{
    label: string;
    colKey: SortKey;
    className?: string;
    align?: 'left' | 'right';
  }> = ({ label, colKey, className = '', align = 'left' }) => {
    const isActive = sortKey === colKey;
    return (
      <th className={`px-2.5 py-2.5 select-none ${className}`}>
        <div className={`flex items-center justify-between gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={() => handleSort(colKey)}
            className={`font-bold text-[11px] tracking-wide cursor-pointer hover:underline inline-flex items-center gap-1 ${
              isActive ? `${t.textHeading} text-emerald-600 dark:text-emerald-400 font-extrabold` : t.textMuted
            }`}
            title={`Click to sort by ${label}`}
          >
            <span>{label}</span>
          </button>
          
          {/* Compact Sorting Symbol Buttons */}
          <div className="inline-flex items-center rounded border border-slate-500/25 overflow-hidden bg-slate-500/10 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSort(colKey, 'asc');
              }}
              title={`Sort ${label} ascending (▲)`}
              className={`p-0.5 transition cursor-pointer flex items-center justify-center ${
                isActive && sortDir === 'asc'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-500/20'
              }`}
            >
              <ArrowUp className="w-2.5 h-2.5" />
            </button>
            <div className="w-[1px] h-2.5 bg-slate-500/30" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSort(colKey, 'desc');
              }}
              title={`Sort ${label} descending (▼)`}
              className={`p-0.5 transition cursor-pointer flex items-center justify-center ${
                isActive && sortDir === 'desc'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-500/20'
              }`}
            >
              <ArrowDown className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </th>
    );
  };

  // Handler for confirmed delete
  const handleConfirmDelete = () => {
    if (!isAdmin) {
      alert('Permission Denied: Only an Administrator can delete settled rental records.');
      return;
    }
    if (rentalToDelete && onDeleteRental) {
      onDeleteRental(rentalToDelete.id);
      setRentalToDelete(null);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      
      {/* 1. HISTORY DETAILS FINANCIAL SUMMARY (Requirement 4) */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent ${t.cardBg} ${t.divider} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className={`text-sm sm:text-base font-bold uppercase tracking-wider ${t.textHeading}`}>
                {isHistoryFiltered 
                  ? `Filtered Period History Details (${fromDate || 'Start'} to ${toDate || 'Present'})` 
                  : 'Settled Rental History Details (All-Time)'}
              </h3>
            </div>
            <p className={`text-xs ${t.textMuted} mt-0.5`}>
              {isHistoryFiltered ? `${filteredRentals.length} of ${completedRentals.length} Trips Matched` : `${completedRentals.length} Total Settled Trips`}
              {' · '}Total Ride Time: <strong className={t.textMain}>{Math.floor((isHistoryFiltered ? filteredTotalMinutes : totalAllTimeMinutes) / 60)}h {(isHistoryFiltered ? filteredTotalMinutes : totalAllTimeMinutes) % 60}m</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-xs">
              Total Revenue: {formatCurrency(isHistoryFiltered ? filteredRevenueTotal : totalAllTimeRevenue, settings.currencySymbol, settings.currencyPosition)}
            </span>
          </div>
        </div>

        {/* 7-PART HISTORY DETAILS FINANCIAL STRUCTURE METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {/* 1. Rental Value */}
          <div className={`p-3 rounded-xl border border-l-4 border-l-indigo-500 ${t.cardSubtleBg} space-y-1`}>
            <div className="flex items-center justify-between text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Rental Value</span>
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div className="font-mono text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 truncate">
              {formatCurrency(isHistoryFiltered ? filteredRentalValueTotal : totalAllTimeRentalValue, settings.currencySymbol, settings.currencyPosition)}
            </div>
            <div className={`text-[10px] ${t.textMuted} truncate`}>
              Base Ride Value
            </div>
          </div>

          {/* 2. Damage Charge */}
          <div className={`p-3 rounded-xl border border-l-4 border-l-amber-500 ${t.cardSubtleBg} space-y-1`}>
            <div className="flex items-center justify-between text-amber-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Damage Charge</span>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="font-mono text-base sm:text-lg font-black text-amber-400 truncate">
              {formatCurrency(isHistoryFiltered ? filteredDamageTotal : totalAllTimeDamage, settings.currencySymbol, settings.currencyPosition)}
            </div>
            <div className={`text-[10px] ${t.textMuted} truncate`}>
              Penalties & Repairs
            </div>
          </div>

          {/* 3. Gross Rental Amount */}
          <div className={`p-3 rounded-xl border border-l-4 border-l-purple-500 ${t.cardSubtleBg} space-y-1`}>
            <div className="flex items-center justify-between text-purple-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Gross Rental</span>
              <Banknote className="w-3.5 h-3.5" />
            </div>
            <div className="font-mono text-base sm:text-lg font-black text-purple-400 truncate">
              {formatCurrency(isHistoryFiltered ? filteredGrossTotal : totalAllTimeGross, settings.currencySymbol, settings.currencyPosition)}
            </div>
            <div className={`text-[10px] ${t.textMuted} truncate`}>
              Rental + Damage
            </div>
          </div>

          {/* 4. Advance Paid */}
          <div className={`p-3 rounded-xl border border-l-4 border-l-sky-500 ${t.cardSubtleBg} space-y-1`}>
            <div className="flex items-center justify-between text-sky-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Advance Paid</span>
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="font-mono text-base sm:text-lg font-black text-sky-400 truncate">
              {formatCurrency(isHistoryFiltered ? filteredAdvanceTotal : totalAllTimeAdvance, settings.currencySymbol, settings.currencyPosition)}
            </div>
            <div className={`text-[10px] ${t.textMuted} truncate`}>
              Upfront Deposit
            </div>
          </div>

          {/* 5. Discount */}
          <div className={`p-3 rounded-xl border border-l-4 border-l-teal-500 ${t.cardSubtleBg} space-y-1`}>
            <div className="flex items-center justify-between text-teal-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Discount</span>
              <Tag className="w-3.5 h-3.5" />
            </div>
            <div className="font-mono text-base sm:text-lg font-black text-teal-400 truncate">
              {formatCurrency(isHistoryFiltered ? filteredDiscountTotal : totalAllTimeDiscount, settings.currencySymbol, settings.currencyPosition)}
            </div>
            <div className={`text-[10px] ${t.textMuted} truncate`}>
              Promotions & Waivers
            </div>
          </div>

          {/* 6. Balance Collected */}
          <div className={`p-3 rounded-xl border border-l-4 border-l-blue-500 ${t.cardSubtleBg} space-y-1`}>
            <div className="flex items-center justify-between text-blue-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Balance Collect</span>
              <Coins className="w-3.5 h-3.5" />
            </div>
            <div className="font-mono text-base sm:text-lg font-black text-blue-400 truncate">
              {formatCurrency(isHistoryFiltered ? filteredBalanceTotal : totalAllTimeBalance, settings.currencySymbol, settings.currencyPosition)}
            </div>
            <div className={`text-[10px] ${t.textMuted} truncate`}>
              Collected on Return
            </div>
          </div>

          {/* 7. Total Rental Revenue Received */}
          <div className={`p-3 rounded-xl border border-l-4 border-l-emerald-500 ${t.cardSubtleBg} space-y-1 col-span-2 sm:col-span-1`}>
            <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Total Revenue</span>
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="font-mono text-base sm:text-lg font-black text-emerald-400 truncate">
              {formatCurrency(isHistoryFiltered ? filteredRevenueTotal : totalAllTimeRevenue, settings.currencySymbol, settings.currencyPosition)}
            </div>
            <div className={`text-[10px] ${t.textMuted} truncate`}>
              Advance + Balance
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEARCH & DATE FILTER BAR - Single Row Layout across device viewports */}
      <div className={`${t.cardBg} rounded-2xl p-3.5 sm:p-4 border shadow-md`}>
        <div className="flex flex-col md:flex-row gap-3 items-end">
          {/* Search In Records (Reduced size, dynamic responsive width) */}
          <div className="w-full md:flex-1 min-w-[200px]">
            <label className="block text-xs font-bold uppercase tracking-wider text-cyan-500 mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>Search in Records</span>
            </label>
            <div className="relative">
              <input
                id="input-history-search"
                type="text"
                placeholder="Search receipt #, serial, NIC/Passport, customer..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className={`w-full h-10 sm:h-10.5 rounded-xl pl-9 pr-9 text-xs sm:text-sm font-medium ${t.searchInput}`}
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-500">
                <Search className="w-4 h-4" />
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-cyan-500 hover:text-cyan-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* From Date (Right to the search option) */}
          <div className="w-full md:w-44 lg:w-48 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-bold ${t.textHeading} flex items-center gap-1.5`}>
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>From Date</span>
              </label>
              {fromDate && (
                <button
                  type="button"
                  onClick={() => { setFromDate(''); setCurrentPage(1); }}
                  className="text-[10px] text-slate-400 hover:text-rose-400 cursor-pointer font-normal underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="input-filter-from-date"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                className={`w-full h-10 sm:h-10.5 rounded-xl pl-9 pr-2.5 text-xs sm:text-sm font-mono font-medium ${t.textInput} cursor-pointer`}
                onClick={(e) => { try { (e.target as HTMLInputElement).showPicker?.(); } catch (err) {} }}
              />
            </div>
          </div>

          {/* To Date (Right of From Date) */}
          <div className="w-full md:w-44 lg:w-48 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-bold ${t.textHeading} flex items-center gap-1.5`}>
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>To Date</span>
              </label>
              {toDate && (
                <button
                  type="button"
                  onClick={() => { setToDate(''); setCurrentPage(1); }}
                  className="text-[10px] text-slate-400 hover:text-rose-400 cursor-pointer font-normal underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="input-filter-to-date"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                className={`w-full h-10 sm:h-10.5 rounded-xl pl-9 pr-2.5 text-xs sm:text-sm font-mono font-medium ${t.textInput} cursor-pointer`}
                onClick={(e) => { try { (e.target as HTMLInputElement).showPicker?.(); } catch (err) {} }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SETTLED RENTALS HISTORY TABLE */}
      <div className={`${t.cardBg} rounded-2xl p-4 sm:p-6 border shadow-xl space-y-4`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Receipt className="w-5 h-5 text-emerald-500" />
            <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
              Settled Rental Receipts & Detailed Log
            </h2>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${t.badge}`}>
              {filteredRentals.length} {filteredRentals.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={filterPayment}
              onChange={(e) => { setFilterPayment(e.target.value); setCurrentPage(1); }}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold ${t.dropdownInput} cursor-pointer`}
              title="Filter by Payment Method"
            >
              <option value="all">All Payments</option>
              <option value="cash">Cash Only</option>
              <option value="card">Card / POS</option>
              <option value="qr_transfer">QR / LankaQR</option>
            </select>

            {isAdmin && onAddRental && (
              <button
                id="btn-add-rental-record"
                type="button"
                onClick={() => {
                  setRentalToEdit(null);
                  setIsAddModalOpen(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer shadow-sm ${t.primaryBtn}`}
                title="Add Historical Rental Record (Admin Only)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Record</span>
              </button>
            )}

            <button
              id="btn-export-csv"
              type="button"
              onClick={exportToCSV}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${t.inactiveTab}`}
              title="Export filtered records to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <span className={`text-xs font-mono font-bold text-emerald-500`}>
              Total Revenue: {formatCurrency(filteredRevenueTotal, settings.currencySymbol, settings.currencyPosition)}
            </span>
          </div>
        </div>

        {filteredRentals.length === 0 ? (
          <div className={`text-center py-12 text-xs border border-dashed rounded-xl ${t.cardSubtleBg} ${t.textMuted} ${t.divider}`}>
            {completedRentals.length === 0
              ? 'No completed rentals yet. When an active rental is stopped, its receipt will show here.'
              : 'No rentals matched your selected date range or search query.'}
          </div>
        ) : (
          <>
            <div className={`overflow-x-auto rounded-xl border ${t.divider}`}>
              <table className="w-full text-left text-xs whitespace-nowrap sm:whitespace-normal">
                <thead className={`${t.cardSubtleBg} uppercase font-semibold border-b ${t.divider} ${t.textMuted}`}>
                  <tr>
                    <SortTh label="Receipt #" colKey="rentalNumber" className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xs min-w-[110px]" />
                    <SortTh label="Category" colKey="vehicleTypeName" className="min-w-[115px]" />
                    <SortTh label="Serial No." colKey="vehicleSerialNumber" className="min-w-[90px]" />
                    <SortTh label="Customer" colKey="customerName" className="min-w-[130px]" />
                    <SortTh label="Timing & Duration" colKey="startTime" className="min-w-[120px]" />
                    <SortTh label="Rental Value" colKey="rentalAmount" align="right" className="min-w-[95px]" />
                    <SortTh label="Damage" colKey="damageAmount" align="right" className="min-w-[75px]" />
                    <SortTh label="Gross Rental" colKey="grossRentalAmount" align="right" className="min-w-[95px]" />
                    <SortTh label="Advance Paid" colKey="depositAmount" align="right" className="min-w-[95px]" />
                    <SortTh label="Discount" colKey="discountAmount" align="right" className="min-w-[75px]" />
                    <SortTh label="Balance" colKey="balanceAmount" align="right" className="min-w-[85px]" />
                    <SortTh label="Total Revenue" colKey="totalCollected" align="right" className="min-w-[105px]" />
                    <SortTh label="Payment" colKey="paymentMethod" className="min-w-[80px]" />
                    <th className="px-2.5 py-2.5 text-right font-bold text-[11px] tracking-wide min-w-[85px]">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${t.divider}`}>
                  {pageRentals.map((rental) => {
                    const fin = computeRentalFinance(rental);
                    return (
                    <tr key={rental.id} className="hover:bg-slate-500/5 transition">
                      {/* Receipt # (Sticky left-0 so #REN-0000168 is ALWAYS permanently visible) */}
                      <td className={`px-2.5 py-2.5 font-mono font-bold sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xs ${t.textHeading}`}>
                        <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-black">
                          #{rental.rentalNumber}
                        </span>
                      </td>
                      {/* Category */}
                      <td className="px-2.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <VehicleIcon type={rental.vehicleIcon} className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className={`font-semibold text-xs ${t.textMain}`}>{rental.vehicleTypeName}</span>
                        </div>
                      </td>
                      {/* Serial No. */}
                      <td className="px-2.5 py-2.5">
                        <span className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${t.textHeading}`}>
                          {rental.vehicleSerialNumber}
                        </span>
                      </td>
                      {/* Customer */}
                      <td className="px-2.5 py-2.5">
                        {rental.customerName || rental.customerNicPassport || rental.customerPhone ? (
                          <div className="space-y-0.5">
                            {rental.customerName && (
                              <span className={`font-bold block text-xs ${t.textHeading}`}>
                                {rental.customerName}
                              </span>
                            )}
                            {rental.customerNicPassport && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 font-bold">
                                <IdCard className="w-3 h-3 shrink-0" />
                                {rental.customerNicPassport}
                              </span>
                            )}
                            {rental.customerPhone && (
                              <span className={`text-[10px] font-mono flex items-center gap-1 ${t.textMuted}`}>
                                <Phone className="w-3 h-3 shrink-0" />
                                {rental.customerPhone}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className={`italic text-xs ${t.textMuted}`}>Walk-in</span>
                        )}
                      </td>
                      {/* Timing & Duration */}
                      <td className="px-2.5 py-2.5">
                        <div className="space-y-0.5">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${t.cardSubtleBg} text-emerald-500`}>
                            {rental.breakdown?.durationFormatted || `${rental.breakdown?.totalMinutes} mins`}
                          </span>
                          <div className={`font-mono text-[11px] ${t.textMain}`}>
                            {formatTime(rental.startTime)} → {rental.endTime ? formatTime(rental.endTime) : '—'}
                          </div>
                          <div className={`text-[10px] ${t.textMuted}`}>{formatDate(rental.startTime)}</div>
                        </div>
                      </td>
                      {/* 1. Rental Value */}
                      <td className="px-2.5 py-2.5 text-right">
                        <span className={`font-mono text-xs font-semibold ${t.textMain}`}>
                          {formatCurrency(fin.rentalValue, settings.currencySymbol, settings.currencyPosition)}
                        </span>
                      </td>
                      {/* 2. Damage Charge */}
                      <td className="px-2.5 py-2.5 text-right">
                        <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-500">
                          {fin.damageCharge > 0 
                            ? `+${formatCurrency(fin.damageCharge, settings.currencySymbol, settings.currencyPosition)}` 
                            : '—'}
                        </span>
                      </td>
                      {/* 3. Gross Rental Amount */}
                      <td className="px-2.5 py-2.5 text-right">
                        <span className={`font-mono text-xs font-black ${t.textHeading}`}>
                          {formatCurrency(fin.grossRentalAmount, settings.currencySymbol, settings.currencyPosition)}
                        </span>
                      </td>
                      {/* 4. Advance Paid */}
                      <td className="px-2.5 py-2.5 text-right">
                        <span className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                          {fin.advancePaid > 0 
                            ? formatCurrency(fin.advancePaid, settings.currencySymbol, settings.currencyPosition) 
                            : '—'}
                        </span>
                      </td>
                      {/* 5. Discount */}
                      <td className="px-2.5 py-2.5 text-right">
                        <span className="font-mono text-xs font-semibold text-teal-600 dark:text-teal-400">
                          {fin.discountAmount > 0 
                            ? `-${formatCurrency(fin.discountAmount, settings.currencySymbol, settings.currencyPosition)}` 
                            : '—'}
                        </span>
                      </td>
                      {/* 6. Balance Collected */}
                      <td className="px-2.5 py-2.5 text-right">
                        <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {fin.balanceToCollect > 0 
                            ? formatCurrency(fin.balanceToCollect, settings.currencySymbol, settings.currencyPosition)
                            : (fin.refundDue > 0 ? `Ref: ${formatCurrency(fin.refundDue, settings.currencySymbol, settings.currencyPosition)}` : '0')}
                        </span>
                      </td>
                      {/* 7. Total Rental Revenue Received */}
                      <td className="px-2.5 py-2.5 text-right">
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                          {formatCurrency(fin.totalRevenueReceived, settings.currencySymbol, settings.currencyPosition)}
                        </span>
                      </td>
                      {/* Payment Method */}
                      <td className="px-2 py-2.5 text-center">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${t.cardSubtleBg} ${t.textMuted}`}>
                          {rental.paymentMethod || 'cash'}
                        </span>
                      </td>
                      {/* Actions Column: View Receipt + Admin-Only Delete */}
                      <td className="px-2.5 py-2.5 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* View receipt button */}
                          <button
                            id={`btn-view-receipt-${rental.rentalNumber}`}
                            onClick={() => setSelectedRentalForReceipt(rental)}
                            className={`px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${t.inactiveTab}`}
                            title="View / Print Receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>

                          {/* Edit Action: Admin user ONLY */}
                          {isAdmin && onUpdateRental && (
                            <button
                              id={`btn-edit-receipt-${rental.rentalNumber}`}
                              type="button"
                              onClick={() => setRentalToEdit(rental)}
                              className="px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/60 cursor-pointer shadow-sm"
                              title="Edit Settled Rental Record (Admin Only)"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Delete Action: Admin user ONLY */}
                          {isAdmin && (
                            <button
                              id={`btn-delete-receipt-${rental.rentalNumber}`}
                              type="button"
                              onClick={() => setRentalToDelete(rental)}
                              className="px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 hover:border-rose-500/60 cursor-pointer shadow-sm"
                              title="Delete Settled Rental Record (Admin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className={`flex items-center justify-between pt-2 border-t ${t.divider} flex-wrap gap-3`}>
              {/* Row count info */}
              <span className={`text-xs ${t.textMuted}`}>
                Showing{' '}
                <span className={`font-bold ${t.textMain}`}>
                  {pageStart + 1}–{Math.min(pageEnd, sortedRentals.length)}
                </span>{' '}
                of{' '}
                <span className={`font-bold ${t.textMain}`}>{sortedRentals.length}</span>{' '}
                records &nbsp;·&nbsp; Page{' '}
                <span className={`font-bold ${t.textMain}`}>{safeCurrentPage}</span>{' '}
                of{' '}
                <span className={`font-bold ${t.textMain}`}>{totalPages}</span>
                {sortedRentals.length > PAGE_SIZE && (
                  <span className={`ml-2 text-[10px] ${t.textMuted}`}>
                    ({PAGE_SIZE} rows/page)
                  </span>
                )}
              </span>

              {/* Page navigation */}
              <div className="flex items-center gap-1.5">
                {/* First page */}
                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${t.inactiveTab}`}
                  title="First page"
                >
                  «
                </button>

                {/* Prev */}
                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 ${t.inactiveTab}`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>

                {/* Page number pills */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - safeCurrentPage) <= 2 || p === 1 || p === totalPages)
                  .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} className={`px-1.5 text-xs ${t.textMuted}`}>…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCurrentPage(p as number)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          safeCurrentPage === p
                            ? `${t.activeTab} shadow`
                            : t.inactiveTab
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                {/* Next */}
                <button
                  type="button"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 ${t.inactiveTab}`}
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Last page */}
                <button
                  type="button"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${t.inactiveTab}`}
                  title="Last page"
                >
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Printable Receipt Modal */}
      {selectedRentalForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className={`${t.modalBg} rounded-2xl w-full max-w-md p-4 sm:p-6 space-y-4 shadow-2xl my-auto max-h-[92vh] flex flex-col`}>
            <div className={`flex items-center justify-between pb-3 border-b ${t.divider} shrink-0`}>
              <span className={`font-bold text-sm flex items-center gap-2 ${t.textHeading}`}>
                <Receipt className="w-4 h-4 text-emerald-500" />
                Customer Rental Receipt
              </span>
              <button
                onClick={() => setSelectedRentalForReceipt(null)}
                className={`${t.textMuted} hover:${t.textMain} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Printable Format Area */}
            <div id="printable-receipt" className="bg-white text-slate-950 p-5 rounded-xl font-mono text-xs space-y-3 shadow border border-slate-200 overflow-y-auto flex-1">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                {settings.companyLogo && (
                  <img
                    src={settings.companyLogo}
                    alt="Logo"
                    className="w-12 h-12 rounded-lg object-cover mx-auto mb-1.5"
                  />
                )}
                <h3 className="font-bold text-sm tracking-tight text-slate-900">{settings.businessName}</h3>
                {settings.businessAddress && <p className="text-[10px] text-slate-600">{settings.businessAddress}</p>}
                {settings.businessPhone && <p className="text-[10px] text-slate-600">Tel: {settings.businessPhone}</p>}
                <div className="mt-2 text-[10px] text-slate-500 font-bold uppercase">
                  Rental Receipt #{selectedRentalForReceipt.rentalNumber}
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-600">Vehicle Serial:</span>
                  <span className="font-bold">{selectedRentalForReceipt.vehicleSerialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Vehicle Type:</span>
                  <span>{selectedRentalForReceipt.vehicleTypeName}</span>
                </div>
                {selectedRentalForReceipt.customerName && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Customer:</span>
                    <span>{selectedRentalForReceipt.customerName}</span>
                  </div>
                )}
                {selectedRentalForReceipt.customerNicPassport && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">NIC / Passport:</span>
                    <span className="font-bold">{selectedRentalForReceipt.customerNicPassport}</span>
                  </div>
                )}
                {selectedRentalForReceipt.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Phone:</span>
                    <span>{selectedRentalForReceipt.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Start Time:</span>
                  <span>{formatDateTime(selectedRentalForReceipt.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Return Time:</span>
                  <span>{selectedRentalForReceipt.endTime ? formatDateTime(selectedRentalForReceipt.endTime) : '—'}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Duration:</span>
                  <span>{selectedRentalForReceipt.breakdown?.durationFormatted} ({selectedRentalForReceipt.breakdown?.totalMinutes} mins)</span>
                </div>
                {(selectedRentalForReceipt.startKm !== undefined || selectedRentalForReceipt.endKm !== undefined || selectedRentalForReceipt.breakdown?.startKm !== undefined) && (
                  <div className="flex justify-between font-semibold text-amber-800">
                    <span>Odometer (KM):</span>
                    <span>
                      {selectedRentalForReceipt.startKm ?? selectedRentalForReceipt.breakdown?.startKm ?? '—'} km → {selectedRentalForReceipt.endKm ?? selectedRentalForReceipt.breakdown?.endKm ?? '—'} km
                      {(selectedRentalForReceipt.endKm ?? selectedRentalForReceipt.breakdown?.endKm) !== undefined && (selectedRentalForReceipt.startKm ?? selectedRentalForReceipt.breakdown?.startKm) !== undefined && (selectedRentalForReceipt.endKm ?? selectedRentalForReceipt.breakdown?.endKm ?? 0) >= (selectedRentalForReceipt.startKm ?? selectedRentalForReceipt.breakdown?.startKm ?? 0) && (
                        ` (${((selectedRentalForReceipt.endKm ?? selectedRentalForReceipt.breakdown?.endKm ?? 0) - (selectedRentalForReceipt.startKm ?? selectedRentalForReceipt.breakdown?.startKm ?? 0)).toFixed(1)} km)`
                      )}
                    </span>
                  </div>
                )}
              </div>

              {(() => {
                const fin = computeRentalFinance(selectedRentalForReceipt);
                return (
                  <div className="border-t border-dashed border-slate-300 pt-2.5 space-y-1.5 text-[11px] text-slate-800">
                    {/* 1. Rental Value */}
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-600">Rental Value:</span>
                      <span className="font-mono font-bold">
                        {formatCurrency(fin.rentalValue, settings.currencySymbol, settings.currencyPosition)}
                      </span>
                    </div>

                    {/* 2. Damage Charge */}
                    <div className="flex justify-between font-medium text-amber-700">
                      <span>Damage Charge:</span>
                      <span className="font-mono font-bold">
                        {fin.damageCharge > 0 
                          ? `+${formatCurrency(fin.damageCharge, settings.currencySymbol, settings.currencyPosition)}` 
                          : formatCurrency(0, settings.currencySymbol, settings.currencyPosition)}
                      </span>
                    </div>

                    {/* 3. Gross Rental Amount */}
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                      <span>Gross Rental Amount:</span>
                      <span className="font-mono">
                        {formatCurrency(fin.grossRentalAmount, settings.currencySymbol, settings.currencyPosition)}
                      </span>
                    </div>

                    {/* 4. Less Advance Paid */}
                    <div className="flex justify-between font-medium text-sky-700">
                      <span>Less Advance Paid:</span>
                      <span className="font-mono font-bold">
                        {fin.advancePaid > 0 
                          ? `-${formatCurrency(fin.advancePaid, settings.currencySymbol, settings.currencyPosition)}` 
                          : formatCurrency(0, settings.currencySymbol, settings.currencyPosition)}
                      </span>
                    </div>

                    {/* 5. Less Discount */}
                    <div className="flex justify-between font-medium text-teal-700">
                      <span>Less Discount:</span>
                      <span className="font-mono font-bold">
                        {fin.discountAmount > 0 
                          ? `-${formatCurrency(fin.discountAmount, settings.currencySymbol, settings.currencyPosition)}` 
                          : formatCurrency(0, settings.currencySymbol, settings.currencyPosition)}
                      </span>
                    </div>

                    {/* 6. Balance to Collect / Refund */}
                    <div className="flex justify-between font-bold text-slate-900 bg-slate-100 p-1.5 rounded">
                      <span>Balance Collected:</span>
                      <span className="font-mono">
                        {formatCurrency(fin.balanceToCollect, settings.currencySymbol, settings.currencyPosition)}
                      </span>
                    </div>
                    {fin.refundDue > 0 && (
                      <div className="flex justify-between font-bold text-rose-600 bg-rose-50 p-1.5 rounded">
                        <span>Refund Returned:</span>
                        <span className="font-mono">
                          {formatCurrency(fin.refundDue, settings.currencySymbol, settings.currencyPosition)}
                        </span>
                      </div>
                    )}

                    {/* 7. Total Rental Revenue Received */}
                    <div className="border-t-2 border-slate-900 pt-2 flex justify-between font-black text-xs sm:text-sm text-slate-900">
                      <div className="flex flex-col">
                        <span>TOTAL RENTAL REVENUE RECEIVED:</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Advance ({formatCurrency(fin.advancePaid, settings.currencySymbol, settings.currencyPosition)}) + Balance ({formatCurrency(fin.balanceToCollect, settings.currencySymbol, settings.currencyPosition)})
                        </span>
                      </div>
                      <span className="font-mono text-emerald-600 font-black text-sm sm:text-base">
                        {formatCurrency(fin.totalRevenueReceived, settings.currencySymbol, settings.currencyPosition)}
                      </span>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-600 pt-1">
                      <span>Payment Method:</span>
                      <span className="uppercase font-bold">{selectedRentalForReceipt.paymentMethod || 'CASH'}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-500">
                <p>{settings.receiptFooter || 'Thank you for riding with us!'}</p>
                <p className="mt-0.5">Cashier: {selectedRentalForReceipt.cashierName}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRentalForReceipt(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${t.inactiveTab}`}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${t.primaryBtn}`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Record Confirmation Modal (Admin Only) */}
      {rentalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className={`${t.modalBg} rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl my-auto border border-rose-500/30`}>
            <div className={`flex items-center justify-between pb-3 border-b ${t.divider}`}>
              <div className="flex items-center gap-2 text-rose-500">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className={`font-bold text-base ${t.textHeading}`}>
                  Delete Settled Rental Record
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRentalToDelete(null)}
                className={`${t.textMuted} hover:${t.textMain} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span><strong>Administrator Action:</strong> This will permanently delete this record from history and Supabase. This cannot be undone.</span>
            </div>

            <div className={`p-3 rounded-xl border ${t.divider} ${t.cardSubtleBg} space-y-2 text-xs font-mono`}>
              <div className="flex justify-between">
                <span className={t.textMuted}>Receipt #:</span>
                <span className={`font-bold ${t.textHeading}`}>#{rentalToDelete.rentalNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className={t.textMuted}>Vehicle:</span>
                <span className={`font-bold ${t.textHeading}`}>{rentalToDelete.vehicleSerialNumber} ({rentalToDelete.vehicleTypeName})</span>
              </div>
              <div className="flex justify-between">
                <span className={t.textMuted}>Customer:</span>
                <span className={t.textMain}>{rentalToDelete.customerName || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span className={t.textMuted}>Date & Time:</span>
                <span className={t.textMain}>{formatDateTime(rentalToDelete.startTime)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-500/20">
                <span className="font-bold text-emerald-500">Total Amount:</span>
                <span className="font-bold text-emerald-500 font-mono">
                  {formatCurrency(rentalToDelete.totalAmount, settings.currencySymbol, settings.currencyPosition)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRentalToDelete(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${t.inactiveTab}`}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-receipt"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Record</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historical Rental Add / Edit Modal (Admin Only) */}
      <HistoricalRentalModal
        isOpen={isAddModalOpen || Boolean(rentalToEdit)}
        rental={rentalToEdit}
        vehicles={vehicles}
        settings={settings}
        themeMode={themeMode}
        accent={accent}
        onClose={() => {
          setIsAddModalOpen(false);
          setRentalToEdit(null);
        }}
        onSave={(savedRental) => {
          if (rentalToEdit && onUpdateRental) {
            onUpdateRental(savedRental);
          } else if (onAddRental) {
            onAddRental(savedRental);
          }
          setIsAddModalOpen(false);
          setRentalToEdit(null);
        }}
      />
    </div>
  );
};
