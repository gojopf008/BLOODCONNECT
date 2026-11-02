/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { RoleSelectionModal } from './components/RoleSelectionModal';
import { HospitalRegistration } from './components/HospitalRegistration';
import { DonorRegistration } from './components/DonorRegistration';
import { HospitalPortal } from './components/HospitalPortal';
import { DonorPortal } from './components/DonorPortal';
import { UserRole } from './types';
import { Activity, ShieldCheck, Heart, Building2, RefreshCw } from 'lucide-react';

function MainApp() {
  const { user, userAccount, hospitalProfile, donorProfile, loading, selectRole } = useAuth();

  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-200 animate-bounce mb-4">
          <Activity className="w-6 h-6" />
        </div>
        <div className="font-extrabold text-lg text-gray-900 tracking-tight">
          BLOOD<span className="text-red-600">CONNECT</span> AI
        </div>
        <p className="text-xs text-gray-500 mt-1">Initializing secure healthcare network...</p>
      </div>
    );
  }

  // Not signed in: Show Landing Page
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col justify-between">
        <Navbar
          onOpenRoleModal={() => setShowRoleModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <LandingPage
            onSelectRole={(role) => {
              selectRole(role);
            }}
          />
        </main>
        <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto px-4">
            <p className="font-semibold text-gray-700">BLOODCONNECT AI · Emergency Blood Logistics Network</p>
            <p className="mt-1 text-gray-400">
              Strict medical compatibility gating · Haversine radius matching · XGBoost decision tree response prioritization.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Signed in, but no role selected: Show Role Selection
  if (!userAccount?.role) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col justify-between">
        <Navbar
          onOpenRoleModal={() => setShowRoleModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-12">
          <RoleSelectionModal
            isOpen={true}
            onRoleChosen={(role) => {
              // Role is set in Firestore
            }}
          />
        </main>
      </div>
    );
  }

  const activeRole: UserRole = userAccount.role;

  return (
    <div className="min-h-screen bg-gray-50/40 flex flex-col justify-between">
      <Navbar
        onOpenRoleModal={() => setShowRoleModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 flex-1">
        {/* Profile Edit Overlay Modal if opened manually */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
            <div className="max-w-2xl w-full my-8">
              {activeRole === 'HOSPITAL' ? (
                <HospitalRegistration
                  onSuccess={() => setShowProfileModal(false)}
                  onCancel={() => setShowProfileModal(false)}
                />
              ) : (
                <DonorRegistration
                  onSuccess={() => setShowProfileModal(false)}
                  onCancel={() => setShowProfileModal(false)}
                />
              )}
            </div>
          </div>
        )}

        {/* Role Switching Modal */}
        <RoleSelectionModal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          onRoleChosen={() => setShowRoleModal(false)}
        />

        {/* Portal Views */}
        {activeRole === 'HOSPITAL' ? (
          !hospitalProfile ? (
            <div className="max-w-2xl mx-auto">
              <HospitalRegistration />
            </div>
          ) : (
            <HospitalPortal />
          )
        ) : (
          !donorProfile ? (
            <div className="max-w-2xl mx-auto">
              <DonorRegistration />
            </div>
          ) : (
            <DonorPortal />
          )
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-gray-700">BLOODCONNECT AI Operational</span>
            <span className="text-gray-400">· Real-Time Firestore Sync Active</span>
          </div>

          <div className="text-gray-400">
            Current Portal: <strong className="text-gray-700">{activeRole === 'HOSPITAL' ? 'Hospital Medical Center' : 'Blood Donor'}</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
