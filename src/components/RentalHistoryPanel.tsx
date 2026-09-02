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
  Sparkles
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

interface RentalHistoryPanelProps {
  completedRentals: RentalRecord[];
  settings: AppSettings;
  themeMode?: ThemeMode;
  accent?: AccentColor;
}

type DateFilterMode = 'today' | 'all' | 'custom';

export const RentalHistoryPanel: React.FC<RentalHistoryPanelProps> = ({
  completedRentals,
  settings,
  themeMode = 'dark',
  accent = 'emerald',
}) => {
  // Date filter mode radio selection: 'today' | 'all' | 'custom'
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('today');
  
  // Get today's ISO date string (YYYY-MM-DD)
  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [fromDate, setFromDate] = useState<string>(getTodayISO());
  const [toDate, setToDate] = useState<string>(getTodayISO());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [selectedRentalForReceipt, setSelectedRentalForReceipt] = useState<RentalRecord | null>(null);

  const t = getThemeClasses(themeMode, accent);

  // Handle Radio Button changes
  const handleRadioModeChange = (mode: DateFilterMode) => {
    setDateFilterMode(mode);
    if (mode === 'today') {
      const today = getTodayISO();
      setFromDate(today);
      setToDate(today);
    } else if (mode === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  // Filter logic
  const filteredRentals = useMemo(() => {
    return completedRentals.filter((rental) => {
      const rentalDate = new Date(rental.endTime || rental.startTime);
      const rentalDateISO = `${rentalDate.getFullYear()}-${String(rentalDate.getMonth() + 1).padStart(2, '0')}-${String(rentalDate.getDate()).padStart(2, '0')}`;

      // 1. Date Filter
      if (dateFilterMode === 'today') {
        const todayISO = getTodayISO();
        if (rentalDateISO !== todayISO) {
          return false;
        }
      } else if (dateFilterMode === 'custom') {
        if (fromDate && rentalDateISO < fromDate) {
          return false;
        }
        if (toDate && rentalDateISO > toDate) {
          return false;
        }
      }

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
      if (filterType !== 'all' && rental.vehicleTypeId !== filterType) {
        return false;
      }

      // 4. Payment Method Filter
      if (filterPayment !== 'all' && (rental.paymentMethod || 'cash') !== filterPayment) {
        return false;
      }

      return true;
    });
  }, [completedRentals, dateFilterMode, fromDate, toDate, searchTerm, filterType, filterPayment]);

  // Aggregated Total Values (Always dynamically calculated & displayed)
  const filteredTotalValue = filteredRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const filteredTotalMinutes = filteredRentals.reduce((sum, r) => sum + (r.breakdown?.totalMinutes || 0), 0);
  const filteredCashValue = filteredRentals.filter(r => (r.paymentMethod || 'cash') === 'cash').reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const filteredDigitalValue = filteredTotalValue - filteredCashValue;

  const totalAllTimeValue = completedRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

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
    const dateLabel = dateFilterMode === 'today' ? 'Today' : dateFilterMode === 'custom' ? `${fromDate}_to_${toDate}` : 'All_Time';
    link.setAttribute('download', `Rental_History_Report_${dateLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      
      {/* 1. ALWAYS DISPLAY TOTAL VALUE KPI BANNER */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent ${t.cardBg} ${t.divider}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Main Total Value Display */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                {dateFilterMode === 'today' 
                  ? "Today's Total Value Collected" 
                  : dateFilterMode === 'custom' 
                  ? `Filtered Period Revenue (${fromDate || 'Start'} to ${toDate || 'Present'})` 
                  : 'All-Time Total Revenue Collected'}
              </span>
            </div>
            
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-2xl sm:text-4xl font-black text-emerald-500 tracking-tight">
                {formatCurrency(filteredTotalValue, settings.currencySymbol, settings.currencyPosition)}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${t.badge}`}>
                {filteredRentals.length} {filteredRentals.length === 1 ? 'Trip' : 'Trips'} Settled
              </span>
            </div>
            
            <p className={`text-xs ${t.textMuted}`}>
              Cash: <strong className={t.textMain}>{formatCurrency(filteredCashValue, settings.currencySymbol, settings.currencyPosition)}</strong>
              {filteredDigitalValue > 0 && (
                <> • Card/Digital: <strong className={t.textMain}>{formatCurrency(filteredDigitalValue, settings.currencySymbol, settings.currencyPosition)}</strong></>
              )}
            </p>
          </div>

          {/* Quick Metrics Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
            <div className={`p-3 rounded-xl border ${t.cardSubtleBg}`}>
              <span className={`text-[10px] uppercase font-bold block ${t.textMuted}`}>Filtered Trips</span>
              <span className={`font-mono text-lg font-black block mt-0.5 ${t.textHeading}`}>
                {filteredRentals.length}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${t.cardSubtleBg}`}>
              <span className={`text-[10px] uppercase font-bold block ${t.textMuted}`}>Fleet Ride Time</span>
              <span className="font-mono text-lg font-black block mt-0.5 text-blue-500">
                {Math.floor(filteredTotalMinutes / 60)}h {filteredTotalMinutes % 60}m
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${t.cardSubtleBg} col-span-2 sm:col-span-1`}>
              <span className={`text-[10px] uppercase font-bold block ${t.textMuted}`}>All-Time Total</span>
              <span className={`font-mono text-lg font-black block mt-0.5 ${t.textMuted}`}>
                {formatCurrency(totalAllTimeValue, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DATE FILTER CONTROL BAR WITH RADIO BUTTONS & DATE PICKERS */}
      <div className={`${t.cardBg} rounded-2xl p-4 sm:p-5 border shadow-xl space-y-4`}>
        
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${t.divider}`}>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <h3 className={`font-bold text-sm ${t.textHeading}`}>
              Daily & Historical Date Range Filters
            </h3>
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

        {/* Radio Buttons for Mode Selection */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 pt-1">
          <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition cursor-pointer ${
            dateFilterMode === 'today' 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold' 
              : `${t.cardSubtleBg} ${t.divider} ${t.textMuted}`
          }`}>
            <input
              type="radio"
              id="radio-filter-today"
              name="dateFilterMode"
              value="today"
              checked={dateFilterMode === 'today'}
              onChange={() => handleRadioModeChange('today')}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
            <span className="text-xs">🔘 Today's Value ({getTodayISO()})</span>
          </label>

          <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition cursor-pointer ${
            dateFilterMode === 'all' 
              ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-bold' 
              : `${t.cardSubtleBg} ${t.divider} ${t.textMuted}`
          }`}>
            <input
              type="radio"
              id="radio-filter-all"
              name="dateFilterMode"
              value="all"
              checked={dateFilterMode === 'all'}
              onChange={() => handleRadioModeChange('all')}
              className="w-4 h-4 accent-blue-500 cursor-pointer"
            />
            <span className="text-xs">🔘 All-Time History</span>
          </label>

          <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition cursor-pointer ${
            dateFilterMode === 'custom' 
              ? 'bg-purple-500/10 border-purple-500/40 text-purple-400 font-bold' 
              : `${t.cardSubtleBg} ${t.divider} ${t.textMuted}`
          }`}>
            <input
              type="radio"
              id="radio-filter-custom"
              name="dateFilterMode"
              value="custom"
              checked={dateFilterMode === 'custom'}
              onChange={() => handleRadioModeChange('custom')}
              className="w-4 h-4 accent-purple-500 cursor-pointer"
            />
            <span className="text-xs">🔘 Custom From & To Date Range</span>
          </label>
        </div>

        {/* From & To Date Pickers with Visible Calendar Icons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* From Date */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${t.textHeading} flex items-center gap-1.5`}>
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>From Date</span>
            </label>
            <div className="relative flex items-center">
              <div 
                className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500"
              >
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="input-filter-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setDateFilterMode('custom');
                }}
                className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-medium ${t.textInput} cursor-pointer`}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch (err) {}
                }}
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
              <div 
                className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-400"
              >
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="input-filter-to-date"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setDateFilterMode('custom');
                }}
                className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-medium ${t.textInput} cursor-pointer`}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch (err) {}
                }}
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
              onChange={(e) => setFilterPayment(e.target.value)}
              className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${t.dropdownInput}`}
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash Only</option>
              <option value="card">Card / POS</option>
              <option value="qr">QR Code Transfer</option>
            </select>
          </div>

          {/* Quick Reset Filter */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => handleRadioModeChange('today')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition cursor-pointer ${t.inactiveTab}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Today</span>
            </button>
          </div>
        </div>

        {/* Search Input (Cyan Theme) */}
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-medium ${t.searchInput}`}
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-500">
              <Search className="w-4 h-4" />
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-500" />
            <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
              Settled Rental Receipts & Detailed Log
            </h2>
          </div>
          <span className={`text-xs font-mono font-bold text-emerald-500`}>
            Total: {formatCurrency(filteredTotalValue, settings.currencySymbol, settings.currencyPosition)}
          </span>
        </div>

        {filteredRentals.length === 0 ? (
          <div className={`text-center py-12 text-xs border border-dashed rounded-xl ${t.cardSubtleBg} ${t.textMuted} ${t.divider}`}>
            {completedRentals.length === 0
              ? 'No completed rentals yet. When an active rental is stopped, its receipt will show here.'
              : 'No rentals matched your selected date range or search query.'}
          </div>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${t.divider}`}>
            <table className="w-full text-left text-xs whitespace-nowrap sm:whitespace-normal">
              <thead className={`${t.cardSubtleBg} uppercase font-semibold border-b ${t.divider} ${t.textMuted}`}>
                <tr>
                  <th className="px-3.5 py-3">Receipt #</th>
                  <th className="px-3.5 py-3">Serial & Type</th>
                  <th className="px-3.5 py-3">Customer ID / Name</th>
                  <th className="px-3.5 py-3">Start / Return Time</th>
                  <th className="px-3.5 py-3">Duration</th>
                  <th className="px-3.5 py-3">Paid Amount</th>
                  <th className="px-3.5 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divider}`}>
                {filteredRentals.map((rental) => (
                  <tr key={rental.id} className="hover:bg-slate-500/5 transition">
                    <td className={`px-3.5 py-3 font-mono font-bold ${t.textHeading}`}>
                      #{rental.rentalNumber}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-2">
                        <VehicleIcon type={rental.vehicleIcon} className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className={`font-mono font-bold ${t.textHeading}`}>
                          {rental.vehicleSerialNumber}
                        </span>
                        <span className={`text-[10px] ${t.textMuted}`}>
                          ({rental.vehicleTypeName})
                        </span>
                      </div>
                    </td>
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
                    <td className="px-3.5 py-3">
                      <div className={`font-mono text-[11px] ${t.textMain}`}>
                        {formatTime(rental.startTime)} → {rental.endTime ? formatTime(rental.endTime) : '—'}
                      </div>
                      <div className={`text-[10px] ${t.textMuted}`}>
                        {formatDate(rental.startTime)}
                      </div>
                    </td>
                    <td className="px-3.5 py-3">
                      <span className={`px-2 py-0.5 rounded font-mono font-semibold border ${t.cardSubtleBg} text-emerald-500`}>
                        {rental.breakdown?.durationFormatted || `${rental.breakdown?.totalMinutes} mins`}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="font-mono font-bold text-emerald-500 text-sm">
                        {formatCurrency(rental.totalAmount, settings.currencySymbol, settings.currencyPosition)}
                      </span>
                      <span className={`text-[10px] block capitalize ${t.textMuted}`}>
                        via {rental.paymentMethod || 'cash'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <button
                        id={`btn-view-receipt-${rental.rentalNumber}`}
                        onClick={() => setSelectedRentalForReceipt(rental)}
                        className={`px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${t.inactiveTab}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
};
