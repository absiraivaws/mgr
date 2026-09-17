-- ==============================================================================
-- LankaQR / People's Bank payment tracking
-- Migration Date: 2026-09-17
-- Description: Stores QR payment intents and their confirmation callbacks so the
--              app can reconcile rental and transport booking payments.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public."lankaqr_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reference" text NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "currency" text NOT NULL DEFAULT 'LKR',
  "status" text NOT NULL DEFAULT 'pending',
  "purpose" text NOT NULL,
  "record_id" text,
  "description" text,
  "created_by" text,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "paid_at" timestamptz,
  "raw_callback" jsonb,
  CONSTRAINT lankaqr_payments_reference_key UNIQUE ("reference"),
  CONSTRAINT lankaqr_payments_status_check CHECK ("status" IN ('pending', 'paid', 'failed', 'expired')),
  CONSTRAINT lankaqr_payments_purpose_check CHECK ("purpose" IN ('rental_deposit', 'rental_final', 'booking'))
);

CREATE INDEX IF NOT EXISTS idx_lankaqr_payments_reference ON public."lankaqr_payments"("reference");
CREATE INDEX IF NOT EXISTS idx_lankaqr_payments_record ON public."lankaqr_payments"("record_id");
CREATE INDEX IF NOT EXISTS idx_lankaqr_payments_status ON public."lankaqr_payments"("status");

-- Enable Supabase Realtime for live payment confirmation in the SPA
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public."lankaqr_payments";
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Row Level Security: authenticated users may read, writes happen via service role
ALTER TABLE public."lankaqr_payments" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lankaqr_payments' AND policyname = 'Allow authenticated read of lankaqr_payments') THEN
    CREATE POLICY "Allow authenticated read of lankaqr_payments" ON public."lankaqr_payments"
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
