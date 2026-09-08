/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransportType = 'car' | 'van' | 'bus' | 'bus_trip' | 'route_bus' | 'safari' | 'boat';

export type DriverOption = 'with_driver' | 'without_driver' | 'both';

export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';

export interface VehicleBid {
  id: string;
  vehicleId: string;
  vehicleName: string;
  passengerName: string;
  passengerPhone: string;
  passengerWhatsApp: string;
  travelDate: string;
  travelTime?: string;
  bidAmount: number;
  originalPrice: number;
  notes?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export type BookingStatus =
  | 'pending'
  | 'owner_accepted'
  | 'owner_rejected'
  | 'awaiting_payment'
  | 'confirmed'
  | 'driver_assigned'
  | 'ready'
  | 'trip_started'
  | 'completed'
  | 'passenger_cancelled'
  | 'owner_cancelled';

export type PricingMethod = 'fixed' | 'per_km' | 'per_hour' | 'per_day' | 'per_seat';

// Owner Account
export interface TransportOwner {
  id: string; // e.g. OWN-MGR-00001
  fullName: string;
  nicPassport: string;
  address: string;
  mobileNumber: string;
  whatsappNumber: string;
  email: string;
  businessName?: string;
  businessRegNumber?: string;
  bankAccountDetails?: string;
  status: VerificationStatus;
  profilePhoto?: string;
  vehiclesCount?: number;
  totalEarnings?: number;
  rating?: number;
  createdAt: number;
}

export type VehicleBookingType = 'trip' | 'schedule';

export interface VehicleScheduleItem {
  id: string;
  date: string; // YYYY-MM-DD
  fromLocation: string;
  from?: string;
  startTime: string; // e.g. 06:00 AM or 06:00
  toLocation: string;
  to?: string;
  endTime: string; // e.g. 09:30 AM or 09:30
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number; // Rs.
  createdAt?: number;
}

// Vehicle & Boat
export interface TransportVehicle {
  id: string; // e.g. MGR-CAR-00001, MGR-BOAT-00001
  ownerId: string;
  ownerName?: string;
  type: TransportType;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  fuelType?: 'petrol' | 'diesel' | 'hybrid' | 'ev' | 'none';
  color: string;
  hasAC: boolean;
  totalSeats: number;
  luggageCapacity?: string;
  driverOption: DriverOption;
  description: string;
  photos: string[];
  insuranceExpiry: string; // YYYY-MM-DD
  revenueLicenceExpiry: string; // YYYY-MM-DD
  status: 'active' | 'pending' | 'suspended' | 'maintenance';
  // Booking Type & Availability (Requirement 3, 4, 5)
  bookingType?: VehicleBookingType; // 'trip' | 'schedule'
  availableDates?: string[]; // For Trip vehicles: array of YYYY-MM-DD
  schedules?: VehicleScheduleItem[]; // For Schedule vehicles
  // Pricing
  basePrice: number;
  oneDayPrice?: number;
  pricingMethod: PricingMethod;
  pricePerSeat?: number;
  // Bidding
  bids?: VehicleBid[];
  // Boat Specifics
  boatDetails?: {
    boatName?: string;
    boatType?: 'passenger' | 'leisure' | 'tour' | 'fishing';
    captainName?: string;
    lifeJacketsAvailable: boolean;
    departurePoint: string;
    destination: string;
    safetyCertificateExpiry: string;
  };
  rating?: number;
  tripsCount?: number;
  createdAt: number;
}

// Driver / Boat Captain
export interface TransportDriver {
  id: string; // e.g. DRV-MGR-00001
  ownerId: string;
  fullName: string;
  nic: string;
  mobile: string;
  whatsapp: string;
  email?: string;
  address: string;
  driverType: 'driver' | 'captain';
  licenceNumber: string;
  licenceClass: string;
  licenceExpiry: string;
  experienceYears?: number;
  languages?: string[];
  rating: number;
  status: VerificationStatus;
  assignedVehicleId?: string;
  photoUrl?: string;
  createdAt: number;
}

// Routes
export interface TransportRoute {
  id: string;
  routeCode: string;
  fromLocation: string;
  toLocation: string;
  viaLocations: string[];
  distanceKm?: number;
  estimatedDuration: string;
  pickupPoints: string[];
  dropoffPoints: string[];
  suggestedVehicleTypes: TransportType[];
  basePrice: number;
  status: 'active' | 'inactive';
}

// Schedules
export interface TransportSchedule {
  id: string;
  vehicleId: string;
  routeId: string;
  departureTime: string; // HH:MM
  daysOfWeek: string[]; // ['Monday', 'Tuesday', ...]
  totalSeats: number;
  availableSeats: number;
  farePerSeat: number;
  wholeVehiclePrice?: number;
  status: 'active' | 'cancelled' | 'delayed';
}

// Bookings
export interface TransportBooking {
  id: string;
  bookingNumber: string; // MGR-BK-00101
  bookingType: 'whole_vehicle' | 'seat';
  vehicleId: string;
  vehicleName: string;
  vehicleType: TransportType;
  vehicleRegNumber: string;
  routeId: string;
  routeFrom: string;
  routeTo: string;
  travelDate: string; // YYYY-MM-DD
  travelTime: string; // HH:MM
  passengerName: string;
  passengerPhone: string;
  passengerWhatsApp: string;
  passengerEmail?: string;
  passengerNic?: string;
  driverOption: DriverOption;
  selectedSeats?: string[]; // e.g. ['01', '02']
  seatCount: number;
  totalAmount: number;
  commissionRate: number; // percentage, e.g. 5
  mgrCommissionAmount: number;
  ownerPayoutAmount: number;
  status: BookingStatus;
  driverId?: string;
  driverName?: string;
  specialNotes?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  createdAt: number;
}

// Passenger Requests (Custom Quotes)
export interface TransportRequest {
  id: string;
  requestNumber: string;
  passengerName: string;
  passengerPhone: string;
  passengerWhatsApp: string;
  vehicleType: TransportType;
  fromLocation: string;
  toLocation: string;
  travelDate: string;
  returnDate?: string;
  passengersCount: number;
  expectedBudget?: number;
  notes?: string;
  status: 'open' | 'quoted' | 'accepted' | 'closed';
  quotesCount: number;
  createdAt: number;
  quotes?: TransportQuote[];
}

export interface TransportQuote {
  id: string;
  requestId: string;
  ownerId: string;
  ownerName: string;
  ownerWhatsApp: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: TransportType;
  quoteAmount: number;
  notes?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

// Marketplace General Settings
export interface MarketplaceSettings {
  commissionPercentage: number;
  convenienceFeePercentage?: number;
  instantBookingEnabled: boolean;
  allowCashOnBoard: boolean;
  contactWhatsAppNumber: string;
  supportEmail: string;
  termsAndConditionsUrl?: string;
}

export type MGRTabType =
  | 'mgr-dashboard'
  | 'mgr-search'
  | 'mgr-bookings'
  | 'mgr-fleet'
  | 'mgr-owners'
  | 'mgr-settings'
  | 'mgr-routes'
  | 'mgr-requests'
  | 'mgr-admin';
