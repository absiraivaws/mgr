import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Filter,
  HardHat,
  MessageSquare,
  Printer,
  RotateCcw,
  Search,
  Send,
  X,
} from 'lucide-react';
import {
  PRHCustomer,
  PRHEquipment,
  PRHFinanceTransaction,
  PRHNotificationLog,
  PRHPayment,
  PRHRental,
  PRHReturnRecord,
  PRHTabType,
} from '../../types/prhTypes';
import { calculatePRHChargeableDays } from '../../utils/prhStorage';
import { prhTheme, SortDirection, sortPRHData } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';
import { PRHTableHeader } from './PRHTableHeader';

interface PRHActiveRentalsViewProps {
  rentals: PRHRental[];
  equipment: PRHEquipment[];
  customers: PRHCustomer[];
  currentUserEmail: string;
  onOpenReturnModal: (rental: PRHRental) => void;
  onUpdateRental: (rental: PRHRental) => void;
  onRecordPayment: (payment: PRHPayment, updatedRental: PRHRental) => void;
  onSendWhatsAppReminder: (rental: PRHRental, templateType: string) => void;
  onNavigateTab: (tab: PRHTabType) => void;
}

const STATUS_FILTER_OPTIONS: PRHOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active On-Site' },
  { value: 'partially_returned', label: 'Partially Returned' },
  { value: 'overdue', label: 'Overdue for Return' },
  { value: 'closed', label: 'Closed / Returned' },
];

export const PRHActiveRentalsView: React.FC<PRHActiveRentalsViewProps> = ({
  rentals,
  equipment,
  customers,
  currentUserEmail,
  onOpenReturnModal,
  onUpdateRental,
  onRecordPayment,
  onSendWhatsAppReminder,
  onNavigateTab,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sorting state
  const [sortKey, setSortKey] = useState<string>('startDate');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Modal states
  const [viewingAgreementRental, setViewingAgreementRental] = useState<PRHRental | null>(null);
  const [paymentRental, setPaymentRental] = useState<PRHRental | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'lankaqr' | 'bank_transfer' | 'other'>('cash');

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

  // Filter rentals
  const filteredRentals = useMemo(() => {
    const list = rentals.filter((r) => {
      const isOverdue = (r.status === 'active' || r.status === 'partially_returned') && r.expectedReturnDate < todayStr;
      if (statusFilter === 'active' && r.status !== 'active') return false;
      if (statusFilter === 'partially_returned' && r.status !== 'partially_returned') return false;
      if (statusFilter === 'overdue' && !isOverdue) return false;
      if (statusFilter === 'closed' && r.status !== 'closed' && r.status !== 'fully_returned') return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        r.rentalNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.includes(q) ||
        r.siteAddress.toLowerCase().includes(q)
      );
    });

    return sortPRHData(list, sortKey, sortDir);
  }, [rentals, statusFilter, searchTerm, todayStr, sortKey, sortDir]);

  // Handle Receive Payment Modal Submit
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentRental) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const updatedRental: PRHRental = {
      ...paymentRental,
      paidAmount: paymentRental.paidAmount + amount,
      outstandingAmount: Math.max(0, paymentRental.outstandingAmount - amount),
    };

    const newPayment: PRHPayment = {
      id: `PRH-PAY-${Date.now().toString().slice(-6)}`,
      businessUnit: 'PRH',
      rentalId: paymentRental.id,
      rentalNumber: paymentRental.rentalNumber,
      customerId: paymentRental.customerId,
      customerName: paymentRental.customerName,
      type: 'rental_settlement',
      amount,
      paymentMethod,
      reference: `PRH-PAY-${paymentRental.rentalNumber}`,
      date: todayStr,
      enteredBy: currentUserEmail,
      remarks: 'Customer partial/final settlement payment',
    };

    onRecordPayment(newPayment, updatedRental);
    setPaymentRental(null);
    setPaymentAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Header - Duplicate "New Rental Contract" button removed */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Active Equipment Rentals & Return Tracker
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Monitor active sites, track overdue equipment, inspect materials, and reconcile payments.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className={`${prhTheme.card} p-4 flex flex-col md:flex-row gap-3 items-center justify-between`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search rental #, contractor, phone, site..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600"
          />
        </div>

        {/* Replaced side-by-side selection buttons with Searchable Dropdown */}
        <div className="w-full md:w-64">
          <PRHSearchableSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTER_OPTIONS}
            placeholder="Filter by rental status..."
            searchPlaceholder="Search statuses..."
            autoSortAZ={false}
          />
        </div>
      </div>

      {/* Active Rentals Table */}
      <div className={prhTheme.tableContainer}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={prhTheme.tableHeader}>
                <PRHTableHeader
                  label="Rental #"
                  sortKey="rentalNumber"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Contractor / Customer"
                  sortKey="customerName"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Site Location"
                  sortKey="siteAddress"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Start Date"
                  sortKey="startDate"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Return Due"
                  sortKey="expectedReturnDate"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Rental Total"
                  sortKey="totalRentalAmount"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <PRHTableHeader
                  label="Outstanding"
                  sortKey="outstandingAmount"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <PRHTableHeader
                  label="Status"
                  sortKey="status"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
                <th className="py-3 px-3.5 text-center font-semibold text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRentals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No rentals matching current search and filters.
                  </td>
                </tr>
              ) : (
                filteredRentals.map((r) => {
                  const isOverdue =
                    (r.status === 'active' || r.status === 'partially_returned') &&
                    r.expectedReturnDate < todayStr;
                  const overdueDays = isOverdue
                    ? Math.max(
                        1,
                        Math.floor(
                          (new Date(todayStr).getTime() - new Date(r.expectedReturnDate).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )
                    : 0;

                  return (
                    <tr key={r.id} className={prhTheme.tableRow}>
                      <td className="py-3 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {r.rentalNumber}
                      </td>
                      <td className="py-3 px-3.5 break-words whitespace-normal max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white">{r.customerName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{r.customerPhone}</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 break-words whitespace-normal max-w-xs">
                        {r.siteAddress}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                        {r.startDate}
                      </td>
                      <td className="py-3 px-3.5 font-mono whitespace-nowrap">
                        <div className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1' : 'text-slate-700 dark:text-slate-300'}>
                          {isOverdue && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                          <span>{r.expectedReturnDate}</span>
                        </div>
                        {isOverdue && (
                          <div className="text-[10px] text-rose-500 font-bold">
                            {overdueDays}d overdue
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        Rs. {r.totalRentalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                        {r.outstandingAmount > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            Rs. {r.outstandingAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">Settled</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={
                            isOverdue
                              ? prhTheme.badgeDanger
                              : r.status === 'active'
                              ? prhTheme.badgeSuccess
                              : r.status === 'partially_returned'
                              ? prhTheme.badgePrimary
                              : prhTheme.badgeNeutral
                          }
                        >
                          {isOverdue
                            ? 'OVERDUE'
                            : r.status === 'partially_returned'
                            ? 'PARTIAL'
                            : r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Process Return Action */}
                          {(r.status === 'active' || r.status === 'partially_returned') && (
                            <button
                              type="button"
                              onClick={() => onOpenReturnModal(r)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                              title="Process Full or Partial Return"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Return
                            </button>
                          )}

                          {/* Record Payment Action */}
                          {r.outstandingAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentRental(r);
                                setPaymentAmount(r.outstandingAmount.toString());
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                              title="Receive Settlement Payment"
                            >
                              <DollarSign className="w-3 h-3" />
                              Pay
                            </button>
                          )}

                          {/* WhatsApp Reminder Action */}
                          <button
                            type="button"
                            onClick={() => onSendWhatsAppReminder(r, isOverdue ? 'overdue' : 'return')}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* View Agreement Action */}
                          <button
                            type="button"
                            onClick={() => setViewingAgreementRental(r)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="View Rental Agreement"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Settlement Modal */}
      {paymentRental && (
        <div className={prhTheme.modalBackdrop}>
          <div className={`${prhTheme.modal} max-w-md w-full p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Receive Rental Payment
              </h3>
              <button
                type="button"
                onClick={() => setPaymentRental(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5 text-xs">
              <div className={`${prhTheme.cardSubtle} p-3 space-y-1`}>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Rental Contract:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{paymentRental.rentalNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Customer:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{paymentRental.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Total Outstanding:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    Rs. {paymentRental.outstandingAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className={prhTheme.label}>Amount Receiving (Rs.) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={paymentRental.outstandingAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className={prhTheme.input}
                />
              </div>

              <div>
                <label className={prhTheme.label}>Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className={prhTheme.select}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="lankaqr">LankaQR</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentRental(null)}
                  className={prhTheme.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={prhTheme.btnSuccess}
                >
                  Confirm & Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Agreement View Modal */}
      {viewingAgreementRental && (
        <div className={prhTheme.modalBackdrop}>
          <div className={`${prhTheme.modal} max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                PRH Rental Contract #{viewingAgreementRental.rentalNumber}
              </h3>
              <button
                type="button"
                onClick={() => setViewingAgreementRental(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Customer</div>
                  <div className="font-bold text-slate-900 dark:text-white">{viewingAgreementRental.customerName}</div>
                  <div className="font-mono text-slate-600 dark:text-slate-400">{viewingAgreementRental.customerPhone}</div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Site Location</div>
                  <div className="text-slate-900 dark:text-white">{viewingAgreementRental.siteAddress}</div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={prhTheme.tableHeader}>
                      <th className="py-2.5 px-3">Equipment</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Daily Rate</th>
                      <th className="py-2.5 px-3 text-right">Expected Days</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {viewingAgreementRental.items.map((it, idx) => (
                      <tr key={idx} className={prhTheme.tableRow}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{it.equipmentName}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">Rs. {it.dailyRate}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{it.chargeableDays}d</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          Rs. {it.rentalAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewingAgreementRental(null)}
                  className={prhTheme.btnPrimary}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
