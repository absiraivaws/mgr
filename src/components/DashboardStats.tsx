import React, { useState, useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  PlayCircle, 
  History, 
  User, 
  Clock, 
  Calendar,
  DollarSign, 
  Layers,
  Sun,
  Moon,
  Palette,
  ShieldCheck,
  LogOut,
  Bike,
  Settings as SettingsIcon,
  Users,
  TrendingUp,
  Activity,
  Zap,
  BarChart3,
  LineChart as LineChartIcon,
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  Cake,
  RotateCcw,
  Plus,
  Minus,
  Filter,
} from 'lucide-react';
import { AppSettings, MessageHistoryEntry, RentalRecord, Vehicle } from '../types';
import { formatCurrency } from '../utils/pricing';
import { DEFAULT_USER, UserAccount } from '../utils/auth';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';

interface DashboardStatsProps {
  activeRentals: RentalRecord[];
  allVehicles: Vehicle[];
  todayCompletedRentals: RentalRecord[];
  messageHistory?: MessageHistoryEntry[];
  settings: AppSettings;
  currentUser?: UserAccount;
  themeMode: ThemeMode;
  accent: AccentColor;
  onNavigateToHistory?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  activeRentals,
  allVehicles,
  todayCompletedRentals,
  messageHistory = [],
  settings,
  currentUser,
  themeMode,
  accent,
  onNavigateToHistory,
}) => {
  const t = getThemeClasses(themeMode, accent);

  // Timeframe selector for chart: 7, 14, 30 days
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(7);
  const [chartMetric, setChartMetric] = useState<'both' | 'income' | 'count'>('both');
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    label: string;
    income: number;
    count: number;
    x: number;
    yIncome: number;
    yCount: number;
  } | null>(null);

  // Calculate summary statistics for TODAY
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const todayOnlyRentals = useMemo(() => {
    return todayCompletedRentals.filter((r) => {
      const d = new Date(r.completedAt || r.endTime || r.startTime);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return iso === todayISO;
    });
  }, [todayCompletedRentals, todayISO]);

  const totalTodayRevenue = todayOnlyRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalActiveRentals = activeRentals.length;
  const availableVehiclesCount = allVehicles.filter(v => v.status === 'available').length;
  const totalVehiclesCount = allVehicles.length;
  const completedTodayCount = todayOnlyRentals.length;

  // Overall / All-Time Summary Statistics across all completed rentals
  const totalAllTimeRevenue = useMemo(() => {
    return todayCompletedRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  }, [todayCompletedRentals]);
  const totalAllTimeTrips = todayCompletedRentals.length;

  // Date, Amount & Trip Analytics Filters on Dashboard
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');
  const [filterAmount, setFilterAmount] = useState<number | ''>('');
  const [filterAmountCondition, setFilterAmountCondition] = useState<'above' | 'below'>('above');
  const [filterAmountMode, setFilterAmountMode] = useState<'daily' | 'trip'>('daily');
  const [filterTripCount, setFilterTripCount] = useState<number | ''>('');
  const [filterTripCondition, setFilterTripCondition] = useState<'above' | 'below'>('above');

  const isDashboardFiltered = Boolean(filterFromDate || filterToDate || filterAmount !== '' || filterTripCount !== '');

  // Today's messaging summary
  const todayMsgStats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const todayMsgs = messageHistory.filter((m) => m.sentAt >= todayStartMs);
    return {
      total: todayMsgs.length,
      sent: todayMsgs.filter((m) => m.status === 'sent' || m.status === 'delivered' || m.status === 'read').length,
      delivered: todayMsgs.filter((m) => m.status === 'delivered' || m.status === 'read').length,
      failed: todayMsgs.filter((m) => m.status === 'failed').length,
      pending: todayMsgs.filter((m) => m.status === 'queued' || m.status === 'sending' || m.status === 'scheduled').length,
      birthday: todayMsgs.filter((m) => m.messageType === 'birthday').length,
      bulkCampaigns: new Set(todayMsgs.filter((m) => m.messageType === 'bulk' && m.campaignName).map((m) => m.campaignName)).size,
    };
  }, [messageHistory]);

  // Rental status distribution
  const statusCounts = {
    available: allVehicles.filter(v => v.status === 'available').length,
    rented: allVehicles.filter(v => v.status === 'rented').length,
    maintenance: allVehicles.filter(v => v.status === 'maintenance').length,
    reserved: allVehicles.filter(v => v.status === 'reserved').length,
  };

  // Top rentals by revenue
  const topRentals = [...todayOnlyRentals]
    .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
    .slice(0, 5);

  // Elapsed time helper
  const getElapsedTime = (startTime: number) => {
    const elapsed = Math.floor((Date.now() - startTime) / 60000);
    if (elapsed < 60) return `${elapsed} min`;
    const h = Math.floor(elapsed / 60);
    const m = elapsed % 60;
    return `${h}h ${m}m`;
  };

  // Group completed rentals into daily buckets (YYYY-MM-DD)
  const dailyBuckets = useMemo(() => {
    const buckets = new Map<string, { income: number; count: number; rentals: RentalRecord[] }>();
    todayCompletedRentals.forEach((r) => {
      const d = new Date(r.completedAt || r.endTime || r.startTime);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const b = buckets.get(iso) || { income: 0, count: 0, rentals: [] };
      b.income += (r.totalAmount || 0);
      b.count += 1;
      b.rentals.push(r);
      buckets.set(iso, b);
    });
    return buckets;
  }, [todayCompletedRentals]);

  // Evaluator for day filtering with support for Daily Total vs Per Trip Amount, and Trip Count
  const evaluateDayFilter = useCallback((iso: string, bucket?: { income: number; count: number; rentals: RentalRecord[] }) => {
    // 1. Date Range
    if (filterFromDate && iso < filterFromDate) return { matches: false, income: 0, count: 0, rentals: [] };
    if (filterToDate && iso > filterToDate) return { matches: false, income: 0, count: 0, rentals: [] };

    const rawIncome = bucket ? bucket.income : 0;
    const rawCount = bucket ? bucket.count : 0;
    const rawRentals = bucket ? bucket.rentals : [];

    let effectiveIncome = rawIncome;
    let effectiveCount = rawCount;
    let effectiveRentals = rawRentals;

    // 2. Amount Filter
    if (typeof filterAmount === 'number' && filterAmount > 0) {
      if (filterAmountMode === 'daily') {
        // Daily total income check
        if (filterAmountCondition === 'above' && rawIncome < filterAmount) {
          return { matches: false, income: 0, count: 0, rentals: [] };
        }
        if (filterAmountCondition === 'below' && rawIncome > filterAmount) {
          return { matches: false, income: 0, count: 0, rentals: [] };
        }
      } else {
        // Individual rental amount check ('trip')
        effectiveRentals = rawRentals.filter((r) => {
          const a = r.totalAmount || 0;
          return filterAmountCondition === 'above' ? a >= filterAmount : a <= filterAmount;
        });
        effectiveIncome = effectiveRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        effectiveCount = effectiveRentals.length;
        if (effectiveCount === 0) {
          return { matches: false, income: 0, count: 0, rentals: [] };
        }
      }
    }

    // 3. Trip Count Filter (Filters days by completed trip count)
    if (typeof filterTripCount === 'number' && filterTripCount > 0) {
      if (filterTripCondition === 'above' && effectiveCount < filterTripCount) {
        return { matches: false, income: 0, count: 0, rentals: [] };
      }
      if (filterTripCondition === 'below' && effectiveCount > filterTripCount) {
        return { matches: false, income: 0, count: 0, rentals: [] };
      }
    }

    return {
      matches: true,
      income: effectiveIncome,
      count: effectiveCount,
      rentals: effectiveRentals,
    };
  }, [filterFromDate, filterToDate, filterAmount, filterAmountCondition, filterAmountMode, filterTripCount, filterTripCondition]);

  // Filtered rentals and matched days count for KPI cards and table navigation
  const { filteredDashboardRentals, matchedDaysCount } = useMemo(() => {
    if (!isDashboardFiltered) {
      return { filteredDashboardRentals: todayCompletedRentals, matchedDaysCount: dailyBuckets.size };
    }

    const matchedRentals: RentalRecord[] = [];
    let count = 0;

    dailyBuckets.forEach((bucket, iso) => {
      const res = evaluateDayFilter(iso, bucket);
      if (res.matches && res.count > 0) {
        matchedRentals.push(...res.rentals);
        count += 1;
      }
    });

    return { filteredDashboardRentals: matchedRentals, matchedDaysCount: count };
  }, [todayCompletedRentals, dailyBuckets, isDashboardFiltered, evaluateDayFilter]);

  const filteredDashboardRevenue = useMemo(() => {
    return filteredDashboardRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  }, [filteredDashboardRentals]);

  // Build daily timeline dataset for Line Chart — fully responsive to Date Range, Daily/Trip Amount, and Trip Count Filters
  const chartData = useMemo(() => {
    const daysArray: {
      iso: string;
      date: string;
      label: string;
      income: number;
      count: number;
      matched: boolean;
    }[] = [];

    // Check if custom date range filter is provided
    let startD: Date;
    let endD: Date;

    if (filterFromDate && filterToDate) {
      startD = new Date(filterFromDate + 'T00:00:00');
      endD = new Date(filterToDate + 'T00:00:00');
      if (startD > endD) {
        const tmp = startD;
        startD = endD;
        endD = tmp;
      }
    } else if (filterFromDate) {
      startD = new Date(filterFromDate + 'T00:00:00');
      endD = new Date();
    } else if (filterToDate) {
      endD = new Date(filterToDate + 'T00:00:00');
      startD = new Date(endD);
      startD.setDate(startD.getDate() - (chartDays - 1));
    } else {
      // Default: Last N consecutive days (7D, 14D, or 30D)
      endD = new Date();
      startD = new Date(endD);
      startD.setDate(startD.getDate() - (chartDays - 1));
    }

    const diffMs = Math.abs(endD.getTime() - startD.getTime());
    const numDays = Math.min(90, Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1));

    for (let i = 0; i < numDays; i++) {
      const cur = new Date(startD);
      cur.setDate(cur.getDate() + i);
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const label = cur.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      const bucket = dailyBuckets.get(iso);
      const res = evaluateDayFilter(iso, bucket);

      daysArray.push({
        iso,
        date: iso,
        label,
        income: res.income,
        count: res.count,
        matched: res.matches && res.count > 0,
      });
    }

    return daysArray;
  }, [dailyBuckets, filterFromDate, filterToDate, chartDays, evaluateDayFilter]);

  // Aggregate stats for the selected chart timeframe
  const chartTotalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const chartTotalTrips = chartData.reduce((sum, d) => sum + d.count, 0);
  const chartAvgDailyIncome = chartTotalIncome / Math.max(1, chartData.length);
  const maxIncome = Math.max(...chartData.map((d) => d.income), 10);
  const maxCount = Math.max(...chartData.map((d) => d.count), 5);

  // SVG Chart Geometry Constants
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingLeft = 55;
  const paddingRight = 40;
  const paddingTop = 25;
  const paddingBottom = 40;
  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  // Compute coordinate points for lines
  const points = useMemo(() => {
    if (chartData.length === 0) return [];
    return chartData.map((d, index) => {
      const x = paddingLeft + (index / Math.max(1, chartData.length - 1)) * innerWidth;
      const yIncome = paddingTop + innerHeight - (d.income / maxIncome) * innerHeight;
      const yCount = paddingTop + innerHeight - (d.count / maxCount) * innerHeight;
      return {
        ...d,
        x,
        yIncome,
        yCount,
      };
    });
  }, [chartData, maxIncome, maxCount, innerWidth, innerHeight, paddingLeft, paddingTop]);

  // SVG Path Strings
  const incomeLinePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.yIncome}` : `${acc} L ${curr.x} ${curr.yIncome}`;
    }, '');
  }, [points]);

  const incomeAreaPath = useMemo(() => {
    if (points.length === 0) return '';
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const baselineY = paddingTop + innerHeight;
    return `${incomeLinePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [incomeLinePath, points, paddingTop, innerHeight]);

  const countLinePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.yCount}` : `${acc} L ${curr.x} ${curr.yCount}`;
    }, '');
  }, [points]);

  // Dynamic font sizing helper so large currency amounts are compact and never truncate
  const getDynamicAmountClass = (text: string) => {
    if (text.length > 14) return 'text-base sm:text-lg lg:text-xl font-extrabold';
    if (text.length > 10) return 'text-lg sm:text-xl lg:text-2xl font-extrabold';
    return 'text-xl sm:text-2xl lg:text-2xl font-black';
  };

  const formattedTotalAllTime = formatCurrency(totalAllTimeRevenue, settings.currencySymbol, settings.currencyPosition);
  const formattedTotalToday = formatCurrency(totalTodayRevenue, settings.currencySymbol, settings.currencyPosition);
  const formattedAvgDaily = formatCurrency(chartAvgDailyIncome, settings.currencySymbol, settings.currencyPosition);

  return (
    <div className={`${t.cardBg} p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl space-y-6`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/40">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-violet-500" />
            <div>
              <h2 className={`text-2xl sm:text-3xl font-bold ${t.textHeading}`}>
                Dashboard & Performance Analytics
              </h2>
              <p className={`text-xs sm:text-sm ${t.textMuted} mt-0.5`}>
                {settings.businessName || 'Mannar Green Ride'} · Real-time Rental Operations
              </p>
            </div>
          </div>

          {/* User badge & Actions */}
          <div className="flex items-center gap-2.5">
            {onNavigateToHistory && (
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                title="Navigate to detailed settled records table"
              >
                <History className="w-3.5 h-3.5" />
                <span>Rental History Table →</span>
              </button>
            )}
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${t.cardSubtleBg}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className={t.textHeading}>{currentUser?.name || 'Admin'}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-500">
                ({currentUser?.role || 'admin'})
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid - 5 Compact Executive Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
          
          {/* 1. Total Amount Card (Compacted per Requirement 5) */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} border-l-4 border-l-emerald-500 shadow-sm transition-all hover:scale-[1.01]`}>
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                  Total Amount
                </span>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                isDashboardFiltered
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              }`}>
                {isDashboardFiltered ? 'Filtered Period' : 'All-Time'}
              </span>
            </div>
            <p className={`${getDynamicAmountClass(isDashboardFiltered ? formatCurrency(filteredDashboardRevenue, settings.currencySymbol, settings.currencyPosition) : formattedTotalAllTime)} font-mono text-emerald-500 tracking-tight leading-tight my-1 break-normal`}>
              {isDashboardFiltered
                ? formatCurrency(filteredDashboardRevenue, settings.currencySymbol, settings.currencyPosition)
                : formattedTotalAllTime}
            </p>
            <p className={`text-[11px] ${t.textMuted} mt-1.5 flex items-center justify-between flex-wrap gap-1 border-t border-slate-700/20 pt-1`}>
              {isDashboardFiltered ? (
                <>
                  <span className="text-amber-500 font-semibold">{matchedDaysCount} days ({filteredDashboardRentals.length} trips) matched</span>
                  <span className="opacity-80">All-Time: {formattedTotalAllTime}</span>
                </>
              ) : (
                <>
                  <span>Today: <strong className="text-emerald-500 font-mono font-semibold">{formattedTotalToday}</strong></span>
                  <span className="opacity-80">Across {totalAllTimeTrips} trips</span>
                </>
              )}
            </p>
          </div>

          {/* 2. Available Fleet Card (Moved next to Total Amount per Requirement 5) */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} border-l-4 border-l-cyan-500 shadow-sm transition-all hover:scale-[1.01]`}>
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
                  <Bike className="w-3.5 h-3.5 text-cyan-500" />
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                  Available
                </span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-cyan-500/10 text-cyan-500 border-cyan-500/20 shrink-0">
                Fleet
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-mono font-black text-cyan-500 tracking-tight leading-tight my-1">
              {availableVehiclesCount}{' '}
              <span className="text-xs sm:text-sm font-bold text-slate-400">/ {totalVehiclesCount}</span>
            </p>
            <p className={`text-[11px] ${t.textMuted} mt-1.5 flex items-center justify-between flex-wrap gap-1 border-t border-slate-700/20 pt-1`}>
              <span className="text-emerald-500 font-semibold">{availableVehiclesCount} ready</span>
              <span className="text-amber-500 font-semibold">{totalActiveRentals} rented</span>
            </p>
          </div>

          {/* 3. Trip / Ride Count Card */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} border-l-4 border-l-amber-500 shadow-sm transition-all hover:scale-[1.01]`}>
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Bike className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                  Trip / Ride Count
                </span>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                isDashboardFiltered
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}>
                {isDashboardFiltered ? 'Filtered' : 'Total'}
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-mono font-black text-amber-500 tracking-tight leading-tight my-1">
              {isDashboardFiltered ? filteredDashboardRentals.length : totalAllTimeTrips}{' '}
              <span className="text-xs sm:text-sm font-bold text-slate-400">Trips</span>
            </p>
            <p className={`text-[11px] ${t.textMuted} mt-1.5 flex items-center justify-between flex-wrap gap-1 border-t border-slate-700/20 pt-1`}>
              {isDashboardFiltered ? (
                <>
                  <span className="text-emerald-500 font-medium">Across {matchedDaysCount} matched {matchedDaysCount === 1 ? 'day' : 'days'}</span>
                  <span className="opacity-80">Total: {totalAllTimeTrips}</span>
                </>
              ) : (
                <>
                  <span>{completedTodayCount} completed today</span>
                  <span className="text-cyan-500 font-semibold">{totalActiveRentals} active</span>
                </>
              )}
            </p>
          </div>

          {/* 4. Today's Revenue Card */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} border-l-4 border-l-emerald-600 shadow-sm transition-all hover:scale-[1.01]`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                Today's Revenue
              </span>
            </div>
            <p className={`${getDynamicAmountClass(formattedTotalToday)} font-mono font-bold text-emerald-500 tracking-tight leading-tight my-1 break-normal`}>
              {formattedTotalToday}
            </p>
            <p className={`text-[11px] ${t.textMuted} mt-1.5 border-t border-slate-700/20 pt-1`}>
              {completedTodayCount} {completedTodayCount === 1 ? 'trip completed today' : 'trips completed today'}
            </p>
          </div>

          {/* 5. Daily Avg. Income Card */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} border-l-4 border-l-purple-500 shadow-sm transition-all hover:scale-[1.01]`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>
                Daily Avg. Income
              </span>
            </div>
            <p className={`${getDynamicAmountClass(formattedAvgDaily)} font-mono font-bold text-purple-400 tracking-tight leading-tight my-1 break-normal`}>
              {formattedAvgDaily}
            </p>
            <p className={`text-[11px] ${t.textMuted} mt-1.5 border-t border-slate-700/20 pt-1`}>
              {filterFromDate || filterToDate
                ? `Calculated over filtered ${chartData.length} days`
                : `Calculated over past ${chartDays} days`}
            </p>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* ================= DASHBOARD ANALYTICS FILTERS (DATE, AMOUNT, TRIP) ====== */}
        {/* ========================================================================= */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${t.cardSubtleBg} ${t.divider}`}>
          {isDashboardFiltered && (
            <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-200 dark:border-slate-700/50">
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Filtered: {matchedDaysCount} {matchedDaysCount === 1 ? 'Day' : 'Days'} ({filteredDashboardRentals.length} Trips · {formatCurrency(filteredDashboardRevenue, settings.currencySymbol, settings.currencyPosition)})
              </span>
              <button
                type="button"
                onClick={() => {
                  setFilterFromDate('');
                  setFilterToDate('');
                  setFilterAmount('');
                  setFilterTripCount('');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 flex items-center gap-1 transition cursor-pointer"
                title="Clear all active filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* 1. From Date */}
            <div>
              <div className="min-h-[28px] flex items-center justify-between mb-2">
                <label className={`text-xs font-bold ${t.textHeading} flex items-center gap-1.5`}>
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>From Date</span>
                </label>
                {filterFromDate && (
                  <button
                    type="button"
                    onClick={() => setFilterFromDate('')}
                    className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="date"
                value={filterFromDate}
                max={filterToDate || undefined}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className={`w-full h-11 rounded-2xl px-3 text-xs sm:text-sm font-mono font-medium ${t.textInput} cursor-pointer`}
                onClick={(e) => { try { (e.target as HTMLInputElement).showPicker?.(); } catch (err) {} }}
              />
            </div>

            {/* 2. To Date */}
            <div>
              <div className="min-h-[28px] flex items-center justify-between mb-2">
                <label className={`text-xs font-bold ${t.textHeading} flex items-center gap-1.5`}>
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>To Date</span>
                </label>
                {filterToDate && (
                  <button
                    type="button"
                    onClick={() => setFilterToDate('')}
                    className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="date"
                value={filterToDate}
                min={filterFromDate || undefined}
                onChange={(e) => setFilterToDate(e.target.value)}
                className={`w-full h-11 rounded-2xl px-3 text-xs sm:text-sm font-mono font-medium ${t.textInput} cursor-pointer`}
                onClick={(e) => { try { (e.target as HTMLInputElement).showPicker?.(); } catch (err) {} }}
              />
            </div>

            {/* 3. Amount Filter with Daily/Trip Toggle, Above/Below Selector, and Up/Down Controls */}
            <div>
              <div className="min-h-[28px] flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className={`text-xs font-bold ${t.textHeading}`}>Amount</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Daily vs Per-Trip Pill */}
                  <div className="inline-flex items-center bg-slate-200/90 dark:bg-slate-700/90 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterAmountMode('daily')}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        filterAmountMode === 'daily'
                          ? 'bg-emerald-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-white'
                      }`}
                      title="Filter by daily aggregate revenue"
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterAmountMode('trip')}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        filterAmountMode === 'trip'
                          ? 'bg-emerald-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-white'
                      }`}
                      title="Filter by individual rental ticket amount"
                    >
                      Trip
                    </button>
                  </div>

                  {/* Above / Below Pill Selector */}
                  <div className="inline-flex items-center bg-slate-200/90 dark:bg-slate-700/90 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterAmountCondition('above')}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        filterAmountCondition === 'above'
                          ? 'bg-emerald-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-white'
                      }`}
                      title="Filter records where amount is greater than or equal to entered value"
                    >
                      ≥
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterAmountCondition('below')}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        filterAmountCondition === 'below'
                          ? 'bg-emerald-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-white'
                      }`}
                      title="Filter records where amount is less than or equal to entered value"
                    >
                      ≤
                    </button>
                  </div>

                  {filterAmount !== '' && (
                    <button
                      type="button"
                      onClick={() => setFilterAmount('')}
                      className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer ml-0.5"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500 font-bold text-xs">
                  {settings.currencySymbol || 'LK'} {filterAmountCondition === 'above' ? '≥' : '≤'}
                </div>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder={filterAmountMode === 'daily' ? 'e.g. 2000' : 'e.g. 1000'}
                  value={filterAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterAmount(v === '' ? '' : Math.max(0, Number(v)));
                  }}
                  className={`w-full h-11 rounded-2xl pl-13 pr-16 text-xs sm:text-sm font-mono font-medium ${t.textInput}`}
                />
                <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterAmount(prev => (typeof prev === 'number' ? Math.max(0, prev - 100) : 0))}
                    className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                    title="Decrease 100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterAmount(prev => (typeof prev === 'number' ? prev + 1 : 100))}
                    className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                    title="Increase 100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Trip Count Filter with Above/Below Selector and Up/Down Controls */}
            <div>
              <div className="min-h-[28px] flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Bike className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className={`text-xs font-bold ${t.textHeading}`}>Trip Count</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Above / Below Pill Selector */}
                  <div className="inline-flex items-center bg-slate-200/90 dark:bg-slate-700/90 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFilterTripCondition('above')}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        filterTripCondition === 'above'
                          ? 'bg-amber-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-white'
                      }`}
                      title="Filter days where trip count is greater than or equal (≥) to entered value"
                    >
                      ≥
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTripCondition('below')}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        filterTripCondition === 'below'
                          ? 'bg-amber-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-white'
                      }`}
                      title="Filter days where trip count is less than or equal (≤) to entered value"
                    >
                      ≤
                    </button>
                  </div>

                  {filterTripCount !== '' && (
                    <button
                      type="button"
                      onClick={() => setFilterTripCount('')}
                      className="text-[10px] text-slate-400 hover:text-rose-400 underline cursor-pointer ml-0.5"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-500 font-bold text-xs">
                  Trips {filterTripCondition === 'above' ? '≥' : '≤'}
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 5"
                  value={filterTripCount}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFilterTripCount(v === '' ? '' : Math.max(0, Number(v)));
                  }}
                  className={`w-full h-11 rounded-2xl pl-16 pr-16 text-xs sm:text-sm font-mono font-medium ${t.textInput}`}
                />
                <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterTripCount(prev => (typeof prev === 'number' ? Math.max(0, prev - 1) : 0))}
                    className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                    title="Decrease 1 trip"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTripCount(prev => (typeof prev === 'number' ? prev + 1 : 1))}
                    className="w-6 h-6 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                    title="Increase 1 trip"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ================= DAILY RENTAL INCOME & COUNT LINE CHART ================= */}
        {/* ========================================================================= */}
        <div className={`p-5 rounded-2xl border shadow-xl ${t.cardSubtleBg} ${t.divider} space-y-4`}>
          
          {/* Chart Header with Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-md">
                <LineChartIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-base font-bold ${t.textHeading}`}>
                    Daily Rental Income & Trip Count Trends
                  </h3>
                  {(filterFromDate || filterToDate) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold shadow-xs">
                      📅 Range: {filterFromDate || 'Start'} → {filterToDate || 'Today'} ({chartData.length} Days)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono">
                      📅 Past {chartDays} Days ({chartData[0]?.label || ''} – {chartData[chartData.length - 1]?.label || ''})
                    </span>
                  )}
                </div>
                <p className={`text-xs ${t.textMuted} mt-0.5`}>
                  Interactive line graph tracking daily income ({settings.currencySymbol || 'LK'}) and completed trip volume
                </p>
              </div>
            </div>

            {/* Timeframe & Metric Toggle Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Metric Selectors */}
              <div className="inline-flex items-center rounded-xl border border-slate-700 p-0.5 bg-slate-900/60 text-xs">
                <button
                  type="button"
                  onClick={() => setChartMetric('both')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    chartMetric === 'both'
                      ? 'bg-gradient-to-r from-emerald-500 to-orange-500 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Both Series
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('income')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    chartMetric === 'income'
                      ? 'bg-emerald-500 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🟢 Income ($)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('count')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    chartMetric === 'count'
                      ? 'bg-orange-500 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🟠 Trips Count
                </button>
              </div>

              {/* Timeframe Pill Toggles or Custom Filtered Range Badge */}
              {filterFromDate || filterToDate ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-bold shadow-xs">
                  <span>Filtered Range: {chartData.length} Days</span>
                  <button
                    type="button"
                    onClick={() => { setFilterFromDate(''); setFilterToDate(''); }}
                    className="text-slate-400 hover:text-white underline ml-1 cursor-pointer font-normal text-[11px]"
                    title="Reset custom date filter to default 7D"
                  >
                    Reset
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center rounded-xl border border-slate-700 p-0.5 bg-slate-900/60 text-xs">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setChartDays(days as 7 | 14 | 30)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        chartDays === days
                          ? `${t.badge} font-black`
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {days}D
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chart Summary Stats Strip with Contrasting Badges */}
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shadow-xs" />
              <span className={t.textMuted}>Period Income:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {formatCurrency(chartTotalIncome, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 inline-block shadow-xs" />
              <span className={t.textMuted}>Total Completed Trips:</span>
              <span className="font-mono font-bold text-orange-400 text-sm">
                {chartTotalTrips} Trips
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={t.textMuted}>Peak Day Revenue:</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {formatCurrency(maxIncome, settings.currencySymbol, settings.currencyPosition)}
              </span>
            </div>
            {(filterFromDate || filterToDate) && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 font-mono font-bold text-xs">
                <span>📅 Range: {filterFromDate || 'Start'} to {filterToDate || 'Today'}</span>
              </div>
            )}
            {filterAmount !== '' && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-xs">
                <span>Amount: {filterAmountCondition === 'above' ? '≥' : '≤'} {settings.currencySymbol || 'LK'} {filterAmount} ({filterAmountMode === 'daily' ? 'Daily Total' : 'Per Trip'})</span>
              </div>
            )}
            {filterTripCount !== '' && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs">
                <span>Trips: {filterTripCondition === 'above' ? '≥' : '≤'} {filterTripCount} Trips/Day</span>
              </div>
            )}
          </div>

          {/* SVG Line Chart Container */}
          <div className="relative w-full overflow-visible pt-2">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-56 sm:h-64 select-none overflow-visible"
            >
              <defs>
                {/* Emerald Gradient for Income Area Fill */}
                <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>

                {/* Sunset Orange Gradient for Trips */}
                <linearGradient id="tripsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = paddingTop + innerHeight * (1 - ratio);
                const incomeVal = Math.round(maxIncome * ratio);
                const countVal = Math.round(maxCount * ratio);

                return (
                  <g key={ratio}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke={themeMode === 'dark' ? '#334155' : '#cbd5e1'}
                      strokeDasharray="3 3"
                      strokeOpacity="0.6"
                    />
                    {/* Left Y-Axis: Income Amount (Emerald) */}
                    {(chartMetric === 'both' || chartMetric === 'income') && (
                      <text
                        x={paddingLeft - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        fill="#10b981"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {settings.currencySymbol}{incomeVal}
                      </text>
                    )}
                    {/* Right Y-Axis: Trip Count (Sunset Orange) */}
                    {(chartMetric === 'both' || chartMetric === 'count') && (
                      <text
                        x={svgWidth - paddingRight + 8}
                        y={y + 3.5}
                        textAnchor="start"
                        fill="#f97316"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {countVal}t
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Area Fill Under Income Line */}
              {(chartMetric === 'both' || chartMetric === 'income') && incomeAreaPath && (
                <path d={incomeAreaPath} fill="url(#incomeAreaGrad)" />
              )}

              {/* Income Line (Vibrant Emerald Green) */}
              {(chartMetric === 'both' || chartMetric === 'income') && incomeLinePath && (
                <path
                  d={incomeLinePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Trip Count Line (Contrasting Sunset Orange with Distinct Movement) */}
              {(chartMetric === 'both' || chartMetric === 'count') && countLinePath && (
                <path
                  d={countLinePath}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="3"
                  strokeDasharray={chartMetric === 'both' ? '6 3' : 'none'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Data Points & Hover Targets with Smart Axis Labels */}
              {(() => {
                const labelStep = points.length <= 10 ? 1 : points.length <= 20 ? 2 : Math.ceil(points.length / 10);
                return points.map((p, idx) => {
                  const showLabel = idx % labelStep === 0 || idx === points.length - 1;
                  return (
                    <g key={p.iso || idx}>
                      {/* Axis Tick Mark */}
                      <line
                        x1={p.x}
                        y1={paddingTop + innerHeight}
                        x2={p.x}
                        y2={paddingTop + innerHeight + (showLabel ? 5 : 3)}
                        stroke={themeMode === 'dark' ? '#475569' : '#cbd5e1'}
                        strokeWidth="1"
                      />

                      {/* Income Point (Emerald) */}
                      {(chartMetric === 'both' || chartMetric === 'income') && (
                        <circle
                          cx={p.x}
                          cy={p.yIncome}
                          r="4.5"
                          fill="#10b981"
                          stroke="#0f172a"
                          strokeWidth="2"
                          className="cursor-pointer hover:scale-150 transition-transform"
                        />
                      )}

                      {/* Trip Count Point (Sunset Orange) */}
                      {(chartMetric === 'both' || chartMetric === 'count') && (
                        <circle
                          cx={p.x}
                          cy={p.yCount}
                          r="4"
                          fill="#f97316"
                          stroke="#0f172a"
                          strokeWidth="2"
                          className="cursor-pointer hover:scale-150 transition-transform"
                        />
                      )}

                      {/* X-Axis Date Label with Step Skipping */}
                      {showLabel && (
                        <text
                          x={p.x}
                          y={svgHeight - 12}
                          textAnchor="middle"
                          fill={themeMode === 'dark' ? '#94a3b8' : '#64748b'}
                          fontSize="9.5"
                          fontWeight="600"
                        >
                          {p.label}
                        </text>
                      )}

                      {/* Transparent hover detection rect */}
                      <rect
                        x={p.x - 18}
                        y={paddingTop}
                        width="36"
                        height={innerHeight}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(p)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    </g>
                  );
                });
              })()}

              {/* Informational overlay when filtered period has 0 activity */}
              {chartTotalIncome === 0 && chartTotalTrips === 0 && (
                <g pointerEvents="none">
                  <rect
                    x={svgWidth / 2 - 190}
                    y={paddingTop + innerHeight / 2 - 22}
                    width="380"
                    height="44"
                    rx="12"
                    fill={themeMode === 'dark' ? 'rgba(15, 23, 42, 0.90)' : 'rgba(241, 245, 249, 0.92)'}
                    stroke={themeMode === 'dark' ? 'rgba(51, 65, 85, 0.8)' : 'rgba(203, 213, 225, 0.9)'}
                    strokeWidth="1.5"
                  />
                  <text
                    x={svgWidth / 2}
                    y={paddingTop + innerHeight / 2 + 5}
                    textAnchor="middle"
                    fill={themeMode === 'dark' ? '#cbd5e1' : '#475569'}
                    fontSize="11"
                    fontWeight="600"
                  >
                    No rental activity matching date & amount filter criteria
                  </text>
                </g>
              )}

              {/* Hover Guideline & Highlight */}
              {hoveredPoint && (
                <g pointerEvents="none">
                  <line
                    x1={hoveredPoint.x}
                    y1={paddingTop}
                    x2={hoveredPoint.x}
                    y2={paddingTop + innerHeight}
                    stroke="#e2e8f0"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    strokeOpacity="0.8"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.yIncome}
                    r="6.5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.yCount}
                    r="5.5"
                    fill="#f97316"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>

            {/* Hover Tooltip Overlay with Dynamic Vertical & Horizontal Positioning */}
            {hoveredPoint && (() => {
              const minY = Math.min(hoveredPoint.yIncome, hoveredPoint.yCount);
              const maxY = Math.max(hoveredPoint.yIncome, hoveredPoint.yCount);
              // If data point is near the top of the chart (< 100px), flip tooltip to display BELOW the point
              const isNearTop = minY < 100;
              const isNearLeft = hoveredPoint.x < 130;
              const isNearRight = hoveredPoint.x > svgWidth - 130;

              const xTransform = isNearLeft ? 'translate-x-0' : isNearRight ? '-translate-x-full' : '-translate-x-1/2';
              const yTransform = isNearTop ? 'translate-y-3' : '-translate-y-full -mt-3';
              const targetY = isNearTop ? maxY : minY;

              return (
                <div
                  className={`absolute z-30 pointer-events-none p-3 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-md shadow-2xl text-xs space-y-1.5 transition-all duration-75 transform ${xTransform} ${yTransform}`}
                  style={{
                    left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                    top: `${(targetY / svgHeight) * 100}%`,
                    minWidth: '190px',
                  }}
                >
                  <p className="font-bold text-slate-200 border-b border-slate-700/80 pb-1 flex items-center justify-between gap-3">
                    <span className="text-white font-semibold">{hoveredPoint.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{hoveredPoint.date}</span>
                  </p>
                  <div className="flex items-center justify-between gap-3 text-emerald-400 font-mono font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
                      Daily Income:
                    </span>
                    <span>{formatCurrency(hoveredPoint.income, settings.currencySymbol, settings.currencyPosition)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-orange-400 font-mono font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500 inline-block shrink-0" />
                      Trip Count:
                    </span>
                    <span>{hoveredPoint.count} Completed</span>
                  </div>
                  {filterAmount !== '' && (
                    <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-700/60 flex items-center justify-between">
                      <span>Amount:</span>
                      <span className="text-emerald-400 font-semibold">{filterAmountCondition === 'above' ? '≥' : '≤'} {settings.currencySymbol || 'LK'} {filterAmount} ({filterAmountMode === 'daily' ? 'Daily' : 'Trip'})</span>
                    </div>
                  )}
                  {filterTripCount !== '' && (
                    <div className="text-[10px] text-slate-400 font-mono pt-0.5 flex items-center justify-between">
                      <span>Trip Count:</span>
                      <span className="text-amber-400 font-semibold">{filterTripCondition === 'above' ? '≥' : '≤'} {filterTripCount} Trips</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Status Distribution Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Available */}
          <div className={`p-3.5 rounded-xl ${t.cardSubtleBg} border-l-4 border-emerald-500 shadow-sm transition-colors`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>Available</span>
                <p className={`text-xl font-extrabold ${t.textHeading}`}>{statusCounts.available}</p>
              </div>
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
          </div>

          {/* Rented */}
          <div className={`p-3.5 rounded-xl ${t.cardSubtleBg} border-l-4 border-cyan-500 shadow-sm transition-colors`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>Active Rented</span>
                <p className={`text-xl font-extrabold ${t.textHeading}`}>{statusCounts.rented}</p>
              </div>
              <PlayCircle className="w-5 h-5 text-cyan-500" />
            </div>
          </div>

          {/* Maintenance */}
          <div className={`p-3.5 rounded-xl ${t.cardSubtleBg} border-l-4 border-amber-500 shadow-sm transition-colors`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>Maintenance</span>
                <p className={`text-xl font-extrabold ${t.textHeading}`}>{statusCounts.maintenance}</p>
              </div>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </div>

          {/* Reserved */}
          <div className={`p-3.5 rounded-xl ${t.cardSubtleBg} border-l-4 border-purple-500 shadow-sm transition-colors`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${t.textMuted}`}>Fleet Total</span>
                <p className={`text-xl font-extrabold ${t.textHeading}`}>{totalVehiclesCount}</p>
              </div>
              <Bike className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Today's Messaging Summary Widget */}
        <div className={`p-5 rounded-2xl border shadow-sm ${t.cardSubtleBg} ${t.divider}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white flex items-center justify-center shadow-md">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${t.textHeading}`}>Today's Messaging Summary</h3>
                <p className={`text-xs ${t.textMuted}`}>WhatsApp messages dispatched today</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30`}>
              {todayMsgStats.total} Total
            </span>
          </div>

          {todayMsgStats.total === 0 ? (
            <p className={`text-sm ${t.textMuted} text-center py-4`}>
              No messages dispatched yet today
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Sent */}
              <div className={`p-3 rounded-xl border-l-4 border-emerald-500 ${themeMode === 'dark' ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Send className="w-3.5 h-3.5 text-emerald-500" />
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${t.textMuted}`}>Sent</span>
                </div>
                <p className="text-2xl font-extrabold font-mono text-emerald-500">{todayMsgStats.sent}</p>
              </div>

              {/* Delivered */}
              <div className={`p-3 rounded-xl border-l-4 border-teal-500 ${themeMode === 'dark' ? 'bg-teal-500/10' : 'bg-teal-50'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${t.textMuted}`}>Delivered</span>
                </div>
                <p className="text-2xl font-extrabold font-mono text-teal-500">{todayMsgStats.delivered}</p>
              </div>

              {/* Failed */}
              <div className={`p-3 rounded-xl border-l-4 border-rose-500 ${themeMode === 'dark' ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${t.textMuted}`}>Failed</span>
                </div>
                <p className="text-2xl font-extrabold font-mono text-rose-500">{todayMsgStats.failed}</p>
              </div>

              {/* Pending / Queued */}
              <div className={`p-3 rounded-xl border-l-4 border-amber-500 ${themeMode === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${t.textMuted}`}>Pending</span>
                </div>
                <p className="text-2xl font-extrabold font-mono text-amber-500">{todayMsgStats.pending}</p>
              </div>

              {/* Birthday Wishes */}
              <div className={`p-3 rounded-xl border-l-4 border-pink-500 ${themeMode === 'dark' ? 'bg-pink-500/10' : 'bg-pink-50'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Cake className="w-3.5 h-3.5 text-pink-500" />
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${t.textMuted}`}>Birthdays</span>
                </div>
                <p className="text-2xl font-extrabold font-mono text-pink-500">{todayMsgStats.birthday}</p>
              </div>

              {/* Active Bulk Campaigns */}
              <div className={`p-3 rounded-xl border-l-4 border-violet-500 ${themeMode === 'dark' ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-violet-500" />
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${t.textMuted}`}>Campaigns</span>
                </div>
                <p className="text-2xl font-extrabold font-mono text-violet-500">{todayMsgStats.bulkCampaigns}</p>
              </div>
            </div>
          )}
        </div>

        {/* Pending Rentals Section */}
        <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} transition-colors`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-bold ${t.textHeading}`}>Currently Out on Rent</h3>
              <p className={`text-xs ${t.textMuted}`}>Live active timer status</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              totalActiveRentals > 0 ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : `${t.cardSubtleBg} ${t.textMuted}`
            }`}>
              {totalActiveRentals} Active
            </span>
          </div>

          {totalActiveRentals > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activeRentals.map((rental, index) => (
                <div
                  key={rental.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${t.divider} ${themeMode === 'dark' ? 'bg-slate-800/60' : 'bg-white/80'}`}
                >
                  <span className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center text-xs font-bold text-emerald-500 shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold truncate ${t.textHeading}`}>
                        {rental.vehicleSerialNumber}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${t.badge}`}>
                        {rental.vehicleTypeName}
                      </span>
                    </div>
                    <p className={`text-[11px] ${t.textMuted} truncate mt-0.5`}>
                      {rental.customerName || 'Walk-in Customer'}
                      {rental.cashierName ? ` · Cashier: ${rental.cashierName}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getElapsedTime(rental.startTime)}
                    </p>
                    <p className={`text-[10px] ${t.textMuted}`}>
                      #{rental.rentalNumber}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${t.textMuted} text-center py-6`}>
              No active rentals running at the moment
            </p>
          )}
        </div>

        {/* Today's Completed Rentals Section */}
        <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} transition-colors`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className={`text-sm font-bold ${t.textHeading}`}>Today's Completed Trips</h3>
              <p className={`text-xs ${t.textMuted}`}>Settled rental summary</p>
            </div>
            <span className={`text-xs font-bold ${t.textMain}`}>
              {completedTodayCount} trips
            </span>
          </div>

          {completedTodayCount > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {topRentals.map((rental, index) => (
                <div key={rental.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${t.divider} ${themeMode === 'dark' ? 'bg-slate-800/40' : 'bg-white/60'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${t.badge}`}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${t.textHeading}`}>
                      {rental.vehicleTypeName} — <span className="font-mono text-xs">{rental.vehicleSerialNumber}</span>
                    </p>
                    <p className={`text-[10px] ${t.textMuted} truncate`}>
                      {rental.customerName || 'Walk-in'}
                      {rental.cashierName ? ` · Cashier: ${rental.cashierName}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-mono font-bold text-emerald-500">
                    {formatCurrency(rental.totalAmount || 0, settings.currencySymbol, settings.currencyPosition)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${t.textMuted} text-center py-4`}>
              No completed rentals yet today
            </p>
          )}
        </div>

      </div>
    </div>
  );
};