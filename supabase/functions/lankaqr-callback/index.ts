// Supabase Edge Function: lankaqr-callback
// Receives the People's Bank payment confirmation forwarded by peoplesbank-api,
// verifies the HMAC x-signature, and marks the matching payment as paid.
//
// Deploy: supabase functions deploy lankaqr-callback
// Secrets: QR_SIGNING_SECRET

import { createClient } from 'npm:@supabase/supabase-js@2';

const jsonHeaders = { 'Content-Type': 'application/json' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Constant-time-ish comparison to avoid leaking the signature via timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const secret = Deno.env.get('QR_SIGNING_SECRET');
  if (!secret) {
    return json({ error: 'QR_SIGNING_SECRET is not configured' }, 500);
  }

  const raw = await req.text();
  const signature = req.headers.get('x-signature') || '';
  const expected = await hmacHex(secret, raw);

  if (!signature || !safeEqual(expected, signature)) {
    console.warn('[lankaqr-callback] invalid signature');
    return json({ error: 'Invalid signature' }, 401);
  }

  let payload: {
    reference?: string;
    amount?: number | string;
    status?: string;
    invoice_number?: string | null;
    [key: string]: unknown;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const reference = payload.reference ? String(payload.reference) : '';
  if (!reference) {
    return json({ error: 'reference is required' }, 400);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Supabase environment is not configured' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: row, error: lookupError } = await admin
    .from('lankaqr_payments')
    .select('*')
    .eq('reference', reference)
    .maybeSingle();

  if (lookupError) {
    console.error('[lankaqr-callback] lookup error:', lookupError.message);
    return json({ error: lookupError.message }, 500);
  }
  if (!row) {
    // Unknown reference: acknowledge so the sender does not retry forever.
    return json({ ok: true, ignored: 'unknown reference' });
  }
  if (row.status === 'paid') {
    return json({ ok: true, duplicate: true });
  }

  const status = String(payload.status || '').toUpperCase();
  if (status && status !== 'SUCCESS') {
    await admin
      .from('lankaqr_payments')
      .update({ status: 'failed', raw_callback: payload })
      .eq('reference', reference);
    return json({ ok: true, status: 'failed' });
  }

  const amount = Number(payload.amount);

  const { error: updateError } = await admin
    .from('lankaqr_payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      raw_callback: payload,
    })
    .eq('reference', reference);

  if (updateError) {
    console.error('[lankaqr-callback] payment update error:', updateError.message);
    return json({ error: updateError.message }, 500);
  }

  // Apply the confirmation to the source record.
  try {
    if (row.purpose === 'booking' && row.record_id) {
      await admin
        .from('mgr_transport_requests')
        .update({
          payment_status: 'paid',
          request_status: 'confirmed',
          payment_ref: reference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.record_id);
    } else if (row.record_id) {
      const patch: Record<string, unknown> = { payment_method: 'qr_transfer' };
      if (row.purpose === 'rental_final') {
        patch.payment_ref = reference;
        if (Number.isFinite(amount)) {
          patch.amount_received = amount;
        }
      } else if (row.purpose === 'rental_deposit') {
        patch.deposit_payment_ref = reference;
      }
      await admin.from('rentals').update(patch).eq('id', row.record_id);
    }
  } catch (err) {
    // The payment is already recorded; log but still acknowledge.
    console.error('[lankaqr-callback] record update failed:', err);
  }

  return json({ ok: true });
});
