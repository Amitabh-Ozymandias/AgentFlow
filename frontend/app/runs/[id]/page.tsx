// Run Detail Page — Real-time execution monitor for a single workflow run
'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import AppShell from '@/components/AppShell';
import RunStatus from '@/components/RunStatus';
import Link from 'next/link';

export default function RunDetailPage() {
  const { state } = useStore();
  const router = useRouter();
  const params = useParams();
  const runId = params.id as string;

  useEffect(() => {
    if (!state.isAuthenticated) router.replace('/login');
  }, [state.isAuthenticated, router]);

  if (!state.isAuthenticated) return null;

  const run = state.runs.find(r => r.id === runId);
  const workflow = run ? state.workflows.find(w => w.id === run.workflow_id) : null;

  if (!run) {
    return (
      <AppShell>
        <div className="page-container">
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">Run not found</div>
              <div className="empty-state-text">This run ID does not exist or you don&apos;t have permission to view it.</div>
              <Link href="/runs" className="btn btn-primary">← Back to Runs</Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const completedSteps = run.step_runs.filter(s => s.status === 'completed' || s.status === 'skipped').length;
  const totalSteps = run.step_runs.length;
  const duration = run.completed_at
    ? ((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(2) + 's'
    : 'In progress';

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
              <Link href="/runs" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>← Runs</Link>
              {workflow && (
                <>
                  <span style={{ color: 'var(--text-tertiary)' }}>/</span>
                  <Link href={`/workflows/${workflow.id}`} style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    {workflow.name}
                  </Link>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <h1 className="page-title" style={{ marginBottom: 0 }}>
                Run {run.id.slice(0, 8)}
              </h1>
              <span className={`badge badge-${run.status}`}>{run.status}</span>
            </div>
            <p className="page-subtitle" style={{ marginTop: 'var(--space-xs)' }}>
              Triggered via {run.trigger_type} · {completedSteps}/{totalSteps} steps completed · Duration: {duration}
            </p>
          </div>

          {workflow && (
            <Link href={`/workflows/${workflow.id}`} className="btn btn-secondary">
              ✎ Edit Workflow
            </Link>
          )}
        </div>

        {/* Input parameters card if present */}
        {run.input && Object.keys(run.input).length > 0 && (
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-sm)' }}>
              Run Input Payload
            </div>
            <pre className="code-block">{JSON.stringify(run.input, null, 2)}</pre>
          </div>
        )}

        {/* Step-by-step timeline monitor */}
        <RunStatus run={run} />
      </div>
    </AppShell>
  );
}
