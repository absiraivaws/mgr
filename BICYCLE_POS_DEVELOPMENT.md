# Cycly Rent - Bicycle POS Development & Architecture Guide

This document maintains the complete development reference, system specifications, numbering logic, permissions model, message templates, database schemas, and changelog for the **Cycly Rent Bicycle POS** system.

---

## 1. System Overview & Architecture

**Cycly Rent** is a modern Point-of-Sale (POS) and fleet rental management application designed for bicycle, e-bike, and motorcycle rental operations in Mannar, Sri Lanka.

- **Local Dev URL**: `http://localhost:9898`
- **System Timezone**: Sri Lanka Standard Time (`Asia/Colombo` / `GMT+05:30`)
- **Backend & Database**: Supabase (`https://szzhzpjfmyeulxjhbbov.supabase.co`) with offline-first localStorage cache.

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


