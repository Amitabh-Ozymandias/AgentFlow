// App Shell — Sidebar navigation + main content wrapper
'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import OrgSwitcher from './OrgSwitcher';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '◆', label: 'Dashboard' },
  { href: '/workflows', icon: '⚡', label: 'Workflows' },
  { href: '/runs', icon: '▶', label: 'Runs' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { state, logout, addToast } = useStore();
  const pathname = usePathname();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('agentflow_api_key') || '' : ''));
  const [provider, setProvider] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('agentflow_llm_provider') || 'gemini' : 'gemini'));

  const saveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('agentflow_api_key', apiKey.trim());
      localStorage.setItem('agentflow_llm_provider', provider);
    }
    addToast('success', 'API Key settings saved');
    setShowApiKeyModal(false);
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">⚙</div>
            <span>AgentFlow</span>
          </div>
        </div>

        <div style={{ padding: 'var(--space-md)' }}>
          <OrgSwitcher />
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname.startsWith(item.href) ? 'active' : ''}`}
            >
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <button
            className="nav-item"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            onClick={() => setShowApiKeyModal(true)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <span className="nav-item-icon">🔑</span>
              <span>API Keys</span>
            </div>
            {apiKey ? (
              <span className="badge badge-completed" style={{ fontSize: 10, padding: '2px 6px' }}>Active</span>
            ) : (
              <span className="badge badge-pending" style={{ fontSize: 10, padding: '2px 6px' }}>Not Set</span>
            )}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-full)',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {state.currentUser?.displayName.charAt(0) || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {state.currentUser?.displayName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {state.currentUser?.email}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={logout}>
            ↩ Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">🔑 LLM API Key Configuration</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              Configure your API Key for real LLM execution. You can also place keys directly in <code>frontend/.env.local</code>.
            </p>
            <form onSubmit={saveApiKey}>
              <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="input-label">Provider</label>
                <select className="input" value={provider} onChange={e => setProvider(e.target.value)}>
                  <option value="gemini">Google Gemini (GEMINI_API_KEY)</option>
                  <option value="groq">Groq (GROQ_API_KEY)</option>
                  <option value="openrouter">OpenRouter (OPENROUTER_API_KEY)</option>
                </select>
              </div>
              <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label className="input-label">API Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Paste your API key here..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  Keys can also be configured via server env: <code>GEMINI_API_KEY</code>, <code>GROQ_API_KEY</code>, or <code>OPENROUTER_API_KEY</code> in <code>frontend/.env.local</code>.
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowApiKeyModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save API Key</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast container */}
      {state.toasts.length > 0 && (
        <div className="toast-container">
          {state.toasts.map(toast => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
