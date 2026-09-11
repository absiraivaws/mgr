import { getSupabase } from './supabase';
import { AppSettings, Customer, CustomerGroup, CustomerStatus, MessageHistoryEntry, MessageTemplate, RentalRecord, Vehicle, VehicleType } from '../types';
import { RoleDefinition, UserAccount } from '../utils/auth';

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
  userAccounts?: UserAccount[];
  roles?: RoleDefinition[];
  customerGroups?: CustomerGroup[];
  messageTemplates?: MessageTemplate[];
} | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const [typesRes, vehiclesRes, customersRes, rentalsRes, settingsRes, usersRes, rolesRes, groupsRes, incomeRes, templatesRes] = await Promise.all([
      supabase.from('vehicle_types').select('*'),
      supabase.from('vehicles').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('rentals').select('*').order('start_time', { ascending: false }),
      supabase.from('app_settings').select('*').limit(1),
      supabase.from('user_accounts').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('customer_groups').select('*'),
      supabase.from('income_expenses').select('*').order('date', { ascending: false }),
      supabase.from('message_templates').select('*').order('created_at', { ascending: true }),
    ]);

    if (rentalsRes.error) {
      console.error('Error fetching rentals from Supabase:', rentalsRes.error);
    }

    const result: {
      vehicleTypes?: VehicleType[];
      vehicles?: Vehicle[];
      customers?: Customer[];
      activeRentals?: RentalRecord[];
      completedRentals?: RentalRecord[];
      settings?: AppSettings;
      userAccounts?: UserAccount[];
      roles?: RoleDefinition[];
      customerGroups?: CustomerGroup[];
      incomeEntries?: import('../types').IncomeEntry[];
      messageTemplates?: MessageTemplate[];
    } = {};

    if (typesRes.data && typesRes.data.length > 0) {
      result.vehicleTypes = typesRes.data.map((row) => ({
        id: row.id,
        name: row.name,
        icon: row.icon,
        description: row.description,
        color: row.color,
        rates: row.rates,
        rentalStartMethod: row.rental_start_method || 'both',
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

    if (customersRes.data) {
      result.customers = customersRes.data.map((row) => ({
        id: row.id,
        nicPassport: row.nic_passport,
        name: row.name,
        fullName: row.full_name || row.name,
        phone: row.phone || '',
        whatsappNumber: row.whatsapp_number || row.phone || '',
        address: row.address || '',
        dob: row.dob || '',
        status: (row.status as CustomerStatus) || 'active',
        statusRemark: row.status_remark || undefined,
        groups: Array.isArray(row.groups) ? row.groups : [],
        notes: row.notes || '',
        totalRentalsCount: row.total_rentals_count ?? 0,
        lastRentalDate: row.last_rental_date ? Number(row.last_rental_date) : undefined,
        createdAt: row.created_at ? Number(row.created_at) : undefined,
      }));
    }

    if (rentalsRes.data) {
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

      // Sort completed rentals newest first
      completed.sort((a, b) => (b.completedAt || b.endTime || b.startTime) - (a.completedAt || a.endTime || a.startTime));
      active.sort((a, b) => b.startTime - a.startTime);

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
        autoLogoutMinutes: row.auto_logout_minutes ?? 15,
      };
    }

    if (usersRes.data && usersRes.data.length > 0) {
      result.userAccounts = usersRes.data.map((row) => ({
        id: row.id,
        auth_user_id: row.auth_user_id || undefined,
        name: row.name,
        email: row.email,
        phone: row.phone || undefined,
        role: row.role,
        status: row.status || 'active',
        must_change_password: row.must_change_password ?? false,
        createdAt: row.created_at ? Number(row.created_at) : Date.now(),
      }));
    }

    if (incomeRes && incomeRes.data && incomeRes.data.length > 0) {
      result.incomeEntries = incomeRes.data.map((row: any) => ({
        id: row.id,
        date: row.date,
        description: row.description,
        type: row.type,
        amount: Number(row.amount || 0),
        category: row.category || 'Other',
        who: row.who || 'Staff',
        createdAt: row.created_at ? Number(row.created_at) : Date.now(),
        cashierName: row.cashier_name || '',
        reference: row.reference || undefined,
        paymentMethod: row.payment_method || undefined,
        remarks: row.remarks || undefined,
        enteredBy: row.who || row.cashier_name || 'Staff',
      }));
    }

    if (rolesRes.data && rolesRes.data.length > 0) {
      result.roles = rolesRes.data.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        color: row.color || 'teal',
        isSystem: row.is_system ?? false,
        permissions: row.permissions,
      }));
    }

    if (groupsRes && groupsRes.data && groupsRes.data.length > 0) {
      result.customerGroups = groupsRes.data.map((row: any) => ({
        id: row.id,
        name: row.name,
        color: row.color || 'emerald',
        description: row.description || '',
        isActive: row.is_active ?? true,
        createdAt: row.created_at ? Number(row.created_at) : Date.now(),
      }));
    }

    if (templatesRes && templatesRes.data && templatesRes.data.length > 0) {
      result.messageTemplates = templatesRes.data.map((row: any) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        content: row.content,
        createdAt: row.created_at ? Number(row.created_at) : Date.now(),
      }));
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
 * Delete a rental record from Supabase
 */
export async function deleteRentalFromSupabase(id: string, rentalNumber?: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    if (rentalNumber) {
      await supabase.from('rentals').delete().eq('rental_number', rentalNumber);
    } else {
      await supabase.from('rentals').delete().eq('id', id);
    }
  } catch (err) {
    console.error('Failed to delete rental from Supabase:', err);
  }
}

/**
 * Sync customer profile to Supabase
 */
export async function syncCustomerToSupabase(customer: Customer) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const trimmedNic = (customer.nicPassport || '').trim();
    const payload = {
      nic_passport: trimmedNic,
      name: (customer.name || customer.fullName || 'Customer').trim(),
      full_name: (customer.fullName || customer.name || 'Customer').trim(),
      phone: (customer.phone || '').trim(),
      whatsapp_number: (customer.whatsappNumber || customer.phone || '').trim(),
      address: (customer.address || '').trim(),
      dob: (customer.dob || '').trim(),
      status: customer.status || 'active',
      status_remark: customer.statusRemark ? customer.statusRemark.trim() : null,
      groups: customer.groups || [],
      notes: customer.notes ? customer.notes.trim() : null,
      total_rentals_count: customer.totalRentalsCount ?? 0,
      last_rental_date: customer.lastRentalDate || null,
      created_at: customer.createdAt || Date.now(),
    };

    // 1. Check if row exists by customer ID
    if (customer.id) {
      const { data: byId } = await supabase.from('customers').select('id, nic_passport').eq('id', customer.id).maybeSingle();
      if (byId) {
        const { error } = await supabase.from('customers').update(payload).eq('id', customer.id);
        if (!error) return;
        console.warn('Could not update customer by ID, checking by NIC fallback:', error.message);
      }
    }

    // 2. Check if row exists by nic_passport
    if (trimmedNic) {
      const { data: byNic } = await supabase.from('customers').select('id').eq('nic_passport', trimmedNic).maybeSingle();
      if (byNic) {
        const { error } = await supabase.from('customers').update(payload).eq('nic_passport', trimmedNic);
        if (error) console.error('Error updating customer by NIC:', error);
        return;
      }
    }

    // 3. Otherwise insert fresh row
    const { error } = await supabase.from('customers').insert({ id: customer.id, ...payload });
    if (error) console.error('Error inserting customer:', error);
  } catch (err) {
    console.error('Failed to sync customer to Supabase:', err);
  }
}

/**
 * Delete a customer from Supabase
 */
export async function deleteCustomerFromSupabase(customerId: string, nicPassport?: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    if (customerId) {
      const { error: errId } = await supabase.from('customers').delete().eq('id', customerId);
      if (errId) console.error('Error deleting customer by id:', errId);
    }
    const trimmedNic = (nicPassport || '').trim();
    if (trimmedNic) {
      const { error: errNic } = await supabase.from('customers').delete().eq('nic_passport', trimmedNic);
      if (errNic) console.error('Error deleting customer by nic:', errNic);
    }
  } catch (err) {
    console.error('Failed to delete customer from Supabase:', err);
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
      rental_start_method: type.rentalStartMethod || 'both',
    }, { onConflict: 'id' });
  } catch (err) {
    console.error('Failed to sync vehicle type to Supabase:', err);
  }
}

/**
 * Delete vehicle type from Supabase
 */
export async function deleteVehicleTypeFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from('vehicle_types').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete vehicle type from Supabase:', err);
  }
}

/**
 * Delete a vehicle from Supabase
 */
export async function deleteVehicleFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from('vehicles').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete vehicle from Supabase:', err);
  }
}

/**
 * Sync App Settings (Business name, phone, address, receipt, currency) to Supabase
 */
export async function syncSettingsToSupabase(settings: AppSettings) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const payload = {
      id: 'global_config',
      business_name: settings.businessName || '',
      business_phone: settings.businessPhone || '',
      business_address: settings.businessAddress || '',
      receipt_footer: settings.receiptFooter || '',
      currency_symbol: settings.currencySymbol || 'LKR',
      currency_position: settings.currencyPosition || 'prefix',
      cashier_name: settings.cashierName || '',
      sound_enabled: settings.soundEnabled ?? true,
      rental_number_prefix: settings.rentalNumberPrefix || 'CYC',
      auto_logout_minutes: settings.autoLogoutMinutes ?? 15,
    };

    const { error } = await supabase.from('app_settings').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Failed to upsert app_settings to Supabase:', error);
    }
  } catch (err) {
    console.error('Failed to sync app settings to Supabase:', err);
  }
}

/**
 * Sync a user account to Supabase
 */
export async function syncUserAccountToSupabase(user: UserAccount): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: true };

  try {
    const { error } = await supabase.from('user_accounts').upsert({
      id: user.id,
      auth_user_id: user.auth_user_id || null,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      status: user.status || 'active',
      must_change_password: Boolean(user.must_change_password),
      created_at: user.createdAt || Date.now(),
    }, { onConflict: 'id' });

    if (error) {
      console.error('Failed to sync user to Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync user to Supabase:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Batch sync all users to Supabase
 */
export async function syncAllUsersToSupabase(users: UserAccount[]): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase || users.length === 0) return { success: true };

  try {
    const payload = users.map((u) => ({
      id: u.id,
      auth_user_id: u.auth_user_id || null,
      name: u.name,
      email: u.email,
      phone: u.phone || null,
      role: u.role,
      status: u.status || 'active',
      must_change_password: Boolean(u.must_change_password),
      created_at: u.createdAt || Date.now(),
    }));

    const { error } = await supabase.from('user_accounts').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Failed to batch sync users to Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to batch sync users to Supabase:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Delete a user account from Supabase
 */
export async function deleteUserAccountFromSupabase(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: true };

  try {
    const { error } = await supabase.from('user_accounts').delete().eq('id', userId);
    if (error) {
      console.error('Failed to delete user from Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete user from Supabase:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Fetch all role definitions from Supabase
 */
export async function fetchRolesFromSupabase(): Promise<RoleDefinition[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from('user_roles').select('*');
    if (error || !data) return null;

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      color: row.color || 'teal',
      isSystem: row.is_system ?? false,
      permissions: row.permissions,
    }));
  } catch (err) {
    console.warn('Failed to fetch roles from Supabase:', err);
    return null;
  }
}

/**
 * Sync role definition to Supabase
 */
export async function syncRoleToSupabase(role: RoleDefinition): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: true };

  try {
    const { error } = await supabase.from('user_roles').upsert({
      id: role.id,
      name: role.name,
      description: role.description || '',
      color: role.color || 'teal',
      is_system: role.isSystem ?? false,
      permissions: role.permissions,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Failed to sync role to Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync role to Supabase:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Batch sync all roles to Supabase
 */
export async function syncAllRolesToSupabase(roles: RoleDefinition[]): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase || roles.length === 0) return { success: true };

  try {
    const payload = roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      color: r.color || 'teal',
      is_system: r.isSystem ?? false,
      permissions: r.permissions,
    }));

    const { error } = await supabase.from('user_roles').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Failed to batch sync roles to Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to batch sync roles to Supabase:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Delete custom role from Supabase
 */
export async function deleteRoleFromSupabase(roleId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: true };

  try {
    const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
    if (error) {
      console.error('Failed to delete role from Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete role from Supabase:', err);
    return { success: false, error: err?.message || 'Database error' };
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
          name: c.name || c.fullName || 'Customer',
          full_name: c.fullName || c.name || 'Customer',
          phone: c.phone || '',
          whatsapp_number: c.whatsappNumber || c.phone || '',
          address: c.address || '',
          dob: c.dob || '',
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

/**
 * Fetch all income/expense entries from Supabase
 */
export async function fetchIncomeEntries(): Promise<import('../types').IncomeEntry[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('income_expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error || !data) return null;

    return data.map((row) => ({
      id: row.id,
      date: row.date,
      description: row.description,
      type: row.type as 'income' | 'expense',
      amount: Number(row.amount),
      category: row.category || 'Other',
      who: (row.who && row.who !== 'Mark') ? row.who : (row.cashier_name || 'Staff'),
      createdAt: row.created_at ? Number(row.created_at) : Date.now(),
      cashierName: row.cashier_name || '',
    }));
  } catch (err) {
    console.warn('Failed to fetch income entries:', err);
    return null;
  }
}

/**
 * Upsert a single income/expense entry to Supabase
 */
export async function syncIncomeEntryToSupabase(entry: import('../types').IncomeEntry) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const payload = {
      id: entry.id,
      date: entry.date,
      description: entry.description,
      type: entry.type,
      amount: entry.amount,
      category: entry.category || 'Other',
      who: entry.who || entry.enteredBy || 'Staff',
      created_at: entry.createdAt,
      cashier_name: entry.cashierName || '',
      reference: entry.reference || null,
      payment_method: entry.paymentMethod || null,
      remarks: entry.remarks || null,
    };

    await supabase.from('income_expenses').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.error('Failed to sync income entry to Supabase:', err);
  }
}

/**
 * Delete an income/expense entry from Supabase
 */
export async function deleteIncomeEntryFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from('income_expenses').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete income entry from Supabase:', err);
  }
}


/**
 * Fetch all message templates from Supabase
 */
export async function fetchMessageTemplatesFromSupabase(): Promise<import('../types').MessageTemplate[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Failed to fetch message_templates from Supabase:', error);
      return null;
    }

    if (data) {
      return data.map((row) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        content: row.content,
        createdAt: row.created_at ? Number(row.created_at) : undefined,
      }));
    }
    return [];
  } catch (err) {
    console.warn('Error fetching message templates:', err);
    return null;
  }
}

/**
 * Sync a single message template to Supabase
 */
export async function syncMessageTemplateToSupabase(template: import('../types').MessageTemplate): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: true };

  try {
    const payload = {
      id: template.id,
      title: template.title,
      category: template.category,
      content: template.content,
      created_at: template.createdAt || Date.now(),
    };

    const { error } = await supabase.from('message_templates').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Failed to sync message template to Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync message template to Supabase:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Delete a message template from Supabase
 */
export async function deleteMessageTemplateFromSupabase(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: true };

  try {
    const { error } = await supabase.from('message_templates').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete message template from Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete message template from Supabase:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Sync all message templates to Supabase
 */
export async function syncAllMessageTemplatesToSupabase(templates: import('../types').MessageTemplate[]): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase || templates.length === 0) return { success: true };

  try {
    const payload = templates.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      content: t.content,
      created_at: t.createdAt || Date.now(),
    }));

    const { error } = await supabase.from('message_templates').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Failed to batch sync message templates to Supabase:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to batch sync message templates to Supabase:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Customer Groups sync functions
 */
export async function fetchCustomerGroupsFromSupabase(): Promise<CustomerGroup[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from('customer_groups').select('*').order('name');
    if (error || !data) return null;

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color || 'emerald',
      description: row.description || '',
      isActive: row.is_active ?? true,
      createdAt: row.created_at ? Number(row.created_at) : Date.now(),
    }));
  } catch (err) {
    console.warn('Failed to fetch customer groups from Supabase:', err);
    return null;
  }
}

export async function syncCustomerGroupToSupabase(group: CustomerGroup) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const payload = {
      id: group.id,
      name: group.name,
      color: group.color,
      description: group.description || null,
      is_active: group.isActive,
      created_at: group.createdAt || Date.now(),
    };

    await supabase.from('customer_groups').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.error('Failed to sync customer group to Supabase:', err);
  }
}

export async function deleteCustomerGroupFromSupabase(id: string) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from('customer_groups').delete().eq('id', id);
  } catch (err) {
    console.error('Failed to delete customer group from Supabase:', err);
  }
}

/**
 * Message History sync functions
 */
export async function fetchMessageHistoryFromSupabase(): Promise<MessageHistoryEntry[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from('message_history').select('*').order('sent_at', { ascending: false }).limit(200);
    if (error || !data) return null;

    return data.map((row) => ({
      id: row.id,
      customerId: row.customer_id || '',
      customerName: row.customer_name,
      mobileNumber: row.mobile_number,
      messageTemplateId: row.message_template_id || undefined,
      templateTitle: row.template_title || undefined,
      actualMessage: row.actual_message,
      messageType: row.message_type as any,
      sentAt: Number(row.sent_at),
      sentBy: row.sent_by,
      campaignName: row.campaign_name || undefined,
      status: row.status as any,
      deliveryStatus: row.delivery_status || undefined,
      failureReason: row.failure_reason || undefined,
    }));
  } catch (err) {
    console.warn('Failed to fetch message history from Supabase:', err);
    return null;
  }
}

export async function syncMessageHistoryEntryToSupabase(entry: MessageHistoryEntry) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const payload = {
      id: entry.id,
      customer_id: entry.customerId || null,
      customer_name: entry.customerName,
      mobile_number: entry.mobileNumber,
      message_template_id: entry.messageTemplateId || null,
      template_title: entry.templateTitle || null,
      actual_message: entry.actualMessage,
      message_type: entry.messageType,
      sent_at: entry.sentAt,
      sent_by: entry.sentBy,
      campaign_name: entry.campaignName || null,
      status: entry.status,
      delivery_status: entry.deliveryStatus || null,
      failure_reason: entry.failureReason || null,
    };

    await supabase.from('message_history').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.error('Failed to sync message history entry to Supabase:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// MGR TRANSPORT MARKETPLACE SYNC & FETCH FUNCTIONS
// ─────────────────────────────────────────────────────────────

import type {
  TransportOwner,
  TransportVehicle,
  TransportDriver,
  TransportRoute,
  TransportSchedule,
  TransportBooking,
  MarketplaceSettings
} from '../types/mgrBooking';

export async function fetchMGRTransportData(): Promise<{
  owners?: TransportOwner[];
  vehicles?: TransportVehicle[];
  drivers?: TransportDriver[];
  routes?: TransportRoute[];
  schedules?: TransportSchedule[];
  bookings?: TransportBooking[];
  settings?: MarketplaceSettings;
} | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const [ownersRes, vehiclesRes, driversRes, routesRes, schedRes, bookingsRes, settingsRes] = await Promise.all([
      supabase.from('transport_owners').select('*'),
      supabase.from('transport_vehicles').select('*'),
      supabase.from('transport_drivers').select('*'),
      supabase.from('transport_routes').select('*'),
      supabase.from('transport_schedules').select('*'),
      supabase.from('transport_bookings').select('*').order('created_at', { ascending: false }),
      supabase.from('marketplace_settings').select('*').limit(1),
    ]);

    const result: {
      owners?: TransportOwner[];
      vehicles?: TransportVehicle[];
      drivers?: TransportDriver[];
      routes?: TransportRoute[];
      schedules?: TransportSchedule[];
      bookings?: TransportBooking[];
      settings?: MarketplaceSettings;
    } = {};

    if (ownersRes.data && ownersRes.data.length > 0) {
      result.owners = ownersRes.data.map((r: any) => ({
        id: r.id,
        fullName: r.full_name,
        nicPassport: r.nic_passport,
        address: r.address,
        mobileNumber: r.mobile_number,
        whatsappNumber: r.whatsapp_number,
        email: r.email,
        businessName: r.business_name || undefined,
        businessRegNumber: r.business_reg_number || undefined,
        bankAccountDetails: r.bank_account_details || undefined,
        status: r.status,
        profilePhoto: r.profile_photo || undefined,
        rating: r.rating ? Number(r.rating) : 5.0,
        createdAt: Number(r.created_at || Date.now()),
      }));
    }

    if (vehiclesRes.data && vehiclesRes.data.length > 0) {
      result.vehicles = vehiclesRes.data.map((r: any) => ({
        id: r.id,
        ownerId: r.owner_id,
        type: r.type,
        registrationNumber: r.registration_number,
        make: r.make,
        model: r.model,
        year: Number(r.year),
        fuelType: r.fuel_type || 'diesel',
        color: r.color,
        hasAC: Boolean(r.has_ac),
        totalSeats: Number(r.total_seats),
        luggageCapacity: r.luggage_capacity || undefined,
        driverOption: r.driver_option || 'with_driver',
        description: r.description || '',
        photos: Array.isArray(r.photos) ? r.photos : [],
        insuranceExpiry: r.insurance_expiry,
        revenueLicenceExpiry: r.revenue_licence_expiry,
        status: r.status,
        basePrice: Number(r.base_price || 0),
        pricingMethod: r.pricing_method || 'fixed',
        pricePerSeat: r.price_per_seat ? Number(r.price_per_seat) : undefined,
        rating: r.rating ? Number(r.rating) : 5.0,
        tripsCount: Number(r.trips_count || 0),
        createdAt: Number(r.created_at || Date.now()),
      }));
    }

    if (driversRes.data && driversRes.data.length > 0) {
      result.drivers = driversRes.data.map((r: any) => ({
        id: r.id,
        ownerId: r.owner_id,
        fullName: r.full_name,
        nic: r.nic,
        mobile: r.mobile,
        whatsapp: r.whatsapp,
        email: r.email || undefined,
        address: r.address,
        driverType: r.driver_type || 'driver',
        licenceNumber: r.licence_number,
        licenceClass: r.licence_class,
        licenceExpiry: r.licence_expiry,
        experienceYears: Number(r.experience_years || 5),
        languages: Array.isArray(r.languages) ? r.languages : ['Tamil', 'English'],
        rating: r.rating ? Number(r.rating) : 5.0,
        status: r.status,
        assignedVehicleId: r.assigned_vehicle_id || undefined,
        photoUrl: r.photo_url || undefined,
        createdAt: Number(r.created_at || Date.now()),
      }));
    }

    if (routesRes.data && routesRes.data.length > 0) {
      result.routes = routesRes.data.map((r: any) => ({
        id: r.id,
        routeCode: r.route_code,
        fromLocation: r.from_location,
        toLocation: r.to_location,
        viaLocations: Array.isArray(r.via_locations) ? r.via_locations : [],
        distanceKm: r.distance_km ? Number(r.distance_km) : undefined,
        estimatedDuration: r.estimated_duration,
        pickupPoints: Array.isArray(r.pickup_points) ? r.pickup_points : [],
        dropoffPoints: Array.isArray(r.dropoff_points) ? r.dropoff_points : [],
        suggestedVehicleTypes: Array.isArray(r.suggested_vehicle_types) ? r.suggested_vehicle_types : ['car', 'van', 'bus'],
        basePrice: Number(r.base_price || 0),
        status: r.status,
      }));
    }

    if (schedRes.data && schedRes.data.length > 0) {
      result.schedules = schedRes.data.map((r: any) => ({
        id: r.id,
        vehicleId: r.vehicle_id,
        routeId: r.route_id,
        departureTime: r.departure_time,
        daysOfWeek: Array.isArray(r.days_of_week) ? r.days_of_week : ['Daily'],
        totalSeats: Number(r.total_seats),
        availableSeats: Number(r.available_seats),
        farePerSeat: Number(r.fare_per_seat),
        wholeVehiclePrice: r.whole_vehicle_price ? Number(r.whole_vehicle_price) : undefined,
        status: r.status,
      }));
    }

    if (bookingsRes.data && bookingsRes.data.length > 0) {
      result.bookings = bookingsRes.data.map((r: any) => ({
        id: r.id,
        bookingNumber: r.booking_number,
        bookingType: r.booking_type,
        vehicleId: r.vehicle_id,
        vehicleName: r.vehicle_name,
        vehicleType: r.vehicle_type,
        vehicleRegNumber: r.vehicle_reg_number,
        routeId: r.route_id || undefined,
        routeFrom: r.route_from,
        routeTo: r.route_to,
        travelDate: r.travel_date,
        travelTime: r.travel_time,
        passengerName: r.passenger_name,
        passengerPhone: r.passenger_phone,
        passengerWhatsApp: r.passenger_whatsapp,
        passengerEmail: r.passenger_email || undefined,
        passengerNIC: r.passenger_nic || undefined,
        driverOption: r.driver_option || 'with_driver',
        selectedSeats: Array.isArray(r.selected_seats) ? r.selected_seats : [],
        seatCount: Number(r.seat_count || 1),
        totalAmount: Number(r.total_amount),
        commissionRate: r.commission_rate ? Number(r.commission_rate) : 5.0,
        mgrCommissionAmount: Number(r.mgr_commission_amount || 0),
        ownerPayoutAmount: Number(r.owner_payout_amount || 0),
        status: r.status,
        driverId: r.driver_id || undefined,
        driverName: r.driver_name || undefined,
        specialNotes: r.special_notes || undefined,
        pickupLocation: r.pickup_location || undefined,
        dropoffLocation: r.dropoff_location || undefined,
        createdAt: Number(r.created_at || Date.now()),
      }));
    }

    if (settingsRes.data && settingsRes.data.length > 0) {
      const s = settingsRes.data[0];
      result.settings = {
        commissionPercentage: Number(s.commission_percentage || 5.0),
        instantBookingEnabled: Boolean(s.instant_booking_enabled),
        allowCashOnBoard: Boolean(s.allow_cash_on_board),
        contactWhatsAppNumber: s.contact_whatsapp_number || '+94 77 987 6543',
        supportEmail: s.support_email || 'booking@mannargreenride.lk',
      };
    }

    return result;
  } catch (err) {
    console.warn('[MGR Sync] Error or tables not yet migrated in Supabase:', err);
    return null;
  }
}

export async function syncTransportVehicleToSupabase(vehicle: TransportVehicle) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const payload = {
      id: vehicle.id,
      owner_id: vehicle.ownerId,
      type: vehicle.type,
      registration_number: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      fuel_type: vehicle.fuelType || 'diesel',
      color: vehicle.color,
      has_ac: vehicle.hasAC,
      total_seats: vehicle.totalSeats,
      luggage_capacity: vehicle.luggageCapacity || null,
      driver_option: vehicle.driverOption,
      description: vehicle.description || null,
      photos: vehicle.photos || [],
      insurance_expiry: vehicle.insuranceExpiry,
      revenue_licence_expiry: vehicle.revenueLicenceExpiry,
      status: vehicle.status,
      base_price: vehicle.basePrice || 0,
      pricing_method: vehicle.pricingMethod || 'fixed',
      price_per_seat: vehicle.pricePerSeat || null,
      rating: vehicle.rating || 5.0,
      trips_count: vehicle.tripsCount || 0,
      created_at: vehicle.createdAt || Date.now(),
    };

    await supabase.from('transport_vehicles').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[MGR Sync] Failed to sync transport vehicle to Supabase:', err);
  }
}

export async function deleteTransportVehicleFromSupabase(vehicleId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('transport_vehicles').delete().eq('id', vehicleId);
  } catch (err) {
    console.warn('[MGR Sync] Failed to delete transport vehicle from Supabase:', err);
  }
}

export async function syncTransportOwnerToSupabase(owner: TransportOwner) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const payload = {
      id: owner.id,
      full_name: owner.fullName,
      nic_passport: owner.nicPassport,
      address: owner.address,
      mobile_number: owner.mobileNumber,
      whatsapp_number: owner.whatsappNumber,
      email: owner.email,
      business_name: owner.businessName || null,
      business_reg_number: owner.businessRegNumber || null,
      bank_account_details: owner.bankAccountDetails || null,
      status: owner.status,
      profile_photo: owner.profilePhoto || null,
      rating: owner.rating || 5.0,
      created_at: owner.createdAt || Date.now(),
    };
    await supabase.from('transport_owners').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[MGR Sync] Failed to sync transport owner to Supabase:', err);
  }
}

export async function deleteTransportOwnerFromSupabase(ownerId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('transport_owners').delete().eq('id', ownerId);
  } catch (err) {
    console.warn('[MGR Sync] Failed to delete transport owner from Supabase:', err);
  }
}

export async function syncTransportDriverToSupabase(driver: TransportDriver) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const payload = {
      id: driver.id,
      owner_id: driver.ownerId,
      full_name: driver.fullName,
      nic: driver.nic,
      mobile: driver.mobile,
      whatsapp: driver.whatsapp,
      email: driver.email || null,
      address: driver.address,
      driver_type: driver.driverType || 'driver',
      licence_number: driver.licenceNumber,
      licence_class: driver.licenceClass,
      licence_expiry: driver.licenceExpiry,
      experience_years: driver.experienceYears || 5,
      languages: driver.languages || ['Tamil', 'English'],
      rating: driver.rating || 5.0,
      status: driver.status,
      assigned_vehicle_id: driver.assignedVehicleId || null,
      photo_url: driver.photoUrl || null,
      created_at: driver.createdAt || Date.now(),
    };
    await supabase.from('transport_drivers').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[MGR Sync] Failed to sync transport driver to Supabase:', err);
  }
}

export async function deleteTransportDriverFromSupabase(driverId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('transport_drivers').delete().eq('id', driverId);
  } catch (err) {
    console.warn('[MGR Sync] Failed to delete transport driver from Supabase:', err);
  }
}

export async function syncTransportRouteToSupabase(route: TransportRoute) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const payload = {
      id: route.id,
      route_code: route.routeCode,
      from_location: route.fromLocation,
      to_location: route.toLocation,
      via_locations: route.viaLocations || [],
      distance_km: route.distanceKm || null,
      estimated_duration: route.estimatedDuration,
      pickup_points: route.pickupPoints || [],
      dropoff_points: route.dropoffPoints || [],
      suggested_vehicle_types: route.suggestedVehicleTypes || ['car', 'van', 'bus'],
      base_price: route.basePrice || 0,
      status: route.status,
    };
    await supabase.from('transport_routes').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[MGR Sync] Failed to sync transport route to Supabase:', err);
  }
}

export async function deleteTransportRouteFromSupabase(routeId: string) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.from('transport_routes').delete().eq('id', routeId);
  } catch (err) {
    console.warn('[MGR Sync] Failed to delete transport route from Supabase:', err);
  }
}

export async function syncTransportBookingToSupabase(booking: TransportBooking) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const payload = {
      id: booking.id,
      booking_number: booking.bookingNumber,
      booking_type: booking.bookingType,
      vehicle_id: booking.vehicleId,
      vehicle_name: booking.vehicleName,
      vehicle_type: booking.vehicleType,
      vehicle_reg_number: booking.vehicleRegNumber,
      route_id: booking.routeId || null,
      route_from: booking.routeFrom,
      route_to: booking.routeTo,
      travel_date: booking.travelDate,
      travel_time: booking.travelTime,
      passenger_name: booking.passengerName,
      passenger_phone: booking.passengerPhone,
      passenger_whatsapp: booking.passengerWhatsApp,
      passenger_email: booking.passengerEmail || null,
      passenger_nic: booking.passengerNic || (booking as any).passengerNIC || null,
      driver_option: booking.driverOption,
      selected_seats: booking.selectedSeats || [],
      seat_count: booking.seatCount || 1,
      total_amount: booking.totalAmount,
      commission_rate: booking.commissionRate || 5.0,
      mgr_commission_amount: booking.mgrCommissionAmount || 0,
      owner_payout_amount: booking.ownerPayoutAmount || 0,
      status: booking.status,
      driver_id: booking.driverId || null,
      driver_name: booking.driverName || null,
      special_notes: booking.specialNotes || null,
      pickup_location: booking.pickupLocation || null,
      dropoff_location: booking.dropoffLocation || null,
      created_at: booking.createdAt || Date.now(),
    };
    await supabase.from('transport_bookings').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[MGR Sync] Failed to sync transport booking to Supabase:', err);
  }
}

export async function syncMarketplaceSettingsToSupabase(settings: MarketplaceSettings) {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const payload = {
      id: 'mgr_marketplace_config',
      commission_percentage: settings.commissionPercentage || 5.0,
      instant_booking_enabled: settings.instantBookingEnabled ?? true,
      allow_cash_on_board: settings.allowCashOnBoard ?? true,
      contact_whatsapp_number: settings.contactWhatsAppNumber || '+94 77 987 6543',
      support_email: settings.supportEmail || 'booking@mannargreenride.lk',
    };
    await supabase.from('marketplace_settings').upsert(payload, { onConflict: 'id' });
  } catch (err) {
    console.warn('[MGR Sync] Failed to sync marketplace settings to Supabase:', err);
  }
}

