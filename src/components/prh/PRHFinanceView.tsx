import React, { useState, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Filter,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { PRHFinanceTransaction } from '../../types/prhTypes';
import { generateNextPRHId } from '../../utils/prhStorage';
import { prhTheme, SortDirection, sortPRHData } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';
import { PRHTableHeader } from './PRHTableHeader';

interface PRHFinanceViewProps {
  transactions: PRHFinanceTransaction[];
  currentUserEmail: string;
  onAddTransaction: (transaction: PRHFinanceTransaction) => void;
}

const FINANCE_VIEW_OPTIONS: PRHOption[] = [
  { value: 'statement', label: 'Statement of Accounts (Ledger)' },
  { value: 'pnl', label: 'Profit & Loss Statement (P&L)' },
  { value: 'income', label: 'Income Ledger' },
  { value: 'expenses', label: 'Expense Ledger' },
];

export const PRHFinanceView: React.FC<PRHFinanceViewProps> = ({
  transactions,
  currentUserEmail,
  onAddTransaction,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [activeFinanceTab, setActiveFinanceTab] = useState<'statement' | 'pnl' | 'income' | 'expenses'>('statement');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Sorting State
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Pagination (50 rows per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 50;

  // Add Transaction Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [txCategory, setTxCategory] = useState('Rental Income');
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState<'cash' | 'card' | 'lankaqr' | 'bank_transfer' | 'other'>('cash');
  const [txReference, setTxReference] = useState('');
  const [txDate, setTxDate] = useState(todayStr);

  // Financial Summaries
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenses;

  // P&L Breakdown by Category
  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) || 0) + t.amount);
      });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) || 0) + t.amount);
      });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  // Categories for Filter
  const categoryOptions = useMemo<PRHOption[]>(() => {
    const cats = Array.from(new Set(transactions.map((t) => t.category))).filter(Boolean) as string[];
    const sorted = cats.sort((a, b) => a.localeCompare(b));
    return [
      { value: 'all', label: 'All Categories' },
      ...sorted.map((c) => ({ value: c, label: c })),
    ];
  }, [transactions]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') setSortDir(null);
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // Filtered and Sorted Transactions
  const filteredTransactions = useMemo(() => {
    const list = transactions.filter((t) => {
      if (activeFinanceTab === 'income' && t.type !== 'income') return false;
      if (activeFinanceTab === 'expenses' && t.type !== 'expense') return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (dateFilter && t.date !== dateFilter) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
        (t.rental_number && t.rental_number.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    });

    return sortPRHData(list, sortKey, sortDir);
  }, [transactions, activeFinanceTab, categoryFilter, dateFilter, searchTerm, sortKey, sortDir]);

  // Paginated Rows (50 per page)
  const totalRows = filteredTransactions.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage) || 1;
  const displayedTransactions = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredTransactions.slice(start, start + rowsPerPage);
  }, [filteredTransactions, currentPage]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const nextId = generateNextPRHId(
      'PRH-FIN-',
      transactions.map((t) => t.id),
      6
    );

    const debit = txType === 'expense' ? amount : 0;
    const credit = txType === 'income' ? amount : 0;

    const newTx: PRHFinanceTransaction = {
      id: nextId,
      business_unit: 'PRH',
      date: txDate,
      type: txType,
      category: txCategory,
      description: txDescription.trim() || `${txCategory} entry`,
      amount,
      debit,
      credit,
      balance: credit - debit,
      payment_method: txPaymentMethod,
      reference: txReference.trim() || nextId,
      created_by: currentUserEmail,
      created_at: new Date().toISOString(),
    };

    onAddTransaction(newTx);
    setIsAddModalOpen(false);
    setTxDescription('');
    setTxAmount('');
    setTxReference('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-1">
            Isolated Business Ledger
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            PRH Finance, P&L and Statement of Accounts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Strictly segregated PRH construction rental income, equipment repairs, maintenance costs and statement ledger.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className={prhTheme.btnPrimary}
        >
          <Plus className="w-4 h-4" />
          Add Finance Entry
        </button>
      </div>

      {/* Finance KPI Cards (Strict 4-color palette) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${prhTheme.card} p-4.5`}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>PRH Total Revenue (Income)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            Rs. {totalIncome.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Rental collections, late charges & damage fees
          </div>
        </div>

        <div className={`${prhTheme.card} p-4.5`}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>PRH Total Expenses</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            Rs. {totalExpenses.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Maintenance, parts replacement & operational costs
          </div>
        </div>

        <div className={`${prhTheme.card} p-4.5`}>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>PRH Net Profit (Loss)</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              netProfit >= 0
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
            }`}>
              {netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className={`mt-2 text-2xl font-black font-mono ${
            netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            Rs. {netProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Formula: PRH Total Income - PRH Total Expenses
          </div>
        </div>
      </div>

      {/* View Selector - Replaced side-by-side buttons with Searchable Dropdown */}
      <div className={`${prhTheme.card} p-4 flex flex-col sm:flex-row gap-3 items-center justify-between`}>
        <div className="w-full sm:w-80">
          <label className={prhTheme.label}>Active Financial View</label>
          <PRHSearchableSelect
            value={activeFinanceTab}
            onChange={(v) => {
              setActiveFinanceTab(v as any);
              setCurrentPage(1);
            }}
            options={FINANCE_VIEW_OPTIONS}
            autoSortAZ={false}
          />
        </div>

        {activeFinanceTab !== 'pnl' && (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-56">
              <label className={prhTheme.label}>Filter by Category</label>
              <PRHSearchableSelect
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categoryOptions}
                autoSortAZ={false}
              />
            </div>

            <div className="w-full sm:w-56">
              <label className={prhTheme.label}>Search Description / Ref</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter records..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: Profit & Loss Statement (P&L) */}
      {activeFinanceTab === 'pnl' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Column */}
          <div className={`${prhTheme.card} p-5 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4" />
                PRH REVENUE / INCOME
              </h2>
              <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                Rs. {totalIncome.toLocaleString()}
              </span>
            </div>

            <div className="space-y-3">
              {incomeByCategory.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No income recorded yet.</div>
              ) : (
                incomeByCategory.map(([cat, amt]) => {
                  const pct = Math.round((amt / (totalIncome || 1)) * 100);
                  return (
                    <div key={cat} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          Rs. {amt.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Expenses Column */}
          <div className={`${prhTheme.card} p-5 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4" />
                PRH EXPENSES / COSTS
              </h2>
              <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                Rs. {totalExpenses.toLocaleString()}
              </span>
            </div>

            <div className="space-y-3">
              {expensesByCategory.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No expenses recorded yet.</div>
              ) : (
                expensesByCategory.map(([cat, amt]) => {
                  const pct = Math.round((amt / (totalExpenses || 1)) * 100);
                  return (
                    <div key={cat} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                        <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">
                          Rs. {amt.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Statement of Accounts / Ledger */}
      {activeFinanceTab !== 'pnl' && (
        <div className={prhTheme.tableContainer}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={prhTheme.tableHeader}>
                  <PRHTableHeader
                    label="Date"
                    sortKey="date"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                  />
                  <PRHTableHeader
                    label="Reference"
                    sortKey="reference"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                  />
                  <PRHTableHeader
                    label="Description"
                    sortKey="description"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                  />
                  <PRHTableHeader
                    label="Category"
                    sortKey="category"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                  />
                  <PRHTableHeader
                    label="Debit (Exp)"
                    sortKey="debit"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <PRHTableHeader
                    label="Credit (Inc)"
                    sortKey="credit"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <PRHTableHeader
                    label="Net Balance"
                    sortKey="balance"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                  <th className="py-3 px-3.5 text-center font-semibold text-slate-600 dark:text-slate-400">Method</th>
                  <th className="py-3 px-3.5 text-center font-semibold text-slate-600 dark:text-slate-400">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {displayedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                      No financial records found matching current query.
                    </td>
                  </tr>
                ) : (
                  displayedTransactions.map((tx) => (
                    <tr key={tx.id} className={prhTheme.tableRow}>
                      <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {tx.reference || tx.id}
                      </td>
                      <td className="py-3 px-3.5 break-words whitespace-normal max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white">{tx.description}</div>
                        {tx.customer_name && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Contractor: {tx.customer_name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <span className={prhTheme.badgeNeutral}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {tx.debit > 0 ? `Rs. ${tx.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {tx.credit > 0 ? `Rs. ${tx.credit.toLocaleString()}` : '-'}
                      </td>
                      <td
                        className={`py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap ${
                          tx.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        Rs. {tx.balance.toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 text-center capitalize text-slate-600 dark:text-slate-300 text-[11px] whitespace-nowrap">
                        {tx.payment_method.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3.5 text-center text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[120px]">
                        {tx.created_by.split('@')[0]}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div>
                Showing {Math.min(totalRows, (currentPage - 1) * rowsPerPage + 1)} to{' '}
                {Math.min(totalRows, currentPage * rowsPerPage)} of {totalRows} entries
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Finance Entry Modal */}
      {isAddModalOpen && (
        <div className={prhTheme.modalBackdrop}>
          <div className={`${prhTheme.modal} max-w-md w-full p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Add PRH Finance Entry
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Entry Type *</label>
                  <select
                    value={txType}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setTxType(t);
                      setTxCategory(t === 'income' ? 'Rental Income' : 'Equipment Maintenance');
                    }}
                    className={prhTheme.select}
                  >
                    <option value="income">Income (Credit)</option>
                    <option value="expense">Expense (Debit)</option>
                  </select>
                </div>

                <div>
                  <label className={prhTheme.label}>Transaction Date *</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div>
                <label className={prhTheme.label}>Category *</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className={prhTheme.select}
                >
                  {txType === 'income' ? (
                    <>
                      <option value="Rental Income">Rental Income</option>
                      <option value="Rental Settlement">Rental Settlement</option>
                      <option value="Late Charge Recovery">Late Charge Recovery</option>
                      <option value="Damage Recovery">Damage Recovery</option>
                      <option value="Other Income">Other Income</option>
                    </>
                  ) : (
                    <>
                      <option value="Equipment Maintenance">Equipment Maintenance</option>
                      <option value="Parts Replacement">Parts Replacement</option>
                      <option value="Welding Consumables">Welding Consumables</option>
                      <option value="Depot Wages">Depot Wages</option>
                      <option value="Fuel / Transport">Fuel / Transport</option>
                      <option value="Other Expense">Other Expense</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className={prhTheme.label}>Description *</label>
                <input
                  type="text"
                  required
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="e.g. Scaffolding joint clamps repair"
                  className={prhTheme.input}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className={prhTheme.input}
                  />
                </div>

                <div>
                  <label className={prhTheme.label}>Payment Method *</label>
                  <select
                    value={txPaymentMethod}
                    onChange={(e) => setTxPaymentMethod(e.target.value as any)}
                    className={prhTheme.select}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="lankaqr">LankaQR</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={prhTheme.label}>Reference / Receipt #</label>
                <input
                  type="text"
                  value={txReference}
                  onChange={(e) => setTxReference(e.target.value)}
                  placeholder="e.g. REC-98214"
                  className={prhTheme.input}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className={prhTheme.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={prhTheme.btnPrimary}
                >
                  Post Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
