# MGR Transport System — Architecture & Developer Documentation

## 1. Overview & System Purpose

The **MGR Transport Module** is a multi-modal transport and boat booking marketplace integrated into Cycly Rent. It connects passengers with verified transport operators and vehicle/boat owners across Sri Lanka, supporting two primary listing modalities:
1. **Planned Trip (Type B)**: Route/scheduled trips with per-seat pricing, strict FIFO capacity limits, and seat holds.
2. **Vehicle Available (Type A)**: Full-day / chartered vehicle hire with day rates and calendar availability painting.

---

## 2. Core Architecture & Component Map

All transport views and actions are isolated under `src/components/mgr-booking/` and governed by the side-menu tabs in Cycly Rent:

```
src/
├── components/
│   └── mgr-booking/
│       ├── MGRBookingHub.tsx         # Master tab orchestrator & persistence hub
│       ├── MGRTransportBooking.tsx   # Core booking engine (Find, Listings, Requests, Calendar)
│       ├── MGRFleetView.tsx          # Vehicle & boat registry (photos, specs, docs)
│       ├── MGROwnersDriversView.tsx  # Owner & driver rosters with verification
│       ├── MGRRoutesView.tsx         # Route master & schedule definitions
│       ├── MGRDashboardView.tsx      # Transport analytics & KPI summary
│       ├── MGRMarketplaceAdminView.tsx # Admin compliance & approval console
│       └── MGRSettingsView.tsx       # Convenience fee % & marketplace configuration
├── types/
│   ├── mgrBooking.ts                # Fleet, Owner, Driver, and Settings interfaces
│   └── mgrTransportV2.ts            # Listing, Booking Request, Calendar, and FIFO interfaces
└── data/
    └── mgrInitialData.ts            # Baseline vehicles, routes, schedules, settings
```

---

## 3. Side-Menu Navigation Tabs

The module preserves all official side-menu tabs, routed through `MGRBookingHub.tsx`:

| Tab Identifier | Label | Target Component / View | Persona Access |
|---|---|---|---|
| `mgr-dashboard` | Dashboard | `MGRDashboardView` | All |
| `mgr-search` | Find Transport | `MGRTransportBooking (view="search")` | All |
| `mgr-bookings` | My Bookings | `MGRTransportBooking (view="requests")` | All |
| `mgr-fleet` | Transport Fleet | `MGRFleetView` & `MGRTransportBooking (view="owner-listings")` | Owners & Admins |
| `mgr-routes` | Routes & Schedules | `MGRRoutesView` | Admin Only |
| `mgr-owners` | Owners & Drivers | `MGROwnersDriversView` | Owners & Admins |
| `mgr-requests` | Booking Requests | `MGRTransportBooking (view="requests")` | Owners & Admins |
| `mgr-settings` | Transport Settings | `MGRSettingsView` | Admin Only |
| `mgr-admin` | Marketplace Admin | `MGRMarketplaceAdminView` | Admin Only |

---

## 4. Key Features & Business Rules

### 4.1. Visual Distinction in Find Transport
- **Type B (Planned Trip)**: Indigo badges with **"Book Seats"** action button.
- **Type A (Vehicle Available)**: Emerald badges with **"Book Vehicle"** action button.

### 4.2. FIFO Seat Calculation & Real-Time Capacity
To eliminate over-booking, remaining seats are computed dynamically:
$$\text{Remaining Seats} = \text{Total Seats} - \text{Confirmed/Paid Seats} - \text{Active FIFO Holds (pending within 15 min)}$$
- If $\text{Remaining Seats} \le 0$, the listing is automatically hidden from Find Transport search results for that date.
- Seat count bounds $[\min = 1, \max = \text{Remaining Seats}]$ are enforced in the booking dialog.
- If a passenger requests more seats than available, a warning popup notifies them to adjust their count, disabling the submit button until valid.

### 4.3. Planned Trip Pricing Breakdown
Booking requests for Planned Trips render a transparent fare calculation:
- Requested Seats
- Per-Seat Amount
- Seat Subtotal ($N \times \text{Fare}$)
- Platform Convenience Fee (% configured in Settings)
- Total Payable Amount

### 4.4. Cross-Type Date Conflict Prevention
Vehicles cannot be listed under conflicting modalities on the same calendar date:
- Painting full-vehicle availability (Type A) on a date validates against any existing Type B Planned Trips for that vehicle.
- Registering a new Planned Trip (Type B) rejects dates that already have Type A availability or an existing planned trip for that vehicle.

### 4.5. Strict Contact Privacy
- **Passenger Contacts** (name, phone, pickup location) are masked with `***` from Owners until the booking request is marked as `confirmed` AND `paid`.
- **Owner Contacts** (name, phone) are masked from Passengers until confirmed and paid.
- **System Administrators** maintain complete unmasked visibility at all lifecycle stages for audit and support.

### 4.6. Multi-Photo Fleet Registration
- Owners can upload or paste up to **5 vehicle/boat photos**.
- In the registration form, the **Assigned Owner** field automatically defaults and locks to the logged-in owner.
- Administrators retain the ability to re-assign or select any registered owner.

---

## 5. Build, Test, and Verification

Run the following commands to validate module health:
```bash
# Type check without compilation
npx tsc --noEmit

# Production bundle build
npm run build

# Development preview server
npm run dev
```
