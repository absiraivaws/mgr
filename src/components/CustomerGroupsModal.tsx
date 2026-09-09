import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Tag, 
  ShieldAlert, 
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Customer, CustomerGroup } from '../types';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { UserAccount } from '../utils/auth';

interface CustomerGroupsModalProps {
  groups: CustomerGroup[];
  customers: Customer[];
  currentUser?: UserAccount;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onClose: () => void;
  onSaveGroup: (group: CustomerGroup) => void;
  onDeleteGroup: (groupId: string) => void;
}

const COLOR_OPTIONS = [
  { name: 'Emerald', value: 'emerald', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { name: 'Amber', value: 'amber', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { name: 'Cyan', value: 'cyan', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { name: 'Rose', value: 'rose', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { name: 'Slate', value: 'slate', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
];

export const CustomerGroupsModal: React.FC<CustomerGroupsModalProps> = ({
  groups,
  customers,
  currentUser,
  themeMode = 'dark',
  accent = 'emerald',
  onClose,
  onSaveGroup,
  onDeleteGroup,
}) => {
  const t = getThemeClasses(themeMode, accent);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'admin@cycly.com';

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [colorInput, setColorInput] = useState('emerald');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setEditingGroupId(null);
    setNameInput('');
    setDescriptionInput('');
    setColorInput('emerald');
    setErrorMsg(null);
  };

  const handleStartEdit = (group: CustomerGroup) => {
    setEditingGroupId(group.id);
    setNameInput(group.name);
    setDescriptionInput(group.description || '');
    setColorInput(group.color || 'emerald');
    setErrorMsg(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = nameInput.trim();
    if (!cleanName) {
      setErrorMsg('Please enter a valid group name.');
      return;
    }

    // Check duplicate name
    const existing = groups.find(
      (g) => g.name.toLowerCase() === cleanName.toLowerCase() && g.id !== editingGroupId
    );
    if (existing) {
      setErrorMsg(`A group with the name "${cleanName}" already exists.`);
      return;
    }

    if (editingGroupId) {
      const existingGroup = groups.find((g) => g.id === editingGroupId);
      if (existingGroup) {
        onSaveGroup({
          ...existingGroup,
          name: cleanName,
          description: descriptionInput.trim(),
          color: colorInput,
        });
      }
    } else {
      const newGroup: CustomerGroup = {
        id: `group-${Date.now()}`,
        name: cleanName,
        description: descriptionInput.trim(),
        color: colorInput,
        isActive: true,
        createdAt: Date.now(),
      };
      onSaveGroup(newGroup);
    }

    resetForm();
  };

  const handleToggleActive = (group: CustomerGroup) => {
    onSaveGroup({
      ...group,
      isActive: !group.isActive,
    });
  };

  // Calculate customer count per group
  const customerCountMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of customers) {
      if (Array.isArray(c.groups)) {
        for (const g of c.groups) {
          map[g] = (map[g] || 0) + 1;
        }
      }
    }
    return map;
  }, [customers]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className={`${t.modalBg} rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col border border-slate-800`}>
        
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b ${t.divider} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-bold text-base sm:text-lg ${t.textHeading}`}>
                Manage Customer Groups
              </h3>
              <p className={`text-xs ${t.textMuted}`}>
                Create, edit & categorize customer segments for bulk WhatsApp messaging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textMain} cursor-pointer transition`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Quick Option to Create 'Customer Directory & Identity Records' Group */}
          {!groups.some((g) => g.name.toLowerCase() === 'customer directory & identity records') && isAdmin && (
            <div className="p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 font-bold mt-0.5 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-300 block">
                    Create "Customer Directory & Identity Records" Group
                  </span>
                  <p className="text-[11px] text-indigo-200/80 mt-0.5">
                    Recommended group for officially verified customer identification records and KYC profiles.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newGroup: CustomerGroup = {
                    id: `grp-directory-identity-${Date.now()}`,
                    name: 'Customer Directory & Identity Records',
                    description: 'Verified identity and official KYC customer records directory',
                    color: 'indigo',
                    isActive: true,
                    createdAt: Date.now(),
                  };
                  onSaveGroup(newGroup);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 shadow-md cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Group</span>
              </button>
            </div>
          )}

          {/* Create / Edit Group Form (Admin Only) */}
          {isAdmin ? (
            <form onSubmit={handleSave} className={`p-4 rounded-xl border ${t.cardSubtleBg} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  <span>{editingGroupId ? 'Edit Customer Group' : 'Create New Customer Group'}</span>
                </span>
                {editingGroupId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Group Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VIP Club, Foreign Tourist, Corporate"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Tag Color
                  </label>
                  <select
                    value={colorInput}
                    onChange={(e) => setColorInput(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${t.dropdownInput} cursor-pointer`}
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Description / Purpose (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Customers staying at partner beach hotels"
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${t.textInput}`}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${t.primaryBtn}`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingGroupId ? 'Update Group' : 'Add Group'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Only Administrator accounts have permission to create or alter customer groups.</span>
            </div>
          )}

          {/* Existing Groups Table / Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
                Configured Groups ({groups.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Click status toggle to activate/deactivate
              </span>
            </div>

            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
              {groups.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No customer groups configured yet.
                </div>
              ) : (
                groups.map((group) => {
                  const assignedCount = customerCountMap[group.name] || customerCountMap[group.id] || 0;
                  const colorMatch = COLOR_OPTIONS.find((c) => c.value === group.color) || COLOR_OPTIONS[0];

                  return (
                    <div
                      key={group.id}
                      className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        group.isActive ? 'bg-slate-900/40 hover:bg-slate-900/80' : 'bg-slate-950/60 opacity-60'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colorMatch.bg}`}>
                            {group.name}
                          </span>
                          {!group.isActive && (
                            <span className="text-[10px] uppercase font-semibold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                              Inactive / Deactivated
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            ({assignedCount} customers assigned)
                          </span>
                        </div>
                        {group.description && (
                          <p className={`text-xs ${t.textMuted}`}>
                            {group.description}
                          </p>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(group)}
                            title={group.isActive ? 'Click to deactivate' : 'Click to activate'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer transition"
                          >
                            {group.isActive ? (
                              <ToggleRight className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-slate-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(group)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 cursor-pointer transition hover:bg-slate-800"
                            title="Edit group"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove group "${group.name}"?`)) {
                                onDeleteGroup(group.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer transition hover:bg-slate-800"
                            title="Delete group"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${t.divider} flex justify-end shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${t.inactiveTab}`}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
