-- ==========================================================
-- MANNAR GREEN RIDE (MGR) — TRANSPORT MARKETPLACE SCHEMA
-- Additional Module: Car, Van, Bus, Boat Transport & Booking
-- Safe to execute alongside existing bicycle rental tables.
-- ==========================================================

-- 1. TRANSPORT OWNERS TABLE
CREATE TABLE IF NOT EXISTS public.transport_owners (
    id TEXT PRIMARY KEY, -- e.g. OWN-MGR-00001
    full_name TEXT NOT NULL,
    nic_passport TEXT UNIQUE NOT NULL,
    address TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    email TEXT NOT NULL,
    business_name TEXT,
    business_reg_number TEXT,
    bank_account_details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'verified', 'rejected', 'suspended')),
    profile_photo TEXT,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    created_at BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TRANSPORT VEHICLES TABLE (Car, Van, Bus, Boat)
CREATE TABLE IF NOT EXISTS public.transport_vehicles (
    id TEXT PRIMARY KEY, -- e.g. MGR-CAR-00001, MGR-BOAT-00001
    owner_id TEXT NOT NULL REFERENCES public.transport_owners(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('car', 'van', 'bus', 'boat')),
    registration_number TEXT UNIQUE NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    fuel_type TEXT DEFAULT 'diesel',
    color TEXT NOT NULL,
    has_ac BOOLEAN DEFAULT TRUE,
    total_seats INTEGER NOT NULL,
    luggage_capacity TEXT,
    driver_option TEXT NOT NULL DEFAULT 'with_driver' CHECK (driver_option IN ('with_driver', 'without_driver', 'both')),
    description TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    insurance_expiry TEXT NOT NULL,
    revenue_licence_expiry TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended', 'maintenance')),
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    pricing_method TEXT NOT NULL DEFAULT 'fixed' CHECK (pricing_method IN ('fixed', 'per_km', 'per_hour', 'per_day', 'per_seat')),
    price_per_seat NUMERIC(10, 2),
    -- Boat Specific Details (stored as jsonb or null if road vehicle)
    boat_details JSONB,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    trips_count INTEGER DEFAULT 0,
    created_at BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. DRIVERS & BOAT CAPTAINS TABLE
CREATE TABLE IF NOT EXISTS public.transport_drivers (
    id TEXT PRIMARY KEY, -- e.g. DRV-MGR-00001
    owner_id TEXT NOT NULL REFERENCES public.transport_owners(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    nic TEXT NOT NULL,
    mobile TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    driver_type TEXT NOT NULL DEFAULT 'driver' CHECK (driver_type IN ('driver', 'captain')),
    licence_number TEXT NOT NULL,
    licence_class TEXT NOT NULL,
    licence_expiry TEXT NOT NULL,
    experience_years INTEGER DEFAULT 5,
    languages JSONB DEFAULT '["Tamil", "English"]'::jsonb,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('pending', 'under_review', 'verified', 'rejected', 'suspended')),
    assigned_vehicle_id TEXT REFERENCES public.transport_vehicles(id) ON DELETE SET NULL,
    photo_url TEXT,
    created_at BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TRANSPORT ROUTES MASTER TABLE
CREATE TABLE IF NOT EXISTS public.transport_routes (
    id TEXT PRIMARY KEY, -- e.g. ROUTE-001
    route_code TEXT UNIQUE NOT NULL,
    from_location TEXT NOT NULL,
    to_location TEXT NOT NULL,
    via_locations JSONB DEFAULT '[]'::jsonb,
    distance_km NUMERIC(6, 1),
    estimated_duration TEXT NOT NULL,
    pickup_points JSONB DEFAULT '[]'::jsonb,
    dropoff_points JSONB DEFAULT '[]'::jsonb,
    suggested_vehicle_types JSONB DEFAULT '["car", "van", "bus"]'::jsonb,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. SCHEDULED DEPARTURES TABLE
CREATE TABLE IF NOT EXISTS public.transport_schedules (
    id TEXT PRIMARY KEY, -- e.g. SCH-001
    vehicle_id TEXT NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
    route_id TEXT NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
    departure_time TEXT NOT NULL, -- HH:MM
    days_of_week JSONB NOT NULL DEFAULT '["Daily"]'::jsonb,
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    fare_per_seat NUMERIC(10, 2) NOT NULL,
    whole_vehicle_price NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'delayed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. TRANSPORT BOOKINGS TABLE (Whole Vehicle & Seat Reservations)
CREATE TABLE IF NOT EXISTS public.transport_bookings (
    id TEXT PRIMARY KEY,
    booking_number TEXT UNIQUE NOT NULL, -- e.g. MGR-BK-00101
    booking_type TEXT NOT NULL CHECK (booking_type IN ('whole_vehicle', 'seat')),
    vehicle_id TEXT NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE RESTRICT,
    vehicle_name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    vehicle_reg_number TEXT NOT NULL,
    route_id TEXT REFERENCES public.transport_routes(id) ON DELETE SET NULL,
    route_from TEXT NOT NULL,
    route_to TEXT NOT NULL,
    travel_date TEXT NOT NULL, -- YYYY-MM-DD
    travel_time TEXT NOT NULL, -- HH:MM
    passenger_name TEXT NOT NULL,
    passenger_phone TEXT NOT NULL,
    passenger_whatsapp TEXT NOT NULL,
    passenger_email TEXT,
    passenger_nic TEXT,
    driver_option TEXT NOT NULL DEFAULT 'with_driver',
    selected_seats JSONB DEFAULT '[]'::jsonb,
    seat_count INTEGER NOT NULL DEFAULT 1,
    total_amount NUMERIC(10, 2) NOT NULL,
    commission_rate NUMERIC(5, 2) DEFAULT 5.0,
    mgr_commission_amount NUMERIC(10, 2) DEFAULT 0,
    owner_payout_amount NUMERIC(10, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'owner_accepted', 'owner_rejected', 'awaiting_payment',
        'confirmed', 'driver_assigned', 'ready', 'trip_started', 'completed',
        'passenger_cancelled', 'owner_cancelled'
    )),
    driver_id TEXT REFERENCES public.transport_drivers(id) ON DELETE SET NULL,
    driver_name TEXT,
    special_notes TEXT,
    pickup_location TEXT,
    dropoff_location TEXT,
    created_at BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. PASSENGER VEHICLE REQUESTS & QUOTES TABLE
CREATE TABLE IF NOT EXISTS public.transport_requests (
    id TEXT PRIMARY KEY,
    request_number TEXT UNIQUE NOT NULL, -- e.g. REQ-MGR-001
    passenger_name TEXT NOT NULL,
    passenger_phone TEXT NOT NULL,
    passenger_whatsapp TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    from_location TEXT NOT NULL,
    to_location TEXT NOT NULL,
    travel_date TEXT NOT NULL,
    return_date TEXT,
    passengers_count INTEGER NOT NULL DEFAULT 1,
    expected_budget NUMERIC(10, 2),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'quoted', 'accepted', 'closed')),
    quotes_count INTEGER DEFAULT 0,
    created_at BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.transport_quotes (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES public.transport_requests(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES public.transport_owners(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    owner_whatsapp TEXT NOT NULL,
    vehicle_id TEXT NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
    vehicle_name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    quote_amount NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. MARKETPLACE SETTINGS
CREATE TABLE IF NOT EXISTS public.marketplace_settings (
    id TEXT PRIMARY KEY DEFAULT 'mgr_marketplace_config',
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.0,
    instant_booking_enabled BOOLEAN DEFAULT TRUE,
    allow_cash_on_board BOOLEAN DEFAULT TRUE,
    contact_whatsapp_number TEXT DEFAULT '+94 77 987 6543',
    support_email TEXT DEFAULT 'booking@mannargreenride.lk',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
