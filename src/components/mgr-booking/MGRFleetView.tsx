/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Car,
  Bus,
  Ship,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  Wind,
  ShieldCheck,
  Search,
  X,
  Compass,
} from 'lucide-react';
import { TransportVehicle, TransportType, DriverOption, TransportOwner } from '../../types/mgrBooking';

interface MGRFleetViewProps {
  vehicles: TransportVehicle[];
  owners: TransportOwner[];
  onAddVehicle: (newVehicle: TransportVehicle) => void;
  onUpdateStatus: (vehicleId: string, status: TransportVehicle['status']) => void;
  themeMode?: 'dark' | 'light';
}

export const MGRFleetView: React.FC<MGRFleetViewProps> = ({
  vehicles,
  owners,
  onAddVehicle,
  onUpdateStatus,
  themeMode = 'light',
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);

  // New vehicle form state
  const [newType, setNewType] = useState<TransportType>('van');
  const [newOwnerId, setNewOwnerId] = useState(owners[0]?.id || 'OWN-MGR-00001');
  const [newRegNumber, setNewRegNumber] = useState('');
  const [newMake, setNewMake] = useState('Toyota');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState(2020);
  const [newColor, setNewColor] = useState('White');
  const [newHasAC, setNewHasAC] = useState(true);
  const [newTotalSeats, setNewTotalSeats] = useState(12);
  const [newDriverOption, setNewDriverOption] = useState<DriverOption>('with_driver');
  const [newBasePrice, setNewBasePrice] = useState(18000);
  const [newPricePerSeat, setNewPricePerSeat] = useState<number | undefined>(1800);
  const [newDescription, setNewDescription] = useState('');
  const [newInsuranceExpiry, setNewInsuranceExpiry] = useState('2027-06-30');
  const [newRevenueLicenceExpiry, setNewRevenueLicenceExpiry] = useState('2027-06-30');

  // Boat specific inputs
  const [newBoatName, setNewBoatName] = useState('');
  const [newDeparturePoint, setNewDeparturePoint] = useState('Thalaimannar Pier');
  const [newDestination, setNewDestination] = useState("Adam's Bridge Sandbanks");
  const [newLifeJackets, setNewLifeJackets] = useState(true);

  const filteredVehicles = vehicles.filter(v => {
    const matchesType = selectedType === 'all' || v.type === selectedType;
    const matchesSearch =
      v.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.ownerName && v.ownerName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const checkExpiryWarning = (dateStr: string) => {
    const expiry = new Date(dateStr).getTime();
    const now = Date.now();
    const daysRemaining = Math.floor((expiry - now) / (1000 * 3600 * 24));
    if (daysRemaining < 0) return { status: 'expired', label: 'Expired', class: 'bg-rose-100 text-rose-800 border-rose-200' };
    if (daysRemaining < 45) return { status: 'expiring_soon', label: `Expires in ${daysRemaining}d`, class: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { status: 'valid', label: 'Valid', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegNumber || !newModel) return;

    const matchedOwner = owners.find(o => o.id === newOwnerId);
    const idPrefix = newType === 'car' ? 'MGR-CAR' : newType === 'van' ? 'MGR-VAN' : newType === 'bus' ? 'MGR-BUS' : 'MGR-BOAT';
    const newVehicle: TransportVehicle = {
      id: `${idPrefix}-${Math.floor(10000 + Math.random() * 90000)}`,
      ownerId: newOwnerId,
      ownerName: matchedOwner?.fullName || 'Registered Owner',
      type: newType,
      registrationNumber: newRegNumber,
      make: newMake,
      model: newModel,
      year: Number(newYear),
      color: newColor,
      hasAC: newHasAC,
      totalSeats: Number(newTotalSeats),
      driverOption: newDriverOption,
      description: newDescription || `${newMake} ${newModel} passenger transport service.`,
      photos: [],
      insuranceExpiry: newInsuranceExpiry,
      revenueLicenceExpiry: newRevenueLicenceExpiry,
      status: 'active',
      basePrice: Number(newBasePrice),
      pricingMethod: newType === 'bus' || newType === 'boat' ? 'per_seat' : 'fixed',
      pricePerSeat: newPricePerSeat ? Number(newPricePerSeat) : undefined,
      boatDetails: newType === 'boat' ? {
        boatName: newBoatName || newModel,
        boatType: 'tour',
        departurePoint: newDeparturePoint,
        destination: newDestination,
        lifeJacketsAvailable: newLifeJackets,
        safetyCertificateExpiry: '2027-06-30',
      } : undefined,
      rating: 5.0,
      tripsCount: 0,
      createdAt: Date.now(),
    };

    onAddVehicle(newVehicle);
    setIsAddingVehicle(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search fleet by reg #, model, make, or owner..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Fleet' },
            { id: 'car', label: 'Cars' },
            { id: 'van', label: 'Vans' },
            { id: 'bus', label: 'Buses' },
            { id: 'boat', label: 'Boats' },
          ].map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedType(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                selectedType === c.id
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Add Transport Button */}
        <button
          type="button"
          onClick={() => setIsAddingVehicle(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Register Vehicle / Boat
        </button>
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map(vehicle => {
          const insAlert = checkExpiryWarning(vehicle.insuranceExpiry);
          const revAlert = checkExpiryWarning(vehicle.revenueLicenceExpiry);

          return (
            <div
              key={vehicle.id}
              className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {vehicle.registrationNumber}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                      {vehicle.type}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <p className="text-[11px] text-slate-500">Owner: {vehicle.ownerName || 'Verified Partner'}</p>
                </div>

                {/* Status Toggle */}
                <select
                  value={vehicle.status}
                  onChange={e => onUpdateStatus(vehicle.id, e.target.value as any)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-white cursor-pointer focus:outline-none ${
                    vehicle.status === 'active'
                      ? 'text-emerald-700 border-emerald-300'
                      : vehicle.status === 'maintenance'
                      ? 'text-amber-700 border-amber-300'
                      : 'text-rose-700 border-rose-300'
                  }`}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              {/* Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Capacity</span>
                  <strong>{vehicle.totalSeats} Passengers</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Climate</span>
                  <strong>{vehicle.hasAC ? 'AC Equipped' : 'Non-AC'}</strong>
                </div>
              </div>

              {/* Boat specific info */}
              {vehicle.type === 'boat' && vehicle.boatDetails && (
                <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-[11px] text-cyan-900 space-y-0.5">
                  <div className="font-bold flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-cyan-700" />
                    {vehicle.boatDetails.boatName}
                  </div>
                  <div className="text-slate-600">Departure: {vehicle.boatDetails.departurePoint}</div>
                </div>
              )}

              {/* Document Expiry Alerts */}
              <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Insurance ({vehicle.insuranceExpiry}):</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${insAlert.class}`}>
                    {insAlert.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Revenue Lic ({vehicle.revenueLicenceExpiry}):</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${revAlert.class}`}>
                    {revAlert.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Transport Modal */}
      {isAddingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Register New Vehicle or Boat
              </h3>
              <button
                onClick={() => setIsAddingVehicle(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs bg-white">
              {/* Transport Category */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Transport Category <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['car', 'van', 'bus', 'boat'] as TransportType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewType(t)}
                      className={`py-2 rounded-xl font-bold uppercase transition ${
                        newType === t
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Owner */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Assigned Owner <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newOwnerId}
                  onChange={e => setNewOwnerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                >
                  {owners.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.fullName} ({o.businessName || o.nicPassport})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reg & Make / Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Registration No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WP ND-1234 or SL-MN-01"
                    value={newRegNumber}
                    onChange={e => setNewRegNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Make / Brand <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Toyota, Neil Marine"
                    value={newMake}
                    onChange={e => setNewMake(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Model Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HiAce KDH / Island Cruiser"
                    value={newModel}
                    onChange={e => setNewModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Total Seats</label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={newTotalSeats}
                    onChange={e => setNewTotalSeats(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Boat specific fields */}
              {newType === 'boat' && (
                <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 space-y-3">
                  <h4 className="font-bold text-cyan-900">Boat Specific Information</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Boat Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Mannar Pearl"
                        value={newBoatName}
                        onChange={e => setNewBoatName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1">Departure Point</label>
                      <input
                        type="text"
                        value={newDeparturePoint}
                        onChange={e => setNewDeparturePoint(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Whole Vehicle Base Price (Rs.)</label>
                  <input
                    type="number"
                    value={newBasePrice}
                    onChange={e => setNewBasePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Per Seat Price (if applicable)</label>
                  <input
                    type="number"
                    value={newPricePerSeat || ''}
                    placeholder="Optional"
                    onChange={e => setNewPricePerSeat(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingVehicle(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs"
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
