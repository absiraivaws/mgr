# Development Update & Changelog — Mannar Green Ride (Cycly Rent POS)

This document tracks all system architecture, schema updates, UI features, and functional developments implemented across the **Mannar Green Ride POS & Rental Management System**.

---

## 1. Authentication & Security Updates
- **No Default Admin Username / Password auto-fill**:
  - The login inputs (`email`/`username` and `password`) always start completely blank (`""`).
  - Auto-fill defaults and auto-provided passwords on initial render were removed to ensure secure credential handling.
- **Forgot Password Workflow**:
  - Added full "Forgot Password?" email reset mechanism.
  - Generates secure password reset links and dispatches via Supabase authentication / SMTP to the user's registered email address.
  - Real-time notification banners inform the user of delivery status.

---

## 2. Customer Management System (`Customers` Tab)
- **New Sidebar & Navigation Item**:
  - Added dedicated **"Customers"** menu tab with users icon and role-based permissions (`accessCustomers`).
- **Comprehensive Customer Profile Schema**:
  - `Full Name` (`fullName` / `name`)
  - `Address` (`address`)
  - `NIC / Passport Number` (`nicPassport`)
  - `Date of Birth` (`dob`)
  - `WhatsApp Number` (`whatsappNumber`)
  - `Mobile / Phone Number` (`phone`)
  - `Notes / Special Instructions` (`notes`)
  - `Total Trips / Rentals Count` (`totalRentalsCount`)
  - `Last Rental Timestamp` (`lastRentalDate`)
- **Customer Table UI & Controls**:
  - **Global Search**: Real-time filtering across Name, NIC, Mobile, WhatsApp, Address, DOB, and Notes.
  - **Column Sort Badges (A-Z & Z-A)**: Literal `A-Z` and `Z-A` toggle symbols on every table header.
  - **20-Row Pagination**: Configurable maximum 20 rows per page with previous/next page navigation buttons and item counters.
  - **Actions**:
    - **View**: Modal showing complete verified customer card and direct WhatsApp click-to-chat.
    - **Edit**: Edit profile modal with instant database sync.
    - **Delete**: Admin-restricted customer removal with safety confirmation prompt.
- **Supabase Integration**:
  - `customers` table with auto-migration columns (`full_name`, `address`, `dob`, `whatsapp_number`, `phone`, `notes`, `total_rentals_count`, `last_rental_date`).
  - `syncCustomerToSupabase` and `deleteCustomerFromSupabase` real-time sync methods.

---

## 3. Rental Desk & Start Rental Enhancements
- **Vehicle Category & Serial Number Default State**:
  - Both Category and Serial Number dropdowns always initialize blank with explicit placeholders (`-- Select Vehicle Category --` and `-- Select Vehicle Serial Number --`).
  - Dropdowns reset back to blank upon starting a rental.
- **Available Fleet Filtering (Strict Exclusion)**:
  - Dropdown serial numbers only display vehicles that are **currently available** in inventory.
  - Excludes any vehicle with `status === 'maintenance'` and vehicles currently active in the **Active Rented Fleet**.
- **Customer NIC / Passport Live Search**:
  - Instant auto-lookup in "Find Customer Search Bar (NIC / Passport)".
  - Displays customer search suggestions dropdown.
  - When selected or matched, shows a verified customer details preview card with Name, NIC, Mobile, WhatsApp, Address, DOB, and trip history.

---

## 4. Income & Expenses Enhancements
- **"Who" Field with Dropdown**:
  - Added `Who` field to the "Add New Entry Record" form.
  - Dropdown choices: **Mark**, **Jenis**, **Beni**.
  - Saved in database and synced to Supabase `income_expenses` table.
- **Automatic Daily Rental Income Logging**:
  - When any rental timer is stopped and settled, the settlement handler in `App.tsx` automatically creates an Income entry (`Rental Revenue`, amount, receipt #, vehicle serial, cashier name) into the Income & Expenses ledger and syncs to Supabase.
- **Global Search & Date Range Filters**:
  - **Global Search Bar**: Instant filtering across description, category, who, cashier, date, and amount.
  - **From Date / To Date Pickers**: Filter transactions within any custom date range.
  - **Quick Action Buttons**: `Today` (instant filter for today's transactions) and `Clear` (show all dates).
- **Column Header Sort Symbols (A-Z & Z-A)**:
  - Replaced standard up/down arrows with literal `A-Z` and `Z-A` symbols on Date, Description, Category, Who, Type, and Amount columns.

---

## 5. Settled Rental Receipts & Detailed Log Updates
- **Quick Order Buttons Bar Removed**:
  - Removed the quick order pill bar from the "Settled Rental Receipts & Detailed Log" panel as requested.
- **Table Heading Sorting**:
  - Replaced header sort arrows with literal `A-Z` and `Z-A` sorting symbols with active highlight styling.

---

## 6. Dashboard Analytics & Interactive Line Chart
- **Daily Rental Income & Count Line Chart**:
  - Dynamic responsive SVG Line Chart displaying:
    - **Daily Rental Income ($)** (emerald line with area gradient fill).
    - **Daily Completed Trips Count** (cyan line).
    - **Timeframe Selector**: 7 Days, 14 Days, 30 Days.
    - **Series Selector**: Both Series, Income ($) Only, Trips Count Only.
    - **Interactive Hover Tooltips**: Showing date, daily income amount, and completed trip count.
    - **KPI Summary Chips**: Period Income, Total Completed Trips, Peak Day Revenue, and Daily Average Revenue.

---

## 7. Supabase Database Schema
```sql
-- Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    nic_passport TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    address TEXT,
    dob TEXT,
    whatsapp_number TEXT,
    phone TEXT,
    notes TEXT,
    created_at BIGINT,
    last_rental_date BIGINT,
    total_rentals_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Income & Expenses Table
CREATE TABLE IF NOT EXISTS public.income_expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(10, 2) NOT NULL,
    category TEXT DEFAULT 'Other',
    who TEXT DEFAULT 'Mark',
    cashier_name TEXT,
    created_at BIGINT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

---

*Last Updated: September 4, 2026*

---

## Session 2 Updates (September 4, 2026)

### 8. Settle & Return Vehicle — Updated Settlement Format
- **Settlement Calculation Card** now shows the explicit breakdown format as requested:
  ```
  Rental amount:    {base rental amount from pricing}
  + Damage:         {editable input, amber colored}
  - Discount:       {editable input, teal colored}
  ─────────────────────────────────────────────────
  Total Amount:     {Rental Amount + Damage - Discount}
  ```
- **Formula**: `Total Amount = max(0, rentalAmount + damageAmount - discountAmount)`
- **Live Update**: Changing damage or discount fields auto-recalculates and updates the cash received field.
- **Total Amount** (not just base rental) is now what's recorded in `RentalRecord.totalAmount`, logged in income entries, and displayed in history.
- **Removed**: Old "Payment Adjustments" and "Final Total" labelling replaced by the above clear breakdown.

### 9. Settled Rental Receipts & Detailed Log — "Total Amount" Label
- **Table Column Header**: Renamed from "Paid Amount" to **"Total Amount"**.
- **Printable Receipt**: Shows full breakdown — Rental Amount, + Damage (if > 0), - Discount (if > 0), then **TOTAL AMOUNT**.
- **Delete Confirmation Modal**: Updated label from "Paid Amount" to "Total Amount".

### 10. User Roles — Customers Permission Added
- **Customers row added** to the Role Access Tick Box Matrix table under `User Role (Side Menu)`.
- All roles can now have `accessCustomers` toggled on/off by the Admin.
- `handleToggleTabPermission`, `handleCreateRoleSubmit`, and the matrix render loop all updated to include `accessCustomers` alongside Dashboard, Rental Desk, History, Users & Role, Rates & Inventory, and Income & Expenses.
- Default value: `accessCustomers: true` for new roles.

### 11. Line Chart — Opposite Colors & Distinct Movement
- **Income Line**: Vibrant **Emerald Green** (`#10b981`) — solid, `strokeWidth: 3.5`, filled area gradient.
- **Trip Count Line**: High-contrast **Sunset Orange** (`#f97316`) — dashed `6 3` when both series shown, `strokeWidth: 3`.
- **Legend / Series Buttons**: Updated to `🟢 Income ($)` and `🟠 Trips Count` with matching active button styles (green vs orange).
- **Hover Tooltips**: `🟢 Daily Income` and `🟠 Trip Count` with matching color text.
- **Y-Axis Labels**: Left axis in emerald, right axis in orange for clear axis identification.
- **Data Point Circles**: Emerald `r=4.5` for income, Orange `r=4` for trip count.

### 12. New Customer Supabase Sync — Immediate Availability in Rental Desk
- `handleStartRental` in `App.tsx` now syncs the **complete** customer object to Supabase (including `fullName`, `whatsappNumber`, `address`, `dob`, matched existing customer data) when a rental is started with NIC/Name.
- Customers added via `CustomerManagementPanel` are immediately appended to the `customers` state in `App.tsx` and synced to Supabase.
- Customers are immediately searchable in `StartRentalCard.tsx` NIC/Passport search bar with no page reload required.

---

*Last Updated: September 4, 2026 (Session 2)*
