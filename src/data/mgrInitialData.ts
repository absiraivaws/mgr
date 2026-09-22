/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TransportOwner,
  TransportVehicle,
  TransportDriver,
  TransportRoute,
  TransportSchedule,
  TransportBooking,
  TransportRequest,
  MarketplaceSettings,
} from '../types/mgrBooking';

export const INITIAL_MARKETPLACE_SETTINGS: MarketplaceSettings = {
  commissionPercentage: 5,
  instantBookingEnabled: true,
  allowCashOnBoard: true,
  contactWhatsAppNumber: '+94 77 987 6543',
  supportEmail: 'booking@mannargreenride.lk',
  termsAndConditionsUrl: '#',
  autoLogoutMinutes: 15,
};

// All hardcoded records removed as per production requirement.
// Operators, fleet listings, drivers, routes, schedules, and bookings are dynamically created and stored.
export const INITIAL_OWNERS: TransportOwner[] = [];

export const INITIAL_VEHICLES: TransportVehicle[] = [];

export const INITIAL_DRIVERS: TransportDriver[] = [];

export const INITIAL_ROUTES: TransportRoute[] = [];

export const INITIAL_SCHEDULES: TransportSchedule[] = [];

export const INITIAL_BOOKINGS: TransportBooking[] = [];

export const INITIAL_REQUESTS: TransportRequest[] = [];
