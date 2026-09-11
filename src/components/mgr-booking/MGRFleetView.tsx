/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Car,
  Bus,
  Ship,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  Wind,
  ShieldCheck,
  Search,
  X,
  Compass,
  Eye,
  Edit2,
  Trash2,
  Lock,
  DollarSign,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Upload,
  CalendarDays,
  Image as ImageIcon,
} from 'lucide-react';
import {
  TransportVehicle,
  TransportType,
  DriverOption,
  TransportOwner,
  VehicleBookingType,
  VehicleScheduleItem,
} from '../../types/mgrBooking';
import { UserAccount } from '../../utils/auth';
import { formatVehicleCode } from '../../utils/mgrUniqueId';

interface MGRFleetViewProps {
  vehicles: TransportVehicle[];
  owners: TransportOwner[];
  currentUser?: UserAccount;
  onAddVehicle: (newVehicle: TransportVehicle) => void;
  onUpdateStatus: (vehicleId: string, status: TransportVehicle['status']) => void;
  onEditVehicle?: (vehicle: TransportVehicle) => void;
  onDeleteVehicle?: (vehicleId: string) => void;
  isAdmin?: boolean;
  themeMode?: 'dark' | 'light';
}

export const MGRFleetView: React.FC<MGRFleetViewProps> = ({
  vehicles,
  owners,
  currentUser,
  onAddVehicle,
  onUpdateStatus,
  onEditVehicle,
  onDeleteVehicle,
  isAdmin = false,
  themeMode = 'light',
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);

  // View modal state
  const [viewingVehicle, setViewingVehicle] = useState<TransportVehicle | null>(null);

  // Edit modal state
  const [editingVehicle, setEditingVehicle] = useState<TransportVehicle | null>(null);

  // Availability modal state (Requirement 3, 4, 5)
  const [availabilityVehicle, setAvailabilityVehicle] = useState<TransportVehicle | null>(null);
  const [tempTripDates, setTempTripDates] = useState<string[]>([]);
  const [tempSchedules, setTempSchedules] = useState<VehicleScheduleItem[]>([]);
  const [calMonthOffset, setCalMonthOffset] = useState<number>(0);

  // New Schedule Date Form Inputs
  const [schedDate, setSchedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [schedFrom, setSchedFrom] = useState<string>('Mannar');
  const [schedTo, setSchedTo] = useState<string>('Jaffna');
  const [schedStartTime, setSchedStartTime] = useState<string>('06:00 AM');
  const [schedEndTime, setSchedEndTime] = useState<string>('09:30 AM');
  const [schedTotalSeats, setSchedTotalSeats] = useState<number>(12);
  const [schedReservedSeats, setSchedReservedSeats] = useState<number>(0);
  const [schedAvailSeats, setSchedAvailSeats] = useState<number>(12);
  const [schedPricePerSeat, setSchedPricePerSeat] = useState<number>(1200);

  // Delete confirmation modal state (Requirement 11)
  const [deletingVehicle, setDeletingVehicle] = useState<TransportVehicle | null>(null);

  // New vehicle form state
  const [newBookingType, setNewBookingType] = useState<VehicleBookingType>('trip');
  const [newType, setNewType] = useState<TransportType>('van');
  const [newOwnerId, setNewOwnerId] = useState(owners[0]?.id || 'OWN-MGR-00001');
  const [newRegNumber, setNewRegNumber] = useState('');
  const [newMake, setNewMake] = useState('Toyota');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState(2022);
  const [newColor, setNewColor] = useState('White');
  const [newHasAC, setNewHasAC] = useState(true);
  const [newTotalSeats, setNewTotalSeats] = useState(12);
  const [newDriverOption, setNewDriverOption] = useState<DriverOption>('with_driver');
  const [newOneDayPrice, setNewOneDayPrice] = useState(28000);
  const [newBasePrice, setNewBasePrice] = useState(24000);
  const [newPricePerSeat, setNewPricePerSeat] = useState<number | undefined>(2000);
  const [newDescription, setNewDescription] = useState('');
  const [newInsuranceExpiry, setNewInsuranceExpiry] = useState('2027-06-30');
  const [newRevenueLicenceExpiry, setNewRevenueLicenceExpiry] = useState('2027-06-30');

  // Boat specific inputs
  const [newBoatName, setNewBoatName] = useState('');
  const [newDeparturePoint, setNewDeparturePoint] = useState('Thalaimannar Pier');
  const [newDestination, setNewDestination] = useState("Adam's Bridge Sandbanks");
  const [newLifeJackets, setNewLifeJackets] = useState(true);

  // Up to 5 Vehicle / Boat Photos State (Requirement 2)
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [photoUrlInput, setPhotoUrlInput] = useState<string>('');

  const handleFileImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - newPhotos.length;
    if (remainingSlots <= 0) {
      alert('You can upload a maximum of 5 images per vehicle or boat.');
      return;
    }

    const countToRead = Math.min(files.length, remainingSlots);
    for (let i = 0; i < countToRead; i++) {
      const file = files[i];
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewPhotos(prev => {
            if (prev.length >= 5) return prev;
            return [...prev, reader.result as string];
          });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAddPhotoUrl = () => {
    if (!photoUrlInput.trim()) return;
    if (newPhotos.length >= 5) {
      alert('Maximum of 5 images allowed per vehicle or boat.');
      return;
    }
    setNewPhotos(prev => [...prev, photoUrlInput.trim()]);
    setPhotoUrlInput('');
  };

  const handleRemovePhoto = (index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'maintenance'>('all');
  const [sortColumn, setSortColumn] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const userEmail = (currentUser?.email || '').toLowerCase();
  const userName = (currentUser?.name || '').toLowerCase();
  const userPhone = (currentUser?.phone || '').trim();

  const currentOwner = owners.find(
    o => (o.email && o.email.toLowerCase() === userEmail) ||
         (o.fullName && o.fullName.toLowerCase() === userName) ||
         (userPhone && (o.mobileNumber === userPhone || o.whatsappNumber === userPhone))
  );
  const currentOwnerId = currentOwner ? currentOwner.id : (currentUser?.id || null);

  const filteredVehicles = vehicles.filter(v => {
    // Role-based visibility: If not admin, only show vehicles owned by the logged-in owner
    if (!isAdmin) {
      const isMine = (currentOwnerId && v.ownerId === currentOwnerId) ||
                     (v.ownerName && v.ownerName.toLowerCase() === userName) ||
                     (v.ownerId && currentUser?.id && v.ownerId === currentUser.id);
      if (!isMine) return false;
    }

    if (statusFilter !== 'all' && v.status !== statusFilter) return false;

    let matchesType = false;
    if (selectedType === 'all') {
      matchesType = true;
    } else if (selectedType === 'bus') {
      matchesType = v.type === 'bus' || v.type === 'bus_trip' || v.type === 'route_bus';
    } else {
      matchesType = v.type === selectedType;
    }

    const matchesSearch =
      v.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.ownerName && v.ownerName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    let valA: any = (a as any)[sortColumn];
    let valB: any = (b as any)[sortColumn];

    if (sortColumn === 'price') {
      valA = a.oneDayPrice || a.basePrice || 0;
      valB = b.oneDayPrice || b.basePrice || 0;
    }

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedVehicles.length / pageSize));
  const paginatedVehicles = sortedVehicles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const checkExpiryWarning = (dateStr: string) => {
    const expiry = new Date(dateStr).getTime();
    const now = Date.now();
    const daysRemaining = Math.floor((expiry - now) / (1000 * 3600 * 24));
    if (daysRemaining < 0) return { status: 'expired', label: 'Expired', class: 'bg-rose-100 text-rose-800 border-rose-200' };
    if (daysRemaining < 45) return { status: 'expiring_soon', label: `Expires in ${daysRemaining}d`, class: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { status: 'valid', label: 'Valid', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegNumber || !newMake || !newModel) return;

    const matchedOwner = owners.find(o => o.id === newOwnerId);
    const ownerIdToUse = !isAdmin ? (currentOwnerId || newOwnerId) : newOwnerId;
    const ownerNameToUse = !isAdmin ? (currentOwner?.fullName || currentUser?.name || 'My Fleet') : (matchedOwner?.fullName || 'Registered Owner');

    const idPrefix =
      newType === 'car'
        ? 'MGR-CAR'
        : newType === 'van'
        ? 'MGR-VAN'
        : newType === 'bus_trip' || newType === 'route_bus' || newType === 'bus'
        ? 'MGR-BUS'
        : newType === 'safari'
        ? 'MGR-SAFARI'
        : 'MGR-BOAT';

    const newVehicle: TransportVehicle = {
      id: `${idPrefix}-${Math.floor(10000 + Math.random() * 90000)}`,
      ownerId: ownerIdToUse,
      ownerName: ownerNameToUse,
      type: newType,
      registrationNumber: newRegNumber,
      make: newMake,
      model: newModel,
      year: Number(newYear),
      color: newColor,
      hasAC: newHasAC,
      totalSeats: Number(newTotalSeats),
      driverOption: newDriverOption,
      description: newDescription || `${newMake} ${newModel} passenger transport service.`,
      photos: newPhotos,
      insuranceExpiry: newInsuranceExpiry,
      revenueLicenceExpiry: newRevenueLicenceExpiry,
      status: isAdmin ? 'active' : 'pending', // Pending admin approval when added by owner!
      bookingType: newBookingType,
      availableDates: [],
      schedules: [],
      oneDayPrice: Number(newOneDayPrice),
      basePrice: Number(newBasePrice),
      pricingMethod: newType === 'route_bus' || newType === 'boat' ? 'per_seat' : 'fixed',
      pricePerSeat: newPricePerSeat ? Number(newPricePerSeat) : undefined,
      boatDetails: newType === 'boat' ? {
        boatName: newBoatName || newModel,
        boatType: 'tour',
        departurePoint: newDeparturePoint,
        destination: newDestination,
        lifeJacketsAvailable: newLifeJackets,
        safetyCertificateExpiry: '2027-06-30',
      } : undefined,
      bids: [],
      rating: 5.0,
      tripsCount: 0,
      createdAt: Date.now(),
    };

    onAddVehicle(newVehicle);
    setIsAddingVehicle(false);
    setNewPhotos([]);
    setPhotoUrlInput('');
    setNewBookingType('trip');
  };

  const handleOpenAvailability = (vehicle: TransportVehicle) => {
    setAvailabilityVehicle(vehicle);
    setTempTripDates(vehicle.availableDates ? [...vehicle.availableDates] : []);
    setTempSchedules(vehicle.schedules ? [...vehicle.schedules] : []);
    const totSeats = vehicle.totalSeats || 12;
    setSchedTotalSeats(totSeats);
    setSchedReservedSeats(0);
    setSchedAvailSeats(totSeats);
    setSchedPricePerSeat(vehicle.pricePerSeat || 1200);
    setCalMonthOffset(0);
  };

  const handleToggleTripDate = (dateStr: string) => {
    // Cross-Type Date Conflict Validation (MD Section 6):
    // Check if vehicle is already scheduled for a Planned Trip on this date
    if (availabilityVehicle?.schedules && availabilityVehicle.schedules.some(s => s.date === dateStr)) {
      alert(`This vehicle is already listed as a Planned Trip Schedule for ${dateStr}. Please remove or change the schedule before setting Vehicle Available for this date.`);
      return;
    }

    setTempTripDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr].sort();
      }
    });
  };

  const handleSaveTripAvailability = () => {
    if (!availabilityVehicle || !onEditVehicle) return;
    const updated: TransportVehicle = {
      ...availabilityVehicle,
      availableDates: tempTripDates,
    };
    onEditVehicle(updated);
    setAvailabilityVehicle(null);
  };

  const handleAddScheduleDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedDate || !schedFrom || !schedTo) {
      alert('Please fill in Date, Starting Location, and Ending Location.');
      return;
    }

    // Cross-Type Date Conflict Validation (MD Section 6):
    // 1. Check if vehicle is already listed as Vehicle Available for this date
    if (availabilityVehicle?.availableDates && availabilityVehicle.availableDates.includes(schedDate)) {
      alert(`This vehicle is already listed as Vehicle Available for ${schedDate}. Please remove or change the existing availability before creating a Planned Trip for this date.`);
      return;
    }

    // 2. Prevent duplicate schedule for same vehicle + same date
    if (tempSchedules.some(s => s.date === schedDate)) {
      alert(`A Planned Trip Schedule is already registered for this vehicle on ${schedDate}. Duplicate trips on the same date for the same vehicle are not allowed.`);
      return;
    }

    const allSeats = Number(availabilityVehicle?.totalSeats || schedTotalSeats);
    const reserved = Number(schedReservedSeats || 0);
    const available = Math.max(0, allSeats - reserved);

    const newSchedule: VehicleScheduleItem = {
      id: `SCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: schedDate,
      fromLocation: schedFrom,
      startTime: schedStartTime,
      toLocation: schedTo,
      endTime: schedEndTime,
      totalSeats: allSeats,
      reservedSeats: reserved,
      availableSeats: available,
      pricePerSeat: Number(schedPricePerSeat),
      createdAt: Date.now(),
    };
    setTempSchedules(prev => [newSchedule, ...prev]);
  };

  const handleRemoveScheduleDate = (id: string) => {
    setTempSchedules(prev => prev.filter(s => s.id !== id));
  };

  const handleSaveScheduleAvailability = () => {
    if (!availabilityVehicle || !onEditVehicle) return;
    const updated: TransportVehicle = {
      ...availabilityVehicle,
      schedules: tempSchedules,
    };
    onEditVehicle(updated);
    setAvailabilityVehicle(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle || !onEditVehicle) return;
    onEditVehicle(editingVehicle);
    setEditingVehicle(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingVehicle) return;
    if (onDeleteVehicle) {
      onDeleteVehicle(deletingVehicle.id);
    }
    setDeletingVehicle(null);
  };

  const handleDelete = (vehicleId: string, regNumber: string) => {
    if (!isAdmin) {
      alert('Only administrators can delete vehicle records.');
      return;
    }
    if (confirm(`Are you sure you want to delete vehicle ${regNumber}? This action cannot be undone.`)) {
      if (onDeleteVehicle) {
        onDeleteVehicle(vehicleId);
      }
    }
  };

  const getTypeLabel = (type: TransportType) => {
    switch (type) {
      case 'bus_trip':
        return { label: 'Bus for Trip (Whole)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'route_bus':
        return { label: 'Route Bus (Schedule)', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'safari':
        return { label: 'Safari 4x4 Jeep', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'van':
        return { label: 'Passenger Van', color: 'bg-teal-100 text-teal-800 border-teal-300' };
      case 'car':
        return { label: 'Sedan / Car', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'boat':
        return { label: 'Boat Service', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' };
      default:
        return { label: type, color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  return (
    <div className="space-y-4">


      {/* Controls Bar: Search, Category Pills, Status Tabs & Add Transport */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search fleet by reg #, model, make, or owner..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Category Filter Dropdown List */}
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-bold text-slate-600">Category:</label>
            <select
              value={selectedType}
              onChange={e => { setSelectedType(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 shadow-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Fleet Types</option>
              <option value="car">Cars</option>
              <option value="van">Vans</option>
              <option value="bus_trip">Bus for Trip</option>
              <option value="route_bus">Route Bus</option>
              <option value="safari">Safari 4x4</option>
              <option value="boat">Boats</option>
            </select>
          </div>

          {/* Add Transport Button */}
          <button
            type="button"
            onClick={() => setIsAddingVehicle(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle / Boat</span>
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all' as const, label: 'All Fleet', count: vehicles.length },
            { id: 'active' as const, label: 'Approved & Active', count: vehicles.filter(v => v.status === 'active').length },
            { id: 'pending' as const, label: 'Pending Approval', count: vehicles.filter(v => v.status === 'pending').length },
            { id: 'maintenance' as const, label: 'Maintenance', count: vehicles.filter(v => v.status === 'maintenance').length },
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setStatusFilter(s.id); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === s.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{s.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === s.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 font-semibold'
              }`}>
                {s.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Table Format */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4">Unique Number</th>
              <th onClick={() => handleSort('registrationNumber')} className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                <div className="flex items-center gap-1.5">
                  <span>Reg # & Type</span>
                  {sortColumn === 'registrationNumber' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th onClick={() => handleSort('make')} className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                <div className="flex items-center gap-1.5">
                  <span>Vehicle Details</span>
                  {sortColumn === 'make' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th onClick={() => handleSort('ownerName')} className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                <div className="flex items-center gap-1.5">
                  <span>Owner / Operator</span>
                  {sortColumn === 'ownerName' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th onClick={() => handleSort('totalSeats')} className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                <div className="flex items-center gap-1.5">
                  <span>Capacity & AC</span>
                  {sortColumn === 'totalSeats' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th onClick={() => handleSort('price')} className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                <div className="flex items-center gap-1.5">
                  <span>1-Day Price</span>
                  {sortColumn === 'price' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th className="py-3.5 px-4">Doc Status</th>
              <th onClick={() => handleSort('status')} className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none">
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {sortColumn === 'status' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-600" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>
              <th className="py-3.5 px-4 text-center">Booking Type</th>
              <th className="py-3.5 px-4 text-center">Availability</th>
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedVehicles.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500">
                  No vehicles found matching the filter criteria.
                </td>
              </tr>
            ) : (
              paginatedVehicles.map((vehicle, vIdx) => {
                const insAlert = checkExpiryWarning(vehicle.insuranceExpiry);
                const revAlert = checkExpiryWarning(vehicle.revenueLicenceExpiry);
                const typeInfo = getTypeLabel(vehicle.type);
                const oneDayRate = vehicle.oneDayPrice || vehicle.basePrice || 25000;
                const uniqueCode = formatVehicleCode((currentPage - 1) * pageSize + vIdx + 1, vehicle.id);

                return (
                  <tr key={vehicle.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Unique Number */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        {uniqueCode}
                      </span>
                    </td>

                    {/* Reg # & Type */}
                    <td className="py-3 px-4 break-words">
                      <div className="font-mono font-bold text-slate-900 break-words">{vehicle.registrationNumber}</div>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>

                    {/* Make & Model */}
                    <td className="py-3 px-4 break-words">
                      <div className="font-semibold text-slate-800 break-words">
                        {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-[11px] text-slate-500 break-words">
                        {vehicle.year} • {vehicle.color}
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-3 px-4 break-words">
                      <div className="font-medium text-slate-800 break-words">{vehicle.ownerName || 'Verified Owner'}</div>
                      <span className="font-mono text-[10px] text-slate-400 break-words">{vehicle.ownerId}</span>
                    </td>

                    {/* Capacity & AC */}
                    <td className="py-3 px-4 break-words">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{vehicle.totalSeats} Seats</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 break-words">
                        {vehicle.hasAC ? 'AC' : 'Non-AC'} • {vehicle.driverOption === 'with_driver' ? 'With Driver' : vehicle.driverOption === 'both' ? 'Discuss' : 'Self-Drive'}
                      </div>
                    </td>

                    {/* One Day Vehicle Price */}
                    <td className="py-3 px-4 break-words">
                      <div className="font-extrabold text-emerald-700 text-xs">
                        Rs. {oneDayRate.toLocaleString()}
                      </div>
                      <span className="text-[10px] text-slate-400 block">/ Day (Fixed)</span>
                    </td>

                    {/* Doc Status */}
                    <td className="py-3 px-4 break-words">
                      <div className="space-y-1">
                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${insAlert.class}`}>
                          Ins: {insAlert.label}
                        </span>
                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border ${revAlert.class}`}>
                          Rev: {revAlert.label}
                        </span>
                      </div>
                    </td>

                    {/* Status with Admin Approval button */}
                    <td className="py-3 px-4 break-words">
                      <div className="flex items-center gap-2">
                        {vehicle.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending Approval
                          </span>
                        ) : (
                          <select
                            value={vehicle.status}
                            onChange={e => onUpdateStatus(vehicle.id, e.target.value as TransportVehicle['status'])}
                            className={`text-xs font-bold px-2 py-1 rounded-lg border bg-white cursor-pointer focus:outline-none ${
                              vehicle.status === 'active'
                                ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                                : vehicle.status === 'maintenance'
                                ? 'text-amber-700 border-amber-300 bg-amber-50'
                                : 'text-rose-700 border-rose-300 bg-rose-50'
                            }`}
                          >
                            <option value="active">Active / Approved</option>
                            <option value="pending">Pending Approval</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        )}
                        {/* Admin 1-Click Approve button */}
                        {vehicle.status === 'pending' && isAdmin && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(vehicle.id, 'active')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                            title="Admin: Approve this vehicle to make it active and bookable"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Booking Type (Requirement 1 & 3) */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                        vehicle.bookingType === 'schedule'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {vehicle.bookingType === 'schedule' ? 'Schedule' : 'Trip'}
                      </span>
                    </td>

                    {/* Availability Calendar (Requirement 3, 4, 5) */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenAvailability(vehicle)}
                        title={`Configure ${vehicle.bookingType === 'schedule' ? 'Schedule' : 'Trip'} Availability`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 shadow-xs text-xs font-bold transition cursor-pointer"
                      >
                        <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {vehicle.bookingType === 'schedule'
                            ? `${(vehicle.schedules || []).length} Dates`
                            : `${(vehicle.availableDates || []).length} Days`}
                        </span>
                      </button>
                    </td>

                    {/* Actions: View, Edit, Delete */}
                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => setViewingVehicle(vehicle)}
                          title="View Vehicle Specs"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Button (Admin, or Owner if pending) */}
                        {isAdmin || vehicle.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => setEditingVehicle(vehicle)}
                            title={isAdmin ? "Edit Vehicle (Admin)" : "Edit Pending Vehicle"}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            title="Edit locked once verified/approved"
                            className="p-1.5 text-slate-300 cursor-not-allowed inline-flex"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}

                        {/* Delete Button (Admin Only with Confirmation) */}
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => setDeletingVehicle(vehicle)}
                            title="Delete Vehicle (Admin Only)"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            title="Delete restricted to Admin"
                            className="p-1.5 text-slate-300 cursor-not-allowed inline-flex"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar (Max 20 rows per page) */}
        {sortedVehicles.length > 0 && (
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(currentPage * pageSize, sortedVehicles.length)}</span> of{' '}
              <span className="font-bold text-slate-900">{sortedVehicles.length}</span> vehicles
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition cursor-pointer"
              >
                Previous
              </button>
              <div className="px-2 font-bold text-slate-800">
                Page {currentPage} of {totalPages}
              </div>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW VEHICLE MODAL (Displaying ALL details without omitting) */}
      {viewingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800">
                  {formatVehicleCode(1, viewingVehicle.id)}
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {viewingVehicle.registrationNumber}
                </span>
                <span className="capitalize font-bold text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {viewingVehicle.type.replace('_', ' ')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingVehicle(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vehicle Photos Gallery */}
            {viewingVehicle.photos && viewingVehicle.photos.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicle Photos ({viewingVehicle.photos.length})</span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {viewingVehicle.photos.map((photo, pIdx) => (
                    <img
                      key={pIdx}
                      src={photo}
                      alt={`${viewingVehicle.make} ${pIdx + 1}`}
                      className="w-24 h-16 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {/* Make, Model, Year, Rates */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {viewingVehicle.make} {viewingVehicle.model} ({viewingVehicle.year})
                  </h3>
                  <span className="text-[11px] text-slate-600">
                    Color: <strong>{viewingVehicle.color}</strong> • Fuel: <strong className="capitalize">{viewingVehicle.fuelType || 'Diesel'}</strong>
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-emerald-800">
                    Rs. {(viewingVehicle.oneDayPrice || viewingVehicle.basePrice).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">/ Day (Fixed)</span>
                </div>
              </div>

              {/* Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Seats</span>
                  <strong className="text-slate-800">{viewingVehicle.totalSeats} Passengers</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Driver Option</span>
                  <strong className="text-slate-800 capitalize">
                    {viewingVehicle.driverOption === 'both' ? 'Discuss' : viewingVehicle.driverOption.replace('_', ' ')}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Air Conditioning</span>
                  <strong className="text-slate-800">{viewingVehicle.hasAC ? 'Yes (AC)' : 'Non-AC'}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Booking Mode</span>
                  <strong className="text-indigo-700 capitalize">{viewingVehicle.bookingType || 'trip'}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <strong className="capitalize text-slate-800">{viewingVehicle.status.replace('_', ' ')}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Luggage Capacity</span>
                  <strong className="text-slate-800">{viewingVehicle.luggageCapacity || 'Standard'}</strong>
                </div>
              </div>

              {/* Documents & Compliance */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Insurance Expiry</span>
                  <strong className="text-slate-800 font-mono">{viewingVehicle.insuranceExpiry}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Revenue Licence Expiry</span>
                  <strong className="text-slate-800 font-mono">{viewingVehicle.revenueLicenceExpiry}</strong>
                </div>
              </div>

              {/* Owner Info */}
              <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Owner / Operator</span>
                  <strong className="text-slate-800">{viewingVehicle.ownerName || 'Operator'}</strong>
                </div>
                <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {viewingVehicle.ownerId}
                </span>
              </div>

              {/* Boat Specifics */}
              {viewingVehicle.type === 'boat' && viewingVehicle.boatDetails && (
                <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-xl space-y-2">
                  <span className="text-cyan-900 block text-[10px] uppercase font-extrabold">Boat Marine Details</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Boat Name:</span>
                      <strong>{viewingVehicle.boatDetails.boatName || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Captain Name:</span>
                      <strong>{viewingVehicle.boatDetails.captainName || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Life Jackets:</span>
                      <strong>{viewingVehicle.boatDetails.lifeJacketsAvailable ? 'Yes' : 'No'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Safety Cert Expiry:</span>
                      <strong className="font-mono">{viewingVehicle.boatDetails.safetyCertificateExpiry || 'N/A'}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {viewingVehicle.description && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Description & Notes</span>
                  <p className="text-slate-700 mt-0.5">{viewingVehicle.description}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setViewingVehicle(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VEHICLE MODAL (Modifying ALL details) */}
      {editingVehicle && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">Admin Mode</span>
                <h3 className="text-base font-bold text-slate-900">Edit Vehicle: {editingVehicle.registrationNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingVehicle(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Make *</label>
                  <input
                    type="text"
                    required
                    value={editingVehicle.make}
                    onChange={e => setEditingVehicle({ ...editingVehicle, make: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Model *</label>
                  <input
                    type="text"
                    required
                    value={editingVehicle.model}
                    onChange={e => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    required
                    value={editingVehicle.year}
                    onChange={e => setEditingVehicle({ ...editingVehicle, year: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Color</label>
                  <input
                    type="text"
                    required
                    value={editingVehicle.color}
                    onChange={e => setEditingVehicle({ ...editingVehicle, color: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fuel Type</label>
                  <select
                    value={editingVehicle.fuelType || 'diesel'}
                    onChange={e => setEditingVehicle({ ...editingVehicle, fuelType: e.target.value as any })}
                    className="w-full px-2 py-1.5 rounded-xl border border-slate-300"
                  >
                    <option value="diesel">Diesel</option>
                    <option value="petrol">Petrol</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="ev">Electric</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">One Day Rate (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={editingVehicle.oneDayPrice || editingVehicle.basePrice}
                    onChange={e => setEditingVehicle({ ...editingVehicle, oneDayPrice: Number(e.target.value), basePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Seats *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editingVehicle.totalSeats}
                    onChange={e => setEditingVehicle({ ...editingVehicle, totalSeats: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Option</label>
                  <select
                    value={editingVehicle.driverOption}
                    onChange={e => setEditingVehicle({ ...editingVehicle, driverOption: e.target.value as any })}
                    className="w-full px-2 py-1.5 rounded-xl border border-slate-300"
                  >
                    <option value="with_driver">With Driver</option>
                    <option value="without_driver">Self-Drive</option>
                    <option value="both">Both (Discuss)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">AC Option</label>
                  <select
                    value={editingVehicle.hasAC ? 'yes' : 'no'}
                    onChange={e => setEditingVehicle({ ...editingVehicle, hasAC: e.target.value === 'yes' })}
                    className="w-full px-2 py-1.5 rounded-xl border border-slate-300"
                  >
                    <option value="yes">AC</option>
                    <option value="no">Non-AC</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingVehicle.status}
                    onChange={e => setEditingVehicle({ ...editingVehicle, status: e.target.value as any })}
                    className="w-full px-2 py-1.5 rounded-xl border border-slate-300 capitalize font-bold"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Insurance Expiry *</label>
                  <input
                    type="date"
                    required
                    value={editingVehicle.insuranceExpiry}
                    onChange={e => setEditingVehicle({ ...editingVehicle, insuranceExpiry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Revenue Licence Expiry *</label>
                  <input
                    type="date"
                    required
                    value={editingVehicle.revenueLicenceExpiry}
                    onChange={e => setEditingVehicle({ ...editingVehicle, revenueLicenceExpiry: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vehicle Description</label>
                <textarea
                  rows={2}
                  value={editingVehicle.description}
                  onChange={e => setEditingVehicle({ ...editingVehicle, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* REGISTER / ADD VEHICLE MODAL */}
      {isAddingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Register New Vehicle or Boat</h3>
              <button
                type="button"
                onClick={() => setIsAddingVehicle(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-4 text-xs">
              {/* Vehicle Booking Type (Requirement 3) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800">
                  Vehicle Booking Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition ${
                      newBookingType === 'trip'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="newBookingType"
                      value="trip"
                      checked={newBookingType === 'trip'}
                      onChange={() => setNewBookingType('trip')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Trip</div>
                      <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                        Charter / full vehicle hire with dates marked as available.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition ${
                      newBookingType === 'schedule'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="newBookingType"
                      value="schedule"
                      checked={newBookingType === 'schedule'}
                      onChange={() => setNewBookingType('schedule')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Schedule</div>
                      <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                        Per-seat route trip with fixed start/end times and per-seat fare.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Service Type *</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as TransportType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                  >
                    <option value="car">Passenger Car (Sedan)</option>
                    <option value="van">Passenger Van (HiAce/Caravan)</option>
                    <option value="bus_trip">Bus for Trip (Whole Bus)</option>
                    <option value="route_bus">Route Bus (Daily Timetable)</option>
                    <option value="safari">Safari 4x4 Jeep (National Park/Tours)</option>
                    <option value="boat">Boat Service (Islands / Bridge)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Owner *</label>
                  {!isAdmin ? (
                    <div>
                      <input
                        type="text"
                        readOnly
                        value={`${currentOwner?.fullName || currentUser?.name || 'Fleet Owner'} (${currentOwner?.id || currentUser?.id || 'My Fleet'})`}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 font-bold text-slate-800 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Assigned automatically to your logged-in owner account. Owners cannot assign vehicles to another owner.
                      </span>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={newOwnerId}
                        onChange={e => setNewOwnerId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium bg-white"
                      >
                        {owners.map(o => (
                          <option key={o.id} value={o.id}>
                            {o.fullName} ({o.id})
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-purple-600 font-semibold mt-1 block">
                        Admin Portal: You may assign this vehicle to any registered fleet owner.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Up to 5 Vehicle / Boat Images (Requirement 2) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <label className="font-bold text-slate-800 text-xs">
                      Vehicle / Boat Images ({newPhotos.length} of 5 uploaded)
                    </label>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Up to 5 Photos
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Add up to 5 photos showing the vehicle exterior, interior seating, safety equipment, or boat view. The first image serves as the main listing thumbnail.
                </p>

                {/* Upload & URL Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      📁 Upload from Device (Max 5)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={newPhotos.length >= 5}
                      onChange={handleFileImagesUpload}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 file:cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      🔗 Or Enter Image URL
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/..."
                        value={photoUrlInput}
                        disabled={newPhotos.length >= 5}
                        onChange={e => setPhotoUrlInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs disabled:opacity-40"
                      />
                      <button
                        type="button"
                        disabled={!photoUrlInput.trim() || newPhotos.length >= 5}
                        onClick={handleAddPhotoUrl}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-40 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5 Thumbnails Slots */}
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {[0, 1, 2, 3, 4].map(idx => {
                    const photo = newPhotos[idx];
                    return (
                      <div
                        key={idx}
                        className={`relative aspect-video rounded-lg border flex items-center justify-center overflow-hidden ${
                          photo
                            ? 'border-emerald-400 bg-white shadow-xs'
                            : 'border-dashed border-slate-300 bg-slate-100 text-slate-400'
                        }`}
                      >
                        {photo ? (
                          <>
                            <img
                              src={photo}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1 left-1 bg-black/75 text-white text-[9px] font-bold px-1 rounded">
                              #{idx + 1}{idx === 0 ? ' (Cover)' : ''}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center hover:bg-rose-700 cursor-pointer shadow-xs"
                              title="Remove photo"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </>
                        ) : (
                          <div className="text-center p-1">
                            <span className="text-[10px] font-bold block text-slate-400">Photo {idx + 1}</span>
                            <span className="text-[9px] text-slate-400">Empty</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Registration # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NP-CAR-7890"
                    value={newRegNumber}
                    onChange={e => setNewRegNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Make *</label>
                  <input
                    type="text"
                    required
                    value={newMake}
                    onChange={e => setNewMake(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HiAce KDH 201"
                    value={newModel}
                    onChange={e => setNewModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">One Day Price (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={newOneDayPrice}
                    onChange={e => setNewOneDayPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-slate-500">Fixed rate set by driver/owner</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Seats *</label>
                  <input
                    type="number"
                    required
                    value={newTotalSeats}
                    onChange={e => setNewTotalSeats(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Option *</label>
                  <select
                    value={newDriverOption}
                    onChange={e => setNewDriverOption(e.target.value as DriverOption)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  >
                    <option value="with_driver">Driver Included</option>
                    <option value="without_driver">Self-Drive</option>
                    <option value="both">Discuss (Both Available)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Insurance Expiry *</label>
                  <input
                    type="date"
                    required
                    value={newInsuranceExpiry}
                    onChange={e => setNewInsuranceExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Revenue Licence Expiry *</label>
                  <input
                    type="date"
                    required
                    value={newRevenueLicenceExpiry}
                    onChange={e => setNewRevenueLicenceExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Short Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Spacious 14-seat air-conditioned van for family tours & airport transfers."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingVehicle(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────
          TRIP AVAILABILITY MODAL (Requirement 4)
      ───────────────────────────────────────────────────────────── */}
      {availabilityVehicle && availabilityVehicle.bookingType !== 'schedule' && (() => {
        const calDate = new Date();
        calDate.setMonth(calDate.getMonth() + calMonthOffset);
        const y = calDate.getFullYear();
        const m = calDate.getMonth();
        const monthLabel = calDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const firstDayWeekDay = new Date(y, m, 1).getDay();

        const daysArray: (string | null)[] = [];
        for (let i = 0; i < firstDayWeekDay; i++) {
          daysArray.push(null);
        }
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          daysArray.push(dateStr);
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Trip Availability: {availabilityVehicle.registrationNumber}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {availabilityVehicle.make} {availabilityVehicle.model} • Click dates to mark as available for Trip hire
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAvailabilityVehicle(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCalMonthOffset(prev => prev - 1)}
                  className="px-2.5 py-1 rounded-lg font-bold text-slate-600 hover:bg-white hover:shadow-xs transition"
                >
                  ‹ Prev
                </button>
                <span className="font-extrabold text-slate-800 text-sm">{monthLabel}</span>
                <button
                  type="button"
                  onClick={() => setCalMonthOffset(prev => prev + 1)}
                  className="px-2.5 py-1 rounded-lg font-bold text-slate-600 hover:bg-white hover:shadow-xs transition"
                >
                  Next ›
                </button>
              </div>

              {/* Calendar Grid */}
              <div>
                <div className="grid grid-cols-7 text-center font-bold text-slate-400 text-[10px] uppercase mb-1">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {daysArray.map((dateStr, idx) => {
                    if (!dateStr) {
                      return <div key={`empty-${idx}`} className="h-9 rounded-lg bg-slate-50/50" />;
                    }
                    const isSelected = tempTripDates.includes(dateStr);
                    const dayNumber = Number(dateStr.split('-')[2]);
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => handleToggleTripDate(dateStr)}
                        className={`h-9 rounded-lg font-bold text-xs transition flex flex-col items-center justify-center cursor-pointer border ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50'
                        }`}
                      >
                        <span>{dayNumber}</span>
                        {isSelected && <span className="w-1 h-1 rounded-full bg-white mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Dates Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Selected Available Trip Dates:</span>
                  <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                    {tempTripDates.length} Days
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                  {tempTripDates.length === 0 ? (
                    <span className="text-slate-400 text-[11px] p-1">No dates selected yet. Click any day on the calendar above.</span>
                  ) : (
                    tempTripDates.map(d => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-bold"
                      >
                        {d}
                        <button
                          type="button"
                          onClick={() => handleToggleTripDate(d)}
                          className="hover:text-rose-600"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setTempTripDates([])}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Clear All
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAvailabilityVehicle(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTripAvailability}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Availability</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          SCHEDULE AVAILABILITY MODAL (Requirement 5)
      ───────────────────────────────────────────────────────────── */}
      {availabilityVehicle && availabilityVehicle.bookingType === 'schedule' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Schedule Availability: {availabilityVehicle.registrationNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {availabilityVehicle.make} {availabilityVehicle.model} • Create timetable availability one date at a time
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAvailabilityVehicle(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Date Form */}
            <form onSubmit={handleAddScheduleDate} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-slate-800 text-xs">+ Add New Schedule Date</strong>
                <span className="text-[10px] text-slate-500">One date per route schedule</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={schedDate}
                    onChange={e => setSchedDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Starting Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mannar"
                    value={schedFrom}
                    onChange={e => setSchedFrom(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ending Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jaffna"
                    value={schedTo}
                    onChange={e => setSchedTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Starting Time</label>
                  <input
                    type="text"
                    required
                    placeholder="06:00 AM"
                    value={schedStartTime}
                    onChange={e => setSchedStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ending Time</label>
                  <input
                    type="text"
                    required
                    placeholder="09:30 AM"
                    value={schedEndTime}
                    onChange={e => setSchedEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">All Seats</label>
                  <div className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-800 text-center text-xs">
                    {availabilityVehicle.totalSeats} Seats
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reserved Seats</label>
                  <input
                    type="number"
                    min={0}
                    max={availabilityVehicle.totalSeats}
                    required
                    value={schedReservedSeats}
                    onChange={e => {
                      const val = Math.min(availabilityVehicle.totalSeats, Math.max(0, Number(e.target.value)));
                      setSchedReservedSeats(val);
                      setSchedAvailSeats(availabilityVehicle.totalSeats - val);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50/50 font-bold text-amber-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Available Seats</label>
                  <div className="w-full px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50/70 font-extrabold text-emerald-800 text-center text-xs" title="Available = All Seats - Reserved Seats">
                    {Math.max(0, availabilityVehicle.totalSeats - schedReservedSeats)}
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Per Seat (Rs.)</label>
                  <input
                    type="number"
                    required
                    placeholder="1200"
                    value={schedPricePerSeat}
                    onChange={e => setSchedPricePerSeat(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-indigo-700 text-xs"
                  />
                </div>
              </div>

              {/* Live formula reminder */}
              <div className="text-[11px] text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg flex items-center justify-between font-mono">
                <span>Formula: Available ({Math.max(0, availabilityVehicle.totalSeats - schedReservedSeats)}) = All ({availabilityVehicle.totalSeats}) − Reserved ({schedReservedSeats})</span>
                <span className="text-emerald-700 font-bold">{Math.max(0, availabilityVehicle.totalSeats - schedReservedSeats)} bookable by passengers</span>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Schedule Date</span>
                </button>
              </div>
            </form>

            {/* Existing Schedules Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-slate-800 text-xs">Configured Schedule Dates ({tempSchedules.length})</strong>
                <span className="text-[10px] text-slate-500">Multiple dates can be added</span>
              </div>

              {tempSchedules.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                  No schedule dates added yet. Use the form above to add a departure date.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Route</th>
                        <th className="py-2 px-3">Times</th>
                        <th className="py-2 px-3 text-center">Available / All</th>
                        <th className="py-2 px-3 text-center">Reserved</th>
                        <th className="py-2 px-3 text-right">Per Seat</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tempSchedules.map(sch => (
                        <tr key={sch.id} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{sch.date}</td>
                          <td className="py-2 px-3 font-medium text-slate-700">{sch.fromLocation} ➔ {sch.toLocation}</td>
                          <td className="py-2 px-3 text-slate-500">{sch.startTime} – {sch.endTime}</td>
                          <td className="py-2 px-3 text-center font-bold text-indigo-700">
                            <span className="text-emerald-700 font-extrabold">{sch.availableSeats}</span> / {sch.totalSeats}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-amber-800">
                            {sch.reservedSeats || 0}
                          </td>
                          <td className="py-2 px-3 text-right font-extrabold text-emerald-700">Rs. {sch.pricePerSeat.toLocaleString()}</td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveScheduleDate(sch.id)}
                              className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Delete this schedule date"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAvailabilityVehicle(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveScheduleAvailability}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Schedule</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DELETE CONFIRMATION MODAL (Admin Only, Requirement 11)
      ───────────────────────────────────────────────────────────── */}
      {deletingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Vehicle Deletion</h3>
                <p className="text-[11px] text-slate-500">
                  Are you sure you want to permanently remove vehicle <strong className="text-slate-800">{deletingVehicle.registrationNumber}</strong> ({deletingVehicle.make} {deletingVehicle.model})?
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px]">
              This action cannot be undone. All configured availability dates and route schedules for this vehicle will also be removed.
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingVehicle(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
