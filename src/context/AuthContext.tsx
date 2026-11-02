import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType, sanitizePayload, testConnection } from '../lib/firebase';
import { DonorProfile, HospitalProfile, UserAccount, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  userAccount: UserAccount | null;
  hospitalProfile: HospitalProfile | null;
  donorProfile: DonorProfile | null;
  loading: boolean;
  activeRole: UserRole | null;
  signInWithGoogle: (initialRole?: UserRole) => Promise<User | null>;
  signOutUser: () => Promise<void>;
  selectRole: (role: UserRole, targetUser?: User) => Promise<void>;
  updateHospitalProfile: (data: Omit<HospitalProfile, 'hospitalId' | 'email' | 'createdAt'>) => Promise<void>;
  updateDonorProfile: (data: Omit<DonorProfile, 'donorId' | 'email' | 'createdAt'>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [hospitalProfile, setHospitalProfile] = useState<HospitalProfile | null>(null);
  const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Test Firestore connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  const loadUserData = async (currentUser: User) => {
    try {
      // 1. Fetch user account metadata
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const accountData = userSnap.data() as UserAccount;
        setUserAccount(accountData);
      } else {
        setUserAccount(null);
      }

      // 2. Fetch hospital profile if exists
      const hospitalDocRef = doc(db, 'hospitals', currentUser.uid);
      const hospitalSnap = await getDoc(hospitalDocRef);
      if (hospitalSnap.exists()) {
        setHospitalProfile(hospitalSnap.data() as HospitalProfile);
      } else {
        setHospitalProfile(null);
      }

      // 3. Fetch donor profile if exists
      const donorDocRef = doc(db, 'donors', currentUser.uid);
      const donorSnap = await getDoc(donorDocRef);
      if (donorSnap.exists()) {
        setDonorProfile(donorSnap.data() as DonorProfile);
      } else {
        setDonorProfile(null);
      }
    } catch (err) {
      console.error('Error fetching user profile data:', err);
      // Non-fatal if profile does not yet exist
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      startTransition(() => {
        setUser(currentUser);
      });

      if (currentUser) {
        await loadUserData(currentUser);
      } else {
        setUserAccount(null);
        setHospitalProfile(null);
        setDonorProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const selectRole = async (role: UserRole, targetUser?: User) => {
    const activeUser = targetUser || user || auth.currentUser;
    if (!activeUser) throw new Error('User not authenticated');
    const path = `users/${activeUser.uid}`;
    try {
      const now = new Date().toISOString();
      const accountData: UserAccount = {
        uid: activeUser.uid,
        email: activeUser.email || '',
        role,
        createdAt: userAccount?.createdAt || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'users', activeUser.uid), sanitizePayload(accountData), { merge: true });
      setUserAccount(accountData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const signInWithGoogle = async (initialRole?: UserRole): Promise<User | null> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setUser(result.user);
        await loadUserData(result.user);
        if (initialRole) {
          await selectRole(initialRole, result.user);
        }
        return result.user;
      }
      return null;
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        // User voluntarily dismissed or rapid click cancelled previous popup
        return null;
      }
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserAccount(null);
      setHospitalProfile(null);
      setDonorProfile(null);
    } catch (error) {
      console.error('Sign-out failed:', error);
      throw error;
    }
  };

  const updateHospitalProfile = async (
    data: Omit<HospitalProfile, 'hospitalId' | 'email' | 'createdAt'>
  ) => {
    const activeUser = user || auth.currentUser;
    if (!activeUser) throw new Error('User not authenticated');
    const path = `hospitals/${activeUser.uid}`;
    try {
      const now = new Date().toISOString();
      const existingCreated = hospitalProfile?.createdAt;
      const fullProfile: HospitalProfile = {
        ...data,
        hospitalId: activeUser.uid,
        email: activeUser.email || '',
        createdAt: existingCreated || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'hospitals', activeUser.uid), sanitizePayload(fullProfile));
      setHospitalProfile(fullProfile);

      // Ensure user role is set to HOSPITAL
      if (!userAccount || userAccount.role !== 'HOSPITAL') {
        await selectRole('HOSPITAL', activeUser);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const updateDonorProfile = async (
    data: Omit<DonorProfile, 'donorId' | 'email' | 'createdAt'>
  ) => {
    const activeUser = user || auth.currentUser;
    if (!activeUser) throw new Error('User not authenticated');
    const path = `donors/${activeUser.uid}`;
    try {
      const now = new Date().toISOString();
      const existingCreated = donorProfile?.createdAt;
      const fullProfile: DonorProfile = {
        ...data,
        donorId: activeUser.uid,
        email: activeUser.email || '',
        createdAt: existingCreated || now,
        updatedAt: now,
      };

      await setDoc(doc(db, 'donors', activeUser.uid), sanitizePayload(fullProfile));
      setDonorProfile(fullProfile);

      // Ensure user role is set to DONOR
      if (!userAccount || userAccount.role !== 'DONOR') {
        await selectRole('DONOR', activeUser);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userAccount,
        hospitalProfile,
        donorProfile,
        loading,
        activeRole: userAccount?.role || null,
        signInWithGoogle,
        signOutUser,
        selectRole,
        updateHospitalProfile,
        updateDonorProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
