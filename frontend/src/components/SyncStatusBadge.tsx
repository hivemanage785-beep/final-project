/**
 * SyncStatusBadge
 * ────────────────
 * Compact, inline badge that shows the save/sync status for any entity.
 * Shows: saving → syncing → synced → failed
 */
import React, { useEffect, useState } from 'react';
import { onSyncEvent } from '../sync/engine';
import { CheckCircle2, CloudOff, RefreshCw, Save } from 'lucide-react';
import { cn } from '../lib/utils';

export type SyncPhase = 'idle' | 'saving' | 'syncing' | 'synced' | 'failed';

interface Props {
  entityId?: string;   // if provided, only tracks events for this specific entity
  className?: string;
  showLabel?: boolean;
}

const PHASE_CONFIG: Record<SyncPhase, { label: string; icon: React.ElementType; cls: string }> = {
  idle:    { label: 'Saved locally', icon: Save,         cls: 'text-slate-400' },
  saving:  { label: 'Saving…',       icon: Save,         cls: 'text-amber-500 animate-pulse' },
  syncing: { label: 'Syncing…',      icon: RefreshCw,    cls: 'text-blue-500 animate-spin' },
  synced:  { label: 'Synced',        icon: CheckCircle2, cls: 'text-green-500' },
  failed:  { label: 'Sync failed',   icon: CloudOff,     cls: 'text-red-500' },
};

export function SyncStatusBadge({ entityId, className, showLabel = true }: Props) {
  const [phase, setPhase] = useState<SyncPhase>('idle');

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const off = onSyncEvent((event) => {
      // If entityId is specified, only react to events for that entity
      if (entityId && event.entityId && event.entityId !== entityId) return;

      if (resetTimer) clearTimeout(resetTimer);

      switch (event.type) {
        case 'saving':  setPhase('saving');  break;
        case 'syncing': setPhase('syncing'); break;
        case 'synced':
          setPhase('synced');
          // Auto-revert to idle after 3 s
          resetTimer = setTimeout(() => setPhase('idle'), 3000);
          break;
        case 'failed':
          setPhase('failed');
          resetTimer = setTimeout(() => setPhase('idle'), 6000);
          break;
        default: break;
      }
    });

    return () => {
      off();
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [entityId]);

  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;

  if (phase === 'idle') return null; // nothing to show when idle

  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold', config.cls, className)}>
      <Icon className="w-3 h-3" />
      {showLabel && config.label}
    </span>
  );
}

/**
 * Global sync indicator — not scoped to a specific entity.
 * Suitable for a header/toolbar area.
 */
export function GlobalSyncIndicator({ className }: { className?: string }) {
  return <SyncStatusBadge className={className} showLabel />;
}
