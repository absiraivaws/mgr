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
│   │   ├── MGROwnersDriversView.tsx  # Owner & driver rosters with active edit actions
│   │   ├── MGRRoutesView.tsx         # Route master & schedule definitions
│   │   ├── MGRDashboardView.tsx      # Transport analytics & KPI summary
│   │   ├── MGRMarketplaceAdminView.tsx # Admin compliance & approval console
│   │   └── MGRSettingsView.tsx       # Convenience fee % & marketplace configuration
│   ├── Navbar.tsx                    # Side-menu navigation tabs (role-guarded)
│   └── LoginPage.tsx                 # Dual role registration & direct credential sign-in
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

## 3. Side-Menu Navigation Tabs & Persona Access Control

The module provides full role-scoped side-menu tabs, routed through `MGRBookingHub.tsx` and `Navbar.tsx`:

| Tab Identifier | Label | Target Component / View | Persona Access |
|---|---|---|---|
| `mgr-dashboard` | Dashboard | `MGRDashboardView` | Admin Only |
| `mgr-search` | Find Transport | `MGRTransportBooking (view="search")` | Passengers & Admin |
| `mgr-bookings` | My Bookings | `MGRTransportBooking (view="requests")` | Passengers & Admin |
| `mgr-fleet` | Fleet & Listings | `MGRFleetView` | Owners & Admin |
| `mgr-customers` | Customers | `MGRCustomersView` | **Admin Only** (Hidden from Owners & Passengers) |
| `mgr-owners` | Driver / Captain | `MGROwnersDriversView` | Owners & Admin |
| `mgr-routes` | Routes & Schedules | `MGRRoutesView` | Admin Only |
| `mgr-settings` | Settings & SQL | `MGRSettingsView` | Admin Only |
| `mgr-admin` | Marketplace Admin | `MGRMarketplaceAdminView` | Admin Only |

### Customer Tab Privacy Rule
- The **"Customers"** side-menu tab (`mgr-customers`) is strictly restricted to **Admin Only**.
- In `Navbar.tsx`: `show: isAdminUser` hides the link for owners and passengers.
- In `App.tsx`: Owners attempting to navigate to `mgr-customers` are automatically redirected to `mgr-fleet`.
- In `MGRBookingHub.tsx`: An explicit guard displays an *Access Restricted* banner if non-admin users attempt direct access.

---

## 4. Zero Hardcoded Data Policy & Clean State Initialization

All legacy mock/hardcoded demo records have been completely purged from MGR Transport:
1. **`src/data/mgrInitialData.ts`**:
   - `INITIAL_OWNERS = []`
   - `INITIAL_VEHICLES = []`
   - `INITIAL_DRIVERS = []`
   - `INITIAL_ROUTES = []`
   - `INITIAL_SCHEDULES = []`
   - `INITIAL_BOOKINGS = []`
   - `INITIAL_REQUESTS = []`
2. **Client-Side Cache Migration in `MGRBookingHub.tsx`**:
   - On state initialization from `localStorage`, any residual legacy mock IDs matching `OWN-MGR-0000`, `MGR-CAR-0000`, `DRV-MGR-0000`, `ROUTE-00`, `SCH-00`, or `BK-00` are automatically filtered out and purged.
   - Clean tables guarantee that newly added records represent genuine user submissions synced directly to Supabase.

---

## 5. User Registration & Password Lifecycle Policy

### Direct Sign-In Without Forced Password Change
- **Registration Flag (`must_change_password: false`)**:
  - In `src/utils/auth.ts` (`registerNewUser`), newly registered accounts (whether Passenger or Vehicle/Boat Owner) are explicitly created with `must_change_password: false` in Supabase Auth user metadata, local storage, and the `user_accounts` table.
- **Login Flow (`LoginPage.tsx`)**:
  - When registration succeeds, the UI transitions cleanly to the Sign-In view with the registered email prefilled and displays a clear confirmation notice: `Account registered successfully! You can now log in using your registered email: {email}`.
  - The user can immediately enter their password and log in.
- **Elimination of Forced Reset on Regular Login**:
  - Regular login in `App.tsx` does **not** trigger the forced `PasswordResetModal`.
  - Password change is strictly reserved for:
    1. **"Forgot Password" flow**: When a user requests a recovery link from the login page, clicking the emailed link opens the password reset modal with recovery token validation.
    2. **User Profile Settings**: When an authenticated user deliberately selects "Change Password" from the application settings/profile menu.

---

## 6. Driver & Captain Roster Management (`MGROwnersDriversView`)

### Owner Edit Permissions
Owners have full authorization to modify and update their drivers and captains directly from the **Driver & Captain Roster**:
- **Active Edit Button**: The edit button (`<Edit2 />`) is permanently enabled for both Owners and Admins (lock icon removed for owners).
- **Comprehensive Edit Modal**:
  - **Full Name**: Editable string.
  - **Driver Type**: Selectable between `Driver (Road Vehicles)` and `Captain (Boat & Ferry)`.
  - **NIC / Passport Number**: Editable national identification string.
  - **Mobile Phone**: Required contact number.
  - **WhatsApp Number**: Optional override (defaults to mobile).
  - **Residential Address**: Editable street/town location.
  - **Licence Number & Class**: Editable licence credentials.
  - **Licence Expiry Date**: HTML date selector.
  - **Assigned Vehicle**: Dropdown list dynamically populated with the owner's registered vehicles.
  - **Status**: Editable by Admin (`verified`, `pending`, `rejected`); displayed as badge for owners.
- **Persistence**: Edits trigger `onEditDriver`, immediately updating state in `MGRBookingHub.tsx`, saving to `localStorage`, and upserting to the Supabase `transport_drivers` table.

---

## 7. Availability Calendar Past Date Protection (`MGRFleetView`)

### Protection Rules
Owners cannot set vehicle availability or schedule trips for dates before the current date:
1. **Local Calendar Date Baseline**:
   - Current date is evaluated using the Sri Lanka standard time zone:
     ```ts
     const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' });
     ```
2. **Visual & Interaction State in Calendar Grid**:
   - Days where `dateStr < todayStr` are styled as disabled:
     `bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-60 line-through`
   - Tooltip indicates: `Cannot mark availability: {dateStr} is in the past`.
3. **Popup Alert on Past Date Click**:
   - If an owner clicks a disabled past date, `handleToggleTripDate` halts execution and triggers a popup alert:
     `Cannot mark availability for past dates ({dateStr}). Availability can only be set for today ({todayStr}) or upcoming future dates.`
4. **Month Navigation Boundary**:
   - The `‹ Prev` month button is disabled (`calMonthOffset <= 0`) when viewing the current month, preventing owners from scrolling into bygone calendar months.
5. **Planned Trip Schedule Date Constraint**:
   - In the "+ Add New Schedule Date" form, the date input specifies `min={todayStr}`.
   - Form submission explicitly verifies `if (schedDate < todayStr)` and alerts the user if a past date is submitted.

---

## 8. Standard Unique Numbering Scheme

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

---

## 9. Global Numeric Input Controls

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

## 10. Vehicle Fleet Management & Schedule Availability (`MGRFleetView`)

- **Fleet Registry**: Dedicated "Unique Number" column displaying `MGR-VEH-0000001`.
- **Comprehensive View & Edit Modals**: All 20+ vehicle specifications (Registration, Type, Make, Model, Year, Fuel, Color, AC, Seats, Luggage, Driver Option, Status, Base Price, Day Rate, Per-Seat Fare, Insurance Expiry, Revenue Licence Expiry, Photos) are fully visible and editable.
- **Schedule Availability Seat Formula**:
  $$\text{Available Seats} = \text{Total Seats} - \text{Reserved Seats}$$
  - In the "Schedule Availability: [Reg#]" modal, owners specify both "Total Capacity" and "Reserved Seats".
  - The system dynamically computes and displays Available Seats in real time.
  - Changes are saved directly into the vehicle's `schedules` array and persisted.

---

## 11. Passenger Booking Flows & Conflict Validation

### 11.1. Reserve Seats (Schedule Direct Booking)
- **Operator Fixed Route Display (Read-Only)**: The operator's fixed scheduled route is displayed in a locked card:
  - From Location: `requestingListing.plannedFrom` (read-only)
  - To Location: `requestingListing.plannedTo` (read-only)
  - Departure: Date & Time (read-only)
- **Customer Boarding & Drop-Off Input**:
  - Customer Pickup Location: Editable text input for passenger boarding stop.
  - Customer Drop-off Location: Editable text input for passenger drop-down point along the route.
- **Capacity Enforcement**: Seat count input is bounded by Available Seats ($1 \le N \le \text{Available Seats}$).
- **Instant Confirmation**: Confirms booking with status `confirmed`, generates `MGR-BK-0000001`, and updates seat inventory.

### 11.2. Book Trip (Charter / Whole Vehicle Request)
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

## 12. Supabase Persistence & Database Synchronization

Data flows directly to and from Supabase:

| Application Entity | Remote Supabase Table | Primary Key | Key Fields |
|---|---|---|---|
| Vehicles | `transport_vehicles` | `id` (text) | `unique_code`, `owner_id`, `registration_number`, `make`, `model`, `type`, `booking_type`, `schedules`, `available_dates` |
| Owners | `transport_owners` | `id` (text) | `unique_code`, `full_name`, `mobile_number`, `whatsapp_number`, `nic_passport`, `business_name`, `bank_details` |
| Drivers | `transport_drivers` | `id` (text) | `unique_code`, `owner_id`, `full_name`, `mobile`, `whatsapp`, `nic`, `licence_number` |
| Bookings | `transport_bookings` | `id` (text) | `unique_code`, `request_number`, `vehicle_id`, `passenger_name`, `travel_date`, `seat_count`, `final_amount`, `request_status` |
| Routes | `transport_routes` | `id` (text) | `unique_code`, `name`, `origin`, `destination`, `distance_km` |
| Customers | `customers` | `id` (text) | `name`, `phone`, `whatsapp_number`, `nic_passport`, `address`, `status` |

---

## 13. Verification & Manual Testing Guide

The system is tested and verified locally on `http://localhost:9898`:

1. **Zero Hardcoded Data Verification**:
   - Open `http://localhost:9898`.
   - In MGR Transport, verify all mock data (`OWN-MGR-0000`, `MGR-CAR-0000`, etc.) is absent.
   - Verify tables start completely clean without ghost records.
2. **Customer Side-Menu Access**:
   - Log in as an Owner persona.
   - Verify the "Customers" tab (`mgr-customers`) is **not** displayed in the side navigation menu.
   - Log in as an Admin persona; verify "Customers" is visible and accessible.
3. **New User Registration & Direct Login**:
   - On `http://localhost:9898`, click "Register as Passenger or Driver".
   - Select role (Passenger or Owner), fill required fields, and submit.
   - Verify the UI switches to the Sign-In tab with email prefilled.
   - Sign in using the registered email and password.
   - Verify the user logs in immediately **without** any password reset popup.
4. **Driver & Captain Roster Editing by Owner**:
   - Log in as an Owner.
   - Navigate to the "Driver" (`mgr-owners`) tab.
   - In the "Driver & Captain Roster", verify the "Edit" button (`<Edit2 />`) is clickable.
   - Modify fields (Full Name, Type, NIC, Mobile, Licence Expiry, Assigned Vehicle) and click "Save Changes".
   - Confirm table updates immediately and persists upon reload.
5. **Owner Availability Calendar Past Date Restrictions**:
   - Log in as an Owner, navigate to "Fleet & Listings" (`mgr-fleet`), and click "Availability" on any vehicle.
   - In the Trip Availability calendar, verify dates before today are styled with disabled line-through appearance.
   - Click any past date: verify that the date is **not** selected and an alert popup is displayed (`Cannot mark availability for past dates...`).
   - Verify the `‹ Prev` month button is disabled when viewing the current month.
   - Under "+ Add New Schedule Date", verify the date picker cannot select past dates (`min={todayStr}`).
