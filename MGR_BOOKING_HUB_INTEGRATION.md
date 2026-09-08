# MGR Booking Hub – Integration Instructions

The patch intentionally keeps every existing side-menu item.

## 1. Add Import

In:

```text
src/components/mgr-booking/MGRBookingHub.tsx
```

add:

```ts
import { MGRHotelStyleBooking } from './MGRHotelStyleBooking';
```

---

## 2. Find Transport Tab

Replace the current passenger search/result content inside:

```ts
activeTab === 'mgr-search'
```

with:

```tsx
<MGRHotelStyleBooking
  view="search"
  vehicles={vehicles}
  owners={owners}
  currentUser={currentUser}
  convenienceFeePercentage={
    (settings as any).convenienceFeePercentage ?? settings.commissionPercentage
  }
/>
```

This changes search from immediate booking to:

```text
Availability / Planned Trip → Request
```

---

## 3. Bookings Tab

Replace the current:

```tsx
<MGRBookingsView ... />
```

with:

```tsx
<MGRHotelStyleBooking
  view="requests"
  vehicles={vehicles}
  owners={owners}
  currentUser={currentUser}
  convenienceFeePercentage={
    (settings as any).convenienceFeePercentage ?? settings.commissionPercentage
  }
/>
```

This becomes the main request → price → payment workflow.

---

## 4. Fleet Tab

**Keep the existing `MGRFleetView`. Do not remove it.**

Change the allowed owner/admin section to:

```tsx
<div className="space-y-6">
  <MGRFleetView
    vehicles={vehicles}
    owners={owners}
    onAddVehicle={handleAddVehicle}
    onUpdateStatus={handleUpdateVehicleStatus}
    themeMode="light"
  />

  <MGRHotelStyleBooking
    view="owner-listings"
    vehicles={vehicles}
    owners={owners}
    currentUser={currentUser}
    convenienceFeePercentage={
      (settings as any).convenienceFeePercentage ?? settings.commissionPercentage
    }
  />
</div>
```

This preserves all current vehicle details and adds:

```text
Type A – Vehicle Available
Type B – Planned Trip
```

---

## 5. Vehicle Requests Tab

Keep the side-menu item `mgr-requests`.

Replace the bid/quotation component:

```tsx
<MGRVehicleRequestsView ... />
```

with:

```tsx
<MGRHotelStyleBooking
  view="requests"
  vehicles={vehicles}
  owners={owners}
  currentUser={currentUser}
  convenienceFeePercentage={
    (settings as any).convenienceFeePercentage ?? settings.commissionPercentage
  }
/>
```

The side menu remains, but there is no bid/quote comparison.

---

## 6. Old Components

Do not delete these during the first migration:

```text
BookingModal.tsx
MGRBookingsView.tsx
MGRVehicleRequestsView.tsx
TransportListingCards.tsx
SeatMapModal.tsx
```

They can remain in the repository until the new workflow is tested.

After successful UAT, remove unused imports/code only; **do not remove the side-menu items**.

---

## 7. Notification Environment Variables

Add to `.env`:

```env
VITE_MGR_NOTIFICATION_ENDPOINT=
VITE_MGR_ADMIN_EMAIL=
VITE_MGR_ADMIN_WHATSAPP=
```

`VITE_MGR_NOTIFICATION_ENDPOINT` should point to a secure backend or Supabase Edge Function.

Never put Meta WhatsApp access tokens or email API secret keys in `VITE_...` variables.

---

## 8. Production Payment

The included UI uses:

```text
Payment Complete / Payment Success
```

as a workflow-development button.

When payment gateway is connected, call the same `completePayment()` logic only after a verified server-side payment callback/webhook.

---

## 9. Existing Local Storage

V2 uses:

```text
mgr_transport_v2_listings
mgr_transport_v2_requests
mgr_transport_notification_events
```

This avoids breaking the existing half-developed data while UAT is in progress.

After UAT, migrate these to Supabase using the included SQL schema.
