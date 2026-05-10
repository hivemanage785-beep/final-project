import React from 'react';
import { MapInner } from './MapInner';

interface MapViewProps {
  selectedMonth: number;
  user: any;
}

// Thin wrapper — keeps imports stable across pages
export const MapView: React.FC<MapViewProps> = ({ selectedMonth, user }) => (
  <MapInner selectedMonth={selectedMonth} user={user} />
);
