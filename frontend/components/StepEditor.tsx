// StepEditor — Type-specific configuration forms for each step type
'use client';

import { type WorkflowStep } from '@/lib/store';

interface Props {
  step: WorkflowStep;
  onUpdate: (step: WorkflowStep) => void;
}

export default function StepEditor({ step, onUpdate }: Props) {
  const updateConfig = (key: string, value: unknown) => {
    onUpdate({ ...step, config: { ...step.config, [key]: value } });
  };

  const updateName = (name: string) => {
    onUpdate({ ...step, name });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* Step Name */}
      <div className="input-group">
        <label className="input-label">Step Name</label>
        <input
          className="input"
          value={step.name}
          onChange={e => updateName(e.target.value)}
          placeholder="Step name"
        />
      </div>

      {/* Type-specific config */}
      {step.type === 'llm_call' && (
        <>
          <div className="input-group">
            <label className="input-label">Prompt Template</label>
            <textarea
              className="input"
              value={String(step.config.prompt || '')}
              onChange={e => updateConfig('prompt', e.target.value)}
              placeholder="Enter prompt template..."
              rows={4}
            />
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              Use {'{{input}}'} to reference previous step output
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Model</label>
            <select className="input" value={String(step.config.model || 'gemini-2.0-flash')} onChange={e => updateConfig('model', e.target.value)}>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              <option value="gemini-2.0-pro">Gemini 2.0 Pro</option>
              <option value="llama-3.1-70b">Llama 3.1 70B (Groq)</option>
            </select>
          </div>
          <div className="grid grid-2">
            <div className="input-group">
              <label className="input-label">Temperature</label>
              <input
                className="input"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={String(step.config.temperature || '0.7')}
                onChange={e => updateConfig('temperature', parseFloat(e.target.value))}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Max Tokens</label>
              <input
                className="input"
                type="number"
                min="1"
                max="8192"
                value={String(step.config.max_tokens || '1024')}
                onChange={e => updateConfig('max_tokens', parseInt(e.target.value))}
              />
            </div>
          </div>
        </>
      )}

      {step.type === 'http_request' && (
        <>
          <div className="grid grid-2">
            <div className="input-group">
              <label className="input-label">Method</label>
              <select className="input" value={String(step.config.method || 'GET')} onChange={e => updateConfig('method', e.target.value)}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">URL</label>
              <input
                className="input"
                value={String(step.config.url || '')}
                onChange={e => updateConfig('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Headers (JSON)</label>
            <textarea
              className="input"
              value={typeof step.config.headers === 'string' ? step.config.headers : JSON.stringify(step.config.headers || {}, null, 2)}
              onChange={e => updateConfig('headers', e.target.value)}
              placeholder='{"Authorization": "Bearer ..."}'
              rows={3}
            />
          </div>
          <div className="input-group">
            <label className="input-label">Body Template</label>
            <textarea
              className="input"
              value={String(step.config.body || '')}
              onChange={e => updateConfig('body', e.target.value)}
              placeholder='{"data": "{{input}}"}'
              rows={3}
            />
          </div>
        </>
      )}

      {step.type === 'conditional_branch' && (
        <>
          <div className="grid grid-3">
            <div className="input-group">
              <label className="input-label">Field</label>
              <input
                className="input"
                value={String(step.config.field || '')}
                onChange={e => updateConfig('field', e.target.value)}
                placeholder="sentiment"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Operator</label>
              <select className="input" value={String(step.config.operator || '==')} onChange={e => updateConfig('operator', e.target.value)}>
                <option value="==">equals (==)</option>
                <option value="!=">not equals (!=)</option>
                <option value="contains">contains</option>
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Value</label>
              <input
                className="input"
                value={String(step.config.value || '')}
                onChange={e => updateConfig('value', e.target.value)}
                placeholder="negative"
              />
            </div>
          </div>
          <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.15)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)' }}>
            If the condition is <strong>not met</strong>, the next step will be skipped.
          </div>
        </>
      )}

      {step.type === 'approval_gate' && (
        <>
          <div className="input-group">
            <label className="input-label">Required Role</label>
            <select className="input" value={String(step.config.required_role || 'editor')} onChange={e => updateConfig('required_role', e.target.value)}>
              <option value="editor">Editor or higher</option>
              <option value="owner">Owner only</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Approval Message</label>
            <textarea
              className="input"
              value={String(step.config.message || '')}
              onChange={e => updateConfig('message', e.target.value)}
              placeholder="Please review the results and approve to continue..."
              rows={2}
            />
          </div>
          <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(251, 146, 60, 0.05)', border: '1px solid rgba(251, 146, 60, 0.15)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)' }}>
            Workflow execution will <strong>pause</strong> until a user with the required role approves.
          </div>
        </>
      )}

      {step.type === 'db_write' && (
        <>
          <div className="input-group">
            <label className="input-label">Table Name</label>
            <input
              className="input"
              value={String(step.config.table || '')}
              onChange={e => updateConfig('table', e.target.value)}
              placeholder="results"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Data Template</label>
            <textarea
              className="input"
              value={String(step.config.data || '')}
              onChange={e => updateConfig('data', e.target.value)}
              placeholder='{{previous_output}}'
              rows={3}
            />
          </div>
        </>
      )}

      {step.type === 'notify' && (
        <>
          <div className="input-group">
            <label className="input-label">Channel</label>
            <select className="input" value={String(step.config.channel || 'system')} onChange={e => updateConfig('channel', e.target.value)}>
              <option value="system">System Log</option>
              <option value="email">Email</option>
              <option value="webhook">Webhook</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Message Template</label>
            <textarea
              className="input"
              value={String(step.config.message || '')}
              onChange={e => updateConfig('message', e.target.value)}
              placeholder="Workflow completed: {{status}}"
              rows={3}
            />
          </div>
        </>
      )}
    </div>
  );
}
