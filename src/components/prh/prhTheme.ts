// PRH Color Tokens and Theme Helpers
// Strict 4-color action palette: Primary (Blue), Secondary (Slate), Success (Emerald), Danger (Rose)
// Neutral surfaces and borders strictly separate Light and Dark modes without mixing colors.

export const prhTheme = {
  // Container & Card Surfaces
  card: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs',
  cardSubtle: 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800/80 rounded-xl',
  modal: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl rounded-2xl',
  modalBackdrop: 'fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4',

  // Typography
  heading: 'text-slate-900 dark:text-white font-bold',
  subheading: 'text-slate-700 dark:text-slate-200',
  body: 'text-slate-600 dark:text-slate-300',
  muted: 'text-slate-500 dark:text-slate-400 text-xs',
  mono: 'font-mono text-slate-900 dark:text-slate-100',

  // Borders & Dividers
  border: 'border-slate-200 dark:border-slate-800',
  borderLight: 'border-slate-100 dark:border-slate-800/60',

  // Form Controls
  input: 'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition',
  select: 'w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition',
  label: 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1',

  // Table Styling
  tableContainer: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs',
  tableHeader: 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800',
  tableHeaderCell: 'py-3 px-3.5 select-none',
  tableRow: 'hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border-b border-slate-100 dark:border-slate-800/60',
  tableCell: 'py-3 px-3.5 text-xs text-slate-700 dark:text-slate-300 break-words whitespace-normal',

  // 4 Main Action Colors
  btnPrimary: 'flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs',
  btnSecondary: 'flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer',
  btnSuccess: 'flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs',
  btnDanger: 'flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-xs',

  // Badges & Status Tags
  badgeNeutral: 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  badgePrimary: 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  badgeSuccess: 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  badgeDanger: 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};

export type SortDirection = 'asc' | 'desc' | null;

export function sortPRHData<T>(items: T[], key: string, direction: SortDirection): T[] {
  if (!direction || !key) return items;

  return [...items].sort((a: any, b: any) => {
    let valA = a[key];
    let valB = b[key];

    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    if (typeof valA === 'number' && typeof valB === 'number') {
      return direction === 'asc' ? valA - valB : valB - valA;
    }

    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();

    if (strA < strB) return direction === 'asc' ? -1 : 1;
    if (strA > strB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}
