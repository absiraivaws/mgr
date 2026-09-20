import { useEffect, useRef } from 'react';
import type { MGRUserPersona } from './auth';
import type { MGRTabType } from '../types/mgrBooking';
import type { NavTabType } from '../components/Navbar';
import type { PRHTabType } from '../types/prhTypes';

export type RolePersona = 'passenger' | 'owner' | 'admin';
export type SystemMode = 'bicycle_pos' | 'mgr_booking' | 'prh_rental' | 'user_role';
export type UserRoleBusinessTab = 'bicycle_pos' | 'mgr_transport' | 'prh_rental';

export const ROLE_PERSONAS: RolePersona[] = ['passenger', 'owner', 'admin'];

// MGR Transport Tab <-> Slug Mappings
export const MGR_TAB_TO_SLUG: Record<MGRTabType, string> = {
  'mgr-dashboard': 'dashboard',
  'mgr-search': 'search',
  'mgr-bookings': 'bookings',
  'mgr-history': 'history',
  'mgr-fleet': 'fleet',
  'mgr-customers': 'customers',
  'mgr-owners': 'owners',
  'mgr-settings': 'settings',
  'mgr-routes': 'routes',
  'mgr-requests': 'requests',
  'mgr-admin': 'marketplace',
};

export const SLUG_TO_MGR_TAB: Record<string, MGRTabType> = Object.keys(MGR_TAB_TO_SLUG).reduce(
  (acc, tab) => {
    acc[MGR_TAB_TO_SLUG[tab as MGRTabType]] = tab as MGRTabType;
    return acc;
  },
  {} as Record<string, MGRTabType>
);

export const DEFAULT_TAB_BY_PERSONA: Record<RolePersona, MGRTabType> = {
  passenger: 'mgr-search',
  owner: 'mgr-fleet',
  admin: 'mgr-dashboard',
};

const PASSENGER_TABS: MGRTabType[] = ['mgr-search', 'mgr-bookings', 'mgr-history'];
const OWNER_TABS: MGRTabType[] = ['mgr-fleet', 'mgr-bookings', 'mgr-history', 'mgr-owners', 'mgr-requests'];

// Bicycle POS Tab <-> Slug Mappings
export const BICYCLE_TAB_TO_SLUG: Record<NavTabType, string> = {
  rentals: 'rentals',
  history: 'history',
  users: 'message-templates',
  settings: 'settings',
  income: 'income',
  dashboard: 'dashboard',
  customers: 'customers',
  messages: 'messages',
  finance: 'finance',
};

export const SLUG_TO_BICYCLE_TAB: Record<string, NavTabType> = {
  'rentals': 'rentals',
  'rental-desk': 'rentals',
  'active': 'rentals',
  'history': 'history',
  'message-templates': 'users',
  'templates': 'users',
  'users': 'users',
  'settings': 'settings',
  'income': 'income',
  'dashboard': 'dashboard',
  'customers': 'customers',
  'messages': 'messages',
  'finance': 'finance',
};

// PRH Rental Hub Tab <-> Slug Mappings
export const PRH_TAB_TO_SLUG: Record<PRHTabType, string> = {
  'prh-dashboard': 'dashboard',
  'prh-new-rental': 'new-rental',
  'prh-active-rentals': 'active-rentals',
  'prh-returns': 'returns',
  'prh-customers': 'customers',
  'prh-equipment': 'equipment',
  'prh-inventory': 'inventory',
  'prh-reservations': 'reservations',
  'prh-payments': 'payments',
  'prh-finance': 'finance',
  'prh-maintenance': 'maintenance',
  'prh-reminders': 'reminders',
  'prh-reports': 'reports',
  'prh-settings': 'settings',
};

export const SLUG_TO_PRH_TAB: Record<string, PRHTabType> = {
  'dashboard': 'prh-dashboard',
  'new-rental': 'prh-new-rental',
  'active-rentals': 'prh-active-rentals',
  'returns': 'prh-returns',
  'customers': 'prh-customers',
  'equipment': 'prh-equipment',
  'inventory': 'prh-inventory',
  'reservations': 'prh-reservations',
  'payments': 'prh-payments',
  'finance': 'prh-finance',
  'maintenance': 'prh-maintenance',
  'reminders': 'prh-reminders',
  'reports': 'prh-reports',
  'settings': 'prh-settings',
};

// User Role Tab <-> Slug Mappings
export const USER_ROLE_TAB_TO_SLUG: Record<UserRoleBusinessTab, string> = {
  bicycle_pos: 'bicycle-pos',
  mgr_transport: 'mgr-transport',
  prh_rental: 'prh-rental',
};

export const SLUG_TO_USER_ROLE_TAB: Record<string, UserRoleBusinessTab> = {
  'bicycle-pos': 'bicycle_pos',
  'bicycle_pos': 'bicycle_pos',
  'bicycle': 'bicycle_pos',
  'mgr-transport': 'mgr_transport',
  'mgr_transport': 'mgr_transport',
  'mgr': 'mgr_transport',
  'transport': 'mgr_transport',
  'prh-rental': 'prh_rental',
  'prh_rental': 'prh_rental',
  'prh': 'prh_rental',
};

export function isRolePersona(value: string | null | undefined): value is RolePersona {
  return value === 'passenger' || value === 'owner' || value === 'admin';
}

export function isMGRPersona(persona: MGRUserPersona): persona is RolePersona {
  return persona === 'passenger' || persona === 'owner' || persona === 'admin';
}

export function sanitizeMGRTabForPersona(persona: MGRUserPersona, tab: MGRTabType): MGRTabType {
  if (persona === 'passenger') {
    return PASSENGER_TABS.includes(tab) ? tab : DEFAULT_TAB_BY_PERSONA.passenger;
  }
  if (persona === 'owner') {
    return OWNER_TABS.includes(tab) ? tab : DEFAULT_TAB_BY_PERSONA.owner;
  }
  return tab;
}

export interface ParsedAppRoute {
  systemMode: SystemMode | null;
  mgrPersona: RolePersona | null;
  mgrTab: MGRTabType | null;
  userRoleTab: UserRoleBusinessTab | null;
  bicycleTab: NavTabType | null;
  prhTab: PRHTabType | null;
  isRoot: boolean;
  isValid: boolean;
  rawPath: string;
}

export function parseAppRoute(pathname: string): ParsedAppRoute {
  const clean = (pathname || '/').split('?')[0].split('#')[0];
  const segments = clean.split('/').filter(Boolean);

  if (segments.length === 0) {
    return {
      systemMode: null,
      mgrPersona: null,
      mgrTab: null,
      userRoleTab: null,
      bicycleTab: null,
      prhTab: null,
      isRoot: true,
      isValid: true,
      rawPath: '/',
    };
  }

  const [first, second] = segments;

  // 1. User Role Module
  if (first === 'user-role' || first === 'user_role') {
    const userRoleTab = second ? SLUG_TO_USER_ROLE_TAB[second] || 'bicycle_pos' : 'bicycle_pos';
    return {
      systemMode: 'user_role',
      mgrPersona: null,
      mgrTab: null,
      userRoleTab,
      bicycleTab: null,
      prhTab: null,
      isRoot: false,
      isValid: true,
      rawPath: clean,
    };
  }

  // 2. PRH Rental Hub Module
  if (first === 'prh-rental' || first === 'prh_rental' || first === 'prh') {
    const prhTab = second ? SLUG_TO_PRH_TAB[second] || 'prh-dashboard' : 'prh-dashboard';
    return {
      systemMode: 'prh_rental',
      mgrPersona: null,
      mgrTab: null,
      userRoleTab: null,
      bicycleTab: null,
      prhTab,
      isRoot: false,
      isValid: true,
      rawPath: clean,
    };
  }

  // 3. Bicycle POS Module
  if (first === 'bicycle-pos' || first === 'bicycle_pos' || first === 'bicycle' || first === 'pos') {
    const bicycleTab = second ? SLUG_TO_BICYCLE_TAB[second] || 'rentals' : 'rentals';
    return {
      systemMode: 'bicycle_pos',
      mgrPersona: null,
      mgrTab: null,
      userRoleTab: null,
      bicycleTab,
      prhTab: null,
      isRoot: false,
      isValid: true,
      rawPath: clean,
    };
  }

  // 4. MGR Transport Marketplace (role routes: /passenger, /owner, /admin)
  if (isRolePersona(first)) {
    const mgrTab = second ? SLUG_TO_MGR_TAB[second] || null : null;
    return {
      systemMode: 'mgr_booking',
      mgrPersona: first,
      mgrTab,
      userRoleTab: null,
      bicycleTab: null,
      prhTab: null,
      isRoot: false,
      isValid: true,
      rawPath: clean,
    };
  }

  // Fallback alias for /mgr or /transport
  if (first === 'mgr' || first === 'transport') {
    const mgrTab = second ? SLUG_TO_MGR_TAB[second] || null : null;
    return {
      systemMode: 'mgr_booking',
      mgrPersona: 'admin',
      mgrTab,
      userRoleTab: null,
      bicycleTab: null,
      prhTab: null,
      isRoot: false,
      isValid: true,
      rawPath: clean,
    };
  }

  return {
    systemMode: null,
    mgrPersona: null,
    mgrTab: null,
    userRoleTab: null,
    bicycleTab: null,
    prhTab: null,
    isRoot: false,
    isValid: false,
    rawPath: clean,
  };
}

// Backwards-compatible parser for MGR Persona routes
export interface ParsedRolePath {
  persona: RolePersona | null;
  slug: string | null;
  tab: MGRTabType | null;
  isRoot: boolean;
  isValid: boolean;
}

export function parseRolePath(pathname: string): ParsedRolePath {
  const parsed = parseAppRoute(pathname);
  if (parsed.mgrPersona) {
    return {
      persona: parsed.mgrPersona,
      slug: parsed.mgrTab ? MGR_TAB_TO_SLUG[parsed.mgrTab] : null,
      tab: parsed.mgrTab,
      isRoot: false,
      isValid: parsed.isValid,
    };
  }
  return {
    persona: null,
    slug: null,
    tab: null,
    isRoot: parsed.isRoot,
    isValid: parsed.isValid,
  };
}

export function buildUserRolePath(tab?: UserRoleBusinessTab | null): string {
  if (!tab) return '/user-role/bicycle-pos';
  const slug = USER_ROLE_TAB_TO_SLUG[tab] || 'bicycle-pos';
  return `/user-role/${slug}`;
}

export function buildBicyclePath(tab?: NavTabType | null): string {
  if (!tab) return '/bicycle-pos/rentals';
  const slug = BICYCLE_TAB_TO_SLUG[tab] || tab;
  return `/bicycle-pos/${slug}`;
}

export function buildPRHPath(tab?: PRHTabType | null): string {
  if (!tab) return '/prh-rental/dashboard';
  const slug = PRH_TAB_TO_SLUG[tab] || 'dashboard';
  return `/prh-rental/${slug}`;
}

export function buildRolePath(persona: RolePersona, tab?: MGRTabType | null): string {
  const base = `/${persona}`;
  if (!tab) return base;
  const slug = MGR_TAB_TO_SLUG[tab];
  return slug ? `${base}/${slug}` : base;
}

export function navigate(path: string, options: { replace?: boolean } = {}): void {
  if (typeof window === 'undefined') return;
  const current = window.location.pathname + window.location.search;
  if (current === path) return;
  if (options.replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
}

export function useAppRouting(onRouteChange: (parsed: ParsedAppRoute) => void): void {
  const callbackRef = useRef(onRouteChange);

  useEffect(() => {
    callbackRef.current = onRouteChange;
  });

  useEffect(() => {
    const handlePopState = () => {
      callbackRef.current(parseAppRoute(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
}

export function useRoleRouting(onRouteChange: (parsed: ParsedRolePath) => void): void {
  const callbackRef = useRef(onRouteChange);

  useEffect(() => {
    callbackRef.current = onRouteChange;
  });

  useEffect(() => {
    const handlePopState = () => {
      callbackRef.current(parseRolePath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
}

