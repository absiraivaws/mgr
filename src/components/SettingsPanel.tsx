/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  Layers, 
  Tag, 
  Hash, 
  Sliders, 
  Store, 
  DollarSign, 
  RotateCcw, 
  Check, 
  X, 
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Wrench,
  Bike,
  Database,
  Search,
  Palette,
  Sun,
  Moon,
  ShieldCheck,
  Lock,
  QrCode,
  Printer,
  RefreshCw,
  Clock,
  Pencil,
  ArrowDownAZ,
  ArrowDownZA,
  ArrowDown01,
  ArrowDown10,
  ArrowUpDown,
  Download,
  CheckSquare,
  Square
} from 'lucide-react';
import QRCode from 'qrcode';
import { AppSettings, Customer, PricingRates, RentalRecord, RentalStartMethod, Vehicle, VehicleIconType, VehiclePurpose, VehicleType, VehicleStatus } from '../types';
import { VehicleIcon } from './VehicleIcon';
import { formatCurrency } from '../utils/pricing';
import { SupabaseSettingsTab } from './SupabaseSettingsTab';
import { isSupabaseConfigured } from '../lib/supabase';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { DEFAULT_USER, UserAccount, getUserPermissions } from '../utils/auth';

interface SettingsPanelProps {
  vehicleTypes: VehicleType[];
  vehicles: Vehicle[];
  customers: Customer[];
  activeRentals: RentalRecord[];
  completedRentals: RentalRecord[];
  settings: AppSettings;
  currentUser?: UserAccount;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onUpdateVehicleTypes: (types: VehicleType[]) => void | Promise<void>;
  onUpdateVehicles: (vehicles: Vehicle[]) => void | Promise<void>;
  onUpdateSettings: (settings: AppSettings) => void;
  onResetSampleData: () => void;
  onToggleTheme?: () => void;
  onChangeAccent?: (accent: AccentColor) => void;
  onUserListChange?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  vehicleTypes,
  vehicles,
  customers,
  activeRentals,
  completedRentals,
  settings,
  currentUser = DEFAULT_USER,
  themeMode = 'dark',
  accent = 'emerald',
  onUpdateVehicleTypes,
  onUpdateVehicles,
  onUpdateSettings,
  onResetSampleData,
  onToggleTheme,
  onChangeAccent,
  onUserListChange,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'types' | 'inventory' | 'store' | 'supabase'>('types');
  const t = getThemeClasses(themeMode, accent);

  // Admin Authorization check - Strictly root admin or admin role
  const isRootAdmin = currentUser?.email?.toLowerCase() === DEFAULT_USER.email.toLowerCase() ||
                      currentUser?.email?.toLowerCase() === 'absiraiva@gmail.com' ||
                      currentUser?.email?.toLowerCase() === 'admin@mannargreenride.lk';
  const isAdmin = currentUser?.role === 'admin' || isRootAdmin;
  const userPerms = getUserPermissions(currentUser);
  const canEditPricing = isAdmin || Boolean(userPerms.canEditPricing);
  const canEditFleet = isAdmin || Boolean(userPerms.canEditFleet);

  // Form State for Adding / Editing Vehicle Type
  const [isAddingType, setIsAddingType] = useState(false);
  const [isSavingType, setIsSavingType] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeIcon, setTypeIcon] = useState<VehicleIconType>('bicycle');
  const [typeDescription, setTypeDescription] = useState('');
  const [typeFirstDurationMinutes, setTypeFirstDurationMinutes] = useState<string>('60');
  const [typeFirstHour, setTypeFirstHour] = useState<string>('100.00');
  const [typeContinuingDurationMinutes, setTypeContinuingDurationMinutes] = useState<string>('30');
  const [typeEvery30Min, setTypeEvery30Min] = useState<string>('50.00');
  const [typeRentalStartMethod, setTypeRentalStartMethod] = useState<RentalStartMethod>('both');
  const [typePurpose, setTypePurpose] = useState<VehiclePurpose>('rental');

  // Form State for Adding Vehicle Inventory (Serial Numbers)
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);
  const [vehSerial, setVehSerial] = useState('');
  const [vehTypeId, setVehTypeId] = useState(vehicleTypes[0]?.id || '');
  const [vehModel, setVehModel] = useState('');
  const [vehCostPrice, setVehCostPrice] = useState('');
  const [vehNotes, setVehNotes] = useState('');

  // Bulk Generator State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState('BIKE-');
  const [bulkStartNum, setBulkStartNum] = useState(1);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkTypeId, setBulkTypeId] = useState(vehicleTypes[0]?.id || '');
  const [bulkCostPrice, setBulkCostPrice] = useState('');

  // Edit Vehicle State
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editVehSerial, setEditVehSerial] = useState('');
  const [editVehTypeId, setEditVehTypeId] = useState('');
  const [editVehModel, setEditVehModel] = useState('');
  const [editVehCostPrice, setEditVehCostPrice] = useState('');
  const [editVehStatus, setEditVehStatus] = useState<VehicleStatus>('available');
  const [editVehNotes, setEditVehNotes] = useState('');
  const [editVehPurchaseRef, setEditVehPurchaseRef] = useState('');
  const [isSavingEditVehicle, setIsSavingEditVehicle] = useState(false);

  // Sorting state for Fleet Inventory table
  type InventorySortField = 'serialNumber' | 'type' | 'model' | 'costPrice' | 'status';
  const [invSortField, setInvSortField] = useState<InventorySortField>('serialNumber');
  const [invSortDir, setInvSortDir] = useState<'asc' | 'desc'>('desc');

  // Pagination for Fleet Inventory (Max 20 rows per page)
  const INV_PAGE_SIZE = 20;
  const [invCurrentPage, setInvCurrentPage] = useState(1);

  const handleInvSort = (field: InventorySortField) => {
    if (invSortField === field) {
      setInvSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setInvSortField(field);
      setInvSortDir(field === 'costPrice' || field === 'serialNumber' ? 'desc' : 'asc');
    }
    setInvCurrentPage(1);
  };

  // Inventory search filter
  const [inventorySearch, setInventorySearch] = useState('');

  // QR Viewer / Print State
  const [selectedQRVehicle, setSelectedQRVehicle] = useState<Vehicle | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [selectedVehicleIdsForQR, setSelectedVehicleIdsForQR] = useState<Set<string>>(new Set());
  const [isBulkDownloadingQR, setIsBulkDownloadingQR] = useState(false);

  const handleOpenVehicleQR = async (v: Vehicle) => {
    setSelectedQRVehicle(v);
    try {
      const url = await QRCode.toDataURL(v.serialNumber, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(url);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  const handlePrintQR = () => {
    if (!selectedQRVehicle || !qrCodeDataUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const typeObj = vehicleTypes.find((t) => t.id === selectedQRVehicle.typeId);
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vehicle QR Tag - ${selectedQRVehicle.serialNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .badge-card {
              border: 3px solid #000;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
              width: 320px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            .shop-name {
              font-size: 16px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #10b981;
              margin-bottom: 4px;
            }
            .vehicle-type {
              font-size: 14px;
              font-weight: 600;
              color: #4b5563;
              margin-bottom: 16px;
            }
            .qr-img {
              width: 220px;
              height: 220px;
              margin: 0 auto 16px;
              display: block;
            }
            .serial-box {
              background: #f3f4f6;
              border: 2px dashed #9ca3af;
              border-radius: 8px;
              padding: 8px;
              font-family: monospace;
              font-size: 20px;
              font-weight: 900;
              letter-spacing: 2px;
              color: #111827;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="badge-card">
            <div class="shop-name">${settings.businessName || 'Cycly Rent'}</div>
            <div class="vehicle-type">${typeObj?.name || 'Fleet Vehicle'}</div>
            <img class="qr-img" src="${qrCodeDataUrl}" alt="${selectedQRVehicle.serialNumber}" />
            <div class="serial-box">${selectedQRVehicle.serialNumber}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Store Settings state
  const [storeForm, setStoreForm] = useState<AppSettings>({ ...settings });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Keep storeForm in sync whenever settings change
  useEffect(() => {
    setStoreForm({ ...settings });
  }, [settings]);

  // Handlers for Vehicle Types
  const handleStartAddType = () => {
    setEditingTypeId(null);
    setTypeName('');
    setTypeIcon('bicycle');
    setTypeDescription('');
    setTypeFirstDurationMinutes('60');
    setTypeFirstHour('100.00');
    setTypeContinuingDurationMinutes('30');
    setTypeEvery30Min('50.00');
    setTypeRentalStartMethod('both');
    setIsAddingType(true);
  };

  const handleStartEditType = (typeItem: VehicleType) => {
    setEditingTypeId(typeItem.id);
    setTypeName(typeItem.name);
    setTypeIcon(typeItem.icon);
    setTypePurpose(typeItem.purpose || 'rental');
    setTypeDescription(typeItem.description || '');
    setTypeFirstDurationMinutes((typeItem.rates.firstDurationMinutes || 60).toString());
    setTypeFirstHour(typeItem.rates.firstHour.toString());
    setTypeContinuingDurationMinutes((typeItem.rates.continuingDurationMinutes || 30).toString());
    setTypeEvery30Min((typeItem.rates.every30Min ?? typeItem.rates.next30Min ?? 50).toString());
    setTypeRentalStartMethod(typeItem.rentalStartMethod || 'both');
    setIsAddingType(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;

    const firstMins = Math.max(1, parseInt(typeFirstDurationMinutes, 10) || 60);
    const contMins = Math.max(1, parseInt(typeContinuingDurationMinutes, 10) || 30);
    const firstRate = Math.max(0, parseFloat(typeFirstHour) || 0);
    const contRate = Math.max(0, parseFloat(typeEvery30Min) || 0);

    const rates: PricingRates = {
      firstHour: firstRate,
      every30Min: contRate,
      firstDurationMinutes: firstMins,
      continuingDurationMinutes: contMins,
      next30Min: contRate,
      continuingHour: contRate * 2,
    };

    setIsSavingType(true);
    try {
      if (editingTypeId) {
        const updated = vehicleTypes.map((item) =>
          item.id === editingTypeId
            ? {
                ...item,
                name: typeName.trim(),
                icon: typeIcon,
                purpose: typePurpose,
                description: typeDescription.trim() || undefined,
                rates,
                rentalStartMethod: typeRentalStartMethod,
              }
            : item
        );
        await onUpdateVehicleTypes(updated);
      } else {
        const newType: VehicleType = {
          id: `type-${Date.now()}`,
          name: typeName.trim(),
          icon: typeIcon,
          purpose: typePurpose,
          description: typeDescription.trim() || undefined,
          rates,
          rentalStartMethod: typeRentalStartMethod,
        };
        await onUpdateVehicleTypes([...vehicleTypes, newType]);
      }

      setIsAddingType(false);
      setEditingTypeId(null);
      setTypePurpose('rental');
    } catch (err) {
      console.error('[Settings] Error saving vehicle type:', err);
    } finally {
      setIsSavingType(false);
    }
  };

  const handleDeleteType = (id: string) => {
    if (!isAdmin && !canEditPricing) {
      alert('Permission Denied: You do not have permission to delete vehicle categories.');
      return;
    }
    if (vehicleTypes.length <= 1) {
      alert('You must have at least one vehicle type.');
      return;
    }
    const hasVehicles = vehicles.some((v) => v.typeId === id);
    if (hasVehicles) {
      alert('Cannot delete this vehicle type because vehicles exist in inventory with this type.');
      return;
    }
    if (confirm('Delete this vehicle type and its pricing rules?')) {
      onUpdateVehicleTypes(vehicleTypes.filter((item) => item.id !== id));
    }
  };

  // Handlers for Vehicles Inventory
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehSerial.trim()) return;

    const normalizedSerial = vehSerial.trim().toUpperCase();
    const isDuplicate = vehicles.some(
      (v) => v.serialNumber.toUpperCase() === normalizedSerial
    );

    if (isDuplicate) {
      alert(`A vehicle with Serial Number "${normalizedSerial}" already exists!`);
      return;
    }

    const costVal = parseFloat(vehCostPrice);
    const newVehicle: Vehicle = {
      id: `veh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serialNumber: normalizedSerial,
      typeId: vehTypeId,
      modelName: vehModel.trim() || undefined,
      costPrice: !isNaN(costVal) && costVal >= 0 ? costVal : undefined,
      status: 'available',
      notes: vehNotes.trim() || undefined,
      totalRentalsCount: 0,
    };

    setIsSavingVehicle(true);
    try {
      await onUpdateVehicles([newVehicle, ...vehicles]);
      setVehSerial('');
      setVehModel('');
      setVehCostPrice('');
      setVehNotes('');
      setIsAddingVehicle(false);
    } catch (err) {
      console.error('[Settings] Error saving vehicle unit:', err);
    } finally {
      setIsSavingVehicle(false);
    }
  };

  // Bulk Generator Handler
  const handleBulkGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseInt(bulkStartNum as any, 10);
    const count = parseInt(bulkCount as any, 10);

    if (isNaN(start) || isNaN(count) || count < 1 || count > 100) {
      alert('Please enter a valid start number and a count between 1 and 100.');
      return;
    }

    const existingSerials = new Set(vehicles.map((v) => v.serialNumber.toUpperCase()));
    const newVehiclesList: Vehicle[] = [];
    let duplicatesSkipped = 0;
    const bulkCostVal = parseFloat(bulkCostPrice);

    for (let i = 0; i < count; i++) {
      const numStr = (start + i).toString().padStart(3, '0');
      const genSerial = `${bulkPrefix.trim().toUpperCase()}${numStr}`;

      if (existingSerials.has(genSerial)) {
        duplicatesSkipped++;
        continue;
      }

      newVehiclesList.push({
        id: `veh-bulk-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 5)}`,
        serialNumber: genSerial,
        typeId: bulkTypeId,
        costPrice: !isNaN(bulkCostVal) && bulkCostVal >= 0 ? bulkCostVal : undefined,
        status: 'available',
        notes: `Bulk generated batch on ${new Date().toLocaleDateString()}`,
        totalRentalsCount: 0,
      });
      existingSerials.add(genSerial);
    }

    if (newVehiclesList.length === 0) {
      alert('All generated serial numbers already exist in your fleet!');
      return;
    }

    onUpdateVehicles([...newVehiclesList, ...vehicles]);
    setIsBulkMode(false);
    setBulkCostPrice('');
    alert(`Successfully generated ${newVehiclesList.length} serial numbers!`);
  };

  // Open Edit Vehicle Modal
  const handleOpenEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    setEditVehSerial(v.serialNumber);
    setEditVehTypeId(v.typeId);
    setEditVehModel(v.modelName || '');
    setEditVehCostPrice(v.costPrice !== undefined ? v.costPrice.toString() : '');
    setEditVehStatus(v.status);
    setEditVehNotes(v.notes || '');
    setEditVehPurchaseRef(v.purchaseRef || '');
  };

  // Save Edit Vehicle Handler
  const handleSaveEditVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle || !editVehSerial.trim()) return;

    const normalizedSerial = editVehSerial.trim().toUpperCase();
    const isDuplicate = vehicles.some(
      (v) => v.id !== editingVehicle.id && v.serialNumber.toUpperCase() === normalizedSerial
    );
    if (isDuplicate) {
      alert(`Another vehicle with Serial Number "${normalizedSerial}" already exists!`);
      return;
    }

    setIsSavingEditVehicle(true);
    try {
      const costVal = parseFloat(editVehCostPrice);
      const updatedList: Vehicle[] = vehicles.map((v) => {
        if (v.id === editingVehicle.id) {
          return {
            ...v,
            serialNumber: normalizedSerial,
            typeId: editVehTypeId,
            modelName: editVehModel.trim() || undefined,
            costPrice: !isNaN(costVal) && costVal >= 0 ? costVal : undefined,
            status: editVehStatus,
            notes: editVehNotes.trim() || undefined,
            purchaseRef: editVehPurchaseRef.trim() || undefined,
          };
        }
        return v;
      });

      await onUpdateVehicles(updatedList);
      setEditingVehicle(null);
    } catch (err: any) {
      console.error('[Settings] Error updating vehicle unit:', err);
      alert(`Failed to update vehicle: ${err.message || err}`);
    } finally {
      setIsSavingEditVehicle(false);
    }
  };

  const handleDeleteVehicle = (id: string) => {
    if (!isAdmin) {
      alert('Permission Denied: Only Administrator accounts can delete vehicles from inventory.');
      return;
    }
    const veh = vehicles.find((v) => v.id === id);
    if (!veh) return;

    if (veh.status === 'rented') {
      alert(`Cannot delete vehicle "${veh.serialNumber}": It is currently actively rented. Please settle the rental first.`);
      return;
    }

    const hasRentals = (activeRentals && activeRentals.some(r => r.vehicleSerialNumber === veh.serialNumber || r.vehicleId === veh.id)) ||
      (completedRentals && completedRentals.some(r => r.vehicleSerialNumber === veh.serialNumber || r.vehicleId === veh.id));

    if (hasRentals) {
      const confirmHistoryDelete = window.confirm(
        `Notice: Vehicle "${veh.serialNumber}" has recorded rental history.\n\n` +
        `Deleting it will permanently remove it from active fleet inventory while historical transactions will remain archived.\n\n` +
        `Do you want to proceed with permanent deletion?`
      );
      if (!confirmHistoryDelete) return;
    } else {
      const confirmDelete = window.confirm(`Are you sure you want to permanently delete vehicle "${veh.serialNumber}"?`);
      if (!confirmDelete) return;
    }

    setSelectedVehicleIdsForQR((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    onUpdateVehicles(vehicles.filter((item) => item.id !== id));
  };

  const handleToggleMaintenance = (id: string) => {
    onUpdateVehicles(
      vehicles.map((v) => {
        if (v.id !== id) return v;
        if (v.status === 'rented' || v.status === 'sold') {
          alert(`Cannot modify status of a ${v.status} inventory item.`);
          return v;
        }
        return {
          ...v,
          status: v.status === 'available' ? 'maintenance' : 'available',
        };
      })
    );
  };

  // Handlers for Store Info
  const handleSaveStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(storeForm);
    setSaveSuccessMsg('Settings saved successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Vehicle inventory filtered and sorted (supports A-Z and Z-A sorting on all columns)
  const filteredVehicles = vehicles
    .filter((v) => {
      if (!inventorySearch.trim()) return true;
      const q = inventorySearch.toLowerCase();
      const typeObj = vehicleTypes.find((t) => t.id === v.typeId);
      return (
        v.serialNumber.toLowerCase().includes(q) ||
        (v.modelName && v.modelName.toLowerCase().includes(q)) ||
        (typeObj && typeObj.name.toLowerCase().includes(q)) ||
        (v.costPrice !== undefined && v.costPrice.toString().includes(q)) ||
        (v.status && v.status.toLowerCase().includes(q)) ||
        (v.notes && v.notes.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      const typeA = vehicleTypes.find((t) => t.id === a.typeId)?.name || '';
      const typeB = vehicleTypes.find((t) => t.id === b.typeId)?.name || '';

      switch (invSortField) {
        case 'serialNumber':
          comparison = a.serialNumber.localeCompare(b.serialNumber, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'type':
          comparison = typeA.localeCompare(typeB);
          break;
        case 'model':
          comparison = (a.modelName || '').localeCompare(b.modelName || '');
          break;
        case 'costPrice':
          comparison = (a.costPrice || 0) - (b.costPrice || 0);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return invSortDir === 'asc' ? comparison : -comparison;
    });

  // Total Fleet Inventory Value & Counts for display at the top of the table
  const totalFleetCost = vehicles.reduce((sum, v) => sum + (v.costPrice || 0), 0);
  const filteredFleetCost = filteredVehicles.reduce((sum, v) => sum + (v.costPrice || 0), 0);
  const invAvailableCount = vehicles.filter((v) => v.status === 'available').length;
  const invRentedCount = vehicles.filter((v) => v.status === 'rented').length;
  const invMaintenanceCount = vehicles.filter((v) => v.status === 'maintenance').length;
  const invSoldCount = vehicles.filter((v) => v.status === 'sold').length;

  // Pagination calculations (Max 20 rows per page)
  const totalInvPages = Math.max(1, Math.ceil(filteredVehicles.length / INV_PAGE_SIZE));
  const safeInvPage = Math.min(invCurrentPage, totalInvPages);
  const pagedVehicles = filteredVehicles.slice((safeInvPage - 1) * INV_PAGE_SIZE, safeInvPage * INV_PAGE_SIZE);

  // Bulk QR Selection & Actions
  const toggleSelectVehicleForQR = (id: string) => {
    setSelectedVehicleIdsForQR((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allFilteredSelected = pagedVehicles.length > 0 && pagedVehicles.every((v) => selectedVehicleIdsForQR.has(v.id));

  const toggleSelectAllFilteredVehiclesForQR = () => {
    setSelectedVehicleIdsForQR((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        pagedVehicles.forEach((v) => next.delete(v.id));
      } else {
        pagedVehicles.forEach((v) => next.add(v.id));
      }
      return next;
    });
  };

  const handleBulkDownloadQR = async () => {
    const selectedVehiclesList = vehicles.filter((v) => selectedVehicleIdsForQR.has(v.id));
    if (selectedVehiclesList.length === 0) return;

    setIsBulkDownloadingQR(true);
    try {
      for (let i = 0; i < selectedVehiclesList.length; i++) {
        const v = selectedVehiclesList[i];
        try {
          const dataUrl = await QRCode.toDataURL(v.serialNumber, {
            width: 500,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });

          const link = document.createElement('a');
          link.download = `${v.serialNumber}_QR.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          if (selectedVehiclesList.length > 1) {
            await new Promise((r) => setTimeout(r, 200));
          }
        } catch (err) {
          console.error(`Failed to generate QR for ${v.serialNumber}:`, err);
        }
      }
    } finally {
      setIsBulkDownloadingQR(false);
    }
  };

  const handleBulkPrintQRSheet = async () => {
    const selectedVehiclesList = vehicles.filter((v) => selectedVehicleIdsForQR.has(v.id));
    if (selectedVehiclesList.length === 0) return;

    const qrItems: { vehicle: Vehicle; dataUrl: string; typeName: string }[] = [];
    for (const v of selectedVehiclesList) {
      const typeObj = vehicleTypes.find((t) => t.id === v.typeId);
      const dataUrl = await QRCode.toDataURL(v.serialNumber, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      qrItems.push({
        vehicle: v,
        dataUrl,
        typeName: typeObj?.name || 'Fleet Vehicle',
      });
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardsHtml = qrItems
      .map(
        (item) => `
        <div class="card">
          <img class="qr-img" src="${item.dataUrl}" alt="${item.vehicle.serialNumber}" />
          <div class="serial">${item.vehicle.serialNumber}</div>
          <div class="meta">${item.typeName} ${item.vehicle.modelName ? `— ${item.vehicle.modelName}` : ''}</div>
          <div class="footer-tag">Scan to Rent / POS Tag</div>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fleet QR Codes Sheet (${selectedVehiclesList.length} Units)</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 10px;
              color: #111827;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 10px;
            }
            .title {
              font-size: 20px;
              font-weight: 800;
              color: #059669;
              margin: 0;
            }
            .subtitle {
              font-size: 12px;
              color: #6b7280;
              margin-top: 4px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .card {
              border: 1.5px dashed #9ca3af;
              border-radius: 12px;
              padding: 12px;
              text-align: center;
              page-break-inside: avoid;
              background: #fff;
            }
            .qr-img {
              width: 150px;
              height: 150px;
              margin: 0 auto;
              display: block;
            }
            .serial {
              font-family: monospace;
              font-size: 16px;
              font-weight: 800;
              color: #059669;
              margin-top: 8px;
            }
            .meta {
              font-size: 11px;
              color: #4b5563;
              margin-top: 2px;
              font-weight: 600;
            }
            .footer-tag {
              font-size: 9px;
              color: #9ca3af;
              margin-top: 6px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${settings.businessName || 'Cycly Rent'} - Vehicle QR Label Sheet</h1>
            <p class="subtitle">Generated ${new Date().toLocaleDateString()} | Total ${selectedVehiclesList.length} Units</p>
          </div>
          <div class="grid">
            ${cardsHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Vehicle types sorted A-Z by name
  const sortedVehicleTypes = [...vehicleTypes].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  return (
    <div className="space-y-6">
      
      {/* Sub Tabs Navigation */}
      <div className={`flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl border ${t.cardSubtleBg}`}>
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            id="subtab-types"
            onClick={() => setActiveSubTab('types')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeSubTab === 'types' ? t.activeTab : t.inactiveTab
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Vehicle Types & Rates</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${t.badge}`}>
              {vehicleTypes.length}
            </span>
          </button>

          <button
            id="subtab-inventory"
            onClick={() => setActiveSubTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeSubTab === 'inventory' ? t.activeTab : t.inactiveTab
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Serial Inventory</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${t.badge}`}>
              {vehicles.length}
            </span>
          </button>


          <button
            id="subtab-store"
            onClick={() => setActiveSubTab('store')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeSubTab === 'store' ? t.activeTab : t.inactiveTab
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Store & Colors</span>
          </button>

          <button
            id="subtab-supabase"
            onClick={() => setActiveSubTab('supabase')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeSubTab === 'supabase' ? t.activeTab : t.inactiveTab
            }`}
          >
            <Database className="w-4 h-4 text-emerald-500" />
            <span>Supabase Cloud DB</span>
            {isSupabaseConfigured() ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                Setup
              </span>
            )}
          </button>
        </div>

        <button
          id="btn-reset-sample-data"
          type="button"
          onClick={() => {
            if (confirm('Reset to standard sample data (Bicycles & Motorcycles with default rates)?')) {
              onResetSampleData();
            }
          }}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${t.inactiveTab}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Fleet</span>
        </button>
      </div>

      {/* 1. VEHICLE TYPES & RATES TAB */}
      {activeSubTab === 'types' && (
        <div className={`${t.cardBg} rounded-2xl p-5 sm:p-6 border shadow-xl space-y-5`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${t.divider}`}>
            <div>
              <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                Vehicle Types & Tiered Pricing Rates
              </h2>
              <p className={`text-xs ${t.textMuted}`}>
                Configure vehicle categories and tiered rental rates with custom minute intervals.
              </p>
            </div>

            {!isAddingType && canEditPricing && (
              <button
                id="btn-add-vehicle-type"
                onClick={handleStartAddType}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-xs rounded-xl shadow-md transition cursor-pointer ${t.primaryBtn}`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Vehicle Category</span>
              </button>
            )}
          </div>

          {/* Add / Edit Form */}
          {isAddingType && (
            <form onSubmit={handleSaveType} className={`p-4 sm:p-5 rounded-xl border space-y-4 ${t.cardSubtleBg}`}>
              <div className="flex items-center justify-between">
                <span className={`font-bold text-sm ${t.textHeading}`}>
                  {editingTypeId ? 'Edit Vehicle Type & Rates' : 'Create New Vehicle Type'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingType(false)}
                  className={`${t.textMuted} hover:${t.textMain}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Type / Item Name (Key-in text)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electric Mountain Bike"
                    value={typeName}
                    onChange={(e) => setTypeName(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-medium ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1">
                    Classification (Rental / Sale)
                  </label>
                  <select
                    value={typePurpose}
                    onChange={(e) => setTypePurpose(e.target.value as VehiclePurpose)}
                    className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold ${t.dropdownInput}`}
                  >
                    <option value="rental">🚲 Rental Fleet (Rental Only)</option>
                    <option value="sale">🏷️ Direct Sale (Sale Only)</option>
                    <option value="both">🔄 Rental & Sale (Both)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                    Display Icon (Dropdown)
                  </label>
                  <select
                    value={typeIcon}
                    onChange={(e) => setTypeIcon(e.target.value as VehicleIconType)}
                    className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold ${t.dropdownInput}`}
                  >
                    <option value="bicycle">🚲 Bicycle</option>
                    <option value="electric-bike">⚡ Electric Bike / E-Bike</option>
                    <option value="motorcycle">🏍️ Motorcycle / Scooter</option>
                    <option value="scooter">🛴 Kick / Electric Scooter</option>
                    <option value="quad">🚗 Quad / Go-Kart / Car</option>
                    <option value="package">📦 Package / Boxed Item</option>
                    <option value="tag">🏷️ Retail / Direct Sale Item</option>
                    <option value="cart">🛒 Accessories & Merch</option>
                    <option value="gear">⚙️ Spare Parts & Hardware</option>
                    <option value="other">🎯 Other / General Asset</option>
                  </select>
                </div>
              </div>

              {/* Tiered Pricing Configuration: Tier 1 Base Duration + Tier 2 Continuing Interval */}
              <div className={`p-4 rounded-xl border ${t.cardSubtleBg} space-y-3`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-500">
                  <Clock className="w-4 h-4" />
                  <span>Tiered Pricing Structure (Configurable Minutes & Rates)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Tier 1: Base Period */}
                  <div className={`p-3 rounded-xl border ${t.border} ${t.cardBg} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                        Tier 1: Initial Base Period
                      </span>
                      <span className="text-[11px] font-mono font-medium text-emerald-400">
                        {typeFirstDurationMinutes || '60'}m @ {settings.currencySymbol} {typeFirstHour || '0'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1 ${t.textHeading}`}>
                          First Minutes
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            placeholder="60"
                            value={typeFirstDurationMinutes}
                            onChange={(e) => setTypeFirstDurationMinutes(e.target.value)}
                            className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-mono pr-10 ${t.textInput}`}
                          />
                          <span className={`absolute right-2.5 top-2.5 text-xs font-mono ${t.textMuted}`}>min</span>
                        </div>
                      </div>
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1 ${t.textHeading}`}>
                          Rate ({settings.currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          required
                          placeholder="100.00"
                          value={typeFirstHour}
                          onChange={(e) => setTypeFirstHour(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-mono ${t.textInput}`}
                        />
                      </div>
                    </div>
                    <p className={`text-[11px] ${t.textMuted}`}>
                      Base charge: First {typeFirstDurationMinutes || '60'} minutes at {settings.currencySymbol} {typeFirstHour || '0.00'}.
                    </p>
                  </div>

                  {/* Tier 2: Continuing Interval */}
                  <div className={`p-3 rounded-xl border ${t.border} ${t.cardBg} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-500">
                        Tier 2: Continuing Interval
                      </span>
                      <span className="text-[11px] font-mono font-medium text-teal-400">
                        +{typeContinuingDurationMinutes || '30'}m @ +{settings.currencySymbol} {typeEvery30Min || '0'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1 ${t.textHeading}`}>
                          Every Minutes
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            placeholder="30"
                            value={typeContinuingDurationMinutes}
                            onChange={(e) => setTypeContinuingDurationMinutes(e.target.value)}
                            className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-mono pr-10 ${t.textInput}`}
                          />
                          <span className={`absolute right-2.5 top-2.5 text-xs font-mono ${t.textMuted}`}>min</span>
                        </div>
                      </div>
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1 ${t.textHeading}`}>
                          Rate ({settings.currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          required
                          placeholder="50.00"
                          value={typeEvery30Min}
                          onChange={(e) => setTypeEvery30Min(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-mono ${t.textInput}`}
                        />
                      </div>
                    </div>
                    <p className={`text-[11px] ${t.textMuted}`}>
                      Recurring charge: Each continuing {typeContinuingDurationMinutes || '30'} minutes at +{settings.currencySymbol} {typeEvery30Min || '0.00'}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Rental Start Method
                  </label>
                  <select
                    id="select-rental-start-method"
                    value={typeRentalStartMethod}
                    onChange={(e) => setTypeRentalStartMethod(e.target.value as RentalStartMethod)}
                    className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold ${t.dropdownInput}`}
                  >
                    <option value="both">Both (Scan QR or Select Manually)</option>
                    <option value="qr">QR Only (Display QR scanner only)</option>
                    <option value="manual">Manual Only (Available Vehicle dropdown)</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Description / Specification (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 250W Motor, Shimano 7-speed, Helmet included"
                    value={typeDescription}
                    onChange={(e) => setTypeDescription(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm ${t.textInput}`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingType(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${t.inactiveTab}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingType}
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn} ${isSavingType ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isSavingType ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSavingType ? 'Saving...' : editingTypeId ? 'Update Rates' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Types List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedVehicleTypes.map((typeObj) => {
              const countOfVehicles = vehicles.filter((v) => v.typeId === typeObj.id).length;
              return (
                <div
                  key={typeObj.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${t.cardSubtleBg}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
                      >
                        <VehicleIcon type={typeObj.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className={`font-bold text-sm sm:text-base ${t.textHeading}`}>{typeObj.name}</h3>
                        <p className={`text-xs ${t.textMuted}`}>{countOfVehicles} registered in fleet</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            typeObj.purpose === 'sale'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : typeObj.purpose === 'both'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {typeObj.purpose === 'sale' ? 'Sale Only' : typeObj.purpose === 'both' ? 'Rental & Sale' : 'Rental Only'}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            typeObj.rentalStartMethod === 'qr'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : typeObj.rentalStartMethod === 'manual'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                          }`}>
                            Start: {typeObj.rentalStartMethod ? typeObj.rentalStartMethod.toUpperCase() : 'BOTH'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleStartEditType(typeObj)}
                          className={`p-2 rounded-lg text-xs font-semibold cursor-pointer ${t.inactiveTab}`}
                          title="Edit Type and Pricing"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteType(typeObj.id)}
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rates Tag */}
                  <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono ${t.cardBg}`}>
                    <div>
                      <span className={t.textMuted}>1st {typeObj.rates.firstDurationMinutes || 60}m: </span>
                      <strong className="text-emerald-500">
                        {formatCurrency(typeObj.rates.firstHour, settings.currencySymbol, settings.currencyPosition)}
                      </strong>
                    </div>
                    <div>
                      <span className={t.textMuted}>+{typeObj.rates.continuingDurationMinutes || 30}m: </span>
                      <strong className="text-teal-500">
                        +{formatCurrency(typeObj.rates.every30Min ?? typeObj.rates.next30Min ?? 0, settings.currencySymbol, settings.currencyPosition)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. SERIAL INVENTORY FLEET TAB */}
      {activeSubTab === 'inventory' && (
        <div className={`${t.cardBg} rounded-2xl p-5 sm:p-6 border shadow-xl space-y-5`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${t.divider}`}>
            <div>
              <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                Fleet Serial Numbers & Vehicle Units
              </h2>
              <p className={`text-xs ${t.textMuted}`}>
                Manage individual asset units with unique barcoded or tagged serial numbers.
              </p>
            </div>

            {canEditFleet && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-open-bulk-gen"
                  onClick={() => {
                    setIsBulkMode(true);
                    setIsAddingVehicle(false);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${t.inactiveTab}`}
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                  <span>Bulk Generate Serials</span>
                </button>

                <button
                  id="btn-open-add-veh"
                  onClick={() => {
                    setIsAddingVehicle(true);
                    setIsBulkMode(false);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer ${t.primaryBtn}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Single Serial</span>
                </button>
              </div>
            )}
          </div>

          {/* Bulk Serial Generator */}
          {isBulkMode && (
            <form onSubmit={handleBulkGenerate} className={`p-4 sm:p-5 rounded-xl border space-y-4 ${t.cardSubtleBg}`}>
              <div className="flex items-center justify-between">
                <span className={`font-bold text-sm flex items-center gap-2 ${t.textHeading}`}>
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Bulk Fleet Serial Generator
                </span>
                <button type="button" onClick={() => setIsBulkMode(false)} className={t.textMuted}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                    Vehicle Type (Dropdown)
                  </label>
                  <select
                    value={bulkTypeId}
                    onChange={(e) => setBulkTypeId(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${t.dropdownInput}`}
                  >
                    {vehicleTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Prefix</label>
                  <input
                    type="text"
                    value={bulkPrefix}
                    onChange={(e) => setBulkPrefix(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Start Number</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkStartNum}
                    onChange={(e) => setBulkStartNum(parseInt(e.target.value) || 1)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Units to Create (Max 50)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(parseInt(e.target.value) || 1)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Unit Cost ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Optional"
                    value={bulkCostPrice}
                    onChange={(e) => setBulkCostPrice(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsBulkMode(false)} className={`px-4 py-2 rounded-xl text-xs ${t.inactiveTab}`}>
                  Cancel
                </button>
                <button type="submit" className={`px-5 py-2 rounded-xl text-xs font-bold ${t.primaryBtn}`}>
                  Generate Units
                </button>
              </div>
            </form>
          )}

          {/* Single Add Vehicle */}
          {isAddingVehicle && (
            <form onSubmit={handleSaveVehicle} className={`p-4 sm:p-5 rounded-xl border space-y-4 ${t.cardSubtleBg}`}>
              <div className="flex items-center justify-between">
                <span className={`font-bold text-sm ${t.textHeading}`}>Register Single Serial Asset</span>
                <button type="button" onClick={() => setIsAddingVehicle(false)} className={t.textMuted}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Unique Serial Number (Key-in) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BIKE-007 or VIN-9843"
                    value={vehSerial}
                    onChange={(e) => setVehSerial(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                    Vehicle Type (Dropdown) *
                  </label>
                  <select
                    value={vehTypeId}
                    onChange={(e) => setVehTypeId(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${t.dropdownInput}`}
                  >
                    {vehicleTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Model / Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Trek Marlin 5"
                    value={vehModel}
                    onChange={(e) => setVehModel(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Purchase Value ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 45000"
                    value={vehCostPrice}
                    onChange={(e) => setVehCostPrice(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold ${t.textInput}`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddingVehicle(false)} className={`px-4 py-2 rounded-xl text-xs ${t.inactiveTab}`}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingVehicle}
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn} ${isSavingVehicle ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isSavingVehicle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSavingVehicle ? 'Saving...' : 'Save Vehicle'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TOTAL INVENTORY VALUE & FLEET STATS BAR (Displayed at top of table) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border shadow-sm ${
            themeMode === 'dark' ? 'bg-gray-900/40 border-gray-700/60' : 'bg-gray-50 border-gray-200'
          }`}>
            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Fleet Purchase Value
              </div>
              <div className={`text-xl font-bold mt-1 ${
                themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
              }`}>
                {formatCurrency(totalFleetCost, settings.currencySymbol, settings.currencyPosition)}
              </div>
              {inventorySearch && (
                <div className={`text-[10px] mt-0.5 ${
                  themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Filtered: {formatCurrency(filteredFleetCost, settings.currencySymbol, settings.currencyPosition)}
                </div>
              )}
            </div>

            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Total Fleet Units
              </div>
              <div className={`text-xl font-bold mt-1 ${
                themeMode === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {vehicles.length} <span className={`text-xs font-normal ${
                  themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>units</span>
              </div>
              <div className={`text-[10px] mt-0.5 ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Showing {filteredVehicles.length} of {vehicles.length} records
              </div>
            </div>

            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Available & Rented
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm font-bold ${
                  themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
                }`}>
                  {invAvailableCount} Available
                </span>
                <span className="text-gray-400">•</span>
                <span className={`text-sm font-bold ${
                  themeMode === 'dark' ? 'text-blue-400' : 'text-blue-700'
                }`}>
                  {invRentedCount} Rented
                </span>
              </div>
              <div className={`text-[10px] mt-0.5 ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Operational readiness</div>
            </div>

            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Maintenance & Sold
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-sm font-bold ${
                  themeMode === 'dark' ? 'text-amber-400' : 'text-amber-700'
                }`}>
                  {invMaintenanceCount} Maint.
                </span>
                <span className="text-gray-400">•</span>
                <span className={`text-sm font-bold ${
                  themeMode === 'dark' ? 'text-purple-400' : 'text-purple-700'
                }`}>
                  {invSoldCount} Sold
                </span>
              </div>
              <div className={`text-[10px] mt-0.5 ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Offline or archived</div>
            </div>
          </div>

          {/* DISTINCT FIND / SEARCH BAR (Cyan theme) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-cyan-500 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>Search Fleet Inventory</span>
              </label>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${t.searchBadge}`}>
                Search Bar
              </span>
            </div>
            <div className="relative">
              <input
                id="input-inventory-search"
                type="text"
                placeholder="Search by serial number, type, model name, purchase value, status..."
                value={inventorySearch}
                onChange={(e) => {
                  setInventorySearch(e.target.value);
                  setInvCurrentPage(1);
                }}
                className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-medium ${t.searchInput}`}
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-500">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* BULK QR ACTION TOOLBAR */}
          {selectedVehicleIdsForQR.size > 0 && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-emerald-400">
                  {selectedVehicleIdsForQR.size} unit{selectedVehicleIdsForQR.size > 1 ? 's' : ''} selected
                </span>
                <span className={`text-[11px] ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  (for bulk QR generation & labels)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isBulkDownloadingQR}
                  onClick={handleBulkDownloadQR}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="Download all selected QR codes as individual PNG images"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isBulkDownloadingQR ? 'Downloading...' : `Download QR Codes (${selectedVehicleIdsForQR.size})`}</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkPrintQRSheet}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="Print all selected QR codes in an A4 label grid sheet"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print QR Sheet ({selectedVehicleIdsForQR.size})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVehicleIdsForQR(new Set())}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-600 hover:bg-slate-700/60 text-slate-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Clear all selections"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          )}

          {/* Vehicles Table (With A-Z / Z-A Sorting on ALL Columns) */}
          <div className={`overflow-x-auto rounded-xl border ${t.divider}`}>
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className={`${t.cardSubtleBg} uppercase font-semibold border-b ${t.divider} ${t.textMuted}`}>
                <tr>
                  <th className="w-10 px-3.5 py-3 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all visible vehicles"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFilteredVehiclesForQR}
                      className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th 
                    onClick={() => handleInvSort('serialNumber')} 
                    className={`px-3.5 py-3 cursor-pointer select-none transition ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`}
                    title="Sort by Serial Number (A-Z / Z-A)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Serial Number</span>
                      {invSortField === 'serialNumber' ? (
                        invSortDir === 'asc' ? (
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
                    onClick={() => handleInvSort('type')} 
                    className={`px-3.5 py-3 cursor-pointer select-none transition ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`}
                    title="Sort by Type (A-Z / Z-A)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Type</span>
                      {invSortField === 'type' ? (
                        invSortDir === 'asc' ? (
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
                    onClick={() => handleInvSort('model')} 
                    className={`px-3.5 py-3 cursor-pointer select-none transition ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`}
                    title="Sort by Model (A-Z / Z-A)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Model</span>
                      {invSortField === 'model' ? (
                        invSortDir === 'asc' ? (
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
                    onClick={() => handleInvSort('costPrice')} 
                    className={`px-3.5 py-3 text-right cursor-pointer select-none transition ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`}
                    title="Sort by Purchase Value (Low to High / High to Low)"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Purchase Value</span>
                      {invSortField === 'costPrice' ? (
                        invSortDir === 'asc' ? (
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
                    onClick={() => handleInvSort('status')} 
                    className={`px-3.5 py-3 text-center cursor-pointer select-none transition ${themeMode === 'dark' ? 'hover:text-white' : 'hover:text-gray-900'}`}
                    title="Sort by Status (A-Z / Z-A)"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Status</span>
                      {invSortField === 'status' ? (
                        invSortDir === 'asc' ? (
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
                  <th className="px-3.5 py-3 text-center">QR</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divider}`}>
                {pagedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`px-4 py-8 text-center italic ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      No vehicles found matching "{inventorySearch}".
                    </td>
                  </tr>
                ) : (
                  pagedVehicles.map((v) => {
                    const typeObj = vehicleTypes.find((t) => t.id === v.typeId);
                    return (
                      <tr key={v.id} className={`transition ${themeMode === 'dark' ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'}`}>
                        <td className="w-10 px-3.5 py-3 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select vehicle ${v.serialNumber}`}
                            checked={selectedVehicleIdsForQR.has(v.id)}
                            onChange={() => toggleSelectVehicleForQR(v.id)}
                            className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className={`px-3.5 py-3 font-mono font-bold ${themeMode === 'dark' ? 'text-emerald-400' : 'text-emerald-800'}`}>
                          {v.serialNumber}
                        </td>
                        <td className="px-3.5 py-3">
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${t.badge}`}>
                            {typeObj?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className={`px-3.5 py-3 ${themeMode === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                          {v.modelName || '—'}
                        </td>
                        <td className={`px-3.5 py-3 text-right font-mono font-semibold text-xs ${
                          themeMode === 'dark' ? 'text-gray-200' : 'text-gray-900 font-bold'
                        }`}>
                          {v.costPrice !== undefined && v.costPrice > 0 ? (
                            formatCurrency(v.costPrice, settings.currencySymbol, settings.currencyPosition)
                          ) : (
                            <span className={themeMode === 'dark' ? 'text-gray-500' : 'text-gray-400 font-normal'}>—</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          {v.status === 'available' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                              Available
                            </span>
                          )}
                          {v.status === 'rented' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/30">
                              Rented
                            </span>
                          )}
                          {v.status === 'maintenance' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                              Maintenance
                            </span>
                          )}
                          {v.status === 'sold' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                              Sold
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <button
                            type="button"
                            id={`btn-view-qr-${v.serialNumber}`}
                            onClick={() => handleOpenVehicleQR(v)}
                            className="p-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition cursor-pointer"
                            title={`View & Print QR for ${v.serialNumber}`}
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditVehicle(v)}
                                className={`p-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                                  themeMode === 'dark'
                                    ? 'hover:bg-slate-700/60 text-cyan-400 border-cyan-500/30 hover:border-cyan-500/60'
                                    : 'hover:bg-cyan-50 text-cyan-700 border-cyan-300'
                                }`}
                                title="Edit Vehicle & Purchase Value"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleToggleMaintenance(v.id)}
                                className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer ${t.inactiveTab}`}
                                title="Toggle Maintenance"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteVehicle(v.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                                title="Delete Vehicle"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controls (Max 20 rows per page) */}
            {filteredVehicles.length > INV_PAGE_SIZE && (
              <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
                themeMode === 'dark' ? 'border-gray-700/60 bg-gray-900/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}>
                <div>
                  Showing {(safeInvPage - 1) * INV_PAGE_SIZE + 1} to {Math.min(safeInvPage * INV_PAGE_SIZE, filteredVehicles.length)} of {filteredVehicles.length} units (20 per page)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeInvPage <= 1}
                    onClick={() => setInvCurrentPage((p) => Math.max(1, p - 1))}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition ${
                      themeMode === 'dark' ? 'border-gray-700 hover:bg-gray-800 text-gray-200' : 'border-gray-300 hover:bg-gray-200 text-gray-700 bg-white'
                    }`}
                  >
                    Previous
                  </button>
                  <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold ${
                    themeMode === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-800'
                  }`}>
                    {safeInvPage} / {totalInvPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeInvPage >= totalInvPages}
                    onClick={() => setInvCurrentPage((p) => Math.min(totalInvPages, p + 1))}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition ${
                      themeMode === 'dark' ? 'border-gray-700 hover:bg-gray-800 text-gray-200' : 'border-gray-300 hover:bg-gray-200 text-gray-700 bg-white'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Edit Vehicle Modal */}
          {editingVehicle && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
              <div className={`w-full max-w-lg ${
                themeMode === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
              } rounded-2xl border shadow-2xl p-5 sm:p-6 space-y-4`}>
                <div className={`flex items-center justify-between border-b pb-3 ${
                  themeMode === 'dark' ? 'border-gray-700/60' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h3 className={`font-bold text-sm sm:text-base ${themeMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Edit Fleet Serial Unit
                      </h3>
                      <p className={`text-xs ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        Update serial number, category, model, and purchase value
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingVehicle(null)}
                    className={`p-1 rounded-lg transition cursor-pointer ${
                      themeMode === 'dark' ? 'text-slate-400 hover:text-white' : 'text-gray-400 hover:text-gray-800'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditVehicle} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                        Serial Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={editVehSerial}
                        onChange={(e) => setEditVehSerial(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold ${t.textInput}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                        Vehicle Type *
                      </label>
                      <select
                        value={editVehTypeId}
                        onChange={(e) => setEditVehTypeId(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${t.dropdownInput}`}
                      >
                        {vehicleTypes.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                        Model / Brand Name
                      </label>
                      <input
                        type="text"
                        value={editVehModel}
                        onChange={(e) => setEditVehModel(e.target.value)}
                        placeholder="e.g. Trek Marlin 7"
                        className={`w-full rounded-xl px-3 py-2 text-xs ${t.textInput}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                        Purchase Value ({settings.currencySymbol})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={editVehCostPrice}
                        onChange={(e) => setEditVehCostPrice(e.target.value)}
                        placeholder="e.g. 45000"
                        className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold ${t.textInput}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                        Inventory Status *
                      </label>
                      <select
                        value={editVehStatus}
                        onChange={(e) => setEditVehStatus(e.target.value as any)}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${t.dropdownInput}`}
                      >
                        <option value="available">Available</option>
                        <option value="rented">Rented</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="sold">Sold</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                        Purchase Invoice / Ref #
                      </label>
                      <input
                        type="text"
                        value={editVehPurchaseRef}
                        onChange={(e) => setEditVehPurchaseRef(e.target.value)}
                        placeholder="e.g. PUR-000123"
                        className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${t.textInput}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                      Notes / Specifications
                    </label>
                    <input
                      type="text"
                      value={editVehNotes}
                      onChange={(e) => setEditVehNotes(e.target.value)}
                      placeholder="Vendor, frame size, warranty, etc."
                      className={`w-full rounded-xl px-3 py-2 text-xs ${t.textInput}`}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-700/60">
                    <button
                      type="button"
                      onClick={() => setEditingVehicle(null)}
                      className={`px-4 py-2 rounded-xl text-xs ${t.inactiveTab}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingEditVehicle}
                      className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn}`}
                    >
                      {isSavingEditVehicle ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>{isSavingEditVehicle ? 'Updating...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* QR Code Modal for Vehicle Unit */}
          {selectedQRVehicle && qrCodeDataUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
              <div className={`w-full max-w-sm ${t.cardBg} rounded-2xl border shadow-2xl p-5 sm:p-6 space-y-4 text-center`}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-emerald-400" />
                    <h3 className={`font-bold text-sm sm:text-base ${t.textHeading}`}>Vehicle QR Code</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQRVehicle(null);
                      setQrCodeDataUrl(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="font-mono font-extrabold text-xl tracking-wider text-emerald-400">
                    {selectedQRVehicle.serialNumber}
                  </div>
                  <div className={`text-xs ${t.textMuted}`}>
                    {vehicleTypes.find((t) => t.id === selectedQRVehicle.typeId)?.name || 'Fleet Vehicle'}
                    {selectedQRVehicle.modelName ? ` — ${selectedQRVehicle.modelName}` : ''}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-inner inline-block border-2 border-slate-200">
                  <img
                    src={qrCodeDataUrl}
                    alt={selectedQRVehicle.serialNumber}
                    className="w-52 h-52 mx-auto block"
                  />
                </div>

                <div className="text-[11px] text-slate-400 px-2">
                  Scannable tag strictly identifies vehicle serial <strong>{selectedQRVehicle.serialNumber}</strong>.
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQRVehicle(null);
                      setQrCodeDataUrl(null);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${t.inactiveTab}`}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    id="btn-print-vehicle-qr"
                    onClick={handlePrintQR}
                    className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md ${t.primaryBtn}`}
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print QR</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}


      {/* 4. STORE & APPEARANCE TAB */}
      {activeSubTab === 'store' && (
        <div className={`${t.cardBg} rounded-2xl p-5 sm:p-6 border shadow-xl space-y-6`}>
          
          {/* Visual Theme & Global Color Switcher */}
          <div className={`p-4 sm:p-5 rounded-xl border space-y-4 ${t.cardSubtleBg}`}>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-500" />
              <h3 className={`font-bold text-sm ${t.textHeading}`}>
                Theme Mode & Global Color Palette
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Dark / Light Mode Switch */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${t.textHeading}`}>
                  Display Mode (Dark / Light)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleTheme && themeMode === 'light' && onToggleTheme()}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                      themeMode === 'dark' ? t.activeTab : t.inactiveTab
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Dark Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleTheme && themeMode === 'dark' && onToggleTheme()}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                      themeMode === 'light' ? t.activeTab : t.inactiveTab
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Light Mode</span>
                  </button>
                </div>
              </div>

              {/* Global Accent Color */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${t.textHeading}`}>
                  Global Brand Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {(['emerald', 'blue', 'violet', 'amber', 'rose'] as AccentColor[]).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => onChangeAccent && onChangeAccent(col)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition cursor-pointer ${
                        accent === col ? t.activeTab : t.inactiveTab
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Visual preview badges */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-lg border font-semibold ${t.dropdownInput}`}>
                Dropdown styling (Indigo)
              </span>
              <span className={`px-2.5 py-1 rounded-lg border font-semibold ${t.searchInput}`}>
                Search bar styling (Cyan)
              </span>
              <span className={`px-2.5 py-1 rounded-lg border font-semibold ${t.textInput}`}>
                Key-in textbox styling
              </span>
              <span className={`px-2.5 py-1 rounded-lg font-semibold ${t.inactiveTab}`}>
                Bordered Non-active tab
              </span>
            </div>
          </div>

          {/* Store Info Form */}
          <form onSubmit={handleSaveStoreSettings} className="space-y-4">
            <div className={`pb-3 border-b ${t.divider}`}>
              <h3 className={`font-bold text-sm ${t.textHeading}`}>
                Store Receipt & Business Details
              </h3>
            </div>

            {/* Company Logo Upload */}
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                {storeForm.companyLogo ? (
                  <img
                    src={storeForm.companyLogo}
                    alt="Company Logo"
                    className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500/30 shadow-lg"
                  />
                ) : (
                  <div
                    className={`w-16 h-16 rounded-xl flex items-center justify-center border-2 border-dashed ${t.divider}`}
                  >
                    <Bike className={`w-6 h-6 ${t.textMuted}`} />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <label className={`block text-xs font-semibold ${t.textHeading}`}>Company Logo</label>
                <div className="flex items-center gap-2">
                  <label
                    className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${t.inactiveTab} hover:opacity-80 transition`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 500 * 1024) {
                          alert('Logo image must be under 500KB');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          setStoreForm({ ...storeForm, companyLogo: dataUrl });
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {storeForm.companyLogo && (
                    <button
                      type="button"
                      onClick={() => setStoreForm({ ...storeForm, companyLogo: undefined })}
                      className="px-2 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
                <p className={`text-[10px] ${t.textMuted}`}>Recommended: 128×128px, PNG or JPEG, max 500KB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Business Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cycly Rent, ABC Rentals"
                  value={storeForm.businessName}
                  onChange={(e) => setStoreForm({ ...storeForm, businessName: e.target.value })}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold ${t.textInput}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. +94 77 123 4567"
                  value={storeForm.businessPhone || ''}
                  onChange={(e) => setStoreForm({ ...storeForm, businessPhone: e.target.value })}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm ${t.textInput}`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Store Address</label>
                <input
                  type="text"
                  placeholder="Street, City, Postal Code"
                  value={storeForm.businessAddress || ''}
                  onChange={(e) => setStoreForm({ ...storeForm, businessAddress: e.target.value })}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm ${t.textInput}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Currency Symbol</label>
                <input
                  type="text"
                  placeholder="e.g. LKR, $, €"
                  value={storeForm.currencySymbol}
                  onChange={(e) => setStoreForm({ ...storeForm, currencySymbol: e.target.value })}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold ${t.textInput}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Currency Position</label>
                <select
                  value={storeForm.currencyPosition || 'prefix'}
                  onChange={(e) => setStoreForm({ ...storeForm, currencyPosition: e.target.value as 'prefix' | 'suffix' })}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold cursor-pointer ${t.dropdownInput}`}
                >
                  <option value="prefix">Prefix (e.g. LKR 2,500)</option>
                  <option value="suffix">Suffix (e.g. 2,500 LKR)</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Rental Receipt Prefix</label>
                <input
                  type="text"
                  placeholder="e.g. CYC"
                  value={storeForm.rentalNumberPrefix || 'CYC'}
                  onChange={(e) => setStoreForm({ ...storeForm, rentalNumberPrefix: e.target.value.toUpperCase() })}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold ${t.textInput}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Default Cashier Name</label>
                <input
                  type="text"
                  placeholder="e.g. Counter Cashier"
                  value={storeForm.cashierName || ''}
                  onChange={(e) => setStoreForm({ ...storeForm, cashierName: e.target.value })}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm ${t.textInput}`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>Receipt Footer Message</label>
                <input
                  type="text"
                  placeholder="e.g. Thank you for riding with us! Drive safely."
                  value={storeForm.receiptFooter || ''}
                  onChange={(e) => setStoreForm({ ...storeForm, receiptFooter: e.target.value })}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs sm:text-sm ${t.textInput}`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              {saveSuccessMsg && (
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  {saveSuccessMsg}
                </span>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-lg cursor-pointer ${t.primaryBtn}`}
                >
                  <Save className="w-4 h-4" />
                  <span>Save Store Configuration</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 5. SUPABASE CLOUD TAB */}
      {activeSubTab === 'supabase' && (
        <SupabaseSettingsTab
          vehicleTypes={vehicleTypes}
          vehicles={vehicles}
          customers={customers}
          activeRentals={activeRentals}
          completedRentals={completedRentals}
          settings={settings}
          themeMode={themeMode}
          accent={accent}
        />
      )}
    </div>
  );
};
