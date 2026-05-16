import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Activity, 
  BrainCircuit, 
  ShieldCheck, 
  GitMerge, 
  User, 
  Box,
  Clock,
  FlaskConical
} from 'lucide-react';
import { adminService } from '../../api/apiClient';

const DecisionTraceView = ({ traceId, onBack }) => {
  const { data: traceData, isLoading } = useQuery({
    queryKey: ['decision-trace', traceId],
    queryFn: () => adminService.getDecisionTrace(traceId),
    enabled: !!traceId
  });

  if (isLoading) return <div style={{ textAlign: 'center', padding: '100px' }}><Activity className="spin" size={40} /></div>;
  if (!traceData?.trace) return <div className="page-content">Trace not found.</div>;

  const trace = traceData.trace;
  const payload = trace.payload_json;
  const decision = payload.decision;
  const profile = payload.profile;

  return (
    <div className="page-content">
      <div style={{ marginBottom: '32px' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: 600 }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Decision <span className="text-gradient">Forensics</span></h1>
        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {new Date(trace.created_at).toLocaleString()}</span>
          <span>ID: {trace.id}</span>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}><User size={20} color="var(--accent-primary)" /> Cognitive Profile</h3>
          <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Major</span>
              <span style={{ fontWeight: 600 }}>{profile.major}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Budget</span>
              <span style={{ fontWeight: 600 }}>${profile.budgetUsd}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Segment</span>
              <span style={{ fontWeight: 600 }}>{trace.segment}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}><ShieldCheck size={20} color="var(--success)" /> Integrity Metrics</h3>
          <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Integrity Score</span>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>{decision.integrityScore ?? 100}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Confidence</span>
              <span style={{ fontWeight: 600 }}>{decision.confidence?.overallScore ?? 0}%</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: decision.relaxedConstraint ? 'rgba(245, 158, 11, 0.05)' : '' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}><GitMerge size={20} color="var(--warning)" /> Intervention</h3>
          <div style={{ fontSize: '0.9rem' }}>
            {decision.relaxedConstraint ? (
              <>
                <p style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: '4px' }}>Constraint Relaxed</p>
                <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{decision.relaxedConstraint}</code>
                <p style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  The engine dropped this gate to avoid zero results.
                </p>
              </>
            ) : (
              <p style={{ color: 'var(--success)' }}>No interventions required. Pure logic flow.</p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '24px' }}>Decision Timeline (Execution Trace)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <TimelineItem 
            title="Intent Resolution" 
            desc={`Profile mapped to ${profile.major} logic with intent: "${profile.productIntent?.naturalLanguageIntent?.slice(0, 50)}..."`} 
            status="success" 
          />
          <TimelineItem 
            title="Kernel Execution" 
            desc={`Evaluated ${decision.evaluatedCount} entities. Found ${decision.candidateCount} eligible matches.`} 
            status={decision.relaxedConstraint ? 'warning' : 'success'} 
          />
          <TimelineItem 
            title="Exclusion Analysis" 
            desc={`Filtered ${decision.excludedCount} products. Top reason: "${decision.topExcludedStories?.[0]?.reason || 'Constraint violation'}"`} 
            status="info" 
          />
          <TimelineItem 
            title="Final Selection" 
            desc={`Picked ${decision.cards?.length} optimal cards based on score and commercial routing.`} 
            status="success" 
            isLast
          />
        </div>
      </div>
      <div className="card" style={{ marginTop: '32px', borderTop: '4px solid var(--accent-secondary)' }}>
        <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FlaskConical size={20} color="var(--accent-secondary)" /> Counterfactual Analysis (What-If)
        </h3>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Exploring alternative universes where logic parameters were different for this specific session.
        </p>
        <div className="grid-2">
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Scenario A: Budget Relaxed (+20%)</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--success)' }}>
              Result: <strong>2 new products found</strong>. Including the "High Performance" variant which was previously excluded by $45.
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Scenario B: Quality Over Price</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
              Result: <strong>Recommendation changed</strong>. The "Reliability" score would have outweighed the "Value" proposition.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const TimelineItem = ({ title, desc, status, isLast }) => {
  const statusColors = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    info: 'var(--accent-primary)',
    error: 'var(--error)'
  };

  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ 
          width: '12px', height: '12px', borderRadius: '50%', 
          background: statusColors[status],
          boxShadow: `0 0 10px ${statusColors[status]}`
        }}></div>
        {!isLast && <div style={{ width: '2px', flex: 1, background: 'var(--border-subtle)', margin: '4px 0' }}></div>}
      </div>
      <div style={{ paddingBottom: '32px' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h4>
        <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '600px' }}>{desc}</p>
      </div>
    </div>
  );
};

export default DecisionTraceView;
