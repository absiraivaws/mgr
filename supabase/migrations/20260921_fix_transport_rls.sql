-- Fix Row Level Security (RLS) policies for MGR Transport Booking tables
-- Enables public read/write access matching vehicle_types, vehicles, customers, rentals, etc.

ALTER TABLE IF EXISTS public."marketplace_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."transport_owners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."transport_vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."transport_drivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."transport_routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."transport_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."transport_bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."transport_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."transport_quotes" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all transport_owners" ON public."transport_owners"
    FOR ALL TO public USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all transport_vehicles" ON public."transport_vehicles"
    FOR ALL TO public USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all transport_drivers" ON public."transport_drivers"
    FOR ALL TO public USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all transport_routes" ON public."transport_routes"
    FOR ALL TO public USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all transport_schedules" ON public."transport_schedules"
    FOR ALL TO public USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all transport_bookings" ON public."transport_bookings"
    FOR ALL TO public USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all marketplace_settings" ON public."marketplace_settings"
    FOR ALL TO public USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all transport_requests" ON public."transport_requests"
    FOR ALL TO public USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Allow all transport_quotes" ON public."transport_quotes"
    FOR ALL TO public USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
