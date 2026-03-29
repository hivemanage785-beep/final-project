/**
 * Admin Dashboard — KPI cards, priority alerts, activity feed
 */
import React from 'react';
import { Hexagon, Bell, FlaskConical, Activity, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { KPICard, HealthBadge, PriorityBadge, EmptyState } from '../shared';
import { useHives, useActiveAlerts, useHarvests } from '../../hooks/useLocalData';
import type { AdminView } from './AdminLayout';

interface AdminDashboardProps {
  onNavigate: (view: AdminView, id?: string) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const hives    = useHives() ?? [];
  const alerts   = useActiveAlerts() ?? [];
  const harvests = useHarvests() ?? [];

  const activeHives   = hives.filter((h) => h.status === 'active').length;
  const weakHives     = hives.filter((h) => h.health < 50 && h.health >= 30).length;
  const criticalHives = hives.filter((h) => h.health < 30).length;
  const totalYield    = harvests.reduce((s, h) => s + (h.quantity ?? 0), 0);
  const highAlerts    = alerts.filter((a) => a.priority === 'high').length;

  const recentActivity = [
    ...alerts.slice(0, 3).map((a) => ({
      id: a.id, type: 'alert' as const, label: a.message,
      sub: `Priority: ${a.priority}`, time: a.timestamp,
    })),
    ...harvests.slice(0, 2).map((h) => ({
      id: h.id, type: 'harvest' as const, label: `Batch ${h.batchId}`,
      sub: `${h.quantity}kg ${h.floraType}`, time: h.timestamp,
    })),
  ].sort((a, b) => b.time - a.time).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Heritage Apiary Management</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Hives"    value={hives.length}   icon={Hexagon}      color="primary" onClick={() => onNavigate('hives')} />
        <KPICard label="Active"         value={activeHives}    icon={Activity}     color="green" />
        <KPICard label="Active Alerts"  value={alerts.length}  icon={Bell}         color={highAlerts > 0 ? 'red' : 'amber'} onClick={() => onNavigate('alerts')} />
        <KPICard label="Total Yield kg" value={totalYield.toFixed(1)} icon={FlaskConical} color="primary" onClick={() => onNavigate('harvests')} />
      </div>

      {/* Colony health summary */}
      {(weakHives > 0 || criticalHives > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {weakHives > 0 && <KPICard label="Weak Colonies"     value={weakHives}     icon={AlertTriangle} color="amber" onClick={() => onNavigate('hives')} />}
          {criticalHives > 0 && <KPICard label="Critical Colonies" value={criticalHives}  icon={AlertTriangle} color="red"   onClick={() => onNavigate('hives')} />}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Alerts Panel */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-700">Active Alerts</h2>
            <button onClick={() => onNavigate('alerts')} className="text-xs text-primary font-semibold hover:underline">View all</button>
          </div>
          {alerts.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No active alerts" description="All hives are operating normally." />
          ) : (
            <ul className="divide-y divide-slate-50">
              {[...alerts].sort((a, b) => {
                const p = { high: 0, medium: 1, low: 2 };
                return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
              }).slice(0, 6).map((alert) => (
                <li key={alert.id}
                  onClick={() => onNavigate('alerts')}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    alert.priority === 'high' ? 'bg-red-500' :
                    alert.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{alert.message}</p>
                    <p className="text-[11px] text-slate-400">Hive {alert.hiveId || 'N/A'} · {format(new Date(alert.timestamp), 'dd MMM HH:mm')}</p>
                  </div>
                  <PriorityBadge priority={alert.priority} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Activity Feed */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-700">Recent Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" description="Actions will appear here as data comes in." />
          ) : (
            <ul className="divide-y divide-slate-50">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.type === 'alert' ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'
                  }`}>
                    {item.type === 'alert' ? <Bell className="w-4 h-4" /> : <FlaskConical className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{item.label}</p>
                    <p className="text-[11px] text-slate-400">{item.sub}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">{format(new Date(item.time), 'HH:mm')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Hive Health Snapshot */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
          <h2 className="font-bold text-slate-700">Hive Health Snapshot</h2>
          <button onClick={() => onNavigate('hives')} className="text-xs text-primary font-semibold hover:underline">Manage hives</button>
        </div>
        {hives.length === 0 ? (
          <EmptyState icon={Hexagon} title="No hives yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 text-left">Hive</th>
                  <th className="px-5 py-2.5 text-left">Apiary</th>
                  <th className="px-5 py-2.5 text-left">Health</th>
                  <th className="px-5 py-2.5 text-left">Temp</th>
                  <th className="px-5 py-2.5 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {hives.slice(0, 8).map((hive) => (
                  <tr key={hive.id}
                    onClick={() => onNavigate('hive-detail', hive.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-semibold text-slate-700">{hive.name}</td>
                    <td className="px-5 py-3 text-slate-500">{hive.apiary}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <HealthBadge health={hive.health} />
                        <span className="font-mono text-xs">{hive.health}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-600">{hive.temp}°C</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        hive.status === 'active' ? 'bg-green-100 text-green-700' :
                        hive.status === 'harvested' ? 'bg-primary/10 text-primary' :
                        'bg-slate-100 text-slate-600'
                      }`}>{hive.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
