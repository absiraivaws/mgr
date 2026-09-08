-- ==============================================================================
-- Mannar Green Ride (MGR) — Transport Booking V2 Schema Migration
-- Migration Date: 2026-09-07
-- Description: Supports Hotel-Style Transport Booking with Owner Listing Types
-- (Type A: Vehicle Available Dates & Type B: Planned Trip Schedules)
-- ==============================================================================

-- 1. Listing Modes & Request Status Types
DO $$ BEGIN
  CREATE TYPE mgr_transport_listing_mode AS ENUM ('availability_only', 'planned_trip');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE mgr_transport_request_status AS ENUM (
    'pending_owner',
    'owner_rejected',
    'awaiting_payment',
    'confirmed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE mgr_transport_payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Owner Listings (Type A & Type B)
CREATE TABLE IF NOT EXISTS mgr_transport_listings (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  vehicle_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  owner_whatsapp TEXT NOT NULL,
  listing_mode mgr_transport_listing_mode NOT NULL DEFAULT 'availability_only',
  total_seats INTEGER NOT NULL DEFAULT 4,
  driver_option TEXT NOT NULL DEFAULT 'with_driver',
  photos TEXT[] DEFAULT '{}',
  
  -- Type A specifics
  available_dates DATE[] DEFAULT '{}',
  
  -- Type B specifics
  planned_trip_date DATE,
  planned_from TEXT,
  planned_to TEXT,
  departure_time TEXT,
  available_seats INTEGER,
  seat_fare NUMERIC(10, 2),
  
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast hotel-style search
CREATE INDEX IF NOT EXISTS idx_mgr_listings_mode ON mgr_transport_listings(listing_mode);
CREATE INDEX IF NOT EXISTS idx_mgr_listings_type ON mgr_transport_listings(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_mgr_listings_planned_date ON mgr_transport_listings(planned_trip_date);

-- 3. Booking Requests
CREATE TABLE IF NOT EXISTS mgr_transport_requests (
  id TEXT PRIMARY KEY,
  request_number TEXT UNIQUE NOT NULL,
  listing_id TEXT REFERENCES mgr_transport_listings(id) ON DELETE SET NULL,
  vehicle_id TEXT NOT NULL,
  vehicle_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  owner_whatsapp TEXT NOT NULL,
  
  passenger_name TEXT NOT NULL,
  passenger_phone TEXT NOT NULL,
  passenger_whatsapp TEXT NOT NULL,
  passenger_email TEXT,
  
  listing_mode mgr_transport_listing_mode NOT NULL,
  travel_date DATE NOT NULL,
  travel_time TEXT,
  route_from TEXT NOT NULL,
  route_to TEXT NOT NULL,
  seat_count INTEGER NOT NULL DEFAULT 1,
  special_notes TEXT,
  
  -- Financials
  owner_travel_charge NUMERIC(10, 2),
  convenience_fee NUMERIC(10, 2),
  convenience_fee_percentage NUMERIC(5, 2) DEFAULT 5.0,
  final_amount NUMERIC(10, 2),
  
  -- Lifecycle & Payment
  request_status mgr_transport_request_status NOT NULL DEFAULT 'pending_owner',
  payment_status mgr_transport_payment_status NOT NULL DEFAULT 'pending',
  payment_ref TEXT,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mgr_requests_status ON mgr_transport_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_mgr_requests_owner ON mgr_transport_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_mgr_requests_date ON mgr_transport_requests(travel_date);

-- 4. Notification Audit Events
CREATE TABLE IF NOT EXISTS mgr_transport_notifications (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  request_id TEXT REFERENCES mgr_transport_requests(id) ON DELETE CASCADE,
  request_number TEXT NOT NULL,
  recipient_role TEXT NOT NULL, -- 'passenger' | 'owner' | 'admin'
  recipient_name TEXT NOT NULL,
  recipient_contact TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'whatsapp' | 'email'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mgr_notifications_req ON mgr_transport_notifications(request_number);

-- 5. Row Level Security Policies
ALTER TABLE mgr_transport_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mgr_transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mgr_transport_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of active listings" ON mgr_transport_listings
  FOR SELECT USING (status = 'active');

CREATE POLICY "Allow authenticated owners to manage their listings" ON mgr_transport_listings
  FOR ALL USING (true);

CREATE POLICY "Allow public insert of requests" ON mgr_transport_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select and update of requests" ON mgr_transport_requests
  FOR ALL USING (true);

CREATE POLICY "Allow system notification logging" ON mgr_transport_notifications
  FOR ALL USING (true);
