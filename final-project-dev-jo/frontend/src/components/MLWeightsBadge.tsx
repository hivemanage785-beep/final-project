import React from 'react';

interface MLWeightsBadgeProps {
  weights: { weather: number; flora: number; season: number };
}

export const MLWeightsBadge: React.FC<MLWeightsBadgeProps> = ({ weights }) => {
  const w = Math.round(weights.weather * 100);
  const f = Math.round(weights.flora * 100);
  const s = Math.round(weights.season * 100);

  return (
    <div
      className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-purple-100 cursor-help"
      title="Weights learned from user interaction data"
    >
      <span>🧠</span>
      <span>W:{w}%</span>
      <span>F:{f}%</span>
      <span>S:{s}%</span>
    </div>
  );
};
