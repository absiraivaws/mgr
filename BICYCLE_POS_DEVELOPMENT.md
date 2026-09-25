# Cycly Rent - Bicycle POS Development & Architecture Guide

This document maintains the complete development reference, system specifications, numbering logic, permissions model, message templates, database schemas, and changelog for the **Cycly Rent Bicycle POS** system.

---

## 1. System Overview & Architecture

**Cycly Rent** is a modern Point-of-Sale (POS) and fleet rental management application designed for bicycle, e-bike, and motorcycle rental operations in Mannar, Sri Lanka.

- **Local Dev URL**: `http://localhost:9898`
- **System Timezone**: Sri Lanka Standard Time (`Asia/Colombo` / `GMT+05:30`)
- **Backend & Database**: Supabase (`https://pmowtdktjmejisggngsp.supabase.co`) with offline-first localStorage cache.

---

## 1.1 Development Tasks & Progress Tracking (Version 2.3.0)

### 📌 Core Requirements & Status
| Task ID | Requirement Item | Status | Verification & Target File |
|---|---|:---:|---|
| **REQ-1** | **Save & Refresh Latest Data** | **Completed** | `src/lib/supabaseSync.ts`, `src/App.tsx`, `src/components/SettingsPanel.tsx` |
| 1.1 | Fix `syncVehicleTypeToSupabase` schema mismatch (remove nonexistent `rental_start_method` column, store in rates JSONB) | **Completed** | Fixed in `src/lib/supabaseSync.ts` with backward compatibility in `loadDataFromSupabase` |
| 1.2 | Resilient cloud-local vehicle types merge on load & instant reload after add/edit/delete | **Completed** | Fixed in `src/App.tsx` (`handleUpdateVehicleTypes`, `handleUpdateVehicles`, `loadData`) |
| 1.3 | Clear Save / Confirm buttons on Add Vehicle Category, Edit Rates, and Delete Category | **Completed** | Added Save Category / Update Rates with loading spinner (`RefreshCw`) in `src/components/SettingsPanel.tsx` |
| 1.4 | Immediate database reload and display across page refresh, logout/login, and tab navigation | **Completed** | Implemented via `fetchSupabaseData()` triggers in `src/App.tsx` |
| 1.5 | Clear Save / Confirm buttons and reload on Fleet Inventory (Vehicles), Customers, Rentals, and Finance | **Completed** | Implemented across `SettingsPanel.tsx`, `CustomerManagementPanel.tsx`, `FinancePanel.tsx`, `App.tsx` |
| **REQ-2** | **User Access = Full Function Access** | **Completed** | `src/utils/auth.ts`, `src/components/user-role/UserRoleMasterHub.tsx`, `src/components/FinancePanel.tsx` |
| 2.1 | Automatic functional permissions granting when side-menu tab is enabled in Access Matrix (Finance $\rightarrow$ Add, PL, Statement, Export) | **Completed** | Implemented in `UserRoleMasterHub.tsx` (`handleToggleModuleTab`) and `auth.ts` |
| 2.2 | Full functional access for MGR Owner role in Transaction/Finance module | **Completed** | Updated in `auth.ts`, `FinancePanel.tsx`, and synced to Supabase `user_roles` |
| 2.3 | Default permissions normalization for all roles with module access in `auth.ts` | **Completed** | Implemented in `getUserPermissions()`, `getStoredRoles()`, `updateRolePermissions()` |
| **REQ-3** | **Permission Validation Before Button Display** | **Completed** | `src/components/FinancePanel.tsx`, `src/components/SettingsPanel.tsx`, `src/components/RentalHistoryPanel.tsx`, `src/components/CustomerManagementPanel.tsx`, `src/components/StartRentalCard.tsx`, `src/components/ActiveRentalsList.tsx` |
| 3.1 | Pre-validate permissions before displaying **Add** buttons (Finance, Vehicle Types, Vehicles, Customers) | **Completed** | Buttons conditionally rendered only if role has corresponding permission |
| 3.2 | Pre-validate permissions before displaying **Edit** buttons (Finance, Categories, Inventory, Customers) | **Completed** | Edit actions omitted if unauthorized; no dead lock icons |
| 3.3 | Pre-validate permissions before displaying **Delete** buttons (remove dead clicks and alert lock buttons) | **Completed** | Replaced lock buttons alerting "Permission Denied" with pre-validated `{isAdmin && ...}` / `{(isAdmin \|\| canEdit) && ...}` |
| 3.4 | Pre-validate permissions before displaying **View** sub-tabs (PL Statement, Statement of Accounts) | **Completed** | Sub-tabs pre-validated via `canViewPL` and `canViewStatement` in `FinancePanel.tsx` |
| 3.5 | Pre-validate permissions before displaying **Approve / Settle / Start** buttons | **Completed** | Validated `canRent` in `StartRentalCard.tsx` and `canSettle` in `ActiveRentalsList.tsx` |
| **REQ-4** | **Configurable Minute Intervals for Tiered Pricing** | **Completed** | `src/types.ts`, `src/utils/pricing.ts`, `src/components/SettingsPanel.tsx`, `src/components/ActiveRentalsList.tsx`, `src/components/StartRentalCard.tsx` |
| 4.1 | Custom key-in minutes for Tier 1: First Duration Minutes & Rate | **Completed** | Added `firstDurationMinutes` to `PricingRates`, state in `SettingsPanel.tsx`, paired minute + rate form inputs |
| 4.2 | Custom key-in minutes for Tier 2: Continuing Interval Minutes & Rate | **Completed** | Added `continuingDurationMinutes` to `PricingRates`, state in `SettingsPanel.tsx`, paired interval + rate form inputs |
| 4.3 | Dynamic calculation in `calculateRentalBreakdown()` using configured minutes | **Completed** | Replaced hardcoded 60m and 30m blocks with dynamic `firstDurationMinutes` and `continuingDurationMinutes` in `pricing.ts` |
| 4.4 | Dynamic UI display across Category cards, Rental Desk selection, and Active Rentals | **Completed** | Updated `SettingsPanel.tsx`, `StartRentalCard.tsx`, and `ActiveRentalsList.tsx` to dynamically show configured minutes |

---

## 2. Rental Serial Numbering Format

### Standard Format: `REN-0000001`, `REN-0000002`, `REN-0000003`, ...
All rental receipts and operational serial numbers strictly follow a 7-digit zero-padded monotonic sequence:
- **Prefix**: `REN` (configurable via `AppSettings.rentalNumberPrefix`)
- **Separator**: `-`
- **Digits**: 7 digits padded with leading zeros (`0000001` to `9999999`)

### Calculation & Migration Logic (`src/utils/pricing.ts`)
- **Function**: `formatRentalNumber(num: number, prefix: string = 'REN'): string`
  - Generates `${prefix}-${String(num).padStart(7, '0')}`.
- **Function**: `getNextRentalNumber(activeRentals, completedRentals, prefix): string`
  - Inspects all existing rental records (both active and completed).
  - Finds the highest integer suffix (`maxNum`).
  - Returns `formatRentalNumber(maxNum + 1, prefix)`.
  - If no rentals exist, starts at `REN-0000001`.

### Legacy Migration
- All legacy numbers (`REN-101` through `REN-156`) in Supabase and local storage have been chronologically re-sequenced by `start_time ASC`:
  - `REN-101` $\rightarrow$ `REN-0000001`
  - `REN-102` $\rightarrow$ `REN-0000002`
  - `REN-103` $\rightarrow$ `REN-0000003`
  - ...
  - `REN-156` $\rightarrow$ `REN-0000052`
- Corresponding records in the `income_expenses` ledger table have also been updated to match (`Rental #REN-00000XX`).
- Newly started rentals will begin from `REN-0000053`.

---

## 3. User Level & Tab Access Permissions

### Permissions Matrix Table (`src/components/UserRolesManager.tsx`)
The matrix table allows the root administrator to configure tab access for all user roles:
- **Administrator** (`admin`)
- **Store Manager** (`manager`)
- **Cashier POS** (`cashier`)
- Custom User Roles

### How Changes Apply
1. **Interactive Toggling**: When an admin toggles checkboxes in the matrix table or assigns a role to a user, changes are staged locally in state.
2. **Explicit Save Requirement**:
   - Changes are officially committed only when the admin clicks **Save** on the role column header or **Save All Levels** / **Save All Users**.
   - Upon clicking Save:
     - Persists permissions to `localStorage` (`v_rental_roles`).
     - Syncs role definitions to Supabase `user_roles` table.
     - Triggers `onRolePermissionsChange()` and `onUserListChange()` in `App.tsx`.
     - Updates `permissionsVersion` in `App.tsx`, triggering instant re-rendering of `Navbar.tsx` and all dependent tabs without requiring a browser reload.
3. **Route Protection & Auto-Redirect**:
   - If the currently active tab becomes disabled for the logged-in user after saving, `App.tsx` automatically redirects the user to the first available permitted tab.
4. **Root Administrator Lockout Protection**:
   - The primary root admin (`absiraiva@gmail.com`) always retains `accessUsers = true` and `canManageRoles = true` to prevent accidental lockout from the role configuration screen.

### Navigation Tab Permission Mapping (`src/components/Navbar.tsx`)

| Side Menu Tab | Permission Flag | Visibility Rule |
|---|---|---|
| **Dashboard** | `accessDashboard` | `Boolean(userPerms.accessDashboard)` |
| **Rental Desk** | `accessRentals` | `Boolean(userPerms.accessRentals)` |
| **Customers** | `accessCustomers` | `Boolean(userPerms.accessCustomers)` |
| **Messages** | `accessMessages` | `Boolean(userPerms.accessMessages)` |
| **History** | `accessHistory` | `Boolean(userPerms.accessHistory)` |
| **Users & Role** | `accessUsers` | `Boolean(userPerms.accessUsers \|\| isRootAdmin)` |
| **Rates & Inventory** | `accessSettings` | `Boolean(userPerms.accessSettings)` |
| **Finance** | `accessFinance` / `accessIncome` | `Boolean(userPerms.accessFinance ?? userPerms.accessIncome)` |

---

## 4. Automated Message Templates (WhatsApp & SMS)

### Standard System Templates (12 Total)
All 12 templates are defined in `src/utils/customer.ts` and stored in Supabase `message_templates`:

1. `tmpl-welcome-start`: Rental Started & Welcome
2. `tmpl-birthday-default`: Birthday Celebration Wishes
3. `tmpl-weekend-promo`: Special Promotion / Discount
4. `tmpl-rental-reminder`: Active Rental Reminder
5. `tmpl-return-thanks`: Return Completed & Thank You
6. `tmpl-payment-reminder`: Payment & Invoice Reminder
7. `tmpl-fitness-promo`: Fitness & Health Ride Promotion
8. `tmpl-tourist-promo`: Tourist & Explorer Package
9. `tmpl-thank-you`: Customer Appreciation & Thank You
10. `tmpl-special-offer`: VIP Special Offer
11. `tmpl-holiday-greeting`: Festive Holiday Greeting
12. `tmpl-general-reminder`: General Notification

### Merging & Persistence Rule
- `getStoredMessageTemplates()` in `src/utils/customer.ts` prepopulates all 12 `DEFAULT_MESSAGE_TEMPLATES` and merges any custom/edited templates from storage.
- Cloud sync with Supabase merges default templates with cloud templates so that a single row in the cloud can never hide the remaining standard templates.

### Dynamic Template Placeholders
- `{customer_name}`: Customer's display name or full name
- `{shop_name}`: Business trading name (default: "Mannar Green Ride")
- `{rental_number}`: Formatted rental number (`REN-0000001`)
- `{vehicle_name}`: Type name of the vehicle (e.g. "Bicycle - Boys")
- `{start_time}`: Formatted rental start time (`10:00 AM`)
- `{end_time}`: Formatted settlement time (`12:00 PM`)
- `{duration}`: Formatted rental duration (e.g. `2 hrs 15 mins`)
- `{amount}`: Settlement or total cost (e.g. `1,200 LK`)

---

## 5. Sri Lanka Timezone (GMT +05:30)

All timestamps and date displays strictly use **Sri Lanka Standard Time** (`Asia/Colombo`):
- **Supabase Database**: Configured to `Asia/Colombo` for database and client roles (`anon`, `authenticated`, `service_role`, `postgres`).
- **Application Dates/Times**:
  - `formatTime()` and `formatDate()` in `src/utils/pricing.ts` use `timeZone: 'Asia/Colombo'`.
  - Top navigation bar date and live clock in `src/components/Navbar.tsx` use `timeZone: 'Asia/Colombo'`.
  - Customer WhatsApp message composer and timestamps in `src/utils/customer.ts` use `timeZone: 'Asia/Colombo'`.

---

## 6. Changelog

### Version 2.3.0 (September 2026)
- **Save & Refresh Latest Data (Bicycle POS)**:
  - **Supabase `vehicle_types` Schema Fix**: Resolved PostgREST `400 Bad Request (PGRST204)` error when adding vehicle categories by storing `rentalStartMethod` inside the `rates` JSONB column instead of attempting to write to an unmapped raw column. Updated `loadDataFromSupabase()` with backward compatibility fallback.
  - **Instant DB Refresh & Local Merge**: Updated `App.tsx` (`handleUpdateVehicleTypes`, `handleUpdateVehicles`, `handleStartRental`, `handleConfirmStopAndSettle`, `handleDeleteRental`, `handleAddCustomer`, `handleUpdateCustomer`, `handleDeleteCustomer`, and Finance handlers) to await Supabase operations and immediately reload the latest database state via `fetchSupabaseData()`.
  - **Explicit Confirmation & Feedback**: Added visible Save/Confirm buttons with live saving spinners (`RefreshCw` / `Save`) for Vehicle Categories, Rates, Inventory Units, Customers, and Settlements. Data remains accurate across refresh (F5), navigation, and logout/login.
- **User Access = Full Function Access**:
  - **Operational Privileges Tied to Module Access**: In `UserRoleMasterHub.tsx` and `auth.ts`, granting access to a module automatically activates the full suite of operational privileges for that module (e.g., granting `accessFinance` automatically sets `canAddFinanceTransaction = true`, `canViewPL = true`, `canViewStatement = true`, `canExportFinanceReports = true`; granting `accessRentals` sets `canRent = true` and `canSettle = true`).
  - **MGR Owner Finance Access Unblocked**: Configured the **MGR Owner** role to possess full transaction privileges in the Finance module both locally and in Supabase `user_roles`.
- **Permission Validation Before Button Display (Zero Dead Clicks)**:
  - Validated permissions prior to button rendering across all Bicycle POS panels:
    - **Add**: `btn-add-vehicle-type`, `btn-open-bulk-gen`, `btn-open-add-veh`, Add Customer, Add Transaction.
    - **Edit**: Edit Vehicle Type, Edit Customer, Edit Transaction.
    - **Delete**: Settled rental receipts (`RentalHistoryPanel.tsx`), Customer profiles (`CustomerManagementPanel.tsx`), Vehicle categories & inventory units (`SettingsPanel.tsx`), and Income/Expense records (`IncomeExpensesPanel.tsx`, `FinancePanel.tsx`).
    - **Approve / Settle / Start**: Pre-validated `canRent` on `btn-start-rental` (`StartRentalCard.tsx`) and `canSettle` on `btn-stop-...` (`ActiveRentalsList.tsx`).
  - Completely eradicated `<Lock ... onClick={() => alert('Permission Denied...')} />` dead-click buttons, ensuring that if an action is not permitted for the user's role, the button is cleanly omitted rather than displaying an intrusive popup alert.
- **Configurable Minute Intervals in Tiered Pricing Rates**:
  - **Custom Minute Key-In**: Added input fields in `SettingsPanel.tsx` under Vehicle Types & Tiered Pricing Rates allowing users to key in any arbitrary number of minutes for both **Tier 1 (Initial Base Duration)** and **Tier 2 (Every Continuing Interval)** alongside their respective rates.
  - **Dynamic Calculation**: Updated `calculateRentalBreakdown()` in `src/utils/pricing.ts` to dynamically use `firstDurationMinutes` (defaulting to 60) and `continuingDurationMinutes` (defaulting to 30) for tiered cost calculations (`Math.ceil((totalMinutes - firstDurationMinutes) / continuingDurationMinutes)`).
  - **Schema & Cloud Persistence**: Stored `firstDurationMinutes` and `continuingDurationMinutes` within the `rates` JSONB column in Supabase `vehicle_types` and copied to `rateSnapshot` when starting rentals, ensuring complete cloud synchronization without database migrations.
  - **Context-Aware UI Displays**: Updated category cards in `SettingsPanel.tsx`, rate preview badges in `StartRentalCard.tsx`, and active rental progress cards in `ActiveRentalsList.tsx` to dynamically render configured minutes (e.g., `1st 45m: 100 LK`, `+15m: +25 LK`).

### Version 2.2.0 (September 2026)
- **Store Manager Income & Expense Persistence Across Sessions**:
  - **Database Schema Compatibility**: Fixed PostgREST `PGRST204` schema mismatch in `syncIncomeEntryToSupabase` by providing an automatic fallback to base columns (`id`, `date`, `description`, `type`, `amount`, `category`, `who`, `cashier_name`, `created_at`) when extra fields like `payment_method` do not exist as distinct columns in the active Supabase database.
  - **Resilient Local-Cloud Ledger Merge**: Updated `loadData()` in `App.tsx` so that local entries in `v_rental_income` are merged by ID with cloud entries rather than wiped out, automatically queueing unsynced local records to Supabase on login or restart.
  - **Strict Store Manager Role Privileges**: Explicitly enforced that Store Managers can **Add only** (`canAddFinanceTransaction = true`), preventing Store Managers from editing or deleting transactions (`canEditFinanceTransaction = false`, `canDeleteFinanceTransaction = false`), with full rights reserved for Administrators.
- **Login Screen MGR Transport Admin Route Lock**:
  - Configured the bottom demo credential **👑 Admin** (`admin@mannargreenride.lk`) to navigate directly to **MGR Transport only**, identical to the Fleet Owner and Passenger experience.
  - Blocked switching to Bicycle POS for `admin@mannargreenride.lk` while in this persona.
  - Granted MGR Transport Admin complete, unrestricted access to **all side menu tabs** in MGR Transport (`Dashboard`, `Find Transport`, `Bookings & Seats`, `Fleet & Listings`, `Customers`, `Driver`, and `Settings & SQL`).
- **Finance Tables: Sortable Headings & 50-Row Pagination**:
  - **Transactions & Ledger**:
    - Added interactive sortable headers with up and down indicators (`ChevronUp`, `ChevronDown`, `ChevronsUpDown`) for Date, Reference, Type, Category, Description, Amount, Method, and Staff.
    - Fixed maximum rows to 50 per page with pagination controls, record counter, and page navigation buttons.
  - **Statement of Account**:
    - Added interactive sortable headers for Date, Reference, Description, Category, Debit (Expense), Credit (Income), Running Balance, and Entered By.
    - Fixed maximum rows to 50 per page with pagination controls and record counter.

### Version 2.1.2 (September 2026)
- **Save & Activate Role Action**:
  - Unified the column header action button into **`Save & Activate Role`**. Clicking this button under any role (e.g. `STORE MANAGER`) automatically persists permissions AND immediately activates that role for the active user session across the entire app.
  - Active role is clearly marked with `● ACTIVE ROLE` and `Save Permissions`.
- **Administrator Role Unrestricted Access Guaranteed**:
  - Fixed the missing `accessFinance` normalization in `getStoredRoles()`.
  - Guaranteed that the Administrator role (`admin`) ALWAYS has all 8 side menu options Allowed (`Dashboard`, `Rental Desk`, `Customers`, `Messages`, `History`, `Users & Role`, `Rates & Inventory`, `Finance`).
  - In `Navbar.tsx`, ensured `isAdmin ? true : Boolean(userPerms[tab])` guarantees all side menu options are permanently active and accessible for Administrator.
  - Locked Administrator column checkboxes to `Allowed` in the matrix table so no tab can ever be disabled for Administrator.
  - Synced `admin` role with `accessFinance: true` and `accessIncome: true` directly to Supabase `user_roles` table.

---

## 7. Finance & Role-Based Access Reference

### Role Capabilities in Finance
| Feature / Action | Root Admin (`absiraiva@gmail.com`) | Administrator (`admin`) | Store Manager (`manager`) | Cashier POS (`cashier`) |
|---|:---:|:---:|:---:|:---:|
| **View Finance Tab** | Allowed | Allowed | Allowed | Denied |
| **Add Transaction** | Allowed | Allowed | **Allowed (Add Only)** | Denied |
| **Edit Transaction** | Allowed | Allowed | **Denied** | Denied |
| **Delete Transaction** | Allowed | Allowed | **Denied** | Denied |
| **View P&L Report** | Allowed | Allowed | Allowed | Denied |
| **View Statement of Accounts** | Allowed | Allowed | Allowed | Denied |
| **Export CSV Reports** | Allowed | Allowed | Allowed | Denied |

### Table Pagination & Sorting Architecture
- **Page Size**: Fixed strictly to 50 records per page (`PAGE_SIZE = 50`).
- **Pagination Component**: Reusable footer showing current range (`Showing X to Y of Z entries`), Previous button, numbered page pills, and Next button.
- **Sorting State**: Field-based ascending/descending comparator supporting alphanumeric strings, timestamps, and currency numbers. Resets to Page 1 upon sort or filter change.



