# Cycly Rent - Bicycle POS Development & Architecture Guide

This document maintains the complete development reference, system specifications, numbering logic, permissions model, message templates, database schemas, and changelog for the **Cycly Rent Bicycle POS** system.

---

## 1. System Overview & Architecture

**Cycly Rent** is a modern Point-of-Sale (POS) and fleet rental management application designed for bicycle, e-bike, and motorcycle rental operations in Mannar, Sri Lanka.

- **Local Dev URL**: `http://localhost:9898`
- **System Timezone**: Sri Lanka Standard Time (`Asia/Colombo` / `GMT+05:30`)
- **Backend & Database**: Supabase (`https://pmowtdktjmejisggngsp.supabase.co`) with offline-first localStorage cache.
- **Mandatory Technology Stack (Strict Policy)**:
  - **Languages & Runtimes**: **TypeScript**, **JavaScript**, and **Node.js** exclusively across all layers (Frontend, Local/Dev Backend, Edge Functions, Tooling, and Automation Scripts).
  - **Frontend**: React 19 + TypeScript, Vite, Tailwind CSS.
  - **Backend & APIs**: Node.js + Express (`server.js`), Vercel Serverless Functions (`api/`), Supabase Deno/TypeScript Edge Functions (`supabase/functions/`).
  - **Prohibition on Python**: **Python is strictly NOT used in this project and MUST NOT be introduced for present or future development**. All business logic, background tasks, reporting, data processing, integrations, and server utilities must be developed solely using Node.js / JavaScript / TypeScript.

---

## 1.0 Development Tasks & Progress Tracking (Version 2.6.0)

### 📌 Iterative Requirements Status (Pending → Developed → Manually Verified)
| Item # | Development Requirement Description | Status | Target Files & Implementation Notes |
|:---:|---|:---:|---|
| **1** | **Dashboard: Display Trip/Ride Count and Total Amount Clearly** | **Developed & Verified** | `src/components/DashboardStats.tsx`<br>• Displayed **Total Amount** in primary KPI Card with all-time revenue and today's income subtext.<br>• Displayed **Trip / Ride Count** in primary KPI Card with total completed trips, today's trips, and active rentals.<br>• Clean 4-column executive layout (`lg:grid-cols-4`) eliminating duplicates (`Active Rentals` and `Available Fleet` retained solely in bottom Fleet Status grid).<br>• Dynamic font scaling (`getDynamicAmountClass`) ensuring large figures (e.g. `LK41,550.00`) never truncate or spill out. |
| **2** | **Date Filter (From Date & To Date)** | **Developed & Verified** | `src/components/RentalHistoryPanel.tsx`<br>• Integrated single-row compact layout placing search input, From Date, and To Date inline right next to each other.<br>• Removed legacy "Daily & Historical Date Range Filters" and verbose filter cards per user request. |
| **3** | **Amount Filter & Compact Controls** | **Developed & Verified** | `src/components/RentalHistoryPanel.tsx`<br>• Removed legacy standalone amount filter card; integrated direct sortable column headers with two-way `▲` / `▼` sort buttons for all financial dimensions. |
| **4** | **History Details (Deposit, Total, Discount, Damage, Collected)** | **Developed & Verified** | `src/components/RentalHistoryPanel.tsx`, `src/components/StopRentalModal.tsx`<br>• Implemented complete 7-part financial settlement formula and 7-card summary strip displaying Rental Value, Damage (+), Gross Rental, Advance (-), Discount (-), Balance Collected, and Total Revenue Received. |
| **5** | **Customer Advance Balance** | **Developed & Verified** | `src/components/StopRentalModal.tsx`, `src/components/StartRentalCard.tsx`, `src/components/CustomerManagementPanel.tsx`, `src/App.tsx`, `src/lib/supabaseSync.ts`<br>• Settle Modal: Cashier can choose to return excess deposit in cash or retain it as customer advance balance.<br>• Start Rental: Detects existing advance balance, offers 1-click toggle to deduct from upfront deposit with live breakdown.<br>• Customer Directory: Sortable Advance Balance column, Add/Edit modal store credit field, and Customer Profile card.<br>• Cloud & Local Sync: Schema extended with `advance_balance`, `applied_advance_balance`, `refund_amount`, `credited_advance_balance`. |
| **6** | **WhatsApp Number Auto-Suggestion** | **Developed & Verified** | `src/components/StartRentalCard.tsx`, `src/components/CustomerManagementPanel.tsx`<br>• Separate Mobile and WhatsApp fields across Start Rental card and Customer Directory modals.<br>• Auto-suggests and syncs Mobile into WhatsApp when typing while allowing independent edits at any time.<br>• "Same as Mobile" quick sync action button for instantaneous 1-click copying. |

---

## 1.1 Development Tasks & Progress Tracking (Version 2.5.0)

### 📌 Historical Requirements Status (Version 2.5.0)
| Item # | Development Requirement Description | Status | Target Files & Implementation Notes |
|:---:|---|:---:|---|
| **1** | **Purchase, Rates & Inventory Integration** | **Developed (Awaiting Manual Verification)** | `src/types.ts`, `src/components/SettingsPanel.tsx`, `src/components/PurchaseManagementPanel.tsx`, `src/utils/bicyclePosUtils.ts`, `src/lib/supabaseSync.ts`, `src/App.tsx`<br>• Classified types as **Rental / Sale / Both** with badge preview.<br>• Selectable Display Icon dropdown with expanded icons.<br>• Configured categories available during Purchase.<br>• Auto-generates next applicable serial number(s) and creates inventory records in `vehicles`. |
| **2** | **Direct Sales & Revenue (Available Inventory & Pricing)** | **Developed** | `src/components/SaleManagementPanel.tsx`, `src/App.tsx`, `src/components/SettingsPanel.tsx`<br>• Displays all inventory items currently available for sale in a table.<br>• Global search/filter across any keyword/value from the table.<br>• Item selection using checkboxes (single and bulk selection).<br>• Customer selection from Customer table with validation: *"Add the customer details in Customer."*<br>• Auto-calculation: Sale Price = Purchase Value + 20%.<br>• User-entered Discount Amount.<br>• Complete audit trail storing: Purchase Value, 20% markup, Sale Price, Discount Amount, and Final Sale Amount.<br>• Posts strictly the Final Sale Amount after discount to financial revenue.<br>• Updates inventory status of sold items to `sold` so they are no longer available for sale. |
| **3** | **Table Actions & Permissions** | **Developed** | `src/utils/auth.ts`, `src/App.tsx`, `CustomerManagementPanel.tsx`, `SettingsPanel.tsx`, `FinancePanel.tsx`, `PurchaseManagementPanel.tsx`, `SaleManagementPanel.tsx`<br>• **Admin Only**: Full Add, Edit, and Delete action buttons across all POS tables (Fleet Units, Categories, Customers, Finance Transactions, Purchases, Sales).<br>• **Other Permitted Users**: Add only according to module permissions; Edit and Delete action buttons strictly omitted from UI.<br>• **Instant Cache-Busting**: Integrated BroadcastChannel `'cycly_permissions_channel'`, `CustomEvent('cycly_roles_updated')`, and storage event listeners for immediate permission application across all tabs without reload. |
| **4** | **QR Code Bulk Download** | **Developed** | `src/components/SettingsPanel.tsx`<br>• Multi-select checkboxes on every row of the Fleet Serial Numbers table.<br>• "Select All" checkbox in table header for visible/filtered vehicles.<br>• Floating Bulk Action Toolbar displaying: unit count badge, sequential PNG QR code batch downloader, and printable A4 QR label grid sheet with serials, model, and vehicle type. |
| **5** | **Fleet Serial Number Delete Issue** | **Developed** | `src/components/SettingsPanel.tsx`, `src/lib/supabaseSync.ts`, `src/App.tsx`<br>• Blocks deletion of actively rented vehicles with immediate notification to settle rental first.<br>• Informs user when deleting vehicles with historical rental records.<br>• `deleteVehicleFromSupabase` deletes by both `id` and `serialNumber`.<br>• `handleUpdateVehicles` in `App.tsx` explicitly excludes deleted IDs/serials from cloud merges so deleted records can never resurrect from stale cloud reads. |
| **6** | **Global Theme & Colours** | **Developed** | `src/utils/theme.ts`, `src/components/PurchaseManagementPanel.tsx`, `src/components/SaleManagementPanel.tsx`<br>• Added `inputBg`, `accentBg`, and `accentText` to `getThemeClasses` in `theme.ts`.<br>• System-wide support for all 5 color accents: Emerald POS, Ocean Blue, Sun Amber, Royal Violet, Coral Rose.<br>• Strict theme-driven styling across containers (`appBg`, `cardBg`, `cardSubtleBg`, `modalBg`), inputs (`textInput`, `dropdownInput`, `searchInput`), tabs (`inactiveTab`, `activeTab`), and action buttons (`primaryBtn`). |
| **7** | **Purchase/Sale Visibility (Light/Dark Mode)** | **Developed** | `src/components/PurchaseManagementPanel.tsx`, `src/components/SaleManagementPanel.tsx`<br>• Full contrast audit for Light and Dark modes across Purchases, Available for Sale, Checkout, and Sales Ledgers.<br>• Fixed table header hover bug where white text appeared on light gray backgrounds.<br>• High-contrast styling for Amount breakdowns, serial assignment tags, checkout audit cards, and printable vouchers/receipts in both themes. |
| **8** | **Duplicate “+” Icon** | **Developed** | `PurchaseManagementPanel.tsx`, `SaleManagementPanel.tsx`, `CustomerManagementPanel.tsx`, `BicycleMessageTemplatesView.tsx`, `UserRoleMasterHub.tsx`, `UserRolesManager.tsx`<br>• Removed duplicate literal `+` characters from button labels and section titles where `<Plus />` icons are rendered. |
| **9** | **Message Selection Checkbox Dropdown** | **Developed** | `src/components/BicycleMessageTemplatesView.tsx`, `src/types.ts`<br>• Interactive "Message Dispatch ({count}/6)" dropdown button with live active counter.<br>• Checkbox dropdown toggling: Rental Start (Customer), Rental Start (Additional Contacts/Group), Rental Return (Customer), Rental Return (Additional Contacts/Group), Birthday Greetings, Overdue/Return Reminders.<br>• Immediate persistence to `AppSettings` and Supabase sync. |
| **10** | **WhatsApp Additional Contact/Group Delivery Troubleshooting** | **Developed** | `src/utils/bicyclePosUtils.ts`, `src/components/BicycleMessageTemplatesView.tsx`<br>• Comprehensive delivery tracking interface under "Delivery Logs & Troubleshooting" tab.<br>• Captures full recipient breakdown (customer, additional contacts, group links) with delivery status, gateway status, and direct wa.me fallback links.<br>• Includes diagnostic inspection for transactions such as `#REN-0000158` and live test dispatch runner. |

---

## 1.1 Development Tasks & Progress Tracking (Version 2.4.0)

### 📌 Short Development Requirements (Version 2.4.0)
| Req ID | Requirement Description | Status | Verification & Target Files |
|---|---|:---:|---|
| **REQ-1** | **Table Sorting: Descending Order by Default** | **Developed & Verified** | All tables display newest/latest records first across the POS |
| 1.1 | Active Rentals Table: Default sort descending by `startTime` | Developed & Verified | `src/components/ActiveRentalsList.tsx` (`.sort((a,b) => b.startTime - a.startTime)`) |
| 1.2 | Rental History Table: Default sort descending by `endTime` / `startTime` | Developed & Verified | `src/components/RentalHistoryPanel.tsx` (`sortField: 'endTime'`, `sortDir: 'desc'`) |
| 1.3 | Customer Directory: Default sort descending by `createdAt` / registration date | Developed & Verified | `src/components/CustomerManagementPanel.tsx` (`sortField: 'createdAt'`, `sortDir: 'desc'`) |
| 1.4 | Statement of Accounts: Default sort descending by date / createdAt | Developed & Verified | `src/components/FinancePanel.tsx` (`stmtSortDir: 'desc'`) |
| 1.5 | Fleet Inventory: Default sort descending by serial / last rented | Developed & Verified | `src/components/SettingsPanel.tsx` |
| 1.6 | Purchase Transactions: Default sort descending by date / createdAt | Developed & Verified | `src/components/PurchaseManagementPanel.tsx` (`sortField: 'date'`, `sortDir: 'desc'`) |
| 1.7 | Direct Sales Transactions: Default sort descending by date / createdAt | Developed & Verified | `src/components/SaleManagementPanel.tsx` (`sortField: 'date'`, `sortDir: 'desc'`) |
| **REQ-2** | **Motorbike KM Tracking (Start KM & End KM)** | **Developed & Verified** | Full Odometer lifecycle tracking for motorbikes |
| 2.1 | Motorbike detection utility (`isMotorbikeVehicle`) | Developed & Verified | `src/utils/bicyclePosUtils.ts` (checks vehicle type, model, and naming keywords) |
| 2.2 | Start KM input field on Start Rental Card for Motorbikes | Developed & Verified | `src/components/StartRentalCard.tsx` (shown when motorbike selected, passed to `onStartRental`) |
| 2.3 | Start KM persistence in `RentalRecord` and Supabase JSONB breakdown | Developed & Verified | `src/App.tsx`, `src/types.ts`, `src/lib/supabaseSync.ts` |
| 2.4 | Active Rentals Start KM indicator badge | Developed & Verified | `src/components/ActiveRentalsList.tsx` (shows odometer icon and start mileage badge) |
| 2.5 | End KM input field on Return / Settle Rental modal for Motorbikes | Developed & Verified | `src/components/StopRentalModal.tsx` (captures End KM, live calculates distance travelled) |
| 2.6 | End KM & Distance validation & persistence in final record | Developed & Verified | `src/components/StopRentalModal.tsx` (`startKm`, `endKm`, `distanceKm` in record & breakdown) |
| 2.7 | Receipt & History display of Start KM, End KM, and Total Distance | Developed & Verified | `src/components/RentalHistoryPanel.tsx` (printable receipt odometer section) |
| **REQ-3** | **WhatsApp Message Templates: Remove Duration & Immediate Application** | **Developed & Verified** | Live template propagation without duration mentions |
| 3.1 | Remove Usage Time / Duration from rental WhatsApp return templates | Developed & Verified | `src/utils/customer.ts` (removed `• Duration: {duration}` from `tmpl-return-thanks`) |
| 3.2 | Sanitize legacy cached duration strings in localStorage | Developed & Verified | `src/utils/customer.ts` (`getStoredMessageTemplates` strips obsolete duration lines) |
| 3.3 | Remove hardcoded duration text from Return Settle modal | Developed & Verified | `src/components/StopRentalModal.tsx` (uses `getActiveRentalMessage`) |
| 3.4 | Immediate use of updated templates without page refresh | Developed & Verified | `src/components/BicycleMessageTemplatesView.tsx` (`cycly_message_templates_updated` event) |
| 3.5 | Remove duration tags & previews from template editor UI | Developed & Verified | `src/components/BicycleMessageTemplatesView.tsx` |
| **REQ-4** | **Start/End Rental Automatic Notifications to Customer & Additional Contacts / Groups** | **Developed & Verified** | Multi-recipient automated WhatsApp dispatch system |
| 4.1 | Notification Contact & WhatsApp Group Link data structures | Developed & Verified | `src/types.ts` (`NotificationContact`, `WhatsAppGroupLink`, notification settings) |
| 4.2 | "Additional Contacts & Groups" maintenance UI under Message Templates | Developed & Verified | `src/components/BicycleMessageTemplatesView.tsx` (sub-tab for numbers, group links & toggles) |
| 4.3 | Automated dispatch engine (`dispatchRentalNotification`) | Developed & Verified | `src/utils/bicyclePosUtils.ts` (dispatches to customer, contact list & logs group links) |
| 4.4 | Auto-dispatch triggers on Start Rental | Developed & Verified | `src/components/StartRentalCard.tsx` (fires notification upon start confirmation) |
| 4.5 | Auto-dispatch triggers on End Rental | Developed & Verified | `src/components/StopRentalModal.tsx` (fires return notification upon settle confirmation) |
| **REQ-5** | **Purchase & Direct Sale Modules with Financial Integration** | **Developed & Verified** | Standalone Purchase and Sale panels feeding P&L and statement |
| 5.1 | Add **Purchase** and **Sale** side-menu navigation items | Developed & Verified | `src/components/Navbar.tsx` (`ShoppingBag`, `TrendingUp`), `src/utils/roleRouting.ts` |
| 5.2 | Role permissions `accessPurchase` and `accessSale` | Developed & Verified | `src/utils/auth.ts`, `src/App.tsx` (`tabPermMap`) |
| 5.3 | Purchase Management Module (`PurchaseManagementPanel.tsx`) | Developed & Verified | KPI cards, search, filters, descending table, "+ Record Purchase" modal, printable voucher |
| 5.4 | Direct Sale Management Module (`SaleManagementPanel.tsx`) | Developed & Verified | KPI cards, search, filters, descending table, "+ Record Sale" modal, printable receipt |
| 5.5 | Automatic financial records, Statement of Accounts, and P&L integration | Developed & Verified | Automatically records `IncomeEntry` (`expense` for purchases, `income` for sales) |

---

## 1.2 Development Tasks & Progress Tracking (Version 2.3.0)

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
- **Sorting State**: Field-based ascending/descending comparator supporting alphanumeric strings, timestamps, and currency numbers. Resets to Page 1 upon sort or filter change. All tables now default strictly to **descending order (newest/latest records first)**.

---

## 8. Motorbike KM Tracking Specification

### Vehicle Detection
- Detection occurs automatically via `isMotorbikeVehicle(vehicleTypeName, modelName)`:
  - Matches keywords: `motorbike`, `motorcycle`, `scooter`, `moped`, `dio`, `activa`, `pulsar`, `tvs`, `yamaha`, `honda`, `suzuki`, `bajaj`.
  - Non-motorbike rentals (Bicycles, Mountain Bikes, E-Bikes) bypass KM fields entirely.

### Mileage Lifecycle
1. **Start Rental**:
   - Start KM input field displayed with Odometer icon (`Gauge`).
   - Recorded as `startKm` on `RentalRecord` and embedded in `breakdown.startKm`.
   - Displayed as a badge on the active rental vehicle card (`ActiveRentalsList.tsx`).
2. **End Rental / Return Settle**:
   - Modal displays the rental's Start KM.
   - End KM input field provided.
   - Live distance calculation: `Distance Travelled = End KM - Start KM`.
   - Prevents submission if End KM < Start KM.
   - Stored in `RentalRecord` as `startKm`, `endKm`, and `distanceKm`.
3. **Receipt & History**:
   - Receipt Modal and printable receipts render a dedicated Odometer section showing Start KM, End KM, and Total Distance Travelled (KM).

---

## 9. WhatsApp Notifications & Message Templates Architecture

### Duration Field Removal
- All `{duration}` placeholders and hardcoded duration strings have been completely removed from rental return templates (`tmpl-return-thanks`).
- Sanitization automatically purges legacy `{duration}` lines from local cached templates in `localStorage`.
- Template tag list in the editor no longer offers duration as a viable tag.

### Instant Template Application
- Saving or editing a template in `BicycleMessageTemplatesView.tsx` dispatches a custom browser event `cycly_message_templates_updated`.
- All POS views (Rental Desk, Active Rentals, Settle Modal) immediately listen and re-render messages using `getActiveRentalMessage()`. No browser refresh is required.

### Additional Contacts & WhatsApp Group Maintenance
- Located under **Message Templates** $\rightarrow$ **Additional Contacts & Groups** sub-tab.
- **Additional Contacts**: Maintain names, phone numbers, and notification roles (Owner, Security, Manager, Accountant) with individual toggle switches.
- **WhatsApp Groups**: Maintain group names, invitation/webhook links, and operational purpose (Operations, Fleet Alerts, Accounts).
- **Auto-Dispatch Controls**:
  - Auto-send Start message to Customer
  - Auto-send Start message to Additional Contacts
  - Auto-send End message to Customer
  - Auto-send End message to Additional Contacts
- When Start or End rental is clicked, `dispatchRentalNotification()` automatically dispatches WhatsApp messages to the customer and all active additional contacts via `/api/whatsapp/send`.

---

## 10. Purchase & Direct Sale Modules

### Purchase Module (`PurchaseManagementPanel.tsx`)
- Side menu tab: **Purchase** (`id: 'purchase'`, icon: `ShoppingBag`).
- Dedicated to recording expenses for inventory, spare parts, safety equipment, maintenance, and fleet expansion.
- **Data Flow**:
  - Automatically records an `IncomeEntry` with `type: 'expense'`, `category: 'Purchase: <Category>'`.
  - Flow directly updates:
    - POS Financial Statement of Accounts (Debit column)
    - Profit & Loss Statement (Expenses breakdown)
    - Net Profit calculations
- Includes 50-row pagination, search, category filter, date range filter, and printable Purchase Voucher.

### Direct Sale Module (`SaleManagementPanel.tsx`)
- Side menu tab: **Sale** (`id: 'sale'`, icon: `TrendingUp`).
- Dedicated to direct retail revenue (spare parts, cycling merchandise, safety gear, refreshments, accessories, repair services).
- **Data Flow**:
  - Automatically records an `IncomeEntry` with `type: 'income'`, `category: 'Sale: <Category>'`.
  - Flow directly updates:
    - POS Financial Statement of Accounts (Credit column)
    - Profit & Loss Statement (Revenue breakdown)
    - Net Profit calculations
- Includes 50-row pagination, search, category filter, date range filter, and printable Sale Receipt.

---

## 11. Purchase, Rates & Inventory Integration Architecture (Item 1)

### Category Classification (Rental / Sale / Both)
- **Data Model**: `VehicleType.purpose` typed as `'rental' | 'sale' | 'both'`.
- **Rates & Inventory UI (`SettingsPanel.tsx`)**:
  - Added **Classification (Rental / Sale)** dropdown:
    - `🚲 Rental Fleet (Rental Only)`
    - `🏷️ Direct Sale (Sale Only)`
    - `🔄 Rental & Sale (Both)`
  - Each vehicle category card displays a prominent badge indicator (`Rental Only`, `Sale Only`, or `Rental & Sale`).
  - Synced to Supabase `vehicle_types` and resiliently cached in JSONB `rates.purpose`.

### Selectable Display Icon Dropdown
- Added expanded icons to `VehicleIconType` and `VehicleIcon.tsx`:
  - 🚲 Bicycle
  - ⚡ Electric Bike / E-Bike
  - 🏍️ Motorcycle / Scooter
  - 🛴 Kick / Electric Scooter
  - 🚗 Quad / Go-Kart / Car
  - 📦 Package / Boxed Item
  - 🏷️ Retail / Direct Sale Item
  - 🛒 Accessories & Merch
  - ⚙️ Spare Parts & Hardware
  - 🎯 Other / General Asset

### Connecting Purchase with Configured Categories
- In **Purchase Management** (`PurchaseManagementPanel.tsx`):
  - Categories dropdown displays all configured vehicle/asset types grouped under **Vehicle Types & Fleet (Auto-creates Serial Numbers)** with their classification tag (`[Rental]`, `[Sale]`, `[Rental & Sale]`), followed by **General & Operational Expenses**.
  - Selecting any configured vehicle type automatically enables **Add to Fleet Inventory & Auto-Assign Serials**.

### Automatic Serial Number Generation & Inventory Record Creation
- **Algorithm** (`generateNextSerialNumbersForType()` in `bicyclePosUtils.ts`):
  1. Inspects existing fleet units in `vehicles` matching the selected `typeId`.
  2. Extracts the prefix (e.g. `01-`, `02-`, `03-`, `BIKE-`, `MTB-`) and numeric suffix padding.
  3. If none exist yet, standardizes on numeric or abbreviation prefix.
  4. Generates `quantity` consecutive unique serial numbers starting from `maxNum + 1`.
- **Live Preview in Purchase Modal**:
  - Displays generated serial numbers in badges before saving.
- **Saving Execution**:
  1. Automatically creates `Vehicle` unit records in the fleet inventory with `status: 'available'`, `typeId`, `modelName`, `costPrice`, and `purchaseRef`.
  2. Syncs units to Supabase `vehicles` and `v_rental_vehicles`.
  3. Records financial expense in `IncomeEntry` (`type: 'expense'`), linking assigned serials in the remarks.
  4. Both financial statements and fleet unit tables are updated immediately without a reload.

---

## 12. Direct Sales & Revenue Architecture (Requirement 2)

### Overview
When navigating to **Direct Sales & Revenue** (`activeTab === 'sale'`), the default view immediately displays the **Available Inventory for Sale** table alongside an interactive **Direct Sale Checkout** panel, with access to the historical **Sales Ledger & Invoices**.

### Key System Capabilities & Workflows

1. **Available Inventory for Sale Table**:
   - Lists all fleet and retail units currently having `v.status === 'available'`.
   - Complete item details displayed:
     - Selection Checkbox (Row & "Select All Filtered" toggle)
     - Serial Number (with category-specific `VehicleIcon`)
     - Item / Model Name
     - Category / Vehicle Type
     - Purchase Ref / Invoice Number
     - Purchase Value (Cost Price)
     - Calculated Auto Sale Price (+20% markup)
     - Availability Status badge (`Available`)
     - Notes / Vendor details

2. **Global Search & Filter**:
   - Universal search input matching across: Serial Number, Model Name, Category, Purchase Ref, Cost Price, Sale Price, and Notes.
   - Quick Category filter dropdown.
   - Real-time matching counter (e.g. `Showing 12 of 12 available items`).

3. **Multi-Item Checkbox Selection**:
   - Interactive checkbox on every table row and in the table header.
   - Selected items dynamically populate the Direct Sale Checkout order list with live badges.

4. **Strict Customer Validation**:
   - Cashiers search and select an existing customer from the `Customer` table by Name, NIC/Passport, or Mobile Phone.
   - If the customer does NOT exist in the database, the system displays the mandatory warning:
     > **“Add the customer details in Customer.”**
   - Includes a one-click action button navigating directly to the **Customer** directory.
   - Direct sale cannot be completed without selecting a verified existing customer.

5. **Pricing Formula & Calculations**:
   - **Purchase Value**: Sum of cost prices of all selected units.
   - **20% Markup**: Automatically computed as `Purchase Value * 0.20`.
   - **Sale Price**: `Purchase Value + 20% Markup` (`Purchase Value * 1.20`).
   - **Discount Amount**: User-editable numeric input (validated $\ge 0$).
   - **Final Sale Amount**: `Sale Price - Discount Amount`.

6. **Audit Trail & Verification Data Storage**:
   - Stores all 5 financial verification metrics:
     1. **Purchase Value**
     2. **20% Markup**
     3. **Sale Price**
     4. **Discount Amount**
     5. **Final Sale Amount**
   - Stored across `SaleRecord`, persistent audit cache (`v_direct_sales_audit`), and in the remarks of the `IncomeEntry`:
     `Customer: [Name] (NIC: [NIC]) | Phone: [Phone] | Serials: [List] | Audit: [Purchase Value: X | Markup (20%): Y | Sale Price: Z | Discount: D | Final Sale Amount: F]`

7. **Strict Financial Revenue Posting**:
   - **Only the Final Sale Amount after discount** is posted to financial accounts as sales revenue (`IncomeEntry`, `type: 'income'`).
   - P&L statements, daily cash tallies, and Statement of Accounts reflect strictly the final net received revenue.

8. **Inventory Status Lifecycle Update**:
   - Upon completing the sale, every selected item's status in `vehicles` is immediately updated to `'sold'`.
   - The item is instantly removed from available inventory for sale and cannot be rented.
   - In Fleet Inventory (`SettingsPanel.tsx`), the item displays with a distinct purple **Sold** badge.

9. **Printable Sale Receipt & Voucher**:
   - Generates a formatted invoice receipt showing store header, customer details, sold serial numbers, and the complete audit calculation breakdown (Cost, +20%, Discount, Net Paid).

---

## 13. Dashboard Trip/Ride Count & Total Amount Architecture (Version 2.6.0 - Item 1)

### Overview
In the **Bicycle POS Dashboard** (`DashboardStats.tsx`), executive metrics are expanded into a dedicated 6-card responsive analytics grid, giving immediate high-level visibility to:
1. **Total Amount (All-Time Revenue)**
2. **Trip / Ride Count (Total Rides)**

### Component Specifications (`src/components/DashboardStats.tsx`)
- **Total Amount KPI Card**:
  - Displays the all-time aggregated rental revenue computed from `todayCompletedRentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0)`.
  - Prominent emerald border accent (`border-l-4 border-l-emerald-500`) and `All-Time` badge.
  - Subtext shows today's contribution (`Today: LK ...`) and total trip count.
  - Formatted with dynamic font scaling (`getDynamicAmountClass`) so figures like `LK41,550.00` never truncate with `...` or spill out of the card.
- **Trip / Ride Count KPI Card**:
  - Displays total completed rental trips (`todayCompletedRentals.length`) with prominent amber styling (`border-l-4 border-l-amber-500`) and `Total` badge.
  - Subtext clearly displays `{completedTodayCount} today · {totalActiveRentals} active`.
- **Deduplication & Layout**:
  - Removed duplicate `Active Rentals` and `Available Fleet` cards from the top row, keeping them exclusively in the dedicated **Status Distribution Grid** below.
  - Top row formatted as a clean 4-column executive layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5`), giving each card ample width.
- **Dynamic Chart Tooltip Positioning**:
  - Configured chart SVG container as `overflow-visible`.
  - When hovering peak data points near the top of the chart (`minY < 100px`), the tooltip dynamically positions *below* the point (`translate-y-3`) rather than clipping above the card boundary (`-translate-y-full`).
  - Guarantees the date header, Daily Income amount (`🟢 Daily Income: LK ...`), and Trip Count are always 100% visible inside the card.

---

## 14. Date Range Filter Architecture (Version 2.6.0 - Item 2)

### Overview
In the **Bicycle POS Rental History** (`RentalHistoryPanel.tsx`), the filter control panel is structured strictly according to the clean, user-friendly **Image 1 Specification**:

### Visual & Component Layout (Matching Image 1)
1. **Control Card Header**:
   - `Daily & Historical Date Range Filters` with a green calendar icon (`Calendar` from `lucide-react`) and subtle horizontal divider line.
2. **From Date & To Date Inputs (2-Column Grid)**:
   - Formatted in a clean 2-column grid (`grid grid-cols-1 sm:grid-cols-2 gap-4`).
   - **From Date**:
     - Label with emerald calendar icon and inline clear action when populated.
     - Input box with `rounded-2xl`, smooth border, emerald calendar icon on the left, placeholder `yyyy-mm-dd`, and native cyan calendar picker icon on the right.
     - Constrained with `max={toDate || undefined}` to prevent invalid inverted ranges.
   - **To Date**:
     - Label with emerald calendar icon and inline clear action when populated.
     - Input box with `rounded-2xl`, smooth border, emerald calendar icon on the left, placeholder `yyyy-mm-dd`, and native cyan calendar picker icon on the right.
     - Constrained with `min={fromDate || undefined}`.
   - Direct click invokes `showPicker()` for seamless calendar selection.
3. **Search In Records Input**:
   - Positioned directly below the date inputs without clutter or extra banners.
   - Prominent cyan uppercase header: `SEARCH IN RECORDS (RECEIPT #, SERIAL, NIC/PASSPORT, CUSTOMER NAME)` with search icon.
   - Rounded 2-column width cyan search bar (`rounded-2xl`, `border-2 border-cyan-400`) with quick clear (`X`) button.
4. **Table Header Actions (Secondary Controls)**:
   - `Payment Method` dropdown (`All Payments`, `Cash Only`, `Card / POS`, `QR / LankaQR`) and `Export CSV` button are neatly organized in the **Settled Rental Receipts & Detailed Log** table header alongside the dynamic total amount.

### Filtering & Aggregation Mechanics
- Records are dynamically filtered whenever `fromDate` or `toDate` changes:
  - Formats rental completion/start timestamp to `YYYY-MM-DD` and compares against selected boundaries.
  - Automatically updates the records count, total collected revenue, and pagination.

### Dashboard Trends Line Graph Date Integration
- **Custom Date Range Plotting**:
  - The Daily Rental Income & Trip Count Trends chart (`DashboardStats.tsx`) dynamically adapts to the selected `From Date` and `To Date`.
  - Instead of remaining restricted to default 7D/14D/30D views, `chartData` maps the exact consecutive calendar days within the filtered range (up to 90 days).
- **Date Details Display**:
  - **Chart Header**: Displays a high-contrast badge: `📅 Range: [From Date] → [To Date] ([N] Days)` with a quick `Reset` button.
  - **Summary Strip**: Displays period income, total completed trips, peak day revenue, and an active date span pill `📅 Range: [From Date] to [To Date]`.
  - **Adaptive X-Axis Labels**: Smart step skipping (`labelStep = points.length <= 10 ? 1 : points.length <= 20 ? 2 : Math.ceil(points.length / 10)`) prevents label crowding across 15–30 day ranges.
  - **Axis Ticks**: SVG tick marks identify each day point along the baseline.
  - **Zero-Activity Overlay**: When the filtered date range contains 0 matching trips, an informative overlay informs the user: *"No rental activity matching date & amount filter criteria"*.
  - **Interactive Hover Tooltip**: Displays the exact full date (`hoveredPoint.label` and ISO date), daily income, completed trips count, and threshold details.

---

## 15. Amount Filter Architecture (Version 2.6.0 - Item 3)

### Overview
In the **Bicycle POS Rental History** (`RentalHistoryPanel.tsx`) and **Dashboard** (`DashboardStats.tsx`), an amount filtering system provides numeric threshold filtering with up/down stepper controls and **Above (≥) / Below (≤)** conditional selection.

### Specifications & Features
1. **Above (≥) / Below (≤) Condition Selector**:
   - High-contrast toggle pill buttons allow users to switch between:
     - **Above (≥)**: Filters records with `totalAmount >= filterAmount`.
     - **Below (≤)**: Filters records with `totalAmount <= filterAmount`.
   - The input label and inside currency prefix dynamically update (`LK ≥` or `LK ≤`).
2. **Amount Input with Stepper Controls**:
   - `input[type="number"]` with step value of 100 LK and minimum 0.
   - Stepper controls on the right: `-` (decrease by 100) and `+` (increase by 100).
   - In Rental History: quick one-click amount presets (e.g. 500, 1000, 1500, 2000, 2400, 5000). In Dashboard: streamlined layout without `Quick:` buttons for a clean, distraction-free view.
   - Inline clear button (`Clear` / `Clear Amount`) when active.
3. **Dual-Surface Integration & Filter Basis (Daily Total vs. Per Trip)**:
   - **Daily Total vs. Per Trip Mode**:
     - **Daily Mode (Default on Dashboard)**: Evaluates the day's aggregated total revenue (`dailyIncome >= filterAmount`). Corrects the scenario where days with multiple smaller trips totaling > Rs. 2,000 (such as Sep 5 with 6 trips totaling LK 2,100) are accurately matched. Guarantees that all 7 peak days above Rs. 2,000 visible on the 30-day timeline are plotted and aggregated.
     - **Trip Mode**: Evaluates individual rental records (`r.totalAmount >= filterAmount`), allowing cashiers to isolate single high-value rental receipts.
   - **Rental History (`/bicycle-pos/history`)**: Integrated into the primary filter card alongside Date Range and Search In Records. Automatically filters table records and recalculates total collected amounts and pagination.
   - **Dashboard (`/bicycle-pos/dashboard`)**:
     - Minimal header: removed `"Date, Amount & Trip Analytics Filters"` label for a sleek aesthetic, highlighting the dynamic matched count badge and actions.
     - Synchronized with the top 4 KPI cards (Total Amount and Trip / Ride Count show filtered metrics and matched days count).
     - Synchronized with the Daily Rental Income & Trip Count Trends chart: daily amounts and trip counts strictly filter by the selected amount threshold and above/below condition.
     - Summary strip displays the active amount filter badge (e.g. `Amount: ≥ LK 2,000 (Daily Total)`).
     - Hover tooltips display the active threshold.

---

## 16. Trip Count Filter Architecture (Version 2.7.0)

### Overview
In the **Dashboard & Performance Analytics** (`DashboardStats.tsx`), a dedicated **Trip Count Filter** allows cashiers and managers to filter days and performance metrics based on completed trip volume.

### Specifications & Features
1. **Above (≥) / Below (≤) Condition Selector**:
   - Toggle pill buttons allow users to switch between:
     - **Above (≥)**: Filters days where daily trip count is greater than or equal to entered value (`dailyCount >= filterTripCount`).
     - **Below (≤)**: Filters days where daily trip count is less than or equal to entered value (`dailyCount <= filterTripCount`).
2. **Numeric Stepper Controls**:
   - `input[type="number"]` with step value of 1 and minimum 0.
   - Stepper controls on the right: `-` (decrease 1 trip) and `+` (increase 1 trip).
   - Clean, direct numeric input without preset buttons.
   - Inline clear button (`Clear`) when active.
3. **Multi-Filter Combination**:
   - Combines seamlessly with **Date Range** and **Amount Filter**.
   - Example: Find all days in September with Daily Income ≥ LK 2,000 **AND** Trip Count ≥ 5 trips.
4. **Visual & Analytical Feedback**:
   - Filter card header displays matched days and trips count: `[N] Days Matched ([T] Trips · LK ...)`.
   - Line chart plots the exact days satisfying both amount and trip count criteria, setting non-matching days to 0.
   - Summary strip and hover tooltips reflect the active trip count threshold.

---

## 17. Dashboard Filter Card UI & UX Layout Standardization (Version 2.7.1)

### Overview
To resolve the vertical misalignment and visual awkwardness in the Dashboard filter row, the layout was refined to achieve pixel-perfect alignment, balanced header composition, and uncluttered typography.

### Design & Alignment Enhancements (`DashboardStats.tsx`)
1. **Uniform Column Label Heights (`min-h-[28px]`)**:
   - All 4 filter columns (`From Date`, `To Date`, `Amount`, `Trip Count`) now share an identical `min-h-[28px] flex items-center justify-between mb-2` container.
   - Eliminates the previous issue where `Trip Count` labels wrapped into two lines (56px) and pushed its input box down by 28px relative to `From Date` and `To Date`.
2. **Compact, Non-Wrapping Toggle Controls**:
   - In **Amount**: Compact `[ Daily | Trip ]` and `[ ≥ | ≤ ]` pills fit neatly alongside `Amount` without breaking onto a new line.
   - In **Trip Count**: Replaced wide `Above (≥)` / `Below (≤)` pills with ultra-compact `[ ≥ | ≤ ]` symbols (~36px), preventing any line-wrapping.
3. **Uniform Input Dimensions & Clean Placeholders**:
   - All 4 inputs are explicitly sized with `w-full h-11 rounded-2xl`, ensuring exact baseline alignment across the entire row.
   - Adjusted internal padding (`pl-13 pr-16` on Amount, `pl-16 pr-16` on Trip Count) and replaced verbose sentences (`Daily total (e.g. 2000)...`, `Min trips/day...`) with clean placeholders (`e.g. 2000`, `e.g. 5`). No text is truncated or clipped with ellipses (`...`).
4. **Balanced Header Composition**:
   - Replaced the previous empty void with a sleek, minimalist status strip:
     - Left: Filter icon, `FILTERS` label, and live status (`Showing all 7-day timeline records` or `N Days Matched (Trips · LK)`).
     - Right: `Reset Filters` (when active) and `Open Full Rental History Table →`.

---

## 18. History Details Architecture (Version 2.8.0 - Item 4)

### Overview
In the **Bicycle POS Rental History** (`RentalHistoryPanel.tsx`), the complete financial lifecycle of completed rentals is made fully visible across the summary dashboard, data table, receipt breakdown modal, and CSV exports. The system explicitly tracks, displays, and aggregates the **5 Core Financial Dimensions**:
1. **Deposit Amount** (`depositAmount`): Upfront security deposit retained at check-out.
2. **Total Amount** (`totalAmount`): Gross bill calculated for rental duration.
3. **Discount** (`discountAmount`): Promotional discounts and fee deductions.
4. **Damage Charge** (`damageAmount`): Repair, penalty, or damage fees added at settlement.
5. **Total Collected Amount** (`totalCollected`): Actual net funds collected from the customer for the transaction (`Math.max(totalAmount, depositAmount)`).

### Component Specifications (`src/components/RentalHistoryPanel.tsx`)
1. **Executive 5-Card History Details Strip**:
   - Positioned in the first row of the panel, providing immediate high-level visibility:
     - **Deposit Amount**: Sky blue accent (`border-l-4 border-l-sky-500`) with upfront deposit totals.
     - **Total Amount**: Indigo accent (`border-l-4 border-l-indigo-500`) displaying gross billings.
     - **Discount**: Teal accent (`border-l-4 border-l-teal-500`) tracking promotions granted.
     - **Damage Charge**: Amber accent (`border-l-4 border-l-amber-500`) tracking penalty/damage collections.
     - **Total Collected Amount**: Emerald accent (`border-l-4 border-l-emerald-500`) reflecting net realized revenue.
   - Synchronized with Date and Amount filters, dynamically recalculating in real-time.
2. **Settled Rentals Table Columns**:
   - Added sortable column headers with two-way sorting (`▲` / `▼`):
     - `Deposit` (`depositAmount`): Text-right, sky blue styling.
     - `Total Amount` (`totalAmount`): Text-right, bold primary typography.
     - `Discount` (`discountAmount`): Text-right, teal styling (`-LK ...`).
     - `Damage` (`damageAmount`): Text-right, amber styling (`+LK ...`).
     - `Total Collected` (`totalCollected`): Text-right, bold emerald styling (`LK ...`).
   - Timing and Duration are cleanly consolidated into a single multi-line cell to preserve horizontal table space.
3. **Printable Receipt & Details Modal**:
   - Line-by-line financial breakdown displaying all 5 parameters:
     - `Deposit Amount: LK ...`
     - `Total Amount (Bill): LK ...`
     - `Discount: -LK ...`
     - `Damage Charge: +LK ...`
     - `TOTAL COLLECTED AMOUNT: LK ...` (bold high-contrast emerald banner)
4. **CSV Export Integration**:
   - `exportToCSV()` includes all 5 dimensions in the generated spreadsheet report.
5. **Unified Search & Inline Date Range Bar**:
   - Removed `"Daily & Historical Date Range Filters"` heading for a minimal, clean layout.
   - Removed `Amount Filter (≥ LK)` and all presets/controls from the history panel per explicit user request.
   - Reorganized into a single unified toolbar: **Search in Records** positioned on the left (`lg:col-span-6`), with **From Date** and **To Date** positioned directly to its right (`lg:col-span-3` each), perfectly baseline-aligned at `h-11 rounded-2xl`.
   - Adheres strictly to user-requested options without unrequested controls.

6. **Light Mode Customer Details Visibility Fix (`src/components/StartRentalCard.tsx`)**:
   - Resolved contrast issue where customer name, NIC, and contact details were styled with `text-white` or faint opacity on light backgrounds.
   - Refactored matched customer card with theme-adaptive styling:
     - Prominent dark slate typography (`text-slate-900 font-extrabold`) for customer full name in light mode.
     - High-contrast green badge for active status and bold emerald styling for NIC number.
     - Mobile, WhatsApp, and DOB attributes set on dedicated cards with high-contrast text (`text-slate-900 font-bold`) and crisp label badges.

7. **Dynamic Single-Row Layout for Search & Dates across Devices (`src/components/RentalHistoryPanel.tsx`)**:
   - Replaced fixed 12-column grid with a responsive flex container (`flex flex-col md:flex-row gap-3 items-end`).
   - Reduced search bar width (`w-full md:flex-1 min-w-[200px]`) allowing Search, From Date, and To Date to stay on a **single unified row** across desktop and tablet viewports without wrapping to a second line.
   - On mobile viewports, smoothly adapts to clean vertical stacking.

8. **Sticky Frozen Receipt Number & Complete Rental Details Table Display (`src/components/RentalHistoryPanel.tsx`)**:
   - Fixed issue where `#REN-0000168` and vehicle columns were pushed off-screen when scrolling horizontally to inspect amount details.
   - Configured `Receipt #` header and cells with `sticky left-0 z-20` / `z-10` with solid theme backgrounds (`bg-white dark:bg-slate-900`), border separator, and elevated shadow, guaranteeing `#REN-0000168` is permanently visible at all times.
   - Streamlined `SortTh` button footprint and cell padding (`px-2.5 py-2.5`) so all 12 rental and financial columns fit seamlessly on standard 1440px desktop viewports.
   - Cleaned up accidental paste in `src/utils/auth.ts`, ensuring 0 build errors.

---

## 19. 7-Part Rental Finance Architecture & Settlement Workflow (Version 2.9.0)

### Overview
To ensure 100% financial clarity and auditability across all vehicle rental operations, a standardized 7-part financial structure has been implemented across the settlement modal (`StopRentalModal.tsx`), general ledger finance posting (`App.tsx`), and the rental history module (`RentalHistoryPanel.tsx`).

### The 7-Part Financial Formula
1. **Rental Value**: Base hire charge for the trip duration.
2. **Damage Charge**: Additional fee entered for repairs or vehicle damage.
3. **Gross Rental Amount**: `Rental Value + Damage Charge`.
4. **Less Advance Paid**: Upfront deposit paid when the rental was started.
5. **Less Discount**: Promotional rebate or waiver deduction.
6. **Balance to Collect**: `Gross Rental Amount - Advance Paid - Discount` (or Refund Due if Advance > Net Bill).
7. **Total Rental Revenue Received**: `Advance Paid + Balance Collected = Gross Rental Amount - Discount`.

#### Concrete Numerical Example:
- Rental Value: **Rs. 1,500**
- Damage Charge: **Rs. 300**
- **Gross Rental Amount: Rs. 1,800**
- Less Advance Paid: **Rs. 1,000**
- Less Discount: **Rs. 100**
- **Balance to Collect: Rs. 700**
- **Total Rental Revenue Received = Advance (Rs. 1,000) + Balance Collected (Rs. 700) = Rs. 1,700**

### Finance Module Posting Rule
- **Strict Net Revenue Recognition**: Only the final **Total Rental Revenue Received** (e.g. **Rs. 1,700**) is posted to the Finance module as rental income (`IncomeEntry`, `type: 'income'`, `category: 'Rental Income'`).
- Prevents double-counting of deposits and ensures income ledgers accurately reflect net realized earnings.

### Rental History View Architecture (`RentalHistoryPanel.tsx`)
The History page separately displays all 7 financial dimensions across three core interfaces:
1. **7-Card Executive Financial Summary Strip**:
   - **Rental Value** (Indigo): Total base trip earnings.
   - **Damage Charge** (Amber): Total damage and penalty charges.
   - **Gross Rental** (Purple): Total gross billings before deductions.
   - **Advance Paid** (Sky): Total customer upfront security deposits.
   - **Discount** (Teal): Total discounts granted.
   - **Balance Collected** (Blue): Total balance funds collected on vehicle return.
   - **Total Revenue** (Emerald): Total realized revenue received (`Advance + Balance`).
2. **Settled History Data Table**:
   - Distinct sortable columns for all 7 metrics with two-way sort indicators (`▲` / `▼`).
   - `Receipt #` remains frozen sticky (`sticky left-0`) ensuring permanent visibility during horizontal scrolling.
3. **Printable Receipt & Details Modal**:
   - Itemized breakdown listing Rental Value, Damage (+), Gross Rental, Advance (-), Discount (-), Balance Collected, and bold Total Rental Revenue Received banner.
4. **CSV Export**:
   - Exports all 7 dimensions as dedicated columns in `Rental_History_Report.csv`.

---

## 20. Customer Advance Balance & WhatsApp Auto-Suggestion Architecture (Version 2.9.1)

### Overview
Version 2.9.1 implements full store credit / customer advance balance retention and automated WhatsApp contact number suggestions across the rental desk, settlement modal, and customer directory.

---

### 1. Customer Advance Balance Lifecycle & Math

#### A. Retention upon Rental Settlement (`StopRentalModal.tsx`)
When a rental settlement results in a **Refund Due** (i.e. `Advance Paid > Gross Rental - Discount`):
- The cashier is presented with two radio options:
  1. **Cash Refund**: Cashier physically returns cash to the customer immediately.
  2. **Keep as Customer Advance Balance (Store Credit)**: The refund amount is credited directly to the customer's account (`Customer.advanceBalance`), which will automatically be available for their next trip.
- Settlement breakdown updates dynamically:
  - If retained: Displays a green badge indicating `"✓ Rs. X will be stored in [Customer]'s account and automatically deducted on their next rental."`
  - Records `creditedAdvanceBalance: refundDue` and `refundRetainedAsAdvance: true` in the rental audit trail.

#### B. Deduction upon Starting a Next Rental (`StartRentalCard.tsx`)
- When matching a registered customer, if `customer.advanceBalance > 0`:
  - An emerald **Advance Balance Available** badge appears under the customer's profile card in Step 1.
  - In **Step 3 (Deposit & Payment)**, a dedicated **Customer Advance Balance** card appears:
    - Cashier can toggle *"Apply Customer Advance Balance"* ON or OFF.
    - Cashier can adjust the amount to use (defaults to full advance balance up to the required deposit).
    - Real-time financial summary displays:
      - **Required Upfront Deposit**: `Rs. X`
      - **Less Advance Balance Applied**: `- Rs. Y`
      - **Cash to Collect Now**: `Rs. max(0, X - Y)`
      - **Remaining Customer Balance**: `Rs. customer.advanceBalance - Y`
- The total deposit credited to the rental record remains `Rs. X`, preserving the 7-part financial settlement formula.
- In `App.tsx` (`handleStartRental`), the applied balance is automatically deducted from `customer.advanceBalance` and persisted to both localStorage and Supabase.

#### C. Customer Directory Management (`CustomerManagementPanel.tsx`)
- **Table Column**: Added a sortable **Advance Balance** column with two-way `▲` / `▼` sorting and emerald pill badges displaying current store credit.
- **Add / Edit Modal**: Cashiers and Admins can view or directly adjust a customer's `advanceBalance`.
- **Customer Profile View**: Displays a prominent **Customer Advance Balance** summary card.

---

### 2. WhatsApp Number Auto-Suggestion

#### A. Rental Desk Start Card (`StartRentalCard.tsx`)
- Customer phone inputs are cleanly partitioned into:
  - **Mobile Number**: Primary voice calling number.
  - **WhatsApp Number**: Target destination for start/end notifications and receipts.
- **Smart Auto-Sync**:
  - As the cashier types into `Mobile Number`, the input is automatically mirrored into `WhatsApp Number` if WhatsApp is empty or was identical to the previous mobile entry.
  - If the customer uses a different WhatsApp number, the cashier can edit the WhatsApp field independently without altering the voice mobile number.
  - A quick **"Same as Mobile"** action link is provided to re-sync if the fields diverge.

#### B. Customer Management Directory (`CustomerManagementPanel.tsx`)
- Identical auto-sync behavior and "Same as Mobile" shortcut button are implemented in the Add / Edit Customer modal.

---

### 3. Database Schema Extensions (`supabaseSync.ts` & SQL Migration)
- **`public.customers`**:
  - Added `advance_balance numeric DEFAULT 0`
- **`public.rentals`**:
  - Added `applied_advance_balance numeric DEFAULT 0`
  - Added `refund_amount numeric DEFAULT 0`
  - Added `credited_advance_balance numeric DEFAULT 0`
- Full bidirectional synchronization implemented in `fetchSupabaseData`, `syncCustomerToSupabase`, and `syncRentalToSupabase`.

