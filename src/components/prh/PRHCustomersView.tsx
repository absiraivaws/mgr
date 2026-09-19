import React, { useState, useMemo } from 'react';
import {
  Building2,
  CheckCircle,
  Clock,
  DollarSign,
  Edit3,
  ExternalLink,
  Filter,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { PRHCustomer } from '../../types/prhTypes';
import { generateNextPRHId } from '../../utils/prhStorage';
import { prhTheme, SortDirection, sortPRHData } from './prhTheme';
import { PRHSearchableSelect, PRHOption } from './PRHSearchableSelect';
import { PRHTableHeader } from './PRHTableHeader';

interface PRHCustomersViewProps {
  customers: PRHCustomer[];
  currentUserEmail: string;
  onSaveCustomer: (customer: PRHCustomer) => void;
  onDeleteCustomer: (id: string) => void;
}

const CUSTOMER_TYPE_OPTIONS: PRHOption[] = [
  { value: 'all', label: 'All Customer Types' },
  { value: 'company', label: 'Construction Company' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'individual', label: 'Individual Builder' },
  { value: 'organization', label: 'Organization' },
];

export const PRHCustomersView: React.FC<PRHCustomersViewProps> = ({
  customers,
  currentUserEmail,
  onSaveCustomer,
  onDeleteCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<PRHCustomer | null>(null);

  // Sorting state
  const [sortKey, setSortKey] = useState<string>('id');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Customer Form State
  const [custType, setCustType] = useState<'individual' | 'contractor' | 'company' | 'organization'>('contractor');
  const [custName, setCustName] = useState('');
  const [custNic, setCustNic] = useState('');
  const [custCompany, setCustCompany] = useState('');
  const [custContactPerson, setCustContactPerson] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custWhatsapp, setCustWhatsapp] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [whatsappManuallyEdited, setWhatsappManuallyEdited] = useState(false);
  const [custEmail, setCustEmail] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custSiteAddress, setCustSiteAddress] = useState('');
  const [custEmergency, setCustEmergency] = useState('');
  const [custCreditLimit, setCustCreditLimit] = useState(100000);
  const [custRemarks, setCustRemarks] = useState('');

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setCustType('contractor');
    setCustName('');
    setCustNic('');
    setCustCompany('');
    setCustContactPerson('');
    setCustPhone('');
    setCustWhatsapp('');
    setSameAsPhone(true);
    setWhatsappManuallyEdited(false);
    setCustEmail('');
    setCustAddress('');
    setCustSiteAddress('');
    setCustEmergency('');
    setCustCreditLimit(100000);
    setCustRemarks('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: PRHCustomer) => {
    setEditingCustomer(c);
    setCustType(c.customerType);
    setCustName(c.name);
    setCustNic(c.nic || '');
    setCustCompany(c.companyName || '');
    setCustContactPerson(c.contactPerson || '');
    setCustPhone(c.phone);
    setCustWhatsapp(c.whatsapp || c.phone);
    setSameAsPhone(c.sameAsPhone !== false);
    setWhatsappManuallyEdited(false);
    setCustEmail(c.email || '');
    setCustAddress(c.address);
    setCustSiteAddress(c.siteAddress);
    setCustEmergency(c.emergencyContact || '');
    setCustCreditLimit(c.creditLimit || 100000);
    setCustRemarks(c.remarks || '');
    setIsModalOpen(true);
  };

  const handlePhoneChange = (val: string) => {
    setCustPhone(val);
    if (sameAsPhone && !whatsappManuallyEdited) {
      setCustWhatsapp(val);
    }
  };

  const handleWhatsappChange = (val: string) => {
    setCustWhatsapp(val);
    setWhatsappManuallyEdited(true);
    if (val !== custPhone) {
      setSameAsPhone(false);
    }
  };

  const handleSameAsPhoneToggle = (checked: boolean) => {
    setSameAsPhone(checked);
    if (checked) {
      setCustWhatsapp(custPhone);
      setWhatsappManuallyEdited(false);
    }
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') setSortDir(null);
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Submit Customer Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) {
      alert('Name and Hand Phone Number are required.');
      return;
    }

    const nextId = editingCustomer
      ? editingCustomer.id
      : generateNextPRHId('PRH-CUS-', customers.map((c) => c.id), 5);

    const customerRecord: PRHCustomer = {
      id: nextId,
      customerType: custType,
      name: custName.trim(),
      nic: custNic.trim() || 'N/A',
      companyName: custCompany.trim() || undefined,
      contactPerson: custContactPerson.trim() || undefined,
      phone: custPhone.trim(),
      whatsapp: custWhatsapp.trim() || custPhone.trim(),
      sameAsPhone,
      email: custEmail.trim() || undefined,
      address: custAddress.trim() || 'Pesalai, Mannar',
      siteAddress: custSiteAddress.trim() || 'Mannar Construction Site',
      emergencyContact: custEmergency.trim() || undefined,
      creditLimit: custCreditLimit,
      outstandingBalance: editingCustomer ? editingCustomer.outstandingBalance : 0,
      depositBalance: editingCustomer ? editingCustomer.depositBalance : 0,
      status: editingCustomer ? editingCustomer.status : 'active',
      remarks: custRemarks.trim() || undefined,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
      createdBy: editingCustomer ? editingCustomer.createdBy : currentUserEmail,
    };

    onSaveCustomer(customerRecord);
    setIsModalOpen(false);
  };

  // Filtered and Sorted customers
  const filteredCustomers = useMemo(() => {
    const list = customers.filter((c) => {
      if (typeFilter !== 'all' && c.customerType !== typeFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.siteAddress && c.siteAddress.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q)
      );
    });

    return sortPRHData(list, sortKey, sortDir);
  }, [customers, typeFilter, searchTerm, sortKey, sortDir]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            PRH Customer & Contractor Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage contractors, construction companies, individual builders, site addresses and credit lines.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className={prhTheme.btnPrimary}
        >
          <UserPlus className="w-4 h-4" />
          Add Customer / Contractor
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className={`${prhTheme.card} p-4 flex flex-col md:flex-row gap-3 items-center justify-between`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search contractor, company, phone, site..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600"
          />
        </div>

        {/* Replaced side-by-side selection buttons with Searchable Dropdown */}
        <div className="w-full md:w-64">
          <PRHSearchableSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={CUSTOMER_TYPE_OPTIONS}
            placeholder="Filter by customer type..."
            searchPlaceholder="Search customer types..."
            autoSortAZ={false}
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className={prhTheme.tableContainer}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={prhTheme.tableHeader}>
                <PRHTableHeader
                  label="Customer ID"
                  sortKey="id"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Customer / Company"
                  sortKey="name"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Type"
                  sortKey="customerType"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Mobile & WhatsApp"
                  sortKey="phone"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Site Location"
                  sortKey="siteAddress"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                />
                <PRHTableHeader
                  label="Deposit Held"
                  sortKey="depositBalance"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <PRHTableHeader
                  label="Outstanding"
                  sortKey="outstandingBalance"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <PRHTableHeader
                  label="Status"
                  sortKey="status"
                  currentSortKey={sortKey}
                  currentSortDir={sortDir}
                  onSort={handleSort}
                  align="center"
                />
                <th className="py-3 px-3.5 text-center font-semibold text-slate-600 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                    No customers found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className={prhTheme.tableRow}>
                    <td className="py-3 px-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {c.id}
                    </td>
                    <td className="py-3 px-3.5 break-words whitespace-normal max-w-xs">
                      <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                      {c.companyName && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{c.companyName}</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 capitalize text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <span className={prhTheme.badgeNeutral}>
                        {c.customerType}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                      {c.whatsapp && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                          <MessageSquare className="w-3 h-3" />
                          <span>{c.whatsapp}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 break-words whitespace-normal max-w-xs">
                      <div className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span>{c.siteAddress || c.address}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      Rs. {(c.depositBalance || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                      {(c.outstandingBalance || 0) > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          Rs. {c.outstandingBalance.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Rs. 0</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <span className={c.status === 'active' ? prhTheme.badgeSuccess : prhTheme.badgeNeutral}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete customer ${c.name}?`)) {
                              onDeleteCustomer(c.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Add/Edit Modal */}
      {isModalOpen && (
        <div className={prhTheme.modalBackdrop}>
          <div className={`${prhTheme.modal} max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                {editingCustomer ? 'Edit Customer / Contractor' : 'Add New Customer / Contractor'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Customer Type *</label>
                  <select
                    value={custType}
                    onChange={(e) => setCustType(e.target.value as any)}
                    className={prhTheme.select}
                  >
                    <option value="contractor">Contractor</option>
                    <option value="company">Construction Company</option>
                    <option value="individual">Individual</option>
                    <option value="organization">Organization</option>
                  </select>
                </div>

                <div>
                  <label className={prhTheme.label}>NIC / Reg Number</label>
                  <input
                    type="text"
                    value={custNic}
                    onChange={(e) => setCustNic(e.target.value)}
                    placeholder="e.g. 198425102345"
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Customer / Contractor Name *</label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="e.g. Anton Silva"
                    className={prhTheme.input}
                  />
                </div>

                <div>
                  <label className={prhTheme.label}>Company Name</label>
                  <input
                    type="text"
                    value={custCompany}
                    onChange={(e) => setCustCompany(e.target.value)}
                    placeholder="e.g. Silva Builders Pvt Ltd"
                    className={prhTheme.input}
                  />
                </div>
              </div>

              {/* Hand Phone and WhatsApp Number Behaviour */}
              <div className={`${prhTheme.cardSubtle} p-3.5 space-y-2.5`}>
                <div>
                  <label className={prhTheme.label}>
                    Hand Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={custPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="e.g. 0771234567"
                    className={prhTheme.input}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={prhTheme.label}>WhatsApp Number *</label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-blue-600 dark:text-blue-400">
                      <input
                        type="checkbox"
                        checked={sameAsPhone}
                        onChange={(e) => handleSameAsPhoneToggle(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0"
                      />
                      <span>Same as Hand Phone</span>
                    </label>
                  </div>
                  <input
                    type="tel"
                    value={custWhatsapp}
                    onChange={(e) => handleWhatsappChange(e.target.value)}
                    placeholder="e.g. 0771234567"
                    className={prhTheme.input}
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Used for return notifications and PDF contract dispatch.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Permanent Address</label>
                  <input
                    type="text"
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="e.g. Main St, Pesalai"
                    className={prhTheme.input}
                  />
                </div>

                <div>
                  <label className={prhTheme.label}>Site Location / Work Address *</label>
                  <input
                    type="text"
                    required
                    value={custSiteAddress}
                    onChange={(e) => setCustSiteAddress(e.target.value)}
                    placeholder="e.g. Pesalai Pier Project"
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={prhTheme.label}>Emergency / Alternate Contact</label>
                  <input
                    type="text"
                    value={custEmergency}
                    onChange={(e) => setCustEmergency(e.target.value)}
                    placeholder="e.g. Site Supervisor (0761234567)"
                    className={prhTheme.input}
                  />
                </div>

                <div>
                  <label className={prhTheme.label}>Credit Limit (Rs.)</label>
                  <input
                    type="number"
                    value={custCreditLimit}
                    onChange={(e) => setCustCreditLimit(parseFloat(e.target.value) || 0)}
                    className={prhTheme.input}
                  />
                </div>
              </div>

              <div>
                <label className={prhTheme.label}>Remarks / Site Notes</label>
                <textarea
                  rows={2}
                  value={custRemarks}
                  onChange={(e) => setCustRemarks(e.target.value)}
                  placeholder="Special instructions, authorized equipment pickup persons..."
                  className={prhTheme.input}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={prhTheme.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={prhTheme.btnPrimary}
                >
                  {editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
