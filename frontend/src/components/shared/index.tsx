/**
 * Shared UI building blocks
 * KPICard, HealthBadge, PriorityBadge, EmptyState
 */
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'green' | 'amber' | 'red';
  onClick?: () => void;
}

const colorMap = {
  primary: 'bg-primary/10 text-primary',
  green:   'bg-green-100 text-green-700',
  amber:   'bg-amber-100 text-amber-700',
  red:     'bg-red-100 text-red-700',
};

export function KPICard({ label, value, sub, icon: Icon, trend, trendValue, color = 'primary', onClick }: KPICardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      <div className="flex justify-between items-start">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && trendValue && (
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded-full',
            trend === 'up'   ? 'bg-green-50 text-green-600'  :
            trend === 'down' ? 'bg-red-50 text-red-600'      :
                               'bg-slate-50 text-slate-500'
          )}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-800">{value}</p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Health Badge ─────────────────────────────────────────────────────────────

interface HealthBadgeProps {
  health: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function HealthBadge({ health, size = 'md', showLabel = false }: HealthBadgeProps) {
  const color = health >= 80 ? 'bg-green-500' : health >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const label = health >= 80 ? 'Healthy' : health >= 50 ? 'Warning' : 'Critical';
  const sz    = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('rounded-full flex-shrink-0', color, sz)} />
      {showLabel && (
        <span className={cn(
          'text-[10px] font-bold uppercase tracking-widest',
          health >= 80 ? 'text-green-700' : health >= 50 ? 'text-amber-700' : 'text-red-700'
        )}>
          {label}
        </span>
      )}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
  className?: string;
}

const priorityStyles = {
  high:   'bg-red-100 text-red-700 border border-red-200',
  medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  low:    'bg-slate-100 text-slate-600 border border-slate-200',
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest', priorityStyles[priority], className)}>
      {priority}
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-base font-bold text-slate-700">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-xs">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-5 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ─── Health Score Ring ────────────────────────────────────────────────────────

export function HealthRing({ health, size = 64 }: { health: number; size?: number }) {
  const r = (size / 2) - 4;
  const circumference = 2 * Math.PI * r;
  const dash = (health / 100) * circumference;
  const color = health >= 80 ? '#22c55e' : health >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
    </svg>
  );
}
