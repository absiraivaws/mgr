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

/**
 * Generates and triggers multi-party notifications across the request lifecycle
 */
export const triggerLifecycleNotifications = async (
  eventType: NotificationEvent['eventType'],
  request: TransportV2Request
) => {
  const adminContact = (import.meta as any).env?.VITE_MGR_ADMIN_WHATSAPP || '+94779876543';

  // 1. Message contents based on event type
  let passengerMsg = '';
  let ownerMsg = '';
  let adminMsg = '';
  let title = '';

  switch (eventType) {
    case 'request_created':
      title = `New Transport Request: ${request.requestNumber}`;
      passengerMsg = `Hello ${request.passenger.name}, your transport request (${request.requestNumber}) for ${request.vehicleName} on ${request.travelDate} has been sent to the owner for pricing review.`;
      ownerMsg = `Hello ${request.ownerName}, new travel request received for ${request.vehicleName} (${request.registrationNumber}) on ${request.travelDate}. Route: ${request.routeFrom} ➔ ${request.routeTo}. Please accept and enter your Travel Charge.`;
      adminMsg = `[MGR Admin Alert] New request ${request.requestNumber} by ${request.passenger.name} for ${request.vehicleName}. Awaiting owner travel charge.`;
      break;

    case 'owner_accepted':
      title = `Owner Accepted: ${request.requestNumber}`;
      passengerMsg = `Great news ${request.passenger.name}! The owner accepted your request ${request.requestNumber}.\nTravel Charge: Rs. ${(request.ownerTravelCharge || 0).toLocaleString()}\nConvenience Fee: Rs. ${(request.convenienceFee || 0).toLocaleString()}\nTotal Payable: Rs. ${(request.finalAmount || 0).toLocaleString()}.\nPlease complete payment to confirm your ride.`;
      ownerMsg = `You accepted request ${request.requestNumber} with Travel Charge Rs. ${(request.ownerTravelCharge || 0).toLocaleString()}. Passenger has been notified to proceed with payment.`;
      adminMsg = `[MGR Admin Alert] Request ${request.requestNumber} accepted by owner. Travel Charge: Rs. ${(request.ownerTravelCharge || 0).toLocaleString()} + Fee: Rs. ${(request.convenienceFee || 0).toLocaleString()}. Awaiting passenger payment.`;
      break;

    case 'owner_rejected':
      title = `Request Declined: ${request.requestNumber}`;
      passengerMsg = `Hello ${request.passenger.name}, unfortunately the vehicle owner could not accommodate request ${request.requestNumber} on ${request.travelDate}. Please browse other available transport services.`;
      ownerMsg = `You have declined request ${request.requestNumber}. The passenger has been notified.`;
      adminMsg = `[MGR Admin Alert] Request ${request.requestNumber} was rejected by owner ${request.ownerName}.`;
      break;

    case 'booking_confirmed':
      title = `Booking CONFIRMED: ${request.requestNumber}`;
      passengerMsg = `🎉 CONFIRMED! Your booking ${request.requestNumber} for ${request.vehicleName} (${request.registrationNumber}) is confirmed.\nRoute: ${request.routeFrom} ➔ ${request.routeTo}\nDate: ${request.travelDate} at ${request.travelTime || '08:00'}\nAmount Paid: Rs. ${(request.finalAmount || 0).toLocaleString()}.\nDriver/Owner Contact: ${request.ownerPhone}.`;
      ownerMsg = `🎉 Booking ${request.requestNumber} is CONFIRMED and PAID!\nPassenger: ${request.passenger.name} (${request.passenger.phone})\nRoute: ${request.routeFrom} ➔ ${request.routeTo}\nDate: ${request.travelDate}\nYour Payout: Rs. ${(request.ownerTravelCharge || 0).toLocaleString()}.`;
      adminMsg = `[MGR Admin Alert] Booking ${request.requestNumber} is confirmed & paid. Total: Rs. ${(request.finalAmount || 0).toLocaleString()} (Convenience Fee: Rs. ${(request.convenienceFee || 0).toLocaleString()}).`;
      break;

    case 'booking_cancelled':
      title = `Booking Cancelled: ${request.requestNumber}`;
      passengerMsg = `Booking ${request.requestNumber} has been cancelled. If any refund is applicable, our team will process it.`;
      ownerMsg = `Booking ${request.requestNumber} has been cancelled. Your calendar has been updated.`;
      adminMsg = `[MGR Admin Alert] Booking ${request.requestNumber} was cancelled.`;
      break;

    default:
      return;
  }

  // Dispatch WhatsApp and Email to Passenger
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

  // Dispatch WhatsApp to Owner
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

  // Dispatch WhatsApp to Admin
  await dispatchTransportNotification({
    eventType,
    requestId: request.id,
    requestNumber: request.requestNumber,
    recipientRole: 'admin',
    recipientName: 'MGR System Admin',
    recipientContact: adminContact,
    channel: 'whatsapp',
    title,
    message: adminMsg,
  });
};

/**
 * Generates an instant WhatsApp chat URL with pre-filled text
 */
export const getWhatsAppUrl = (phone: string, text: string): string => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};
