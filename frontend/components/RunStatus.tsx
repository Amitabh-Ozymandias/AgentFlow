// RunStatus — Live step-by-step execution timeline with real-time updates
'use client';

import { useState } from 'react';
import { type WorkflowRun, type StepRun } from '@/lib/store';
import ApprovalPanel from './ApprovalPanel';

const STEP_ICONS: Record<string, string> = {
  llm_call: '🧠',
  http_request: '🌐',
  db_write: '💾',
  notify: '🔔',
  conditional_branch: '🔀',
  approval_gate: '🔒',
};

interface Props {
  run: WorkflowRun;
}

export default function RunStatus({ run }: Props) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const sortedStepRuns = [...run.step_runs].sort((a, b) => a.position - b.position);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Timeline */}
      <div className="run-timeline">
        {sortedStepRuns.map((sr) => {
          const isSelected = selectedStepId === sr.id;

          return (
            <div key={sr.id} className="timeline-step">
              {/* Dot Icon */}
              <div className={`timeline-dot timeline-dot-${sr.status}`}>
                {sr.status === 'completed' && '✓'}
                {sr.status === 'failed' && '✕'}
                {sr.status === 'paused' && '⏸'}
                {sr.status === 'skipped' && '↷'}
                {sr.status === 'running' && <div className="spinner spinner-sm" />}
                {sr.status === 'pending' && '○'}
              </div>

              {/* Content */}
              <div className="timeline-content">
                <div
                  className="card"
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--border-accent)' : undefined,
                  }}
                  onClick={() => setSelectedStepId(isSelected ? null : sr.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span style={{ fontSize: 16 }}>{STEP_ICONS[sr.step_type] || '⚙'}</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{sr.step_name || sr.step_type}</span>
                      <span className={`badge badge-${sr.status}`}>{sr.status}</span>
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      {sr.started_at && sr.completed_at ? (
                        `${((new Date(sr.completed_at).getTime() - new Date(sr.started_at).getTime()) / 1000).toFixed(1)}s`
                      ) : sr.started_at ? (
                        'Running...'
                      ) : (
                        'Pending'
                      )}
                    </div>
                  </div>

                  {/* Paused Approval Panel */}
                  {sr.status === 'paused' && (
                    <ApprovalPanel runId={run.id} stepRun={sr} />
                  )}

                  {/* Step output summary if completed */}
                  {sr.status === 'completed' && sr.output && Object.keys(sr.output).length > 0 && !isSelected && (
                    <div style={{ marginTop: 'var(--space-xs)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {sr.step_type === 'llm_call' && sr.output.analysis ? String(sr.output.analysis).slice(0, 90) + '...' :
                       sr.step_type === 'http_request' ? `HTTP Status: ${sr.output.status_code}` :
                       sr.step_type === 'conditional_branch' ? `Condition met: ${sr.output.condition_met}` :
                       sr.step_type === 'db_write' ? `Wrote to ${sr.output.table}` :
                       'Completed successfully'}
                    </div>
                  )}

                  {/* Error if failed */}
                  {sr.status === 'failed' && sr.error && (
                    <div style={{ marginTop: 'var(--space-xs)', fontSize: 12, color: '#f87171' }}>
                      Error: {sr.error}
                    </div>
                  )}

                  {/* Expanded Inspector */}
                  {isSelected && (
                    <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)' }}>
                      <div className="grid grid-2">
                        <div>
                          <div className="input-label" style={{ marginBottom: 'var(--space-xs)' }}>Input</div>
                          <pre className="code-block">{JSON.stringify(sr.input || {}, null, 2)}</pre>
                        </div>
                        <div>
                          <div className="input-label" style={{ marginBottom: 'var(--space-xs)' }}>Output</div>
                          <pre className="code-block">{JSON.stringify(sr.output || {}, null, 2)}</pre>
                        </div>
                      </div>
                      {sr.approved_by && (
                        <div style={{ marginTop: 'var(--space-sm)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                          Approved at {new Date(sr.approved_at!).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
