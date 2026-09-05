import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  Tag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  Filter,
  Lock,
  ArrowUp,
  ArrowDown,
  User,
} from 'lucide-react';
import { AppSettings, IncomeEntry } from '../types';
import { formatCurrency } from '../utils/pricing';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { DEFAULT_USER, UserAccount, getStoredUsers } from '../utils/auth';

interface IncomeExpensesPanelProps {
  entries: IncomeEntry[];
  settings: AppSettings;
  themeMode: ThemeMode;
  accent: AccentColor;
  currentUser?: UserAccount;
  onAddEntry: (entry: IncomeEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const CATEGORIES = [
  'Rental Revenue',
  'Equipment Sale',
  'Maintenance',
  'Fuel',
  'Salary',
  'Utilities',
  'Marketing',
  'Insurance',
  'Other',
];

const BASE_WHO_OPTIONS = [
  'Mark',
  'Jenis',
  'Beni',
];

export const IncomeExpensesPanel: React.FC<IncomeExpensesPanelProps> = ({
  entries,
  settings,
  themeMode,
  accent,
  currentUser,
  onAddEntry,
  onDeleteEntry,
}) => {
  const t = getThemeClasses(themeMode, accent);

  // Admin Authorization check - Strictly root admin or admin role
  const isRootAdmin = currentUser?.email?.toLowerCase() === DEFAULT_USER.email.toLowerCase();
  const isAdmin = currentUser?.role === 'admin' || isRootAdmin;

  // Dynamic known staff list
  const staffOptions = useMemo(() => {
    const names = new Set<string>();
    if (currentUser?.name) names.add(currentUser.name);
    try {
      const stored = getStoredUsers();
      stored.forEach((u) => { if (u.name) names.add(u.name); });
    } catch {
      // ignore
    }
    entries.forEach((e) => { if (e.who) names.add(e.who); });
    BASE_WHO_OPTIONS.forEach((n) => names.add(n));
    return Array.from(names).filter(Boolean);
  }, [currentUser, entries]);

  // Form state - Who defaults to currently logged-in user, never defaulting to "Mark"
  const defaultWho = currentUser?.name || 'Staff';
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [who, setWho] = useState(defaultWho);
  const [customWho, setCustomWho] = useState('');
  const [isCustomWho, setIsCustomWho] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Sync who with currentUser if not manually changed
  useEffect(() => {
    if (currentUser?.name && (who === 'Staff' || who === 'Mark' || !who)) {
      setWho(currentUser.name);
    }
  }, [currentUser]);

  // Filter and Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sorting State
  type SortField = 'date' | 'description' | 'category' | 'who' | 'type' | 'amount';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField, explicitDir?: 'asc' | 'desc') => {
    if (explicitDir) {
      setSortField(field);
      setSortDir(explicitDir);
    } else if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSetToday = () => {
    const today = getTodayISO();
    setFromDate(today);
    setToDate(today);
  };

  const handleClearDates = () => {
    setFromDate('');
    setToDate('');
  };

  // Computed totals
  const totalIncome = useMemo(
    () => entries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0),
    [entries]
  );
  const totalExpenses = useMemo(
    () => entries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    [entries]
  );
  const netProfit = totalIncome - totalExpenses;

  // Filtered & Sorted Entries
  const filteredEntries = useMemo(() => {
    let list = entries.filter((entry) => {
      // 1. Type Filter
      if (filterType !== 'all' && entry.type !== filterType) return false;

      // 2. Date Range Filter
      if (fromDate && entry.date < fromDate) return false;
      if (toDate && entry.date > toDate) return false;

      // 3. Global Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          (entry.date || '').toLowerCase().includes(q) ||
          (entry.description || '').toLowerCase().includes(q) ||
          (entry.category || '').toLowerCase().includes(q) ||
          (entry.who || '').toLowerCase().includes(q) ||
          (entry.cashierName || '').toLowerCase().includes(q) ||
          (entry.type || '').toLowerCase().includes(q) ||
          entry.amount.toString().includes(q);
        if (!matches) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'date':
          aVal = a.date || '';
          bVal = b.date || '';
          break;
        case 'description':
          aVal = (a.description || '').toLowerCase();
          bVal = (b.description || '').toLowerCase();
          break;
        case 'category':
          aVal = (a.category || '').toLowerCase();
          bVal = (b.category || '').toLowerCase();
          break;
        case 'who':
          aVal = (a.who || '').toLowerCase();
          bVal = (b.who || '').toLowerCase();
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
        return sortDir === 'asc' ? comp : -comp;
      } else {
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }
    });

    return list;
  }, [entries, filterType, fromDate, toDate, searchTerm, sortField, sortDir]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedAmount = parseFloat(amount);
    if (!description.trim()) {
      setFormError('Description is required.');
      return;
    }
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid positive amount.');
      return;
    }
    if (!date) {
      setFormError('Please select a date.');
      return;
    }

    const finalWho = isCustomWho && customWho.trim() ? customWho.trim() : (who.trim() || defaultWho);

    const newEntry: IncomeEntry = {
      id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      description: description.trim(),
      type,
      amount: parsedAmount,
      category,
      who: finalWho,
      createdAt: Date.now(),
      cashierName: currentUser?.name || settings.cashierName || 'Cashier',
    };

    onAddEntry(newEntry);

    // Reset form
    setDescription('');
    setAmount('');
    setCategory('Other');
    setWho(defaultWho);
    setCustomWho('');
    setIsCustomWho(false);
    setDate(new Date().toISOString().slice(0, 10));
    setFormError(null);
    setFormSuccess(true);
    setTimeout(() => setFormSuccess(false), 3000);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Income */}
        <div className={`p-5 rounded-2xl border shadow-lg ${t.cardBg}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>Total Income</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-500 font-mono">
            {formatCurrency(totalIncome, settings.currencySymbol, settings.currencyPosition)}
          </p>
          <p className={`text-xs mt-1 ${t.textMuted}`}>{entries.filter((e) => e.type === 'income').length} entries</p>
        </div>

        {/* Total Expenses */}
        <div className={`p-5 rounded-2xl border shadow-lg ${t.cardBg}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-500" />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>Total Expenses</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-500 font-mono">
            {formatCurrency(totalExpenses, settings.currencySymbol, settings.currencyPosition)}
          </p>
          <p className={`text-xs mt-1 ${t.textMuted}`}>{entries.filter((e) => e.type === 'expense').length} entries</p>
        </div>

        {/* Net Profit */}
        <div className={`p-5 rounded-2xl border shadow-lg ${t.cardBg}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${netProfit >= 0 ? 'bg-violet-500/15' : 'bg-amber-500/15'}`}>
              <DollarSign className={`w-5 h-5 ${netProfit >= 0 ? 'text-violet-500' : 'text-amber-500'}`} />
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>Net Profit</span>
          </div>
          <p className={`text-2xl sm:text-3xl font-extrabold font-mono ${netProfit >= 0 ? 'text-violet-500' : 'text-amber-500'}`}>
            {netProfit < 0 ? '-' : ''}{formatCurrency(Math.abs(netProfit), settings.currencySymbol, settings.currencyPosition)}
          </p>
          <p className={`text-xs mt-1 ${t.textMuted}`}>{netProfit >= 0 ? 'Profit' : 'Loss'} this period</p>
        </div>
      </div>

      {/* Add Entry Form Toggle */}
      <div className={`${t.cardBg} rounded-2xl border shadow-xl overflow-hidden`}>
        <div
          className={`flex items-center justify-between px-5 py-4 cursor-pointer border-b ${t.divider}`}
          onClick={() => setShowForm(!showForm)}
          id="btn-toggle-income-form"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center shadow-md">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${t.textHeading}`}>Add New Entry</h3>
              <p className={`text-xs ${t.textMuted}`}>Record income or expense</p>
            </div>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${t.badge}`}>
            {showForm ? 'Close' : 'Add Entry'}
          </span>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {formError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Entry added successfully!</span>
              </div>
            )}

            {/* Type selector */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${t.textHeading}`}>
                Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-type-income"
                  onClick={() => setType('income')}
                  className={`py-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    type === 'income'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                      : `${t.cardSubtleBg} border-transparent ${t.textMuted} hover:border-emerald-500/40`
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Income
                </button>
                <button
                  type="button"
                  id="btn-type-expense"
                  onClick={() => setType('expense')}
                  className={`py-3 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    type === 'expense'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                      : `${t.cardSubtleBg} border-transparent ${t.textMuted} hover:border-rose-500/40`
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  Expense
                </button>
              </div>
            </div>

            {/* Date & Amount row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${t.textHeading}`}>
                  <Calendar className="inline w-3.5 h-3.5 mr-1" />
                  Date
                </label>
                <input
                  id="input-income-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-xs font-medium ${t.textInput}`}
                  required
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${t.textHeading}`}>
                  <DollarSign className="inline w-3.5 h-3.5 mr-1" />
                  Amount ({settings.currencySymbol})
                </label>
                <input
                  id="input-income-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-xs font-mono font-bold ${t.textInput}`}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${t.textHeading}`}>
                Description
              </label>
              <input
                id="input-income-description"
                type="text"
                placeholder="e.g. Bike rental payment, Fuel purchase..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full rounded-xl px-3 py-2.5 text-xs ${t.textInput}`}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${t.textHeading}`}>
                <Tag className="inline w-3.5 h-3.5 mr-1" />
                Category
              </label>
              <select
                id="select-income-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full rounded-xl px-3 py-2.5 text-xs font-medium appearance-none ${t.dropdownInput}`}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Who / Handled By */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-semibold uppercase tracking-wider ${t.textHeading}`}>
                  <User className="inline w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Who / Handled By
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomWho(!isCustomWho);
                    if (!isCustomWho) {
                      setCustomWho('');
                    }
                  }}
                  className="text-[11px] font-semibold text-emerald-500 hover:underline cursor-pointer"
                >
                  {isCustomWho ? '← Choose from staff' : '+ Custom name'}
                </button>
              </div>

              {isCustomWho ? (
                <input
                  id="input-income-custom-who"
                  type="text"
                  placeholder="Enter person / staff name..."
                  value={customWho}
                  onChange={(e) => setCustomWho(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-xs font-medium ${t.textInput}`}
                  required={isCustomWho}
                  autoFocus
                />
              ) : (
                <select
                  id="select-income-who"
                  value={who}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomWho(true);
                      setCustomWho('');
                    } else {
                      setWho(e.target.value);
                    }
                  }}
                  className={`w-full rounded-xl px-3 py-2.5 text-xs font-medium appearance-none ${t.dropdownInput}`}
                >
                  {staffOptions.map((name) => (
                    <option key={name} value={name}>
                      {name} {currentUser?.name === name ? '(You)' : ''}
                    </option>
                  ))}
                  <option value="__custom__">+ Enter Custom Person Name...</option>
                </select>
              )}
            </div>

            {/* Submit */}
            <button
              id="btn-save-income-entry"
              type="submit"
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer active:scale-[0.99] ${t.primaryBtn}`}
            >
              <Plus className="w-5 h-5" />
              Save {type === 'income' ? 'Income' : 'Expense'} Entry
            </button>
          </form>
        )}
      </div>

      {/* Entries Table & Filter Controls */}
      <div className={`${t.cardBg} rounded-2xl border shadow-xl overflow-hidden space-y-4`}>
        
        {/* Table Header & Controls Bar */}
        <div className={`p-5 border-b ${t.divider} space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <div>
                <h3 className={`text-sm font-bold ${t.textHeading}`}>Transaction History & Ledger</h3>
                <p className={`text-xs ${t.textMuted}`}>{filteredEntries.length} entries shown ({entries.length} total)</p>
              </div>
            </div>

            {/* Type selector pills */}
            <div className="flex items-center gap-1.5">
              {(['all', 'income', 'expense'] as const).map((ft) => (
                <button
                  key={ft}
                  id={`btn-filter-${ft}`}
                  type="button"
                  onClick={() => setFilterType(ft)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition cursor-pointer ${
                    filterType === ft
                      ? ft === 'income'
                        ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 font-bold'
                        : ft === 'expense'
                        ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40 font-bold'
                        : `${t.badge} font-bold`
                      : `${t.textMuted} hover:bg-slate-500/10`
                  }`}
                >
                  {ft === 'all' ? 'All Transactions' : ft === 'income' ? 'Income Only' : 'Expenses Only'}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range & Global Search Row */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            {/* From Date */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-500 mb-1">
                From Date
              </label>
              <div className="relative">
                <input
                  id="input-income-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-medium ${t.textInput}`}
                />
              </div>
            </div>

            {/* To Date */}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-teal-400 mb-1">
                To Date
              </label>
              <div className="relative">
                <input
                  id="input-income-to-date"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-medium ${t.textInput}`}
                />
              </div>
            </div>

            {/* Date Quick Actions */}
            <div className="sm:col-span-2 flex items-end gap-1.5">
              <button
                type="button"
                onClick={handleSetToday}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition cursor-pointer ${t.inactiveTab}`}
                title="Filter Today"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                <span>Today</span>
              </button>
              <button
                type="button"
                onClick={handleClearDates}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition cursor-pointer ${t.inactiveTab}`}
                title="Show All Dates"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
                <span>Clear</span>
              </button>
            </div>

            {/* Global Search Bar */}
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-cyan-500 mb-1">
                Global Search
              </label>
              <div className="relative">
                <input
                  id="input-income-search"
                  type="text"
                  placeholder="Search description, who, category, amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full rounded-xl pl-8 pr-8 py-2 text-xs font-medium ${t.searchInput}`}
                />
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-cyan-500">
                  <Filter className="w-3.5 h-3.5" />
                </div>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-cyan-500 hover:text-cyan-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-slate-500/10 ${t.textMuted}`}>
              <DollarSign className="w-6 h-6" />
            </div>
            <h4 className={`text-sm font-semibold mb-1 ${t.textHeading}`}>No Entries Found</h4>
            <p className={`text-xs ${t.textMuted}`}>
              {searchTerm || fromDate || toDate
                ? 'No transactions matched your search or date filter.'
                : 'Click "Add Entry" above to record your first income or expense.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${t.divider} ${t.cardSubtleBg}`}>
                  {/* Date Column */}
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider select-none">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort('date')}
                        className={`font-bold text-xs cursor-pointer hover:underline ${sortField === 'date' ? `${t.textHeading} font-black` : t.textMuted}`}
                      >
                        Date
                      </button>
                      <div className="inline-flex items-center rounded border border-slate-500/30 overflow-hidden bg-slate-500/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSort('date', 'asc')}
                          title="Sort Ascending (▲)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'date' && sortDir === 'asc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <div className="w-[1px] h-3 bg-slate-500/30" />
                        <button
                          type="button"
                          onClick={() => handleSort('date', 'desc')}
                          title="Sort Descending (▼)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'date' && sortDir === 'desc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </th>

                  {/* Description Column */}
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider select-none">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort('description')}
                        className={`font-bold text-xs cursor-pointer hover:underline ${sortField === 'description' ? `${t.textHeading} font-black` : t.textMuted}`}
                      >
                        Description
                      </button>
                      <div className="inline-flex items-center rounded border border-slate-500/30 overflow-hidden bg-slate-500/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSort('description', 'asc')}
                          title="Sort Ascending (▲)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'description' && sortDir === 'asc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <div className="w-[1px] h-3 bg-slate-500/30" />
                        <button
                          type="button"
                          onClick={() => handleSort('description', 'desc')}
                          title="Sort Descending (▼)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'description' && sortDir === 'desc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </th>

                  {/* Category Column */}
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider select-none">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort('category')}
                        className={`font-bold text-xs cursor-pointer hover:underline ${sortField === 'category' ? `${t.textHeading} font-black` : t.textMuted}`}
                      >
                        Category
                      </button>
                      <div className="inline-flex items-center rounded border border-slate-500/30 overflow-hidden bg-slate-500/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSort('category', 'asc')}
                          title="Sort Ascending (▲)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'category' && sortDir === 'asc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <div className="w-[1px] h-3 bg-slate-500/30" />
                        <button
                          type="button"
                          onClick={() => handleSort('category', 'desc')}
                          title="Sort Descending (▼)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'category' && sortDir === 'desc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </th>

                  {/* Who Column */}
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider select-none">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort('who')}
                        className={`font-bold text-xs cursor-pointer hover:underline ${sortField === 'who' ? `${t.textHeading} font-black` : t.textMuted}`}
                      >
                        Who
                      </button>
                      <div className="inline-flex items-center rounded border border-slate-500/30 overflow-hidden bg-slate-500/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSort('who', 'asc')}
                          title="Sort Ascending (▲)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'who' && sortDir === 'asc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <div className="w-[1px] h-3 bg-slate-500/30" />
                        <button
                          type="button"
                          onClick={() => handleSort('who', 'desc')}
                          title="Sort Descending (▼)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'who' && sortDir === 'desc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </th>

                  {/* Type Column */}
                  <th className="px-4 py-3 text-center font-bold uppercase tracking-wider select-none">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort('type')}
                        className={`font-bold text-xs cursor-pointer hover:underline ${sortField === 'type' ? `${t.textHeading} font-black` : t.textMuted}`}
                      >
                        Type
                      </button>
                      <div className="inline-flex items-center rounded border border-slate-500/30 overflow-hidden bg-slate-500/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSort('type', 'asc')}
                          title="Sort Ascending (▲)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'type' && sortDir === 'asc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <div className="w-[1px] h-3 bg-slate-500/30" />
                        <button
                          type="button"
                          onClick={() => handleSort('type', 'desc')}
                          title="Sort Descending (▼)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'type' && sortDir === 'desc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </th>

                  {/* Amount Column */}
                  <th className="px-4 py-3 text-right font-bold uppercase tracking-wider select-none">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleSort('amount')}
                        className={`font-bold text-xs cursor-pointer hover:underline ${sortField === 'amount' ? `${t.textHeading} font-black` : t.textMuted}`}
                      >
                        Amount
                      </button>
                      <div className="inline-flex items-center rounded border border-slate-500/30 overflow-hidden bg-slate-500/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSort('amount', 'asc')}
                          title="Sort Ascending (▲)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'amount' && sortDir === 'asc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <div className="w-[1px] h-3 bg-slate-500/30" />
                        <button
                          type="button"
                          onClick={() => handleSort('amount', 'desc')}
                          title="Sort Descending (▼)"
                          className={`p-1 transition cursor-pointer flex items-center justify-center ${sortField === 'amount' && sortDir === 'desc' ? 'bg-emerald-500 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </th>

                  {/* Action Column */}
                  <th className={`px-4 py-3 text-center font-bold uppercase tracking-wider ${t.textMuted}`}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divider}`}>
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`transition-colors hover:${t.cardSubtleBg}`}
                  >
                    {/* Date */}
                    <td className={`px-4 py-3 font-mono ${t.textMain} whitespace-nowrap`}>
                      {entry.date}
                    </td>

                    {/* Description */}
                    <td className={`px-4 py-3 ${t.textMain} max-w-[200px]`}>
                      <p className="font-medium truncate">{entry.description}</p>
                      {entry.cashierName && (
                        <p className={`text-[10px] ${t.textMuted}`}>by {entry.cashierName}</p>
                      )}
                    </td>

                    {/* Category */}
                    <td className={`px-4 py-3 ${t.textMuted} whitespace-nowrap`}>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${t.cardSubtleBg}`}>
                        {entry.category || 'Other'}
                      </span>
                    </td>

                    {/* Who */}
                    <td className={`px-4 py-3 ${t.textMuted} whitespace-nowrap`}>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-500/10 text-slate-600 border border-slate-500/20`}>
                        {entry.who || '—'}
                      </span>
                    </td>

                    {/* Type badge */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          entry.type === 'income'
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                        }`}
                      >
                        {entry.type === 'income' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {entry.type === 'income' ? 'Income' : 'Expense'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className={`px-4 py-3 text-right font-mono font-extrabold ${entry.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {entry.type === 'expense' ? '-' : ''}{formatCurrency(entry.amount, settings.currencySymbol, settings.currencyPosition)}
                    </td>

                    {/* Delete: Admin Only */}
                    <td className="px-4 py-3 text-center">
                      {isAdmin ? (
                        deleteConfirmId === entry.id ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteEntry(entry.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg transition cursor-pointer ${t.cardSubtleBg} ${t.textMuted}`}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            id={`btn-delete-entry-${entry.id}`}
                            onClick={() => setDeleteConfirmId(entry.id)}
                            className={`p-1.5 rounded-lg transition cursor-pointer text-rose-500 hover:bg-rose-500/10`}
                            title="Delete entry (Admin Only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => alert('Permission Denied: Only an Administrator can delete income/expense records.')}
                          className="p-1.5 rounded-lg transition text-slate-500 opacity-40 border border-slate-500/20 cursor-not-allowed inline-flex items-center justify-center"
                          title="Admin Only: Only administrators can delete records"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
