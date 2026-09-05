import React, { useState, useMemo } from 'react';
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
  Cake
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

  // Build daily timeline dataset for Line Chart
  const chartData = useMemo(() => {
    const daysArray: {
      iso: string;
      label: string;
      income: number;
      count: number;
    }[] = [];

    const map = new Map<string, { income: number; count: number }>();

    // Aggregate completed rentals into day buckets
    todayCompletedRentals.forEach((r) => {
      const d = new Date(r.completedAt || r.endTime || r.startTime);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const existing = map.get(iso) || { income: 0, count: 0 };
      existing.income += (r.totalAmount || 0);
      existing.count += 1;
      map.set(iso, existing);
    });

    // Generate last N consecutive days
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const record = map.get(iso) || { income: 0, count: 0 };
      daysArray.push({
        iso,
        label,
        income: record.income,
        count: record.count,
      });
    }

    return daysArray;
  }, [todayCompletedRentals, chartDays]);

  // Aggregate stats for the selected chart timeframe
  const chartTotalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const chartTotalTrips = chartData.reduce((sum, d) => sum + d.count, 0);
  const chartAvgDailyIncome = chartTotalIncome / Math.max(1, chartDays);
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

          {/* User badge */}
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${t.cardSubtleBg}`}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className={t.textHeading}>{currentUser?.name || 'Admin'}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-500">
                ({currentUser?.role || 'admin'})
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Total Revenue Card */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} transition-colors`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
                Today's Revenue
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-mono font-bold text-emerald-500">
              {formatCurrency(totalTodayRevenue, settings.currencySymbol, settings.currencyPosition)}
            </p>
            <p className={`text-xs ${t.textMuted} mt-1`}>
              {completedTodayCount} {completedTodayCount === 1 ? 'trip completed' : 'trips completed today'}
            </p>
          </div>

          {/* Active Rentals Card */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} transition-colors`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                <PlayCircle className="w-4 h-4 text-cyan-500" />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
                Active Rentals
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-mono font-bold text-cyan-500">
              {totalActiveRentals}
            </p>
            <p className={`text-xs ${t.textMuted} mt-1`}>
              Vehicles currently running
            </p>
          </div>

          {/* Fleet Availability Card */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} transition-colors`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Layers className="w-4 h-4 text-blue-500" />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
                Available Fleet
              </span>
            </div>
            <p className={`text-2xl sm:text-3xl font-mono font-bold ${t.textHeading}`}>
              {availableVehiclesCount} <span className="text-sm font-normal text-slate-400">/ {totalVehiclesCount}</span>
            </p>
            <p className={`text-xs ${t.textMuted} mt-1`}>
              Ready for immediate rental
            </p>
          </div>

          {/* Average Trip Card */}
          <div className={`p-4 rounded-xl ${t.cardSubtleBg} border ${t.divider} transition-colors`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
                Daily Avg. Income
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-mono font-bold text-purple-400">
              {formatCurrency(chartAvgDailyIncome, settings.currencySymbol, settings.currencyPosition)}
            </p>
            <p className={`text-xs ${t.textMuted} mt-1`}>
              Over past {chartDays} days
            </p>
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
                <h3 className={`text-base font-bold ${t.textHeading}`}>
                  Daily Rental Income & Trip Count Trends
                </h3>
                <p className={`text-xs ${t.textMuted}`}>
                  Interactive line graph tracking daily income ({settings.currencySymbol}) and completed trip volume
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

              {/* Timeframe Pill Toggles */}
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
            </div>
          </div>

          {/* Chart Summary Stats Strip with Contrasting Badges */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap text-xs pt-1">
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
          </div>

          {/* SVG Line Chart Container */}
          <div className="relative w-full overflow-hidden pt-2">
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

              {/* Interactive Data Points & Hover Targets */}
              {points.map((p, idx) => (
                <g key={p.iso || idx}>
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

                  {/* X-Axis Date Label */}
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
              ))}

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

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                className="absolute z-20 pointer-events-none p-3 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-md shadow-2xl text-xs space-y-1.5 transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                  top: '40px',
                }}
              >
                <p className="font-bold text-slate-200 border-b border-slate-700 pb-1 flex items-center justify-between gap-3">
                  <span>{hoveredPoint.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{hoveredPoint.date}</span>
                </p>
                <div className="flex items-center justify-between gap-3 text-emerald-400 font-mono font-bold">
                  <span>🟢 Daily Income:</span>
                  <span>{formatCurrency(hoveredPoint.income, settings.currencySymbol, settings.currencyPosition)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-orange-400 font-mono font-bold">
                  <span>🟠 Trip Count:</span>
                  <span>{hoveredPoint.count} Completed</span>
                </div>
              </div>
            )}
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