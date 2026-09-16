import { useEffect, useRef } from 'react';
import type { MGRUserPersona } from './auth';
import type { MGRTabType } from '../types/mgrBooking';

export type RolePersona = 'passenger' | 'owner' | 'admin';

export const ROLE_PERSONAS: RolePersona[] = ['passenger', 'owner', 'admin'];

export const MGR_TAB_TO_SLUG: Record<MGRTabType, string> = {
  'mgr-dashboard': 'dashboard',
  'mgr-search': 'search',
  'mgr-bookings': 'bookings',
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

const PASSENGER_TABS: MGRTabType[] = ['mgr-search', 'mgr-bookings'];
const OWNER_TABS: MGRTabType[] = ['mgr-fleet', 'mgr-bookings', 'mgr-customers', 'mgr-owners', 'mgr-requests'];

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

export interface ParsedRolePath {
  persona: RolePersona | null;
  slug: string | null;
  tab: MGRTabType | null;
  isRoot: boolean;
  isValid: boolean;
}

export function parseRolePath(pathname: string): ParsedRolePath {
  const clean = (pathname || '/').split('?')[0].split('#')[0];
  const segments = clean.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { persona: null, slug: null, tab: null, isRoot: true, isValid: true };
  }

  const [first, second] = segments;
  if (!isRolePersona(first)) {
    return { persona: null, slug: null, tab: null, isRoot: false, isValid: false };
  }

  if (segments.length === 1) {
    return { persona: first, slug: null, tab: null, isRoot: false, isValid: true };
  }

  const tab = SLUG_TO_MGR_TAB[second];
  if (!tab) {
    return { persona: first, slug: second, tab: null, isRoot: false, isValid: false };
  }

  return { persona: first, slug: second, tab, isRoot: false, isValid: true };
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
