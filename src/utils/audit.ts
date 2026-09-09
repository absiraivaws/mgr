/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditActionType, AuditLogEntry } from '../types';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_AUDIT_LOGS_KEY = 'v_rental_audit_logs';

export function getStoredAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_AUDIT_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredAuditLogs(logs: AuditLogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_AUDIT_LOGS_KEY, JSON.stringify(logs.slice(0, 500)));
  } catch (err) {
    console.error('Failed to save audit logs to localStorage:', err);
  }
}

export function recordAuditLog(params: {
  user: string;
  userEmail?: string;
  action: AuditActionType;
  reference: string;
  details?: string;
}): AuditLogEntry {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  
  let hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const timeStr = `${pad(hours)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`;

  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user: params.user || 'System',
    userEmail: params.userEmail,
    date: dateStr,
    time: timeStr,
    action: params.action,
    reference: params.reference || 'N/A',
    details: params.details,
    createdAt: Date.now(),
  };

  const existing = getStoredAuditLogs();
  const updated = [entry, ...existing];
  saveStoredAuditLogs(updated);

  // Sync to Supabase audit_logs table if configured
  if (isSupabaseConfigured()) {
    const supa = getSupabase();
    if (supa) {
      Promise.resolve(
        supa.from('audit_logs').insert({
          id: entry.id,
          user_name: entry.user,
          user_email: entry.userEmail || '',
          action: entry.action,
          reference: entry.reference,
          details: entry.details || '',
          created_at: entry.createdAt,
        })
      ).catch((err: any) => {
        console.warn('Failed to sync audit log to Supabase:', err);
      });
    }
  }

  return entry;
}
