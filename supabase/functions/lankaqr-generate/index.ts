// Supabase Edge Function: lankaqr-generate
// Proxies LankaQR generation to the external qr-worker so the merchant API key
// and signing secret never reach the browser, and records a pending payment.
//
// Deploy: supabase functions deploy lankaqr-generate
// Secrets: QR_WORKER_URL, QR_API_KEY, QR_SIGNING_SECRET, LANKQR_CALLBACK_URL (optional)

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

// 16-char uppercase alphanumeric reference (LankaQR reference_no is varchar(16))
function generateReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return (ts + rand).slice(0, 16).padEnd(16, '0');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const qrWorkerUrl = Deno.env.get('QR_WORKER_URL');
    const qrApiKey = Deno.env.get('QR_API_KEY');
    const qrSigningSecret = Deno.env.get('QR_SIGNING_SECRET');

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json({ error: 'Supabase environment is not configured' }, 500);
    }
    if (!qrWorkerUrl || !qrApiKey || !qrSigningSecret) {
      return json({ error: 'LankaQR is not configured (QR_WORKER_URL / QR_API_KEY / QR_SIGNING_SECRET)' }, 500);
    }

    // verify_jwt enforces a valid session at the gateway; resolve the user for audit.
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const purpose = String(body?.purpose || '');
    const recordId = body?.recordId ? String(body.recordId) : null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: 'amount must be greater than 0' }, 400);
    }
    if (!['rental_deposit', 'rental_final', 'booking'].includes(purpose)) {
      return json({ error: 'invalid purpose' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load the single merchant configuration row (entered manually in Supabase).
    const { data: merchant, error: merchantError } = await admin
      .from('lankaqr_merchant_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (merchantError) {
      console.error('[lankaqr-generate] merchant lookup error:', merchantError.message);
      return json({ error: merchantError.message }, 500);
    }
    if (
      !merchant ||
      !merchant.merchant_id ||
      !merchant.bank_code ||
      !merchant.terminal_id ||
      !merchant.merchant_name ||
      !merchant.merchant_city ||
      !merchant.mcc
    ) {
      return json({ error: 'LankaQR merchant is not configured' }, 500);
    }

    const reference = generateReference();
    const callbackUrl =
      Deno.env.get('LANKQR_CALLBACK_URL') || `${supabaseUrl}/functions/v1/lankaqr-callback`;

    const qrRequestBody = JSON.stringify({
      amount: amount.toFixed(2),
      reference_number: reference,
      callback_url: callbackUrl,
      merchant_id: merchant.merchant_id,
      bank_code: merchant.bank_code,
      terminal_id: merchant.terminal_id,
      merchant_name: merchant.merchant_name,
      merchant_city: merchant.merchant_city,
      mcc: merchant.mcc,
      currency_code: merchant.currency_code || '144',
      country_code: merchant.country_code || 'LK',
    });

    const signature = await hmacHex(qrSigningSecret, qrRequestBody);
    const qrRes = await fetch(`${qrWorkerUrl.replace(/\/+$/, '')}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${qrApiKey}`,
        'x-signature': signature,
      },
      body: qrRequestBody,
    });

    const qrText = await qrRes.text();
    if (!qrRes.ok) {
      console.error('[lankaqr-generate] qr-worker error:', qrRes.status, qrText);
      return json({ error: 'QR generation failed', detail: qrText }, 502);
    }

    let qrData: { reference_number?: string; base64?: string; payload?: string };
    try {
      qrData = JSON.parse(qrText);
    } catch {
      return json({ error: 'Invalid QR response' }, 502);
    }

    const finalReference = qrData.reference_number || reference;
    const qrBase64 = qrData.base64 || null;
    if (!qrBase64) {
      return json({ error: 'QR image missing from response' }, 502);
    }

    const { error: insertError } = await admin.from('lankaqr_payments').insert({
      reference: finalReference,
      amount,
      purpose,
      record_id: recordId,
      description: body?.description ? String(body.description) : null,
      created_by: body?.createdBy ? String(body.createdBy) : (userData.user.email ?? null),
      status: 'pending',
    });

    if (insertError) {
      console.error('[lankaqr-generate] insert error:', insertError.message);
      return json({ error: insertError.message }, 500);
    }

    return json({ reference: finalReference, qrBase64 });
  } catch (err) {
    console.error('[lankaqr-generate] unexpected error:', err);
    return json({ error: (err as Error)?.message || 'Unexpected error' }, 500);
  }
});
