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
    <nav className="flex-shrink-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-100 pb-safe z-[4000] px-6 h-[4.25rem] flex items-center justify-between">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id as TabType)}
            className={`group flex flex-col items-center justify-center w-14 h-full transition-all duration-200 ease-out ${
              isActive ? 'text-[#5D0623]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`relative flex items-center justify-center p-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-[#5D0623]/10 scale-110' : 'bg-transparent scale-100'}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="transition-transform duration-200" />
            </div>
            <span className={`text-[10px] mt-1 font-medium tracking-wide transition-all duration-200 ${isActive ? 'text-[#5D0623] opacity-100' : 'text-gray-500 opacity-80 group-hover:opacity-100'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

