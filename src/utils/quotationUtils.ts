import { DiscountType, QuotationCurrency, QuotationLineItem, QuotationRecord, QuotationType, RentalCalculationType } from '../types';

export const QUOTATIONS_STORAGE_KEY = 'v_rental_quotations';

export const DEFAULT_TERMS_AND_CONDITIONS_SALE = `1. Validity: This quotation is valid for 14 calendar days from the date of issuance.
2. Reservation: 50% advance payment is required to confirm the reservation.
3. Pricing & Currency: All prices quoted are in the designated currency and subject to product availability.
4. Delivery & Collection: Products to be collected directly at Mannar Green Ride Bicycle Hub, Main Street, Mannar.
5. Warranty: Brand-new bicycles and spare parts carry standard manufacturer guarantee against manufacturing defects.
6. Payment Terms: Full settlement or agreed deposit required prior to final delivery and handover.`;

export const DEFAULT_TERMS_AND_CONDITIONS_RENT = `1. Validity: This rental quotation is valid for 14 calendar days from the date of issuance.
2. Reservation: 50% advance payment is required to confirm the reservation.
3. Security Deposit & ID: A valid NIC / Passport and security deposit are required upon rental dispatch.
4. Safety & Equipment: Complimentary helmets and safety locks are provided upon customer request. Safety instructions must be observed.
5. Vehicle Care & Liability: Renter is responsible for vehicle condition during the rental duration. Damage or loss is chargeable at standard workshop rates.
6. Return Time: Fleets must be returned at or before the scheduled return window. Extensions require advance notice.`;

/**
 * Format quotation number with zero-padding: QUO-0000001
 */
export function formatQuotationNumber(num: number, prefix: string = 'QUO'): string {
  return `${prefix}-${String(Math.max(1, num)).padStart(7, '0')}`;
}

/**
 * Calculates next available monotonic sequential quotation number
 */
export function getNextQuotationNumber(existingQuotations: QuotationRecord[] = [], prefix: string = 'QUO'): string {
  if (!existingQuotations || existingQuotations.length === 0) {
    return `${prefix}-0000001`;
  }

  let maxNum = 0;
  const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');

  for (const q of existingQuotations) {
    if (!q?.quotationNumber) continue;
    const match = q.quotationNumber.match(regex);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }

  return formatQuotationNumber(maxNum + 1, prefix);
}

/**
 * Currency formatting helper for LKR and USD
 */
export function formatQuotationCurrency(amount: number, currency: QuotationCurrency = 'LKR'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formattedNumber = safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (currency === 'USD') {
    return `$ ${formattedNumber}`;
  }
  return `LK ${formattedNumber}`;
}

/**
 * Math engine for Sale Quotation:
 * Subtotal = Unit Price * Quantity
 * Computed Discount = percentage (%) of subtotal OR fixed amount
 * Final Total = max(0, Subtotal - Computed Discount)
 */
export function calculateSaleQuotation(
  unitPrice: number,
  quantity: number,
  discountValue: number = 0,
  discountType: DiscountType = 'fixed'
) {
  const p = Math.max(0, Number(unitPrice) || 0);
  const q = Math.max(0, Number(quantity) || 0);
  const dVal = Math.max(0, Number(discountValue) || 0);

  const subtotal = p * q;
  let computedDiscount = 0;
  if (discountType === 'percentage') {
    computedDiscount = (subtotal * Math.min(100, dVal)) / 100;
  } else {
    computedDiscount = dVal;
  }
  // Discount cannot exceed subtotal
  computedDiscount = Math.min(subtotal, computedDiscount);
  const finalTotal = Math.max(0, subtotal - computedDiscount);

  return {
    unitPrice: p,
    quantity: q,
    subtotal,
    discountType,
    discountValue: dVal,
    discount: computedDiscount,
    finalTotal,
  };
}

/**
 * Math engine for Rent Quotation:
 * Subtotal = Unit Price * Units * (Days or Hours)
 * Computed Discount = percentage (%) of subtotal OR fixed amount
 * Final Total = max(0, Subtotal - Computed Discount)
 */
export function calculateRentQuotation(
  unitPrice: number,
  units: number,
  duration: number,
  discountValue: number = 0,
  discountType: DiscountType = 'fixed'
) {
  const p = Math.max(0, Number(unitPrice) || 0);
  const u = Math.max(0, Number(units) || 0);
  const dur = Math.max(0, Number(duration) || 0);
  const dVal = Math.max(0, Number(discountValue) || 0);

  const subtotal = p * u * dur;
  let computedDiscount = 0;
  if (discountType === 'percentage') {
    computedDiscount = (subtotal * Math.min(100, dVal)) / 100;
  } else {
    computedDiscount = dVal;
  }
  // Discount cannot exceed subtotal
  computedDiscount = Math.min(subtotal, computedDiscount);
  const finalTotal = Math.max(0, subtotal - computedDiscount);

  return {
    unitPrice: p,
    units: u,
    duration: dur,
    subtotal,
    discountType,
    discountValue: dVal,
    discount: computedDiscount,
    finalTotal,
  };
}

/**
 * Load stored quotations from localStorage
 */
export function getStoredQuotations(): QuotationRecord[] {
  try {
    const raw = localStorage.getItem(QUOTATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.error('[Quotation] Failed to parse stored quotations:', err);
  }
  return [];
}

/**
 * Save quotations array to localStorage
 */
export function saveStoredQuotations(quotations: QuotationRecord[]): void {
  try {
    localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(quotations));
  } catch (err) {
    console.error('[Quotation] Failed to persist quotations to localStorage:', err);
  }
}
