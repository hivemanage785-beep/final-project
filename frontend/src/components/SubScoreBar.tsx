import React from 'react';

interface SubScoreBarProps {
  label: string;
  score: number; // 0-100
}

export const SubScoreBar: React.FC<SubScoreBarProps> = ({ label, score }) => {
  // Color scale similar to main scoring
  const getColor = (s: number) => {
    if (s >= 80) return '#1a9641';
    if (s >= 60) return '#a6d96a';
    if (s >= 40) return '#f46d43';
    return '#d73027';
  };

  const color = getColor(score);
  
  // Create 10 blocks
  const blocks = Array.from({ length: 10 }, (_, i) => {
    const isFilled = score > i * 10;
    return (
      <div 
        key={i} 
        className="h-2 flex-1 rounded-sm mx-[1px]" 
        style={{ backgroundColor: isFilled ? color : '#e5e7eb' }}
      />
    );
  });

  return (
    <div className="flex items-center justify-between text-sm py-2">
      <div className="w-1/3 text-gray-600 font-medium">{label}</div>
      <div className="w-1/2 flex items-center mx-2">
        {blocks}
      </div>
      <div className="w-1/6 text-right font-bold text-gray-800">{score}</div>
    </div>
  );
};
