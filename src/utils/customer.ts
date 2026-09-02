import { Customer, RentalRecord } from '../types';

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
 * Autocomplete search for customers across NIC, Name, and Phone
 */
export function searchCustomers(
  query: string,
  customers: Customer[]
): Customer[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toUpperCase();
  return customers.filter((c) => {
    const nicMatch = c.nicPassport.toUpperCase().includes(q);
    const nameMatch = c.name.toUpperCase().includes(q);
    const phoneMatch = c.phone ? c.phone.toUpperCase().includes(q) : false;
    return nicMatch || nameMatch || phoneMatch;
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
          phone: r.customerPhone || '',
          notes: r.customerNotes || '',
          createdAt: r.startTime,
          lastRentalDate: r.startTime,
          totalRentalsCount: 1,
        });
      } else {
        existing.totalRentalsCount = (existing.totalRentalsCount || 1) + 1;
        if (!existing.phone && r.customerPhone) existing.phone = r.customerPhone;
        if (!existing.name && r.customerName) existing.name = r.customerName;
      }
    }
  });

  return Array.from(customerMap.values());
}
