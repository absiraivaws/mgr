import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  Download,
  Filter,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { PRHPayment } from '../../types/prhTypes';
import { prhTheme, SortDirection, sortPRHData } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';
import { PRHTableHeader } from './PRHTableHeader';

interface PRHPaymentsViewProps {
  payments: PRHPayment[];
}

const PAYMENT_TYPE_OPTIONS: PRHOption[] = [
  { value: 'all', label: 'All Payment Types' },
  { value: 'rental_advance', label: 'Rental Advance' },
  { value: 'rental_settlement', label: 'Rental Settlement' },
  { value: 'deposit_received', label: 'Deposit Received' },
  { value: 'deposit_refund', label: 'Deposit Refund' },
];

export const PRHPaymentsView: React.FC<PRHPaymentsViewProps> = ({ payments }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Sorting state
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const totalCollected = payments
    .filter((p) => !p.type.includes('refund'))
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRefunded = payments
    .filter((p) => p.type.includes('refund'))
    .reduce((sum, p) => sum + p.amount, 0);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') setSortDir(null);
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredPayments = useMemo(() => {
    const list = payments.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        p.customerName.toLowerCase().includes(q) ||
        (p.rentalNumber && p.rentalNumber.toLowerCase().includes(q)) ||
        p.reference.toLowerCase().includes(q) ||
        p.paymentMethod.toLowerCase().includes(q)
      );
    });

    return sortPRHData(list, sortKey, sortDir);
  }, [payments, typeFilter, searchTerm, sortKey, sortDir]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          PRH Payment Transactions & Security Deposits
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Audit trail of rental advances, settlement payments, security deposits received, and deposit refunds.
        </p>
      </div>

      {/* KPI Cards (Consistent 4-color palette) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`${prhTheme.card} p-4.5`}>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Total Payments Collected</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            Rs. {totalCollected.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Advances & settlements</div>
        </div>

        <div className={`${prhTheme.card} p-4.5`}>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Security Deposit Refunds</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
            Rs. {totalRefunded.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Returned upon clean inspection</div>
        </div>

        <div className={`${prhTheme.card} p-4.5`}>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Recorded Payment Records</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-1">
            {payments.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Indexed by customer & rental #</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`${prhTheme.card} p-4 flex flex-col sm:flex-row gap-3 items-center justify-between`}>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search payment reference, rental #, customer..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600"
          />
        </div>

        {/* Replaced side-by-side buttons with Searchable Dropdown */}
        <div className="w-full sm:w-64">
          <PRHSearchableSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={PAYMENT_TYPE_OPTIONS}
            placeholder="Filter by payment type..."
            searchPlaceholder="Search payment types..."
            autoSortAZ={false}
          />
        </div>
      </div>

      {/* Table */}
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
                  label="Payment Ref"
                  sortKey="reference"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Rental #"
                  sortKey="rentalNumber"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Customer"
                  sortKey="customerName"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Type"
                  sortKey="type"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Amount"
                  sortKey="amount"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <PRHTableHeader
                  label="Method"
                  sortKey="paymentMethod"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
                <th className="py-3 px-3.5 text-center font-semibold text-slate-600 dark:text-slate-400">Entered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No payment records found matching filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isRefund = p.type.includes('refund');
                  return (
                    <tr key={p.id} className={prhTheme.tableRow}>
                      <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {p.date}
                      </td>
                      <td className="py-3 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {p.reference || p.id}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {p.rentalNumber || '-'}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white break-words whitespace-normal max-w-xs">
                        {p.customerName}
                      </td>
                      <td className="py-3 px-3.5 capitalize whitespace-nowrap">
                        <span className={isRefund ? prhTheme.badgeDanger : prhTheme.badgeSuccess}>
                          {p.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap ${
                        isRefund ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        Rs. {p.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 text-center uppercase font-semibold text-slate-600 dark:text-slate-300 text-[10px] whitespace-nowrap">
                        {p.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3.5 text-center text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[120px]">
                        {p.enteredBy.split('@')[0]}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
