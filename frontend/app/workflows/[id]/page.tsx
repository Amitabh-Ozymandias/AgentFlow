// Workflow Detail / Editor Page
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import AppShell from '@/components/AppShell';
import WorkflowEditor from '@/components/WorkflowEditor';
import TriggerConfig from '@/components/TriggerConfig';
import Link from 'next/link';

export default function WorkflowDetailPage() {
  const { state, getCurrentRole, triggerRun, addToast } = useStore();
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;
  const [activeTab, setActiveTab] = useState<'steps' | 'triggers'>('steps');
  const [runInput, setRunInput] = useState('');
  const [showRunModal, setShowRunModal] = useState(false);

  useEffect(() => {
    if (!state.isAuthenticated) router.replace('/login');
  }, [state.isAuthenticated, router]);

  if (!state.isAuthenticated) return null;

  const workflow = state.workflows.find(w => w.id === workflowId);
  const role = getCurrentRole();
  const canEdit = role === 'owner' || role === 'editor';
  const canRun = role === 'owner' || role === 'editor';

  if (!workflow) {
    return (
      <AppShell>
        <div className="page-container">
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">Workflow not found</div>
              <div className="empty-state-text">This workflow may have been deleted or you don&apos;t have access.</div>
              <Link href="/workflows" className="btn btn-primary">← Back to Workflows</Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleRun = () => {
    let input = {};
    if (runInput.trim()) {
      try {
        input = JSON.parse(runInput);
      } catch {
        addToast('error', 'Invalid JSON input');
        return;
      }
    }
    const run = triggerRun(workflow.id, input);
    if (run) {
      setShowRunModal(false);
      setRunInput('');
      router.push(`/runs/${run.id}`);
    }
  };

  // Find webhook trigger token
  const webhookTrigger = workflow.triggers.find(t => t.type === 'webhook');
  const webhookUrl = webhookTrigger
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/${webhookTrigger.config.token || workflow.id}`
    : null;

  return (
    <AppShell>
      <div className="page-container">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
              <Link href="/workflows" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>← Workflows</Link>
            </div>
            <h1 className="page-title">{workflow.name}</h1>
            <p className="page-subtitle">
              {workflow.description || 'No description'} · {workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {canRun && workflow.steps.length > 0 && (
              <button className="btn btn-primary" onClick={() => setShowRunModal(true)}>
                ▶ Run Workflow
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ maxWidth: 300, marginBottom: 'var(--space-xl)' }}>
          <button className={`tab ${activeTab === 'steps' ? 'active' : ''}`} onClick={() => setActiveTab('steps')}>
            Steps ({workflow.steps.length})
          </button>
          <button className={`tab ${activeTab === 'triggers' ? 'active' : ''}`} onClick={() => setActiveTab('triggers')}>
            Triggers
          </button>
        </div>

        {/* Content */}
        {activeTab === 'steps' && (
          <WorkflowEditor workflow={workflow} canEdit={canEdit} />
        )}

        {activeTab === 'triggers' && (
          <TriggerConfig workflow={workflow} canEdit={canEdit} />
        )}

        {/* Webhook URL display */}
        {webhookUrl && (
          <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-sm)' }}>
              Webhook URL
            </div>
            <div className="code-block" style={{ wordBreak: 'break-all' }}>
              POST {webhookUrl}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 'var(--space-sm)' }}>
              Send a POST request with a JSON body to trigger this workflow externally.
            </div>
          </div>
        )}

        {/* Run Modal */}
        {showRunModal && (
          <div className="modal-overlay" onClick={() => setShowRunModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2 className="modal-title">Run Workflow</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                Executing &quot;{workflow.name}&quot; with {workflow.steps.length} steps.
              </p>
              <div className="input-group">
                <label className="input-label">Input Data (JSON, optional)</label>
                <textarea
                  className="input"
                  value={runInput}
                  onChange={e => setRunInput(e.target.value)}
                  placeholder='{"review": "Great product!", "customer": "John"}'
                  rows={4}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                />
              </div>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowRunModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleRun}>▶ Run Now</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
