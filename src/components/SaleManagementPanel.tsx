import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  X, 
  Calendar, 
  DollarSign, 
  Tag, 
  User, 
  Phone, 
  CreditCard, 
  Trash2, 
  Receipt, 
  CheckCircle2, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowDown01,
  ArrowDown10,
  ArrowUpDown,
  Printer,
  FileSpreadsheet,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
  Percent,
  Sparkles,
  ShoppingBag,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Edit2,
} from 'lucide-react';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { AppSettings, Customer, IncomeEntry, SaleRecord, Vehicle, VehicleStatus, VehicleType } from '../types';
import { UserAccount } from '../utils/auth';
import { formatCurrency } from '../utils/pricing';
import { VehicleIcon } from './VehicleIcon';

interface SaleManagementPanelProps {
  entries: IncomeEntry[];
  settings: AppSettings;
  currentUser: UserAccount;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  customers?: Customer[];
  vehicleTypes?: VehicleType[];
  vehicles?: Vehicle[];
  onAddEntry: (entry: IncomeEntry) => Promise<void> | void;
  onUpdateEntry?: (entry: IncomeEntry) => Promise<void> | void;
  onDeleteEntry?: (id: string, entry?: IncomeEntry) => Promise<void> | void;
  onUpdateVehicles?: (vehicles: Vehicle[]) => Promise<void> | void;
  onNavigateTab?: (tab: any) => void;
}

const SALE_CATEGORIES = [
  'Bicycles & Rides',
  'Accessories & Helmets',
  'Spare Parts & Tires',
  'Merchandise & Apparel',
  'Refreshments & Snacks',
  'Services & Repairs',
  'Other Sale',
];

export const SaleManagementPanel: React.FC<SaleManagementPanelProps> = ({
  entries = [],
  settings,
  currentUser,
  themeMode = 'dark',
  accent = 'emerald',
  customers = [],
  vehicleTypes = [],
  vehicles = [],
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onUpdateVehicles,
  onNavigateTab,
}) => {
  const t = getThemeClasses(themeMode, accent);
  const isAdmin = currentUser.role === 'admin' || currentUser.email === 'absiraiva@gmail.com';

  const todayStr = new Date().toISOString().slice(0, 10);

  // Subtab navigation: Default to 'available' (Available for Sale & Direct Sale)
  const [subTab, setSubTab] = useState<'available' | 'history'>('available');

  // ==========================================
  // AVAILABLE INVENTORY FOR SALE STATE
  // ==========================================
  const [inventorySearch, setInventorySearch] = useState('');
  const [categoryFilterInventory, setCategoryFilterInventory] = useState('all');
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set());

  // Sorting for Available Inventory Table (Default descending order)
  type AvailSortField = 'serialNumber' | 'model' | 'category' | 'purchaseRef' | 'purchaseValue' | 'autoSalePrice' | 'status';
  const [availSortField, setAvailSortField] = useState<AvailSortField>('serialNumber');
  const [availSortDir, setAvailSortDir] = useState<'asc' | 'desc'>('desc');

  const handleAvailSort = (field: AvailSortField) => {
    if (availSortField === field) {
      setAvailSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setAvailSortField(field);
      setAvailSortDir(field === 'purchaseValue' || field === 'autoSalePrice' ? 'desc' : 'asc');
    }
    setAvailCurrentPage(1);
  };

  // Direct Sale Checkout Form State
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [saleDate, setSaleDate] = useState(todayStr);
  const [saleReference, setSaleReference] = useState(`SAL-${Date.now().toString().slice(-6)}`);
  const [salePaymentMethod, setSalePaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'qr_transfer' | 'other'>('cash');
  const [saleCashierName, setSaleCashierName] = useState(currentUser.name || 'Cashier');
  const [saleRemarks, setSaleRemarks] = useState('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);

  // ==========================================
  // SALES LEDGER & INVOICES STATE
  // ==========================================
  const [searchTermHistory, setSearchTermHistory] = useState('');
  const [categoryFilterHistory, setCategoryFilterHistory] = useState('all');
  const [methodFilterHistory, setMethodFilterHistory] = useState('all');
  const [fromDateHistory, setFromDateHistory] = useState('');
  const [toDateHistory, setToDateHistory] = useState('');

  // Sorting state — Default descending order by date / createdAt (Requirement 1)
  type SortField = 'date' | 'reference' | 'itemName' | 'category' | 'customer' | 'amount' | 'paymentMethod' | 'cashier';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Pagination for Sales Ledger (20 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Receipt / Audit View Modal state
  const [viewingSale, setViewingSale] = useState<SaleRecord | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ==========================================
  // AVAILABLE INVENTORY LOGIC
  // ==========================================
  // Filter all vehicles that are currently available for sale
  const availableInventory = useMemo(() => {
    return vehicles
      .filter((v) => v.status === 'available')
      .map((v) => {
        const typeObj = vehicleTypes.find((t) => t.id === v.typeId);
        // Cost: use v.costPrice if present, fallback to type base rate
        const purchaseValue = (v.costPrice !== undefined && v.costPrice > 0)
          ? v.costPrice
          : (typeObj?.rates?.firstHour || 0);
        
        // Auto calculate Sale Price = Purchase Value + 20%
        const markup20 = Math.round(purchaseValue * 0.20 * 100) / 100;
        const autoSalePrice = Math.round((purchaseValue + markup20) * 100) / 100;

        return {
          vehicle: v,
          typeObj,
          categoryName: typeObj?.name || 'General Inventory',
          purpose: typeObj?.purpose || 'sale',
          purchaseValue,
          markup20,
          autoSalePrice,
        };
      })
      .sort((a, b) => {
        // Descending order by default (newest/highest serial number first)
        const serialComp = b.vehicle.serialNumber.localeCompare(a.vehicle.serialNumber, undefined, { numeric: true, sensitivity: 'base' });
        if (serialComp !== 0) return serialComp;
        return (b.vehicle.lastRentedAt || 0) - (a.vehicle.lastRentedAt || 0);
      });
  }, [vehicles, vehicleTypes]);

  // Global search across all fields of the available inventory table
  const filteredAvailableInventory = useMemo(() => {
    return availableInventory.filter((item) => {
      if (categoryFilterInventory !== 'all' && item.typeObj?.id !== categoryFilterInventory) {
        return false;
      }
      if (!inventorySearch.trim()) return true;

      const q = inventorySearch.trim().toLowerCase();
      const matchSerial = item.vehicle.serialNumber.toLowerCase().includes(q);
      const matchModel = (item.vehicle.modelName || '').toLowerCase().includes(q);
      const matchCategory = item.categoryName.toLowerCase().includes(q);
      const matchPurchaseRef = (item.vehicle.purchaseRef || '').toLowerCase().includes(q);
      const matchNotes = (item.vehicle.notes || '').toLowerCase().includes(q);
      const matchCost = item.purchaseValue.toString().includes(q);
      const matchSalePrice = item.autoSalePrice.toString().includes(q);

      return (
        matchSerial ||
        matchModel ||
        matchCategory ||
        matchPurchaseRef ||
        matchNotes ||
        matchCost ||
        matchSalePrice
      );
    });
  }, [availableInventory, categoryFilterInventory, inventorySearch]);

  // Sorted available inventory with universal A-Z / Z-A column sorting
  const sortedAvailableInventory = useMemo(() => {
    const list = [...filteredAvailableInventory];
    list.sort((a, b) => {
      let comparison = 0;
      switch (availSortField) {
        case 'serialNumber':
          comparison = a.vehicle.serialNumber.localeCompare(b.vehicle.serialNumber, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'model':
          comparison = (a.vehicle.modelName || '').localeCompare(b.vehicle.modelName || '');
          break;
        case 'category':
          comparison = a.categoryName.localeCompare(b.categoryName);
          break;
        case 'purchaseRef':
          comparison = (a.vehicle.purchaseRef || '').localeCompare(b.vehicle.purchaseRef || '');
          break;
        case 'purchaseValue':
          comparison = a.purchaseValue - b.purchaseValue;
          break;
        case 'autoSalePrice':
          comparison = a.autoSalePrice - b.autoSalePrice;
          break;
        case 'status':
          comparison = a.vehicle.status.localeCompare(b.vehicle.status);
          break;
      }
      return availSortDir === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredAvailableInventory, availSortField, availSortDir]);

  // Pagination for Available Inventory (Max 20 rows per page)
  const AVAIL_PAGE_SIZE = 20;
  const [availCurrentPage, setAvailCurrentPage] = useState(1);
  const totalAvailPages = Math.max(1, Math.ceil(sortedAvailableInventory.length / AVAIL_PAGE_SIZE));
  const safeAvailPage = Math.min(availCurrentPage, totalAvailPages);
  const pagedAvailableInventory = sortedAvailableInventory.slice((safeAvailPage - 1) * AVAIL_PAGE_SIZE, safeAvailPage * AVAIL_PAGE_SIZE);

  // Selected items objects
  const selectedItems = useMemo(() => {
    return availableInventory.filter((item) => selectedVehicleIds.has(item.vehicle.id));
  }, [availableInventory, selectedVehicleIds]);

  // Toggle selection for a single vehicle
  const toggleSelectVehicle = (id: string) => {
    setSelectedVehicleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle selection for all visible filtered vehicles
  const toggleSelectAllFiltered = () => {
    const allFilteredSelected = filteredAvailableInventory.length > 0 && 
      filteredAvailableInventory.every((item) => selectedVehicleIds.has(item.vehicle.id));

    setSelectedVehicleIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredAvailableInventory.forEach((item) => next.delete(item.vehicle.id));
      } else {
        filteredAvailableInventory.forEach((item) => next.add(item.vehicle.id));
      }
      return next;
    });
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedVehicleIds(new Set());
  };

  // ==========================================
  // CUSTOMER LOOKUP & VALIDATION
  // ==========================================
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const matchingCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) {
      return customers.slice(0, 10);
    }
    const q = customerSearchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      const matchName = (c.name || '').toLowerCase().includes(q) || (c.fullName || '').toLowerCase().includes(q);
      const matchNic = (c.nicPassport || '').toLowerCase().includes(q);
      const matchPhone = (c.phone || '').toLowerCase().includes(q) || (c.whatsappNumber || '').toLowerCase().includes(q);
      return matchName || matchNic || matchPhone;
    });
  }, [customers, customerSearchQuery]);

  // Does the search term yield any matching customer?
  const hasCustomerMatches = matchingCustomers.length > 0;

  // ==========================================
  // AUTOMATIC PRICING & REVENUE CALCULATIONS
  // Requirement:
  // Sale Price = Purchase Value + 20%
  // User enters Discount Amount
  // Store Purchase Value, 20% markup, Sale Price, Discount Amount, and Final Sale Amount
  // Only Final Sale Amount after discount posted as sales revenue
  // ==========================================
  const totalPurchaseValue = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.purchaseValue, 0);
  }, [selectedItems]);

  const markupAmount = useMemo(() => {
    return Math.round(totalPurchaseValue * 0.20 * 100) / 100;
  }, [totalPurchaseValue]);

  const calculatedSalePrice = useMemo(() => {
    return Math.round((totalPurchaseValue + markupAmount) * 100) / 100;
  }, [totalPurchaseValue, markupAmount]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0) return 0;
    return Math.round(val * 100) / 100;
  }, [discountInput]);

  const finalSaleAmount = useMemo(() => {
    return Math.max(0, Math.round((calculatedSalePrice - discountAmount) * 100) / 100);
  }, [calculatedSalePrice, discountAmount]);

  // ==========================================
  // SUBMIT DIRECT SALE HANDLER
  // ==========================================
  const handleCompleteDirectSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    // 1. Validate Item Selection
    if (selectedItems.length === 0) {
      setCheckoutError('Please select at least one available inventory item to sell.');
      return;
    }

    // 2. Validate Customer Selection (Strict Requirement)
    if (!selectedCustomer) {
      setCheckoutError('Add the customer details in Customer.');
      return;
    }

    // 3. Validate Discount & Final Sale Amount
    if (discountAmount > calculatedSalePrice) {
      setCheckoutError(`Discount cannot exceed the calculated sale price (${formatCurrency(calculatedSalePrice, settings.currencySymbol, settings.currencyPosition)}).`);
      return;
    }

    if (finalSaleAmount <= 0 && calculatedSalePrice > 0) {
      if (!window.confirm('The final sale amount after discount is 0.00. Do you want to proceed with this 100% discounted sale?')) {
        return;
      }
    }

    setIsSubmittingSale(true);

    try {
      const soldSerials = selectedItems.map((item) => item.vehicle.serialNumber);
      const itemsSummary = selectedItems
        .map((item) => `${item.vehicle.modelName || item.categoryName} (${item.vehicle.serialNumber})`)
        .join(', ');
      
      const primaryCategory = selectedItems[0]?.categoryName || 'Bicycles & Rides';

      // Full verification / audit string to store in IncomeEntry remarks
      const auditPayload = [
        `Customer: ${selectedCustomer.name} (NIC: ${selectedCustomer.nicPassport || 'N/A'})`,
        `Phone: ${selectedCustomer.phone || selectedCustomer.whatsappNumber || 'N/A'}`,
        `Serials: ${soldSerials.join(', ')}`,
        `Audit: [Purchase Value: ${totalPurchaseValue} | Markup (20%): ${markupAmount} | Sale Price: ${calculatedSalePrice} | Discount: ${discountAmount} | Final Sale Amount: ${finalSaleAmount}]`,
        saleRemarks.trim() ? `Notes: ${saleRemarks.trim()}` : '',
      ].filter(Boolean).join(' | ');

      // Only the Final Sale Amount after discount is posted to financial accounts as sales revenue
      const newIncomeEntry: IncomeEntry = {
        id: `sale-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: saleDate,
        description: `[Sale] ${itemsSummary}`,
        type: 'income',
        amount: finalSaleAmount, // Strictly the Final Sale Amount after discount!
        category: `Sale: ${primaryCategory}`,
        reference: saleReference.trim() || `SAL-${Date.now().toString().slice(-6)}`,
        paymentMethod: salePaymentMethod,
        who: selectedCustomer.name,
        cashierName: saleCashierName.trim() || currentUser.name || 'Cashier',
        remarks: auditPayload,
        createdAt: Date.now(),
      };

      // 1. Post to Financial Accounts
      await onAddEntry(newIncomeEntry);

      // 2. Update Inventory Status of sold items so they are no longer available for sale
      if (onUpdateVehicles && vehicles.length > 0) {
        const soldIds = new Set(selectedItems.map((item) => item.vehicle.id));
        const updatedVehiclesList: Vehicle[] = vehicles.map((v) => {
          if (soldIds.has(v.id)) {
            const auditNote = `Sold to ${selectedCustomer.name} (Invoice: ${newIncomeEntry.reference}) on ${saleDate}`;
            return {
              ...v,
              status: 'sold' as VehicleStatus,
              notes: v.notes ? `${v.notes} | ${auditNote}` : auditNote,
            };
          }
          return v;
        });
        await onUpdateVehicles(updatedVehiclesList);
      }

      // 3. Construct SaleRecord for the Receipt Modal & Audit Trail
      const completedSaleRecord: SaleRecord = {
        id: newIncomeEntry.id,
        date: saleDate,
        reference: newIncomeEntry.reference || `SAL-${Date.now().toString().slice(-6)}`,
        itemName: itemsSummary,
        category: primaryCategory,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone || selectedCustomer.whatsappNumber || '',
        customerNicPassport: selectedCustomer.nicPassport,
        quantity: selectedItems.length,
        unitPrice: selectedItems.length > 0 ? (finalSaleAmount / selectedItems.length) : finalSaleAmount,
        purchaseValue: totalPurchaseValue,
        markupAmount: markupAmount,
        salePrice: calculatedSalePrice,
        discountAmount: discountAmount,
        finalSaleAmount: finalSaleAmount,
        totalAmount: finalSaleAmount,
        soldSerials: soldSerials,
        paymentMethod: salePaymentMethod,
        cashierName: newIncomeEntry.cashierName || currentUser.name || 'Cashier',
        remarks: saleRemarks.trim(),
        createdAt: Date.now(),
      };

      // Save audit record to persistent local cache
      try {
        const storedAuditStr = localStorage.getItem('v_direct_sales_audit');
        const auditList: SaleRecord[] = storedAuditStr ? JSON.parse(storedAuditStr) : [];
        auditList.unshift(completedSaleRecord);
        localStorage.setItem('v_direct_sales_audit', JSON.stringify(auditList.slice(0, 500)));
      } catch {}

      // Reset form & selections
      setSelectedVehicleIds(new Set());
      setSelectedCustomerId(null);
      setCustomerSearchQuery('');
      setDiscountInput('0');
      setSaleRemarks('');
      setSaleReference(`SAL-${Date.now().toString().slice(-6)}`);
      setSuccessMsg(`Direct Sale #${completedSaleRecord.reference} completed! Revenue of ${formatCurrency(finalSaleAmount, settings.currencySymbol, settings.currencyPosition)} recorded, and ${soldSerials.length} item(s) marked as Sold.`);
      
      // Open receipt viewer for instant review/printing
      setViewingSale(completedSaleRecord);
    } catch (err: any) {
      console.error('Failed to complete direct sale:', err);
      setCheckoutError(err.message || 'Failed to complete direct sale. Please try again.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  // ==========================================
  // SALES LEDGER / HISTORY DATA LOGIC
  // ==========================================
  const saleRecords: SaleRecord[] = useMemo(() => {
    // Also load audit records from local cache if available
    let auditMap: Record<string, Partial<SaleRecord>> = {};
    try {
      const storedAuditStr = localStorage.getItem('v_direct_sales_audit');
      if (storedAuditStr) {
        const list: SaleRecord[] = JSON.parse(storedAuditStr);
        list.forEach((item) => {
          if (item.id) auditMap[item.id] = item;
          if (item.reference) auditMap[item.reference] = item;
        });
      }
    } catch {}

    return entries
      .filter((e) => e.type === 'income' && (
        (e.category && e.category.toLowerCase().includes('sale')) ||
        (e.description && e.description.toLowerCase().includes('[sale]'))
      ))
      .map((e) => {
        const isPrefixed = e.description.startsWith('[Sale] ');
        const cleanItem = isPrefixed ? e.description.replace(/^\[Sale\]\s*/, '') : e.description;

        let customerName = e.who || 'Walk-in Customer';
        let customerPhone = '';
        let customerNic = '';
        let soldSerials: string[] = [];
        let purchaseValue: number | undefined;
        let markupAmount: number | undefined;
        let salePrice: number | undefined;
        let discountAmount: number | undefined;
        let finalSaleAmount: number | undefined;

        if (e.remarks) {
          const custMatch = e.remarks.match(/Customer:\s*([^|]+)/);
          if (custMatch) customerName = custMatch[1].trim();
          const phoneMatch = e.remarks.match(/Phone:\s*([^|]+)/);
          if (phoneMatch) customerPhone = phoneMatch[1].trim();
          const nicMatch = e.remarks.match(/NIC:\s*([^|]+)/);
          if (nicMatch) customerNic = nicMatch[1].trim();
          const serMatch = e.remarks.match(/Serials:\s*([^|]+)/);
          if (serMatch) soldSerials = serMatch[1].split(',').map((s) => s.trim()).filter(Boolean);

          const pvMatch = e.remarks.match(/Purchase Value:\s*([0-9.]+)/i);
          if (pvMatch) purchaseValue = parseFloat(pvMatch[1]);
          const mkMatch = e.remarks.match(/Markup \(20%\):\s*([0-9.]+)/i);
          if (mkMatch) markupAmount = parseFloat(mkMatch[1]);
          const spMatch = e.remarks.match(/Sale Price:\s*([0-9.]+)/i);
          if (spMatch) salePrice = parseFloat(spMatch[1]);
          const dcMatch = e.remarks.match(/Discount(?: Amount)?:\s*([0-9.]+)/i);
          if (dcMatch) discountAmount = parseFloat(dcMatch[1]);
          const fsMatch = e.remarks.match(/Final Sale Amount:\s*([0-9.]+)/i);
          if (fsMatch) finalSaleAmount = parseFloat(fsMatch[1]);
        }

        // Check if cached audit map has extra precision
        const cached = auditMap[e.id] || (e.reference ? auditMap[e.reference] : undefined);
        if (cached) {
          if (cached.purchaseValue !== undefined) purchaseValue = cached.purchaseValue;
          if (cached.markupAmount !== undefined) markupAmount = cached.markupAmount;
          if (cached.salePrice !== undefined) salePrice = cached.salePrice;
          if (cached.discountAmount !== undefined) discountAmount = cached.discountAmount;
          if (cached.finalSaleAmount !== undefined) finalSaleAmount = cached.finalSaleAmount;
          if (cached.soldSerials && cached.soldSerials.length > 0) soldSerials = cached.soldSerials;
          if (cached.customerNicPassport) customerNic = cached.customerNicPassport;
        }

        let qty = 1;
        const qtyMatch = e.description.match(/Qty:\s*([0-9.]+)/i);
        if (qtyMatch) {
          qty = parseFloat(qtyMatch[1]) || 1;
        } else if (soldSerials.length > 0) {
          qty = soldSerials.length;
        }

        return {
          id: e.id,
          date: e.date,
          reference: e.reference || `SAL-${e.id.slice(-6)}`,
          itemName: cleanItem,
          category: e.category?.replace(/^Sale:\s*/i, '') || 'General Sale',
          customerName,
          customerPhone,
          customerNicPassport: customerNic,
          quantity: qty,
          unitPrice: qty > 0 ? (e.amount / qty) : e.amount,
          purchaseValue,
          markupAmount,
          salePrice,
          discountAmount,
          finalSaleAmount: finalSaleAmount ?? e.amount,
          totalAmount: e.amount, // Net revenue recorded in financial accounts
          soldSerials,
          paymentMethod: (e.paymentMethod as any) || 'cash',
          cashierName: e.cashierName || e.who || 'Cashier',
          remarks: e.remarks || '',
          createdAt: e.createdAt || 0,
        };
      });
  }, [entries]);

  // Edit Sale Modal state (Admin only)
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [editSaleDate, setEditSaleDate] = useState('');
  const [editSaleCustomerName, setEditSaleCustomerName] = useState('');
  const [editSaleCustomerPhone, setEditSaleCustomerPhone] = useState('');
  const [editSaleItemName, setEditSaleItemName] = useState('');
  const [editSaleCategory, setEditSaleCategory] = useState('');
  const [editSaleAmount, setEditSaleAmount] = useState('');
  const [editSalePaymentMethod, setEditSalePaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'qr_transfer' | 'other'>('cash');
  const [editSaleRemarks, setEditSaleRemarks] = useState('');
  const [editSaleError, setEditSaleError] = useState<string | null>(null);

  const handleOpenEditSale = (sale: SaleRecord) => {
    setEditingSale(sale);
    setEditSaleDate(sale.date);
    setEditSaleCustomerName(sale.customerName);
    setEditSaleCustomerPhone(sale.customerPhone);
    setEditSaleItemName(sale.itemName);
    setEditSaleCategory(sale.category);
    setEditSaleAmount(String(sale.totalAmount));
    setEditSalePaymentMethod(sale.paymentMethod as any);
    setEditSaleRemarks(sale.remarks);
    setEditSaleError(null);
  };

  const handleSaveEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale || !onUpdateEntry) return;
    const numAmount = parseFloat(editSaleAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setEditSaleError('Please enter a valid positive sale amount.');
      return;
    }
    if (!editSaleItemName.trim()) {
      setEditSaleError('Please enter an item name.');
      return;
    }

    const updatedIncomeEntry: IncomeEntry = {
      id: editingSale.id,
      date: editSaleDate,
      type: 'income',
      category: `Sale: ${editSaleCategory.trim() || 'General Sale'}`,
      description: `[Sale] ${editSaleItemName.trim()}`,
      amount: numAmount,
      paymentMethod: editSalePaymentMethod,
      who: editSaleCustomerName.trim() || 'Walk-in Customer',
      cashierName: editingSale.soldBy,
      reference: editingSale.reference,
      remarks: `Customer: ${editSaleCustomerName.trim() || 'Walk-in'}${editSaleCustomerPhone.trim() ? ` | Phone: ${editSaleCustomerPhone.trim()}` : ''}${editingSale.soldSerials?.length ? ` | Serials: ${editingSale.soldSerials.join(', ')}` : ''}${editSaleRemarks.trim() ? ` | Notes: ${editSaleRemarks.trim()}` : ''}`,
      createdAt: editingSale.createdAt,
    };

    await onUpdateEntry(updatedIncomeEntry);
    setEditingSale(null);
  };

  // KPI Calculations
  const totalSalesCount = saleRecords.length;
  const totalSalesAmount = saleRecords.reduce((sum, r) => sum + r.totalAmount, 0);

  const currentMonthStr = todayStr.slice(0, 7);
  const thisMonthSalesAmount = saleRecords
    .filter((r) => r.date.startsWith(currentMonthStr))
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const todaySalesAmount = saleRecords
    .filter((r) => r.date === todayStr)
    .reduce((sum, r) => sum + r.totalAmount, 0);

  // Available Inventory KPIs
  const totalAvailableCount = availableInventory.length;
  const totalAvailablePurchaseValue = availableInventory.reduce((sum, i) => sum + i.purchaseValue, 0);
  const totalExpectedRevenue = availableInventory.reduce((sum, i) => sum + i.autoSalePrice, 0);

  const filteredAvailablePurchaseValue = useMemo(() => {
    return filteredAvailableInventory.reduce((sum, i) => sum + i.purchaseValue, 0);
  }, [filteredAvailableInventory]);

  const filteredExpectedRevenue = useMemo(() => {
    return filteredAvailableInventory.reduce((sum, i) => sum + i.autoSalePrice, 0);
  }, [filteredAvailableInventory]);

  // Filter Sales Ledger
  const filteredSales = useMemo(() => {
    return saleRecords.filter((r) => {
      if (categoryFilterHistory !== 'all' && r.category !== categoryFilterHistory) return false;
      if (methodFilterHistory !== 'all' && r.paymentMethod !== methodFilterHistory) return false;
      if (fromDateHistory && r.date < fromDateHistory) return false;
      if (toDateHistory && r.date > toDateHistory) return false;
      if (searchTermHistory.trim()) {
        const q = searchTermHistory.trim().toLowerCase();
        const matchItem = r.itemName.toLowerCase().includes(q);
        const matchRef = r.reference.toLowerCase().includes(q);
        const matchCustomer = (r.customerName || '').toLowerCase().includes(q);
        const matchPhone = (r.customerPhone || '').toLowerCase().includes(q);
        const matchNic = (r.customerNicPassport || '').toLowerCase().includes(q);
        const matchCashier = r.cashierName.toLowerCase().includes(q);
        const matchSerials = (r.soldSerials || []).some((s) => s.toLowerCase().includes(q));
        if (!matchItem && !matchRef && !matchCustomer && !matchPhone && !matchNic && !matchCashier && !matchSerials) {
          return false;
        }
      }
      return true;
    });
  }, [saleRecords, categoryFilterHistory, methodFilterHistory, fromDateHistory, toDateHistory, searchTermHistory]);

  const filteredSalesAmount = useMemo(() => {
    return filteredSales.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [filteredSales]);

  // Sort logic (Default descending by date / createdAt - Requirement 1)
  const sortedSales = useMemo(() => {
    const list = [...filteredSales];
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
        case 'customer':
          comparison = (a.customerName || '').localeCompare(b.customerName || '');
          break;
        case 'amount':
          comparison = a.totalAmount - b.totalAmount;
          break;
        case 'paymentMethod':
          comparison = a.paymentMethod.localeCompare(b.paymentMethod);
          break;
        case 'cashier':
          comparison = a.cashierName.localeCompare(b.cashierName);
          break;
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });
    return list;
  }, [filteredSales, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedSales.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedSales = sortedSales.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'amount' || field === 'date' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const handleDelete = async (id: string, ref: string) => {
    if (!onDeleteEntry) return;
    const raw = entries.find((e) => e.id === id);
    if (window.confirm(`Are you sure you want to delete sale transaction #${ref}? This will remove the revenue entry from financial accounts and P&L.`)) {
      try {
        await onDeleteEntry(id, raw);
        if (viewingSale?.id === id) setViewingSale(null);
      } catch (err: any) {
        alert(`Failed to delete sale: ${err.message}`);
      }
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Date', 
      'Reference', 
      'Item / Description', 
      'Category', 
      'Customer', 
      'NIC/Passport', 
      'Phone', 
      'Qty', 
      'Purchase Value', 
      'Markup (20%)', 
      'Sale Price', 
      'Discount', 
      'Final Sale Revenue', 
      'Sold Serials', 
      'Payment Method', 
      'Cashier', 
      'Remarks'
    ];
    const rows = sortedSales.map((r) => [
      r.date,
      r.reference,
      `"${r.itemName.replace(/"/g, '""')}"`,
      r.category,
      `"${(r.customerName || '').replace(/"/g, '""')}"`,
      `"${(r.customerNicPassport || '').replace(/"/g, '""')}"`,
      r.customerPhone || '',
      r.quantity,
      r.purchaseValue !== undefined ? r.purchaseValue : '',
      r.markupAmount !== undefined ? r.markupAmount : '',
      r.salePrice !== undefined ? r.salePrice : '',
      r.discountAmount !== undefined ? r.discountAmount : '',
      r.totalAmount,
      `"${(r.soldSerials || []).join('; ')}"`,
      r.paymentMethod,
      `"${r.cashierName.replace(/"/g, '""')}"`,
      `"${(r.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cycly_sales_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Subtab Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2.5">
            <TrendingUp className={`w-7 h-7 ${t.accentText}`} />
            Direct Sales & Revenue
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sell available inventory items with automatic 20% markup, audit tracking, and instant financial revenue posting.
          </p>
        </div>

        {/* Action Controls & Subtab Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${
            themeMode === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-100 border-gray-200'
          }`}>
            <button
              onClick={() => setSubTab('available')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                subTab === 'available'
                  ? `${t.accentBg} text-white shadow-sm`
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Available for Sale</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                subTab === 'available' ? 'bg-black/20 text-white' : 'bg-gray-700 text-gray-300'
              }`}>
                {totalAvailableCount}
              </span>
            </button>

            <button
              onClick={() => setSubTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                subTab === 'history'
                  ? `${t.accentBg} text-white shadow-sm`
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Sales Ledger</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                subTab === 'history' ? 'bg-black/20 text-white' : 'bg-gray-700 text-gray-300'
              }`}>
                {totalSalesCount}
              </span>
            </button>
          </div>

          {subTab === 'history' && (
            <button
              onClick={handleExportCSV}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-colors ${
                themeMode === 'dark' 
                  ? 'bg-gray-800/80 hover:bg-gray-700/80 border-gray-700 text-gray-300' 
                  : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700 shadow-sm'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available for Sale */}
        <div className={`p-4.5 rounded-2xl border transition-all ${
          themeMode === 'dark' ? 'bg-gray-800/60 border-gray-700/70' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Available for Sale</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-bold flex items-baseline gap-2">
            <span>{totalAvailableCount}</span>
            <span className="text-xs font-normal text-gray-400">units in stock</span>
          </div>
          <div className="text-xs text-emerald-500 font-medium mt-1">
            Cost: {formatCurrency(totalAvailablePurchaseValue, settings.currencySymbol, settings.currencyPosition)}
          </div>
        </div>

        {/* Card 2: Expected Inventory Value (+20%) */}
        <div className={`p-4.5 rounded-2xl border transition-all ${
          themeMode === 'dark' ? 'bg-gray-800/60 border-gray-700/70' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Potential Sale Value</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-bold">
            {formatCurrency(totalExpectedRevenue, settings.currencySymbol, settings.currencyPosition)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Includes auto +20% markup</div>
        </div>

        {/* Card 3: Today's Revenue */}
        <div className={`p-4.5 rounded-2xl border transition-all ${
          themeMode === 'dark' ? 'bg-gray-800/60 border-gray-700/70' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-bold">
            {formatCurrency(todaySalesAmount, settings.currencySymbol, settings.currencyPosition)}
          </div>
          <div className="text-xs text-gray-400 mt-1">Net revenue posted today</div>
        </div>

        {/* Card 4: All-time Direct Sales Revenue */}
        <div className={`p-4.5 rounded-2xl border transition-all ${
          themeMode === 'dark' ? 'bg-gray-800/60 border-gray-700/70' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Sales Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-bold">
            {formatCurrency(totalSalesAmount, settings.currencySymbol, settings.currencyPosition)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{totalSalesCount} completed sales recorded</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: AVAILABLE INVENTORY FOR SALE & DIRECT SALES CHECKOUT            */}
      {/* ========================================================================= */}
      {subTab === 'available' && (
        <div className="space-y-5">
          {/* Global Search and Filter Bar */}
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
            themeMode === 'dark' ? 'bg-gray-800/40 border-gray-700/60' : 'bg-gray-50/80 border-gray-200 shadow-sm'
          }`}>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Global Search: Enter any keyword, serial #, category, model name, purchase ref, or price..."
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border focus:outline-none transition-colors ${
                  themeMode === 'dark' 
                    ? 'bg-gray-900/70 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-emerald-500'
                }`}
              />
              {inventorySearch && (
                <button
                  onClick={() => setInventorySearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={categoryFilterInventory}
                  onChange={(e) => setCategoryFilterInventory(e.target.value)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border focus:outline-none ${
                    themeMode === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  <option value="all">All Available Categories ({availableInventory.length})</option>
                  {vehicleTypes
                    .filter((t) => availableInventory.some((i) => i.typeObj?.id === t.id))
                    .map((t) => {
                      const count = availableInventory.filter((i) => i.typeObj?.id === t.id).length;
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} ({count})
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Selection Controls */}
              {filteredAvailableInventory.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    themeMode === 'dark' 
                      ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200' 
                      : 'bg-white hover:bg-gray-100 border-gray-300 text-gray-700'
                  }`}
                >
                  {filteredAvailableInventory.every((i) => selectedVehicleIds.has(i.vehicle.id)) ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-gray-400" />
                      Select All Filtered
                    </>
                  )}
                </button>
              )}

              {selectedVehicleIds.size > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:underline font-medium"
                >
                  Clear Selection ({selectedVehicleIds.size})
                </button>
              )}
            </div>
          </div>

          {/* Main 2-Column POS Layout: Inventory Table + Checkout Drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Available Inventory Table (7 or 8 columns on desktop) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-3">
              {/* Total Available Inventory Value Summary Banner */}
              <div className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                themeMode === 'dark' ? 'bg-slate-900/60 border-slate-700/70' : 'bg-emerald-50/70 border-emerald-200'
              }`}>
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className={`text-[10px] block uppercase tracking-wider font-semibold ${
                      themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>Total Purchase Value</span>
                    <span className={`text-sm font-bold ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatCurrency(totalAvailablePurchaseValue, settings.currency)}
                    </span>
                    {filteredAvailableInventory.length !== availableInventory.length && (
                      <span className={`text-[10px] ml-1.5 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        (Filtered: <strong className={themeMode === 'dark' ? 'text-slate-200' : 'text-gray-800'}>{formatCurrency(filteredAvailablePurchaseValue, settings.currency)}</strong>)
                      </span>
                    )}
                  </div>
                  <div className="h-6 w-px bg-slate-700/60 hidden sm:block" />
                  <div>
                    <span className={`text-[10px] block uppercase tracking-wider font-semibold ${
                      themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>Expected Sale Value (+20%)</span>
                    <span className={`text-sm font-bold ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {formatCurrency(totalExpectedRevenue, settings.currency)}
                    </span>
                    {filteredAvailableInventory.length !== availableInventory.length && (
                      <span className={`text-[10px] ml-1.5 ${themeMode === 'dark' ? 'text-emerald-500/80' : 'text-emerald-700'}`}>
                        (Filtered: <strong>{formatCurrency(filteredExpectedRevenue, settings.currency)}</strong>)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                    themeMode === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-white border-emerald-300 text-emerald-800'
                  }`}>
                    {filteredAvailableInventory.length} of {availableInventory.length} units available
                  </span>
                  {selectedVehicleIds.size > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 animate-pulse">
                      {selectedVehicleIds.size} selected
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-emerald-400" />
                  Available Inventory Items ({filteredAvailableInventory.length})
                </span>
                {selectedVehicleIds.size > 0 && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    {selectedVehicleIds.size} item(s) selected for sale
                  </span>
                )}
              </div>

              <div className={`rounded-2xl border overflow-hidden ${
                themeMode === 'dark' ? 'bg-gray-800/40 border-gray-700/70' : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${
                        themeMode === 'dark' ? 'bg-gray-900/60 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}>
                        {/* Checkbox Header */}
                        <th className="px-3.5 py-3 w-10 text-center">
                          <input
                            type="checkbox"
                            aria-label="Select all visible inventory"
                            checked={
                              filteredAvailableInventory.length > 0 &&
                              filteredAvailableInventory.every((i) => selectedVehicleIds.has(i.vehicle.id))
                            }
                            onChange={toggleSelectAllFiltered}
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                          />
                        </th>
                        <th
                          onClick={() => handleAvailSort('serialNumber')}
                          className={`px-3 py-3 cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:text-white hover:bg-gray-800/60' : 'hover:text-gray-900 hover:bg-gray-100'}`}
                          title="Sort by Serial # (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Serial #</span>
                            {availSortField === 'serialNumber' ? (
                              availSortDir === 'asc' ? (
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
                          onClick={() => handleAvailSort('model')}
                          className={`px-3 py-3 cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:text-white hover:bg-gray-800/60' : 'hover:text-gray-900 hover:bg-gray-100'}`}
                          title="Sort by Item / Model (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Item / Model</span>
                            {availSortField === 'model' ? (
                              availSortDir === 'asc' ? (
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
                          onClick={() => handleAvailSort('category')}
                          className={`px-3 py-3 cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:text-white hover:bg-gray-800/60' : 'hover:text-gray-900 hover:bg-gray-100'}`}
                          title="Sort by Category (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Category</span>
                            {availSortField === 'category' ? (
                              availSortDir === 'asc' ? (
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
                          onClick={() => handleAvailSort('purchaseRef')}
                          className={`px-3 py-3 cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:text-white hover:bg-gray-800/60' : 'hover:text-gray-900 hover:bg-gray-100'}`}
                          title="Sort by Purchase Ref (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Purchase Ref</span>
                            {availSortField === 'purchaseRef' ? (
                              availSortDir === 'asc' ? (
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
                          onClick={() => handleAvailSort('purchaseValue')}
                          className={`px-3 py-3 text-right cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:text-white hover:bg-gray-800/60' : 'hover:text-gray-900 hover:bg-gray-100'}`}
                          title="Sort by Purchase Value (Low-High / High-Low)"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Purchase Value</span>
                            {availSortField === 'purchaseValue' ? (
                              availSortDir === 'asc' ? (
                                <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                                  <ArrowDown01 className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-mono">Low</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                                  <ArrowDown10 className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-mono">High</span>
                                </div>
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleAvailSort('autoSalePrice')}
                          className={`px-3 py-3 text-right cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:text-white hover:bg-gray-800/60' : 'hover:text-gray-900 hover:bg-gray-100'}`}
                          title="Sort by Sale Price (Low-High / High-Low)"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={`inline-flex items-center gap-1 ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              Sale Price (+20%)
                            </span>
                            {availSortField === 'autoSalePrice' ? (
                              availSortDir === 'asc' ? (
                                <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                                  <ArrowDown01 className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-mono">Low</span>
                                </div>
                              ) : (
                                <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                                  <ArrowDown10 className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-mono">High</span>
                                </div>
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleAvailSort('status')}
                          className={`px-3 py-3 text-center cursor-pointer transition whitespace-nowrap select-none ${themeMode === 'dark' ? 'hover:text-white hover:bg-gray-800/60' : 'hover:text-gray-900 hover:bg-gray-100'}`}
                          title="Sort by Status (A-Z / Z-A)"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Status</span>
                            {availSortField === 'status' ? (
                              availSortDir === 'asc' ? (
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
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${themeMode === 'dark' ? 'divide-gray-700/40' : 'divide-gray-200'}`}>
                      {pagedAvailableInventory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className={`px-6 py-14 text-center ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="font-semibold text-base">No available inventory items found</p>
                            <p className={`text-xs mt-1 max-w-md mx-auto ${themeMode === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                              {inventorySearch
                                ? `No inventory matches "${inventorySearch}". Try resetting your search keywords.`
                                : 'All inventory items are currently rented or marked as sold. Purchase new stock in the Purchase tab to add items.'}
                            </p>
                            {inventorySearch && (
                              <button
                                onClick={() => { setInventorySearch(''); setAvailCurrentPage(1); }}
                                className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-medium ${
                                  themeMode === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                }`}
                              >
                                Reset Search
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        pagedAvailableInventory.map((item) => {
                          const isSelected = selectedVehicleIds.has(item.vehicle.id);
                          return (
                            <tr
                              key={item.vehicle.id}
                              onClick={() => toggleSelectVehicle(item.vehicle.id)}
                              className={`transition-colors cursor-pointer select-none ${
                                isSelected
                                  ? themeMode === 'dark'
                                    ? 'bg-emerald-500/15 border-l-4 border-l-emerald-500 text-white'
                                    : 'bg-emerald-50 border-l-4 border-l-emerald-500'
                                  : themeMode === 'dark'
                                  ? 'hover:bg-gray-700/30'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              {/* Checkbox */}
                              <td 
                                className="px-3.5 py-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectVehicle(item.vehicle.id)}
                                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                                />
                              </td>

                              {/* Serial Number with Icon */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${
                                    themeMode === 'dark' ? 'bg-gray-800 text-emerald-400' : 'bg-gray-100 text-emerald-700'
                                  }`}>
                                    <VehicleIcon type={item.typeObj?.icon || 'disc'} className="w-4 h-4" />
                                  </div>
                                  <span className={`font-mono text-xs font-bold ${
                                    themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-800'
                                  }`}>
                                    {item.vehicle.serialNumber}
                                  </span>
                                </div>
                              </td>

                              {/* Item / Model Name */}
                              <td className="px-3 py-3 font-medium max-w-xs">
                                <div className={`truncate font-semibold ${themeMode === 'dark' ? 'text-gray-100' : 'text-gray-900'}`} title={item.vehicle.modelName || item.categoryName}>
                                  {item.vehicle.modelName || item.categoryName}
                                </div>
                                {item.vehicle.notes && (
                                  <div className={`text-[11px] truncate max-w-xs ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} title={item.vehicle.notes}>
                                    {item.vehicle.notes}
                                  </div>
                                )}
                              </td>

                              {/* Category Name & Purpose Badge */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                  themeMode === 'dark' ? 'bg-gray-700/80 text-gray-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
                                }`}>
                                  {item.categoryName}
                                </span>
                              </td>

                              {/* Purchase Ref */}
                              <td className={`px-3 py-3 whitespace-nowrap font-mono text-xs ${
                                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-700 font-medium'
                              }`}>
                                {item.vehicle.purchaseRef || '—'}
                              </td>

                              {/* Purchase Value (Cost) */}
                              <td className={`px-3 py-3 whitespace-nowrap text-right text-xs font-mono font-medium ${
                                themeMode === 'dark' ? 'text-gray-300' : 'text-gray-900 font-bold'
                              }`}>
                                {formatCurrency(item.purchaseValue, settings.currencySymbol, settings.currencyPosition)}
                              </td>

                              {/* Calculated Sale Price (+20%) */}
                              <td className={`px-3 py-3 whitespace-nowrap text-right font-bold ${
                                themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                              }`}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <span>{formatCurrency(item.autoSalePrice, settings.currencySymbol, settings.currencyPosition)}</span>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                    themeMode === 'dark' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}>
                                    +20%
                                  </span>
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="px-3 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  themeMode === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  Available
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Available Inventory Pagination Footer (Max 20 rows per page) */}
                <div className={`p-3.5 border-t text-xs flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  themeMode === 'dark' ? 'border-gray-700/60 bg-gray-900/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}>
                  <span>
                    Showing {sortedAvailableInventory.length === 0 ? 0 : ((safeAvailPage - 1) * AVAIL_PAGE_SIZE) + 1} to {Math.min(safeAvailPage * AVAIL_PAGE_SIZE, sortedAvailableInventory.length)} of {sortedAvailableInventory.length} items (20 per page)
                  </span>
                  {totalAvailPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={safeAvailPage <= 1}
                        onClick={() => setAvailCurrentPage((p) => Math.max(1, p - 1))}
                        className={`px-3 py-1 rounded-lg border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition ${
                          themeMode === 'dark' ? 'border-gray-700 hover:bg-gray-800 text-gray-200' : 'border-gray-300 hover:bg-gray-200 text-gray-700 bg-white'
                        }`}
                      >
                        Previous
                      </button>
                      <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold ${
                        themeMode === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-800'
                      }`}>
                        {safeAvailPage} / {totalAvailPages}
                      </span>
                      <button
                        type="button"
                        disabled={safeAvailPage >= totalAvailPages}
                        onClick={() => setAvailCurrentPage((p) => Math.min(totalAvailPages, p + 1))}
                        className={`px-3 py-1 rounded-lg border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition ${
                          themeMode === 'dark' ? 'border-gray-700 hover:bg-gray-800 text-gray-200' : 'border-gray-300 hover:bg-gray-200 text-gray-700 bg-white'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Direct Sale Checkout & Price Breakdown (4 or 5 columns on desktop) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <div className={`p-5 rounded-2xl border shadow-xl sticky top-4 ${
                themeMode === 'dark' ? 'bg-gray-900/90 border-gray-700 text-white backdrop-blur' : 'bg-white border-gray-200 text-gray-900 shadow-md'
              }`}>
                
                {/* Header */}
                <div className="pb-3 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.accentBg} text-white`}>
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">Direct Sale Order</h3>
                      <p className="text-[11px] text-gray-400">Complete sale & dispatch revenue</p>
                    </div>
                  </div>
                  {selectedItems.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {selectedItems.length} Selected
                    </span>
                  )}
                </div>

                {/* Form Error Alert */}
                {checkoutError && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold">{checkoutError}</div>
                      {checkoutError.includes('Customer') && onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('customers')}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:underline"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Open Customer Directory
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleCompleteDirectSale} className="mt-4 space-y-4">
                  
                  {/* Selected Items Review */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center justify-between">
                      <span>Selected Inventory Items *</span>
                      {selectedItems.length > 0 && (
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="text-[11px] text-rose-400 hover:underline"
                        >
                          Clear all
                        </button>
                      )}
                    </label>

                    {selectedItems.length === 0 ? (
                      <div className={`p-4 rounded-xl border border-dashed text-center text-xs ${
                        themeMode === 'dark' ? 'border-gray-700 bg-gray-800/40 text-gray-400' : 'border-gray-300 bg-gray-50 text-gray-500'
                      }`}>
                        <Square className="w-5 h-5 mx-auto mb-1.5 text-gray-500" />
                        <p className="font-medium">No items selected yet</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Tick the checkboxes in the inventory table to select items for this sale.
                        </p>
                      </div>
                    ) : (
                      <div className={`max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl text-xs border ${
                        themeMode === 'dark' ? 'bg-gray-800/50 border-gray-700/60' : 'bg-gray-50 border-gray-200'
                      }`}>
                        {selectedItems.map((item) => (
                          <div 
                            key={item.vehicle.id} 
                            className={`flex items-center justify-between p-2 rounded-lg border ${
                              themeMode === 'dark' ? 'bg-gray-900/60 border-gray-700/40 text-gray-300' : 'bg-white border-gray-200 text-gray-800 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className={`font-mono font-bold ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>{item.vehicle.serialNumber}</span>
                              <span className={`truncate font-medium ${themeMode === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>{item.vehicle.modelName || item.categoryName}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`font-bold ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                {formatCurrency(item.autoSalePrice, settings.currencySymbol, settings.currencyPosition)}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleSelectVehicle(item.vehicle.id)}
                                className="text-gray-400 hover:text-rose-500 p-0.5"
                                title="Remove item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Selection (Strict Requirement) */}
                  <div className="relative">
                    <label className={`block text-xs font-semibold mb-1.5 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                      Select Customer from Customer Table *
                    </label>

                    {selectedCustomer ? (
                      /* Verified Customer Card */
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-1.5 font-bold text-sm ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            <UserCheck className="w-4 h-4" />
                            <span>{selectedCustomer.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(null);
                              setCustomerSearchQuery('');
                            }}
                            className={`text-[11px] underline ${themeMode === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                          >
                            Change
                          </button>
                        </div>
                        <div className={`flex items-center justify-between text-[11px] ${themeMode === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          <span>NIC/Passport: {selectedCustomer.nicPassport || 'N/A'}</span>
                          <span>Phone: {selectedCustomer.phone || selectedCustomer.whatsappNumber || 'N/A'}</span>
                        </div>
                        <div className={`text-[10px] font-semibold flex items-center gap-1 pt-1 ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Existing Customer</span>
                        </div>
                      </div>
                    ) : (
                      /* Customer Search Input */
                      <div className="space-y-1.5">
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={customerSearchQuery}
                            onFocus={() => setIsCustomerDropdownOpen(true)}
                            onChange={(e) => {
                              setCustomerSearchQuery(e.target.value);
                              setIsCustomerDropdownOpen(true);
                            }}
                            placeholder="Type customer name, NIC/Passport, phone..."
                            className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs border focus:outline-none ${
                              themeMode === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900 shadow-sm'
                            }`}
                          />
                          {customerSearchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomerSearchQuery('');
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* If Customer does NOT exist, show the mandatory prompt */}
                        {!hasCustomerMatches && customerSearchQuery.trim() !== '' && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs space-y-2">
                            <div className="flex items-center gap-1.5 font-bold">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span>Add the customer details in Customer.</span>
                            </div>
                            <p className="text-[11px] opacity-90">
                              No customer matching "{customerSearchQuery}" was found in the database.
                            </p>
                            {onNavigateTab && (
                              <button
                                type="button"
                                onClick={() => onNavigateTab('customers')}
                                className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-600 dark:text-amber-300 flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Go to Customer Directory to Add Customer
                              </button>
                            )}
                          </div>
                        )}

                        {/* Customer Autocomplete Dropdown */}
                        {isCustomerDropdownOpen && hasCustomerMatches && (
                          <div className={`absolute z-30 w-full mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl ${
                            themeMode === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                          }`}>
                            <div className="p-1.5 divide-y divide-gray-700/50">
                              {matchingCustomers.map((cust) => (
                                <div
                                  key={cust.id}
                                  onClick={() => {
                                    setSelectedCustomerId(cust.id);
                                    setIsCustomerDropdownOpen(false);
                                    setCustomerSearchQuery(cust.name);
                                    setCheckoutError(null);
                                  }}
                                  className={`p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                                    themeMode === 'dark' ? 'hover:bg-gray-700/70' : 'hover:bg-gray-100'
                                  }`}
                                >
                                  <div className="font-bold">{cust.name}</div>
                                  <div className={`text-[11px] flex items-center justify-between mt-0.5 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <span>NIC: {cust.nicPassport || 'N/A'}</span>
                                    <span>{cust.phone || cust.whatsappNumber || ''}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pricing Breakdown & Audit Calculations */}
                  <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
                    themeMode === 'dark' ? 'bg-gray-800/60 border-gray-700/70' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`flex items-center justify-between ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span>Purchase Value (Cost):</span>
                      <span className={`font-semibold ${themeMode === 'dark' ? 'text-gray-200' : 'text-gray-900 font-bold'}`}>
                        {formatCurrency(totalPurchaseValue, settings.currencySymbol, settings.currencyPosition)}
                      </span>
                    </div>

                    <div className={`flex items-center justify-between ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      <span className="flex items-center gap-1">
                        <span>20% Markup:</span>
                        <span className={`text-[10px] font-bold px-1 rounded border ${
                          themeMode === 'dark' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-800 bg-emerald-100 border-emerald-300'
                        }`}>
                          Auto
                        </span>
                      </span>
                      <span className={`font-bold ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        +{formatCurrency(markupAmount, settings.currencySymbol, settings.currencyPosition)}
                      </span>
                    </div>

                    <div className={`pt-2 border-t flex items-center justify-between font-semibold ${
                      themeMode === 'dark' ? 'border-gray-700/60' : 'border-gray-200'
                    }`}>
                      <span className={themeMode === 'dark' ? 'text-gray-300' : 'text-gray-800'}>Sale Price (Purchase + 20%):</span>
                      <span className={`text-sm font-bold ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {formatCurrency(calculatedSalePrice, settings.currencySymbol, settings.currencyPosition)}
                      </span>
                    </div>

                    {/* Discount Input */}
                    <div className={`pt-2 border-t ${themeMode === 'dark' ? 'border-gray-700/60' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className={`font-semibold flex items-center gap-1 ${
                          themeMode === 'dark' ? 'text-amber-400' : 'text-amber-700'
                        }`}>
                          <Percent className="w-3 h-3" />
                          <span>Discount Amount:</span>
                        </label>
                        <span className={`text-[10px] ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {calculatedSalePrice > 0 && discountAmount > 0 
                            ? `(${((discountAmount / calculatedSalePrice) * 100).toFixed(1)}% off)`
                            : 'Enter discount in LKR'}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">
                          {settings.currencySymbol}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={discountInput}
                          onChange={(e) => setDiscountInput(e.target.value)}
                          placeholder="0.00"
                          className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none ${
                            themeMode === 'dark' ? 'bg-gray-900 border-gray-700 text-amber-400 focus:border-amber-500' : 'bg-white border-gray-300 text-amber-700 focus:border-amber-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Final Sale Amount (Posted to Financial Accounts) */}
                    <div className={`pt-2.5 border-t flex items-center justify-between ${
                      themeMode === 'dark' ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <div>
                        <div className={`font-bold text-sm ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>Final Sale Amount:</div>
                        <div className={`text-[10px] italic ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Posted to financial revenue</div>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-extrabold ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          {formatCurrency(finalSaleAmount, settings.currencySymbol, settings.currencyPosition)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className={`block font-semibold mb-1 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Payment Method *</label>
                      <select
                        value={salePaymentMethod}
                        onChange={(e) => setSalePaymentMethod(e.target.value as any)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                          themeMode === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="qr_transfer">LankaQR</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block font-semibold mb-1 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Receipt / Invoice #</label>
                      <input
                        type="text"
                        value={saleReference}
                        onChange={(e) => setSaleReference(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                          themeMode === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Sale Date & Cashier */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className={`block font-semibold mb-1 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Sale Date *</label>
                      <input
                        type="date"
                        required
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                          themeMode === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block font-semibold mb-1 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Cashier / Staff</label>
                      <input
                        type="text"
                        value={saleCashierName}
                        onChange={(e) => setSaleCashierName(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                          themeMode === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Optional Remarks */}
                  <div>
                    <label className={`block font-semibold text-xs mb-1 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Remarks / Warranty Notes</label>
                    <input
                      type="text"
                      value={saleRemarks}
                      onChange={(e) => setSaleRemarks(e.target.value)}
                      placeholder="e.g. 6 months frame warranty, helmet included"
                      className={`w-full px-3 py-1.5 rounded-lg text-xs border focus:outline-none ${
                        themeMode === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingSale || selectedItems.length === 0 || !selectedCustomer}
                    className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white shadow-lg transition-all ${
                      selectedItems.length === 0 || !selectedCustomer
                        ? 'opacity-50 cursor-not-allowed bg-gray-700'
                        : `${t.accentBg} hover:opacity-95 active:scale-[0.99]`
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isSubmittingSale ? 'Processing Direct Sale...' : 'Complete Direct Sale & Post Revenue'}
                    </span>
                  </button>

                  {/* Bottom helper info */}
                  <div className="text-[11px] text-gray-400 text-center flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sold items will be automatically updated as Sold in Fleet Inventory.</span>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: COMPLETED SALES LEDGER & INVOICES (Requirement 1 Default Desc) */}
      {/* ========================================================================= */}
      {subTab === 'history' && (
        <div className="space-y-4">
          {/* Sales History Filter and Search Bar */}
          <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${
            themeMode === 'dark' ? 'bg-gray-800/40 border-gray-700/60' : 'bg-gray-50/80 border-gray-200 shadow-sm'
          }`}>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTermHistory}
                onChange={(e) => { setSearchTermHistory(e.target.value); setCurrentPage(1); }}
                placeholder="Search sale transaction, receipt #, customer name, serial #, NIC, phone..."
                className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm border focus:outline-none transition-colors ${
                  themeMode === 'dark' 
                    ? 'bg-gray-900/60 border-gray-700 text-white placeholder-gray-500 focus:border-emerald-500' 
                    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-emerald-500'
                }`}
              />
              {searchTermHistory && (
                <button
                  onClick={() => setSearchTermHistory('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={categoryFilterHistory}
                onChange={(e) => { setCategoryFilterHistory(e.target.value); setCurrentPage(1); }}
                className={`py-2 px-3 rounded-xl text-xs font-medium border focus:outline-none ${
                  themeMode === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <option value="all">All Categories</option>
                {SALE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Payment Method Filter */}
              <select
                value={methodFilterHistory}
                onChange={(e) => { setMethodFilterHistory(e.target.value); setCurrentPage(1); }}
                className={`py-2 px-3 rounded-xl text-xs font-medium border focus:outline-none ${
                  themeMode === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                <option value="all">All Payments</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="qr_transfer">LankaQR</option>
                <option value="other">Other</option>
              </select>

              {/* Date range filters */}
              <input
                type="date"
                value={fromDateHistory}
                onChange={(e) => { setFromDateHistory(e.target.value); setCurrentPage(1); }}
                aria-label="From date"
                className={`py-1.5 px-2.5 rounded-xl text-xs border focus:outline-none ${
                  themeMode === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
                }`}
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={toDateHistory}
                onChange={(e) => { setToDateHistory(e.target.value); setCurrentPage(1); }}
                aria-label="To date"
                className={`py-1.5 px-2.5 rounded-xl text-xs border focus:outline-none ${
                  themeMode === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'
                }`}
              />

              {(categoryFilterHistory !== 'all' || methodFilterHistory !== 'all' || fromDateHistory || toDateHistory || searchTermHistory) && (
                <button
                  onClick={() => {
                    setCategoryFilterHistory('all');
                    setMethodFilterHistory('all');
                    setFromDateHistory('');
                    setToDateHistory('');
                    setSearchTermHistory('');
                  }}
                  className="px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:underline font-medium"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Sales History Table — Default Descending Order (Requirement 1) */}
          <div className={`rounded-2xl border overflow-hidden ${
            themeMode === 'dark' ? 'bg-gray-800/40 border-gray-700/70' : 'bg-white border-gray-200 shadow-sm'
          }`}>
            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
              themeMode === 'dark' ? 'border-gray-700/60 bg-gray-900/40' : 'border-gray-200 bg-gray-50/50'
            }`}>
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  Sales Ledger Transactions
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Showing {sortedSales.length} recorded sale transactions (page {safePage} of {totalPages})
                </p>
              </div>

              {/* Total Sales Revenue Badge at the top of the table */}
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                  themeMode === 'dark' 
                    ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Sales:</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatCurrency(totalSalesAmount, settings.currency)}
                  </span>
                  {filteredSales.length !== saleRecords.length && (
                    <span className="text-[10px] text-gray-400 border-l border-emerald-700/40 pl-2">
                      Filtered: <strong className="text-emerald-300">{formatCurrency(filteredSalesAmount, settings.currency)}</strong>
                    </span>
                  )}
                </div>

                <button
                  onClick={handleExportCSV}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                    themeMode === 'dark'
                      ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-200'
                      : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700'
                  }`}
                  title="Export Sales Ledger to CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${
                    themeMode === 'dark' ? 'bg-gray-900/60 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-700'
                  }`}>
                    <th onClick={() => handleSort('date')} className={`px-4 py-3 cursor-pointer select-none transition whitespace-nowrap ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`} title="Sort by Date (A-Z / Z-A)">
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
                    <th onClick={() => handleSort('reference')} className={`px-4 py-3 cursor-pointer select-none transition whitespace-nowrap ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`} title="Sort by Receipt # (A-Z / Z-A)">
                      <div className="flex items-center gap-1.5">
                        <span>Receipt #</span>
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
                    <th onClick={() => handleSort('itemName')} className={`px-4 py-3 cursor-pointer select-none transition whitespace-nowrap ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`} title="Sort by Item / Description (A-Z / Z-A)">
                      <div className="flex items-center gap-1.5">
                        <span>Item / Description</span>
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
                    <th onClick={() => handleSort('category')} className={`px-4 py-3 cursor-pointer select-none transition whitespace-nowrap ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`} title="Sort by Category (A-Z / Z-A)">
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
                    <th onClick={() => handleSort('customer')} className={`px-4 py-3 cursor-pointer select-none transition whitespace-nowrap ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`} title="Sort by Customer (A-Z / Z-A)">
                      <div className="flex items-center gap-1.5">
                        <span>Customer</span>
                        {sortField === 'customer' ? (
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
                    <th onClick={() => handleSort('amount')} className={`px-4 py-3 text-right cursor-pointer select-none transition whitespace-nowrap ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`} title="Sort by Final Revenue (Low-High / High-Low)">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Final Revenue</span>
                        {sortField === 'amount' ? (
                          sortDir === 'asc' ? (
                            <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                              <ArrowDown01 className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-mono">Low</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-emerald-400 font-bold gap-0.5">
                              <ArrowDown10 className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-mono">High</span>
                            </div>
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th onClick={() => handleSort('paymentMethod')} className={`px-4 py-3 cursor-pointer select-none transition whitespace-nowrap ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`} title="Sort by Payment (A-Z / Z-A)">
                      <div className="flex items-center gap-1.5">
                        <span>Payment</span>
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
                    <th onClick={() => handleSort('cashier')} className={`px-4 py-3 cursor-pointer select-none transition whitespace-nowrap ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`} title="Sort by Cashier (A-Z / Z-A)">
                      <div className="flex items-center gap-1.5">
                        <span>Cashier</span>
                        {sortField === 'cashier' ? (
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
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={themeMode === 'dark' ? 'divide-y divide-gray-700/40' : 'divide-y divide-gray-200'}>
                  {pagedSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={`px-6 py-12 text-center ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No sale records found</p>
                        <p className="text-xs opacity-75 mt-1">Record a sale from the Available Inventory tab or adjust filter criteria above.</p>
                      </td>
                    </tr>
                  ) : (
                    pagedSales.map((sale) => (
                      <tr
                        key={sale.id}
                        className={`transition-colors ${
                          themeMode === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className={`px-4 py-3.5 whitespace-nowrap text-xs ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>
                          {sale.date}
                        </td>
                        <td className={`px-4 py-3.5 whitespace-nowrap font-mono text-xs font-semibold ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          {sale.reference}
                        </td>
                        <td className={`px-4 py-3.5 font-medium max-w-xs ${themeMode === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                          <div className="truncate font-semibold" title={sale.itemName}>
                            {sale.itemName}
                          </div>
                          {sale.soldSerials && sale.soldSerials.length > 0 && (
                            <div className={`text-[11px] font-mono truncate ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              Serials: {sale.soldSerials.join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            themeMode === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-300'
                          }`}>
                            {sale.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                          <div className={`font-semibold ${themeMode === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>{sale.customerName || 'Walk-in Customer'}</div>
                          {sale.customerNicPassport && (
                            <div className={`text-[11px] ${themeMode === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>NIC: {sale.customerNicPassport}</div>
                          )}
                          {sale.customerPhone && (
                            <div className={`flex items-center gap-1 text-[11px] ${themeMode === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                              <Phone className="w-3 h-3" />
                              {sale.customerPhone}
                            </div>
                          )}
                        </td>
                        <td className={`px-4 py-3.5 whitespace-nowrap text-right font-bold ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          +{formatCurrency(sale.totalAmount, settings.currencySymbol, settings.currencyPosition)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs uppercase font-semibold">
                          <span className={`px-2 py-0.5 rounded border ${
                            themeMode === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}>
                            {sale.paymentMethod.replace('_', ' ')}
                          </span>
                        </td>
                        <td className={`px-4 py-3.5 whitespace-nowrap text-xs ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>
                          {sale.cashierName}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingSale(sale)}
                              title="View & Print Sale Receipt"
                              className={`p-1.5 rounded-lg transition-colors ${
                                themeMode === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700/60' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                            {isAdmin && onUpdateEntry && (
                              <button
                                onClick={() => handleOpenEditSale(sale)}
                                title="Edit Transaction (Admin Only)"
                                className={`p-1.5 rounded-lg transition-colors ${
                                  themeMode === 'dark' ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(sale.id, sale.reference)}
                                title="Delete Transaction"
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
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

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className={`p-4 border-t flex items-center justify-between text-xs ${
                themeMode === 'dark' ? 'border-gray-700/60 bg-gray-900/30 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-700'
              }`}>
                <span>
                  Showing {((safePage - 1) * PAGE_SIZE) + 1} to {Math.min(safePage * PAGE_SIZE, sortedSales.length)} of {sortedSales.length} records (20 per page)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={`px-2.5 py-1 rounded-md border disabled:opacity-40 disabled:cursor-not-allowed ${
                      themeMode === 'dark' ? 'border-gray-700 hover:bg-gray-700/40 text-gray-300' : 'border-gray-300 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    Previous
                  </button>
                  <span className={`px-2 font-medium ${themeMode === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={`px-2.5 py-1 rounded-md border disabled:opacity-40 disabled:cursor-not-allowed ${
                      themeMode === 'dark' ? 'border-gray-700 hover:bg-gray-700/40 text-gray-300' : 'border-gray-300 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SALE RECEIPT VIEW & AUDIT VERIFICATION MODAL                             */}
      {/* ========================================================================= */}
      {viewingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden p-6 ${
            themeMode === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className={`flex items-center justify-between pb-4 border-b ${
              themeMode === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base">Direct Sale Receipt & Audit</h3>
              </div>
              <button
                onClick={() => setViewingSale(null)}
                className={`transition-colors ${themeMode === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="cycly-printable-sale-receipt" className="py-4 space-y-4">
              <div className={`text-center pb-3 border-b border-dashed ${
                themeMode === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="font-bold text-lg">{settings.businessName || 'Cycly Rent'}</div>
                <div className={`text-xs ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{settings.businessAddress}</div>
                <div className={`text-xs ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{settings.businessPhone}</div>
                <div className={`mt-2 text-xs font-mono font-bold uppercase tracking-wider ${
                  themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                }`}>
                  INVOICE #{viewingSale.reference}
                </div>
              </div>

              <div className="text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className={themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600 font-medium'}>Date:</span>
                  <span className="font-medium">{viewingSale.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className={themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600 font-medium'}>Customer:</span>
                  <span className="font-bold">{viewingSale.customerName || 'Walk-in'}</span>
                </div>
                {viewingSale.customerNicPassport && (
                  <div className="flex justify-between">
                    <span className={themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600 font-medium'}>NIC/Passport:</span>
                    <span>{viewingSale.customerNicPassport}</span>
                  </div>
                )}
                {viewingSale.customerPhone && (
                  <div className="flex justify-between">
                    <span className={themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600 font-medium'}>Phone:</span>
                    <span>{viewingSale.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className={themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600 font-medium'}>Cashier:</span>
                  <span>{viewingSale.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className={themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600 font-medium'}>Payment Method:</span>
                  <span className={`uppercase font-bold ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {viewingSale.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Items Sold Box */}
              <div className={`p-3.5 rounded-xl border space-y-2 ${
                themeMode === 'dark' ? 'bg-gray-800/60 border-gray-700/60' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className={`font-bold text-sm ${themeMode === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{viewingSale.itemName}</div>
                {viewingSale.soldSerials && viewingSale.soldSerials.length > 0 && (
                  <div className={`text-xs font-mono font-semibold ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    Serial(s): {viewingSale.soldSerials.join(', ')}
                  </div>
                )}
                <div className={`flex justify-between text-xs pt-1 ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span>Category: {viewingSale.category}</span>
                  <span>Quantity: {viewingSale.quantity}</span>
                </div>
              </div>

              {/* Verification & Audit Calculation Breakdown */}
              <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
                themeMode === 'dark' ? 'bg-gray-800/40 border-gray-700/60' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className={`font-bold text-[11px] uppercase tracking-wider mb-1 ${
                  themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Verification & Pricing Audit
                </div>

                {viewingSale.purchaseValue !== undefined && (
                  <div className={`flex justify-between ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-700 font-medium'}`}>
                    <span>Purchase Value:</span>
                    <span>{formatCurrency(viewingSale.purchaseValue, settings.currencySymbol, settings.currencyPosition)}</span>
                  </div>
                )}

                {viewingSale.markupAmount !== undefined && (
                  <div className={`flex justify-between ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700 font-medium'}`}>
                    <span>20% Markup:</span>
                    <span>+{formatCurrency(viewingSale.markupAmount, settings.currencySymbol, settings.currencyPosition)}</span>
                  </div>
                )}

                {viewingSale.salePrice !== undefined && (
                  <div className={`flex justify-between font-semibold ${themeMode === 'dark' ? 'text-gray-200' : 'text-gray-900 font-bold'}`}>
                    <span>Sale Price (Cost + 20%):</span>
                    <span>{formatCurrency(viewingSale.salePrice, settings.currencySymbol, settings.currencyPosition)}</span>
                  </div>
                )}

                {viewingSale.discountAmount !== undefined && viewingSale.discountAmount > 0 && (
                  <div className={`flex justify-between font-medium ${themeMode === 'dark' ? 'text-amber-400' : 'text-amber-700'}`}>
                    <span>Discount Amount:</span>
                    <span>-{formatCurrency(viewingSale.discountAmount, settings.currencySymbol, settings.currencyPosition)}</span>
                  </div>
                )}

                <div className={`pt-2 border-t flex justify-between items-center text-sm font-bold ${
                  themeMode === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <span className={themeMode === 'dark' ? 'text-white' : 'text-gray-900'}>Final Sale Revenue:</span>
                  <span className={`text-base font-bold ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {formatCurrency(viewingSale.totalAmount, settings.currencySymbol, settings.currencyPosition)}
                  </span>
                </div>
              </div>

              {viewingSale.remarks && (
                <div className={`text-xs italic ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Note: {viewingSale.remarks}
                </div>
              )}

              <div className={`text-center text-[11px] pt-2 border-t border-dashed ${
                themeMode === 'dark' ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-600'
              }`}>
                {settings.receiptFooter || 'Thank you for your business!'}
              </div>
            </div>

            <div className={`pt-4 border-t flex items-center justify-between gap-3 ${
              themeMode === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <button
                onClick={() => setViewingSale(null)}
                className={`px-4 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  themeMode === 'dark' ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                }`}
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-white ${t.accentBg}`}
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SALE MODAL (Admin Only) */}
      {editingSale && (
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
                    Edit Sale Record ({editingSale.reference})
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    Update sale details and sync financial records immediately.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditSale} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {editSaleError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                  {editSaleError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Sale Date: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editSaleDate}
                    onChange={(e) => setEditSaleDate(e.target.value)}
                    className={`w-full h-10 rounded-xl px-3 text-xs font-mono font-medium ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Customer Name:
                  </label>
                  <input
                    type="text"
                    value={editSaleCustomerName}
                    onChange={(e) => setEditSaleCustomerName(e.target.value)}
                    className={`w-full h-10 rounded-xl px-3 text-xs font-medium ${t.textInput}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Customer Phone / WhatsApp:
                  </label>
                  <input
                    type="tel"
                    value={editSaleCustomerPhone}
                    onChange={(e) => setEditSaleCustomerPhone(e.target.value)}
                    className={`w-full h-10 rounded-xl px-3 text-xs font-mono font-medium ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Item Name: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editSaleItemName}
                    onChange={(e) => setEditSaleItemName(e.target.value)}
                    className={`w-full h-10 rounded-xl px-3 text-xs font-medium ${t.textInput}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Final Sale Amount ({settings.currencySymbol}): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={editSaleAmount}
                    onChange={(e) => setEditSaleAmount(e.target.value)}
                    className={`w-full h-10 rounded-xl px-3 text-xs font-mono font-bold ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Payment Method:
                  </label>
                  <select
                    value={editSalePaymentMethod}
                    onChange={(e) => setEditSalePaymentMethod(e.target.value as any)}
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
                  value={editSaleRemarks}
                  onChange={(e) => setEditSaleRemarks(e.target.value)}
                  className={`w-full rounded-xl p-3 text-xs ${t.textInput}`}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-700/40">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
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
