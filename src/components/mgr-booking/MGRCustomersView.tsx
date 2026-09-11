/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  Phone,
  MessageSquare,
  Shield,
  ShieldCheck,
  IdCard,
  Building2,
  CreditCard,
  MapPin,
  Calendar,
  Car,
  Ship,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  Copy,
  Check,
} from 'lucide-react';
import { Customer, CustomerStatus } from '../../types';
import { TransportOwner, TransportDriver, TransportVehicle, VerificationStatus } from '../../types/mgrBooking';
import { UserAccount } from '../../utils/auth';
import {
  formatCustomerCode,
  formatOwnerCode,
  formatDriverCode,
} from '../../utils/mgrUniqueId';

export type DirectoryRoleType = 'all' | 'customer' | 'owner' | 'driver';

export interface UnifiedPersonRecord {
  id: string;
  uniqueCode: string;
  role: 'customer' | 'owner' | 'driver';
  name: string;
  handphone: string;
  whatsapp: string;
  nicPassport: string;
  address: string;
  email?: string;
  dob?: string;
  status: string;
  statusRemark?: string;
  businessName?: string;
  businessRegNo?: string;
  bankDetails?: string;
  driverType?: 'driver' | 'captain';
  licenceNumber?: string;
  licenceClass?: string;
  licenceExpiry?: string;
  assignedVehicleId?: string;
  notes?: string;
  createdAt?: number;
  rawCustomer?: Customer;
  rawOwner?: TransportOwner;
  rawDriver?: TransportDriver;
}

interface MGRCustomersViewProps {
  customers: Customer[];
  owners: TransportOwner[];
  drivers: TransportDriver[];
  vehicles?: TransportVehicle[];
  currentUser?: UserAccount;
  isAdmin?: boolean;
  onAddCustomer: (newCustomer: Customer) => void;
  onEditCustomer: (updated: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onAddOwner: (newOwner: TransportOwner) => void;
  onEditOwner: (updated: TransportOwner) => void;
  onDeleteOwner: (id: string) => void;
  onAddDriver: (newDriver: TransportDriver) => void;
  onEditDriver: (updated: TransportDriver) => void;
  onDeleteDriver: (id: string) => void;
  themeMode?: 'dark' | 'light';
}

export const MGRCustomersView: React.FC<MGRCustomersViewProps> = ({
  customers,
  owners,
  drivers,
  vehicles = [],
  currentUser,
  isAdmin = false,
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onAddOwner,
  onEditOwner,
  onDeleteOwner,
  onAddDriver,
  onEditDriver,
  onDeleteDriver,
}) => {
  // Search & Role Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<DirectoryRoleType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination (Max 20 rows per page)
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // View & Edit Modals State
  const [viewingRecord, setViewingRecord] = useState<UnifiedPersonRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<UnifiedPersonRecord | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [addingRole, setAddingRole] = useState<'customer' | 'owner' | 'driver'>('customer');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State for Adding New Person
  const [formRole, setFormRole] = useState<'customer' | 'owner' | 'driver'>('customer');
  const [formName, setFormName] = useState('');
  const [formHandphone, setFormHandphone] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [isWhatsappManuallyEdited, setIsWhatsappManuallyEdited] = useState(false);
  const [formNic, setFormNic] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState('active');

  // Owner specifics
  const [formBusinessName, setFormBusinessName] = useState('');
  const [formBusinessRegNo, setFormBusinessRegNo] = useState('');
  const [formBankDetails, setFormBankDetails] = useState('');

  // Driver specifics
  const [formDriverType, setFormDriverType] = useState<'driver' | 'captain'>('driver');
  const [formLicenceNumber, setFormLicenceNumber] = useState('');
  const [formLicenceClass, setFormLicenceClass] = useState('Light & Heavy Passenger');
  const [formLicenceExpiry, setFormLicenceExpiry] = useState('2028-12-31');
  const [formAssignedVehicleId, setFormAssignedVehicleId] = useState('');

  // Delete Confirmation
  const [deletingRecord, setDeletingRecord] = useState<UnifiedPersonRecord | null>(null);

  // Build Unified Directory
  const unifiedDirectory = useMemo<UnifiedPersonRecord[]>(() => {
    const list: UnifiedPersonRecord[] = [];

    // Customers
    customers.forEach((c, idx) => {
      list.push({
        id: c.id,
        uniqueCode: formatCustomerCode(idx + 1, c.id),
        role: 'customer',
        name: c.fullName || c.name || 'Unnamed Customer',
        handphone: c.phone || '',
        whatsapp: c.whatsappNumber || c.phone || '',
        nicPassport: c.nicPassport || '',
        address: c.address || '',
        dob: c.dob,
        status: c.status || 'active',
        statusRemark: c.statusRemark,
        notes: c.notes,
        createdAt: c.createdAt || Date.now(),
        rawCustomer: c,
      });
    });

    // Owners
    owners.forEach((o, idx) => {
      list.push({
        id: o.id,
        uniqueCode: formatOwnerCode(idx + 1, o.id),
        role: 'owner',
        name: o.fullName,
        handphone: o.mobileNumber,
        whatsapp: o.whatsappNumber || o.mobileNumber,
        nicPassport: o.nicPassport,
        address: o.address,
        email: o.email,
        status: o.status,
        businessName: o.businessName,
        businessRegNo: o.businessRegNumber,
        bankDetails: o.bankAccountDetails,
        createdAt: o.createdAt || Date.now(),
        rawOwner: o,
      });
    });

    // Drivers
    drivers.forEach((d, idx) => {
      list.push({
        id: d.id,
        uniqueCode: formatDriverCode(idx + 1, d.id),
        role: 'driver',
        name: d.fullName,
        handphone: d.mobile,
        whatsapp: d.whatsapp || d.mobile,
        nicPassport: d.nic,
        address: d.address,
        email: d.email,
        status: d.status,
        driverType: d.driverType,
        licenceNumber: d.licenceNumber,
        licenceClass: d.licenceClass,
        licenceExpiry: d.licenceExpiry,
        assignedVehicleId: d.assignedVehicleId,
        createdAt: d.createdAt || Date.now(),
        rawDriver: d,
      });
    });

    return list;
  }, [customers, owners, drivers]);

  // Filter Directory
  const filteredDirectory = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return unifiedDirectory.filter(item => {
      // Role filter
      if (roleFilter !== 'all' && item.role !== roleFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && item.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // Query filter
      if (q) {
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCode = item.uniqueCode.toLowerCase().includes(q);
        const matchesPhone = item.handphone.toLowerCase().includes(q);
        const matchesWa = item.whatsapp.toLowerCase().includes(q);
        const matchesNic = item.nicPassport.toLowerCase().includes(q);
        const matchesAddr = item.address.toLowerCase().includes(q);
        const matchesRole = item.role.toLowerCase().includes(q);
        return matchesName || matchesCode || matchesPhone || matchesWa || matchesNic || matchesAddr || matchesRole;
      }
      return true;
    });
  }, [unifiedDirectory, roleFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredDirectory.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDirectory.slice(start, start + pageSize);
  }, [filteredDirectory, page, pageSize]);

  // Handphone to WhatsApp Auto-Suggest Logic
  const handleHandphoneChange = (val: string) => {
    setFormHandphone(val);
    if (!isWhatsappManuallyEdited) {
      setFormWhatsapp(val);
    }
  };

  const handleWhatsappChange = (val: string) => {
    setFormWhatsapp(val);
    setIsWhatsappManuallyEdited(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormHandphone('');
    setFormWhatsapp('');
    setIsWhatsappManuallyEdited(false);
    setFormNic('');
    setFormAddress('');
    setFormEmail('');
    setFormDob('');
    setFormNotes('');
    setFormStatus('active');
    setFormBusinessName('');
    setFormBusinessRegNo('');
    setFormBankDetails('');
    setFormDriverType('driver');
    setFormLicenceNumber('');
    setFormLicenceClass('Light & Heavy Passenger');
    setFormLicenceExpiry('2028-12-31');
    setFormAssignedVehicleId('');
  };

  const handleOpenAddModal = (role: 'customer' | 'owner' | 'driver') => {
    resetForm();
    setFormRole(role);
    setAddingRole(role);
    setIsAddingNew(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  // Submit Add
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = formHandphone.trim();
    const cleanWa = (formWhatsapp.trim() || cleanPhone);

    if (formRole === 'customer') {
      const nextIndex = customers.length + 1;
      const uniqueCode = formatCustomerCode(nextIndex);
      const newCustomer: Customer = {
        id: uniqueCode,
        name: formName.trim(),
        fullName: formName.trim(),
        phone: cleanPhone,
        whatsappNumber: cleanWa,
        nicPassport: formNic.trim(),
        address: formAddress.trim(),
        dob: formDob || undefined,
        notes: formNotes.trim() || undefined,
        status: (formStatus as CustomerStatus) || 'active',
        createdAt: Date.now(),
        totalRentalsCount: 0,
      };
      onAddCustomer(newCustomer);
    } else if (formRole === 'owner') {
      const nextIndex = owners.length + 1;
      const uniqueCode = formatOwnerCode(nextIndex);
      const newOwner: TransportOwner = {
        id: uniqueCode,
        uniqueCode,
        fullName: formName.trim(),
        nicPassport: formNic.trim(),
        mobileNumber: cleanPhone,
        whatsappNumber: cleanWa,
        email: formEmail.trim() || `${formName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
        address: formAddress.trim(),
        businessName: formBusinessName.trim() || undefined,
        businessRegNumber: formBusinessRegNo.trim() || undefined,
        bankAccountDetails: formBankDetails.trim() || undefined,
        status: (formStatus as VerificationStatus) || 'verified',
        rating: 5.0,
        createdAt: Date.now(),
      };
      onAddOwner(newOwner);
    } else if (formRole === 'driver') {
      const nextIndex = drivers.length + 1;
      const uniqueCode = formatDriverCode(nextIndex);
      const newDriver: TransportDriver = {
        id: uniqueCode,
        uniqueCode,
        ownerId: owners[0]?.id || 'MGR-OWN-0000001',
        fullName: formName.trim(),
        nic: formNic.trim(),
        mobile: cleanPhone,
        whatsapp: cleanWa,
        email: formEmail.trim() || undefined,
        address: formAddress.trim(),
        driverType: formDriverType,
        licenceNumber: formLicenceNumber.trim() || `B-${Math.floor(1000000 + Math.random() * 9000000)}`,
        licenceClass: formLicenceClass,
        licenceExpiry: formLicenceExpiry,
        status: (formStatus as VerificationStatus) || 'verified',
        assignedVehicleId: formAssignedVehicleId || undefined,
        rating: 5.0,
        createdAt: Date.now(),
      };
      onAddDriver(newDriver);
    }

    setIsAddingNew(false);
    resetForm();
  };

  // Submit Edit
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    if (editingRecord.role === 'customer') {
      const updated: Customer = {
        ...(editingRecord.rawCustomer || {
          id: editingRecord.id,
          nicPassport: editingRecord.nicPassport,
          name: editingRecord.name,
        }),
        id: editingRecord.id,
        name: editingRecord.name,
        fullName: editingRecord.name,
        phone: editingRecord.handphone,
        whatsappNumber: editingRecord.whatsapp,
        nicPassport: editingRecord.nicPassport,
        address: editingRecord.address,
        dob: editingRecord.dob,
        status: (editingRecord.status as CustomerStatus) || 'active',
        notes: editingRecord.notes,
      };
      onEditCustomer(updated);
    } else if (editingRecord.role === 'owner') {
      const updated: TransportOwner = {
        ...(editingRecord.rawOwner || {
          id: editingRecord.id,
          fullName: editingRecord.name,
          nicPassport: editingRecord.nicPassport,
          address: editingRecord.address,
          mobileNumber: editingRecord.handphone,
          whatsappNumber: editingRecord.whatsapp,
          email: editingRecord.email || '',
          status: 'verified',
          createdAt: Date.now(),
        }),
        fullName: editingRecord.name,
        mobileNumber: editingRecord.handphone,
        whatsappNumber: editingRecord.whatsapp,
        nicPassport: editingRecord.nicPassport,
        address: editingRecord.address,
        email: editingRecord.email || '',
        businessName: editingRecord.businessName,
        businessRegNumber: editingRecord.businessRegNo,
        bankAccountDetails: editingRecord.bankDetails,
        status: (editingRecord.status as VerificationStatus) || 'verified',
      };
      onEditOwner(updated);
    } else if (editingRecord.role === 'driver') {
      const updated: TransportDriver = {
        ...(editingRecord.rawDriver || {
          id: editingRecord.id,
          ownerId: owners[0]?.id || '',
          fullName: editingRecord.name,
          nic: editingRecord.nicPassport,
          mobile: editingRecord.handphone,
          whatsapp: editingRecord.whatsapp,
          address: editingRecord.address,
          driverType: 'driver',
          licenceNumber: editingRecord.licenceNumber || '',
          licenceClass: 'Light & Heavy Passenger',
          licenceExpiry: '2028-12-31',
          rating: 5.0,
          status: 'verified',
          createdAt: Date.now(),
        }),
        fullName: editingRecord.name,
        mobile: editingRecord.handphone,
        whatsapp: editingRecord.whatsapp,
        nic: editingRecord.nicPassport,
        address: editingRecord.address,
        email: editingRecord.email,
        driverType: editingRecord.driverType || 'driver',
        licenceNumber: editingRecord.licenceNumber || '',
        licenceClass: editingRecord.licenceClass || 'Light & Heavy Passenger',
        licenceExpiry: editingRecord.licenceExpiry || '2028-12-31',
        assignedVehicleId: editingRecord.assignedVehicleId,
        status: (editingRecord.status as VerificationStatus) || 'verified',
      };
      onEditDriver(updated);
    }

    setEditingRecord(null);
  };

  // Submit Delete
  const handleConfirmDelete = () => {
    if (!deletingRecord) return;
    if (deletingRecord.role === 'customer') {
      onDeleteCustomer(deletingRecord.id);
    } else if (deletingRecord.role === 'owner') {
      onDeleteOwner(deletingRecord.id);
    } else if (deletingRecord.role === 'driver') {
      onDeleteDriver(deletingRecord.id);
    }
    setDeletingRecord(null);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header & Controls Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Customers & Directory</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold">
                  {filteredDirectory.length} Records
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Unified master directory for Customers, Vehicle Owners, and Commercial Drivers
              </p>
            </div>
          </div>

          {/* Add Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAddModal('customer')}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('owner')}
              className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Owner</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('driver')}
              className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Driver</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Name, Unique ID (MGR-CUS-...), Handphone, WhatsApp, NIC..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Role Filter Tabs / Dropdown */}
          <div className="sm:col-span-4 flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => { setRoleFilter('all'); setPage(1); }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                roleFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({unifiedDirectory.length})
            </button>
            <button
              type="button"
              onClick={() => { setRoleFilter('customer'); setPage(1); }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                roleFilter === 'customer' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Customers ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => { setRoleFilter('owner'); setPage(1); }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                roleFilter === 'owner' ? 'bg-white text-purple-800 shadow-xs' : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              Owners ({owners.length})
            </button>
            <button
              type="button"
              onClick={() => { setRoleFilter('driver'); setPage(1); }}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition text-center cursor-pointer ${
                roleFilter === 'driver' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600 hover:text-cyan-700'
              }`}
            >
              Drivers ({drivers.length})
            </button>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                {/* Dedicated Separate Column: Unique Number */}
                <th className="py-3 px-4">Unique Number</th>
                {/* Column with Interactive Filter: Role / Type */}
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span>Role</span>
                    <select
                      value={roleFilter}
                      onChange={e => { setRoleFilter(e.target.value as DirectoryRoleType); setPage(1); }}
                      className="bg-white border border-slate-300 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-xs cursor-pointer focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="all">All</option>
                      <option value="customer">Customer</option>
                      <option value="owner">Owner</option>
                      <option value="driver">Driver</option>
                    </select>
                  </div>
                </th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Handphone</th>
                <th className="py-3 px-4">WhatsApp No</th>
                <th className="py-3 px-4">NIC / Passport</th>
                <th className="py-3 px-4">Address / City</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-600">No records found</p>
                    <p className="text-[11px]">Try adjusting your search query or role filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedList.map(item => {
                  const roleBadgeClass =
                    item.role === 'customer'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : item.role === 'owner'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-cyan-50 text-cyan-800 border-cyan-200';

                  const roleLabel =
                    item.role === 'customer'
                      ? 'Customer'
                      : item.role === 'owner'
                      ? 'Owner'
                      : item.driverType === 'captain'
                      ? 'Boat Captain'
                      : 'Driver';

                  return (
                    <tr key={`${item.role}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Dedicated Column: Unique Number */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            {item.uniqueCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.uniqueCode)}
                            title="Copy Unique Code"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                          >
                            {copiedCode === item.uniqueCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 2. Role / Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase tracking-wide inline-block ${roleBadgeClass}`}>
                          {roleLabel}
                        </span>
                      </td>

                      {/* 3. Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        {item.businessName && (
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span>{item.businessName}</span>
                          </div>
                        )}
                      </td>

                      {/* 4. Handphone */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-800 whitespace-nowrap">
                        {item.handphone || <span className="text-slate-400">—</span>}
                      </td>

                      {/* 5. WhatsApp No with direct WhatsApp Chat link */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-emerald-800">
                            {item.whatsapp || item.handphone || <span className="text-slate-400 font-normal">—</span>}
                          </span>
                          {(item.whatsapp || item.handphone) && (
                            <a
                              href={`https://wa.me/${(item.whatsapp || item.handphone).replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat on WhatsApp"
                              className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-50 transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 6. NIC / Passport */}
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {item.nicPassport || <span className="text-slate-400">—</span>}
                      </td>

                      {/* 7. Address */}
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={item.address}>
                        {item.address || <span className="text-slate-400">—</span>}
                      </td>

                      {/* 8. Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${
                          item.status === 'verified' || item.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : item.status === 'pending' || item.status === 'under_review'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* 9. Action Buttons: View, Edit, Delete */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* View All Details */}
                          <button
                            type="button"
                            onClick={() => setViewingRecord(item)}
                            title="View All Details"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit All Details */}
                          <button
                            type="button"
                            onClick={() => setEditingRecord({ ...item })}
                            title="Edit Record"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Record */}
                          <button
                            type="button"
                            onClick={() => setDeletingRecord(item)}
                            title="Delete Record"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredDirectory.length > pageSize && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500">
              Showing <strong className="text-slate-800">{(page - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-800">{Math.min(page * pageSize, filteredDirectory.length)}</strong> of{' '}
              <strong className="text-slate-800">{filteredDirectory.length}</strong> records
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                      page === p ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          1. VIEW RECORD MODAL (Displaying ALL details without omitting)
      ───────────────────────────────────────────────────────────── */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-sm px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-900">
                  {viewingRecord.uniqueCode}
                </span>
                <span className="capitalize font-bold text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {viewingRecord.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Full Name</span>
                <strong className="text-sm text-slate-900 block mt-0.5">{viewingRecord.name}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Handphone (Mobile)</span>
                  <strong className="font-mono text-slate-800 block mt-0.5">{viewingRecord.handphone || '—'}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp No</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <strong className="font-mono text-emerald-700">{viewingRecord.whatsapp || '—'}</strong>
                    {viewingRecord.whatsapp && (
                      <a
                        href={`https://wa.me/${viewingRecord.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline text-[11px] font-bold"
                      >
                        Chat ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">NIC / Passport</span>
                  <strong className="font-mono text-slate-800 block mt-0.5">{viewingRecord.nicPassport || '—'}</strong>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Verification Status</span>
                  <strong className="capitalize text-slate-800 block mt-0.5">{viewingRecord.status.replace('_', ' ')}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Address</span>
                <span className="text-slate-800 block mt-0.5 font-medium">{viewingRecord.address || '—'}</span>
              </div>

              {viewingRecord.email && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                  <span className="font-mono text-slate-800 block mt-0.5">{viewingRecord.email}</span>
                </div>
              )}

              {viewingRecord.dob && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Date of Birth</span>
                  <span className="font-mono text-slate-800 block mt-0.5">{viewingRecord.dob}</span>
                </div>
              )}

              {/* Owner Specific Details */}
              {viewingRecord.role === 'owner' && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2">
                  <span className="text-purple-900 block text-[10px] uppercase font-extrabold">Business & Banking</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Business Name</span>
                      <strong className="text-slate-800">{viewingRecord.businessName || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Business Reg #</span>
                      <strong className="font-mono text-slate-800">{viewingRecord.businessRegNo || 'N/A'}</strong>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Bank Account Details</span>
                    <strong className="text-slate-800">{viewingRecord.bankDetails || 'N/A'}</strong>
                  </div>
                </div>
              )}

              {/* Driver Specific Details */}
              {viewingRecord.role === 'driver' && (
                <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-200 space-y-2">
                  <span className="text-cyan-900 block text-[10px] uppercase font-extrabold">Licence & Assignment</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Role Designation</span>
                      <strong className="capitalize text-slate-800">
                        {viewingRecord.driverType === 'captain' ? 'Boat Captain' : 'Commercial Driver'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Driving Licence #</span>
                      <strong className="font-mono text-slate-800">{viewingRecord.licenceNumber || '—'}</strong>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Licence Class</span>
                      <strong className="text-slate-800">{viewingRecord.licenceClass || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Licence Expiry</span>
                      <strong className="font-mono text-slate-800">{viewingRecord.licenceExpiry || '—'}</strong>
                    </div>
                  </div>
                  {viewingRecord.assignedVehicleId && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Assigned Vehicle</span>
                      <strong className="font-mono text-cyan-800">{viewingRecord.assignedVehicleId}</strong>
                    </div>
                  )}
                </div>
              )}

              {viewingRecord.notes && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Special Notes / Remarks</span>
                  <p className="text-slate-700 mt-0.5">{viewingRecord.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. EDIT RECORD MODAL (Modifying ALL details)
      ───────────────────────────────────────────────────────────── */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-sm px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-900">
                  {editingRecord.uniqueCode}
                </span>
                <h3 className="text-base font-bold text-slate-900">Edit {editingRecord.role.toUpperCase()} Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingRecord.name}
                  onChange={e => setEditingRecord({ ...editingRecord, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Handphone *</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.handphone}
                    onChange={e => setEditingRecord({ ...editingRecord, handphone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">WhatsApp No *</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.whatsapp}
                    onChange={e => setEditingRecord({ ...editingRecord, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-emerald-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIC / Passport *</label>
                  <input
                    type="text"
                    required
                    value={editingRecord.nicPassport}
                    onChange={e => setEditingRecord({ ...editingRecord, nicPassport: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editingRecord.status}
                    onChange={e => setEditingRecord({ ...editingRecord, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold capitalize"
                  >
                    <option value="active">Active</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={editingRecord.address}
                  onChange={e => setEditingRecord({ ...editingRecord, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {/* Owner Specifics */}
              {editingRecord.role === 'owner' && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Business Name</label>
                      <input
                        type="text"
                        value={editingRecord.businessName || ''}
                        onChange={e => setEditingRecord({ ...editingRecord, businessName: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Business Reg #</label>
                      <input
                        type="text"
                        value={editingRecord.businessRegNo || ''}
                        onChange={e => setEditingRecord({ ...editingRecord, businessRegNo: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank Account Details</label>
                    <input
                      type="text"
                      value={editingRecord.bankDetails || ''}
                      onChange={e => setEditingRecord({ ...editingRecord, bankDetails: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Driver Specifics */}
              {editingRecord.role === 'driver' && (
                <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-200 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Driver Type</label>
                      <select
                        value={editingRecord.driverType || 'driver'}
                        onChange={e => setEditingRecord({ ...editingRecord, driverType: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                      >
                        <option value="driver">Road Driver</option>
                        <option value="captain">Boat Captain</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Licence Number</label>
                      <input
                        type="text"
                        value={editingRecord.licenceNumber || ''}
                        onChange={e => setEditingRecord({ ...editingRecord, licenceNumber: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Licence Class</label>
                      <input
                        type="text"
                        value={editingRecord.licenceClass || ''}
                        onChange={e => setEditingRecord({ ...editingRecord, licenceClass: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Licence Expiry</label>
                      <input
                        type="date"
                        value={editingRecord.licenceExpiry || ''}
                        onChange={e => setEditingRecord({ ...editingRecord, licenceExpiry: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. ADD NEW RECORD MODAL (Auto-suggest Handphone -> WhatsApp)
      ───────────────────────────────────────────────────────────── */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Add New {formRole === 'customer' ? 'Customer' : formRole === 'owner' ? 'Transport Owner' : 'Driver / Captain'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  WhatsApp No will automatically suggest from Handphone, but can be freely customized
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Role Switcher in Modal */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFormRole('customer')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                  formRole === 'customer' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setFormRole('owner')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                  formRole === 'owner' ? 'bg-white text-purple-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Owner
              </button>
              <button
                type="button"
                onClick={() => setFormRole('driver')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-center transition cursor-pointer ${
                  formRole === 'driver' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                Driver
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Sivarajah"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              {/* Handphone & WhatsApp Auto-Suggest */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Handphone (Mobile) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+94 77 123 4567"
                    value={formHandphone}
                    onChange={e => handleHandphoneChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Typing auto-suggests to WhatsApp</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>WhatsApp No *</span>
                    {isWhatsappManuallyEdited && (
                      <span className="text-[10px] text-amber-600 font-normal">Customized</span>
                    )}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+94 77 123 4567"
                    value={formWhatsapp}
                    onChange={e => handleWhatsappChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-semibold text-emerald-800"
                  />
                  <span className="text-[10px] text-emerald-600 block mt-0.5">Editable independently</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">NIC / Passport Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 198512345678"
                    value={formNic}
                    onChange={e => setFormNic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                  >
                    <option value="active">Active</option>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Street, Mannar"
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {/* Owner Specific Form Fields */}
              {formRole === 'owner' && (
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Business Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Mannar Express"
                        value={formBusinessName}
                        onChange={e => setFormBusinessName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Business Reg #</label>
                      <input
                        type="text"
                        placeholder="PV-MN-2024-..."
                        value={formBusinessRegNo}
                        onChange={e => setFormBusinessRegNo(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank Account Details</label>
                    <input
                      type="text"
                      placeholder="e.g. BOC Mannar - 80234190"
                      value={formBankDetails}
                      onChange={e => setFormBankDetails(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Driver Specific Form Fields */}
              {formRole === 'driver' && (
                <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-200 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Driver Type</label>
                      <select
                        value={formDriverType}
                        onChange={e => setFormDriverType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                      >
                        <option value="driver">Road Vehicle Driver</option>
                        <option value="captain">Boat Captain</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Driving Licence #</label>
                      <input
                        type="text"
                        placeholder="e.g. B2938102"
                        value={formLicenceNumber}
                        onChange={e => setFormLicenceNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Licence Expiry</label>
                      <input
                        type="date"
                        value={formLicenceExpiry}
                        onChange={e => setFormLicenceExpiry(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Assign to Vehicle (Optional)</label>
                      <select
                        value={formAssignedVehicleId}
                        onChange={e => setFormAssignedVehicleId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium"
                      >
                        <option value="">No Vehicle Assigned</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            [{v.registrationNumber}] {v.make} {v.model}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. DELETE CONFIRMATION MODAL
      ───────────────────────────────────────────────────────────── */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-xs text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Record</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete <strong className="text-slate-800">{deletingRecord.name}</strong> ({deletingRecord.uniqueCode})? This action will remove the record from Supabase.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
