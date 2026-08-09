// TriggerConfig — Workflow trigger type selection and configuration
'use client';

import { type Workflow, type TriggerType, useStore } from '@/lib/store';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const TRIGGER_TYPES: { type: TriggerType; icon: string; label: string; description: string }[] = [
  { type: 'manual', icon: '👆', label: 'Manual', description: 'Triggered by clicking the Run button' },
  { type: 'webhook', icon: '🔗', label: 'Webhook', description: 'Triggered by an external HTTP POST request' },
  { type: 'scheduled', icon: '⏰', label: 'Scheduled', description: 'Triggered on a cron schedule' },
  { type: 'database_event', icon: '🗄️', label: 'Database Event', description: 'Triggered by a database change' },
];

interface Props {
  workflow: Workflow;
  canEdit: boolean;
}

export default function TriggerConfig({ workflow, canEdit }: Props) {
  const { updateWorkflow } = useStore();

  const activeTriggers = new Set(workflow.triggers.map(t => t.type));

  const toggleTrigger = (type: TriggerType) => {
    if (!canEdit) return;
    if (activeTriggers.has(type)) {
      // Remove trigger
      updateWorkflow({
        ...workflow,
        triggers: workflow.triggers.filter(t => t.type !== type),
      });
    } else {
      // Add trigger
      const config: Record<string, unknown> = {};
      if (type === 'webhook') config.token = uuid();
      if (type === 'scheduled') config.cron = '0 9 * * 1-5';
      updateWorkflow({
        ...workflow,
        triggers: [
          ...workflow.triggers,
          { id: uuid(), workflow_id: workflow.id, type, config, enabled: true },
        ],
      });
    }
  };

  const updateTriggerConfig = (triggerId: string, key: string, value: unknown) => {
    updateWorkflow({
      ...workflow,
      triggers: workflow.triggers.map(t =>
        t.id === triggerId ? { ...t, config: { ...t.config, [key]: value } } : t
      ),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {TRIGGER_TYPES.map(tt => {
        const trigger = workflow.triggers.find(t => t.type === tt.type);
        const isActive = !!trigger;

        return (
          <div key={tt.type} className={`card ${isActive ? '' : ''}`} style={{
            borderColor: isActive ? 'var(--border-accent)' : undefined,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span style={{ fontSize: 24 }}>{tt.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{tt.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tt.description}</div>
              </div>
              {canEdit && (
                <button
                  className={`btn btn-sm ${isActive ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => toggleTrigger(tt.type)}
                >
                  {isActive ? '✓ Enabled' : 'Enable'}
                </button>
              )}
            </div>

            {/* Type-specific config */}
            {isActive && trigger && (
              <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)' }}>
                {tt.type === 'webhook' && (
                  <div className="input-group">
                    <label className="input-label">Webhook Token</label>
                    <div className="code-block" style={{ fontSize: 11 }}>
                      {trigger.config.token as string || 'generating...'}
                    </div>
                  </div>
                )}
                {tt.type === 'scheduled' && (
                  <div className="input-group">
                    <label className="input-label">Cron Expression</label>
                    <input
                      className="input"
                      value={String(trigger.config.cron || '')}
                      onChange={e => updateTriggerConfig(trigger.id, 'cron', e.target.value)}
                      placeholder="0 9 * * 1-5"
                      disabled={!canEdit}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      Example: <code>0 9 * * 1-5</code> = weekdays at 9 AM
                    </div>
                  </div>
                )}
                {tt.type === 'database_event' && (
                  <div className="grid grid-2">
                    <div className="input-group">
                      <label className="input-label">Table</label>
                      <input
                        className="input"
                        value={String(trigger.config.table || '')}
                        onChange={e => updateTriggerConfig(trigger.id, 'table', e.target.value)}
                        placeholder="orders"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Event</label>
                      <select
                        className="input"
                        value={String(trigger.config.event || 'INSERT')}
                        onChange={e => updateTriggerConfig(trigger.id, 'event', e.target.value)}
                        disabled={!canEdit}
                      >
                        <option value="INSERT">INSERT</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                  </div>
                )}
                {tt.type === 'manual' && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Use the &quot;Run Workflow&quot; button to trigger manually.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
