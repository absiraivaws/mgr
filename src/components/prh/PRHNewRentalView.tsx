import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  HardHat,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Printer,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import {
  PRHCustomer,
  PRHEquipment,
  PRHRental,
  PRHRentalItem,
  PRHTabType,
} from '../../types/prhTypes';
import { calculatePRHChargeableDays, generateNextPRHId } from '../../utils/prhStorage';
import { prhTheme } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';

interface PRHNewRentalViewProps {
  customers: PRHCustomer[];
  equipment: PRHEquipment[];
  rentals: PRHRental[];
  currentUserEmail: string;
  onSaveRental: (
    newRental: PRHRental,
    updatedEquipmentList: PRHEquipment[],
    newCustomer?: PRHCustomer
  ) => void;
  onNavigateTab: (tab: PRHTabType) => void;
}

export const PRHNewRentalView: React.FC<PRHNewRentalViewProps> = ({
  customers,
  equipment,
  rentals,
  currentUserEmail,
  onSaveRental,
  onNavigateTab,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Rental header state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(tomorrowStr);
  const [siteAddress, setSiteAddress] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Quick Customer Registration state
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustType, setNewCustType] = useState<'individual' | 'contractor' | 'company' | 'organization'>('contractor');
  const [newCustNic, setNewCustNic] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustWhatsapp, setNewCustWhatsapp] = useState('');
  const [newCustSameAsPhone, setNewCustSameAsPhone] = useState(true);
  const [newCustWhatsappEdited, setNewCustWhatsappEdited] = useState(false);
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustSiteAddress, setNewCustSiteAddress] = useState('');

  // Equipment Item Picker State
  const [pickerEquipmentId, setPickerEquipmentId] = useState<string>('');
  const [pickerQty, setPickerQty] = useState<number>(1);
  const [pickerSerial, setPickerSerial] = useState<string>('');
  const [pickerError, setPickerError] = useState<string>('');

  // Cart / Line items
  const [cartItems, setCartItems] = useState<
    {
      equipmentId: string;
      quantity: number;
      serialNumber?: string;
    }[]
  >([]);

  // Financial inputs
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'lankaqr' | 'bank_transfer' | 'other'>('cash');
  const [advanceAmountInput, setAdvanceAmountInput] = useState<string>('');

  // Success view state
  const [createdRental, setCreatedRental] = useState<PRHRental | null>(null);

  // Selected Customer details
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Options for customer searchable select (sorted A-Z)
  const customerOptions = useMemo<PRHOption[]>(() => {
    return customers.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.customerType})`,
      sublabel: `${c.phone} • ${c.siteAddress || c.address}`,
    }));
  }, [customers]);

  // Options for equipment searchable select (sorted A-Z)
  const equipmentOptions = useMemo<PRHOption[]>(() => {
    return equipment.map((eq) => ({
      value: eq.id,
      label: eq.name,
      sublabel: `Rs. ${eq.dailyRate}/d • Avail: ${eq.availableQty} ${eq.uom}`,
    }));
  }, [equipment]);

  // Calculate chargeable days
  const chargeableDays = useMemo(() => {
    return calculatePRHChargeableDays(startDate, expectedReturnDate, 1);
  }, [startDate, expectedReturnDate]);

  // Handle Hand Phone -> WhatsApp auto-suggest in Quick Customer Add
  const handleNewCustPhoneChange = (val: string) => {
    setNewCustPhone(val);
    if (newCustSameAsPhone && !newCustWhatsappEdited) {
      setNewCustWhatsapp(val);
    }
  };

  const handleNewCustWhatsappChange = (val: string) => {
    setNewCustWhatsapp(val);
    setNewCustWhatsappEdited(true);
    if (val !== newCustPhone) {
      setNewCustSameAsPhone(false);
    }
  };

  const handleNewCustSameToggle = (checked: boolean) => {
    setNewCustSameAsPhone(checked);
    if (checked) {
      setNewCustWhatsapp(newCustPhone);
      setNewCustWhatsappEdited(false);
    }
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert('Name and Phone Number are required.');
      return;
    }

    const nextId = generateNextPRHId(
      'PRH-CUS-',
      customers.map((c) => c.id),
      5
    );

    const newCustomer: PRHCustomer = {
      id: nextId,
      customerType: newCustType,
      name: newCustName.trim(),
      nic: newCustNic.trim() || 'N/A',
      phone: newCustPhone.trim(),
      whatsapp: newCustWhatsapp.trim() || newCustPhone.trim(),
      sameAsPhone: newCustSameAsPhone,
      address: newCustAddress.trim() || 'Pesalai',
      siteAddress: newCustSiteAddress.trim() || 'Mannar Site',
      creditLimit: 100000,
      outstandingBalance: 0,
      depositBalance: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: currentUserEmail,
    };

    customers.push(newCustomer);
    setSelectedCustomerId(newCustomer.id);
    setSiteAddress(newCustomer.siteAddress);
    setIsAddingCustomer(false);
  };

  // Add Item to Cart with Availability Validation
  const handleAddItemToCart = () => {
    setPickerError('');
    if (!pickerEquipmentId) {
      setPickerError('Please select an equipment item.');
      return;
    }

    const eq = equipment.find((e) => e.id === pickerEquipmentId);
    if (!eq) return;

    if (eq.rentalMethod === 'serial') {
      if (!pickerSerial) {
        setPickerError('Please choose a serial number for this asset.');
        return;
      }
      if (cartItems.some((it) => it.serialNumber === pickerSerial)) {
        setPickerError(`Serial ${pickerSerial} is already in your rental cart.`);
        return;
      }

      setCartItems([
        ...cartItems,
        {
          equipmentId: eq.id,
          quantity: 1,
          serialNumber: pickerSerial,
        },
      ]);
      setPickerSerial('');
    } else {
      if (pickerQty <= 0) {
        setPickerError('Quantity must be greater than zero.');
        return;
      }

      const existingQtyInCart = cartItems
        .filter((it) => it.equipmentId === eq.id)
        .reduce((sum, it) => sum + it.quantity, 0);

      const totalRequested = existingQtyInCart + pickerQty;

      if (totalRequested > eq.availableQty) {
        setPickerError(
          `Availability validation failed: Only ${eq.availableQty} ${eq.uom} of ${eq.name} currently available in depot.`
        );
        return;
      }

      const existingIndex = cartItems.findIndex((it) => it.equipmentId === eq.id && !it.serialNumber);
      if (existingIndex > -1) {
        const copy = [...cartItems];
        copy[existingIndex].quantity += pickerQty;
        setCartItems(copy);
      } else {
        setCartItems([
          ...cartItems,
          {
            equipmentId: eq.id,
            quantity: pickerQty,
          },
        ]);
      }
    }

    setPickerQty(1);
    setPickerEquipmentId('');
  };

  // Remove Item from Cart
  const handleRemoveCartItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Calculate detailed pricing for cart
  const calculatedItems = useMemo(() => {
    return cartItems.map((it) => {
      const eq = equipment.find((e) => e.id === it.equipmentId)!;
      const dailyRate = eq.dailyRate;
      const totalRental = dailyRate * it.quantity * chargeableDays;
      const totalDeposit = eq.securityDeposit * it.quantity;

      return {
        equipmentId: it.equipmentId,
        equipmentName: eq.name,
        category: eq.category,
        rentalMethod: eq.rentalMethod,
        serialNumber: it.serialNumber,
        quantity: it.quantity,
        dailyRate,
        expectedDays: chargeableDays,
        totalRental,
        totalDeposit,
        uom: eq.uom,
      };
    });
  }, [cartItems, equipment, chargeableDays]);

  const totalRentalCost = calculatedItems.reduce((acc, it) => acc + it.totalRental, 0);
  const totalDepositRequired = calculatedItems.reduce((acc, it) => acc + it.totalDeposit, 0);
  const grandTotalDue = totalRentalCost + totalDepositRequired;

  const advancePaid = advanceAmountInput !== '' ? parseFloat(advanceAmountInput) || 0 : grandTotalDue;
  const outstandingAfterAdvance = Math.max(0, grandTotalDue - advancePaid);

  // Submit and Confirm Rental
  const handleConfirmRental = () => {
    if (!selectedCustomer) {
      alert('Please select or register a customer first.');
      return;
    }

    if (calculatedItems.length === 0) {
      alert('Please add at least one equipment item to the rental.');
      return;
    }

    const nextId = generateNextPRHId(
      'PRH-RENT-',
      rentals.map((r) => r.rentalNumber),
      6
    );

    const rentalItems: PRHRentalItem[] = calculatedItems.map((it) => ({
      equipmentId: it.equipmentId,
      equipmentName: it.equipmentName,
      serialNumber: it.serialNumber,
      quantity: it.quantity,
      dailyRate: it.dailyRate,
      startDate,
      expectedReturnDate,
      chargeableDays,
      rentalAmount: it.totalRental,
      returnedQuantity: 0,
      outstandingQuantity: it.quantity,
      status: 'active',
    }));

    const newRental: PRHRental = {
      id: nextId,
      rentalNumber: nextId,
      businessUnit: 'PRH',
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      customerWhatsapp: selectedCustomer.whatsapp || selectedCustomer.phone,
      siteAddress: siteAddress || selectedCustomer.siteAddress || 'Pesalai',
      startDate,
      expectedReturnDate,
      expectedDays: chargeableDays,
      securityDepositTotal: totalDepositRequired,
      advancePayment: advancePaid,
      totalRentalAmount: totalRentalCost,
      paidAmount: advancePaid,
      outstandingAmount: outstandingAfterAdvance,
      status: 'active',
      items: rentalItems,
      paymentMethod,
      createdBy: currentUserEmail,
      createdAt: new Date().toISOString(),
      remarks: remarks.trim() || undefined,
    };

    // Update equipment stock
    const updatedEquipmentList = equipment.map((eq) => {
      const itemsOfEq = calculatedItems.filter((it) => it.equipmentId === eq.id);
      if (itemsOfEq.length === 0) return eq;

      const qtyRented = itemsOfEq.reduce((acc, it) => acc + it.quantity, 0);
      const newAvailable = Math.max(0, eq.availableQty - qtyRented);
      const newRented = eq.rentedQty + qtyRented;

      let newSerials = eq.serialUnits;
      if (eq.rentalMethod === 'serial' && eq.serialUnits) {
        const rentedSerials = itemsOfEq.map((it) => it.serialNumber);
        newSerials = eq.serialUnits.map((u) =>
          rentedSerials.includes(u.serialNumber) ? { ...u, status: 'rented' as const } : u
        );
      }

      return {
        ...eq,
        availableQty: newAvailable,
        rentedQty: newRented,
        serialUnits: newSerials,
      };
    });

    onSaveRental(newRental, updatedEquipmentList);
    setCreatedRental(newRental);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HardHat className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          New Construction Equipment Rental Contract
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Day-wise calculation: Daily Rate × Quantity × Chargeable Days. Availability validated in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer & Equipment Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Customer Selection */}
          <div className={`${prhTheme.card} p-5 space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                1. Customer & Construction Site Details
              </h2>
              <button
                type="button"
                onClick={() => setIsAddingCustomer(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-100 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Quick Register Customer
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={prhTheme.label}>
                  Select Existing Customer *
                </label>
                <PRHSearchableSelect
                  value={selectedCustomerId}
                  onChange={(id) => {
                    setSelectedCustomerId(id);
                    const c = customers.find((cust) => cust.id === id);
                    if (c) setSiteAddress(c.siteAddress);
                  }}
                  options={customerOptions}
                  placeholder="Type to search customer or contractor..."
                  searchPlaceholder="Search by name, phone, site..."
                  autoSortAZ={true}
                />
              </div>

              <div>
                <label className={prhTheme.label}>
                  Construction Site Address *
                </label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="e.g. Commercial Plaza, Main St, Pesalai"
                  className={prhTheme.input}
                />
              </div>
            </div>

            {selectedCustomer && (
              <div className={`${prhTheme.cardSubtle} p-3.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3`}>
                <div>
                  <span className="text-slate-400 text-[11px] block">Customer ID</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{selectedCustomer.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Phone / Mobile</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedCustomer.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">WhatsApp</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedCustomer.whatsapp || selectedCustomer.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Security Deposit Held</span>
                  <span className="font-bold text-slate-900 dark:text-white">Rs. {selectedCustomer.depositBalance.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Rental Dates & Chargeable Days */}
          <div className={`${prhTheme.card} p-5 space-y-4`}>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              2. Rental Duration & Chargeable Days
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <label className={prhTheme.label}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={prhTheme.input}
                />
              </div>

              <div>
                <label className={prhTheme.label}>
                  Expected Return Date *
                </label>
                <input
                  type="date"
                  value={expectedReturnDate}
                  min={startDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className={prhTheme.input}
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-center">
                <span className="text-[11px] text-blue-700 dark:text-blue-300 block font-semibold">Total Chargeable Days</span>
                <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                  {chargeableDays} {chargeableDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Equipment Cart / Picker */}
          <div className={`${prhTheme.card} p-5 space-y-4`}>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HardHat className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              3. Equipment Items & Availability Validation
            </h2>

            {/* Picker Box */}
            <div className={`${prhTheme.cardSubtle} p-4 space-y-3`}>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-6">
                  <label className={prhTheme.label}>
                    Select Equipment Item *
                  </label>
                  <PRHSearchableSelect
                    value={pickerEquipmentId}
                    onChange={(val) => {
                      setPickerEquipmentId(val);
                      setPickerError('');
                    }}
                    options={equipmentOptions}
                    placeholder="Type to search equipment (A-Z)..."
                    searchPlaceholder="Search equipment item..."
                    autoSortAZ={true}
                  />
                </div>

                {pickerEquipmentId &&
                  equipment.find((e) => e.id === pickerEquipmentId)?.rentalMethod === 'serial' ? (
                  <div className="sm:col-span-4">
                    <label className={prhTheme.label}>
                      Select Available Serial # *
                    </label>
                    <select
                      value={pickerSerial}
                      onChange={(e) => setPickerSerial(e.target.value)}
                      className={prhTheme.select}
                    >
                      <option value="">-- Choose Serial # --</option>
                      {equipment
                        .find((e) => e.id === pickerEquipmentId)
                        ?.serialUnits?.filter((u) => u.status === 'available')
                        .map((u) => (
                          <option key={u.serialNumber} value={u.serialNumber}>
                            Unit {u.serialNumber} (Available)
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="sm:col-span-4">
                    <label className={prhTheme.label}>
                      Quantity to Rent *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={pickerQty}
                      onChange={(e) => setPickerQty(parseInt(e.target.value, 10) || 1)}
                      className={prhTheme.input}
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddItemToCart}
                    className={prhTheme.btnSuccess}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>

              {pickerError && (
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-medium pt-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pickerError}</span>
                </div>
              )}
            </div>

            {/* Cart Table */}
            {calculatedItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No equipment added yet. Select items above to calculate daily rental and deposit.
              </div>
            ) : (
              <div className={prhTheme.tableContainer}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={prhTheme.tableHeader}>
                        <th className="py-2.5 px-3">Equipment</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Daily Rate</th>
                        <th className="py-2.5 px-3 text-center">Days</th>
                        <th className="py-2.5 px-3 text-right">Rental Total</th>
                        <th className="py-2.5 px-3 text-right">Deposit</th>
                        <th className="py-2.5 px-3 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {calculatedItems.map((item, idx) => (
                        <tr key={idx} className={prhTheme.tableRow}>
                          <td className="py-2.5 px-3 break-words whitespace-normal max-w-xs">
                            <div className="font-bold text-slate-900 dark:text-white">{item.equipmentName}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {item.rentalMethod === 'serial'
                                ? `Serial: ${item.serialNumber}`
                                : `Category: ${item.category}`}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            Rs. {item.dailyRate}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                            {item.expectedDays}d
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            Rs. {item.totalRental.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            Rs. {item.totalDeposit.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleRemoveCartItem(idx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Summary & Payment */}
        <div className="space-y-6">
          <div className={`${prhTheme.card} p-5 space-y-4`}>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Rental Contract Summary</h2>

            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 dark:text-slate-400">Equipment Line Items:</span>
                <span className="font-bold text-slate-900 dark:text-white">{calculatedItems.length} items</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500 dark:text-slate-400">Rental Total ({chargeableDays} days):</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                  Rs. {totalRentalCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500 dark:text-slate-400">Security Deposit Required:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                  Rs. {totalDepositRequired.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-bold text-slate-900 dark:text-white">
                <span>Grand Total Due:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                  Rs. {grandTotalDue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Collection */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div>
                <label className={prhTheme.label}>
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className={prhTheme.select}
                >
                  <option value="cash">Cash Payment</option>
                  <option value="bank_transfer">Bank Transfer (Commercial / BOC)</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="lankaqr">LankaQR</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className={prhTheme.label}>
                  Advance Paid Amount (Rs.)
                </label>
                <input
                  type="number"
                  value={advanceAmountInput}
                  onChange={(e) => setAdvanceAmountInput(e.target.value)}
                  placeholder={`Default: Rs. ${grandTotalDue.toLocaleString()}`}
                  className={prhTheme.input}
                />
              </div>

              {outstandingAfterAdvance > 0 && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-200 flex justify-between">
                  <span>Balance Outstanding:</span>
                  <span className="font-bold font-mono">Rs. {outstandingAfterAdvance.toLocaleString()}</span>
                </div>
              )}

              <div>
                <label className={prhTheme.label}>
                  Contract Remarks / Site Notes
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional site delivery notes or specific instructions..."
                  className={prhTheme.input}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={calculatedItems.length === 0 || !selectedCustomer}
              onClick={handleConfirmRental}
              className={`w-full py-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                calculatedItems.length === 0 || !selectedCustomer
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : prhTheme.btnPrimary
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Rental & Generate Agreement
            </button>
          </div>
        </div>
      </div>

      {/* Quick Customer Modal */}
      {isAddingCustomer && (
        <div className={prhTheme.modalBackdrop}>
          <div className={`${prhTheme.modal} max-w-lg w-full p-6 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Quick Register Customer / Contractor
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingCustomer(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Customer Type *</label>
                  <select
                    value={newCustType}
                    onChange={(e) => setNewCustType(e.target.value as any)}
                    className={prhTheme.select}
                  >
                    <option value="contractor">Contractor</option>
                    <option value="company">Construction Company</option>
                    <option value="individual">Individual</option>
                    <option value="organization">Organization</option>
                  </select>
                </div>
                <div>
                  <label className={prhTheme.label}>NIC / Reg Number</label>
                  <input
                    type="text"
                    value={newCustNic}
                    onChange={(e) => setNewCustNic(e.target.value)}
                    placeholder="e.g. 198425102345"
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div>
                <label className={prhTheme.label}>Full Name / Contractor Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Anton Silva"
                  className={prhTheme.input}
                />
              </div>

              {/* Hand Phone and WhatsApp Behaviour */}
              <div className={`${prhTheme.cardSubtle} p-3.5 space-y-2.5`}>
                <div>
                  <label className={prhTheme.label}>Hand Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newCustPhone}
                    onChange={(e) => handleNewCustPhoneChange(e.target.value)}
                    placeholder="e.g. 0771234567"
                    className={prhTheme.input}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={prhTheme.label}>WhatsApp Number *</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-blue-600 dark:text-blue-400">
                      <input
                        type="checkbox"
                        checked={newCustSameAsPhone}
                        onChange={(e) => handleNewCustSameToggle(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Same as Hand Phone</span>
                    </label>
                  </div>
                  <input
                    type="tel"
                    value={newCustWhatsapp}
                    onChange={(e) => handleNewCustWhatsappChange(e.target.value)}
                    placeholder="e.g. 0771234567"
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Permanent Address</label>
                  <input
                    type="text"
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    placeholder="e.g. Main St, Pesalai"
                    className={prhTheme.input}
                  />
                </div>
                <div>
                  <label className={prhTheme.label}>Construction Site Address *</label>
                  <input
                    type="text"
                    required
                    value={newCustSiteAddress}
                    onChange={(e) => setNewCustSiteAddress(e.target.value)}
                    placeholder="e.g. Pesalai Pier Works"
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(false)}
                  className={prhTheme.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={prhTheme.btnPrimary}
                >
                  Register & Use
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract Created / Printable Agreement Modal */}
      {createdRental && (
        <div className={prhTheme.modalBackdrop}>
          <div className={`${prhTheme.modal} max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Contract #{createdRental.rentalNumber} Created Successfully
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreatedRental(null);
                  onNavigateTab('prh-active-rentals');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 text-xs space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="font-extrabold text-slate-900 dark:text-white text-base">Pesalai Rental Hub (PRH)</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Construction Equipment & Scaffolding Rentals</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{createdRental.rentalNumber}</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Date: {createdRental.startDate}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Contractor / Customer</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{createdRental.customerName}</div>
                  <div className="text-slate-600 dark:text-slate-300 font-mono">{createdRental.customerPhone}</div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Construction Site Location</div>
                  <div className="text-slate-900 dark:text-white">{createdRental.siteAddress}</div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={prhTheme.tableHeader}>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Daily Rate</th>
                      <th className="py-2 px-3 text-right">Days</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {createdRental.items.map((it, idx) => (
                      <tr key={idx} className={prhTheme.tableRow}>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white break-words">{it.equipmentName}</td>
                        <td className="py-2 px-3 text-center font-mono">{it.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">Rs. {it.dailyRate}</td>
                        <td className="py-2 px-3 text-right font-mono">{it.chargeableDays}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                          Rs. {it.rentalAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1 text-slate-500 dark:text-slate-400 text-[11px]">
                  <div>Deposit Held: <strong className="text-slate-900 dark:text-white">Rs. {createdRental.securityDepositTotal.toLocaleString()}</strong></div>
                  <div>Payment Method: <strong className="text-slate-900 dark:text-white uppercase">{createdRental.paymentMethod}</strong></div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-slate-500 dark:text-slate-400">Advance Paid: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">Rs. {createdRental.paidAmount.toLocaleString()}</strong></div>
                  <div className="text-slate-500 dark:text-slate-400">Balance Due: <strong className="text-rose-600 dark:text-rose-400 font-mono">Rs. {createdRental.outstandingAmount.toLocaleString()}</strong></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className={prhTheme.btnSecondary}
              >
                <Printer className="w-4 h-4" />
                Print Agreement Copy
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreatedRental(null);
                  onNavigateTab('prh-active-rentals');
                }}
                className={prhTheme.btnPrimary}
              >
                Go to Active Rentals Tracker →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
