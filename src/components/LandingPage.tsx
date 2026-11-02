import React from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle,
  Cpu,
  Droplet,
  Heart,
  MapPin,
  Radio,
  Shield,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COMPATIBLE_DONORS_MAP } from '../lib/compatibility';
import { BloodGroup } from '../types';

interface LandingPageProps {
  onSelectRole: (role: 'HOSPITAL' | 'DONOR') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  const { user, signInWithGoogle } = useAuth();

  const handlePortalClick = async (role: 'HOSPITAL' | 'DONOR') => {
    try {
      if (!user) {
        await signInWithGoogle(role);
      } else {
        await onSelectRole(role);
      }
    } catch (err: any) {
      if (
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/cancelled-popup-request'
      ) {
        console.error('Sign-in error:', err);
      }
    }
  };

  return (
    <div className="space-y-16 py-6 sm:py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto px-4 space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold tracking-wide">
          <Activity className="w-3.5 h-3.5 text-red-600 animate-pulse" />
          <span>Intelligent Emergency Blood Logistics Network</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-tight">
          When seconds matter,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-rose-700">
            AI coordinates life.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          BLOODCONNECT AI connects emergency hospital surgical units with verified nearby blood donors in real time, employing strict medical compatibility filters and XGBoost response prediction models.
        </p>

        {/* Portal Action Cards */}
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-4 text-left">
          {/* Hospital Card */}
          <div
            onClick={() => handlePortalClick('HOSPITAL')}
            className="p-6 rounded-2xl bg-white border-2 border-red-100 hover:border-red-500 shadow-sm hover:shadow-lg transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center mb-4 shadow-md shadow-red-200 group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="text-xs font-black uppercase tracking-wider text-red-600 mb-1">
                For Medical Facilities
              </div>
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-red-700">
                Hospital Portal
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Dispatch critical blood requisitions, inspect real-time donor responses, and triage eligible donors using the XGBoost ranking engine.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center text-xs font-bold text-red-600 group-hover:translate-x-1 transition-transform">
              <span>Access Hospital Portal</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>

          {/* Donor Card */}
          <div
            onClick={() => handlePortalClick('DONOR')}
            className="p-6 rounded-2xl bg-white border-2 border-red-100 hover:border-red-500 shadow-sm hover:shadow-lg transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-4 shadow-md shadow-rose-200 group-hover:scale-105 transition-transform">
                <Heart className="w-6 h-6 fill-white" />
              </div>
              <div className="text-xs font-black uppercase tracking-wider text-rose-600 mb-1">
                For Lifesavers & Donors
              </div>
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-red-700">
                Blood Donor Portal
              </h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Register blood group and location, receive notifications for matching nearby hospital requisitions, and accept emergency calls.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center text-xs font-bold text-red-600 group-hover:translate-x-1 transition-transform">
              <span>Access Donor Portal</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* 5-Step Matching Architecture */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-xs font-extrabold uppercase tracking-widest text-red-600">
            Precision Matching Protocol
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
            How BLOODCONNECT AI Dispatches Emergencies
          </h2>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          {[
            {
              step: '01',
              title: 'Hospital Requisition',
              desc: 'Hospital posts urgent blood group, units needed, urgency status, and search radius.',
              icon: ShieldAlert,
            },
            {
              step: '02',
              title: 'Medical Compatibility',
              desc: 'Strict immunohematological rules filter eligible donor blood groups immediately.',
              icon: Droplet,
            },
            {
              step: '03',
              title: 'Haversine Proximity',
              desc: 'Mathematical great-circle radius gates donors within safe transit distances.',
              icon: MapPin,
            },
            {
              step: '04',
              title: 'XGBoost AI Ranking',
              desc: 'Ensemble boosted decision trees predict rapid attendance probability.',
              icon: Cpu,
            },
            {
              step: '05',
              title: 'Real-Time Triage',
              desc: 'Immediate donor notification and live synchronization with hospital ER ward.',
              icon: Zap,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-2xs relative"
            >
              <div className="text-2xl font-black text-red-100 mb-2">{item.step}</div>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center mb-3">
                <item.icon className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-gray-900">{item.title}</h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Compatibility Matrix Reference Table */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Clinical Blood Group Compatibility Matrix
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Hardcoded medical invariants enforced before ML model evaluation.
              </p>
            </div>
            <span className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200 self-start">
              Zero-Risk Compatibility Gate
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(COMPATIBLE_DONORS_MAP) as BloodGroup[]).map((group) => {
              const compatibleDonors = COMPATIBLE_DONORS_MAP[group];
              const isUniversal = group === 'AB+';
              const isOminus = group === 'O-';

              return (
                <div
                  key={group}
                  className={`p-3.5 rounded-xl border ${
                    isOminus
                      ? 'border-red-300 bg-red-50/40'
                      : isUniversal
                      ? 'border-blue-300 bg-blue-50/40'
                      : 'border-gray-200 bg-gray-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-lg bg-red-600 text-white font-black text-sm flex items-center justify-center shadow-2xs">
                      {group}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      Recipient
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-600 font-medium">
                    Can receive from:
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {compatibleDonors.map((d) => (
                      <span
                        key={d}
                        className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-white border border-gray-200 text-gray-800"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
