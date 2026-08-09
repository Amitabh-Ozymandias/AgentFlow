// ApprovalPanel — Displayed when a workflow step is paused at an approval gate
'use client';

import { type StepRun, useStore } from '@/lib/store';

interface Props {
  runId: string;
  stepRun: StepRun;
}

export default function ApprovalPanel({ runId, stepRun }: Props) {
  const { approveStep, getCurrentRole } = useStore();
  const role = getCurrentRole();
  const requiredRole = (stepRun.output?.required_role as string) || 'editor';
  
  const canApprove = role === 'owner' || (role === 'editor' && requiredRole !== 'owner');

  return (
    <div className="approval-panel" style={{ marginTop: 'var(--space-md)' }}>
      <div className="approval-panel-title">
        <span>🔒 Approval Required</span>
        <span className="badge badge-paused">Paused</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
        This step (&quot;{stepRun.step_name}&quot;) requires approval from a user with <strong>{requiredRole}</strong> role or higher to proceed.
      </p>

      {stepRun.input && Object.keys(stepRun.input).length > 0 && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div className="input-label" style={{ marginBottom: 'var(--space-xs)' }}>Input Payload</div>
          <pre className="code-block">{JSON.stringify(stepRun.input, null, 2)}</pre>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-md)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          Current Role: <strong style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{role}</strong>
        </div>
        {canApprove ? (
          <button
            className="btn btn-primary"
            onClick={() => approveStep(runId, stepRun.id)}
          >
            ✓ Approve Step & Resume Execution
          </button>
        ) : (
          <div style={{ fontSize: 12, color: '#f87171' }}>
            ✕ Your role ({role}) cannot approve this step (requires {requiredRole})
          </div>
        )}
      </div>
    </div>
  );
}
