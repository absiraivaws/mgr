export interface PricingRates {
  firstHour: number; // Charge for first 60 mins
  every30Min: number; // Charge for every continuing 30 mins after the first 60 mins
  /** @deprecated backward-compat fallback */
  next30Min?: number;
  continuingHour?: number;
}

export type VehicleIconType = 'bicycle' | 'motorcycle' | 'scooter' | 'electric-bike' | 'quad' | 'other';

export interface VehicleType {
  id: string;
  name: string;
  icon: VehicleIconType;
  description?: string;
  rates: PricingRates;
  color?: string; // Tailwind color theme for badges
}

export type VehicleStatus = 'available' | 'rented' | 'maintenance';

export interface Vehicle {
  id: string;
  serialNumber: string;
  typeId: string;
  modelName?: string;
  status: VehicleStatus;
  notes?: string;
  lastRentedAt?: number;
  totalRentalsCount?: number;
}

export interface PricingBreakdown {
  totalMinutes: number;
  durationFormatted: string;
  firstHourAmount: number;
  firstHourMinutes: number; // e.g. up to 60
  every30MinCount: number; // number of additional 30-min blocks (e.g. 1, 2, 3...)
  every30MinRate: number; // charge per 30 mins
  every30MinAmount: number; // total amount for additional 30-min blocks
  subtotal: number;
  totalAmount: number;
  // Backward compatibility fields
  next30MinAmount?: number;
  continuingHoursCount?: number;
  continuingHoursAmount?: number;
}

export interface RentalRecord {
  id: string;
  rentalNumber: string;
  vehicleId: string;
  vehicleSerialNumber: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  vehicleIcon: VehicleIconType;
  customerName?: string;
  customerPhone?: string;
  customerNicPassport?: string;
  customerNotes?: string;
  depositAmount?: number;
  startTime: number; // Epoch timestamp (ms)
  endTime?: number; // Epoch timestamp (ms)
  status: 'active' | 'completed' | 'cancelled';
  rateSnapshot: PricingRates;
  breakdown?: PricingBreakdown;
  totalAmount: number;
  cashierName: string;
  paymentMethod?: 'cash' | 'card' | 'qr_transfer' | 'other';
  amountReceived?: number;
  changeAmount?: number;
  completedAt?: number;
}

export interface AppSettings {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  receiptFooter: string;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
  cashierName: string;
  soundEnabled: boolean;
  rentalNumberPrefix: string;
  companyLogo?: string; // base64 data URL of the company logo image
  autoLogoutMinutes?: number; // Inactivity timeout in minutes (e.g. 5, 15, 30, 60, 0 for never)
}

export interface Customer {
  id: string;
  nicPassport: string;
  name: string;
  fullName?: string;
  address?: string;
  dob?: string;               // Date of Birth e.g. "1995-05-14"
  whatsappNumber?: string;
  phone?: string;             // Mobile Number
  notes?: string;
  createdAt?: number;
  lastRentalDate?: number;
  totalRentalsCount?: number;
}

export interface IncomeEntry {
  id: string;
  date: string;           // ISO date string e.g. "2026-09-03"
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  createdAt: number;      // epoch ms
  cashierName?: string;
  who?: string;           // Person responsible: Mark, Jenis, Beni, etc.
}

export type MessageTemplateCategory = 'birthday' | 'rental' | 'reminder' | 'marketing' | 'general';

export interface MessageTemplate {
  id: string;
  title: string;
  category: MessageTemplateCategory;
  content: string;
  createdAt?: number;
  updatedAt?: number;
}
