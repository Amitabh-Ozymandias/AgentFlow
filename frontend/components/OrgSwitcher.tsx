// OrgSwitcher — Switch between organizations
'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';

const ORG_COLORS = ['#7c5cff', '#36c5f0', '#34d399', '#fb923c', '#ec4899'];

export default function OrgSwitcher() {
  const { state, switchOrg, getCurrentRole } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentOrg = state.organizations.find(o => o.id === state.currentOrgId);
  const userOrgs = state.orgMembers
    .filter(m => m.user_id === state.currentUser?.id)
    .map(m => ({
      ...m,
      org: state.organizations.find(o => o.id === m.org_id)!,
    }))
    .filter(m => m.org);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!currentOrg) return null;

  const role = getCurrentRole();
  const colorIdx = state.organizations.indexOf(currentOrg) % ORG_COLORS.length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="org-switcher" onClick={() => setOpen(!open)}>
        <div className="org-avatar" style={{ background: ORG_COLORS[colorIdx] }}>
          {currentOrg.name.charAt(0)}
        </div>
        <div className="org-switcher-info">
          <div className="org-switcher-name">{currentOrg.name}</div>
          <div className="org-switcher-role">{role || 'member'}</div>
        </div>
        <span style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="org-dropdown">
          {userOrgs.map((m, i) => (
            <button
              key={m.id}
              className={`org-dropdown-item ${m.org_id === state.currentOrgId ? 'active' : ''}`}
              onClick={() => { switchOrg(m.org_id); setOpen(false); }}
            >
              <div className="org-avatar" style={{
                background: ORG_COLORS[i % ORG_COLORS.length],
                width: 24,
                height: 24,
                fontSize: 11,
              }}>
                {m.org.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>{m.org.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.role}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
