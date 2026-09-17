-- ==============================================================================
-- LankaQR references on rentals
-- Migration Date: 2026-09-19
-- Description: Stores the LankaQR payment references for rental deposits and
--              final settlements so payments can be reconciled against records.
-- ==============================================================================

ALTER TABLE public."rentals" ADD COLUMN IF NOT EXISTS "payment_ref" text;
ALTER TABLE public."rentals" ADD COLUMN IF NOT EXISTS "deposit_payment_ref" text;
