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

---

## 15. User Status Lifecycle, Immediate Access Revocation & Permanent Deletion Security

### 1. User Status Field (`active` | `deactivated` | `suspended`)
- Added `status: UserStatus` field to `UserAccount` with 3 lifecycle states:
  - **`active`**: Full standard access according to assigned business and operational permissions.
  - **`deactivated`**: Immediate and complete revocation of access. Account is locked out across all tabs, blocked from logging in, and blocked from resetting or changing passwords.
  - **`suspended`**: Immediate temporary suspension of access. Menus, modules, and operational privileges are locked with a dedicated notification screen.
- Status changes are tracked with audit metadata:
  - `statusUpdatedAt`: ISO timestamp of the change.
  - `statusUpdatedBy`: Admin identifier who enacted the status change.

### 2. Immediate Multi-Tab Access Revocation
- When an Administrator updates a user's status to **Deactivated** or **Suspended**:
  - `updateUserRoleAndDetails()` updates local storage, syncs the new status to the Supabase `user_accounts` table, and broadcasts a `USER_STATUS_CHANGED` event via `BroadcastChannel('bicycle_pos_channel')`.
  - Open tabs listening to the channel immediately update their user session state.
  - In `App.tsx`, if the current authenticated user is deactivated or suspended:
    - All business modules, side menus, and operational buttons are instantly locked out.
    - A dedicated, high-security **Lockout Screen** is rendered detailing the suspension/deactivation and the timestamp/admin who modified the account.
    - The user is provided a single **Sign Out** button to terminate the session cleanly.
  - In `getUserPermissions()` and `hasPermission()`:
    - If `user.status === 'deactivated'` or `'suspended'`, all permissions evaluate strictly to `false`.

### 3. Permanent User Deletion Security & Prevention of Resurrection
- **Problem**: Previously, deleted default/seed accounts could be re-created upon subsequent application launches due to seed re-hydration routines. Furthermore, deleted users could remain logged into existing sessions or reset their passwords via recovery links.
- **Security Solution**:
  1. **Permanent Deletion Blocklist (`v_rental_deleted_users`)**:
     - `markUserAsDeleted(email)` registers deleted email addresses into a persistent deleted user registry.
     - `getStoredUsers()` filters out any email found in the deleted registry, preventing accounts from ever being re-seeded or resurrected.
  2. **Immediate Session Revocation**:
     - `deleteUserAccount(userId, adminUser)` removes the user from `localStorage`, deletes the cryptographic SHA-256 password hash (`v_pwd_hash_{email}`), and if the target user is currently active in the browser, purges the session.
     - A `USER_DELETED` event is broadcast across `BroadcastChannel('bicycle_pos_channel')`. Any tab running with that user's session immediately logs out and displays the login screen.
  3. **Blocking Password Reset & Password Change**:
     - In `sendStaffPasswordResetEmail()` and `resetUserPassword()`: requests for deleted, deactivated, or suspended emails are strictly rejected with an explicit security error.
     - In `changePassword()`: attempts to set a new password for deleted, deactivated, or suspended accounts are strictly blocked.
     - In `authenticateUser()`: login attempts for deleted accounts or accounts with `deactivated`/`suspended` status are rejected with clear error messages.
  4. **Root Administrator Protection**:
     - The root administrator account (`DEFAULT_USER.email` / `absiraiva@gmail.com`) is protected from deletion or status demotion.

### 4. Edit Staff User Modal Enhancements
- In `UserRoleMasterHub.tsx`:
  - Clearly displays current account status badge using the 4-color palette (Emerald for Active, Rose for Deactivated, Purple for Suspended).
  - Displays audit trail indicating when the status was last changed and by whom.
  - Provides a status dropdown allowing the Administrator to switch between `Active`, `Deactivated`, and `Suspended`.
  - Saves the new status, updates audit timestamps, and dispatches real-time broadcast synchronization.
- In Section 4 (User Accounts Table):
  - Dynamic status badges rendered for each staff member with formatted date subtitles.

### 5. URL & View Persistence on Page Refresh
- URLs like `https://booking.mannargreenride.com/user-role/bicycle-pos` or `http://localhost:9898/user-role/bicycle-pos` persist seamlessly on refresh:
  - `getCurrentUser()` restores the authenticated admin session.
  - `isFullLoginPage` evaluates to `false`.
  - `initialRoute` parses `systemMode: 'user_role'` and `userRoleTab: 'bicycle_pos'`.
  - The view restores immediately with zero flashes of the login screen or error screens, keeping the exact business sub-view intact.

---

## 16. Business-by-Business Access Control, Login Validation & System Email Sender Architecture

### 1. Validate Staff Access at Login
- When a staff user logs in via `LoginPage.tsx`:
  - The system evaluates their assigned permissions and status across all three businesses (`bicycle_pos`, `mgr_transport`, `prh_rental`) via `getAuthorizedBusinesses(user)`.
  - If the user has access to their requested or saved business module, that business is opened.
  - If their saved or current business is deactivated, suspended, or unassigned, the system automatically routes them to their **first authorized, active business**.
  - Within that authorized business, the system automatically navigates to their **first permitted side-menu tab** instead of an arbitrary default.
  - If a staff user has **no active business access** (deactivated or suspended across all modules), the system blocks entry and displays a dedicated **No Active Business Access** lockout screen with an explicit Sign Out button.

### 2. Business-by-Business User Status
- User status is managed and persisted independently per business in `UserAccount`:
  - `businessStatus?: Partial<Record<BusinessScope, UserStatus>>`
  - `businessStatusUpdatedAt?: Partial<Record<BusinessScope, number>>`
  - `businessStatusUpdatedBy?: Partial<Record<BusinessScope, string>>`
- Three independent business scopes:
  1. **Bicycle POS** (`bicycle_pos`)
  2. **MGR Transport** (`mgr_transport`)
  3. **PRH Rental Hub** (`prh_rental`)
- Example scenario: A staff member can be **Active** for Bicycle POS, but **Suspended** or **Deactivated** for MGR Transport.
- Helper functions in `src/utils/auth.ts`:
  - `getUserBusinessStatus(user, business)`: returns the business-specific status (defaults to global status if unconfigured).
  - `canAccessBusiness(user, business)`: returns `true` only if root admin, or user has active business status and at least one tab or business access permission enabled.
  - `getAuthorizedBusinesses(user)`: returns an array of business keys where the user has active status and valid permissions.
- In `getUserPermissions(user)`:
  - If a user's business status for a given business is not `'active'`, all permissions for that specific business are strictly zeroed out / set to `false`.

### 3. Business Access Visibility & Side-Menu Item Filtering
- **Top Module Switcher Filtering**:
  - In `Navbar.tsx`, top switcher buttons (`Bicycle POS`, `MGR Transport`, `PRH Rental Hub`) are conditionally wrapped using `canAccessBusiness(activeUser, scope)`.
  - Staff users only see the tabs for businesses they are actively authorized to access.
  - The `User Role` switcher button is strictly restricted to Administrators.
- **Side-Menu Item Filtering**:
  - **Bicycle POS**: All 8 items (`Dashboard`, `Rental Desk`, `Customers`, `Messages`, `History`, `Message Templates`, `Rates & Inventory`, `Finance`) check their respective granular permissions (`accessDashboard`, `accessRentals`, `accessCustomers`, `accessMessages`, `accessHistory`, `accessUsers`, `accessSettings`, `accessFinance`).
  - **MGR Transport**: In `mgrNavItems`, staff users only see items enabled by their role permissions (`accessMGRDashboard`, `accessMGRSearch`, `accessMGRBookings`, `accessMGRHistory`, `accessMGRFleet`, `accessMGRCustomers`, `accessMGROwners`, `accessMGRSettings`).
  - **PRH Rental Hub**: In `prhNavItems`, all 14 items check `isAdmin ? true : Boolean(userPerms[key])`, completely preventing unauthorized tab links from being rendered.
- **Runtime Route Protection**:
  - In `App.tsx`, `useEffect` route guards monitor the active business and tab.
  - If an unauthorized URL is directly entered, the user is immediately redirected to their first permitted business and tab.

### 4. Bicycle POS Side-Menu Permission Matrix & Correct Ordering
- **Added Missing "Messages" Menu Item**:
  - Added `accessMessages` ("Messages" - SMS / WhatsApp direct chat desk) to the Bicycle POS permission matrix in `UserRoleMasterHub.tsx`.
  - Differentiated between `accessMessages` ("Messages") and `accessUsers` ("Message Templates").
- **Strict Order Alignment Across All Modules**:
  - In `UserRoleMasterHub.tsx`, the tab permissions matrix order now matches the exact visual top-to-bottom order of the actual side menus:
    - **Bicycle POS**: Dashboard → Rental Desk → Customers → Messages → History → Message Templates → Rates & Inventory → Finance.
    - **MGR Transport**: Dashboard → Find Transport → Bookings & Seats → History → Fleet & Listings → Customers → Driver → Settings & SQL.
    - **PRH Rental Hub**: PRH Dashboard → New Rental Desk → Active Rentals → Returns & Inspection → Contractors / Customers → Equipment & Rates → Inventory Units → Reservations → Payments & Deposits → Finance & P&L → Maintenance Workshop → Messages / Reminders → Reports & Utilisation → PRH Settings.

### 5. System Email Sender & Password Reset Email Architecture
- **System Sender Requirement**:
  - All system-generated emails (notifications, account alerts, confirmations, booking receipts, automated messages, and password reset emails) must originate from:
    `mannargreenride@gmail.com`
  - Display sender name: **"Mannar Green Ride"**.
- **Backend Email Service (`server.js`)**:
  - Integrated `nodemailer` with a dedicated proxy endpoint: `POST /api/email/send`.
  - Transporter configuration:
    - `SYSTEM_EMAIL_SENDER=mannargreenride@gmail.com`
    - `SMTP_HOST=smtp.gmail.com`
    - `SMTP_PORT=465` (SSL) or `587` (TLS)
    - `SMTP_USER=mannargreenride@gmail.com`
    - `SMTP_PASS`: 16-character Google App Password (kept securely in server environment variables).
  - Safe fallback: if SMTP credentials are not yet set, the endpoint logs a simulated dispatch acknowledgment without crashing.

### 6. Guidance for Administrator on Email & SMTP Setup
1. **Google App Password for Gmail SMTP (Verified & Configured)**:
   - Configured in server `.env` as `SMTP_PASS` (Google App Password).
   - Live SMTP transmission tested and verified with Google's SMTP server (`smtp.gmail.com:465`).
   - Verification message successfully received by `mannargreenride@gmail.com` (Message ID: `<0e4e0f53-78ee-95e5-8c2e-6e59c44e98b5@gmail.com>`).
2. **Supabase Auth Custom SMTP (for Password Reset Emails)**:
   - In Supabase Dashboard → **Project Settings** → **Authentication** → **SMTP Settings**:
     - Enable **Custom SMTP**.
     - Sender Email: `mannargreenride@gmail.com`
     - Sender Name: `Mannar Green Ride`
     - Host: `smtp.gmail.com`
     - Port: `465` (SSL)
     - Username: `mannargreenride@gmail.com`
     - Password: `[Google App Password]`
   - In Supabase Dashboard → **Authentication** → **Email Templates** → **Reset Password**:
     - Subject: `Reset Your Mannar Green Ride Password`
     - Body clearly stating Mannar Green Ride and providing the secure confirmation link:
       ```html
       <h2>Reset Your Password - Mannar Green Ride</h2>
       <p>Follow this secure link to reset your password for your Mannar Green Ride staff account:</p>
       <p><a href="{{ .ConfirmationURL }}">Reset Your Password</a></p>
       <p>If you did not request this, please contact your system administrator immediately.</p>
       ```

---

## 17. Consolidated Feature Specifications & Implementation Tracker (MGR Transport Only)

### 1. Requirements Matrix & Status Tracker

| Feature Requirement | Specification & Architecture | Status |
|---|---|---|
| **Google/Gmail Sign-In in Registration** | Users can select Google account to auto-fill name, email, and avatar during registration | ✅ Completed |
| **Address in Registration** | Required Address field added to Owner, Passenger, and Driver registration profiles | ✅ Completed |
| **Move Vehicle Fields to Add Vehicle** | Removed vehicle creation from Owner registration; vehicle type, reg number, driver option in Add Vehicle modal | ✅ Completed |
| **Move Booking Type to Trip Availability** | Removed booking type from Add Vehicle modal; manage Trip vs Schedule directly in Trip Availability calendar | ✅ Completed |
| **3-Color Availability Calendar** | Single unified calendar with Emerald (Trip), Sky Blue (Schedule), and Rose Red (Passenger Booked - Locked) | ✅ Completed |
| **Passenger Search Date Validation** | Display only vehicles available on selected date; clearly validate and badge as Trip or Schedule | ✅ Completed |
| **Blank Amount Fields & No Spinners** | All amount/price inputs start blank (`""`), have no default values or spinners, manual numeric entry required | ✅ Completed |
| **Multi-Channel Notification Lifecycle** | Separate tracking and delivery status per channel (Email, WhatsApp, SMS) across 10 lifecycle events | ✅ Completed |
| **Ratings & Reviews System** | 1–5 star rating and comment for Passenger ↔ Driver after Journey Completed, 1 review per user per booking | ✅ Completed |
| **Immediate Database Persistence** | Immediate sync to Supabase & localStorage; reload from DB; show Success only on successful DB write | ✅ Completed |

---

### 2. Implementation Verification Notes

1. **Google/Gmail Sign-In in Registration** (`src/components/LoginPage.tsx`):
   - Added prominent **"Continue with Google"** button in Registration tabs.
   - Clicking opens the Google Account Selector modal displaying active/available Google profiles (`@gmail.com`).
   - Selecting a Google profile auto-fills Full Name, Email, and avatar initial into the registration form.
   - Also integrates Supabase OAuth (`signInWithOAuth({ provider: 'google' })`).

2. **Mandatory Address in Registration** (`src/utils/auth.ts`, `src/components/LoginPage.tsx`):
   - Added required `Address` input (`regAddress`) for all three roles: **Passenger**, **Owner**, and **Driver**.
   - Added `Driving Licence Number` (`regLicenceNumber`) for Driver registration.
   - `UserAccount` interface and `registerNewUser` function updated to persist `address` to Supabase `user_accounts` and `localStorage`.

3. **Separation of Owner Profile vs Vehicle Registration** (`src/components/LoginPage.tsx`, `src/components/mgr-booking/MGRFleetView.tsx`):
   - Purged all vehicle creation fields from the Owner Registration form. Owners now register solely their user profile.
   - Vehicle & Owner details, Vehicle Type, Registration Number, and Driving Service Option are managed directly under **Add Vehicle / Boat** in Fleet Management.

4. **Booking Type Moved to Trip Availability** (`src/components/mgr-booking/MGRFleetView.tsx`):
   - Removed the booking type selector dropdown from the Add Vehicle / Edit Vehicle modals.
   - Any vehicle can be configured for Trip (whole hire) or Schedule (per-seat departure) directly in the Availability calendar.

5. **3-Color Unified Availability Calendar** (`src/components/mgr-booking/MGRFleetView.tsx`):
   - Single unified modal replacing previous dual modals.
   - 3 distinct visual states:
     - 🟢 **Emerald Green**: Trip dates (whole hire)
     - 🔵 **Sky Blue**: Schedule dates (per-seat departure)
     - 🔴 **Rose Red**: Passenger Booked dates (locked, cannot be altered)
   - Restricts availability selection strictly to the **next 30 days maximum**.
   - Calendar Mode toggle (`Trip Mode` vs `Schedule Mode`) lets owners click dates to toggle Trip hire or configure per-seat timetable departure details (Route, Times, Total/Reserved/Available Seats, and Per Seat Price).

6. **Passenger Search & Date Validation** (`src/components/mgr-booking/MGRTransportBooking.tsx`):
   - `createListingsFromVehicles` dynamically generates Trip listings for vehicles with `availableDates` and Schedule listings for vehicles with `schedules`.
   - Date search filter strictly checks whether each vehicle is available on the selected date:
     - For Trip listings: checks `item.availableDates.includes(searchDate)`.
     - For Schedule listings: checks `item.plannedTripDate === searchDate`.
   - Each card in Grid and Table view explicitly badges whether the vehicle is `TRIP` (Emerald) or `SCHEDULE` (Sky Blue).

7. **Blank Amount Fields & No Spinners** (`src/components/mgr-booking/MGRFleetView.tsx`, `src/components/mgr-booking/MGRPaymentModal.tsx`, `src/components/mgr-booking/MGRTransportBooking.tsx`):
   - All price/charge inputs start blank (`""`) with no default values:
     - Fleet `newOneDayPrice`, `schedPricePerSeat`
     - Operator `ownerChargeInput` (previously defaulted to 20,000; now starts blank `""`)
     - Edit Request `editCharge`
     - Cash received in `MGRPaymentModal`
   - Added CSS classes `[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none` to eliminate up/down spinners in WebKit, Chrome, Safari, and Firefox.
   - Added validation requiring positive manual numeric entry before allowing submissions.

8. **Multi-Channel Notification Lifecycle** (`src/utils/mgrTransportNotifications.ts`, `src/components/mgr-booking/MGRTransportBooking.tsx`):
   - Implemented tracking across active channels (Email, WhatsApp, SMS) for all 10 events:
     1. `vehicle_assigned`
     2. `waiting_owner_approval`
     3. `owner_accepted`
     4. `owner_rejected`
     5. `payment_requested`
     6. `payment_completed` (and `booking_confirmed`)
     7. `driver_assigned`
     8. `journey_started`
     9. `journey_completed`
     10. `booking_completed`
   - Table rows and Details modal show channel delivery status and provide one-click buttons for each step in the lifecycle.

9. **Ratings & Reviews System** (`src/types/mgrBooking.ts`, `src/components/mgr-booking/MGRTransportBooking.tsx`):
   - `TransportReview` interface tracks `bookingId`, `reviewerId`, `reviewerRole`, `reviewedUserId`, `rating` (1–5), `comment`, `date`, `time`.
   - Interactive 1 to 5 star rating modal opens automatically upon `journey_completed` or via the "⭐ Review" button.
   - Enforces **maximum 1 review per user per booking**.
   - Reviews are saved to `mgr_transport_reviews` and synced to Supabase.

10. **Immediate Database Persistence** (`src/lib/supabaseSync.ts`, `src/components/mgr-booking/MGRBookingHub.tsx`):
    - All Add, Edit, Delete, Accept, Reject, Driver Assignment, and Review actions immediately write to Supabase and `localStorage`.
    - Success alerts (`alert(...)`) are displayed only after the mutation write succeeds.
    - Periodic background sync runs according to the Data Sync Interval configured in Admin Settings.

---

## 18. Trip Availability, Google Registration Fix, Scoped Driver Role, and Immediate DB Sync

### 1. Key Updates & Bug Fixes Summary

| Area | Issue / Requirement | Solution & Implementation | Status |
|---|---|---|---|
| **Trip Availability Persistence** | Owner configured Trip availability (e.g. 2026-09-22, 2026-09-23) and Schedule (2026-09-24), but Passenger search on 2026-09-23 returned 0 results | Packaged `availableDates`, `schedules`, and `bookingType` into `boat_details._mgr_meta` JSONB column in Supabase `transport_vehicles`. Restored during fetch/hydration across sessions and windows. | ✅ Resolved & Verified |
| **Timezone Consistency** | Default date inputs using `toISOString()` evaluated to yesterday's date in Sri Lanka / India timezone (UTC+5:30) | Standardized all default date initializers to use `toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })` across booking search, availability calendar, and timetable inputs. | ✅ Resolved & Verified |
| **Google Registration Black Screen** | Clicking Google icon during registration produced a black screen | Missing `X` icon import from `lucide-react` in `LoginPage.tsx` threw an uncaught `ReferenceError` during React rendering; fixed import and simplified modal opener to prevent unhandled OAuth redirects. | ✅ Resolved & Verified |
| **Public Self-Registration Roles** | Public signup should only be for Passenger and Owner; Driver self-registration was visible | Restricted `regRole` strictly to `'passenger' | 'owner'`. Removed Driver radio option and licence number from public registration form. | ✅ Resolved & Verified |
| **Driver / Captain Address** | Driver / Boat Captain form lacked mandatory address field | Added mandatory `Residential Address *` input to "Register Driver or Boat Captain" form in `MGROwnersDriversView.tsx`, validated on submit and displayed in driver details. | ✅ Resolved & Verified |
| **Immediate Database Synchronization** | Mutations updated UI optimistically before confirming database write | All sync and delete functions in `supabaseSync.ts` return `Promise<{ success: boolean; error?: string }>`. UI updates only after confirmed database success. On failure, error is alerted and previous data is retained. | ✅ Resolved & Verified |

---

### 2. Technical Details & Code Locations

1. **Supabase Schema-Free Meta Persistence** (`src/lib/supabaseSync.ts`):
   - Function `syncTransportVehicleToSupabase`:
     - Injects `_mgr_meta: { availableDates: vehicle.availableDates || [], schedules: vehicle.schedules || [], bookingType: vehicle.bookingType || 'trip' }` directly into the existing `boat_details` JSONB column.
     - This safely preserves full availability dates and schedules in remote Supabase storage without requiring manual database schema migrations.
   - Function `fetchTransportDataFromSupabase`:
     - Extracts `_mgr_meta` from `boat_details` and populates `availableDates`, `schedules`, and `bookingType` on each vehicle record.
     - Guarantees that any incognito session, new browser window, or page reload immediately receives full availability data.

2. **Passenger Search & Dynamic Listings** (`src/components/mgr-booking/MGRTransportBooking.tsx`):
   - Function `createListingsFromVehicles`:
     - Generates listings for all active vehicles (excluding only `suspended` and `maintenance`).
     - For each vehicle, creates Trip listings based on `availableDates` and Schedule listings based on `schedules`.
   - Search Filtering:
     - When `searchDate` is selected (defaulting to today in `Asia/Colombo` timezone):
       - In **Trip** mode: filters vehicles via `item.availableDates.includes(searchDate)`.
       - In **Schedule** mode: filters timetable departures via `item.plannedTripDate === searchDate`.
     - When passenger selects `2026-09-23`, all Trip-enabled vehicles configured for that date are immediately visible.

3. **Google Sign-In Modal Fix** (`src/components/LoginPage.tsx`):
   - Fixed missing `X` icon import from `lucide-react`.
   - Refactored `handleGoogleSignInClick` to set `showGoogleModal(true)` cleanly.
   - The Google Account Selector modal now opens reliably without crashing the React virtual DOM into a black screen.

4. **Driver Registration & Scoping** (`src/components/mgr-booking/MGROwnersDriversView.tsx`, `src/components/LoginPage.tsx`):
   - Public registration now displays only two choices: **Vehicle / Boat Owner** and **Passenger**.
   - Drivers / Boat Captains are created and managed exclusively by authenticated Owners and Admins under the "Drivers / Captains" view.
   - Added `driverAddress` state and mandatory `Residential Address *` input with validation (`if (!driverAddress.trim()) { alert('Please enter the residential address.'); return; }`).
   - Address is stored under `address` on `TransportDriver` and synced to Supabase `transport_drivers`.

5. **Immediate Database Sync & Confirmation Architecture**:
   - `src/lib/supabaseSync.ts`:
     - All mutation functions return `{ success: true }` or `{ success: false, error: err.message }`.
   - `src/components/mgr-booking/MGRBookingHub.tsx`:
     - Handlers for Vehicle, Owner, Driver, Route, and Booking mutations are async, await Supabase sync, alert on error, and update local state and `localStorage` only upon confirmed success.
   - `src/components/mgr-booking/MGRFleetView.tsx`:
     - `handleSaveUnifiedAvailability` awaits `onEditVehicle`, displays a loading spinner on the "Save Availability" button, and alerts the user upon confirmed database write.
   - `src/components/mgr-booking/MGRTransportBooking.tsx`:
     - `handleScheduleDirectBooking`, `handleTripBookingRequest`, `handleOwnerAcceptTrip`, `handleOwnerReject`, `handleCompletePayment`, `handleConfirmAssignDriver`, `handleStartJourney`, `handleCompleteJourney`, `handleCompleteBooking`, `handleSubmitReview`, `handleSaveEditRequest`, and `handleConfirmDeleteRequest` all strictly await database sync before updating the UI.

---

### 3. Verification & Build Status
- `npm run build` executed successfully with code 0 (`✓ built in 3.18s`).
- 0 TypeScript or React compilation errors.
- Application is active on `http://localhost:9898`.

---

## 19. Foreign Key Constraint Resolution & Enum Compatibility (`mgr_transport_requests_listing_id_fkey`)

### 1. Issue Description
When a passenger attempted to book a scheduled departure or submit a trip request (e.g., clicking "Pay & Confirm Seats (Rs. 5,153)" on `localhost:9898/passenger/search`), an alert appeared:
```
Database error: Could not process booking request (insert or update on table "mgr_transport_requests" violates foreign key constraint "mgr_transport_requests_listing_id_fkey"). Please try again.
```

### 2. Root Cause
1. **Foreign Key Constraint**:
   - In Supabase, table `mgr_transport_requests` has a foreign key constraint:
     `FOREIGN KEY ("listing_id") REFERENCES public."mgr_transport_listings"("id") ON DELETE SET NULL`.
   - Because listings are dynamically generated from fleet vehicles (`createListingsFromVehicles`) rather than static database rows, the generated listing IDs (e.g. `LST-<vehicleId>-<scheduleId>`) did not exist in the `mgr_transport_listings` table.
   - When `syncTransportRequestV2ToSupabase` sent `listing_id`, Postgres rejected the insert.
2. **Postgres Enum Constraint**:
   - In Supabase, column `request_status` has type enum `mgr_transport_request_status`:
     `('pending_owner', 'owner_rejected', 'awaiting_payment', 'confirmed', 'cancelled')`.
   - Lifecycle statuses like `driver_assigned`, `journey_started`, `journey_completed`, and `completed` caused Postgres enum validation errors if sent directly.

### 3. Architecture & Implementation Fix
1. **Listing Foreign Key Resolution** (`src/lib/supabaseSync.ts`):
   - Added `syncTransportListingToSupabase(listing)`: Automatically upserts the parent listing into `mgr_transport_listings` with full vehicle, owner, route, timetable, and seat details.
   - Added `syncTransportListingsToSupabase(listings)`: Automatically called in `MGRTransportBooking.tsx` whenever listings are generated from fleet vehicles.
   - In `syncTransportRequestV2ToSupabase`: Pre-upserts the parent listing into `mgr_transport_listings` before inserting the request.
   - **Graceful Fallback**: If `listing_id` foreign key check ever fails for any reason, the function automatically retries with `payload.listing_id = null`, ensuring the passenger's booking NEVER fails.
2. **Metadata Packing for Enum Compatibility**:
   - Maps extended lifecycle statuses (`driver_assigned`, `journey_started`, `journey_completed`, `completed`) to valid DB enum `'confirmed'` (or `'cancelled'`).
   - Packs extended metadata (`actualStatus`, `driverId`, `driverName`, `driverPhone`, `driverReviewed`, `passengerReviewed`, and original `listingId`) into `special_notes` as `[MGR_META:{...}]<original_notes>`.
   - In `fetchTransportRequestsV2()`: Automatically unpacks `[MGR_META:{...}]` from `special_notes`, perfectly restoring the actual lifecycle status, assigned driver details, review flags, and original `listingId` across all sessions and reloads.

### 4. Verification
- Direct integration tests verified that:
  - Upserting dynamic listing to `mgr_transport_listings` returns HTTP 201.
  - Upserting request referencing `listing_id` returns HTTP 201 without constraint errors.
  - Unpacking metadata from `special_notes` restores all extended attributes cleanly.
- `npm run build` executed successfully with code 0 (`✓ built in 2.56s`).

---

## 20. 7 Critical Enhancements Implementation (MGR Transport Only)

### 1. Requirements & Completion Tracker

| Requirement | Specification & Architecture | Implementation Status |
|---|---|---|
| **1. Google / Gmail Login Privacy & Selector** | Remove hardcoded `absiraiva@gmail.com` buttons; open real Google OAuth account selector (`prompt: select_account`) or user-input modal; never expose admin/staff account details to public users | ✅ Completed & Verified |
| **2. Process Notifications via Active Channels** | Send booking/process notifications to logged-in user's registered Email, WhatsApp, and SMS; strictly validate Admin Settings channel toggles; connect to backend `/api/email/send` and `/api/whatsapp/send` | ✅ Completed & Verified |
| **3. Auto Logout Inactivity Timeout** | Add Admin setting to configure session inactivity timeout (5m, 10m, 15m, 30m, 60m, or Disabled); auto log out and redirect to login only after timeout expires | ✅ Completed & Verified |
| **4. Mobile & Tablet Booking Crash Resolution** | Fix white screen/error screen on phones/tablets; replace unsafe `Intl.DateTimeFormat` with `safeColomboDate` fallback; wrap modals in `ErrorBoundary`; sticky responsive action buttons | ✅ Completed & Verified |
| **5. Assign Driver / Captain Scoped to Owner** | Dropdown lists *only* the Owner's registered drivers/captains; displays driver name and phone when selected; validates driver belongs to that owner before assigning | ✅ Completed & Verified |
| **6. Journey Completion & Move to History** | Automatically move booking to History upon End Journey / Completed; retain full booking, payment, driver, journey, notification audit log, rating, and status details | ✅ Completed & Verified |
| **7. Immediate Supabase Database Sync** | Ensure all updates, assignments, completions, and reviews persist immediately to Supabase and localStorage across refreshes, navigation, and re-login | ✅ Completed & Verified |

---

### 2. Architectural Details by Feature

#### Feature 1: Google / Gmail Login Privacy & Account Selector
- **Files Modified**:
  - `src/components/LoginPage.tsx`
  - `src/App.tsx`
- **Implementation**:
  - Removed all hardcoded demo buttons (`absiraiva@gmail.com`, `mannargreenride@gmail.com`) from public login and registration tabs.
  - Clicking the Google/Gmail button initiates real Supabase OAuth with `{ queryParams: { prompt: 'select_account' } }`, prompting the user's browser/device session to select their own Google account.
  - If Supabase OAuth is not active or user cancels, a fallback modal prompts the user to enter *their own* Google account, preventing any accidental exposure of Admin or Staff accounts.
  - In `App.tsx`, added `SIGNED_IN` event handler in Supabase `onAuthStateChange` to match or auto-register Google users as passengers.

#### Feature 2: Process Notifications via Active Channels
- **Files Modified**:
  - `src/utils/mgrTransportNotifications.ts`
  - `server.js`
- **Implementation**:
  - Connected `dispatchTransportNotification` to backend `POST /api/email/send` (Nodemailer HTML receipt from `mannargreenride@gmail.com`) and `POST /api/whatsapp/send` (with WhatsApp gateway and SMS simulation flag).
  - Strictly reads Admin Settings channel toggles (`channels.email`, `channels.whatsapp`, `channels.sms`); disabled channels are bypassed with logged status `disabled`.
  - Dispatches process notifications across 10 lifecycle events using the logged-in user's registered contact details.
  - Logs every dispatch to Supabase table `mgr_transport_notifications` and `localStorage.getItem('mgr_transport_notifications')`.

#### Feature 3: Auto Logout on Inactivity
- **Files Modified**:
  - `src/types/mgrBooking.ts`
  - `src/data/mgrInitialData.ts`
  - `src/components/mgr-booking/MGRSettingsView.tsx`
  - `src/App.tsx`
- **Implementation**:
  - Added `autoLogoutMinutes?: number` (default 15 minutes) to `MarketplaceSettings`.
  - Added responsive Session Auto-Logout dropdown in MGR Settings (options: 5 minutes, 10 minutes, 15 minutes, 30 minutes, 60 minutes, Disabled).
  - In `App.tsx`, activity listeners (`mousedown`, `keydown`, `touchstart`, `scroll`) reset the session timer. When elapsed time exceeds `autoLogoutMinutes`, the user is logged out, given an informative banner, and redirected to the Login page.

#### Feature 4: Mobile & Tablet Booking Crash Resolution
- **Files Modified**:
  - `src/components/mgr-booking/MGRTransportBooking.tsx`
  - `src/components/mgr-booking/MGRBookingHub.tsx`
  - `src/components/ErrorBoundary.tsx`
  - `src/lib/supabaseSync.ts`
- **Implementation**:
  - Created `ErrorBoundary.tsx` and wrapped `MGRTransportBooking` and `MGRHistoryView` to prevent white screens if rendering errors occur.
  - Created `safeColomboDate(d: Date)` helper with try/catch and UTC+5:30 fallback, replacing all un-wrapped `toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })` calls that threw `RangeError` on certain mobile WebKit engines.
  - Added sticky bottom action buttons (`sticky bottom-0 bg-white/95 backdrop-blur-xs py-2.5 z-10`) in booking modals so phone/tablet users can always tap Submit/Pay even when on-screen virtual keyboards appear.
  - Added foreign key safeguards in `syncTransportRequestV2ToSupabase` for `owner_id` and `vehicle_id` ensuring requests never fail due to database schema constraints.

#### Feature 5: Assign Driver / Captain Scoped to Owner
- **Files Modified**:
  - `src/components/mgr-booking/MGRTransportBooking.tsx`
  - `src/components/mgr-booking/MGRBookingHub.tsx`
- **Implementation**:
  - `MGRBookingHub` passes `drivers={drivers}` to `MGRTransportBooking`.
  - In Assign Driver Modal, the dropdown filters drivers strictly by `d.ownerId === request.ownerId`.
  - When a driver is selected, a dedicated info card displays the Driver/Captain Name, Phone/WhatsApp, and Type.
  - In `handleConfirmAssignDriver`, strict validation ensures `matchedDriver.ownerId === assigningDriverRequest.ownerId`.

#### Feature 6: Journey Completion & Move to History
- **Files Modified**:
  - `src/components/mgr-booking/MGRTransportBooking.tsx`
  - `src/components/mgr-booking/MGRHistoryView.tsx`
- **Implementation**:
  - In `MGRTransportBooking`, `handleCompleteJourney` sets `requestStatus: 'journey_completed'`, `completedAt: Date.now()`, immediately writes to Supabase & localStorage, dispatches lifecycle notifications, and opens the Rating & Review modal.
  - In `MGRHistoryView`, `computedCategory` treats `journey_completed` and `completed` as `'completed'`.
  - `UnifiedHistoryItem` extended with `driverName`, `driverPhone`, `driverType`, `completedAt`, `rating`, `reviewComment`, and `notifications`.
  - Details Modal (`<Eye />`) in History displays complete Driver/Captain details, Rating & Feedback stars, and Process Notifications audit log.

#### Feature 7: Immediate Supabase Database Sync
- **Files Modified**:
  - `src/lib/supabaseSync.ts`
  - `src/components/mgr-booking/MGRTransportBooking.tsx`
  - `src/components/mgr-booking/MGRHistoryView.tsx`
- **Implementation**:
  - All status updates, driver assignments, journey completions, and ratings immediately sync to Supabase and `localStorage`.
  - Bi-directional merge on load ensures changes persist across reloads, browser windows, and re-login.

---

### 3. Verification & Build
- `npm run build`: Exit code 0 (`✓ built in 4.45s`).
- Server verified active on `http://localhost:9898` (`HTTP/1.1 200 OK`).

