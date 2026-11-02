import React, { useState } from 'react';
import { Cpu, Info, Sparkles, TrendingUp } from 'lucide-react';
import { XGBoostRankedDonor } from '../types';

interface XGBoostRankingBadgeProps {
  rankedDonor: XGBoostRankedDonor;
}

export const XGBoostRankingBadge: React.FC<XGBoostRankingBadgeProps> = ({ rankedDonor }) => {
  const [showDetails, setShowDetails] = useState(false);

  const getTierDetails = (tier: XGBoostRankedDonor['priorityTier']) => {
    switch (tier) {
      case 'TIER_1_HIGH':
        return {
          label: 'Tier 1 Priority',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'TIER_2_MEDIUM':
        return {
          label: 'Tier 2 Priority',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'TIER_3_RESERVE':
      default:
        return {
          label: 'Tier 3 Reserve',
          bg: 'bg-gray-50 text-gray-700 border-gray-300',
          dot: 'bg-gray-400',
        };
    }
  };

  const tier = getTierDetails(rankedDonor.priorityTier);

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-2">
        {/* Rank Number */}
        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-red-600 text-white shadow-xs">
          #{rankedDonor.rankingRank}
        </span>

        {/* Priority Tier Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${tier.bg}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${tier.dot}`} />
          {tier.label}
        </span>

        {/* Probability Score */}
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition border border-gray-200"
          title="Click to view XGBoost feature explainability"
        >
          <Cpu className="w-3 h-3 text-red-600" />
          <span>{Math.round(rankedDonor.predictedProbability * 100)}%</span>
          <Info className="w-3 h-3 text-gray-400 ml-0.5" />
        </button>
      </div>

      {/* Expandable Feature Explainability */}
      {showDetails && (
        <div className="mt-2 p-3 rounded-xl bg-gray-900 text-white text-xs max-w-xs shadow-xl animate-in fade-in duration-150 z-20 text-left border border-gray-700">
          <div className="flex items-center gap-1.5 text-red-400 font-bold mb-2 pb-1.5 border-b border-gray-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>XGBoost Decision Factors</span>
          </div>

          <div className="space-y-1.5 text-[11px] text-gray-300">
            <div>
              <span className="text-gray-400">Response Probability:</span>{' '}
              <strong className="text-white">
                {(rankedDonor.predictedProbability * 100).toFixed(1)}%
              </strong>
            </div>
            <div>
              <span className="text-gray-400">Haversine Distance:</span>{' '}
              <strong className="text-white">{rankedDonor.distanceKm} km</strong>
            </div>
            <div>
              <span className="text-gray-400">Blood Match:</span>{' '}
              <strong className={rankedDonor.exactMatch ? 'text-emerald-400' : 'text-amber-400'}>
                {rankedDonor.exactMatch ? 'Exact Match' : 'Compatible Group'}
              </strong>
            </div>

            <div className="pt-1.5 border-t border-gray-800">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Model Clinical Insights
              </span>
              <ul className="space-y-1 text-gray-300 list-disc list-inside">
                {rankedDonor.featureInsights.map((insight, idx) => (
                  <li key={idx} className="leading-tight">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
