// Workflows List — View all workflows + create new
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

const STEP_ICONS: Record<string, string> = {
  llm_call: '🧠',
  http_request: '🌐',
  db_write: '💾',
  notify: '🔔',
  conditional_branch: '🔀',
  approval_gate: '🔒',
};

function WorkflowsContent() {
  const { state, getCurrentOrg, getCurrentRole, getOrgWorkflows, createWorkflow, deleteWorkflow, addToast } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (!state.isAuthenticated) router.replace('/login');
  }, [state.isAuthenticated, router]);

  useEffect(() => {
    if (searchParams.get('create') === 'true') setShowCreate(true);
  }, [searchParams]);

  if (!state.isAuthenticated) return null;

  const org = getCurrentOrg();
  const role = getCurrentRole();
  const workflows = org ? getOrgWorkflows(org.id) : [];
  const canEdit = role === 'owner' || role === 'editor';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const wf = createWorkflow(newName.trim(), newDesc.trim());
    addToast('success', `Workflow "${wf.name}" created`);
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    router.push(`/workflows/${wf.id}`);
  };

  const handleDelete = (e: React.MouseEvent, wfId: string, wfName: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (role !== 'owner') { addToast('error', 'Only owners can delete workflows'); return; }
    deleteWorkflow(wfId);
    addToast('success', `Workflow "${wfName}" deleted`);
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Workflows</h1>
          <p className="page-subtitle">{workflows.length} workflow{workflows.length !== 1 ? 's' : ''} in {org?.name}</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + New Workflow
          </button>
        )}
      </div>

      {workflows.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <div className="empty-state-title">No workflows yet</div>
            <div className="empty-state-text">
              Create your first workflow to start automating with AI agents.
            </div>
            {canEdit && (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                + Create Workflow
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-2">
          {workflows.map((wf, i) => (
            <Link href={`/workflows/${wf.id}`} key={wf.id}>
              <div className="card card-clickable" style={{ animationDelay: `${i * 0.05}s`, height: '100%' }}>
                <div className="card-header">
                  <span className="card-title">{wf.name}</span>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                    <span className="badge badge-pending">{wf.steps.length} steps</span>
                    {role === 'owner' && (
                      <button className="btn btn-danger btn-sm btn-icon" onClick={(e) => handleDelete(e, wf.id, wf.name)} title="Delete">
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {wf.description && (
                  <p className="card-description">{wf.description}</p>
                )}
                {wf.steps.length > 0 && (
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
                    {wf.steps.sort((a, b) => a.position - b.position).map(step => (
                      <span key={step.id} className={`step-type-badge step-type-${step.type}`}>
                        {STEP_ICONS[step.type]} {step.name || step.type.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 'var(--space-md)', fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Updated {new Date(wf.updated_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Create New Workflow</h2>
            <form onSubmit={handleCreate}>
              <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="input-label">Workflow Name</label>
                <input
                  className="input"
                  placeholder="e.g., Customer Review Workflow"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Description (optional)</label>
                <textarea
                  className="input"
                  placeholder="What does this workflow do?"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Workflow</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="page-container"><div className="spinner spinner-lg" /></div>}>
        <WorkflowsContent />
      </Suspense>
    </AppShell>
  );
}
