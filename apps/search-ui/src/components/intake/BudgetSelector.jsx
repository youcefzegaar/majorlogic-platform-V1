import React from 'react';

export default function BudgetSelector({ budgetMin, setBudgetMin, budgetMax, setBudgetMax }) {
  return (
    <div className="intake-card full-width">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)' }}>💰</div>
        <div>
          <div className="card-title">Budget</div>
          <div className="card-subtitle">Set your available budget range</div>
        </div>
      </div>
      <div className="budget-container">
        <div className="budget-range">
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}>$</span>
            <input
              type="number"
              className="budget-input"
              style={{ paddingLeft: 24, textAlign: 'left' }}
              value={budgetMin}
              onChange={(e) => setBudgetMin(Number(e.target.value))}
            />
          </div>
          <input
            type="range"
            className="budget-slider"
            min="500"
            max="5000"
            step="50"
            value={budgetMax}
            onChange={(e) => setBudgetMax(Number(e.target.value))}
          />
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}>$</span>
            <input
              type="number"
              className="budget-input"
              style={{ paddingLeft: 24, textAlign: 'left' }}
              value={budgetMax}
              onChange={(e) => setBudgetMax(Number(e.target.value))}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>Min: $500</span>
          <span>Selected: ${budgetMin.toLocaleString()} - ${budgetMax.toLocaleString()}</span>
          <span>Max: $5,000</span>
        </div>
      </div>
    </div>
  );
}
