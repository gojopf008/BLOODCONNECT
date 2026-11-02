/**
 * BLOODCONNECT AI - Domain Types
 */

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type UrgencyLevel = 'IMMEDIATE' | 'CRITICAL' | 'HIGH' | 'NORMAL';

export type RequisitionStatus = 'OPEN' | 'FULFILLED' | 'CANCELLED';

export type DonorAvailability = 'AVAILABLE' | 'UNAVAILABLE' | 'RECENTLY_DONATED';

export type ResponseStatus = 'ACCEPTED' | 'DECLINED' | 'PENDING';

export type UserRole = 'HOSPITAL' | 'DONOR';

export interface UserAccount {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface HospitalProfile {
  hospitalId: string; // matches auth UID
  name: string;
  registrationNumber: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district?: string;
  state?: string;
  latitude: number;
  longitude: number;
  emergencyContact: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DonorProfile {
  donorId: string; // matches auth UID
  fullName: string;
  bloodGroup: BloodGroup;
  phone: string;
  email: string;
  city: string;
  district?: string;
  state?: string;
  latitude: number;
  longitude: number;
  availability: DonorAvailability;
  lastDonationDate?: string;
  totalDonations?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Requisition {
  requisitionId: string;
  hospitalId: string;
  hospitalName: string;
  hospitalPhone: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  urgency: UrgencyLevel;
  status: RequisitionStatus;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DonorResponse {
  responseId: string; // `${requisitionId}_${donorId}`
  requisitionId: string;
  donorId: string;
  hospitalId: string;
  donorName: string;
  donorBloodGroup: BloodGroup;
  donorPhone: string;
  status: ResponseStatus;
  distanceKm?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface XGBoostRankedDonor {
  donor: DonorProfile;
  distanceKm: number;
  score: number; // 0 - 100
  predictedProbability: number; // 0.0 - 1.0
  priorityTier: 'TIER_1_HIGH' | 'TIER_2_MEDIUM' | 'TIER_3_RESERVE';
  rankingRank: number;
  featureInsights: string[];
  exactMatch: boolean;
  responseStatus?: ResponseStatus;
}

export interface RankingResponse {
  success: boolean;
  rankedDonors: XGBoostRankedDonor[];
  modelInfo: {
    modelName: string;
    version: string;
    treesEvaluated: number;
    timestamp: string;
  };
}
