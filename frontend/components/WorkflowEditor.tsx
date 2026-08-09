// WorkflowEditor — Sequential step list with add/edit/delete/reorder
'use client';

import { useState, useCallback } from 'react';
import { type Workflow, type WorkflowStep, type StepType, useStore } from '@/lib/store';
import StepEditor from './StepEditor';

const STEP_TYPES: { type: StepType; icon: string; label: string; description: string }[] = [
  { type: 'llm_call', icon: '🧠', label: 'LLM Call', description: 'Call an AI model with a prompt' },
  { type: 'http_request', icon: '🌐', label: 'HTTP Request', description: 'Make an external API call' },
  { type: 'conditional_branch', icon: '🔀', label: 'Conditional Branch', description: 'Branch based on a condition' },
  { type: 'approval_gate', icon: '🔒', label: 'Approval Gate', description: 'Pause and wait for manual approval' },
  { type: 'db_write', icon: '💾', label: 'DB Write', description: 'Write data to database' },
  { type: 'notify', icon: '🔔', label: 'Notify', description: 'Send a notification' },
];

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface Props {
  workflow: Workflow;
  canEdit: boolean;
}

export default function WorkflowEditor({ workflow, canEdit }: Props) {
  const { updateWorkflow } = useStore();
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);

  const sortedSteps = [...workflow.steps].sort((a, b) => a.position - b.position);

  const addStep = useCallback((type: StepType) => {
    const newStep: WorkflowStep = {
      id: uuid(),
      workflow_id: workflow.id,
      position: workflow.steps.length,
      type,
      name: STEP_TYPES.find(s => s.type === type)?.label || type,
      config: getDefaultConfig(type),
    };
    updateWorkflow({ ...workflow, steps: [...workflow.steps, newStep] });
    setShowAddStep(false);
    setEditingStepId(newStep.id);
  }, [workflow, updateWorkflow]);

  const removeStep = useCallback((stepId: string) => {
    const filtered = workflow.steps.filter(s => s.id !== stepId);
    // Re-index positions
    const reindexed = filtered
      .sort((a, b) => a.position - b.position)
      .map((s, i) => ({ ...s, position: i }));
    updateWorkflow({ ...workflow, steps: reindexed });
    if (editingStepId === stepId) setEditingStepId(null);
  }, [workflow, updateWorkflow, editingStepId]);

  const moveStep = useCallback((stepId: string, direction: 'up' | 'down') => {
    const sorted = [...workflow.steps].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex(s => s.id === stepId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = sorted[idx].position;
    sorted[idx] = { ...sorted[idx], position: sorted[swapIdx].position };
    sorted[swapIdx] = { ...sorted[swapIdx], position: temp };
    updateWorkflow({ ...workflow, steps: sorted });
  }, [workflow, updateWorkflow]);

  const updateStep = useCallback((updatedStep: WorkflowStep) => {
    updateWorkflow({
      ...workflow,
      steps: workflow.steps.map(s => s.id === updatedStep.id ? updatedStep : s),
    });
  }, [workflow, updateWorkflow]);

  return (
    <div>
      {/* Steps list */}
      {sortedSteps.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: 'var(--space-2xl)' }}>
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No steps defined</div>
            <div className="empty-state-text">Add steps to build your workflow pipeline.</div>
            {canEdit && (
              <button className="btn btn-primary" onClick={() => setShowAddStep(true)}>
                + Add First Step
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {sortedSteps.map((step, idx) => (
            <div key={step.id}>
              {/* Step Card */}
              <div
                className={`step-card ${editingStepId === step.id ? 'step-card-active' : ''}`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  {/* Position number */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    flexShrink: 0,
                    border: '1px solid var(--border-subtle)',
                  }}>
                    {idx + 1}
                  </div>

                  {/* Step info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{step.name}</span>
                      <span className={`step-type-badge step-type-${step.type}`}>
                        {STEP_TYPES.find(s => s.type === step.type)?.icon} {step.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {getStepSummary(step)}
                    </div>
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => moveStep(step.id, 'up')} disabled={idx === 0} title="Move up">↑</button>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => moveStep(step.id, 'down')} disabled={idx === sortedSteps.length - 1} title="Move down">↓</button>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditingStepId(editingStepId === step.id ? null : step.id)} title="Edit">✎</button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeStep(step.id)} title="Delete">✕</button>
                    </div>
                  )}
                </div>

                {/* Expanded Editor */}
                {editingStepId === step.id && canEdit && (
                  <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)' }}>
                    <StepEditor step={step} onUpdate={updateStep} />
                  </div>
                )}
              </div>

              {/* Connector line */}
              {idx < sortedSteps.length - 1 && (
                <div className="step-connector">
                  <div className="step-connector-line" />
                </div>
              )}
            </div>
          ))}

          {/* Add Step button below list */}
          {canEdit && (
            <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddStep(true)}>
                + Add Step
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Step Modal */}
      {showAddStep && (
        <div className="modal-overlay" onClick={() => setShowAddStep(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add Step</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {STEP_TYPES.map(st => (
                <button
                  key={st.type}
                  className="btn btn-ghost"
                  style={{
                    justifyContent: 'flex-start',
                    height: 'auto',
                    padding: 'var(--space-md)',
                    textAlign: 'left',
                  }}
                  onClick={() => addStep(st.type)}
                >
                  <span style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{st.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{st.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{st.description}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowAddStep(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultConfig(type: StepType): Record<string, unknown> {
  switch (type) {
    case 'llm_call': return { prompt: 'Analyze the following input and provide a sentiment analysis:', model: 'gemini-2.0-flash' };
    case 'http_request': return { url: 'https://api.example.com/data', method: 'POST', headers: {}, body: '{}' };
    case 'db_write': return { table: 'results', data: '{{previous_output}}' };
    case 'notify': return { message: 'Workflow step completed successfully', channel: 'system' };
    case 'conditional_branch': return { field: 'sentiment', operator: '==', value: 'negative' };
    case 'approval_gate': return { required_role: 'editor', message: 'Please review and approve this step' };
    default: return {};
  }
}

function getStepSummary(step: WorkflowStep): string {
  switch (step.type) {
    case 'llm_call': return `Prompt: "${String(step.config.prompt || '').slice(0, 60)}..."`;
    case 'http_request': return `${step.config.method || 'GET'} ${step.config.url || ''}`;
    case 'db_write': return `Write to ${step.config.table || 'table'}`;
    case 'notify': return `${step.config.message || 'notification'}`;
    case 'conditional_branch': return `If ${step.config.field} ${step.config.operator} "${step.config.value}"`;
    case 'approval_gate': return `Requires ${step.config.required_role || 'editor'} approval`;
    default: return step.type;
  }
}
