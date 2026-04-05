import React from 'react';
import { Home, Hexagon, Map as MapIcon, Bell, MoreHorizontal } from 'lucide-react';

export type TabType = 'dashboard' | 'hives' | 'field' | 'alerts' | 'more';

interface BottomNavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Today' },
    { id: 'hives', icon: Hexagon, label: 'Hives' },
    { id: 'field', icon: MapIcon, label: 'Field' },
    { id: 'alerts', icon: Bell, label: 'Alerts' },
    { id: 'more', icon: MoreHorizontal, label: 'More' },
  ] as const;

  return (
    <nav className="flex-shrink-0 w-full bg-white border-t border-gray-200 pb-safe z-[4000] px-2 h-16 flex items-center justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id as TabType)}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
              isActive ? 'text-[#5D0623]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1 rounded-xl ${isActive ? 'bg-[#5D0623]/10' : ''}`}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-[#5D0623]' : 'text-gray-500'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

