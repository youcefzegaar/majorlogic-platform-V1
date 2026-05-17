import React from 'react';

const ICONS = {
  performance: '⚡',
  battery: '🔋',
  portability: '🎒',
  build: '🔇'
};

export default function PreferenceSliders({ priorities, setPriorities }) {
  return (
    <div className="intake-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)' }}>⚡</div>
        <div>
          <div className="card-title">Your Priorities</div>
          <div className="card-subtitle">Adjust priorities by dragging</div>
        </div>
      </div>
      <div className="priority-list">
        {Object.entries(priorities).map(([key, val]) => (
          <div key={key} className="priority-item">
            <div className="priority-icon" style={{ background: 'rgba(233, 69, 96, 0.15)', color: 'var(--accent)' }}>
              {ICONS[key] || '⚙️'}
            </div>
            <div className="priority-info">
              <div className="priority-name" style={{ textTransform: 'capitalize' }}>{key}</div>
              <div className="priority-desc">{val > 80 ? 'Very high' : val > 50 ? 'Medium' : 'Low'} priority</div>
            </div>
            <div className="priority-slider-container">
              <input
                type="range"
                className="priority-slider"
                value={val}
                onChange={(e) => setPriorities({ ...priorities, [key]: Number(e.target.value) })}
              />
              <span className="priority-value">{val}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
