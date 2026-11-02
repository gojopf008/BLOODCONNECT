import React from 'react';
import { Activity, Droplet, Heart, Hospital, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface NavbarProps {
  onOpenRoleModal: () => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenRoleModal, onOpenProfile }) => {
  const { user, userAccount, hospitalProfile, donorProfile, signOutUser, signInWithGoogle } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-red-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-200">
            <Droplet className="w-6 h-6 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-gray-900">
                BLOOD<span className="text-red-600">CONNECT</span>
              </span>
              <span className="bg-red-50 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-wider">
                AI
              </span>
            </div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest hidden sm:block">
              Emergency Requisition & XGBoost Dispatch
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Active Role indicator */}
              {userAccount?.role && (
                <button
                  onClick={onOpenRoleModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 transition"
                  title="Switch portal role"
                >
                  {userAccount.role === 'HOSPITAL' ? (
                    <>
                      <Hospital className="w-3.5 h-3.5 text-red-600" />
                      <span className="hidden sm:inline">Portal:</span>
                      <span className="text-red-700 font-bold">Hospital</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-3.5 h-3.5 text-red-600" />
                      <span className="hidden sm:inline">Portal:</span>
                      <span className="text-red-700 font-bold">Blood Donor</span>
                    </>
                  )}
                </button>
              )}

              {/* Profile setup button */}
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-100"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">
                  {userAccount?.role === 'HOSPITAL'
                    ? hospitalProfile?.name || 'Hospital Profile'
                    : donorProfile?.fullName || 'Donor Profile'}
                </span>
              </button>

              {/* User Avatar & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-gray-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <button
                  onClick={signOutUser}
                  title="Sign out"
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow transition"
            >
              <UserIcon className="w-4 h-4" />
              <span>Google Sign-In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
