# MGR Transport System — Architecture & Developer Documentation

## 1. Overview & System Purpose

The **MGR Transport Module** (`systemMode === 'mgr_booking'`) is a multi-modal transport and boat booking marketplace integrated into Cycly Rent. It connects passengers with verified transport operators and vehicle/boat owners across Sri Lanka, supporting two primary listing modalities:
1. **Schedule / Planned Trip (`listingMode: 'schedule'`)**: Fixed route/scheduled departures with per-seat pricing, reserved seat capacity calculations, and instant seat confirmation.
2. **Trip Booking (`listingMode: 'trip'`)**: Full vehicle or chartered hire with custom routes, interactive calendar availability painting, and double-booking conflict prevention.

---

## 2. Core Architecture & Component Map

All transport views and actions are located under `src/components/mgr-booking/` and governed by the side-menu navigation tabs:

```
src/
├── components/
│   ├── mgr-booking/
│   │   ├── MGRBookingHub.tsx         # Master tab orchestrator, Supabase sync & persistence hub
│   │   ├── MGRTransportBooking.tsx   # Search, direct bookings, trip requests, availability calendar
│   │   ├── MGRFleetView.tsx          # Vehicle registry, specs, photos, schedule availability formula
│   │   ├── MGRCustomersView.tsx      # Unified Customers, Owners, Drivers directory with role filter
│   │   ├── MGROwnersDriversView.tsx  # Owner & driver rosters with verification
│   │   ├── MGRRoutesView.tsx         # Route master & schedule definitions
│   │   ├── MGRDashboardView.tsx      # Transport analytics & KPI summary
│   │   ├── MGRMarketplaceAdminView.tsx # Admin compliance & approval console
│   │   └── MGRSettingsView.tsx       # Convenience fee % & marketplace configuration
│   └── Navbar.tsx                    # Side-menu navigation tabs including "Customers"
├── types/
│   ├── mgrBooking.ts                 # Fleet, Owner, Driver, Customer, Schedule interfaces
│   └── mgrTransportV2.ts             # Listing, Booking Request, Calendar, and FIFO interfaces
├── utils/
│   ├── mgrUniqueId.ts                # Standard 7-digit unique numbering generators & formatters
│   ├── mgrTransportNotifications.ts  # WhatsApp & lifecycle notification dispatchers
│   └── auth.ts                       # Persona authorization (passenger, owner, admin)
└── lib/
    ├── supabase.ts                   # Supabase client connection
    └── mgr-booking-schema.sql        # Database schema for remote tables
```

---

## 3. Side-Menu Navigation Tabs

The module provides full role-scoped side-menu tabs, routed through `MGRBookingHub.tsx`:

| Tab Identifier | Label | Target Component / View | Persona Access |
|---|---|---|---|
| `mgr-dashboard` | Dashboard | `MGRDashboardView` | All personas |
| `mgr-search` | Find Transport | `MGRTransportBooking (view="search")` | All personas |
| `mgr-bookings` | My Bookings | `MGRTransportBooking (view="requests")` | All personas |
| `mgr-customers` | Customers | `MGRCustomersView` | Owners & Admins |
| `mgr-fleet` | Transport Fleet | `MGRFleetView` & `MGRTransportBooking (view="owner-listings")` | Owners & Admins |
| `mgr-routes` | Routes & Schedules | `MGRRoutesView` | Admin Only |
| `mgr-owners` | Owners & Drivers | `MGROwnersDriversView` | Owners & Admins |
| `mgr-requests` | Booking Requests | `MGRTransportBooking (view="requests")` | Owners & Admins |
| `mgr-settings` | Transport Settings | `MGRSettingsView` | Admin Only |
| `mgr-admin` | Marketplace Admin | `MGRMarketplaceAdminView` | Admin Only |

---

## 4. Standard Unique Numbering Scheme

All entities in MGR Transport are assigned a standardized, zero-padded 7-digit unique reference identifier (`PREFIX-0000001`):

| Entity | Unique ID Pattern | Formatter Function (`mgrUniqueId.ts`) | Table Column Header |
|---|---|---|---|
| Customer | `MGR-CUS-0000001` | `formatCustomerCode(index, id)` | Unique Number |
| Owner | `MGR-OWN-0000001` | `formatOwnerCode(index, id)` | Unique Number |
| Driver | `MGR-DRV-0000001` | `formatDriverCode(index, id)` | Unique Number |
| Vehicle | `MGR-VEH-0000001` | `formatVehicleCode(index, id)` | Unique Number / Ref ID |
| Booking | `MGR-BK-0000001` | `formatBookingCode(index, id)` | Request # / Ref ID |
| Schedule | `MGR-SCH-0000001` | `formatScheduleCode(index, id)` | Schedule Ref / ID |
| Route | `MGR-RT-0000001` | `formatRouteCode(index, id)` | Route ID |

Every table across MGR Transport displays this unique reference code in its own dedicated column for unambiguous indexing and searching.

---

## 5. Unified "Customers" Directory (`MGRCustomersView`)

The new "Customers" tab (`mgr-customers`) consolidates Customers, Owners, and Drivers into a single directory:
- **Dedicated Unique Number Column**: Displays `MGR-CUS-0000001`, `MGR-OWN-0000001`, or `MGR-DRV-0000001`.
- **In-Table Role Filter**: A styled filter dropdown directly in the "Role" table column header allows instant filtering by `All`, `Customer`, `Owner`, or `Driver`.
- **WhatsApp No Auto-Suggestion**: When entering the Handphone/Mobile number, the WhatsApp field is automatically populated with the same value. The user can freely edit or override the WhatsApp number independently.
- **Comprehensive View & Edit Modals**:
  - Clicking "View" displays all entity fields (Name, Phone, WhatsApp, NIC/Passport, Address, Business Reg, Bank Details, Licence Info, Emergency Contacts, Creation Timestamps).
  - Clicking "Edit" opens a full modal allowing every field to be updated and persisted to state and Supabase.

---

## 6. Global Numeric Input Controls

Up/down arrow spinners in numeric input windows have been globally removed across the application using CSS rules in `src/index.css`:
```css
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
}
```

---

## 7. Vehicle Fleet Management & Schedule Availability (`MGRFleetView`)

- **Fleet Registry**: Dedicated "Unique Number" column displaying `MGR-VEH-0000001`.
- **Comprehensive View & Edit Modals**: All 20+ vehicle specifications (Registration, Type, Make, Model, Year, Fuel, Color, AC, Seats, Luggage, Driver Option, Status, Base Price, Day Rate, Per-Seat Fare, Insurance Expiry, Revenue Licence Expiry, Photos) are fully visible and editable.
- **Schedule Availability Seat Formula**:
  $$\text{Available Seats} = \text{Total Seats} - \text{Reserved Seats}$$
  - In the "Schedule Availability: [Reg#]" modal, owners specify both "Total Capacity" and "Reserved Seats".
  - The system dynamically computes and displays Available Seats in real time.
  - Changes are saved directly into the vehicle's `schedules` array and persisted.

---

## 8. Find Transport & Search Results Table (`MGRTransportBooking`)

The search results table (`searchViewMode === 'table'`) provides distinct, separated columns:
1. **Ref ID**: Dedicated column displaying the unique code (`MGR-VEH-0000001` or `MGR-SCH-0000001`).
2. **Vehicle & Photo**: Vehicle photo, make/model, and operator name.
3. **Mode**: Dedicated column displaying a badge for **Trip** (emerald badge) or **Schedule** (blue badge).
4. **Type**: Vehicle category (Car, Van, Bus, Safari, Boat).
5. **Reg #**: Vehicle registration plate.
6. **From ➔ To Location**: Route details or service coverage area.
7. **Seats**: Remaining capacity and total seats.
8. **Driver Option**: Driver requirement (`with_driver`, `without_driver`, `both`).
9. **Action**: "Book Trip" (emerald button) or "Book Schedule" (blue button).

Header filter buttons at the top of the search view allow toggling between All, Trip, and Schedule listings.

---

## 9. Passenger Booking Flows & Validation

### 9.1. Reserve Seats (Schedule Direct Booking)
- **Operator Fixed Route Display (Read-Only)**: The operator's fixed scheduled route is displayed in a locked card:
  - From Location: `requestingListing.plannedFrom` (read-only)
  - To Location: `requestingListing.plannedTo` (read-only)
  - Departure: Date & Time (read-only)
- **Customer Boarding & Drop-Off Input**:
  - Customer Pickup Location: Editable text input for passenger boarding stop.
  - Customer Drop-off Location: Editable text input for passenger drop-down point along the route.
- **Capacity Enforcement**: Seat count input is bounded by Available Seats ($1 \le N \le \text{Available Seats}$).
- **Instant Confirmation**: Confirms booking with status `confirmed`, generates `MGR-BK-0000001`, and updates seat inventory.

### 9.2. Book Trip (Charter / Whole Vehicle Request)
- **Vehicle Availability Mini-Calendar**: An interactive 21-day calendar renders each upcoming day with color-coded status:
  - 🟢 **Green (Available)**: Vehicle is operating and has no conflicting bookings. Clickable to select travel date.
  - 🟡 **Amber (Pending Approval / Held)**: Has a booking request with status `pending_owner` or `awaiting_payment`. Cannot be double-booked.
  - 🔴 **Red (Confirmed Booked)**: Has a confirmed booking (`requestStatus: 'confirmed'`). Cannot be booked.
  - ⚪ **Muted (Unavailable)**: Outside operator's scheduled service days.
- **Double-Booking Conflict Prevention**:
  - If a user selects an Amber or Red date, a warning banner appears explaining the conflict.
  - The "Send Request to Operator" button is disabled whenever the selected date is not available.
  - Submission handler validates against existing requests in state and rejects double bookings.

---

## 10. Supabase Persistence & Database Synchronization

All hardcoded arrays (previously 50 hardcoded vehicles) have been removed. Data flows directly to and from Supabase:

| Application Entity | Remote Supabase Table | Primary Key | Key Fields |
|---|---|---|---|
| Vehicles | `transport_vehicles` | `id` (text) | `unique_code`, `owner_id`, `registration_number`, `make`, `model`, `type`, `booking_type`, `schedules`, `available_dates` |
| Owners | `transport_owners` | `id` (text) | `unique_code`, `full_name`, `mobile_number`, `whatsapp_number`, `nic_passport`, `business_name`, `bank_details` |
| Drivers | `transport_drivers` | `id` (text) | `unique_code`, `owner_id`, `full_name`, `mobile`, `whatsapp`, `nic`, `licence_number` |
| Bookings | `transport_bookings` | `id` (text) | `unique_code`, `request_number`, `vehicle_id`, `passenger_name`, `travel_date`, `seat_count`, `final_amount`, `request_status` |
| Routes | `transport_routes` | `id` (text) | `unique_code`, `name`, `origin`, `destination`, `distance_km` |
| Customers | `customers` | `id` (text) | `name`, `phone`, `whatsapp_number`, `nic_passport`, `address`, `status` |

---

## 11. Verification & Manual Testing Guide

The system is tested and verified locally on `http://localhost:9898`:

1. **Numeric Inputs**: Inspect any number input (seats, price, phone, year) to verify up/down spinner arrows are completely absent.
2. **Customers Tab (`mgr-customers`)**:
   - Access the "Customers" tab from the side menu.
   - Verify the "Unique Number" column (`MGR-CUS-0000001`, `MGR-OWN-0000001`, `MGR-DRV-0000001`).
   - Use the in-table "Role" dropdown filter to filter by Customer, Owner, Driver, and All.
   - Click "Add Customer", type a phone number in "Handphone", and observe "WhatsApp No" auto-suggesting the same number.
   - Click "View" and "Edit" on any row to verify all details display and update correctly.
3. **Transport Fleet (`mgr-fleet`)**:
   - Verify the "Unique Number" column (`MGR-VEH-0000001`).
   - Open "Schedule Availability" on a bus/boat, enter Reserved Seats, and verify Available Seats updates dynamically ($\text{Available} = \text{Total} - \text{Reserved}$).
4. **Find Transport (`mgr-search`)**:
   - In table view, verify separate columns for "Ref ID" and "Mode" (`Trip` / `Schedule`).
   - Click "Book Schedule": Verify the Operator's fixed route is shown as read-only, and customer pickup/drop-off inputs are editable.
   - Click "Book Trip": Verify the mini-calendar displays color-coded availability (Green, Amber, Red, Muted), and conflicting dates prevent double bookings.
