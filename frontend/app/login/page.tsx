// Login Page — Demo auth with pre-seeded users
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, USERS } from '@/lib/store';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useStore();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate auth delay
    await new Promise(r => setTimeout(r, 600));

    const success = login(email);
    if (success) {
      router.push('/dashboard');
    } else {
      setError('User not found. Use one of the demo accounts below.');
    }
    setIsLoading(false);
  };

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setIsLoading(true);
    setTimeout(() => {
      const success = login(userEmail);
      if (success) router.push('/dashboard');
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-lg)' }}>
          <div className="sidebar-logo-icon" style={{ width: 48, height: 48, fontSize: 22 }}>⚙</div>
        </div>
        <h1 className="login-title">AgentFlow</h1>
        <p className="login-subtitle">AI Agent Workflow Builder</p>

        <form onSubmit={handleLogin}>
          <div className="input-group" style={{ marginBottom: 'var(--space-md)' }}>
            <label className="input-label">Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="alice@orga.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="input-label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              defaultValue="demo123"
            />
          </div>

          {error && (
            <div style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: 'rgba(248, 113, 113, 0.1)',
              border: '1px solid rgba(248, 113, 113, 0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              color: '#f87171',
              marginBottom: 'var(--space-md)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={isLoading}
          >
            {isLoading ? (
              <><div className="spinner spinner-sm" style={{ borderTopColor: 'white' }} /> Signing in...</>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="divider" />

        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-sm)' }}>
            Quick Access — Demo Accounts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {USERS.map(user => (
              <button
                key={user.id}
                className="btn btn-ghost"
                style={{ justifyContent: 'flex-start', height: 'auto', padding: 'var(--space-sm) var(--space-md)' }}
                onClick={() => quickLogin(user.email)}
                disabled={isLoading}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-full)',
                  background: user.id.includes('owner-a') ? '#7c5cff' :
                    user.id.includes('editor') ? '#36c5f0' :
                    user.id.includes('viewer') ? '#34d399' : '#fb923c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {user.displayName.charAt(0)}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{user.displayName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
