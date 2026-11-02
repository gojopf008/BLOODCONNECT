import { BloodGroup } from '../types';

/**
 * Strict Clinical Blood Group Compatibility Matrix.
 * Key: Recipient Blood Group
 * Value: Array of Donor Blood Groups that can safely be transfused into the recipient.
 */
export const COMPATIBLE_DONORS_MAP: Record<BloodGroup, BloodGroup[]> = {
  // A+ can receive from A+, A-, O+, O-
  'A+': ['A+', 'A-', 'O+', 'O-'],
  // A- can receive from A-, O-
  'A-': ['A-', 'O-'],
  // B+ can receive from B+, B-, O+, O-
  'B+': ['B+', 'B-', 'O+', 'O-'],
  // B- can receive from B-, O-
  'B-': ['B-', 'O-'],
  // AB+ is universal recipient (can receive from all 8 blood groups)
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  // AB- can receive from AB-, A-, B-, O-
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  // O+ can receive from O+, O-
  'O+': ['O+', 'O-'],
  // O- is universal donor, but can only receive from O-
  'O-': ['O-'],
};

/**
 * Checks if a donor's blood group is clinically compatible with a recipient's blood group.
 */
export function isBloodCompatible(donorGroup: BloodGroup, recipientGroup: BloodGroup): boolean {
  const allowedDonors = COMPATIBLE_DONORS_MAP[recipientGroup];
  return allowedDonors ? allowedDonors.includes(donorGroup) : false;
}

/**
 * Calculates great-circle distance between two geographic coordinates using the Haversine formula.
 * @returns Distance in kilometers (km)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth's mean radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Round to 1 decimal place
  return Math.round(distance * 10) / 10;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
