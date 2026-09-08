# MGR Transport Booking – Modification V2

**Project:** Mannar Green Ride (MGR)  
**Purpose:** Modify the half-developed Transport Marketplace into a simple hotel-style vehicle booking flow.  
**Important:** **Do not remove any existing side-menu item.**

## 1. Current Development – What Changes

The current MGR Transport module already has:
- Passenger transport search
- Car / Van / Bus / Boat
- Fleet management
- Owners / drivers
- Routes and schedules
- Seat booking
- Booking records
- Vehicle Requests / quotation flow
- Admin module

The following current behaviour must change:

1. Do **not** confirm a booking immediately when passenger selects a vehicle.
2. Do **not** calculate/finalize the travel charge before owner accepts.
3. Remove the **bid / multiple quotation** process from the user workflow.
4. Search must check the owner's real **available date** or **planned trip date + route**.
5. Keep all current side-menu items.

---

# 2. New Owner Listing Types

Each vehicle can be listed in one of two ways.

## Type A – Vehicle Available

Owner only publishes the dates the vehicle is available.

Example:

- Vehicle: Toyota KDH Van
- Available: 10 Sep, 11 Sep, 15 Sep
- No fixed route
- Passenger can request their own From / To route
- Passenger sends request to owner

## Type B – Planned Trip / Available Seats

Owner has already planned the journey.

Example:

- Vehicle: Bus
- Date: 15 Sep 2026
- Route: Mannar → Jaffna
- Departure: 08:00
- Total Seats: 45
- Available Seats: 12

Passenger can request the required number of available seats.

---

# 3. Passenger Search

Passenger can search:

- Vehicle Type: Car / Van / Bus / Boat
- Travel Date
- From
- To
- Number of Passengers / Seats
- With Driver / Without Driver where applicable

Search result should show:

### Vehicle Available
- Vehicle
- Owner
- Available date
- Capacity
- Driver option
- `Request Vehicle`

### Planned Trip
- Vehicle
- Date
- Route
- Departure time
- Total seats
- Available seats
- `Request Seats`

No bid button is required.

---

# 4. New Booking Workflow

```text
PASSENGER
   |
   v
Search Vehicle / Planned Trip
   |
   v
Send Booking Request
   |
   +---- WhatsApp + Email ----> OWNER
   +---- WhatsApp + Email ----> PASSENGER
   +---- WhatsApp + Email ----> ADMIN
   |
   v
OWNER
   |
   +---- Reject ----> Request Rejected
   |
   +---- Accept
           |
           v
      Enter Travel Charge
           |
           v
  System Adds Convenience Fee
           |
           +---- Notification to Passenger / Owner / Admin
           |
           v
        PASSENGER
           |
           v
        Make Payment
           |
           v
     Payment Successful
           |
           v
     BOOKING CONFIRMED
           |
           +---- Notification to Passenger
           +---- Notification to Owner
           +---- Notification to Admin
```

---

# 5. Request Status

Use this simple status flow:

```text
pending_owner
owner_rejected
awaiting_payment
confirmed
cancelled
```

Payment status:

```text
pending
paid
failed
refunded
```

---

# 6. Price Calculation

Owner enters only the **Travel Charge**.

Example:

```text
Owner Travel Charge     Rs. 20,000
Convenience Fee          Rs. 1,000
-----------------------------------
Passenger Total         Rs. 21,000
```

Formula:

```text
Convenience Fee = Travel Charge × Admin Configured Fee %
Final Amount = Travel Charge + Convenience Fee
```

The convenience fee percentage must be configurable by MGR Admin and should not be hard-coded as a permanent business rule.

---

# 7. Payment

For the current front-end development, the workflow can use a **Payment Complete / Payment Success** action.

For production:

```text
Payment Gateway
      |
      v
Successful Payment Callback / Webhook
      |
      v
Update payment_status = paid
Update request_status = confirmed
      |
      v
Reduce available seats
OR
Block the selected available date
```

The system must not reduce inventory before successful payment unless a temporary hold/expiry mechanism is later added.

---

# 8. Notifications

Notification must be triggered for every important process.

Recipients:

- Passenger
- Vehicle Owner
- MGR Admin

Channels:

- WhatsApp
- Email

Events:

1. Request created
2. Owner accepted + travel charge
3. Owner rejected
4. Payment pending
5. Payment completed
6. Booking confirmed
7. Booking cancelled

## Development Design

The browser should **not contain WhatsApp API or email API secret keys**.

Frontend sends a notification event to:

```text
VITE_MGR_NOTIFICATION_ENDPOINT
```

Backend / Supabase Edge Function then sends:
- WhatsApp Business API message
- Email

If the endpoint is not configured, the current patch stores the notification event locally for testing.

---

# 9. Side Menu

**Do not delete or remove any side-menu item.**

Existing MGR menu can remain:

```text
Find Transport
Bookings
Fleet
Routes
Owners / Drivers
Vehicle Requests
Admin
```

Recommended usage:

- **Find Transport** → hotel-style passenger search
- **Bookings** → request / price / payment workflow
- **Fleet** → existing vehicle details + new listing/availability configuration
- **Routes** → keep existing
- **Owners / Drivers** → keep existing
- **Vehicle Requests** → show the same direct request workflow; no bidding/quote comparison
- **Admin** → keep existing + configure convenience fee

---

# 10. Data Required

## Vehicle Listing

```text
listingMode
availableDates[]
plannedTripDate
plannedFrom
plannedTo
departureTime
totalSeats
availableSeats
```

`listingMode`:

```text
availability_only
planned_trip
```

## Booking Request

```text
requestNumber
vehicleId
ownerId
passenger
listingMode
travelDate
routeFrom
routeTo
seatCount
ownerTravelCharge
convenienceFee
finalAmount
requestStatus
paymentStatus
createdAt
updatedAt
```

---

# 11. Development Files in This Patch

This package includes:

```text
src/types/mgrTransportV2.ts
src/utils/mgrTransportNotifications.ts
src/components/mgr-booking/MGRHotelStyleBooking.tsx
supabase/migrations/20260907_mgr_transport_v2.sql
MGR_BOOKING_HUB_INTEGRATION.md
```

The new component is intentionally added without deleting the existing side-menu or old files. After testing, old bid/quotation UI can remain unused or be removed from the internal code in a later cleanup.

---

# 12. Acceptance Criteria

Development is complete when:

- [ ] Existing side menu remains unchanged.
- [ ] Owner can configure Vehicle Available listing.
- [ ] Owner can configure Planned Trip listing.
- [ ] Passenger can search by vehicle type/date/route.
- [ ] Passenger can request a vehicle or seats.
- [ ] No bid/quote comparison is shown.
- [ ] Owner can Accept or Reject.
- [ ] Owner must enter travel charge when accepting.
- [ ] Convenience fee is automatically added.
- [ ] Passenger sees travel charge + fee + final total.
- [ ] Payment success changes request to Confirmed.
- [ ] Planned-trip available seats reduce only after payment.
- [ ] Vehicle-available date is blocked only after payment.
- [ ] Passenger, owner and admin notification events are generated at each stage.
- [ ] Production WhatsApp/email is sent by backend/Edge Function, not browser secrets.
