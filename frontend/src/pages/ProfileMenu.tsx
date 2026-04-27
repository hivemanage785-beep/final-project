import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Settings, Award, QrCode, ChevronRight } from 'lucide-react';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { QRTrace } from './QRTrace';

export const ProfileMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const [showQRTrace, setShowQRTrace] = useState(false);

  if (showQRTrace) {
    return (
      <div className="flex-1 h-full w-full flex flex-col">
        <button
          onClick={() => setShowQRTrace(false)}
          className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white text-[#5D0623] font-bold text-sm"
        >
          ← Back
        </button>
        <QRTrace />
      </div>
    );
  }

  const menuItems = [
    { id: 'qrtrace', icon: QrCode, label: 'Harvest Traceability', action: () => setShowQRTrace(true) },
    { id: 'certs',   icon: Award,  label: 'My Certificates',       action: () => {} },
    { id: 'settings',icon: Settings,label: 'App Settings',          action: () => {} },
  ];

  return (
    <div className="flex-1 bg-gray-50 h-full w-full overflow-y-auto pb-20">
      <div className="bg-white p-6 pt-12 border-b border-gray-200 flex flex-col items-center">
        <ProfileAvatar photoURL={user?.photoURL} displayName={user?.displayName} size="lg" className="shadow-md mb-3 border-2 border-[#5D0623]" />
        <h2 className="text-xl font-bold text-gray-800">{user?.displayName}</h2>
        <p className="text-sm text-gray-500">{user?.email}</p>
        <div className="flex gap-2 mt-3">
          <span className="bg-[#5D0623]/10 text-[#5D0623] px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
            Beekeeper
          </span>
          {(user as any)?.isVerified === true && (
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
              Verified
            </span>
          )}
        </div>
      </div>
      
      <div className="mt-4 bg-white border-y border-gray-200">
        {menuItems.map((item, i) => (
          <button 
            key={i} 
            onClick={item.action}
            className="w-full flex items-center justify-between px-6 py-4 border-b last:border-0 border-gray-100 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <item.icon className="text-[#5D0623]" size={20} />
              <span className="font-medium text-gray-800">{item.label}</span>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </button>
        ))}
      </div>
      
      <div className="mt-8 px-6">
        <button 
          onClick={signOut}
          className="w-full bg-white border border-red-200 text-red-600 font-bold py-3 rounded-xl flex justify-center items-center gap-2 hover:bg-red-50 transition shadow-sm"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </div>
  );
};
