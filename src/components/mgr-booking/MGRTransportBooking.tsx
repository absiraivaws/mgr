/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Search,
  CreditCard,
  Eye,
  Trash2,
  X,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Save,
  Lock,
  Pencil,
  AlertTriangle,
  Star,
  UserCheck,
  Play,
  CheckSquare,
  ShieldCheck,
} from 'lucide-react';
import { TransportVehicle, TransportOwner, DriverOption, TransportReview } from '../../types/mgrBooking';
import {
  TransportV2Listing,
  TransportV2Request,
  TransportListingMode,
  TransportRequestStatus,
  TransportPaymentStatus,
} from '../../types/mgrTransportV2';
import { triggerLifecycleNotifications, getWhatsAppUrl } from '../../utils/mgrTransportNotifications';
import { formatVehicleCode, formatBookingCode, formatScheduleCode } from '../../utils/mgrUniqueId';
import { UserAccount, getMGRPersona, getOwnerIdForUser, isOwnedByUser, getStoredUsers } from '../../utils/auth';
import { fetchTransportRequestsV2, syncTransportRequestV2ToSupabase, deleteTransportRequestV2FromSupabase, syncTransportListingsToSupabase } from '../../lib/supabaseSync';
import { MGRPaymentModal } from './MGRPaymentModal';

export interface MGRTransportBookingProps {
  view: 'search' | 'requests' | 'owner-listings';
  vehicles: TransportVehicle[];
  owners: TransportOwner[];
  currentUser?: UserAccount;
  convenienceFeePercentage?: number; // default 5%
  settings?: MarketplaceSettings;
}

// Helper: Storage helpers for Transport Ratings & Reviews (Requirement 9)
export const getStoredTransportReviews = (): TransportReview[] => {
  try {
    const raw = localStorage.getItem('mgr_transport_reviews');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveTransportReviewLocally = (review: TransportReview): boolean => {
  try {
    const existing = getStoredTransportReviews();
    const alreadyReviewed = existing.some(
      r => r.bookingId === review.bookingId && r.reviewerId === review.reviewerId
    );
    if (alreadyReviewed) {
      alert('You have already submitted a review for this booking. Maximum 1 review per user per booking.');
      return false;
    }
    const updated = [review, ...existing];
    localStorage.setItem('mgr_transport_reviews', JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
};

// Helper: Convert actual fleet vehicles into active listings dynamically (Trip & Schedule based on Availability)
const createListingsFromVehicles = (
  vehiclesList: TransportVehicle[],
  ownersList: TransportOwner[]
): TransportV2Listing[] => {
  const listings: TransportV2Listing[] = [];
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
  const max30Date = new Date();
  max30Date.setDate(max30Date.getDate() + 30);
  const max30Str = max30Date.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

  vehiclesList.forEach((v, vIdx) => {
    if (v.status === 'suspended' || v.status === 'maintenance') return;

    const matchedOwner = ownersList.find(o => o.id === v.ownerId);
    const ownerName = matchedOwner?.fullName || v.ownerName || 'MGR Transport Operator';
    const ownerPhone = matchedOwner?.mobileNumber || '+94 77 123 4567';
    const ownerWhatsApp = matchedOwner?.whatsappNumber || matchedOwner?.mobileNumber || '+94 77 123 4567';
    const vehicleName = `${v.make} ${v.model}`;
    const photos =
      v.photos && v.photos.length > 0
        ? v.photos
        : ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'];

    const vehicleCode = v.uniqueCode || formatVehicleCode(vIdx + 1, v.id);

    // 1. Generate Schedule Listings for all scheduled departure dates configured in Trip Availability
    if (v.schedules && v.schedules.length > 0) {
      v.schedules.forEach((s, sIdx) => {
        if (s.date >= todayStr && s.date <= max30Str) {
          const scheduleCode = s.uniqueCode || formatScheduleCode(sIdx + 1, s.id);
          listings.push({
            id: `LST-${v.id}-${s.id}`,
            uniqueCode: scheduleCode,
            vehicleId: v.id,
            vehicleName,
            vehicleType: v.type,
            registrationNumber: v.registrationNumber,
            ownerId: v.ownerId,
            ownerName,
            ownerPhone,
            ownerWhatsApp,
            listingMode: 'schedule',
            totalSeats: s.totalSeats || v.totalSeats || 30,
            availableSeats: s.availableSeats !== undefined ? s.availableSeats : (s.totalSeats || v.totalSeats || 30),
            driverOption: v.driverOption || 'with_driver',
            plannedTripDate: s.date,
            plannedFrom: s.fromLocation || s.from || 'Mannar Town',
            plannedTo: s.toLocation || s.to || 'Jaffna City',
            departureTime: s.startTime,
            seatFare: s.pricePerSeat || v.pricePerSeat || 1200,
            photos,
            status: 'active',
            createdAt: v.createdAt || Date.now(),
            updatedAt: Date.now(),
          });
        }
      });
    }

    // 2. Generate Trip Listings based ONLY on the dates selected by the Owner under Trip Availability
    const tripDates = (v.availableDates || []).filter(d => d >= todayStr && d <= max30Str);
    const hasSchedules = v.schedules && v.schedules.length > 0;

    // A vehicle can serve as Trip hire if it has trip dates or no timetable schedules set
    if (tripDates.length > 0 || (!hasSchedules && v.bookingType !== 'schedule')) {
      listings.push({
        id: `LST-${v.id}`,
        uniqueCode: vehicleCode,
        vehicleId: v.id,
        vehicleName,
        vehicleType: v.type,
        registrationNumber: v.registrationNumber,
        ownerId: v.ownerId,
        ownerName,
        ownerPhone,
        ownerWhatsApp,
        listingMode: 'trip',
        totalSeats: v.totalSeats || 4,
        driverOption: v.driverOption || 'both',
        availableDates: tripDates,
        photos,
        status: 'active',
        createdAt: v.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
    }
  });

  return listings;
};

export const MGRTransportBooking: React.FC<MGRTransportBookingProps> = ({
  view,
  vehicles,
  owners,
  currentUser,
  convenienceFeePercentage = 5,
  settings,
}) => {
  const persona = getMGRPersona(currentUser);
  const isOwnerOrAdmin = persona === 'owner' || persona === 'admin';
  const isAppAdmin = persona === 'admin';
  const isStaffUser = persona === 'staff';
  const isPassengerUser = persona === 'passenger';
  const isOwnerUser = persona === 'owner';
  const isDriverUser = persona === 'driver';

  const currentUserEmail = (currentUser?.email || '').toLowerCase().trim();
  const currentUserName = (currentUser?.name || '').toLowerCase().trim();
  const currentUserPhone = (currentUser?.phone || '').trim();

  // Scoped logged-in owner info using centralized helper
  const myOwnerId = getOwnerIdForUser(currentUser, owners);
  const myOwnerRecord = owners.find(o => o.id === myOwnerId) || owners.find(
    o =>
      (currentUserEmail && o.email && o.email.toLowerCase().trim() === currentUserEmail) ||
      (currentUserName && o.fullName && o.fullName.toLowerCase().trim() === currentUserName) ||
      (currentUserPhone && (o.mobileNumber === currentUserPhone || o.whatsappNumber === currentUserPhone))
  );

  const myVehicleIds = new Set(
    (vehicles || [])
      .filter(
        v =>
          isOwnedByUser(v.ownerId, currentUser, owners) ||
          (currentUserName && v.ownerName && v.ownerName.toLowerCase().trim() === currentUserName) ||
          (myOwnerRecord && myOwnerRecord.fullName && v.ownerName && v.ownerName.toLowerCase().trim() === myOwnerRecord.fullName.toLowerCase().trim())
      )
      .map(v => v.id)
  );

  // ─── DYNAMIC LISTINGS FROM ACTUAL VEHICLES (Requirement 9) ─────────
  const [listings, setListings] = useState<TransportV2Listing[]>(() => {
    return createListingsFromVehicles(vehicles || [], owners || []);
  });

  // Keep listings in sync when vehicles/availability/schedules change
  useEffect(() => {
    const generated = createListingsFromVehicles(vehicles || [], owners || []);
    setListings(generated);
    syncTransportListingsToSupabase(generated);
  }, [vehicles, owners]);

  // ─── REQUESTS PERSISTENCE (Clean storage without hardcoded demo arrays)
  const [requests, setRequests] = useState<TransportV2Request[]>(() => {
    try {
      const saved = localStorage.getItem('mgr_transport_v2_requests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [requestsHydrated, setRequestsHydrated] = useState(false);

  // Hydrate from Supabase and auto-poll on configured Data Sync Interval
  useEffect(() => {
    let cancelled = false;

    const syncRequestsFromRemote = () => {
      fetchTransportRequestsV2()
        .then((remote) => {
          if (cancelled) return;
          setRequests((prev) => {
            const remoteList = remote || [];
            // Retain any local requests that haven't synced to remote yet, and push them up
            const unsynced = prev.filter((p) => !remoteList.some((r) => r.id === p.id));
            unsynced.forEach((r) => syncTransportRequestV2ToSupabase(r));
            const merged = [...remoteList, ...unsynced];
            try {
              localStorage.setItem('mgr_transport_v2_requests', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        })
        .finally(() => {
          if (!cancelled) setRequestsHydrated(true);
        });
    };

    syncRequestsFromRemote();

    const intervalMs = settings?.dataSyncInterval || 30000;
    const timer = setInterval(syncRequestsFromRemote, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [settings?.dataSyncInterval]);

  useEffect(() => {
    localStorage.setItem('mgr_transport_v2_requests', JSON.stringify(requests));
    if (!requestsHydrated) return;
    requests.forEach((r) => syncTransportRequestV2ToSupabase(r));
  }, [requests, requestsHydrated]);

  // ─── SEARCH VIEW STATE ─────────────────────────────────────────────
  const [globalSearch, setGlobalSearch] = useState<string>('');
  // Filter options strictly: 'all' | 'trip' | 'schedule' (Requirement 1)
  const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'trip' | 'schedule'>('all');
  const [searchType, setSearchType] = useState<string>('all');
  const [searchDate, setSearchDate] = useState<string>(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }));
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
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // ─── MODAL STATES ──────────────────────────────────────────────────
  // 1. Passenger Booking Modal (Trip or Schedule Direct)
  const [requestingListing, setRequestingListing] = useState<TransportV2Listing | null>(null);
  const [reqPassengerName, setReqPassengerName] = useState('');
  const [reqPassengerPhone, setReqPassengerPhone] = useState('');
  const [reqRouteFrom, setReqRouteFrom] = useState('Mannar Town');
  const [reqRouteTo, setReqRouteTo] = useState('');
  const [reqTravelDate, setReqTravelDate] = useState(searchDate);
  const [reqTravelTime, setReqTravelTime] = useState('08:00');
  const [reqSeats, setReqSeats] = useState(1);
  const [reqNotes, setReqNotes] = useState('');
  const [bookingSuccessModal, setBookingSuccessModal] = useState<{
    requestNumber: string;
    isSchedule: boolean;
    totalAmount?: number;
    seats?: number;
  } | null>(null);

  // 2. Owner Review Modal State (for Trip bookings only - starts blank, no spinner, Requirement 7)
  const [reviewingRequest, setReviewingRequest] = useState<TransportV2Request | null>(null);
  const [ownerChargeInput, setOwnerChargeInput] = useState<string>('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');

  // 3. Passenger Payment Modal (for Trip bookings awaiting payment)
  const [payingRequest, setPayingRequest] = useState<TransportV2Request | null>(null);

  // 4. View Details Modal
  const [viewingRequest, setViewingRequest] = useState<TransportV2Request | null>(null);

  // 5. Edit Request Modal (Requirements 10 & 11)
  const [editingRequest, setEditingRequest] = useState<TransportV2Request | null>(null);
  const [editFrom, setEditFrom] = useState('');
  const [editTo, setEditTo] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editSeats, setEditSeats] = useState(1);
  const [editNotes, setEditNotes] = useState('');
  const [editCharge, setEditCharge] = useState<string>('');
  const [editStatus, setEditStatus] = useState<TransportRequestStatus>('pending_owner');
  const [editPaymentStatus, setEditPaymentStatus] = useState<TransportPaymentStatus>('pending');
  const [editPassengerPhone, setEditPassengerPhone] = useState('');
  const [editSuccessFeedback, setEditSuccessFeedback] = useState<string | null>(null);

  // 6. Delete Confirmation Modal (Requirement 11, Admin Only)
  const [deletingRequest, setDeletingRequest] = useState<TransportV2Request | null>(null);

  // 7. Driver Assignment Modal State (Lifecycle Requirement 8)
  const [assigningDriverRequest, setAssigningDriverRequest] = useState<TransportV2Request | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [customDriverName, setCustomDriverName] = useState<string>('');
  const [customDriverPhone, setCustomDriverPhone] = useState<string>('');

  // 8. Rating & Review Modal State (Requirement 9: 1–5 stars & review, max 1 review per user per booking)
  const [reviewingBooking, setReviewingBooking] = useState<TransportV2Request | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewsListModal, setReviewsListModal] = useState<boolean>(false);

  // ─── FIFO SEAT CAPACITY CALCULATION (MD Section 3) ──────────────────
  // Formula: Remaining Seats = Total Capacity - Confirmed Seats - Active FIFO Holds (15-min)
  const getRemainingSeatsForListing = (listing: TransportV2Listing): number => {
    const isSchedule = listing.listingMode === 'schedule' || listing.listingMode === 'planned_trip';
    if (!isSchedule) return listing.totalSeats || 4;

    const confirmedSeats = requests
      .filter(r => r.listingId === listing.id && (r.paymentStatus === 'paid' || r.requestStatus === 'confirmed'))
      .reduce((acc, r) => acc + (r.seatCount || 1), 0);

    const now = Date.now();
    const FIFOHoldMs = 15 * 60 * 1000;
    const activeHolds = requests
      .filter(r =>
        r.listingId === listing.id &&
        (r.requestStatus === 'pending_owner' || r.requestStatus === 'awaiting_payment') &&
        r.paymentStatus !== 'paid' &&
        r.requestStatus !== 'owner_rejected' &&
        r.requestStatus !== 'cancelled' &&
        ((r.holdExpiresAt && r.holdExpiresAt > now) || (now - (r.createdAt || 0) < FIFOHoldMs))
      )
      .reduce((acc, r) => acc + (r.seatCount || 1), 0);

    const totalCapacity = listing.totalSeats || 30;
    return Math.max(0, totalCapacity - confirmedSeats - activeHolds);
  };

  // ─── FILTER LISTINGS FOR SEARCH ────────────────────────────────────
  const filteredListings = listings.filter(item => {
    if (item.status !== 'active') return false;

    const isScheduleMode = item.listingMode === 'schedule' || item.listingMode === 'planned_trip';
    const isTripMode = item.listingMode === 'trip' || item.listingMode === 'availability_only';

    // Terminology filter: 'all' | 'trip' | 'schedule' (Requirement 1)
    if (listingTypeFilter === 'trip' && !isTripMode) return false;
    if (listingTypeFilter === 'schedule' && !isScheduleMode) return false;

    // Global search
    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase().trim();
      const matchVehicle = (item.vehicleName || '').toLowerCase().includes(q);
      const matchReg = (item.registrationNumber || '').toLowerCase().includes(q);
      const matchOwner = (item.ownerName || '').toLowerCase().includes(q);
      const matchType = (item.vehicleType || '').toLowerCase().replace('_', ' ').includes(q);
      const matchDriver = (item.driverOption || '').toLowerCase().replace('_', ' ').includes(q);
      const matchFrom = (item.plannedFrom || '').toLowerCase().includes(q);
      const matchTo = (item.plannedTo || '').toLowerCase().includes(q);
      const matchDates =
        (item.availableDates || []).some(d => d.includes(q)) || (item.plannedTripDate || '').includes(q);

      if (!matchVehicle && !matchReg && !matchOwner && !matchType && !matchDriver && !matchFrom && !matchTo && !matchDates) {
        return false;
      }
    }

    // Vehicle Category filter
    if (searchType !== 'all') {
      if (searchType === 'bus') {
        if (item.vehicleType !== 'bus' && item.vehicleType !== 'bus_trip' && item.vehicleType !== 'route_bus') {
          return false;
        }
      } else if (item.vehicleType !== searchType) {
        return false;
      }
    }

    // Driver Option filter
    if (searchDriverOption !== 'all') {
      if (searchDriverOption === 'with_driver' && item.driverOption === 'without_driver') return false;
      if (searchDriverOption === 'without_driver' && item.driverOption === 'with_driver') return false;
    }

    // Trip vs Schedule search checks
    if (isTripMode) {
      // Vehicle availability must be based ONLY on the dates selected by the Owner under Trip Availability.
      // Owners can select availability only for the next 30 days maximum.
      if (searchDate) {
        if (!item.availableDates || !item.availableDates.includes(searchDate)) return false;
      } else {
        // If no travel date is filtered, only show vehicles that have at least one active date set by owner
        if (!item.availableDates || item.availableDates.length === 0) return false;
      }
      if (item.totalSeats < searchPassengers) return false;
    } else {
      const remainingSeats = getRemainingSeatsForListing(item);
      if (remainingSeats <= 0) return false;
      if (searchDate && item.plannedTripDate && item.plannedTripDate !== searchDate) return false;
      if (searchFrom && item.plannedFrom && !item.plannedFrom.toLowerCase().includes(searchFrom.toLowerCase())) return false;
      if (searchTo && item.plannedTo && !item.plannedTo.toLowerCase().includes(searchTo.toLowerCase())) return false;
      if (remainingSeats < searchPassengers) return false;
    }

    return true;
  });

  // ─── FILTER REQUESTS (User Data Scoping & Role-Based Access Validation) ───
  const filteredRequests = requests.filter(req => {
    if (isAppAdmin) {
      // Admin: full access to all bookings
    } else if (isStaffUser) {
      // Staff: full staff visibility across bookings
    } else if (isDriverUser) {
      // Driver: only assigned/authorized booking information
      const matchesDriver =
        (req.driverId && currentUser?.id && req.driverId === currentUser.id) ||
        (req.driverName && currentUserName && req.driverName.toLowerCase().trim() === currentUserName) ||
        (req.driverPhone && currentUserPhone && req.driverPhone.trim() === currentUserPhone) ||
        myVehicleIds.has(req.vehicleId);
      if (!matchesDriver) return false;
    } else if (isOwnerUser) {
      // Owner: only own vehicles/bookings
      const isMyOwner = isOwnedByUser(req.ownerId, currentUser, owners);
      const isMyVehicle = myVehicleIds.has(req.vehicleId);
      const matchesOwnerName =
        (currentUserName && req.ownerName && req.ownerName.toLowerCase().trim() === currentUserName) ||
        (myOwnerRecord && myOwnerRecord.fullName && req.ownerName && req.ownerName.toLowerCase().trim() === myOwnerRecord.fullName.toLowerCase().trim());
      if (!isMyOwner && !isMyVehicle && !matchesOwnerName) return false;
    } else if (isPassengerUser) {
      // Passenger: only own bookings
      const passEmail = (req.passenger?.email || '').toLowerCase().trim();
      const passName = (req.passenger?.name || '').toLowerCase().trim();
      const passPhone = (req.passenger?.phone || '').trim();
      const matchesMe =
        (currentUserEmail && passEmail === currentUserEmail) ||
        (currentUserName && passName === currentUserName) ||
        (currentUserPhone && passPhone === currentUserPhone);
      if (!matchesMe) return false;
    } else {
      // Unauthenticated / other personas: deny access
      return false;
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

  // Sorting and pagination for search
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

  // Sorting and pagination for requests
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

  // ─── BOOKING HANDLERS ──────────────────────────────────────────────

  // 1. SCHEDULE: DIRECT SEAT BOOKING (Requirement 2)
  // Passenger enters seats, pickup, drop-off, views seat & admin amounts, makes payment and directly confirms seats.
  const handleScheduleDirectBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingListing) return;

    const finalPassengerName = reqPassengerName || currentUser?.name || currentUser?.username || 'Passenger';
    const finalPassengerPhone = reqPassengerPhone || currentUser?.phone || '+94 77 123 4567';

    const freshRemaining = getRemainingSeatsForListing(requestingListing);
    const requestedSeats = Number(reqSeats);
    if (requestedSeats > freshRemaining) {
      alert(`Only ${freshRemaining} seats are currently available. Please adjust your seat count.`);
      return;
    }
    if (requestedSeats < 1) {
      alert('Please enter at least 1 seat.');
      return;
    }

    const seatFare = requestingListing.seatFare || 1200;
    const seatSubtotal = requestedSeats * seatFare;
    const adminCharge = Math.round(seatSubtotal * (convenienceFeePercentage / 100));
    const totalAmount = seatSubtotal + adminCharge;

    const reqNum = formatBookingCode(requests.length + 1);

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
        email: currentUser?.email,
      },
      listingMode: 'schedule',
      travelDate: requestingListing.plannedTripDate || reqTravelDate,
      travelTime: requestingListing.departureTime || '08:00',
      routeFrom: reqRouteFrom.trim() || requestingListing.plannedFrom || 'Mannar Town',
      routeTo: reqRouteTo.trim() || requestingListing.plannedTo || 'Jaffna City',
      seatCount: requestedSeats,
      specialNotes: reqNotes,
      ownerTravelCharge: seatSubtotal,
      convenienceFee: adminCharge,
      convenienceFeePercentage,
      finalAmount: totalAmount,
      // Seat is held pending LankaQR payment; confirmed in handleCompletePayment
      requestStatus: 'awaiting_payment',
      paymentStatus: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const syncRes = await syncTransportRequestV2ToSupabase(newRequest);
    if (!syncRes.success) {
      alert(`Database error: Could not process booking request (${syncRes.error || 'Sync error'}). Please try again.`);
      return;
    }

    // Update requests state which reactively and accurately recalculates remaining seats via getRemainingSeatsForListing
    setRequests(prev => [newRequest, ...prev]);

    // Collect payment via LankaQR; confirmation flips the request to confirmed/paid
    setRequestingListing(null);
    setPayingRequest(newRequest);
  };

  // 2. TRIP: SUBMIT TRIP REQUEST TO OWNER (Requires Owner Accept -> Passenger Pay)
  const handleTripBookingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingListing) return;

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
    const max30Date = new Date();
    max30Date.setDate(max30Date.getDate() + 30);
    const max30Str = max30Date.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

    if (reqTravelDate < todayStr) {
      alert(`Cannot book past dates (${reqTravelDate}).`);
      return;
    }
    if (reqTravelDate > max30Str) {
      alert(`Vehicle availability is limited to the next 30 days maximum (up to ${max30Str}).`);
      return;
    }
    if (
      !requestingListing.availableDates ||
      !requestingListing.availableDates.includes(reqTravelDate)
    ) {
      alert(`Vehicle availability is based only on the dates selected by the Owner under Trip Availability. ${reqTravelDate} is not available for hire.`);
      return;
    }

    // Strict double-booking conflict prevention
    const conflict = requests.find(
      r =>
        r.vehicleId === requestingListing.vehicleId &&
        r.travelDate === reqTravelDate &&
        (r.requestStatus === 'confirmed' || r.requestStatus === 'pending_owner' || r.requestStatus === 'awaiting_payment')
    );
    if (conflict) {
      alert(`Vehicle availability conflict: This vehicle already has a ${conflict.requestStatus === 'confirmed' ? 'confirmed booking' : 'pending reservation'} on ${reqTravelDate}. Double bookings are strictly prohibited.`);
      return;
    }

    const finalPassengerName = reqPassengerName || currentUser?.name || currentUser?.username || 'Passenger';
    const finalPassengerPhone = reqPassengerPhone || currentUser?.phone || '+94 77 123 4567';

    const reqNum = formatBookingCode(requests.length + 1);
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
        email: currentUser?.email,
      },
      listingMode: 'trip',
      travelDate: reqTravelDate,
      travelTime: reqTravelTime,
      routeFrom: reqRouteFrom.trim() || 'Mannar Town',
      routeTo: reqRouteTo.trim() || 'Islandwide',
      seatCount: 1,
      specialNotes: reqNotes,
      requestStatus: 'pending_owner',
      paymentStatus: 'pending',
      holdExpiresAt: Date.now() + 15 * 60 * 1000, // 15-minute FIFO hold
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const syncResult = await syncTransportRequestV2ToSupabase(newRequest);
    if (!syncResult.success) {
      alert(`Database error: Could not submit trip booking request (${syncResult.error || 'Sync error'}). Please try again.`);
      return;
    }

    setRequests(prev => [newRequest, ...prev]);

    // Dispatch Lifecycle Notification (validating active channels)
    await triggerLifecycleNotifications('request_created', newRequest);

    setBookingSuccessModal({
      requestNumber: reqNum,
      isSchedule: false,
    });
    setRequestingListing(null);
  };

  // 3. OWNER ACCEPTS TRIP REQUEST WITH TRAVEL CHARGE (Requirement 7 & 8)
  const handleOwnerAcceptTrip = async (req: TransportV2Request) => {
    const charge = Number(ownerChargeInput);
    if (!ownerChargeInput || isNaN(charge) || charge <= 0) {
      alert('Travel Charge must start blank and require manual numeric entry. Please enter a valid amount before accepting.');
      return;
    }

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

    const syncRes = await syncTransportRequestV2ToSupabase(updated);
    if (!syncRes.success) {
      alert(`Database error: Could not accept request (${syncRes.error || 'Sync error'}). Previous status retained.`);
      return;
    }

    setRequests(prev => prev.map(r => (r.id === req.id ? updated : r)));
    setReviewingRequest(null);
    setOwnerChargeInput('');
    await triggerLifecycleNotifications('owner_accepted', updated);
    alert(`Request ${req.requestNumber} accepted with Travel Charge Rs. ${charge.toLocaleString()}! Passenger and Admin have been notified.`);
  };

  // 4. OWNER DECLINES REQUEST
  const handleOwnerReject = async (req: TransportV2Request) => {
    const updated: TransportV2Request = {
      ...req,
      requestStatus: 'owner_rejected',
      rejectionReason: rejectionReasonInput || 'Operator unable to accommodate on selected date.',
      updatedAt: Date.now(),
    };

    const syncRes = await syncTransportRequestV2ToSupabase(updated);
    if (!syncRes.success) {
      alert(`Database error: Could not decline request (${syncRes.error || 'Sync error'}). Previous status retained.`);
      return;
    }

    setRequests(prev => prev.map(r => (r.id === req.id ? updated : r)));
    setReviewingRequest(null);
    await triggerLifecycleNotifications('owner_rejected', updated);
    alert(`Request ${req.requestNumber} declined. Passenger and Admin updated.`);
  };

  // 5. PASSENGER PAYS FOR TRIP BOOKING (Confirmed upon payment)
  const handleCompletePayment = async (
    req: TransportV2Request,
    paymentReference?: string,
    paymentMethod: 'cash' | 'card' | 'qr' = 'cash'
  ) => {
    const paymentRef = paymentReference || `PAY-MGR-${Math.floor(100000 + Math.random() * 900000)}`;

    const updated: TransportV2Request = {
      ...req,
      requestStatus: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: paymentMethod === 'qr' ? 'lankaqr' : paymentMethod,
      paymentRef,
      updatedAt: Date.now(),
    };

    const syncRes = await syncTransportRequestV2ToSupabase(updated);
    if (!syncRes.success) {
      alert(`Database error: Payment confirmation failed (${syncRes.error || 'Sync error'}). Please try again.`);
      return;
    }

    setRequests(prev => prev.map(r => (r.id === req.id ? updated : r)));

    // Block the booked date on the trip vehicle
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

    setPayingRequest(null);
    await triggerLifecycleNotifications('booking_confirmed', updated);
    alert('Payment completed and booking confirmed! Notifications dispatched.');

    if (updated.listingMode === 'schedule') {
      setBookingSuccessModal({
        requestNumber: updated.requestNumber,
        isSchedule: true,
        totalAmount: updated.finalAmount,
        seats: updated.seatCount,
      });
    }
  };

  // 6. DRIVER ASSIGNMENT (Lifecycle Requirement 8)
  const handleOpenAssignDriver = (req: TransportV2Request) => {
    setAssigningDriverRequest(req);
    setSelectedDriverId(req.driverId || '');
    setCustomDriverName(req.driverName || '');
    setCustomDriverPhone(req.driverPhone || '');
  };

  const handleConfirmAssignDriver = async () => {
    if (!assigningDriverRequest) return;
    let dId = selectedDriverId;
    let dName = customDriverName;
    let dPhone = customDriverPhone;

    if (selectedDriverId) {
      const storedUsers = getStoredUsers();
      const matched = storedUsers.find(u => u.id === selectedDriverId);
      if (matched) {
        dName = matched.name;
        dPhone = matched.phone || dPhone;
      }
    }

    if (!dName) {
      alert('Please select a registered driver or enter the driver name.');
      return;
    }

    const updated: TransportV2Request = {
      ...assigningDriverRequest,
      driverId: dId || `DRV-${Date.now()}`,
      driverName: dName,
      driverPhone: dPhone,
      requestStatus: 'driver_assigned',
      updatedAt: Date.now(),
    };

    const syncRes = await syncTransportRequestV2ToSupabase(updated);
    if (!syncRes.success) {
      alert(`Database error: Could not assign driver (${syncRes.error || 'Sync error'}). Previous assignment retained.`);
      return;
    }

    setRequests(prev => prev.map(r => (r.id === assigningDriverRequest.id ? updated : r)));
    setAssigningDriverRequest(null);
    await triggerLifecycleNotifications('driver_assigned', updated);
    alert(`Driver ${dName} assigned to booking ${assigningDriverRequest.requestNumber} successfully! Notifications dispatched.`);
  };

  // 7. START JOURNEY (Lifecycle Requirement 8)
  const handleStartJourney = async (req: TransportV2Request) => {
    const updated: TransportV2Request = {
      ...req,
      requestStatus: 'journey_started',
      updatedAt: Date.now(),
    };
    const syncRes = await syncTransportRequestV2ToSupabase(updated);
    if (!syncRes.success) {
      alert(`Database error: Could not start journey (${syncRes.error || 'Sync error'}).`);
      return;
    }
    setRequests(prev => prev.map(r => (r.id === req.id ? updated : r)));
    await triggerLifecycleNotifications('journey_started', updated);
    alert(`Journey for ride ${req.requestNumber} has officially started! Notifications dispatched.`);
  };

  // 8. COMPLETE JOURNEY (Lifecycle Requirement 8)
  const handleCompleteJourney = async (req: TransportV2Request) => {
    const updated: TransportV2Request = {
      ...req,
      requestStatus: 'journey_completed',
      updatedAt: Date.now(),
    };
    const syncRes = await syncTransportRequestV2ToSupabase(updated);
    if (!syncRes.success) {
      alert(`Database error: Could not complete journey (${syncRes.error || 'Sync error'}).`);
      return;
    }
    setRequests(prev => prev.map(r => (r.id === req.id ? updated : r)));
    await triggerLifecycleNotifications('journey_completed', updated);
    alert(`Journey for ride ${req.requestNumber} has completed! Opening Rating & Review dialog.`);
    setReviewingBooking(updated);
    setReviewRating(5);
    setReviewComment('');
  };

  // 9. COMPLETE BOOKING (Lifecycle Requirement 8)
  const handleCompleteBooking = async (req: TransportV2Request) => {
    const updated: TransportV2Request = {
      ...req,
      requestStatus: 'completed',
      updatedAt: Date.now(),
    };
    const syncRes = await syncTransportRequestV2ToSupabase(updated);
    if (!syncRes.success) {
      alert(`Database error: Could not complete booking (${syncRes.error || 'Sync error'}).`);
      return;
    }
    setRequests(prev => prev.map(r => (r.id === req.id ? updated : r)));
    await triggerLifecycleNotifications('booking_completed', updated);
    alert(`Booking ${req.requestNumber} marked as completed!`);
  };

  // 10. SUBMIT RATING & REVIEW (Requirement 9)
  const handleSubmitReview = async () => {
    if (!reviewingBooking) return;
    const isPassenger = isPassengerUser || (currentUserEmail && reviewingBooking.passenger.email === currentUserEmail);
    const reviewerId = currentUser?.id || currentUserEmail || 'GUEST';
    const reviewerName = currentUser?.name || reviewingBooking.passenger.name || 'Passenger';
    const reviewerRole = isPassenger ? 'passenger' : (isDriverUser ? 'driver' : 'owner');

    const reviewedUserId = isPassenger
      ? (reviewingBooking.driverId || reviewingBooking.ownerId)
      : (reviewingBooking.passenger.phone || reviewingBooking.passenger.name);
    const reviewedUserName = isPassenger
      ? (reviewingBooking.driverName || reviewingBooking.ownerName)
      : reviewingBooking.passenger.name;

    const existingReviews = getStoredTransportReviews();
    const alreadyReviewed = existingReviews.some(
      r => r.bookingId === reviewingBooking.id && r.reviewerId === reviewerId
    );
    if (alreadyReviewed) {
      alert('You have already submitted a review for this booking. Maximum 1 review per user per booking is permitted.');
      setReviewingBooking(null);
      return;
    }

    const now = new Date();
    const newReview: TransportReview = {
      id: `REV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      bookingId: reviewingBooking.id,
      bookingNumber: reviewingBooking.requestNumber,
      reviewerId,
      reviewerName,
      reviewerRole,
      reviewedUserId,
      reviewedUserName,
      rating: reviewRating,
      comment: reviewComment.trim(),
      date: now.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' }),
      time: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
    };

    const saved = saveTransportReviewLocally(newReview);
    if (saved) {
      const updatedReq: TransportV2Request = {
        ...reviewingBooking,
        ...(isPassenger ? { passengerReviewed: true } : { driverReviewed: true }),
        updatedAt: Date.now(),
      };
      const syncRes = await syncTransportRequestV2ToSupabase(updatedReq);
      if (!syncRes.success) {
        alert(`Database error: Review could not be synced to database (${syncRes.error || 'Sync error'}).`);
        return;
      }
      setRequests(prev => prev.map(r => (r.id === reviewingBooking.id ? updatedReq : r)));
      setReviewingBooking(null);
      setReviewComment('');
      alert('Thank you! Your 1–5 star rating and review has been submitted successfully.');
    }
  };

  // 11. EDIT REQUEST (Requirements 10 & 11)
  const handleOpenEditRequest = (req: TransportV2Request) => {
    setEditingRequest(req);
    setEditFrom(req.routeFrom);
    setEditTo(req.routeTo);
    setEditDate(req.travelDate);
    setEditTime(req.travelTime || '08:00');
    setEditSeats(req.seatCount || 1);
    setEditNotes(req.specialNotes || '');
    setEditCharge(req.ownerTravelCharge ? String(req.ownerTravelCharge) : '');
    setEditStatus(req.requestStatus);
    setEditPaymentStatus(req.paymentStatus);
    setEditPassengerPhone(req.passenger.phone || '');
    setEditSuccessFeedback(null);
  };

  const handleSaveEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;

    let updatedCharge = editingRequest.ownerTravelCharge;
    let updatedFee = editingRequest.convenienceFee;
    let updatedFinal = editingRequest.finalAmount;

    const numCharge = Number(editCharge);
    if (isOwnerOrAdmin && editCharge !== '' && !isNaN(numCharge) && numCharge > 0 && numCharge !== editingRequest.ownerTravelCharge) {
      updatedCharge = numCharge;
      updatedFee = Math.round(numCharge * (convenienceFeePercentage / 100));
      updatedFinal = numCharge + updatedFee;
    }

    const updated: TransportV2Request = {
      ...editingRequest,
      routeFrom: editFrom,
      routeTo: editTo,
      travelDate: editDate,
      travelTime: editTime,
      seatCount: editSeats,
      specialNotes: editNotes,
      passenger: {
        ...editingRequest.passenger,
        phone: editPassengerPhone || editingRequest.passenger.phone,
        whatsapp: editPassengerPhone || editingRequest.passenger.whatsapp,
      },
      ownerTravelCharge: updatedCharge,
      convenienceFee: updatedFee,
      finalAmount: updatedFinal,
      requestStatus: isAppAdmin ? editStatus : editingRequest.requestStatus,
      paymentStatus: isAppAdmin ? editPaymentStatus : editingRequest.paymentStatus,
      updatedAt: Date.now(),
    };

    const syncRes = await syncTransportRequestV2ToSupabase(updated);
    if (!syncRes.success) {
      alert(`Database error: Failed to save changes (${syncRes.error || 'Sync error'}). Previous request data retained.`);
      return;
    }

    setRequests(prev => prev.map(r => (r.id === editingRequest.id ? updated : r)));
    setEditSuccessFeedback('Request updated and saved successfully!');
    setTimeout(() => {
      setEditingRequest(null);
      setEditSuccessFeedback(null);
    }, 1200);
  };

  // 7. DELETE REQUEST (Requirement 11, Admin Only)
  const handleConfirmDeleteRequest = async () => {
    if (!deletingRequest) return;
    const res = await deleteTransportRequestV2FromSupabase(deletingRequest.id);
    if (!res.success) {
      alert(`Database error: Could not delete booking (${res.error || 'Delete failed'}). Booking retained.`);
      return;
    }
    setRequests(prev => prev.filter(r => r.id !== deletingRequest.id));
    setDeletingRequest(null);
    alert('Booking deleted successfully from database.');
  };

  // If view is 'owner-listings', it has been removed per Requirement 8
  if (view === 'owner-listings') {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: PASSENGER MGR TRANSPORT SEARCH (Find Transport)
      ───────────────────────────────────────────────────────────── */}
      {view === 'search' && (
        <div className="space-y-6">
          {/* Top Search & Filter Bar */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
            {/* Global Search Input */}
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by vehicle make, model, registration #, operator, route (From/To), or date..."
                value={globalSearch}
                onChange={e => {
                  setGlobalSearch(e.target.value);
                  setSearchPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 text-xs">
              {/* Trip / Booking Type Filter (Requirement 1: Strictly 'Trip' and 'Schedule') */}
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
                  <option value="trip">Trip</option>
                  <option value="schedule">Schedule</option>
                </select>
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vehicle Type</label>
                <select
                  value={searchType}
                  onChange={e => {
                    setSearchType(e.target.value);
                    setSearchPage(1);
                  }}
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
                  onChange={e => {
                    setSearchDate(e.target.value);
                    setSearchPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {/* From Location */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">From Location</label>
                <input
                  type="text"
                  placeholder="e.g. Mannar Town"
                  value={searchFrom}
                  onChange={e => {
                    setSearchFrom(e.target.value);
                    setSearchPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {/* To Location */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">To Location</label>
                <input
                  type="text"
                  placeholder="e.g. Jaffna City"
                  value={searchTo}
                  onChange={e => {
                    setSearchTo(e.target.value);
                    setSearchPage(1);
                  }}
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
                  onChange={e => {
                    setSearchPassengers(Math.max(1, Number(e.target.value) || 1));
                    setSearchPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              {/* Driver Option */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Driver Option</label>
                <select
                  value={searchDriverOption}
                  onChange={e => {
                    setSearchDriverOption(e.target.value);
                    setSearchPage(1);
                  }}
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
                  Showing {Math.min(sortedListings.length, (searchPage - 1) * pageSize + 1)}-
                  {Math.min(searchPage * pageSize, sortedListings.length)} of {sortedListings.length}
                </span>
                {listingTypeFilter !== 'all' && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      listingTypeFilter === 'schedule'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {listingTypeFilter === 'schedule' ? 'Schedule' : 'Trip'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden md:inline">
                  Direct Operator Booking • Reserve Your Journey
                </span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setSearchViewMode('table')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      searchViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                      searchViewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                <p className="text-sm font-bold text-slate-700">No matching vehicles or trips found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your travel date, route keywords, or vehicle category. Active fleet vehicles are ready for hire.
                </p>
              </div>
            ) : searchViewMode === 'table' ? (
              /* TABLE FORMAT (MAX 20 ROWS) */
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      {renderSortHeader('Ref ID', 'uniqueCode', searchSortField, searchSortDir, () =>
                        handleSort('uniqueCode', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage)
                      )}
                      {renderSortHeader('Vehicle & Photo', 'vehicleName', searchSortField, searchSortDir, () =>
                        handleSort('vehicleName', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage)
                      )}
                      {renderSortHeader('Mode', 'listingMode', searchSortField, searchSortDir, () =>
                        handleSort('listingMode', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage)
                      )}
                      {renderSortHeader('Type', 'vehicleType', searchSortField, searchSortDir, () =>
                        handleSort('vehicleType', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage)
                      )}
                      {renderSortHeader('Reg #', 'registrationNumber', searchSortField, searchSortDir, () =>
                        handleSort('registrationNumber', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage)
                      )}
                      {renderSortHeader('From ➔ To Location', 'plannedFrom', searchSortField, searchSortDir, () =>
                        handleSort('plannedFrom', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage)
                      )}
                      {renderSortHeader('Seats', 'totalSeats', searchSortField, searchSortDir, () =>
                        handleSort('totalSeats', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage)
                      )}
                      {renderSortHeader('Driver Option', 'driverOption', searchSortField, searchSortDir, () =>
                        handleSort('driverOption', searchSortField, searchSortDir, setSearchSortField, setSearchSortDir, setSearchPage)
                      )}
                      <th className="py-3.5 px-4 text-center break-words">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedListings.map(item => {
                      const isSchedule = item.listingMode === 'schedule' || item.listingMode === 'planned_trip';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Dedicated Column: Ref ID / Unique Code */}
                          <td className="py-3 px-4 break-words">
                            <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px] font-bold inline-block break-words">
                              {item.uniqueCode || item.id}
                            </span>
                          </td>

                          {/* Vehicle & Photo */}
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
                                <span className="text-[10px] text-slate-500 block break-words">{item.ownerName}</span>
                              </div>
                            </div>
                          </td>

                          {/* Dedicated Column: Mode (Trip / Schedule) */}
                          <td className="py-3 px-4 break-words">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border inline-flex items-center gap-1 ${
                                !isSchedule
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {!isSchedule ? <Car className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                              {!isSchedule ? 'Trip' : 'Schedule'}
                            </span>
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

                          {/* From ➔ To Location */}
                          <td className="py-3 px-4 break-words min-w-[180px]">
                            {!isSchedule ? (
                              <div className="space-y-1">
                                <div className="font-semibold text-slate-800 break-words">
                                  {item.serviceArea || `${searchFrom || 'Mannar'} ➔ ${searchTo || 'Islandwide'}`}
                                </div>
                                {item.availableDates && item.availableDates.length > 0 ? (
                                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                                    {item.availableDates.length} {item.availableDates.length === 1 ? 'Date' : 'Dates'} Available (Next 30 Days)
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                                    No Owner Dates Set
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex flex-col gap-0.5 text-xs font-bold text-blue-950">
                                  <div className="break-words">
                                    <span className="text-[10px] uppercase font-bold text-blue-600 mr-1.5">From:</span>
                                    <span className="font-semibold">{item.plannedFrom || 'Mannar Town'}</span>
                                  </div>
                                  <div className="break-words">
                                    <span className="text-[10px] uppercase font-bold text-indigo-600 mr-1.5">To:</span>
                                    <span className="font-semibold">{item.plannedTo || 'Jaffna City'}</span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1 break-words">
                                  📅 {item.plannedTripDate} at {item.departureTime || '08:00'} •{' '}
                                  <span className="font-bold text-emerald-700">
                                    {getRemainingSeatsForListing(item)} seats left
                                  </span>{' '}
                                  • <span className="font-bold text-slate-700">Rs. {item.seatFare || 1200}/seat</span>
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 break-words font-bold text-slate-800">
                            {isSchedule ? `${getRemainingSeatsForListing(item)} / ${item.totalSeats}` : `${item.totalSeats} Seats`}
                          </td>

                          <td className="py-3 px-4 break-words">
                            <span className="capitalize text-slate-700 bg-slate-50 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200 inline-block break-words">
                              {item.driverOption === 'both' ? 'Discuss' : item.driverOption.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Distinct Button Colors & Labels: Emerald for 'Book Trip', Blue for 'Book Schedule' (Requirement 1) */}
                          <td className="py-3 px-4 break-words text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setRequestingListing(item);
                                setReqRouteFrom(isSchedule ? item.plannedFrom || 'Mannar Town' : searchFrom || 'Mannar Town');
                                setReqRouteTo(isSchedule ? item.plannedTo || 'Jaffna City' : searchTo || '');
                                setReqTravelDate(isSchedule ? item.plannedTripDate || searchDate : searchDate);
                                setReqSeats(isSchedule ? Math.min(searchPassengers, getRemainingSeatsForListing(item) || 1) : 1);
                                setReqPassengerName(currentUser?.name || currentUser?.username || '');
                                setReqPassengerPhone(currentUser?.phone || '+94 77 123 4567');
                                setReqNotes('');
                              }}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer ${
                                !isSchedule
                                  ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
                                  : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
                              }`}
                              title={!isSchedule ? 'Book Trip' : 'Book Schedule Seats'}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{!isSchedule ? 'Book Trip' : 'Book Schedule'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* CARDS GRID (MAX 20) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedListings.map(item => {
                  const isSchedule = item.listingMode === 'schedule' || item.listingMode === 'planned_trip';

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        {/* Header Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {item.uniqueCode || item.id}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {item.registrationNumber}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                              !isSchedule
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {!isSchedule ? 'Trip' : 'Schedule'}
                          </span>
                        </div>

                        {/* Title & Operator */}
                        <h4 className="text-sm font-bold text-slate-900 mt-2">{item.vehicleName}</h4>
                        <p className="text-[11px] text-slate-500">Operator: {item.ownerName}</p>

                        {item.photos && item.photos.length > 0 && (
                          <div className="mt-2 h-32 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                            <img src={item.photos[0]} alt={item.vehicleName} className="w-full h-full object-cover" />
                          </div>
                        )}

                        {/* Info Body */}
                        {!isSchedule ? (
                          <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Capacity:</span>
                              <strong className="text-slate-800">{item.totalSeats} Passengers</strong>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">Driver:</span>
                              <strong className="text-slate-800 capitalize">
                                {item.driverOption === 'both' ? 'Discuss' : item.driverOption.replace('_', ' ')}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                Available Dates
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
                                  <span className="text-[10px] text-slate-400 italic">No Owner Dates Set</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2 text-xs">
                            <div className="flex flex-col gap-0.5 font-bold text-blue-900">
                              <div>
                                <span className="text-[10px] uppercase text-blue-500 font-extrabold mr-1">From:</span>{' '}
                                {item.plannedFrom || 'Mannar Town'}
                              </div>
                              <div>
                                <span className="text-[10px] uppercase text-indigo-500 font-extrabold mr-1">To:</span>{' '}
                                {item.plannedTo || 'Jaffna City'}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                              <span>📅 Date: {item.plannedTripDate}</span>
                              <span>⏰ Time: {item.departureTime || '08:00'}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-200/50">
                              <span className="text-slate-600">Available Seats:</span>
                              <strong className="text-emerald-700 font-extrabold">
                                {getRemainingSeatsForListing(item)} / {item.totalSeats}
                              </strong>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-600">Per Seat Amount:</span>
                              <strong className="text-slate-900 font-bold">Rs. {(item.seatFare || 1200).toLocaleString()}</strong>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Request Action Button with distinct colors */}
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setRequestingListing(item);
                            setReqRouteFrom(isSchedule ? item.plannedFrom || 'Mannar Town' : searchFrom || 'Mannar Town');
                            setReqRouteTo(isSchedule ? item.plannedTo || 'Jaffna City' : searchTo || '');
                            setReqTravelDate(isSchedule ? item.plannedTripDate || searchDate : searchDate);
                            setReqSeats(isSchedule ? Math.min(searchPassengers, getRemainingSeatsForListing(item) || 1) : 1);
                            setReqPassengerName(currentUser?.name || currentUser?.username || '');
                            setReqPassengerPhone(currentUser?.phone || '+94 77 123 4567');
                            setReqNotes('');
                          }}
                          className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer ${
                            !isSchedule
                              ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
                              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{!isSchedule ? 'Book Trip' : 'Book Schedule'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
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
                          searchPage === p ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
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
          VIEW 2: TRANSPORT BOOKING REQUESTS & PAYMENTS (Requests)
      ───────────────────────────────────────────────────────────── */}
      {view === 'requests' && (
        <div className="space-y-4">
          {/* Top Filter Bar */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Transport Booking Requests & Payments</h3>
              <p className="text-xs text-slate-500">
                Manage your Trip and Schedule bookings with live updates and actions.
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

          {/* Requests Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  {renderSortHeader('Request # & Type', 'requestNumber', reqSortField, reqSortDir, () =>
                    handleSort('requestNumber', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage)
                  )}
                  {renderSortHeader('Vehicle / Reg', 'vehicleName', reqSortField, reqSortDir, () =>
                    handleSort('vehicleName', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage)
                  )}
                  {renderSortHeader('Passenger', 'passenger', reqSortField, reqSortDir, () =>
                    handleSort('passenger', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage)
                  )}
                  {renderSortHeader('Route & Date', 'routeFrom', reqSortField, reqSortDir, () =>
                    handleSort('routeFrom', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage)
                  )}
                  {renderSortHeader('Pricing', 'finalAmount', reqSortField, reqSortDir, () =>
                    handleSort('finalAmount', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage)
                  )}
                  {renderSortHeader('Status', 'requestStatus', reqSortField, reqSortDir, () =>
                    handleSort('requestStatus', reqSortField, reqSortDir, setReqSortField, setReqSortDir, setReqPage)
                  )}
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
                    const isSchedule = req.listingMode === 'schedule' || req.listingMode === 'planned_trip';
                    const isPending = req.requestStatus === 'pending_owner';
                    const isAwaiting = req.requestStatus === 'awaiting_payment';
                    const isConfirmed = req.requestStatus === 'confirmed';
                    const isPaid = req.paymentStatus === 'paid';

                    // Requirement 10: Editable only while pending; once confirmed/paid, locked to View only
                    const canEdit = isAppAdmin || (isPending || isAwaiting);

                    // Requirement 7: Contact Privacy Logic
                    // Hide owner contact info from passenger until paid & confirmed.
                    // Hide passenger contact info from owner until paid & confirmed.
                    // Admin sees all contact info at all stages.
                    const isPaidAndConfirmed = isPaid && isConfirmed;
                    const canViewPassengerContact =
                      isAppAdmin ||
                      isPaidAndConfirmed ||
                      (isPassengerUser && req.passenger.email === currentUserEmail);

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 break-words">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block break-words">
                            {req.requestNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold block mt-1 px-1.5 py-0.2 rounded w-fit uppercase ${
                              !isSchedule ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                            }`}
                          >
                            {!isSchedule ? 'Trip' : `Schedule (${req.seatCount} Seat)`}
                          </span>
                        </td>

                        <td className="py-3 px-4 break-words">
                          <div className="font-bold text-slate-900 break-words">{req.vehicleName}</div>
                          <span className="font-mono text-[10px] text-slate-400 break-words">{req.registrationNumber}</span>
                        </td>

                        {/* Passenger Column (Contact Privacy: Requirement 7 & 8) */}
                        <td className="py-3 px-4 break-words">
                          {canViewPassengerContact ? (
                            <>
                              <div className="font-bold text-slate-900 break-words">{req.passenger.name}</div>
                              <span className="text-[11px] text-slate-500 break-words">{req.passenger.phone}</span>
                            </>
                          ) : (
                            <div>
                              <div className="font-bold text-slate-500 italic break-words">*** (Passenger Masked)</div>
                              <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                                <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Protected until confirmed & paid</span>
                              </div>
                            </div>
                          )}
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
                              <div className="font-extrabold text-emerald-700">Rs. {req.finalAmount.toLocaleString()}</div>
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
                          {isPaid && (
                            <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">✓ PAID</span>
                          )}
                        </td>

                        {/* Actions (Requirements 10 & 11) */}
                        <td className="py-3 px-4 break-words text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* VIEW (Available to Passenger, Owner, Admin) */}
                            <button
                              type="button"
                              onClick={() => setViewingRequest(req)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* EDIT (Requirement 10: Editable only while pending; locked when paid/confirmed) */}
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEditRequest(req)}
                                className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition cursor-pointer"
                                title="Edit Request"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            ) : (
                              <span
                                className="p-1.5 text-slate-300 cursor-not-allowed inline-block"
                                title="Locked: Confirmed & Paid bookings cannot be modified"
                              >
                                <Lock className="w-4 h-4" />
                              </span>
                            )}

                            {/* DELETE (Requirement 11: Admin Only, with confirmation popup) */}
                            {isAppAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeletingRequest(req)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete Booking (Admin Only)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Trip Owner Review/Accept Button */}
                            {isOwnerOrAdmin && isPending && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewingRequest(req);
                                  setOwnerChargeInput('');
                                  setRejectionReasonInput('');
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
                              >
                                Review / Price
                              </button>
                            )}

                            {/* Trip Passenger Pay Now Button */}
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

                            {/* Driver Assignment Button (Lifecycle Requirement 8) */}
                            {req.requestStatus === 'confirmed' && isOwnerOrAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenAssignDriver(req)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1"
                                title="Assign Driver or Captain"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Assign Driver</span>
                              </button>
                            )}

                            {/* Start Journey Button (Lifecycle Requirement 8) */}
                            {(req.requestStatus === 'confirmed' || req.requestStatus === 'driver_assigned') && (isDriverUser || isOwnerOrAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleStartJourney(req)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1"
                                title="Start Journey"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Start Journey</span>
                              </button>
                            )}

                            {/* Complete Journey Button (Lifecycle Requirement 8) */}
                            {req.requestStatus === 'journey_started' && (isDriverUser || isOwnerOrAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleCompleteJourney(req)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1"
                                title="Complete Journey"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>End Journey</span>
                              </button>
                            )}

                            {/* Rating & Review Button (Requirement 9) */}
                            {(req.requestStatus === 'journey_completed' || req.requestStatus === 'completed') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewingBooking(req);
                                  setReviewRating(5);
                                  setReviewComment('');
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition cursor-pointer flex items-center gap-1"
                                title="Submit 1-5 Star Rating & Review"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>Review</span>
                              </button>
                            )}

                            {/* Complete Booking Button (Lifecycle Requirement 8) */}
                            {req.requestStatus === 'journey_completed' && (isAppAdmin || isOwnerOrAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleCompleteBooking(req)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition cursor-pointer flex items-center gap-1"
                                title="Complete Booking"
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                <span>Complete</span>
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

          {/* Pagination Controls */}
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
                        reqPage === p ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
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
          MODAL: PASSENGER BOOKING (Schedule Direct vs Trip Request)
      ───────────────────────────────────────────────────────────── */}
      {requestingListing && (() => {
        const isSchedule = requestingListing.listingMode === 'schedule' || requestingListing.listingMode === 'planned_trip';
        const remaining = getRemainingSeatsForListing(requestingListing);
        const seatFare = requestingListing.seatFare || 1200;
        const seatSubtotal = reqSeats * seatFare;
        const adminCharge = Math.round(seatSubtotal * (convenienceFeePercentage / 100));
        const totalPayable = seatSubtotal + adminCharge;

        // Generate upcoming 30 days for mini-calendar (Trip mode)
        const calendarDays = (() => {
          const days = [];
          const today = new Date();
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
          const max30Date = new Date();
          max30Date.setDate(max30Date.getDate() + 30);
          const max30Str = max30Date.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

          for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
            const dayNum = d.getDate();
            const dayName = dayNames[d.getDay()];

            // Conflict & availability rules
            const matchingRequests = requests.filter(
              r => r.vehicleId === requestingListing.vehicleId && r.travelDate === dateStr
            );
            let status: 'available' | 'pending' | 'confirmed' | 'unavailable' = 'available';
            let statusTooltip = 'Available for hire';

            if (matchingRequests.some(r => r.requestStatus === 'confirmed')) {
              status = 'confirmed';
              statusTooltip = 'Confirmed booking — Reserved';
            } else if (matchingRequests.some(r => r.requestStatus === 'pending_owner' || r.requestStatus === 'awaiting_payment')) {
              status = 'pending';
              statusTooltip = 'Pending owner approval — Held';
            } else if (
              !requestingListing.availableDates ||
              !requestingListing.availableDates.includes(dateStr) ||
              dateStr > max30Str ||
              dateStr < todayStr
            ) {
              status = 'unavailable';
              statusTooltip = 'Operator not available on this date (availability limited to next 30 days)';
            }

            days.push({ dateStr, dayNum, dayName, status, statusTooltip });
          }
          return days;
        })();

        // Check selected date conflict status
        const selectedTripDateStatus = (() => {
          if (!reqTravelDate) return null;
          const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
          const max30Date = new Date();
          max30Date.setDate(max30Date.getDate() + 30);
          const max30Str = max30Date.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });

          const matchingRequests = requests.filter(
            r => r.vehicleId === requestingListing.vehicleId && r.travelDate === reqTravelDate
          );
          if (matchingRequests.some(r => r.requestStatus === 'confirmed')) return 'confirmed';
          if (matchingRequests.some(r => r.requestStatus === 'pending_owner' || r.requestStatus === 'awaiting_payment')) return 'pending';
          if (
            !requestingListing.availableDates ||
            !requestingListing.availableDates.includes(reqTravelDate) ||
            reqTravelDate > max30Str ||
            reqTravelDate < todayStr
          ) {
            return 'unavailable';
          }
          return 'available';
        })();

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                      {requestingListing.registrationNumber}
                    </span>
                    {requestingListing.uniqueCode && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {requestingListing.uniqueCode}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        !isSchedule ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {!isSchedule ? 'Trip Booking' : 'Schedule Seat Booking'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {!isSchedule ? `Book Trip: ${requestingListing.vehicleName}` : `Reserve Seats: ${requestingListing.vehicleName}`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRequestingListing(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form: Schedule Direct Booking vs Trip Request */}
              <form onSubmit={isSchedule ? handleScheduleDirectBooking : handleTripBookingRequest} className="space-y-3">
                {/* Passenger Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Passenger Name *</label>
                    <input
                      type="text"
                      required
                      value={reqPassengerName || currentUser?.name || currentUser?.username || ''}
                      onChange={e => setReqPassengerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      value={reqPassengerPhone || currentUser?.phone || ''}
                      onChange={e => setReqPassengerPhone(e.target.value)}
                      placeholder="+94 77 123 4567"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800"
                    />
                  </div>
                </div>

                {/* SCHEDULE: FIXED ROUTE DISPLAY (READ-ONLY) + PASSENGER PICKUP & DROP-OFF INPUTS */}
                {isSchedule ? (
                  <div className="space-y-3">
                    {/* Locked Operator Fixed Route Card */}
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-blue-600" />
                          Operator Scheduled Route (Fixed)
                        </span>
                        <span className="text-[11px] font-semibold text-blue-800">
                          📅 {requestingListing.plannedTripDate} at {requestingListing.departureTime || '08:00'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/90 p-2.5 rounded-lg border border-blue-100">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">From Location</span>
                          <span className="font-bold text-slate-800 text-xs">{requestingListing.plannedFrom || 'Mannar Town'}</span>
                        </div>
                        <div className="bg-white/90 p-2.5 rounded-lg border border-blue-100">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">To Location</span>
                          <span className="font-bold text-slate-800 text-xs">{requestingListing.plannedTo || 'Jaffna City'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer enters specific boarding and alighting location along the route */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Customer Pickup Location *</label>
                        <input
                          type="text"
                          required
                          value={reqRouteFrom}
                          onChange={e => setReqRouteFrom(e.target.value)}
                          placeholder="e.g. Mannar Town Stand / Specific Bus Stop"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Customer Drop-off Location *</label>
                        <input
                          type="text"
                          required
                          value={reqRouteTo}
                          onChange={e => setReqRouteTo(e.target.value)}
                          placeholder="e.g. Jaffna Hospital Junction / Drop point"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Required Seats */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Required Seats *</label>
                        <span className="text-[10px] font-bold text-emerald-700">{remaining} seats left</span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={remaining}
                        required
                        value={reqSeats}
                        onChange={e => setReqSeats(Number(e.target.value))}
                        className={`w-full px-3 py-2 rounded-xl border font-bold ${
                          reqSeats > remaining ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-slate-300'
                        }`}
                      />
                      {reqSeats > remaining && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-semibold flex items-center gap-1.5 mt-1.5 animate-fade-in">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                          <span>Only {remaining} seats are currently available. Please reduce your requested seat count to continue.</span>
                        </div>
                      )}
                    </div>

                    {/* Schedule Live Price Breakdown & Direct Confirmation */}
                    <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Available Seats for Journey:</span>
                        <strong className="text-slate-800">{remaining} Seats</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Per Seat Amount:</span>
                        <strong className="text-slate-800">Rs. {seatFare.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600 pt-1 border-t border-blue-200/60">
                        <span>Seat Amount ({reqSeats} × Rs. {seatFare.toLocaleString()}):</span>
                        <strong className="text-slate-800">Rs. {seatSubtotal.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Admin Charge ({convenienceFeePercentage}%):</span>
                        <strong className="text-slate-800">Rs. {adminCharge.toLocaleString()}</strong>
                      </div>
                      <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1.5 border-t border-blue-300">
                        <span>Total Amount Payable:</span>
                        <span className="text-emerald-700">Rs. {totalPayable.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* TRIP: CUSTOM ROUTE & VEHICLE AVAILABILITY MINI-CALENDAR */
                  <div className="space-y-3">
                    {/* Route Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">From Location *</label>
                        <input
                          type="text"
                          required
                          value={reqRouteFrom}
                          onChange={e => setReqRouteFrom(e.target.value)}
                          placeholder="e.g. Mannar Town"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">To Location *</label>
                        <input
                          type="text"
                          required
                          value={reqRouteTo}
                          onChange={e => setReqRouteTo(e.target.value)}
                          placeholder="e.g. Colombo Fort / Islandwide"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Interactive Mini-Calendar for Vehicle Availability */}
                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Vehicle Availability Calendar</span>
                        </label>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          Selected: <strong className="text-slate-800">{reqTravelDate || 'None'}</strong>
                        </span>
                      </div>

                      {/* Color Legend */}
                      <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-600 flex-wrap pb-1.5 border-b border-slate-200">
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span>Available</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                          <span>Pending Approval (Held)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                          <span>Confirmed Booked</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0"></span>
                          <span>Unavailable</span>
                        </div>
                      </div>

                      {/* Calendar Grid (Next 21 Days) */}
                      <div className="grid grid-cols-7 gap-1 pt-1">
                        {calendarDays.map(({ dateStr, dayNum, dayName, status, statusTooltip }) => {
                          const isSelected = reqTravelDate === dateStr;
                          const isAvailable = status === 'available';

                          return (
                            <button
                              key={dateStr}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => setReqTravelDate(dateStr)}
                              title={`${dateStr}: ${statusTooltip}`}
                              className={`p-1.5 rounded-lg text-center transition flex flex-col items-center justify-center relative ${
                                isSelected ? 'ring-2 ring-emerald-600 font-bold shadow-xs' : ''
                              } ${
                                status === 'available'
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                                  : status === 'pending'
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200 opacity-80 cursor-not-allowed'
                                  : status === 'confirmed'
                                  ? 'bg-rose-50 text-rose-900 border border-rose-200 opacity-80 cursor-not-allowed'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <span className="text-[9px] uppercase font-bold text-slate-500">{dayName}</span>
                              <span className="text-xs font-extrabold">{dayNum}</span>
                              <span
                                className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                                  status === 'available'
                                    ? 'bg-emerald-500'
                                    : status === 'pending'
                                    ? 'bg-amber-500'
                                    : status === 'confirmed'
                                    ? 'bg-rose-500'
                                    : 'bg-slate-300'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>

                      {/* Dynamic Conflict / Availability Warning Banner */}
                      {selectedTripDateStatus === 'confirmed' && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-1.5 mt-2 animate-fade-in">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>This vehicle already has a confirmed booking on {reqTravelDate}. Please select another available green date.</span>
                        </div>
                      )}
                      {selectedTripDateStatus === 'pending' && (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold flex items-center gap-1.5 mt-2 animate-fade-in">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>This vehicle has a pending reservation held on {reqTravelDate}. Double bookings are strictly prohibited.</span>
                        </div>
                      )}
                      {selectedTripDateStatus === 'unavailable' && (
                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-semibold flex items-center gap-1.5 mt-2 animate-fade-in">
                          <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                          <span>The operator is not scheduled for hire on {reqTravelDate}. Please choose an available green date.</span>
                        </div>
                      )}

                      {/* Manual Date Input & Pickup Time */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Travel Date *</label>
                          <input
                            type="date"
                            required
                            min={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })}
                            max={(() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 30);
                              return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
                            })()}
                            value={reqTravelDate}
                            onChange={e => setReqTravelDate(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Wanted Pickup Time</label>
                          <input
                            type="time"
                            value={reqTravelTime}
                            onChange={e => setReqTravelTime(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Special Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Need space for 2 large luggage bags, senior citizen travelling."
                    value={reqNotes}
                    onChange={e => setReqNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestingListing(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>

                  {isSchedule ? (
                    /* DIRECT PAYMENT & SEAT CONFIRMATION */
                    <button
                      type="submit"
                      disabled={reqSeats > remaining || reqSeats < 1}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay & Confirm Seats (Rs. {totalPayable.toLocaleString()})</span>
                    </button>
                  ) : (
                    /* TRIP: SEND REQUEST TO OPERATOR */
                    <button
                      type="submit"
                      disabled={selectedTripDateStatus !== 'available'}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Car className="w-4 h-4" />
                      <span>Send Request to Operator</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: BOOKING CONFIRMATION SUCCESS BANNER
      ───────────────────────────────────────────────────────────── */}
      {bookingSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            {bookingSuccessModal.isSchedule ? (
              <div>
                <h3 className="text-lg font-bold text-slate-900">Seats Confirmed & Paid!</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Your seat booking has been <strong>instantly confirmed</strong> with reference{' '}
                  <strong className="text-slate-900">{bookingSuccessModal.requestNumber}</strong>.
                </p>
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium">
                  {bookingSuccessModal.seats} Seat(s) Booked • Payment of Rs.{' '}
                  {bookingSuccessModal.totalAmount?.toLocaleString()} received.
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-slate-900">Trip Request Sent!</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Your request <strong className="text-slate-900">{bookingSuccessModal.requestNumber}</strong> has been
                  forwarded to the vehicle operator. They will review and enter the travel charge.
                </p>
              </div>
            )}

            <div className="pt-3 border-t">
              <button
                type="button"
                onClick={() => setBookingSuccessModal(null)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: OWNER REVIEW & ACCEPT (for Trip bookings)
      ───────────────────────────────────────────────────────────── */}
      {reviewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {reviewingRequest.requestNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">Operator Review & Travel Charge</h3>
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
              <div>
                <strong>Passenger:</strong> {reviewingRequest.passenger.name}
              </div>
              <div>
                <strong>Route:</strong> {reviewingRequest.routeFrom} ➔ {reviewingRequest.routeTo}
              </div>
              <div>
                <strong>Date:</strong> {reviewingRequest.travelDate}{' '}
                {reviewingRequest.travelTime ? `at ${reviewingRequest.travelTime}` : ''}
              </div>
              {reviewingRequest.specialNotes && (
                <div className="text-slate-500 italic mt-1">"{reviewingRequest.specialNotes}"</div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Your Travel Charge (Rs.) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rs.</span>
                <input
                  type="number"
                  min={1000}
                  step={500}
                  required
                  placeholder="Enter amount (Rs.)"
                  value={ownerChargeInput}
                  onChange={e => setOwnerChargeInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 font-extrabold text-sm text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">Starts blank. Enter manual numeric quote.</span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Operator Travel Charge:</span>
                <span>Rs. {Number(ownerChargeInput).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Admin Fee ({convenienceFeePercentage}%):</span>
                <span>Rs. {Math.round(Number(ownerChargeInput) * (convenienceFeePercentage / 100)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-extrabold text-emerald-800 pt-1 border-t border-emerald-200">
                <span>Passenger Final Payable:</span>
                <span>
                  Rs.{' '}
                  {(
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
                Decline
              </button>
              <button
                type="button"
                onClick={() => handleOwnerAcceptTrip(reviewingRequest)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Accept & Send Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: PASSENGER PAYMENT (for Trip bookings) — Cash, LankaQR, Card
      ───────────────────────────────────────────────────────────── */}
      <MGRPaymentModal
        isOpen={!!payingRequest}
        request={payingRequest}
        currentUserName={currentUser?.name}
        onSuccess={(reference, method) => {
          const req = payingRequest;
          setPayingRequest(null);
          if (req) handleCompletePayment(req, reference, method);
        }}
        onClose={() => setPayingRequest(null)}
      />

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VIEW DETAILS (Contact Privacy, Requirement 7)
      ───────────────────────────────────────────────────────────── */}
      {viewingRequest && (() => {
        const isPaidAndConfirmed = viewingRequest.paymentStatus === 'paid' && viewingRequest.requestStatus === 'confirmed';
        const canViewPassenger =
          isAppAdmin || isPaidAndConfirmed || (isPassengerUser && viewingRequest.passenger.email === currentUserEmail);
        const canViewOwner =
          isAppAdmin || isPaidAndConfirmed || (isOwnerUser && myVehicleIds.has(viewingRequest.vehicleId));

        return (
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
                {/* Passenger Contact Privacy */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Passenger Details</span>
                  {canViewPassenger ? (
                    <>
                      <strong className="text-slate-800 text-sm block">{viewingRequest.passenger.name}</strong>
                      <div className="text-slate-600 text-xs flex items-center gap-2 mt-0.5">
                        <span>📞 {viewingRequest.passenger.phone}</span>
                        {viewingRequest.passenger.email && <span>✉️ {viewingRequest.passenger.email}</span>}
                      </div>
                    </>
                  ) : (
                    <div>
                      <strong className="text-slate-500 text-sm block italic">*** (Passenger Name Masked)</strong>
                      <div className="flex items-center gap-1.5 py-1 text-amber-800 text-xs font-semibold">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Passenger contact protected until booking confirmed & paid.</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Operator Contact Privacy */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicle & Operator</span>
                  <strong className="text-slate-800 text-sm block">
                    {viewingRequest.vehicleName} ({viewingRequest.registrationNumber})
                  </strong>
                  {canViewOwner ? (
                    <div className="text-slate-600 text-xs flex items-center gap-2 mt-0.5">
                      <span>Operator: {viewingRequest.ownerName}</span>
                      <span>📞 {viewingRequest.ownerPhone}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-slate-500 text-xs block italic">Operator: *** (Masked)</span>
                      <div className="flex items-center gap-1.5 py-1 text-amber-800 text-xs font-semibold">
                        <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Operator contact protected until booking confirmed & paid.</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">Route & Date</span>
                  <strong className="text-slate-800">
                    {viewingRequest.routeFrom} ➔ {viewingRequest.routeTo}
                  </strong>
                  <div className="text-slate-500 mt-0.5">
                    {viewingRequest.travelDate} at {viewingRequest.travelTime || '08:00'} • {viewingRequest.seatCount} Seat(s)
                  </div>
                  {viewingRequest.specialNotes && (
                    <div className="text-slate-600 italic mt-1">"{viewingRequest.specialNotes}"</div>
                  )}
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
                {/* Driver Assignment Status */}
                {viewingRequest.driverName ? (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                    <span className="text-purple-700 block text-[10px] uppercase font-bold">Assigned Driver / Captain</span>
                    <strong className="text-purple-950 text-sm block">{viewingRequest.driverName}</strong>
                    {viewingRequest.driverPhone && (
                      <span className="text-purple-800 text-xs block">📞 {viewingRequest.driverPhone}</span>
                    )}
                  </div>
                ) : (
                  viewingRequest.requestStatus === 'confirmed' && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between">
                      <span>Driver not assigned yet.</span>
                      {isOwnerOrAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setViewingRequest(null);
                            handleOpenAssignDriver(viewingRequest);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold cursor-pointer text-xs"
                        >
                          Assign Driver
                        </button>
                      )}
                    </div>
                  )
                )}

                {/* Notification Delivery Channels Status (Requirement 8) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Notification Delivery Channels</span>
                  <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-bold text-[11px]">
                    <div className="p-1.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      📧 Email: Active
                    </div>
                    <div className="p-1.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      💬 WhatsApp: Active
                    </div>
                    <div className="p-1.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      📱 SMS: Active
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {/* Quick Lifecycle Action Buttons inside details view */}
                  {viewingRequest.requestStatus === 'confirmed' && isOwnerOrAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingRequest;
                        setViewingRequest(null);
                        handleOpenAssignDriver(target);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign Driver</span>
                    </button>
                  )}

                  {(viewingRequest.requestStatus === 'confirmed' || viewingRequest.requestStatus === 'driver_assigned') && (isDriverUser || isOwnerOrAdmin) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleStartJourney(viewingRequest);
                        setViewingRequest(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Journey</span>
                    </button>
                  )}

                  {viewingRequest.requestStatus === 'journey_started' && (isDriverUser || isOwnerOrAdmin) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCompleteJourney(viewingRequest);
                        setViewingRequest(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>End Journey</span>
                    </button>
                  )}

                  {(viewingRequest.requestStatus === 'journey_completed' || viewingRequest.requestStatus === 'completed') && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingRequest;
                        setViewingRequest(null);
                        setReviewingBooking(target);
                        setReviewRating(5);
                        setReviewComment('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>Rate & Review</span>
                    </button>
                  )}

                  {viewingRequest.requestStatus === 'journey_completed' && (isAppAdmin || isOwnerOrAdmin) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCompleteBooking(viewingRequest);
                        setViewingRequest(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Complete Booking</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setViewingRequest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EDIT REQUEST (Requirements 10 & 11: Passenger/Owner/Admin)
      ───────────────────────────────────────────────────────────── */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {editingRequest.requestNumber}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                    {editingRequest.requestStatus.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">Edit Booking Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSuccessFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{editSuccessFeedback}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditRequest} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pickup Location *</label>
                  <input
                    type="text"
                    required
                    value={editFrom}
                    onChange={e => setEditFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Drop-off Location *</label>
                  <input
                    type="text"
                    required
                    value={editTo}
                    onChange={e => setEditTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Travel Date *</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Seats *</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={editSeats}
                    onChange={e => setEditSeats(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Passenger Phone</label>
                <input
                  type="tel"
                  value={editPassengerPhone}
                  onChange={e => setEditPassengerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {/* Admin or Owner Travel Charge Editor */}
              {(isAppAdmin || isOwnerOrAdmin) && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operator Travel Charge (Rs.)</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    placeholder="Enter amount (Rs.)"
                    value={editCharge}
                    onChange={e => setEditCharge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              )}

              {/* Admin-only Status Controllers */}
              {isAppAdmin && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Request Status</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as TransportRequestStatus)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="pending_owner">Pending Owner Review</option>
                      <option value="awaiting_payment">Awaiting Payment</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="driver_assigned">Driver Assigned</option>
                      <option value="journey_started">Journey Started</option>
                      <option value="journey_completed">Journey Completed</option>
                      <option value="completed">Completed</option>
                      <option value="owner_rejected">Declined</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                    <select
                      value={editPaymentStatus}
                      onChange={e => setEditPaymentStatus(e.target.value as TransportPaymentStatus)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Special Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {/* Save Button (Requirement 10 & 11) */}
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CONFIRM DELETE REQUEST (Requirement 11, Admin Only)
      ───────────────────────────────────────────────────────────── */}
      {deletingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
                <p className="text-[11px] text-slate-500">
                  Are you sure you want to permanently delete request{' '}
                  <strong className="text-slate-800">{deletingRequest.requestNumber}</strong>?
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] space-y-1">
              <div>
                <strong>Passenger:</strong> {deletingRequest.passenger.name} ({deletingRequest.passenger.phone})
              </div>
              <div>
                <strong>Route:</strong> {deletingRequest.routeFrom} ➔ {deletingRequest.routeTo}
              </div>
              <div>
                <strong>Vehicle:</strong> {deletingRequest.vehicleName} ({deletingRequest.registrationNumber})
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRequest}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────
          MODAL: ASSIGN DRIVER / CAPTAIN (Lifecycle Requirement 8)
      ───────────────────────────────────────────────────────────── */}
      {assigningDriverRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Assign Driver / Captain</h3>
                  <span className="font-mono text-[11px] text-slate-500">
                    Booking: {assigningDriverRequest.requestNumber}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssigningDriverRequest(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div><strong>Vehicle:</strong> {assigningDriverRequest.vehicleName} ({assigningDriverRequest.registrationNumber})</div>
              <div><strong>Route:</strong> {assigningDriverRequest.routeFrom} ➔ {assigningDriverRequest.routeTo}</div>
              <div><strong>Date:</strong> {assigningDriverRequest.travelDate} at {assigningDriverRequest.travelTime || '08:00'}</div>
            </div>

            <div className="space-y-3">
              {/* Select Registered Driver */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Registered Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={e => {
                    const selId = e.target.value;
                    setSelectedDriverId(selId);
                    if (selId) {
                      const matched = getStoredUsers().find(u => u.id === selId);
                      if (matched) {
                        setCustomDriverName(matched.name);
                        setCustomDriverPhone(matched.phone || '');
                      }
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">-- Choose Registered Driver or Enter Below --</option>
                  {getStoredUsers()
                    .filter(u => u.role === 'driver')
                    .map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.phone || d.email})
                      </option>
                    ))}
                </select>
              </div>

              {/* Driver Details Manual Entry / Override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S. Kumar"
                    value={customDriverName}
                    onChange={e => setCustomDriverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. +94 77 123 4567"
                    value={customDriverPhone}
                    onChange={e => setCustomDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssigningDriverRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignDriver}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" />
                <span>Confirm Assignment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: 1–5 STARS RATING & REVIEW (Requirement 9)
      ───────────────────────────────────────────────────────────── */}
      {reviewingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Rate & Review Experience</h3>
                  <span className="font-mono text-[11px] text-slate-500">
                    Booking: {reviewingBooking.requestNumber}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewingBooking(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1 text-slate-800">
              <div><strong>Vehicle:</strong> {reviewingBooking.vehicleName} ({reviewingBooking.registrationNumber})</div>
              <div><strong>Route:</strong> {reviewingBooking.routeFrom} ➔ {reviewingBooking.routeTo}</div>
              {reviewingBooking.driverName && (
                <div><strong>Driver:</strong> {reviewingBooking.driverName}</div>
              )}
            </div>

            {/* 1–5 Star Interactive Selector */}
            <div className="text-center py-2 space-y-1">
              <span className="font-bold text-slate-700 block">Select Rating (1 to 5 Stars):</span>
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 hover:scale-125 transition cursor-pointer"
                    title={`${star} Star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-7 h-7 transition ${
                        star <= reviewRating
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'text-slate-300 hover:text-amber-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-bold text-amber-800">
                {reviewRating === 5
                  ? '⭐⭐⭐⭐⭐ Excellent'
                  : reviewRating === 4
                  ? '⭐⭐⭐⭐ Very Good'
                  : reviewRating === 3
                  ? '⭐⭐⭐ Good'
                  : reviewRating === 2
                  ? '⭐⭐ Fair'
                  : '⭐ Poor'}
              </span>
            </div>

            {/* Comment */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Your Review & Comments *</label>
              <textarea
                rows={3}
                required
                placeholder="Share your experience (punctuality, driving comfort, vehicle cleanliness, hospitality)..."
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <span className="text-[10px] text-slate-500">Maximum 1 review per user per booking.</span>
            </div>

            <div className="pt-2 border-t flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewingBooking(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Star className="w-4 h-4 fill-current" />
                <span>Submit Review</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MGRHotelStyleBooking = MGRTransportBooking;
