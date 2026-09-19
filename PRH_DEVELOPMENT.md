# PRH – Pesalai Rental Hub Development Document

**Project:** Multi-Business Management Application  
**Business Module:** PRH – Pesalai Rental Hub  
**Business Type:** Construction Equipment Rental Service  
**Rental Calculation:** Day-wise  
**Application Structure:** Same login, separate business modules  
**Related Existing Modules:** MGR Bicycle POS, MGR Transport  
**Objective:** Add PRH as a separate construction equipment rental business without changing the existing MGR Bicycle POS or MGR Transport workflows.

---

# 1. Business Structure

The same application will support three independent businesses:

```text
[MGR Bicycle POS]   [MGR Transport]   [PRH Rental Hub]
```

All three businesses can use the same authentication/login system.

However, the following must remain separated by Business Unit:

```text
Transactions
Rental Records
Finance
Income
Expenses
Profit & Loss
Reports
Inventory
Payments
Users / Permissions where applicable
```

Recommended business codes:

```text
MGR_POS
MGR_TRANSPORT
PRH
```

Every transactional record must contain:

```text
business_unit
```

to prevent data mixing between businesses.

---

# 2. PRH Business Purpose

PRH – Pesalai Rental Hub provides day-wise rental services for construction-related equipment and materials.

Examples:

```text
Scaffolding
Iron Jack
Safety Plates
Welding Machine
Ladder
GI Pipe
Clips
Construction Tools
Other Rental Equipment
```

The existing MGR Bicycle POS is mainly time/hour based.

PRH must calculate rental using:

```text
Daily Rental Rate × Quantity × Chargeable Days
```

The PRH module must support:

- Day-wise rental
- Multiple items in one rental
- Quantity-based items
- Serial-number-based equipment
- Partial returns
- Overdue rentals
- Deposits
- Damage/loss charges
- Customer reminders
- Reservations
- Payments
- Separate PRH Finance
- PRH Profit & Loss
- PRH reports

---

# 3. Top Application Business Switcher

At the top of the application provide:

```text
[MGR Bicycle POS]   [MGR Transport]   [PRH Rental Hub]
```

When PRH is selected, display only PRH-related menus and records.

---

# 4. PRH Side Menu

```text
Dashboard
New Rental
Active Rentals
Returns
Customers
Equipment & Rates
Inventory / Units
Reservations
Payments
Finance
Maintenance
Messages / Reminders
Reports
Users & Roles
Settings
```

---

# 5. Dashboard

PRH Dashboard should display:

```text
Today's New Rentals
Today's Returns
Active Rentals
Overdue Rentals
Reserved Equipment
Available Equipment
Equipment on Maintenance
Outstanding Customer Balance
Security Deposits Held
Today's Income
Monthly Income
Monthly Expenses
Monthly Profit / Loss
```

Alerts:

```text
OVERDUE RENTALS
LOW AVAILABILITY
DAMAGED ITEMS
MAINTENANCE ITEMS
PAYMENT OUTSTANDING
UPCOMING RESERVATIONS
```

---

# 6. Customer Management

Customer types:

```text
Individual
Contractor
Construction Company
Organization
```

Customer fields:

```text
Customer ID
Customer Type
Customer Name
NIC / Passport / Business Registration
Company Name
Contact Person
Hand Phone Number
WhatsApp Number
Email
Permanent Address
Construction Site Address
Emergency / Alternative Contact
Credit Limit
Outstanding Balance
Deposit Balance
Status
Remarks
Created Date
Created By
```

Example Customer ID:

```text
PRH-CUS-00001
```

---

# 7. Hand Phone and WhatsApp Number Behaviour

When user enters:

```text
Hand Phone Number
```

the system should automatically suggest the same number in:

```text
WhatsApp Number
```

Example:

```text
Hand Phone: 0771234567
WhatsApp:   0771234567
```

The WhatsApp field must remain editable.

Example:

```text
Hand Phone: 0771234567
WhatsApp:   0769876543
```

Recommended behavior:

```text
User types Hand Phone
        ↓
If WhatsApp field is empty
        ↓
Auto-fill same number
        ↓
User may manually change WhatsApp
```

Once manually changed, later edits to Hand Phone must not silently overwrite WhatsApp.

Provide:

```text
☑ Same as Hand Phone
```

---

# 8. Equipment Types

PRH must support two inventory methods.

## Quantity-Based Equipment

Examples:

```text
Scaffolding
GI Pipe
Clips
Safety Plates
Iron Jack
```

## Serial-Number-Based Equipment

Examples:

```text
Welding Machine
Ladder
Power Tools
Other Individual Assets
```

Each serial unit has its own status.

---

# 9. Equipment & Rates

Fields:

```text
Equipment ID
Equipment Code
Equipment Name
Category
Rental Method
Daily Rental Rate
Security Deposit
Minimum Rental Days
Late Charge Method
Late Charge
Replacement Value
Damage Charge Rule
Total Quantity
Unit of Measure
Status
Description
Created By
Created Date
```

Rental Method:

```text
Quantity Based
Serial Number Based
```

---

# 10. Inventory / Units

Statuses:

```text
Total
Available
Reserved
Rented
Maintenance
Damaged
Lost
Inactive
```

Formula:

```text
Available =
Total
- Rented
- Reserved
- Maintenance
- Damaged
- Lost
```

---

# 11. New Rental Workflow

```text
CUSTOMER
   ↓
Search Existing Customer
or Register Customer
   ↓
Select Rental Start Date
   ↓
Expected Return Date
   ↓
Add Equipment
   ↓
Enter Quantity
   ↓
Validate Availability
   ↓
Calculate Daily Rental
   ↓
Add Security Deposit
   ↓
Advance / Payment
   ↓
Confirm Rental
   ↓
Inventory → RENTED
   ↓
Agreement / Invoice
   ↓
Reminder Schedule Created
```

---

# 12. Rental Header Fields

```text
Rental ID
Rental Number
Business Unit = PRH
Customer ID
Customer Name
Customer Mobile
Customer WhatsApp
Site Address
Rental Start Date
Expected Return Date
Expected Rental Days
Security Deposit
Advance Payment
Rental Amount
Outstanding Amount
Status
Created By
Created Date
Remarks
```

Example:

```text
PRH-RENT-000001
```

---

# 13. Rental Item Fields

```text
Equipment ID
Equipment Name
Serial Number if applicable
Quantity
Daily Rate
Start Date
Expected Return Date
Chargeable Days
Rental Amount
Returned Quantity
Outstanding Quantity
Item Status
```

---

# 14. Day-Wise Rental Calculation

```text
Rental Amount =
Daily Rate × Quantity × Chargeable Days
```

Example:

```text
20 Iron Jacks
Daily Rate = Rs. 150
Rental Days = 4

20 × 150 × 4
= Rs. 12,000
```

For multiple items the system calculates each line separately and totals the rental.

---

# 15. Chargeable Day Rules

Admin settings:

```text
Minimum Rental Days
Start Day Counting Rule
Return Day Counting Rule
Grace Hours
Late Charge
Weekend Rule
Holiday Rule
```

Recommended default:

```text
Minimum = 1 Day
Any started rental day = 1 chargeable day
```

---

# 16. Availability Validation

```text
Requested Quantity <= Available Quantity
```

If not:

```text
Only 45 Iron Jacks are currently available.
Please reduce the requested quantity.
```

Do not allow unavailable quantities.

---

# 17. Active Rentals

Columns:

```text
Rental No.
Customer
Mobile
Site
Start Date
Expected Return
Days
Rental Amount
Paid
Outstanding
Overdue Days
Status
Actions
```

Actions:

```text
View
Receive Return
Receive Payment
Send Reminder
Print Agreement
```


---

# 18. Partial Returns

Partial returns are mandatory for PRH.

Example:

```text
Customer rents:
100 GI Pipes on 01 Sep

05 Sep:
Returns 60

08 Sep:
Returns remaining 40
```

System must maintain:

```text
Original Quantity = 100
Returned Quantity = 60
Outstanding Quantity = 40
```

Returned quantity stops accumulating rental charges after its return date.

Remaining quantity continues to accumulate charges until returned.

---

# 19. Partial Return Calculation

Example:

```text
100 pipes rented from Day 1

60 returned after 4 days
40 returned after 7 days
```

Calculation:

```text
60 × Daily Rate × 4 Days
+
40 × Daily Rate × 7 Days
```

Do not charge all 100 items for 7 days.

---

# 20. Return Workflow

```text
Active Rental
   ↓
Select Equipment
   ↓
Enter Return Quantity
   ↓
Enter Actual Return Date
   ↓
Inspect Equipment
   ↓
Good / Damaged / Lost
   ↓
Calculate Actual Days
   ↓
Calculate Rental Charge
   ↓
Late / Damage / Loss Charge
   ↓
Deposit Adjustment
   ↓
Payment / Refund
   ↓
Update Inventory
```

---

# 21. Return Status

```text
Partially Returned
Fully Returned
Overdue
Damaged
Lost
Closed
```

---

# 22. Damage / Loss Management

On return:

```text
Good Condition
Damaged
Lost
```

If Good:

```text
Returned
→ Available
```

If Damaged:

```text
Returned
→ Maintenance / Damaged
→ Not available for rental
```

If Lost:

```text
Lost
→ Replacement Charge
→ Stock / Unit Status = Lost
```

Configurable charges:

```text
Damage Charge
Repair Charge
Replacement Charge
Cleaning Charge
Other Charge
```

---

# 23. Reservations

```text
Customer
   ↓
Select Equipment
   ↓
Quantity
   ↓
Required From Date
   ↓
Expected Return Date
   ↓
Validate Future Availability
   ↓
Reservation
```

Reserved quantities must affect future availability.

Reservation statuses:

```text
Pending
Confirmed
Converted to Rental
Cancelled
Expired
```

---

# 24. Payments

Payment components:

```text
Rental Charge
Security Deposit
Advance Payment
Additional Rental Charge
Late Charge
Damage Charge
Loss Charge
Other Charge
Discount
Paid Amount
Outstanding Amount
Deposit Refund
```

Payment methods:

```text
Cash
Card
LankaQR
Bank Transfer
Other
```

---

# 25. Security Deposit

Security deposit must be tracked separately from rental income.

Example:

```text
Deposit Received       Rs. 10,000
Rental Amount          Rs. 25,000
Damage Charge          Rs.  2,000

Refundable Deposit =
Rs. 10,000 - Rs. 2,000
= Rs. 8,000
```

Deposit is not income until applied against a valid charge.

---

# 26. Separate Finance – Critical Requirement

Finance must remain separate for each business.

The application contains three businesses:

```text
1. MGR Bicycle POS
2. MGR Transport
3. PRH Rental Hub
```

Each business must maintain its own:

```text
Income
Expenses
Cash / Bank Transactions
Outstanding Receivables
Deposits
Profit & Loss
Statement of Accounts
Financial Reports
```

Do not combine financial transactions by default.

---

# 27. PRH Finance Module

When PRH is selected, Finance must show only:

```text
PRH Finance
```

PRH Finance should include:

```text
Dashboard
Income
Expenses
Customer Outstanding
Security Deposits
P&L
Statement of Accounts
Finance Reports
```

MGR Bicycle POS and MGR Transport financial records must not display here.

---

# 28. Business-Specific Finance Identification

Every finance record must include:

```text
business_unit
```

Values:

```text
MGR_POS
MGR_TRANSPORT
PRH
```

All finance queries must filter by this field.

---

# 29. Separate Business Performance

Example:

```text
MGR Bicycle POS
Revenue      Rs. 250,000
Expenses     Rs. 150,000
Profit       Rs. 100,000
```

```text
MGR Transport
Revenue      Rs. 600,000
Expenses     Rs. 420,000
Profit       Rs. 180,000
```

```text
PRH
Revenue      Rs. 400,000
Expenses     Rs. 230,000
Profit       Rs. 170,000
```

Admin may later have an optional consolidated report, but individual business P&L must remain separate.

---

# 30. PRH Income Categories

```text
Rental Income
Late Charges
Damage Charges
Loss / Replacement Charges
Delivery Charges
Other PRH Income
```

---

# 31. PRH Expense Categories

```text
Equipment Purchase
Equipment Repair
Maintenance
Transport
Staff Salary
Shop Rent
Electricity
Internet
Marketing
Fuel
Cleaning
Other PRH Expenses
```

---

# 32. PRH Profit & Loss

```text
PRH – PROFIT & LOSS

INCOME

Rental Income
Late Charges
Damage Charges
Other Income
------------------
Total Income

EXPENSES

Maintenance
Repairs
Salaries
Rent
Transport
Utilities
Marketing
Other Expenses
------------------
Total Expenses

NET PROFIT / LOSS
```

Formula:

```text
Net Profit / Loss =
PRH Total Income - PRH Total Expenses
```

---

# 33. PRH Statement of Accounts

Columns:

```text
Date
Reference
Description
Category
Debit
Credit
Balance
Payment Method
Entered By
```

Filters:

```text
Date Range
Income / Expense
Category
Customer
Rental Number
Payment Method
```

---

# 34. Finance Auto Posting

Rental-related transactions should automatically post into PRH Finance.

Example:

```text
Rental Payment
Reference: PRH-RENT-000125
Amount: Rs. 15,000
```

Automatically create:

```text
PRH Finance
Category: Rental Income
Credit: Rs. 15,000
```

Do not post the same rental payment twice.

Use unique source references.

---

# 35. Reminder Messages

PRH should automatically remind customers about rental and payment obligations.

Channels:

```text
WhatsApp
Email
```

Optional future:

```text
SMS
```

---

# 36. Reminder Events

Recommended reminders:

```text
Rental Confirmation
One Day Before Expected Return
Expected Return Date
Overdue Day 1
Overdue Day 3
Overdue Day 7
Outstanding Payment Reminder
Reservation Reminder
Deposit / Refund Notification
Rental Closed Message
```

Admin should configure which reminders are enabled.

---

# 37. Reminder Templates

Template fields:

```text
Template Name
Event Type
WhatsApp Message
Email Subject
Email Body
Active / Inactive
```

Variables:

```text
{customer_name}
{rental_number}
{start_date}
{return_date}
{overdue_days}
{equipment}
{outstanding_amount}
{phone}
{whatsapp}
```

Example before return:

```text
Dear {customer_name},

This is a reminder from Pesalai Rental Hub.

Rental: {rental_number}
Expected Return: {return_date}
Outstanding Equipment: {equipment}

Please return the rented items on or before the expected return date.

Thank you,
Pesalai Rental Hub
```

Example overdue:

```text
Dear {customer_name},

Your rental {rental_number} is overdue.

Expected Return Date: {return_date}
Overdue Days: {overdue_days}
Current Outstanding: Rs. {outstanding_amount}

Please contact Pesalai Rental Hub or return the equipment as soon as possible.
```

---

# 38. Reminder Scheduler

```text
Daily Scheduled Job
      ↓
Find Rentals Due Tomorrow
      ↓
Send Reminder
      ↓
Find Rentals Due Today
      ↓
Send Reminder
      ↓
Find Overdue Rentals
      ↓
Send Applicable Reminder
      ↓
Save Notification Log
```

Avoid duplicate reminders for the same event/day unless configured.

---

# 39. Notification Log

Maintain:

```text
Notification ID
Business Unit = PRH
Customer
Rental Number
Channel
Template
Destination
Message
Sent Date
Delivery Status
Error
```

Statuses:

```text
Pending
Sent
Delivered
Failed
```

---

# 40. Manual Reminder

In Active Rentals provide:

```text
Send Reminder
```

User can select:

```text
WhatsApp
Email
Both
```

System should use the saved customer contact information.

---

# 41. WhatsApp Contact Logic

If customer WhatsApp number exists, send WhatsApp to that number.

Do not automatically use Hand Phone if the user has specifically entered a different WhatsApp number.

If WhatsApp is empty, offer:

```text
Use Hand Phone Number
```

Do not silently overwrite saved contact preferences.


---

# 42. Maintenance

Maintenance fields:

```text
Equipment
Serial Number
Issue
Damage Date
Rental Reference
Repair Status
Estimated Cost
Actual Cost
Repairer
Expected Completion
Completed Date
Status
```

Statuses:

```text
Reported
Under Inspection
Under Repair
Completed
Scrapped
```

Maintenance equipment must not appear as available inventory.

---

# 43. Reports

Recommended PRH reports:

```text
Daily Rental Report
Active Rental Report
Overdue Rental Report
Partial Return Report
Customer Rental History
Equipment Availability
Equipment Utilisation
Reservation Report
Payment Collection Report
Outstanding Customer Report
Deposit Report
Damage Report
Loss Report
Maintenance Report
Rental Income Report
Equipment-wise Income
Customer-wise Income
PRH Expense Report
PRH P&L
PRH Statement of Accounts
Reminder / Notification Report
```

---

# 44. Equipment Utilisation

Useful KPI:

```text
Utilisation % =
Rented Days ÷ Available Days × 100
```

This helps identify:

```text
High-demand equipment
Low-demand equipment
Equipment requiring additional purchase
Unused equipment
```

---

# 45. Users & Roles

Recommended PRH roles:

```text
Admin
Manager
Cashier
Storekeeper
Finance User
Staff
```

---

# 46. Role Permissions

## Admin

```text
Full View
Add
Edit
Delete
Approve
Finance
Reports
Settings
Users
```

## Manager

```text
Rentals
Returns
Customers
Inventory
Payments
Reports
Selected Finance
```

## Storekeeper

```text
Equipment
Inventory
Returns
Maintenance
Reservations
```

## Cashier

```text
New Rental
Payments
Customers
Receipt
Reminder
```

## Finance User

```text
PRH Finance
Income
Expenses
P&L
Statement
Reports
```

---

# 47. Settings

PRH Settings should include:

```text
Business Name
Address
Phone
WhatsApp
Email
Invoice Prefix
Rental Number Prefix
Minimum Rental Days
Grace Hours
Late Charge
Deposit Rules
Reminder Rules
Reminder Times
WhatsApp Configuration
Email Configuration
Finance Categories
Currency
Print Settings
```

---

# 48. Recommended Database Tables

Suggested PRH tables:

```text
prh_customers
prh_equipment_categories
prh_equipment_types
prh_equipment_units
prh_inventory_balances
prh_rentals
prh_rental_items
prh_returns
prh_return_items
prh_reservations
prh_reservation_items
prh_payments
prh_security_deposits
prh_damage_charges
prh_maintenance
prh_finance_transactions
prh_finance_categories
prh_message_templates
prh_notification_log
prh_settings
```

Common authentication/roles can reuse the application's existing user system.

---

# 49. Common Business Unit Field

Where shared/common tables are used, add:

```text
business_unit
```

Allowed values:

```text
MGR_POS
MGR_TRANSPORT
PRH
```

Never load another business's records into PRH pages.

---

# 50. Rental Status

Recommended:

```text
Draft
Active
Partially Returned
Overdue
Fully Returned
Closed
Cancelled
```

---

# 51. Payment Status

```text
Unpaid
Partially Paid
Paid
Refund Due
Refunded
```

---

# 52. Reservation Status

```text
Pending
Confirmed
Converted
Cancelled
Expired
```

---

# 53. Inventory Validation Rules

Required:

```text
Requested quantity cannot exceed available quantity
Returned quantity cannot exceed outstanding rental quantity
Reservation quantity cannot exceed projected availability
Serial unit cannot be rented twice
Maintenance unit cannot be rented
Lost unit cannot be rented
Damaged unit cannot be rented until released
```

---

# 54. Finance Validation Rules

Required:

```text
Every finance transaction belongs to one business only
PRH Finance page shows PRH transactions only
Rental payment posts once
Deposit is separate from income
Refund is recorded separately
Deleted/voided transactions require audit
Only authorized users can edit/delete finance entries
```

---

# 55. Reminder Validation Rules

Required:

```text
Use PRH customer contact only
Use WhatsApp field when available
Phone automatically suggests WhatsApp only during data entry
Manually changed WhatsApp number must be preserved
Do not send duplicate scheduled reminder for same event
Store notification result
Failed reminders should be visible for retry
```

---

# 56. Audit Log

Record:

```text
Customer Created
Customer Updated
Rental Created
Rental Activated
Rental Returned
Partial Return
Rental Closed
Reservation Created
Payment Received
Deposit Received
Deposit Refunded
Damage Recorded
Maintenance Started
Finance Entry Added
Finance Entry Edited
Finance Entry Deleted
Reminder Sent
Reminder Failed
```

Store:

```text
User
Business Unit
Date
Time
Action
Reference
Old Value
New Value
```

---

# 57. Rental Agreement / Invoice

PRH rental document should contain:

```text
Pesalai Rental Hub
Rental Number
Customer Details
NIC / Business Registration
Phone
WhatsApp
Site Address
Start Date
Expected Return Date

Equipment
Quantity
Daily Rate
Expected Days
Expected Amount

Deposit
Advance
Outstanding

Rental Terms
Customer Signature
Staff Signature
```

Provide:

```text
Print
Download PDF
Reprint
```

---

# 58. Recommended Development Phases

## Phase 1 – PRH Foundation

```text
PRH top business switcher
PRH Dashboard
Customers
Hand Phone → WhatsApp suggestion
Equipment & Rates
Inventory
Users & Roles
```

## Phase 2 – Rental Operations

```text
New Rental
Multiple Equipment
Day-wise Calculation
Availability Validation
Active Rentals
Rental Agreement
```

## Phase 3 – Returns

```text
Full Return
Partial Return
Overdue Calculation
Damage
Loss
Inventory Update
```

## Phase 4 – Reservations & Payments

```text
Reservations
Future Availability
Payments
Security Deposits
Refunds
Outstanding
```

## Phase 5 – Separate PRH Finance

```text
PRH Income
PRH Expenses
PRH Finance Dashboard
PRH P&L
PRH Statement
Auto-post Rental Payments
Finance Reports
```

## Phase 6 – Reminders

```text
Message Templates
WhatsApp
Email
Return Reminders
Overdue Reminders
Outstanding Payment Reminders
Notification Log
```

## Phase 7 – Maintenance & Reports

```text
Maintenance
Equipment Utilisation
Advanced Reports
Audit
```

---

# 59. Recommended Initial Manual-Test Scope

For first development/testing, implement:

```text
1. PRH Business Button
2. PRH Side Menu
3. Customers
4. Hand Phone → WhatsApp suggestion
5. Equipment & Rates
6. Inventory
7. New Rental
8. Day-wise Calculation
9. Active Rentals
10. Full / Partial Return
11. Payments
12. Separate PRH Finance
13. PRH P&L
14. Basic Customer Reminder
```

After these work properly, add advanced reservation, maintenance and reporting features.

---

# 60. Overall PRH Workflow

```text
                         PRH
                          |
           +--------------+--------------+
           |                             |
           v                             v
        CUSTOMER                     EQUIPMENT
           |                             |
           +-------------+---------------+
                         |
                         v
                    NEW RENTAL
                         |
                         v
              Validate Availability
                         |
                         v
                Day-wise Calculation
                         |
                         v
               Payment / Deposit
                         |
                         v
                    ACTIVE RENTAL
                         |
             +-----------+-----------+
             |                       |
             v                       v
         REMINDERS                 RETURN
                                     |
                         +-----------+-----------+
                         |                       |
                         v                       v
                    PARTIAL RETURN          FULL RETURN
                         |                       |
                         +-----------+-----------+
                                     |
                                     v
                           FINAL CALCULATION
                                     |
                                     v
                         Payment / Deposit Refund
                                     |
                                     v
                              PRH FINANCE
                                     |
                           +---------+---------+
                           |                   |
                           v                   v
                          P&L             STATEMENT
```

---

# 61. Separate Finance Architecture

```text
                   SINGLE LOGIN
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
    MGR POS       MGR TRANSPORT      PRH
        |              |              |
        v              v              v
   MGR POS        TRANSPORT        PRH FINANCE
   FINANCE         FINANCE
        |              |              |
        v              v              v
      P&L            P&L            P&L
        |              |              |
        v              v              v
   Statement       Statement      Statement
```

Financial data must remain separate even though the login is shared.

---

# 62. Acceptance Criteria

Development is successful when:

- [x] PRH appears next to MGR Transport at the top.
- [x] Existing MGR Bicycle POS is not changed.
- [x] Existing MGR Transport is not changed.
- [x] PRH has its own side menus.
- [x] Customer can be created.
- [x] Hand phone automatically suggests same WhatsApp number.
- [x] WhatsApp number can be manually changed.
- [x] Manually changed WhatsApp number is preserved.
- [x] Equipment can be quantity-based or serial-based.
- [x] Day-wise rental amount calculates correctly.
- [x] Multiple items can be rented in one rental.
- [x] System prevents unavailable quantity rental.
- [x] Partial return calculation works.
- [x] Full return works.
- [x] Damage/loss is recorded.
- [x] Inventory updates correctly.
- [x] Payments and deposits are tracked separately.
- [x] PRH Finance displays only PRH transactions.
- [x] MGR POS Finance remains separate.
- [x] MGR Transport Finance remains separate.
- [x] PRH P&L is separate.
- [x] PRH Statement is separate.
- [x] Customer reminders can be sent.
- [x] Scheduled overdue/return reminders work.
- [x] Reminder logs are maintained.
- [x] User permissions work.
- [x] All important actions are audited.
- [x] Refresh/logout/login does not lose saved PRH data.

---

# 63. Final Recommended Application Structure

```text
=========================================================
              MULTI-BUSINESS APPLICATION
=========================================================

[MGR Bicycle POS]   [MGR Transport]   [PRH Rental Hub]


PRH RENTAL HUB
│
├── Dashboard
├── New Rental
├── Active Rentals
├── Returns
├── Customers
├── Equipment & Rates
├── Inventory / Units
├── Reservations
├── Payments
├── Finance
├── Maintenance
├── Messages / Reminders
├── Reports
├── Users & Roles
└── Settings
```

The PRH module must operate as an independent business inside the same application, with its own rental transactions, finance, P&L, customer reminders and reports while reusing common authentication and application infrastructure where appropriate.

---

# 64. Node.js Architecture & Implementation Record (v1.0.0 PRH Release)

### Server & Runtime
- **Node.js Express Server (`server.js`)**: Serves the application directly on `http://localhost:9898` using Node.js without using Vite dev server.
- **Port Management**: Dedicated port `9898` exclusively handled by `server.js`.
- **API Endpoints**:
  - `GET /api/health`: Server health check status.
  - `POST /api/whatsapp/send`: WhatsApp proxy forwarder.
  - `GET *`: SPA catch-all serving `dist/index.html`.
- **Package Scripts**:
  - `npm run dev`: Runs `node server.js`
  - `npm start`: Runs `node server.js`
  - `npm run build`: Compiles production bundle via `vite build`

### PRH Code Structure
- `src/types/prhTypes.ts`: Full data contracts (`PRHCustomer`, `PRHEquipment`, `PRHRental`, `PRHRentalItem`, `PRHReturnRecord`, `PRHPayment`, `PRHFinanceTransaction`, `PRHReservation`, `PRHMaintenance`, `PRHReminderTemplate`, `PRHNotificationLog`, `PRHSettings`).
- `src/utils/prhStorage.ts`: Segregated `localStorage` persistence under `prh_*` keys and seed data for construction equipment (scaffolding sets, Acrow iron jacks, safety catwalk plates, GI pipes, welding machine, extension ladder, 16kg demolition breaker).
- `src/components/prh/`:
  - `PRHDashboardView.tsx`: Overview KPI cards, overdue alerts, inventory progress bars.
  - `PRHNewRentalView.tsx`: Day-wise pricing calculation (`Daily Rate × Qty × Days`), availability validation, customer quick-register with Hand Phone → WhatsApp auto-suggest, deposit calculator, advance collection, and printable agreement.
  - `PRHActiveRentalsView.tsx`: Real-time tracking of active and overdue rentals, days elapsed, quick actions (View Agreement, Full/Partial Return, Payment, WhatsApp reminder).
  - `PRHReturnsView.tsx`: Full and Partial returns with inspection (Good / Damaged / Lost), damage fee calculations, deposit deduction/refund, and auto-posting to PRH Finance.
  - `PRHCustomersView.tsx`: Directory with contractor types, credit limits, and Phone → WhatsApp auto-suggest logic.
  - `PRHEquipmentView.tsx`: Equipment catalog & rates (quantity-based vs serial-based).
  - `PRHInventoryView.tsx`: Formula: `Available = Total - Rented - Reserved - Maintenance - Damaged - Lost` with unit inspection.
  - `PRHFinanceView.tsx`: 100% segregated PRH Finance with Income, Expenses, P&L, and 50-row paginated Statement of Accounts with sorting.
  - `PRHPaymentsView.tsx`: Ledger separating rental income from security deposits.
  - `PRHRemindersView.tsx`: WhatsApp & Email reminder templates, direct `https://wa.me/` dispatch, and notification log.
  - `PRHMaintenanceView.tsx`: Repair workshop tracking.
  - `PRHReservationsView.tsx`: Advance project booking.
  - `PRHReportsView.tsx`: Utilisation %, customer revenue analysis.
  - `PRHSettingsView.tsx`: Business configuration and rental prefixes.
  - `PRHHub.tsx`: Master PRH container coordinating sub-views.
- `src/components/Navbar.tsx`: Top business switcher (`[Bicycle POS] [MGR Transport] [PRH Rental Hub]`) and PRH side menu items.
- `src/App.tsx`: Wired `systemMode: 'prh_rental'` into main shell. Existing Bicycle POS and MGR Transport logic remains 100% untouched.

---

# 65. PRH UI Modernization & Standardization Tracking Matrix

**Standardization Guidelines Applied:**
1. **Light & Dark Mode Consistency**: Full theme-adaptive styling across all PRH components via `prhTheme.ts`. Elimination of mixed theme colors, dark slate blocks in Light mode, or low-contrast elements.
2. **Duplicate Button Elimination**: Redundant Add/New/Create buttons removed where the action is already available in the navigation or table header.
3. **Table Text Wrapping & Sort Headers**: All tables wrap multi-line text cleanly (`whitespace-normal break-words`) and interactive ascending/descending sorting icons are provided via `PRHTableHeader.tsx`.
4. **Searchable & A-Z Sorted Dropdowns**: Side-by-side filter buttons replaced with `PRHSearchableSelect.tsx` with real-time text filtering and A-Z ordering where applicable.
5. **Simple 4-Color Palette**: Strictly limited to Primary (Blue), Secondary (Slate), Success (Emerald), and Danger (Rose).
6. **Port Preservation**: Strictly running on dedicated port `http://localhost:9898`.

### Development Status Matrix

| Component / Module | Scope / Changes | Light & Dark Mode | Searchable Dropdowns (A-Z) | Table Sort & Text Wrap | Duplicate Buttons Removed | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Theme Utility (`prhTheme.ts`)** | Standardized 4-color palette, card, table, input, badge, modal tokens | [x] | N/A | N/A | N/A | **Completed** |
| **Searchable Select (`PRHSearchableSelect.tsx`)** | Typing/searching dropdown with A-Z sort and click-outside handling | [x] | [x] | N/A | N/A | **Completed** |
| **Table Header (`PRHTableHeader.tsx`)** | Ascending/descending sort indicator component with proper alignment | [x] | N/A | [x] | N/A | **Completed** |
| **PRHDashboardView** | KPI cards, banner, inventory progress bars; removed duplicate 'New Rental' | [x] | N/A | N/A | [x] | **Completed** |
| **PRHNewRentalView** | Searchable customer/equipment selectors; dual theme card & receipt styling | [x] | [x] | [x] | [x] | **Completed** |
| **PRHActiveRentalsView** | Filter dropdown, sortable columns, full text wrapping, return & payment modals | [x] | [x] | [x] | [x] | **Completed** |
| **PRHReturnsView** | Equipment return checklist, damage/loss charges, history table sorting | [x] | [x] | [x] | [x] | **Completed** |
| **PRHCustomersView** | Replaced side-by-side buttons with searchable dropdown, sortable headers | [x] | [x] | [x] | [x] | **Completed** |
| **PRHEquipmentView** | Category dropdown, equipment table sort, rate badges, modal inputs | [x] | [x] | [x] | [x] | **Completed** |
| **PRHInventoryView** | Category dropdown, available units calculation, serial units table sorting | [x] | [x] | [x] | [x] | **Completed** |
| **PRHFinanceView** | Financial sub-views dropdown, 50-row paginated ledger, transaction modal | [x] | [x] | [x] | [x] | **Completed** |
| **PRHPaymentsView** | Payment type dropdown, ledger sortable headers, deposit tracking | [x] | [x] | [x] | [x] | **Completed** |
| **PRHRemindersView** | Rental contract & template searchable dropdowns, dispatch log table sort | [x] | [x] | [x] | [x] | **Completed** |
| **PRHMaintenanceView** | Equipment searchable select, workshop records table sorting | [x] | [x] | [x] | [x] | **Completed** |
| **PRHReservationsView** | Customer & equipment searchable select, booking table sort, dual mode | [x] | [x] | [x] | [x] | **Completed** |
| **PRHReportsView** | Report type searchable dropdown, utilisation & revenue table sort | [x] | [x] | [x] | [x] | **Completed** |
| **PRHSettingsView** | Depot business identity, contract prefixes, calculation rules, dual mode | [x] | N/A | N/A | [x] | **Completed** |
| **PRHHub.tsx & App.tsx** | Theme mode integration, child view dispatching on port 9898 | [x] | N/A | N/A | N/A | **Completed** |

---

### Verification & Testing Status

- **Status Definitions:**
  - **Completed**: Code implementation finished, linted, and production bundle built successfully.
  - **In Development**: Currently being edited or refactored.
  - **Pending**: Backlogged for future scope.
  - **Verified**: Confirmed by manual testing by the user on `http://localhost:9898`.

- **Current Item Verification Queue (for User Manual Testing):**
  - [ ] Verify Light Mode & Dark Mode toggle on all 15 PRH tabs (no dark blocks on light theme, no washed out text on dark theme).
  - [ ] Verify `PRHSearchableSelect` dropdown searching and A-Z ordering on Customers, Equipment, Filters, and New Rental.
  - [ ] Verify Table Column sorting (click headers for asc/desc order) on Active Rentals, Customers, Equipment, Returns History, Finance, Payments, Maintenance, Reservations, and Reports.
  - [ ] Verify Text Wrapping on long customer names, phone numbers, and site addresses.
  - [ ] Verify no duplicate "Add / New / Create" buttons appear in headers or duplicate view triggers.
  - [ ] Verify application responds properly on `http://localhost:9898`.
