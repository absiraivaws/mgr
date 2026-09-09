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
  Printer
} from 'lucide-react';
import QRCode from 'qrcode';
import { AppSettings, Customer, PricingRates, RentalRecord, RentalStartMethod, Vehicle, VehicleIconType, VehicleType } from '../types';
import { VehicleIcon } from './VehicleIcon';
import { formatCurrency } from '../utils/pricing';
import { SupabaseSettingsTab } from './SupabaseSettingsTab';
import { isSupabaseConfigured } from '../lib/supabase';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { DEFAULT_USER, UserAccount } from '../utils/auth';

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
  onUpdateVehicleTypes: (types: VehicleType[]) => void;
  onUpdateVehicles: (vehicles: Vehicle[]) => void;
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
  const isRootAdmin = currentUser?.email?.toLowerCase() === DEFAULT_USER.email.toLowerCase();
  const isAdmin = currentUser?.role === 'admin' || isRootAdmin;

  // Form State for Adding / Editing Vehicle Type
  const [isAddingType, setIsAddingType] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeIcon, setTypeIcon] = useState<VehicleIconType>('bicycle');
  const [typeDescription, setTypeDescription] = useState('');
  const [typeFirstHour, setTypeFirstHour] = useState<string>('5.00');
  const [typeEvery30Min, setTypeEvery30Min] = useState<string>('2.50');
  const [typeRentalStartMethod, setTypeRentalStartMethod] = useState<RentalStartMethod>('both');

  // Form State for Adding Vehicle Inventory (Serial Numbers)
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [vehSerial, setVehSerial] = useState('');
  const [vehTypeId, setVehTypeId] = useState(vehicleTypes[0]?.id || '');
  const [vehModel, setVehModel] = useState('');
  const [vehNotes, setVehNotes] = useState('');

  // Bulk Generator State
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState('BIKE-');
  const [bulkStartNum, setBulkStartNum] = useState(1);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkTypeId, setBulkTypeId] = useState(vehicleTypes[0]?.id || '');

  // Inventory search filter
  const [inventorySearch, setInventorySearch] = useState('');

  // QR Viewer / Print State
  const [selectedQRVehicle, setSelectedQRVehicle] = useState<Vehicle | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

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
    setTypeFirstHour('5.00');
    setTypeEvery30Min('2.50');
    setTypeRentalStartMethod('both');
    setIsAddingType(true);
  };

  const handleStartEditType = (typeItem: VehicleType) => {
    setEditingTypeId(typeItem.id);
    setTypeName(typeItem.name);
    setTypeIcon(typeItem.icon);
    setTypeDescription(typeItem.description || '');
    setTypeFirstHour(typeItem.rates.firstHour.toString());
    setTypeEvery30Min((typeItem.rates.every30Min ?? typeItem.rates.next30Min ?? 2.5).toString());
    setTypeRentalStartMethod(typeItem.rentalStartMethod || 'both');
    setIsAddingType(true);
  };

  const handleSaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;

    const rate30 = Math.max(0, parseFloat(typeEvery30Min) || 0);
    const rates: PricingRates = {
      firstHour: Math.max(0, parseFloat(typeFirstHour) || 0),
      every30Min: rate30,
      next30Min: rate30,
      continuingHour: rate30 * 2,
    };

    if (editingTypeId) {
      const updated = vehicleTypes.map((item) =>
        item.id === editingTypeId
          ? {
              ...item,
              name: typeName.trim(),
              icon: typeIcon,
              description: typeDescription.trim() || undefined,
              rates,
              rentalStartMethod: typeRentalStartMethod,
            }
          : item
      );
      onUpdateVehicleTypes(updated);
    } else {
      const newType: VehicleType = {
        id: `type-${Date.now()}`,
        name: typeName.trim(),
        icon: typeIcon,
        description: typeDescription.trim() || undefined,
        rates,
        rentalStartMethod: typeRentalStartMethod,
      };
      onUpdateVehicleTypes([...vehicleTypes, newType]);
    }

    setIsAddingType(false);
    setEditingTypeId(null);
  };

  const handleDeleteType = (id: string) => {
    if (!isAdmin) {
      alert('Permission Denied: Only an administrator can delete vehicle categories.');
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
  const handleSaveVehicle = (e: React.FormEvent) => {
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

    const newVehicle: Vehicle = {
      id: `veh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      serialNumber: normalizedSerial,
      typeId: vehTypeId,
      modelName: vehModel.trim() || undefined,
      status: 'available',
      notes: vehNotes.trim() || undefined,
      totalRentalsCount: 0,
    };

    onUpdateVehicles([newVehicle, ...vehicles]);
    setVehSerial('');
    setVehModel('');
    setVehNotes('');
    setIsAddingVehicle(false);
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
    alert(`Successfully generated ${newVehiclesList.length} serial numbers!`);
  };

  const handleDeleteVehicle = (id: string) => {
    if (!isAdmin) {
      alert('Permission Denied: Only an administrator can delete vehicles from inventory.');
      return;
    }
    const veh = vehicles.find((v) => v.id === id);
    if (veh?.status === 'rented') {
      alert('Cannot delete an actively rented vehicle. Please stop the rental timer first.');
      return;
    }
    onUpdateVehicles(vehicles.filter((item) => item.id !== id));
  };

  const handleToggleMaintenance = (id: string) => {
    onUpdateVehicles(
      vehicles.map((v) => {
        if (v.id !== id) return v;
        if (v.status === 'rented') {
          alert('Cannot put an actively rented vehicle into maintenance.');
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

  // Vehicle inventory filtered and sorted A-Z by Category then Serial Number
  const filteredVehicles = vehicles
    .filter((v) => {
      const q = inventorySearch.toLowerCase();
      const typeObj = vehicleTypes.find((t) => t.id === v.typeId);
      return (
        v.serialNumber.toLowerCase().includes(q) ||
        (v.modelName && v.modelName.toLowerCase().includes(q)) ||
        (typeObj && typeObj.name.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const aType = vehicleTypes.find((t) => t.id === a.typeId)?.name || '';
      const bType = vehicleTypes.find((t) => t.id === b.typeId)?.name || '';
      const typeComp = aType.localeCompare(bType, undefined, { sensitivity: 'base' });
      if (typeComp !== 0) return typeComp;
      return a.serialNumber.localeCompare(b.serialNumber, undefined, { numeric: true, sensitivity: 'base' });
    });

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
                Configure rent charges for the First 60 Minutes and continuing every 30 Minutes.
              </p>
            </div>

            {!isAddingType && (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Vehicle Type Name (Key-in text)
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                    Display Icon (Dropdown)
                  </label>
                  <select
                    value={typeIcon}
                    onChange={(e) => setTypeIcon(e.target.value as VehicleIconType)}
                    className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold ${t.dropdownInput}`}
                  >
                    <option value="bicycle">🚲 Bicycle</option>
                    <option value="electric_bike">⚡ Electric Bike</option>
                    <option value="motorcycle">🏍️ Motorcycle / Scooter</option>
                    <option value="scooter">🛴 Kick / Electric Scooter</option>
                    <option value="car">🚗 Go-Kart / Car</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    First 60 Minutes Rate ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={typeFirstHour}
                    onChange={(e) => setTypeFirstHour(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-mono ${t.textInput}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Every Continuing 30 Minutes Rate ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={typeEvery30Min}
                    onChange={(e) => setTypeEvery30Min(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs sm:text-sm font-mono ${t.textInput}`}
                  />
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
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn}`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingTypeId ? 'Update Rates' : 'Save Category'}</span>
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
                        <div className="mt-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            typeObj.rentalStartMethod === 'qr'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : typeObj.rentalStartMethod === 'manual'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            Start: {typeObj.rentalStartMethod ? typeObj.rentalStartMethod.toUpperCase() : 'BOTH'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditType(typeObj)}
                        className={`p-2 rounded-lg text-xs font-semibold cursor-pointer ${t.inactiveTab}`}
                        title="Edit Type and Pricing"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteType(typeObj.id)}
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                          title="Delete Category (Admin Only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => alert('Permission Denied: Only an administrator can delete vehicle categories.')}
                          className="p-2 rounded-lg text-slate-500 opacity-40 border border-slate-500/20 cursor-not-allowed"
                          title="Admin Only: Only administrators can delete categories"
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rates Tag */}
                  <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono ${t.cardBg}`}>
                    <div>
                      <span className={t.textMuted}>1st 60 Min: </span>
                      <strong className="text-emerald-500">
                        {formatCurrency(typeObj.rates.firstHour, settings.currencySymbol, settings.currencyPosition)}
                      </strong>
                    </div>
                    <div>
                      <span className={t.textMuted}>+30 Min: </span>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Unique Serial Number (Key-in)
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
                    Vehicle Type (Dropdown)
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
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAddingVehicle(false)} className={`px-4 py-2 rounded-xl text-xs ${t.inactiveTab}`}>
                  Cancel
                </button>
                <button type="submit" className={`px-5 py-2 rounded-xl text-xs font-bold ${t.primaryBtn}`}>
                  Save Vehicle
                </button>
              </div>
            </form>
          )}

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
                placeholder="Search by serial number, type, or model name..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className={`w-full rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm font-medium ${t.searchInput}`}
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-500">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Vehicles Table */}
          <div className={`overflow-x-auto rounded-xl border ${t.divider}`}>
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className={`${t.cardSubtleBg} uppercase font-semibold border-b ${t.divider} ${t.textMuted}`}>
                <tr>
                  <th className="px-3.5 py-3">Serial Number</th>
                  <th className="px-3.5 py-3">Type</th>
                  <th className="px-3.5 py-3">Model</th>
                  <th className="px-3.5 py-3">Status</th>
                  <th className="px-3.5 py-3 text-center">QR</th>
                  <th className="px-3.5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${t.divider}`}>
                {filteredVehicles.map((v) => {
                  const typeObj = vehicleTypes.find((t) => t.id === v.typeId);
                  return (
                    <tr key={v.id} className="hover:bg-slate-500/5 transition">
                      <td className={`px-3.5 py-3 font-mono font-bold ${t.textHeading}`}>
                        {v.serialNumber}
                      </td>
                      <td className="px-3.5 py-3">
                        <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${t.badge}`}>
                          {typeObj?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className={`px-3.5 py-3 ${t.textMuted}`}>
                        {v.modelName || '—'}
                      </td>
                      <td className="px-3.5 py-3">
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
                          <button
                            type="button"
                            onClick={() => handleToggleMaintenance(v.id)}
                            className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer ${t.inactiveTab}`}
                            title="Toggle Maintenance"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteVehicle(v.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
                              title="Delete Vehicle (Admin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => alert('Permission Denied: Only an administrator can delete vehicles from inventory.')}
                              className="p-1.5 rounded-lg text-slate-500 opacity-40 border border-slate-500/20 cursor-not-allowed"
                              title="Admin Only: Only administrators can delete vehicles"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
