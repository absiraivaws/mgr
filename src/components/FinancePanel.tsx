/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  FileText,
  PieChart,
  BookOpen,
  Settings,
  Download,
  Printer,
  Search,
  Check,
  Edit2,
  Copy,
  CreditCard,
  Building,
  QrCode,
  Layers,
} from 'lucide-react';
import { AppSettings, IncomeEntry, FinanceCategoryConfig } from '../types';
import { formatCurrency } from '../utils/pricing';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { DEFAULT_USER, UserAccount, getStoredUsers, hasPermission } from '../utils/auth';
import { recordAuditLog } from '../utils/audit';

interface FinancePanelProps {
  entries: IncomeEntry[];
  settings: AppSettings;
  themeMode: ThemeMode;
  accent: AccentColor;
  currentUser?: UserAccount;
  onAddEntry: (entry: IncomeEntry) => void;
  onUpdateEntry?: (entry: IncomeEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const STORAGE_CATEGORIES_KEY = 'v_rental_finance_categories';

const DEFAULT_CATEGORIES: FinanceCategoryConfig = {
  incomeCategories: [
    'Rental Income',
    'Equipment Sale',
    'Deposit Forfeited',
    'Late Return Fee',
    'Damage Compensation',
    'Other Income',
  ],
  expenseCategories: [
    'Fleet Maintenance & Repairs',
    'Spare Parts & Accessories',
    'Shop Rent & Lease',
    'Staff Salary & Commission',
    'Electricity & Utilities',
    'Fuel & Transport',
    'Marketing & Promotions',
    'Software & Internet',
    'Taxes & Licenses',
    'Other Expenses',
  ],
};

export const FinancePanel: React.FC<FinancePanelProps> = ({
  entries,
  settings,
  themeMode,
  accent,
  currentUser,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}) => {
  const t = getThemeClasses(themeMode, accent);
  const isDark = themeMode !== 'light';
  const activeUser = currentUser || DEFAULT_USER;
  const isRootAdmin = activeUser.email.toLowerCase() === DEFAULT_USER.email.toLowerCase();
  const isAdmin = activeUser.role === 'admin' || isRootAdmin;

  // RBAC checks: Staff with Finance access can View and Add. Admin can View, Add, Edit, and Delete.
  const canAccessFinance = hasPermission(activeUser, 'accessFinance') || isAdmin;
  const canAdd = canAccessFinance;
  const canEdit = isAdmin;
  const canDelete = isAdmin;
  const canViewPL = canAccessFinance;
  const canViewStatement = canAccessFinance;
  const canExport = hasPermission(activeUser, 'canExportFinanceReports') || isAdmin;

  // Active Sub-tab in Finance
  const [activeSubTab, setActiveSubTab] = useState<'transactions' | 'pl' | 'statement' | 'categories'>('transactions');

  // Categories config state
  const [categoriesConfig, setCategoriesConfig] = useState<FinanceCategoryConfig>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_CATEGORIES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.incomeCategories && parsed.expenseCategories) return parsed;
      }
    } catch {}
    return DEFAULT_CATEGORIES;
  });

  const saveCategories = (updated: FinanceCategoryConfig) => {
    setCategoriesConfig(updated);
    try {
      localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save categories:', err);
    }
  };

  // Staff options for dropdown
  const staffOptions = useMemo(() => {
    const names = new Set<string>();
    if (activeUser.name) names.add(activeUser.name);
    try {
      const stored = getStoredUsers();
      stored.forEach((u) => { if (u.name) names.add(u.name); });
    } catch {}
    if (settings.cashierName) names.add(settings.cashierName);
    entries.forEach((e) => {
      if (e.who) names.add(e.who);
      if (e.cashierName) names.add(e.cashierName);
    });
    return Array.from(names).filter(Boolean).sort();
  }, [activeUser, entries, settings]);

  // ================= TOP DASHBOARD METRICS =================
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentYearMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const todayMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const e of entries) {
      if (e.date === todayStr) {
        if (e.type === 'income') income += e.amount;
        else expense += e.amount;
      }
    }
    return { income, expense, profit: income - expense };
  }, [entries, todayStr]);

  const monthMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const e of entries) {
      if (e.date.startsWith(currentYearMonth)) {
        if (e.type === 'income') income += e.amount;
        else expense += e.amount;
      }
    }
    return { income, expense, profit: income - expense };
  }, [entries, currentYearMonth]);

  // ================= TRANSACTIONS TAB STATE =================
  const [txnSearch, setTxnSearch] = useState('');
  const [txnTypeFilter, setTxnTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [txnCategoryFilter, setTxnCategoryFilter] = useState<string>('all');
  const [txnFromDate, setTxnFromDate] = useState<string>('');
  const [txnToDate, setTxnToDate] = useState<string>('');
  const [txnMethodFilter, setTxnMethodFilter] = useState<string>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(todayStr);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [formCategory, setFormCategory] = useState('Rental Income');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'qr_transfer' | 'other'>('cash');
  const [formWho, setFormWho] = useState(activeUser.name || 'Staff');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deletingEntry, setDeletingEntry] = useState<IncomeEntry | null>(null);

  // Filtered transactions
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (txnTypeFilter !== 'all' && e.type !== txnTypeFilter) return false;
      if (txnCategoryFilter !== 'all' && (e.category || 'Other') !== txnCategoryFilter) return false;
      if (txnMethodFilter !== 'all' && (e.paymentMethod || 'cash') !== txnMethodFilter) return false;
      if (txnFromDate && e.date < txnFromDate) return false;
      if (txnToDate && e.date > txnToDate) return false;
      if (txnSearch.trim()) {
        const q = txnSearch.trim().toLowerCase();
        const matchDesc = (e.description || '').toLowerCase().includes(q);
        const matchRef = (e.reference || '').toLowerCase().includes(q);
        const matchWho = (e.who || e.cashierName || '').toLowerCase().includes(q);
        const matchCat = (e.category || '').toLowerCase().includes(q);
        if (!matchDesc && !matchRef && !matchWho && !matchCat) return false;
      }
      return true;
    });
  }, [entries, txnTypeFilter, txnCategoryFilter, txnMethodFilter, txnFromDate, txnToDate, txnSearch]);

  const filteredTotals = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const e of filteredEntries) {
      if (e.type === 'income') inc += e.amount;
      else exp += e.amount;
    }
    return { inc, exp, net: inc - exp };
  }, [filteredEntries]);

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingEntryId(null);
    setFormDate(todayStr);
    setFormType('income');
    setFormCategory(categoriesConfig.incomeCategories[0] || 'Rental Income');
    setFormAmount('');
    setFormDescription('');
    setFormReference(`TXN-${Date.now().toString().slice(-6)}`);
    setFormPaymentMethod('cash');
    setFormWho(activeUser.name || 'Staff');
    setFormRemarks('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (entry: IncomeEntry) => {
    if (!isAdmin) {
      alert('Permission Denied: Only administrators are authorized to edit finance transactions.');
      return;
    }
    setEditingEntryId(entry.id);
    setFormDate(entry.date);
    setFormType(entry.type);
    setFormCategory(entry.category || (entry.type === 'income' ? 'Rental Income' : 'Other Expenses'));
    setFormAmount(String(entry.amount));
    setFormDescription(entry.description);
    setFormReference(entry.reference || '');
    setFormPaymentMethod(entry.paymentMethod || 'cash');
    setFormWho(entry.who || entry.cashierName || activeUser.name || 'Staff');
    setFormRemarks(entry.remarks || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Save Transaction (Add or Edit)
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Please enter a description for this transaction.');
      return;
    }

    if (editingEntryId) {
      // Edit - strictly admin only
      if (!isAdmin) {
        setFormError('Permission Denied: Only administrators are authorized to edit finance transactions.');
        alert('Permission Denied: Only administrators are authorized to edit finance transactions.');
        return;
      }
      const updated: IncomeEntry = {
        id: editingEntryId,
        date: formDate,
        type: formType,
        category: formCategory,
        amount: amt,
        description: formDescription.trim(),
        reference: formReference.trim() || undefined,
        paymentMethod: formPaymentMethod,
        who: formWho.trim(),
        cashierName: formWho.trim(),
        remarks: formRemarks.trim() || undefined,
        createdAt: Date.now(),
      };

      if (onUpdateEntry) {
        onUpdateEntry(updated);
      } else {
        onDeleteEntry(editingEntryId);
        onAddEntry(updated);
      }

      recordAuditLog({
        user: activeUser.name || 'Staff',
        userEmail: activeUser.email,
        action: 'Finance Transaction Edited',
        reference: updated.reference || updated.id,
        details: `Updated ${formType} of ${formatCurrency(amt, settings.currencySymbol, settings.currencyPosition)} (${formCategory}): ${formDescription}`,
      });
    } else {
      // Add
      const newEntry: IncomeEntry = {
        id: `fin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: formDate,
        type: formType,
        category: formCategory,
        amount: amt,
        description: formDescription.trim(),
        reference: formReference.trim() || undefined,
        paymentMethod: formPaymentMethod,
        who: formWho.trim(),
        cashierName: formWho.trim(),
        remarks: formRemarks.trim() || undefined,
        createdAt: Date.now(),
      };

      onAddEntry(newEntry);

      recordAuditLog({
        user: activeUser.name || 'Staff',
        userEmail: activeUser.email,
        action: 'Finance Transaction Added',
        reference: newEntry.reference || newEntry.id,
        details: `Added new ${formType} of ${formatCurrency(amt, settings.currencySymbol, settings.currencyPosition)} (${formCategory}): ${formDescription}`,
      });
    }

    setIsModalOpen(false);
  };

  // Delete transaction confirm
  const handleConfirmDelete = () => {
    if (!deletingEntry) return;

    if (!isAdmin) {
      alert('Permission Denied: Only administrators are authorized to delete finance transactions.');
      setDeletingEntry(null);
      return;
    }

    recordAuditLog({
      user: activeUser.name || 'Staff',
      userEmail: activeUser.email,
      action: 'Finance Transaction Deleted',
      reference: deletingEntry.reference || deletingEntry.id,
      details: `Deleted ${deletingEntry.type} entry of ${formatCurrency(deletingEntry.amount, settings.currencySymbol, settings.currencyPosition)} (${deletingEntry.category}): ${deletingEntry.description}`,
    });

    onDeleteEntry(deletingEntry.id);
    setDeletingEntry(null);
  };

  // CSV Export for filtered transactions
  const handleExportCSV = () => {
    const headers = ['Date', 'Reference', 'Type', 'Category', 'Description', 'Amount', 'Payment Method', 'Entered By', 'Remarks'];
    const rows = filteredEntries.map((e) => [
      e.date,
      e.reference || '',
      e.type.toUpperCase(),
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.amount,
      e.paymentMethod || 'cash',
      `"${(e.who || e.cashierName || '').replace(/"/g, '""')}"`,
      `"${(e.remarks || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Finance_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================= PROFIT & LOSS TAB STATE & CALCULATIONS =================
  const [plPeriodPreset, setPlPeriodPreset] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [plFromDate, setPlFromDate] = useState(() => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`);
  const [plToDate, setPlToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const applyPlPreset = (preset: 'today' | 'week' | 'month' | 'year') => {
    setPlPeriodPreset(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (preset === 'today') {
      setPlFromDate(today);
      setPlToDate(today);
    } else if (preset === 'week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(d.setDate(diff));
      setPlFromDate(`${startOfWeek.getFullYear()}-${pad(startOfWeek.getMonth() + 1)}-${pad(startOfWeek.getDate())}`);
      setPlToDate(today);
    } else if (preset === 'month') {
      setPlFromDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      setPlToDate(today);
    } else if (preset === 'year') {
      setPlFromDate(`${now.getFullYear()}-01-01`);
      setPlToDate(today);
    }
  };

  const plData = useMemo(() => {
    const periodEntries = entries.filter((e) => e.date >= plFromDate && e.date <= plToDate);
    const incomeByCat: Record<string, number> = {};
    const expenseByCat: Record<string, number> = {};
    let totalIncome = 0;
    let totalExpense = 0;

    for (const e of periodEntries) {
      const cat = e.category || (e.type === 'income' ? 'Other Income' : 'Other Expenses');
      if (e.type === 'income') {
        incomeByCat[cat] = (incomeByCat[cat] || 0) + e.amount;
        totalIncome += e.amount;
      } else {
        expenseByCat[cat] = (expenseByCat[cat] || 0) + e.amount;
        totalExpense += e.amount;
      }
    }

    const netProfit = totalIncome - totalExpense;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return {
      periodEntries,
      incomeByCat,
      expenseByCat,
      totalIncome,
      totalExpense,
      netProfit,
      profitMargin,
    };
  }, [entries, plFromDate, plToDate]);

  // ================= STATEMENT OF ACCOUNTS TAB STATE & CALCULATIONS =================
  const [stmtFromDate, setStmtFromDate] = useState(() => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`);
  const [stmtToDate, setStmtToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [stmtSearch, setStmtSearch] = useState('');

  const statementData = useMemo(() => {
    // 1. Calculate opening balance: all entries before stmtFromDate
    let openingBalance = 0;
    for (const e of entries) {
      if (e.date < stmtFromDate) {
        if (e.type === 'income') openingBalance += e.amount;
        else openingBalance -= e.amount;
      }
    }

    // 2. Entries within the statement period sorted chronologically
    const periodList = entries
      .filter((e) => e.date >= stmtFromDate && e.date <= stmtToDate)
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

    // 3. Compute running balances
    let running = openingBalance;
    let totalCredit = 0;
    let totalDebit = 0;

    const ledgerRows = periodList.map((e) => {
      const isIncome = e.type === 'income';
      const debit = isIncome ? 0 : e.amount;
      const credit = isIncome ? e.amount : 0;
      running += credit - debit;
      totalCredit += credit;
      totalDebit += debit;

      return {
        ...e,
        debit,
        credit,
        runningBalance: running,
      };
    });

    // 4. Apply search filter if query given
    const filteredLedger = stmtSearch.trim()
      ? ledgerRows.filter((r) => {
          const q = stmtSearch.trim().toLowerCase();
          return (
            (r.reference || '').toLowerCase().includes(q) ||
            (r.description || '').toLowerCase().includes(q) ||
            (r.category || '').toLowerCase().includes(q)
          );
        })
      : ledgerRows;

    const closingBalance = openingBalance + totalCredit - totalDebit;

    return {
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
      ledgerRows: filteredLedger,
    };
  }, [entries, stmtFromDate, stmtToDate, stmtSearch]);

  // Export Statement of Accounts to CSV
  const handleExportStatementCSV = () => {
    const headers = ['Date', 'Reference', 'Description', 'Category', 'Debit (Expense)', 'Credit (Income)', 'Running Balance', 'Entered By'];
    const rows = statementData.ledgerRows.map((r) => [
      r.date,
      r.reference || '',
      `"${(r.description || '').replace(/"/g, '""')}"`,
      `"${(r.category || '').replace(/"/g, '""')}"`,
      r.debit > 0 ? r.debit : '',
      r.credit > 0 ? r.credit : '',
      r.runningBalance,
      `"${(r.who || r.cashierName || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [
      `Statement of Accounts (${stmtFromDate} to ${stmtToDate})`,
      `Opening Balance: ${statementData.openingBalance}`,
      `Total Debit: ${statementData.totalDebit}`,
      `Total Credit: ${statementData.totalCredit}`,
      `Closing Balance: ${statementData.closingBalance}`,
      '',
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Statement_Of_Accounts_${stmtFromDate}_to_${stmtToDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ================= CATEGORY MAINTENANCE STATE =================
  const [newIncomeCategory, setNewIncomeCategory] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('');

  const handleAddCategory = (type: 'income' | 'expense') => {
    if (type === 'income') {
      const clean = newIncomeCategory.trim();
      if (!clean || categoriesConfig.incomeCategories.includes(clean)) return;
      saveCategories({
        ...categoriesConfig,
        incomeCategories: [...categoriesConfig.incomeCategories, clean],
      });
      setNewIncomeCategory('');
    } else {
      const clean = newExpenseCategory.trim();
      if (!clean || categoriesConfig.expenseCategories.includes(clean)) return;
      saveCategories({
        ...categoriesConfig,
        expenseCategories: [...categoriesConfig.expenseCategories, clean],
      });
      setNewExpenseCategory('');
    }
  };

  const handleDeleteCategory = (type: 'income' | 'expense', cat: string) => {
    // Protect core system categories
    if (cat === 'Rental Income') {
      alert('"Rental Income" is a system category required for rental settlements and cannot be deleted.');
      return;
    }
    if (type === 'income') {
      saveCategories({
        ...categoriesConfig,
        incomeCategories: categoriesConfig.incomeCategories.filter((c) => c !== cat),
      });
    } else {
      saveCategories({
        ...categoriesConfig,
        expenseCategories: categoriesConfig.expenseCategories.filter((c) => c !== cat),
      });
    }
  };

  if (!canAccessFinance) {
    return (
      <div className={`p-8 rounded-2xl border text-center space-y-3 ${t.cardBg}`}>
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className={`text-lg font-bold ${t.textHeading}`}>Access Restricted</h3>
        <p className={`text-sm ${t.textMuted} max-w-md mx-auto`}>
          You do not have permission to view the Finance module. Contact an administrator to grant <code className="text-amber-400 font-mono">accessFinance</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ================= 1. HEADER & TOP DASHBOARD METRIC CARDS ================= */}
      <div className={`${t.cardBg} rounded-2xl p-5 sm:p-6 border shadow-xl`}>
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b mb-5 ${t.divider}`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${t.textHeading}`}>
                Finance & Accounts
              </h1>
              <p className={`text-xs ${t.textMuted}`}>
                Bicycle POS income, expenses, P&L statements, and general ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canAdd && (
              <button
                type="button"
                id="btn-add-finance-transaction"
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Transaction</span>
              </button>
            )}
          </div>
        </div>

        {/* Dashboard 6-Card KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Today Income */}
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'} flex flex-col justify-between`}>
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-semibold mb-1`}>
              <span>Today Income</span>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className={`text-base sm:text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(todayMetrics.income, settings.currencySymbol, settings.currencyPosition)}
            </div>
          </div>

          {/* Today Expenses */}
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'} flex flex-col justify-between`}>
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-rose-400' : 'text-rose-700'} font-semibold mb-1`}>
              <span>Today Expenses</span>
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className={`text-base sm:text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(todayMetrics.expense, settings.currencySymbol, settings.currencyPosition)}
            </div>
          </div>

          {/* Today Profit / Loss */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            todayMetrics.profit >= 0 
              ? (isDark ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-emerald-100/70 border-emerald-300') 
              : (isDark ? 'bg-rose-500/15 border-rose-500/30' : 'bg-rose-100/70 border-rose-300')
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className={todayMetrics.profit >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-800 font-bold') : (isDark ? 'text-rose-400' : 'text-rose-800 font-bold')}>
                Today Profit
              </span>
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className={`text-base sm:text-lg font-black font-mono ${
              todayMetrics.profit >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-800') : (isDark ? 'text-rose-400' : 'text-rose-800')
            }`}>
              {formatCurrency(todayMetrics.profit, settings.currencySymbol, settings.currencyPosition)}
            </div>
          </div>

          {/* Month Income */}
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'} flex flex-col justify-between`}>
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-cyan-400' : 'text-cyan-800'} font-semibold mb-1`}>
              <span>Month Income</span>
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className={`text-base sm:text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(monthMetrics.income, settings.currencySymbol, settings.currencyPosition)}
            </div>
          </div>

          {/* Month Expenses */}
          <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'} flex flex-col justify-between`}>
            <div className={`flex items-center justify-between text-xs ${isDark ? 'text-amber-400' : 'text-amber-800'} font-semibold mb-1`}>
              <span>Month Expenses</span>
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className={`text-base sm:text-lg font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatCurrency(monthMetrics.expense, settings.currencySymbol, settings.currencyPosition)}
            </div>
          </div>

          {/* Month Profit / Loss */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            monthMetrics.profit >= 0 
              ? (isDark ? 'bg-indigo-500/15 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200') 
              : (isDark ? 'bg-rose-500/15 border-rose-500/30' : 'bg-rose-50 border-rose-200')
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className={monthMetrics.profit >= 0 ? (isDark ? 'text-indigo-300' : 'text-indigo-800 font-bold') : (isDark ? 'text-rose-400' : 'text-rose-800 font-bold')}>
                Month Profit
              </span>
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div className={`text-base sm:text-lg font-black font-mono ${
              monthMetrics.profit >= 0 ? (isDark ? 'text-indigo-300' : 'text-indigo-800') : (isDark ? 'text-rose-400' : 'text-rose-800')
            }`}>
              {formatCurrency(monthMetrics.profit, settings.currencySymbol, settings.currencyPosition)}
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. SUB-NAVIGATION TABS ================= */}
      <div className={`flex items-center gap-2 overflow-x-auto pb-1 border-b ${t.divider}`}>
        <button
          type="button"
          onClick={() => setActiveSubTab('transactions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'transactions'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-300 bg-white')
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Transactions & Ledger</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
            {entries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pl')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'pl'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-300 bg-white')
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Profit & Loss Report</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('statement')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'statement'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-300 bg-white')
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Statement of Accounts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('categories')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'categories'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-300 bg-white')
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Category Maintenance</span>
        </button>
      </div>

      {/* ================= 3. SUB-VIEW: TRANSACTIONS ================= */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className={`${t.cardBg} rounded-2xl p-4 border space-y-3`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Type Pills */}
              <div className={`flex items-center gap-1.5 p-1 rounded-xl ${t.cardSubtleBg} border ${t.divider} w-fit`}>
                <button
                  type="button"
                  onClick={() => setTxnTypeFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    txnTypeFilter === 'all' 
                      ? 'bg-amber-500 text-slate-950 shadow-xs' 
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  All ({entries.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTxnTypeFilter('income')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    txnTypeFilter === 'income' 
                      ? 'bg-emerald-500 text-slate-950 shadow-xs' 
                      : (isDark ? 'text-emerald-400 hover:text-white' : 'text-emerald-700 hover:text-emerald-900')
                  }`}
                >
                  <ArrowUp className="w-3 h-3" />
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setTxnTypeFilter('expense')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    txnTypeFilter === 'expense' 
                      ? 'bg-rose-500 text-white shadow-xs' 
                      : (isDark ? 'text-rose-400 hover:text-white' : 'text-rose-700 hover:text-rose-900')
                  }`}
                >
                  <ArrowDown className="w-3 h-3" />
                  Expenses
                </button>
              </div>

              {/* Quick Summary of Filtered Set */}
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className={isDark ? 'text-emerald-400' : 'text-emerald-700 font-semibold'}>
                  Income: <strong>{formatCurrency(filteredTotals.inc, settings.currencySymbol, settings.currencyPosition)}</strong>
                </span>
                <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>|</span>
                <span className={isDark ? 'text-rose-400' : 'text-rose-700 font-semibold'}>
                  Expense: <strong>{formatCurrency(filteredTotals.exp, settings.currencySymbol, settings.currencyPosition)}</strong>
                </span>
                <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>|</span>
                <span className={
                  filteredTotals.net >= 0 
                    ? (isDark ? 'text-emerald-400 font-bold' : 'text-emerald-800 font-bold') 
                    : (isDark ? 'text-rose-400 font-bold' : 'text-rose-800 font-bold')
                }>
                  Net: {formatCurrency(filteredTotals.net, settings.currencySymbol, settings.currencyPosition)}
                </span>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
              {/* Search text */}
              <div className="relative lg:col-span-2">
                <input
                  type="text"
                  placeholder="Search reference, description, category, staff..."
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-medium pl-8 ${t.textInput}`}
                />
                <Search className={`w-3.5 h-3.5 ${t.textMuted} absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none`} />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={txnCategoryFilter}
                  onChange={(e) => setTxnCategoryFilter(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${t.dropdownInput}`}
                >
                  <option value="all">All Categories</option>
                  <optgroup label="Income">
                    {categoriesConfig.incomeCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Expenses">
                    {categoriesConfig.expenseCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* From Date */}
              <div>
                <input
                  type="date"
                  value={txnFromDate}
                  onChange={(e) => setTxnFromDate(e.target.value)}
                  placeholder="From Date"
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                  title="Filter From Date"
                />
              </div>

              {/* To Date */}
              <div>
                <input
                  type="date"
                  value={txnToDate}
                  onChange={(e) => setTxnToDate(e.target.value)}
                  placeholder="To Date"
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                  title="Filter To Date"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className={`text-[11px] ${t.textMuted}`}>
                Showing {filteredEntries.length} of {entries.length} entries
              </div>
              <div className="flex items-center gap-2">
                {(txnSearch || txnCategoryFilter !== 'all' || txnFromDate || txnToDate || txnTypeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setTxnSearch('');
                      setTxnCategoryFilter('all');
                      setTxnFromDate('');
                      setTxnToDate('');
                      setTxnTypeFilter('all');
                    }}
                    className="text-[11px] text-amber-500 font-semibold hover:underline cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
                {canExport && (
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${t.inactiveTab}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className={`${t.cardBg} rounded-2xl border overflow-hidden shadow-xl`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b ${t.divider} ${t.cardSubtleBg} ${isDark ? 'text-slate-400' : 'text-slate-700 font-bold'} uppercase tracking-wider text-[10px]`}>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5">Reference</th>
                    <th className="py-3 px-3.5">Type</th>
                    <th className="py-3 px-3.5">Category</th>
                    <th className="py-3 px-3.5">Description</th>
                    <th className="py-3 px-3.5 text-right">Amount</th>
                    <th className="py-3 px-3.5">Method</th>
                    <th className="py-3 px-3.5">Staff</th>
                    <th className="py-3 px-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${t.divider}`}>
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={`py-8 text-center ${t.textMuted} text-xs`}>
                        No transactions found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((e) => (
                      <tr key={e.id} className={`${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100/80'} transition group`}>
                        <td className={`py-2.5 px-3.5 font-mono text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'} whitespace-nowrap`}>
                          {e.date}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          {e.reference ? (
                            <span className="font-mono text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {e.reference}
                            </span>
                          ) : (
                            <span className={`${t.textMuted} font-mono text-[10px]`}>—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          {e.type === 'income' ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isDark ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                              <ArrowUp className="w-2.5 h-2.5" />
                              INCOME
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isDark ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              <ArrowDown className="w-2.5 h-2.5" />
                              EXPENSE
                            </span>
                          )}
                        </td>
                        <td className={`py-2.5 px-3.5 ${isDark ? 'text-slate-300' : 'text-slate-700'} font-medium whitespace-nowrap`}>
                          {e.category || 'General'}
                        </td>
                        <td className={`py-2.5 px-3.5 ${t.textHeading} font-medium max-w-xs truncate`} title={e.description}>
                          {e.description}
                          {e.remarks && (
                            <span className={`block text-[10px] ${t.textMuted} font-normal italic truncate`}>
                              Note: {e.remarks}
                            </span>
                          )}
                        </td>
                        <td className={`py-2.5 px-3.5 text-right font-mono font-bold whitespace-nowrap ${
                          e.type === 'income' 
                            ? (isDark ? 'text-emerald-400' : 'text-emerald-700') 
                            : (isDark ? 'text-rose-400' : 'text-rose-700')
                        }`}>
                          {e.type === 'income' ? '+' : '-'}{formatCurrency(e.amount, settings.currencySymbol, settings.currencyPosition)}
                        </td>
                        <td className={`py-2.5 px-3.5 ${isDark ? 'text-slate-300' : 'text-slate-700'} uppercase text-[10px] font-mono whitespace-nowrap`}>
                          {e.paymentMethod || 'cash'}
                        </td>
                        <td className={`py-2.5 px-3.5 ${isDark ? 'text-slate-300' : 'text-slate-700'} text-[11px] whitespace-nowrap`}>
                          {e.who || e.cashierName || 'Staff'}
                        </td>
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(e)}
                                className={`p-1 rounded-lg ${t.textMuted} hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer`}
                                title="Edit Transaction"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setDeletingEntry(e)}
                                className={`p-1 rounded-lg ${t.textMuted} hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer`}
                                title="Delete Transaction"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 4. SUB-VIEW: PROFIT & LOSS (P&L) ================= */}
      {activeSubTab === 'pl' && (
        <div className="space-y-4">
          {!canViewPL ? (
            <div className={`p-8 rounded-2xl border text-center space-y-2 ${t.cardBg}`}>
              <Lock className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className={`font-bold ${t.textHeading}`}>Access Denied</h3>
              <p className={`text-xs ${t.textMuted}`}>You do not have permission to view Profit & Loss reports.</p>
            </div>
          ) : (
            <>
              {/* Period Preset Selection Bar */}
              <div className={`${t.cardBg} rounded-2xl p-4 border flex flex-col md:flex-row md:items-center justify-between gap-3`}>
                <div className={`flex items-center gap-1.5 p-1 rounded-xl border w-fit ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    type="button"
                    onClick={() => applyPlPreset('today')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      plPeriodPreset === 'today'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPlPreset('week')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      plPeriodPreset === 'week'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    This Week
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPlPreset('month')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      plPeriodPreset === 'month'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPlPreset('year')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      plPeriodPreset === 'year'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : isDark
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    This Year
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Custom Period:</span>
                  <input
                    type="date"
                    value={plFromDate}
                    onChange={(e) => {
                      setPlFromDate(e.target.value);
                      setPlPeriodPreset('custom');
                    }}
                    className={`rounded-xl px-2.5 py-1 text-xs font-mono ${t.textInput}`}
                  />
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>to</span>
                  <input
                    type="date"
                    value={plToDate}
                    onChange={(e) => {
                      setPlToDate(e.target.value);
                      setPlPeriodPreset('custom');
                    }}
                    className={`rounded-xl px-2.5 py-1 text-xs font-mono ${t.textInput}`}
                  />
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={`p-1.5 rounded-lg border transition ml-1 cursor-pointer ${
                      isDark
                        ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                        : 'border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-950'
                    }`}
                    title="Print Report"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* P&L KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className={`text-xs font-semibold flex items-center justify-between mb-1 ${
                    isDark ? 'text-emerald-400' : 'text-emerald-800'
                  }`}>
                    <span>Operating Revenue (Income)</span>
                    <ArrowUp className="w-4 h-4" />
                  </div>
                  <div className={`text-xl sm:text-2xl font-black font-mono ${
                    isDark ? 'text-emerald-300' : 'text-emerald-700'
                  }`}>
                    {formatCurrency(plData.totalIncome, settings.currencySymbol, settings.currencyPosition)}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'
                }`}>
                  <div className={`text-xs font-semibold flex items-center justify-between mb-1 ${
                    isDark ? 'text-rose-400' : 'text-rose-800'
                  }`}>
                    <span>Operating Expenses</span>
                    <ArrowDown className="w-4 h-4" />
                  </div>
                  <div className={`text-xl sm:text-2xl font-black font-mono ${
                    isDark ? 'text-rose-300' : 'text-rose-700'
                  }`}>
                    {formatCurrency(plData.totalExpense, settings.currencySymbol, settings.currencyPosition)}
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border ${
                  plData.netProfit >= 0
                    ? isDark ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'
                    : isDark ? 'bg-rose-500/20 border-rose-500/40' : 'bg-rose-50 border-rose-300'
                }`}>
                  <div className="text-xs font-semibold flex items-center justify-between mb-1">
                    <span className={
                      plData.netProfit >= 0
                        ? isDark ? 'text-emerald-400' : 'text-emerald-800 font-bold'
                        : isDark ? 'text-rose-400' : 'text-rose-800 font-bold'
                    }>Net Profit / (Loss)</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isDark ? 'bg-black/30 text-slate-200' : 'bg-white text-slate-800 border border-slate-200'
                    }`}>
                      {plData.profitMargin.toFixed(1)}% margin
                    </span>
                  </div>
                  <div className={`text-xl sm:text-2xl font-black font-mono ${
                    plData.netProfit >= 0
                      ? isDark ? 'text-emerald-300' : 'text-emerald-700'
                      : isDark ? 'text-rose-300' : 'text-rose-700'
                  }`}>
                    {formatCurrency(plData.netProfit, settings.currencySymbol, settings.currencyPosition)}
                  </div>
                </div>
              </div>

              {/* Categorical Breakdown Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Income Breakdown */}
                <div className={`${t.cardBg} rounded-2xl border p-4 space-y-3`}>
                  <div className={`flex items-center justify-between border-b pb-2 ${t.divider}`}>
                    <h4 className={`font-bold text-sm flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      <ArrowUp className="w-4 h-4" />
                      <span>Income Categories</span>
                    </h4>
                    <span className={`text-xs font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {formatCurrency(plData.totalIncome, settings.currencySymbol, settings.currencyPosition)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Object.keys(plData.incomeByCat).length === 0 ? (
                      <p className={`text-xs italic py-3 text-center ${t.textMuted}`}>No income recorded in this period.</p>
                    ) : (
                      Object.entries(plData.incomeByCat).map(([cat, rawAmt]) => {
                        const amt = Number(rawAmt) || 0;
                        const pct = plData.totalIncome > 0 ? (amt / plData.totalIncome) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-800 font-semibold'}`}>{cat}</span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className={`text-[10px] ${t.textMuted}`}>({pct.toFixed(1)}%)</span>
                                <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                  {formatCurrency(amt, settings.currencySymbol, settings.currencyPosition)}
                                </span>
                              </div>
                            </div>
                            <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Expense Breakdown */}
                <div className={`${t.cardBg} rounded-2xl border p-4 space-y-3`}>
                  <div className={`flex items-center justify-between border-b pb-2 ${t.divider}`}>
                    <h4 className={`font-bold text-sm flex items-center gap-1.5 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                      <ArrowDown className="w-4 h-4" />
                      <span>Expense Categories</span>
                    </h4>
                    <span className={`text-xs font-mono font-bold ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                      {formatCurrency(plData.totalExpense, settings.currencySymbol, settings.currencyPosition)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {Object.keys(plData.expenseByCat).length === 0 ? (
                      <p className={`text-xs italic py-3 text-center ${t.textMuted}`}>No expenses recorded in this period.</p>
                    ) : (
                      Object.entries(plData.expenseByCat).map(([cat, rawAmt]) => {
                        const amt = Number(rawAmt) || 0;
                        const pct = plData.totalExpense > 0 ? (amt / plData.totalExpense) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-800 font-semibold'}`}>{cat}</span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className={`text-[10px] ${t.textMuted}`}>({pct.toFixed(1)}%)</span>
                                <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                                  {formatCurrency(amt, settings.currencySymbol, settings.currencyPosition)}
                                </span>
                              </div>
                            </div>
                            <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= 5. SUB-VIEW: STATEMENT OF ACCOUNTS ================= */}
      {activeSubTab === 'statement' && (
        <div className="space-y-4">
          {!canViewStatement ? (
            <div className={`p-8 rounded-2xl border text-center space-y-2 ${t.cardBg}`}>
              <Lock className="w-8 h-8 text-amber-400 mx-auto" />
              <h3 className={`font-bold ${t.textHeading}`}>Access Denied</h3>
              <p className={`text-xs ${t.textMuted}`}>You do not have permission to view Statement of Accounts.</p>
            </div>
          ) : (
            <>
              {/* Statement Control Bar */}
              <div className={`${t.cardBg} rounded-2xl p-4 border flex flex-col md:flex-row md:items-center justify-between gap-3`}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700 font-bold'}`}>Statement Period:</span>
                  <input
                    type="date"
                    value={stmtFromDate}
                    onChange={(e) => setStmtFromDate(e.target.value)}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-mono ${t.textInput}`}
                  />
                  <span className={isDark ? 'text-slate-500' : 'text-slate-600'}>to</span>
                  <input
                    type="date"
                    value={stmtToDate}
                    onChange={(e) => setStmtToDate(e.target.value)}
                    className={`rounded-xl px-2.5 py-1.5 text-xs font-mono ${t.textInput}`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={stmtSearch}
                    onChange={(e) => setStmtSearch(e.target.value)}
                    className={`rounded-xl px-3 py-1.5 text-xs ${t.textInput}`}
                  />
                  {canExport && (
                    <button
                      type="button"
                      onClick={handleExportStatementCSV}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        isDark
                          ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                          : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      isDark
                        ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                        : 'border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-950'
                    }`}
                    title="Print Statement"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Statement Summary Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[11px] font-semibold block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Opening Balance</span>
                  <span className={`text-base font-black font-mono ${
                    statementData.openingBalance >= 0
                      ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                      : isDark ? 'text-rose-400' : 'text-rose-700'
                  }`}>
                    {formatCurrency(statementData.openingBalance, settings.currencySymbol, settings.currencyPosition)}
                  </span>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-rose-500/10 border-rose-500/20' : 'bg-rose-50 border-rose-200'
                }`}>
                  <span className={`text-[11px] font-semibold block ${isDark ? 'text-rose-400' : 'text-rose-800'}`}>Total Debit (Expense)</span>
                  <span className={`text-base font-black font-mono ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                    {formatCurrency(statementData.totalDebit, settings.currencySymbol, settings.currencyPosition)}
                  </span>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <span className={`text-[11px] font-semibold block ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>Total Credit (Income)</span>
                  <span className={`text-base font-black font-mono ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    {formatCurrency(statementData.totalCredit, settings.currencySymbol, settings.currencyPosition)}
                  </span>
                </div>

                <div className={`p-3.5 rounded-xl border ${
                  statementData.closingBalance >= 0
                    ? isDark ? 'bg-indigo-500/15 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'
                    : isDark ? 'bg-rose-500/15 border-rose-500/30' : 'bg-rose-50 border-rose-200'
                }`}>
                  <span className={`text-[11px] font-semibold block ${
                    statementData.closingBalance >= 0
                      ? isDark ? 'text-indigo-300' : 'text-indigo-800'
                      : isDark ? 'text-rose-400' : 'text-rose-800'
                  }`}>
                    Closing Balance
                  </span>
                  <span className={`text-base font-black font-mono ${
                    statementData.closingBalance >= 0
                      ? isDark ? 'text-indigo-200' : 'text-indigo-900'
                      : isDark ? 'text-rose-300' : 'text-rose-700'
                  }`}>
                    {formatCurrency(statementData.closingBalance, settings.currencySymbol, settings.currencyPosition)}
                  </span>
                </div>
              </div>

              {/* Ledger Table */}
              <div className={`${t.cardBg} rounded-2xl border overflow-hidden shadow-xl`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={`border-b ${t.divider} ${t.cardSubtleBg} ${isDark ? 'text-slate-400' : 'text-slate-700 font-bold'} uppercase tracking-wider text-[10px]`}>
                        <th className="py-3 px-3.5">Date</th>
                        <th className="py-3 px-3.5">Reference</th>
                        <th className="py-3 px-3.5">Description</th>
                        <th className="py-3 px-3.5">Category</th>
                        <th className={`py-3 px-3.5 text-right ${isDark ? 'text-rose-400' : 'text-rose-700 font-bold'}`}>Debit (Expense)</th>
                        <th className={`py-3 px-3.5 text-right ${isDark ? 'text-emerald-400' : 'text-emerald-700 font-bold'}`}>Credit (Income)</th>
                        <th className="py-3 px-3.5 text-right">Running Balance</th>
                        <th className="py-3 px-3.5">Entered By</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${t.divider}`}>
                      {/* Opening Balance Row */}
                      <tr className={`${isDark ? 'bg-slate-900/30 text-slate-400' : 'bg-slate-100/70 text-slate-700'} font-semibold`}>
                        <td className="py-2.5 px-3.5 font-mono text-[11px]">{stmtFromDate}</td>
                        <td className="py-2.5 px-3.5 font-mono text-[11px]">—</td>
                        <td className={`py-2.5 px-3.5 italic ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Balance Brought Forward (Opening Balance)</td>
                        <td className="py-2.5 px-3.5">—</td>
                        <td className="py-2.5 px-3.5 text-right font-mono">—</td>
                        <td className="py-2.5 px-3.5 text-right font-mono">—</td>
                        <td className={`py-2.5 px-3.5 text-right font-mono font-bold ${
                          statementData.openingBalance >= 0
                            ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                            : isDark ? 'text-rose-400' : 'text-rose-700'
                        }`}>
                          {formatCurrency(statementData.openingBalance, settings.currencySymbol, settings.currencyPosition)}
                        </td>
                        <td className="py-2.5 px-3.5">System</td>
                      </tr>

                      {statementData.ledgerRows.map((r) => (
                        <tr key={r.id} className={`${isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-100/80'} transition`}>
                          <td className={`py-2 px-3.5 font-mono text-[11px] whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{r.date}</td>
                          <td className={`py-2 px-3.5 font-mono text-[11px] font-bold whitespace-nowrap ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                            {r.reference || '—'}
                          </td>
                          <td className={`py-2 px-3.5 font-medium max-w-xs truncate ${t.textHeading}`} title={r.description}>
                            {r.description}
                          </td>
                          <td className={`py-2 px-3.5 text-[11px] whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{r.category}</td>
                          <td className={`py-2 px-3.5 text-right font-mono whitespace-nowrap ${isDark ? 'text-rose-400' : 'text-rose-700 font-semibold'}`}>
                            {r.debit > 0 ? formatCurrency(r.debit, settings.currencySymbol, settings.currencyPosition) : '—'}
                          </td>
                          <td className={`py-2 px-3.5 text-right font-mono whitespace-nowrap ${isDark ? 'text-emerald-400' : 'text-emerald-700 font-semibold'}`}>
                            {r.credit > 0 ? formatCurrency(r.credit, settings.currencySymbol, settings.currencyPosition) : '—'}
                          </td>
                          <td className={`py-2 px-3.5 text-right font-mono font-bold whitespace-nowrap ${
                            r.runningBalance >= 0
                              ? isDark ? 'text-slate-100' : 'text-slate-900'
                              : isDark ? 'text-rose-400' : 'text-rose-700'
                          }`}>
                            {formatCurrency(r.runningBalance, settings.currencySymbol, settings.currencyPosition)}
                          </td>
                          <td className={`py-2 px-3.5 text-[11px] whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{r.who || r.cashierName || 'Staff'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= 6. SUB-VIEW: CATEGORY MAINTENANCE ================= */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Categories */}
          <div className={`${t.cardBg} rounded-2xl p-5 border space-y-4 shadow-lg`}>
            <div className={`flex items-center justify-between border-b pb-3 ${t.divider}`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <ArrowUp className="w-4 h-4" />
                <span>Income Categories</span>
              </h3>
              <span className={`text-xs font-mono ${t.textMuted}`}>
                {categoriesConfig.incomeCategories.length} categories
              </span>
            </div>

            {/* Add input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New Income Category..."
                value={newIncomeCategory}
                onChange={(e) => setNewIncomeCategory(e.target.value)}
                className={`flex-1 rounded-xl px-3 py-2 text-xs ${t.textInput}`}
              />
              <button
                type="button"
                onClick={() => handleAddCategory('income')}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {categoriesConfig.incomeCategories.map((cat) => {
                const count = entries.filter((e) => e.type === 'income' && e.category === cat).length;
                const isProtected = cat === 'Rental Income';
                return (
                  <div key={cat} className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                    isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Tag className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span className={`font-semibold ${t.textHeading}`}>{cat}</span>
                      {isProtected && (
                        <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${
                          isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800 font-bold'
                        }`}>
                          System Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono ${t.textMuted}`}>{count} entries</span>
                      {!isProtected && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory('income', cat)}
                          className={`p-1 rounded transition cursor-pointer ${
                            isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expense Categories */}
          <div className={`${t.cardBg} rounded-2xl p-5 border space-y-4 shadow-lg`}>
            <div className={`flex items-center justify-between border-b pb-3 ${t.divider}`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                <ArrowDown className="w-4 h-4" />
                <span>Expense Categories</span>
              </h3>
              <span className={`text-xs font-mono ${t.textMuted}`}>
                {categoriesConfig.expenseCategories.length} categories
              </span>
            </div>

            {/* Add input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New Expense Category..."
                value={newExpenseCategory}
                onChange={(e) => setNewExpenseCategory(e.target.value)}
                className={`flex-1 rounded-xl px-3 py-2 text-xs ${t.textInput}`}
              />
              <button
                type="button"
                onClick={() => handleAddCategory('expense')}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {categoriesConfig.expenseCategories.map((cat) => {
                const count = entries.filter((e) => e.type === 'expense' && e.category === cat).length;
                return (
                  <div key={cat} className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                    isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Tag className={`w-3.5 h-3.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                      <span className={`font-semibold ${t.textHeading}`}>{cat}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono ${t.textMuted}`}>{count} entries</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory('expense', cat)}
                        className={`p-1 rounded transition cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. ADD / EDIT TRANSACTION MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-lg ${t.cardBg} rounded-2xl border shadow-2xl p-5 sm:p-6 space-y-4`}>
            <div className={`flex items-center justify-between border-b pb-3 ${t.divider}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-sm sm:text-base ${t.textHeading}`}>
                    {editingEntryId ? 'Edit Finance Transaction' : 'Record New Transaction'}
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    Add manual income or business operational expense
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`p-1.5 rounded-lg transition cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3.5">
              {formError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Type Switcher */}
              <div>
                <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('income');
                      setFormCategory(categoriesConfig.incomeCategories[0] || 'Rental Income');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                      formType === 'income'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-xs'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Income / Credit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('expense');
                      setFormCategory(categoriesConfig.expenseCategories[0] || 'Fleet Maintenance & Repairs');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                      formType === 'expense'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-xs'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Expense / Debit</span>
                  </button>
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Amount ({settings.currencySymbol || 'LKR'}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                    autoFocus
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                  />
                </div>
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${t.dropdownInput}`}
                  >
                    {formType === 'income'
                      ? categoriesConfig.incomeCategories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))
                      : categoriesConfig.expenseCategories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Payment Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${t.dropdownInput}`}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card / POS</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="qr_transfer">QR / LankaQR</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Description & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Reference # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-001 or TXN-491"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value.toUpperCase())}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono uppercase ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Entered By / Staff
                  </label>
                  <select
                    value={formWho}
                    onChange={(e) => setFormWho(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${t.dropdownInput}`}
                  >
                    {staffOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Description *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bike replacement chains, helmet stock, electricity bill..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  className={`w-full rounded-xl px-3 py-2 text-xs ${t.textInput}`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-semibold uppercase mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Remarks / Internal Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Additional remarks or notes..."
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${t.textInput}`}
                />
              </div>

              {/* Action Buttons */}
              <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${t.divider}`}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer active:scale-95"
                >
                  {editingEntryId ? 'Save Changes' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 8. DELETE CONFIRMATION MODAL ================= */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className={`w-full max-w-sm ${t.cardBg} rounded-2xl border shadow-2xl p-5 space-y-4`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className={`font-bold text-sm ${t.textHeading}`}>Confirm Delete Transaction</h4>
                <p className={`text-xs ${t.textMuted}`}>This action cannot be undone.</p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className={`font-semibold ${t.textHeading}`}>{deletingEntry.description}</div>
              <div className={`font-mono flex items-center justify-between ${t.textMuted}`}>
                <span>{deletingEntry.date} ({deletingEntry.type.toUpperCase()})</span>
                <span className={`font-bold ${t.textHeading}`}>
                  {formatCurrency(deletingEntry.amount, settings.currencySymbol, settings.currencyPosition)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
