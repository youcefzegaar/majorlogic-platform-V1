import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FutureProofCard from './FutureProofCard';
import Icon from '../shared/Icon';
import { useAuthStore } from '../../stores/authStore';

const apiUrl = import.meta.env.VITE_API_URL || 'https://majorlogicapi-production.up.railway.app';

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function DecisionCertificate({ selectedCard }) {
  const { t } = useTranslation();
  const irHash        = selectedCard?.irHash ?? null;
  const integrityScore = selectedCard?.integrityScore ?? 100;
  const date          = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const shortHash     = irHash ? irHash.slice(0, 12) : null;

  const traceScores = selectedCard?.traceScores ?? {};
  const priorities  = selectedCard?.priorities  ?? {};
  const DIMS = [
    { key: 'portability_score', priorityKey: 'portability', label: 'portability' },
    { key: 'performance_score', priorityKey: 'performance',  label: 'performance'  },
    { key: 'display_score',     priorityKey: 'display',      label: 'display'      },
    { key: 'value_score',       priorityKey: 'resale',       label: 'value'        },
  ];
  const topSacrifice = DIMS
    .map(d => {
      const score = traceScores[d.key] != null ? Math.round(traceScores[d.key]) : null;
      const ideal = Math.round(priorities[d.priorityKey] ?? 50);
      if (score == null) return null;
      return { ...d, score, ideal, delta: score - ideal };
    })
    .filter(Boolean)
    .sort((a, b) => a.delta - b.delta)
    .find(d => d.delta < -4);

  const topGain = DIMS
    .map(d => {
      const score = traceScores[d.key] != null ? Math.round(traceScores[d.key]) : null;
      const ideal = Math.round(priorities[d.priorityKey] ?? 50);
      if (score == null) return null;
      return { ...d, score, ideal, delta: score - ideal };
    })
    .filter(Boolean)
    .sort((a, b) => b.delta - a.delta)
    .find(d => d.delta > 4);

  const ownerYears  = 4;
  const priceUsd    = selectedCard?.purchaseLinks?.priceUsd ?? 0;
  const resaleEst   = Math.round(priceUsd * 0.30);
  const netDayStr   = priceUsd > 0
    ? `$${((priceUsd - resaleEst) / (ownerYears * 365)).toFixed(2)}/day`
    : null;

  const sentences = [
    topSacrifice && topGain
      ? `You accepted ${topSacrifice.label} at ${topSacrifice.score}/100 to gain ${topGain.label} at ${topGain.score}/100.`
      : null,
    integrityScore < 100
      ? `Integrity ${integrityScore}% — one constraint was relaxed to find this result.`
      : `Integrity 100% — all constraints fully satisfied.`,
    netDayStr
      ? `If used daily for ${ownerYears} years: ${netDayStr} net after estimated resale. Based on what you told us.`
      : null,
  ].filter(Boolean);

  return (
    <div style={{
      padding: '20px 24px',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 4 }}>
            {t('summary.certificate_title')}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
            {selectedCard.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {date}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 6,
              background: integrityScore >= 100 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${integrityScore >= 100 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              fontSize: 12,
              fontWeight: 700,
              color: integrityScore >= 100 ? 'var(--accent-success)' : 'var(--accent-warning)',
            }}
          >
            {t('summary.integrity_label')} {integrityScore}%
          </div>
          {shortHash && (
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              {shortHash}
            </div>
          )}
        </div>
      </div>

      {sentences.length > 0 && (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 8,
          border: '1px solid var(--border)',
          marginBottom: 16,
        }}>
          {sentences.map((s, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.65,
                marginBottom: i < sentences.length - 1 ? 6 : 0,
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}

      {shortHash && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {t('summary.deterministic_note')} <span style={{ fontFamily: 'monospace' }}>{irHash}</span>
        </div>
      )}
    </div>
  );
}

function FollowUpSection({ decisionRunId }) {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [satisfaction, setSatisfaction] = useState(null);
  const [regret, setRegret] = useState(null);

  const handleSubmit = async () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://majorlogicapi-production.up.railway.app';
    try {
      await fetch(`${apiUrl}/api/v1/laptop-student-us/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          decisionRunId: decisionRunId || 'anonymous',
          score: satisfaction,
          tags: regret === t('summary.regret_yes') ? ['would_repurchase'] : ['would_not_repurchase'],
        }),
      });
    } catch {
      // Feedback is best-effort — don't block the UI on network failure
    }
    setSubmitted(true);
  };

  if (dismissed) return null;

  if (submitted) {
    return (
      <div style={{
        padding: '16px 20px',
        background: 'rgba(16, 185, 129, 0.06)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: 12,
        marginTop: 24,
        fontSize: 13,
        color: 'var(--accent-success)',
        fontWeight: 600,
        textAlign: 'center',
      }}>
        {t('summary.thank_you')}
      </div>
    );
  }

  const allAnswered = satisfaction !== null && regret !== null;

  return (
    <div style={{
      padding: '20px 24px',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      marginTop: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          {t('summary.followup_section')}
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        {t('summary.followup_title')}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        {t('summary.followup_body')}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
          {t('summary.satisfaction_question')}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setSatisfaction(n)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `2px solid ${satisfaction === n ? 'var(--accent-success)' : 'var(--border)'}`,
                background: satisfaction === n ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                color: satisfaction === n ? 'var(--accent-success)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {n}
            </button>
          ))}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
            {t('summary.satisfaction_scale')}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
          {t('summary.regret_question')}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[t('summary.regret_yes'), t('summary.regret_no')].map(v => (
            <button
              key={v}
              onClick={() => setRegret(v)}
              style={{
                padding: '7px 20px',
                borderRadius: 8,
                border: `2px solid ${regret === v ? 'var(--accent-info)' : 'var(--border)'}`,
                background: regret === v ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
                color: regret === v ? 'var(--accent-info)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn btn-secondary"
        disabled={!allAnswered}
        style={{ opacity: allAnswered ? 1 : 0.4 }}
        onClick={handleSubmit}
      >
        {t('buttons.submit_feedback')}
      </button>
    </div>
  );
}

function SaveDecisionButton({ selectedCard, profile }) {
  const { t } = useTranslation();
  const { user, setShowAuthModal, setAuthModalMode } = useAuthStore();
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error

  const handleSave = async () => {
    if (!user) {
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }
    setSaveState('saving');
    const csrf = getCsrfToken();
    try {
      const res = await fetch(`${apiUrl}/user/decisions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({
          domain: 'laptop-student-us',
          irHash: selectedCard?.irHash,
          title: selectedCard?.name,
          profileSnapshot: profile,
          decisionSnapshot: selectedCard,
        }),
      });
      if (res.ok) {
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 3000);
      } else {
        setSaveState('error');
        setTimeout(() => setSaveState('idle'), 3000);
      }
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  const label =
    saveState === 'saving'
      ? t('auth.saving')
      : saveState === 'saved'
      ? t('auth.saved_ok')
      : saveState === 'error'
      ? 'Error — retry?'
      : user
      ? t('auth.save_decision')
      : t('auth.sign_in_to_save');

  return (
    <button
      className="btn btn-secondary"
      onClick={handleSave}
      disabled={saveState === 'saving' || saveState === 'saved'}
      style={{
        opacity: saveState === 'saving' ? 0.6 : 1,
        color: saveState === 'saved' ? 'var(--accent-success)' : undefined,
        borderColor: saveState === 'saved' ? 'var(--accent-success)' : undefined,
      }}
    >
      <Icon name={saveState === 'saved' ? 'check' : 'bookmark'} />
      {' '}{label}
    </button>
  );
}

export default function SummaryPhase({ selectedCard, timeline, ownershipChoice, onNewDecision, onBackToExplanation, profile }) {
  const { t } = useTranslation();
  return (
    <div className="phase-container active">
      <DecisionCertificate selectedCard={selectedCard} />

      <div className="final-summary-layout">
        <FutureProofCard selectedCard={selectedCard} timeline={timeline} ownershipChoice={ownershipChoice} />
      </div>

      <FollowUpSection decisionRunId={selectedCard?.decisionRunId} />

      <div className="btn-group" style={{ marginTop: 24 }}>
        <button className="btn btn-primary" onClick={onNewDecision}>
          <Icon name="plus" /> {t('buttons.new_decision')}
        </button>
        <button className="btn btn-secondary" onClick={onBackToExplanation}>
          <Icon name="arrow-left" /> {t('buttons.back_to_ownership')}
        </button>
        <SaveDecisionButton selectedCard={selectedCard} profile={profile} />
      </div>
    </div>
  );
}
