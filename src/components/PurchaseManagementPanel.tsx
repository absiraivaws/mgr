import React, { useState, useMemo } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  X, 
  Calendar, 
  DollarSign, 
  Tag, 
  Building2, 
  CreditCard, 
  Trash2, 
  Receipt, 
  CheckCircle2, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown,
  Printer,
  FileSpreadsheet,
  Boxes,
  Sparkles,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowDown01,
  ArrowDown10,
  ArrowUpDown,
  Edit2,
} from 'lucide-react';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { AppSettings, IncomeEntry, PurchaseRecord, Vehicle, VehicleType } from '../types';
import { UserAccount } from '../utils/auth';
import { formatCurrency } from '../utils/pricing';
import { generateNextSerialNumbersForType } from '../utils/bicyclePosUtils';

interface PurchaseManagementPanelProps {
  entries: IncomeEntry[];
  settings: AppSettings;
  currentUser: UserAccount;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  vehicleTypes?: VehicleType[];
  vehicles?: Vehicle[];
  onAddEntry: (entry: IncomeEntry) => Promise<void> | void;
  onUpdateEntry?: (entry: IncomeEntry) => Promise<void> | void;
  onDeleteEntry?: (id: string) => Promise<void> | void;
  onAddVehicles?: (newVehicles: Vehicle[]) => Promise<void> | void;
}

const PURCHASE_CATEGORIES = [
  'Spare Parts & Tubes',
  'Safety Gear & Helmets',
  'Maintenance Tools & Oils',
  'Shop Supplies & Hardware',
  'Electronics & Lights',
  'Other Expenditure',
];

export const PurchaseManagementPanel: React.FC<PurchaseManagementPanelProps> = ({
  entries = [],
  settings,
  currentUser,
  themeMode = 'dark',
  accent = 'emerald',
  vehicleTypes = [],
  vehicles = [],
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onAddVehicles,
}) => {
  const t = getThemeClasses(themeMode, accent);
  const isAdmin = currentUser.role === 'admin' || currentUser.email === 'absiraiva@gmail.com';

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Sorting state — Default descending order by date / createdAt (Requirement 1)
  type SortField = 'date' | 'reference' | 'itemName' | 'category' | 'supplier' | 'amount' | 'paymentMethod' | 'purchasedBy';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Pagination (20 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Vehicle types formatted for category selection
  const configuredVehicleCategories = useMemo(() => {
    return (vehicleTypes || []).map((vt) => {
      const purposeTag = vt.purpose === 'sale' ? 'Sale' : vt.purpose === 'both' ? 'Rental & Sale' : 'Rental';
      return {
        id: vt.id,
        name: vt.name,
        displayName: `${vt.name} [${purposeTag}]`,
        purpose: vt.purpose || 'rental',
        icon: vt.icon,
      };
    });
  }, [vehicleTypes]);

  // Add Purchase Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formDate, setFormDate] = useState(todayStr);
  const [formItemName, setFormItemName] = useState('');
  const [formCategory, setFormCategory] = useState(
    configuredVehicleCategories.length > 0 ? configuredVehicleCategories[0].displayName : PURCHASE_CATEGORIES[0]
  );
  const [formSelectedTypeId, setFormSelectedTypeId] = useState<string>(
    configuredVehicleCategories.length > 0 ? configuredVehicleCategories[0].id : ''
  );
  const [formAddToInventory, setFormAddToInventory] = useState<boolean>(configuredVehicleCategories.length > 0);
  const [formSupplier, setFormSupplier] = useState('');
  const [formSupplierPhone, setFormSupplierPhone] = useState('');
  const [formReference, setFormReference] = useState('');
  const [formQty, setFormQty] = useState('1');
  const [formUnitPrice, setFormUnitPrice] = useState('');
  const [formTotalAmount, setFormTotalAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'qr_transfer' | 'other'>('cash');
  const [formPurchasedBy, setFormPurchasedBy] = useState(currentUser.name || 'Staff');
  const [formRemarks, setFormRemarks] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Voucher view state
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseRecord | null>(null);

  // Edit Purchase Modal state (Admin only)
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRecord | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'qr_transfer' | 'other'>('cash');
  const [editRemarks, setEditRemarks] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEdit = (r: PurchaseRecord) => {
    setEditingPurchase(r);
    setEditDate(r.date);
    setEditItemName(r.itemName);
    setEditCategory(r.category);
    setEditSupplier(r.supplierName);
    setEditAmount(String(r.totalAmount));
    setEditPaymentMethod(r.paymentMethod as any);
    setEditRemarks(r.remarks);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase || !onUpdateEntry) return;
    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditError('Please enter a valid positive amount.');
      return;
    }
    if (!editItemName.trim()) {
      setEditError('Please enter an item name.');
      return;
    }

    const updatedIncomeEntry: IncomeEntry = {
      id: editingPurchase.id,
      date: editDate,
      type: 'expense',
      category: `Purchase: ${editCategory.trim() || 'General Purchase'}`,
      description: `[Purchase] ${editItemName.trim()}`,
      amount: numAmount,
      paymentMethod: editPaymentMethod,
      who: editingPurchase.purchasedBy,
      cashierName: editingPurchase.purchasedBy,
      reference: editingPurchase.reference,
      remarks: `Vendor: ${editSupplier.trim() || 'Supplier'}${editingPurchase.assignedSerials?.length ? ` | Serials: ${editingPurchase.assignedSerials.join(', ')}` : ''}${editRemarks.trim() ? ` | Notes: ${editRemarks.trim()}` : ''}`,
      createdAt: editingPurchase.createdAt,
    };

    await onUpdateEntry(updatedIncomeEntry);
    setEditingPurchase(null);
  };

  // Serial numbers generated automatically for the selected vehicle type
  const calculatedSerials = useMemo(() => {
    if (!formAddToInventory || !formSelectedTypeId) return [];
    const matchedType = (vehicleTypes || []).find((t) => t.id === formSelectedTypeId);
    if (!matchedType) return [];
    const q = Math.max(1, parseInt(formQty, 10) || 1);
    return generateNextSerialNumbersForType(matchedType, vehicles || [], q);
  }, [formAddToInventory, formSelectedTypeId, formQty, vehicleTypes, vehicles]);

  // Extract all purchases from incomeEntries (entries with type === 'expense' and category starting with 'Purchase' or has '[Purchase]')
  const purchaseRecords: PurchaseRecord[] = useMemo(() => {
    return entries
      .filter((e) => e.type === 'expense' && (
        (e.category && e.category.toLowerCase().includes('purchase')) ||
        (e.description && e.description.toLowerCase().includes('[purchase]'))
      ))
      .map((e) => {
        // Parse metadata if available in description or remarks
        const isPrefixed = e.description.startsWith('[Purchase] ');
        const cleanItem = isPrefixed ? e.description.replace(/^\[Purchase\]\s*/, '') : e.description;

        let supplier = 'Supplier';
        if (e.remarks && e.remarks.includes('Vendor: ')) {
          const match = e.remarks.match(/Vendor:\s*([^|]+)/);
          if (match) supplier = match[1].trim();
        }

        let assignedSerials: string[] = [];
        if (e.remarks && e.remarks.includes('Serials: ')) {
          const match = e.remarks.match(/Serials:\s*([^|]+)/);
          if (match) {
            assignedSerials = match[1].split(',').map((s) => s.trim()).filter(Boolean);
          }
        }

        return {
          id: e.id,
          date: e.date,
          reference: e.reference || `PUR-${e.id.slice(-6)}`,
          itemName: cleanItem,
          category: e.category?.replace(/^Purchase:\s*/i, '') || 'General Purchase',
          supplierName: supplier,
          assignedSerials,
          quantity: 1,
          unitPrice: e.amount,
          totalAmount: e.amount,
          paymentMethod: (e.paymentMethod as any) || 'cash',
          purchasedBy: e.who || e.cashierName || 'Staff',
          remarks: e.remarks || '',
          createdAt: e.createdAt || 0,
        };
      });
  }, [entries]);

  // Handle unit price / qty auto-calc
  const handleQtyChange = (val: string) => {
    setFormQty(val);
    const q = parseFloat(val) || 0;
    const p = parseFloat(formUnitPrice) || 0;
    if (q > 0 && p > 0) {
      setFormTotalAmount((q * p).toString());
    }
  };

  const handleUnitPriceChange = (val: string) => {
    setFormUnitPrice(val);
    const p = parseFloat(val) || 0;
    const q = parseFloat(formQty) || 0;
    if (q > 0 && p > 0) {
      setFormTotalAmount((q * p).toString());
    }
  };

  // KPI Calculations
  const totalPurchasesAmount = purchaseRecords.reduce((sum, r) => sum + r.totalAmount, 0);

  const currentMonthPrefix = todayStr.slice(0, 7);
  const thisMonthPurchasesAmount = purchaseRecords
    .filter((r) => r.date.startsWith(currentMonthPrefix))
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const todayPurchasesAmount = purchaseRecords
    .filter((r) => r.date === todayStr)
    .reduce((sum, r) => sum + r.totalAmount, 0);

  // Filter logic
  const filteredPurchases = useMemo(() => {
    return purchaseRecords.filter((r) => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (methodFilter !== 'all' && r.paymentMethod !== methodFilter) return false;
      if (fromDate && r.date < fromDate) return false;
      if (toDate && r.date > toDate) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchItem = r.itemName.toLowerCase().includes(q);
        const matchRef = r.reference.toLowerCase().includes(q);
        const matchSupplier = r.supplierName.toLowerCase().includes(q);
        const matchStaff = r.purchasedBy.toLowerCase().includes(q);
        if (!matchItem && !matchRef && !matchSupplier && !matchStaff) return false;
      }
      return true;
    });
  }, [purchaseRecords, categoryFilter, methodFilter, fromDate, toDate, searchTerm]);

  // Sort logic (Default descending by date / createdAt)
  const sortedPurchases = useMemo(() => {
    const list = [...filteredPurchases];
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = a.date.localeCompare(b.date);
          if (comparison === 0) comparison = (a.createdAt || 0) - (b.createdAt || 0);
          break;
        case 'reference':
          comparison = a.reference.localeCompare(b.reference);
          break;
        case 'itemName':
          comparison = a.itemName.localeCompare(b.itemName);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'supplier':
          comparison = a.supplierName.localeCompare(b.supplierName);
          break;
        case 'amount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        case 'paymentMethod':
          comparison = a.paymentMethod.localeCompare(b.paymentMethod);
          break;
        case 'purchasedBy':
          comparison = a.purchasedBy.localeCompare(b.purchasedBy);
          break;
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredPurchases, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedPurchases.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedPurchases = sortedPurchases.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'amount' || field === 'date' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const handleCategorySelect = (catVal: string) => {
    setFormCategory(catVal);
    const matched = configuredVehicleCategories.find(c => c.displayName === catVal || c.name === catVal);
    if (matched) {
      setFormSelectedTypeId(matched.id);
      setFormAddToInventory(true);
      if (!formItemName.trim() || configuredVehicleCategories.some(c => c.name === formItemName.trim())) {
        setFormItemName(matched.name);
      }
    } else {
      setFormSelectedTypeId('');
      setFormAddToInventory(false);
    }
  };

  const handleOpenAddModal = () => {
    setFormDate(todayStr);
    const defaultCat = configuredVehicleCategories.length > 0 ? configuredVehicleCategories[0].displayName : PURCHASE_CATEGORIES[0];
    setFormCategory(defaultCat);
    if (configuredVehicleCategories.length > 0) {
      setFormSelectedTypeId(configuredVehicleCategories[0].id);
      setFormAddToInventory(true);
      setFormItemName(configuredVehicleCategories[0].name);
    } else {
      setFormSelectedTypeId('');
      setFormAddToInventory(false);
      setFormItemName('');
    }
    setFormSupplier('');
    setFormSupplierPhone('');
    setFormReference(`PUR-${Date.now().toString().slice(-6)}`);
    setFormQty('1');
    setFormUnitPrice('');
    setFormTotalAmount('');
    setFormPaymentMethod('cash');
    setFormPurchasedBy(currentUser.name || 'Staff');
    setFormRemarks('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItemName.trim()) {
      setFormError('Item description is required.');
      return;
    }
    const finalAmount = parseFloat(formTotalAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setFormError('Please enter a valid purchase total amount.');
      return;
    }

    const q = parseFloat(formQty) || 1;
    const unitP = parseFloat(formUnitPrice) || (finalAmount / q);

    const matchedType = (vehicleTypes || []).find((t) => t.id === formSelectedTypeId);

    // If adding to fleet inventory units, create the Vehicle records
    if (formAddToInventory && matchedType && calculatedSerials.length > 0 && onAddVehicles) {
      const newVehiclesList: Vehicle[] = calculatedSerials.map((serial, idx) => ({
        id: `veh-purch-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        serialNumber: serial,
        typeId: matchedType.id,
        modelName: formItemName.trim() || matchedType.name,
        status: 'available',
        costPrice: unitP,
        purchaseRef: formReference.trim() || `PUR-${Date.now().toString().slice(-6)}`,
        notes: `Purchased on ${formDate} (Vendor: ${formSupplier.trim() || 'N/A'}, Invoice: ${formReference.trim()})`,
        totalRentalsCount: 0,
      }));
      await onAddVehicles(newVehiclesList);
    }

    const serialsNote = (formAddToInventory && calculatedSerials.length > 0)
      ? `Serials: ${calculatedSerials.join(', ')}`
      : '';

    const vendorNotes = [
      formSupplier.trim() ? `Vendor: ${formSupplier.trim()}` : '',
      formSupplierPhone.trim() ? `Phone: ${formSupplierPhone.trim()}` : '',
      serialsNote,
      formRemarks.trim() ? `Notes: ${formRemarks.trim()}` : '',
    ].filter(Boolean).join(' | ');

    const newEntry: IncomeEntry = {
      id: `purch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: formDate,
      description: `[Purchase] ${formItemName.trim()} (Qty: ${q} @ ${unitP.toLocaleString()} LK)`,
      type: 'expense',
      amount: finalAmount,
      category: `Purchase: ${formCategory}`,
      reference: formReference.trim() || `PUR-${Date.now().toString().slice(-6)}`,
      paymentMethod: formPaymentMethod,
      who: formPurchasedBy.trim() || 'Staff',
      cashierName: formPurchasedBy.trim() || 'Staff',
      remarks: vendorNotes || undefined,
      createdAt: Date.now(),
    };

    try {
      await onAddEntry(newEntry);
      setIsModalOpen(false);
      const inventoryMsg = (formAddToInventory && calculatedSerials.length > 0)
        ? ` and ${calculatedSerials.length} unit(s) added to Fleet Inventory: ${calculatedSerials.join(', ')}`
        : '';
      setSuccessMsg(`✓ Purchase recorded${inventoryMsg} and synced to financial records!`);
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      setFormError(`Failed to record purchase: ${err?.message || 'Error'}`);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* HEADER & ACTIONS */}
      <div className={`${t.cardBg} rounded-2xl p-4 sm:p-6 border shadow-xl space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                Purchase Management
              </h2>
              <p className={`text-xs ${t.textMuted} mt-0.5`}>
                Record shop inventory purchases, spare parts, and tools. All purchases automatically update financial statements and P&L.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer ${t.primaryBtn}`}
          >
            <Plus className="w-4 h-4" />
            <span>Record Purchase</span>
          </button>
        </div>

        {/* SUCCESS BANNER */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* METRIC KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className={`p-3.5 rounded-xl border ${t.cardSubtleBg}`}>
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${t.textMuted}`}>
              Today's Purchases
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-amber-400">
              {formatCurrency(todayPurchasesAmount, settings.currencySymbol, settings.currencyPosition)}
            </span>
          </div>

          <div className={`p-3.5 rounded-xl border ${t.cardSubtleBg}`}>
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${t.textMuted}`}>
              This Month Purchases
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-amber-500">
              {formatCurrency(thisMonthPurchasesAmount, settings.currencySymbol, settings.currencyPosition)}
            </span>
          </div>

          <div className={`p-3.5 rounded-xl border ${t.cardSubtleBg}`}>
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${t.textMuted}`}>
              All-Time Purchases
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-rose-400">
              {formatCurrency(totalPurchasesAmount, settings.currencySymbol, settings.currencyPosition)}
            </span>
          </div>

          <div className={`p-3.5 rounded-xl border ${t.cardSubtleBg}`}>
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${t.textMuted}`}>
              Total Transactions
            </span>
            <span className="font-mono text-base sm:text-lg font-bold text-slate-200">
              {purchaseRecords.length} Bills
            </span>
          </div>
        </div>

        {/* FILTERS & SEARCH BAR */}
        <div className={`pt-3 border-t flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between text-xs ${
          themeMode === 'dark' ? 'border-slate-700/50' : 'border-gray-200'
        }`}>
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by item, supplier, invoice #, staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-7 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
          >
            <option value="all">All Categories</option>
            {configuredVehicleCategories.length > 0 && (
              <optgroup label="Vehicle Types & Fleet">
                {configuredVehicleCategories.map((c) => (
                  <option key={c.id} value={c.name}>{c.displayName}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Operational Expenses">
              {PURCHASE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </optgroup>
          </select>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="qr_transfer">QR / LankaQR</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono border ${t.inputBg}`}
              placeholder="From"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono border ${t.inputBg}`}
              placeholder="To"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => { setFromDate(''); setToDate(''); }}
                className="p-1 text-slate-400 hover:text-rose-400"
                title="Clear Dates"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PURCHASES TABLE (SORTABLE, DESCENDING BY DEFAULT) */}
      <div className={`${t.cardBg} rounded-2xl border shadow-xl overflow-hidden`}>
        <div className={`p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          themeMode === 'dark' ? 'border-slate-700/50' : 'border-gray-200'
        }`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${
              themeMode === 'dark' ? 'text-slate-300' : 'text-gray-800'
            }`}>
              Purchases Ledger ({sortedPurchases.length})
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Total Purchases: {formatCurrency(totalPurchasesAmount, settings.currencySymbol, settings.currencyPosition)}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
              Descending by Default
            </span>
          </div>

          <span className={`text-xs ${themeMode === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            Page {safePage} of {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`border-b font-bold uppercase text-[11px] ${
              themeMode === 'dark' ? 'bg-slate-900/70 border-slate-700/60 text-slate-300' : 'bg-gray-100 border-gray-200 text-gray-700'
            }`}>
              <tr>
                <th
                  onClick={() => handleSort('date')}
                  className={`py-3 px-3.5 cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-200'}`}
                  title="Sort by Date (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    {sortField === 'date' ? (
                      sortDir === 'asc' ? (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownAZ className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">A-Z</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownZA className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">Z-A</span>
                        </div>
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('reference')}
                  className={`py-3 px-3.5 cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-200'}`}
                  title="Sort by Invoice / Ref # (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Invoice / Ref #</span>
                    {sortField === 'reference' ? (
                      sortDir === 'asc' ? (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownAZ className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">A-Z</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownZA className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">Z-A</span>
                        </div>
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('itemName')}
                  className={`py-3 px-3.5 cursor-pointer transition select-none ${themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-200'}`}
                  title="Sort by Item Description (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Item & Details</span>
                    {sortField === 'itemName' ? (
                      sortDir === 'asc' ? (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownAZ className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">A-Z</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownZA className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">Z-A</span>
                        </div>
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className={`py-3 px-3.5 cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-200'}`}
                  title="Sort by Category (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    {sortField === 'category' ? (
                      sortDir === 'asc' ? (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownAZ className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">A-Z</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownZA className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">Z-A</span>
                        </div>
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('supplier')}
                  className={`py-3 px-3.5 cursor-pointer transition select-none ${themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-200'}`}
                  title="Sort by Supplier / Vendor (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Supplier / Vendor</span>
                    {sortField === 'supplier' ? (
                      sortDir === 'asc' ? (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownAZ className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">A-Z</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownZA className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">Z-A</span>
                        </div>
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('amount')}
                  className={`py-3 px-3.5 text-right cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-200'}`}
                  title="Sort by Amount (Low to High / High to Low)"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Amount</span>
                    {sortField === 'amount' ? (
                      sortDir === 'asc' ? (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDown01 className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">Low-High</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDown10 className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">High-Low</span>
                        </div>
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('paymentMethod')}
                  className={`py-3 px-3.5 text-center cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-200'}`}
                  title="Sort by Payment Method (A-Z / Z-A)"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Method</span>
                    {sortField === 'paymentMethod' ? (
                      sortDir === 'asc' ? (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownAZ className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">A-Z</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownZA className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">Z-A</span>
                        </div>
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('purchasedBy')}
                  className={`py-3 px-3.5 cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:bg-slate-800/60' : 'hover:bg-slate-200'}`}
                  title="Sort by Staff (A-Z / Z-A)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Staff</span>
                    {sortField === 'purchasedBy' ? (
                      sortDir === 'asc' ? (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownAZ className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">A-Z</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                          <ArrowDownZA className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-mono">Z-A</span>
                        </div>
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${themeMode === 'dark' ? 'divide-slate-700/30' : 'divide-gray-200'}`}>
              {pagedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className={`py-12 text-center italic ${themeMode === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                    No purchase transactions found matching the current filters. Click "+ Record Purchase" to add one.
                  </td>
                </tr>
              ) : (
                pagedPurchases.map((r) => (
                  <tr key={r.id} className={`transition ${themeMode === 'dark' ? 'hover:bg-slate-800/30' : 'hover:bg-gray-50'}`}>
                    <td className={`py-3 px-3.5 font-mono whitespace-nowrap ${
                      themeMode === 'dark' ? 'text-slate-300' : 'text-gray-800'
                    }`}>
                      {r.date}
                    </td>
                    <td className={`py-3 px-3.5 font-mono font-bold whitespace-nowrap ${
                      themeMode === 'dark' ? 'text-amber-400' : 'text-amber-700'
                    }`}>
                      {r.reference}
                    </td>
                    <td className={`py-3 px-3.5 font-medium ${
                      themeMode === 'dark' ? 'text-slate-200' : 'text-gray-900'
                    }`}>
                      <div className="font-semibold">{r.itemName}</div>
                      {r.assignedSerials && r.assignedSerials.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {r.assignedSerials.map((s) => (
                            <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                              SN: {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        {r.category}
                      </span>
                    </td>
                    <td className={`py-3 px-3.5 ${themeMode === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>
                      {r.supplierName}
                    </td>
                    <td className={`py-3 px-3.5 font-mono font-bold text-right whitespace-nowrap ${
                      themeMode === 'dark' ? 'text-rose-400' : 'text-rose-700 font-bold'
                    }`}>
                      {formatCurrency(r.totalAmount, settings.currencySymbol, settings.currencyPosition)}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <span className={`capitalize px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        themeMode === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-gray-100 text-gray-800 border-gray-300'
                      }`}>
                        {r.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`py-3 px-3.5 whitespace-nowrap ${
                      themeMode === 'dark' ? 'text-slate-400' : 'text-gray-600'
                    }`}>
                      {r.purchasedBy}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingPurchase(r)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                            themeMode === 'dark'
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
                          }`}
                          title="View Purchase Voucher"
                        >
                          Voucher
                        </button>
                        {isAdmin && onUpdateEntry && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(r)}
                            className={`p-1 rounded-lg transition ${
                              themeMode === 'dark' ? 'text-slate-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title="Edit Purchase Record (Admin Only)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdmin && onDeleteEntry && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete purchase "${r.reference} - ${r.itemName}"? This will update financial records.`)) {
                                onDeleteEntry(r.id);
                              }
                            }}
                            className={`p-1 rounded-lg transition ${
                              themeMode === 'dark' ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-gray-500 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="Delete Purchase Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {sortedPurchases.length > PAGE_SIZE && (
          <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            themeMode === 'dark' ? 'border-slate-700/50 text-slate-400 bg-slate-900/40' : 'border-gray-200 text-gray-600 bg-gray-50'
          }`}>
            <div>
              Showing {(safePage - 1) * PAGE_SIZE + 1} to {Math.min(safePage * PAGE_SIZE, sortedPurchases.length)} of {sortedPurchases.length} purchases (20 per page)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition ${
                  themeMode === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-gray-300 hover:bg-gray-200 text-gray-700 bg-white'
                }`}
              >
                Previous
              </button>
              <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold ${
                themeMode === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-gray-200 text-gray-800'
              }`}>
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition ${
                  themeMode === 'dark' ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-gray-300 hover:bg-gray-200 text-gray-700 bg-white'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECORD PURCHASE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`${t.modalBg} rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-700/60 flex flex-col max-h-[92vh]`}>
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b ${t.divider} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${t.textHeading}`}>
                    Record New Purchase
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    Saves to Bicycle POS financial records and updates Statement of Accounts & P&L.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePurchase} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Purchase Date: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border ${t.inputBg}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Invoice / Bill Ref #: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PUR-00142"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono font-bold border ${t.inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Item Description: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 26-inch Bicycle Tires (x10) or Shimano Shifter Sets"
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Purchase Category / Asset Type: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
                  >
                    {configuredVehicleCategories.length > 0 && (
                      <optgroup label="Vehicle Types & Fleet (Auto-creates Serial Numbers)">
                        {configuredVehicleCategories.map((c) => (
                          <option key={c.id} value={c.displayName}>
                            {c.displayName}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="General & Operational Expenses">
                      {PURCHASE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Supplier / Vendor Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Colombo Cycle Hub, Mannar Auto"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
                  />
                </div>
              </div>

              {/* Quantity, Unit Price & Total Cost */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${themeMode === 'dark' ? 'border-slate-700/60 bg-slate-900/40' : 'border-amber-200 bg-amber-50/40'}`}>
                <span className={`text-xs font-bold uppercase tracking-wider block ${themeMode === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                  Amount & Cost Breakdown
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${t.textHeading}`}>
                      Quantity:
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={formQty}
                      onChange={(e) => handleQtyChange(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono border ${t.inputBg}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${t.textHeading}`}>
                      Unit Price:
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={formUnitPrice}
                      onChange={(e) => handleUnitPriceChange(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono border ${t.inputBg}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold mb-1 ${themeMode === 'dark' ? 'text-amber-300' : 'text-amber-700'}`}>
                      Total Amount: *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      placeholder="0.00"
                      value={formTotalAmount}
                      onChange={(e) => setFormTotalAmount(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border ${themeMode === 'dark' ? 'text-amber-400 border-amber-500/40 bg-slate-900' : 'text-amber-800 border-amber-300 bg-amber-50/80'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Fleet Inventory Units & Serial Assignment */}
              {formSelectedTypeId && (
                <div className={`p-3.5 rounded-xl border space-y-2.5 ${themeMode === 'dark' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-300 bg-emerald-50/50'}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formAddToInventory}
                        onChange={(e) => setFormAddToInventory(e.target.checked)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        <Boxes className="w-4 h-4" />
                        Add to Fleet Inventory & Auto-Assign Serials
                      </span>
                    </label>

                    {formAddToInventory && calculatedSerials.length > 0 && (
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold border ${themeMode === 'dark' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                        {calculatedSerials.length} unit(s)
                      </span>
                    )}
                  </div>

                  {formAddToInventory && calculatedSerials.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-emerald-500/20">
                      <p className={`text-[11px] ${themeMode === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Next applicable serial number(s) generated for <strong>{(vehicleTypes || []).find(t => t.id === formSelectedTypeId)?.name}</strong>:
                      </p>
                      <div className={`flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded-lg border ${themeMode === 'dark' ? 'bg-slate-950/60 border-emerald-500/20' : 'bg-white border-emerald-200 shadow-sm'}`}>
                        {calculatedSerials.map((serial) => (
                          <span
                            key={serial}
                            className={`px-2 py-1 rounded text-xs font-mono font-bold border ${themeMode === 'dark' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-emerald-50 text-emerald-800 border-emerald-300'}`}
                          >
                            SN: {serial}
                          </span>
                        ))}
                      </div>
                      <p className={`text-[10px] ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        These units will be automatically registered in <strong>Fleet Serial Numbers & Vehicle Units</strong> with status <em>Available</em> upon saving.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Payment Method: <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
                  >
                    <option value="cash">Cash in Counter</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="qr_transfer">LankaQR / QR Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Purchased / Entered By:
                  </label>
                  <input
                    type="text"
                    value={formPurchasedBy}
                    onChange={(e) => setFormPurchasedBy(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-medium border ${t.inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Remarks / Notes (Optional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional invoice notes, warranty details, contact person..."
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border ${t.inputBg}`}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${t.inactiveTab}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 ${t.primaryBtn}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Purchase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PURCHASE VOUCHER MODAL */}
      {viewingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="border-b pb-3 text-center">
              <h3 className="font-black text-lg text-slate-900 tracking-tight uppercase">
                {settings.businessName || 'Cycly Rent'}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Official Purchase Voucher
              </p>
              <span className="inline-block mt-1 font-mono text-xs font-bold text-amber-700">
                Ref: {viewingPurchase.reference}
              </span>
            </div>

            <div className="space-y-2 text-xs border-b pb-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Date:</span>
                <span className="font-mono font-bold">{viewingPurchase.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Supplier:</span>
                <span className="font-bold">{viewingPurchase.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Category:</span>
                <span className="font-medium">{viewingPurchase.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Payment Method:</span>
                <span className="capitalize font-bold">{viewingPurchase.paymentMethod.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Staff:</span>
                <span className="font-medium">{viewingPurchase.purchasedBy}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 block uppercase">
                Item Description
              </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {viewingPurchase.itemName}
              </p>
            </div>

            {viewingPurchase.assignedSerials && viewingPurchase.assignedSerials.length > 0 && (
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-800 block uppercase flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5" />
                  Assigned Fleet Serial Numbers ({viewingPurchase.assignedSerials.length} units)
                </span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {viewingPurchase.assignedSerials.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-white text-emerald-800 border border-emerald-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-black border-t-2 border-slate-900 pt-2">
              <span>TOTAL EXPENDITURE:</span>
              <span className="font-mono text-base text-rose-600">
                {formatCurrency(viewingPurchase.totalAmount, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingPurchase(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-800 hover:bg-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PURCHASE MODAL (Admin Only) */}
      {editingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`${t.modalBg} rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-700/60 flex flex-col max-h-[92vh]`}>
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b ${t.divider} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-500 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${t.textHeading}`}>
                    Edit Purchase Record ({editingPurchase.reference})
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    Update purchase details and sync financial entries immediately.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPurchase(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Purchase Date: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className={`w-full h-10 rounded-xl px-3 text-xs font-mono font-medium ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Item Name / Description: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editItemName}
                    onChange={(e) => setEditItemName(e.target.value)}
                    className={`w-full h-10 rounded-xl px-3 text-xs font-medium ${t.textInput}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Category:
                  </label>
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className={`w-full h-10 rounded-xl px-3 text-xs font-medium ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Supplier / Vendor Name:
                  </label>
                  <input
                    type="text"
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    className={`w-full h-10 rounded-xl px-3 text-xs font-medium ${t.textInput}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Total Amount ({settings.currencySymbol}): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className={`w-full h-10 rounded-xl px-3 text-xs font-mono font-bold ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Payment Method:
                  </label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value as any)}
                    className={`w-full h-10 rounded-xl px-3 text-xs font-semibold ${t.dropdownInput}`}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card / POS</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="qr_transfer">QR / LankaQR</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Notes / Remarks:
                </label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className={`w-full rounded-xl p-3 text-xs ${t.textInput}`}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-700/40">
                <button
                  type="button"
                  onClick={() => setEditingPurchase(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${t.inactiveTab}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
