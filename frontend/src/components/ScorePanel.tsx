import React, { useState } from 'react';
import { X, Save, AlertTriangle, ShieldAlert } from 'lucide-react';
import { ScoreResult } from '../types/score';
import { ScoreRing } from './ScoreRing';
import { SubScoreBar } from './SubScoreBar';
import { MLWeightsBadge } from './MLWeightsBadge';
import { BottomSheet } from './BottomSheet';
import { FarmerDiscoveryList } from './FarmerDiscoveryList';

interface ScorePanelProps {
  result: ScoreResult | null;
  coords: {lat: number; lng: number} | null;
  month: number;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: () => void;
}

const SEASON_TABLE: Record<number, number> = { 1:60, 2:65, 3:80, 4:85, 5:90, 6:55, 7:50, 8:55, 9:65, 10:70, 11:75, 12:65 };

const MonthlyScoreChart: React.FC<{ 
  weatherScore: number; 
  floraScore: number; 
  mlWeights: { weather: number; flora: number; season: number }; 
  currentMonth: number;
}> = ({ weatherScore, floraScore, mlWeights, currentMonth }) => {
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const getScore = (m: number) => Math.round(
    mlWeights.weather * weatherScore + 
    mlWeights.flora * floraScore + 
    mlWeights.season * (SEASON_TABLE[m] || 60)
  );
  const getColor = (s: number) => {
    if (s >= 80) return 'bg-[#1a9641]';
    if (s >= 60) return 'bg-[#a6d96a]';
    if (s >= 40) return 'bg-[#fee08b]';
    return 'bg-[#d73027]';
  };
  return (
    <div className="bg-gray-50 rounded-xl p-3 mb-6 border border-gray-100">
      <div className="flex items-end justify-between h-12 gap-1 px-1">
        {months.map((m, i) => {
          const s = getScore(i + 1);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div 
                style={{ height: `${s}%` }} 
                className={`w-full rounded-t-sm transition-all ${getColor(s)} ${currentMonth === i + 1 ? 'ring-2 ring-primary-600 ring-offset-1' : 'opacity-70 group-hover:opacity-100'}`}
              />
              <span className={`text-[9px] font-bold ${currentMonth === i + 1 ? 'text-primary-700' : 'text-gray-400'}`}>{m}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ScorePanel: React.FC<ScorePanelProps> = ({
  result, coords, month, loading, error, onClose, onSave
}) => {
  if (loading) {
    return (
      <BottomSheet isOpen={true} onClose={onClose} height="h-[50vh]">
         <div className="flex flex-col items-center justify-center pt-20">
           <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5D0623] border-t-transparent mb-4"></div>
           <p className="text-gray-600 font-medium">Analyzing Placement...</p>
         </div>
      </BottomSheet>
    );
  }

  if (error) {
    return (
      <BottomSheet isOpen={true} onClose={onClose} height="h-[40vh]">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded shadow-sm w-full mt-4">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <button onClick={onClose} className="w-full bg-gray-200 px-4 py-3 rounded-xl font-bold hover:bg-gray-300">Close</button>
      </BottomSheet>
    );
  }

  if (!result || !coords) return null;

  const isLowConfidence = result.mlWarning === 'LOW_CONFIDENCE_PREDICTION';
  const isFallback      = result.mlModel === 'heuristic_fallback';
  const confPct         = result.mlConfidence != null ? Math.round(result.mlConfidence * 100) : null;

  return (
    <BottomSheet isOpen={true} onClose={onClose} title="Location Analysis">
      <div className="text-xs text-center text-gray-500 font-mono mb-4 mt-2">
        {coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E
      </div>

      {isLowConfidence && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-3 mb-4 shadow-sm">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-amber-800 font-bold text-sm">Low Prediction Confidence</p>
            <p className="text-amber-700 text-xs mt-0.5">
              {isFallback
                ? 'ML service unavailable. Heuristic fallback used.'
                : `Model confidence is ${confPct}%.Satellite data may be incomplete.`
              }
            </p>
          </div>
        </div>
      )}

      {isFallback && (
        <div className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4 w-fit">
          <ShieldAlert size={11} />
          Heuristic Fallback Active
        </div>
      )}

      <ScoreRing score={result.score} grade={result.grade} />

      <div className="mt-8 mb-6 space-y-2">
        <SubScoreBar label="Weather" score={result.weatherScore} />
        <SubScoreBar label="Flora" score={result.floraScore} />
        <SubScoreBar label="Season" score={result.seasonScore} />
      </div>

      <MonthlyScoreChart 
        weatherScore={result.weatherScore} 
        floraScore={result.floraScore} 
        mlWeights={result.mlWeightsUsed}
        currentMonth={month}
      />

      <div className="flex justify-center mb-6">
        <MLWeightsBadge weights={result.mlWeightsUsed} />
      </div>

      <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm border border-gray-100 shadow-sm">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-lg">🐝</span>
          <div>
            <span className="font-semibold text-gray-800">Recommended hives: </span>
            <span className={isLowConfidence ? 'text-gray-400 line-through' : 'text-gray-700'}>
              {isLowConfidence ? 'Unavailable' : result.recommendedHives}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-3 mb-3">
          <span className="text-lg">📈</span>
          <div>
            <span className="font-semibold text-gray-800">Yield outlook: </span>
            <span className={isLowConfidence ? 'text-gray-400 line-through' : 'text-gray-700'}>
              {isLowConfidence ? 'Unavailable' : result.yieldOutlook}
            </span>
          </div>
        </div>
      </div>
      
      <FarmerDiscoveryList 
        lat={coords.lat} 
        lng={coords.lng} 
        score={result.score} 
      />

      <div className="h-4" />

      <button 
        onClick={onSave}
        disabled={isLowConfidence}
        className={`w-full font-medium py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm mb-4 ${
          isLowConfidence
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-[#5D0623] hover:bg-[#7a082e] text-white'
        }`}
      >
        <Save size={18} />
        {isLowConfidence ? 'Low Confidence — Cannot Save' : 'Save Location'}
      </button>
    </BottomSheet>
  );
};
