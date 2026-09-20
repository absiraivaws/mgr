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
│   │   ├── MGRPaymentModal.tsx       # Multi-option checkout modal (Cash, LankaQR, Card / POS)
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
│   └── auth.ts                       # Persona authorization (passenger, owner, admin) & password hashing
└── lib/
    ├── supabase.ts                   # Supabase client connection
    ├── lankaqr.ts                    # LankaQR payment generation & status listeners
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
| `mgr-history` | History | `MGRHistoryView` | **All Users (Passenger, Owner, Admin)** |
| `mgr-fleet` | Fleet & Listings | `MGRFleetView` | Owners & Admin |
| `mgr-customers` | Customers | `MGRCustomersView` | **Admin Only** (Hidden from Owners & Passengers) |
| `mgr-owners` | Driver / Captain | `MGROwnersDriversView` | Owners & Admin |
| `mgr-routes` | Routes & Schedules | `MGRRoutesView` | Admin Only |
| `mgr-settings` | Settings & SQL | `MGRSettingsView` | Admin Only |
| `mgr-admin` | Marketplace Admin | `MGRMarketplaceAdminView` | Admin Only |

### Top System Switcher Access (Bicycle POS, MGR Transport, PRH Rental)
- **Administrator Access**:
  - Administrators (`role: 'admin'`, `DEFAULT_USER`, `admin@mannargreenride.lk`, `absiraiva@gmail.com`) have full access to switch between all systems at the top of the screen:
    - **Bicycle POS**
    - **MGR Transport**
    - **PRH Rental Hub**
  - Side-menus and permissions dynamically adjust to the active module and the administrator's authorized role privileges.
- **Passenger & Owner Scoping**:
  - Non-admin Passenger and Owner personas are locked to the MGR Transport module and display a dedicated role badge instead of the switcher.

### Admin Side-Menu Navigation Stability
- In `src/App.tsx`, `rolePersona` and `applyMGRTab` evaluate `activeUser.role === 'admin'`, `isMGRTransportAdmin`, and `DEFAULT_USER` to guarantee that administrator accounts always have full, unimpeded access to all tabs.
- `applyMGRTab` unconditionally updates the active tab state (`setMgrActiveTab`), preventing silent drop of tab selection events.

### Customer Tab Privacy Rule
- The **"Customers"** side-menu tab (`mgr-customers`) is strictly restricted to **Admin Only**.
- In `Navbar.tsx`: `show: isAdminUser` hides the link for owners and passengers.
- In `App.tsx`: Owners attempting to navigate to `mgr-customers` are automatically redirected to `mgr-fleet`.
- In `roleRouting.ts`: `mgr-customers` is excluded from `OWNER_TABS`.
- In `MGRBookingHub.tsx`: An explicit guard displays an *Access Restricted* banner if non-admin users attempt direct access.

---

## 4. Strict Authentication, Password Security & Recovery Architecture

### 1. Root Cause Analysis: Why Admin Password Failed
1. **Cloud Supabase vs. Local Seed Disconnect**:
   - `admin@mannargreenride.lk` (seed password: `admin123`) is pre-configured locally in the application seed registry (`SEED_PASSWORDS`).
   - When attempting login, `authenticateUser` first delegates authentication to Supabase Cloud Auth via `supaAuth.auth.signInWithPassword`.
   - For any account that does not exist in the remote Supabase `auth.users` cloud table, Supabase returns the generic error message `"Invalid login credentials"`.
   - In the prior turn, an early exit checking `if (errMsg.includes('invalid login credentials')) return { success: false }` intercepted the flow **before** checking the local seed credentials, inadvertently blocking the admin seed account.
2. **Resolution**:
   - When Supabase rejects credentials (or when operating in offline/local mode), the system immediately performs a strict cryptographic check via `verifyLocalPassword(normalizedEmail, password)` against:
     1. The locally stored SHA-256 password hash (`v_pwd_hash_{email}`).
     2. The verified seed accounts registry (`SEED_PASSWORDS`).
   - If the password matches, login is approved and session is initialized.
   - If the password does NOT match, the attempt is strictly rejected. **No arbitrary password or key is ever accepted.**

### 2. Root Cause Analysis: "Auth Session Missing!" in Password Recovery
1. **URL Hash Parsing Defect**:
   - The password recovery link dispatched by Supabase created a URL with multiple hash delimiters:
     `http://localhost:9898/#type=recovery#access_token=eyJhbGciOi...`
   - Standard browser `URLSearchParams` splits query parameters on `&`. When presented with a second `#`, it failed to parse `access_token`, resulting in `null`.
   - Consequently, `supaAuth.auth.setSession` was never executed upon modal mount.
   - When the user clicked "Save New Password", calling `supaAuth.auth.updateUser` failed with the Supabase error `"Auth session missing!"`.
2. **Resolution**:
   - In `App.tsx` and `PasswordResetModal.tsx`, hash tokens are normalized before parsing:
     `const cleaned = window.location.hash.replace(/^#+/, '').replace(/#/g, '&');`
   - `supaAuth.auth.setSession` is awaited prior to calling `updateUser`.
   - `changePassword(newPassword, targetEmail)` accepts the target user email (e.g. `absiraiva@gmail.com`).
   - Regardless of whether the remote Supabase cloud session is active or expired, the new password's cryptographic SHA-256 hash is immediately stored locally via `storeLocalPasswordHash(targetEmail, newPassword)`, allowing the user to sign in immediately with their new password without being locked out.

### 3. Branding & Sign-In View
- The sign-in portal header in `LoginPage.tsx` displays:
  **"Passenger & Owner Sign In"** (redundant "Cashier, Staff, " label has been removed).

---

## 5. Multi-Option Payment & Checkout Modal (`MGRPaymentModal`)

When a passenger or administrator clicks the **"Pay Now"** button on an approved booking request in `MGRTransportBooking.tsx`, the system opens `MGRPaymentModal`:

### 1. Booking Summary Breakdown (Bicycle POS Pattern)
- Displays Route (`From ➔ To`), Travel Date, Travel Time, Vehicle Category, Seat Count, Passenger Name, and Contact Number.
- Financial Breakdown:
  - Base Operator Fare
  - Convenience / Platform Fee
  - **Total Amount Due: Rs. {finalAmount}**

### 2. Payment Method Options
The user can select between three payment modes:
1. **Cash**:
   - Key-in input for "Cash Received" (without up/down spinner arrows).
   - Quick Cash Presets: `Exact Amount`, `+Rs. 500`, `+Rs. 1,000`, `+Rs. 2,000`, `+Rs. 5,000`.
   - Real-time "Change Due" display: highlights in emerald when sufficient, or provides an amber warning if underpaid.
   - Cash receipt / payment reference note.
2. **LankaQR**:
   - Instant dynamic LankaQR generation via `createLankaQrPayment` (or local compliant EMVCo fallback image via `QRCode.toDataURL`).
   - Displays Merchant Name, Reference Code, Amount, and supported banking apps (ComBank Q+, BOC SmartPay, Sampath WePay, Frimi, iPay).
   - Real-time payment verification subscription listener.
   - Simulation / verification trigger for local testing.
3. **Card / POS**:
   - Card Network selector: Visa, Mastercard, Amex.
   - POS Terminal Slip / Authorization Code input.
   - Optional last 4 digits input.
   - Guidance for counter/pos card processing.

### 3. Payment Confirmation Lifecycle
- Clicking "Confirm Payment" updates the request status to `confirmed` and payment status to `paid`.
- Generates standard reference identifiers (`CASH-MGR-...`, `QR-LKP-...`, `CARD-...`).
- Persists to Supabase `transport_bookings` and blocks vehicle availability for the booked date.

---

## 6. Fleet View Tab Scoping & Owner View Customization (`MGRFleetView`)

### Removal of Status Filter Tabs for Fleet / Boat Owner
- The status filter tabs:
  - **"All Fleet"**
  - **"Approved & Active"**
  - **"Pending Approval"**
  - **"Maintenance"**
  are **exclusively visible to System Administrators and Staff** (`isStaffOrAdmin`).
- When a Fleet / Boat Owner logs in (`role: 'owner'`), these status tabs are completely removed from the view.
- Fleet Owners see their complete roster of owned vehicles directly, without redundant filter tabs cluttering their vehicle listings.

---

## 7. MGR Transport History Archive (`MGRHistoryView`)

### 1. Unified Booking History Scope
The **"History"** side-menu tab (`mgr-history`) provides a centralized, transparent booking archive accessible to **all users** with role-tailored scoping:
- **Passenger**: Displays only their personal booking requests and confirmed trip journeys.
- **Fleet / Boat Owner**: Displays bookings requested and fulfilled for their owned vehicles/boats.
- **System Administrator**: Full marketplace archive across all passengers, owners, and operators.

### 2. Status Classification & Color Coding
History records are classified and rendered with distinct visual badges:
1. **Completed / Confirmed** (`bg-emerald-50 text-emerald-700 border-emerald-300`):
   - Fully settled journeys, paid bookings, and confirmed trips.
2. **Date Passed** (`bg-slate-100 text-slate-700 border-slate-300`):
   - Bookings whose scheduled `travelDate` is before today (`travelDate < todayStr`) and remained unpaid or unfulfilled.
3. **Pending Approval** (`bg-amber-50 text-amber-700 border-amber-300`):
   - Active booking requests awaiting operator or admin review.
4. **Awaiting Payment** (`bg-sky-50 text-sky-700 border-sky-300`):
   - Operator-accepted quotes currently on hold awaiting passenger payment settlement.
5. **Cancelled / Rejected** (`bg-rose-50 text-rose-700 border-rose-300`):
   - Declined quotes or cancelled requests.

### 3. Action Capabilities
1. **View Full Details (`<Eye />`)**:
   - Available to **all users**.
   - Displays a comprehensive modal with complete journey specs: Route (`From ➔ To`), Travel Date & Departure Time, Passenger Details, Vehicle & Operator specs, Total Amount Due, Payment Status, Payment Method (Cash, LankaQR, Card/POS), Reference #, and Notes.
2. **Admin-Only Delete Action (`<Trash2 />`)**:
   - Exclusively visible to **Administrators** (`isAdminUser`).
   - Opens a deletion confirmation dialog: `Permanently Delete Booking Record?`.
   - On confirmation, immediately removes the record from `localStorage` (`mgr_transport_v2_requests`, `mgr_transport_bookings`) and purges the row from Supabase (`mgr_transport_requests`, `transport_bookings`).
   - Non-admin users (Passenger, Owner) cannot view or trigger deletion.

### 4. Live Search, Filters & Interactive Sorting
- **Global Search**: Search across any field: Request/Booking ID, Route Origin/Destination, Passenger Name, Phone, Email, Vehicle Name, Registration Number, Operator Name, and Payment Reference.
- **Multi-Dimensional Filters**:
  - Status Category: All, Completed, Date Passed, Pending Approval, Awaiting Payment, Cancelled.
  - Vehicle Type: All, Cars, Vans, Buses, Boats, Safari 4x4.
  - Payment Status: All, Paid, Pending Payment.
  - Timeline: All Dates, Past Trips, Today, Upcoming Trips.
- **Interactive Sorting**:
  - Every column header features an interactive sort toggle with **Up and Down icons** (`<ChevronUp />`, `<ChevronDown />`, `<ChevronsUpDown />`):
    - Booking Number (`bookingNumber`)
    - Travel Date & Time (`travelDate`)
    - Route (`routeFrom`)
    - Passenger (`passengerName`)
    - Vehicle & Reg # (`vehicleName`)
    - Fare & Payment (`fareAmount`)
    - Status Category (`computedCategory`)

---

## 8. Zero Hardcoded Data Policy & Clean State Initialization

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

## 9. Driver & Captain Roster Management (`MGROwnersDriversView`)

### Owner Edit Permissions
Owners have full authorization to modify and update their drivers and captains directly from the **Driver & Captain Roster**:
- **Active Edit Button**: The edit button (`<Edit2 />`) is permanently enabled for both Owners and Admins (lock icon removed for owners).
- **Comprehensive Edit Modal**:
  - Full Name, Driver Type (Road Driver vs Boat Captain), NIC/Passport, Mobile, WhatsApp, Address, Licence Number, Licence Class, Licence Expiry, and Assigned Vehicle dropdown.
- **Persistence**: Edits trigger `onEditDriver`, immediately updating state in `MGRBookingHub.tsx`, saving to `localStorage`, and upserting to the Supabase `transport_drivers` table.

---

## 10. Availability Calendar Past Date Protection (`MGRFleetView`)

### Protection Rules
Owners cannot set vehicle availability or schedule trips for dates before the current date:
1. **Local Calendar Date Baseline**:
   - Current date is evaluated using the Sri Lanka standard time zone (`Asia/Colombo`).
2. **Visual & Interaction State in Calendar Grid**:
   - Days where `dateStr < todayStr` are styled as disabled:
     `bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-60 line-through`
   - Tooltip indicates: `Cannot mark availability: {dateStr} is in the past`.
3. **Popup Alert on Past Date Click**:
   - Clicking a past date triggers a popup alert:
     `Cannot mark availability for past dates ({dateStr}). Availability can only be set for today ({todayStr}) or upcoming future dates.`
4. **Month Navigation Boundary**:
   - The `‹ Prev` month button is disabled (`calMonthOffset <= 0`) when viewing the current month.
5. **Planned Trip Schedule Date Constraint**:
   - Date input specifies `min={todayStr}` and form submission validates against past dates.

---

## 11. Verification & Manual Testing Guide

The system is tested and verified locally on `http://localhost:9898`:

1. **Top System Switcher (Admin User Access)**:
   - Log in as an Administrator (`admin@mannargreenride.lk` / `admin123` or `absiraiva@gmail.com`).
   - Notice the top center Module Switcher displaying: **Bicycle POS**, **MGR Transport**, and **PRH Rental Hub**.
   - Click **Bicycle POS**; verify the POS rental counter loads with cashier and bike operations.
   - Click **PRH Rental Hub**; verify the Pesalai tool rental hub loads.
   - Click **MGR Transport**; verify seamless transition back into MGR Transport Marketplace.
   - Log in as a Passenger or Owner; verify the top switcher is hidden and replaced with the locked role badge.
2. **MGR Transport History Side Menu & Table**:
   - In MGR Transport, click the new **"History"** side-menu tab.
   - Verify that the table displays completed bookings, date-passed bookings, and pending bookings.
   - Check that each status has its distinct color badge (Emerald for Completed, Slate for Date Passed, Amber for Pending).
   - Test the Search input: filter by Booking #, Route (e.g. Mannar), or Passenger Name.
   - Test the status filter chips: `All History`, `Completed`, `Date Passed`, `Pending Approval`.
   - Test sorting: click each column header (Booking #, Travel Date, Route, Passenger, Fare, Status) and observe the up and down sort icons toggling.
   - Click the **View (`<Eye />`)** button to view the full details modal.
   - As an Admin, click the **Delete (`<Trash2 />`)** button, confirm the modal, and verify the record is removed.
   - As a Passenger or Owner, verify the Delete button is not visible.
3. **Admin Login & Password Verification**:
   - On `http://localhost:9898`, enter `admin@mannargreenride.lk` with `admin123`.
   - Verify login succeeds immediately.
   - Try logging in with a wrong password (`wrongpass`); verify it is strictly rejected.
4. **Owner Fleet View (Status Filter Tabs Removed)**:
   - Log in as an Owner (`owner@mannargreenride.lk` / `owner123`).
   - Open **Fleet & Listings** (`mgr-fleet`); verify the status filter tabs are removed.
   - Log in as an Admin (`admin@mannargreenride.lk` / `admin123`); verify the status filter tabs are visible.
5. **Multi-Option "Pay Now" Modal**:
   - In "My Bookings", click **"Pay Now"** on an approved request.
   - Select between Cash, LankaQR, and Card/POS options to complete payment.

---

## 12. Top-Level “User Role” Module & Multi-Business Staff Access Architecture

### 1. Architectural Purpose & Overview
To provide comprehensive administrative governance across all three active business domains (**Bicycle POS**, **MGR Transport**, and **PRH Rental Hub**), staff access control and user administration have been elevated to a top-level module called **“User Role”** in the main navigation bar.

```
Top Navigation Bar:
[ Bicycle POS ] [ MGR Transport ] [ PRH Rental Hub ] [ User Role (Admin Only) ]
```

### 2. Administrator-Only Protection
- The **User Role** button is exclusively visible to and accessible by Administrator accounts (`role === 'admin'`, `isRootAdmin`, `DEFAULT_USER`, `admin@mannargreenride.lk`, `absiraiva@gmail.com`).
- Passengers, Fleet Owners, Cashiers, and unauthenticated users cannot see or navigate to the User Role module. Direct attempts to access `user_role` automatically redirect to the user's permitted business view.
- Administrator accounts retain hard-coded permanent privileges for top-menu access and user/role administration (`canManageUsers`, `canManageRoles`) so administrators can never accidentally lock themselves out of the system.

### 3. Dedicated Multi-Business Access Scopes
Inside the **User Role** module (`UserRoleMasterHub.tsx`), administrators can toggle between three dedicated business access tabs:
1. **Bicycle POS (`bicycle_pos`)**:
   - **Top/Main Menu Access**: `accessBicyclePOS`
   - **Side-Menu Access Matrix (Tick Boxes)**:
     - Dashboard (`accessDashboard`)
     - Rental Desk (`accessRentals`)
     - Customers (`accessCustomers`)
     - Message Templates (`accessMessages`)
     - History (`accessHistory`)
     - Rates & Inventory (`accessSettings`)
     - Finance (`accessFinance`)
   - **Operational Privileges**: Start & Process Rentals (`canRent`), Settle Returns & Payments (`canSettle`), Export Reports (`canExportReports`), Edit Pricing (`canEditPricing`), Modify Fleet Inventory (`canEditFleet`), Record Finance Transactions (`canAddFinanceTransaction`), View P&L Statements (`canViewPL`).

2. **MGR Transport (`mgr_transport`)**:
   - **Top/Main Menu Access**: `accessMGRTransport`
   - **Side-Menu Access Matrix (Tick Boxes)**:
     - Dashboard (`accessMGRDashboard`)
     - Find Transport (`accessMGRSearch`)
     - Bookings & Seats (`accessMGRBookings`)
     - History (`accessMGRHistory`)
     - Fleet & Listings (`accessMGRFleet`)
     - Customers (`accessMGRCustomers` — Admin Only by default)
     - Driver / Captain (`accessMGROwners`)
     - Settings & SQL (`accessMGRSettings`)
   - **Operational Privileges**: Manage Transport Fleet (`canEditFleet`), Accept & Confirm Bookings (`canRent`), Collect Trip Payments (`canSettle`), Export Transport Logs (`canExportReports`).

3. **PRH Rental Hub (`prh_rental`)**:
   - **Top/Main Menu Access**: `accessPRHRental`
   - **Side-Menu Access Matrix (Tick Boxes)**:
     - PRH Dashboard (`accessPRHDashboard`)
     - New Rental (`accessPRHNewRental`)
     - Active Rentals (`accessPRHActiveRentals`)
     - Returns & Inspection (`accessPRHReturns`)
     - Customers & Contractors (`accessPRHCustomers`)
     - Equipment & Rates (`accessPRHEquipment`)
     - Inventory / Units (`accessPRHInventory`)
     - Reservations (`accessPRHReservations`)
     - Payments & Deposits (`accessPRHPayments`)
     - PRH Finance & P&L (`accessPRHFinance`)
     - Maintenance Workshop (`accessPRHMaintenance`)
     - Messages / Reminders (`accessPRHReminders`)
     - Reports & Utilisation (`accessPRHReports`)
     - PRH Settings (`accessPRHSettings`)
   - **Operational Privileges**: Dispatch Heavy Equipment (`canRent`), Return Check-In & Deposit Refund (`canSettle`), Manage Machinery Fleet (`canEditFleet`), Set Equipment Rates (`canEditPricing`), Export PRH Reports (`canExportReports`).

### 4. User Accounts & Assigned Role Levels
Moved from the Bicycle POS side menu into the top-level **User Role** module:
- **Staff User Directory Table**:
  - Displays user avatar initials, full name, email, phone number, and active status.
  - Interactive role dropdown allowing instant assignment between Administrator, Store Manager, Cashier POS, and custom roles.
  - Save button per user row and global "Save All Users" action.
  - Edit user details modal (update name, email, phone, and role).
  - Password reset trigger (`onOpenPasswordReset`).
  - Delete user action with confirmation (root admin protected against deletion).
- **Add New Staff User Modal**:
  - Full Name, Email Address, Phone Number, Assigned Role, Initial Password (with visibility toggle).
  - Synchronizes to both local storage and Supabase `user_accounts` table.
- **Custom Role Creation**:
  - Create new roles with custom titles, descriptions, and color tags.

### 5. Bicycle POS Side Menu: Dedicated "Message Templates"
- In the Bicycle POS side navigation (`Navbar.tsx`), the side-menu item previously named "Users & Role" has been renamed to **“Message Templates”** (`<FileText />`).
- Clicking **“Message Templates”** in Bicycle POS opens the dedicated `BicycleMessageTemplatesView.tsx` component.
- Contains the full WhatsApp & SMS automated message template suite:
  - Category filters: *All*, *Birthday Wishes*, *Rental Desk*, *Reminders*, *Marketing & Promos*, *General*.
  - Template search and count indicators.
  - Variable placeholders list (`{{customer_name}}`, `{{vehicle_name}}`, `{{rental_number}}`, `{{total_amount}}`, etc.) with one-click copy tags.
  - Live WhatsApp chat bubble formatted preview.
  - Add Template modal, Edit Template modal, Delete, and Reset to Defaults.
  - Inactivity auto-logout time setting (5 min, 10 min, 15 min, 30 min, 60 min, Disabled).
- Cleanly decoupled from user roles and staff permission matrices.

---

## 13. Verification Checklist for User Role Module

To verify on `http://localhost:9898`:
1. **Admin Access**:
   - Log in as `admin@mannargreenride.lk` (or `absiraiva@gmail.com`).
   - Observe the top switcher: **Bicycle POS | MGR Transport | PRH Rental Hub | User Role**.
2. **Top-Level User Role View**:
   - Click **User Role**.
   - Switch between **Bicycle POS**, **MGR Transport**, and **PRH Rental Hub** tabs.
   - For each business, verify:
     - Section 1: Top Menu Switcher Access toggle per role.
     - Section 2: Side-Menu Access Matrix tick boxes.
     - Section 3: Operational Privileges.
3. **Staff User Directory**:
   - Click **Staff Accounts** in the top right toggle.
   - Verify staff user table with role dropdowns, Add Staff User modal, Edit User, Password Reset, and Delete actions.
4. **Bicycle POS Side Menu**:
   - Switch to **Bicycle POS**.
   - Verify the side menu item is clearly labeled **“Message Templates”** (not "Users & Role").
   - Click **“Message Templates”** and verify the WhatsApp message template manager opens cleanly.
5. **Non-Admin Security Guard**:
   - Log in as a Passenger or Owner.
   - Verify that the **User Role** tab is completely hidden.

---

## 14. User Role Refinements: Light Mode Theme, Side Menu Navigation & Refresh Persistence

### 1. High-Contrast Light Mode Theme (Strict 4-Color Palette)
- **Problem**: In light mode, pale gray text and mixed colors reduced legibility and broke visual consistency with the system design.
- **Solution**:
  - Replaced low-contrast grays with dark, crisp slate typography:
    - Primary Headings: `text-slate-900 font-extrabold`
    - Main Text & Labels: `text-slate-800 font-semibold`
    - Descriptions & Muted Text: `text-slate-600 font-medium`
    - Meta/Subtext: `text-slate-500 font-medium`
    - Table Header Row: `bg-slate-100 text-slate-800 border-slate-200`
    - Card Surfaces: `bg-white border-slate-200 shadow-sm`
  - Enforced the agreed **4-Color Theme** based on the Canva `#26d9bd` Tetradic palette:
    1. **Teal / Emerald (`#26d9bd` / `emerald-600`)**: Brand headers, primary buttons, checked access checkboxes, and positive permission badges.
    2. **Purple (`#7c3aed` / `purple-600`)**: User Role Admin badge, active role indicator, and elevated permission indicators.
    3. **Rose / Red (`#e11d48` / `rose-600`)**: Error messages, destructive delete actions, and danger alerts.
    4. **Lime / Green (`#65a30d` / `green-600`)**: Success confirmations and active user status indicators.
  - Eliminated mixed, random, or rainbow accent colors (no blue, orange, amber, or yellow).

### 2. Removal of Redundant Business Buttons
- Removed the horizontal toggle buttons (`Bicycle POS`, `MGR Transport`, `PRH Rental Hub`) from inside the `UserRoleMasterHub` console.
- Eliminated visual clutter and duplication of controls.

### 3. Existing Side-Menu Navigation for Multi-Business User Roles
- Navigating the **User Role** module uses the existing side menu:
  - **Bicycle POS Access** (`id: 'bicycle_pos'`)
  - **MGR Transport Access** (`id: 'mgr_transport'`)
  - **PRH Rental Access** (`id: 'prh_rental'`)
- Selecting any side-menu item dynamically updates `activeBusiness`, displaying that specific business's:
  1. **Top/Main Menu Switcher Access**: Role-based visibility in the top navigation bar.
  2. **Side-Menu Tab Access Matrix**: Granular tick-box matrix for all tabs of that business.
  3. **Operational Privileges**: Action-level permissions (e.g., dispatch, refunds, fleet management, discounts).
  4. **Staff Accounts & Role Assignments**: User role assignment table and custom role creator.

### 4. Session & Current View Preservation on Refresh
- **Root Cause of Refresh Redirection**:
  - `currentUser` state was previously not maintaining persistent session hydration on page refresh in some components.
  - A previous route effect was unconditionally calling `setSystemMode('mgr_booking')` and redirecting any admin user to `/admin/dashboard` whenever the browser reloaded.
- **Unified Route & State Resolution**:
  - `getCurrentUser()` restores the authenticated user from `localStorage` (`v_rental_current_user`).
  - `isFullLoginPage` is initialized to `!getCurrentUser()`, preventing the login screen from ever appearing on page refresh.
  - Created `parseAppRoute` in `src/utils/roleRouting.ts` to parse all 4 business modules and their tabs:
    - `/user-role/:tab` (`/user-role/bicycle-pos`, `/user-role/mgr-transport`, `/user-role/prh-rental`)
    - `/bicycle-pos/:tab` (`/bicycle-pos/rentals`, `/bicycle-pos/history`, `/bicycle-pos/message-templates`, etc.)
    - `/prh-rental/:tab` (`/prh-rental/dashboard`, `/prh-rental/inventory`, `/prh-rental/returns`, etc.)
    - `/:persona/:tab` (`/admin/dashboard`, `/passenger/search`, `/owner/fleet`, etc.)
  - On browser refresh (CMD+R or F5):
    - User remains completely logged in.
    - Router parses the exact URL.
    - System restores the **same URL, same business module, same tab, and same view**.
    - No redirect to another module, dashboard, or default page occurs.
    - Login page is only shown if the user explicitly signs out (`handleLogout`) or if session data is genuinely invalid.

