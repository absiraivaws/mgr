import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Helper to normalize Supabase project URL in case the user pastes the Dashboard URL
export function normalizeSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  // If user pasted dashboard link like:
  // https://supabase.com/dashboard/project/pmowtdktjmejisggngsp
  // or https://supabase.com/dashboard/project/pmowtdktjmejisggngsp/settings/api-key
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  return url;
}

// Read from localStorage if configured via UI, otherwise fallback to configured project credentials
export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('v_supabase_url') : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('v_supabase_anon_key') : '';

  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  // Default to the provided Supabase project
  const defaultUrl = 'https://pmowtdktjmejisggngsp.supabase.co';
  const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtb3d0ZGt0am1lamlzZ2duZ3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0ODA1MjAsImV4cCI6MjEwNTA1NjUyMH0.Dat7Pae2QlORFll9tGhDrwjO1m-ACmK7OZW-1cqUAVs';

  const rawUrl = (localUrl || envUrl || defaultUrl).trim();
  const url = normalizeSupabaseUrl(rawUrl);
  const anonKey = (localKey || envKey || defaultKey).trim();

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(
    url &&
    anonKey &&
    url !== 'https://your-project.supabase.co' &&
    !url.includes('your-project') &&
    url.startsWith('https://')
  );
}

// Lazy client singleton
let clientInstance: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();
  if (!isSupabaseConfigured()) return null;

  if (!clientInstance || lastUrl !== url || lastKey !== anonKey) {
    lastUrl = url;
    lastKey = anonKey;
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return clientInstance;
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('v_supabase_url', url.trim());
    localStorage.setItem('v_supabase_anon_key', anonKey.trim());
  }
  clientInstance = null; // reset to force re-instantiation
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('v_supabase_url');
    localStorage.removeItem('v_supabase_anon_key');
  }
  clientInstance = null;
}

export type { User };

