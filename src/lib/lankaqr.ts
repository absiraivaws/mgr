import { getSupabase } from './supabase';

export type LankaQrPurpose = 'rental_deposit' | 'rental_final' | 'booking';

export type LankaQrPaymentStatus = 'pending' | 'paid' | 'failed' | 'expired';

export interface LankaQrPayment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: LankaQrPaymentStatus;
  purpose: LankaQrPurpose;
  record_id: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface CreateLankaQrPaymentParams {
  amount: number;
  purpose: LankaQrPurpose;
  recordId?: string;
  description?: string;
  createdBy?: string;
}

export interface CreateLankaQrPaymentResult {
  reference: string;
  qrBase64: string;
}

/**
 * Requests a LankaQR code for the given amount. QR generation happens in the
 * `lankaqr-generate` Edge Function so the merchant credentials stay server-side.
 */
export async function createLankaQrPayment(
  params: CreateLankaQrPaymentParams
): Promise<CreateLankaQrPaymentResult> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke('lankaqr-generate', {
    body: {
      amount: params.amount,
      purpose: params.purpose,
      recordId: params.recordId,
      description: params.description,
      createdBy: params.createdBy,
    },
  });

  if (error) {
    let detail = error.message;
    try {
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === 'function') {
        const parsed = await context.json();
        if (parsed?.error) detail = parsed.error;
      }
    } catch {
      // keep the original message
    }
    throw new Error(detail || 'Failed to generate LankaQR code.');
  }

  if (!data?.reference || !data?.qrBase64) {
    throw new Error('QR generation returned an incomplete response.');
  }

  return { reference: data.reference, qrBase64: data.qrBase64 };
}

/** Fetches the current state of a payment (used as a polling fallback). */
export async function getLankaQrPayment(reference: string): Promise<LankaQrPayment | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('lankaqr_payments')
    .select('*')
    .eq('reference', reference)
    .maybeSingle();

  if (error) {
    console.warn('[lankaqr] Failed to fetch payment status:', error.message);
    return null;
  }
  return (data as LankaQrPayment) || null;
}

/**
 * Subscribes to live updates for a single payment reference. Calls `onPaid`
 * once the payment row transitions to `paid`. Returns an unsubscribe function.
 */
export function subscribeLankaQrPayment(
  reference: string,
  onPaid: (payment: LankaQrPayment) => void
): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`lankaqr-payment-${reference}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'lankaqr_payments',
        filter: `reference=eq.${reference}`,
      },
      (payload) => {
        const updated = payload.new as LankaQrPayment;
        if (updated?.status === 'paid') {
          onPaid(updated);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
