import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

export default function SettingsModal({ onClose }) {
  const { t } = useTranslation();
  const { user, updateAccount, setShowAuthModal, setAuthModalMode } = useAuthStore();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'ok'|'error', text }

  if (!user) {
    return (
      <div style={overlayStyle}>
        <div style={panelStyle}>
          <header style={headerStyle}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{t('settings.title', 'Account Settings')}</h2>
            <button onClick={onClose} style={closeBtnStyle}>✕</button>
          </header>
          <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>{t('settings.sign_in_prompt', 'Sign in to manage your account.')}</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => { setAuthModalMode('login'); setShowAuthModal(true); onClose(); }}
            >
              {t('settings.sign_in', 'Sign In')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: t('settings.password_mismatch', 'Passwords do not match.') });
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setMsg({ type: 'error', text: t('settings.password_too_short', 'Password must be at least 8 characters.') });
      return;
    }

    const payload = {};
    if (displayName !== (user.displayName ?? '')) payload.displayName = displayName;
    if (newPassword) { payload.newPassword = newPassword; payload.currentPassword = currentPassword; }
    if (!Object.keys(payload).length) {
      setMsg({ type: 'error', text: t('settings.nothing_changed', 'No changes to save.') });
      return;
    }

    setSaving(true);
    const result = await updateAccount(payload);
    setSaving(false);

    if (result.success) {
      setMsg({ type: 'ok', text: t('settings.saved', 'Changes saved.') });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } else {
      setMsg({ type: 'error', text: result.error });
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <header style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{t('settings.title', 'Account Settings')}</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </header>

        <form onSubmit={handleSave} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Account info */}
          <div style={sectionStyle}>
            <label style={labelStyle}>{t('settings.email', 'Email')}</label>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', padding: '8px 0' }}>{user.email}</div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>{t('settings.display_name', 'Display Name')}</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={t('settings.display_name_placeholder', 'Your name (optional)')}
              style={inputStyle}
            />
          </div>

          {/* Password change */}
          <div style={{ ...sectionStyle, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
            <label style={labelStyle}>{t('settings.change_password', 'Change Password')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder={t('settings.current_password', 'Current password')}
              style={{ ...inputStyle, marginBottom: 8 }}
              autoComplete="current-password"
            />
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder={t('settings.new_password', 'New password (8+ characters)')}
              style={{ ...inputStyle, marginBottom: 8 }}
              autoComplete="new-password"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t('settings.confirm_password', 'Confirm new password')}
              style={inputStyle}
              autoComplete="new-password"
            />
          </div>

          {msg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: '0.85rem',
              background: msg.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: msg.type === 'ok' ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)',
              border: `1px solid ${msg.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              {t('settings.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? t('settings.saving', 'Saving…') : t('settings.save', 'Save Changes')}
            </button>
          </div>

          {/* Legal links */}
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }}>
              {t('settings.privacy', 'Privacy Policy')}
            </a>
            {' · '}
            <a href="/terms" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }}>
              {t('settings.terms', 'Terms of Use')}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
};

const panelStyle = {
  background: 'var(--surface, #1a1d27)',
  border: '1px solid var(--border, rgba(255,255,255,0.08))',
  borderRadius: 16,
  width: '100%', maxWidth: 440,
  margin: '0 16px',
  maxHeight: '90vh', overflowY: 'auto',
};

const headerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 24px',
  borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
};

const closeBtnStyle = {
  background: 'none', border: 'none',
  color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: '4px 8px',
};

const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 8 };

const labelStyle = { fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' };

const inputStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--border, rgba(255,255,255,0.1))',
  borderRadius: 8, color: 'var(--text-primary)',
  fontSize: '0.9rem', padding: '10px 12px', width: '100%', boxSizing: 'border-box',
};
