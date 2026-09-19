import React, { useState, useMemo } from 'react';
import {
  Boxes,
  CheckCircle,
  Clock,
  DollarSign,
  Edit3,
  Filter,
  Layers,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { PRHEquipment } from '../../types/prhTypes';
import { generateNextPRHId } from '../../utils/prhStorage';
import { prhTheme, SortDirection, sortPRHData } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';
import { PRHTableHeader } from './PRHTableHeader';

interface PRHEquipmentViewProps {
  equipment: PRHEquipment[];
  currentUserEmail: string;
  onSaveEquipment: (equipment: PRHEquipment) => void;
  onDeleteEquipment: (id: string) => void;
}

export const PRHEquipmentView: React.FC<PRHEquipmentViewProps> = ({
  equipment,
  currentUserEmail,
  onSaveEquipment,
  onDeleteEquipment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<PRHEquipment | null>(null);

  // Sorting state
  const [sortKey, setSortKey] = useState<string>('code');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Scaffolding');
  const [rentalMethod, setRentalMethod] = useState<'quantity' | 'serial'>('quantity');
  const [dailyRate, setDailyRate] = useState(150);
  const [securityDeposit, setSecurityDeposit] = useState(1000);
  const [minDays, setMinDays] = useState(1);
  const [lateCharge, setLateCharge] = useState(50);
  const [replacementValue, setReplacementValue] = useState(5000);
  const [totalQty, setTotalQty] = useState(50);
  const [uom, setUom] = useState('Pcs');
  const [description, setDescription] = useState('');

  // Extract distinct categories and format for PRHSearchableSelect
  const categoryOptions = useMemo<PRHOption[]>(() => {
    const cats = Array.from(new Set(equipment.map((e) => e.category))).filter(Boolean) as string[];
    const sorted = cats.sort((a, b) => a.localeCompare(b));
    return [
      { value: 'all', label: 'All Categories' },
      ...sorted.map((c) => ({ value: c, label: c })),
    ];
  }, [equipment]);

  const handleOpenAdd = () => {
    setEditingEquipment(null);
    setCode(`PRH-EQ-${Date.now().toString().slice(-4)}`);
    setName('');
    setCategory('Scaffolding');
    setRentalMethod('quantity');
    setDailyRate(150);
    setSecurityDeposit(1000);
    setMinDays(1);
    setLateCharge(50);
    setReplacementValue(5000);
    setTotalQty(50);
    setUom('Pcs');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (eq: PRHEquipment) => {
    setEditingEquipment(eq);
    setCode(eq.code);
    setName(eq.name);
    setCategory(eq.category);
    setRentalMethod(eq.rentalMethod);
    setDailyRate(eq.dailyRate);
    setSecurityDeposit(eq.securityDeposit);
    setMinDays(eq.minDays || 1);
    setLateCharge(eq.lateChargePerDay || 50);
    setReplacementValue(eq.replacementValue);
    setTotalQty(eq.totalQty);
    setUom(eq.uom);
    setDescription(eq.description || '');
    setIsModalOpen(true);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Equipment name is required.');
      return;
    }

    const nextId = editingEquipment
      ? editingEquipment.id
      : generateNextPRHId('PRH-EQ-', equipment.map((e) => e.id), 4);

    const record: PRHEquipment = {
      id: nextId,
      code: code.trim() || nextId,
      name: name.trim(),
      category: category.trim() || 'General',
      rentalMethod,
      dailyRate,
      securityDeposit,
      minDays,
      lateChargeMethod: 'fixed',
      lateChargePerDay: lateCharge,
      replacementValue,
      damageChargeRule: 'At actual repair / replacement cost',
      totalQty,
      availableQty: editingEquipment ? editingEquipment.availableQty : totalQty,
      rentedQty: editingEquipment ? editingEquipment.rentedQty : 0,
      reservedQty: editingEquipment ? editingEquipment.reservedQty : 0,
      maintenanceQty: editingEquipment ? editingEquipment.maintenanceQty : 0,
      damagedQty: editingEquipment ? editingEquipment.damagedQty : 0,
      lostQty: editingEquipment ? editingEquipment.lostQty : 0,
      uom: uom.trim() || 'Units',
      status: 'active',
      description: description.trim() || undefined,
      createdAt: editingEquipment ? editingEquipment.createdAt : new Date().toISOString(),
      createdBy: editingEquipment ? editingEquipment.createdBy : currentUserEmail,
    };

    onSaveEquipment(record);
    setIsModalOpen(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Equipment Master Catalog & Rental Rates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure daily rates, refundable security deposits, replacement values and inventory tracking rules.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className={prhTheme.btnPrimary}
        >
          <Plus className="w-4 h-4" />
          Add Equipment Item
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className={`${prhTheme.card} p-4 flex flex-col md:flex-row gap-3 items-center justify-between`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search equipment name, code, category..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600"
          />
        </div>

        {/* Replaced side-by-side buttons with Searchable Dropdown */}
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

      {/* Equipment Table */}
      <div className={prhTheme.tableContainer}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={prhTheme.tableHeader}>
                <PRHTableHeader
                  label="Code / ID"
                  sortKey="code"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
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
                  label="Tracking Method"
                  sortKey="rentalMethod"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
                <PRHTableHeader
                  label="Daily Rate"
                  sortKey="dailyRate"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <PRHTableHeader
                  label="Deposit"
                  sortKey="securityDeposit"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <PRHTableHeader
                  label="Replacement Value"
                  sortKey="replacementValue"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <PRHTableHeader
                  label="Total Stock"
                  sortKey="totalQty"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
                <th className="py-3 px-3.5 text-center font-semibold text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No equipment found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredEquipment.map((eq) => (
                  <tr key={eq.id} className={prhTheme.tableRow}>
                    <td className="py-3 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {eq.code}
                    </td>
                    <td className="py-3 px-3.5 break-words whitespace-normal max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white">{eq.name}</div>
                      {eq.description && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 break-words">{eq.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">{eq.category}</td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <span className={eq.rentalMethod === 'serial' ? prhTheme.badgePrimary : prhTheme.badgeNeutral}>
                        {eq.rentalMethod === 'serial' ? 'Serial Units' : 'Quantity Based'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      Rs. {eq.dailyRate}/day
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      Rs. {eq.securityDeposit}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Rs. {eq.replacementValue.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {eq.totalQty} {eq.uom}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(eq)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Edit Equipment"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${eq.name}?`)) {
                              onDeleteEquipment(eq.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Delete Equipment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Equipment Add/Edit Modal */}
      {isModalOpen && (
        <div className={prhTheme.modalBackdrop}>
          <div className={`${prhTheme.modal} max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {editingEquipment ? 'Edit Equipment Item' : 'Add New Equipment Item'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Equipment Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={prhTheme.input}
                  />
                </div>

                <div>
                  <label className={prhTheme.label}>Category *</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Scaffolding, Pipes, Power Tools"
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div>
                <label className={prhTheme.label}>Equipment Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Heavy Duty Scaffolding Set (5ft x 6ft)"
                  className={prhTheme.input}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Inventory Method *</label>
                  <select
                    value={rentalMethod}
                    onChange={(e) => setRentalMethod(e.target.value as any)}
                    className={prhTheme.select}
                  >
                    <option value="quantity">Quantity Based (Bulk)</option>
                    <option value="serial">Serial Number Based</option>
                  </select>
                </div>

                <div>
                  <label className={prhTheme.label}>Unit of Measure (UOM)</label>
                  <input
                    type="text"
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    placeholder="e.g. Pcs, Sets, Meters"
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={prhTheme.label}>Daily Rate (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={dailyRate}
                    onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                    className={prhTheme.input}
                  />
                </div>

                <div>
                  <label className={prhTheme.label}>Deposit (Rs.)</label>
                  <input
                    type="number"
                    min={0}
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(parseFloat(e.target.value) || 0)}
                    className={prhTheme.input}
                  />
                </div>

                <div>
                  <label className={prhTheme.label}>Min Rental Days</label>
                  <input
                    type="number"
                    min={1}
                    value={minDays}
                    onChange={(e) => setMinDays(parseInt(e.target.value, 10) || 1)}
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={prhTheme.label}>Total Stock Qty *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={totalQty}
                    onChange={(e) => setTotalQty(parseInt(e.target.value, 10) || 1)}
                    className={prhTheme.input}
                  />
                </div>

                <div>
                  <label className={prhTheme.label}>Replacement Val (Rs.)</label>
                  <input
                    type="number"
                    min={0}
                    value={replacementValue}
                    onChange={(e) => setReplacementValue(parseFloat(e.target.value) || 0)}
                    className={prhTheme.input}
                  />
                </div>

                <div>
                  <label className={prhTheme.label}>Late Fee/Day (Rs.)</label>
                  <input
                    type="number"
                    min={0}
                    value={lateCharge}
                    onChange={(e) => setLateCharge(parseFloat(e.target.value) || 0)}
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div>
                <label className={prhTheme.label}>Technical Description & Specifications</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Dimensions, safety plate ratings, motor specs, serials info..."
                  className={prhTheme.input}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
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
                  {editingEquipment ? 'Update Equipment' : 'Save Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
