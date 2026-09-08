/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Car,
  Bus,
  Ship,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock3,
  DollarSign,
  MessageSquare,
  Search,
  Plus,
  Compass,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Eye,
  Trash2,
  X,
  Send,
  Sparkles,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Save,
  RotateCcw,
} from 'lucide-react';
import { TransportVehicle, TransportOwner, TransportType, DriverOption } from '../../types/mgrBooking';
import {
  TransportV2Listing,
  TransportV2Request,
  TransportListingMode,
  TransportRequestStatus,
} from '../../types/mgrTransportV2';
import { triggerLifecycleNotifications, getWhatsAppUrl } from '../../utils/mgrTransportNotifications';
import { UserAccount, getMGRPersona } from '../../utils/auth';

interface MGRHotelStyleBookingProps {
  view: 'search' | 'requests' | 'owner-listings';
  vehicles: TransportVehicle[];
  owners: TransportOwner[];
  currentUser?: UserAccount;
  convenienceFeePercentage?: number; // default 5%
}

// Initial Seed Listings
const INITIAL_V2_LISTINGS: TransportV2Listing[] = [
  {
    id: 'LST-MGR-001',
    vehicleId: 'MGR-VAN-00001',
    vehicleName: 'Toyota HiAce KDH High Roof',
    vehicleType: 'van',
    registrationNumber: 'WP ND-4512',
    ownerId: 'OWN-MGR-00001',
    ownerName: 'Anthony Fernando',
    ownerPhone: '+94 77 123 4567',
    ownerWhatsApp: '+94 77 123 4567',
    listingMode: 'availability_only',
    totalSeats: 12,
    driverOption: 'with_driver',
    availableDates: ['2026-09-10', '2026-09-11', '2026-09-15', '2026-09-20'],
    photos: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'],
    status: 'active',
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now(),
  },
  {
    id: 'LST-MGR-002',
    vehicleId: 'MGR-BUS-00002',
    vehicleName: 'Ashok Leyland Intercity Route Coach',
    vehicleType: 'route_bus',
    registrationNumber: 'NP NA-8832',
    ownerId: 'OWN-MGR-00002',
    ownerName: 'M. Selvakumar',
    ownerPhone: '+94 77 234 5678',
    ownerWhatsApp: '+94 77 234 5678',
    listingMode: 'planned_trip',
    totalSeats: 40,
    driverOption: 'with_driver',
    plannedTripDate: '2026-09-15',
    plannedFrom: 'Mannar Town',
    plannedTo: 'Jaffna City',
    departureTime: '08:00',
    availableSeats: 16,
    seatFare: 1200,
    photos: ['https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80'],
    status: 'active',
    createdAt: Date.now() - 3600000 * 48,
    updatedAt: Date.now(),
  },
  {
    id: 'LST-MGR-003',
    vehicleId: 'MGR-SAFARI-00001',
    vehicleName: 'Toyota Land Cruiser 4x4 Safari Jeep',
    vehicleType: 'safari',
    registrationNumber: 'SP JEP-4091',
    ownerId: 'OWN-MGR-00001',
    ownerName: 'Anthony Fernando',
    ownerPhone: '+94 77 123 4567',
    ownerWhatsApp: '+94 77 123 4567',
    listingMode: 'availability_only',
    totalSeats: 6,
    driverOption: 'with_driver',
    availableDates: ['2026-09-12', '2026-09-14', '2026-09-18'],
    photos: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80'],
    status: 'active',
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now(),
  },
];

// Initial Seed Requests
const INITIAL_V2_REQUESTS: TransportV2Request[] = [
  {
    id: 'REQ-V2-001',
    requestNumber: 'MGR-REQ-1001',
    listingId: 'LST-MGR-001',
    vehicleId: 'MGR-VAN-00001',
    vehicleName: 'Toyota HiAce KDH High Roof',
    vehicleType: 'van',
    registrationNumber: 'WP ND-4512',
    ownerId: 'OWN-MGR-00001',
    ownerName: 'Anthony Fernando',
    ownerPhone: '+94 77 123 4567',
    ownerWhatsApp: '+94 77 123 4567',
    passenger: {
      name: 'Rohan Jayawardena',
      phone: '+94 77 345 6789',
      whatsapp: '+94 77 345 6789',
      email: 'rohan@gmail.com',
    },
    listingMode: 'availability_only',
    travelDate: '2026-09-11',
    travelTime: '08:30',
    routeFrom: 'Mannar Town',
    routeTo: 'Colombo Fort',
    seatCount: 1,
    specialNotes: 'Family holiday tour, need air conditioning throughout.',
    ownerTravelCharge: 28000,
    convenienceFee: 1400,
    convenienceFeePercentage: 5,
    finalAmount: 29400,
    requestStatus: 'awaiting_payment',
    paymentStatus: 'pending',
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'REQ-V2-002',
    requestNumber: 'MGR-REQ-1002',
    listingId: 'LST-MGR-002',
    vehicleId: 'MGR-BUS-00002',
    vehicleName: 'Ashok Leyland Intercity Route Coach',
    vehicleType: 'route_bus',
    registrationNumber: 'NP NA-8832',
    ownerId: 'OWN-MGR-00002',
    ownerName: 'M. Selvakumar',
    ownerPhone: '+94 77 234 5678',
    ownerWhatsApp: '+94 77 234 5678',
    passenger: {
      name: 'K. Sangeetha',
      phone: '+94 71 889 0012',
      whatsapp: '+94 71 889 0012',
    },
    listingMode: 'planned_trip',
    travelDate: '2026-09-15',
    travelTime: '08:00',
    routeFrom: 'Mannar Town',
    routeTo: 'Jaffna City',
    seatCount: 3,
    specialNotes: '3 passenger seats together please.',
    requestStatus: 'pending_owner',
    paymentStatus: 'pending',
    createdAt: Date.now() - 3600000 * 1,
    updatedAt: Date.now() - 3600000 * 1,
  },
];

// Helper to generate next 60 days
const generateAvailableDates = (): string[] => {
  const dates: string[] = [];
  const start = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// Helper to convert vehicle to listing
const createListingFromVehicle = (v: TransportVehicle): TransportV2Listing => {
  const isBus = v.type === 'bus' || v.type === 'route_bus' || v.type === 'bus_trip';
  const vehicleName = `${v.make} ${v.model}`;
  return {
    id: `LST-${v.id}`,
    vehicleId: v.id,
    vehicleName: vehicleName,
    vehicleType: v.type,
    registrationNumber: v.registrationNumber,
    ownerId: v.ownerId,
    ownerName: v.ownerName || 'Anthony Fernando',
    ownerPhone: '+94 77 123 4567',
    ownerWhatsApp: '+94 77 123 4567',
    listingMode: isBus ? 'planned_trip' : 'availability_only',
    totalSeats: v.totalSeats || 4,
    driverOption: v.driverOption || 'both',
    availableDates: isBus ? undefined : generateAvailableDates(),
    plannedTripDate: isBus ? new Date().toISOString().split('T')[0] : undefined,
    plannedFrom: isBus ? (v.boatDetails?.departurePoint || 'Mannar Town') : undefined,
    plannedTo: isBus ? (v.boatDetails?.destination || 'Jaffna City') : undefined,
    departureTime: isBus ? '08:30' : undefined,
    availableSeats: isBus ? v.totalSeats : undefined,
    seatFare: isBus ? (v.pricePerSeat || 1200) : undefined,
    photos: v.photos && v.photos.length > 0 ? v.photos : ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'],
    status: v.status === 'active' ? 'active' : 'cancelled',
    createdAt: v.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
};

export const MGRHotelStyleBooking: React.FC<MGRHotelStyleBookingProps> = ({
  view,
  vehicles,
  owners,
  currentUser,
  convenienceFeePercentage = 5,
}) => {
  const persona = getMGRPersona(currentUser);
  const isOwnerOrAdmin = persona === 'owner' || persona === 'admin';

  // Persistence State
  const [listings, setListings] = useState<TransportV2Listing[]>(() => {
    try {
      const saved = localStorage.getItem('mgr_transport_v2_listings');
      const parsed: TransportV2Listing[] = saved ? JSON.parse(saved) : INITIAL_V2_LISTINGS;
      const existingVehicleIds = new Set(parsed.map(p => p.vehicleId));
      const additions: TransportV2Listing[] = (vehicles || [])
        .filter(v => v.status === 'active' && !existingVehicleIds.has(v.id))
        .map(createListingFromVehicle);
      return [...parsed, ...additions];
    } catch {
      return (vehicles || []).map(createListingFromVehicle);
    }
  });

  useEffect(() => {
    if (!vehicles || vehicles.length === 0) return;
    setListings(prev => {
      const existingIds = new Set(prev.map(p => p.vehicleId));
      const missing = vehicles
        .filter(v => v.status === 'active' && !existingIds.has(v.id))
        .map(createListingFromVehicle);
      if (missing.length === 0) return prev;
      return [...prev, ...missing];
    });
  }, [vehicles]);

  const [requests, setRequests] = useState<TransportV2Request[]>(() => {
    try {
      const saved = localStorage.getItem('mgr_transport_v2_requests');
      return saved ? JSON.parse(saved) : INITIAL_V2_REQUESTS;
    } catch {
      return INITIAL_V2_REQUESTS;
    }
  });

  useEffect(() => {
    localStorage.setItem('mgr_transport_v2_listings', JSON.stringify(listings));
  }, [listings]);

  useEffect(() => {
    localStorage.setItem('mgr_transport_v2_requests', JSON.stringify(requests));
  }, [requests]);

  // Search View State
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'planned_trip' | 'availability_only'>('all');
  const [searchType, setSearchType] = useState<string>('all');
  const [searchDate, setSearchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchFrom, setSearchFrom] = useState<string>('');
  const [searchTo, setSearchTo] = useState<string>('');
  const [searchPassengers, setSearchPassengers] = useState<number>(1);
  const [searchDriverOption, setSearchDriverOption] = useState<string>('all');

  // Search view table mode & pagination (max 20 rows)
  const [searchViewMode, setSearchViewMode] = useState<'table' | 'cards'>('table');
  const [searchSortField, setSearchSortField] = useState<string>('vehicleName');
  const [searchSortDir, setSearchSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchPage, setSearchPage] = useState<number>(1);
  const pageSize = 20;

  // Requests table sort & pagination
  const [reqSortField, setReqSortField] = useState<string>('createdAt');
  const [reqSortDir, setReqSortDir] = useState<'asc' | 'desc'>('desc');
  const [reqPage, setReqPage] = useState<number>(1);

  // Owner listings table sort & pagination
  const [lstSortField, setLstSortField] = useState<string>('createdAt');
  const [lstSortDir, setLstSortDir] = useState<'asc' | 'desc'>('desc');
  const [lstPage, setLstPage] = useState<number>(1);

  // Owner Availability Calendar State
  const [selectedCalendarVehicleId, setSelectedCalendarVehicleId] = useState<string>(() => {
    return vehicles[0]?.id || '';
  });
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedBrush, setSelectedBrush] = useState<'available' | 'tentative' | 'booked' | 'planned' | 'off'>('available');

  // Owner Availability Calendar Staged State (Requirement 3: Explicit Save)
  const [draftDateAvailabilityMap, setDraftDateAvailabilityMap] = useState<Record<string, 'available' | 'tentative' | 'booked' | 'planned' | 'off'>>({});
  const [hasUnsavedCalendarChanges, setHasUnsavedCalendarChanges] = useState<boolean>(false);
  const [calendarSaveFeedback, setCalendarSaveFeedback] = useState<string | null>(null);


  // Request Modals
  const [requestingListing, setRequestingListing] = useState<TransportV2Listing | null>(null);
  const [reqPassengerName, setReqPassengerName] = useState('');
  const [reqPassengerPhone, setReqPassengerPhone] = useState('');
  const [reqRouteFrom, setReqRouteFrom] = useState('Mannar Town');
  const [reqRouteTo, setReqRouteTo] = useState('');
  const [reqTravelDate, setReqTravelDate] = useState(searchDate);
  const [reqTravelTime, setReqTravelTime] = useState('08:00');
  const [reqSeats, setReqSeats] = useState(1);
  const [reqNotes, setReqNotes] = useState('');
  const [requestSuccessNumber, setRequestSuccessNumber] = useState<string | null>(null);

  // Owner Review Modal State
  const [reviewingRequest, setReviewingRequest] = useState<TransportV2Request | null>(null);
  const [ownerChargeInput, setOwnerChargeInput] = useState<number>(20000);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');

  // Payment Confirmation Modal State
  const [payingRequest, setPayingRequest] = useState<TransportV2Request | null>(null);

  // View Request Details Modal
  const [viewingRequest, setViewingRequest] = useState<TransportV2Request | null>(null);

  // Requests Tab Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New Listing Modals (Owner Listings View)
  const [isAddingListing, setIsAddingListing] = useState<'availability_only' | 'planned_trip' | null>(null);
  const [newListVehicleId, setNewListVehicleId] = useState(vehicles[0]?.id || '');
  const [newListDates, setNewListDates] = useState('');
  const [newPlannedDate, setNewPlannedDate] = useState('2026-09-20');
  const [newPlannedFrom, setNewPlannedFrom] = useState('Mannar Town');
  const [newPlannedTo, setNewPlannedTo] = useState('Jaffna City');
  const [newPlannedTime, setNewPlannedTime] = useState('08:00');
  const [newPlannedSeats, setNewPlannedSeats] = useState(25);

  // Filter listings for search
  const filteredListings = listings.filter(item => {
    if (item.status !== 'active') return false;

    // Dropdown filter: All / Planned Trip / Vehicle Available
    if (listingTypeFilter !== 'all' && item.listingMode !== listingTypeFilter) {
      return false;
    }

    // Global search across all vehicle and trip fields
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase().trim();
      const matchVehicle = (item.vehicleName || '').toLowerCase().includes(q);
      const matchReg = (item.registrationNumber || '').toLowerCase().includes(q);
      const matchOwner = (item.ownerName || '').toLowerCase().includes(q);
      const matchType = (item.vehicleType || '').toLowerCase().replace('_', ' ').includes(q);
      const matchDriver = (item.driverOption || '').toLowerCase().replace('_', ' ').includes(q);
      const matchFrom = (item.plannedFrom || '').toLowerCase().includes(q);
      const matchTo = (item.plannedTo || '').toLowerCase().includes(q);
      const matchArea = (item.serviceArea || '').toLowerCase().includes(q);
      const matchDates = (item.availableDates || []).some(d => d.includes(q)) || (item.plannedTripDate || '').includes(q);
      if (!matchVehicle && !matchReg && !matchOwner && !matchType && !matchDriver && !matchFrom && !matchTo && !matchArea && !matchDates) {
        return false;
      }
    }

    if (searchType !== 'all') {
      if (searchType === 'bus') {
        if (item.vehicleType !== 'bus' && item.vehicleType !== 'bus_trip' && item.vehicleType !== 'route_bus') {
          return false;
        }
      } else if (item.vehicleType !== searchType) {
        return false;
      }
    }

    if (searchDriverOption !== 'all') {
      if (searchDriverOption === 'with_driver' && item.driverOption === 'without_driver') return false;
      if (searchDriverOption === 'without_driver' && item.driverOption === 'with_driver') return false;
    }

    if (item.listingMode === 'availability_only') {
      // If user provided a date and listing has specific dates, verify inclusion
      if (searchDate && item.availableDates && item.availableDates.length > 0) {
        if (!item.availableDates.includes(searchDate)) return false;
      }
      if (item.totalSeats < searchPassengers) return false;
    } else {
      // Planned trip checks
      if (searchDate && item.plannedTripDate && item.plannedTripDate !== searchDate) return false;
      if (searchFrom && item.plannedFrom && !item.plannedFrom.toLowerCase().includes(searchFrom.toLowerCase())) return false;
      if (searchTo && item.plannedTo && !item.plannedTo.toLowerCase().includes(searchTo.toLowerCase())) return false;
      if ((item.availableSeats || 0) < searchPassengers) return false;
    }

    return true;
  });

  const currentUserEmail = (currentUser?.email || '').toLowerCase();
  const currentUserName = (currentUser?.name || '').toLowerCase();
  const currentUserPhone = (currentUser?.phone || '').trim();
  const isAppAdmin = persona === 'admin';
  const isPassengerUser = persona === 'passenger';
  const isOwnerUser = persona === 'owner';

  // Find owner record for currentUser if they are an owner
  const myOwnerRecord = owners.find(
    o => (o.email && o.email.toLowerCase() === currentUserEmail) ||
         (o.fullName && o.fullName.toLowerCase() === currentUserName) ||
         (currentUserPhone && (o.mobileNumber === currentUserPhone || o.whatsappNumber === currentUserPhone))
  );
  const myOwnerId = myOwnerRecord ? myOwnerRecord.id : (currentUser?.id || null);

  // Vehicles owned by current user
  const myVehicleIds = new Set(
    (vehicles || [])
      .filter(v => (myOwnerId && v.ownerId === myOwnerId) ||
                   (v.ownerName && v.ownerName.toLowerCase() === currentUserName) ||
                   (v.ownerId && currentUser?.id && v.ownerId === currentUser.id))
      .map(v => v.id)
  );

  // Vehicles strictly scoped to logged-in owner
  const myOwnerVehicles = isAppAdmin ? (vehicles || []) : (vehicles || []).filter(v => myVehicleIds.has(v.id));

  // Filter requests: Scoped to current user (Passengers see their bookings, Owners see their fleet requests, Admin sees all)
  const filteredRequests = requests.filter(req => {
    if (!isAppAdmin) {
      if (isPassengerUser) {
        const passEmail = (req.passenger?.email || '').toLowerCase();
        const passName = (req.passenger?.name || '').toLowerCase();
        const passPhone = (req.passenger?.phone || '').trim();
        const matchesMe =
          (currentUserEmail && passEmail === currentUserEmail) ||
          (currentUserName && passName === currentUserName) ||
          (currentUserPhone && passPhone === currentUserPhone);
        if (!matchesMe) return false;
      } else if (isOwnerUser) {
        if (!myVehicleIds.has(req.vehicleId)) return false;
      }
    }

    if (statusFilter === 'all') return true;
    return req.requestStatus === statusFilter;
  });

  // Helper for sorting
  const handleSort = (
    field: string,
    currentField: string,
    currentDir: 'asc' | 'desc',
    setField: (f: string) => void,
    setDir: (d: 'asc' | 'desc') => void,
    setPage: (p: number) => void
  ) => {
    if (currentField === field) {
      setDir(currentDir === 'asc' ? 'desc' : 'asc');
    } else {
      setField(field);
      setDir('asc');
    }
    setPage(1);
  };

  const renderSortHeader = (
    label: string,
    field: string,
    currentField: string,
    currentDir: 'asc' | 'desc',
    onClick: () => void,
    alignCenter = false
  ) => (
    <th
      onClick={onClick}
      className={`py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100 transition-colors ${
        alignCenter ? 'text-center' : ''
      }`}
    >
      <div className={`inline-flex items-center gap-1 ${alignCenter ? 'justify-center' : ''}`}>
        <span>{label}</span>
        {currentField !== field ? (
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
        ) : currentDir === 'asc' ? (
          <ChevronUp className="w-3.5 h-3.5 text-emerald-600 font-bold" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-emerald-600 font-bold" />
        )}
      </div>
    </th>
  );

  // Search Results sorting & pagination
  const sortedListings = [...filteredListings].sort((a, b) => {
    let valA: any = (a as any)[searchSortField] ?? '';
    let valB: any = (b as any)[searchSortField] ?? '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return searchSortDir === 'asc' ? -1 : 1;
    if (valA > valB) return searchSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const searchTotalPages = Math.max(1, Math.ceil(sortedListings.length / pageSize));
  const paginatedListings = sortedListings.slice((searchPage - 1) * pageSize, searchPage * pageSize);

  // Requests sorting & pagination
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    let valA: any = (a as any)[reqSortField] ?? '';
    let valB: any = (b as any)[reqSortField] ?? '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return reqSortDir === 'asc' ? -1 : 1;
    if (valA > valB) return reqSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const reqTotalPages = Math.max(1, Math.ceil(sortedRequests.length / pageSize));
  const paginatedRequests = sortedRequests.slice((reqPage - 1) * pageSize, reqPage * pageSize);

  // Owner listings sorting & pagination (Scoped: Owners only see their own fleet listings)
  const ownerScopedListings = listings.filter(item => {
    if (isAppAdmin) return true;
    if (isOwnerUser) return myVehicleIds.has(item.vehicleId);
    return false;
  });

  const sortedOwnerListings = [...ownerScopedListings].sort((a, b) => {
    let valA: any = (a as any)[lstSortField] ?? '';
    let valB: any = (b as any)[lstSortField] ?? '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return lstSortDir === 'asc' ? -1 : 1;
    if (valA > valB) return lstSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const availableOwnerListings = sortedOwnerListings.filter(l => l.listingMode === 'availability_only');
  const plannedOwnerListings = sortedOwnerListings.filter(l => l.listingMode === 'planned_trip');

  const lstTotalPages = Math.max(1, Math.ceil(sortedOwnerListings.length / pageSize));
  const paginatedOwnerListings = sortedOwnerListings.slice((lstPage - 1) * pageSize, lstPage * pageSize);

  // Active vehicle and listing for calendar editing
  const activeCalendarVehicleId = selectedCalendarVehicleId || myOwnerVehicles[0]?.id || '';
  const activeCalendarListing = listings.find(l => l.vehicleId === activeCalendarVehicleId && l.listingMode === 'availability_only') || listings.find(l => l.vehicleId === activeCalendarVehicleId);

  // Sync draft availability map when vehicle or listing changes
  useEffect(() => {
    if (activeCalendarListing?.dateAvailabilityMap) {
      setDraftDateAvailabilityMap({ ...activeCalendarListing.dateAvailabilityMap });
    } else {
      setDraftDateAvailabilityMap({});
    }
    setHasUnsavedCalendarChanges(false);
  }, [activeCalendarVehicleId, activeCalendarListing?.id]);

  // Handle painting a single date with the selected brush
  const handlePaintDate = (dateStr: string) => {
    setDraftDateAvailabilityMap(prev => ({
      ...prev,
      [dateStr]: selectedBrush,
    }));
    setHasUnsavedCalendarChanges(true);
  };

  // Quick batch mark or clear entire current month
  const handleBatchMarkMonth = (status: 'available' | 'off') => {
    const daysInM = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    setDraftDateAvailabilityMap(prev => {
      const nextMap = { ...prev };
      for (let d = 1; d <= daysInM; d++) {
        const dStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        nextMap[dStr] = status;
      }
      return nextMap;
    });
    setHasUnsavedCalendarChanges(true);
  };

  // Explicit Save Action for Calendar Availability (Requirement 3)
  const handleSaveCalendarAvailability = () => {
    if (!activeCalendarVehicleId) return;

    const matchedVehicle = vehicles.find(v => v.id === activeCalendarVehicleId);
    const existingListing = listings.find(l => l.vehicleId === activeCalendarVehicleId && l.listingMode === 'availability_only');

    const newAvailableDates = Object.entries(draftDateAvailabilityMap)
      .filter(([_, status]) => status === 'available')
      .map(([d]) => d)
      .sort();

    if (existingListing) {
      setListings(prev => prev.map(l => l.id === existingListing.id ? {
        ...l,
        dateAvailabilityMap: { ...draftDateAvailabilityMap },
        availableDates: newAvailableDates,
        updatedAt: Date.now(),
      } : l));
    } else if (matchedVehicle) {
      const newLst: TransportV2Listing = {
        id: `LST-V2-${Date.now()}`,
        vehicleId: matchedVehicle.id,
        vehicleName: matchedVehicle.name,
        vehicleType: matchedVehicle.type,
        registrationNumber: matchedVehicle.registrationNumber,
        ownerId: matchedVehicle.ownerId,
        ownerName: matchedVehicle.ownerName || 'Owner',
        ownerPhone: matchedVehicle.contactNumber || '',
        ownerWhatsApp: matchedVehicle.contactNumber || '',
        listingMode: 'availability_only',
        dateAvailabilityMap: { ...draftDateAvailabilityMap },
        availableDates: newAvailableDates,
        totalSeats: matchedVehicle.seats || 4,
        driverOption: 'with_driver',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setListings(prev => [newLst, ...prev]);
    }

    setHasUnsavedCalendarChanges(false);
    setCalendarSaveFeedback('Availability saved successfully!');
    setTimeout(() => setCalendarSaveFeedback(null), 3500);
  };

  // Discard staged calendar changes
  const handleDiscardCalendarAvailability = () => {
    if (activeCalendarListing?.dateAvailabilityMap) {
      setDraftDateAvailabilityMap({ ...activeCalendarListing.dateAvailabilityMap });
    } else {
      setDraftDateAvailabilityMap({});
    }
    setHasUnsavedCalendarChanges(false);
  };

  // 30-Day Window Date computations for Requirement 6
  const todayDateObj = new Date();
  const todayYMD = `${todayDateObj.getFullYear()}-${String(todayDateObj.getMonth() + 1).padStart(2, '0')}-${String(todayDateObj.getDate()).padStart(2, '0')}`;
  const max30DateObj = new Date(todayDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);
  const max30YMD = `${max30DateObj.getFullYear()}-${String(max30DateObj.getMonth() + 1).padStart(2, '0')}-${String(max30DateObj.getDate()).padStart(2, '0')}`;


  // Handler: Passenger Submits Booking Request
  const handleSendBookingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPassengerName = reqPassengerName || currentUser?.name || currentUser?.username || 'Passenger';
    const finalPassengerPhone = reqPassengerPhone || currentUser?.phone || '+94 77 123 4567';
    if (!requestingListing || !finalPassengerName) return;

    const reqNum = `MGR-REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRequest: TransportV2Request = {
      id: `REQ-V2-${Date.now()}`,
      requestNumber: reqNum,
      listingId: requestingListing.id,
      vehicleId: requestingListing.vehicleId,
      vehicleName: requestingListing.vehicleName,
      vehicleType: requestingListing.vehicleType,
      registrationNumber: requestingListing.registrationNumber,
      ownerId: requestingListing.ownerId,
      ownerName: requestingListing.ownerName,
      ownerPhone: requestingListing.ownerPhone,
      ownerWhatsApp: requestingListing.ownerWhatsApp,
      passenger: {
        name: finalPassengerName,
        phone: finalPassengerPhone,
        whatsapp: finalPassengerPhone,
      },
      listingMode: requestingListing.listingMode,
      travelDate: reqTravelDate,
      travelTime: requestingListing.listingMode === 'planned_trip' ? requestingListing.departureTime : reqTravelTime,
      routeFrom: requestingListing.listingMode === 'planned_trip' ? requestingListing.plannedFrom || 'Mannar' : reqRouteFrom,
      routeTo: requestingListing.listingMode === 'planned_trip' ? requestingListing.plannedTo || 'Jaffna' : reqRouteTo,
      seatCount: requestingListing.listingMode === 'planned_trip' ? Number(reqSeats) : 1,
      specialNotes: reqNotes,
      requestStatus: 'pending_owner',
      paymentStatus: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setRequests(prev => [newRequest, ...prev]);
    setRequestSuccessNumber(reqNum);

    // Trigger Notifications to Passenger, Owner, and Admin
    await triggerLifecycleNotifications('request_created', newRequest);

    setTimeout(() => {
      setRequestingListing(null);
      setRequestSuccessNumber(null);
      setReqPassengerName('');
      setReqPassengerPhone('');
      setReqNotes('');
    }, 2000);
  };

  // Handler: Owner Accepts with Travel Charge
  const handleOwnerAccept = async (req: TransportV2Request) => {
    const charge = Number(ownerChargeInput);
    if (!charge || charge <= 0) return;

    const fee = Math.round(charge * (convenienceFeePercentage / 100));
    const finalTotal = charge + fee;

    const updated: TransportV2Request = {
      ...req,
      ownerTravelCharge: charge,
      convenienceFee: fee,
      convenienceFeePercentage,
      finalAmount: finalTotal,
      requestStatus: 'awaiting_payment',
      updatedAt: Date.now(),
    };

    setRequests(prev => prev.map(r => (r.id === req.id ? updated : r)));
    setReviewingRequest(null);

    // Dispatch Notifications (Owner Accepted)
    await triggerLifecycleNotifications('owner_accepted', updated);
  };

  // Handler: Owner Rejects Request
  const handleOwnerReject = async (req: TransportV2Request) => {
    const updated: TransportV2Request = {
      ...req,
      requestStatus: 'owner_rejected',
      rejectionReason: rejectionReasonInput || 'Owner unable to accommodate on selected date.',
      updatedAt: Date.now(),
    };

    setRequests(prev => prev.map(r => (r.id === req.id ? updated : r)));
    setReviewingRequest(null);

    // Dispatch Notifications (Owner Rejected)
    await triggerLifecycleNotifications('owner_rejected', updated);
  };

  // Handler: Passenger Simulates Payment Success
  const handleCompletePayment = async (req: TransportV2Request) => {
    const paymentRef = `PAY-MGR-${Math.floor(100000 + Math.random() * 900000)}`;

    const updated: TransportV2Request = {
      ...req,
      requestStatus: 'confirmed',
      paymentStatus: 'paid',
      paymentRef,
      updatedAt: Date.now(),
    };

    setRequests(prev => prev.map(r => (r.id === req.id ? updated : r)));

    // Update Inventory Only AFTER Payment Success!
    if (req.listingMode === 'planned_trip') {
      setListings(prev =>
        prev.map(l => {
          if (l.id === req.listingId) {
            const currentSeats = l.availableSeats ?? l.totalSeats;
            const newSeats = Math.max(0, currentSeats - req.seatCount);
            return { ...l, availableSeats: newSeats, updatedAt: Date.now() };
          }
          return l;
        })
      );
    } else {
      // Block the booked date for availability_only
      setListings(prev =>
        prev.map(l => {
          if (l.id === req.listingId && l.availableDates) {
            return {
              ...l,
              availableDates: l.availableDates.filter(d => d !== req.travelDate),
              updatedAt: Date.now(),
            };
          }
          return l;
        })
      );
    }

    setPayingRequest(null);

    // Dispatch Notifications (Booking Confirmed)
    await triggerLifecycleNotifications('booking_confirmed', updated);
  };

  // Handler: Create New Listing (Owner view)
  const handleSaveNewListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingListing) return;

    const matchedVehicle = vehicles.find(v => v.id === newListVehicleId) || vehicles[0];
    const matchedOwner = owners.find(o => o.id === matchedVehicle?.ownerId) || owners[0];

    const newListing: TransportV2Listing = {
      id: `LST-MGR-${Math.floor(1000 + Math.random() * 9000)}`,
      vehicleId: matchedVehicle.id,
      vehicleName: `${matchedVehicle.make} ${matchedVehicle.model}`,
      vehicleType: matchedVehicle.type,
      registrationNumber: matchedVehicle.registrationNumber,
      ownerId: matchedOwner.id,
      ownerName: matchedOwner.fullName,
      ownerPhone: matchedOwner.mobileNumber,
      ownerWhatsApp: matchedOwner.whatsappNumber || matchedOwner.mobileNumber,
      listingMode: isAddingListing,
      totalSeats: matchedVehicle.totalSeats,
      driverOption: matchedVehicle.driverOption,
      photos: matchedVehicle.photos,
      status: 'active',
      availableDates:
        isAddingListing === 'availability_only'
          ? newListDates.split(',').map(d => d.trim()).filter(Boolean)
          : undefined,
      plannedTripDate: isAddingListing === 'planned_trip' ? newPlannedDate : undefined,
      plannedFrom: isAddingListing === 'planned_trip' ? newPlannedFrom : undefined,
      plannedTo: isAddingListing === 'planned_trip' ? newPlannedTo : undefined,
      departureTime: isAddingListing === 'planned_trip' ? newPlannedTime : undefined,
      availableSeats: isAddingListing === 'planned_trip' ? Number(newPlannedSeats) : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setListings(prev => [newListing, ...prev]);
    setIsAddingListing(null);
    setNewListDates('');
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: PASSENGER MGR TRANSPORT SEARCH
      ───────────────────────────────────────────────────────────── */}
      {view === 'search' && (
        <div className="space-y-6">
          {/* MGR Transport Search Box */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Search Available Transport & Scheduled Trips</h3>
                <p className="text-xs text-slate-500">
                  Search by global keywords, date, route, and vehicle type. Request a vehicle or reserve seats directly from verified operators.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                MGR Transport Booking
              </span>
            </div>

            {/* Global Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                id="mgr-find-transport-global-search"
                type="text"
                value={globalSearch}
                onChange={e => {
                  setGlobalSearch(e.target.value);
                  setSearchPage(1);
                }}
                placeholder="Global Search: search by vehicle name, model, reg #, driver, location, operator, trip type..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearch('');
                    setSearchPage(1);
                  }}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 text-xs">
              {/* Trip / Booking Type Filter */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Filter</label>
                <select
                  id="filter-transport-booking-type"
                  value={listingTypeFilter}
                  onChange={e => {
                    setListingTypeFilter(e.target.value as any);
                    setSearchPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium bg-white"
                >
                  <option value="all">All</option>
                  <option value="planned_trip">Planned Trip</option>
                  <option value="availability_only">Vehicle Available</option>
                </select>
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vehicle Type</label>
                <select
                  value={searchType}
                  onChange={e => setSearchType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                >
                  <option value="all">All Vehicles</option>
                  <option value="car">Cars</option>
                  <option value="van">Vans</option>
                  <option value="bus">Buses</option>
                  <option value="safari">Safari 4x4</option>
                  <option value="boat">Boats</option>
                </select>
              </div>

              {/* Travel Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Travel Date</label>
                <input
                  type="date"
                  value={searchDate}
                  onChange={e => setSearchDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {/* From */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">From Location</label>
                <input
                  type="text"
                  placeholder="e.g. Mannar Town"
                  value={searchFrom}
                  onChange={e => setSearchFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {/* To */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">To Location</label>
                <input
                  type="text"
                  placeholder="e.g. Jaffna City"
                  value={searchTo}
                  onChange={e => setSearchTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {/* Passengers Count */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Passengers</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={searchPassengers}
                  onChange={e => setSearchPassengers(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              {/* Driver Option */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Driver Option</label>
                <select
                  value={searchDriverOption}
                  onChange={e => setSearchDriverOption(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                >
                  <option value="all">Any</option>
                  <option value="with_driver">With Driver</option>
                  <option value="without_driver">Self-Drive</option>
                  <option value="both">Discuss (Flexible)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Search Results ({sortedListings.length})
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Showing {Math.min(sortedListings.length, (searchPage - 1) * pageSize + 1)}-{Math.min(searchPage * pageSize, sortedListings.length)} of {sortedListings.length}
                </span>
                {listingTypeFilter !== 'all' && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    listingTypeFilter === 'planned_trip' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {listingTypeFilter === 'planned_trip' ? 'Planned Trips' : 'Vehicle Available'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden md:inline">
                  Direct Owner Booking • Reserve Your Trip
                </span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSearchViewMode('table')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      searchViewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Table View (20 rows/page)"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchViewMode('cards')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      searchViewMode === 'cards'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Card Grid"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                </div>
              </div>
            </div>

            {sortedListings.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-2">
                <p className="text-sm font-bold text-slate-700">No matching vehicles found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting the travel date, keywords, or vehicle category. We have active Cars, Vans, Buses, Safari jeeps, and Boats ready for hire.
                </p>
              </div>
            ) : searchViewMode === 'table' ? (
              /* TABLE FORMAT (MAX 20 ROWS) WITH TEXT WRAPPING */
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      {renderSortHeader('Vehicle & Photo', 'vehicleName', searchSortField, searchSortDir, () => handleSort('vehicleName', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage))}
                      {renderSortHeader('Type', 'vehicleType', searchSortField, searchSortDir, () => handleSort('vehicleType', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage))}
                      {renderSortHeader('Reg #', 'registrationNumber', searchSortField, searchSortDir, () => handleSort('registrationNumber', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage))}
                      {renderSortHeader('From ➔ To Location', 'plannedFrom', searchSortField, searchSortDir, () => handleSort('plannedFrom', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage))}
                      {renderSortHeader('Seats', 'totalSeats', searchSortField, searchSortDir, () => handleSort('totalSeats', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage))}
                      {renderSortHeader('Driver Option', 'driverOption', searchSortField, searchSortDir, () => handleSort('driverOption', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage))}
                      <th className="py-3.5 px-4 text-center break-words">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedListings.map(item => {
                      const isTypeA = item.listingMode === 'availability_only';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 break-words">
                            <div className="flex items-center gap-3">
                              {item.photos && item.photos.length > 0 ? (
                                <img
                                  src={item.photos[0]}
                                  alt={item.vehicleName}
                                  className="w-12 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                  <Car className="w-5 h-5" />
                                </div>
                              )}
                              <div className="break-words min-w-0">
                                <span className="font-bold text-slate-900 block break-words">{item.vehicleName}</span>
                                <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border inline-block mt-0.5 ${
                                  isTypeA 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                  {isTypeA ? 'Vehicle Available' : 'Planned Trip'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 break-words">
                            <span className="capitalize font-semibold text-slate-700 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] inline-block break-words">
                              {item.vehicleType.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="py-3 px-4 break-words">
                            <span className="font-mono text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px] font-bold inline-block break-words">
                              {item.registrationNumber}
                            </span>
                          </td>

                          {/* From Location & To Location clearly displayed */}
                          <td className="py-3 px-4 break-words min-w-[180px]">
                            {isTypeA ? (
                              <div className="space-y-1">
                                <div className="font-semibold text-slate-800 break-words">
                                  {item.serviceArea || `${searchFrom || 'Mannar'} ➔ ${searchTo || 'Islandwide'}`}
                                </div>
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                                  {item.availableDates && item.availableDates.length > 0 ? `${item.availableDates.length} Days Available` : 'Available on Request'}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex flex-col gap-0.5 text-xs font-bold text-blue-950">
                                  <div className="break-words">
                                    <span className="text-[10px] uppercase font-bold text-blue-600 mr-1.5">From Location:</span>
                                    <span className="font-semibold">{item.plannedFrom || 'Mannar Town'}</span>
                                  </div>
                                  <div className="break-words">
                                    <span className="text-[10px] uppercase font-bold text-indigo-600 mr-1.5">To Location:</span>
                                    <span className="font-semibold">{item.plannedTo || 'Jaffna City'}</span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1 break-words">
                                  📅 {item.plannedTripDate} at {item.departureTime} • <span className="font-bold text-emerald-700">{item.availableSeats} seats left</span>
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 break-words font-bold text-slate-800">
                            {item.totalSeats} Seats
                          </td>

                          <td className="py-3 px-4 break-words">
                            <span className="capitalize text-slate-700 bg-slate-50 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200 inline-block break-words">
                              {item.driverOption === 'both' ? 'Discuss' : item.driverOption.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Distinct booking button colours: Emerald for Vehicle Available, Blue for Planned Trip */}
                          <td className="py-3 px-4 break-words text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setRequestingListing(item);
                                setReqRouteFrom(item.listingMode === 'planned_trip' ? (item.plannedFrom || 'Mannar Town') : (searchFrom || 'Mannar Town'));
                                setReqRouteTo(item.listingMode === 'planned_trip' ? (item.plannedTo || 'Jaffna') : (searchTo || ''));
                                setReqTravelDate(item.listingMode === 'planned_trip' ? (item.plannedTripDate || searchDate) : searchDate);
                                setReqSeats(item.listingMode === 'planned_trip' ? Math.min(searchPassengers, item.availableSeats || 1) : 1);
                                setReqPassengerName(currentUser?.name || currentUser?.username || '');
                                setReqPassengerPhone(currentUser?.phone || '+94 77 123 4567');
                              }}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer ${
                                isTypeA
                                  ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
                                  : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
                              }`}
                              title={isTypeA ? 'Book this Available Vehicle' : 'Book Seats on this Planned Trip'}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Book Vehicle</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* CARDS GRID (PAGINATED MAX 20) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedListings.map(item => {
                  const isTypeA = item.listingMode === 'availability_only';

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        {/* Header Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.registrationNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                              isTypeA
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {isTypeA ? 'Vehicle Available' : 'Planned Trip'}
                          </span>
                        </div>

                        {/* Title & Photo */}
                        <h4 className="text-sm font-bold text-slate-900 mt-2">{item.vehicleName}</h4>
                        <p className="text-[11px] text-slate-500">Owner: {item.ownerName}</p>

                        {item.photos && item.photos.length > 0 && (
                          <div className="mt-2 h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                            <img
                              src={item.photos[0]}
                              alt={item.vehicleName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Type Specific Info */}
                        {isTypeA ? (
                          <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Capacity:</span>
                              <strong className="text-slate-800">{item.totalSeats} Passengers</strong>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Driver:</span>
                              <strong className="text-slate-800 capitalize">{item.driverOption === 'both' ? 'Discuss' : item.driverOption.replace('_', ' ')}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                Available Schedule
                              </span>
                              <div className="text-[11px] text-slate-600">
                                {item.availableDates && item.availableDates.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {item.availableDates.slice(0, 4).map(d => (
                                      <span key={d} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">
                                        {d}
                                      </span>
                                    ))}
                                    {item.availableDates.length > 4 && (
                                      <span className="text-[10px] text-slate-400">+{item.availableDates.length - 4} more</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="italic text-slate-400">Available on inquiry</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2 text-xs">
                            <div className="flex flex-col gap-0.5 font-bold text-blue-900">
                              <div><span className="text-[10px] uppercase text-blue-500 font-extrabold mr-1">From Location:</span> {item.plannedFrom || 'Mannar Town'}</div>
                              <div><span className="text-[10px] uppercase text-indigo-500 font-extrabold mr-1">To Location:</span> {item.plannedTo || 'Jaffna City'}</div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                              <span>📅 Date: {item.plannedTripDate}</span>
                              <span>⏰ Time: {item.departureTime}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-200/50">
                              <span className="text-slate-600">Available Seats:</span>
                              <strong className="text-emerald-700 font-extrabold">
                                {item.availableSeats} / {item.totalSeats}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Request Action Button with distinct colors */}
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        {isTypeA ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRequestingListing(item);
                              setReqRouteFrom(searchFrom || 'Mannar Town');
                              setReqRouteTo(searchTo || '');
                              setReqTravelDate(searchDate);
                              setReqSeats(1);
                              setReqPassengerName(currentUser?.name || currentUser?.username || '');
                              setReqPassengerPhone(currentUser?.phone || '+94 77 123 4567');
                            }}
                            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Book Vehicle</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRequestingListing(item);
                              setReqRouteFrom(item.plannedFrom || 'Mannar Town');
                              setReqRouteTo(item.plannedTo || 'Jaffna');
                              setReqTravelDate(item.plannedTripDate || searchDate);
                              setReqSeats(Math.min(searchPassengers, item.availableSeats || 1));
                              setReqPassengerName(currentUser?.name || currentUser?.username || '');
                              setReqPassengerPhone(currentUser?.phone || '+94 77 123 4567');
                            }}
                            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Book Vehicle</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls (Max 20 rows per page) */}
            {sortedListings.length > pageSize && (
              <div className="p-3 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-500">
                  Showing <strong className="text-slate-800">{(searchPage - 1) * pageSize + 1}</strong> to{' '}
                  <strong className="text-slate-800">{Math.min(searchPage * pageSize, sortedListings.length)}</strong> of{' '}
                  <strong className="text-slate-800">{sortedListings.length}</strong> vehicles
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={searchPage === 1}
                    onClick={() => setSearchPage(p => Math.max(1, p - 1))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: searchTotalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSearchPage(p)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                          searchPage === p
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={searchPage === searchTotalPages}
                    onClick={() => setSearchPage(p => Math.min(searchTotalPages, p + 1))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: REQUESTS & PAYMENT PIPELINE
      ───────────────────────────────────────────────────────────── */}
      {view === 'requests' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Transport Booking Requests & Payments</h3>
              <p className="text-xs text-slate-500">
                MGR Transport Booking lifecycle: Request ➔ Owner sets travel charge ➔ Passenger pays ➔ Confirmed.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600">Filter Status:</label>
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setReqPage(1);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-800 shadow-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Requests</option>
                <option value="pending_owner">Pending Owner Review</option>
                <option value="awaiting_payment">Awaiting Payment</option>
                <option value="confirmed">Confirmed</option>
                <option value="owner_rejected">Declined</option>
              </select>
            </div>
          </div>

          {/* Table Format */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  {renderSortHeader('Request # & Type', 'requestNumber', reqSortField, reqSortDir, () => handleSort('requestNumber', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage))}
                  {renderSortHeader('Vehicle / Reg', 'vehicleName', reqSortField, reqSortDir, () => handleSort('vehicleName', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage))}
                  {renderSortHeader('Passenger', 'passenger', reqSortField, reqSortDir, () => handleSort('passenger', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage))}
                  {renderSortHeader('Route & Date', 'routeFrom', reqSortField, reqSortDir, () => handleSort('routeFrom', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage))}
                  {renderSortHeader('Pricing', 'finalAmount', reqSortField, reqSortDir, () => handleSort('finalAmount', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage))}
                  {renderSortHeader('Status', 'requestStatus', reqSortField, reqSortDir, () => handleSort('requestStatus', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage))}
                  <th className="py-3.5 px-4 text-center break-words">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No requests found matching your filter.
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map(req => {
                    const isPending = req.requestStatus === 'pending_owner';
                    const isAwaiting = req.requestStatus === 'awaiting_payment';
                    const isConfirmed = req.requestStatus === 'confirmed';

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 break-words">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block break-words">
                            {req.requestNumber}
                          </span>
                          <span className="text-[10px] font-bold block mt-1 text-slate-500 break-words">
                            {req.listingMode === 'availability_only' ? 'Vehicle Booking' : `Seat Booking (${req.seatCount} seat)`}
                          </span>
                        </td>

                        <td className="py-3 px-4 break-words">
                          <div className="font-bold text-slate-900 break-words">{req.vehicleName}</div>
                          <span className="font-mono text-[10px] text-slate-400 break-words">{req.registrationNumber}</span>
                        </td>

                        <td className="py-3 px-4 break-words">
                          <div className="font-bold text-slate-900 break-words">{req.passenger.name}</div>
                          <span className="text-[11px] text-slate-500 break-words">{req.passenger.phone}</span>
                        </td>

                        <td className="py-3 px-4 break-words">
                          <div className="font-medium text-slate-800 break-words">
                            {req.routeFrom} ➔ {req.routeTo}
                          </div>
                          <span className="text-[10px] text-slate-500 block break-words">
                            📅 {req.travelDate} {req.travelTime ? `at ${req.travelTime}` : ''}
                          </span>
                        </td>

                        {/* Pricing */}
                        <td className="py-3 px-4 break-words">
                          {isPending ? (
                            <span className="text-[11px] text-amber-700 font-semibold italic">
                              Awaiting Owner Charge
                            </span>
                          ) : req.finalAmount ? (
                            <div className="break-words">
                              <div className="font-extrabold text-emerald-700">
                                Rs. {req.finalAmount.toLocaleString()}
                              </div>
                              <span className="text-[10px] text-slate-400 block break-words">
                                Charge: {req.ownerTravelCharge?.toLocaleString()} + Fee: {req.convenienceFee?.toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 break-words">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border break-words ${
                              isConfirmed
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isAwaiting
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : isPending
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {req.requestStatus.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 break-words text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingRequest(req)}
                              className="p-1 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <a
                              href={getWhatsAppUrl(req.passenger.whatsapp, `Hi ${req.passenger.name}, regarding your transport booking ${req.requestNumber}.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-emerald-600 hover:text-emerald-700 transition"
                              title="Chat WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>

                            {isOwnerOrAdmin && isPending && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewingRequest(req);
                                  setOwnerChargeInput(20000);
                                  setRejectionReasonInput('');
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                              >
                                Review / Accept
                              </button>
                            )}

                            {isAwaiting && (
                              <button
                                type="button"
                                onClick={() => setPayingRequest(req)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer flex items-center gap-1"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay Now</span>
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
          </div>

          {/* Pagination Controls (Max 20 rows per page) */}
          {sortedRequests.length > pageSize && (
            <div className="p-3 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-500">
                Showing <strong className="text-slate-800">{(reqPage - 1) * pageSize + 1}</strong> to{' '}
                <strong className="text-slate-800">{Math.min(reqPage * pageSize, sortedRequests.length)}</strong> of{' '}
                <strong className="text-slate-800">{sortedRequests.length}</strong> requests
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={reqPage === 1}
                  onClick={() => setReqPage(p => Math.max(1, p - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: reqTotalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setReqPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                        reqPage === p
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={reqPage === reqTotalPages}
                  onClick={() => setReqPage(p => Math.min(reqTotalPages, p + 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 3: OWNER LISTINGS MANAGEMENT (Type A & Type B)
      ───────────────────────────────────────────────────────────── */}
      {view === 'owner-listings' && (
        <div className="space-y-6">
          {/* Top Bar: Overview & Quick Actions */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Owner Vehicle Listings & Schedules</h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Type A & Type B Unified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage monthly availability calendars (Type A) and scheduled planned route trips (Type B) inside this unified card.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingListing('availability_only')}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Availability</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewListVehicleId(activeCalendarVehicleId || '');
                  setIsAddingListing('planned_trip');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Schedule Route Trip</span>
              </button>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════
              UNIFIED AVAILABILITY (TYPE A) & PLANNED TRIPS (TYPE B) CARD
          ═════════════════════════════════════════════════════════════ */}
          <div className="p-5 rounded-2xl border-2 border-slate-300 bg-white shadow-sm space-y-4">
            {/* Header: Vehicle Picker & Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Vehicle Availability & Route Schedule Calendar
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Slightly darker, compact display presenting both Type A availability status and Type B scheduled route trips in one window.
                  </p>
                </div>
              </div>

              {/* Scoped Vehicle Dropdown (Logged-in Owner's vehicles only) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Vehicle:</span>
                <select
                  value={activeCalendarVehicleId}
                  onChange={e => setSelectedCalendarVehicleId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white cursor-pointer shadow-xs"
                >
                  {myOwnerVehicles.length === 0 ? (
                    <option value="">No vehicles registered yet</option>
                  ) : (
                    myOwnerVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.registrationNumber}) — {v.type.toUpperCase()}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Controls Bar: Month Nav, Paint Brush, Batch Tools, and SAVE BUTTON */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-100 p-3 rounded-xl border border-slate-300 text-xs">
              {/* Month Navigation */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-black text-xs sm:text-sm text-slate-900 min-w-[140px] text-center">
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date())}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 font-bold cursor-pointer text-xs shadow-2xs"
                >
                  Today
                </button>
              </div>

              {/* Paint Tool Dropdown */}
              <div className="flex items-center gap-2">
                <label className="font-bold text-slate-800 text-xs">Paint Availability:</label>
                <select
                  value={selectedBrush}
                  onChange={e => setSelectedBrush(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl font-bold border border-slate-300 bg-white text-slate-900 shadow-xs focus:outline-none focus:border-emerald-600 cursor-pointer text-xs"
                >
                  <option value="available">🟢 Available (Green)</option>
                  <option value="tentative">🟡 Tentative / Holding (Yellow)</option>
                  <option value="booked">🔴 Booked / Reserved (Red)</option>
                  <option value="planned">🔵 Route / Planned (Blue)</option>
                  <option value="off">⚪ Off / Unavailable (Grey)</option>
                </select>
              </div>

              {/* Quick Batch Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleBatchMarkMonth('available')}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-400 text-emerald-800 hover:bg-emerald-50 font-bold transition cursor-pointer text-[11px] shadow-2xs"
                >
                  ✓ Mark Month Available
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchMarkMonth('off')}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold transition cursor-pointer text-[11px] shadow-2xs"
                >
                  ✕ Clear Month
                </button>
              </div>

              {/* SAVE / DISCARD ACTIONS (Requirement 3) */}
              <div className="flex items-center gap-2">
                {calendarSaveFeedback && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{calendarSaveFeedback}</span>
                  </div>
                )}

                {hasUnsavedCalendarChanges && (
                  <button
                    type="button"
                    onClick={handleDiscardCalendarAvailability}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Discard</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveCalendarAvailability}
                  disabled={!hasUnsavedCalendarChanges}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer ${
                    hasUnsavedCalendarChanges
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400 shadow-md'
                      : 'bg-slate-300 text-slate-600 cursor-not-allowed opacity-70'
                  }`}
                  title={hasUnsavedCalendarChanges ? "Save your staged calendar edits" : "No pending calendar changes"}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Availability</span>
                  {hasUnsavedCalendarChanges && (
                    <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping ml-0.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Darker, Compact Unified Calendar Grid (Type A + Type B in same cell) */}
            <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="grid grid-cols-7 bg-slate-200 border-b-2 border-slate-300 text-center font-black text-slate-800 text-[11px] py-2 tracking-wide uppercase">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>
              <div className="grid grid-cols-7 text-xs divide-x divide-y divide-slate-300 bg-slate-100/60">
                {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() }).map((_, idx) => (
                  <div key={`avail-empty-${idx}`} className="min-h-[58px] sm:min-h-[64px] bg-slate-100 p-1" />
                ))}
                {Array.from({ length: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate() }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  
                  // Type A Status from draft or saved map
                  const currentStatus = draftDateAvailabilityMap[dateStr] || 
                    activeCalendarListing?.dateAvailabilityMap?.[dateStr] || 
                    (activeCalendarListing?.availableDates?.includes(dateStr) ? 'available' : 'off');

                  const statusConfig = {
                    available: { label: 'Available', short: 'AVAIL', bg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-300 text-emerald-950', dot: 'bg-emerald-600' },
                    tentative: { label: 'Tentative', short: 'TENT', bg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-300 text-amber-950', dot: 'bg-amber-600' },
                    booked: { label: 'Booked', short: 'BOOKED', bg: 'bg-rose-50 hover:bg-rose-100/80 border-rose-300 text-rose-950', dot: 'bg-rose-600' },
                    planned: { label: 'Route', short: 'ROUTE', bg: 'bg-blue-50 hover:bg-blue-100/80 border-blue-300 text-blue-950', dot: 'bg-blue-600' },
                    off: { label: 'Off', short: 'OFF', bg: 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500', dot: 'bg-slate-400' },
                  }[currentStatus as 'available' | 'tentative' | 'booked' | 'planned' | 'off'] || {
                    label: 'Off', short: 'OFF', bg: 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500', dot: 'bg-slate-400'
                  };

                  // Type B: Planned Route Trips on this date for this vehicle
                  const tripsOnDate = listings.filter(l => 
                    l.listingMode === 'planned_trip' && 
                    l.vehicleId === activeCalendarVehicleId && 
                    l.plannedTripDate === dateStr
                  );

                  const isToday = todayYMD === dateStr;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => handlePaintDate(dateStr)}
                      className={`min-h-[58px] sm:min-h-[64px] p-1.5 transition cursor-pointer flex flex-col justify-between border select-none ${statusConfig.bg}`}
                      title={`Date: ${dateStr}\nType A: ${statusConfig.label}\nType B Trips: ${tripsOnDate.length}\nClick to paint as ${selectedBrush.toUpperCase()}`}
                    >
                      {/* Top Row: Date Number & Type A Status Badge */}
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[11px] font-black leading-none ${
                          isToday ? 'w-5 h-5 rounded-full bg-slate-950 text-white flex items-center justify-center font-bold shadow-xs' : 'text-slate-900'
                        }`}>
                          {dayNum}
                        </span>

                        <div className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${statusConfig.dot} shrink-0`} />
                          <span className="text-[9px] font-extrabold uppercase tracking-tight hidden sm:inline">
                            {statusConfig.short}
                          </span>
                        </div>
                      </div>

                      {/* Middle/Bottom: Type B Planned Route Trip Pills inside same cell */}
                      <div className="space-y-0.5 mt-1 overflow-hidden">
                        {tripsOnDate.length > 0 ? (
                          tripsOnDate.slice(0, 1).map(trip => (
                            <div
                              key={trip.id}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="px-1 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold leading-tight truncate shadow-2xs flex items-center gap-0.5"
                              title={`Type B Route: ${trip.plannedFrom} ➔ ${trip.plannedTo} at ${trip.departureTime} (${trip.availableSeats} seats left)`}
                            >
                              <span className="truncate">🚌 {trip.departureTime} {trip.plannedTo}</span>
                            </div>
                          ))
                        ) : null}

                        {tripsOnDate.length > 1 && (
                          <div className="text-[8px] font-bold text-blue-700 leading-none">
                            +{tripsOnDate.length - 1} more trip
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Combined Legend */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200 text-[11px] text-slate-700">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-extrabold text-slate-900">Legend:</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> 🟢 Green = Available (Type A)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 🟡 Yellow = Tentative</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> 🔴 Red = Booked</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> ⚪ Grey = Off</span>
                <span className="flex items-center gap-1"><span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">🚌 Blue Pill</span> = Scheduled Route Trip (Type B)</span>
              </div>
              <span className="text-[10px] text-slate-500 italic">
                *Click any date cell to paint Type A status. Remember to click "Save Availability" to persist changes.
              </span>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════
              SECTION 1: YOUR AVAILABLE DATE LISTINGS (TYPE A)
              Requirement 6: Strictly Today to +30 days for owners
          ═════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Your Available Date Listings ({availableOwnerListings.length})
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {!isAppAdmin ? `Next 30 Days (Today - ${max30YMD})` : 'Admin View: All Dates (Past & Future)'}
                </span>
              </div>
              {!isAppAdmin && (
                <span className="text-[11px] text-slate-500 italic">
                  *Past availability dates are automatically filtered out.
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Vehicle / Reg #</th>
                    <th className="py-3.5 px-4">Available Schedule (Next 30 Days)</th>
                    <th className="py-3.5 px-4">Capacity</th>
                    <th className="py-3.5 px-4">Driver Option</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availableOwnerListings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No available date listings found for your vehicles. Click '+ Add Availability' above.
                      </td>
                    </tr>
                  ) : (
                    availableOwnerListings.map(lst => {
                      // Requirement 6: Strict Today + 30 days filtering for owners; admin sees all
                      const visibleDates = isAppAdmin 
                        ? (lst.availableDates || [])
                        : (lst.availableDates || []).filter(d => d >= todayYMD && d <= max30YMD);

                      return (
                        <tr key={lst.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 break-words">
                            <div className="font-bold text-slate-900 break-words">{lst.vehicleName}</div>
                            <span className="font-mono text-[10px] text-slate-400 break-words">{lst.registrationNumber}</span>
                          </td>
                          <td className="py-3 px-4 break-words">
                            <div className="flex flex-wrap gap-1">
                              {visibleDates.length > 0 ? (
                                visibleDates.slice(0, 6).map(d => {
                                  const isToday = d === todayYMD;
                                  return (
                                    <span
                                      key={d}
                                      className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${
                                        isToday
                                          ? 'bg-emerald-600 text-white border-emerald-700 font-bold'
                                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      }`}
                                    >
                                      {d}{isToday ? ' (Today)' : ''}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">
                                  {!isAppAdmin ? `No availability within next 30 days (Today – ${max30YMD})` : 'No dates painted'}
                                </span>
                              )}
                              {visibleDates.length > 6 && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                                  +{visibleDates.length - 6} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 break-words font-medium text-slate-800">
                            {lst.totalSeats} Passengers
                          </td>
                          <td className="py-3 px-4 break-words">
                            <span className="capitalize text-slate-700 bg-slate-50 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200 inline-block break-words">
                              {lst.driverOption === 'both' ? 'Discuss' : lst.driverOption.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 break-words">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase inline-block">
                              {lst.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 break-words text-center">
                            <button
                              type="button"
                              onClick={() => setListings(prev => prev.filter(l => l.id !== lst.id))}
                              className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete Listing"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════
              SECTION 2: YOUR SCHEDULED PLANNED ROUTE TRIPS (TYPE B)
              Inside the SAME window/card
          ═════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Your Scheduled Planned Trips ({plannedOwnerListings.length})
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Type B Fixed Routes
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Vehicle / Reg #</th>
                    <th className="py-3.5 px-4">Planned Route</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Seats Left / Total</th>
                    <th className="py-3.5 px-4">Fare / Seat</th>
                    <th className="py-3.5 px-4">Driver Option</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plannedOwnerListings.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No planned trips scheduled for your vehicles. Click '+ Schedule Route Trip' above.
                      </td>
                    </tr>
                  ) : (
                    plannedOwnerListings.map(lst => (
                      <tr key={lst.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 break-words">
                          <div className="font-bold text-slate-900 break-words">{lst.vehicleName}</div>
                          <span className="font-mono text-[10px] text-slate-400 break-words">{lst.registrationNumber}</span>
                        </td>
                        <td className="py-3 px-4 break-words font-bold text-blue-900">
                          <div className="space-y-0.5">
                            <div className="break-words"><span className="text-[10px] uppercase text-blue-600 font-extrabold mr-1">From:</span>{lst.plannedFrom || 'Mannar Town'}</div>
                            <div className="break-words"><span className="text-[10px] uppercase text-indigo-600 font-extrabold mr-1">To:</span>{lst.plannedTo || 'Jaffna City'}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 break-words">
                          <div className="font-semibold text-slate-800">{lst.plannedTripDate}</div>
                          <span className="text-[10px] text-slate-500">{lst.departureTime}</span>
                        </td>
                        <td className="py-3 px-4 break-words">
                          <strong className="text-emerald-700">{lst.availableSeats} / {lst.totalSeats} Seats</strong>
                        </td>
                        <td className="py-3 px-4 break-words font-bold text-slate-800">
                          Rs. {(lst.seatFare || 1200).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 break-words">
                          <span className="capitalize text-slate-700 bg-slate-50 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200 inline-block break-words">
                            {lst.driverOption === 'both' ? 'Discuss' : lst.driverOption.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 break-words">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase inline-block">
                            {lst.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 break-words text-center">
                          <button
                            type="button"
                            onClick={() => setListings(prev => prev.filter(l => l.id !== lst.id))}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: PASSENGER BOOKING REQUEST
      ───────────────────────────────────────────────────────────── */}
      {requestingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {requestingListing.registrationNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {requestingListing.listingMode === 'availability_only' ? 'Request Vehicle' : 'Request Seats'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRequestingListing(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {requestSuccessNumber ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Request Sent to Owner!</h4>
                <p className="text-xs text-slate-600">
                  Reference: <strong>{requestSuccessNumber}</strong>. The vehicle owner has been notified and will enter the travel charge.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendBookingRequest} className="space-y-3">
                {/* Passenger Name - prefilled with login user */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Passenger Name</label>
                  <input
                    type="text"
                    required
                    readOnly
                    value={reqPassengerName || currentUser?.name || currentUser?.username || 'Passenger'}
                    onChange={e => setReqPassengerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">From Location *</label>
                    <input
                      type="text"
                      required
                      value={reqRouteFrom}
                      onChange={e => setReqRouteFrom(e.target.value)}
                      disabled={requestingListing.listingMode === 'planned_trip'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">To Location *</label>
                    <input
                      type="text"
                      required
                      value={reqRouteTo}
                      onChange={e => setReqRouteTo(e.target.value)}
                      disabled={requestingListing.listingMode === 'planned_trip'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Travel Date *</label>
                    <input
                      type="date"
                      required
                      value={reqTravelDate}
                      onChange={e => setReqTravelDate(e.target.value)}
                      disabled={requestingListing.listingMode === 'planned_trip'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 disabled:bg-slate-100"
                    />
                  </div>

                  {requestingListing.listingMode === 'planned_trip' ? (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Required Seats *</label>
                      <input
                        type="number"
                        min={1}
                        max={requestingListing.availableSeats || 10}
                        required
                        value={reqSeats}
                        onChange={e => setReqSeats(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Wanted Pickup Time</label>
                      <input
                        type="time"
                        value={reqTravelTime}
                        onChange={e => setReqTravelTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Trip Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Need space for 4 large bags, senior citizen on board."
                    value={reqNotes}
                    onChange={e => setReqNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestingListing(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Send Request to Owner
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: OWNER REVIEW & ACCEPT (Enter Travel Charge)
      ───────────────────────────────────────────────────────────── */}
      {reviewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {reviewingRequest.requestNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Owner Review & Travel Charge</h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewingRequest(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
              <div><strong>Passenger:</strong> {reviewingRequest.passenger.name} ({reviewingRequest.passenger.phone})</div>
              <div><strong>Route:</strong> {reviewingRequest.routeFrom} ➔ {reviewingRequest.routeTo}</div>
              <div><strong>Date:</strong> {reviewingRequest.travelDate} {reviewingRequest.travelTime ? `at ${reviewingRequest.travelTime}` : ''}</div>
              {reviewingRequest.specialNotes && (
                <div className="text-slate-500 italic mt-1">"{reviewingRequest.specialNotes}"</div>
              )}
            </div>

            {/* Travel Charge Input */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Your Travel Charge (Rs.) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rs.</span>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  required
                  value={ownerChargeInput}
                  onChange={e => setOwnerChargeInput(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 font-extrabold text-sm text-slate-900"
                />
              </div>
            </div>

            {/* Calculated Breakdown */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Owner Travel Charge:</span>
                <span>Rs. {Number(ownerChargeInput).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Convenience Fee ({convenienceFeePercentage}%):</span>
                <span>Rs. {Math.round(Number(ownerChargeInput) * (convenienceFeePercentage / 100)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-extrabold text-emerald-800 pt-1 border-t border-emerald-200">
                <span>Passenger Final Payable:</span>
                <span>
                  Rs. {(
                    Number(ownerChargeInput) +
                    Math.round(Number(ownerChargeInput) * (convenienceFeePercentage / 100))
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleOwnerReject(reviewingRequest)}
                className="px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold"
              >
                Decline Request
              </button>
              <button
                type="button"
                onClick={() => handleOwnerAccept(reviewingRequest)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Accept & Send Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: PASSENGER PAYMENT (Simulated Gateway / Success)
      ───────────────────────────────────────────────────────────── */}
      {payingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {payingRequest.requestNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Complete Passenger Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setPayingRequest(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Service:</span>
                <strong className="text-slate-800">{payingRequest.vehicleName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Route:</span>
                <span className="text-slate-800 font-medium">{payingRequest.routeFrom} ➔ {payingRequest.routeTo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Travel Date:</span>
                <span className="text-slate-800">{payingRequest.travelDate}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-sm text-emerald-800">
                <span>Total Amount:</span>
                <span>Rs. {(payingRequest.finalAmount || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
              <p className="font-bold">Production Payment Gateway Note:</p>
              <p className="text-[11px] mt-0.5">
                In production, this triggers your payment gateway (e.g. PayHere / Stripe). Upon verified webhook callback, the booking confirms and locks calendar dates/seats automatically.
              </p>
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayingRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCompletePayment(payingRequest)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Payment Complete / Success</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VIEW DETAILS
      ───────────────────────────────────────────────────────────── */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {viewingRequest.requestNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Booking Request Record</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Passenger</span>
                <strong className="text-slate-800">{viewingRequest.passenger.name} ({viewingRequest.passenger.phone})</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Vehicle & Owner</span>
                <strong className="text-slate-800">{viewingRequest.vehicleName} • Owner: {viewingRequest.ownerName}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase">Route & Date</span>
                <strong className="text-slate-800">{viewingRequest.routeFrom} ➔ {viewingRequest.routeTo}</strong>
                <div className="text-slate-500 mt-0.5">{viewingRequest.travelDate} at {viewingRequest.travelTime || '08:00'}</div>
              </div>
              {viewingRequest.finalAmount && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Final Amount</span>
                    <span className="text-slate-500">Payment Status: {viewingRequest.paymentStatus.toUpperCase()}</span>
                  </div>
                  <span className="text-base font-extrabold text-emerald-800">
                    Rs. {viewingRequest.finalAmount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW LISTING (Type A / Type B)
      ───────────────────────────────────────────────────────────── */}
      {isAddingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {isAddingListing === 'availability_only'
                  ? 'Publish Available Dates (Type A)'
                  : 'Publish Planned Trip (Type B)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingListing(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewListing} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Fleet Vehicle *</label>
                <select
                  value={newListVehicleId}
                  onChange={e => setNewListVehicleId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.registrationNumber}) - {v.totalSeats} Seats
                    </option>
                  ))}
                </select>
              </div>

              {isAddingListing === 'availability_only' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Available Dates (Comma-separated YYYY-MM-DD) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="2026-09-12, 2026-09-15, 2026-09-18"
                    value={newListDates}
                    onChange={e => setNewListDates(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Passenger will specify their own From/To route when booking on these dates.
                  </span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">From Location *</label>
                      <input
                        type="text"
                        required
                        value={newPlannedFrom}
                        onChange={e => setNewPlannedFrom(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                        placeholder="e.g. Mannar Town"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">To Location *</label>
                      <input
                        type="text"
                        required
                        value={newPlannedTo}
                        onChange={e => setNewPlannedTo(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                        placeholder="e.g. Jaffna City"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Trip Date *</label>
                      <input
                        type="date"
                        required
                        value={newPlannedDate}
                        onChange={e => setNewPlannedDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Time *</label>
                      <input
                        type="time"
                        required
                        value={newPlannedTime}
                        onChange={e => setNewPlannedTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Available Seats *</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={newPlannedSeats}
                        onChange={e => setNewPlannedSeats(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingListing(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save & Publish Listing</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const MGRTransportBooking = MGRHotelStyleBooking;
