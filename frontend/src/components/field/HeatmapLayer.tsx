import React from 'react';
import DeckHeatmapLayer from './DeckHeatmapLayer';

interface HeatmapLayerProps {
  selectedMonth: number;
  showHeatmap: boolean;
  showMarkers?: boolean;
  onBestSpotFound?: (lat: number, lng: number, score: number) => void;
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  selectedMonth, showHeatmap
}) => {
  if (!showHeatmap) return null;
  return <DeckHeatmapLayer selectedMonth={selectedMonth} />;
};
