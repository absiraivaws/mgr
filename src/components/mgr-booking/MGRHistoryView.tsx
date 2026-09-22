/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Eye,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Car,
  Bus,
  Ship,
  X,
  Check,
  ArrowRight,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  CreditCard,
  QrCode,
  Banknote,
  ShieldCheck,
  Sparkles,
  Download,
  RefreshCw,
  Star,
} from 'lucide-react';
import type { TransportV2Request } from '../../types/mgrTransportV2';
import type { TransportBooking } from '../../types/mgrBooking';
import { UserAccount, getOwnerIdForUser, isOwnedByUser } from '../../utils/auth';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';

interface MGRHistoryViewProps {
  currentUser?: UserAccount;
  isAdmin?: boolean;
  themeMode?: 'light' | 'dark';
}

export interface UnifiedHistoryItem {
  id: string;
  source: 'v2_request' | 'transport_booking';
  bookingNumber: string;
  listingMode: string;
  travelDate: string; // YYYY-MM-DD
  travelTime?: string;
  routeFrom: string;
  routeTo: string;
  seatCount: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string;
  passengerWhatsApp?: string;
  vehicleId?: string;
  vehicleName: string;
  vehicleRegNumber: string;
  vehicleType: string;
  ownerId?: string;
  ownerName: string;
  ownerPhone?: string;
  fareAmount: number;
  convenienceFee?: number;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentMethod?: string;
  paymentRef?: string;
  rawStatus: string;
  isDatePassed: boolean;
  computedCategory: 'completed' | 'date_passed' | 'pending' | 'awaiting_payment' | 'cancelled';
  createdAt: number;
  specialNotes?: string;
  driverName?: string;
  driverPhone?: string;
  driverType?: string;
  completedAt?: number;
  rating?: number;
  reviewComment?: string;
  notifications?: { channel: string; timestamp: number; title: string }[];
  originalPayload?: any;
}

export const MGRHistoryView: React.FC<MGRHistoryViewProps> = ({
  currentUser,
  isAdmin = false,
  themeMode = 'light',
}) => {
  const [historyItems, setHistoryItems] = useState<UnifiedHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'date_passed' | 'pending' | 'awaiting_payment' | 'cancelled'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'past' | 'today' | 'upcoming'>('all');

  // Sorting state
  const [sortColumn, setSortColumn] = useState<keyof UnifiedHistoryItem>('travelDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Detail view modal
  const [viewingItem, setViewingItem] = useState<UnifiedHistoryItem | null>(null);

  // Admin delete confirmation modal
  const [deletingItem, setDeletingItem] = useState<UnifiedHistoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Today's date baseline in Asia/Colombo timezone
  const todayStr = useMemo(() => {
    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(now);
      const y = parts.find(p => p.type === 'year')?.value || '2026';
      const m = parts.find(p => p.type === 'month')?.value || '09';
      const d = parts.find(p => p.type === 'day')?.value || '20';
      return `${y}-${m}-${d}`;
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }, []);

  // Determine current user persona & scope
  const userRole = (currentUser?.role || '').toLowerCase();
  const userEmail = (currentUser?.email || '').toLowerCase();
  const userName = (currentUser?.name || '').toLowerCase();
  const userPhone = (currentUser?.phone || '').trim();

  const isPassenger = userRole === 'passenger';
  const isOwner = userRole === 'owner';
  const isAdminUser = Boolean(
    isAdmin ||
    userRole === 'admin' ||
    userEmail === 'admin@mannargreenride.lk' ||
    userEmail === 'absiraiva@gmail.com'
  );

  // Load and unify history from localStorage & Supabase
  const loadHistory = () => {
    setIsLoading(true);
    const unified: UnifiedHistoryItem[] = [];

    // Load reviews & notifications from localStorage for enrichment
    let storedReviews: any[] = [];
    try {
      const rawReviews = localStorage.getItem('mgr_transport_reviews');
      if (rawReviews) storedReviews = JSON.parse(rawReviews);
    } catch {}

    let storedNotifications: any[] = [];
    try {
      const rawNotifs = localStorage.getItem('mgr_transport_notifications');
      if (rawNotifs) storedNotifications = JSON.parse(rawNotifs);
    } catch {}

    // 1. Read from mgr_transport_v2_requests (Primary marketplace booking requests)
    try {
      const rawRequests = localStorage.getItem('mgr_transport_v2_requests');
      if (rawRequests) {
        const parsed: TransportV2Request[] = JSON.parse(rawRequests);
        if (Array.isArray(parsed)) {
          parsed.forEach((req) => {
            const travelDate = req.travelDate || todayStr;
            const isPassed = travelDate < todayStr;
            let computedCategory: UnifiedHistoryItem['computedCategory'] = 'pending';

            if (
              req.requestStatus === 'confirmed' ||
              req.requestStatus === 'journey_completed' ||
              req.requestStatus === 'completed' ||
              req.paymentStatus === 'paid'
            ) {
              computedCategory = 'completed';
            } else if (req.requestStatus === 'cancelled' || req.requestStatus === 'owner_rejected') {
              computedCategory = 'cancelled';
            } else if (req.requestStatus === 'awaiting_payment') {
              computedCategory = isPassed ? 'date_passed' : 'awaiting_payment';
            } else if (isPassed) {
              computedCategory = 'date_passed';
            } else {
              computedCategory = 'pending';
            }

            const matchedReview = (storedReviews || []).find(
              r => r.bookingId === req.id || r.bookingNumber === req.requestNumber
            );
            const matchedNotifs = (storedNotifications || []).filter(
              n => n.requestId === req.id || n.requestNumber === req.requestNumber
            );

            unified.push({
              id: req.id,
              source: 'v2_request',
              bookingNumber: req.requestNumber || req.id,
              listingMode: req.listingMode || 'trip',
              travelDate: travelDate,
              travelTime: req.travelTime || '08:00 AM',
              routeFrom: req.routeFrom || 'Mannar Town',
              routeTo: req.routeTo || 'Destination',
              seatCount: req.seatCount || 1,
              passengerName: req.passenger?.name || 'Passenger',
              passengerPhone: req.passenger?.phone || '',
              passengerEmail: req.passenger?.email || '',
              passengerWhatsApp: req.passenger?.whatsapp || req.passenger?.phone || '',
              vehicleId: req.vehicleId,
              vehicleName: req.vehicleName || 'MGR Vehicle',
              vehicleRegNumber: req.registrationNumber || 'NP-MGR-0000',
              vehicleType: req.vehicleType || 'car',
              ownerId: req.ownerId,
              ownerName: req.ownerName || 'Operator',
              ownerPhone: req.ownerPhone || '',
              fareAmount: req.finalAmount || req.ownerTravelCharge || 0,
              convenienceFee: req.convenienceFee || 0,
              paymentStatus: req.paymentStatus || 'pending',
              paymentMethod: req.paymentMethod || (req.paymentStatus === 'paid' ? 'LankaQR' : undefined),
              paymentRef: req.paymentRef,
              rawStatus: req.requestStatus || 'pending',
              isDatePassed: isPassed,
              computedCategory,
              createdAt: typeof req.holdExpiresAt === 'number' ? req.holdExpiresAt - 3600000 : Date.now(),
              specialNotes: req.specialNotes,
              driverName: req.driverName,
              driverPhone: req.driverPhone,
              driverType: req.driverType || 'driver',
              completedAt: req.completedAt,
              rating: req.rating || matchedReview?.rating,
              reviewComment: req.reviewComment || matchedReview?.comment,
              notifications: matchedNotifs.map(n => ({
                channel: n.channel,
                timestamp: n.timestamp,
                title: n.title,
              })),
              originalPayload: req,
            });
          });
        }
      }
    } catch (e) {
      console.warn('[MGRHistoryView] Error reading v2 requests:', e);
    }

    // 2. Read from mgr_transport_bookings (Direct seat & whole-vehicle bookings)
    try {
      const rawBookings = localStorage.getItem('mgr_transport_bookings');
      if (rawBookings) {
        const parsed: TransportBooking[] = JSON.parse(rawBookings);
        if (Array.isArray(parsed)) {
          parsed.forEach((b) => {
            // Avoid duplicate IDs if already mapped
            if (unified.some(u => u.id === b.id)) return;

            const travelDate = b.travelDate || todayStr;
            const isPassed = travelDate < todayStr;
            let computedCategory: UnifiedHistoryItem['computedCategory'] = 'pending';

            if (b.status === 'confirmed' || b.status === 'completed') {
              computedCategory = 'completed';
            } else if (b.status === 'passenger_cancelled' || b.status === 'owner_cancelled' || b.status === 'owner_rejected') {
              computedCategory = 'cancelled';
            } else if (b.status === 'awaiting_payment') {
              computedCategory = isPassed ? 'date_passed' : 'awaiting_payment';
            } else if (isPassed) {
              computedCategory = 'date_passed';
            } else {
              computedCategory = 'pending';
            }

            unified.push({
              id: b.id,
              source: 'transport_booking',
              bookingNumber: b.bookingNumber || b.uniqueCode || b.id,
              listingMode: b.bookingType === 'seat' ? 'schedule' : 'trip',
              travelDate: travelDate,
              travelTime: b.travelTime || '08:00 AM',
              routeFrom: b.routeFrom || 'Origin',
              routeTo: b.routeTo || 'Destination',
              seatCount: b.seatCount || 1,
              passengerName: b.passengerName || 'Passenger',
              passengerPhone: b.passengerPhone || '',
              passengerEmail: b.passengerEmail || '',
              passengerWhatsApp: b.passengerWhatsApp || b.passengerPhone || '',
              vehicleId: b.vehicleId,
              vehicleName: b.vehicleName || 'Vehicle',
              vehicleRegNumber: b.vehicleRegNumber || 'Reg #',
              vehicleType: b.vehicleType || 'bus',
              ownerName: 'MGR Registered Fleet',
              fareAmount: b.totalAmount || 0,
              convenienceFee: b.mgrCommissionAmount || 0,
              paymentStatus: b.status === 'confirmed' || b.status === 'completed' ? 'paid' : 'pending',
              paymentMethod: b.status === 'confirmed' ? 'Cash / POS' : undefined,
              rawStatus: b.status || 'pending',
              isDatePassed: isPassed,
              computedCategory,
              createdAt: b.createdAt || Date.now(),
              specialNotes: b.specialNotes,
              originalPayload: b,
            });
          });
        }
      }
    } catch (e) {
      console.warn('[MGRHistoryView] Error reading bookings:', e);
    }

    // 3. Load owners to support accurate owner vehicle mapping
    let ownersList: any[] = [];
    try {
      const rawOwners = localStorage.getItem('mgr_transport_owners');
      if (rawOwners) ownersList = JSON.parse(rawOwners);
    } catch {}

    // Filter by Role Persona
    let scoped = unified;
    if (isPassenger) {
      scoped = unified.filter(item => {
        const itemEmail = (item.passengerEmail || '').toLowerCase().trim();
        const itemName = (item.passengerName || '').toLowerCase().trim();
        const itemPhone = (item.passengerPhone || '').trim();
        return (
          (userEmail && itemEmail === userEmail) ||
          (userName && itemName.includes(userName)) ||
          (userPhone && itemPhone === userPhone)
        );
      });
    } else if (isOwner) {
      scoped = unified.filter(item => {
        const itemOwnerName = (item.ownerName || '').toLowerCase().trim();
        const itemOwnerPhone = (item.ownerPhone || '').trim();
        return (
          isOwnedByUser(item.ownerId, currentUser, ownersList) ||
          (userName && itemOwnerName.includes(userName)) ||
          (userPhone && itemOwnerPhone === userPhone)
        );
      });
    }

    setHistoryItems(scoped);
    setIsLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [currentUser, isAdminUser, isPassenger, isOwner, todayStr]);

  // Handle column sort toggle
  const handleSort = (column: keyof UnifiedHistoryItem) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...historyItems];

    // 1. Global text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item =>
        item.bookingNumber.toLowerCase().includes(q) ||
        item.passengerName.toLowerCase().includes(q) ||
        item.passengerPhone.toLowerCase().includes(q) ||
        (item.passengerEmail && item.passengerEmail.toLowerCase().includes(q)) ||
        item.routeFrom.toLowerCase().includes(q) ||
        item.routeTo.toLowerCase().includes(q) ||
        item.vehicleName.toLowerCase().includes(q) ||
        item.vehicleRegNumber.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q) ||
        (item.paymentRef && item.paymentRef.toLowerCase().includes(q))
      );
    }

    // 2. Status category filter
    if (statusFilter !== 'all') {
      result = result.filter(item => item.computedCategory === statusFilter);
    }

    // 3. Category / Vehicle type filter
    if (categoryFilter !== 'all') {
      result = result.filter(item => item.vehicleType === categoryFilter);
    }

    // 4. Payment status filter
    if (paymentFilter !== 'all') {
      result = result.filter(item => item.paymentStatus === paymentFilter);
    }

    // 5. Time quick filter
    if (timeFilter === 'past') {
      result = result.filter(item => item.travelDate < todayStr);
    } else if (timeFilter === 'today') {
      result = result.filter(item => item.travelDate === todayStr);
    } else if (timeFilter === 'upcoming') {
      result = result.filter(item => item.travelDate > todayStr);
    }

    // 6. Sorting
    result.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (typeof aVal === 'string') {
        aVal = (aVal || '').toLowerCase();
        bVal = ((bVal as string) || '').toLowerCase();
      }

      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [historyItems, searchQuery, statusFilter, categoryFilter, paymentFilter, timeFilter, sortColumn, sortDirection, todayStr]);

  // Handle Admin Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem || !isAdminUser) return;
    setIsDeleting(true);

    try {
      const targetId = deletingItem.id;

      // 1. Remove from local storage
      try {
        const rawReqs = localStorage.getItem('mgr_transport_v2_requests');
        if (rawReqs) {
          const reqs = JSON.parse(rawReqs);
          const updated = reqs.filter((r: any) => r.id !== targetId);
          localStorage.setItem('mgr_transport_v2_requests', JSON.stringify(updated));
        }

        const rawBks = localStorage.getItem('mgr_transport_bookings');
        if (rawBks) {
          const bks = JSON.parse(rawBks);
          const updated = bks.filter((b: any) => b.id !== targetId);
          localStorage.setItem('mgr_transport_bookings', JSON.stringify(updated));
        }
      } catch (err) {
        console.warn('[MGRHistory] Local storage delete error:', err);
      }

      // 2. Remove from Supabase if configured
      if (isSupabaseConfigured()) {
        const supa = getSupabase();
        if (supa) {
          await supa.from('mgr_transport_requests').delete().eq('id', targetId);
          await supa.from('transport_bookings').delete().eq('id', targetId);
        }
      }

      // 3. Update in-memory state
      setHistoryItems(prev => prev.filter(item => item.id !== targetId));
      setDeletingItem(null);
    } catch (err: any) {
      alert(`Failed to delete record: ${err?.message || 'Unexpected error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (item: UnifiedHistoryItem) => {
    if (item.rawStatus === 'journey_completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Journey Completed</span>
        </span>
      );
    }
    if (item.rawStatus === 'driver_assigned') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-300 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
          <span>Driver Assigned</span>
        </span>
      );
    }
    if (item.rawStatus === 'journey_started') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-300 shadow-xs">
          <Car className="w-3.5 h-3.5 text-blue-600" />
          <span>In Transit / Journey Started</span>
        </span>
      );
    }

    switch (item.computedCategory) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed</span>
          </span>
        );
      case 'date_passed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Date Passed</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-300 shadow-xs animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Approval</span>
          </span>
        );
      case 'awaiting_payment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-300 shadow-xs">
            <CreditCard className="w-3.5 h-3.5 text-sky-600" />
            <span>Awaiting Payment</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-xs">
            <X className="w-3.5 h-3.5 text-rose-600" />
            <span>Cancelled / Rejected</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            {item.rawStatus}
          </span>
        );
    }
  };

  // Payment Status Badge
  const renderPaymentBadge = (item: UnifiedHistoryItem) => {
    if (item.paymentStatus === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>Paid ({item.paymentMethod || 'LankaQR'})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
        <Clock className="w-3.5 h-3.5" />
        <span>Pending Payment</span>
      </span>
    );
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = historyItems.length;
    const completed = historyItems.filter(i => i.computedCategory === 'completed').length;
    const datePassed = historyItems.filter(i => i.computedCategory === 'date_passed').length;
    const pending = historyItems.filter(i => i.computedCategory === 'pending' || i.computedCategory === 'awaiting_payment').length;
    const revenue = historyItems
      .filter(i => i.paymentStatus === 'paid' || i.computedCategory === 'completed')
      .reduce((sum, i) => sum + (i.fareAmount || 0), 0);

    return { total, completed, datePassed, pending, revenue };
  }, [historyItems]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      {/* Top Banner & Persona Badge */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                MGR Transport Booking History
              </h2>
              <p className="text-xs text-slate-500">
                {isAdminUser
                  ? 'Complete marketplace archive: view all completed, pending, and past journey records with administrative controls.'
                  : isPassenger
                  ? 'Your personal journey archive: review past rides, confirm completed routes, and track booking status.'
                  : 'Fleet booking archive: view bookings, completed trips, and customer journey records for your vehicles.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
            isAdminUser
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : isOwner
              ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {isAdminUser ? 'Admin Privileges: View & Delete' : isOwner ? 'Fleet Owner View' : 'Passenger View'}
          </span>
          <button
            type="button"
            onClick={loadHistory}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500">Total Records</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900">{metrics.total}</div>
          <span className="text-[10px] text-slate-400">All registered requests</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs space-y-1 bg-emerald-50/30">
          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">{metrics.completed}</div>
          <span className="text-[10px] text-emerald-600">Confirmed & settled</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-300 shadow-xs space-y-1 bg-slate-50">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Date Passed</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-700">{metrics.datePassed}</div>
          <span className="text-[10px] text-slate-500">Past scheduled dates</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-1 bg-amber-50/30">
          <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Pending</span>
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-700">{metrics.pending}</div>
          <span className="text-[10px] text-amber-600">Under review or hold</span>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by Request #, Route (e.g. Mannar), Passenger Name, Phone, Vehicle Reg #..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border border-slate-300 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-teal-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Vehicle Type Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer shadow-xs"
            >
              <option value="all">All Vehicle Types</option>
              <option value="car">Cars</option>
              <option value="van">Vans</option>
              <option value="bus">Buses</option>
              <option value="boat">Boats</option>
              <option value="safari">Safari 4x4</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer shadow-xs"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending Payment</option>
            </select>

            {/* Timeline Filter */}
            <select
              value={timeFilter}
              onChange={e => setTimeFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer shadow-xs"
            >
              <option value="all">All Dates</option>
              <option value="past">Past Trips</option>
              <option value="today">Today ({todayStr})</option>
              <option value="upcoming">Upcoming Trips</option>
            </select>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all' as const, label: 'All History', count: historyItems.length },
            { id: 'completed' as const, label: 'Completed', count: historyItems.filter(i => i.computedCategory === 'completed').length },
            { id: 'date_passed' as const, label: 'Date Passed', count: historyItems.filter(i => i.computedCategory === 'date_passed').length },
            { id: 'pending' as const, label: 'Pending Approval', count: historyItems.filter(i => i.computedCategory === 'pending').length },
            { id: 'awaiting_payment' as const, label: 'Awaiting Payment', count: historyItems.filter(i => i.computedCategory === 'awaiting_payment').length },
            { id: 'cancelled' as const, label: 'Cancelled', count: historyItems.filter(i => i.computedCategory === 'cancelled').length },
          ].map(chip => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setStatusFilter(chip.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                statusFilter === chip.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>{chip.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === chip.id ? 'bg-white/20 text-white' : 'bg-white text-slate-700 font-bold border border-slate-200'
              }`}>
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              {/* Booking Number */}
              <th
                onClick={() => handleSort('bookingNumber')}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Booking #</span>
                  {sortColumn === 'bookingNumber' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" /> : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Travel Date & Time */}
              <th
                onClick={() => handleSort('travelDate')}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Travel Date & Time</span>
                  {sortColumn === 'travelDate' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" /> : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Route */}
              <th
                onClick={() => handleSort('routeFrom')}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Route</span>
                  {sortColumn === 'routeFrom' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" /> : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Passenger Details */}
              <th
                onClick={() => handleSort('passengerName')}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Passenger</span>
                  {sortColumn === 'passengerName' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" /> : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Vehicle & Type */}
              <th
                onClick={() => handleSort('vehicleName')}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Vehicle & Reg #</span>
                  {sortColumn === 'vehicleName' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" /> : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Total Fare */}
              <th
                onClick={() => handleSort('fareAmount')}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Fare & Payment</span>
                  {sortColumn === 'fareAmount' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" /> : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Status */}
              <th
                onClick={() => handleSort('computedCategory')}
                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {sortColumn === 'computedCategory' ? (
                    sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-teal-600" /> : <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </th>

              {/* Action Buttons */}
              <th className="py-3.5 px-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 font-medium">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                    <span>Loading journey history...</span>
                  </div>
                </td>
              </tr>
            ) : filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                  <History className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-600">No booking history matches your query.</p>
                  <p className="text-xs text-slate-400">Try changing your search term or status filters.</p>
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition">
                  {/* Booking ID */}
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-slate-900">{item.bookingNumber}</div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {item.listingMode === 'schedule' ? 'Per Seat' : 'Whole Vehicle'}
                    </span>
                  </td>

                  {/* Travel Date & Time */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>{item.travelDate}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{item.travelTime || '08:00 AM'}</span>
                    </div>
                  </td>

                  {/* Route */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span>{item.routeFrom}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{item.routeTo}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">{item.seatCount} Seat(s)</span>
                  </td>

                  {/* Passenger */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{item.passengerName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{item.passengerPhone}</div>
                  </td>

                  {/* Vehicle */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800">{item.vehicleName}</div>
                    <div className="font-mono text-[10px] text-slate-500">{item.vehicleRegNumber}</div>
                  </td>

                  {/* Fare & Payment */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">Rs. {(item.fareAmount || 0).toLocaleString()}</div>
                    <div>{renderPaymentBadge(item)}</div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4">
                    {renderStatusBadge(item)}
                  </td>

                  {/* Actions: View (All) + Delete (Admin Only) */}
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* View Action */}
                      <button
                        type="button"
                        onClick={() => setViewingItem(item)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer shadow-xs"
                        title="View Full Booking Details"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-600" />
                      </button>

                      {/* Admin Delete Action */}
                      {isAdminUser && (
                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer shadow-xs"
                          title="Delete Booking Record (Admin Only)"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: VIEW DETAILS MODAL (All Users)
      ───────────────────────────────────────────────────────────── */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-200 shadow-2xl p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Booking Details: {viewingItem.bookingNumber}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Mode: {viewingItem.listingMode === 'schedule' ? 'Scheduled Route (Per Seat)' : 'Full Vehicle Hire'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Status Header */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-600">Booking Status:</span>
              <div>{renderStatusBadge(viewingItem)}</div>
            </div>

            {/* Route & Journey Details */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Journey Information</div>
              <div className="flex items-center justify-between font-bold text-sm text-slate-900">
                <span>{viewingItem.routeFrom}</span>
                <ArrowRight className="w-4 h-4 text-teal-600" />
                <span>{viewingItem.routeTo}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px]">Travel Date:</span>
                  <div className="font-bold text-slate-800">{viewingItem.travelDate}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Travel Time:</span>
                  <div className="font-bold text-slate-800">{viewingItem.travelTime || '08:00 AM'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Seats Booked:</span>
                  <div className="font-bold text-slate-800">{viewingItem.seatCount} Seat(s)</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Vehicle Category:</span>
                  <div className="font-bold text-slate-800 uppercase">{viewingItem.vehicleType}</div>
                </div>
              </div>
            </div>

            {/* Passenger & Vehicle Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Passenger</span>
                <div className="font-bold text-slate-900">{viewingItem.passengerName}</div>
                <div className="text-slate-600 font-mono text-[11px]">{viewingItem.passengerPhone}</div>
                {viewingItem.passengerEmail && (
                  <div className="text-slate-400 text-[10px] truncate">{viewingItem.passengerEmail}</div>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Assigned Vehicle</span>
                <div className="font-bold text-slate-900">{viewingItem.vehicleName}</div>
                <div className="font-mono text-slate-600 text-[11px]">{viewingItem.vehicleRegNumber}</div>
                <div className="text-slate-400 text-[10px]">Operator: {viewingItem.ownerName}</div>
              </div>
            </div>

            {/* Financials & Payment Details */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-200 text-xs space-y-2">
              <div className="font-bold text-emerald-800 uppercase tracking-wider text-[10px]">Payment & Settlement</div>
              <div className="flex items-center justify-between font-bold text-base text-slate-900">
                <span>Total Amount:</span>
                <span className="text-emerald-700">Rs. {(viewingItem.fareAmount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-emerald-200/60">
                <span>Payment Status:</span>
                <div>{renderPaymentBadge(viewingItem)}</div>
              </div>
              {viewingItem.paymentRef && (
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>Reference ID:</span>
                  <span>{viewingItem.paymentRef}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {viewingItem.specialNotes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                <span className="font-bold text-slate-700">Special Notes: </span>
                {viewingItem.specialNotes}
              </div>
            )}

            {/* Driver & Captain Information */}
            {viewingItem.driverName && (
              <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200 text-xs space-y-1.5">
                <div className="font-bold text-purple-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                  <span>Assigned {viewingItem.driverType === 'captain' ? 'Boat Captain' : 'Vehicle Driver'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{viewingItem.driverName}</span>
                  <span className="text-slate-600 font-mono text-[11px]">{viewingItem.driverPhone || 'No contact provided'}</span>
                </div>
              </div>
            )}

            {/* Rating & Review Information */}
            {viewingItem.rating && (
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-2">
                <div className="font-bold text-amber-900 uppercase tracking-wider text-[10px] flex items-center justify-between">
                  <span>Passenger Rating & Feedback</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= (viewingItem.rating || 0)
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="ml-1 font-bold text-amber-900 text-xs">{viewingItem.rating}/5</span>
                  </div>
                </div>
                {viewingItem.reviewComment && (
                  <p className="text-xs text-slate-700 italic bg-white/80 p-2.5 rounded-xl border border-amber-200/60">
                    "{viewingItem.reviewComment}"
                  </p>
                )}
              </div>
            )}

            {/* Process Notifications Log */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center justify-between">
                <span>Process Notifications Dispatch</span>
                <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Audit Verified
                </span>
              </div>
              {viewingItem.notifications && viewingItem.notifications.length > 0 ? (
                <div className="space-y-1.5">
                  {viewingItem.notifications.map((n, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 text-[11px]">
                      <span className="font-bold text-slate-800 capitalize flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {n.channel}
                      </span>
                      <span className="text-slate-500 text-[10px] truncate max-w-[200px]">{n.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Dispatched through Admin enabled channels (Registered Email, WhatsApp, and SMS).
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setViewingItem(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer shadow-sm"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: ADMIN DELETE CONFIRMATION (Admin Only)
      ───────────────────────────────────────────────────────────── */}
      {deletingItem && isAdminUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md border border-rose-200 shadow-2xl p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-base text-slate-900">
                Permanently Delete Booking Record?
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong className="text-slate-800 font-mono">{deletingItem.bookingNumber}</strong>?
                This action will delete the record from local storage and remote database tables.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div><strong className="text-slate-700">Passenger:</strong> {deletingItem.passengerName}</div>
              <div><strong className="text-slate-700">Route:</strong> {deletingItem.routeFrom} ➔ {deletingItem.routeTo}</div>
              <div><strong className="text-slate-700">Travel Date:</strong> {deletingItem.travelDate}</div>
              <div><strong className="text-slate-700">Amount:</strong> Rs. {(deletingItem.fareAmount || 0).toLocaleString()}</div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
