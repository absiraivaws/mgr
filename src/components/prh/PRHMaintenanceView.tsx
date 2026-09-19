import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Plus,
  Search,
  Wrench,
  X,
} from 'lucide-react';
import { PRHEquipment, PRHMaintenance } from '../../types/prhTypes';
import { generateNextPRHId } from '../../utils/prhStorage';
import { prhTheme, SortDirection, sortPRHData } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';
import { PRHTableHeader } from './PRHTableHeader';

interface PRHMaintenanceViewProps {
  maintenanceRecords: PRHMaintenance[];
  equipment: PRHEquipment[];
  currentUserEmail: string;
  onSaveMaintenance: (record: PRHMaintenance) => void;
}

export const PRHMaintenanceView: React.FC<PRHMaintenanceViewProps> = ({
  maintenanceRecords,
  equipment,
  currentUserEmail,
  onSaveMaintenance,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [issue, setIssue] = useState('');
  const [repairer, setRepairer] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  // Sorting state
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Options for equipment searchable select (sorted A-Z)
  const equipmentOptions = useMemo<PRHOption[]>(() => {
    return equipment.map((eq) => ({
      value: eq.id,
      label: eq.name,
      sublabel: `Category: ${eq.category} • Total: ${eq.totalQty}`,
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

  const sortedRecords = useMemo(() => {
    return sortPRHData(maintenanceRecords, sortKey, sortDir);
  }, [maintenanceRecords, sortKey, sortDir]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eq = equipment.find((e) => e.id === selectedEquipmentId);
    if (!eq) {
      alert('Please select an equipment item.');
      return;
    }

    const nextId = generateNextPRHId(
      'PRH-MNT-',
      maintenanceRecords.map((m) => m.id),
      4
    );

    const record: PRHMaintenance = {
      id: nextId,
      equipmentId: eq.id,
      equipmentName: eq.name,
      issue: issue.trim(),
      repairer: repairer.trim() || 'Internal Workshop',
      estimatedCost: parseFloat(estimatedCost) || 0,
      actualCost: 0,
      startDate: new Date().toISOString().split('T')[0],
      expectedCompletion: expectedDate || new Date().toISOString().split('T')[0],
      repairStatus: 'under_repair',
      loggedBy: currentUserEmail,
      createdAt: new Date().toISOString(),
    };

    onSaveMaintenance(record);
    setIsModalOpen(false);
    setSelectedEquipmentId('');
    setIssue('');
    setRepairer('');
    setEstimatedCost('');
    setExpectedDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Equipment Maintenance & Repair Workshop
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Log damaged scaffolding frames, jammed iron jacks, welding machine repairs and maintenance costs.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className={prhTheme.btnPrimary}
        >
          <Plus className="w-4 h-4" />
          Log Maintenance Job
        </button>
      </div>

      <div className={prhTheme.tableContainer}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={prhTheme.tableHeader}>
                <PRHTableHeader
                  label="Job ID"
                  sortKey="id"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Equipment"
                  sortKey="equipmentName"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Damage Issue"
                  sortKey="issue"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Repairer"
                  sortKey="repairer"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Est. Cost"
                  sortKey="estimatedCost"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <PRHTableHeader
                  label="Target Date"
                  sortKey="expectedCompletion"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Status"
                  sortKey="repairStatus"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {sortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No equipment currently in workshop or under maintenance.
                  </td>
                </tr>
              ) : (
                sortedRecords.map((m) => (
                  <tr key={m.id} className={prhTheme.tableRow}>
                    <td className="py-3 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{m.id}</td>
                    <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white break-words whitespace-normal max-w-xs">{m.equipmentName}</td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 break-words whitespace-normal max-w-xs">{m.issue}</td>
                    <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{m.repairer}</td>
                    <td className="py-3 px-3.5 font-mono text-rose-600 dark:text-rose-400 font-bold text-right whitespace-nowrap">
                      Rs. {m.estimatedCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">{m.expectedCompletion}</td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <span className={m.repairStatus === 'completed' ? prhTheme.badgeSuccess : prhTheme.badgePrimary}>
                        {m.repairStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Maintenance Job Modal */}
      {isModalOpen && (
        <div className={prhTheme.modalBackdrop}>
          <div className={`${prhTheme.modal} max-w-md w-full p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Log Equipment Maintenance Job
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
              <div>
                <label className={prhTheme.label}>Equipment *</label>
                <PRHSearchableSelect
                  value={selectedEquipmentId}
                  onChange={setSelectedEquipmentId}
                  options={equipmentOptions}
                  placeholder="Select equipment needing repair..."
                  searchPlaceholder="Search equipment (A-Z)..."
                  autoSortAZ={true}
                />
              </div>

              <div>
                <label className={prhTheme.label}>Defect / Damage Issue *</label>
                <textarea
                  rows={2}
                  required
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="e.g. Scaffolding base plate bent, welder power cord frayed"
                  className={prhTheme.input}
                />
              </div>

              <div>
                <label className={prhTheme.label}>Repairer / Workshop</label>
                <input
                  type="text"
                  value={repairer}
                  onChange={(e) => setRepairer(e.target.value)}
                  placeholder="e.g. Internal Depot Workshop or Mannar Welding Works"
                  className={prhTheme.input}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Estimated Cost (Rs.)</label>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    placeholder="e.g. 2500"
                    className={prhTheme.input}
                  />
                </div>
                <div>
                  <label className={prhTheme.label}>Target Completion</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className={prhTheme.input}
                  />
                </div>
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
                  Log Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
