/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Standard Unique Number Generator & Formatter for MGR Transport
 * Follows the format: PREFIX-0000001 (7-digit zero-padded sequence)
 * Example: MGR-CUS-0000001, MGR-OWN-0000001, MGR-DRV-0000001, MGR-VEH-0000001
 */

export function padSevenDigits(num: number): string {
  return String(Math.max(1, Math.floor(num))).padStart(7, '0');
}

/**
 * Format or retrieve standard Customer Unique Number: MGR-CUS-0000001
 */
export function formatCustomerCode(indexOrNum: number, existingId?: string): string {
  if (existingId && existingId.startsWith('MGR-CUS-')) {
    return existingId;
  }
  // If it's cust-1788587693599 or similar, format using the sequential index
  return `MGR-CUS-${padSevenDigits(indexOrNum)}`;
}

/**
 * Format or retrieve standard Owner Unique Number: MGR-OWN-0000001
 */
export function formatOwnerCode(indexOrNum: number, existingId?: string): string {
  if (existingId && existingId.startsWith('MGR-OWN-')) {
    return existingId;
  }
  if (existingId && existingId.startsWith('OWN-MGR-')) {
    const numPart = existingId.replace('OWN-MGR-', '');
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      return `MGR-OWN-${padSevenDigits(parsed)}`;
    }
  }
  return `MGR-OWN-${padSevenDigits(indexOrNum)}`;
}

/**
 * Format or retrieve standard Driver Unique Number: MGR-DRV-0000001
 */
export function formatDriverCode(indexOrNum: number, existingId?: string): string {
  if (existingId && existingId.startsWith('MGR-DRV-')) {
    return existingId;
  }
  if (existingId && existingId.startsWith('DRV-MGR-')) {
    const numPart = existingId.replace('DRV-MGR-', '');
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      return `MGR-DRV-${padSevenDigits(parsed)}`;
    }
  }
  return `MGR-DRV-${padSevenDigits(indexOrNum)}`;
}

/**
 * Format or retrieve standard Vehicle Unique Number: MGR-VEH-0000001
 */
export function formatVehicleCode(indexOrNum: number, existingId?: string): string {
  if (existingId && existingId.startsWith('MGR-VEH-')) {
    return existingId;
  }
  if (existingId && (existingId.startsWith('MGR-CAR-') || existingId.startsWith('MGR-VAN-') || existingId.startsWith('MGR-BUS-') || existingId.startsWith('MGR-BOAT-'))) {
    const parts = existingId.split('-');
    const numPart = parts[parts.length - 1];
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      return `MGR-VEH-${padSevenDigits(parsed)}`;
    }
  }
  return `MGR-VEH-${padSevenDigits(indexOrNum)}`;
}

/**
 * Format or retrieve standard Booking Unique Number: MGR-BK-0000001
 */
export function formatBookingCode(indexOrNum: number, existingId?: string): string {
  if (existingId && existingId.startsWith('MGR-BK-')) {
    const parts = existingId.split('-');
    const numPart = parts[parts.length - 1];
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      return `MGR-BK-${padSevenDigits(parsed)}`;
    }
    return existingId;
  }
  return `MGR-BK-${padSevenDigits(indexOrNum)}`;
}

/**
 * Format or retrieve standard Route Unique Number: MGR-RT-0000001
 */
export function formatRouteCode(indexOrNum: number, existingId?: string): string {
  if (existingId && existingId.startsWith('MGR-RT-')) {
    return existingId;
  }
  if (existingId && existingId.startsWith('ROUTE-')) {
    const numPart = existingId.replace('ROUTE-', '');
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      return `MGR-RT-${padSevenDigits(parsed)}`;
    }
  }
  return `MGR-RT-${padSevenDigits(indexOrNum)}`;
}

/**
 * Format or retrieve standard Schedule Unique Number: MGR-SCH-0000001
 */
export function formatScheduleCode(indexOrNum: number, existingId?: string): string {
  if (existingId && existingId.startsWith('MGR-SCH-')) {
    return existingId;
  }
  if (existingId && existingId.startsWith('SCH-')) {
    const parts = existingId.split('-');
    const numPart = parts[parts.length - 1];
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      return `MGR-SCH-${padSevenDigits(parsed)}`;
    }
  }
  return `MGR-SCH-${padSevenDigits(indexOrNum)}`;
}
