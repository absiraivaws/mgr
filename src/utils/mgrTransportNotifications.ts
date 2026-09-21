/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotificationEvent, TransportV2Request } from '../types/mgrTransportV2';

const NOTIFICATIONS_STORAGE_KEY = 'mgr_transport_notification_events';

/**
 * Retrieves all locally logged notification events
 */
export const getStoredNotificationEvents = (): NotificationEvent[] => {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Stores a notification event locally for development and manual testing
 */
const saveNotificationEventLocally = (event: NotificationEvent) => {
  try {
    const existing = getStoredNotificationEvents();
    const updated = [event, ...existing].slice(0, 100); // Keep last 100 events
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving notification event to localStorage:', err);
  }
};

/**
 * Dispatches notification event to backend endpoint or logs locally
 */
export const dispatchTransportNotification = async (
  event: Omit<NotificationEvent, 'id' | 'timestamp' | 'status'>
): Promise<NotificationEvent> => {
  const fullEvent: NotificationEvent = {
    ...event,
    id: `NOTIF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: Date.now(),
    status: 'queued',
  };

  const endpoint = (import.meta as any).env?.VITE_MGR_NOTIFICATION_ENDPOINT;

  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullEvent),
      });
      if (response.ok) {
        fullEvent.status = 'sent';
      } else {
        fullEvent.status = 'failed';
      }
    } catch {
      fullEvent.status = 'failed';
    }
  } else {
    // If no backend endpoint configured, treat as queued/sent locally for dev testing
    fullEvent.status = 'sent';
    console.log(`[MGR Notification Event] [${fullEvent.channel.toUpperCase()}] to ${fullEvent.recipientRole} (${fullEvent.recipientContact}):\n${fullEvent.message}`);
  }

  saveNotificationEventLocally(fullEvent);
  return fullEvent;
};

export interface ActiveNotificationChannels {
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
}

/**
 * Validates which notification channels are currently active based on Admin Settings
 */
export const getActiveNotificationChannels = (): ActiveNotificationChannels => {
  try {
    const raw = localStorage.getItem('mgr_marketplace_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.notificationChannels) {
        return {
          email: parsed.notificationChannels.email ?? true,
          whatsapp: parsed.notificationChannels.whatsapp ?? true,
          sms: parsed.notificationChannels.sms ?? true,
        };
      }
    }
  } catch {}
  return { email: true, whatsapp: true, sms: true };
};

/**
 * Generates and triggers multi-party notifications across the request lifecycle,
 * strictly validating currently active notification channels (Email, WhatsApp, SMS)
 */
export const triggerLifecycleNotifications = async (
  eventType: NotificationEvent['eventType'],
  request: TransportV2Request
) => {
  const adminWhatsApp = (import.meta as any).env?.VITE_MGR_ADMIN_WHATSAPP || '+94779876543';
  const adminEmail = (import.meta as any).env?.VITE_MGR_ADMIN_EMAIL || 'admin@mannargreenride.lk';
  const channels = getActiveNotificationChannels();

  // 1. Message contents based on event type
  let passengerMsg = '';
  let ownerMsg = '';
  let adminMsg = '';
  let driverMsg = '';
  let title = '';

  switch (eventType) {
    case 'request_created':
      title = `New Transport Request: ${request.requestNumber}`;
      passengerMsg = `Hello ${request.passenger.name}, your transport request (${request.requestNumber}) for ${request.vehicleName} on ${request.travelDate} has been sent to the owner for pricing review.`;
      ownerMsg = `Hello ${request.ownerName}, new travel request received for ${request.vehicleName} (${request.registrationNumber}) on ${request.travelDate}. Route: ${request.routeFrom} ➔ ${request.routeTo}. Please accept and enter your Travel Charge.`;
      adminMsg = `[MGR Admin/Staff Alert] New request ${request.requestNumber} by ${request.passenger.name} for ${request.vehicleName}. Awaiting owner review.`;
      break;

    case 'owner_accepted':
      title = `Owner Accepted: ${request.requestNumber}`;
      passengerMsg = `Great news ${request.passenger.name}! The owner accepted your request ${request.requestNumber}.\nTravel Charge: Rs. ${(request.ownerTravelCharge || 0).toLocaleString()}\nConvenience Fee: Rs. ${(request.convenienceFee || 0).toLocaleString()}\nTotal Payable: Rs. ${(request.finalAmount || 0).toLocaleString()}.\nPlease complete payment to confirm your ride.`;
      ownerMsg = `You accepted request ${request.requestNumber} with Travel Charge Rs. ${(request.ownerTravelCharge || 0).toLocaleString()}. Passenger and Admin have been notified.`;
      adminMsg = `[MGR Admin/Staff Alert] Request ${request.requestNumber} accepted by owner. Travel Charge: Rs. ${(request.ownerTravelCharge || 0).toLocaleString()} + Fee: Rs. ${(request.convenienceFee || 0).toLocaleString()}. Awaiting passenger payment.`;
      break;

    case 'owner_rejected':
      title = `Request Declined: ${request.requestNumber}`;
      passengerMsg = `Hello ${request.passenger.name}, unfortunately the vehicle owner could not accommodate request ${request.requestNumber} on ${request.travelDate}. Reason: ${request.rejectionReason || 'Operator unavailable'}.`;
      ownerMsg = `You have declined request ${request.requestNumber}. The passenger and Admin have been updated.`;
      adminMsg = `[MGR Admin/Staff Alert] Request ${request.requestNumber} was declined by owner ${request.ownerName}. Reason: ${request.rejectionReason || 'None specified'}.`;
      break;

    case 'booking_confirmed':
      title = `Booking CONFIRMED: ${request.requestNumber}`;
      passengerMsg = `🎉 CONFIRMED! Your booking ${request.requestNumber} for ${request.vehicleName} (${request.registrationNumber}) is confirmed.\nRoute: ${request.routeFrom} ➔ ${request.routeTo}\nDate: ${request.travelDate} at ${request.travelTime || '08:00'}\nAmount Paid: Rs. ${(request.finalAmount || 0).toLocaleString()}.\nContact: ${request.ownerPhone}.`;
      ownerMsg = `🎉 Booking ${request.requestNumber} is CONFIRMED and PAID!\nPassenger: ${request.passenger.name} (${request.passenger.phone})\nRoute: ${request.routeFrom} ➔ ${request.routeTo}\nDate: ${request.travelDate}\nYour Payout: Rs. ${(request.ownerTravelCharge || 0).toLocaleString()}.`;
      adminMsg = `[MGR Admin/Staff Alert] Booking ${request.requestNumber} is confirmed & paid. Total: Rs. ${(request.finalAmount || 0).toLocaleString()} (Fee: Rs. ${(request.convenienceFee || 0).toLocaleString()}).`;
      driverMsg = `🚗 Driver Assignment: Booking ${request.requestNumber} confirmed for ${request.travelDate} at ${request.travelTime || '08:00'}. Route: ${request.routeFrom} ➔ ${request.routeTo}. Passenger: ${request.passenger.name} (${request.passenger.phone}).`;
      break;

    case 'booking_cancelled':
      title = `Booking Cancelled: ${request.requestNumber}`;
      passengerMsg = `Booking ${request.requestNumber} has been cancelled.`;
      ownerMsg = `Booking ${request.requestNumber} has been cancelled.`;
      adminMsg = `[MGR Admin/Staff Alert] Booking ${request.requestNumber} was cancelled.`;
      break;

    default:
      return;
  }

  // 2. DISPATCH NOTIFICATIONS STRICTLY VALIDATING ACTIVE CHANNELS

  // --- WHATSAPP CHANNEL ---
  if (channels.whatsapp) {
    if (request.passenger?.phone || request.passenger?.whatsapp) {
      await dispatchTransportNotification({
        eventType,
        requestId: request.id,
        requestNumber: request.requestNumber,
        recipientRole: 'passenger',
        recipientName: request.passenger.name,
        recipientContact: request.passenger.whatsapp || request.passenger.phone,
        channel: 'whatsapp',
        title,
        message: passengerMsg,
      });
    }
    if (request.ownerWhatsApp || request.ownerPhone) {
      await dispatchTransportNotification({
        eventType,
        requestId: request.id,
        requestNumber: request.requestNumber,
        recipientRole: 'owner',
        recipientName: request.ownerName,
        recipientContact: request.ownerWhatsApp || request.ownerPhone,
        channel: 'whatsapp',
        title,
        message: ownerMsg,
      });
    }
    if (adminWhatsApp) {
      await dispatchTransportNotification({
        eventType,
        requestId: request.id,
        requestNumber: request.requestNumber,
        recipientRole: 'admin',
        recipientName: 'MGR System Admin & Staff',
        recipientContact: adminWhatsApp,
        channel: 'whatsapp',
        title,
        message: adminMsg,
      });
    }
    if (driverMsg && (request.driverPhone || request.driverId)) {
      await dispatchTransportNotification({
        eventType,
        requestId: request.id,
        requestNumber: request.requestNumber,
        recipientRole: 'driver',
        recipientName: request.driverName || 'Assigned Driver',
        recipientContact: request.driverPhone || '',
        channel: 'whatsapp',
        title,
        message: driverMsg,
      });
    }
  }

  // --- EMAIL CHANNEL ---
  if (channels.email) {
    if (request.passenger?.email) {
      await dispatchTransportNotification({
        eventType,
        requestId: request.id,
        requestNumber: request.requestNumber,
        recipientRole: 'passenger',
        recipientName: request.passenger.name,
        recipientContact: request.passenger.email,
        channel: 'email',
        title,
        message: passengerMsg,
      });
    }
    if (adminEmail) {
      await dispatchTransportNotification({
        eventType,
        requestId: request.id,
        requestNumber: request.requestNumber,
        recipientRole: 'admin',
        recipientName: 'MGR System Admin & Staff',
        recipientContact: adminEmail,
        channel: 'email',
        title,
        message: adminMsg,
      });
    }
  }

  // --- SMS CHANNEL ---
  if (channels.sms) {
    if (request.passenger?.phone) {
      await dispatchTransportNotification({
        eventType,
        requestId: request.id,
        requestNumber: request.requestNumber,
        recipientRole: 'passenger',
        recipientName: request.passenger.name,
        recipientContact: request.passenger.phone,
        channel: 'sms',
        title,
        message: passengerMsg,
      });
    }
    if (request.ownerPhone) {
      await dispatchTransportNotification({
        eventType,
        requestId: request.id,
        requestNumber: request.requestNumber,
        recipientRole: 'owner',
        recipientName: request.ownerName,
        recipientContact: request.ownerPhone,
        channel: 'sms',
        title,
        message: ownerMsg,
      });
    }
    if (driverMsg && request.driverPhone) {
      await dispatchTransportNotification({
        eventType,
        requestId: request.id,
        requestNumber: request.requestNumber,
        recipientRole: 'driver',
        recipientName: request.driverName || 'Assigned Driver',
        recipientContact: request.driverPhone,
        channel: 'sms',
        title,
        message: driverMsg,
      });
    }
  }
};

/**
 * Generates an instant WhatsApp chat URL with pre-filled text
 */
export const getWhatsAppUrl = (phone: string, text: string): string => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};
