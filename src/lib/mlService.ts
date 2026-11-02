import { DonorProfile, RankingResponse, Requisition, XGBoostRankedDonor } from '../types';
import { rankEligibleDonorsWithXGBoost } from './xgboostModel';

/**
 * Service to execute XGBoost donor ranking via the server-side API endpoint,
 * with seamless local fallback to guarantee reliability.
 */
export async function rankDonors(
  requisition: Requisition,
  donors: DonorProfile[]
): Promise<XGBoostRankedDonor[]> {
  try {
    const res = await fetch('/api/ml/rank-donors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requisition,
        donors,
      }),
    });

    if (res.ok) {
      const data: RankingResponse = await res.json();
      if (data.success && Array.isArray(data.rankedDonors)) {
        return data.rankedDonors;
      }
    }
  } catch (err) {
    console.warn('API ranking endpoint unavailable, falling back to client-side XGBoost engine:', err);
  }

  // Client-side fallback to the exact same XGBoost GBDT implementation
  return rankEligibleDonorsWithXGBoost(requisition, donors);
}
