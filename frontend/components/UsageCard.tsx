// UsageCard — Quota usage display with circular progress
'use client';

import { useStore } from '@/lib/store';

export default function UsageCard() {
  const { state } = useStore();
  const org = state.organizations.find(o => o.id === state.currentOrgId);
  if (!org) return null;

  const pct = Math.round((org.quota_used / org.quota_allowed) * 100);
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (pct / 100) * circumference;

  let gradientId = 'usage-grad';
  let fillColor = 'url(#usage-grad)';
  if (pct >= 90) fillColor = 'var(--status-failed)';
  else if (pct >= 70) fillColor = 'var(--status-paused)';

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}>
      <div className="usage-ring">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c5cff" />
              <stop offset="100%" stopColor="#36c5f0" />
            </linearGradient>
          </defs>
          <circle className="usage-ring-track" cx="60" cy="60" r="48" />
          <circle
            className="usage-ring-fill"
            cx="60" cy="60" r="48"
            stroke={fillColor}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="usage-ring-text">
          <div className="usage-ring-value">{org.quota_used}</div>
          <div className="usage-ring-label">of {org.quota_allowed}</div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 'var(--space-xs)' }}>
          Workflow Runs
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
          {org.quota_allowed - org.quota_used} runs remaining this {org.quota_period}
        </div>
        <div className="progress-bar" style={{ width: 200 }}>
          <div
            className={`progress-fill ${pct >= 90 ? 'progress-fill-danger' : pct >= 70 ? 'progress-fill-warn' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 'var(--space-xs)' }}>
          {pct}% of quota used
        </div>
      </div>
    </div>
  );
}
