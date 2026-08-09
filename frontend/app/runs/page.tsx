// Runs List Page — All workflow execution runs for current organization
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

export default function RunsPage() {
  const { state, getCurrentOrg, getOrgRuns, getOrgWorkflows } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!state.isAuthenticated) router.replace('/login');
  }, [state.isAuthenticated, router]);

  if (!state.isAuthenticated) return null;

  const org = getCurrentOrg();
  const runs = org ? getOrgRuns(org.id) : [];
  const workflows = org ? getOrgWorkflows(org.id) : [];

  return (
    <AppShell>
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Execution Runs</h1>
          <p className="page-subtitle">{runs.length} run{runs.length !== 1 ? 's' : ''} in {org?.name}</p>
        </div>

        {runs.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">▶</div>
              <div className="empty-state-title">No execution runs yet</div>
              <div className="empty-state-text">
                Trigger a workflow to view live execution logs and progress monitoring.
              </div>
              <Link href="/workflows" className="btn btn-primary">Go to Workflows</Link>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Trigger</th>
                  <th>Progress</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => {
                  const wf = workflows.find(w => w.id === run.workflow_id);
                  const completedSteps = run.step_runs.filter(s => s.status === 'completed' || s.status === 'skipped').length;
                  const totalSteps = run.step_runs.length;
                  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

                  return (
                    <tr
                      key={run.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/runs/${run.id}`)}
                    >
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-primary-hover)' }}>
                        {run.id.slice(0, 8)}...
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {run.workflow_name || wf?.name || 'Unknown'}
                      </td>
                      <td>
                        <span className={`badge badge-${run.status}`}>{run.status}</span>
                      </td>
                      <td style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                        {run.trigger_type}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <div className="progress-bar" style={{ width: 80 }}>
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {completedSteps}/{totalSteps}
                          </span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {new Date(run.started_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
