-- ==========================================================
-- VEHICLE RENTAL SYSTEM SUPABASE SCHEMA
-- Copy and paste this script into your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==========================================================

-- 1. VEHICLE TYPES TABLE
CREATE TABLE IF NOT EXISTS vehicle_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'bicycle',
  description TEXT,
  color TEXT DEFAULT 'emerald',
  rates JSONB NOT NULL DEFAULT '{"firstHour": 5, "every30Min": 2.5}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. VEHICLES (FLEET INVENTORY) TABLE
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  serial_number TEXT UNIQUE NOT NULL,
  type_id TEXT NOT NULL REFERENCES vehicle_types(id) ON DELETE CASCADE,
  model_name TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance')),
  notes TEXT,
  last_rented_at BIGINT,
  total_rentals_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMERS DATABASE TABLE
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  nic_passport TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  total_rentals_count INT DEFAULT 1,
  last_rental_date BIGINT,
  created_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RENTALS (ACTIVE & COMPLETED) TABLE
CREATE TABLE IF NOT EXISTS rentals (
  id TEXT PRIMARY KEY,
  rental_number TEXT UNIQUE NOT NULL,
  vehicle_id TEXT NOT NULL,
  vehicle_serial_number TEXT NOT NULL,
  vehicle_type_id TEXT NOT NULL,
  vehicle_type_name TEXT NOT NULL,
  vehicle_icon TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_nic_passport TEXT,
  customer_notes TEXT,
  deposit_amount NUMERIC(10, 2) DEFAULT 0,
  start_time BIGINT NOT NULL,
  end_time BIGINT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  rate_snapshot JSONB NOT NULL,
  breakdown JSONB,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cashier_name TEXT NOT NULL,
  payment_method TEXT,
  amount_received NUMERIC(10, 2),
  change_amount NUMERIC(10, 2),
  completed_at BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_config',
  business_name TEXT NOT NULL DEFAULT 'City Bike & Scooter Rentals',
  business_phone TEXT DEFAULT '+94 77 123 4567',
  business_address TEXT DEFAULT '124 Beach Road, Galle',
  receipt_footer TEXT DEFAULT 'Thank you for riding safely with us!',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  currency_position TEXT NOT NULL DEFAULT 'prefix',
  cashier_name TEXT DEFAULT 'Counter Cashier',
  sound_enabled BOOLEAN DEFAULT TRUE,
  rental_number_prefix TEXT DEFAULT 'REN',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Public read/write access policies (for rental operations desk)
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated users to perform operations on tables
DO $$
BEGIN
  -- Vehicle Types policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_types' AND policyname = 'Allow all vehicle_types') THEN
    CREATE POLICY "Allow all vehicle_types" ON vehicle_types FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Vehicles policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'Allow all vehicles') THEN
    CREATE POLICY "Allow all vehicles" ON vehicles FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Customers policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow all customers') THEN
    CREATE POLICY "Allow all customers" ON customers FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Rentals policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rentals' AND policyname = 'Allow all rentals') THEN
    CREATE POLICY "Allow all rentals" ON rentals FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- App Settings policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow all app_settings') THEN
    CREATE POLICY "Allow all app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime for live cross-device sync
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE vehicle_types, vehicles, customers, rentals, app_settings;
COMMIT;
