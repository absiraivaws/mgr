import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Tag, 
  Hash, 
  User, 
  Phone, 
  IdCard, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  X, 
  Sparkles, 
  UserCheck, 
  Info,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { AppSettings, Customer, RentalRecord, Vehicle, VehicleType } from '../types';
import { VehicleIcon } from './VehicleIcon';
import { formatCurrency, playSoundEffect, getNextRentalNumber } from '../utils/pricing';
import { findCustomerByNic, searchCustomers, isCustomerSuspendedOrBlocked, cleanWhatsAppPhoneNumber } from '../utils/customer';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface StartRentalCardProps {
  vehicleTypes: VehicleType[];
  vehicles: Vehicle[];
  customers?: Customer[];
  activeRentals?: RentalRecord[];
  completedRentals?: RentalRecord[];
  settings: AppSettings;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onStartRental: (params: {
    vehicleTypeId: string;
    vehicleSerialNumber: string;
    customerName?: string;
    customerPhone?: string;
    customerNicPassport?: string;
    customerNotes?: string;
    depositAmount?: number;
    customStartTime?: number;
  }) => void;
  onQuickAddSerial?: (typeId: string, serial: string) => void;
}

export const StartRentalCard: React.FC<StartRentalCardProps> = ({
  vehicleTypes,
  vehicles,
  customers = [],
  activeRentals = [],
  completedRentals = [],
  settings,
  themeMode = 'dark',
  accent = 'emerald',
  onStartRental,
}) => {
  // Always start with Category and Serial Number blank
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedSerial, setSelectedSerial] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerNicPassport, setCustomerNicPassport] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [sendWelcomeWhatsApp, setSendWelcomeWhatsApp] = useState<boolean>(true);
  const [customSerialMode, setCustomSerialMode] = useState<boolean>(false);
  const [isCustomStartTime, setIsCustomStartTime] = useState<boolean>(false);
  const [customStartTimeInput, setCustomStartTimeInput] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Customer Auto-Lookup & Suggestion state
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const t = getThemeClasses(themeMode, accent);

  // Calculate today completed rentals count and amount
  const todayCompleted = useMemo(() => {
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return (completedRentals || []).filter((r) => {
      const d = new Date(r.completedAt || r.endTime || r.startTime);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return iso === todayISO;
    });
  }, [completedRentals]);

  const todayCompletedCount = todayCompleted.length;
  const todayCompletedAmount = todayCompleted.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

  // Compute upcoming rental number
  const nextRentalNumber = useMemo(() => {
    return getNextRentalNumber(activeRentals, completedRentals, settings.rentalNumberPrefix || 'REN');
  }, [activeRentals, completedRentals, settings.rentalNumberPrefix]);

  // Sorted vehicle types A-Z by Category name
  const sortedVehicleTypes = useMemo(() => {
    return [...vehicleTypes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [vehicleTypes]);

  // Set of actively rented vehicle serial numbers
  const activeRentedSerials = useMemo(() => {
    return new Set((activeRentals || []).map((r) => r.vehicleSerialNumber.toUpperCase()));
  }, [activeRentals]);

  // Available vehicles for selected type:
  // Strictly filter status === 'available' AND strictly exclude any vehicle currently in active rentals fleet and maintenance
  const availableVehicles = useMemo(() => {
    if (!selectedTypeId) return [];
    return vehicles
      .filter(
        (v) =>
          v.typeId === selectedTypeId &&
          v.status === 'available' &&
          !activeRentedSerials.has(v.serialNumber.toUpperCase())
      )
      .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber, undefined, { numeric: true, sensitivity: 'base' }));
  }, [vehicles, selectedTypeId, activeRentedSerials]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle NIC Input change and search database
  const handleNicChange = (val: string) => {
    const uppercaseVal = val.toUpperCase();
    setCustomerNicPassport(uppercaseVal);

    if (!uppercaseVal.trim()) {
      setMatchedCustomer(null);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 1. Direct exact lookup
    const foundExact = findCustomerByNic(uppercaseVal, customers);
    if (foundExact) {
      setMatchedCustomer(foundExact);
      setCustomerName(foundExact.fullName || foundExact.name || '');
      setCustomerPhone(foundExact.phone || foundExact.whatsappNumber || '');
      if (foundExact.notes) setCustomerNotes(foundExact.notes);
      setShowSuggestions(false);
      return;
    }

    // 2. Partial search for suggestions dropdown
    const matches = searchCustomers(uppercaseVal, customers);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
    setMatchedCustomer(null);
  };

  // Select a customer from suggestions or quick lookup
  const handleSelectCustomer = (customer: Customer) => {
    setCustomerNicPassport(customer.nicPassport);
    setCustomerName(customer.fullName || customer.name || '');
    setCustomerPhone(customer.phone || customer.whatsappNumber || '');
    if (customer.notes) setCustomerNotes(customer.notes);
    setMatchedCustomer(customer);
    setShowSuggestions(false);
  };

  // Clear customer fields
  const handleClearCustomer = () => {
    setCustomerNicPassport('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNotes('');
    setMatchedCustomer(null);
    setShowSuggestions(false);
  };

  const selectedType = vehicleTypes.find((t) => t.id === selectedTypeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanSerial = selectedSerial.trim().toUpperCase();

    if (!selectedTypeId) {
      setErrorMsg('Please select a vehicle category from the dropdown.');
      return;
    }

    if (!cleanSerial) {
      setErrorMsg('Please select or enter a vehicle serial number.');
      return;
    }

    // Check if vehicle is already rented
    const isCurrentlyRented = activeRentedSerials.has(cleanSerial);
    if (isCurrentlyRented) {
      setErrorMsg(`Vehicle serial "${cleanSerial}" is currently active in rental fleet!`);
      return;
    }

    const existingVehicle = vehicles.find(
      (v) => v.serialNumber.toUpperCase() === cleanSerial
    );

    if (existingVehicle && existingVehicle.status === 'rented') {
      setErrorMsg(`Vehicle serial "${cleanSerial}" is currently already active in rental!`);
      return;
    }

    if (existingVehicle && existingVehicle.status === 'maintenance') {
      setErrorMsg(`Vehicle serial "${cleanSerial}" is currently under maintenance.`);
      return;
    }

    // Verify Customer Status: Block if suspended or blocked
    if (matchedCustomer && isCustomerSuspendedOrBlocked(matchedCustomer)) {
      setErrorMsg(`Cannot start rental: Customer ${matchedCustomer.fullName || matchedCustomer.name} is currently ${matchedCustomer.status?.toUpperCase()}${matchedCustomer.statusRemark ? ` (${matchedCustomer.statusRemark})` : ''}.`);
      return;
    }

    if (settings.soundEnabled) {
      playSoundEffect('start');
    }

    const phoneToUse = customerPhone.trim() || matchedCustomer?.whatsappNumber || matchedCustomer?.phone;

    let customStartMs: number | undefined = undefined;
    if (isCustomStartTime && customStartTimeInput) {
      const parsed = new Date(customStartTimeInput).getTime();
      if (isNaN(parsed)) {
        setErrorMsg('Please enter a valid custom start date and time.');
        return;
      }
      if (parsed > Date.now() + 5 * 60 * 1000) {
        setErrorMsg('Custom start time cannot be set in the future.');
        return;
      }
      customStartMs = parsed;
    }

    onStartRental({
      vehicleTypeId: selectedTypeId,
      vehicleSerialNumber: cleanSerial,
      customerName: customerName.trim() || undefined,
      customerPhone: phoneToUse || undefined,
      customerNicPassport: customerNicPassport.trim() || undefined,
      customerNotes: customerNotes.trim() || undefined,
      depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
      customStartTime: customStartMs,
    });

    // Send automated WhatsApp Welcome Message if opted-in and phone exists
    if (sendWelcomeWhatsApp && phoneToUse) {
      try {
        const cleanPhone = cleanWhatsAppPhoneNumber(phoneToUse);
        const custName = customerName.trim() || matchedCustomer?.fullName || matchedCustomer?.name || 'Valued Customer';
        const shop = settings.businessName || 'Cycly Rent';
        const welcomeText = `Hello ${custName}! 🚴 Welcome to ${shop}. Your rental for ${cleanSerial} (${selectedType?.name || 'Vehicle'}) has started! Have a wonderful and safe ride. If you need any assistance, feel free to reply or call us.`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(welcomeText)}`, '_blank');
      } catch (err) {
        console.error('Failed to trigger WhatsApp welcome:', err);
      }
    }

    // Reset vehicle selection and customer fields back to blank
    setSelectedTypeId('');
    setSelectedSerial('');
    setCustomSerialMode(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerNicPassport('');
    setCustomerNotes('');
    setDepositAmount('');
    setMatchedCustomer(null);
    setShowSuggestions(false);
    setErrorMsg(null);
  };

  return (
    <div className={`${t.cardBg} rounded-2xl p-4 sm:p-6 border shadow-xl transition-all`}>
      
      {/* Header */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 sm:pb-4 border-b ${t.divider} mb-4 sm:mb-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md">
              <Play className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h2 className={`text-base sm:text-lg font-bold tracking-tight leading-snug ${t.textHeading}`}>
                Start New Rental
              </h2>
              <p className={`text-xs ${t.textMuted}`}>
                Select vehicle, enter customer details & start
              </p>
            </div>
          </div>

          {/* Today Completed Count & Amount in first row next to Start New Rental */}
          <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs ${t.cardSubtleBg}`}>
            <span className={`text-[11px] font-semibold ${t.textMuted}`}>Today Completed:</span>
            <span className="font-mono font-bold text-emerald-500 text-sm">
              {todayCompletedCount} {todayCompletedCount === 1 ? 'Trip' : 'Trips'}
            </span>
            <span className={`h-4 w-px border-r ${t.divider}`} />
            <span className={`text-[11px] font-semibold ${t.textMuted}`}>Today Revenue:</span>
            <span className="font-mono font-bold text-emerald-500 text-sm">
              {formatCurrency(todayCompletedAmount, settings.currencySymbol, settings.currencyPosition)}
            </span>
          </div>
        </div>

        {/* Visual Badge Indicators */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 font-mono font-bold text-xs shadow-xs" title="Upcoming rental receipt number">
            <Hash className="w-3.5 h-3.5 text-cyan-400" />
            <span>Next: #{nextRentalNumber}</span>
          </div>
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${t.badge}`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>POS Desk</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        {errorMsg && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================= STEP 1: DROPDOWN (Vehicle Type) ================= */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className={`flex items-center gap-1.5 ${t.textHeading}`}>
              <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                1
              </span>
              Vehicle Category (Dropdown)
            </span>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${t.dropdownBadge}`}>
              Dropdown Menu
            </span>
          </label>

          <div className="relative">
            <select
              id="select-vehicle-type"
              value={selectedTypeId}
              onChange={(e) => {
                setSelectedTypeId(e.target.value);
                setSelectedSerial('');
              }}
              className={`w-full rounded-xl px-4 py-3 text-xs sm:text-sm font-semibold transition appearance-none cursor-pointer pr-10 shadow-xs ${t.dropdownInput}`}
            >
              <option value="" className="bg-slate-900 text-slate-400">
                -- Select Vehicle Category --
              </option>
              {sortedVehicleTypes.map((type) => {
                const availCount = vehicles.filter(
                  (v) =>
                    v.typeId === type.id &&
                    v.status === 'available' &&
                    !activeRentedSerials.has(v.serialNumber.toUpperCase())
                ).length;
                return (
                  <option key={type.id} value={type.id} className="bg-slate-900 text-white">
                    {type.name} — ({availCount} Available in Fleet)
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-indigo-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Quick Rate Structure Banner for Selected Type */}
          {selectedType && (
            <div className={`mt-2.5 p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${t.cardSubtleBg}`}>
              <div className="flex items-center gap-2">
                <VehicleIcon type={selectedType.icon} className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className={`font-semibold ${t.textHeading}`}>{selectedType.name} Rates:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-md whitespace-nowrap font-bold">
                  1st 60m:{' '}
                  <strong>
                    {formatCurrency(selectedType.rates.firstHour, settings.currencySymbol, settings.currencyPosition)}
                  </strong>
                </span>
                <span className="bg-teal-500/10 text-teal-500 border border-teal-500/20 px-2 py-0.5 rounded-md whitespace-nowrap font-bold">
                  Every +30m:{' '}
                  <strong>
                    +{formatCurrency(selectedType.rates.every30Min ?? selectedType.rates.next30Min ?? 0, settings.currencySymbol, settings.currencyPosition)}
                  </strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ================= STEP 2: Vehicle Serial Number ================= */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${t.textHeading}`}>
              <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                2
              </span>
              Vehicle Serial Number
            </label>
            <button
              type="button"
              id="btn-toggle-custom-serial"
              onClick={() => {
                setCustomSerialMode(!customSerialMode);
                setSelectedSerial('');
              }}
              className="text-[11px] text-emerald-500 hover:underline font-semibold cursor-pointer"
            >
              {customSerialMode ? '← Pick from dropdown list' : '+ Key-in custom serial'}
            </button>
          </div>

          {!customSerialMode ? (
            <div className="relative">
              {availableVehicles.length > 0 ? (
                <>
                  <select
                    id="select-vehicle-serial"
                    value={selectedSerial}
                    onChange={(e) => setSelectedSerial(e.target.value)}
                    className={`w-full rounded-xl px-4 py-3 text-xs sm:text-sm font-mono font-bold transition appearance-none cursor-pointer pr-10 shadow-xs ${t.dropdownInput}`}
                  >
                    <option value="" className="bg-slate-900 text-slate-400">
                      -- Select Vehicle Serial Number --
                    </option>
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.serialNumber} className="bg-slate-900 text-white">
                        {v.serialNumber} {v.modelName ? `— ${v.modelName}` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-indigo-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>
                      {selectedTypeId
                        ? `No ${selectedType?.name || 'vehicle'} is currently available (checked against active fleet).`
                        : 'Please select a Vehicle Category first.'}
                    </span>
                  </div>
                  {selectedTypeId && (
                    <button
                      type="button"
                      onClick={() => setCustomSerialMode(true)}
                      className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 rounded-lg text-[11px] font-bold transition self-start sm:self-auto cursor-pointer"
                    >
                      Enter Custom Serial
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <input
                id="input-custom-serial"
                type="text"
                placeholder="e.g. BIKE-105 or MOTO-205"
                value={selectedSerial}
                onChange={(e) => setSelectedSerial(e.target.value.toUpperCase())}
                className={`w-full rounded-xl px-4 py-3 text-xs sm:text-sm font-mono font-bold uppercase pr-10 ${t.textInput}`}
                autoFocus
              />
              <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 ${t.textMuted}`}>
                <Hash className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        {/* ================= STEP 3: Customer Details ================= */}
        <div className={`space-y-3 pt-3 border-t ${t.divider}`}>
          
          {/* ================= FIND / SEARCH BAR: NIC Search (Cyan Theme) ================= */}
          <div className="relative" ref={suggestionsRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-cyan-500 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>Find Customer Search Bar (NIC / Passport)</span>
              </label>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${t.searchBadge}`}>
                Search Bar
              </span>
            </div>

            <div className="relative">
              <input
                id="input-customer-nic"
                type="text"
                placeholder="Search database by NIC or Passport (e.g. 199245102394)..."
                value={customerNicPassport}
                onChange={(e) => handleNicChange(e.target.value)}
                onFocus={() => {
                  if (customerNicPassport.trim() && !matchedCustomer) {
                    const matches = searchCustomers(customerNicPassport, customers);
                    setSuggestions(matches);
                    setShowSuggestions(matches.length > 0);
                  }
                }}
                className={`w-full rounded-xl px-4 py-2.5 text-xs font-mono uppercase focus:outline-none pr-10 ${t.searchInput}`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {matchedCustomer ? (
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Search className="w-4 h-4 text-cyan-500" />
                )}
              </div>
            </div>

            {/* Suggestions Dropdown for NIC Search */}
            {showSuggestions && suggestions.length > 0 && (
              <div className={`absolute z-30 left-0 right-0 mt-1.5 border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto divide-y ${t.modalBg} ${t.divider}`}>
                <div className={`px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider flex items-center justify-between ${t.cardSubtleBg} ${t.textMuted}`}>
                  <span>Found in Database ({suggestions.length})</span>
                  <span>Click to auto-fill</span>
                </div>
                {suggestions.map((cust) => (
                  <button
                    key={cust.id || cust.nicPassport}
                    type="button"
                    onClick={() => handleSelectCustomer(cust)}
                    className="w-full px-3 py-2.5 text-left hover:bg-cyan-500/10 transition flex items-center justify-between gap-2 group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-500">
                          {cust.nicPassport}
                        </span>
                        <span className={`text-xs font-semibold ${t.textHeading}`}>
                          {cust.name}
                        </span>
                      </div>
                      {cust.phone && (
                        <span className={`text-[11px] block mt-0.5 ${t.textMuted}`}>
                          📞 {cust.phone}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      {isCustomerSuspendedOrBlocked(cust) && (
                        <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-rose-500 text-white animate-pulse">
                          {cust.status}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${t.badge}`}>
                        {cust.totalRentalsCount ? `${cust.totalRentalsCount} trips` : 'Saved'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Matched Customer Notification Banner */}
            {matchedCustomer && (
              <div className={`mt-2 p-3 rounded-xl border space-y-2 text-xs ${
                isCustomerSuspendedOrBlocked(matchedCustomer) 
                  ? 'bg-rose-500/15 border-rose-500/50 text-rose-200' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}>
                <div className="flex items-center justify-between gap-2 border-b border-current/20 pb-2">
                  <div className="flex items-center gap-2">
                    {isCustomerSuspendedOrBlocked(matchedCustomer) ? (
                      <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                    ) : (
                      <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                    )}
                    <div>
                      <div className="font-bold flex items-center gap-1.5 text-sm text-white flex-wrap">
                        <span>{matchedCustomer.fullName || matchedCustomer.name}</span>
                        {matchedCustomer.status && (
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                            isCustomerSuspendedOrBlocked(matchedCustomer)
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {matchedCustomer.status}
                          </span>
                        )}
                        {matchedCustomer.totalRentalsCount !== undefined && (
                          <span className="text-[10px] font-normal bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                            {matchedCustomer.totalRentalsCount} past rentals
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] opacity-80 font-mono">
                        NIC: {matchedCustomer.nicPassport}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearCustomer}
                    className="px-2.5 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer transition border border-slate-700"
                  >
                    Clear
                  </button>
                </div>

                {/* Prominent Suspended/Blocked Warning Message */}
                {isCustomerSuspendedOrBlocked(matchedCustomer) && (
                  <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-black text-rose-400 text-xs">
                      <span>⚠ Warning: This customer is currently {matchedCustomer.status?.toUpperCase()}.</span>
                    </div>
                    {matchedCustomer.statusRemark && (
                      <p className="text-xs text-rose-200">
                        <span className="font-bold text-rose-300">Reason / Remark: </span>
                        {matchedCustomer.statusRemark}
                      </p>
                    )}
                    <p className="text-[11px] text-rose-400 font-semibold">
                      New rentals are blocked for this customer account.
                    </p>
                  </div>
                )}

                {/* Additional Customer Attributes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1">
                  {matchedCustomer.phone && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Mobile:</span>
                      <span className="font-mono font-medium">{matchedCustomer.phone}</span>
                    </div>
                  )}
                  {matchedCustomer.whatsappNumber && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">WhatsApp:</span>
                      <span className="font-mono font-medium">{matchedCustomer.whatsappNumber}</span>
                    </div>
                  )}
                  {matchedCustomer.dob && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">DOB:</span>
                      <span className="font-mono font-medium">{matchedCustomer.dob}</span>
                    </div>
                  )}
                  {matchedCustomer.groups && matchedCustomer.groups.length > 0 && (
                    <div className="sm:col-span-3 flex items-center gap-1 flex-wrap">
                      <span className="text-slate-400 text-[10px]">Groups:</span>
                      {matchedCustomer.groups.map((g) => (
                        <span key={g} className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[10px] font-semibold border border-slate-700">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                  {matchedCustomer.address && (
                    <div className="sm:col-span-3">
                      <span className="text-slate-400 block text-[10px]">Address:</span>
                      <span className="font-medium">{matchedCustomer.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ================= USER KEY-IN TEXTBOXES (Name, Phone, Deposit) ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Customer Name Key-in Textbox */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-semibold flex items-center gap-1 ${t.textHeading}`}>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Customer Name (Key-in)
                </label>
              </div>
              <input
                id="input-customer-name"
                type="text"
                placeholder="Type customer full name..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={`w-full rounded-xl px-3 py-2.5 text-xs ${t.textInput}`}
              />
            </div>

            {/* Customer Phone Key-in Textbox */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-semibold flex items-center gap-1 ${t.textHeading}`}>
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  Phone Number (Key-in)
                </label>
              </div>
              <input
                id="input-customer-phone"
                type="tel"
                placeholder="e.g. +94 77 123 4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={`w-full rounded-xl px-3 py-2.5 text-xs ${t.textInput}`}
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Welcome Dispatch Toggle Option */}
        {(customerPhone || matchedCustomer?.phone || matchedCustomer?.whatsappNumber) && (
          <div className="pt-2 px-1">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendWelcomeWhatsApp}
                onChange={(e) => setSendWelcomeWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Send WhatsApp Welcome & Confirmation message when rental starts</span>
              </span>
            </label>
          </div>
        )}

        {/* Custom Start Time Option */}
        <div className="pt-2 px-1">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isCustomStartTime}
              onChange={(e) => setIsCustomStartTime(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-500 bg-slate-900 border-slate-700 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Specify Custom Start Time (backdate if customer started earlier)</span>
            </span>
          </label>

          {isCustomStartTime && (
            <div className="mt-2.5 p-3 rounded-xl border border-indigo-500/40 bg-indigo-950/30 flex flex-col sm:flex-row sm:items-center gap-2.5">
              <span className="text-[11px] font-semibold text-indigo-200 shrink-0">
                Rental Started At:
              </span>
              <input
                type="datetime-local"
                value={customStartTimeInput}
                onChange={(e) => {
                  setCustomStartTimeInput(e.target.value);
                  setErrorMsg(null);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-mono ${t.textInput} flex-1`}
              />
              <span className="text-[10px] text-indigo-300/70">
                Duration will count from this time
              </span>
            </div>
          )}
        </div>

        {/* Start Rental Primary Action Button */}
        <div className="pt-2">
          {matchedCustomer && isCustomerSuspendedOrBlocked(matchedCustomer) ? (
            <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-center space-y-1">
              <span className="font-bold text-sm text-rose-300 flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Rental Restricted: Customer is {matchedCustomer.status?.toUpperCase()}</span>
              </span>
              <p className="text-xs text-rose-200">
                Cannot start rental while customer status is suspended or blocked.
              </p>
            </div>
          ) : (
            <button
              id="btn-start-rental"
              type="submit"
              disabled={!selectedSerial && !customSerialMode}
              className={`w-full py-3.5 px-4 sm:px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm sm:text-base flex items-center justify-center gap-2 sm:gap-3 transition cursor-pointer active:scale-[0.99] min-h-[48px] shadow-lg ${t.primaryBtn}`}
            >
              <Play className="w-5 h-5 fill-white shrink-0" />
              <span>Start Rental #{nextRentalNumber}</span>
              {selectedSerial && (
                <span className="font-mono text-xs bg-black/30 text-white px-2 py-0.5 rounded border border-white/20 truncate max-w-[120px]">
                  {selectedSerial}
                </span>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
