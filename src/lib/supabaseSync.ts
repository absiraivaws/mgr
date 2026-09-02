import { getSupabase } from './supabase';
import { AppSettings, Customer, RentalRecord, Vehicle, VehicleType } from '../types';

/**
 * Fetch all initial data from Supabase if connected
 */
export async function fetchSupabaseData(): Promise<{
  vehicleTypes?: VehicleType[];
  vehicles?: Vehicle[];
  customers?: Customer[];
  activeRentals?: RentalRecord[];
  completedRentals?: RentalRecord[];
  settings?: AppSettings;
} | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const [typesRes, vehiclesRes, customersRes, rentalsRes, settingsRes] = await Promise.all([
      supabase.from('vehicle_types').select('*'),
      supabase.from('vehicles').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('rentals').select('*'),
      supabase.from('app_settings').select('*').limit(1),
    ]);

    const result: {
      vehicleTypes?: VehicleType[];
      vehicles?: Vehicle[];
      customers?: Customer[];
      activeRentals?: RentalRecord[];
      completedRentals?: RentalRecord[];
      settings?: AppSettings;
    } = {};

    if (typesRes.data && typesRes.data.length > 0) {
      result.vehicleTypes = typesRes.data.map((row) => ({
        id: row.id,
        name: row.name,
        icon: row.icon,
        description: row.description,
        color: row.color,
        rates: row.rates,
      }));
    }

    if (vehiclesRes.data && vehiclesRes.data.length > 0) {
      result.vehicles = vehiclesRes.data.map((row) => ({
        id: row.id,
        serialNumber: row.serial_number,
        typeId: row.type_id,
        modelName: row.model_name,
        status: row.status,
        notes: row.notes,
        lastRentedAt: row.last_rented_at ? Number(row.last_rented_at) : undefined,
        totalRentalsCount: row.total_rentals_count || 0,
      }));
    }

    if (customersRes.data && customersRes.data.length > 0) {
      result.customers = customersRes.data.map((row) => ({
        id: row.id,
        nicPassport: row.nic_passport,
        name: row.name,
        phone: row.phone,
        notes: row.notes,
        totalRentalsCount: row.total_rentals_count || 1,
        lastRentalDate: row.last_rental_date ? Number(row.last_rental_date) : undefined,
        createdAt: row.created_at ? Number(row.created_at) : undefined,
      }));
    }

    if (rentalsRes.data && rentalsRes.data.length > 0) {
      const active: RentalRecord[] = [];
      const completed: RentalRecord[] = [];

      rentalsRes.data.forEach((row) => {
        const item: RentalRecord = {
          id: row.id,
          rentalNumber: row.rental_number,
          vehicleId: row.vehicle_id,
          vehicleSerialNumber: row.vehicle_serial_number,
          vehicleTypeId: row.vehicle_type_id,
          vehicleTypeName: row.vehicle_type_name,
          vehicleIcon: row.vehicle_icon,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          customerNicPassport: row.customer_nic_passport,
          customerNotes: row.customer_notes,
          depositAmount: row.deposit_amount ? Number(row.deposit_amount) : 0,
          startTime: Number(row.start_time),
          endTime: row.end_time ? Number(row.end_time) : undefined,
          status: row.status,
          rateSnapshot: row.rate_snapshot,
          breakdown: row.breakdown,
          totalAmount: Number(row.total_amount || 0),
          cashierName: row.cashier_name,
          paymentMethod: row.payment_method,
          amountReceived: row.amount_received ? Number(row.amount_received) : undefined,
          changeAmount: row.change_amount ? Number(row.change_amount) : undefined,
          completedAt: row.completed_at ? Number(row.completed_at) : undefined,
        };

        if (item.status === 'active') {
          active.push(item);
        } else {
          completed.push(item);
        }
      });

      result.activeRentals = active;
      result.completedRentals = completed;
    }

    if (settingsRes.data && settingsRes.data[0]) {
      const row = settingsRes.data[0];
      result.settings = {
        businessName: row.business_name,
        businessPhone: row.business_phone,
        businessAddress: row.business_address,
        receiptFooter: row.receipt_footer,
        currencySymbol: row.currency_symbol,
        currencyPosition: row.currency_position,
        cashierName: row.cashier_name,
        soundEnabled: row.sound_enabled ?? true,
        rentalNumberPrefix: row.rental_number_prefix || 'REN',
      };
    }

    return result;
  } catch (err) {
    console.warn('Supabase fetch error (fallback to local state):', err);
    return null;
  }
}

/**
 * Upsert or save a rental record to Supabase
 */
export async function syncRentalToSupabase(rental: RentalRecord) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const payload = {
      rental_number: rental.rentalNumber,
      vehicle_id: rental.vehicleId,
      vehicle_serial_number: rental.vehicleSerialNumber,
      vehicle_type_id: rental.vehicleTypeId,
      vehicle_type_name: rental.vehicleTypeName,
      vehicle_icon: rental.vehicleIcon,
      customer_name: rental.customerName || '',
      customer_phone: rental.customerPhone || '',
      customer_nic_passport: rental.customerNicPassport || '',
      customer_notes: rental.customerNotes || null,
      deposit_amount: rental.depositAmount || 0,
      start_time: rental.startTime,
      end_time: rental.endTime || null,
      status: rental.status,
      rate_snapshot: rental.rateSnapshot,
      breakdown: rental.breakdown || null,
      total_amount: rental.totalAmount || 0,
      cashier_name: rental.cashierName || 'Counter',
      payment_method: rental.paymentMethod || null,
      amount_received: rental.amountReceived || null,
      change_amount: rental.changeAmount || null,
      completed_at: rental.completedAt || null,
    };

    const { data: existing } = await supabase.from('rentals').select('id').eq('rental_number', rental.rentalNumber).maybeSingle();
    if (existing) {
      await supabase.from('rentals').update(payload).eq('rental_number', rental.rentalNumber);
    } else {
      await supabase.from('rentals').insert({ id: rental.id, ...payload });
    }
  } catch (err) {
    console.error('Failed to sync rental to Supabase:', err);
  }
}

/**
 * Sync customer profile to Supabase
 */
export async function syncCustomerToSupabase(customer: Customer) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const payload = {
      nic_passport: customer.nicPassport,
      name: customer.name,
      phone: customer.phone || '',
      notes: customer.notes || null,
      total_rentals_count: customer.totalRentalsCount || 1,
      last_rental_date: customer.lastRentalDate || null,
      created_at: customer.createdAt || Date.now(),
    };

    const { data: existing } = await supabase.from('customers').select('id').eq('nic_passport', customer.nicPassport).maybeSingle();
    if (existing) {
      await supabase.from('customers').update(payload).eq('nic_passport', customer.nicPassport);
    } else {
      await supabase.from('customers').insert({ id: customer.id, ...payload });
    }
  } catch (err) {
    console.error('Failed to sync customer to Supabase:', err);
  }
}

/**
 * Sync fleet vehicles to Supabase
 */
export async function syncVehicleToSupabase(vehicle: Vehicle) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const payload = {
      serial_number: vehicle.serialNumber,
      type_id: vehicle.typeId,
      model_name: vehicle.modelName || '',
      status: vehicle.status || 'available',
      notes: vehicle.notes || null,
      last_rented_at: vehicle.lastRentedAt || null,
      total_rentals_count: vehicle.totalRentalsCount || 0,
    };

    const { data: existing } = await supabase.from('vehicles').select('id').eq('serial_number', vehicle.serialNumber).maybeSingle();
    if (existing) {
      await supabase.from('vehicles').update(payload).eq('serial_number', vehicle.serialNumber);
    } else {
      await supabase.from('vehicles').insert({ id: vehicle.id, ...payload });
    }
  } catch (err) {
    console.error('Failed to sync vehicle to Supabase:', err);
  }
}

/**
 * Sync vehicle types to Supabase
 */
export async function syncVehicleTypeToSupabase(type: VehicleType) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from('vehicle_types').upsert({
      id: type.id,
      name: type.name,
      icon: type.icon,
      description: type.description,
      color: type.color,
      rates: type.rates,
    }, { onConflict: 'id' });
  } catch (err) {
    console.error('Failed to sync vehicle type to Supabase:', err);
  }
}

/**
 * Bulk upload/sync all local customers, vehicles, types, and settings to Supabase
 */
export async function pushAllLocalDataToSupabase(params: {
  vehicleTypes: VehicleType[];
  vehicles: Vehicle[];
  customers: Customer[];
  activeRentals: RentalRecord[];
  completedRentals: RentalRecord[];
  settings: AppSettings;
}): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase credentials not configured yet.' };
  }

  try {
    // 1. Vehicle Types
    if (params.vehicleTypes.length > 0) {
      const { data: existingTypes } = await supabase.from('vehicle_types').select('id, name');
      const existingTypeMap = new Map((existingTypes || []).map(t => [t.id, t]));

      for (const t of params.vehicleTypes) {
        const payload = {
          id: t.id,
          name: t.name,
          icon: t.icon,
          description: t.description || '',
          color: t.color || 'emerald',
          rates: t.rates,
        };
        if (existingTypeMap.has(t.id)) {
          const { error } = await supabase.from('vehicle_types').update(payload).eq('id', t.id);
          if (error) throw new Error(`vehicle_types error: ${error.message}`);
        } else {
          const { error } = await supabase.from('vehicle_types').insert(payload);
          if (error) throw new Error(`vehicle_types error: ${error.message}`);
        }
      }
    }

    // 2. Vehicles (Match by serial_number to prevent duplicate key constraint violations)
    if (params.vehicles.length > 0) {
      const { data: existingVehicles } = await supabase.from('vehicles').select('id, serial_number');
      const existingVehMap = new Map((existingVehicles || []).map(v => [v.serial_number, v.id]));

      for (const v of params.vehicles) {
        const existingId = existingVehMap.get(v.serialNumber);
        const payload = {
          id: existingId || v.id,
          serial_number: v.serialNumber,
          type_id: v.typeId,
          model_name: v.modelName || '',
          status: v.status || 'available',
          notes: v.notes || null,
          last_rented_at: v.lastRentedAt || null,
          total_rentals_count: v.totalRentalsCount || 0,
        };

        if (existingId) {
          const { error } = await supabase.from('vehicles').update(payload).eq('serial_number', v.serialNumber);
          if (error) throw new Error(`vehicles error: ${error.message}`);
        } else {
          const { error } = await supabase.from('vehicles').insert(payload);
          if (error) throw new Error(`vehicles error: ${error.message}`);
        }
      }
    }

    // 3. Customers (Match by nic_passport to prevent duplicate key constraint violations)
    if (params.customers.length > 0) {
      const { data: existingCusts } = await supabase.from('customers').select('id, nic_passport');
      const existingCustMap = new Map((existingCusts || []).map(c => [c.nic_passport, c.id]));

      for (const c of params.customers) {
        const existingId = existingCustMap.get(c.nicPassport);
        const payload = {
          id: existingId || c.id,
          nic_passport: c.nicPassport,
          name: c.name,
          phone: c.phone || '',
          notes: c.notes || null,
          total_rentals_count: c.totalRentalsCount || 1,
          last_rental_date: c.lastRentalDate || null,
          created_at: c.createdAt || Date.now(),
        };

        if (existingId) {
          const { error } = await supabase.from('customers').update(payload).eq('nic_passport', c.nicPassport);
          if (error) throw new Error(`customers error: ${error.message}`);
        } else {
          const { error } = await supabase.from('customers').insert(payload);
          if (error) throw new Error(`customers error: ${error.message}`);
        }
      }
    }

    // 4. Rentals (Match by rental_number to prevent duplicate key constraint violations)
    const allRentals = [...params.activeRentals, ...params.completedRentals];
    if (allRentals.length > 0) {
      const { data: existingRentals } = await supabase.from('rentals').select('id, rental_number');
      const existingRentalMap = new Map((existingRentals || []).map(r => [r.rental_number, r.id]));

      for (const r of allRentals) {
        const existingId = existingRentalMap.get(r.rentalNumber);
        const payload = {
          id: existingId || r.id,
          rental_number: r.rentalNumber,
          vehicle_id: r.vehicleId,
          vehicle_serial_number: r.vehicleSerialNumber,
          vehicle_type_id: r.vehicleTypeId,
          vehicle_type_name: r.vehicleTypeName,
          vehicle_icon: r.vehicleIcon,
          customer_name: r.customerName || '',
          customer_phone: r.customerPhone || '',
          customer_nic_passport: r.customerNicPassport || '',
          customer_notes: r.customerNotes || null,
          deposit_amount: r.depositAmount || 0,
          start_time: r.startTime,
          end_time: r.endTime || null,
          status: r.status,
          rate_snapshot: r.rateSnapshot,
          breakdown: r.breakdown || null,
          total_amount: r.totalAmount || 0,
          cashier_name: r.cashierName || 'Counter',
          payment_method: r.paymentMethod || null,
          amount_received: r.amountReceived || null,
          change_amount: r.changeAmount || null,
          completed_at: r.completedAt || null,
        };

        if (existingId) {
          const { error } = await supabase.from('rentals').update(payload).eq('rental_number', r.rentalNumber);
          if (error) throw new Error(`rentals error: ${error.message}`);
        } else {
          const { error } = await supabase.from('rentals').insert(payload);
          if (error) throw new Error(`rentals error: ${error.message}`);
        }
      }
    }

    // 5. App Settings
    if (params.settings) {
      const { error: setErr } = await supabase.from('app_settings').upsert({
        id: 'global_config',
        business_name: params.settings.businessName,
        business_phone: params.settings.businessPhone,
        business_address: params.settings.businessAddress,
        receipt_footer: params.settings.receiptFooter,
        currency_symbol: params.settings.currencySymbol,
        currency_position: params.settings.currencyPosition,
        cashier_name: params.settings.cashierName,
        sound_enabled: params.settings.soundEnabled,
        rental_number_prefix: params.settings.rentalNumberPrefix,
      });
      if (setErr) throw new Error(`app_settings error: ${setErr.message}`);
    }

    return { 
      success: true, 
      message: `Successfully synced ${params.customers.length} customer(s), ${params.vehicles.length} vehicle(s), and ${allRentals.length} rental(s) to Supabase!` 
    };
  } catch (err: any) {
    console.error('Supabase bulk sync error:', err);
    return { success: false, message: err.message || 'Error syncing data to Supabase' };
  }
}

/**
 * Setup Realtime Subscription to live changes from Supabase
 */
export function subscribeToSupabaseRealtime(onDataChanged: () => void) {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      () => {
        onDataChanged();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

