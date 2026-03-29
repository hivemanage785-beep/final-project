/**
 * System Monitor — Sync health, queue stats, and logs
 */
import React from 'react';
import { 
  Settings, Activity, Cloud, Database, 
  History, RotateCw, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  useSyncQueueStats, 
  useSyncMetrics, 
  useSyncLogs,
  useOnlineStatus,
  useSyncStatus
} from '../../hooks/useLocalData';
import { triggerSync } from '../../sync/engine';
import { syncQueue } from '../../sync/queue';
import { archiveOldRecords } from '../../services/archiveService';
import { KPICard, EmptyState } from '../shared';

export function SystemMonitor() {
  const stats   = useSyncQueueStats();
  const metrics = useSyncMetrics();
  const logs    = useSyncLogs(50);
  const online  = useOnlineStatus();
  const { syncing, lastMessage } = useSyncStatus();

  const handleRetryAll = async () => {
    await syncQueue.resetAllFailed();
    await triggerSync();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">System Monitoring</h1>
          <p className="text-sm text-slate-500">Local-First Sync Engine Status</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => triggerSync()}
            disabled={!online || syncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <RotateCw className={cn("w-4 h-4", syncing && "animate-spin")} />
            {syncing ? 'Syncing...' : 'Force Sync'}
          </button>
        </div>
      </div>

      {/* Connectivity & Queue Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-2">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
              <Cloud className="w-5 h-5" />
            </div>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', online ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}>
              {online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-700">Cloud Link</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Firebase Sync Status</p>
        </div>

        <KPICard label="Jobs in Queue" value={stats?.total ?? 0} icon={Database} color="primary" />
        <KPICard label="Sync Retries" value={metrics?.total.failures ?? 0} icon={RotateCw} color="amber" />
        <KPICard label="Successful Operations" value={metrics?.total.successes ?? 0} icon={CheckCircle2} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Metrics */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Reliability Metrics
          </h2>
          <div className="space-y-4">
            {Object.entries(metrics?.byEntity ?? {}).filter(([, v]) => v.attempts > 0).map(([entity, m]) => (
              <div key={entity} className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{entity}s</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {m.successes} / {m.attempts} success rate
                  </p>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      'h-full transition-all duration-1000',
                      (m.successes/m.attempts) > 0.9 ? 'bg-green-500' : 'bg-amber-500'
                    )}
                    style={{ width: `${(m.successes / m.attempts) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-50 flex gap-2">
            <button 
              onClick={handleRetryAll}
              disabled={ (stats?.failed ?? 0) === 0 }
              className="flex-1 py-2 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-xl hover:bg-amber-100 disabled:opacity-50"
            >
              Retry Failed Jobs
            </button>
            <button 
              onClick={() => archiveOldRecords()}
              className="flex-1 py-2 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-xl hover:bg-slate-200"
            >
              Cleanup Database
            </button>
          </div>
        </section>

        {/* Sync Logs Table */}
        <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Real-time Sync Logs
            </h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Live Feed</span>
            </div>
          </div>
          {logs?.length === 0 ? (
            <EmptyState icon={History} title="No logs available" description="Sync operations will appear here as they occur." />
          ) : (
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Operation</th>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Retries</th>
                    <th className="px-5 py-3">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className={cn(
                          'p-1 rounded-full flex items-center justify-center w-5 h-5',
                          log.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        )}>
                          {log.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-bold text-slate-700">{log.entity}</span>
                        <span className="text-[10px] text-slate-400 ml-1">[{log.type}]</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-400">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {log.retries > 0 ? (
                          <span className="font-bold text-amber-600">{log.retries}</span>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-500 max-w-xs truncate font-mono text-[10px]">
                        {log.message || log.idempotencyKey.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
