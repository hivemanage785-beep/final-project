/**
 * Admin Layout — sidebar navigation + main content area
 */
import React, { useState } from 'react';
import {
  LayoutDashboard, Hexagon, Users, FlaskConical,
  Bell, BarChart2, Settings, LogOut, ChevronRight,
  Menu, X, Hexagon as Logo,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { GlobalSyncIndicator } from '../SyncStatusBadge';

export type AdminView =
  | 'dashboard' | 'hives' | 'hive-detail'
  | 'users' | 'harvests' | 'harvest-detail'
  | 'alerts' | 'analytics' | 'system';

interface AdminLayoutProps {
  activeView: AdminView;
  onNavigate: (view: AdminView) => void;
  onLogout: () => void;
  userName: string;
  children: React.ReactNode;
}

const NAV_ITEMS: { view: AdminView; label: string; icon: React.ElementType }[] = [
  { view: 'dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { view: 'hives',      label: 'Hives',          icon: Hexagon },
  { view: 'users',      label: 'Users',          icon: Users },
  { view: 'harvests',   label: 'Harvests',       icon: FlaskConical },
  { view: 'alerts',     label: 'Alerts',         icon: Bell },
  { view: 'analytics',  label: 'Analytics',      icon: BarChart2 },
  { view: 'system',     label: 'System',         icon: Settings },
];

export function AdminLayout({ activeView, onNavigate, onLogout, userName, children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        'flex flex-col bg-slate-900 text-white transition-all duration-300 flex-shrink-0',
        sidebarOpen ? 'w-56' : 'w-16'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Logo className="w-5 h-5 text-white fill-current" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="font-black text-sm text-white truncate">BUZZ-OFF</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              title={label}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                activeView === view || (activeView === 'hive-detail' && view === 'hives') || (activeView === 'harvest-detail' && view === 'harvests')
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700/50 p-3 space-y-2">
          {sidebarOpen && (
            <div className="px-2 py-1">
              <p className="text-[11px] font-bold text-white truncate">{userName}</p>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest">Administrator</p>
            </div>
          )}
          <button
            onClick={onLogout}
            title="Log out"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-sm"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-4">
            <GlobalSyncIndicator className="hidden sm:flex" />
            <div className="text-right">
              <p className="text-xs font-bold text-slate-700">{userName}</p>
              <p className="text-[10px] text-slate-400">Administrator</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
