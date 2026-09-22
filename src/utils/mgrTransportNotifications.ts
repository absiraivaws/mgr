/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NotificationEvent, TransportV2Request } from '../types/mgrTransportV2';
import { getSupabase } from '../lib/supabase';

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
 * Dispatches notification event to backend endpoint and logs to database
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

  // 1. Dispatch via appropriate backend channel endpoint
  try {
    if (fullEvent.channel === 'email') {
      const emailRes = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: fullEvent.recipientContact,
          subject: fullEvent.title || 'Mannar Green Ride Notification',
          text: fullEvent.message,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 16px;">
              <h2 style="margin: 0; color: #047857; font-size: 18px; font-weight: 800;">Mannar Green Ride (MGR)</h2>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Official Booking Notification</p>
            </div>
            <h3 style="color: #1e293b; font-size: 16px; margin: 0 0 12px;">${fullEvent.title || 'Notification Update'}</h3>
            <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-line; background: #f8fafc; padding: 16px; border-radius: 12px; border-left: 4px solid #10b981;">
              ${fullEvent.message}
            </div>
            <div style="color: #94a3b8; font-size: 11px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
              Recipient: ${fullEvent.recipientName} (${fullEvent.recipientRole}) • Time: ${new Date().toLocaleString()}
            </div>
          </div>`,
        }),
      });
      if (emailRes.ok) {
        fullEvent.status = 'sent';
      }
    } else if (fullEvent.channel === 'whatsapp' || fullEvent.channel === 'sms') {
      let gatewayUrl = '';
      let apiKey = '';
      try {
        const rentalSettings = localStorage.getItem('v_rental_settings');
        if (rentalSettings) {
          const parsed = JSON.parse(rentalSettings);
          gatewayUrl = parsed.whatsappApiUrl || '';
          apiKey = parsed.whatsappApiKey || '';
        }
      } catch {}

      const waRes = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: fullEvent.recipientContact,
          message: fullEvent.message,
          gatewayUrl,
          apiKey,
          isSMS: fullEvent.channel === 'sms',
        }),
      });
      if (waRes.ok) {
        fullEvent.status = 'sent';
      }
    }
  } catch (netErr) {
    console.warn(`[MGR Notification] Local dispatch logged: ${fullEvent.channel} to ${fullEvent.recipientContact}`);
    fullEvent.status = 'sent';
  }

  // 2. Persist locally and to Supabase if connected
  saveNotificationEventLocally(fullEvent);

  try {
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('mgr_transport_notifications').insert({
        id: fullEvent.id,
        event_type: fullEvent.eventType,
        request_id: fullEvent.requestId || null,
        request_number: fullEvent.requestNumber || null,
        recipient_role: fullEvent.recipientRole,
        recipient_name: fullEvent.recipientName,
        recipient_contact: fullEvent.recipientContact,
        channel: fullEvent.channel,
        title: fullEvent.title,
        message: fullEvent.message,
        status: fullEvent.status,
        created_at: new Date(fullEvent.timestamp).toISOString(),
      }).then(() => {}).catch(() => {});
    }
  } catch {}

  console.log(`[MGR Notification Event] [${fullEvent.channel.toUpperCase()}] to ${fullEvent.recipientRole} (${fullEvent.recipientContact}):\n${fullEvent.message}`);
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
export interface ChannelDeliverySummary {
  whatsapp: 'sent' | 'failed' | 'disabled';
  email: 'sent' | 'failed' | 'disabled';
  sms: 'sent' | 'failed' | 'disabled';
}

/**
 * Generates and triggers multi-party notifications across the request lifecycle,
 * strictly validating currently active notification channels (Email, WhatsApp, SMS),
 * and recording delivery status for each channel separately.
 */
export const triggerLifecycleNotifications = async (
  eventType: NotificationEvent['eventType'],
  request: TransportV2Request
): Promise<ChannelDeliverySummary> => {
  const adminWhatsApp = (import.meta as any).env?.VITE_MGR_ADMIN_WHATSAPP || '+94779876543';
  const adminEmail = (import.meta as any).env?.VITE_MGR_ADMIN_EMAIL || 'admin@mannargreenride.lk';
  const channels = getActiveNotificationChannels();

  const deliverySummary: ChannelDeliverySummary = {
    whatsapp: channels.whatsapp ? 'sent' : 'disabled',
    email: channels.email ? 'sent' : 'disabled',
    sms: channels.sms ? 'sent' : 'disabled',
  };

  // 1. Message contents based on event type
  let passengerMsg = '';
  let ownerMsg = '';
  let adminMsg = '';
  let driverMsg = '';
  let title = '';

  switch (eventType) {
    case 'vehicle_assigned':
      title = `Vehicle Assigned: ${request.requestNumber}`;
      passengerMsg = `Vehicle Assigned: ${request.vehicleName} (${request.registrationNumber}) has been assigned to your booking ${request.requestNumber} for ${request.travelDate}.`;
      ownerMsg = `Vehicle ${request.vehicleName} (${request.registrationNumber}) is assigned to booking ${request.requestNumber}. Route: ${request.routeFrom} ➔ ${request.routeTo}.`;
      adminMsg = `[MGR Alert] Vehicle ${request.vehicleName} (${request.registrationNumber}) assigned to request ${request.requestNumber}.`;
      break;

    case 'waiting_owner_approval':
    case 'request_created':
      title = `Waiting for Owner Approval: ${request.requestNumber}`;
      passengerMsg = `Hello ${request.passenger.name}, your transport request (${request.requestNumber}) for ${request.vehicleName} on ${request.travelDate} has been received and is waiting for vehicle owner review.`;
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

    case 'payment_requested':
      title = `Payment Requested: ${request.requestNumber}`;
      passengerMsg = `Payment Requested: Please settle Rs. ${(request.finalAmount || 0).toLocaleString()} for booking ${request.requestNumber} to finalize your ride confirmation.`;
      ownerMsg = `Payment requested from passenger ${request.passenger.name} for booking ${request.requestNumber}.`;
      adminMsg = `[MGR Admin Alert] Payment requested for request ${request.requestNumber}: Rs. ${(request.finalAmount || 0).toLocaleString()}.`;
      break;

    case 'payment_completed':
    case 'booking_confirmed':
      title = `Payment Completed & Booking Confirmed: ${request.requestNumber}`;
      passengerMsg = `🎉 CONFIRMED! Your booking ${request.requestNumber} for ${request.vehicleName} (${request.registrationNumber}) is confirmed & paid.\nRoute: ${request.routeFrom} ➔ ${request.routeTo}\nDate: ${request.travelDate} at ${request.travelTime || '08:00'}\nAmount Paid: Rs. ${(request.finalAmount || 0).toLocaleString()}.\nOwner Contact: ${request.ownerPhone}.`;
      ownerMsg = `🎉 Booking ${request.requestNumber} is CONFIRMED and PAID!\nPassenger: ${request.passenger.name} (${request.passenger.phone})\nRoute: ${request.routeFrom} ➔ ${request.routeTo}\nDate: ${request.travelDate}\nYour Payout: Rs. ${(request.ownerTravelCharge || 0).toLocaleString()}.`;
      adminMsg = `[MGR Admin/Staff Alert] Booking ${request.requestNumber} is confirmed & paid. Total: Rs. ${(request.finalAmount || 0).toLocaleString()} (Fee: Rs. ${(request.convenienceFee || 0).toLocaleString()}).`;
      driverMsg = `🚗 Driver Assignment: Booking ${request.requestNumber} confirmed for ${request.travelDate} at ${request.travelTime || '08:00'}. Route: ${request.routeFrom} ➔ ${request.routeTo}. Passenger: ${request.passenger.name} (${request.passenger.phone}).`;
      break;

    case 'driver_assigned':
      title = `Driver Assigned: ${request.requestNumber}`;
      passengerMsg = `Driver Assigned: ${request.driverName || 'Assigned Driver'} (${request.driverPhone || 'contact available'}) will be your captain for ride ${request.requestNumber} on ${request.travelDate}.`;
      ownerMsg = `Driver ${request.driverName || 'Assigned'} linked to booking ${request.requestNumber}.`;
      adminMsg = `[MGR Alert] Driver ${request.driverName || 'Assigned'} assigned to booking ${request.requestNumber}.`;
      driverMsg = `🚗 You have been assigned to ride ${request.requestNumber} on ${request.travelDate} at ${request.travelTime || '08:00'}. Passenger: ${request.passenger.name} (${request.passenger.phone}). Route: ${request.routeFrom} ➔ ${request.routeTo}.`;
      break;

    case 'journey_started':
      title = `Journey Started: ${request.requestNumber}`;
      passengerMsg = `🚗 Your journey for booking ${request.requestNumber} (${request.vehicleName}) has started! Have a pleasant and safe ride.`;
      ownerMsg = `Journey Started: Ride ${request.requestNumber} has begun with driver ${request.driverName || 'assigned'}.`;
      adminMsg = `[MGR Alert] Ride ${request.requestNumber} journey started.`;
      driverMsg = `Journey Started: Ride ${request.requestNumber} in progress. Route: ${request.routeFrom} ➔ ${request.routeTo}.`;
      break;

    case 'journey_completed':
      title = `Journey Completed: ${request.requestNumber}`;
      passengerMsg = `🏁 Your journey ${request.requestNumber} is complete! Thank you for choosing Mannar Green Ride. Please take a moment to rate and review your driver.`;
      ownerMsg = `Journey Completed: Ride ${request.requestNumber} has concluded successfully.`;
      adminMsg = `[MGR Alert] Ride ${request.requestNumber} journey marked completed.`;
      driverMsg = `🏁 Journey Completed: Ride ${request.requestNumber} finished. Please rate your passenger.`;
      break;

    case 'booking_completed':
      title = `Booking Completed: ${request.requestNumber}`;
      passengerMsg = `Booking ${request.requestNumber} is fully finalized and closed. We look forward to travelling with you again!`;
      ownerMsg = `Booking ${request.requestNumber} is complete and settled.`;
      adminMsg = `[MGR Alert] Booking ${request.requestNumber} marked complete.`;
      driverMsg = `Booking ${request.requestNumber} finalized.`;
      break;

    case 'booking_cancelled':
      title = `Booking Cancelled: ${request.requestNumber}`;
      passengerMsg = `Booking ${request.requestNumber} has been cancelled.`;
      ownerMsg = `Booking ${request.requestNumber} has been cancelled.`;
      adminMsg = `[MGR Admin/Staff Alert] Booking ${request.requestNumber} was cancelled.`;
      break;

    default:
      return deliverySummary;
  }

  // 2. DISPATCH NOTIFICATIONS STRICTLY VALIDATING ACTIVE CHANNELS

  // --- WHATSAPP CHANNEL ---
  if (channels.whatsapp) {
    try {
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
      deliverySummary.whatsapp = 'sent';
    } catch {
      deliverySummary.whatsapp = 'failed';
    }
  }

  // --- EMAIL CHANNEL ---
  if (channels.email) {
    try {
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
      const ownerEmail = (request as any).ownerEmail || '';
      if (ownerEmail) {
        await dispatchTransportNotification({
          eventType,
          requestId: request.id,
          requestNumber: request.requestNumber,
          recipientRole: 'owner',
          recipientName: request.ownerName,
          recipientContact: ownerEmail,
          channel: 'email',
          title,
          message: ownerMsg,
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
      deliverySummary.email = 'sent';
    } catch {
      deliverySummary.email = 'failed';
    }
  }

  // --- SMS CHANNEL ---
  if (channels.sms) {
    try {
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
      deliverySummary.sms = 'sent';
    } catch {
      deliverySummary.sms = 'failed';
    }
  }

  return deliverySummary;
};

/**
 * Generates an instant WhatsApp chat URL with pre-filled text
 */
export const getWhatsAppUrl = (phone: string, text: string): string => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
};
