// Dashboard — Org overview with usage, recent workflows, recent runs
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import AppShell from '@/components/AppShell';
import UsageCard from '@/components/UsageCard';
import Link from 'next/link';

export default function DashboardPage() {
  const { state, getCurrentOrg, getCurrentRole, getOrgWorkflows, getOrgRuns, getOrgMembers } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!state.isAuthenticated) router.replace('/login');
  }, [state.isAuthenticated, router]);

  if (!state.isAuthenticated) return null;

  const org = getCurrentOrg();
  const role = getCurrentRole();
  const workflows = org ? getOrgWorkflows(org.id) : [];
  const runs = org ? getOrgRuns(org.id) : [];
  const members = org ? getOrgMembers(org.id) : [];
  const recentRuns = runs.slice(0, 5);

  const runningCount = runs.filter(r => r.status === 'running').length;
  const pausedCount = runs.filter(r => r.status === 'paused').length;

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {state.currentUser?.displayName} · {org?.name}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-4" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card" style={{ animationDelay: '0.05s' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-xs)' }}>
              Workflows
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>{workflows.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>active workflows</div>
          </div>
          <div className="card" style={{ animationDelay: '0.1s' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-xs)' }}>
              Total Runs
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>{runs.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {runningCount > 0 && <span style={{ color: 'var(--status-running)' }}>{runningCount} running</span>}
              {runningCount > 0 && pausedCount > 0 && ' · '}
              {pausedCount > 0 && <span style={{ color: 'var(--status-paused)' }}>{pausedCount} paused</span>}
              {runningCount === 0 && pausedCount === 0 && 'no active runs'}
            </div>
          </div>
          <div className="card" style={{ animationDelay: '0.15s' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-xs)' }}>
              Team Members
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>{members.length}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>across all roles</div>
          </div>
          <div className="card" style={{ animationDelay: '0.2s' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-xs)' }}>
              Your Role
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', textTransform: 'capitalize' }}>{role}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>in {org?.name}</div>
          </div>
        </div>

        {/* Usage + Quick Actions */}
        <div className="grid grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
          <UsageCard />
          <div className="card">
            <div className="card-header">
              <span className="card-title">Quick Actions</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {role !== 'viewer' && (
                <Link href="/workflows?create=true" className="btn btn-primary" style={{ justifyContent: 'flex-start' }}>
                  ⚡ Create New Workflow
                </Link>
              )}
              <Link href="/workflows" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                📋 View All Workflows
              </Link>
              <Link href="/runs" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                ▶ View Run History
              </Link>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-header">
            <span className="card-title">Team Members</span>
            <span className="badge badge-pending">{members.length} members</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            {members.map(m => (
              <div key={m.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--bg-glass)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-full)',
                  background: m.role === 'owner' ? '#7c5cff' : m.role === 'editor' ? '#36c5f0' : '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {m.user?.displayName.charAt(0) || '?'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{m.user?.displayName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Runs */}
        {recentRuns.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Runs</span>
              <Link href="/runs" className="btn btn-ghost btn-sm">View All →</Link>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Workflow</th>
                    <th>Status</th>
                    <th>Steps</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map(run => {
                    const wf = workflows.find(w => w.id === run.workflow_id);
                    const completedSteps = run.step_runs.filter(s => s.status === 'completed' || s.status === 'skipped').length;
                    return (
                      <tr key={run.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/runs/${run.id}`)}>
                        <td style={{ fontWeight: 500 }}>{run.workflow_name || wf?.name || 'Unknown'}</td>
                        <td><span className={`badge badge-${run.status}`}>{run.status}</span></td>
                        <td>{completedSteps}/{run.step_runs.length}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{new Date(run.started_at).toLocaleTimeString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
