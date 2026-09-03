import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { AppSettings, IncomeEntry } from '../types';
import { formatCurrency } from '../utils/pricing';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { UserAccount } from '../utils/auth';

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

  // Form state
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const filteredEntries = useMemo(() => {
    if (filterType === 'all') return entries;
    return entries.filter((e) => e.type === filterType);
  }, [entries, filterType]);

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

    const newEntry: IncomeEntry = {
      id: `inc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      description: description.trim(),
      type,
      amount: parsedAmount,
      category,
      createdAt: Date.now(),
      cashierName: currentUser?.name || settings.cashierName || 'Cashier',
    };

    onAddEntry(newEntry);

    // Reset form
    setDescription('');
    setAmount('');
    setCategory('Other');
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

      {/* Entries Table */}
      <div className={`${t.cardBg} rounded-2xl border shadow-xl overflow-hidden`}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${t.divider}`}>
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <div>
              <h3 className={`text-sm font-bold ${t.textHeading}`}>Transaction History</h3>
              <p className={`text-xs ${t.textMuted}`}>{entries.length} entries total</p>
            </div>
          </div>
          {/* Filter buttons */}
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
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                      : ft === 'expense'
                      ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40'
                      : `${t.badge}`
                    : `${t.textMuted} hover:bg-slate-500/10`
                }`}
              >
                {ft === 'all' ? 'All' : ft}
              </button>
            ))}
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className={`text-center py-12 px-4`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 bg-slate-500/10 ${t.textMuted}`}>
              <DollarSign className="w-6 h-6" />
            </div>
            <h4 className={`text-sm font-semibold mb-1 ${t.textHeading}`}>No Entries Yet</h4>
            <p className={`text-xs ${t.textMuted}`}>Click "Add Entry" above to record your first income or expense.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`border-b ${t.divider} ${t.cardSubtleBg}`}>
                  <th className={`px-4 py-3 text-left font-bold uppercase tracking-wider ${t.textMuted}`}>Date</th>
                  <th className={`px-4 py-3 text-left font-bold uppercase tracking-wider ${t.textMuted}`}>Description</th>
                  <th className={`px-4 py-3 text-left font-bold uppercase tracking-wider ${t.textMuted}`}>Category</th>
                  <th className={`px-4 py-3 text-center font-bold uppercase tracking-wider ${t.textMuted}`}>Type</th>
                  <th className={`px-4 py-3 text-right font-bold uppercase tracking-wider ${t.textMuted}`}>Amount</th>
                  <th className={`px-4 py-3 text-center font-bold uppercase tracking-wider ${t.textMuted}`}>Action</th>
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

                    {/* Delete */}
                    <td className="px-4 py-3 text-center">
                      {deleteConfirmId === entry.id ? (
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
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
