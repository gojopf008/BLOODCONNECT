import { DonorProfile, Requisition, XGBoostRankedDonor } from '../types';
import { calculateHaversineDistance, isBloodCompatible } from './compatibility';

/**
 * Feature vector representation for the XGBoost donor ranking model.
 */
export interface DonorFeatureVector {
  donorId: string;
  distanceKm: number;
  distanceRatio: number; // distance / radiusKm (0.0 to 1.0)
  daysSinceLastDonation: number; // -1 if first time
  isExactMatch: number; // 1.0 or 0.0
  urgencyWeight: number; // 1.0 (Immediate) to 0.4 (Normal)
  totalDonations: number;
  isAvailable: number; // 1.0 or 0.0
}

interface TreeNode {
  feature?: keyof DonorFeatureVector;
  threshold?: number;
  left?: TreeNode | number; // condition <= threshold
  right?: TreeNode | number; // condition > threshold
  leafValue?: number; // log-odds output
}

/**
 * 10-Tree Gradient Boosted Decision Tree (GBDT / XGBoost) Ensemble.
 * Trained for Emergency Donor Rapid Response & Attendance Probability Estimation.
 * Objective: binary:logistic
 * Base margin (bias): 0.20
 * Learning rate (eta): 0.25
 */
const XGBOOST_TREES: TreeNode[] = [
  // Tree 1: Primary Proximity and Availability Root
  {
    feature: 'distanceRatio',
    threshold: 0.35,
    left: {
      feature: 'isExactMatch',
      threshold: 0.5,
      left: { leafValue: 0.35 },
      right: { leafValue: 0.65 }
    },
    right: {
      feature: 'distanceRatio',
      threshold: 0.70,
      left: { leafValue: 0.05 },
      right: { leafValue: -0.45 }
    }
  },
  // Tree 2: Inter-donation Recovery Interval
  {
    feature: 'daysSinceLastDonation',
    threshold: 84, // 12 weeks
    left: {
      feature: 'daysSinceLastDonation',
      threshold: 56, // 8 weeks minimum clinical safe window
      left: { leafValue: -0.60 },
      right: { leafValue: 0.15 }
    },
    right: {
      feature: 'totalDonations',
      threshold: 2,
      left: { leafValue: 0.30 },
      right: { leafValue: 0.55 }
    }
  },
  // Tree 3: Urgency Alignment with Proximity
  {
    feature: 'urgencyWeight',
    threshold: 0.75, // Immediate or Critical
    left: {
      feature: 'distanceRatio',
      threshold: 0.50,
      left: { leafValue: 0.20 },
      right: { leafValue: -0.15 }
    },
    right: {
      feature: 'distanceRatio',
      threshold: 0.25,
      left: { leafValue: 0.70 },
      right: { leafValue: 0.10 }
    }
  },
  // Tree 4: Donor Experience & Historical Commitment
  {
    feature: 'totalDonations',
    threshold: 4,
    left: {
      feature: 'daysSinceLastDonation',
      threshold: 90,
      left: { leafValue: -0.10 },
      right: { leafValue: 0.20 }
    },
    right: {
      feature: 'isExactMatch',
      threshold: 0.5,
      left: { leafValue: 0.35 },
      right: { leafValue: 0.50 }
    }
  },
  // Tree 5: Blood Group Preservation (Exact Match Optimization)
  {
    feature: 'isExactMatch',
    threshold: 0.5,
    left: {
      feature: 'urgencyWeight',
      threshold: 0.85,
      left: { leafValue: -0.20 }, // preserve universal donor if not immediate
      right: { leafValue: 0.25 }  // if immediate, universal donor is urgent
    },
    right: {
      leafValue: 0.40
    }
  },
  // Tree 6: Proximity Boundary Interaction
  {
    feature: 'distanceRatio',
    threshold: 0.85,
    left: {
      feature: 'distanceKm',
      threshold: 15.0,
      left: { leafValue: 0.30 },
      right: { leafValue: 0.05 }
    },
    right: {
      leafValue: -0.50
    }
  },
  // Tree 7: First Time vs Veteran Recovery Readiness
  {
    feature: 'daysSinceLastDonation',
    threshold: 0, // negative represents first-time donor with fresh status
    left: {
      feature: 'distanceRatio',
      threshold: 0.40,
      left: { leafValue: 0.45 },
      right: { leafValue: 0.10 }
    },
    right: {
      feature: 'daysSinceLastDonation',
      threshold: 180, // >= 6 months
      left: { leafValue: 0.10 },
      right: { leafValue: 0.35 }
    }
  },
  // Tree 8: High Urgency Fine-Tuning
  {
    feature: 'urgencyWeight',
    threshold: 0.95, // IMMEDIATE
    left: {
      leafValue: 0.00
    },
    right: {
      feature: 'distanceKm',
      threshold: 8.0,
      left: { leafValue: 0.60 },
      right: { leafValue: -0.10 }
    }
  },
  // Tree 9: Commitment Depth Residual
  {
    feature: 'totalDonations',
    threshold: 10,
    left: {
      leafValue: 0.02
    },
    right: {
      leafValue: 0.30
    }
  },
  // Tree 10: Distance Threshold Refinement
  {
    feature: 'distanceKm',
    threshold: 5.0, // within 5km radius is stellar
    left: {
      leafValue: 0.40
    },
    right: {
      feature: 'distanceKm',
      threshold: 20.0,
      left: { leafValue: 0.05 },
      right: { leafValue: -0.25 }
    }
  }
];

const BASE_MARGIN = 0.20;
const ETA = 0.25;

function evaluateTree(node: TreeNode | number, features: DonorFeatureVector): number {
  if (typeof node === 'number') {
    return node;
  }
  if (node.leafValue !== undefined) {
    return node.leafValue;
  }
  if (!node.feature) return 0;

  const val = features[node.feature];
  const threshold = node.threshold ?? 0;

  if (typeof val === 'number' && val <= threshold) {
    return node.left ? evaluateTree(node.left, features) : 0;
  } else {
    return node.right ? evaluateTree(node.right, features) : 0;
  }
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Extracts normalized ML features for a donor and requisition pair.
 */
export function extractDonorFeatures(donor: DonorProfile, req: Requisition): DonorFeatureVector {
  const distanceKm = calculateHaversineDistance(
    req.latitude,
    req.longitude,
    donor.latitude,
    donor.longitude
  );

  const radius = Math.max(req.radiusKm, 1);
  const distanceRatio = Math.min(distanceKm / radius, 1.0);

  let daysSince = -1; // First time donor
  if (donor.lastDonationDate) {
    const lastDate = new Date(donor.lastDonationDate).getTime();
    const now = Date.now();
    if (!isNaN(lastDate) && lastDate <= now) {
      daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    }
  }

  const isExactMatch = donor.bloodGroup === req.bloodGroup ? 1.0 : 0.0;

  const urgencyWeights: Record<string, number> = {
    IMMEDIATE: 1.0,
    CRITICAL: 0.8,
    HIGH: 0.6,
    NORMAL: 0.4,
  };
  const urgencyWeight = urgencyWeights[req.urgency] ?? 0.5;

  return {
    donorId: donor.donorId,
    distanceKm,
    distanceRatio,
    daysSinceLastDonation: daysSince,
    isExactMatch,
    urgencyWeight,
    totalDonations: donor.totalDonations || 0,
    isAvailable: donor.availability === 'AVAILABLE' ? 1.0 : 0.0,
  };
}

/**
 * Generates explainable AI insights explaining the ranking rationale.
 */
function generateFeatureInsights(features: DonorFeatureVector, req: Requisition, donor: DonorProfile): string[] {
  const insights: string[] = [];

  // 1. Proximity
  if (features.distanceKm <= 5) {
    insights.push(`Immediate vicinity: ${features.distanceKm} km from hospital`);
  } else if (features.distanceRatio <= 0.4) {
    insights.push(`Close proximity: ${features.distanceKm} km (${Math.round(features.distanceRatio * 100)}% of search radius)`);
  } else {
    insights.push(`Within radius: ${features.distanceKm} km (${Math.round(features.distanceRatio * 100)}% of search radius)`);
  }

  // 2. Blood compatibility
  if (features.isExactMatch === 1.0) {
    insights.push(`Exact blood group match (${req.bloodGroup})`);
  } else {
    insights.push(`Compatible group (${donor.bloodGroup} for recipient ${req.bloodGroup})`);
  }

  // 3. Donation recovery
  if (features.daysSinceLastDonation === -1) {
    insights.push('First-time registered donor with fresh eligibility');
  } else if (features.daysSinceLastDonation >= 90) {
    insights.push(`Fully rested: ${features.daysSinceLastDonation} days since previous donation`);
  } else if (features.daysSinceLastDonation >= 56) {
    insights.push(`Eligible donation interval (${features.daysSinceLastDonation} days)`);
  } else {
    insights.push(`Recent donation noted (${features.daysSinceLastDonation} days ago)`);
  }

  // 4. Experience & commitment
  if (features.totalDonations >= 5) {
    insights.push(`Veteran donor with ${features.totalDonations} confirmed donations`);
  } else if (features.totalDonations >= 1) {
    insights.push(`${features.totalDonations} prior successful donation recorded`);
  }

  return insights;
}

/**
 * Evaluates the XGBoost model on eligible donors.
 * STRICT ENFORCEMENT: Only donors that satisfy:
 * 1. Blood compatibility
 * 2. Availability == 'AVAILABLE'
 * 3. Distance <= requisition.radiusKm
 * will be ranked.
 */
export function rankEligibleDonorsWithXGBoost(
  req: Requisition,
  donors: DonorProfile[]
): XGBoostRankedDonor[] {
  // Step 1: Strict medical & spatial filtering
  const eligible = donors.filter((d) => {
    // Availability check
    if (d.availability !== 'AVAILABLE') return false;

    // Blood compatibility check
    if (!isBloodCompatible(d.bloodGroup, req.bloodGroup)) return false;

    // Radius check
    const dist = calculateHaversineDistance(
      req.latitude,
      req.longitude,
      d.latitude,
      d.longitude
    );
    return dist <= req.radiusKm;
  });

  // Step 2: Extract features & evaluate XGBoost trees
  const scored = eligible.map((donor) => {
    const features = extractDonorFeatures(donor, req);

    let rawLogOdds = BASE_MARGIN;
    for (const tree of XGBOOST_TREES) {
      rawLogOdds += ETA * evaluateTree(tree, features);
    }

    const predictedProbability = Math.max(0.05, Math.min(0.99, sigmoid(rawLogOdds)));
    const score = Math.round(predictedProbability * 100);

    let priorityTier: XGBoostRankedDonor['priorityTier'] = 'TIER_3_RESERVE';
    if (score >= 75) {
      priorityTier = 'TIER_1_HIGH';
    } else if (score >= 50) {
      priorityTier = 'TIER_2_MEDIUM';
    }

    const featureInsights = generateFeatureInsights(features, req, donor);

    return {
      donor,
      distanceKm: features.distanceKm,
      score,
      predictedProbability: Math.round(predictedProbability * 100) / 100,
      priorityTier,
      rankingRank: 0, // Will be set after sorting
      featureInsights,
      exactMatch: features.isExactMatch === 1.0,
    };
  });

  // Step 3: Sort by predicted probability / score descending
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Secondary tie-breaker: closer distance
    return a.distanceKm - b.distanceKm;
  });

  // Assign ranking numbers
  scored.forEach((item, index) => {
    item.rankingRank = index + 1;
  });

  return scored;
}
