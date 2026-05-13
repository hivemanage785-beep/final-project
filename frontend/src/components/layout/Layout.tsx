import React, { useState, useEffect } from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { Home, Hexagon, Map, Bell, MoreHorizontal, WifiOff, Wifi } from 'lucide-react';

import { TodayPage }  from '../../pages/TodayPage';
import { HivesPage }  from '../../pages/HivesPage';
import { FieldPage }  from '../../pages/FieldPage';
import { AlertsPage } from '../../pages/AlertsPage';
import { MorePage }   from '../../pages/MorePage';
import { FeedbackHistory } from '../../pages/FeedbackHistory';
import { Profile } from '../../pages/Profile';
import { Notifications } from '../../pages/Notifications';
import { Security } from '../../pages/Security';
import { HelpFAQs } from '../../pages/HelpFAQs';
import { AboutHiveOps } from '../../pages/AboutHiveOps';
import { QRTrace } from '../../pages/QRTrace';

const NAV = [
  { to: '/today',  Icon: Home,          label: 'Today'  },
  { to: '/hives',  Icon: Hexagon,       label: 'Hives'  },
  { to: '/field',  Icon: Map,           label: 'Field'  },
  { to: '/alerts', Icon: Bell,          label: 'Alerts' },
  { to: '/more',   Icon: MoreHorizontal, label: 'More'  },
];

import { useSync } from '../../hooks/useSync';
import { GlobalOperationalStatus } from '../states/OperationalUI';

import { ErrorBoundary } from '../states/ErrorBoundary';

export const Layout = ({ user }: { user: any }) => {
  const { isOnline, isSyncing, pendingCount } = useSync();

  return (
    <div className="app-shell">
      {user && (
        <GlobalOperationalStatus 
          isOnline={isOnline} 
          isSyncing={isSyncing} 
          pendingCount={pendingCount} 
        />
      )}
      <main className="main-content">
        <Routes>
          <Route path="/"       element={<Navigate to="/today" replace />} />
          <Route path="/today"  element={<ErrorBoundary moduleName="Dashboard"><TodayPage user={user} /></ErrorBoundary>} />
          <Route path="/hives"  element={<ErrorBoundary moduleName="Inventory"><HivesPage /></ErrorBoundary>} />
          <Route path="/field"  element={<ErrorBoundary moduleName="Discovery Map"><FieldPage user={user} /></ErrorBoundary>} />
          <Route path="/alerts" element={<ErrorBoundary moduleName="Intelligence Feed"><AlertsPage /></ErrorBoundary>} />
          <Route path="/more"   element={<MorePage user={user} />} />
          <Route path="/feedback-history" element={<FeedbackHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/security" element={<Security />} />
          <Route path="/help" element={<HelpFAQs />} />
          <Route path="/about" element={<AboutHiveOps />} />
          <Route path="/trace/:batchId" element={<ErrorBoundary moduleName="Traceability Engine"><QRTrace /></ErrorBoundary>} />
        </Routes>
      </main>

      {user && (
        <nav className="bottom-nav">
          {NAV.map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {({ isActive }) => (
                <div className="flex flex-col items-center justify-center pt-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${isActive ? 'bg-[#5D0623]/10 text-[#5D0623]' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`mt-1 text-[10px] font-bold tracking-wide transition-colors ${isActive ? 'text-[#5D0623]' : 'text-slate-400'}`}>{label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
};
