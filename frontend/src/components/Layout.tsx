import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { Home, Hexagon, Map, Bell, MoreHorizontal } from 'lucide-react';

import { TodayPage }  from '../pages/TodayPage';
import { HivesPage }  from '../pages/HivesPage';
import { FieldPage }  from '../pages/FieldPage';
import { AlertsPage } from '../pages/AlertsPage';
import { MorePage }   from '../pages/MorePage';

const NAV = [
  { to: '/today',  Icon: Home,          label: 'Today'  },
  { to: '/hives',  Icon: Hexagon,       label: 'Hives'  },
  { to: '/field',  Icon: Map,           label: 'Field'  },
  { to: '/alerts', Icon: Bell,          label: 'Alerts' },
  { to: '/more',   Icon: MoreHorizontal, label: 'More'  },
];

export const Layout = ({ user }: { user: any }) => (
  <div className="app-shell">
    <main className="main-content">
      <Routes>
        <Route path="/"       element={<Navigate to="/today" replace />} />
        <Route path="/today"  element={<TodayPage  user={user} />} />
        <Route path="/hives"  element={<HivesPage />} />
        <Route path="/field"  element={<FieldPage  user={user} />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/more"   element={<MorePage   user={user} />} />
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
