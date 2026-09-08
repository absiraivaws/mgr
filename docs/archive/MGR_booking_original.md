# MGR Booking

## Mannar Green Ride – Transport Marketplace & Passenger Booking Module

**Project Name:** MGR Booking  
**System:** Mannar Green Ride Rental Management System  
**Module Type:** Additional Value-Added Transport Booking Services  
**Technology Context:** React + Vite + TypeScript + Supabase  
**Supported Transport Types:** Car, Van, Bus, Boat

---

# 1. Purpose

The purpose of **MGR Booking** is to extend the existing Mannar Green Ride rental application with an online transport marketplace where:

- Vehicle and boat owners can register.
- Owners can list cars, vans, buses and boats.
- Owners can publish availability dates, time slots and routes.
- Passengers can register and search for suitable transport.
- Passengers can search by route, date, vehicle type and driver requirement.
- Bus and boat seat availability can be displayed in real time.
- Passengers can book either:
  - an entire vehicle, or
  - individual seats.
- Booking notifications can be sent through WhatsApp and email.
- MGR administrators can approve owners, vehicles and bookings and monitor marketplace activity.

This module should be developed as a separate transport marketplace module without disturbing the existing bicycle hourly rental process.

---

# 2. Main System Actors

The MGR Booking module will have four main actors.

## 2.1 Passenger

The passenger can:

- Register an account.
- Login/logout.
- Search for transport.
- Select a route.
- Select date and time.
- Select vehicle type.
- Select with driver or without driver.
- Check bus or boat seat availability.
- Book a complete vehicle.
- Book individual seats.
- Receive booking confirmations.
- View booking history.
- Cancel eligible bookings.
- Submit ratings and reviews.

## 2.2 Vehicle / Boat Owner

The owner can:

- Register an owner account.
- Submit verification details.
- Add multiple vehicles or boats.
- Add vehicle photos.
- Add vehicle documents.
- Add drivers or captains.
- Assign drivers to vehicles.
- Add routes.
- Add vehicle availability.
- Add schedules.
- Accept or reject booking requests.
- Receive WhatsApp and email notifications.
- View booking history.
- View earnings and reports.

## 2.3 Driver / Captain

The driver or captain can:

- Maintain profile information.
- Maintain licence information.
- View assigned trips.
- View passenger pickup details.
- Update trip status.
- Receive trip notifications.

## 2.4 MGR Administrator

The administrator can:

- Verify owners.
- Verify vehicles.
- Verify boats.
- Verify drivers and captains.
- Approve or reject listings.
- Suspend accounts.
- Manage routes.
- Manage bookings.
- Configure charges and commission.
- View reports.
- Handle disputes.
- Monitor notifications.
- Monitor expiring documents.

---

# 3. High-Level System Architecture

```text
                    MANNAR GREEN RIDE
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
   Bicycle Rental     Transport Booking   Request Vehicle
   Existing System        Marketplace       Service
                           |
                +----------+----------+
                |          |          |
                v          v          v
               Car        Van       Bus / Boat
                |          |          |
                +----------+----------+
                           |
                           v
                    Owner Marketplace
                           |
                           v
                       Passengers
```

---

# 4. Owner Registration Module

Owners must register before listing any transport service.

## 4.1 Owner Information

Recommended fields:

| Field | Description |
|---|---|
| Owner ID | Auto-generated unique ID |
| Full Name | Required |
| NIC / Passport | Required |
| Address | Required |
| Mobile Number | Required |
| WhatsApp Number | Required |
| Email Address | Required |
| Business Name | Optional |
| Business Registration No. | Optional |
| Bank Account Details | For future settlements |
| Profile Photo | Optional |
| NIC / Passport Copy | Upload |
| Status | Pending / Verified / Suspended |
| Created Date | Automatic |

Example Owner ID:

```text
OWN-MGR-00001
```

## 4.2 Owner Verification Status

Recommended status values:

```text
Pending
Under Review
Verified
Rejected
Suspended
```

Only verified owners should be allowed to make listings visible to passengers.

---

# 5. Vehicle and Boat Registration

Each owner can register multiple vehicles or boats.

## 5.1 Vehicle Types

Supported categories:

```text
Car
Van
Bus
Boat
```

## 5.2 Vehicle Identification

Recommended unique numbering:

```text
MGR-CAR-00001
MGR-VAN-00001
MGR-BUS-00001
MGR-BOAT-00001
```

## 5.3 Vehicle Details

| Field | Description |
|---|---|
| Vehicle ID | Auto-generated |
| Owner ID | Linked owner |
| Vehicle Type | Car / Van / Bus / Boat |
| Registration Number | Required |
| Make | Example: Toyota |
| Model | Example: KDH |
| Year | Manufacturing year |
| Fuel Type | Petrol / Diesel / Hybrid / EV |
| Colour | Vehicle colour |
| AC | Yes / No |
| Total Seats | Passenger capacity |
| Luggage Capacity | Optional |
| Driver Option | With Driver / Without Driver / Both |
| Description | Vehicle description |
| Vehicle Photos | Multiple uploads |
| Insurance Expiry | Date |
| Revenue Licence Expiry | Date |
| Status | Pending / Active / Suspended |
| Created Date | Automatic |

---

# 6. Boat Specific Information

For boats, the following additional information should be included:

| Field | Description |
|---|---|
| Boat Name | Optional |
| Boat Registration No. | Required |
| Passenger Capacity | Required |
| Captain / Operator | Linked |
| Life Jackets Available | Yes / No |
| Departure Point | Required |
| Destination | Required |
| Safety Certificate | Upload |
| Licence Expiry | Date |
| Boat Photos | Multiple |
| Boat Type | Passenger / Leisure / Tour / Other |

---

# 7. Driver and Captain Management

Driver and captain records should be stored separately from vehicle records.

## 7.1 Driver / Captain Information

| Field | Description |
|---|---|
| Driver ID | Auto-generated |
| Owner ID | Linked owner |
| Full Name | Required |
| NIC | Required |
| Mobile | Required |
| WhatsApp | Required |
| Email | Optional |
| Address | Required |
| Driver Type | Vehicle Driver / Boat Captain |
| Driving Licence No. | Required for road vehicles |
| Licence Class | Required |
| Licence Expiry | Date |
| Driver Photo | Upload |
| Licence Photo | Upload |
| Experience | Optional |
| Languages | Optional |
| Rating | System generated |
| Verification Status | Pending / Verified / Suspended |

Example:

```text
DRV-MGR-00001
```

## 7.2 Driver Assignment

A driver can be linked to one or more vehicles.

Recommended relationship table:

```text
vehicle_drivers
```

---

# 8. Transport Booking Models

The system should support two major booking models.

## 8.1 Whole Vehicle Booking

Applicable to:

- Car
- Van
- Bus
- Boat

Example:

```text
Route: Mannar -> Jaffna
Date: 15/09/2026
Vehicle: Van
Driver: With Driver
Price: Rs. 18,000
```

Once confirmed, the selected vehicle should become unavailable for the selected booking period.

## 8.2 Seat Booking

Applicable mainly to:

- Bus
- Passenger Boat

Example:

```text
Total Seats: 45
Booked Seats: 31
Available Seats: 14
```

Formula:

```text
Available Seats = Total Seats - Confirmed Seats
```

Seat booking must use database-level validation/transaction handling to avoid double booking.

---

# 9. Availability Calendar

Availability should be stored by date and time, not only as a Yes/No flag.

Example:

| Date | Vehicle | Start | End | Status |
|---|---|---|---|---|
| 10 Sep 2026 | CAB-1234 | 06:00 | 18:00 | Available |
| 11 Sep 2026 | CAB-1234 | - | - | Unavailable |
| 12 Sep 2026 | CAB-1234 | 08:00 | 20:00 | Available |

## 9.1 Recurring Availability

Owners should also be able to configure recurring availability.

Example:

```text
Monday - Friday
06:00 AM - 10:00 PM
```

Owners must be able to block selected dates separately.

---

# 10. Route Management

Routes should be stored in a separate database table.

## 10.1 Route Information

| Field | Description |
|---|---|
| Route ID | Auto-generated |
| Start Location | Example: Mannar |
| Destination | Example: Jaffna |
| Via Locations | Optional |
| Distance | Optional |
| Estimated Duration | Optional |
| Pickup Points | Multiple |
| Drop-off Points | Multiple |
| Status | Active / Inactive |

Example:

```text
Route ID: ROUTE-001
From: Mannar
To: Jaffna
Via: Murunkan, Vavuniya, Kilinochchi
```

---

# 11. Passenger Registration

Passenger accounts should be separate from transport owner accounts.

## 11.1 Passenger Information

| Field | Description |
|---|---|
| Passenger ID | Auto-generated |
| Full Name | Required |
| Mobile Number | Required |
| WhatsApp Number | Required |
| Email | Required |
| NIC / Passport | Optional / Configurable |
| Password | Required |
| Verification Status | Verified / Unverified |
| Emergency Contact | Optional |
| Booking History | Automatic |
| Rating | Future |
| Created Date | Automatic |

Example:

```text
PSG-MGR-000001
```

---

# 12. Passenger Search Module

Passenger search should be simple and user-friendly.

## 12.1 Search Criteria

Passenger should be able to search using:

```text
From Location
To Location
Travel Date
Travel Time
Vehicle Type
With Driver / Without Driver
Number of Passengers
```

Vehicle Type options:

```text
Car
Van
Bus
Boat
```

## 12.2 Example Search

```text
From: Mannar
To: Jaffna
Date: 15/09/2026
Time: 08:00
Vehicle: Van
Driver: With Driver
Passengers: 4
```

---

# 13. Search Results

Search results should display important booking information.

## 13.1 Car / Van Result Example

```text
Toyota KDH Van

Rating: 4.8
Seats: 12
AC: Yes
Driver: Included
Route: Mannar -> Jaffna
Date: 15 Sep 2026
Price: Rs. 18,000

[View Details] [Book Now]
```

## 13.2 Bus Result Example

```text
MGR Express

Mannar -> Jaffna
Departure: 08:00 AM
Total Seats: 45
Available Seats: 14
Price: Rs. 850 per passenger

[Select Seats]
```

---

# 14. Bus and Boat Seat Map

A seat map can be implemented for seat-based bookings.

Example:

```text
      DRIVER

[01] [02]     [03] [04]
[05] [06]     [07] [08]
[09] [XX]     [11] [12]
[13] [XX]     [15] [16]
[17] [18]     [19] [20]
```

Legend:

```text
Available
Booked
Selected
Blocked
```

Passengers should be able to select one or more available seats.

---

# 15. Booking Workflow

```text
Passenger
   |
   v
Register / Login
   |
   v
Search Transport
   |
   v
Select Vehicle
   |
   +--> Whole Vehicle Booking
   |
   +--> Seat Booking
   |
   v
Create Booking Request
   |
   v
Owner Notification
   |
   +--> Accept
   |
   +--> Reject
   |
   v
Booking Confirmation
   |
   v
WhatsApp + Email Notification
   |
   v
Journey
   |
   v
Trip Completed
   |
   v
Rating / Review
```

---

# 16. Booking Status

Recommended booking status values:

```text
Pending
Owner Accepted
Owner Rejected
Awaiting Payment
Confirmed
Driver Assigned
Ready
Trip Started
Completed
Passenger Cancelled
Owner Cancelled
No Show
Refunded
```

These statuses should be tracked using an audit log.

---

# 17. Instant Booking

For selected verified owners, MGR can provide an Instant Booking option.

Conditions may include:

- Owner verified.
- Vehicle verified.
- Availability confirmed.
- Price predefined.
- Seat availability confirmed.

When Instant Booking is enabled, the booking can move directly to:

```text
Confirmed
```

without manual owner approval.

---

# 18. WhatsApp Notification Integration

The production system should use an approved WhatsApp Business API solution.

Recommended option:

```text
Meta WhatsApp Business Cloud API
```

## 18.1 Passenger Notifications

Send WhatsApp messages for:

- Booking request submitted.
- Owner accepted.
- Booking confirmed.
- Payment confirmed.
- Driver assigned.
- Trip reminder.
- Route/time changed.
- Booking cancelled.
- Refund completed.

Example:

```text
MGR Booking Confirmed

Booking: MGR-BK-00245
Route: Mannar -> Jaffna
Date: 15 Sep 2026
Time: 08:00 AM
Vehicle: Toyota KDH
Driver: Mr. XXXX
Contact: 07X XXX XXXX
```

## 18.2 Owner Notifications

Example:

```text
New Booking Request

Booking: MGR-BK-00245
Route: Mannar -> Jaffna
Date: 15 Sep 2026
Passengers: 4

Please open MGR Booking to Accept or Reject.
```

---

# 19. Email Notifications

Email notifications should be sent for:

- Registration verification.
- Booking request.
- Booking acceptance.
- Booking rejection.
- Payment confirmation.
- Driver assignment.
- Trip reminder.
- Schedule changes.
- Cancellation.
- Refund.
- Completed-trip receipt.

Email should provide detailed booking information while WhatsApp can be used for short alerts.

---

# 20. Real-Time Updates

Supabase Realtime should be used for:

- Vehicle availability changes.
- Seat availability.
- Booking status changes.
- Driver assignment.
- Schedule updates.
- Admin approval.

Example:

```text
Passenger books 4 seats
        |
        v
Database transaction
        |
        v
Available seats reduced
        |
        v
All connected users receive updated seat count
```

---

# 21. Recommended Database Tables

The following new tables are recommended.

| Table | Purpose |
|---|---|
| transport_owners | Owner details |
| transport_vehicles | Car, van, bus and boat details |
| drivers | Driver and captain records |
| vehicle_drivers | Driver-vehicle assignments |
| routes | Route master |
| route_stops | Pickup/drop-off points |
| vehicle_routes | Vehicle-route assignments |
| vehicle_availability | Availability dates and times |
| transport_schedules | Scheduled departures |
| passenger_accounts | Passenger profiles |
| transport_bookings | Main booking records |
| booking_passengers | Passenger list per booking |
| vehicle_seats | Seat layout |
| seat_bookings | Seat reservation records |
| booking_payments | Payment information |
| notifications | WhatsApp/email notification log |
| reviews | Ratings and reviews |
| owner_documents | Owner verification documents |
| vehicle_documents | Vehicle documents |
| booking_status_history | Booking audit trail |
| marketplace_settings | Commission and configuration |

---

# 22. Owner Dashboard

Recommended owner dashboard cards:

```text
New Requests
Confirmed Trips
Available Vehicles
Booked Seats
Today's Trips
Monthly Revenue
Outstanding Settlements
Ratings
```

## 22.1 Owner Menu

```text
Dashboard
My Vehicles
My Boats
Drivers / Captains
Routes
Availability Calendar
Schedules
Bookings
Payments
Notifications
Reviews
Profile
Documents
```

---

# 23. Passenger Dashboard

Recommended passenger menu:

```text
Find Transport
My Bookings
Upcoming Trips
Completed Trips
Cancelled Trips
Saved Passengers
Favourite Routes
Notifications
Reviews
Profile
```

---

# 24. MGR Admin Dashboard

The MGR administrator should have access to:

```text
Owner Approvals
Vehicle Approvals
Driver Approvals
Passenger Management
Routes
Schedules
Bookings
Seat Reservations
Payments
Commission
Notifications
Reviews
Complaints
Reports
Audit Logs
Settings
```

---

# 25. Security Requirements

Because this module will be public-facing, Supabase Auth and strict Row Level Security must be implemented.

## 25.1 Passenger Permissions

Passenger can:

- View approved public listings.
- View available routes.
- Create own bookings.
- View only own booking history.
- Update own profile.

Passenger cannot:

- View another passenger's private information.
- Modify owner data.
- Modify vehicle data.

## 25.2 Owner Permissions

Owner can:

- View own profile.
- Manage own vehicles.
- Manage own drivers.
- Manage own availability.
- View bookings related to own vehicles.

Owner cannot:

- Modify another owner's listings.
- View unrelated passenger personal data.
- Access administrator settings.

## 25.3 Driver Permissions

Driver can:

- View assigned trips.
- View required pickup information.
- Update permitted trip status.

## 25.4 Administrator Permissions

MGR administrators can receive permissions according to role.

Example:

```text
Super Admin
Booking Admin
Verification Officer
Finance Officer
Support Officer
```

---

# 26. Vehicle Request / Quotation Marketplace

An additional value-added feature should allow passengers to request transport when no suitable listing is found.

## 26.1 Passenger Request Example

```text
Vehicle Required: 20-seat AC Bus
From: Mannar
To: Colombo
Departure: 20 September 2026 - 05:00 AM
Return: 22 September 2026
Expected Budget: Rs. 95,000
```

## 26.2 Owner Quotation

Matching owners can submit quotations.

Example:

```text
Owner A: Rs. 88,000
Owner B: Rs. 92,000
Owner C: Rs. 90,000
```

Passenger can compare and select the preferred quotation.

## 26.3 Recommended Tables

```text
transport_requests
transport_request_quotes
```

---

# 27. Pricing Configuration

Pricing should support different methods.

## 27.1 Whole Vehicle Pricing

Possible pricing methods:

```text
Fixed Route Price
Per Kilometre
Per Hour
Per Day
Custom Quotation
```

## 27.2 Seat Pricing

Possible options:

```text
Fixed Fare Per Seat
Fare by Pickup / Drop-off Point
Adult / Child Fare
Promotional Fare
```

---

# 28. Commission Model

MGR should be able to configure service charges.

Possible models:

```text
Percentage Commission
Fixed Fee Per Booking
Fixed Fee Per Seat
Owner Subscription
Passenger Service Charge
```

Example:

```text
Booking Value: Rs. 20,000
MGR Commission: 5%
Owner Settlement: Rs. 19,000
MGR Income: Rs. 1,000
```

Commission rates should be configurable by vehicle type if required.

---

# 29. Payment Module – Future Phase

Recommended payment options:

- LankaQR
- Card Payment
- Bank Transfer
- Payment Gateway
- Cash / Pay to Driver
- Wallet – future

Recommended payment statuses:

```text
Pending
Paid
Failed
Cancelled
Refund Pending
Refunded
```

---

# 30. Rating and Review Module

After a completed trip, passengers can rate:

- Vehicle cleanliness.
- Driver behaviour.
- Punctuality.
- Safety.
- Overall experience.

Owners may also rate passengers if required.

Recommended rating scale:

```text
1 to 5 Stars
```

---

# 31. Document Expiry Alerts

The system should track:

- Vehicle insurance expiry.
- Revenue licence expiry.
- Driver licence expiry.
- Boat licence expiry.
- Safety certificate expiry.

Notifications should be sent to:

- Owner.
- MGR administrator.

Example:

```text
Document expires in 30 days
Document expires in 7 days
Document expired
```

---

# 32. Audit Log

Important system activities should be recorded.

Examples:

```text
Owner Registered
Vehicle Created
Vehicle Approved
Driver Updated
Booking Created
Booking Accepted
Booking Cancelled
Seat Reserved
Payment Updated
Refund Issued
Account Suspended
```

Each audit entry should store:

```text
User
Action
Date
Time
IP / Session
Old Value
New Value
```

where technically appropriate.

---

# 33. Reports

Recommended MGR reports:

- Daily bookings.
- Monthly bookings.
- Booking by vehicle type.
- Booking by route.
- Seat occupancy.
- Revenue by owner.
- Revenue by vehicle.
- Commission income.
- Cancelled bookings.
- Most active owners.
- Most popular routes.
- Passenger growth.
- Driver performance.
- Vehicle utilisation.
- Expiring documents.

---

# 34. Suggested Development Phases

## Phase 1 – Foundation

Develop:

- Supabase Auth.
- Passenger roles.
- Owner roles.
- Admin roles.
- Database tables.
- Row Level Security.
- Audit logs.

## Phase 2 – Owner Marketplace

Develop:

- Owner registration.
- Owner approval.
- Vehicle registration.
- Boat registration.
- Driver/captain registration.
- Document upload.
- Vehicle approval.

## Phase 3 – Routes and Availability

Develop:

- Route master.
- Stops.
- Vehicle-route assignment.
- Availability calendar.
- Recurring availability.
- Schedule creation.

## Phase 4 – Passenger Booking

Develop:

- Passenger registration.
- Passenger dashboard.
- Transport search.
- Vehicle details.
- Whole vehicle booking.
- Booking workflow.

## Phase 5 – Bus / Boat Seat Booking

Develop:

- Seat layout.
- Seat availability.
- Seat selection.
- Seat booking.
- Real-time seat updates.
- Double-booking prevention.

## Phase 6 – Notifications

Develop:

- Email service.
- WhatsApp Business Cloud API.
- Notification templates.
- Delivery logs.
- Booking reminders.

## Phase 7 – Payment and Commission

Develop:

- Payment records.
- Online payment integration.
- MGR service fee.
- Commission calculation.
- Owner settlement.

## Phase 8 – Advanced Marketplace

Develop:

- Request a Vehicle.
- Owner quotation.
- Passenger comparison.
- Ratings and reviews.
- Favourite routes.
- Promotion codes.

## Phase 9 – Reporting and Optimization

Develop:

- Admin reports.
- Owner reports.
- Performance dashboard.
- Vehicle utilisation.
- Revenue analysis.
- Export options.

---

# 35. Recommended Final Module Structure

```text
MGR BOOKING
|
+-- Authentication
|
+-- Passenger
|   +-- Search
|   +-- Vehicle Details
|   +-- Book Vehicle
|   +-- Select Seats
|   +-- My Bookings
|   +-- Notifications
|   +-- Reviews
|
+-- Owner
|   +-- Profile
|   +-- Vehicles
|   +-- Boats
|   +-- Drivers / Captains
|   +-- Routes
|   +-- Availability
|   +-- Schedules
|   +-- Booking Requests
|   +-- Revenue
|
+-- MGR Admin
|   +-- Owner Approval
|   +-- Vehicle Approval
|   +-- Driver Approval
|   +-- Booking Management
|   +-- Commission
|   +-- Reports
|   +-- Notifications
|   +-- Audit
|
+-- Marketplace Services
    +-- Whole Vehicle Booking
    +-- Seat Booking
    +-- Request a Vehicle
    +-- Quotations
    +-- Payments
    +-- Reviews
```

---

# 36. Final Recommendation

The existing Mannar Green Ride bicycle rental system should remain as the core rental management application.

The **MGR Booking** module should be implemented as an additional transport marketplace that supports:

```text
Car
Van
Bus
Boat
```

The system should allow:

```text
Owner Registration
Vehicle Listing
Driver / Captain Management
Route Management
Availability Management
Passenger Registration
Transport Search
Whole Vehicle Booking
Seat Booking
Real-Time Seat Availability
WhatsApp Notifications
Email Notifications
Payment Integration
Commission
Ratings
Vehicle Request Marketplace
Reporting
```

This approach allows Mannar Green Ride to grow from a bicycle rental operation into a wider local mobility and transport marketplace while keeping the existing system stable and reusable.

---

**Document Name:** `MGR booking.md`  
**Version:** 1.0  
**Prepared For:** Mannar Green Ride  
**Module:** Transport Marketplace & Passenger Booking
