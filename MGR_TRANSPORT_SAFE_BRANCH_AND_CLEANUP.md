# MGR Transport – Safe Branch, Seat Validation, Privacy & Cleanup Plan

## Purpose

Apply the following changes **only to the MGR Transport module**.

Before any cleanup or file removal, create a new Git branch and copy the complete current working development into that branch. This ensures the existing version can be recovered if any issue occurs during cleanup.

**Do not modify or remove Bicycle POS functions.**  
**Do not remove any existing MGR Transport side-menu items.**

---

# 1. Create a New Safety Branch First

Before changing or deleting any file, create a new Git branch from the current working branch.

Recommended branch name:

```bash
mgr-transport-cleanup-v2
```

Run:

```bash
git status
git add .
git commit -m "Backup current MGR transport development before cleanup"
git push
```

Create the new branch:

```bash
git checkout -b mgr-transport-cleanup-v2
```

Push the new branch to GitHub:

```bash
git push -u origin mgr-transport-cleanup-v2
```

Verify:

```bash
git branch
git status
```

The active branch should display:

```text
mgr-transport-cleanup-v2
```

---

# 2. Important Branch Rule

All new MGR Transport modifications, testing, cleanup, renaming and file removal must be performed only inside:

```text
mgr-transport-cleanup-v2
```

Do not perform cleanup directly on the current stable/main branch.

Keep the existing branch unchanged as the recovery version.

Recommended process:

```text
Current Working Branch
        |
        | Backup / Commit / Push
        v
mgr-transport-cleanup-v2
        |
        v
New Development
        |
        v
Cleanup
        |
        v
Manual Testing
        |
        v
Fix Issues
        |
        v
Final Verification
        |
        v
Merge Later
```

Do not merge this branch into the stable/main branch until manual testing is successfully completed.

---

# 3. Seat Capacity – FIFO Validation

For **Planned Trip / Seat Booking**, manage seats using FIFO:

**First Request, First Served.**

Validate the remaining seat count before accepting a passenger request.

Create a temporary seat hold based on the request date/time.

Earlier requests must receive priority.

When payment succeeds:

```text
Seat Hold
   ↓
Confirmed Seats
```

If the request is:

- Rejected
- Cancelled
- Payment Failed
- Payment Expired

release the held seats.

Formula:

```text
Remaining Seats =
Total Seats
- Confirmed Seats
- Active FIFO Seat Holds
```

When:

```text
Remaining Seats = 0
```

the vehicle/trip must not display in **Find Transport** for that particular date.

Seat validation must also happen at database/server level to prevent double booking.

---

# 4. Passenger Seat Count Validation

When passenger enters the required seat count:

```text
Minimum = 1
Maximum = Current Remaining Seats
```

If requested seats exceed remaining seats, display a popup:

```text
Only 4 seats are currently available.
Please reduce your requested seat count to continue.
```

Do not allow booking until the seat count is corrected.

Disable:

```text
Book / Request Seats
```

until the entered seat count is valid.

Revalidate seats again immediately before:

```text
Request Creation
Payment
Payment Confirmation
```

---

# 5. Planned Trip Amount Calculation

For Planned Trip seat booking, display:

```text
Requested Seats       3
Per Seat Amount       Rs. 1,200

3 × Rs. 1,200         Rs. 3,600
Admin Fee – 5%        Rs.   180
--------------------------------
Total Payable         Rs. 3,780
```

Formula:

```text
Seat Amount =
Requested Seat Count × Per Seat Amount

Admin Charge =
Seat Amount × Configured Admin Commission %

Final Amount =
Seat Amount + Admin Charge
```

For **Vehicle Available / Whole Vehicle Booking**:

```text
Owner Travel Charge
+ Admin Convenience Fee
= Final Amount
```

Admin commission / convenience fee must come from Admin Settings.

Do not permanently hard-code the percentage.

---

# 6. Prevent Same Vehicle and Date in Both Listing Types

A vehicle can be listed for a particular date as only one of the following:

```text
Type A – Vehicle Available
OR
Type B – Planned Trip
```

It must not be available in both types on the same date.

Validate before saving:

```text
Vehicle ID + Date + Active Listing
```

Example:

```text
Vehicle: NP CAB-1234
Date: 15/09/2026
Existing Type: Vehicle Available
```

If owner attempts to create Planned Trip for the same vehicle/date, display:

```text
This vehicle is already listed as Vehicle Available
for 15/09/2026.

Please remove or change the existing availability
before creating a Planned Trip for this date.
```

Apply the same validation in the opposite direction.

Also prevent duplicate records for:

```text
Same Vehicle + Same Date + Same Listing Type
```

---

# 7. Passenger / Owner Privacy Until Payment

Before payment is successfully completed, Passenger and Owner must not see each other's personal details.

## Before Payment – Passenger Must NOT See

- Owner Name
- Mobile Number
- WhatsApp
- Email
- Address
- Other private owner information

## Before Payment – Owner Must NOT See

- Passenger Name
- Mobile Number
- WhatsApp
- Email
- Address
- Other private passenger information

Before payment only display:

```text
Request Number
Vehicle
Travel Date
From
To
Seat Count
Booking Status
Travel Charge
Admin Fee
Total Amount
```

Admin can view all information at every stage.

---

# 8. Release Contact Details After Payment

Only when:

```text
payment_status = paid
AND
booking_status = confirmed
```

release the contact information.

## Passenger Can See

```text
Owner Name
Driver / Captain Name
Mobile
WhatsApp
Vehicle Registration
Required Trip Contact Information
```

## Owner Can See

```text
Passenger Name
Mobile
WhatsApp
Email
Required Pickup / Contact Information
```

Admin continues to have complete visibility.

---

# 9. Find Transport Seat Availability

Before displaying Planned Trip:

```text
IF Remaining Seats <= 0
    Hide Trip
ELSE
    Display Trip
```

Available seat count must always use the latest database value.

Do not depend on an outdated localStorage seat count.

---

# 10. Clean Current MGR Transport Development

Only start the cleanup after:

1. New branch is created.
2. Current code is committed.
3. New branch is pushed successfully.
4. New booking logic is working.
5. Initial manual testing is completed.

---

# 11. Rename Current Main Transport Component

Rename:

```text
MGRHotelStyleBooking.tsx
```

to:

```text
MGRTransportBooking.tsx
```

Update all imports and references.

There must be no:

```text
Hotel Style
Hotel-Style
Hotel Booking
```

terminology remaining in the MGR Transport UI or source code.

Use:

```text
MGR Transport Booking
```

---

# 12. Remove Old Bid Functionality

MGR Transport no longer uses bidding.

Remove:

```text
VehicleBidModal.tsx
```

Remove related variables and functions such as:

```text
VehicleBid
bidModalVehicle
bidModalMode
handleCreateBid
handleAcceptBid
handleRejectBid
bidsVehicle
onAcceptBid
onRejectBid
```

Remove old bid buttons and bid review windows.

Do not remove any side-menu item simply because its previous component is removed.

Reuse existing side menus with the new workflow.

---

# 13. Review Old Booking Components

After the new workflow passes manual testing, check whether these files are still referenced:

```text
PassengerTransportSearch.tsx
TransportListingCards.tsx
BookingModal.tsx
SeatMapModal.tsx
MGRBookingsView.tsx
MGRVehicleRequestsView.tsx
VehicleBidModal.tsx
```

For each file:

```text
1. Search all imports
2. Search all component references
3. Remove old handler/state references
4. Run TypeScript validation
5. Run production build
6. Delete only if no reference remains
```

Do not blindly delete files.

---

# 14. Remove Duplicate Old State and Handlers

Review:

```text
MGRBookingHub.tsx
MGRFleetView.tsx
```

Remove state and handlers related only to the old workflow, including:

- Old passenger search state
- Old booking modal state
- Old seat map modal state
- Old quote state
- Old bid state
- Duplicate booking creation handlers
- Duplicate availability logic

Keep one clear MGR Transport workflow.

---

# 15. Remove Demo / Development Data

Remove production dependency on hard-coded demo data such as:

```text
INITIAL_V2_LISTINGS
INITIAL_V2_REQUESTS
Sample owners
Sample passenger accounts
Sample phone numbers
Sample WhatsApp numbers
Sample bookings
Generated demo trips
Generated demo availability
Fallback personal information
```

All production data must come from:

```text
Supabase
Authenticated User
Actual Vehicle Records
Actual Owner Records
Actual Passenger Records
```

---

# 16. Consolidate Transport Types

Review:

```text
mgrBooking.ts
mgrTransportV2.ts
```

Identify duplicated:

- Interfaces
- Booking statuses
- Vehicle types
- Listing types
- Request types
- Notification types

Create one canonical transport model where practical.

Do not delete either type file until all imports have been migrated successfully.

---

# 17. Clean Documentation

After final testing, keep one current document:

```text
MGR_TRANSPORT_DEVELOPMENT.md
```

Move outdated documents into:

```text
docs/archive/
```

Examples:

```text
Previous transport modification documents
Old hotel-style documents
Old quotation/bid specifications
Old development drafts
```

This keeps the repository clean while preserving development history.

---

# 18. Package Manager Cleanup

Check whether the project uses npm.

If npm is the selected package manager, keep:

```text
package-lock.json
```

and remove:

```text
bun.lock
```

Only remove `bun.lock` after confirming the project is not intentionally using Bun.

Do not maintain multiple lock files unnecessarily.

---

# 19. Validate Before Every File Removal

Before removing any file:

```bash
grep -R "FileNameOrComponentName" src
```

or use IDE global search.

After cleanup run:

```bash
npm install
npm run build
```

If lint/typecheck scripts exist, also run:

```bash
npm run lint
npm run typecheck
```

Fix all errors before continuing.

---

# 20. Commit Cleanup in Small Steps

Do not make one large cleanup commit.

Recommended commits:

```bash
git add .
git commit -m "Add FIFO transport seat validation"
```

```bash
git add .
git commit -m "Add transport listing date conflict validation"
```

```bash
git add .
git commit -m "Add passenger owner privacy rules"
```

```bash
git add .
git commit -m "Remove obsolete MGR bid workflow"
```

```bash
git add .
git commit -m "Clean duplicate MGR transport components"
```

```bash
git add .
git commit -m "Final MGR transport cleanup and validation"
```

Push regularly:

```bash
git push
```

This allows individual changes to be reverted if a problem appears.

---

# 21. Final Required Process

```text
BACKUP CURRENT DEVELOPMENT
        ↓
Commit Existing Files
        ↓
Push Existing Branch
        ↓
Create mgr-transport-cleanup-v2
        ↓
Push New Branch
        ↓
Implement FIFO Seat Validation
        ↓
Implement Seat Count Validation
        ↓
Implement Pricing
        ↓
Prevent Duplicate Vehicle/Date Listings
        ↓
Implement Contact Privacy
        ↓
Manual Test
        ↓
Rename New Transport Component
        ↓
Remove Bid Workflow
        ↓
Remove Unused Old Components
        ↓
Remove Demo Data
        ↓
Consolidate Types
        ↓
Clean Documentation
        ↓
npm run build
        ↓
Manual Full System Test
        ↓
Push Final Branch
        ↓
Merge Only After Approval
```

---

# 22. Important Rules

- Do not remove Bicycle POS functionality.
- Do not remove existing MGR Transport side-menu items.
- Do not clean directly on the current stable branch.
- Do not delete a component before checking all references.
- Do not expose Passenger and Owner contact details before successful payment.
- Do not allow more seats than remaining capacity.
- Do not allow the same vehicle/date to exist as both Vehicle Available and Planned Trip.
- Do not confirm seats using only frontend/localStorage validation.
- Do not merge the cleanup branch until manual testing is successful.

---

## Recommended Branch

```text
mgr-transport-cleanup-v2
```

## Main Objective

Maintain one clean, secure and understandable MGR Transport booking workflow while preserving the existing working version for recovery.
