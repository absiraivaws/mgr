import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  DollarSign,
  Download,
  FileText,
  HardHat,
  Percent,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  PRHCustomer,
  PRHEquipment,
  PRHFinanceTransaction,
  PRHRental,
} from '../../types/prhTypes';
import { prhTheme, SortDirection, sortPRHData } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';
import { PRHTableHeader } from './PRHTableHeader';

interface PRHReportsViewProps {
  rentals: PRHRental[];
  customers: PRHCustomer[];
  equipment: PRHEquipment[];
  finance: PRHFinanceTransaction[];
}

const REPORT_TYPE_OPTIONS: PRHOption[] = [
  { value: 'utilisation', label: 'Equipment Utilisation %' },
  { value: 'customer_revenue', label: 'Customer Revenue Analysis' },
  { value: 'overdue', label: 'Overdue Rentals Aging' },
];

export const PRHReportsView: React.FC<PRHReportsViewProps> = ({
  rentals,
  customers,
  equipment,
  finance,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [reportType, setReportType] = useState<'utilisation' | 'customer_revenue' | 'overdue'>('utilisation');

  // Sorting state for tables
  const [sortKey, setSortKey] = useState<string>('utilPct');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Utilisation Data
  const equipmentStats = useMemo(() => {
    return equipment.map((eq) => {
      const utilPct = Math.round((eq.rentedQty / (eq.totalQty || 1)) * 100);
      const estimatedDailyRev = eq.rentedQty * eq.dailyRate;
      return {
        ...eq,
        utilPct,
        estimatedDailyRev,
      };
    });
  }, [equipment]);

  // Customer Revenue Data
  const customerStats = useMemo(() => {
    return customers.map((c) => {
      const custRentals = rentals.filter((r) => r.customerId === c.id);
      const totalSpend = custRentals.reduce((sum, r) => sum + r.totalRentalAmount, 0);
      return {
        ...c,
        rentalsCount: custRentals.length,
        totalSpend,
      };
    });
  }, [customers, rentals]);

  // Overdue Rentals Data
  const overdueRentals = useMemo(() => {
    return rentals
      .filter(
        (r) => (r.status === 'active' || r.status === 'partially_returned') && r.expectedReturnDate < todayStr
      )
      .map((r) => {
        const overdueDays = Math.max(
          1,
          Math.floor(
            (new Date(todayStr).getTime() - new Date(r.expectedReturnDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        return {
          ...r,
          overdueDays,
        };
      });
  }, [rentals, todayStr]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') setSortDir(null);
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedEquipmentStats = useMemo(() => {
    return sortPRHData(equipmentStats, sortKey, sortDir);
  }, [equipmentStats, sortKey, sortDir]);

  const sortedCustomerStats = useMemo(() => {
    return sortPRHData(customerStats, sortKey, sortDir);
  }, [customerStats, sortKey, sortDir]);

  const sortedOverdueRentals = useMemo(() => {
    return sortPRHData(overdueRentals, sortKey, sortDir);
  }, [overdueRentals, sortKey, sortDir]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          PRH Performance Reports & Analytics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Utilisation %, high-demand construction materials, contractor revenue contributions and overdue aging.
        </p>
      </div>

      {/* Report Selector - Replaced side-by-side buttons with Searchable Dropdown */}
      <div className={`${prhTheme.card} p-4 flex flex-col sm:flex-row gap-3 items-center justify-between`}>
        <div className="w-full sm:w-80">
          <label className={prhTheme.label}>Select Report Analysis</label>
          <PRHSearchableSelect
            value={reportType}
            onChange={(val) => {
              setReportType(val as any);
              setSortKey(val === 'utilisation' ? 'utilPct' : val === 'customer_revenue' ? 'totalSpend' : 'overdueDays');
              setSortDir('desc');
            }}
            options={REPORT_TYPE_OPTIONS}
            autoSortAZ={false}
          />
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Viewing: <strong className="text-slate-900 dark:text-white">{REPORT_TYPE_OPTIONS.find((r) => r.value === reportType)?.label}</strong>
        </div>
      </div>

      {/* REPORT 1: Equipment Utilisation % */}
      {reportType === 'utilisation' && (
        <div className={prhTheme.tableContainer}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={prhTheme.tableHeader}>
                  <PRHTableHeader
                    label="Equipment Name"
                    sortKey="name"
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
                    label="Total Stock"
                    sortKey="totalQty"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="center"
                  />
                  <PRHTableHeader
                    label="Rented on Site"
                    sortKey="rentedQty"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="center"
                  />
                  <PRHTableHeader
                    label="Utilisation %"
                    sortKey="utilPct"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="center"
                  />
                  <PRHTableHeader
                    label="Est. Daily Revenue"
                    sortKey="estimatedDailyRev"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {sortedEquipmentStats.map((eq) => (
                  <tr key={eq.id} className={prhTheme.tableRow}>
                    <td className="py-3 px-3.5 break-words whitespace-normal max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white">{eq.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{eq.code}</div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{eq.category}</td>
                    <td className="py-3 px-3.5 text-center font-mono text-slate-900 dark:text-white whitespace-nowrap">
                      {eq.totalQty} {eq.uom}
                    </td>
                    <td className="py-3 px-3.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {eq.rentedQty} {eq.uom}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              eq.utilPct > 70
                                ? 'bg-emerald-500'
                                : eq.utilPct > 30
                                ? 'bg-blue-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${eq.utilPct}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">{eq.utilPct}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      Rs. {eq.estimatedDailyRev.toLocaleString()}/day
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 2: Customer Revenue Analysis */}
      {reportType === 'customer_revenue' && (
        <div className={prhTheme.tableContainer}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={prhTheme.tableHeader}>
                  <PRHTableHeader
                    label="Customer / Contractor"
                    sortKey="name"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                  />
                  <PRHTableHeader
                    label="Customer Type"
                    sortKey="customerType"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                  />
                  <PRHTableHeader
                    label="Rentals Count"
                    sortKey="rentalsCount"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="center"
                  />
                  <PRHTableHeader
                    label="Total Spend"
                    sortKey="totalSpend"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {sortedCustomerStats.map((c) => (
                  <tr key={c.id} className={prhTheme.tableRow}>
                    <td className="py-3 px-3.5 break-words whitespace-normal max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                      {c.companyName && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.companyName}</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 capitalize text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <span className={prhTheme.badgeNeutral}>{c.customerType}</span>
                    </td>
                    <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {c.rentalsCount} contracts
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      Rs. {c.totalSpend.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 3: Overdue Rentals Aging */}
      {reportType === 'overdue' && (
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
                    label="Customer"
                    sortKey="customerName"
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
                    label="Expected Return"
                    sortKey="expectedReturnDate"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                  />
                  <PRHTableHeader
                    label="Overdue Days"
                    sortKey="overdueDays"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="center"
                  />
                  <PRHTableHeader
                    label="Rental Amount"
                    sortKey="totalRentalAmount"
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {sortedOverdueRentals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                      No overdue rentals at the moment! All active contracts are on schedule.
                    </td>
                  </tr>
                ) : (
                  sortedOverdueRentals.map((r) => (
                    <tr key={r.id} className={prhTheme.tableRow}>
                      <td className="py-3 px-3.5 font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {r.rentalNumber}
                      </td>
                      <td className="py-3 px-3.5 break-words whitespace-normal max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white">{r.customerName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{r.customerPhone}</div>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.startDate}</td>
                      <td className="py-3 px-3.5 font-mono text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap">{r.expectedReturnDate}</td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className={prhTheme.badgeDanger}>{r.overdueDays} Days Late</span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        Rs. {r.totalRentalAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
