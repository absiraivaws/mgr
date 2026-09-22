/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TransportType, DriverOption } from './mgrBooking';

export type TransportListingMode = 'trip' | 'schedule' | 'availability_only' | 'planned_trip';

export type TransportRequestStatus =
  | 'pending_owner'
  | 'owner_rejected'
  | 'awaiting_payment'
  | 'confirmed'
  | 'driver_assigned'
  | 'journey_started'
  | 'journey_completed'
  | 'completed'
  | 'cancelled';

export type TransportPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

/**
 * Type A (availability_only): Owner publishes available dates; passenger requests custom route.
 * Type B (planned_trip): Owner pre-schedules journey; passenger requests available seats.
 */
export interface TransportV2Listing {
  id: string; // e.g. LST-001
  uniqueCode?: string; // e.g. MGR-VEH-0000001 or MGR-SCH-0000001
  vehicleId: string;
  vehicleName: string;
  vehicleType: TransportType;
  registrationNumber: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerWhatsApp: string;
  listingMode: TransportListingMode;
  totalSeats: number;
  driverOption: DriverOption;
  photos?: string[];

  // Type A specifics
  availableDates?: string[]; // e.g. ['2026-09-10', '2026-09-11', '2026-09-15']
  dateAvailabilityMap?: Record<string, 'available' | 'tentative' | 'booked' | 'planned' | 'off'>;

  // Type B specifics
  plannedTripDate?: string; // YYYY-MM-DD
  plannedFrom?: string;
  plannedTo?: string;
  departureTime?: string; // HH:MM
  availableSeats?: number;
  seatFare?: number; // Optional baseline estimate

  status: 'active' | 'completed' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

/**
 * Passenger booking request throughout lifecycle
 */
export interface TransportV2Request {
  id: string; // e.g. REQ-V2-001
  requestNumber: string; // e.g. MGR-REQ-9821
  listingId: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: TransportType;
  registrationNumber: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerWhatsApp: string;

  passenger: {
    name: string;
    phone: string;
    whatsapp: string;
    email?: string;
  };

  listingMode: TransportListingMode;
  travelDate: string;
  travelTime?: string;
  routeFrom: string;
  routeTo: string;
  seatCount: number; // 1 for full vehicle, or N seats for planned trip
  specialNotes?: string;

  // Driver Assignment
  driverId?: string;
  driverName?: string;
  driverPhone?: string;

  // Financials
  ownerTravelCharge?: number; // Entered by Owner on Accept
  convenienceFee?: number; // Auto calculated
  convenienceFeePercentage?: number; // e.g. 5%
  finalAmount?: number; // ownerTravelCharge + convenienceFee

  // Status
  requestStatus: TransportRequestStatus;
  paymentStatus: TransportPaymentStatus;
  paymentMethod?: 'cash' | 'card' | 'qr' | 'lankaqr' | 'other';
  paymentRef?: string;
  rejectionReason?: string;
  holdExpiresAt?: number; // FIFO temporary hold expiration timestamp

  // Notification delivery status per channel
  channelDeliveryStatus?: Partial<Record<NotificationChannel, 'sent' | 'failed' | 'disabled'>>;

  // Ratings & Reviews tracking
  passengerReviewed?: boolean;
  driverReviewed?: boolean;
  rating?: number;
  reviewComment?: string;
  driverType?: string;
  completedAt?: number;

  createdAt: number;
  updatedAt: number;
}

export type NotificationChannel = 'whatsapp' | 'email' | 'sms';
export type NotificationRecipientRole = 'passenger' | 'owner' | 'admin' | 'driver' | 'staff';

export interface NotificationEvent {
  id: string;
  eventType:
    | 'vehicle_assigned'
    | 'waiting_owner_approval'
    | 'request_created'
    | 'owner_accepted'
    | 'owner_rejected'
    | 'payment_requested'
    | 'payment_pending'
    | 'payment_completed'
    | 'driver_assigned'
    | 'journey_started'
    | 'journey_completed'
    | 'booking_completed'
    | 'booking_confirmed'
    | 'booking_cancelled';
  requestId: string;
  requestNumber: string;
  recipientRole: NotificationRecipientRole;
  recipientName: string;
  recipientContact: string; // phone or email
  channel: NotificationChannel;
  title: string;
  message: string;
  timestamp: number;
  status: 'queued' | 'sent' | 'failed';
}
