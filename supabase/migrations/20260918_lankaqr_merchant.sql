-- ==============================================================================
-- LankaQR merchant configuration (single row)
-- Migration Date: 2026-09-18
-- Description: Stores the merchant details used by the lankaqr-generate Edge
--              Function when calling qr-worker /generate. Values are entered
--              manually in the table.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public."lankaqr_merchant_config" (
  "id" text PRIMARY KEY DEFAULT 'default',
  "merchant_id" text NOT NULL,
  "bank_code" text NOT NULL,
  "terminal_id" text NOT NULL,
  "merchant_name" text NOT NULL,
  "merchant_city" text NOT NULL,
  "mcc" text NOT NULL,
  "currency_code" text NOT NULL DEFAULT '144',
  "country_code" text NOT NULL DEFAULT 'LK',
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

-- Row Level Security: authenticated users may read; writes happen via service role
ALTER TABLE public."lankaqr_merchant_config" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lankaqr_merchant_config' AND policyname = 'Allow authenticated read of lankaqr_merchant_config') THEN
    CREATE POLICY "Allow authenticated read of lankaqr_merchant_config" ON public."lankaqr_merchant_config"
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
