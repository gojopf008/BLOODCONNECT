import React, { useState } from 'react';
import { CheckCircle2, Crosshair, Droplet, Heart, MapPin, Phone, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BloodGroup, DonorAvailability, DonorProfile } from '../types';

interface DonorRegistrationProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PRESET_DONORS = [
  {
    fullName: 'Alex Vance',
    bloodGroup: 'O-' as BloodGroup,
    phone: '+1 (555) 789-0123',
    city: 'Metropolis',
    district: 'Central Metro',
    state: 'State Medical Zone',
    latitude: 37.7833,
    longitude: -122.4167,
    availability: 'AVAILABLE' as DonorAvailability,
    totalDonations: 6,
    lastDonationDate: '2026-06-15',
  },
  {
    fullName: 'Elena Rostova',
    bloodGroup: 'A+' as BloodGroup,
    phone: '+1 (555) 890-1234',
    city: 'Metropolis East',
    district: 'River Valley',
    state: 'State Medical Zone',
    latitude: 37.7950,
    longitude: -122.3980,
    availability: 'AVAILABLE' as DonorAvailability,
    totalDonations: 3,
    lastDonationDate: '2026-08-01',
  },
];

export const DonorRegistration: React.FC<DonorRegistrationProps> = ({ onSuccess, onCancel }) => {
  const { donorProfile, updateDonorProfile, user } = useAuth();

  const [formData, setFormData] = useState({
    fullName: donorProfile?.fullName || user?.displayName || '',
    bloodGroup: (donorProfile?.bloodGroup || 'O+') as BloodGroup,
    phone: donorProfile?.phone || '',
    city: donorProfile?.city || '',
    district: donorProfile?.district || '',
    state: donorProfile?.state || '',
    latitude: donorProfile?.latitude ?? 37.7833,
    longitude: donorProfile?.longitude ?? -122.4167,
    availability: (donorProfile?.availability || 'AVAILABLE') as DonorAvailability,
    lastDonationDate: donorProfile?.lastDonationDate || '',
    totalDonations: donorProfile?.totalDonations ?? 1,
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

  const applyPreset = (preset: typeof PRESET_DONORS[0]) => {
    setFormData({
      ...preset,
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) return setError('Full name is required.');
    if (!formData.phone.trim()) return setError('Phone number is required for emergency dispatch.');
    if (!formData.city.trim()) return setError('City is required.');

    setSubmitting(true);
    try {
      await updateDonorProfile({
        fullName: formData.fullName.trim(),
        bloodGroup: formData.bloodGroup,
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        district: formData.district.trim(),
        state: formData.state.trim(),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        availability: formData.availability,
        lastDonationDate: formData.lastDonationDate || undefined,
        totalDonations: Number(formData.totalDonations) || 0,
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to save donor profile:', err);
      setError('Failed to save profile. Please verify that all inputs are valid.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-red-600 to-rose-600 p-6 text-white flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs mb-2">
            <Heart className="w-3.5 h-3.5" />
            <span>Lifesaver Network Registry</span>
          </div>
          <h2 className="text-2xl font-bold">
            {donorProfile ? 'Update Donor Profile' : 'Donor Profile Registration'}
          </h2>
          <p className="text-red-100 text-sm mt-1 max-w-xl">
            Register your blood group, current availability, and contact hotline to be instantly notified when emergency requisitions match your profile.
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
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
            Quick Setup Presets (Optional)
          </span>
          <div className="grid sm:grid-cols-2 gap-2">
            {PRESET_DONORS.map((preset, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => applyPreset(preset)}
                className="text-left p-3 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50/30 transition text-xs flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-gray-800">{preset.fullName} ({preset.bloodGroup})</div>
                  <div className="text-gray-500">{preset.city} · {preset.availability}</div>
                </div>
                <span className="text-red-600 font-bold ml-2">Load</span>
              </button>
            ))}
          </div>
        </div>

        {/* Blood Group Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
            Blood Group *
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {BLOOD_GROUPS.map((bg) => (
              <button
                type="button"
                key={bg}
                onClick={() => setFormData({ ...formData, bloodGroup: bg })}
                className={`py-3 rounded-xl font-extrabold text-base transition-all border ${
                  formData.bloodGroup === bg
                    ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-200 ring-2 ring-red-200'
                    : 'bg-white text-gray-800 border-gray-200 hover:border-red-300 hover:bg-red-50/30'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
          {formData.bloodGroup === 'O-' && (
            <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
              <Droplet className="w-3.5 h-3.5 fill-red-600" />
              <span>Universal Red Blood Cell Donor: Your blood can save patients of any blood group.</span>
            </p>
          )}
          {formData.bloodGroup === 'AB+' && (
            <p className="text-xs text-amber-700 font-medium mt-2">
              Universal Plasma Donor / Universal Recipient.
            </p>
          )}
        </div>

        {/* Availability Status */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
            Current Availability Status *
          </label>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              {
                id: 'AVAILABLE' as DonorAvailability,
                label: 'Available for Emergency Call',
                desc: 'Ready to respond if nearby emergency requisition occurs',
                color: 'border-emerald-500 bg-emerald-50 text-emerald-800',
              },
              {
                id: 'UNAVAILABLE' as DonorAvailability,
                label: 'Currently Unavailable',
                desc: 'Traveling, medical pause, or temporarily unable to donate',
                color: 'border-gray-300 bg-gray-50 text-gray-700',
              },
              {
                id: 'RECENTLY_DONATED' as DonorAvailability,
                label: 'Recently Donated (Resting)',
                desc: 'In mandatory clinical inter-donation rest interval',
                color: 'border-amber-400 bg-amber-50 text-amber-800',
              },
            ].map((status) => (
              <button
                type="button"
                key={status.id}
                onClick={() => setFormData({ ...formData, availability: status.id })}
                className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                  formData.availability === status.id
                    ? `${status.color} font-semibold ring-2 ring-red-100`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="text-xs font-bold">{status.label}</div>
                <div className="text-[11px] text-gray-500 mt-1">{status.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Personal Details */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Phone Number (For Hospital Triage Call) *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Location (City, District, State) */}
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
              District
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
              State
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
                Donor GPS Coordinates (Used for Haversine Radius Matching)
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

        {/* Donation History (Features for XGBoost) */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Last Donation Date (Optional)
            </label>
            <input
              type="date"
              value={formData.lastDonationDate}
              onChange={(e) => setFormData({ ...formData, lastDonationDate: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Used by XGBoost recovery evaluation (56+ days safe clinical interval).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Total Lifetime Donations
            </label>
            <input
              type="number"
              min="0"
              value={formData.totalDonations}
              onChange={(e) => setFormData({ ...formData, totalDonations: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Provides historical commitment weighting in response scoring.
            </p>
          </div>
        </div>

        {/* Action buttons */}
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
            <span>{submitting ? 'Saving Profile...' : 'Save Donor Profile'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
