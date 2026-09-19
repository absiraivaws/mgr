// PRH – Pesalai Rental Hub Types
// Business Module: Construction Equipment Rental Service
// Dedicated Business Unit: PRH

export type PRHCustomerType = 'individual' | 'contractor' | 'company' | 'organization';

export interface PRHCustomer {
  id: string; // e.g. PRH-CUS-00001
  customerType: PRHCustomerType;
  name: string;
  nic: string;
  companyName?: string;
  contactPerson?: string;
  phone: string;
  whatsapp: string;
  sameAsPhone: boolean;
  email?: string;
  address: string;
  siteAddress: string;
  emergencyContact?: string;
  creditLimit: number;
  outstandingBalance: number;
  depositBalance: number;
  status: 'active' | 'blacklisted' | 'inactive';
  remarks?: string;
  createdAt: string;
  createdBy: string;
}

export type PRHRentalMethod = 'quantity' | 'serial';

export interface PRHSerialUnit {
  serialNumber: string;
  status: 'available' | 'rented' | 'maintenance' | 'damaged' | 'lost';
  notes?: string;
}

export interface PRHEquipment {
  id: string; // e.g. PRH-EQ-00001
  code: string;
  name: string;
  category: string;
  rentalMethod: PRHRentalMethod;
  dailyRate: number;
  securityDeposit: number;
  minDays: number;
  lateChargeMethod: 'percentage' | 'fixed';
  lateChargePerDay: number;
  replacementValue: number;
  damageChargeRule: string;
  totalQty: number;
  availableQty: number;
  rentedQty: number;
  reservedQty: number;
  maintenanceQty: number;
  damagedQty: number;
  lostQty: number;
  uom: string; // 'sets', 'pcs', 'units', 'meters'
  status: 'active' | 'maintenance' | 'discontinued';
  description: string;
  serialUnits?: PRHSerialUnit[];
  createdBy: string;
  createdAt: string;
}

export interface PRHRentalItem {
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  category: string;
  rentalMethod: PRHRentalMethod;
  serialNumber?: string;
  quantity: number;
  dailyRate: number;
  securityDepositPerUnit: number;
  startDate: string;
  expectedReturnDate: string;
  expectedDays: number;
  totalRental: number;
  totalDeposit: number;
  returnedQty: number;
  damagedQty: number;
  lostQty: number;
  outstandingQty: number;
  itemStatus: 'active' | 'partially_returned' | 'fully_returned' | 'overdue';
}

export type PRHRentalStatus =
  | 'draft'
  | 'active'
  | 'partially_returned'
  | 'overdue'
  | 'fully_returned'
  | 'closed'
  | 'cancelled';

export interface PRHRental {
  id: string; // e.g. PRH-RENT-000001
  rentalNumber: string;
  businessUnit: 'PRH';
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string;
  customerType: PRHCustomerType;
  siteAddress: string;
  startDate: string;
  expectedReturnDate: string;
  expectedDays: number;
  totalRentalAmount: number;
  securityDepositTotal: number;
  advancePayment: number;
  paidAmount: number;
  outstandingAmount: number;
  status: PRHRentalStatus;
  items: PRHRentalItem[];
  paymentMethod: string;
  createdBy: string;
  createdAt: string;
  remarks?: string;
}

export interface PRHReturnItemDetail {
  equipmentId: string;
  equipmentName: string;
  serialNumber?: string;
  returnQty: number;
  goodQty: number;
  damagedQty: number;
  lostQty: number;
  actualDays: number;
  dailyRate: number;
  rentalCharge: number;
  lateCharge: number;
  damageCharge: number;
  lossCharge: number;
  totalCharge: number;
}

export interface PRHReturnRecord {
  id: string; // e.g. PRH-RET-000001
  rentalId: string;
  rentalNumber: string;
  customerId: string;
  customerName: string;
  returnDate: string;
  items: PRHReturnItemDetail[];
  totalRentalCharged: number;
  totalLateCharged: number;
  totalDamageCharged: number;
  totalLossCharged: number;
  totalCharges?: number;
  depositDeduction?: number;
  depositAdjusted?: number;
  depositRefunded: number;
  additionalPayment?: number;
  finalPaymentReceived?: number;
  paymentMethod?: string;
  processedBy: string;
  createdAt: string;
  remarks?: string;
  notes?: string;
}

export type PRHPaymentType =
  | 'rental_advance'
  | 'rental_settlement'
  | 'deposit_received'
  | 'deposit_refund'
  | 'damage_charge'
  | 'loss_charge'
  | 'late_charge';

export interface PRHPayment {
  id: string; // e.g. PRH-PAY-000001
  businessUnit: 'PRH';
  rentalId?: string;
  rentalNumber?: string;
  customerId: string;
  customerName: string;
  type: PRHPaymentType;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'lankaqr' | 'bank_transfer' | 'other';
  reference: string;
  date: string;
  enteredBy: string;
  remarks?: string;
}

export interface PRHFinanceTransaction {
  id: string; // e.g. PRH-FIN-000001
  business_unit: 'PRH';
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  debit: number;
  credit: number;
  balance: number;
  payment_method: string;
  reference: string;
  customer_name?: string;
  rental_number?: string;
  created_by: string;
  created_at: string;
}

export interface PRHReservationItem {
  equipmentId: string;
  equipmentName: string;
  quantity: number;
}

export interface PRHReservation {
  id: string; // e.g. PRH-RES-000001
  customerId: string;
  customerName: string;
  customerPhone: string;
  startDate: string;
  endDate: string;
  items: PRHReservationItem[];
  status: 'pending' | 'confirmed' | 'converted' | 'cancelled' | 'expired';
  deposit: number;
  createdAt: string;
  createdBy: string;
  notes?: string;
}

export interface PRHMaintenance {
  id: string; // e.g. PRH-MNT-000001
  equipmentId: string;
  equipmentName: string;
  serialNumber?: string;
  issue: string;
  damageDate?: string;
  startDate?: string;
  rentalReference?: string;
  repairStatus: 'reported' | 'under_inspection' | 'under_repair' | 'completed' | 'scrapped';
  estimatedCost: number;
  actualCost: number;
  repairer: string;
  expectedCompletion: string;
  completedDate?: string;
  loggedBy?: string;
  createdAt?: string;
  notes?: string;
}

export interface PRHReminderTemplate {
  id: string;
  name: string;
  eventType:
    | 'rental_confirmation'
    | 'one_day_before'
    | 'expected_return'
    | 'overdue_day1'
    | 'overdue_day3'
    | 'overdue_day7'
    | 'outstanding_payment';
  whatsappTemplate: string;
  emailSubject: string;
  emailBody: string;
  active: boolean;
}

export interface PRHNotificationLog {
  id: string; // e.g. PRH-NOTIF-000001
  businessUnit: 'PRH';
  customerId: string;
  customerName: string;
  phone: string;
  whatsapp: string;
  email?: string;
  rentalNumber?: string;
  channel: 'whatsapp' | 'email';
  templateName: string;
  message: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
}

export interface PRHSettings {
  businessName: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  rentalPrefix: string;
  invoicePrefix: string;
  customerPrefix: string;
  minRentalDays: number;
  graceHours: number;
  defaultLateChargePercent: number;
  whatsappApiUrl?: string;
}

export type PRHTabType =
  | 'prh-dashboard'
  | 'prh-new-rental'
  | 'prh-active-rentals'
  | 'prh-returns'
  | 'prh-customers'
  | 'prh-equipment'
  | 'prh-inventory'
  | 'prh-reservations'
  | 'prh-payments'
  | 'prh-finance'
  | 'prh-maintenance'
  | 'prh-reminders'
  | 'prh-reports'
  | 'prh-settings';
