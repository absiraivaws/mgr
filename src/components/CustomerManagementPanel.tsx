/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  X,
  Check,
  AlertCircle,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  IdCard,
  User,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  Bike
} from 'lucide-react';
import { AppSettings, Customer } from '../types';
import { AccentColor, ThemeMode, getThemeClasses } from '../utils/theme';
import { DEFAULT_USER, UserAccount, getUserPermissions } from '../utils/auth';

interface CustomerManagementPanelProps {
  customers: Customer[];
  settings: AppSettings;
  currentUser?: UserAccount;
  themeMode?: ThemeMode;
  accent?: AccentColor;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string, nicPassport: string) => void;
}

type SortField = 'fullName' | 'nicPassport' | 'phone' | 'whatsappNumber' | 'address' | 'dob' | 'totalRentalsCount';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 20;

export const CustomerManagementPanel: React.FC<CustomerManagementPanelProps> = ({
  customers,
  settings,
  currentUser,
  themeMode = 'dark',
  accent = 'emerald',
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}) => {
  const t = getThemeClasses(themeMode, accent);

  const activeUser = currentUser || DEFAULT_USER;
  const isRootAdmin = activeUser.email.toLowerCase() === DEFAULT_USER.email.toLowerCase();
  const isAdmin = activeUser.role === 'admin' || isRootAdmin;

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('fullName');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // Form Fields State (Used for both Add & Edit)
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    nicPassport: '',
    dob: '',
    whatsappNumber: '',
    phone: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Reset Form
  const resetForm = () => {
    setFormData({
      fullName: '',
      address: '',
      nicPassport: '',
      dob: '',
      whatsappNumber: '',
      phone: '',
      notes: '',
    });
    setFormError(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setFormData({
      fullName: customer.fullName || customer.name || '',
      address: customer.address || '',
      nicPassport: customer.nicPassport || '',
      dob: customer.dob || '',
      whatsappNumber: customer.whatsappNumber || customer.phone || '',
      phone: customer.phone || '',
      notes: customer.notes || '',
    });
    setFormError(null);
    setEditingCustomer(customer);
  };

  // Handle Add / Edit Submission
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanNic = formData.nicPassport.trim().toUpperCase();
    const cleanName = formData.fullName.trim();

    if (!cleanName) {
      setFormError('Please enter the customer\'s Full Name.');
      return;
    }

    if (!cleanNic) {
      setFormError('Please enter the NIC / Passport Number.');
      return;
    }

    // Check duplicate NIC
    const existing = customers.find(
      (c) =>
        c.nicPassport.trim().toUpperCase() === cleanNic &&
        (!editingCustomer || c.id !== editingCustomer.id)
    );

    if (existing) {
      setFormError(`A customer with NIC "${cleanNic}" already exists (${existing.name}).`);
      return;
    }

    if (editingCustomer) {
      // Update existing
      const updated: Customer = {
        ...editingCustomer,
        name: cleanName,
        fullName: cleanName,
        nicPassport: cleanNic,
        address: formData.address.trim(),
        dob: formData.dob.trim(),
        whatsappNumber: formData.whatsappNumber.trim() || formData.phone.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes.trim() || undefined,
      };
      onUpdateCustomer(updated);
      setEditingCustomer(null);
    } else {
      // Add new
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name: cleanName,
        fullName: cleanName,
        nicPassport: cleanNic,
        address: formData.address.trim(),
        dob: formData.dob.trim(),
        whatsappNumber: formData.whatsappNumber.trim() || formData.phone.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes.trim() || undefined,
        createdAt: Date.now(),
        totalRentalsCount: 0,
      };
      onAddCustomer(newCust);
      setIsAddModalOpen(false);
    }

    resetForm();
  };

  // Handle Sort Change
  const handleSort = (field: SortField, explicitDir?: SortDirection) => {
    if (explicitDir) {
      setSortField(field);
      setSortDir(explicitDir);
    } else if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // Filtered & Sorted Customer Data
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter((c) => {
        const name = (c.fullName || c.name || '').toLowerCase();
        const nic = (c.nicPassport || '').toLowerCase();
        const phone = (c.phone || '').toLowerCase();
        const wa = (c.whatsappNumber || '').toLowerCase();
        const addr = (c.address || '').toLowerCase();
        const dob = (c.dob || '').toLowerCase();
        const notes = (c.notes || '').toLowerCase();
        return (
          name.includes(q) ||
          nic.includes(q) ||
          phone.includes(q) ||
          wa.includes(q) ||
          addr.includes(q) ||
          dob.includes(q) ||
          notes.includes(q)
        );
      });
    }

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'fullName':
          aVal = (a.fullName || a.name || '').toLowerCase();
          bVal = (b.fullName || b.name || '').toLowerCase();
          break;
        case 'nicPassport':
          aVal = (a.nicPassport || '').toLowerCase();
          bVal = (b.nicPassport || '').toLowerCase();
          break;
        case 'phone':
          aVal = (a.phone || '').toLowerCase();
          bVal = (b.phone || '').toLowerCase();
          break;
        case 'whatsappNumber':
          aVal = (a.whatsappNumber || a.phone || '').toLowerCase();
          bVal = (b.whatsappNumber || b.phone || '').toLowerCase();
          break;
        case 'address':
          aVal = (a.address || '').toLowerCase();
          bVal = (b.address || '').toLowerCase();
          break;
        case 'dob':
          aVal = (a.dob || '').toLowerCase();
          bVal = (b.dob || '').toLowerCase();
          break;
        case 'totalRentalsCount':
          aVal = a.totalRentalsCount || 0;
          bVal = b.totalRentalsCount || 0;
          break;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
        return sortDir === 'asc' ? comp : -comp;
      } else {
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }
    });

    return result;
  }, [customers, searchTerm, sortField, sortDir]);

  // Pagination calculations (Max 20 rows per page)
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + PAGE_SIZE);

  // Column Header Component with A-Z and Z-A symbols
  const SortableTh: React.FC<{
    label: string;
    field: SortField;
    align?: 'left' | 'center' | 'right';
  }> = ({ label, field, align = 'left' }) => {
    const isActive = sortField === field;
    return (
      <th className={`px-4 py-3 select-none ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}>
        <div className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-between'}`}>
          <button
            type="button"
            onClick={() => handleSort(field)}
            className={`font-bold text-xs tracking-wider cursor-pointer hover:underline flex items-center gap-1 ${
              isActive ? `${t.textHeading} font-extrabold` : t.textMuted
            }`}
            title={`Sort by ${label}`}
          >
            <span>{label}</span>
          </button>
          
          {/* A-Z / Z-A Sorting Badges */}
          <div className="inline-flex items-center rounded border border-slate-500/30 overflow-hidden text-[9px] font-bold bg-slate-500/10 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSort(field, 'asc');
              }}
              title={`Sort ${label} A-Z`}
              className={`px-1.5 py-0.5 transition cursor-pointer ${
                isActive && sortDir === 'asc'
                  ? 'bg-emerald-500 text-white font-black shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-500/20'
              }`}
            >
              A-Z
            </button>
            <div className="w-[1px] h-3 bg-slate-500/30" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSort(field, 'desc');
              }}
              title={`Sort ${label} Z-A`}
              className={`px-1.5 py-0.5 transition cursor-pointer ${
                isActive && sortDir === 'desc'
                  ? 'bg-emerald-500 text-white font-black shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-500/20'
              }`}
            >
              Z-A
            </button>
          </div>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Customers */}
        <div className={`p-5 rounded-2xl border shadow-lg ${t.cardBg}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-400 text-white flex items-center justify-center shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
                Total Registered
              </span>
              <h3 className={`text-2xl font-black ${t.textHeading}`}>
                {customers.length}
              </h3>
            </div>
          </div>
          <p className={`text-xs ${t.textMuted}`}>Profiles stored in database</p>
        </div>

        {/* Regular Renters */}
        <div className={`p-5 rounded-2xl border shadow-lg ${t.cardBg}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
                Active / Repeat Riders
              </span>
              <h3 className={`text-2xl font-black text-emerald-500`}>
                {customers.filter((c) => (c.totalRentalsCount || 0) > 1).length}
              </h3>
            </div>
          </div>
          <p className={`text-xs ${t.textMuted}`}>Customers with 2+ completed rentals</p>
        </div>

        {/* Quick Action Card */}
        <div className={`p-5 rounded-2xl border shadow-lg ${t.cardBg} flex flex-col justify-between`}>
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>
              Customer Directory
            </span>
            <p className={`text-xs ${t.textHeading} font-semibold mt-1`}>
              Search by NIC or register new customers
            </p>
          </div>
          <button
            id="btn-add-customer-top"
            type="button"
            onClick={openAddModal}
            className={`mt-2 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${t.primaryBtn}`}
          >
            <Plus className="w-4 h-4" />
            <span>Register New Customer</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className={`${t.cardBg} rounded-2xl border shadow-xl overflow-hidden space-y-4`}>
        
        {/* Header & Global Search Bar */}
        <div className={`p-5 border-b ${t.divider} space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center shadow-md">
                <IdCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-bold tracking-tight ${t.textHeading}`}>
                  Customer Directory & Identity Records
                </h2>
                <p className={`text-xs ${t.textMuted}`}>
                  Showing max 20 customers per page with A-Z / Z-A column sorting
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                id="btn-register-customer-table"
                type="button"
                onClick={openAddModal}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm ${t.primaryBtn}`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Customer</span>
              </button>
            </div>
          </div>

          {/* Global Search Bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-cyan-500 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                <span>Global Search in Customer Table (Name, NIC, Mobile, WhatsApp, Address, DOB)</span>
              </label>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${t.searchBadge}`}>
                Global Filter
              </span>
            </div>

            <div className="relative">
              <input
                id="input-customer-global-search"
                type="text"
                placeholder="Search any customer name, NIC / passport, phone, WhatsApp number, or address..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full rounded-xl pl-9 pr-10 py-2.5 text-xs sm:text-sm font-medium ${t.searchInput}`}
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-cyan-500">
                <Search className="w-4 h-4" />
              </div>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-cyan-500 hover:text-cyan-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className={`border-b ${t.divider} ${t.cardSubtleBg} uppercase font-semibold text-slate-400`}>
              <tr>
                <th className="px-4 py-3 w-12 text-center">#</th>
                <SortableTh label="Full Name" field="fullName" />
                <SortableTh label="NIC Number" field="nicPassport" />
                <SortableTh label="Mobile Number" field="phone" />
                <SortableTh label="WhatsApp" field="whatsappNumber" />
                <SortableTh label="Date of Birth" field="dob" />
                <SortableTh label="Address" field="address" />
                <SortableTh label="Trips" field="totalRentalsCount" align="center" />
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className={`divide-y ${t.divider}`}>
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center mx-auto mb-3 text-slate-400">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className={`text-sm font-semibold ${t.textHeading}`}>No Customers Found</p>
                    <p className={`text-xs ${t.textMuted} mt-1`}>
                      {searchTerm ? 'No customer matched your search query.' : 'Click "Add Customer" to register your first profile.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer, idx) => (
                  <tr
                    key={customer.id || customer.nicPassport}
                    className={`transition-colors hover:${t.cardSubtleBg}`}
                  >
                    {/* Index */}
                    <td className="px-4 py-3 text-center font-mono font-semibold text-slate-400">
                      {startIndex + idx + 1}
                    </td>

                    {/* Full Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          {(customer.fullName || customer.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className={`font-bold block ${t.textHeading}`}>
                            {customer.fullName || customer.name}
                          </span>
                          {customer.notes && (
                            <span className={`text-[10px] ${t.textMuted} truncate block max-w-[150px]`}>
                              {customer.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* NIC Number */}
                    <td className="px-4 py-3 font-mono font-bold text-cyan-500">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                        {customer.nicPassport}
                      </span>
                    </td>

                    {/* Mobile Number */}
                    <td className="px-4 py-3 font-mono">
                      {customer.phone ? (
                        <a
                          href={`tel:${customer.phone}`}
                          className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition"
                          title="Call Mobile"
                        >
                          <Phone className="w-3 h-3 text-emerald-500" />
                          <span>{customer.phone}</span>
                        </a>
                      ) : (
                        <span className={`italic ${t.textMuted}`}>—</span>
                      )}
                    </td>

                    {/* WhatsApp Number */}
                    <td className="px-4 py-3 font-mono">
                      {customer.whatsappNumber || customer.phone ? (
                        <a
                          href={`https://wa.me/${(customer.whatsappNumber || customer.phone || '').replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-emerald-400 hover:underline"
                          title="Chat on WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-400" />
                          <span>{customer.whatsappNumber || customer.phone}</span>
                        </a>
                      ) : (
                        <span className={`italic ${t.textMuted}`}>—</span>
                      )}
                    </td>

                    {/* Date of Birth */}
                    <td className={`px-4 py-3 font-mono ${t.textMuted}`}>
                      {customer.dob ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          <span>{customer.dob}</span>
                        </span>
                      ) : (
                        <span className="italic">—</span>
                      )}
                    </td>

                    {/* Address */}
                    <td className={`px-4 py-3 ${t.textMain} max-w-[200px]`}>
                      {customer.address ? (
                        <span className="truncate block" title={customer.address}>
                          <MapPin className="w-3 h-3 text-rose-400 inline mr-1" />
                          {customer.address}
                        </span>
                      ) : (
                        <span className={`italic ${t.textMuted}`}>—</span>
                      )}
                    </td>

                    {/* Total Trips */}
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${t.badge}`}>
                        {customer.totalRentalsCount || 0}
                      </span>
                    </td>

                    {/* Actions (View, Edit, Delete) */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* View Profile */}
                        <button
                          id={`btn-view-customer-${customer.id}`}
                          type="button"
                          onClick={() => setViewingCustomer(customer)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${t.inactiveTab}`}
                          title="View Customer Profile"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        </button>

                        {/* Edit Profile */}
                        <button
                          id={`btn-edit-customer-${customer.id}`}
                          type="button"
                          onClick={() => openEditModal(customer)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${t.inactiveTab}`}
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                        </button>

                        {/* Delete Profile (Admin-Only) */}
                        {isAdmin ? (
                          <button
                            id={`btn-delete-customer-${customer.id}`}
                            type="button"
                            onClick={() => setDeletingCustomer(customer)}
                            className="p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/15 transition cursor-pointer"
                            title="Delete Customer Profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => alert('Permission Denied: Only Administrators can delete registered customer records.')}
                            className="p-1.5 rounded-lg border border-slate-500/20 text-slate-500 opacity-40 cursor-not-allowed"
                            title="Admin Only"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls (Max 20 rows per page) */}
        <div className={`p-4 border-t ${t.divider} flex flex-col sm:flex-row items-center justify-between gap-3 text-xs`}>
          <div className={t.textMuted}>
            Showing <strong className={t.textHeading}>{paginatedCustomers.length > 0 ? startIndex + 1 : 0}</strong> to{' '}
            <strong className={t.textHeading}>{Math.min(startIndex + PAGE_SIZE, filteredCustomers.length)}</strong> of{' '}
            <strong className={t.textHeading}>{filteredCustomers.length}</strong> customers
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${t.inactiveTab}`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className={`px-3 py-1.5 rounded-lg font-mono font-bold ${t.badge}`}>
              Page {safePage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${t.inactiveTab}`}
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL: ADD / EDIT CUSTOMER ================= */}
      {(isAddModalOpen || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className={`${t.modalBg} rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl border ${t.divider} max-h-[90vh] overflow-y-auto`}>
            
            {/* Modal Header */}
            <div className={`flex items-center justify-between pb-3 border-b ${t.divider}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold text-base ${t.textHeading}`}>
                    {editingCustomer ? 'Edit Customer Profile' : 'Register New Customer'}
                  </h3>
                  <p className={`text-xs ${t.textMuted}`}>
                    Enter personal identification, phone and address details
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingCustomer(null);
                  resetForm();
                }}
                className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textMain} hover:bg-slate-800/20 cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveCustomer} className="space-y-3.5">
              
              {/* Full Name */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A.B. Siraiva"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-medium rounded-xl ${t.textInput}`}
                    autoFocus
                  />
                </div>
              </div>

              {/* NIC / Passport & DOB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    NIC Number / Passport <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-400">
                      <IdCard className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 198802900037 or 915533990V"
                      value={formData.nicPassport}
                      onChange={(e) => setFormData({ ...formData, nicPassport: e.target.value.toUpperCase() })}
                      className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-mono font-bold uppercase rounded-xl ${t.textInput}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Date of Birth
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-mono font-medium rounded-xl ${t.textInput}`}
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Number & WhatsApp Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      placeholder="e.g. 0773606494"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-mono rounded-xl ${t.textInput}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-500">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      placeholder="e.g. 0773606494"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-mono rounded-xl ${t.textInput}`}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 pt-2.5 pointer-events-none text-rose-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="e.g. Main Street, Mannar, Sri Lanka"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-medium rounded-xl ${t.textInput}`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${t.textHeading}`}>
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regular rider, VIP member, helmet size L"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={`w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl ${t.textInput}`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingCustomer(null);
                    resetForm();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold ${t.inactiveTab} cursor-pointer`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn} shadow-md cursor-pointer`}
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCustomer ? 'Update Customer' : 'Save Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW CUSTOMER PROFILE ================= */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className={`${t.modalBg} rounded-2xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl border ${t.divider}`}>
            
            <div className={`flex items-center justify-between pb-3 border-b ${t.divider}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center text-sm font-bold shadow-md">
                  {(viewingCustomer.fullName || viewingCustomer.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className={`font-bold text-base ${t.textHeading}`}>
                    {viewingCustomer.fullName || viewingCustomer.name}
                  </h3>
                  <p className={`text-xs font-mono text-cyan-500 font-semibold`}>
                    NIC: {viewingCustomer.nicPassport}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className={`p-1.5 rounded-lg ${t.textMuted} hover:${t.textMain} hover:bg-slate-800/20 cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Details List */}
            <div className="space-y-2.5 text-xs">
              {/* NIC */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${t.cardSubtleBg}`}>
                <span className={`flex items-center gap-1.5 font-semibold ${t.textMuted}`}>
                  <IdCard className="w-3.5 h-3.5 text-cyan-400" />
                  NIC Number
                </span>
                <span className="font-mono font-bold text-cyan-500">
                  {viewingCustomer.nicPassport}
                </span>
              </div>

              {/* DOB */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${t.cardSubtleBg}`}>
                <span className={`flex items-center gap-1.5 font-semibold ${t.textMuted}`}>
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Date of Birth
                </span>
                <span className={`font-mono font-bold ${t.textMain}`}>
                  {viewingCustomer.dob || 'Not specified'}
                </span>
              </div>

              {/* Mobile */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${t.cardSubtleBg}`}>
                <span className={`flex items-center gap-1.5 font-semibold ${t.textMuted}`}>
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  Mobile Number
                </span>
                {viewingCustomer.phone ? (
                  <a
                    href={`tel:${viewingCustomer.phone}`}
                    className="font-mono font-bold text-emerald-400 hover:underline"
                  >
                    {viewingCustomer.phone}
                  </a>
                ) : (
                  <span className={`italic ${t.textMuted}`}>Not specified</span>
                )}
              </div>

              {/* WhatsApp */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${t.cardSubtleBg}`}>
                <span className={`flex items-center gap-1.5 font-semibold ${t.textMuted}`}>
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  WhatsApp Number
                </span>
                {viewingCustomer.whatsappNumber || viewingCustomer.phone ? (
                  <a
                    href={`https://wa.me/${(viewingCustomer.whatsappNumber || viewingCustomer.phone || '').replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-bold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>{viewingCustomer.whatsappNumber || viewingCustomer.phone}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className={`italic ${t.textMuted}`}>Not specified</span>
                )}
              </div>

              {/* Address */}
              <div className={`p-2.5 rounded-xl border ${t.cardSubtleBg}`}>
                <span className={`flex items-center gap-1.5 font-semibold ${t.textMuted} mb-1`}>
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  Residential Address
                </span>
                <p className={`font-medium ${t.textMain}`}>
                  {viewingCustomer.address || 'Not specified'}
                </p>
              </div>

              {/* Notes */}
              {viewingCustomer.notes && (
                <div className={`p-2.5 rounded-xl border ${t.cardSubtleBg}`}>
                  <span className={`block font-semibold ${t.textMuted} mb-1`}>Customer Notes</span>
                  <p className={`text-[11px] ${t.textMain}`}>{viewingCustomer.notes}</p>
                </div>
              )}

              {/* Trip Count */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between ${t.cardSubtleBg}`}>
                <span className={`flex items-center gap-1.5 font-semibold ${t.textMuted}`}>
                  <Bike className="w-3.5 h-3.5 text-amber-400" />
                  Total Rentals Count
                </span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${t.badge}`}>
                  {viewingCustomer.totalRentalsCount || 0} Trips
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  const target = viewingCustomer;
                  setViewingCustomer(null);
                  openEditModal(target);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${t.primaryBtn} cursor-pointer`}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${t.inactiveTab} cursor-pointer`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className={`${t.modalBg} rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl border ${t.divider}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-bold text-sm ${t.textHeading}`}>Delete Customer Profile</h3>
                <p className={`text-xs ${t.textMuted}`}>This action cannot be undone</p>
              </div>
            </div>

            <p className={`text-xs ${t.textMain}`}>
              Are you sure you want to permanently delete customer{' '}
              <strong className="text-rose-400">
                {deletingCustomer.fullName || deletingCustomer.name}
              </strong>{' '}
              (NIC: {deletingCustomer.nicPassport})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold ${t.inactiveTab} cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCustomer(deletingCustomer.id, deletingCustomer.nicPassport);
                  setDeletingCustomer(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-md"
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
