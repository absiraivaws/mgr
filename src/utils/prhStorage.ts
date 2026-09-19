// PRH Local Storage Manager & Mock Seed Data
import {
  PRHCustomer,
  PRHEquipment,
  PRHRental,
  PRHReturnRecord,
  PRHPayment,
  PRHFinanceTransaction,
  PRHReservation,
  PRHMaintenance,
  PRHReminderTemplate,
  PRHNotificationLog,
  PRHSettings,
} from '../types/prhTypes';

const STORAGE_KEYS = {
  CUSTOMERS: 'prh_customers',
  EQUIPMENT: 'prh_equipment',
  RENTALS: 'prh_rentals',
  RETURNS: 'prh_returns',
  PAYMENTS: 'prh_payments',
  FINANCE: 'prh_finance_transactions',
  RESERVATIONS: 'prh_reservations',
  MAINTENANCE: 'prh_maintenance',
  TEMPLATES: 'prh_reminder_templates',
  NOTIFICATIONS: 'prh_notification_logs',
  SETTINGS: 'prh_settings',
};

// Seed Equipment Data
const INITIAL_EQUIPMENT: PRHEquipment[] = [
  {
    id: 'PRH-EQ-00001',
    code: 'EQ-SCAF-SET',
    name: 'Heavy Duty Frame Scaffolding Set (2 Frames + 2 Braces)',
    category: 'Scaffolding',
    rentalMethod: 'quantity',
    dailyRate: 350,
    securityDeposit: 2500,
    minDays: 1,
    lateChargeMethod: 'fixed',
    lateChargePerDay: 50,
    replacementValue: 18500,
    damageChargeRule: 'Rs. 2,500 per bent frame, Rs. 1,000 per damaged cross brace',
    totalQty: 120,
    availableQty: 95,
    rentedQty: 20,
    reservedQty: 5,
    maintenanceQty: 0,
    damagedQty: 0,
    lostQty: 0,
    uom: 'sets',
    status: 'active',
    description: 'Standard 1.7m x 1.2m steel frame scaffold set with cross braces for high-reach exterior plastering and masonry.',
    createdBy: 'admin@mannargreenride.lk',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'PRH-EQ-00002',
    code: 'EQ-JACK-ADJ',
    name: 'Heavy Duty Adjustable Acrow Iron Jack (Prop 3.5m)',
    category: 'Jacks & Props',
    rentalMethod: 'quantity',
    dailyRate: 150,
    securityDeposit: 1200,
    minDays: 1,
    lateChargeMethod: 'fixed',
    lateChargePerDay: 30,
    replacementValue: 6500,
    damageChargeRule: 'Rs. 1,500 for jammed pin or thread damage, full replacement for bent tube',
    totalQty: 250,
    availableQty: 180,
    rentedQty: 70,
    reservedQty: 0,
    maintenanceQty: 0,
    damagedQty: 0,
    lostQty: 0,
    uom: 'pcs',
    status: 'active',
    description: 'Telescopic steel telescopic jack supporting slab casting up to 3.5 meters height.',
    createdBy: 'admin@mannargreenride.lk',
    createdAt: '2026-09-01T08:30:00.000Z',
  },
  {
    id: 'PRH-EQ-00003',
    code: 'EQ-PIPE-GI6M',
    name: 'GI Scaffolding Tube Pipe 1.5" (6 Meter)',
    category: 'Pipes & Tubes',
    rentalMethod: 'quantity',
    dailyRate: 80,
    securityDeposit: 600,
    minDays: 1,
    lateChargeMethod: 'fixed',
    lateChargePerDay: 15,
    replacementValue: 4200,
    damageChargeRule: 'Full replacement value if cut or severely deformed',
    totalQty: 400,
    availableQty: 300,
    rentedQty: 100,
    reservedQty: 0,
    maintenanceQty: 0,
    damagedQty: 0,
    lostQty: 0,
    uom: 'pcs',
    status: 'active',
    description: 'Galvanized iron structural pipes 48.3mm outer diameter for scaffolding ledger and bracing.',
    createdBy: 'admin@mannargreenride.lk',
    createdAt: '2026-09-01T09:00:00.000Z',
  },
  {
    id: 'PRH-EQ-00004',
    code: 'EQ-PLATE-WALK',
    name: 'Perforated Steel Walkway Safety Catwalk Plate (3.0m)',
    category: 'Safety Plates',
    rentalMethod: 'quantity',
    dailyRate: 180,
    securityDeposit: 1500,
    minDays: 1,
    lateChargeMethod: 'fixed',
    lateChargePerDay: 35,
    replacementValue: 9500,
    damageChargeRule: 'Rs. 2,000 for hook damage, full replacement if fractured',
    totalQty: 150,
    availableQty: 110,
    rentedQty: 40,
    reservedQty: 0,
    maintenanceQty: 0,
    damagedQty: 0,
    lostQty: 0,
    uom: 'pcs',
    status: 'active',
    description: 'Non-slip anti-skid metal scaffolding platform plate with end lock hooks.',
    createdBy: 'admin@mannargreenride.lk',
    createdAt: '2026-09-01T09:30:00.000Z',
  },
  {
    id: 'PRH-EQ-00005',
    code: 'EQ-WELD-300A',
    name: 'Inverter ARC / MMA Industrial Welding Machine 300A',
    category: 'Welding & Cutting',
    rentalMethod: 'serial',
    dailyRate: 1600,
    securityDeposit: 12000,
    minDays: 1,
    lateChargeMethod: 'fixed',
    lateChargePerDay: 300,
    replacementValue: 48000,
    damageChargeRule: 'Rs. 4,000 for burnt cable/holder, inspection fee for internal board fault',
    totalQty: 6,
    availableQty: 4,
    rentedQty: 2,
    reservedQty: 0,
    maintenanceQty: 0,
    damagedQty: 0,
    lostQty: 0,
    uom: 'units',
    status: 'active',
    description: 'High performance IGBT inverter welder with electrode holder and ground clamp.',
    serialUnits: [
      { serialNumber: 'WM-300-01', status: 'rented' },
      { serialNumber: 'WM-300-02', status: 'available' },
      { serialNumber: 'WM-300-03', status: 'available' },
      { serialNumber: 'WM-300-04', status: 'available' },
      { serialNumber: 'WM-300-05', status: 'rented' },
      { serialNumber: 'WM-300-06', status: 'available' },
    ],
    createdBy: 'admin@mannargreenride.lk',
    createdAt: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 'PRH-EQ-00006',
    code: 'EQ-LADD-32FT',
    name: 'Heavy Duty Aluminum Extension Ladder (32ft Dual Section)',
    category: 'Ladders & Platforms',
    rentalMethod: 'serial',
    dailyRate: 900,
    securityDeposit: 6000,
    minDays: 1,
    lateChargeMethod: 'fixed',
    lateChargePerDay: 180,
    replacementValue: 36000,
    damageChargeRule: 'Full replacement if rung or side rail bent',
    totalQty: 8,
    availableQty: 6,
    rentedQty: 2,
    reservedQty: 0,
    maintenanceQty: 0,
    damagedQty: 0,
    lostQty: 0,
    uom: 'units',
    status: 'active',
    description: 'Commercial 32-foot extending ladder with swivel safety shoes and rope-pulley system.',
    serialUnits: [
      { serialNumber: 'LAD-32-01', status: 'available' },
      { serialNumber: 'LAD-32-02', status: 'available' },
      { serialNumber: 'LAD-32-03', status: 'rented' },
      { serialNumber: 'LAD-32-04', status: 'available' },
      { serialNumber: 'LAD-32-05', status: 'available' },
      { serialNumber: 'LAD-32-06', status: 'rented' },
      { serialNumber: 'LAD-32-07', status: 'available' },
      { serialNumber: 'LAD-32-08', status: 'available' },
    ],
    createdBy: 'admin@mannargreenride.lk',
    createdAt: '2026-09-02T10:30:00.000Z',
  },
  {
    id: 'PRH-EQ-00007',
    code: 'EQ-JACK-16KG',
    name: 'Demolition Breaker / Concrete Jackhammer 16kg',
    category: 'Power Tools',
    rentalMethod: 'serial',
    dailyRate: 2500,
    securityDeposit: 15000,
    minDays: 1,
    lateChargeMethod: 'fixed',
    lateChargePerDay: 500,
    replacementValue: 68000,
    damageChargeRule: 'Rs. 3,500 per damaged point/flat chisel bit, repair cost for motor failure',
    totalQty: 4,
    availableQty: 3,
    rentedQty: 1,
    reservedQty: 0,
    maintenanceQty: 0,
    damagedQty: 0,
    lostQty: 0,
    uom: 'units',
    status: 'active',
    description: 'Heavy 45 Joules impact energy electric demolition hammer with SDS-Hex chuck.',
    serialUnits: [
      { serialNumber: 'DH-16-01', status: 'available' },
      { serialNumber: 'DH-16-02', status: 'rented' },
      { serialNumber: 'DH-16-03', status: 'available' },
      { serialNumber: 'DH-16-04', status: 'available' },
    ],
    createdBy: 'admin@mannargreenride.lk',
    createdAt: '2026-09-02T11:00:00.000Z',
  },
];

// Seed Customers Data
const INITIAL_CUSTOMERS: PRHCustomer[] = [
  {
    id: 'PRH-CUS-00001',
    customerType: 'contractor',
    name: 'Anton Builders & Contractors',
    nic: '198425102345',
    companyName: 'Anton Builders Pvt Ltd',
    contactPerson: 'Anton Silva',
    phone: '0772345678',
    whatsapp: '0772345678',
    sameAsPhone: true,
    email: 'anton.silva@antonbuilders.lk',
    address: 'No 45, Main Cross Road, Pesalai, Mannar',
    siteAddress: 'Commercial Plaza Project, Station Road, Mannar Town',
    emergencyContact: '0719876543 (Site Engineer Rajan)',
    creditLimit: 150000,
    outstandingBalance: 0,
    depositBalance: 25000,
    status: 'active',
    remarks: 'Preferred registered civil contractor. Prompt payments.',
    createdAt: '2026-09-05T09:00:00.000Z',
    createdBy: 'admin@mannargreenride.lk',
  },
  {
    id: 'PRH-CUS-00002',
    customerType: 'company',
    name: 'Pesalai St. Anne Construction Hub',
    nic: 'PV00291840',
    companyName: 'St. Anne Constructions',
    contactPerson: 'K. Mary Jeyakumar',
    phone: '0778899001',
    whatsapp: '0778899001',
    sameAsPhone: true,
    email: 'stanne.construct@gmail.com',
    address: 'Hospital Junction, Pesalai',
    siteAddress: 'Catholic Community Hall Renovation, Church Road, Pesalai',
    creditLimit: 200000,
    outstandingBalance: 0,
    depositBalance: 15000,
    status: 'active',
    remarks: 'Requires monthly statements for finance accounting.',
    createdAt: '2026-09-08T10:00:00.000Z',
    createdBy: 'admin@mannargreenride.lk',
  },
  {
    id: 'PRH-CUS-00003',
    customerType: 'individual',
    name: 'Selvakumar Nadarajah',
    nic: '881432190V',
    phone: '0761122334',
    whatsapp: '0761122334',
    sameAsPhone: true,
    email: 'selva.pesalai@gmail.com',
    address: 'Fisheries Road, Pesalai',
    siteAddress: 'Two-Story Residence Construction, Fisheries Road, Pesalai',
    creditLimit: 50000,
    outstandingBalance: 0,
    depositBalance: 5000,
    status: 'active',
    remarks: 'Private home builder renting jacks and scaffolding.',
    createdAt: '2026-09-10T11:00:00.000Z',
    createdBy: 'admin@mannargreenride.lk',
  },
];

// Seed Active Rental
const INITIAL_RENTALS: PRHRental[] = [
  {
    id: 'PRH-RENT-000001',
    rentalNumber: 'PRH-RENT-000001',
    businessUnit: 'PRH',
    customerId: 'PRH-CUS-00001',
    customerName: 'Anton Builders & Contractors',
    customerPhone: '0772345678',
    customerWhatsapp: '0772345678',
    customerType: 'contractor',
    siteAddress: 'Commercial Plaza Project, Station Road, Mannar Town',
    startDate: '2026-09-14',
    expectedReturnDate: '2026-09-18',
    expectedDays: 4,
    totalRentalAmount: 40000,
    securityDepositTotal: 25000,
    advancePayment: 40000,
    paidAmount: 65000,
    outstandingAmount: 0,
    status: 'active',
    items: [
      {
        equipmentId: 'PRH-EQ-00001',
        equipmentCode: 'EQ-SCAF-SET',
        equipmentName: 'Heavy Duty Frame Scaffolding Set',
        category: 'Scaffolding',
        rentalMethod: 'quantity',
        quantity: 20,
        dailyRate: 350,
        securityDepositPerUnit: 1000,
        startDate: '2026-09-14',
        expectedReturnDate: '2026-09-18',
        expectedDays: 4,
        totalRental: 28000,
        totalDeposit: 20000,
        returnedQty: 0,
        damagedQty: 0,
        lostQty: 0,
        outstandingQty: 20,
        itemStatus: 'active',
      },
      {
        equipmentId: 'PRH-EQ-00002',
        equipmentCode: 'EQ-JACK-ADJ',
        equipmentName: 'Heavy Duty Adjustable Acrow Iron Jack',
        category: 'Jacks & Props',
        rentalMethod: 'quantity',
        quantity: 20,
        dailyRate: 150,
        securityDepositPerUnit: 250,
        startDate: '2026-09-14',
        expectedReturnDate: '2026-09-18',
        expectedDays: 4,
        totalRental: 12000,
        totalDeposit: 5000,
        returnedQty: 0,
        damagedQty: 0,
        lostQty: 0,
        outstandingQty: 20,
        itemStatus: 'active',
      },
    ],
    paymentMethod: 'bank_transfer',
    createdBy: 'admin@mannargreenride.lk',
    createdAt: '2026-09-14T09:00:00.000Z',
    remarks: 'Plaza exterior painting and ceiling support.',
  },
];

// Seed Finance Transactions
const INITIAL_FINANCE: PRHFinanceTransaction[] = [
  {
    id: 'PRH-FIN-000001',
    business_unit: 'PRH',
    date: '2026-09-14',
    type: 'income',
    category: 'Rental Income',
    description: 'Advance rental payment for PRH-RENT-000001 (Anton Builders)',
    amount: 40000,
    debit: 0,
    credit: 40000,
    balance: 40000,
    payment_method: 'bank_transfer',
    reference: 'PRH-RENT-000001',
    customer_name: 'Anton Builders & Contractors',
    rental_number: 'PRH-RENT-000001',
    created_by: 'admin@mannargreenride.lk',
    created_at: '2026-09-14T09:15:00.000Z',
  },
  {
    id: 'PRH-FIN-000002',
    business_unit: 'PRH',
    date: '2026-09-14',
    type: 'income',
    category: 'Security Deposit',
    description: 'Refundable security deposit held for PRH-RENT-000001',
    amount: 25000,
    debit: 0,
    credit: 25000,
    balance: 65000,
    payment_method: 'bank_transfer',
    reference: 'PRH-DEP-000001',
    customer_name: 'Anton Builders & Contractors',
    rental_number: 'PRH-RENT-000001',
    created_by: 'admin@mannargreenride.lk',
    created_at: '2026-09-14T09:15:00.000Z',
  },
  {
    id: 'PRH-FIN-000003',
    business_unit: 'PRH',
    date: '2026-09-12',
    type: 'expense',
    category: 'Equipment Maintenance',
    description: 'Routine servicing and grease lubrication for 300 Acrow Jacks',
    amount: 7500,
    debit: 7500,
    credit: 0,
    balance: -7500,
    payment_method: 'cash',
    reference: 'PRH-EXP-000001',
    created_by: 'admin@mannargreenride.lk',
    created_at: '2026-09-12T14:30:00.000Z',
  },
];

// Seed Reminder Templates
const INITIAL_TEMPLATES: PRHReminderTemplate[] = [
  {
    id: 'TPL-CONFIRM',
    name: 'Rental Confirmation',
    eventType: 'rental_confirmation',
    whatsappTemplate: `Hello {customer_name}, your construction equipment rental #{rental_number} with Pesalai Rental Hub (PRH) has been confirmed! \n\nEquipment: {equipment}\nStart Date: {start_date}\nExpected Return: {return_date}\nAdvance Paid: Rs. {paid_amount}\n\nThank you for choosing PRH. Please keep equipment secure at site!`,
    emailSubject: 'PRH Rental Agreement Confirmation #{rental_number}',
    emailBody: 'Dear {customer_name},\n\nYour equipment rental has been confirmed. Please find your agreement details enclosed.',
    active: true,
  },
  {
    id: 'TPL-BEFORE-RETURN',
    name: '1 Day Before Expected Return',
    eventType: 'one_day_before',
    whatsappTemplate: `Dear {customer_name},\n\nThis is a friendly reminder from Pesalai Rental Hub.\n\nRental: #{rental_number}\nExpected Return Date: Tomorrow ({return_date})\nOutstanding Equipment: {equipment}\n\nPlease inspect and arrange transport for return on time to avoid late fees.\nContact: 0771234567`,
    emailSubject: 'Reminder: Equipment Return Due Tomorrow - #{rental_number}',
    emailBody: 'Dear {customer_name},\nYour rental #{rental_number} is due for return tomorrow. Please ensure equipment is bundled and ready.',
    active: true,
  },
  {
    id: 'TPL-OVERDUE',
    name: 'Overdue Rental Notice',
    eventType: 'overdue_day1',
    whatsappTemplate: `URGENT NOTICE - Pesalai Rental Hub\n\nDear {customer_name},\nYour rental #{rental_number} was due on {return_date} and is now OVERDUE by {overdue_days} day(s).\n\nOutstanding Amount: Rs. {outstanding_amount}\nPlease return equipment immediately or call our depot at 0771234567 to renew.`,
    emailSubject: 'URGENT: Overdue Rental #{rental_number}',
    emailBody: 'Dear {customer_name},\nYour rental is currently overdue. Please contact PRH administration immediately.',
    active: true,
  },
  {
    id: 'TPL-PAYMENT',
    name: 'Outstanding Payment Reminder',
    eventType: 'outstanding_payment',
    whatsappTemplate: `Dear {customer_name},\nThis is an account reminder from Pesalai Rental Hub.\nRental #{rental_number} has an unpaid balance of Rs. {outstanding_amount}.\nKindly arrange settlement.\nAccount: Commercial Bank Mannar Branch, Pesalai Rental Hub.`,
    emailSubject: 'Outstanding Balance Reminder #{rental_number}',
    emailBody: 'Dear {customer_name},\nPlease arrange settlement of your outstanding balance.',
    active: true,
  },
];

const INITIAL_SETTINGS: PRHSettings = {
  businessName: 'PRH – Pesalai Rental Hub',
  address: 'Main Commercial Street, Pesalai, Mannar, Sri Lanka',
  phone: '0771234567',
  whatsapp: '0771234567',
  email: 'rentals@pesalaihub.lk',
  rentalPrefix: 'PRH-RENT-',
  invoicePrefix: 'PRH-INV-',
  customerPrefix: 'PRH-CUS-',
  minRentalDays: 1,
  graceHours: 2,
  defaultLateChargePercent: 10,
};

// --- Storage Helper API ---

export const getPRHCustomers = (): PRHCustomer[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CUSTOMERS;
  }
};

export const savePRHCustomers = (customers: PRHCustomer[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch (e) {
    console.error('Error saving PRH customers:', e);
  }
};

export const getPRHEquipment = (): PRHEquipment[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(INITIAL_EQUIPMENT));
      return INITIAL_EQUIPMENT;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_EQUIPMENT;
  }
};

export const savePRHEquipment = (equipment: PRHEquipment[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipment));
  } catch (e) {
    console.error('Error saving PRH equipment:', e);
  }
};

export const getPRHRentals = (): PRHRental[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RENTALS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.RENTALS, JSON.stringify(INITIAL_RENTALS));
      return INITIAL_RENTALS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RENTALS;
  }
};

export const savePRHRentals = (rentals: PRHRental[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.RENTALS, JSON.stringify(rentals));
  } catch (e) {
    console.error('Error saving PRH rentals:', e);
  }
};

export const getPRHReturns = (): PRHReturnRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RETURNS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const savePRHReturns = (returns: PRHReturnRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(returns));
  } catch (e) {
    console.error('Error saving PRH returns:', e);
  }
};

export const getPRHPayments = (): PRHPayment[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const savePRHPayments = (payments: PRHPayment[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  } catch (e) {
    console.error('Error saving PRH payments:', e);
  }
};

export const getPRHFinanceTransactions = (): PRHFinanceTransaction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FINANCE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify(INITIAL_FINANCE));
      return INITIAL_FINANCE;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_FINANCE;
  }
};

export const savePRHFinanceTransactions = (transactions: PRHFinanceTransaction[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify(transactions));
  } catch (e) {
    console.error('Error saving PRH finance:', e);
  }
};

export const getPRHReservations = (): PRHReservation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const savePRHReservations = (reservations: PRHReservation[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(reservations));
  } catch (e) {
    console.error('Error saving PRH reservations:', e);
  }
};

export const getPRHMaintenance = (): PRHMaintenance[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MAINTENANCE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const savePRHMaintenance = (records: PRHMaintenance[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving PRH maintenance:', e);
  }
};

export const getPRHReminderTemplates = (): PRHReminderTemplate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(INITIAL_TEMPLATES));
      return INITIAL_TEMPLATES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_TEMPLATES;
  }
};

export const savePRHReminderTemplates = (templates: PRHReminderTemplate[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error('Error saving PRH templates:', e);
  }
};

export const getPRHNotificationLogs = (): PRHNotificationLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const savePRHNotificationLogs = (logs: PRHNotificationLog[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving PRH notification logs:', e);
  }
};

export const getPRHSettings = (): PRHSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
      return INITIAL_SETTINGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SETTINGS;
  }
};

export const savePRHSettings = (settings: PRHSettings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving PRH settings:', e);
  }
};

// Calculation Utilities
export const calculatePRHChargeableDays = (
  startDate: string,
  expectedReturnDate: string,
  minDays: number = 1
): number => {
  try {
    const start = new Date(startDate).getTime();
    const end = new Date(expectedReturnDate).getTime();
    if (isNaN(start) || isNaN(end)) return minDays;
    const diffMs = end - start;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(minDays, diffDays || 1);
  } catch {
    return minDays;
  }
};

export const generateNextPRHId = (prefix: string, existingIds: string[], digits: number = 5): string => {
  let maxNum = 0;
  for (const id of existingIds) {
    if (id.startsWith(prefix)) {
      const numPart = parseInt(id.replace(prefix, ''), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(digits, '0')}`;
};
