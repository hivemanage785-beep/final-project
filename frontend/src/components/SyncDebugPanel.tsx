/**
 * SyncDebugPanel — v2
 * Shows: queue stats, sync metrics, retry histogram, sync logs, action buttons.
 * Only a small toggle button is visible by default.
 */
import React, { useState } from 'react';
import {
  useSyncQueueStats,
  useSyncQueueItems,
  useOnlineStatus,
  useSyncStatus,
  useSyncMetrics,
  useSyncLogs,
} from '../hooks/useLocalData';
import { triggerSync } from '../sync/engine';
import { syncQueue } from '../sync/queue';
import { archiveOldRecords } from '../services/archiveService';
import { format } from 'date-fns';

export function SyncDebugPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'queue' | 'metrics' | 'logs'>('queue');

  const stats   = useSyncQueueStats();
  const items   = useSyncQueueItems();
  const online  = useOnlineStatus();
  const { syncing, lastMessage } = useSyncStatus();
  const metrics = useSyncMetrics();
  const logs    = useSyncLogs(30);

  const hasPending = (stats?.pending ?? 0) > 0 || (stats?.failed ?? 0) > 0;

  return (
    <div className="fixed bottom-20 right-4 z-50 font-mono text-xs select-none">
      {/* Toggle Pill */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg text-white text-[10px] font-bold uppercase tracking-widest transition-all ${
          hasPending ? 'bg-amber-500 animate-pulse'
          : online   ? 'bg-green-600'
                     : 'bg-slate-500'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${online ? 'bg-white' : 'bg-red-300'}`} />
        {syncing ? 'Syncing…' : online ? 'Online' : 'Offline'}
        {hasPending && ` · ${(stats?.pending ?? 0) + (stats?.failed ?? 0)} queued`}
      </button>

      {/* Panel */}
      {open && (
        <div className="mt-2 w-96 bg-slate-900 text-slate-200 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <span className="font-bold text-white text-[11px] uppercase tracking-widest">Sync Debug — v2</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {(['queue', 'metrics', 'logs'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-[10px] uppercase font-bold tracking-widest ${
                  tab === t ? 'text-white border-b-2 border-blue-400' : 'text-slate-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ── Queue Tab ─── */}
          {tab === 'queue' && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-px bg-slate-700 text-center">
                {[
                  { label: 'Pending',    value: stats?.pending ?? 0,    color: 'text-amber-400' },
                  { label: 'Processing', value: stats?.processing ?? 0, color: 'text-blue-400' },
                  { label: 'Failed',     value: stats?.failed ?? 0,     color: 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-900 py-3">
                    <div className={`text-lg font-black ${color}`}>{value}</div>
                    <div className="text-slate-400 text-[9px] uppercase">{label}</div>
                  </div>
                ))}
              </div>

              {/* Retry histogram */}
              {stats?.retryDepths && Object.keys(stats.retryDepths).length > 0 && (
                <div className="px-4 py-2 border-b border-slate-700">
                  <p className="text-slate-500 text-[9px] uppercase mb-1">Retry Depth</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(stats.retryDepths).map(([depth, count]) => (
                      <span key={depth} className="bg-slate-800 px-2 py-0.5 rounded text-[9px]">
                        ↺{depth}: <span className="text-amber-400">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Last message */}
              {lastMessage && (
                <div className="px-4 py-1.5 text-slate-400 text-[9px] border-b border-slate-700 truncate">{lastMessage}</div>
              )}

              {/* Actions */}
              <div className="flex gap-2 px-4 py-2 border-b border-slate-700">
                <button
                  onClick={() => triggerSync()}
                  disabled={!online || syncing}
                  className="flex-1 py-1.5 bg-blue-600 rounded text-white font-bold text-[10px] disabled:opacity-40"
                >
                  Force Sync
                </button>
                <button
                  onClick={async () => {
                    await syncQueue.resetAllFailed();
                    await triggerSync();
                  }}
                  disabled={!online || syncing || (stats?.failed ?? 0) === 0}
                  className="flex-1 py-1.5 bg-slate-700 rounded text-white font-bold text-[10px] disabled:opacity-40"
                >
                  Retry All
                </button>
                <button
                  onClick={() => archiveOldRecords()}
                  className="flex-1 py-1.5 bg-slate-700 rounded text-white font-bold text-[10px]"
                >
                  Archive
                </button>
              </div>

              {/* Queue items */}
              <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                {items?.length === 0 && (
                  <div className="text-center py-4 text-slate-500">Queue is empty ✓</div>
                )}
                {items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-800 rounded px-2 py-1">
                    <div>
                      <span className={`font-bold ${item.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                        [{item.type}]
                      </span>{' '}
                      <span className="text-slate-300">{item.entity}</span>
                      <span className="text-slate-500 ml-1 text-[9px]">{item.priority}</span>
                    </div>
                    <div className="text-slate-500">
                      {item.retries > 0 && <span className="text-red-400 mr-1">↺{item.retries}</span>}
                      {item.status}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Metrics Tab ─── */}
          {tab === 'metrics' && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Attempts',  value: metrics?.total.attempts,  color: 'text-blue-400' },
                  { label: 'Successes', value: metrics?.total.successes, color: 'text-green-400' },
                  { label: 'Failures',  value: metrics?.total.failures,  color: 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-slate-800 rounded py-2">
                    <div className={`text-lg font-black ${color}`}>{value ?? 0}</div>
                    <div className="text-slate-400 text-[9px]">{label}</div>
                  </div>
                ))}
              </div>

              {metrics?.lastSyncAt && (
                <p className="text-slate-400 text-[9px]">
                  Last sync: {format(new Date(metrics.lastSyncAt), 'HH:mm:ss')}
                </p>
              )}

              <div className="space-y-1">
                <p className="text-slate-500 text-[9px] uppercase">By Entity</p>
                {Object.entries(metrics?.byEntity ?? {}).filter(([, v]) => v.attempts > 0).map(([entity, v]) => (
                  <div key={entity} className="flex justify-between bg-slate-800 rounded px-2 py-1">
                    <span className="text-slate-300">{entity}</span>
                    <span className="text-[9px] space-x-2">
                      <span className="text-blue-400">{v.attempts}att</span>
                      <span className="text-green-400">{v.successes}ok</span>
                      <span className="text-red-400">{v.failures}err</span>
                      {v.maxRetries > 0 && <span className="text-amber-400">↺{v.maxRetries}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Logs Tab ─── */}
          {tab === 'logs' && (
            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
              {(logs?.length ?? 0) === 0 && (
                <div className="text-center py-4 text-slate-500">No sync logs yet</div>
              )}
              {logs?.map((log) => (
                <div key={log.id} className="bg-slate-800 rounded px-2 py-1.5 space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className={log.status === 'success' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                      {log.status === 'success' ? '✓' : '✗'} {log.entity} [{log.type}]
                    </span>
                    <span className="text-slate-500 text-[9px]">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                  </div>
                  {log.message && (
                    <p className="text-red-300 text-[9px] truncate">{log.message}</p>
                  )}
                  {log.retries > 0 && (
                    <p className="text-amber-400 text-[9px]">After {log.retries} retries</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
