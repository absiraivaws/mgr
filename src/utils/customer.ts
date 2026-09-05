import { Customer, MessageTemplate, RentalRecord } from '../types';

/**
 * Searches for customer by NIC/Passport number or partial query (name/phone/NIC)
 */
export function findCustomerByNic(
  nic: string,
  customers: Customer[]
): Customer | undefined {
  if (!nic || !nic.trim()) return undefined;
  const cleanNic = nic.trim().toUpperCase();
  return customers.find(
    (c) => c.nicPassport.trim().toUpperCase() === cleanNic
  );
}

/**
 * Autocomplete search for customers across NIC, Name, FullName, Phone, WhatsApp, Address, and DOB
 */
export function searchCustomers(
  query: string,
  customers: Customer[]
): Customer[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toUpperCase();
  return customers.filter((c) => {
    const nicMatch = (c.nicPassport || '').toUpperCase().includes(q);
    const nameMatch = (c.name || '').toUpperCase().includes(q);
    const fullNameMatch = (c.fullName || '').toUpperCase().includes(q);
    const phoneMatch = (c.phone || '').toUpperCase().includes(q);
    const waMatch = (c.whatsappNumber || '').toUpperCase().includes(q);
    const addrMatch = (c.address || '').toUpperCase().includes(q);
    const dobMatch = (c.dob || '').toUpperCase().includes(q);
    return nicMatch || nameMatch || fullNameMatch || phoneMatch || waMatch || addrMatch || dobMatch;
  });
}

/**
 * Extracts and consolidates unique customers from initial list and completed rental records
 */
export function consolidateCustomers(
  savedCustomers: Customer[],
  rentals: RentalRecord[]
): Customer[] {
  const customerMap = new Map<string, Customer>();

  // Add saved customer profiles first
  savedCustomers.forEach((c) => {
    if (c.nicPassport) {
      customerMap.set(c.nicPassport.trim().toUpperCase(), { ...c });
    }
  });

  // Consolidate from rentals if any have NIC that isn't in map yet
  rentals.forEach((r) => {
    if (r.customerNicPassport && r.customerNicPassport.trim()) {
      const nic = r.customerNicPassport.trim().toUpperCase();
      const existing = customerMap.get(nic);
      if (!existing) {
        customerMap.set(nic, {
          id: `cust-hist-${r.id}`,
          nicPassport: nic,
          name: r.customerName || 'Guest Customer',
          fullName: r.customerName || 'Guest Customer',
          phone: r.customerPhone || '',
          whatsappNumber: r.customerPhone || '',
          address: '',
          dob: '',
          notes: r.customerNotes || '',
          createdAt: r.startTime,
          lastRentalDate: r.startTime,
          totalRentalsCount: 1,
        });
      } else {
        existing.totalRentalsCount = (existing.totalRentalsCount || 1) + 1;
        if (!existing.phone && r.customerPhone) existing.phone = r.customerPhone;
        if (!existing.whatsappNumber && r.customerPhone) existing.whatsappNumber = r.customerPhone;
        if (!existing.name && r.customerName) {
          existing.name = r.customerName;
          existing.fullName = r.customerName;
        }
      }
    }
  });

  return Array.from(customerMap.values());
}

/**
 * Parses customer date of birth (e.g. YYYY-MM-DD or DD-MM-YYYY or MM-DD)
 */
export function parseCustomerDob(dob?: string): { month: number; day: number; year?: number } | null {
  if (!dob || !dob.trim()) return null;
  const parts = dob.trim().split(/[-/.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(month) && !isNaN(day)) return { month, day, year };
    } else {
      // DD-MM-YYYY or MM-DD-YYYY
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (p0 > 12) {
        return { month: p1, day: p0, year };
      } else {
        return { month: p0, day: p1, year };
      }
    }
  } else if (parts.length === 2) {
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    if (!isNaN(month) && !isNaN(day)) return { month, day };
  }
  return null;
}

/**
 * Check if today is the customer's birthday
 */
export function isCustomerBirthdayToday(dob?: string): boolean {
  const parsed = parseCustomerDob(dob);
  if (!parsed) return false;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  return parsed.month === currentMonth && parsed.day === currentDay;
}

/**
 * Check if the customer's birthday falls in the current calendar month
 */
export function isCustomerBirthdayThisMonth(dob?: string): boolean {
  const parsed = parseCustomerDob(dob);
  if (!parsed) return false;
  const now = new Date();
  return parsed.month === (now.getMonth() + 1);
}

/**
 * Check if customer's birthday is upcoming within the next N days
 */
export function isCustomerBirthdayUpcoming(dob?: string, daysAhead: number = 7): boolean {
  const parsed = parseCustomerDob(dob);
  if (!parsed) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const bdayThisYear = new Date(currentYear, parsed.month - 1, parsed.day);
  const diffTime = bdayThisYear.getTime() - new Date(currentYear, now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysAhead;
}

/**
 * Calculates current age of customer if birth year is known
 */
export function getCustomerAge(dob?: string): number | null {
  const parsed = parseCustomerDob(dob);
  if (!parsed || !parsed.year) return null;
  const now = new Date();
  let age = now.getFullYear() - parsed.year;
  const m = (now.getMonth() + 1) - parsed.month;
  if (m < 0 || (m === 0 && now.getDate() < parsed.day)) {
    age--;
  }
  return age > 0 ? age : null;
}

/**
 * Format default Birthday WhatsApp Message
 */
export function formatWhatsAppBirthdayMessage(customer: Customer, businessName: string = 'Mannar Green Ride'): string {
  const name = customer.fullName || customer.name || 'Valued Customer';
  const age = getCustomerAge(customer.dob);
  const ageStr = age ? ` on turning ${age}` : '';

  return `🎉 *Happy Birthday ${name}!* 🎂🎈\n\nWishing you a wonderful celebration${ageStr} filled with happiness and joy from all of us at *${businessName}*! 🚴‍♂️✨\n\nAs a token of our appreciation, we invite you to enjoy a special birthday discount on your next ride with us. Have an incredible year ahead!\n\nWarm regards,\n*${businessName}* Team`;
}

/**
 * Replace placeholders like {customer_name}, {shop_name}, {dob}, {nic_passport}, {phone}
 */
export function formatWhatsAppCustomMessage(
  templateContent: string,
  customer: Customer,
  extra: Record<string, string> = {}
): string {
  let text = templateContent;
  const name = customer.fullName || customer.name || 'Customer';
  const phone = customer.whatsappNumber || customer.phone || '';
  const nic = customer.nicPassport || '';
  const dob = customer.dob || '';

  text = text.replace(/\{customer_name\}/gi, name);
  text = text.replace(/\{name\}/gi, name);
  text = text.replace(/\{phone\}/gi, phone);
  text = text.replace(/\{nic_passport\}/gi, nic);
  text = text.replace(/\{nic\}/gi, nic);
  text = text.replace(/\{dob\}/gi, dob);

  Object.entries(extra).forEach(([key, val]) => {
    const reg = new RegExp(`\\{${key}\\}`, 'gi');
    text = text.replace(reg, val);
  });

  return text;
}

/**
 * Clean and format phone number for WhatsApp wa.me links.
 * Converts local numbers (e.g. 0770692088) to international format without '+' or leading 0 (e.g. 94770692088).
 * This prevents WhatsApp from mistaking numbers starting with '0' as usernames (@0770692088).
 */
export function cleanWhatsAppPhoneNumber(phoneStr?: string, defaultCountryCode: string = '94'): string {
  if (!phoneStr) return '';
  // Strip any @, spaces, dashes, parentheses, or plus
  let cleaned = phoneStr.trim().replace(/^@+/, '').replace(/[^0-9]/g, '');
  if (!cleaned) return '';

  // If number starts with 00 (international dialing prefix), remove 00
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  // If starts with local trunk prefix '0' (e.g. 0770692088 -> 10 digits in SL)
  if (cleaned.startsWith('0')) {
    cleaned = defaultCountryCode + cleaned.slice(1);
  } else if (cleaned.length === 9) {
    // 9 digits without leading 0 (e.g. 770692088)
    cleaned = defaultCountryCode + cleaned;
  }

  return cleaned;
}

export const DEFAULT_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tmpl-birthday-default',
    title: 'Birthday Celebration Wishes',
    category: 'birthday',
    content: `🎉 *Happy Birthday {customer_name}!* 🎂🎈\n\nWishing you a wonderful celebration filled with joy and happiness from all of us at *{shop_name}*! 🚴‍♂️✨\n\nAs a token of our appreciation, please enjoy a special birthday discount on your next ride with us. Have an incredible year ahead!\n\nWarm regards,\n*{shop_name}* Team`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tmpl-rental-start',
    title: 'Rental Started & Welcome',
    category: 'rental',
    content: `🚴 *Welcome to {shop_name}, {customer_name}!* \n\nYour rental #{rental_number} for *{vehicle_name}* has started.\n\nPlease wear your helmet and ride safely! If you need assistance or wish to extend your hire, contact us anytime.\n\nEnjoy your ride!\n*{shop_name}*`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tmpl-rental-thanks',
    title: 'Return Completed & Thank You',
    category: 'rental',
    content: `🙏 *Thank you for riding with {shop_name}, {customer_name}!* \n\nYour rental #{rental_number} has been settled successfully.\n\nWe hope you enjoyed exploring the sights of Mannar! We look forward to seeing you again soon. 🌿🚲\n\nBest regards,\n*{shop_name}*`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tmpl-weekend-promo',
    title: 'Weekend Promo & Discount',
    category: 'marketing',
    content: `🌟 *Special Weekend Ride at {shop_name}!* \n\nHello {customer_name}, enjoy our sunny coastlines with a special weekend discount on all bike hires! \n\nVisit us today or reply to reserve your ride.\n*{shop_name}*`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'tmpl-general-reminder',
    title: 'General Notification / Reminder',
    category: 'reminder',
    content: `🔔 *Notification from {shop_name}*\n\nHello {customer_name}, here is an update regarding your rental account. For any questions, please reply directly to this message.\n\nThank you,\n*{shop_name}*`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
];

const TEMPLATES_STORAGE_KEY = 'v_rental_message_templates';

export function getStoredMessageTemplates(): MessageTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return DEFAULT_MESSAGE_TEMPLATES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error reading stored message templates:', err);
  }
  return DEFAULT_MESSAGE_TEMPLATES;
}

export function saveStoredMessageTemplates(templates: MessageTemplate[]): void {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Error saving message templates:', err);
  }
}

