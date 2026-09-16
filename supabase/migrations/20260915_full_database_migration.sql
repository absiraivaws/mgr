-- ==============================================================================
-- Full Database Migration & Replication Script
-- Source: szzhzpjfmyeulxjhbbov (Mannar Green Ride)
-- Destination: pmowtdktjmejisggngsp
-- Generated At: 2026-09-15T18:18:33.319Z
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enum Types
DO $$ BEGIN
  CREATE TYPE public.mgr_transport_listing_mode AS ENUM ('availability_only', 'planned_trip');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.mgr_transport_payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.mgr_transport_request_status AS ENUM ('pending_owner', 'owner_rejected', 'awaiting_payment', 'confirmed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Tables & Primary Keys
CREATE TABLE IF NOT EXISTS public."app_settings" (
  "id" text DEFAULT 'global_config'::text NOT NULL,
  "business_name" text DEFAULT 'City Bike & Scooter Rentals'::text NOT NULL,
  "business_phone" text DEFAULT '+94 77 123 4567'::text,
  "business_address" text DEFAULT '124 Beach Road, Galle'::text,
  "receipt_footer" text DEFAULT 'Thank you for riding safely with us!'::text,
  "currency_symbol" text DEFAULT '$'::text NOT NULL,
  "currency_position" text DEFAULT 'prefix'::text NOT NULL,
  "cashier_name" text DEFAULT 'Counter Cashier'::text,
  "sound_enabled" boolean DEFAULT true,
  "rental_number_prefix" text DEFAULT 'REN'::text,
  "updated_at" timestamp with time zone DEFAULT now(),
  "company_logo" text,
  "auto_logout_minutes" integer DEFAULT 15,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."vehicle_types" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "icon" text DEFAULT 'bicycle'::text NOT NULL,
  "description" text,
  "color" text DEFAULT 'emerald'::text,
  "rates" jsonb DEFAULT '{"firstHour": 5, "every30Min": 2.5}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."vehicles" (
  "id" text NOT NULL,
  "serial_number" text NOT NULL,
  "type_id" text NOT NULL,
  "model_name" text,
  "status" text DEFAULT 'available'::text NOT NULL,
  "notes" text,
  "last_rented_at" bigint,
  "total_rentals_count" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."customer_groups" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "color" text DEFAULT 'emerald'::text NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" bigint,
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."customers" (
  "id" text NOT NULL,
  "nic_passport" text NOT NULL,
  "name" text NOT NULL,
  "phone" text,
  "notes" text,
  "total_rentals_count" integer DEFAULT 1,
  "last_rental_date" bigint,
  "created_at" bigint,
  "updated_at" timestamp with time zone DEFAULT now(),
  "full_name" text,
  "whatsapp_number" text,
  "address" text,
  "dob" text,
  "status" text DEFAULT 'active'::text,
  "status_remark" text,
  "groups" jsonb DEFAULT '[]'::jsonb,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."user_roles" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "color" text DEFAULT 'teal'::text,
  "is_system" boolean DEFAULT false,
  "permissions" jsonb NOT NULL,
  "created_at" bigint,
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."user_accounts" (
  "id" text NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "role" text DEFAULT 'staff'::text NOT NULL,
  "created_at" bigint,
  "updated_at" timestamp with time zone DEFAULT now(),
  "must_change_password" boolean DEFAULT false,
  "auth_user_id" uuid,
  "status" text DEFAULT 'active'::text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."income_expenses" (
  "id" text NOT NULL,
  "date" text NOT NULL,
  "description" text NOT NULL,
  "type" text NOT NULL,
  "amount" numeric DEFAULT 0 NOT NULL,
  "category" text DEFAULT 'Other'::text,
  "cashier_name" text DEFAULT ''::text,
  "created_at" bigint,
  "updated_at" timestamp with time zone DEFAULT now(),
  "who" text DEFAULT 'Mark'::text,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."message_templates" (
  "id" text NOT NULL,
  "title" text NOT NULL,
  "category" text DEFAULT 'general'::text NOT NULL,
  "content" text NOT NULL,
  "created_at" bigint,
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."message_history" (
  "id" text NOT NULL,
  "customer_id" text,
  "customer_name" text NOT NULL,
  "mobile_number" text NOT NULL,
  "message_template_id" text,
  "template_title" text,
  "actual_message" text NOT NULL,
  "message_type" text NOT NULL,
  "sent_at" bigint NOT NULL,
  "sent_by" text NOT NULL,
  "campaign_name" text,
  "status" text DEFAULT 'sent'::text NOT NULL,
  "delivery_status" text,
  "failure_reason" text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."rentals" (
  "id" text NOT NULL,
  "rental_number" text NOT NULL,
  "vehicle_id" text NOT NULL,
  "vehicle_serial_number" text NOT NULL,
  "vehicle_type_id" text NOT NULL,
  "vehicle_type_name" text NOT NULL,
  "vehicle_icon" text NOT NULL,
  "customer_name" text,
  "customer_phone" text,
  "customer_nic_passport" text,
  "customer_notes" text,
  "deposit_amount" numeric DEFAULT 0,
  "start_time" bigint NOT NULL,
  "end_time" bigint,
  "status" text DEFAULT 'active'::text NOT NULL,
  "rate_snapshot" jsonb NOT NULL,
  "breakdown" jsonb,
  "total_amount" numeric DEFAULT 0 NOT NULL,
  "cashier_name" text NOT NULL,
  "payment_method" text,
  "amount_received" numeric,
  "change_amount" numeric,
  "completed_at" bigint,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."mgr_transport_listings" (
  "id" text NOT NULL,
  "vehicle_id" text NOT NULL,
  "vehicle_name" text NOT NULL,
  "vehicle_type" text NOT NULL,
  "registration_number" text NOT NULL,
  "owner_id" text NOT NULL,
  "owner_name" text NOT NULL,
  "owner_phone" text NOT NULL,
  "owner_whatsapp" text NOT NULL,
  "listing_mode" public.mgr_transport_listing_mode DEFAULT 'availability_only'::mgr_transport_listing_mode NOT NULL,
  "total_seats" integer DEFAULT 4 NOT NULL,
  "driver_option" text DEFAULT 'with_driver'::text NOT NULL,
  "photos" text[] DEFAULT '{}'::text[],
  "available_dates" date[] DEFAULT '{}'::date[],
  "planned_trip_date" date,
  "planned_from" text,
  "planned_to" text,
  "departure_time" text,
  "available_seats" integer,
  "seat_fare" numeric,
  "status" text DEFAULT 'active'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."mgr_transport_requests" (
  "id" text NOT NULL,
  "request_number" text NOT NULL,
  "listing_id" text,
  "vehicle_id" text NOT NULL,
  "vehicle_name" text NOT NULL,
  "vehicle_type" text NOT NULL,
  "registration_number" text NOT NULL,
  "owner_id" text NOT NULL,
  "owner_name" text NOT NULL,
  "owner_phone" text NOT NULL,
  "owner_whatsapp" text NOT NULL,
  "passenger_name" text NOT NULL,
  "passenger_phone" text NOT NULL,
  "passenger_whatsapp" text NOT NULL,
  "passenger_email" text,
  "listing_mode" public.mgr_transport_listing_mode NOT NULL,
  "travel_date" date NOT NULL,
  "travel_time" text,
  "route_from" text NOT NULL,
  "route_to" text NOT NULL,
  "seat_count" integer DEFAULT 1 NOT NULL,
  "special_notes" text,
  "owner_travel_charge" numeric,
  "convenience_fee" numeric,
  "convenience_fee_percentage" numeric DEFAULT 5.0,
  "final_amount" numeric,
  "request_status" public.mgr_transport_request_status DEFAULT 'pending_owner'::mgr_transport_request_status NOT NULL,
  "payment_status" public.mgr_transport_payment_status DEFAULT 'pending'::mgr_transport_payment_status NOT NULL,
  "payment_ref" text,
  "rejection_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."mgr_transport_notifications" (
  "id" text NOT NULL,
  "event_type" text NOT NULL,
  "request_id" text,
  "request_number" text NOT NULL,
  "recipient_role" text NOT NULL,
  "recipient_name" text NOT NULL,
  "recipient_contact" text NOT NULL,
  "channel" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "status" text DEFAULT 'sent'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."marketplace_settings" (
  "id" text DEFAULT 'mgr_marketplace_config'::text NOT NULL,
  "commission_percentage" numeric DEFAULT 5.0 NOT NULL,
  "instant_booking_enabled" boolean DEFAULT true,
  "allow_cash_on_board" boolean DEFAULT true,
  "contact_whatsapp_number" text DEFAULT '+94 77 987 6543'::text,
  "support_email" text DEFAULT 'booking@mannargreenride.lk'::text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."transport_owners" (
  "id" text NOT NULL,
  "full_name" text NOT NULL,
  "nic_passport" text NOT NULL,
  "address" text NOT NULL,
  "mobile_number" text NOT NULL,
  "whatsapp_number" text NOT NULL,
  "email" text NOT NULL,
  "business_name" text,
  "business_reg_number" text,
  "bank_account_details" text,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "profile_photo" text,
  "rating" numeric DEFAULT 5.0,
  "created_at" bigint NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."transport_vehicles" (
  "id" text NOT NULL,
  "owner_id" text NOT NULL,
  "type" text NOT NULL,
  "registration_number" text NOT NULL,
  "make" text NOT NULL,
  "model" text NOT NULL,
  "year" integer NOT NULL,
  "fuel_type" text DEFAULT 'diesel'::text,
  "color" text NOT NULL,
  "has_ac" boolean DEFAULT true,
  "total_seats" integer NOT NULL,
  "luggage_capacity" text,
  "driver_option" text DEFAULT 'with_driver'::text NOT NULL,
  "description" text,
  "photos" jsonb DEFAULT '[]'::jsonb,
  "insurance_expiry" text NOT NULL,
  "revenue_licence_expiry" text NOT NULL,
  "status" text DEFAULT 'active'::text NOT NULL,
  "base_price" numeric DEFAULT 0 NOT NULL,
  "pricing_method" text DEFAULT 'fixed'::text NOT NULL,
  "price_per_seat" numeric,
  "boat_details" jsonb,
  "rating" numeric DEFAULT 5.0,
  "trips_count" integer DEFAULT 0,
  "created_at" bigint NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."transport_drivers" (
  "id" text NOT NULL,
  "owner_id" text NOT NULL,
  "full_name" text NOT NULL,
  "nic" text NOT NULL,
  "mobile" text NOT NULL,
  "whatsapp" text NOT NULL,
  "email" text,
  "address" text NOT NULL,
  "driver_type" text DEFAULT 'driver'::text NOT NULL,
  "licence_number" text NOT NULL,
  "licence_class" text NOT NULL,
  "licence_expiry" text NOT NULL,
  "experience_years" integer DEFAULT 5,
  "languages" jsonb DEFAULT '["Tamil", "English"]'::jsonb,
  "rating" numeric DEFAULT 5.0,
  "status" text DEFAULT 'verified'::text NOT NULL,
  "assigned_vehicle_id" text,
  "photo_url" text,
  "created_at" bigint NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."transport_routes" (
  "id" text NOT NULL,
  "route_code" text NOT NULL,
  "from_location" text NOT NULL,
  "to_location" text NOT NULL,
  "via_locations" jsonb DEFAULT '[]'::jsonb,
  "distance_km" numeric,
  "estimated_duration" text NOT NULL,
  "pickup_points" jsonb DEFAULT '[]'::jsonb,
  "dropoff_points" jsonb DEFAULT '[]'::jsonb,
  "suggested_vehicle_types" jsonb DEFAULT '["car", "van", "bus"]'::jsonb,
  "base_price" numeric DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'active'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."transport_schedules" (
  "id" text NOT NULL,
  "vehicle_id" text NOT NULL,
  "route_id" text NOT NULL,
  "departure_time" text NOT NULL,
  "days_of_week" jsonb DEFAULT '["Daily"]'::jsonb NOT NULL,
  "total_seats" integer NOT NULL,
  "available_seats" integer NOT NULL,
  "fare_per_seat" numeric NOT NULL,
  "whole_vehicle_price" numeric,
  "status" text DEFAULT 'active'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."transport_bookings" (
  "id" text NOT NULL,
  "booking_number" text NOT NULL,
  "booking_type" text NOT NULL,
  "vehicle_id" text NOT NULL,
  "vehicle_name" text NOT NULL,
  "vehicle_type" text NOT NULL,
  "vehicle_reg_number" text NOT NULL,
  "route_id" text,
  "route_from" text NOT NULL,
  "route_to" text NOT NULL,
  "travel_date" text NOT NULL,
  "travel_time" text NOT NULL,
  "passenger_name" text NOT NULL,
  "passenger_phone" text NOT NULL,
  "passenger_whatsapp" text NOT NULL,
  "passenger_email" text,
  "passenger_nic" text,
  "driver_option" text DEFAULT 'with_driver'::text NOT NULL,
  "selected_seats" jsonb DEFAULT '[]'::jsonb,
  "seat_count" integer DEFAULT 1 NOT NULL,
  "total_amount" numeric NOT NULL,
  "commission_rate" numeric DEFAULT 5.0,
  "mgr_commission_amount" numeric DEFAULT 0,
  "owner_payout_amount" numeric DEFAULT 0,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "driver_id" text,
  "driver_name" text,
  "special_notes" text,
  "pickup_location" text,
  "dropoff_location" text,
  "created_at" bigint NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."transport_requests" (
  "id" text NOT NULL,
  "request_number" text NOT NULL,
  "passenger_name" text NOT NULL,
  "passenger_phone" text NOT NULL,
  "passenger_whatsapp" text NOT NULL,
  "vehicle_type" text NOT NULL,
  "from_location" text NOT NULL,
  "to_location" text NOT NULL,
  "travel_date" text NOT NULL,
  "return_date" text,
  "passengers_count" integer DEFAULT 1 NOT NULL,
  "expected_budget" numeric,
  "notes" text,
  "status" text DEFAULT 'open'::text NOT NULL,
  "quotes_count" integer DEFAULT 0,
  "created_at" bigint NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public."transport_quotes" (
  "id" text NOT NULL,
  "request_id" text NOT NULL,
  "owner_id" text NOT NULL,
  "owner_name" text NOT NULL,
  "owner_whatsapp" text NOT NULL,
  "vehicle_id" text NOT NULL,
  "vehicle_name" text NOT NULL,
  "vehicle_type" text NOT NULL,
  "quote_amount" numeric NOT NULL,
  "notes" text,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "created_at" bigint NOT NULL,
  "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

-- 4. Unique Constraints
DO $$ BEGIN
  ALTER TABLE public."customers" ADD CONSTRAINT "customers_nic_passport_key" UNIQUE ("nic_passport");
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."vehicles" ADD CONSTRAINT "vehicles_serial_number_key" UNIQUE ("serial_number");
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."rentals" ADD CONSTRAINT "rentals_rental_number_key" UNIQUE ("rental_number");
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."user_accounts" ADD CONSTRAINT "user_accounts_email_key" UNIQUE ("email");
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_owners" ADD CONSTRAINT "transport_owners_nic_passport_key" UNIQUE ("nic_passport");
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_vehicles" ADD CONSTRAINT "transport_vehicles_registration_number_key" UNIQUE ("registration_number");
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_routes" ADD CONSTRAINT "transport_routes_route_code_key" UNIQUE ("route_code");
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_bookings" ADD CONSTRAINT "transport_bookings_booking_number_key" UNIQUE ("booking_number");
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_requests" ADD CONSTRAINT "transport_requests_request_number_key" UNIQUE ("request_number");
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."mgr_transport_requests" ADD CONSTRAINT "mgr_transport_requests_request_number_key" UNIQUE ("request_number");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5. Foreign Key References
DO $$ BEGIN
  ALTER TABLE public."transport_vehicles" ADD CONSTRAINT "transport_vehicles_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES public."transport_owners"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_drivers" ADD CONSTRAINT "transport_drivers_assigned_vehicle_id_fkey"
    FOREIGN KEY ("assigned_vehicle_id") REFERENCES public."transport_vehicles"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_drivers" ADD CONSTRAINT "transport_drivers_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES public."transport_owners"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_schedules" ADD CONSTRAINT "transport_schedules_route_id_fkey"
    FOREIGN KEY ("route_id") REFERENCES public."transport_routes"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_schedules" ADD CONSTRAINT "transport_schedules_vehicle_id_fkey"
    FOREIGN KEY ("vehicle_id") REFERENCES public."transport_vehicles"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_bookings" ADD CONSTRAINT "transport_bookings_driver_id_fkey"
    FOREIGN KEY ("driver_id") REFERENCES public."transport_drivers"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_bookings" ADD CONSTRAINT "transport_bookings_route_id_fkey"
    FOREIGN KEY ("route_id") REFERENCES public."transport_routes"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_bookings" ADD CONSTRAINT "transport_bookings_vehicle_id_fkey"
    FOREIGN KEY ("vehicle_id") REFERENCES public."transport_vehicles"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_quotes" ADD CONSTRAINT "transport_quotes_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES public."transport_owners"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_quotes" ADD CONSTRAINT "transport_quotes_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES public."transport_requests"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."transport_quotes" ADD CONSTRAINT "transport_quotes_vehicle_id_fkey"
    FOREIGN KEY ("vehicle_id") REFERENCES public."transport_vehicles"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."mgr_transport_requests" ADD CONSTRAINT "mgr_transport_requests_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES public."mgr_transport_listings"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."mgr_transport_notifications" ADD CONSTRAINT "mgr_transport_notifications_request_id_fkey"
    FOREIGN KEY ("request_id") REFERENCES public."mgr_transport_requests"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE public."vehicles" ADD CONSTRAINT "vehicles_type_id_fkey"
    FOREIGN KEY ("type_id") REFERENCES public."vehicle_types"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 6. Enable Supabase Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public."vehicle_types", public."vehicles", public."customers", public."rentals", public."app_settings";
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 7. Row Level Security (RLS) & Policies
ALTER TABLE public."app_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."vehicle_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customer_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."income_expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."message_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."message_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."rentals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."mgr_transport_listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."mgr_transport_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."mgr_transport_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."marketplace_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transport_owners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transport_vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transport_drivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transport_routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transport_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transport_bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transport_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."transport_quotes" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Allow all vehicle_types" ON public."vehicle_types"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all vehicles" ON public."vehicles"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all customers" ON public."customers"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all message_templates" ON public."message_templates"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all customer_groups" ON public."customer_groups"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all message_history" ON public."message_history"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all user_roles" ON public."user_roles"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all user_accounts" ON public."user_accounts"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all rentals" ON public."rentals"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all app_settings" ON public."app_settings"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Allow all income_expenses" ON public."income_expenses"
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 8. Data Duplication / Inserts
-- Table: app_settings (1 rows)
INSERT INTO public."app_settings" ("id", "business_name", "business_phone", "business_address", "receipt_footer", "currency_symbol", "currency_position", "cashier_name", "sound_enabled", "rental_number_prefix", "updated_at", "company_logo", "auto_logout_minutes") VALUES ('global_config', 'Mannar Green Ride', '+94776574418', 'MM-10, Mannar UC New building, Madawachiya Road, Mannar', 'Thanks fo ryou to use our services', 'LK', 'prefix', 'Absiraiva', TRUE, 'REN', '2026-09-01 23:03:04.310604+05:30', NULL, 5) ON CONFLICT DO NOTHING;

-- Table: vehicle_types (3 rows)
INSERT INTO public."vehicle_types" ("id", "name", "icon", "description", "color", "rates", "created_at", "updated_at") VALUES ('type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Girls City bikes & cruisers', 'rose', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicle_types" ("id", "name", "icon", "description", "color", "rates", "created_at", "updated_at") VALUES ('type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Boys City bikes & cruisers', 'emerald', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicle_types" ("id", "name", "icon", "description", "color", "rates", "created_at", "updated_at") VALUES ('type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Scooters - 48CC', 'indigo', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '2026-09-01 22:51:43.806356+05:30', '2026-09-01 22:51:43.806356+05:30') ON CONFLICT DO NOTHING;

-- Table: vehicles (12 rows)
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-b04', '01-0004', 'type-bicycle-boys', 'Boys Cycle', 'available', NULL, 1789221930932, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-m02', '03-002', 'type-motorcycle', 'Suzuki', 'available', NULL, 1789476097166, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-b03', '01-0003', 'type-bicycle-boys', 'Boys Cycle', 'available', NULL, 1789478839736, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-b05', '01-0005', 'type-bicycle-boys', 'Boys Cycle', 'available', NULL, 1789481878621, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-g05', '02-0005', 'type-bicycle-girls', 'Girls Cycle', 'available', NULL, 1789481919716, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-g03', '02-0003', 'type-bicycle-girls', 'Girls Cycle', 'available', NULL, 1789481928718, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-g02', '02-0002', 'type-bicycle-girls', 'Girls Cycle', 'available', NULL, 1789481939070, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-m01', '03-001', 'type-motorcycle', 'Suzuki', 'available', NULL, 1788631620145, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-b01', '01-0001', 'type-bicycle-boys', 'Boys Cycle', 'available', NULL, 1789488981831, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-b02', '01-0002', 'type-bicycle-boys', 'Boys Cycle', 'available', NULL, 1789389400956, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-g01', '02-0001', 'type-bicycle-girls', 'Girls Cycle', 'available', NULL, 1789461163252, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."vehicles" ("id", "serial_number", "type_id", "model_name", "status", "notes", "last_rented_at", "total_rentals_count", "created_at", "updated_at") VALUES ('veh-g04', '02-0004', 'type-bicycle-girls', 'Girls Cycle', 'available', NULL, 1789474821522, 0, '2026-09-01 23:03:04.310604+05:30', '2026-09-01 23:03:04.310604+05:30') ON CONFLICT DO NOTHING;

-- Table: customers (86 rows)
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788504463253', '198400505175', 'Abul Asan Anvar', '779718662', NULL, 3, 1789406087344, 1789406087345, '2026-09-04 12:17:44.546551+05:30', 'Abul Asan Anvar', '779718662', 'Kadaleriroad, Periyakadai, Mannar', '1984-01-05', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788499872707', '196704902273', 'Thampirasa Raveenthiran', '0771223399', NULL, 1, 1788499872707, 1788499872708, '2026-09-04 11:01:14.242766+05:30', 'Thampirasa Raveenthiran', '0771223399', 'Murukankovil , Pesalai - 07, Mannar', '1967-02-18', 'active', NULL, '["Regular Customer"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788834345293', '200724303411', 'L.liboshian', '0718552007', NULL, 1, 1788834429837, 1788834429838, '2026-09-08 07:55:47.292586+05:30', 'L.liboshian', '0718552007', 'Pallimunai,Mannar', '2007-08-30', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587259806', '791634148V', 'Sellathurai Johnson', '0761267664', NULL, 1, NULL, 1788587259806, '2026-09-05 11:17:39.075187+05:30', 'Sellathurai Johnson', '0761267664', 'Alavakkai,Murunkan', '1979-06-11', 'active', NULL, '["Other"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788950654699', '0702499180', 'Faris Travels', '0702499180', 'Tours and Travels', 0, NULL, 1788950654699, '2026-09-09 16:14:15.85299+05:30', 'Faris Travels', '0702499180', 'Adampan,Mannar', '', 'active', NULL, '["Other"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788502539354', '791234697V', 'Kosmas Niththiyarajan', '0761910513', NULL, 1, NULL, 1788502539356, '2026-09-04 11:45:40.741576+05:30', 'Kosmas Niththiyarajan', '0761910513', 'Poonga street ,thalvupaadu', '1979-05-02', 'active', NULL, '["Other"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788502854186', '200114500640', 'Velalakan Vinith', '0765679757', NULL, 1, NULL, 1788502854186, '2026-09-04 11:50:55.502484+05:30', 'Velalakan Vinith', '0765679757', 'Jaffna', '2001-05-24', 'active', NULL, '["Regular Customer"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788631739488', '9155', 'merlin', '0772837620', NULL, 3, 1789488848658, 1789488848658, '2026-09-05 23:39:00.366085+05:30', 'merlin', '0772837620', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587425127', '841473710V', 'S.Anes Mohamed', '0772518945', NULL, 1, NULL, 1788587425127, '2026-09-05 11:20:24.40603+05:30', 'S.Anes Mohamed', '0772518945', 'Pallimunai Rd,Uppukkulam South,Mannar', '1984-05-26', 'active', NULL, '["New Customer"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788583798595', '200510102920', 'Daniyal Lithursan', '0760601555', NULL, 3, 1789405914759, 1789405914760, '2026-09-05 10:19:58.552469+05:30', 'Daniyal Lithursan', '0766581342', 'Neekkielar Road, Paddithottam, mannar', '2005-04-10', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789473657207', '200829503189', 'Thavaseelan', '0769317767', NULL, 1, 1789473657207, 1789473657208, '2026-09-15 17:30:58.827771+05:30', 'Thavaseelan', '0769317767', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587473828', '842381509V', 'Sivakurunathan Sivakumar', '0770400351', NULL, 1, NULL, 1788587473828, '2026-09-05 11:21:13.335993+05:30', 'Sivakurunathan Sivakumar', '0770400351', 'Revangreak thoddam,Ruwanpura', '1984-08-25', 'active', NULL, '["New Customer"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788506322228', '196936400695', 'Rasenthiram lawrance sritharan', '0779092199', NULL, 1, NULL, 1788506322228, '2026-09-04 12:48:43.912367+05:30', 'Rasenthiram lawrance sritharan', '0779092199', 'Sumethagama,trincomalee', '1969-12-29', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587541728', '902153055V', 'Karunaananthan Vino', '0770481289', NULL, 1, NULL, 1788587541728, '2026-09-05 11:22:21.76099+05:30', 'Karunaananthan Vino', '0770481289', 'Jeevanagar,Murunkan', '1990-08-02', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789460722600', '653623330 V', 'Customer', '0764505741', NULL, 1, 1789460722600, 1789460722600, '2026-09-15 13:55:24.700927+05:30', 'Customer', '0764505741', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788493041125', '200507400965', 'Jude Andru  Julindran', '0743636112', NULL, 1, 1788493041125, 1788493041126, '2026-09-04 09:07:23.111815+05:30', 'Jude Andru  Julindran', '0743636112', 'St.Mary''s Road, Jaffna', '2005-03-14', 'active', NULL, '["Other"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788586936719', '197412002204', 'A.W.Mohamed Iyas', '0775076006', NULL, 1, NULL, 1788586936719, '2026-09-05 11:12:16.585446+05:30', 'A.W.Mohamed Iyas', '0775076006', 'Uppukkulam,Mannar', '1974-04-29', 'active', NULL, '["Customer Directory & Identity Records"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587628349', '198812810011', 'Ravi Ragusanthan', '0774252855', NULL, 3, 1789463147538, 1789463147538, '2026-09-05 11:23:47.875688+05:30', 'Ravi Ragusanthan', '0774252855', 'Santhipuram,Mannar', '1988-05-07', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587765486', '197003307737', 'Muthukumarasamy Kamalaruban', '0768125555', NULL, 1, NULL, 1788587765486, '2026-09-05 11:26:05.286018+05:30', 'Muthukumarasamy Kamalaruban', '0768125555', 'Mannar Rd ,31 m kadai Mulankavil', '1970-02-02', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788504751880', '782363549V', 'Porkanuthin Ramsan', '0758566330', NULL, 1, NULL, 1788504751880, '2026-09-04 12:22:33.589019+05:30', 'Porkanuthin Ramsan', '0758566330', 'Periyakarisal, Pesalai', '1918-08-23', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587693599', '197304103130', 'P.Meiyqtheen Pkeer', '0778779315', NULL, 2, 1789405963665, 1789405963665, '2026-09-05 11:24:53.454561+05:30', 'P.Meiyqtheen Pkeer', '0778779315', 'Thurukki City Tharapuram Mannar', '1973-02-10', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788503036276', '720600145V', 'Samsuthin Nalim', '0761704849', NULL, 1, NULL, 1788503036276, '2026-09-04 11:53:57.579997+05:30', 'Samsuthin Nalim', '0761704849', 'Ward No.01, Erukkalampitty, Mannar', '1972-02-29', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788503247720', '197814104786', 'Alberd Jesuthasan', '0704095979', NULL, 1, NULL, 1788503247720, '2026-09-04 11:57:29.435961+05:30', 'Alberd Jesuthasan', '0704095979', 'Emilnagar, Mannar', '1978-05-20', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788498190480', '198705104719', 'Mohamed Jalees', '0705831396', NULL, 1, NULL, 1788498190481, '2026-09-04 10:33:12.211951+05:30', 'Mohamed Jalees', '0705831396', 'Keshmeernagar, Uppukulam, Mannar', '1987-02-20', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788506827950', '197816900686', 'Fuard Mohamed Lareef', '0767776668', NULL, 2, 1788544997718, 1788544997718, '2026-09-04 12:57:09.512677+05:30', 'Fuard Mohamed Lareef', '0767776668', 'Kashmeer Street, Uppukulam, Mannar', '1978-06-17', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788586809360', '19901584621', 'ABC', '0776003874', NULL, 1, NULL, 1788586809360, '2026-09-05 11:10:08.832603+05:30', 'ABC', '0776003874', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788586853018', '199810810265', 'ABC', '0709147369', NULL, 1, NULL, 1788586853018, '2026-09-05 11:10:52.742209+05:30', 'ABC', '0709147369', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788497680510', '200613301277', 'Mohamed Ahsan', '', NULL, 1, NULL, 1788497680510, '2026-09-04 10:24:41.979065+05:30', 'Mohamed Ahsan', '', 'Chilawathurai, Mannar', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788581793699', '200027510072', 'Yogarasa Nanthujan', '0741503965', NULL, 1, 1788581793699, 1788581793700, '2026-09-05 09:46:33.968618+05:30', 'Yogarasa Nanthujan', '0741503965', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587093919', '926684450V', 'ABC', '0767932327', NULL, 1, NULL, 1788587093919, '2026-09-05 11:14:53.198275+05:30', 'ABC', '0767932327', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788584436182', '200134910021', 'Piremaratnam Arunkumar', '', NULL, 1, NULL, 1788584436184, '2026-09-05 10:30:36.517181+05:30', 'Piremaratnam Arunkumar', '', 'Sumethagama, Trincomalee', '2001-12-14', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788584844783', '199914203060', 'Rappiyal Rakshan', '0741660183', NULL, 1, NULL, 1788584844783, '2026-09-05 10:37:24.37875+05:30', 'Rappiyal Rakshan', '0741660183', 'Panangattu Kottu, East, Mannar', '1999-05-21', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587043244', '199727410180', 'ABC', '0704141741', NULL, 1, NULL, 1788587043244, '2026-09-05 11:14:02.939325+05:30', 'ABC', '0704141741', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587372278', '201031609483', 'ABC', '0743209799', NULL, 1, NULL, 1788587372278, '2026-09-05 11:19:32.080791+05:30', 'ABC', '0743209799', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587849941', '200724005493', 'ABC', '0702689050', NULL, 1, NULL, 1788587849941, '2026-09-05 11:27:29.610646+05:30', 'ABC', '0702689050', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587586161', '590022624V', 'ABC', '0779225682', NULL, 1, NULL, 1788587586161, '2026-09-05 11:23:05.321328+05:30', 'ABC', '0779225682', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788498510961', '961630150V', 'Iramakirushnan Mahinthan', '0768316659', NULL, 1, NULL, 1788498510962, '2026-09-04 10:38:32.589304+05:30', 'Iramakirushnan Mahinthan', '0768316659', 'Anthoniyaarpuram, Iuppakadavai, Mannar', '1996-06-11', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788503748554', '771793894V', 'Muththukumarasaami Mogan', '0762566085', NULL, 1, NULL, 1788503748554, '2026-09-04 12:05:50.663511+05:30', 'Muththukumarasaami Mogan', '0762566085', 'Hospitel street,mulangavil', '1977-06-27', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788504172957', '530474623V', 'Muhamed Ashraw', '0740333892', NULL, 1, NULL, 1788504172957, '2026-09-04 12:12:55.122585+05:30', 'Muhamed Ashraw', '0740333892', 'Uppukulam, Mannar', '1953-02-16', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788503964663', '690144646V', 'Irathinam Murukananthan', '0778794170', NULL, 1, NULL, 1788503964663, '2026-09-04 12:09:26.005667+05:30', 'Irathinam Murukananthan', '0778794170', 'Paththinaathapuram', '1969-01-14', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788597618742', '2007', 'Tharson', '0770792882', NULL, 0, NULL, 1788597618742, '2026-09-05 14:10:19.668145+05:30', 'Tharson', '0770792882', 'Vaddakandal, Uyilankulam', '2022-09-05', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788505099790', '198632600140', 'Mohamed Cassim Mohamed Haris', '0752526629', NULL, 1, NULL, 1788505099790, '2026-09-04 12:28:21.755159+05:30', 'Mohamed Cassim Mohamed Haris', '0752526629', 'Thakva  Mosque Road, New Kattankudy', '1986-11-21', 'active', NULL, '["New Customer"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788946090617', '808000', 'Asanka', '0777246137', NULL, 1, 1788946132881, 1788946132881, '2026-09-09 14:58:11.62286+05:30', 'Asanka', '0777246137', 'Dehiwala', '2025-09-09', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788584674622', '933132161V', 'John Laasaras Leenas Sanjeevan', '0768824564', NULL, 1, NULL, 1788584674622, '2026-09-05 10:34:34.591332+05:30', 'John Laasaras Leenas Sanjeevan', '0768824564', 'Panangattu Kottu, mannar', '1993-11-08', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789110323679', '948570335V', 'Dr. Nadeesha', '+94718920597', NULL, 6, 1789387854526, 1789387854526, '2026-09-11 12:35:25.615935+05:30', 'Dr. Nadeesha', '+94718920597', 'General Hospital, MANNAR', '', 'active', NULL, '["Fitness Member"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788948920846', '199716100042', 'Balan kavitaj', '0743198016', NULL, 1, 1788949012300, 1788949012301, '2026-09-09 15:45:23.620032+05:30', 'Balan kavitaj', '0743198016', '', '1998-06-09', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788505348983', '931404350V', 'Siththiravelu Nijanthan', '0760827049', NULL, 1, NULL, 1788506026411, '2026-09-04 12:32:30.847813+05:30', 'Siththiravelu Nijanthan', '0760827049', 'Moor Street, Mannar', '1993-05-19', 'active', NULL, '["New Customer","Regular Customer"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788949459574', '196781702243', 'Jasintha Lambert sivakumar', '0768110658', NULL, 1, 1788949483953, 1788949483953, '2026-09-09 15:54:21.627861+05:30', 'Jasintha Lambert sivakumar', '0768110658', 'Ward no 7,Vankalai,Mannar', '1967-11-12', 'active', NULL, '["New Customer"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788626193857', '0779464382', 'Hotel Aathi', '0779464382', 'Hotels', 0, NULL, 1788626193857, '2026-09-05 22:06:35.179728+05:30', 'Hotel Aathi', '0779464382', 'Thalvupadu Rd,Mannar', '', 'active', NULL, '["Hotel Guest"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788597541875', '34876872', 'K L Mark', '0778833511', NULL, 1, 1788785685078, 1788785685078, '2026-09-05 14:09:02.640159+05:30', 'K L Mark', '0778833511', 'Panankottukotu, Mannar', '2021-09-05', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788838053394', '0715815873', 'Hotel Thalaimannar pier', '0715815873', 'Hotels', 0, NULL, 1788838053395, '2026-09-08 08:57:35.607976+05:30', 'Hotel Thalaimannar pier', '0715815873', 'Thalaimannar pier,Thalaimannar', '', 'active', NULL, '["Hotel Guest"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788761371521', '198615304014', 'Thampiraja Mahindran', '0761928848', NULL, 2, 1788846022065, 1788846022066, '2026-09-07 11:39:32.865771+05:30', 'Thampiraja Mahindran', '0761928848', '', '1986-08-01', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788631157593', '0766596959', 'Hotel Adams bridge kitesurf', '0766596959', 'Hotels', 0, NULL, 1788631157593, '2026-09-05 23:29:18.933507+05:30', 'Hotel Adams bridge kitesurf', '0766596959', 'Urmanai, Thalaimannar', '', 'active', NULL, '["Hotel Guest"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788858219990', '200219100207', 'Ambikaibalan Karunan', '0711235899', NULL, 2, 1788862037850, 1788862037851, '2026-09-08 14:33:43.672776+05:30', 'Ambikaibalan Karunan', '0717235899', '87 Uppukkulam, Mannar', '2002-08-09', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788630374068', '0771703580', 'Hotel Adams palm resort', '0771703580', 'Hotels', 0, NULL, 1788630374068, '2026-09-05 23:16:14.996059+05:30', 'Hotel Adams palm resort', '0771703580', 'Thalaimannar Rd,Thalaimannar', '', 'active', NULL, '["Hotel Guest"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788624466735', '0770375234', 'Hotel Ahape', '0770375234', 'Hotels', 0, NULL, 1788624466735, '2026-09-05 21:37:58.462947+05:30', 'Hotel Ahape', '0770375234', 'Minor Seminary Road,Mannar', '', 'active', NULL, '["Hotel Guest"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788624589499', '0765653233', 'Hotel Ahash', '0765653233', 'Hotels', 0, NULL, 1788624589499, '2026-09-05 21:39:50.846949+05:30', 'Hotel Ahash', '0765653233', 'Thalvupadu Rd,Mannar', '', 'active', NULL, '["Hotel Guest"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788626849744', '0755500030', 'Hotel beach view Pesalai', '0755500030', 'Hotels', 0, NULL, 1788626849744, '2026-09-05 22:17:30.893264+05:30', 'Hotel beach view Pesalai', '0755500030', 'Thalaimannar Rd,Pesalai', '', 'active', NULL, '["Hotel Guest"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788619494887', '915122728V', 'J Juliet Perera', '0778742398', NULL, 0, NULL, 1788619494887, '2026-09-05 20:14:56.420036+05:30', 'J Juliet Perera', '0778742398', 'Pallimunai,Mannar', '1991-01-12', 'active', NULL, '["Other"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788515617539', '891640862V', 'A.Jenis Croos', '0770692088', NULL, 16, 1789402231261, 1789402231262, '2026-09-04 15:23:38.39085+05:30', 'A.Jenis Croos', '0770692088', 'Pesalai Mannar', '1989-06-12', 'active', NULL, '["Other"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587915164', '970984160V', 'Srivarthana Robert', '0740386107', NULL, 1, NULL, 1788587915164, '2026-09-05 11:28:34.58763+05:30', 'Srivarthana Robert', '0740386107', 'Puthukkiramam Naruvilikkulam.Nanattan', '1997-04-07', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788624813330', '0777723534', 'Palmerah Hotel', '0777723534', 'Hotels', 0, NULL, 1788624813330, '2026-09-05 21:43:36.218185+05:30', 'Palmerah Hotel', '0777723534', 'Thalaimannar Rd,Mannar', '', 'active', NULL, '["Hotel Guest"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788586774478', '200122802570', 'Abdul Raspil Mohamed Sahir', '0743520139', NULL, 1, NULL, 1788586774479, '2026-09-05 11:09:34.835092+05:30', 'Abdul Raspil Mohamed Sahir', '0743520139', 'Thalaimannar pier, Thalaimannar', '2001-08-15', 'active', NULL, '["Other"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788582306229', '198415901046', 'Sukkoor Mohamedraishan', '0779718662', NULL, 1, NULL, 1788582306233, '2026-09-05 09:55:05.969531+05:30', 'Sukkoor Mohamedraishan', '0779718662', 'Puthiyasalampaikulam, Vavuniya', '1984-06-07', 'active', NULL, '["Regular Customer"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788862150953', '941223303V', 'Vijaraja Antony thanuyan', '0752110338', NULL, 3, 1788862331003, 1788862331003, '2026-09-08 15:39:12.414727+05:30', 'Vijaraja Antony thanuyan', '0752110338', 'Velankanni street ,Pallimunai west,Mannar', '1995-05-01', 'active', NULL, '["New Customer","Regular Customer"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789108299322', '198220004431', 'Kanthasamy rajakumar', '0764570561', 'Helmet', 1, 1789108493892, 1789108493892, '2026-09-11 12:01:40.759592+05:30', 'Kanthasamy rajakumar', '0764570561', 'Ellupiddy thirukethiswaram,Mannar', '1982-07-12', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789033418542', '2009', 'Saheer Atheef', '0761985622', NULL, 1, 1789033451285, 1789033451285, '2026-09-10 15:13:39.556836+05:30', 'Saheer Atheef', '0761985622', 'Periya Karisal, Pesalai, Mannar', '2009-12-21', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788854920147', '653623330V', 'Sanththakuru seviyar liyon', '0764505741', NULL, 2, 1789103746778, 1789103746779, '2026-09-08 13:38:42.164371+05:30', 'Sanththakuru seviyar liyon', '07645045741', '', '1965-12-27', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789107523750', '198816102461', 'Santhiyohu thilipanbmiranda', '0774020839', NULL, 1, 1789107553806, 1789107553806, '2026-09-11 11:48:46.834337+05:30', 'Santhiyohu thilipanbmiranda', '0774020839', '', '1989-06-09', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789109165382', '803263442V', 'S.Reagan Thuram', '0775882288', NULL, 0, NULL, 1789109165382, '2026-09-11 12:16:06.787931+05:30', 'S.Reagan Thuram', '0775882288', 'Thalvupadu, Mannar', '1980-09-11', 'active', NULL, '["VIP"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789217379478', '941180841V', 'Dr.Nishan', '0710878015', NULL, 2, 1789217437384, 1789217437384, '2026-09-12 18:19:41.285813+05:30', 'Dr.Nishan', '0710878015', 'General Hospital, Mannar', '1994-04-27', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789199724392', '200209900088', 'S ROCH KISON RAJ', '', NULL, 1, 1789199759795, 1789199759795, '2026-09-12 13:25:26.390719+05:30', 'S ROCH KISON RAJ', '', 'Pallimunai mannar', '2002-04-08', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789200504661', '200515904733', 'Sivanathan venujan', '0743797788', NULL, 1, 1789200534610, 1789200534610, '2026-09-12 13:38:26.947645+05:30', 'Sivanathan venujan', '0743797788', '', '2006-06-07', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788597356245', '198802900037', 'A. Benigius Siraiva', '0773606494', NULL, 10, 1788948417049, 1788948417049, '2026-09-05 14:05:57.238072+05:30', 'A. Benigius Siraiva', '0773606494', 'Pesalai.03, Mannar', '1988-09-05', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789217596062', '1994', 'Dr.Ms Chamikka', '0770577023', NULL, 2, 1789474942320, 1789474942320, '2026-09-12 18:23:17.131984+05:30', 'Dr.Ms Chamikka', '0770577023', 'General Hospital, Mannar', '2026-09-11', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789197141155', '200527604071', 'Arokkiyanathan Kithyon', '0757949167', NULL, 1, 1789197169466, 1789197169467, '2026-09-12 12:42:23.641715+05:30', 'Arokkiyanathan Kithyon', '0757949167', '', '2005-10-02', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788630808840', '0743733747', 'Hotel sanctum Accommodation', '0743733747', 'Hotels', 0, NULL, 1788630808840, '2026-09-05 23:23:30.200309+05:30', 'Hotel sanctum Accommodation', '0743733747', 'Beach Road, Thalaimannar', '', 'active', NULL, '["Hotel Guest"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789213079967', '198726304215', 'PASINDHU  MANAHARA SAMARAWEERA', '0715817081', NULL, 5, 1789213355100, 1789213355100, '2026-09-12 17:08:02.042219+05:30', 'PASINDHU  MANAHARA SAMARAWEERA', '0715817081', 'WERAGAPITTA MATARA', '1987-09-19', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789444628348', '917202948', 'Dr.GGAN MAPITIYA', '', NULL, 0, NULL, 1789444628349, '2026-09-15 09:27:09.985838+05:30', 'Dr.GGAN MAPITIYA', '', 'Mapitiya paththampitiya
GH-MANNAR', '1991-08-07', 'active', NULL, '["Fitness Member"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587225054', '940171644V', 'Dammikka', '0772649528', 'Army', 3, 1789463027643, 1789463027644, '2026-09-05 11:17:04.350243+05:30', 'Dammikka', '0772649528', 'Army camp,Thallady', '1994-01-17', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789467116488', '892054282 V', 'Pushparasa Rajkumar', '0778650726', NULL, 1, 1789467116488, 1789467116489, '2026-09-15 15:41:58.883041+05:30', 'Pushparasa Rajkumar', '0778650726', '', '', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788506575661', '200518501612', 'Nixon Beno Sharun', '0766581342', NULL, 3, 1788594445232, 1788594445233, '2026-09-04 12:52:57.019189+05:30', 'Nixon Beno Sharun', '0766581342', 'Emilnagar, Mannar', '2005-07-03', 'active', NULL, '["Regular Customer"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1788587182452', '921461321V', 'Dr.Amry', '0779337374', NULL, 2, 1788869810740, 1788869810742, '2026-09-05 11:16:21.823359+05:30', 'Dr.Amry', '0779337374', 'General Hospital, Mannar', '1992-05-25', 'active', NULL, '["Fitness Member"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789471526369', '963210531V', 'Dr.Janith Harsha Athapaththu', '0713319284', NULL, 2, 1789472331291, 1789472331292, '2026-09-15 16:55:27.920546+05:30', 'Dr.Janith Harsha Athapaththu', '0713319284', 'General Hospital, Mannar', '1996-11-16', 'active', NULL, '[]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789217690515', '1992', 'Dr.Ms Shandy', '+94713659139', NULL, 0, NULL, 1789217690515, '2026-09-12 18:24:51.897943+05:30', 'Dr.Ms Shandy', '+94713659139', 'General Hospital, Mannar', '1992-06-10', 'active', NULL, '["Fitness Member"]'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public."customers" ("id", "nic_passport", "name", "phone", "notes", "total_rentals_count", "last_rental_date", "created_at", "updated_at", "full_name", "whatsapp_number", "address", "dob", "status", "status_remark", "groups") VALUES ('cust-1789474781066', '941250321V', 'Dr.Chammi', '0770577023', NULL, 2, 1789475122205, 1789475122205, '2026-09-15 17:49:42.360176+05:30', 'Dr.Chammi', '0770577023', 'General Hospital, Mannar', '1994-08-12', 'active', NULL, '["Fitness Member"]'::jsonb) ON CONFLICT DO NOTHING;

-- Table: user_roles (5 rows)
INSERT INTO public."user_roles" ("id", "name", "description", "color", "is_system", "permissions", "created_at", "updated_at") VALUES ('admin', 'Administrator', 'Full unrestricted access across all primary tabs, pricing rates, and user administration.', 'emerald', TRUE, '{"canRent":true,"canSettle":true,"canViewPL":true,"accessUsers":true,"accessIncome":true,"canEditFleet":true,"accessFinance":true,"accessHistory":true,"accessRentals":true,"accessMessages":true,"accessSettings":true,"canEditPricing":true,"canManageRoles":true,"canManageUsers":true,"accessCustomers":true,"accessDashboard":true,"canExportReports":true,"canViewStatement":true,"canExportFinanceReports":true,"canAddFinanceTransaction":true,"canEditFinanceTransaction":true,"canDeleteFinanceTransaction":true}'::jsonb, NULL, '2026-09-03 12:59:07.713249+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."user_roles" ("id", "name", "description", "color", "is_system", "permissions", "created_at", "updated_at") VALUES ('cashier', 'Cashier POS', 'Operates the live rental counter, starts rental timers, checks in returned vehicles, and issues receipts.', 'purple', TRUE, '{"canRent":true,"canSettle":true,"canViewPL":false,"accessUsers":false,"accessIncome":false,"canEditFleet":false,"accessFinance":false,"accessHistory":false,"accessRentals":true,"accessMessages":false,"accessSettings":false,"canEditPricing":false,"canManageRoles":false,"canManageUsers":false,"accessCustomers":true,"accessDashboard":false,"canExportReports":false,"canViewStatement":false,"canExportFinanceReports":false,"canAddFinanceTransaction":false,"canEditFinanceTransaction":false,"canDeleteFinanceTransaction":false}'::jsonb, NULL, '2026-09-03 12:59:07.713249+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."user_roles" ("id", "name", "description", "color", "is_system", "permissions", "created_at", "updated_at") VALUES ('manager', 'Store Manager', 'Manages fleet vehicle inventory, rates, views historical settlement reports, and executes daily cash audits.', 'blue', TRUE, '{"canRent":true,"canSettle":true,"canViewPL":true,"accessUsers":false,"accessIncome":true,"canEditFleet":true,"accessFinance":true,"accessHistory":true,"accessRentals":true,"accessMessages":true,"accessSettings":false,"canEditPricing":true,"canManageRoles":false,"canManageUsers":false,"accessCustomers":true,"accessDashboard":true,"canExportReports":true,"canViewStatement":true,"canExportFinanceReports":true,"canAddFinanceTransaction":true,"canEditFinanceTransaction":true,"canDeleteFinanceTransaction":false}'::jsonb, NULL, '2026-09-03 12:59:07.713249+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."user_roles" ("id", "name", "description", "color", "is_system", "permissions", "created_at", "updated_at") VALUES ('passenger', 'Passenger', 'Searches routes, books whole vehicles and individual seats on bus/boat seat maps, requests custom trips.', 'emerald', TRUE, '{"canRent":false,"canSettle":false,"canViewPL":false,"accessUsers":false,"accessIncome":false,"canEditFleet":false,"accessFinance":false,"accessHistory":false,"accessRentals":false,"accessMessages":false,"accessSettings":false,"canEditPricing":false,"canManageRoles":false,"canManageUsers":false,"accessCustomers":false,"accessDashboard":false,"canExportReports":false,"canViewStatement":false,"canExportFinanceReports":false,"canAddFinanceTransaction":false,"canEditFinanceTransaction":false,"canDeleteFinanceTransaction":false}'::jsonb, NULL, '2026-09-08 12:07:28.384282+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."user_roles" ("id", "name", "description", "color", "is_system", "permissions", "created_at", "updated_at") VALUES ('owner', 'Fleet / Boat Owner', 'Manages owned vehicles & boats, captain/driver assignments, schedules, and quotes on ride requests.', 'cyan', TRUE, '{"canRent":false,"canSettle":false,"canViewPL":false,"accessUsers":false,"accessIncome":false,"canEditFleet":true,"accessFinance":false,"accessHistory":false,"accessRentals":false,"accessMessages":false,"accessSettings":false,"canEditPricing":false,"canManageRoles":false,"canManageUsers":false,"accessCustomers":false,"accessDashboard":false,"canExportReports":false,"canViewStatement":false,"canExportFinanceReports":false,"canAddFinanceTransaction":false,"canEditFinanceTransaction":false,"canDeleteFinanceTransaction":false}'::jsonb, NULL, '2026-09-08 12:07:28.384282+05:30') ON CONFLICT DO NOTHING;

-- Table: user_accounts (11 rows)
INSERT INTO public."user_accounts" ("id", "name", "email", "phone", "role", "created_at", "updated_at", "must_change_password", "auth_user_id", "status") VALUES ('user-mgr-admin', 'MGR Transport Admin', 'admin@mannargreenride.lk', '+94 77 987 6543', 'admin', 1700000000000, '2026-09-07 00:11:28.298137+05:30', FALSE, NULL, 'active') ON CONFLICT DO NOTHING;
INSERT INTO public."user_accounts" ("id", "name", "email", "phone", "role", "created_at", "updated_at", "must_change_password", "auth_user_id", "status") VALUES ('supa-3fcb83ae-937b-4c94-8b62-cd2e176da834', 'Jenish', 'jeniscroos@gmail.com', '0770692088', 'manager', 1788427138305, '2026-09-03 14:48:58.803854+05:30', FALSE, '3fcb83ae-937b-4c94-8b62-cd2e176da834', 'active') ON CONFLICT DO NOTHING;
INSERT INTO public."user_accounts" ("id", "name", "email", "phone", "role", "created_at", "updated_at", "must_change_password", "auth_user_id", "status") VALUES ('supa-4703eb85-629a-44c8-b830-2c8beab46c08', 'Tharson', 'music.lover.nobita777@gmail.com', '0770792882', 'cashier', 1788420686712, '2026-09-03 13:01:26.983811+05:30', FALSE, '4703eb85-629a-44c8-b830-2c8beab46c08', 'active') ON CONFLICT DO NOTHING;
INSERT INTO public."user_accounts" ("id", "name", "email", "phone", "role", "created_at", "updated_at", "must_change_password", "auth_user_id", "status") VALUES ('supa-1c9a91ef-a183-44ac-a3ff-533c1bf5db80', 'Mark', 'kirumark85@gmail.com', '0778833511', 'manager', 1788427225704, '2026-09-03 14:50:26.033356+05:30', FALSE, '1c9a91ef-a183-44ac-a3ff-533c1bf5db80', 'active') ON CONFLICT DO NOTHING;
INSERT INTO public."user_accounts" ("id", "name", "email", "phone", "role", "created_at", "updated_at", "must_change_password", "auth_user_id", "status") VALUES ('supa-10656b06-1089-4583-82e2-e6605d495dc5', 'Mariya Liboshiyan', 'jlrplibo@gmail.com', '+94718852007', 'cashier', 1788707977263, '2026-09-06 20:49:37.885737+05:30', FALSE, '10656b06-1089-4583-82e2-e6605d495dc5', 'active') ON CONFLICT DO NOTHING;
INSERT INTO public."user_accounts" ("id", "name", "email", "phone", "role", "created_at", "updated_at", "must_change_password", "auth_user_id", "status") VALUES ('user-mgr-passenger', 'Sivaranjan K (Passenger)', 'passenger@mannargreenride.lk', '+94 77 345 6789', 'passenger', 1700000000000, '2026-09-07 00:11:28.298137+05:30', FALSE, NULL, 'active') ON CONFLICT DO NOTHING;
INSERT INTO public."user_accounts" ("id", "name", "email", "phone", "role", "created_at", "updated_at", "must_change_password", "auth_user_id", "status") VALUES ('user-mgr-owner', 'Mohamed Farook (Fleet Owner)', 'owner@mannargreenride.lk', '+94 77 123 4567', 'manager', 1700000000000, '2026-09-07 00:11:28.298137+05:30', FALSE, NULL, 'active') ON CONFLICT DO NOTHING;
INSERT INTO public."user_accounts" ("id", "name", "email", "phone", "role", "created_at", "updated_at", "must_change_password", "auth_user_id", "status") VALUES ('supa-2bf7339d-9139-489c-bbca-21d707eb876f', 'ABS', 'absmgr2026@gmail.com', '0773606494', 'manager', 1788547905406, '2026-09-05 00:21:45.928307+05:30', FALSE, '2bf7339d-9139-489c-bbca-21d707eb876f', 'active') ON CONFLICT DO NOTHING;
INSERT INTO public."user_accounts" ("id", "name", "email", "phone", "role", "created_at", "updated_at", "must_change_password", "auth_user_id", "status") VALUES ('user-1788800859451', 'B M Croos', 'bmcr@gmail.com', '77483438', 'passenger', 1788800859451, '2026-09-07 22:37:40.142034+05:30', FALSE, NULL, 'active') ON CONFLICT DO NOTHING;
INSERT INTO public."user_accounts" ("id", "name", "email", "phone", "role", "created_at", "updated_at", "must_change_password", "auth_user_id", "status") VALUES ('user-1788801629514', 'anthony croos', 'anthony@gmail.com', '68758', 'owner', 1788801629514, '2026-09-07 22:50:30.209497+05:30', FALSE, NULL, 'active') ON CONFLICT DO NOTHING;
INSERT INTO public."user_accounts" ("id", "name", "email", "phone", "role", "created_at", "updated_at", "must_change_password", "auth_user_id", "status") VALUES ('user-default-admin', 'Absir Aiva', 'absiraiva@gmail.com', '+94 77 123 4567', 'manager', 1700000000000, '2026-09-03 12:59:07.713235+05:30', FALSE, '4cf9bdb4-c522-4d05-afe3-a5d4488e56c9', 'active') ON CONFLICT DO NOTHING;

-- Table: income_expenses (31 rows)
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-1788543842304-kf0rn', '2026-08-29', 'Document Bag for Tharson', 'expense', '1800.00', 'Other', 'Absir Aiva', 1788543842304, '2026-09-04 23:14:03.124638+05:30', 'Beni') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-1788544003455-op3my', '2026-07-28', 'Bicycle Padlock, Air Pump, Lights', 'expense', '5800.00', 'Other', 'Absir Aiva', 1788544003455, '2026-09-04 23:16:44.022334+05:30', 'Beni') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-1788791691921-0n4rr', '2026-08-14', 'FB boost Acct trsfr', 'expense', '5000.00', 'Marketing', 'Jenish', 1788791691921, '2026-09-07 20:04:52.126216+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-1788791753632-4nsfw', '2026-08-27', 'Banner stand', 'expense', '10000.00', 'Marketing', 'Jenish', 1788791753632, '2026-09-07 20:05:53.891654+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-1788791814659-5ivu6', '2026-08-29', 'Gps', 'expense', '1500.00', 'Other', 'Jenish', 1788791814659, '2026-09-07 20:06:55.130453+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-1788791870353-h04ws', '2026-08-26', 'Ad sticker', 'expense', '2000.00', 'Marketing', 'Jenish', 1788791870353, '2026-09-07 20:07:50.517274+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-1788775085248-ye1eg', '2026-09-04', 'Cycle valve tube -6', 'expense', '600.00', 'Maintenance', 'Jenish', 1788775085248, '2026-09-07 15:28:05.533313+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-1788779279646-jghsa', '2026-08-31', 'Tharshan 16-31 /AUG', 'expense', '26000.00', 'Salary', 'Jenish', 1788779279646, '2026-09-07 16:37:59.926477+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-1788790241850-j9jrp', '2026-08-28', 'Shop rent-Aug/26', 'expense', '35000.00', 'Other', 'Jenish', 1788790241850, '2026-09-07 19:40:42.677558+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-1788791574837-ofl75', '2026-09-02', 'Reload Tharshan', 'expense', '1599.00', 'Utilities', 'Jenish', 1788791574837, '2026-09-07 20:02:55.413276+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-1788857013231-sj48p', '2026-09-08', 'Fuel for bike', 'expense', '500.00', 'Fuel', 'Jenish', 1788857013231, '2026-09-08 14:13:33.638979+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788582897016', '2026-09-05', 'Rental #REN-0000005 — 03 - Motor Cycle (03-001)', 'income', '700.00', 'Rental Revenue', 'Tharson', 1788593975910, '2026-09-05 13:09:36.638451+05:30', 'Mark') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788594445225', '2026-09-05', 'Rental #REN-0000006 — 03 - Motor Cycle (03-002)', 'income', '900.00', 'Rental Revenue', 'Tharson', 1788610159839, '2026-09-05 17:39:18.725396+05:30', 'Mark') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788620487038', '2026-09-05', 'Rental #REN-0000007 — 01 - Bicycle - Boys (01-0001)', 'income', '100.00', 'Rental Revenue', 'Absir Aiva', 1788621389098, '2026-09-05 20:46:29.419271+05:30', 'Mark') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788621026171', '2026-09-05', 'Rental #REN-0000008 — 01 - Bicycle - Boys (01-0001)', 'income', '100.00', 'Rental Revenue', 'Absir Aiva', 1788630365154, '2026-09-05 20:49:05.757772+05:30', 'Mark') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788493041123', '2026-09-04', 'Rental #REN-0000001 — 03 - Motor Cycle (03-001)', 'income', '400.00', 'Rental Revenue', 'Absir Aiva', 1788499479148, '2026-09-04 10:54:39.967773+05:30', 'Mark') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788499872704', '2026-09-04', 'Rental #REN-0000002 — 02 - Bicycle - Girls (02-0003)', 'income', '100.00', 'Rental Revenue', 'Tharson', 1788503427126, '2026-09-04 12:00:28.112628+05:30', 'Mark') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788500360408', '2026-09-04', 'Rental #REN-0000003 — 03 - Motor Cycle (03-001)', 'income', '1100.00', 'Rental Revenue', 'Tharson', 1788519364433, '2026-09-04 16:26:05.011002+05:30', 'Mark') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788581793686', '2026-09-05', 'Rental #REN-0000004 — 02 - Bicycle - Girls (02-0004)', 'income', '100.00', 'Rental Revenue', 'Tharson', 1788583140631, '2026-09-05 10:08:59.710076+05:30', 'Mark') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788631420529', '2026-09-05', 'Rental #REN-0000009 — 03 - Motor Cycle (03-001)', 'income', '200.00', 'Rental Revenue', 'Absir Aiva', 1788631433896, '2026-09-05 23:33:54.245794+05:30', 'Mark') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788751013852', '2026-09-07', 'Rental #REN-0000012 — 03 - Motor Cycle (03-002)', 'income', '600.00', 'Rental Revenue', 'Jenish', 1788760693836, '2026-09-07 11:28:13.919365+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788761391564', '2026-09-07', 'Rental #REN-0000013 — 03 - Motor Cycle (03-002)', 'income', '200.00', 'Rental Revenue', 'Jenish', 1788764164141, '2026-09-07 12:26:04.390086+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788785685076', '2026-09-07', 'Rental #REN-0000014 — 03 - Motor Cycle (03-002)', 'income', '200.00', 'Rental Revenue', 'Jenish', 1788785992719, '2026-09-07 18:29:53.27234+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788846022059', '2026-09-08', 'Rental #REN-0000015 — 03 - Motor Cycle (03-002)', 'income', '400.00', 'Rental Revenue', 'Mariya Liboshiyan', 1788852298484, '2026-09-08 12:54:59.71723+05:30', 'Mariya Liboshiyan') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788855181315', '2026-09-08', 'Rental #REN-0000016 — 02 - Bicycle - Girls (02-0004)', 'income', '100.00', 'Rental Revenue', 'Jenish', 1788858242942, '2026-09-08 14:34:04.081959+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788883420025', '2026-09-08', 'Rental #REN-0000022 — 01 - Bicycle - Boys (01-0001)', 'income', '100.00', 'Rental Revenue', 'Jenish', 1788883576402, '2026-09-08 21:36:24.642974+05:30', 'Jenish') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788858301879', '2026-09-08', 'Rental #REN-0000017 — 03 - Motor Cycle (03-002)', 'income', '200.00', 'Rental Revenue', 'Mariya Liboshiyan', 1788861754415, '2026-09-08 15:32:35.750846+05:30', 'Mariya Liboshiyan') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788862037846', '2026-09-08', 'Rental #REN-0000018 — 03 - Motor Cycle (03-002)', 'income', '500.00', 'Rental Revenue', 'Mariya Liboshiyan', 1788870798703, '2026-09-08 18:03:19.037562+05:30', 'Mariya Liboshiyan') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788862304073', '2026-09-08', 'Rental #REN-0000020 — 01 - Bicycle - Boys (01-0002)', 'income', '100.00', 'Rental Revenue', 'Mariya Liboshiyan', 1788866176135, '2026-09-08 16:46:16.448477+05:30', 'Mariya Liboshiyan') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788869810732', '2026-09-08', 'Rental #REN-0000021 — 01 - Bicycle - Boys (01-0005)', 'income', '100.00', 'Rental Revenue', 'Mariya Liboshiyan', 1788873433524, '2026-09-08 18:47:13.943734+05:30', 'Mariya Liboshiyan') ON CONFLICT DO NOTHING;
INSERT INTO public."income_expenses" ("id", "date", "description", "type", "amount", "category", "cashier_name", "created_at", "updated_at", "who") VALUES ('inc-rent-rental-1788927376869', '2026-09-09', 'Rental #REN-0000023 — 01 - Bicycle - Boys (01-0001)', 'income', '100.00', 'Rental Revenue', 'MGR Transport Admin', 1788927429634, '2026-09-09 09:47:27.18111+05:30', 'MGR Transport Admin') ON CONFLICT DO NOTHING;

-- Table: message_templates (12 rows)
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-welcome-start', 'Rental Started & Welcome', 'welcome', '🚴 *Welcome to {shop_name}, {customer_name}!* \n\nYour rental #{rental_number} for *{vehicle_name}* has started at {start_time}.\n\nPlease wear your helmet and ride safely! If you need assistance or wish to extend your hire, contact us anytime.\n\nEnjoy your ride!\n*{shop_name}*', 1788927615000, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-birthday-default', 'Birthday Celebration Wishes', 'birthday', '🎉 *Happy Birthday {customer_name}!* 🎂🎈\n\nWishing you a wonderful celebration filled with joy and happiness from all of us at *{shop_name}*! 🚴‍♂️✨\n\nAs a token of our appreciation, please enjoy a special birthday discount on your next ride with us. Have an incredible year ahead!\n\nWarm regards,\n*{shop_name}* Team', 1788927615000, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-weekend-promo', 'Special Promotion / Discount', 'promotion', '🌟 *Special Promotion at {shop_name}!* \n\nHello {customer_name}, enjoy our sunny coastlines with a special weekend discount on all bike hires! \n\nVisit us today or reply to reserve your ride.\n*{shop_name}*', 1788927615000, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-rental-reminder', 'Active Rental Reminder', 'rental_reminder', '⏰ *Rental Reminder - {shop_name}*\n\nHello {customer_name}, your active hire for *{vehicle_name}* (#{rental_number}) is ongoing. If you''d like to extend your rental or have questions, please reach out to us here!\n\nRide safely,\n*{shop_name}*', 1788927615000, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-payment-reminder', 'Payment & Invoice Reminder', 'payment_reminder', '💳 *Payment Reminder - {shop_name}*\n\nHello {customer_name}, this is a gentle reminder regarding the outstanding balance of {amount} on rental #{rental_number}. Please visit our counter or reply here for direct payment.\n\nThank you,\n*{shop_name}*', 1788927615000, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-fitness-promo', 'Fitness & Health Ride Promotion', 'fitness_promo', '💪 *Stay Active & Fit with {shop_name}!* \n\nHello {customer_name}! Start your mornings with invigorating cycling along Mannar''s coastal trails. Ask about our weekly fitness passes for exclusive member perks!\n\nSee you on the road,\n*{shop_name}*', 1788927615000, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-tourist-promo', 'Tourist & Explorer Package', 'tourist_promo', '🗺️ *Explore Mannar Island by Bicycle!*\n\nWelcome {customer_name}! Uncover hidden beaches, the historic Baobab tree, and migratory bird sites at your own pace with our premium explorer bikes.\n\nBook your island tour today!\n*{shop_name}*', 1788927615000, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-thank-you', 'Customer Appreciation & Thank You', 'thank_you', '✨ *Thank You from {shop_name}!* \n\nDear {customer_name}, thank you for choosing us for your travels. Your support means the world to our local team. We hope to see you again soon!\n\nWarmest regards,\n*{shop_name}*', 1788927615000, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-special-offer', 'VIP Special Offer', 'special_offer', '🎁 *Exclusive VIP Offer - {shop_name}*\n\nDear {customer_name}, as a valued member of our {shop_name} community, enjoy complimentary gear and 25% off on your next full-day rental!\n\nShow this message at the counter.\n*{shop_name}*', 1788927615000, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-holiday-greeting', 'Festive Holiday Greeting', 'holiday_greeting', '🎄🎉 *Warm Holiday Greetings from {shop_name}!* \n\nWishing you and your loved ones a season filled with peace, joy, and memorable adventures. Happy Holidays from our entire team! 🚴‍♂️✨', 1788927615000, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-general-reminder', 'General Notification', 'general', '🔔 *Notification from {shop_name}*\n\nHello {customer_name}, here is an update regarding your rental account. For any questions, please reply directly to this message.\n\nThank you,\n*{shop_name}*', 1788927615000, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."message_templates" ("id", "title", "category", "content", "created_at", "updated_at") VALUES ('tmpl-return-thanks', 'Return Completed & Thank You', 'return_reminder', '🙏 *Thank you for riding with {shop_name}, {customer_name}!* \n\nYour rental #{rental_number} for *{vehicle_name}* has been settled successfully.\n• Amount: {amount}\n\nWe hope you enjoyed exploring the sights of Mannar! We look forward to seeing you again soon. 🌿🚲\n\nBest regards,\n*{shop_name}*', 1789432057051, '2026-09-14 18:59:21.679055+05:30') ON CONFLICT DO NOTHING;

-- Table: rentals (68 rows)
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789402231256', 'REN-0000053', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Jenis', '0770692088', '891640862V', NULL, '0.00', 1789402231258, 1789402277547, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":1,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":1,"durationFormatted":"1 min","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Jenish', 'cash', '100.00', NULL, 1789402277547, '2026-09-14 21:40:33.964715+05:30', '2026-09-14 21:40:33.964715+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789463147537', 'REN-0000060', 'veh-g04', '02-0004', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Ravi Ragusanthan', '0774252855', '198812810011', NULL, '0.00', 1789463147537, 1789463213792, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":2,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":2,"durationFormatted":"2 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Tharson', 'cash', '100.00', NULL, 1789463213792, '2026-09-15 14:35:49.06715+05:30', '2026-09-15 14:35:49.06715+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789475122204', 'REN-0000068', 'veh-b05', '01-0005', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Dr.Chmmi', '0770577023', '941250321V', NULL, '0.00', 1789475122204, 1789481876211, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":113,"every30MinRate":50,"every30MinCount":2,"firstHourAmount":100,"next30MinAmount":100,"every30MinAmount":100,"firstHourMinutes":60,"durationFormatted":"1 hr 53 mins","continuingHoursCount":1,"continuingHoursAmount":100}'::jsonb, '200.00', 'Jenish', 'cash', '200.00', NULL, 1789481876211, '2026-09-15 17:55:23.223827+05:30', '2026-09-15 17:55:23.223827+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789405914758', 'REN-0000054', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Daniyal Lithursan', '0760601555', '200510102920', NULL, '0.00', 1789405914758, 1789405976699, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":2,"every30MinRate":100,"every30MinCount":0,"firstHourAmount":200,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":2,"durationFormatted":"2 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '200.00', 'Jenish', 'cash', '200.00', NULL, 1789405976699, '2026-09-14 22:41:55.849366+05:30', '2026-09-14 22:41:55.849366+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789467116481', 'REN-0000061', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Pushparasa Rajkumar', '0778650726', '892054282 V', NULL, '1000.00', 1789467116481, 1789476095602, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":500,"totalAmount":500,"totalMinutes":150,"every30MinRate":100,"every30MinCount":3,"firstHourAmount":200,"next30MinAmount":300,"every30MinAmount":300,"firstHourMinutes":60,"durationFormatted":"2 hrs 30 mins","continuingHoursCount":2,"continuingHoursAmount":300}'::jsonb, '500.00', 'Tharson', 'cash', '500.00', NULL, 1789476095602, '2026-09-15 15:41:58.575289+05:30', '2026-09-15 15:41:58.575289+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789474942318', 'REN-0000067', 'veh-g05', '02-0005', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Dr.Ms Chamikka', '0770577023', '1994', NULL, '0.00', 1789474942318, 1789481918711, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":117,"every30MinRate":50,"every30MinCount":2,"firstHourAmount":100,"next30MinAmount":100,"every30MinAmount":100,"firstHourMinutes":60,"durationFormatted":"1 hr 57 mins","continuingHoursCount":1,"continuingHoursAmount":100}'::jsonb, '200.00', 'Jenish', 'cash', '200.00', NULL, 1789481918711, '2026-09-15 17:52:23.578511+05:30', '2026-09-15 17:52:23.578511+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788499872704', 'REN-0000002', 'veh-g03', '02-0003', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Thampirasa raveenthiran', '0771223399', '196704902273', NULL, '0.00', 1788499872705, 1788503424433, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":60,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":60,"durationFormatted":"1 hr","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Tharson', 'cash', '100.00', NULL, 1788503424433, '2026-09-04 11:01:14.269424+05:30', '2026-09-04 11:01:14.269424+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789405963664', 'REN-0000055', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'P.Meiyqtheen Pkeer', '0778779315', '197304103130', NULL, '0.00', 1789405963664, 1789405992951, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":1,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":1,"durationFormatted":"1 min","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Jenish', 'cash', '100.00', NULL, 1789405992951, '2026-09-14 22:42:44.604371+05:30', '2026-09-14 22:42:44.604371+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789471526364', 'REN-0000062', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Janith Harsha Athapaththu', '0713319284', '963210531 V', NULL, '0.00', 1789471526364, 1789478792475, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":250,"totalAmount":250,"totalMinutes":122,"every30MinRate":50,"every30MinCount":3,"firstHourAmount":100,"next30MinAmount":150,"every30MinAmount":150,"firstHourMinutes":60,"durationFormatted":"2 hrs 2 mins","continuingHoursCount":2,"continuingHoursAmount":150}'::jsonb, '200.00', 'Tharson', 'cash', '200.00', NULL, 1789478792475, '2026-09-15 16:55:27.568874+05:30', '2026-09-15 16:55:27.568874+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789474892992', 'REN-0000066', 'veh-g03', '02-0003', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Dr.Ms Chamikka', '0770577023', '1994', NULL, '0.00', 1789474892992, 1789481927718, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":118,"every30MinRate":50,"every30MinCount":2,"firstHourAmount":100,"next30MinAmount":100,"every30MinAmount":100,"firstHourMinutes":60,"durationFormatted":"1 hr 58 mins","continuingHoursCount":1,"continuingHoursAmount":100}'::jsonb, '200.00', 'Jenish', 'cash', '200.00', NULL, 1789481927718, '2026-09-15 17:51:34.148728+05:30', '2026-09-15 17:51:34.148728+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788500360408', 'REN-0000003', 'veh-m01', '03-001', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'P.lithurshan', '0722807526', '887941769', NULL, '0.00', 1788500360408, 1788519357504, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":1100,"totalAmount":1100,"totalMinutes":317,"every30MinRate":100,"every30MinCount":9,"firstHourAmount":200,"next30MinAmount":900,"every30MinAmount":900,"firstHourMinutes":60,"durationFormatted":"5 hrs 17 mins","continuingHoursCount":5,"continuingHoursAmount":900}'::jsonb, '1100.00', 'Tharson', 'cash', '1100.00', NULL, 1788519357504, '2026-09-04 11:09:21.731864+05:30', '2026-09-04 11:09:21.731864+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788582897016', 'REN-0000005', 'veh-m01', '03-001', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Nixon beno sharun', '0766581342', '200518501612', NULL, '0.00', 1788582897016, 1788593949284, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":700,"totalAmount":700,"totalMinutes":185,"every30MinRate":100,"every30MinCount":5,"firstHourAmount":200,"next30MinAmount":500,"every30MinAmount":500,"firstHourMinutes":60,"durationFormatted":"3 hrs 5 mins","continuingHoursCount":3,"continuingHoursAmount":500}'::jsonb, '700.00', 'Tharson', 'cash', '700.00', NULL, 1788593949284, '2026-09-05 10:04:56.25636+05:30', '2026-09-05 10:04:56.25636+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788620487038', 'REN-0000007', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'A. Beni Siraiva', '0773606494', '198802900037', NULL, '0.00', 1788620487038, 1788621378897, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":15,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":15,"durationFormatted":"15 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Absir Aiva', 'cash', '100.00', NULL, 1788621378897, '2026-09-05 20:31:27.751901+05:30', '2026-09-05 20:31:27.751901+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789387823892', 'REN-0000049', 'veh-g01', '02-0001', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Dr. Nadeesha', '+94718920597', '948570335V', NULL, '0.00', 1789387823892, 1789393471736, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":95,"every30MinRate":50,"every30MinCount":2,"firstHourAmount":100,"next30MinAmount":100,"every30MinAmount":100,"firstHourMinutes":60,"durationFormatted":"1 hr 35 mins","continuingHoursCount":1,"continuingHoursAmount":100}'::jsonb, '200.00', 'Jenish', 'cash', '200.00', NULL, 1789393471736, '2026-09-14 17:40:25.07446+05:30', '2026-09-14 17:40:25.07446+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789406087341', 'REN-0000056', 'veh-b03', '01-0003', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Abul Asan Anvar', '779718662', '198400505175', NULL, '0.00', 1789406087341, 1789406158696, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":2,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":2,"durationFormatted":"2 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Jenish', 'cash', '100.00', NULL, 1789406158696, '2026-09-14 22:44:48.103086+05:30', '2026-09-14 22:44:48.103086+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789472331287', 'REN-0000063', 'veh-b03', '01-0003', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Dr.Janith Harsha Athapaththu', '0713319284', '963210531V', NULL, '0.00', 1789472331287, 1789478836136, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":109,"every30MinRate":50,"every30MinCount":2,"firstHourAmount":100,"next30MinAmount":100,"every30MinAmount":100,"firstHourMinutes":60,"durationFormatted":"1 hr 49 mins","continuingHoursCount":1,"continuingHoursAmount":100}'::jsonb, '200.00', 'Tharson', 'cash', '200.00', NULL, 1789478836136, '2026-09-15 17:08:53.079942+05:30', '2026-09-15 17:08:53.079942+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788594445225', 'REN-0000006', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Nixon beno sharun', '0766581342', '200518501612', NULL, '0.00', 1788594445225, 1788610143584, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":900,"totalAmount":900,"totalMinutes":262,"every30MinRate":100,"every30MinCount":7,"firstHourAmount":200,"next30MinAmount":700,"every30MinAmount":700,"firstHourMinutes":60,"durationFormatted":"4 hrs 22 mins","continuingHoursCount":4,"continuingHoursAmount":700}'::jsonb, '900.00', 'Tharson', 'cash', '900.00', NULL, 1788610143584, '2026-09-05 13:17:24.438874+05:30', '2026-09-05 13:17:24.438874+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788621026171', 'REN-0000008', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Jenis', '0770692088', '891640862V', NULL, '0.00', 1788630348447, 1788630362221, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":1,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":1,"durationFormatted":"1 min","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Absir Aiva', 'cash', '100.00', NULL, 1788630362221, '2026-09-05 20:40:27.1491+05:30', '2026-09-05 20:40:27.1491+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788702315407', 'REN-0000010', 'veh-b02', '01-0002', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Jenis', '0770692088', '891640862V', NULL, '0.00', 1788702315407, 1788702420919, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":2,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":2,"durationFormatted":"2 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '0.00', 'Jenish', 'cash', NULL, NULL, 1788702420919, '2026-09-06 19:15:17.408989+05:30', '2026-09-06 19:15:17.408989+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788862230287', 'REN-0000019', 'veh-b02', '01-0002', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Vijaraja Antony thanuyan', '0718552007', '941223303V', NULL, '0.00', 1788862230287, 1788862245972, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":1,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":1,"durationFormatted":"1 min","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '0.00', 'Mariya Liboshiyan', 'cash', NULL, NULL, 1788862245972, '2026-09-08 15:40:32.12169+05:30', '2026-09-08 15:40:32.12169+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789460595280', 'REN-0000057', 'veh-g04', '02-0004', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Ravi Ragusanthan', '0774252855', '198812810011', NULL, '0.00', 1789460595280, 1789462976623, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":40,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":40,"durationFormatted":"40 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Tharson', 'cash', '100.00', NULL, 1789462976623, '2026-09-15 13:53:16.797703+05:30', '2026-09-15 13:53:16.797703+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789473657203', 'REN-0000064', 'veh-g04', '02-0004', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Thavaseelan', '0769317767', '200829503189', NULL, '0.00', 1789473657203, 1789474819507, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":20,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":20,"durationFormatted":"20 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Tharson', 'cash', '100.00', NULL, 1789474819507, '2026-09-15 17:30:58.393093+05:30', '2026-09-15 17:30:58.393093+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788581793686', 'REN-0000004', 'veh-g04', '02-0004', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Yogarasa Nanthujan', '0741503965', '200027510072', NULL, '0.00', 1788581793686, 1788583135368, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":23,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":23,"durationFormatted":"23 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Tharson', 'cash', '100.00', NULL, 1788583135368, '2026-09-05 09:46:33.976734+05:30', '2026-09-05 09:46:33.976734+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788631420529', 'REN-0000009', 'veh-m01', '03-001', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'A. Beni Siraiva', '0773606494', '198802900037', NULL, '0.00', 1788631420529, 1788631431850, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":1,"every30MinRate":100,"every30MinCount":0,"firstHourAmount":200,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":1,"durationFormatted":"1 min","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '200.00', 'Absir Aiva', 'cash', '200.00', NULL, 1788631431850, '2026-09-05 23:33:41.143878+05:30', '2026-09-05 23:33:41.143878+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789460722598', 'REN-0000058', 'veh-g01', '02-0001', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', '', '0764505741', '653623330 V', NULL, '0.00', 1789460722598, 1789461154738, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":8,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":8,"durationFormatted":"8 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Tharson', 'cash', '100.00', NULL, 1789461154738, '2026-09-15 13:55:24.094474+05:30', '2026-09-15 13:55:24.094474+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789474840360', 'REN-0000065', 'veh-g02', '02-0002', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Dr.Chmmi', '0770577023', '941250321V', NULL, '0.00', 1789474840360, 1789481937762, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":119,"every30MinRate":50,"every30MinCount":2,"firstHourAmount":100,"next30MinAmount":100,"every30MinAmount":100,"firstHourMinutes":60,"durationFormatted":"1 hr 59 mins","continuingHoursCount":1,"continuingHoursAmount":100}'::jsonb, '200.00', 'Jenish', 'cash', '200.00', NULL, 1789481937762, '2026-09-15 17:50:41.506343+05:30', '2026-09-15 17:50:41.506343+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788493041123', 'REN-0000001', 'veh-m01', '03-001', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Judeanru julittan', '0743636112', '200507400965', NULL, '0.00', 1788493041123, 1788499460560, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":400,"totalAmount":400,"totalMinutes":107,"every30MinRate":100,"every30MinCount":2,"firstHourAmount":200,"next30MinAmount":200,"every30MinAmount":200,"firstHourMinutes":60,"durationFormatted":"1 hr 47 mins","continuingHoursCount":1,"continuingHoursAmount":200}'::jsonb, '400.00', 'Absir Aiva', 'cash', '400.00', NULL, 1788499460560, '2026-09-04 09:07:23.102391+05:30', '2026-09-04 09:07:23.102391+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788712439729', 'REN-0000011', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'A. Beni Siraiva', '0773606494', '198802900037', NULL, '0.00', 1788712439729, 1788712518331, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":2,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":2,"durationFormatted":"2 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '0.00', 'Jenish', 'cash', NULL, NULL, 1788712518331, '2026-09-06 22:04:00.973275+05:30', '2026-09-06 22:04:00.973275+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788751013852', 'REN-0000012', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Daniyal Lithursan', '0760601555', '200510102920', NULL, '0.00', 1788751013852, 1788760689807, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":600,"totalAmount":600,"totalMinutes":162,"every30MinRate":100,"every30MinCount":4,"firstHourAmount":200,"next30MinAmount":400,"every30MinAmount":400,"firstHourMinutes":60,"durationFormatted":"2 hrs 42 mins","continuingHoursCount":2,"continuingHoursAmount":400}'::jsonb, '600.00', 'Jenish', 'cash', '600.00', NULL, 1788760689807, '2026-09-07 08:46:55.267322+05:30', '2026-09-07 08:46:55.267322+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788761391564', 'REN-0000013', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Thampiraja Mahindran', '0761928848', '198615304014', NULL, '0.00', 1788761391564, 1788764158220, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":47,"every30MinRate":100,"every30MinCount":0,"firstHourAmount":200,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":47,"durationFormatted":"47 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '200.00', 'Jenish', 'cash', '200.00', NULL, 1788764158220, '2026-09-07 11:39:52.085047+05:30', '2026-09-07 11:39:52.085047+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788785685076', 'REN-0000014', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'K L Mark', '0778833511', '34876872', NULL, '0.00', 1788785685076, 1788785986392, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":6,"every30MinRate":100,"every30MinCount":0,"firstHourAmount":200,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":6,"durationFormatted":"6 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '200.00', 'Jenish', 'cash', '200.00', NULL, 1788785986392, '2026-09-07 18:24:45.868186+05:30', '2026-09-07 18:24:45.868186+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788846022059', 'REN-0000015', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Thampiraja Mahindran', '0761928848', '198615304014', NULL, '0.00', 1788846022059, 1788852148905, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":400,"totalAmount":400,"totalMinutes":103,"every30MinRate":100,"every30MinCount":2,"firstHourAmount":200,"next30MinAmount":200,"every30MinAmount":200,"firstHourMinutes":60,"durationFormatted":"1 hr 43 mins","continuingHoursCount":1,"continuingHoursAmount":200}'::jsonb, '400.00', 'Mariya Liboshiyan', 'cash', '400.00', NULL, 1788852148905, '2026-09-08 11:10:24.948916+05:30', '2026-09-08 11:10:24.948916+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788855181315', 'REN-0000016', 'veh-g04', '02-0004', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Sanththakuru seviyar liyon', '0764505741', '653623330V', NULL, '0.00', 1788855181315, 1788858232889, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":51,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":51,"durationFormatted":"51 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Jenish', 'cash', '100.00', NULL, 1788858232889, '2026-09-08 13:43:02.158248+05:30', '2026-09-08 13:43:02.158248+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788858301879', 'REN-0000017', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Ambikaibalan', '0711235899', '200219100207', NULL, '0.00', 1788858301880, 1788861549824, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":55,"every30MinRate":100,"every30MinCount":0,"firstHourAmount":200,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":55,"durationFormatted":"55 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '200.00', 'Mariya Liboshiyan', 'cash', '200.00', NULL, 1788861549824, '2026-09-08 14:35:03.74043+05:30', '2026-09-08 14:35:03.74043+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788862037846', 'REN-0000018', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Ambikaibalan Karunan', '0711235899', '200219100207', NULL, '0.00', 1788862037846, 1788870794818, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":500,"totalAmount":500,"totalMinutes":146,"every30MinRate":100,"every30MinCount":3,"firstHourAmount":200,"next30MinAmount":300,"every30MinAmount":300,"firstHourMinutes":60,"durationFormatted":"2 hrs 26 mins","continuingHoursCount":2,"continuingHoursAmount":300}'::jsonb, '500.00', 'Mariya Liboshiyan', 'cash', '500.00', NULL, 1788870794818, '2026-09-08 15:37:19.198861+05:30', '2026-09-08 15:37:19.198861+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788862304073', 'REN-0000020', 'veh-b02', '01-0002', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Vijaraja Antony thanuyan', '0718552007', '941223303V', NULL, '0.00', 1788862304073, 1788866163620, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":150,"totalAmount":150,"totalMinutes":65,"every30MinRate":50,"every30MinCount":1,"firstHourAmount":100,"next30MinAmount":50,"every30MinAmount":50,"firstHourMinutes":60,"durationFormatted":"1 hr 5 mins","continuingHoursCount":1,"continuingHoursAmount":50}'::jsonb, '100.00', 'Mariya Liboshiyan', 'cash', '100.00', NULL, 1788866163620, '2026-09-08 15:41:45.404063+05:30', '2026-09-08 15:41:45.404063+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788869810732', 'REN-0000021', 'veh-b05', '01-0005', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Dr.Amry GH MNR', '0779337374', '921461321V', NULL, '0.00', 1788869810732, 1788873411090, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":150,"totalAmount":150,"totalMinutes":61,"every30MinRate":50,"every30MinCount":1,"firstHourAmount":100,"next30MinAmount":50,"every30MinAmount":50,"firstHourMinutes":60,"durationFormatted":"1 hr 1 min","continuingHoursCount":1,"continuingHoursAmount":50}'::jsonb, '100.00', 'Mariya Liboshiyan', 'cash', '100.00', NULL, 1788873411090, '2026-09-08 17:46:52.852675+05:30', '2026-09-08 17:46:52.852675+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788883420025', 'REN-0000022', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Mark', '', 'MARK', NULL, '0.00', 1788883420025, 1788883576402, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":3,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":3,"durationFormatted":"3 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Jenish', 'cash', '100.00', NULL, 1788883576402, '2026-09-08 21:33:40.771231+05:30', '2026-09-08 21:33:40.771231+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788927376869', 'REN-0000023', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'merlin', '0772837620', '9155', NULL, '0.00', 1788927376869, 1788927429634, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":1,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":1,"durationFormatted":"1 min","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'MGR Transport Admin', 'qr_transfer', '100.00', NULL, 1788927429634, '2026-09-09 09:46:18.369995+05:30', '2026-09-09 09:46:18.369995+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788946132881', 'REN-0000024', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Asanka', '0777246137', '808000', NULL, '0.00', 1788946132881, 1788947344241, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":21,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":21,"durationFormatted":"21 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Absir Aiva', 'cash', '100.00', NULL, 1788947344241, '2026-09-09 14:58:53.652449+05:30', '2026-09-09 14:58:53.652449+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788948417048', 'REN-0000025', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'A. Beni Siraiva', '0773606494', '198802900037', NULL, '0.00', 1788948417048, 1788948539398, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":3,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":3,"durationFormatted":"3 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '0.00', 'Absir Aiva', 'cash', NULL, NULL, 1788948539398, '2026-09-09 15:36:57.784581+05:30', '2026-09-09 15:36:57.784581+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788948462826', 'REN-0000026', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Jenis', '0770692088', '891640862V', NULL, '0.00', 1788948462826, 1788948509767, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":1,"every30MinRate":100,"every30MinCount":0,"firstHourAmount":200,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":1,"durationFormatted":"1 min","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '0.00', 'Absir Aiva', 'cash', NULL, NULL, 1788948509767, '2026-09-09 15:37:43.584351+05:30', '2026-09-09 15:37:43.584351+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788949012296', 'REN-0000027', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Balan kavitaj', '0743198016', '199716100042', NULL, '0.00', 1788949012296, 1788949584872, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":10,"every30MinRate":100,"every30MinCount":0,"firstHourAmount":200,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":10,"durationFormatted":"10 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '200.00', 'Mariya Liboshiyan', 'cash', '200.00', NULL, 1788949584872, '2026-09-09 15:46:54.079885+05:30', '2026-09-09 15:46:54.079885+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788949483951', 'REN-0000028', 'veh-g03', '02-0003', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Jasontha Lambert sivakumar', '0768110658', '196781702243', NULL, '0.00', 1788949483951, 1788951201956, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":29,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":29,"durationFormatted":"29 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Mariya Liboshiyan', 'cash', '100.00', NULL, 1788951201956, '2026-09-09 15:54:45.36589+05:30', '2026-09-09 15:54:45.36589+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1788960346647', 'REN-0000029', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Jenis', '0770692088', '891640862V', NULL, '0.00', 1788960346647, 1788960373812, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":1,"every30MinRate":100,"every30MinCount":0,"firstHourAmount":200,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":1,"durationFormatted":"1 min","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '200.00', 'Absir Aiva', 'cash', '200.00', NULL, 1788960373812, '2026-09-09 18:55:47.109697+05:30', '2026-09-09 18:55:47.109697+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789033451284', 'REN-0000030', 'veh-b03', '01-0003', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Jaleel Athif', '0761985622', '2000', NULL, '0.00', 1789033451284, 1789035171087, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":29,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":29,"durationFormatted":"29 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Absir Aiva', 'cash', '100.00', NULL, 1789035171087, '2026-09-10 15:14:13.072245+05:30', '2026-09-10 15:14:13.072245+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789103746772', 'REN-0000031', 'veh-g03', '02-0003', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Sanththakuru seviyar liyon', '0764505741', '653623330V', NULL, '0.00', 1789103746773, 1789110082351, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":106,"every30MinRate":50,"every30MinCount":2,"firstHourAmount":100,"next30MinAmount":100,"every30MinAmount":100,"firstHourMinutes":60,"durationFormatted":"1 hr 46 mins","continuingHoursCount":1,"continuingHoursAmount":100}'::jsonb, '150.00', 'Mariya Liboshiyan', 'cash', '150.00', NULL, 1789110082351, '2026-09-11 10:45:50.642538+05:30', '2026-09-11 10:45:50.642538+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789463027640', 'REN-0000059', 'veh-g04', '02-0004', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Dammikka', '0772649528', '940171644V', 'Army', '0.00', 1789463027640, 1789463103482, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":2,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":2,"durationFormatted":"2 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Tharson', 'cash', '100.00', NULL, 1789463103482, '2026-09-15 14:33:49.116889+05:30', '2026-09-15 14:33:49.116889+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789107553800', 'REN-0000032', 'veh-g04', '02-0004', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Santhiyohu thilipanbmiranda', '0774020839', '198816102461', NULL, '0.00', 1789107553801, 1789110050620, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":42,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":42,"durationFormatted":"42 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Mariya Liboshiyan', 'cash', '100.00', NULL, 1789110050620, '2026-09-11 11:49:15.105095+05:30', '2026-09-11 11:49:15.105095+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789108493891', 'REN-0000033', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Kanthasamy rajakumar', '0764570561', '198220004431', 'Helmet', '1000.00', 1789108493891, 1789119532365, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":700,"totalAmount":700,"totalMinutes":184,"every30MinRate":100,"every30MinCount":5,"firstHourAmount":200,"next30MinAmount":500,"every30MinAmount":500,"firstHourMinutes":60,"durationFormatted":"3 hrs 4 mins","continuingHoursCount":3,"continuingHoursAmount":500}'::jsonb, '500.00', 'Jenish', 'cash', '500.00', NULL, 1789119532365, '2026-09-11 12:04:55.259738+05:30', '2026-09-11 12:04:55.259738+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789121001317', 'REN-0000034', 'veh-g04', '02-0004', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Dammikka', '0772649528', '940171644V', 'Army', '0.00', 1789121001317, 1789125429216, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":150,"totalAmount":150,"totalMinutes":74,"every30MinRate":50,"every30MinCount":1,"firstHourAmount":100,"next30MinAmount":50,"every30MinAmount":50,"firstHourMinutes":60,"durationFormatted":"1 hr 14 mins","continuingHoursCount":1,"continuingHoursAmount":50}'::jsonb, '100.00', 'Jenish', 'cash', '100.00', NULL, 1789125429216, '2026-09-11 15:33:23.307529+05:30', '2026-09-11 15:33:23.307529+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789197169462', 'REN-0000035', 'veh-m02', '03-002', 'type-motorcycle', '03 - Motor Cycle', 'motorcycle', 'Arokkiyanathan kithyon', '0757949167', '200527604071', NULL, '0.00', 1789197169462, 1789214440338, 'completed', '{"firstHour":200,"next30Min":100,"every30Min":100,"continuingHour":200}'::jsonb, '{"subtotal":1000,"totalAmount":1000,"totalMinutes":288,"every30MinRate":100,"every30MinCount":8,"firstHourAmount":200,"next30MinAmount":800,"every30MinAmount":800,"firstHourMinutes":60,"durationFormatted":"4 hrs 48 mins","continuingHoursCount":4,"continuingHoursAmount":800}'::jsonb, '1000.00', 'Mariya Liboshiyan', 'cash', '1000.00', NULL, 1789214440338, '2026-09-12 12:42:51.152843+05:30', '2026-09-12 12:42:51.152843+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789199759794', 'REN-0000036', 'veh-b04', '01-0004', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'S ROCH KISON RAJ', '', '200209900088', NULL, '0.00', 1789199759794, 1789204866317, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":150,"totalAmount":150,"totalMinutes":86,"every30MinRate":50,"every30MinCount":1,"firstHourAmount":100,"next30MinAmount":50,"every30MinAmount":50,"firstHourMinutes":60,"durationFormatted":"1 hr 26 mins","continuingHoursCount":1,"continuingHoursAmount":50}'::jsonb, '100.00', 'Jenish', 'cash', '100.00', NULL, 1789204866317, '2026-09-12 13:26:00.603323+05:30', '2026-09-12 13:26:00.603323+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789200534603', 'REN-0000037', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Sivanathan venujan', '0743797788', '200515904733', NULL, '0.00', 1789200534603, 1789208879402, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":250,"totalAmount":250,"totalMinutes":140,"every30MinRate":50,"every30MinCount":3,"firstHourAmount":100,"next30MinAmount":150,"every30MinAmount":150,"firstHourMinutes":60,"durationFormatted":"2 hrs 20 mins","continuingHoursCount":2,"continuingHoursAmount":150}'::jsonb, '250.00', 'Mariya Liboshiyan', 'cash', '250.00', NULL, 1789208879402, '2026-09-12 13:38:56.251501+05:30', '2026-09-12 13:38:56.251501+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789213172889', 'REN-0000038', 'veh-b03', '01-0003', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'PASINDHU  MANAHARA SAMARAWEERA', '0770692088', '198726304215', NULL, '0.00', 1789213172889, 1789221947333, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":250,"totalAmount":250,"totalMinutes":147,"every30MinRate":50,"every30MinCount":3,"firstHourAmount":100,"next30MinAmount":150,"every30MinAmount":150,"firstHourMinutes":60,"durationFormatted":"2 hrs 27 mins","continuingHoursCount":2,"continuingHoursAmount":150}'::jsonb, '180.00', 'Jenish', 'cash', '180.00', NULL, 1789221947333, '2026-09-12 17:09:33.549592+05:30', '2026-09-12 17:09:33.549592+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789213201659', 'REN-0000039', 'veh-b04', '01-0004', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'PASINDHU  MANAHARA SAMARAWEERA', '0770692088', '198726304215', NULL, '0.00', 1789213201659, 1789221917569, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":250,"totalAmount":250,"totalMinutes":146,"every30MinRate":50,"every30MinCount":3,"firstHourAmount":100,"next30MinAmount":150,"every30MinAmount":150,"firstHourMinutes":60,"durationFormatted":"2 hrs 26 mins","continuingHoursCount":2,"continuingHoursAmount":150}'::jsonb, '180.00', 'Jenish', 'cash', '180.00', NULL, 1789221917569, '2026-09-12 17:10:02.9017+05:30', '2026-09-12 17:10:02.9017+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789213268459', 'REN-0000040', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'PASINDHU  MANAHARA SAMARAWEERA', '0770692088', '198726304215', NULL, '0.00', 1789213268459, 1789221858974, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":250,"totalAmount":250,"totalMinutes":144,"every30MinRate":50,"every30MinCount":3,"firstHourAmount":100,"next30MinAmount":150,"every30MinAmount":150,"firstHourMinutes":60,"durationFormatted":"2 hrs 24 mins","continuingHoursCount":2,"continuingHoursAmount":150}'::jsonb, '180.00', 'Jenish', 'cash', '180.00', NULL, 1789221858974, '2026-09-12 17:11:09.098604+05:30', '2026-09-12 17:11:09.098604+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789213324611', 'REN-0000041', 'veh-g03', '02-0003', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'PASINDHU  MANAHARA SAMARAWEERA', '0770692088', '198726304215', NULL, '0.00', 1789213324611, 1789220387641, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":118,"every30MinRate":50,"every30MinCount":2,"firstHourAmount":100,"next30MinAmount":100,"every30MinAmount":100,"firstHourMinutes":60,"durationFormatted":"1 hr 58 mins","continuingHoursCount":1,"continuingHoursAmount":100}'::jsonb, '180.00', 'Jenish', 'cash', '180.00', NULL, 1789220387641, '2026-09-12 17:12:05.379905+05:30', '2026-09-12 17:12:05.379905+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789213355100', 'REN-0000042', 'veh-g04', '02-0004', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'PASINDHU  MANAHARA SAMARAWEERA', '0770692088', '198726304215', NULL, '0.00', 1789213355100, 1789221986489, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":250,"totalAmount":250,"totalMinutes":144,"every30MinRate":50,"every30MinCount":3,"firstHourAmount":100,"next30MinAmount":150,"every30MinAmount":150,"firstHourMinutes":60,"durationFormatted":"2 hrs 24 mins","continuingHoursCount":2,"continuingHoursAmount":150}'::jsonb, '180.00', 'Jenish', 'cash', '180.00', NULL, 1789221986489, '2026-09-12 17:12:36.112455+05:30', '2026-09-12 17:12:36.112455+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789217198820', 'REN-0000043', 'veh-g01', '02-0001', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Dr. Nadeesha', '+94718920597', '948570335V', NULL, '0.00', 1789217198820, 1789222280684, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":150,"totalAmount":150,"totalMinutes":85,"every30MinRate":50,"every30MinCount":1,"firstHourAmount":100,"next30MinAmount":50,"every30MinAmount":50,"firstHourMinutes":60,"durationFormatted":"1 hr 25 mins","continuingHoursCount":1,"continuingHoursAmount":50}'::jsonb, '100.00', 'Jenish', 'cash', '100.00', NULL, 1789222280684, '2026-09-12 18:16:40.069956+05:30', '2026-09-12 18:16:40.069956+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789217228335', 'REN-0000044', 'veh-g02', '02-0002', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Dr. Nadeesha', '+94718920597', '948570335V', NULL, '0.00', 1789217228335, 1789222233512, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":150,"totalAmount":150,"totalMinutes":84,"every30MinRate":50,"every30MinCount":1,"firstHourAmount":100,"next30MinAmount":50,"every30MinAmount":50,"firstHourMinutes":60,"durationFormatted":"1 hr 24 mins","continuingHoursCount":1,"continuingHoursAmount":50}'::jsonb, '150.00', 'Jenish', 'cash', '150.00', NULL, 1789222233512, '2026-09-12 18:17:09.059085+05:30', '2026-09-12 18:17:09.059085+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789217287484', 'REN-0000045', 'veh-g05', '02-0005', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Dr. Nadeesha', '+94718920597', '948570335V', NULL, '0.00', 1789217287484, 1789222150632, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":150,"totalAmount":150,"totalMinutes":82,"every30MinRate":50,"every30MinCount":1,"firstHourAmount":100,"next30MinAmount":50,"every30MinAmount":50,"firstHourMinutes":60,"durationFormatted":"1 hr 22 mins","continuingHoursCount":1,"continuingHoursAmount":50}'::jsonb, '150.00', 'Jenish', 'cash', '150.00', NULL, 1789222150632, '2026-09-12 18:18:08.561015+05:30', '2026-09-12 18:18:08.561015+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789217406101', 'REN-0000046', 'veh-b02', '01-0002', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Dr.Nishan', '0710878015', '941180841V', NULL, '0.00', 1789217406101, 1789222174492, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":150,"totalAmount":150,"totalMinutes":80,"every30MinRate":50,"every30MinCount":1,"firstHourAmount":100,"next30MinAmount":50,"every30MinAmount":50,"firstHourMinutes":60,"durationFormatted":"1 hr 20 mins","continuingHoursCount":1,"continuingHoursAmount":50}'::jsonb, '150.00', 'Jenish', 'cash', '150.00', NULL, 1789222174492, '2026-09-12 18:20:06.972394+05:30', '2026-09-12 18:20:06.972394+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789217437383', 'REN-0000047', 'veh-b05', '01-0005', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Dr.Nishan', '0710878015', '941180841V', NULL, '0.00', 1789217437383, 1789222188812, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":150,"totalAmount":150,"totalMinutes":80,"every30MinRate":50,"every30MinCount":1,"firstHourAmount":100,"next30MinAmount":50,"every30MinAmount":50,"firstHourMinutes":60,"durationFormatted":"1 hr 20 mins","continuingHoursCount":1,"continuingHoursAmount":50}'::jsonb, '150.00', 'Jenish', 'cash', '150.00', NULL, 1789222188812, '2026-09-12 18:20:38.025623+05:30', '2026-09-12 18:20:38.025623+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789387994038', 'REN-0000051', 'veh-g02', '02-0002', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Abul Asan Anvar', '779718662', '198400505175', NULL, '0.00', 1789387994038, 1789388244879, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":5,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":5,"durationFormatted":"5 mins","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Jenish', 'cash', '100.00', NULL, 1789388244879, '2026-09-14 17:43:15.686613+05:30', '2026-09-14 17:43:15.686613+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789388079048', 'REN-0000052', 'veh-b01', '01-0001', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Jenis', '0770692088', '891640862V', NULL, '0.00', 1789389753664, 1789389779020, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":100,"totalAmount":100,"totalMinutes":1,"every30MinRate":50,"every30MinCount":0,"firstHourAmount":100,"next30MinAmount":0,"every30MinAmount":0,"firstHourMinutes":1,"durationFormatted":"1 min","continuingHoursCount":0,"continuingHoursAmount":0}'::jsonb, '100.00', 'Jenish', 'cash', '100.00', NULL, 1789389779020, '2026-09-14 17:44:39.900232+05:30', '2026-09-14 17:44:39.900232+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789387784720', 'REN-0000048', 'veh-b03', '01-0003', 'type-bicycle-boys', '01 - Bicycle - Boys', 'bicycle', 'Dr. Nadeesha', '+94718920597', '948570335V', NULL, '0.00', 1789387784720, 1789393459937, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":95,"every30MinRate":50,"every30MinCount":2,"firstHourAmount":100,"next30MinAmount":100,"every30MinAmount":100,"firstHourMinutes":60,"durationFormatted":"1 hr 35 mins","continuingHoursCount":1,"continuingHoursAmount":100}'::jsonb, '200.00', 'Jenish', 'cash', '200.00', NULL, 1789393459937, '2026-09-14 17:39:46.255846+05:30', '2026-09-14 17:39:46.255846+05:30') ON CONFLICT DO NOTHING;
INSERT INTO public."rentals" ("id", "rental_number", "vehicle_id", "vehicle_serial_number", "vehicle_type_id", "vehicle_type_name", "vehicle_icon", "customer_name", "customer_phone", "customer_nic_passport", "customer_notes", "deposit_amount", "start_time", "end_time", "status", "rate_snapshot", "breakdown", "total_amount", "cashier_name", "payment_method", "amount_received", "change_amount", "completed_at", "created_at", "updated_at") VALUES ('rental-1789387854524', 'REN-0000050', 'veh-g04', '02-0004', 'type-bicycle-girls', '02 - Bicycle - Girls', 'bicycle', 'Dr. Nadeesha', '+94718920597', '948570335V', NULL, '0.00', 1789387854524, 1789393480629, 'completed', '{"firstHour":100,"next30Min":50,"every30Min":50,"continuingHour":100}'::jsonb, '{"subtotal":200,"totalAmount":200,"totalMinutes":94,"every30MinRate":50,"every30MinCount":2,"firstHourAmount":100,"next30MinAmount":100,"every30MinAmount":100,"firstHourMinutes":60,"durationFormatted":"1 hr 34 mins","continuingHoursCount":1,"continuingHoursAmount":100}'::jsonb, '200.00', 'Jenish', 'cash', '200.00', NULL, 1789393480629, '2026-09-14 17:40:55.53734+05:30', '2026-09-14 17:40:55.53734+05:30') ON CONFLICT DO NOTHING;

