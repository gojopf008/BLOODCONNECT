import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Cpu,
  Droplet,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import {
  DonorProfile,
  DonorResponse,
  Requisition,
  XGBoostRankedDonor,
} from '../types';
import { CreateRequisitionModal } from './CreateRequisitionModal';
import { XGBoostRankingBadge } from './XGBoostRankingBadge';
import { rankDonors } from '../lib/mlService';

export const HospitalPortal: React.FC = () => {
  const { user, hospitalProfile } = useAuth();

  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const [registeredDonors, setRegisteredDonors] = useState<DonorProfile[]>([]);
  const [allResponses, setAllResponses] = useState<DonorResponse[]>([]);
  const [rankedDonors, setRankedDonors] = useState<XGBoostRankedDonor[]>([]);
  const [isRanking, setIsRanking] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'RANKED_DONORS' | 'RESPONSES'>('RANKED_DONORS');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [loadingRequisitions, setLoadingRequisitions] = useState<boolean>(true);
  const [modelMeta, setModelMeta] = useState<string>('XGBoost GBDT Engine v2.1 (Active)');

  const selectedRequisition = requisitions.find((r) => r.requisitionId === selectedReqId) || requisitions[0] || null;

  // 1. Real-time listener for Hospital's Requisitions
  useEffect(() => {
    if (!user) return;
    const reqPath = 'requisitions';

    const q = query(
      collection(db, reqPath),
      where('hospitalId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Requisition[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as Requisition);
        });

        // Sort by creation time descending
        items.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setRequisitions(items);
        setLoadingRequisitions(false);

        // If no requisition selected or currently selected was removed, select the first
        if (items.length > 0 && (!selectedReqId || !items.some((i) => i.requisitionId === selectedReqId))) {
          setSelectedReqId(items[0].requisitionId);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, reqPath);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 2. Real-time listener for Registered Real Donors
  useEffect(() => {
    if (!user) return;
    const donorsPath = 'donors';

    const unsubscribe = onSnapshot(
      collection(db, donorsPath),
      (snapshot) => {
        const donorsList: DonorProfile[] = [];
        snapshot.forEach((dSnap) => {
          donorsList.push(dSnap.data() as DonorProfile);
        });
        setRegisteredDonors(donorsList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, donorsPath);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 3. Real-time listener for Donor Responses to this Hospital
  useEffect(() => {
    if (!user) {
      setAllResponses([]);
      return;
    }
    const responsesPath = 'responses';

    const q = query(
      collection(db, responsesPath),
      where('hospitalId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const respList: DonorResponse[] = [];
        snapshot.forEach((rSnap) => {
          respList.push(rSnap.data() as DonorResponse);
        });
        setAllResponses(respList);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, responsesPath);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Derived responses for the currently selected requisition
  const responses = React.useMemo(() => {
    if (!selectedRequisition) return [];
    const filtered = allResponses.filter((r) => r.requisitionId === selectedRequisition.requisitionId);
    return filtered.sort((a, b) => {
      if (a.status === 'ACCEPTED' && b.status !== 'ACCEPTED') return -1;
      if (b.status === 'ACCEPTED' && a.status !== 'ACCEPTED') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allResponses, selectedRequisition?.requisitionId]);

  // 4. Trigger XGBoost Donor Ranking whenever selected requisition or registered donors change
  useEffect(() => {
    if (!selectedRequisition || registeredDonors.length === 0) {
      setRankedDonors([]);
      return;
    }

    let isMounted = true;
    setIsRanking(true);

    rankDonors(selectedRequisition, registeredDonors)
      .then((ranked) => {
        if (!isMounted) return;

        // Augment with existing response statuses if already responded
        const augmented = ranked.map((r) => {
          const matchingResp = responses.find((resp) => resp.donorId === r.donor.donorId);
          return {
            ...r,
            responseStatus: matchingResp ? matchingResp.status : undefined,
          };
        });

        setRankedDonors(augmented);
        setIsRanking(false);
      })
      .catch((err) => {
        console.error('XGBoost ranking pipeline failed:', err);
        if (isMounted) setIsRanking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRequisition, registeredDonors, responses]);

  // Update Requisition Status (e.g. Fulfill or Cancel)
  const handleUpdateStatus = async (status: Requisition['status']) => {
    if (!selectedRequisition || !user) return;
    const path = `requisitions/${selectedRequisition.requisitionId}`;
    try {
      await updateDoc(doc(db, 'requisitions', selectedRequisition.requisitionId), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const acceptedResponses = responses.filter((r) => r.status === 'ACCEPTED');
  const declinedResponses = responses.filter((r) => r.status === 'DECLINED');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-200">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-gray-900">
                {hospitalProfile?.name || 'Hospital Emergency Portal'}
              </h1>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified Facility
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {hospitalProfile?.city || 'Emergency Dispatch'} · Hotline: {hospitalProfile?.emergencyContact || hospitalProfile?.phone || 'Configured in profile'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-md shadow-red-200 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Emergency Requisition</span>
        </button>
      </div>

      {/* Main Grid: Requisitions List on Left, Active Triage & XGBoost Ranking on Right */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Requisitions List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Droplet className="w-4 h-4 text-red-600 fill-red-600" />
              <span>Hospital Requisitions ({requisitions.length})</span>
            </h2>
          </div>

          {loadingRequisitions ? (
            <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-500 text-xs">
              <RefreshCw className="w-5 h-5 text-red-600 animate-spin mx-auto mb-2" />
              Connecting to real-time requisition feed...
            </div>
          ) : requisitions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
              <Droplet className="w-8 h-8 text-red-300 mx-auto mb-2" />
              <div className="font-semibold text-gray-800 text-sm">No Active Requisitions</div>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                You have not dispatched any emergency blood requisitions yet.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Requisition</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {requisitions.map((req) => {
                const isSelected = req.requisitionId === selectedReqId;
                const isFulfilled = req.status === 'FULFILLED';
                const isCancelled = req.status === 'CANCELLED';

                return (
                  <div
                    key={req.requisitionId}
                    onClick={() => setSelectedReqId(req.requisitionId)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative bg-white ${
                      isSelected
                        ? 'border-red-600 shadow-md ring-2 ring-red-100'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-red-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
                          {req.bloodGroup}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-gray-900">
                            {req.unitsRequired} Unit{req.unitsRequired > 1 ? 's' : ''} Needed
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          req.urgency === 'IMMEDIATE'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : req.urgency === 'CRITICAL'
                            ? 'bg-orange-100 text-orange-800 border-orange-300'
                            : req.urgency === 'HIGH'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        }`}
                      >
                        {req.urgency}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100 mt-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>Radius: {req.radiusKm} km</span>
                      </span>

                      <span
                        className={`font-bold ${
                          isFulfilled
                            ? 'text-emerald-600'
                            : isCancelled
                            ? 'text-gray-400'
                            : 'text-red-600'
                        }`}
                      >
                        ● {req.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Requisition Triage & XGBoost Donor Ranks */}
        <div className="lg:col-span-8 space-y-4">
          {selectedRequisition ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              {/* Selected Requisition Header */}
              <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600 text-white text-xs font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                        Requisition #{selectedRequisition.requisitionId.slice(-6)}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          selectedRequisition.status === 'OPEN'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : selectedRequisition.status === 'FULFILLED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                            : 'bg-gray-500/20 text-gray-300 border border-gray-400/30'
                        }`}
                      >
                        STATUS: {selectedRequisition.status}
                      </span>
                    </div>

                    <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      <span>Requires {selectedRequisition.unitsRequired} Units of</span>
                      <span className="text-red-400 font-extrabold underline decoration-red-500 decoration-2">
                        {selectedRequisition.bloodGroup} Blood
                      </span>
                    </h2>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-red-400" />
                        <span>Urgency: <strong>{selectedRequisition.urgency}</strong></span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                        <span>Search Range: <strong>{selectedRequisition.radiusKm} km</strong></span>
                      </span>
                      <span>Dispatched: {new Date(selectedRequisition.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center gap-2">
                    {selectedRequisition.status === 'OPEN' ? (
                      <>
                        <button
                          onClick={() => handleUpdateStatus('FULFILLED')}
                          className="flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Mark Fulfilled</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus('CANCELLED')}
                          className="flex items-center gap-1 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg transition"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus('OPEN')}
                        className="flex items-center gap-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reopen Requisition</span>
                      </button>
                    )}
                  </div>
                </div>

                {selectedRequisition.notes && (
                  <div className="mt-4 p-3 rounded-xl bg-gray-800/80 border border-gray-700 text-xs text-gray-200">
                    <span className="font-bold text-red-400">Clinical Notes:</span> {selectedRequisition.notes}
                  </div>
                )}
              </div>

              {/* Triage Tabs */}
              <div className="border-b border-gray-200 bg-gray-50/50 px-6 flex items-center justify-between">
                <div className="flex space-x-6">
                  <button
                    onClick={() => setActiveTab('RANKED_DONORS')}
                    className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
                      activeTab === 'RANKED_DONORS'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Cpu className="w-4 h-4 text-red-600" />
                    <span>XGBoost Ranked Donors ({rankedDonors.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('RESPONSES')}
                    className={`py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
                      activeTab === 'RESPONSES'
                        ? 'border-red-600 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Users className="w-4 h-4 text-red-600" />
                    <span>Real-Time Responses ({responses.length})</span>
                    {acceptedResponses.length > 0 && (
                      <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                        {acceptedResponses.length} Accepted
                      </span>
                    )}
                  </button>
                </div>

                <div className="text-[11px] font-semibold text-gray-500 hidden sm:flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-red-600" />
                  <span>{modelMeta}</span>
                </div>
              </div>

              {/* Tab 1: XGBoost Ranked Donors */}
              {activeTab === 'RANKED_DONORS' && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 bg-red-50/50 p-3 rounded-xl border border-red-100">
                    <div>
                      <strong>Medical & Spatial Filter Applied:</strong> Donors strictly filtered for{' '}
                      <span className="text-red-700 font-bold">compatible blood groups</span>,{' '}
                      <span className="text-red-700 font-bold">AVAILABLE status</span>, and within{' '}
                      <span className="text-red-700 font-bold">{selectedRequisition.radiusKm} km</span>.
                    </div>
                    {isRanking && (
                      <div className="flex items-center gap-1 text-red-600 font-bold">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Inferring...</span>
                      </div>
                    )}
                  </div>

                  {rankedDonors.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                      <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <div className="font-semibold text-gray-800 text-sm">
                        No Compatible Registered Donors in Range
                      </div>
                      <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                        Currently no registered real donors with compatible blood group ({selectedRequisition.bloodGroup}) are available within {selectedRequisition.radiusKm} km of this hospital.
                      </p>
                      <p className="text-[11px] text-gray-400 mt-2">
                        Tip: Open another browser window or tab as a Blood Donor to register an eligible donor and watch the XGBoost pipeline rank them instantly!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rankedDonors.map((item) => (
                        <div
                          key={item.donor.donorId}
                          className="p-4 rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-xs transition bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-700 font-black flex items-center justify-center text-sm shrink-0">
                              {item.donor.bloodGroup}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm">
                                  {item.donor.fullName}
                                </span>
                                {item.exactMatch && (
                                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-red-200">
                                    Exact Match
                                  </span>
                                )}
                                {item.responseStatus === 'ACCEPTED' && (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded border border-emerald-300 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    ACCEPTED
                                  </span>
                                )}
                                {item.responseStatus === 'DECLINED' && (
                                  <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-1.5 py-0.2 rounded border border-gray-200">
                                    Declined
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-gray-400" />
                                  <span>{item.distanceKm} km away ({item.donor.city})</span>
                                </span>
                                <span>·</span>
                                <span>{item.donor.totalDonations || 0} prior donations</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                            {/* Contact button if accepted */}
                            {item.responseStatus === 'ACCEPTED' ? (
                              <a
                                href={`tel:${item.donor.phone}`}
                                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-xs"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call {item.donor.phone}</span>
                              </a>
                            ) : (
                              <div className="text-[11px] text-gray-400 italic hidden md:block">
                                Awaiting response...
                              </div>
                            )}

                            {/* XGBoost Priority Badge */}
                            <XGBoostRankingBadge rankedDonor={item} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Real-time Responses */}
              {activeTab === 'RESPONSES' && (
                <div className="p-6 space-y-4">
                  {responses.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                      <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                      <div className="font-semibold text-gray-800 text-sm">
                        Waiting for Donor Responses
                      </div>
                      <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                        This requisition is visible in the donor portal for all eligible donors. As donors accept or decline, responses will synchronize here in real time.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {responses.map((resp) => {
                        const isAccepted = resp.status === 'ACCEPTED';
                        return (
                          <div
                            key={resp.responseId}
                            className={`p-4 rounded-xl border-2 transition bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                              isAccepted
                                ? 'border-emerald-300 bg-emerald-50/20 shadow-xs'
                                : 'border-gray-200 bg-gray-50/40'
                            }`}
                          >
                            <div className="flex items-start gap-3.5">
                              <div
                                className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-sm shrink-0 ${
                                  isAccepted
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {resp.donorBloodGroup}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 text-sm">
                                    {resp.donorName}
                                  </span>
                                  <span
                                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                      isAccepted
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : 'bg-gray-100 text-gray-700 border-gray-300'
                                    }`}
                                  >
                                    {resp.status}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                  {resp.distanceKm !== undefined && (
                                    <span>Distance: {resp.distanceKm} km</span>
                                  )}
                                  <span>·</span>
                                  <span>
                                    Responded:{' '}
                                    {new Date(resp.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Contact Hotline / Call Donor Button */}
                            {isAccepted ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={`tel:${resp.donorPhone}`}
                                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-2 rounded-lg shadow-sm transition"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>Call {resp.donorPhone}</span>
                                </a>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 italic">
                                Declined emergency request
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-500">
              <Droplet className="w-12 h-12 text-red-200 mx-auto mb-3" />
              <h3 className="font-bold text-base text-gray-800">Select or Create a Requisition</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto mb-4">
                Choose an emergency blood requisition from the left panel to inspect real-time responses and XGBoost donor dispatch priorities.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs hover:bg-red-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Emergency Requisition</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal for creating a new requisition */}
      <CreateRequisitionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(newId) => {
          setSelectedReqId(newId);
        }}
      />
    </div>
  );
};
