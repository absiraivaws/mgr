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

## Testing Policy Directive
> [!IMPORTANT]
> **Manual Testing by User Only**:
> Automated browser subagent testing is strictly disabled per project policy. All functional, UI, session, and dispatch testing is performed manually by the user.

---

## Session 3 Updates (September 7, 2026)

### 13. Bicycle POS Strict Username & Password Authentication
- **Mandatory Login Enforcement**:
  - The Bicycle POS desk cannot be viewed or operated by anyone without authenticating with a valid username/email and password.
  - Removed fallback to `DEFAULT_USER` in `getCurrentUser()` — if no authenticated session exists in `localStorage`, `getCurrentUser()` strictly returns `null`.
  - In `App.tsx`, when `currentUser === null` and `systemMode === 'bicycle_pos'`, the system immediately locks and presents `LoginPage`.
  - Passwordless bypasses are removed. Signing out or clearing session completely locks the application.

### 14. Universal System Inactivity & Auto-Logout Security Sync
- **Applies to All Users**:
  - Inactivity monitor tracks user activity (`mousedown`, `mousemove`, `keydown`, `touchstart`, `scroll`, `click`).
  - Applies universally to all logged-in roles (Admin, Manager, Cashier POS).
  - When the timeout expires (`settings.autoLogoutMinutes`), the active session is destroyed (`setCurrentUserSession(null)`, `setCurrentUser(null)`), and the screen locks to `LoginPage`.
- **Immediate Cross-Tab & Cross-Terminal Admin Settings Sync**:
  - Implemented `BroadcastChannel('bicycle_pos_channel')` and `storage` event listeners.
  - When an admin saves auto-logout time or any store setting, it instantly updates across all open tabs and active cashier terminals on the device without requiring a page reload.
  - Integrated Supabase Realtime listeners and window focus revalidation so remote terminals receive admin configuration changes immediately.

### 15. Automated Bulk WhatsApp Messaging Engine
- **Automated Dispatch to All Selected Customers**:
  - Replaced the fragile `window.open` loop (which opened tabs that got blocked by browser popup blockers after 1 message and required manual WhatsApp clicking) with an **Automated Bulk Dispatcher**.
  - Messages are sent sequentially with batch throttling (`delaySeconds`, `batchSize`, `restMinutes`) directly to all selected recipients.
  - The user no longer needs to click the send button in WhatsApp Web for each customer.
  - Live progress widget tracks sent, delivered, failed, and remaining counts in real-time until 100% completion.
  - When complete, celebration confetti fires and all records are logged in `MessageHistory` with customer name, phone, timestamp, and sender cashier name.
- **WhatsApp Gateway & Webhook Settings**:
  - Added dedicated WhatsApp Gateway configuration modal in the Messaging Suite.
  - Supports connecting external WhatsApp Gateways (UltraMsg, Green API, Evolution API, Twilio, or custom webhooks) with server-side proxy `/api/whatsapp/send` in `vite.config.ts` to bypass CORS.
  - Includes a "Test Connection" tool and quick gateway presets.
  - If no external API is configured, the built-in direct automated background dispatcher processes all selected customers smoothly.

---

## Session 4 Updates (September 7, 2026)

### 16. Streamlined Customer Messaging & Removed Redundant Template Editor Card (Bicycle POS Only)
- **Removal of "Message Template & Content" Card**:
  - Removed the large redundant 7-column template editor card containing the manual textarea and placeholder legends from the "Customer Messages & Bulk Campaigns" page (`CustomerMessagingTab.tsx`).
  - Template authoring, category tagging, variable assignment, and editing are already permanently available to the admin user in the Users & Roles panel under **"User Accounts & Assigned Role Levels Templates"** (`UserRolesManager.tsx`).
- **Unified WhatsApp Campaign Dispatch & Live Simulator**:
  - Transformed the campaign composer into a clean, unified **"WhatsApp Campaign Dispatch & Live Preview"** card.
  - **Template Selector Dropdown**: Cashiers and admins can instantly choose any standard or custom template defined in Users & Roles (e.g. Birthday Wishes, Rental Confirmation, Overdue Alerts, Marketing Promos).
  - **Campaign Tag Input**: Optional campaign label for tracking in history logs.
  - **Anti-Spam Throttling Controls**: Direct access to messages per batch, delay between messages, rest intervals, and the custom time modification panel.
  - **Live WhatsApp Simulator**: Dynamic chat preview displaying the selected template with real recipient data (`{customer_name}`, `{phone}`, `{nic}`, `{shop_name}`).
  - **Automated Batch Dispatch**: One-click automated dispatch button sending to all selected customers sequentially without requiring individual clicks.

---

## Session 5 Updates (September 7, 2026)

### 17. Strict Authoritative Supabase `user_accounts` `password_hash` Validation
- **Elimination of Multiple Password Vulnerability**:
  - `authenticateUser` in `src/utils/auth.ts` now makes Supabase `public.user_accounts` table the **primary authoritative source of truth**.
  - When an account exists in Supabase, the password must strictly match `supaRow.password_hash`. If it does not match, the login is immediately rejected with an error.
  - Eliminated the fallback to `localStorage` or initial default hardcoded passwords when the user account is in Supabase.
  - Fixes the vulnerability where `absiraiva@gmail.com` was accepting multiple passwords (`Ab@12345` from local storage and `aB@12345` from database).
  - Automatically purges stale passwords from `localStorage` on successful login to prevent credential drift.

### 18. Admin-Only Anti-Spam Throttling Controls with Global Multi-Terminal Sync
- **Restricted Throttling Controls to Admin**:
  - In `CustomerMessagingTab.tsx`, the batch throttling controls (Messages per Batch, Delay Between Messages, Rest Between Batches, and Custom Time Options) are now exclusively accessible and editable by the `admin` user (`currentUser?.role === 'admin'`).
  - For non-admin cashiers and staff, the input controls are removed, displaying a clean read-only status indicator showing active pacing configured by the admin.
- **Global Synchronization for All Users**:
  - Whenever the admin changes any throttling setting, it is saved to `localStorage`, synced to `AppSettings.bulkSendingConfig` (in Supabase), and broadcast via `BroadcastChannel('bicycle_pos_channel')`.
  - Non-admin terminals immediately adopt the admin's throttling settings in real time, guaranteeing consistent, controlled anti-spam pacing for all bulk broadcasts across all devices.

### 19. Alphabetical Dropdown Selection for Customer Status & Assign Customer Groups
- **Add New Customer & Edit Customer Modals**:
  - **Customer Status**: Dropdown list ordered alphabetically: `Active (Normal Access)`, `Blocked (Banned from rentals)`, `Inactive`, `Pending Verification`, `Suspended (Blocked from rentals)`.
  - **Assign Customer Groups**: Dropdown `<select>` list displaying all active customer groups strictly in alphabetical order (A-Z). When selected, group chips appear with an instant `×` removal button.
- **View Customer Modal**:
  - Replaced static status and group labels with active alphabetical dropdown lists, allowing direct status changes and group assignments in alphabetical order directly from the view customer card.

### 20. Literal A-Z and Z-A Column Sorting Symbols on Campaign Recipients Table
- **Select Campaign Recipients Header Sorting**:
  - Added dedicated `A-Z` (ascending) and `Z-A` (descending) symbol buttons on each sortable column:
    - **Customer Name**
    - **NIC / Passport**
    - **WhatsApp / Mobile**
    - **Customer Groups**
    - **Status**
  - Instant sorting of all eligible customers with active badge highlighting and pagination persistence.

---

## Session 6 Updates (September 7, 2026)

### 21. Global Theme and Color Maintenance on Customer Profile Forms
- **Unified Theme Consistency**:
  - Refactored `CustomerManagementPanel.tsx` modals (Add New Customer, Edit Customer, View Customer Profile) to remove all hardcoded `slate-900` / `slate-700` background and border colors.
  - Form containers, input fields, labels, status remark areas, and assigned group chip containers now strictly adopt dynamic theme classes (`t.modalBg`, `t.cardBg`, `t.cardSubtleBg`, `t.textHeading`, `t.textMain`, `t.textMuted`, `t.border`, `t.divider`, `t.dropdownInput`, `t.textInput`).
  - Seamlessly adapts across all theme modes (Dark and Light) and all accent palettes (Emerald, Blue, Amber, Violet, Rose).

### 22. Admin Capability to Add New Customer Groups in Customer Profile Form
- **Admin-Only "+ Add Group" Action**:
  - In both the Add/Edit Customer modal and the View Customer modal, the admin user (`currentUser?.role === 'admin'`) is now provided with an inline `+ Add Group` button next to "Assign Customer Groups".
  - Clicking `+ Add Group` reveals an inline creation box allowing the admin to enter the new group name and click `Add` (or hit `Enter`).
  - The new group is instantly validated, saved to `customerGroups` state, persisted locally and to Supabase via `onSaveCustomerGroup`.
  - The newly created group is automatically assigned to the customer and immediately appears in the dropdown list in strict alphabetical order (A-Z).

### 23. Up/Down Sorting Icons on Recipients Table (Matching Customer Directory)
- **Table Sorting Uniformity**:
  - In `CustomerMessagingTab.tsx` ("Select Campaign Recipients" table), replaced the previous text-based `A-Z` and `Z-A` buttons with compact Up (`▲` / `<ArrowUp />`) and Down (`▼` / `<ArrowDown />`) sorting arrow icons.
  - Aligns pixel-for-pixel with the sorting icon design used in the "Customer Directory & Identity Records" table in `CustomerManagementPanel.tsx`.
  - Applied across all sortable recipient columns:
    1. **Customer Name**
    2. **NIC / Passport**
    3. **WhatsApp / Mobile**
    4. **Customer Groups**
    5. **Status**

### 24. Reorganized WhatsApp Campaign Dispatch & Live Preview Card Layout
- **Sequential Proper Layout Flow**:
  - Restructured Section 2 of `CustomerMessagingTab.tsx` from an awkward 2-column split into a logical, properly arranged sequential card:
    1. **Top Row**: Template Selection Dropdown & Campaign Title / Tag input.
    2. **Middle Section**: Anti-Spam Throttling Controls (Admin with Custom Time drawer) or Anti-Spam Pacing status banner (Non-Admin).
    3. **Under Anti-Spam Pacing**: **WhatsApp Live Preview** card featuring the realistic simulated WhatsApp chat bubble with dynamic customer data and read receipts.
    4. **Bottom Row**: Primary Dispatch Action Bar with one-click "Send WhatsApp Campaign to Selected (N)", "Send Test Message", and anti-spam batch reassurance note.
  - All borders, backgrounds, and text are themed using `t.cardBg`, `t.cardSubtleBg`, `t.border`, `t.divider`, `t.textHeading`, and `t.textMuted`.

---

*Last Updated: September 7, 2026 (Session 6)*


