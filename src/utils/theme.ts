export type ThemeMode = 'dark' | 'light';
export type AccentColor = 'emerald' | 'blue' | 'amber' | 'violet' | 'rose';

export interface ThemeConfig {
  mode: ThemeMode;
  accent: AccentColor;
}

const STORAGE_THEME_KEY = 'v_rental_theme_mode';
const STORAGE_ACCENT_KEY = 'v_rental_theme_accent';

export const ACCENT_COLORS: { id: AccentColor; name: string; hex: string; bgClass: string; textClass: string; borderClass: string }[] = [
  { id: 'emerald', name: 'Emerald POS', hex: '#10b981', bgClass: 'bg-emerald-600 hover:bg-emerald-500', textClass: 'text-emerald-500', borderClass: 'border-emerald-500' },
  { id: 'blue', name: 'Ocean Blue', hex: '#3b82f6', bgClass: 'bg-blue-600 hover:bg-blue-500', textClass: 'text-blue-500', borderClass: 'border-blue-500' },
  { id: 'violet', name: 'Royal Violet', hex: '#8b5cf6', bgClass: 'bg-violet-600 hover:bg-violet-500', textClass: 'text-violet-500', borderClass: 'border-violet-500' },
  { id: 'amber', name: 'Sun Amber', hex: '#f59e0b', bgClass: 'bg-amber-600 hover:bg-amber-500', textClass: 'text-amber-500', borderClass: 'border-amber-500' },
  { id: 'rose', name: 'Coral Rose', hex: '#f43f5e', bgClass: 'bg-rose-600 hover:bg-rose-500', textClass: 'text-rose-500', borderClass: 'border-rose-500' },
];

export function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'dark';
}

export const getSavedTheme = getStoredTheme;

export function saveStoredTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_THEME_KEY, mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  } catch {}
}

export const saveTheme = saveStoredTheme;

export function getStoredAccent(): AccentColor {
  try {
    const saved = localStorage.getItem(STORAGE_ACCENT_KEY) as AccentColor;
    if (ACCENT_COLORS.some(c => c.id === saved)) return saved;
  } catch {}
  return 'emerald';
}

export const getSavedAccent = getStoredAccent;

export function saveStoredAccent(accent: AccentColor): void {
  try {
    localStorage.setItem(STORAGE_ACCENT_KEY, accent);
  } catch {}
}

export const saveAccent = saveStoredAccent;

/**
 * Visual styling classes that adapt automatically to theme and global color accent
 */
export function getThemeClasses(mode: ThemeMode | string = 'dark', accent: AccentColor | string = 'emerald') {
  const isDark = mode !== 'light';
  const activeAccent: AccentColor = (['emerald', 'blue', 'amber', 'violet', 'rose'].includes(accent as string)
    ? accent
    : 'emerald') as AccentColor;

  // Accent mappings
  const accentBtn: string = {
    emerald: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-600/20 focus:ring-emerald-500',
    blue: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-blue-600/20 focus:ring-blue-500',
    violet: 'bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white shadow-violet-600/20 focus:ring-violet-500',
    amber: 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-600/20 focus:ring-amber-500',
    rose: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-rose-600/20 focus:ring-rose-500',
  }[activeAccent];

  const accentBadge: string = {
    emerald: isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-700 border-blue-200',
    violet: isDark ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-violet-50 text-violet-700 border-violet-200',
    amber: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200',
    rose: isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200',
  }[activeAccent];

  const accentActiveTab: string = {
    emerald: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 border-2 border-emerald-400 font-bold',
    blue: 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border-2 border-blue-400 font-bold',
    violet: 'bg-violet-600 text-white shadow-md shadow-violet-600/25 border-2 border-violet-400 font-bold',
    amber: 'bg-amber-600 text-white shadow-md shadow-amber-600/25 border-2 border-amber-400 font-bold',
    rose: 'bg-rose-600 text-white shadow-md shadow-rose-600/25 border-2 border-rose-400 font-bold',
  }[activeAccent];

  const accentFocusRing: string = {
    emerald: 'focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
    blue: 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    violet: 'focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
    amber: 'focus:ring-2 focus:ring-amber-500 focus:border-amber-500',
    rose: 'focus:ring-2 focus:ring-rose-500 focus:border-rose-500',
  }[activeAccent];

  return {
    // Canvas & Containers
    appBg: isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900',
    canvasBg: isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800',
    headerBg: isDark ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm',
    cardBg: isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm',
    cardSubtleBg: isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200',
    modalBg: isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-2xl',
    divider: isDark ? 'border-slate-800' : 'border-slate-200',
    border: isDark ? 'border-slate-700' : 'border-slate-200',
    textMuted: isDark ? 'text-slate-400' : 'text-slate-500',
    textMain: isDark ? 'text-slate-100' : 'text-slate-900',
    textHeading: isDark ? 'text-white' : 'text-slate-900',

    // 1. Dropdown Select Elements (Distinct Purple/Indigo tint + border)
    dropdownInput: isDark
      ? 'bg-indigo-950/50 border-2 border-indigo-500/60 text-indigo-100 hover:border-indigo-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40'
      : 'bg-indigo-50/90 border-2 border-indigo-300 text-indigo-950 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200',
    
    dropdownBadge: isDark
      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
      : 'bg-indigo-100 text-indigo-700 border border-indigo-200',

    // 2. Find / Search Bar Elements (Distinct Sky/Cyan tint + border)
    searchInput: isDark
      ? 'bg-cyan-950/50 border-2 border-cyan-500/60 text-cyan-100 placeholder:text-cyan-400/60 hover:border-cyan-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/40'
      : 'bg-cyan-50/90 border-2 border-cyan-300 text-cyan-950 placeholder:text-cyan-600/60 hover:border-cyan-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200',
    
    searchBadge: isDark
      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
      : 'bg-cyan-100 text-cyan-800 border border-cyan-200',

    // 3. User Key-in / Standard Textbox Input (Clean Slate + Accent glow)
    textInput: isDark
      ? `bg-slate-800/90 border-2 border-slate-700 text-white placeholder:text-slate-500 hover:border-slate-600 ${accentFocusRing} focus:outline-none`
      : `bg-white border-2 border-slate-300 text-slate-900 placeholder:text-slate-400 hover:border-slate-400 ${accentFocusRing} focus:outline-none`,

    // 4. Tabs: Non-Active tab has clear distinct separating border
    inactiveTab: isDark
      ? 'border-2 border-slate-700/80 bg-slate-800/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800 hover:text-white transition-all shadow-sm'
      : 'border-2 border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm',

    activeTab: accentActiveTab,
    primaryBtn: accentBtn,
    badge: accentBadge,
    focusRing: accentFocusRing,
  };
}
