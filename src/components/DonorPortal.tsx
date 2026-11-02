import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  Droplet,
  Heart,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  XCircle,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizePayload } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { calculateHaversineDistance, isBloodCompatible } from '../lib/compatibility';
import { DonorAvailability, DonorResponse, Requisition, ResponseStatus } from '../types';

export const DonorPortal: React.FC = () => {
  const { user, donorProfile, updateDonorProfile } = useAuth();

  const [allRequisitions, setAllRequisitions] = useState<Requisition[]>([]);
  const [donorResponses, setDonorResponses] = useState<Record<string, DonorResponse>>({});
  const [loadingRequisitions, setLoadingRequisitions] = useState<boolean>(true);
  const [updatingAvailability, setUpdatingAvailability] = useState<boolean>(false);
  const [submittingResponse, setSubmittingResponse] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'MATCHING' | 'HISTORY'>('MATCHING');

  // 1. Listen in real-time to OPEN requisitions
  useEffect(() => {
    if (!user || !donorProfile) return;
    const reqPath = 'requisitions';

    const q = query(
      collection(db, reqPath),
      where('status', '==', 'OPEN')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Requisition[] = [];
        snapshot.forEach((snap) => {
          list.push(snap.data() as Requisition);
        });

        // Sort by urgency, then creation time
        const urgencyWeight: Record<string, number> = {
          IMMEDIATE: 4,
          CRITICAL: 3,
          HIGH: 2,
          NORMAL: 1,
        };

        list.sort((a, b) => {
          const wA = urgencyWeight[a.urgency] || 0;
          const wB = urgencyWeight[b.urgency] || 0;
          if (wB !== wA) return wB - wA;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setAllRequisitions(list);
        setLoadingRequisitions(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, reqPath);
      }
    );

    return () => unsubscribe();
  }, [user, donorProfile]);

  // 2. Listen in real-time to responses submitted by this donor
  useEffect(() => {
    if (!user) return;
    const respPath = 'responses';

    const q = query(
      collection(db, respPath),
      where('donorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const respMap: Record<string, DonorResponse> = {};
        snapshot.forEach((snap) => {
          const data = snap.data() as DonorResponse;
          respMap[data.requisitionId] = data;
        });
        setDonorResponses(respMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, respPath);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle Quick Availability Toggle
  const handleToggleAvailability = async (nextStatus: DonorAvailability) => {
    if (!donorProfile) return;
    setUpdatingAvailability(true);
    try {
      await updateDonorProfile({
        fullName: donorProfile.fullName,
        bloodGroup: donorProfile.bloodGroup,
        phone: donorProfile.phone,
        city: donorProfile.city,
        district: donorProfile.district,
        state: donorProfile.state,
        latitude: donorProfile.latitude,
        longitude: donorProfile.longitude,
        availability: nextStatus,
        lastDonationDate: donorProfile.lastDonationDate,
        totalDonations: donorProfile.totalDonations,
      });
    } catch (err) {
      console.error('Failed to update availability:', err);
    } finally {
      setUpdatingAvailability(false);
    }
  };

  // Submit Donor Response (Accept or Decline)
  const handleRespond = async (requisition: Requisition, status: ResponseStatus) => {
    if (!user || !donorProfile) return;
    const responseId = `${requisition.requisitionId}_${donorProfile.donorId}`;
    const path = `responses/${responseId}`;
    setSubmittingResponse(requisition.requisitionId);

    try {
      const distanceKm = calculateHaversineDistance(
        requisition.latitude,
        requisition.longitude,
        donorProfile.latitude,
        donorProfile.longitude
      );

      const now = new Date().toISOString();
      const responseData: DonorResponse = {
        responseId,
        requisitionId: requisition.requisitionId,
        donorId: donorProfile.donorId,
        hospitalId: requisition.hospitalId,
        donorName: donorProfile.fullName,
        donorBloodGroup: donorProfile.bloodGroup,
        donorPhone: donorProfile.phone,
        status,
        distanceKm,
        createdAt: donorResponses[requisition.requisitionId]?.createdAt || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'responses', responseId), sanitizePayload(responseData), { merge: true });
    } catch (err) {
      console.error('Failed to submit donor response:', err);
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setSubmittingResponse(null);
    }
  };

  if (!donorProfile) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-lg mx-auto shadow-xs">
        <Heart className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Complete Your Donor Profile</h2>
        <p className="text-sm text-gray-600 mt-1 mb-4">
          Please register your blood group, contact phone, and location to activate automatic matching with emergency hospital requisitions.
        </p>
      </div>
    );
  }

  // STRICT COMPATIBILITY & RADIUS MATCHING RULES:
  // A donor ONLY sees requisitions for which:
  // 1. Donor is AVAILABLE
  // 2. Donor blood group can donate to requisition blood group
  // 3. Distance between donor and hospital <= requisition.radiusKm
  const isAvailable = donorProfile.availability === 'AVAILABLE';

  const matchingRequisitions = allRequisitions
    .map((req) => {
      const distanceKm = calculateHaversineDistance(
        req.latitude,
        req.longitude,
        donorProfile.latitude,
        donorProfile.longitude
      );
      const isCompatible = isBloodCompatible(donorProfile.bloodGroup, req.bloodGroup);
      const isWithinRadius = distanceKm <= req.radiusKm;
      const isExactMatch = donorProfile.bloodGroup === req.bloodGroup;

      return {
        req,
        distanceKm,
        isCompatible,
        isWithinRadius,
        isExactMatch,
        isEligible: isAvailable && isCompatible && isWithinRadius,
      };
    })
    .filter((item) => item.isEligible);

  const respondedItems = allRequisitions.filter(
    (req) => donorResponses[req.requisitionId] !== undefined
  );

  return (
    <div className="space-y-6">
      {/* Donor Overview Hero */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex flex-col items-center justify-center shadow-lg shadow-red-200 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-100">Blood</span>
            <span className="text-xl font-black leading-none">{donorProfile.bloodGroup}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-gray-900">{donorProfile.fullName}</h1>
              <span className="bg-red-50 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full border border-red-200">
                Registered Lifesaver
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>{donorProfile.city}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{donorProfile.phone}</span>
              </span>
              <span>·</span>
              <span>{donorProfile.totalDonations || 0} lifetime donations</span>
            </div>
          </div>
        </div>

        {/* Live Availability Toggle Bar */}
        <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Availability Status
            </div>
            <div className="text-xs font-bold">
              {donorProfile.availability === 'AVAILABLE' ? (
                <span className="text-emerald-600 font-extrabold flex items-center gap-1 justify-end">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Available for Emergency Calls
                </span>
              ) : donorProfile.availability === 'RECENTLY_DONATED' ? (
                <span className="text-amber-600 font-bold">Resting (Recently Donated)</span>
              ) : (
                <span className="text-gray-500 font-bold">Temporarily Unavailable</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-2xs">
            <button
              onClick={() => handleToggleAvailability('AVAILABLE')}
              disabled={updatingAvailability || donorProfile.availability === 'AVAILABLE'}
              className={`px-2.5 py-1 text-xs font-bold rounded transition ${
                donorProfile.availability === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => handleToggleAvailability('UNAVAILABLE')}
              disabled={updatingAvailability || donorProfile.availability === 'UNAVAILABLE'}
              className={`px-2.5 py-1 text-xs font-bold rounded transition ${
                donorProfile.availability === 'UNAVAILABLE'
                  ? 'bg-gray-700 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Pause
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('MATCHING')}
            className={`pb-2 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'MATCHING'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Droplet className="w-4 h-4 fill-red-600 text-red-600" />
            <span>Matching Emergency Requisitions ({matchingRequisitions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-2 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'HISTORY'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>My Response History ({respondedItems.length})</span>
          </button>
        </div>

        <div className="text-xs text-gray-500 hidden sm:block">
          Compatibility: <strong>Your {donorProfile.bloodGroup}</strong> is matched strictly by clinical protocols.
        </div>
      </div>

      {/* Tab Content: Matching Requisitions */}
      {activeTab === 'MATCHING' && (
        <div className="space-y-4">
          {!isAvailable && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
              <div>
                <strong>You are currently marked as Unavailable.</strong> Matching emergency requisitions are paused until you switch back to Available.
              </div>
              <button
                onClick={() => handleToggleAvailability('AVAILABLE')}
                className="bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-amber-700 transition"
              >
                Mark Available
              </button>
            </div>
          )}

          {loadingRequisitions ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-500 text-xs">
              <RefreshCw className="w-6 h-6 text-red-600 animate-spin mx-auto mb-2" />
              Scanning for active matching emergency requisitions...
            </div>
          ) : matchingRequisitions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500">
              <Heart className="w-12 h-12 text-red-200 mx-auto mb-3" />
              <h3 className="font-bold text-base text-gray-800">No Matching Emergency Requisitions</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                No hospitals currently require your blood group ({donorProfile.bloodGroup}) within their configured search radius.
                The moment an emergency is broadcast, it will appear here in real time.
              </p>
              <div className="mt-4 p-3 bg-red-50/50 rounded-xl border border-red-100 max-w-sm mx-auto text-[11px] text-gray-600">
                You can switch to the Hospital Portal to dispatch an emergency requisition matching <strong>{donorProfile.bloodGroup}</strong> to test this instantly.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {matchingRequisitions.map(({ req, distanceKm, isExactMatch }) => {
                const existingResponse = donorResponses[req.requisitionId];
                const isAccepted = existingResponse?.status === 'ACCEPTED';
                const isDeclined = existingResponse?.status === 'DECLINED';
                const isSubmittingThis = submittingResponse === req.requisitionId;

                return (
                  <div
                    key={req.requisitionId}
                    className={`bg-white rounded-2xl border-2 transition-all p-6 shadow-xs relative overflow-hidden ${
                      isAccepted
                        ? 'border-emerald-500 bg-emerald-50/10'
                        : isDeclined
                        ? 'border-gray-200 bg-gray-50/50 opacity-80'
                        : req.urgency === 'IMMEDIATE'
                        ? 'border-red-400 ring-2 ring-red-100'
                        : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    {/* Urgency indicator strip */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1.5 ${
                        req.urgency === 'IMMEDIATE'
                          ? 'bg-red-600'
                          : req.urgency === 'CRITICAL'
                          ? 'bg-orange-500'
                          : req.urgency === 'HIGH'
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                    />

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Left: Requisition Details */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
                              req.urgency === 'IMMEDIATE'
                                ? 'bg-red-600 text-white'
                                : req.urgency === 'CRITICAL'
                                ? 'bg-orange-600 text-white'
                                : req.urgency === 'HIGH'
                                ? 'bg-amber-500 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {req.urgency} CALL
                          </span>

                          <span className="text-xs font-bold text-gray-500">
                            Requisition #{req.requisitionId.slice(-6)}
                          </span>

                          {isExactMatch ? (
                            <span className="bg-red-100 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-red-200">
                              Exact Group Match ({req.bloodGroup})
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-amber-200">
                              Compatible Universal Match ({donorProfile.bloodGroup} for {req.bloodGroup})
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-red-600 shrink-0" />
                          <span>{req.hospitalName}</span>
                        </h3>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-1">
                          <span className="flex items-center gap-1 font-semibold text-gray-900">
                            <Droplet className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                            <span>Units Required: <strong>{req.unitsRequired} Pints</strong></span>
                          </span>

                          <span className="flex items-center gap-1 font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                            <Compass className="w-3.5 h-3.5" />
                            <span>{distanceKm} km from you</span>
                          </span>

                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>{req.address}, {req.city}</span>
                          </span>
                        </div>

                        {req.notes && (
                          <div className="text-xs text-gray-600 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                            "{req.notes}"
                          </div>
                        )}
                      </div>

                      {/* Right: Accept / Decline Response Actions */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-3 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                        {isAccepted ? (
                          <div className="w-full sm:w-auto text-right space-y-2">
                            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-md shadow-emerald-200">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>You Accepted This Requisition</span>
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Hospital triage has been notified in real time.
                            </div>
                            <a
                              href={`tel:${req.hospitalPhone}`}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call Hospital: {req.hospitalPhone}</span>
                            </a>
                          </div>
                        ) : isDeclined ? (
                          <div className="w-full sm:w-auto text-right space-y-1.5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 font-bold text-xs">
                              <XCircle className="w-4 h-4" />
                              <span>You Declined This Request</span>
                            </div>
                            <button
                              onClick={() => handleRespond(req, 'ACCEPTED')}
                              disabled={isSubmittingThis}
                              className="block text-[11px] text-red-600 hover:underline font-semibold ml-auto"
                            >
                              Change to Accept
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleRespond(req, 'DECLINED')}
                              disabled={isSubmittingThis}
                              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-xs transition"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRespond(req, 'ACCEPTED')}
                              disabled={isSubmittingThis}
                              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-200 transition"
                            >
                              <Heart className="w-4 h-4 fill-white" />
                              <span>{isSubmittingThis ? 'Confirming...' : 'Accept Call'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: History */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-3">
          {respondedItems.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-500 text-xs">
              No historical responses yet.
            </div>
          ) : (
            respondedItems.map((req) => {
              const resp = donorResponses[req.requisitionId];
              const isAccepted = resp?.status === 'ACCEPTED';

              return (
                <div
                  key={req.requisitionId}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg font-black text-xs flex items-center justify-center ${
                        isAccepted ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {req.bloodGroup}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">{req.hospitalName}</div>
                      <div className="text-xs text-gray-500">
                        {req.unitsRequired} units · {req.city} · Responded on{' '}
                        {new Date(resp.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-black uppercase px-2.5 py-1 rounded-full ${
                        isAccepted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}
                    >
                      {resp.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
