import React from 'react';

interface ScoreRingProps {
  score: number;
  grade: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  size?: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({ score, grade, size = 120 }) => {
  const getGradeColor = () => {
    switch(grade) {
      case 'Excellent': return '#1a9641';
      case 'Good': return '#a6d96a';
      case 'Fair': return '#f46d43';
      case 'Poor': return '#d73027';
      default: return '#ccc';
    }
  };

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getGradeColor();

  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative flex items-center justify-center p-2 mb-2" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="absolute w-full h-full transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
      </div>
      <span className="text-lg font-medium text-gray-700">{grade}</span>
    </div>
  );
};
