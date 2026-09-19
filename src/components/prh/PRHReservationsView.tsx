import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  HardHat,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { PRHCustomer, PRHEquipment, PRHReservation } from '../../types/prhTypes';
import { prhTheme, SortDirection, sortPRHData } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';
import { PRHTableHeader } from './PRHTableHeader';

interface PRHReservationsViewProps {
  reservations: PRHReservation[];
  customers: PRHCustomer[];
  equipment: PRHEquipment[];
  currentUserEmail: string;
  onSaveReservation: (res: PRHReservation) => void;
}

const RESERVATION_STATUS_OPTIONS: PRHOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'active', label: 'Active On-Site' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PRHReservationsView: React.FC<PRHReservationsViewProps> = ({
  reservations,
  customers,
  equipment,
  currentUserEmail,
  onSaveReservation,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal form states
  const [customerId, setCustomerId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0]
  );
  const [equipmentId, setEquipmentId] = useState('');
  const [qty, setQty] = useState(10);
  const [deposit, setDeposit] = useState(5000);

  // Sorting state
  const [sortKey, setSortKey] = useState<string>('startDate');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Customer options sorted A-Z
  const customerOptions = useMemo<PRHOption[]>(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: `${c.phone} • ${c.siteAddress || c.type}`,
    }));
  }, [customers]);

  // Equipment options sorted A-Z
  const equipmentOptions = useMemo<PRHOption[]>(() => {
    return equipment.map((e) => ({
      value: e.id,
      label: e.name,
      sublabel: `Avail: ${e.availableQty} ${e.uom || 'units'} • Rs. ${e.dailyRate}/day`,
    }));
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

  const filteredReservations = useMemo(() => {
    const list = reservations.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const itemsStr = r.items.map((it) => it.equipmentName).join(' ').toLowerCase();
      return (
        r.id.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.toLowerCase().includes(q) ||
        itemsStr.includes(q)
      );
    });

    return sortPRHData(list, sortKey, sortDir);
  }, [reservations, statusFilter, searchTerm, sortKey, sortDir]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === customerId);
    const eq = equipment.find((e) => e.id === equipmentId);
    if (!cust || !eq) {
      alert('Please select a customer and equipment.');
      return;
    }

    const newRes: PRHReservation = {
      id: `PRH-RES-${Date.now().toString().slice(-6)}`,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      startDate,
      endDate,
      items: [{ equipmentId: eq.id, equipmentName: eq.name, quantity: qty }],
      status: 'confirmed',
      deposit,
      createdAt: new Date().toISOString(),
      createdBy: currentUserEmail,
    };

    onSaveReservation(newRes);
    setIsModalOpen(false);
    // Reset form
    setCustomerId('');
    setEquipmentId('');
    setQty(10);
    setDeposit(5000);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Equipment Reservations & Advance Booking
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Book scaffolding sets and construction equipment for upcoming project start dates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={prhTheme.btnPrimary}
        >
          <Plus className="w-4 h-4" />
          Create Reservation
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className={`${prhTheme.card} p-4 flex flex-col md:flex-row gap-3 items-center justify-between`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, contractor, equipment..."
            className={`${prhTheme.input} pl-9`}
          />
        </div>

        <div className="w-full md:w-64">
          <PRHSearchableSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={RESERVATION_STATUS_OPTIONS}
            placeholder="Filter by status..."
            autoSortAZ={false}
          />
        </div>
      </div>

      {/* Reservations Table */}
      <div className={prhTheme.tableContainer}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={prhTheme.tableHeader}>
                <PRHTableHeader
                  label="Reservation ID"
                  sortKey="id"
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
                <th className="py-3 px-3">Equipment Booked</th>
                <PRHTableHeader
                  label="Start Date"
                  sortKey="startDate"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="End Date"
                  sortKey="endDate"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Deposit (Rs.)"
                  sortKey="deposit"
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No equipment reservations found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((r) => (
                  <tr key={r.id} className={prhTheme.tableRow}>
                    <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {r.id}
                    </td>
                    <td className="py-3 px-3 whitespace-normal break-words max-w-[200px]">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{r.customerName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{r.customerPhone}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 whitespace-normal break-words max-w-[260px]">
                      {r.items.map((it) => `${it.quantity}x ${it.equipmentName}`).join(', ')}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {r.startDate}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {r.endDate}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      Rs. {r.deposit.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={
                          r.status === 'confirmed'
                            ? prhTheme.badgePrimary
                            : r.status === 'active'
                            ? prhTheme.badgeSuccess
                            : r.status === 'completed'
                            ? prhTheme.badgeNeutral
                            : prhTheme.badgeDanger
                        }
                      >
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Reservation Modal */}
      {isModalOpen && (
        <div className={prhTheme.modalBackdrop}>
          <div className={`${prhTheme.modal} max-w-md w-full p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                New Equipment Reservation
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={prhTheme.label}>Customer / Contractor *</label>
                <PRHSearchableSelect
                  value={customerId}
                  onChange={setCustomerId}
                  options={customerOptions}
                  placeholder="Select contractor or customer..."
                  searchPlaceholder="Search by name, phone..."
                  autoSortAZ={true}
                />
              </div>

              <div>
                <label className={prhTheme.label}>Equipment Item *</label>
                <PRHSearchableSelect
                  value={equipmentId}
                  onChange={setEquipmentId}
                  options={equipmentOptions}
                  placeholder="Select equipment to reserve..."
                  searchPlaceholder="Search equipment item..."
                  autoSortAZ={true}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
                    className={prhTheme.input}
                    required
                  />
                </div>
                <div>
                  <label className={prhTheme.label}>Deposit (Rs.)</label>
                  <input
                    type="number"
                    min={0}
                    value={deposit}
                    onChange={(e) => setDeposit(parseFloat(e.target.value) || 0)}
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Required From *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={prhTheme.input}
                  />
                </div>
                <div>
                  <label className={prhTheme.label}>Expected Return *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={prhTheme.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={prhTheme.btnPrimary}
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
