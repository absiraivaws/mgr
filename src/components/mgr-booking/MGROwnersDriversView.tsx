/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Star,
  Phone,
  MessageSquare,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Car,
  Ship,
  X,
  Award,
} from 'lucide-react';
import { TransportOwner, TransportDriver, VerificationStatus } from '../../types/mgrBooking';

interface MGROwnersDriversViewProps {
  owners: TransportOwner[];
  drivers: TransportDriver[];
  onAddOwner: (newOwner: TransportOwner) => void;
  onUpdateOwnerStatus: (ownerId: string, status: VerificationStatus) => void;
  onAddDriver: (newDriver: TransportDriver) => void;
  themeMode?: 'dark' | 'light';
}

export const MGROwnersDriversView: React.FC<MGROwnersDriversViewProps> = ({
  owners,
  drivers,
  onAddOwner,
  onUpdateOwnerStatus,
  onAddDriver,
  themeMode = 'light',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'owners' | 'drivers'>('owners');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingOwner, setIsAddingOwner] = useState(false);
  const [isAddingDriver, setIsAddingDriver] = useState(false);

  // New Owner Form State
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerNic, setOwnerNic] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('Mannar Town');
  const [ownerBusinessName, setOwnerBusinessName] = useState('');

  // New Driver Form State
  const [driverName, setDriverName] = useState('');
  const [driverNic, setDriverNic] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [driverType, setDriverType] = useState<'driver' | 'captain'>('driver');
  const [driverLicenceNo, setDriverLicenceNo] = useState('');
  const [driverLicenceClass, setDriverLicenceClass] = useState('Light & Heavy Passenger');
  const [driverLicenceExpiry, setDriverLicenceExpiry] = useState('2028-12-31');

  const filteredOwners = owners.filter(
    o =>
      o.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.mobileNumber.includes(searchQuery) ||
      (o.businessName && o.businessName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredDrivers = drivers.filter(
    d =>
      d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.licenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.mobile.includes(searchQuery)
  );

  const handleSaveOwner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerFullName || !ownerMobile) return;

    const newOwner: TransportOwner = {
      id: `OWN-MGR-${Math.floor(10000 + Math.random() * 90000)}`,
      fullName: ownerFullName,
      nicPassport: ownerNic || 'N/A',
      address: ownerAddress,
      mobileNumber: ownerMobile,
      whatsappNumber: ownerMobile,
      email: ownerEmail || `${ownerFullName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      businessName: ownerBusinessName || undefined,
      status: 'verified',
      vehiclesCount: 0,
      totalEarnings: 0,
      rating: 5.0,
      createdAt: Date.now(),
    };

    onAddOwner(newOwner);
    setIsAddingOwner(false);
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !driverMobile || !driverLicenceNo) return;

    const newDriver: TransportDriver = {
      id: `DRV-MGR-${Math.floor(10000 + Math.random() * 90000)}`,
      ownerId: owners[0]?.id || 'OWN-MGR-00001',
      fullName: driverName,
      nic: driverNic || 'N/A',
      mobile: driverMobile,
      whatsapp: driverMobile,
      address: 'Mannar District',
      driverType,
      licenceNumber: driverLicenceNo,
      licenceClass: driverLicenceClass,
      licenceExpiry: driverLicenceExpiry,
      experienceYears: 5,
      rating: 5.0,
      status: 'verified',
      createdAt: Date.now(),
    };

    onAddDriver(newDriver);
    setIsAddingDriver(false);
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher & Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Toggle between Owners and Drivers */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('owners')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'owners' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Owners Directory ({owners.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('drivers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'drivers' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Drivers & Boat Captains ({drivers.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeSubTab === 'owners' ? 'Search owners...' : 'Search drivers / captains...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Add button */}
        {activeSubTab === 'owners' ? (
          <button
            type="button"
            onClick={() => setIsAddingOwner(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Register New Owner
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingDriver(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Driver / Captain
          </button>
        )}
      </div>

      {/* OWNERS TAB CONTENT */}
      {activeSubTab === 'owners' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOwners.map(owner => (
            <div
              key={owner.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-slate-500">{owner.id}</span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{owner.fullName}</h3>
                    {owner.businessName && (
                      <p className="text-xs text-emerald-700 font-semibold">{owner.businessName}</p>
                    )}
                  </div>

                  {/* Verification status chip */}
                  <select
                    value={owner.status}
                    onChange={e => onUpdateOwnerStatus(owner.id, e.target.value as VerificationStatus)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border bg-white cursor-pointer focus:outline-none ${
                      owner.status === 'verified'
                        ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                        : owner.status === 'pending'
                        ? 'text-amber-700 border-amber-300 bg-amber-50'
                        : 'text-rose-700 border-rose-300 bg-rose-50'
                    }`}
                  >
                    <option value="verified">Verified Partner</option>
                    <option value="pending">Pending Review</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                {/* Contact info */}
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-800 font-medium">{owner.mobileNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">NIC:</span>
                    <span className="font-mono text-slate-700">{owner.nicPassport}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span>Address:</span>
                    <span className="text-slate-700">{owner.address}</span>
                  </div>
                </div>
              </div>

              {/* Stats & Quick WhatsApp */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Fleet & Payouts</span>
                  <strong className="text-slate-800">
                    {owner.vehiclesCount || 1} Vehicle(s) | Rs. {(owner.totalEarnings || 0).toLocaleString()}
                  </strong>
                </div>

                <a
                  href={`https://wa.me/${owner.whatsappNumber.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition shadow-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Chat
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DRIVERS TAB CONTENT */}
      {activeSubTab === 'drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map(driver => (
            <div
              key={driver.id}
              className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-slate-500">{driver.id}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          driver.driverType === 'captain'
                            ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {driver.driverType === 'captain' ? '⛵ Boat Captain' : '🚗 Vehicle Driver'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{driver.fullName}</h3>
                  </div>

                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    {driver.rating}
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Licence No:</span>
                    <strong className="font-mono text-slate-800">{driver.licenceNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Class:</span>
                    <span className="text-slate-700">{driver.licenceClass}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Licence Valid Till:</span>
                    <span className="text-emerald-700 font-semibold">{driver.licenceExpiry}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="text-slate-800 font-medium">{driver.mobile}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Experience: {driver.experienceYears || 5} Years</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Verified & Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Owner Modal */}
      {isAddingOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm">Register Transport / Boat Owner</h3>
              <button onClick={() => setIsAddingOwner(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveOwner} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anthony Fernando"
                  value={ownerFullName}
                  onChange={e => setOwnerFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mobile / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 077 123 4567"
                  value={ownerMobile}
                  onChange={e => setOwnerMobile(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">NIC or Passport</label>
                <input
                  type="text"
                  placeholder="e.g. 198012345678"
                  value={ownerNic}
                  onChange={e => setOwnerNic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Business Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Fernando Travels & Tours"
                  value={ownerBusinessName}
                  onChange={e => setOwnerBusinessName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingOwner(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs">
                  Save Owner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Driver Modal */}
      {isAddingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm">Register Driver or Boat Captain</h3>
              <button onClick={() => setIsAddingDriver(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDriver} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Role Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDriverType('driver')}
                    className={`flex-1 py-1.5 rounded-lg font-bold ${
                      driverType === 'driver' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Vehicle Driver
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverType('captain')}
                    className={`flex-1 py-1.5 rounded-lg font-bold ${
                      driverType === 'captain' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Boat Captain
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunil Weerasinghe"
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 077 234 5678"
                  value={driverMobile}
                  onChange={e => setDriverMobile(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Licence / Master Certificate Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B1290384 or MSD-CPT-491"
                  value={driverLicenceNo}
                  onChange={e => setDriverLicenceNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingDriver(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-xs">
                  Save Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
