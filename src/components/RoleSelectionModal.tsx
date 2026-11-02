import React from 'react';
import { Building2, Heart, Shield, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onRoleChosen: (role: UserRole) => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  onClose,
  onRoleChosen,
}) => {
  const { selectRole, userAccount } = useAuth();

  if (!isOpen) return null;

  const handleSelect = async (role: UserRole) => {
    try {
      await selectRole(role);
      onRoleChosen(role);
      if (onClose) onClose();
    } catch (err) {
      console.error('Role selection failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200">
        {onClose && userAccount?.role && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-100 text-red-600 mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Select Portal Access</h2>
          <p className="text-sm text-gray-600 mt-1">
            Choose how you wish to operate in the BLOODCONNECT AI network.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Hospital Option */}
          <button
            onClick={() => handleSelect('HOSPITAL')}
            className={`text-left p-5 rounded-xl border-2 transition-all flex flex-col justify-between group ${
              userAccount?.role === 'HOSPITAL'
                ? 'border-red-600 bg-red-50/40 ring-2 ring-red-100'
                : 'border-gray-200 hover:border-red-400 hover:bg-red-50/20'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900 group-hover:text-red-700">
                Hospital Portal
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Publish emergency blood requisitions, inspect real-time donor responses, and prioritize eligible donors with XGBoost AI.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-red-600 group-hover:translate-x-0.5 transition-transform">
              <span>Enter as Hospital</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </button>

          {/* Donor Option */}
          <button
            onClick={() => handleSelect('DONOR')}
            className={`text-left p-5 rounded-xl border-2 transition-all flex flex-col justify-between group ${
              userAccount?.role === 'DONOR'
                ? 'border-red-600 bg-red-50/40 ring-2 ring-red-100'
                : 'border-gray-200 hover:border-red-400 hover:bg-red-50/20'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-rose-600 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Heart className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-gray-900 group-hover:text-red-700">
                Blood Donor Portal
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Register blood group and location, receive real-time notifications for nearby compatible hospital requisitions, and accept calls.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-red-600 group-hover:translate-x-0.5 transition-transform">
              <span>Enter as Donor</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500 border-t border-gray-100 pt-4">
          Strict role separation enforced. Verified Google Sign-In required.
        </div>
      </div>
    </div>
  );
};
