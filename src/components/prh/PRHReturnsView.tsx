import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import {
  PRHEquipment,
  PRHFinanceTransaction,
  PRHRental,
  PRHReturnItemDetail,
  PRHReturnRecord,
  PRHTabType,
} from '../../types/prhTypes';
import { calculatePRHChargeableDays } from '../../utils/prhStorage';
import { prhTheme, SortDirection, sortPRHData } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';
import { PRHTableHeader } from './PRHTableHeader';

interface PRHReturnsViewProps {
  rentals: PRHRental[];
  equipment: PRHEquipment[];
  returnsHistory: PRHReturnRecord[];
  activeRentalToReturn: PRHRental | null;
  currentUserEmail: string;
  onProcessReturn: (
    returnRecord: PRHReturnRecord,
    updatedRental: PRHRental,
    updatedEquipmentList: PRHEquipment[],
    financeTransactions: PRHFinanceTransaction[]
  ) => void;
  onCloseReturnModal?: () => void;
  onNavigateTab: (tab: PRHTabType) => void;
}

interface ReturnRowState {
  equipmentId: string;
  returnQty: number;
  goodQty: number;
  damagedQty: number;
  lostQty: number;
  damageIssue: string;
  damageChargeUnit: number;
  lossChargeUnit: number;
}

export const PRHReturnsView: React.FC<PRHReturnsViewProps> = ({
  rentals,
  equipment,
  returnsHistory,
  activeRentalToReturn,
  currentUserEmail,
  onProcessReturn,
  onCloseReturnModal,
  onNavigateTab,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedRentalId, setSelectedRentalId] = useState<string>(
    activeRentalToReturn ? activeRentalToReturn.id : ''
  );
  const [returnDate, setReturnDate] = useState<string>(todayStr);
  const [returnRows, setReturnRows] = useState<ReturnRowState[]>([]);
  const [remarks, setRemarks] = useState<string>('');

  // History table sorting state
  const [sortKey, setSortKey] = useState<string>('returnDate');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Selected rental object
  const selectedRental = useMemo(() => {
    return rentals.find((r) => r.id === selectedRentalId) || null;
  }, [rentals, selectedRentalId]);

  // Options for rental contract searchable select (sorted A-Z)
  const rentalOptions = useMemo<PRHOption[]>(() => {
    return rentals
      .filter((r) => r.status === 'active' || r.status === 'partially_returned')
      .map((r) => ({
        value: r.id,
        label: `${r.rentalNumber} - ${r.customerName}`,
        sublabel: `Site: ${r.siteAddress} • Due: ${r.expectedReturnDate}`,
      }));
  }, [rentals]);

  // Sync returnRows whenever selected rental changes
  useEffect(() => {
    if (!selectedRental) {
      setReturnRows([]);
      return;
    }

    const initialRows: ReturnRowState[] = selectedRental.items.map((it) => {
      const remainingQty = it.quantity - it.returnedQuantity;
      const eq = equipment.find((e) => e.id === it.equipmentId);
      const replacementVal = eq ? eq.replacementValue : 5000;
      const defaultDamageCharge = 500;

      return {
        equipmentId: it.equipmentId,
        returnQty: remainingQty,
        goodQty: remainingQty,
        damagedQty: 0,
        lostQty: 0,
        damageIssue: '',
        damageChargeUnit: defaultDamageCharge,
        lossChargeUnit: replacementVal,
      };
    });

    setReturnRows(initialRows);
  }, [selectedRental, equipment]);

  // Day-wise actual days calculation
  const actualDaysElapsed = useMemo(() => {
    if (!selectedRental) return 1;
    return calculatePRHChargeableDays(selectedRental.startDate, returnDate, 1);
  }, [selectedRental, returnDate]);

  // Calculate detailed charges
  const returnItemCalculations = useMemo<PRHReturnItemDetail[]>(() => {
    if (!selectedRental) return [];

    return returnRows
      .filter((row) => row.returnQty > 0)
      .map((row) => {
        const it = selectedRental.items.find((item) => item.equipmentId === row.equipmentId)!;
        const eq = equipment.find((e) => e.id === row.equipmentId);
        const dailyRate = it.dailyRate;

        // Day-wise rental charge for this returned quantity
        const rentalCharge = dailyRate * row.returnQty * actualDaysElapsed;

        // Overdue late charge if returnDate > expectedReturnDate
        let lateCharge = 0;
        if (returnDate > it.expectedReturnDate) {
          const overdueDays = Math.max(
            1,
            Math.floor(
              (new Date(returnDate).getTime() - new Date(it.expectedReturnDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          );
          const lateRate = eq ? eq.lateChargePerDay : 50;
          lateCharge = lateRate * row.returnQty * overdueDays;
        }

        const damageCharge = row.damagedQty * row.damageChargeUnit;
        const lossCharge = row.lostQty * row.lossChargeUnit;
        const totalCharge = rentalCharge + lateCharge + damageCharge + lossCharge;

        return {
          equipmentId: it.equipmentId,
          equipmentName: it.equipmentName,
          serialNumber: it.serialNumber,
          returnQty: row.returnQty,
          goodQty: row.goodQty,
          damagedQty: row.damagedQty,
          lostQty: row.lostQty,
          actualDays: actualDaysElapsed,
          dailyRate,
          rentalCharge,
          lateCharge,
          damageCharge,
          lossCharge,
          totalCharge,
        };
      });
  }, [selectedRental, returnRows, actualDaysElapsed, equipment, returnDate]);

  // Summaries
  const totalRentalCharged = returnItemCalculations.reduce((acc, it) => acc + it.rentalCharge, 0);
  const totalLateCharged = returnItemCalculations.reduce((acc, it) => acc + it.lateCharge, 0);
  const totalDamageCharged = returnItemCalculations.reduce((acc, it) => acc + it.damageCharge, 0);
  const totalLossCharged = returnItemCalculations.reduce((acc, it) => acc + it.lossCharge, 0);
  const grandTotalDueOnReturn =
    totalRentalCharged + totalLateCharged + totalDamageCharged + totalLossCharged;

  const heldDeposit = selectedRental ? selectedRental.securityDepositTotal : 0;
  const alreadyPaidAdvance = selectedRental ? selectedRental.paidAmount : 0;

  const finalSettlementDue = Math.max(0, grandTotalDueOnReturn - alreadyPaidAdvance);
  const depositRefundDue = Math.max(0, heldDeposit - (totalDamageCharged + totalLossCharged));

  const handleRowChange = (
    eqId: string,
    field: keyof ReturnRowState,
    val: any
  ) => {
    setReturnRows((prev) =>
      prev.map((row) => {
        if (row.equipmentId !== eqId) return row;
        const updated = { ...row, [field]: val };

        if (field === 'returnQty') {
          const qty = parseInt(val, 10) || 0;
          updated.returnQty = qty;
          updated.goodQty = qty;
          updated.damagedQty = 0;
          updated.lostQty = 0;
        } else if (field === 'goodQty' || field === 'damagedQty' || field === 'lostQty') {
          const good = field === 'goodQty' ? parseInt(val, 10) || 0 : row.goodQty;
          const damaged = field === 'damagedQty' ? parseInt(val, 10) || 0 : row.damagedQty;
          const lost = field === 'lostQty' ? parseInt(val, 10) || 0 : row.lostQty;
          updated.returnQty = good + damaged + lost;
        }

        return updated;
      })
    );
  };

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

  const sortedHistory = useMemo(() => {
    return sortPRHData(returnsHistory, sortKey, sortDir);
  }, [returnsHistory, sortKey, sortDir]);

  // Submit Return Process
  const handleConfirmReturn = () => {
    if (!selectedRental) {
      alert('Please select an active rental contract.');
      return;
    }

    if (returnItemCalculations.length === 0) {
      alert('No items specified to return.');
      return;
    }

    const returnId = `PRH-RET-${Date.now().toString().slice(-6)}`;
    const timestamp = new Date().toISOString();

    const returnRecord: PRHReturnRecord = {
      id: returnId,
      rentalId: selectedRental.id,
      rentalNumber: selectedRental.rentalNumber,
      customerId: selectedRental.customerId,
      customerName: selectedRental.customerName,
      returnDate,
      items: returnItemCalculations,
      totalRentalCharged,
      totalLateCharged,
      totalDamageCharged,
      totalLossCharged,
      depositAdjusted: Math.min(heldDeposit, totalDamageCharged + totalLossCharged),
      depositRefunded: depositRefundDue,
      finalPaymentReceived: finalSettlementDue,
      processedBy: currentUserEmail,
      createdAt: timestamp,
      remarks: remarks.trim() || undefined,
    };

    // Update rental contract state
    let allReturned = true;
    const updatedItems = selectedRental.items.map((it) => {
      const returnedNow =
        returnItemCalculations.find((ret) => ret.equipmentId === it.equipmentId)?.returnQty || 0;
      const newReturnedQty = it.returnedQuantity + returnedNow;
      const remaining = it.quantity - newReturnedQty;
      if (remaining > 0) allReturned = false;

      return {
        ...it,
        returnedQuantity: newReturnedQty,
        outstandingQuantity: Math.max(0, remaining),
        status: remaining === 0 ? ('returned' as const) : ('partially_returned' as const),
      };
    });

    const updatedRental: PRHRental = {
      ...selectedRental,
      status: allReturned ? 'closed' : 'partially_returned',
      outstandingAmount: Math.max(0, selectedRental.outstandingAmount - finalSettlementDue),
      items: updatedItems,
    };

    // Release equipment back to stock
    const updatedEquipment = equipment.map((eq) => {
      const returnedForEq = returnItemCalculations.filter((it) => it.equipmentId === eq.id);
      if (returnedForEq.length === 0) return eq;

      const totalReturned = returnedForEq.reduce((acc, it) => acc + it.returnQty, 0);
      const goodReturned = returnedForEq.reduce((acc, it) => acc + it.goodQty, 0);
      const damagedReturned = returnedForEq.reduce((acc, it) => acc + it.damagedQty, 0);
      const lostReturned = returnedForEq.reduce((acc, it) => acc + it.lostQty, 0);

      const newAvailable = eq.availableQty + goodReturned;
      const newRented = Math.max(0, eq.rentedQty - totalReturned);
      const newMaintenance = eq.maintenanceQty + damagedReturned;
      const newDamaged = eq.damagedQty + damagedReturned;
      const newLost = eq.lostQty + lostReturned;

      return {
        ...eq,
        availableQty: newAvailable,
        rentedQty: newRented,
        maintenanceQty: newMaintenance,
        damagedQty: newDamaged,
        lostQty: newLost,
      };
    });

    // Auto-post to PRH Finance
    const financeEntries: PRHFinanceTransaction[] = [];
    if (finalSettlementDue > 0) {
      financeEntries.push({
        id: `PRH-FIN-RET-${Date.now().toString().slice(-6)}`,
        business_unit: 'PRH',
        date: returnDate,
        type: 'income',
        category: 'Rental Settlement',
        description: `Settlement on return for ${selectedRental.rentalNumber}`,
        amount: finalSettlementDue,
        debit: 0,
        credit: finalSettlementDue,
        balance: finalSettlementDue,
        payment_method: 'cash',
        reference: returnId,
        customer_name: selectedRental.customerName,
        rental_number: selectedRental.rentalNumber,
        created_by: currentUserEmail,
        created_at: timestamp,
      });
    }

    if (totalDamageCharged > 0) {
      financeEntries.push({
        id: `PRH-FIN-DAM-${Date.now().toString().slice(-6)}`,
        business_unit: 'PRH',
        date: returnDate,
        type: 'income',
        category: 'Damage Recovery',
        description: `Damage repair fees deducted for ${selectedRental.rentalNumber}`,
        amount: totalDamageCharged,
        debit: 0,
        credit: totalDamageCharged,
        balance: totalDamageCharged,
        payment_method: 'deposit_deduction',
        reference: returnId,
        customer_name: selectedRental.customerName,
        rental_number: selectedRental.rentalNumber,
        created_by: currentUserEmail,
        created_at: timestamp,
      });
    }

    onProcessReturn(returnRecord, updatedRental, updatedEquipment, financeEntries);
    if (onCloseReturnModal) onCloseReturnModal();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Equipment Return & Material Inspection Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Process full or partial returns, inspect for damages/loss, adjust deposits, and release items back to stock.
          </p>
        </div>
        {onCloseReturnModal && (
          <button
            onClick={onCloseReturnModal}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            Close ✕
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Return Selection & Items Inspection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Select Rental Contract */}
          <div className={`${prhTheme.card} p-5 space-y-4`}>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              1. Select Active Rental Contract
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={prhTheme.label}>
                  Active Rental *
                </label>
                <PRHSearchableSelect
                  value={selectedRentalId}
                  onChange={setSelectedRentalId}
                  options={rentalOptions}
                  placeholder="Type to search active rental..."
                  searchPlaceholder="Search rental # or customer..."
                  autoSortAZ={true}
                />
              </div>

              <div>
                <label className={prhTheme.label}>
                  Actual Return Date *
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className={prhTheme.input}
                />
              </div>
            </div>

            {selectedRental && (
              <div className={`${prhTheme.cardSubtle} p-3.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3`}>
                <div>
                  <span className="text-slate-400 text-[11px] block">Contractor</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedRental.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Start Date</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedRental.startDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Expected Return</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedRental.expectedReturnDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Actual Days Elapsed</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{actualDaysElapsed} Days</span>
                </div>
              </div>
            )}
          </div>

          {/* Items Inspection & Quantities */}
          {selectedRental && (
            <div className={`${prhTheme.card} p-5 space-y-4`}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  2. Equipment Inspection (Good / Damaged / Lost Breakdown)
                </h2>
              </div>

              <div className={prhTheme.tableContainer}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={prhTheme.tableHeader}>
                        <th className="py-2.5 px-3">Equipment</th>
                        <th className="py-2.5 px-3 text-center">Remaining</th>
                        <th className="py-2.5 px-3 text-center">Returning Now</th>
                        <th className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400">Good</th>
                        <th className="py-2.5 px-3 text-center text-rose-600 dark:text-rose-400">Damaged</th>
                        <th className="py-2.5 px-3 text-center text-rose-600 dark:text-rose-400">Lost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {returnRows.map((row) => {
                        const it = selectedRental.items.find((item) => item.equipmentId === row.equipmentId)!;
                        const remaining = it.quantity - it.returnedQuantity;

                        return (
                          <tr key={row.equipmentId} className={prhTheme.tableRow}>
                            <td className="py-3 px-3 break-words whitespace-normal max-w-xs">
                              <div className="font-bold text-slate-900 dark:text-white">{it.equipmentName}</div>
                              <div className="text-[11px] text-slate-400">
                                Total Contract: {it.quantity} | Already Returned: {it.returnedQuantity}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {remaining}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={remaining}
                                value={row.returnQty}
                                onChange={(e) => handleRowChange(row.equipmentId, 'returnQty', e.target.value)}
                                className="w-16 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-blue-600 dark:text-blue-400 focus:outline-hidden"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={row.returnQty}
                                value={row.goodQty}
                                onChange={(e) => handleRowChange(row.equipmentId, 'goodQty', e.target.value)}
                                className="w-16 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 rounded-lg px-2 py-1 text-center font-mono text-emerald-600 dark:text-emerald-400 focus:outline-hidden"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={row.returnQty}
                                value={row.damagedQty}
                                onChange={(e) => handleRowChange(row.equipmentId, 'damagedQty', e.target.value)}
                                className="w-16 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded-lg px-2 py-1 text-center font-mono text-rose-600 dark:text-rose-400 focus:outline-hidden"
                              />
                            </td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={row.returnQty}
                                value={row.lostQty}
                                onChange={(e) => handleRowChange(row.equipmentId, 'lostQty', e.target.value)}
                                className="w-16 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded-lg px-2 py-1 text-center font-mono text-rose-600 dark:text-rose-400 focus:outline-hidden"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Return History Table */}
          <div className={`${prhTheme.card} p-5 space-y-4`}>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Recent Equipment Return Records
            </h2>

            {sortedHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                No equipment returns processed yet.
              </div>
            ) : (
              <div className={prhTheme.tableContainer}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={prhTheme.tableHeader}>
                        <PRHTableHeader
                          label="Return ID"
                          sortKey="id"
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
                          label="Contractor"
                          sortKey="customerName"
                          currentSortKey={sortKey}
                          currentSortDir={sortDir}
                          onSort={handleSort}
                        />
                        <PRHTableHeader
                          label="Return Date"
                          sortKey="returnDate"
                          currentSortKey={sortKey}
                          currentSortDir={sortDir}
                          onSort={handleSort}
                        />
                        <PRHTableHeader
                          label="Rental Charge"
                          sortKey="totalRentalCharged"
                          currentSortKey={sortKey}
                          currentSortDir={sortDir}
                          onSort={handleSort}
                          align="right"
                        />
                        <PRHTableHeader
                          label="Damages"
                          sortKey="totalDamageCharged"
                          currentSortKey={sortKey}
                          currentSortDir={sortDir}
                          onSort={handleSort}
                          align="right"
                        />
                        <PRHTableHeader
                          label="Deposit Refunded"
                          sortKey="depositRefunded"
                          currentSortKey={sortKey}
                          currentSortDir={sortDir}
                          onSort={handleSort}
                          align="right"
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {sortedHistory.slice(0, 10).map((ret) => (
                        <tr key={ret.id} className={prhTheme.tableRow}>
                          <td className="py-2.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{ret.id}</td>
                          <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">{ret.rentalNumber}</td>
                          <td className="py-2.5 px-3 text-slate-900 dark:text-white break-words whitespace-normal max-w-xs">{ret.customerName}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">{ret.returnDate}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-900 dark:text-white whitespace-nowrap">
                            Rs. {ret.totalRentalCharged.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            Rs. {ret.totalDamageCharged.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            Rs. {ret.depositRefunded.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Settlement & Financial Reconciliation */}
        <div className="space-y-6">
          <div className={`${prhTheme.card} p-5 space-y-4`}>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Settlement & Deposit Adjustment</h2>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400">Actual Rental Charge:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  Rs. {totalRentalCharged.toLocaleString()}
                </span>
              </div>

              {totalLateCharged > 0 && (
                <div className="flex justify-between pt-2">
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Overdue Late Charge:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    + Rs. {totalLateCharged.toLocaleString()}
                  </span>
                </div>
              )}

              {totalDamageCharged > 0 && (
                <div className="flex justify-between pt-2">
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Damage Repair Charge:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    + Rs. {totalDamageCharged.toLocaleString()}
                  </span>
                </div>
              )}

              {totalLossCharged > 0 && (
                <div className="flex justify-between pt-2">
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">Lost Material Replacement:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    + Rs. {totalLossCharged.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-2 text-sm font-bold text-slate-900 dark:text-white">
                <span>Total Due on Returned Items:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                  Rs. {grandTotalDueOnReturn.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between pt-2 text-blue-600 dark:text-blue-400">
                <span>Security Deposit Held:</span>
                <span className="font-mono font-bold">
                  Rs. {heldDeposit.toLocaleString()}
                </span>
              </div>

              {depositRefundDue > 0 ? (
                <div className="flex justify-between pt-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Refund Due to Customer:</span>
                  <span className="font-mono">Rs. {depositRefundDue.toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex justify-between pt-2 text-rose-600 dark:text-rose-400 font-bold">
                  <span>Additional Settlement Required:</span>
                  <span className="font-mono">Rs. {finalSettlementDue.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div>
              <label className={prhTheme.label}>
                Return Inspection Remarks
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Condition remarks, damaged serial notes, repair depot notes..."
                className={prhTheme.input}
              />
            </div>

            <button
              type="button"
              disabled={!selectedRental || returnItemCalculations.length === 0}
              onClick={handleConfirmReturn}
              className={`w-full py-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                !selectedRental || returnItemCalculations.length === 0
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : prhTheme.btnPrimary
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Confirm Return & Release Stock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
