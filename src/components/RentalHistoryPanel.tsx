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
} from 'lucide-react';
import { AppSettings, RentalRecord } from '../types';
import { VehicleIcon } from './VehicleIcon';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime, 
  formatTime 
} from '../utils/pricing';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { DEFAULT_USER, UserAccount } from '../utils/auth';

interface RentalHistoryPanelProps {
  completedRentals: RentalRecord[];
  settings: AppSettings;
  currentUser?: UserAccount;
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
  | 'totalAmount'
  | 'paymentMethod';

type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

function getSortValue(rental: RentalRecord, key: SortKey): string | number {
  switch (key) {
    case 'rentalNumber':      return rental.rentalNumber || '';
    case 'vehicleTypeName':   return (rental.vehicleTypeName || '').toLowerCase();
    case 'vehicleSerialNumber': return (rental.vehicleSerialNumber || '').toLowerCase();
    case 'customerName':      return (rental.customerName || 'Walk-in').toLowerCase();
    case 'startTime':         return rental.startTime || 0;
    case 'endTime':           return rental.endTime || 0;
    case 'breakdown.totalMinutes': return rental.breakdown?.totalMinutes || 0;
    case 'totalAmount':       return rental.totalAmount || 0;
    case 'paymentMethod':     return (rental.paymentMethod || 'cash').toLowerCase();
    default: return '';
  }
}

export const RentalHistoryPanel: React.FC<RentalHistoryPanelProps> = ({
  completedRentals,
  settings,
  currentUser,
  onDeleteRental,
  themeMode = 'dark',
  accent = 'emerald',
}) => {
  // Admin Authorization check - Strictly root admin or admin role
  const isRootAdmin = currentUser?.email?.toLowerCase() === DEFAULT_USER.email.toLowerCase();
  const isAdmin = currentUser?.role === 'admin' || isRootAdmin;

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

  // Sorting state — default: vehicleTypeName A→Z with vehicleSerialNumber A→Z secondary
  const [sortKey, setSortKey] = useState<SortKey>('vehicleTypeName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Pagination state (Max 20 rows per page)
  const [currentPage, setCurrentPage] = useState(1);

  const t = getThemeClasses(themeMode, accent);

  const handleSetToday = () => {
    const today = getTodayISO();
    setFromDate(today);
    setToDate(today);
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

      // Tie-breaker: Vehicle Category A-Z, then Vehicle Serial Number A-Z
      const catCompare = (a.vehicleTypeName || '').localeCompare(b.vehicleTypeName || '', undefined, { sensitivity: 'base' });
      if (catCompare !== 0) return catCompare;
      return (a.vehicleSerialNumber || '').localeCompare(b.vehicleSerialNumber || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filteredRentals, sortKey, sortDir]);

  // Pagination (Max 20 rows per page)
  const totalPages = Math.max(1, Math.ceil(sortedRentals.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pageRentals = sortedRentals.slice(pageStart, pageEnd);

  // Aggregated Total Values for Filtered View
  const filteredTotalValue = filteredRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const filteredTotalMinutes = filteredRentals.reduce((sum, r) => sum + (r.breakdown?.totalMinutes || 0), 0);
  const filteredCashValue = filteredRentals.filter(r => (r.paymentMethod || 'cash') === 'cash').reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const filteredDigitalValue = filteredTotalValue - filteredCashValue;

  // All-Time Overall History Details
  const totalAllTimeValue = completedRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalAllTimeMinutes = completedRentals.reduce((sum, r) => sum + (r.breakdown?.totalMinutes || 0), 0);
  const totalAllTimeCash = completedRentals.filter(r => (r.paymentMethod || 'cash') === 'cash').reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalAllTimeDigital = totalAllTimeValue - totalAllTimeCash;
  const avgTripValue = completedRentals.length > 0 ? (totalAllTimeValue / completedRentals.length) : 0;
  const isDateFiltered = Boolean(fromDate || toDate);

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
      'Total Amount',
      'Payment Method',
      'Cashier',
    ];

    const rows = filteredRentals.map((r) => [
      r.rentalNumber,
      r.vehicleSerialNumber,
      r.vehicleTypeName,
      r.customerName || '',
      r.customerPhone || '',
      r.customerNicPassport || '',
      new Date(r.startTime).toISOString(),
      r.endTime ? new Date(r.endTime).toISOString() : '',
      r.breakdown?.totalMinutes || 0,
      r.totalAmount,
      r.paymentMethod || 'cash',
      r.cashierName,
    ]);

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

  // Sortable column header component with literal A-Z and Z-A options
  const SortTh: React.FC<{
    label: string;
    colKey: SortKey;
    className?: string;
    align?: 'left' | 'right';
  }> = ({ label, colKey, className = '', align = 'left' }) => {
    const isActive = sortKey === colKey;
    return (
      <th className={`px-3 py-2.5 select-none ${className}`}>
        <div className={`flex items-center justify-between gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={() => handleSort(colKey)}
            className={`font-semibold text-xs tracking-wider cursor-pointer hover:underline flex items-center gap-1 ${
              isActive ? `${t.textHeading} font-bold` : t.textMuted
            }`}
            title={`Click to sort by ${label}`}
          >
            <span>{label}</span>
          </button>
          {/* Explicit A-Z and Z-A options on the heading */}
          <div className="inline-flex items-center rounded border border-slate-500/30 overflow-hidden text-[9px] font-bold bg-slate-500/10 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSort(colKey, 'asc');
              }}
              title={`Sort ${label} A-Z (Ascending)`}
              className={`px-1.5 py-0.5 transition cursor-pointer flex items-center gap-0.5 ${
                isActive && sortDir === 'asc'
                  ? 'bg-emerald-500 text-white font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-500/20'
              }`}
            >
              <span>A-Z</span>
              {isActive && sortDir === 'asc' && <ArrowUp className="w-2.5 h-2.5" />}
            </button>
            <div className="w-[1px] h-3 bg-slate-500/30" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSort(colKey, 'desc');
              }}
              title={`Sort ${label} Z-A (Descending)`}
              className={`px-1.5 py-0.5 transition cursor-pointer flex items-center gap-0.5 ${
                isActive && sortDir === 'desc'
                  ? 'bg-emerald-500 text-white font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-500/20'
              }`}
            >
              <span>Z-A</span>
              {isActive && sortDir === 'desc' && <ArrowDown className="w-2.5 h-2.5" />}
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
      
      {/* 1. ALWAYS DISPLAY ALL TOTAL HISTORY DETAILS IN THE FIRST ROW */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent ${t.cardBg} ${t.divider}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Main Total Value Display */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                {isDateFiltered 
                  ? `Filtered Period Revenue (${fromDate || 'Start'} to ${toDate || 'Present'})` 
                  : 'Total Rental History Revenue (All-Time)'}
              </span>
            </div>
            
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-mono text-2xl sm:text-4xl font-black text-emerald-500 tracking-tight">
                {formatCurrency(isDateFiltered ? filteredTotalValue : totalAllTimeValue, settings.currencySymbol, settings.currencyPosition)}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${t.badge}`}>
                {isDateFiltered ? `${filteredRentals.length} of ${completedRentals.length} Trips` : `${completedRentals.length} Trips Settled`}
              </span>
              {isDateFiltered && (
                <span className={`text-xs font-mono font-medium ${t.textMuted}`}>
                  (All-Time Total: {formatCurrency(totalAllTimeValue, settings.currencySymbol, settings.currencyPosition)})
                </span>
              )}
            </div>
            
            <p className={`text-xs ${t.textMuted}`}>
              All-Time Cash: <strong className={t.textMain}>{formatCurrency(totalAllTimeCash, settings.currencySymbol, settings.currencyPosition)}</strong>
              {totalAllTimeDigital > 0 && (
                <> • Card/Digital: <strong className={t.textMain}>{formatCurrency(totalAllTimeDigital, settings.currencySymbol, settings.currencyPosition)}</strong></>
              )}
              {completedRentals.length > 0 && (
                <> • Avg: <strong className={t.textMain}>{formatCurrency(avgTripValue, settings.currencySymbol, settings.currencyPosition)}/trip</strong></>
              )}
            </p>
          </div>

          {/* Quick Metrics Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            <div className={`p-3 rounded-xl border ${t.cardSubtleBg}`}>
              <span className={`text-[10px] uppercase font-bold block ${t.textMuted}`}>Total All Trips</span>
              <span className={`font-mono text-lg font-black block mt-0.5 ${t.textHeading}`}>
                {completedRentals.length}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${t.cardSubtleBg}`}>
              <span className={`text-[10px] uppercase font-bold block ${t.textMuted}`}>Total Ride Time</span>
              <span className="font-mono text-lg font-black block mt-0.5 text-blue-500">
                {Math.floor(totalAllTimeMinutes / 60)}h {totalAllTimeMinutes % 60}m
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${t.cardSubtleBg} col-span-2 sm:col-span-1`}>
              <span className={`text-[10px] uppercase font-bold block ${t.textMuted}`}>All-Time Revenue</span>
              <span className={`font-mono text-lg font-black block mt-0.5 text-emerald-500`}>
                {formatCurrency(totalAllTimeValue, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DATE FILTER CONTROL BAR */}
      <div className={`${t.cardBg} rounded-2xl p-4 sm:p-5 border shadow-xl space-y-4`}>
        
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${t.divider}`}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <h3 className={`font-bold text-sm ${t.textHeading}`}>
              Daily & Historical Date Range Filters
            </h3>
            {isDateFiltered && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Filtered: {fromDate || 'Start'} → {toDate || 'Present'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-export-csv"
              type="button"
              onClick={exportToCSV}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${t.inactiveTab}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* From & To Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* From Date */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${t.textHeading} flex items-center gap-1.5`}>
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>From Date</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="input-filter-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-medium ${t.textInput} cursor-pointer`}
                onClick={(e) => { try { (e.target as HTMLInputElement).showPicker?.(); } catch (err) {} }}
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${t.textHeading} flex items-center gap-1.5`}>
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>To Date</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="input-filter-to-date"
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-medium ${t.textInput} cursor-pointer`}
                onClick={(e) => { try { (e.target as HTMLInputElement).showPicker?.(); } catch (err) {} }}
              />
            </div>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
              Payment Method (Dropdown)
            </label>
            <select
              value={filterPayment}
              onChange={(e) => { setFilterPayment(e.target.value); setCurrentPage(1); }}
              className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${t.dropdownInput}`}
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash Only</option>
              <option value="card">Card / POS</option>
              <option value="qr">QR Code Transfer</option>
            </select>
          </div>

          {/* Quick Filter Actions */}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSetToday}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition cursor-pointer ${t.inactiveTab}`}
              title="Filter by Today's Date"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Today</span>
            </button>
            <button
              type="button"
              onClick={handleClearDates}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition cursor-pointer ${t.inactiveTab}`}
              title="Show All Dates"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span>Show All</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-cyan-500 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Search in Records (Receipt #, Serial, NIC/Passport, Customer Name)</span>
            </label>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${t.searchBadge}`}>
              Search Bar
            </span>
          </div>
          <div className="relative">
            <input
              id="input-history-search"
              type="text"
              placeholder="Search receipt #, serial, NIC/Passport, customer, or vehicle type..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-medium ${t.searchInput}`}
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
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs font-mono font-bold text-emerald-500`}>
              Total: {formatCurrency(filteredTotalValue, settings.currencySymbol, settings.currencyPosition)}
            </span>
            <span className={`text-[10px] ${t.textMuted}`}>
              Default: Vehicle Category (A-Z) → Serial No. (A-Z)
            </span>
          </div>
        </div>

        {/* Quick Sorting Pills Bar */}
        <div className={`flex items-center gap-1.5 flex-wrap p-2 rounded-xl border ${t.cardSubtleBg} ${t.divider} text-xs`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${t.textMuted} mr-1`}>
            Quick Order:
          </span>
          <button
            type="button"
            onClick={() => handleSort('vehicleTypeName', 'asc')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              sortKey === 'vehicleTypeName' && sortDir === 'asc'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : `${t.inactiveTab}`
            }`}
          >
            <span>Category & Serial (A-Z)</span>
            {sortKey === 'vehicleTypeName' && sortDir === 'asc' && <span className="text-[10px]">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => handleSort('vehicleTypeName', 'desc')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              sortKey === 'vehicleTypeName' && sortDir === 'desc'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : `${t.inactiveTab}`
            }`}
          >
            <span>Category (Z-A)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSort('vehicleSerialNumber', 'asc')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              sortKey === 'vehicleSerialNumber' && sortDir === 'asc'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : `${t.inactiveTab}`
            }`}
          >
            <span>Serial No. (A-Z)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSort('vehicleSerialNumber', 'desc')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              sortKey === 'vehicleSerialNumber' && sortDir === 'desc'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : `${t.inactiveTab}`
            }`}
          >
            <span>Serial No. (Z-A)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSort('rentalNumber', 'asc')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              sortKey === 'rentalNumber' && sortDir === 'asc'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : `${t.inactiveTab}`
            }`}
          >
            <span>Receipt # (A-Z)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSort('customerName', 'asc')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              sortKey === 'customerName' && sortDir === 'asc'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : `${t.inactiveTab}`
            }`}
          >
            <span>Customer (A-Z)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSort('startTime', 'desc')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              sortKey === 'startTime' && sortDir === 'desc'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : `${t.inactiveTab}`
            }`}
          >
            <span>Newest First</span>
          </button>
          <button
            type="button"
            onClick={() => handleSort('totalAmount', 'desc')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
              sortKey === 'totalAmount' && sortDir === 'desc'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : `${t.inactiveTab}`
            }`}
          >
            <span>Highest Amount</span>
          </button>
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
                    <SortTh label="Receipt #"    colKey="rentalNumber" />
                    <SortTh label="Category"     colKey="vehicleTypeName" />
                    <SortTh label="Serial No."   colKey="vehicleSerialNumber" />
                    <SortTh label="Customer"     colKey="customerName" />
                    <SortTh label="Start Time"   colKey="startTime" />
                    <SortTh label="Return Time"  colKey="endTime" />
                    <SortTh label="Duration"     colKey="breakdown.totalMinutes" />
                    <SortTh label="Paid Amount"  colKey="totalAmount" />
                    <SortTh label="Payment"      colKey="paymentMethod" />
                    <th className="px-3.5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${t.divider}`}>
                  {pageRentals.map((rental) => (
                    <tr key={rental.id} className="hover:bg-slate-500/5 transition">
                      {/* Receipt # */}
                      <td className={`px-3.5 py-3 font-mono font-bold ${t.textHeading}`}>
                        #{rental.rentalNumber}
                      </td>
                      {/* Category */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1.5">
                          <VehicleIcon type={rental.vehicleIcon} className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className={`font-medium ${t.textMain}`}>{rental.vehicleTypeName}</span>
                        </div>
                      </td>
                      {/* Serial No. */}
                      <td className="px-3.5 py-3">
                        <span className={`font-mono font-bold ${t.textHeading}`}>
                          {rental.vehicleSerialNumber}
                        </span>
                      </td>
                      {/* Customer */}
                      <td className="px-3.5 py-3">
                        {rental.customerName || rental.customerNicPassport || rental.customerPhone ? (
                          <div className="space-y-0.5">
                            {rental.customerName && (
                              <span className={`font-medium block ${t.textHeading}`}>
                                {rental.customerName}
                              </span>
                            )}
                            {rental.customerNicPassport && (
                              <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1 font-semibold">
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
                          <span className={`italic ${t.textMuted}`}>Walk-in</span>
                        )}
                      </td>
                      {/* Start Time */}
                      <td className="px-3.5 py-3">
                        <div className={`font-mono text-[11px] ${t.textMain}`}>{formatTime(rental.startTime)}</div>
                        <div className={`text-[10px] ${t.textMuted}`}>{formatDate(rental.startTime)}</div>
                      </td>
                      {/* Return Time */}
                      <td className="px-3.5 py-3">
                        <div className={`font-mono text-[11px] ${t.textMain}`}>
                          {rental.endTime ? formatTime(rental.endTime) : '—'}
                        </div>
                        {rental.endTime && (
                          <div className={`text-[10px] ${t.textMuted}`}>{formatDate(rental.endTime)}</div>
                        )}
                      </td>
                      {/* Duration */}
                      <td className="px-3.5 py-3">
                        <span className={`px-2 py-0.5 rounded font-mono font-semibold border ${t.cardSubtleBg} text-emerald-500`}>
                          {rental.breakdown?.durationFormatted || `${rental.breakdown?.totalMinutes} mins`}
                        </span>
                      </td>
                      {/* Paid Amount */}
                      <td className="px-3.5 py-3">
                        <span className="font-mono font-bold text-emerald-500 text-sm">
                          {formatCurrency(rental.totalAmount, settings.currencySymbol, settings.currencyPosition)}
                        </span>
                      </td>
                      {/* Payment Method */}
                      <td className="px-3.5 py-3">
                        <span className={`text-[11px] capitalize font-semibold px-2 py-0.5 rounded-full border ${t.cardSubtleBg} ${t.textMuted}`}>
                          {rental.paymentMethod || 'cash'}
                        </span>
                      </td>
                      {/* Actions Column: View Receipt + Admin-Only Delete */}
                      <td className="px-3.5 py-3 text-right">
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

                          {/* Delete Action: Admin user ONLY */}
                          {isAdmin ? (
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
                          ) : (
                            <button
                              type="button"
                              onClick={() => alert('Permission Denied: Only an Administrator can delete settled rental records.')}
                              className="px-2 py-1.5 rounded-lg transition inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 opacity-40 border border-slate-500/20 cursor-not-allowed"
                              title="Admin Only: Only administrators can delete records"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px] text-slate-800">
                <div className="flex justify-between">
                  <span>1st 60 Min Base:</span>
                  <span>{formatCurrency(selectedRentalForReceipt.breakdown?.firstHourAmount || 0, settings.currencySymbol, settings.currencyPosition)}</span>
                </div>
                {((selectedRentalForReceipt.breakdown?.every30MinAmount ?? selectedRentalForReceipt.breakdown?.next30MinAmount) || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>
                      Every +30m ({selectedRentalForReceipt.breakdown?.every30MinCount || Math.ceil(((selectedRentalForReceipt.breakdown?.totalMinutes || 60) - 60) / 30)} × 30m):
                    </span>
                    <span>
                      +{formatCurrency((selectedRentalForReceipt.breakdown?.every30MinAmount ?? selectedRentalForReceipt.breakdown?.next30MinAmount) || 0, settings.currencySymbol, settings.currencyPosition)}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-900 pt-2 flex justify-between font-black text-sm text-slate-900">
                  <span>TOTAL PAID:</span>
                  <span>{formatCurrency(selectedRentalForReceipt.totalAmount, settings.currencySymbol, settings.currencyPosition)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 pt-1">
                  <span>Payment Method:</span>
                  <span className="uppercase">{selectedRentalForReceipt.paymentMethod || 'CASH'}</span>
                </div>
              </div>

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
                <span className="font-bold text-emerald-500">Paid Amount:</span>
                <span className="font-bold text-emerald-500">
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
    </div>
  );
};
