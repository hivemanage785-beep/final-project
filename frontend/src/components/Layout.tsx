import React, { useState, useEffect } from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { Home, Hexagon, Map, Bell, MoreHorizontal, WifiOff, Wifi } from 'lucide-react';

import { TodayPage }  from '../pages/TodayPage';
import { HivesPage }  from '../pages/HivesPage';
import { FieldPage }  from '../pages/FieldPage';
import { AlertsPage } from '../pages/AlertsPage';
import { MorePage }   from '../pages/MorePage';
import { FeedbackHistory } from '../pages/FeedbackHistory';
import { Profile } from '../pages/Profile';
import { Notifications } from '../pages/Notifications';
import { Security } from '../pages/Security';
import { HelpFAQs } from '../pages/HelpFAQs';
import { AboutHiveOps } from '../pages/AboutHiveOps';
import { QRTrace } from '../pages/QRTrace';

const NAV = [
  { to: '/today',  Icon: Home,          label: 'Today'  },
  { to: '/hives',  Icon: Hexagon,       label: 'Hives'  },
  { to: '/field',  Icon: Map,           label: 'Field'  },
  { to: '/alerts', Icon: Bell,          label: 'Alerts' },
  { to: '/more',   Icon: MoreHorizontal, label: 'More'  },
];

export const Layout = ({ user }: { user: any }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [justBackOnline, setJustBackOnline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setJustBackOnline(true);
      setTimeout(() => setJustBackOnline(false), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <div className="app-shell">
      {isOffline && (
        <div style={{ background: '#DC2626', color: 'white', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, zIndex: 1000, justifyContent: 'center' }}>
          <WifiOff size={16} />
          Offline mode active. Some features may be limited.
        </div>
      )}
      {justBackOnline && !isOffline && (
        <div style={{ background: '#16A34A', color: 'white', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, zIndex: 1000, justifyContent: 'center' }}>
          <Wifi size={16} />
          Back online. Syncing data...
        </div>
      )}
      <main className="main-content">
        <Routes>
          <Route path="/"       element={<Navigate to="/today" replace />} />
          <Route path="/today"  element={<TodayPage  user={user} />} />
          <Route path="/hives"  element={<HivesPage />} />
          <Route path="/field"  element={<FieldPage  user={user} />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/more"   element={<MorePage   user={user} />} />
          <Route path="/feedback-history" element={<FeedbackHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/security" element={<Security />} />
          <Route path="/help" element={<HelpFAQs />} />
          <Route path="/about" element={<AboutHiveOps />} />
          <Route path="/trace/:batchId" element={<QRTrace />} />
        </Routes>
      </main>

      <nav className="bottom-nav">
        {NAV.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <Icon size={21} strokeWidth={isActive ? 2.4 : 1.8} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
