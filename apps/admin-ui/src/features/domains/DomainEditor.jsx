import React, { useState } from 'react';
import { 
  BrainCircuit, 
  GitMerge, 
  ShieldCheck, 
  RefreshCw,
  Layout,
  Zap
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

const DomainEditor = ({ domain, onBack }) => {
  const { navigate } = useAppStore();
  if (!domain) return <div>No domain selected.</div>;

  const [dimensions, setDimensions] = useState(domain.config?.dimensions || [
    { id: 'price', name: 'Price', type: 'Numeric', human_meaning: 'Budgetary Burden', psychological_effect: 'Financial Stress' }
  ]);
  const [conflicts, setConflicts] = useState(domain.config?.conflicts || []);
  const [saving, setSaving] = useState(false);

  const addDimension = () => {
    const newDim = { id: `dim_${Date.now()}`, name: 'New Dimension', type: 'Numeric', human_meaning: '', psychological_effect: '' };
    setDimensions([...dimensions, newDim]);
  };

  const addConflict = () => {
    if (dimensions.length < 2) {
      alert('You need at least 2 dimensions to create a conflict.');
      return;
    }
    const newConflict = {
      id: `conf_${Date.now()}`,
      dim_a: dimensions[0].id,
      dim_b: dimensions[1].id,
      strength: 70 
    };
    setConflicts([...conflicts, newConflict]);
  };

  const updateConflict = (id, field, value) => {
    setConflicts(conflicts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    setSaving(true);
    // Future: Connect to API
    setTimeout(() => {
      alert('Cognitive Logic & Conflict Map Saved');
      setSaving(false);
    }, 1000);
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: 600 }}>
            ← Back to Domains
          </button>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Logic Editor: <span className="text-gradient">{domain.title}</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Defining the Cognitive Meta Model and Decision Primitives.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => navigate('shadow_runner', { domain })}>
            <Zap size={18} color="var(--warning)" /> Shadow Runner
          </button>
          <button className="btn btn-outline" onClick={() => navigate('decision_topology', { domain })}>
            <Layout size={18} /> Visual Topology
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="spin" size={18} /> : <ShieldCheck size={18} />} Save All Logic
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BrainCircuit size={20} color="var(--accent-primary)" /> Dimensions (Primitives)
            </h3>
            <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={addDimension}>
              <Plus size={16} /> Add Primitive
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {dimensions.map(dim => (
              <div key={dim.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <input className="input-field" value={dim.name} onChange={(e) => setDimensions(dimensions.map(d => d.id === dim.id ? {...d, name: e.target.value} : d))} placeholder="Technical Name" />
                  <select className="input-field" value={dim.type} onChange={(e) => setDimensions(dimensions.map(d => d.id === dim.id ? {...d, type: e.target.value} : d))}>
                    <option>Numeric</option>
                    <option>Boolean</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <input className="input-field" placeholder="Human Meaning" value={dim.human_meaning} onChange={(e) => setDimensions(dimensions.map(d => d.id === dim.id ? {...d, human_meaning: e.target.value} : d))} />
                  <input className="input-field" placeholder="Psychological Effect" value={dim.psychological_effect} onChange={(e) => setDimensions(dimensions.map(d => d.id === dim.id ? {...d, psychological_effect: e.target.value} : d))} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GitMerge size={20} color="var(--accent-secondary)" /> Conflict Map
            </h3>
            <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={addConflict}>
              <Plus size={16} /> Add Conflict Pair
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {conflicts.map(conf => (
              <div key={conf.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <select className="input-field" style={{ flex: 1 }} value={conf.dim_a} onChange={(e) => updateConflict(conf.id, 'dim_a', e.target.value)}>
                    {dimensions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <div style={{ color: 'var(--accent-secondary)' }}><GitMerge size={18} /></div>
                  <select className="input-field" style={{ flex: 1 }} value={conf.dim_b} onChange={(e) => updateConflict(conf.id, 'dim_b', e.target.value)}>
                    {dimensions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Conflict Strength: {conf.strength}%</label>
                <input 
                  type="range" 
                  min="1" max="100" 
                  value={conf.strength} 
                  onChange={(e) => updateConflict(conf.id, 'strength', parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-secondary)' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Internal Helper
const Plus = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

export default DomainEditor;
