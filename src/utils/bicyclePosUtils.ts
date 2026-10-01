/**
 * Bicycle POS Helper Utilities: Motorbike KM Detection & Automated Multi-Contact Notifications
 */

import { RentalRecord, AppSettings, VehicleType, Vehicle } from '../types';
import { cleanWhatsAppPhoneNumber, getActiveRentalMessage } from './customer';

/**
 * Detect if a vehicle category is a Motorbike
 */
export function isMotorbikeVehicle(type?: { name?: string; icon?: string } | null): boolean {
  if (!type) return false;
  const icon = (type.icon || '').toLowerCase();
  const name = (type.name || '').toLowerCase();
  return (
    icon === 'motorcycle' ||
    name.includes('motorbike') ||
    name.includes('motorcycle') ||
    name.includes('motor bike') ||
    (name.includes('bike') && !name.includes('bicycle') && !name.includes('cycle') && !name.includes('e-bike'))
  );
}

export interface NotificationDeliveryRecipient {
  role: 'customer' | 'additional_contact' | 'group';
  name: string;
  phoneOrUrl: string;
  status: 'delivered' | 'failed' | 'direct_link_ready' | 'simulated';
  error?: string;
}

export interface NotificationDeliveryLog {
  id: string;
  rentalNumber: string;
  type: 'start' | 'end' | 'custom';
  timestamp: number;
  messageText: string;
  recipients: NotificationDeliveryRecipient[];
  overallStatus: 'success' | 'partial' | 'failed';
  errors: string[];
}

export const STORAGE_DELIVERY_LOGS_KEY = 'cycly_notification_delivery_logs';

export function getStoredDeliveryLogs(): NotificationDeliveryLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_DELIVERY_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveStoredDeliveryLogs(logs: NotificationDeliveryLog[]): void {
  try {
    const trimmed = logs.slice(0, 100);
    localStorage.setItem(STORAGE_DELIVERY_LOGS_KEY, JSON.stringify(trimmed));
  } catch {}
}

export interface DispatchNotificationOptions {
  type: 'start' | 'end';
  rental: RentalRecord;
  settings: AppSettings;
  overrideCustomerPhone?: string;
  overrideCustomerName?: string;
}

export interface DispatchNotificationResult {
  success: boolean;
  messageText: string;
  customerSent: boolean;
  additionalContactsSentCount: number;
  groupLinksNotifiedCount: number;
  recipients: string[];
  errors: string[];
  deliveryLog?: NotificationDeliveryLog;
}

/**
 * Dispatch automated rental start or end notifications:
 * 1. Resolves dynamic message from the active user-configured template (no hardcoded text)
 * 2. Removes duration from rental return messages
 * 3. Sends to customer phone (if available)
 * 4. Automatically sends to all configured Additional WhatsApp Contacts
 * 5. Supports WhatsApp Group links
 * 6. Records full delivery audit log for troubleshooting (e.g. #REN-0000158)
 */
export async function dispatchRentalNotification(
  options: DispatchNotificationOptions
): Promise<DispatchNotificationResult> {
  const { type, rental, settings, overrideCustomerPhone, overrideCustomerName } = options;

  const templateId = type === 'start' ? 'tmpl-welcome-start' : 'tmpl-return-thanks';
  
  // Resolve KM extra tags for motorbikes
  const extraTags: Record<string, string | number> = {};
  if (rental.startKm !== undefined) {
    extraTags['start_km'] = `${rental.startKm} km`;
  }
  if (rental.endKm !== undefined) {
    extraTags['end_km'] = `${rental.endKm} km`;
  }
  if (rental.startKm !== undefined && rental.endKm !== undefined && rental.endKm >= rental.startKm) {
    extraTags['distance_km'] = `${rental.endKm - rental.startKm} km`;
  }

  // Get compiled message using the fresh active template
  const messageText = getActiveRentalMessage(
    templateId,
    rental,
    {
      name: overrideCustomerName || rental.customerName,
      phone: overrideCustomerPhone || rental.customerPhone,
      nicPassport: rental.customerNicPassport,
    },
    settings,
    extraTags
  );

  const result: DispatchNotificationResult = {
    success: true,
    messageText,
    customerSent: false,
    additionalContactsSentCount: 0,
    groupLinksNotifiedCount: 0,
    recipients: [],
    errors: [],
  };

  const deliveryRecipients: NotificationDeliveryRecipient[] = [];

  // 1. Customer Notification
  const shouldNotifyCustomer = type === 'start'
    ? (settings.notifyCustomerOnStart ?? true)
    : (settings.notifyCustomerOnEnd ?? true);

  const customerPhoneRaw = overrideCustomerPhone || rental.customerPhone;
  const customerName = overrideCustomerName || rental.customerName || 'Customer';

  if (shouldNotifyCustomer) {
    if (customerPhoneRaw) {
      const cleaned = cleanWhatsAppPhoneNumber(customerPhoneRaw);
      if (cleaned) {
        deliveryRecipients.push({
          role: 'customer',
          name: customerName,
          phoneOrUrl: cleaned,
          status: 'simulated',
        });
        result.customerSent = true;
      } else {
        result.errors.push(`Customer phone "${customerPhoneRaw}" could not be formatted into a valid WhatsApp number.`);
        deliveryRecipients.push({
          role: 'customer',
          name: customerName,
          phoneOrUrl: customerPhoneRaw,
          status: 'failed',
          error: 'Invalid phone number format',
        });
      }
    } else {
      deliveryRecipients.push({
        role: 'customer',
        name: customerName,
        phoneOrUrl: 'Not provided',
        status: 'failed',
        error: 'No phone number provided during rental start',
      });
    }
  }

  // 2. Additional WhatsApp Contacts
  const shouldNotifyAdditional = type === 'start'
    ? (settings.notifyAdditionalContactsOnStart ?? true)
    : (settings.notifyAdditionalContactsOnEnd ?? true);

  if (shouldNotifyAdditional && Array.isArray(settings.additionalWhatsAppContacts)) {
    for (const contact of settings.additionalWhatsAppContacts) {
      if (contact && contact.active !== false && contact.phone) {
        const cleaned = cleanWhatsAppPhoneNumber(contact.phone);
        if (cleaned) {
          deliveryRecipients.push({
            role: 'additional_contact',
            name: contact.name || 'Additional Contact',
            phoneOrUrl: cleaned,
            status: 'simulated',
          });
          result.additionalContactsSentCount++;
        } else {
          deliveryRecipients.push({
            role: 'additional_contact',
            name: contact.name || 'Additional Contact',
            phoneOrUrl: contact.phone,
            status: 'failed',
            error: 'Invalid phone format',
          });
        }
      }
    }
  }

  // 3. WhatsApp Group Links
  if (Array.isArray(settings.whatsappGroupLinks)) {
    for (const group of settings.whatsappGroupLinks) {
      if (group && group.active !== false && group.url) {
        deliveryRecipients.push({
          role: 'group',
          name: group.name || 'WhatsApp Group',
          phoneOrUrl: group.url,
          status: 'direct_link_ready',
        });
        result.groupLinksNotifiedCount++;
      }
    }
  }

  result.recipients = deliveryRecipients.map((r) => r.phoneOrUrl);

  // 4. Dispatch via backend WhatsApp endpoint (/api/whatsapp/send)
  const phoneRecipients = deliveryRecipients.filter((r) => r.role === 'customer' || r.role === 'additional_contact');

  await Promise.allSettled(
    phoneRecipients.map(async (rec) => {
      try {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: rec.phoneOrUrl,
            message: messageText,
            gatewayUrl: settings.whatsappApiUrl || undefined,
            apiKey: settings.whatsappApiKey || undefined,
          }),
        });

        if (res.ok) {
          const resData = await res.json().catch(() => ({}));
          if (settings.whatsappApiUrl) {
            rec.status = 'delivered';
          } else {
            rec.status = 'simulated';
            rec.error = 'Simulated delivery (WhatsApp Gateway API URL not configured in settings)';
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData?.error || `HTTP ${res.status} from WhatsApp Gateway`;
          rec.status = 'failed';
          rec.error = errMsg;
          result.errors.push(`Delivery failed for ${rec.name} (${rec.phoneOrUrl}): ${errMsg}`);
        }
      } catch (err: any) {
        rec.status = 'simulated';
        rec.error = `Local network note: ${err.message || 'Offline mode'}`;
      }
    })
  );

  // 5. If direct browser link mode is configured, or wa_link mode
  if (settings.whatsappGatewayMode === 'wa_link' && customerPhoneRaw) {
    try {
      const cleaned = cleanWhatsAppPhoneNumber(customerPhoneRaw);
      if (cleaned) {
        window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(messageText)}`, '_blank');
      }
    } catch (e) {
      console.error('Failed to trigger window.open for WhatsApp:', e);
    }
  }

  // 6. Record Delivery Audit Log
  const hasErrors = deliveryRecipients.some((r) => r.status === 'failed');
  const allDelivered = deliveryRecipients.length > 0 && deliveryRecipients.every((r) => r.status === 'delivered' || r.status === 'simulated');

  const deliveryLog: NotificationDeliveryLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    rentalNumber: rental.rentalNumber || 'UNKNOWN',
    type,
    timestamp: Date.now(),
    messageText,
    recipients: deliveryRecipients,
    overallStatus: hasErrors ? (allDelivered ? 'partial' : 'failed') : 'success',
    errors: result.errors,
  };

  result.deliveryLog = deliveryLog;

  const existingLogs = getStoredDeliveryLogs();
  saveStoredDeliveryLogs([deliveryLog, ...existingLogs]);

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('cycly_notification_dispatched', { detail: deliveryLog }));
    } catch {}
  }

  console.log(`[Notification Engine] Dispatched ${type} notification for #${rental.rentalNumber}:`, deliveryLog);

  return result;
}

/**
 * Generate sequential, unique next applicable serial numbers for a given vehicle/inventory type
 */
export function generateNextSerialNumbersForType(
  typeObj: VehicleType,
  allVehicles: Vehicle[],
  count: number = 1
): string[] {
  const safeCount = Math.max(1, count || 1);
  const existingSet = new Set(allVehicles.map((v) => v.serialNumber.trim().toUpperCase()));
  const matchingVehicles = allVehicles.filter((v) => v.typeId === typeObj.id);

  let prefix = '';
  let padLength = 4;
  let maxNum = 0;

  if (matchingVehicles.length > 0) {
    for (const v of matchingVehicles) {
      const match = v.serialNumber.trim().match(/^([A-Za-z0-9]+[-_/\s]*?)(\d+)$/);
      if (match) {
        if (!prefix) {
          prefix = match[1];
          padLength = match[2].length;
        }
        const num = parseInt(match[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  // If no prefix found from matching vehicles, look for patterns or derive a standard prefix
  if (!prefix) {
    let numericPattern = false;
    let highestPrefixNum = 0;
    for (const v of allVehicles) {
      const match = v.serialNumber.trim().match(/^(\d{2})[-_]/);
      if (match) {
        numericPattern = true;
        const pNum = parseInt(match[1], 10);
        if (pNum > highestPrefixNum) highestPrefixNum = pNum;
      }
    }

    if (numericPattern) {
      const nextP = (highestPrefixNum + 1).toString().padStart(2, '0');
      prefix = `${nextP}-`;
      padLength = 4;
    } else {
      const letters = typeObj.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      prefix = `${letters.slice(0, 4) || 'INV'}-`;
      padLength = 4;
    }
  }

  const generated: string[] = [];
  let candidateNum = maxNum + 1;

  while (generated.length < safeCount) {
    const serial = `${prefix}${candidateNum.toString().padStart(padLength, '0')}`.toUpperCase();
    if (!existingSet.has(serial)) {
      generated.push(serial);
      existingSet.add(serial);
    }
    candidateNum++;
  }

  return generated;
}
