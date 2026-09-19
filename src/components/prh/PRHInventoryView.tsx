import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  Search,
  Wrench,
  X,
} from 'lucide-react';
import { PRHEquipment, PRHSerialUnit } from '../../types/prhTypes';
import { prhTheme, SortDirection, sortPRHData } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';
import { PRHTableHeader } from './PRHTableHeader';

interface PRHInventoryViewProps {
  equipment: PRHEquipment[];
  onUpdateEquipmentStock: (equipment: PRHEquipment[]) => void;
}

export const PRHInventoryView: React.FC<PRHInventoryViewProps> = ({
  equipment,
  onUpdateEquipmentStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewingSerialsEq, setViewingSerialsEq] = useState<PRHEquipment | null>(null);

  // Sorting state
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Overall KPIs
  const totalUnits = equipment.reduce((sum, e) => sum + e.totalQty, 0);
  const availableUnits = equipment.reduce((sum, e) => sum + e.availableQty, 0);
  const rentedUnits = equipment.reduce((sum, e) => sum + e.rentedQty, 0);
  const reservedUnits = equipment.reduce((sum, e) => sum + e.reservedQty, 0);
  const maintenanceUnits = equipment.reduce((sum, e) => sum + e.maintenanceQty, 0);
  const damagedUnits = equipment.reduce((sum, e) => sum + e.damagedQty, 0);
  const lostUnits = equipment.reduce((sum, e) => sum + e.lostQty, 0);

  // Extract distinct categories
  const categoryOptions = useMemo<PRHOption[]>(() => {
    const cats = Array.from(new Set(equipment.map((e) => e.category))).filter(Boolean);
    const sorted = cats.sort((a, b) => a.localeCompare(b));
    return [
      { value: 'all', label: 'All Categories' },
      ...sorted.map((c) => ({ value: c, label: c })),
    ];
  }, [equipment]);

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

  // Filtered and sorted equipment
  const filteredEquipment = useMemo(() => {
    const list = equipment.filter((eq) => {
      if (categoryFilter !== 'all' && eq.category !== categoryFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        eq.name.toLowerCase().includes(q) ||
        eq.code.toLowerCase().includes(q) ||
        eq.category.toLowerCase().includes(q)
      );
    });

    return sortPRHData(list, sortKey, sortDir);
  }, [equipment, categoryFilter, searchTerm, sortKey, sortDir]);

  // Handle Serial Unit Status Change
  const handleUpdateSerialStatus = (
    eqId: string,
    serialNumber: string,
    newStatus: PRHSerialUnit['status']
  ) => {
    const updated = equipment.map((eq) => {
      if (eq.id !== eqId || !eq.serialUnits) return eq;
      const updatedSerials = eq.serialUnits.map((u) =>
        u.serialNumber === serialNumber ? { ...u, status: newStatus } : u
      );

      const avail = updatedSerials.filter((u) => u.status === 'available').length;
      const rent = updatedSerials.filter((u) => u.status === 'rented').length;
      const maint = updatedSerials.filter((u) => u.status === 'maintenance').length;
      const dam = updatedSerials.filter((u) => u.status === 'damaged').length;
      const lost = updatedSerials.filter((u) => u.status === 'lost').length;

      return {
        ...eq,
        serialUnits: updatedSerials,
        availableQty: avail,
        rentedQty: rent,
        maintenanceQty: maint,
        damagedQty: dam,
        lostQty: lost,
      };
    });

    onUpdateEquipmentStock(updated);
    if (viewingSerialsEq && viewingSerialsEq.id === eqId) {
      setViewingSerialsEq(updated.find((e) => e.id === eqId) || null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Boxes className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Live Equipment Inventory & Stock Breakdown
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
          Formula: Available = Total - Rented - Reserved - Maintenance - Damaged - Lost
        </p>
      </div>

      {/* Stock KPI Cards (Consistent 4-color palette & high contrast) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center shadow-2xs">
          <span className="text-slate-500 dark:text-slate-400 block font-semibold">Total Units</span>
          <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">{totalUnits}</span>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center shadow-2xs">
          <span className="text-emerald-700 dark:text-emerald-400 block font-semibold">Available</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-300 font-mono mt-0.5 block">{availableUnits}</span>
        </div>
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center shadow-2xs">
          <span className="text-blue-700 dark:text-blue-400 block font-semibold">Rented</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-300 font-mono mt-0.5 block">{rentedUnits}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center shadow-2xs">
          <span className="text-slate-600 dark:text-slate-400 block font-semibold">Reserved</span>
          <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">{reservedUnits}</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-center shadow-2xs">
          <span className="text-slate-600 dark:text-slate-400 block font-semibold">Maintenance</span>
          <span className="text-xl font-black text-slate-900 dark:text-white font-mono mt-0.5 block">{maintenanceUnits}</span>
        </div>
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center shadow-2xs">
          <span className="text-rose-700 dark:text-rose-400 block font-semibold">Damaged</span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-300 font-mono mt-0.5 block">{damagedUnits}</span>
        </div>
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center shadow-2xs">
          <span className="text-rose-700 dark:text-rose-400 block font-semibold">Lost</span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-300 font-mono mt-0.5 block">{lostUnits}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`${prhTheme.card} p-4 flex flex-col md:flex-row gap-3 items-center justify-between`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter inventory item or category..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600"
          />
        </div>

        {/* Replaced side-by-side selection buttons with Searchable Dropdown */}
        <div className="w-full md:w-64">
          <PRHSearchableSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categoryOptions}
            placeholder="Filter by category..."
            searchPlaceholder="Search categories..."
            autoSortAZ={false}
          />
        </div>
      </div>

      {/* Inventory Stock Table */}
      <div className={prhTheme.tableContainer}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={prhTheme.tableHeader}>
                <PRHTableHeader
                  label="Equipment"
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
                  label="Total"
                  sortKey="totalQty"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
                <PRHTableHeader
                  label="Available"
                  sortKey="availableQty"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
                <PRHTableHeader
                  label="Rented"
                  sortKey="rentedQty"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
                <PRHTableHeader
                  label="Maintenance"
                  sortKey="maintenanceQty"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
                <PRHTableHeader
                  label="Damaged"
                  sortKey="damagedQty"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
                <PRHTableHeader
                  label="Lost"
                  sortKey="lostQty"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
                <th className="py-3 px-3.5 text-center font-semibold text-slate-600 dark:text-slate-400">Tracking / Units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No equipment found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredEquipment.map((eq) => {
                  const availPct = Math.round((eq.availableQty / (eq.totalQty || 1)) * 100);
                  return (
                    <tr key={eq.id} className={prhTheme.tableRow}>
                      <td className="py-3 px-3.5 break-words whitespace-normal max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white">{eq.name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{eq.code}</div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{eq.category}</td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {eq.totalQty} {eq.uom}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {eq.availableQty}
                        </span>
                        <div className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              availPct > 50 ? 'bg-emerald-500' : availPct > 20 ? 'bg-blue-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${availPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {eq.rentedQty}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {eq.maintenanceQty}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {eq.damagedQty}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {eq.lostQty}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {eq.rentalMethod === 'serial' && eq.serialUnits ? (
                          <button
                            type="button"
                            onClick={() => setViewingSerialsEq(eq)}
                            className={prhTheme.btnSecondary}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {eq.serialUnits.length} Serials
                          </button>
                        ) : (
                          <span className={prhTheme.badgeNeutral}>
                            Bulk Qty
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Serial Units Inspection Modal */}
      {viewingSerialsEq && viewingSerialsEq.serialUnits && (
        <div className={prhTheme.modalBackdrop}>
          <div className={`${prhTheme.modal} max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Serial Units Management: {viewingSerialsEq.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Inspect and update live status of individual equipment assets
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSerialsEq(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={prhTheme.tableHeader}>
                    <th className="py-2.5 px-3">Serial #</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Site Location</th>
                    <th className="py-2.5 px-3 text-center">Change Unit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingSerialsEq.serialUnits.map((u) => (
                    <tr key={u.serialNumber} className={prhTheme.tableRow}>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {u.serialNumber}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={
                            u.status === 'available'
                              ? prhTheme.badgeSuccess
                              : u.status === 'rented'
                              ? prhTheme.badgePrimary
                              : u.status === 'damaged' || u.status === 'lost'
                              ? prhTheme.badgeDanger
                              : prhTheme.badgeNeutral
                          }
                        >
                          {u.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 break-words whitespace-normal max-w-xs">
                        {u.location || 'Depot'}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <select
                          value={u.status}
                          onChange={(e) =>
                            handleUpdateSerialStatus(
                              viewingSerialsEq.id,
                              u.serialNumber,
                              e.target.value as any
                            )
                          }
                          className={prhTheme.select}
                        >
                          <option value="available">Available</option>
                          <option value="rented">Rented on Site</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="damaged">Damaged</option>
                          <option value="lost">Lost</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingSerialsEq(null)}
                className={prhTheme.btnPrimary}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
