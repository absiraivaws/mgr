export interface PricingRates {
  firstHour: number; // Charge for first base period (default 60 mins or customized minutes)
  every30Min: number; // Charge for continuing interval (default 30 mins or customized minutes)
  firstDurationMinutes?: number; // Custom minutes for the first base duration (default 60)
  continuingDurationMinutes?: number; // Custom minutes for continuing interval duration (default 30)
  /** @deprecated backward-compat fallback */
  next30Min?: number;
  continuingHour?: number;
}

export type VehicleIconType = 'bicycle' | 'motorcycle' | 'scooter' | 'electric-bike' | 'quad' | 'car' | 'package' | 'tag' | 'cart' | 'gear' | 'other' | string;

export type RentalStartMethod = 'manual' | 'qr' | 'both';

export type VehiclePurpose = 'rental' | 'sale' | 'both';

export interface VehicleType {
  id: string;
  name: string;
  icon: VehicleIconType;
  description?: string;
  rates: PricingRates;
  color?: string; // Tailwind color theme for badges
  rentalStartMethod?: RentalStartMethod; // Admin setting: manual, qr, or both
  purpose?: VehiclePurpose; // Classification: 'rental' | 'sale' | 'both'
}

export type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'sold';

export interface Vehicle {
  id: string;
  serialNumber: string;
  typeId: string;
  modelName?: string;
  status: VehicleStatus;
  notes?: string;
  lastRentedAt?: number;
  totalRentalsCount?: number;
  costPrice?: number;
  purchaseRef?: string;
}

export interface PricingBreakdown {
  totalMinutes: number;
  durationFormatted: string;
  firstHourAmount: number;
  firstHourMinutes: number; // e.g. up to 60 or custom minutes
  firstDurationMinutes?: number; // Configured first duration minutes (e.g. 60)
  every30MinCount: number; // number of additional blocks (e.g. 1, 2, 3...)
  continuingBlocksCount?: number; // alias for additional blocks
  every30MinRate: number; // charge per continuing block
  continuingBlockRate?: number; // alias for continuing rate
  every30MinAmount: number; // total amount for additional blocks
  continuingBlockAmount?: number; // alias for additional block amount
  continuingDurationMinutes?: number; // Configured continuing interval minutes (e.g. 30)
  subtotal: number;
  totalAmount: number;
  startKm?: number;
  endKm?: number;
  distanceKm?: number;
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
  customerWhatsapp?: string;
  depositAmount?: number;
  appliedAdvanceBalance?: number; // Advance balance applied from customer account towards deposit/bill
  refundRetainedAsAdvance?: boolean; // Whether refund was retained as advance credit on customer account
  creditedAdvanceBalance?: number; // Refund amount credited to customer advance balance
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
  paymentRef?: string; // LankaQR reference for the final settlement
  depositPaymentRef?: string; // LankaQR reference for the deposit, when paid by QR
  completedAt?: number;
  sendWelcomeWhatsApp?: boolean;
  sendEndWhatsApp?: boolean;
  damageAmount?: number;
  discountAmount?: number;
  rentalAmount?: number; // Base rental duration rate / Rental Value (e.g. 1500)
  grossRentalAmount?: number; // Rental Value + Damage Charge (e.g. 1800)
  balanceAmount?: number; // Balance to Collect / collected from customer (e.g. 700)
  refundAmount?: number; // Refund amount if Advance Paid > (Gross - Discount)
  startKm?: number; // Start odometer reading for Motorbikes
  endKm?: number; // End odometer reading for Motorbikes
  distanceKm?: number; // Total distance traveled for Motorbikes
}

export interface NotificationContact {
  id: string;
  name: string;
  phone: string;
  active?: boolean;
}

export interface WhatsAppGroupLink {
  id: string;
  name: string;
  url: string;
  active?: boolean;
}

export interface PurchaseRecord {
  id: string;
  date: string;
  reference: string;
  itemName: string;
  category: string;
  typeId?: string; // Optional link to VehicleType
  assignedSerials?: string[]; // Serial numbers created in fleet inventory
  supplierName: string;
  supplierPhone?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'qr_transfer' | 'other';
  purchasedBy: string;
  remarks?: string;
  createdAt: number;
}

export interface SaleRecord {
  id: string;
  date: string;
  reference: string;
  itemName: string;
  category: string;
  customerName?: string;
  customerPhone?: string;
  customerNicPassport?: string;
  quantity: number;
  unitPrice: number;
  purchaseValue?: number; // Total purchase cost of the sold item(s)
  markupAmount?: number; // 20% markup value
  salePrice?: number; // Purchase Value + 20% markup
  discountAmount?: number; // Discount entered by user
  finalSaleAmount?: number; // Final sale amount after discount
  totalAmount: number; // Stored final sale amount
  soldSerials?: string[]; // Serial numbers of sold units
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'qr_transfer' | 'other';
  cashierName: string;
  remarks?: string;
  createdAt: number;
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
  whatsappApiUrl?: string; // WhatsApp API / Webhook URL for automated bulk sending
  whatsappApiKey?: string; // Optional API key or auth token for WhatsApp gateway
  whatsappGatewayMode?: 'automated_api' | 'automated_direct' | 'wa_link'; // Dispatch mode
  bulkSendingConfig?: BulkSendingConfig; // Anti-spam throttling settings configured by admin
  additionalWhatsAppContacts?: NotificationContact[]; // Contacts notified on start/end rental
  whatsappGroupLinks?: WhatsAppGroupLink[]; // WhatsApp groups for rental updates
  notifyCustomerOnStart?: boolean;
  notifyCustomerOnEnd?: boolean;
  notifyAdditionalContactsOnStart?: boolean;
  notifyAdditionalContactsOnEnd?: boolean;
  notifyCustomerOnBirthday?: boolean;
  notifyRentalReminders?: boolean;
}

export type CustomerStatus = 'active' | 'suspended' | 'blocked' | 'inactive' | 'pending_verification';

export interface CustomerGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
  isActive: boolean;
  createdAt: number;
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
  status?: CustomerStatus;    // Customer status (defaults to 'active')
  statusRemark?: string;      // Mandatory when status is 'suspended' or 'blocked'
  statusUpdatedAt?: number;
  groups?: string[];          // Assigned customer group IDs or names
  advanceBalance?: number;    // Running Customer Advance Balance / Store Credit
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
  who?: string;           // Person responsible: staff name
  reference?: string;     // Unique finance reference, e.g. RENT-000145
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'qr_transfer' | 'other';
  remarks?: string;
  enteredBy?: string;
}

export type FinanceTransaction = IncomeEntry;

export interface FinanceCategoryConfig {
  incomeCategories: string[];
  expenseCategories: string[];
}

export type AuditActionType =
  | 'Password Reset Requested'
  | 'User Account Deleted'
  | 'User Status Changed'
  | 'User Role Updated'
  | 'Rental Started by QR'
  | 'Rental Stopped by QR'
  | 'Manual Rental Started'
  | 'Finance Transaction Added'
  | 'Finance Transaction Edited'
  | 'Finance Transaction Deleted';

export interface AuditLogEntry {
  id: string;
  user: string;
  userEmail?: string;
  date: string;
  time: string;
  action: AuditActionType;
  reference: string;
  details?: string;
  createdAt: number;
}

export type MessageTemplateCategory = 
  | 'welcome'
  | 'birthday'
  | 'promotion'
  | 'rental_reminder'
  | 'return_reminder'
  | 'payment_reminder'
  | 'fitness_promo'
  | 'tourist_promo'
  | 'thank_you'
  | 'special_offer'
  | 'holiday_greeting'
  | 'general'
  // Legacy aliases
  | 'rental'
  | 'reminder'
  | 'marketing';

export interface MessageTemplate {
  id: string;
  title: string;
  category: MessageTemplateCategory;
  content: string;
  createdAt?: number;
  updatedAt?: number;
}

export type MessageHistoryStatus = 
  | 'scheduled'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'paused'
  | 'cancelled';

export interface MessageHistoryEntry {
  id: string;
  customerId: string;
  customerNic?: string;
  customerName: string;
  mobileNumber: string;
  messageTemplateId?: string;
  templateTitle?: string;
  actualMessage: string;
  messageType: 'single' | 'bulk' | 'automated_start' | 'automated_stop' | 'birthday' | 'scheduled';
  sentAt: number;
  sentBy: string;
  campaignName?: string;
  status: MessageHistoryStatus;
  deliveryStatus?: string;
  failureReason?: string;
}

export interface BulkSendingConfig {
  messagesPerBatch?: number;         // e.g. 5, 10, 20, Custom
  delayBetweenMessagesSec?: number;  // e.g. 5, 10, 30, 60, Custom
  restTimeBetweenBatchesMin?: number;// e.g. 1, 2, 5, 10, Custom
  batchSize: number;
  delaySeconds: number;
  restMinutes: number;
}

export interface BulkCampaignState {
  campaignId: string;
  campaignName: string;
  templateTitle: string;
  totalRecipients: number;
  selectedCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  pendingCount: number;
  currentBatch: number;
  totalBatches: number;
  status: MessageHistoryStatus;
  nextBatchRestSecondsRemaining: number;
  interMessageCountdownSec: number;
  startedAt: number;
  lastUpdated: number;
}

