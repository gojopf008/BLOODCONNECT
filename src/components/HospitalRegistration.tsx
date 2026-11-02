import React, { useState } from 'react';
import { Building2, CheckCircle2, Crosshair, MapPin, Phone, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { HospitalProfile } from '../types';

interface HospitalRegistrationProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PRESET_HOSPITALS = [
  {
    name: 'City Trauma & General Hospital',
    registrationNumber: 'HOSP-2024-8841',
    address: '450 Health Sciences Parkway',
    city: 'Metropolis',
    district: 'Central District',
    state: 'State Medical Zone',
    latitude: 37.7749,
    longitude: -122.4194,
    phone: '+1 (555) 234-5678',
    emergencyContact: '+1 (555) 999-0112',
  },
  {
    name: 'Memorial Red Cross Medical Center',
    registrationNumber: 'HOSP-2023-1192',
    address: '100 Mercy Boulevard',
    city: 'Metropolis East',
    district: 'River Valley',
    state: 'State Medical Zone',
    latitude: 37.8044,
    longitude: -122.2712,
    phone: '+1 (555) 345-6789',
    emergencyContact: '+1 (555) 999-0114',
  },
];

export const HospitalRegistration: React.FC<HospitalRegistrationProps> = ({ onSuccess, onCancel }) => {
  const { hospitalProfile, updateHospitalProfile, user } = useAuth();

  const [formData, setFormData] = useState({
    name: hospitalProfile?.name || '',
    registrationNumber: hospitalProfile?.registrationNumber || '',
    phone: hospitalProfile?.phone || '',
    address: hospitalProfile?.address || '',
    city: hospitalProfile?.city || '',
    district: hospitalProfile?.district || '',
    state: hospitalProfile?.state || '',
    latitude: hospitalProfile?.latitude ?? 37.7749,
    longitude: hospitalProfile?.longitude ?? -122.4194,
    emergencyContact: hospitalProfile?.emergencyContact || '',
  });

  const [detectingLocation, setDetectingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: Math.round(pos.coords.latitude * 10000) / 10000,
          longitude: Math.round(pos.coords.longitude * 10000) / 10000,
        }));
        setDetectingLocation(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setError('Could not detect location. Please input coordinates manually or choose a preset.');
        setDetectingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  const applyPreset = (preset: typeof PRESET_HOSPITALS[0]) => {
    setFormData({
      ...preset,
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) return setError('Hospital name is required.');
    if (!formData.registrationNumber.trim()) return setError('Hospital license/registration number is required.');
    if (!formData.phone.trim()) return setError('Hospital primary telephone is required.');
    if (!formData.emergencyContact.trim()) return setError('Emergency contact number is required.');
    if (!formData.address.trim()) return setError('Physical address is required.');
    if (!formData.city.trim()) return setError('City is required.');

    setSubmitting(true);
    try {
      await updateHospitalProfile({
        name: formData.name.trim(),
        registrationNumber: formData.registrationNumber.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        emergencyContact: formData.emergencyContact.trim(),
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to save hospital profile:', err);
      setError('Failed to save profile. Please check that all fields are valid.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 p-6 text-white flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Healthcare Facility Credentialing</span>
          </div>
          <h2 className="text-2xl font-bold">
            {hospitalProfile ? 'Update Hospital Profile' : 'Hospital Registration'}
          </h2>
          <p className="text-red-100 text-sm mt-1 max-w-xl">
            Register your medical facility, emergency ward coordinates, and contact hotlines for emergency blood requisition dispatch.
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Quick Presets for Demo / Testing */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Quick Setup Presets (Optional)
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {PRESET_HOSPITALS.map((preset, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => applyPreset(preset)}
                className="text-left p-3 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50/30 transition text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-gray-800">{preset.name}</div>
                  <div className="text-gray-500">{preset.city} · {preset.registrationNumber}</div>
                </div>
                <span className="text-red-600 font-bold ml-2">Load</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hospital Identity */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Hospital / Clinical Center Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Saint Jude Emergency Hospital"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Medical License / Registration Number *
            </label>
            <input
              type="text"
              required
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
              placeholder="e.g. REG-HOSP-2024-9901"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>
        </div>

        {/* Phone & Emergency Contact */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Primary Hospital Telephone *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Emergency Blood Bank Hotline *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-red-500 absolute left-3 top-3" />
              <input
                type="tel"
                required
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                placeholder="+1 (555) 999-0112"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Physical Address */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
            Physical Hospital Address *
          </label>
          <input
            type="text"
            required
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Street address, building, wing..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
          />
        </div>

        {/* City, District, State */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              City *
            </label>
            <input
              type="text"
              required
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              District / County
            </label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              placeholder="District"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              State / Province
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="State"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>
        </div>

        {/* Geolocation Coordinates */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Hospital GPS Coordinates (Required for Haversine Matching)
              </span>
            </div>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-md transition"
            >
              <Crosshair className={`w-3.5 h-3.5 ${detectingLocation ? 'animate-spin' : ''}`} />
              <span>{detectingLocation ? 'Detecting...' : 'Detect GPS'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Submission buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm transition"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow-sm hover:shadow transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Saving Profile...' : 'Save Hospital Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
