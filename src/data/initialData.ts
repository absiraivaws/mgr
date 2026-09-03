import { AppSettings, Customer, RentalRecord, Vehicle, VehicleType } from '../types';

export const INITIAL_VEHICLE_TYPES: VehicleType[] = [
  {
    id: 'type-bicycle-boys',
    name: 'Bicycle - Boys',
    icon: 'bicycle',
    description: 'Boys City bikes & cruisers',
    color: 'emerald',
    rates: {
      firstHour: 100.00,       // LK 100 for first 60 mins
      every30Min: 50.00,       // LK 50 for every continuing 30 min (>60 min)
    },
  },
  {
    id: 'type-bicycle-girls',
    name: 'Bicycle - Girls',
    icon: 'bicycle',
    description: 'Girls City bikes & cruisers',
    color: 'rose',
    rates: {
      firstHour: 100.00,       // LK 100 for first 60 mins
      every30Min: 50.00,       // LK 50 for every continuing 30 min (>60 min)
    },
  },
  {
    id: 'type-motorcycle',
    name: 'Motor Cycle',
    icon: 'motorcycle',
    description: 'Scooters & motor cycles',
    color: 'indigo',
    rates: {
      firstHour: 500.00,      // LK 500 for first 60 mins
      every30Min: 250.00,     // LK 250 for every continuing 30 min (>60 min)
    },
  },
];

export const INITIAL_VEHICLES: Vehicle[] = [
  // 1-5: Bicycle - Boys
  { id: 'veh-b01', serialNumber: '01-0001', typeId: 'type-bicycle-boys', modelName: 'Boys Cycle', status: 'available' },
  { id: 'veh-b02', serialNumber: '01-0002', typeId: 'type-bicycle-boys', modelName: 'Boys Cycle', status: 'available' },
  { id: 'veh-b03', serialNumber: '01-0003', typeId: 'type-bicycle-boys', modelName: 'Boys Cycle', status: 'available' },
  { id: 'veh-b04', serialNumber: '01-0004', typeId: 'type-bicycle-boys', modelName: 'Boys Cycle', status: 'available' },
  { id: 'veh-b05', serialNumber: '01-0005', typeId: 'type-bicycle-boys', modelName: 'Boys Cycle', status: 'available' },

  // 6-7: Motor Cycle
  { id: 'veh-m01', serialNumber: '03-001', typeId: 'type-motorcycle', modelName: 'Suzuki', status: 'available' },
  { id: 'veh-m02', serialNumber: '03-002', typeId: 'type-motorcycle', modelName: 'Suzuki', status: 'available' },
  { id: 'veh-m03', serialNumber: '03-003', typeId: 'type-motorcycle', modelName: 'Suzuki', status: 'available' },

  // 8-13: Bicycle - Girls
  { id: 'veh-g01', serialNumber: '02-0001', typeId: 'type-bicycle-girls', modelName: 'Girls Cycle', status: 'available' },
  { id: 'veh-g02', serialNumber: '02-0002', typeId: 'type-bicycle-girls', modelName: 'Girls Cycle', status: 'available' },
  { id: 'veh-g03', serialNumber: '02-0003', typeId: 'type-bicycle-girls', modelName: 'Girls Cycle', status: 'available' },
  { id: 'veh-g04', serialNumber: '02-0004', typeId: 'type-bicycle-girls', modelName: 'Girls Cycle', status: 'available' },
  { id: 'veh-g05', serialNumber: '02-0005', typeId: 'type-bicycle-girls', modelName: 'Girls Cycle', status: 'available' },
];

export const INITIAL_SETTINGS: AppSettings = {
  businessName: 'Mannar Green Ride',
  businessPhone: '0773606494',
  businessAddress: 'Main Street, Mannar, Sri Lanka',
  receiptFooter: 'Thank you for riding with Mannar Green Ride! Please wear a helmet and drive safely.',
  currencySymbol: 'LK',
  currencyPosition: 'prefix',
  cashierName: 'Tharson',
  soundEnabled: true,
  rentalNumberPrefix: 'REN',
};

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-siraiva',
    nicPassport: '198802900037',
    name: 'A.B.Siraiva',
    fullName: 'A.B. Siraiva',
    phone: '0773606494',
    whatsappNumber: '0773606494',
    address: 'Main Street, Mannar, Sri Lanka',
    dob: '1988-01-29',
    notes: 'Registered Regular Customer',
    totalRentalsCount: 2,
    createdAt: 1788272849000,
    lastRentalDate: 1788282385000,
  },
  {
    id: 'cust-croos',
    nicPassport: '915533990V',
    name: 'B.M CROOS',
    fullName: 'B.M CROOS',
    phone: '0772837620',
    whatsappNumber: '0772837620',
    address: 'Pallimunai, Mannar, Sri Lanka',
    dob: '1991-05-18',
    notes: 'Counter customer',
    totalRentalsCount: 1,
    createdAt: 1788280285000,
    lastRentalDate: 1788280295000,
  },
];

export const INITIAL_COMPLETED_RENTALS: RentalRecord[] = [
  {
    id: 'rental-103',
    rentalNumber: 'REN-103',
    vehicleId: 'veh-b01',
    vehicleSerialNumber: '01-0001',
    vehicleTypeId: 'type-bicycle-boys',
    vehicleTypeName: 'Bicycle - Boys',
    vehicleIcon: 'bicycle',
    customerName: 'A.B.Siraiva',
    customerPhone: '0773606494',
    customerNicPassport: '198802900037',
    depositAmount: 0,
    startTime: 1788282259000,
    endTime: 1788282385000,
    status: 'completed',
    rateSnapshot: { firstHour: 100, every30Min: 50 },
    totalAmount: 100,
    cashierName: 'Tharson',
    paymentMethod: 'cash',
    amountReceived: 100,
    changeAmount: 0,
    completedAt: 1788282385000,
    breakdown: {
      totalMinutes: 3,
      durationFormatted: '3 mins',
      firstHourMinutes: 3,
      firstHourAmount: 100,
      every30MinCount: 0,
      every30MinRate: 50,
      every30MinAmount: 0,
      subtotal: 100,
      totalAmount: 100,
    },
  },
  {
    id: 'rental-102',
    rentalNumber: 'REN-102',
    vehicleId: 'veh-b01',
    vehicleSerialNumber: '01-0001',
    vehicleTypeId: 'type-bicycle-boys',
    vehicleTypeName: 'Bicycle - Boys',
    vehicleIcon: 'bicycle',
    customerName: 'B.M CROOS',
    customerPhone: '0772837620',
    customerNicPassport: '915533990V',
    depositAmount: 0,
    startTime: 1788280285000,
    endTime: 1788280295000,
    status: 'completed',
    rateSnapshot: { firstHour: 100, every30Min: 50 },
    totalAmount: 100,
    cashierName: 'Tharson',
    paymentMethod: 'cash',
    amountReceived: 100,
    changeAmount: 0,
    completedAt: 1788280295000,
    breakdown: {
      totalMinutes: 1,
      durationFormatted: '1 min',
      firstHourMinutes: 1,
      firstHourAmount: 100,
      every30MinCount: 0,
      every30MinRate: 50,
      every30MinAmount: 0,
      subtotal: 100,
      totalAmount: 100,
    },
  },
  {
    id: 'rental-101',
    rentalNumber: 'REN-101',
    vehicleId: 'veh-b01',
    vehicleSerialNumber: '01-0001',
    vehicleTypeId: 'type-bicycle-boys',
    vehicleTypeName: 'Bicycle - Boys',
    vehicleIcon: 'bicycle',
    customerName: 'A.B.Siraiva',
    customerPhone: '0773606494',
    customerNicPassport: '198802900037',
    depositAmount: 0,
    startTime: 1788278193000,
    endTime: 1788278208000,
    status: 'completed',
    rateSnapshot: { firstHour: 100, every30Min: 50 },
    totalAmount: 100,
    cashierName: 'Tharson',
    paymentMethod: 'cash',
    amountReceived: 100,
    changeAmount: 0,
    completedAt: 1788278208000,
    breakdown: {
      totalMinutes: 1,
      durationFormatted: '1 min',
      firstHourMinutes: 1,
      firstHourAmount: 100,
      every30MinCount: 0,
      every30MinRate: 50,
      every30MinAmount: 0,
      subtotal: 100,
      totalAmount: 100,
    },
  },
];

