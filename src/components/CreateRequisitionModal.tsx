import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Droplet, MapPin, ShieldAlert, Sliders, X } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizePayload } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { BloodGroup, Requisition, UrgencyLevel } from '../types';

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (requisitionId: string) => void;
}

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const URGENCY_LEVELS: { id: UrgencyLevel; label: string; desc: string; badgeClass: string }[] = [
  {
    id: 'IMMEDIATE',
    label: 'Immediate (Code Red)',
    desc: 'Critical trauma / active surgery emergency (response needed < 30 mins)',
    badgeClass: 'bg-red-600 text-white border-red-700',
  },
  {
    id: 'CRITICAL',
    label: 'Critical Priority',
    desc: 'Severe loss / impending operation (response needed < 2 hours)',
    badgeClass: 'bg-orange-600 text-white border-orange-700',
  },
  {
    id: 'HIGH',
    label: 'High Priority',
    desc: 'Scheduled urgent transfusion (response needed within today)',
    badgeClass: 'bg-amber-500 text-white border-amber-600',
  },
  {
    id: 'NORMAL',
    label: 'Standard Requisition',
    desc: 'Blood bank replenishment / elective procedure reservation',
    badgeClass: 'bg-blue-600 text-white border-blue-700',
  },
];

export const CreateRequisitionModal: React.FC<CreateRequisitionModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { hospitalProfile, user } = useAuth();

  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [unitsRequired, setUnitsRequired] = useState<number>(2);
  const [urgency, setUrgency] = useState<UrgencyLevel>('IMMEDIATE');
  const [radiusKm, setRadiusKm] = useState<number>(25);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!hospitalProfile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">Hospital Profile Required</h3>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            Please complete your hospital profile registration before dispatching emergency blood requisitions.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition"
          >
            Configure Profile
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    if (unitsRequired < 1 || unitsRequired > 50) {
      setError('Units required must be between 1 and 50.');
      return;
    }

    setSubmitting(true);
    const requisitionId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const path = `requisitions/${requisitionId}`;

    try {
      const now = new Date().toISOString();
      const payload: Record<string, any> = {
        requisitionId,
        hospitalId: user.uid,
        hospitalName: hospitalProfile.name,
        hospitalPhone: hospitalProfile.phone,
        bloodGroup,
        unitsRequired: Number(unitsRequired),
        urgency,
        status: 'OPEN',
        address: hospitalProfile.address,
        city: hospitalProfile.city,
        latitude: hospitalProfile.latitude,
        longitude: hospitalProfile.longitude,
        radiusKm: Number(radiusKm),
        createdAt: now,
        updatedAt: now,
      };

      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      await setDoc(doc(db, 'requisitions', requisitionId), sanitizePayload(payload));
      onCreated(requisitionId);
      onClose();
    } catch (err) {
      console.error('Failed to create requisition:', err);
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-8">
        <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Create Emergency Blood Requisition
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Hospital: <span className="font-semibold text-gray-700">{hospitalProfile.name}</span> ({hospitalProfile.city})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Blood Group */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Required Blood Group *
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {BLOOD_GROUPS.map((bg) => (
                <button
                  type="button"
                  key={bg}
                  onClick={() => setBloodGroup(bg)}
                  className={`py-2.5 rounded-xl font-black text-base transition-all border ${
                    bloodGroup === bg
                      ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-200'
                      : 'bg-white text-gray-800 border-gray-200 hover:border-red-300 hover:bg-red-50/20'
                  }`}
                >
                  {bg}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Strict compatibility rules will automatically identify both exact match donors and universal donors.
            </p>
          </div>

          {/* Units Required & Urgency */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Units Required (Pints) *
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={unitsRequired}
                  onChange={(e) => setUnitsRequired(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-base font-bold text-gray-900"
                />
                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Units (450ml ea)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Urgency Level *
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm font-semibold"
              >
                {URGENCY_LEVELS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Urgency Description Card */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-gray-800">
                {URGENCY_LEVELS.find((u) => u.id === urgency)?.label}
              </div>
              <div>{URGENCY_LEVELS.find((u) => u.id === urgency)?.desc}</div>
            </div>
          </div>

          {/* Matching Radius Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-red-600" />
                <span>Donor Search Radius (Haversine Distance)</span>
              </label>
              <span className="text-sm font-extrabold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                {radiusKm} km
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
              className="w-full accent-red-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>5 km (Local)</span>
              <span>25 km (Metro)</span>
              <span>50 km (Regional)</span>
              <span>100 km (Extended)</span>
            </div>
          </div>

          {/* Clinical Notes / Patient Case */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
              Clinical Case Notes / Patient Ward (Optional)
            </label>
            <textarea
              rows={2}
              maxLength={400}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. ICU Trauma Bay 4, O-Negative massive transfusion protocol activated."
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>

          {/* Location Summary */}
          <div className="text-xs text-gray-500 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              Requisition dispatched from: <strong>{hospitalProfile.address}, {hospitalProfile.city}</strong> (
              {hospitalProfile.latitude}, {hospitalProfile.longitude})
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-lg shadow-md shadow-red-200 transition"
            >
              <Droplet className="w-4 h-4 fill-white" />
              <span>{submitting ? 'Broadcasting Emergency...' : 'Broadcast Requisition'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
