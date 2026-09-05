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
  full_name TEXT,
  phone TEXT,
  whatsapp_number TEXT,
  address TEXT,
  dob TEXT,
  notes TEXT,
  total_rentals_count INT DEFAULT 1,
  last_rental_date BIGINT,
  created_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure newly added columns exist if table was already created earlier
ALTER TABLE customers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dob TEXT;

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
  auto_logout_minutes INT DEFAULT 15,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS auto_logout_minutes INT DEFAULT 15;

-- Enable Row Level Security (RLS) & Public read/write access policies (for rental operations desk)
ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 6. INCOME & EXPENSES TABLE
CREATE TABLE IF NOT EXISTS income_expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,                       -- ISO date e.g. '2026-09-03'
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'Other',
  who TEXT DEFAULT 'Mark',                  -- Person responsible: Mark, Jenis, Beni
  cashier_name TEXT DEFAULT '',
  created_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE income_expenses ADD COLUMN IF NOT EXISTS who TEXT DEFAULT 'Mark';
ALTER TABLE income_expenses ENABLE ROW LEVEL SECURITY;

-- 7. USER ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS user_accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  password_hash TEXT,
  created_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. USER ROLES & PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'teal',
  is_system BOOLEAN DEFAULT FALSE,
  permissions JSONB NOT NULL,
  created_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. MESSAGE TEMPLATES TABLE (WhatsApp & Customer Communication)
CREATE TABLE IF NOT EXISTS message_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  created_at BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

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

  -- Income & Expenses policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income_expenses' AND policyname = 'Allow all income_expenses') THEN
    CREATE POLICY "Allow all income_expenses" ON income_expenses FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- User Accounts policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_accounts' AND policyname = 'Allow all user_accounts') THEN
    CREATE POLICY "Allow all user_accounts" ON user_accounts FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- User Roles policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'Allow all user_roles') THEN
    CREATE POLICY "Allow all user_roles" ON user_roles FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Message Templates policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'message_templates' AND policyname = 'Allow all message_templates') THEN
    CREATE POLICY "Allow all message_templates" ON message_templates FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Enable Realtime for all tables (run once in Supabase SQL editor)
-- ALTER PUBLICATION supabase_realtime ADD TABLE rentals;
-- ALTER PUBLICATION supabase_realtime ADD TABLE vehicles;
-- ALTER PUBLICATION supabase_realtime ADD TABLE income_expenses;
-- ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;

