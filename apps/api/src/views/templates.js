export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderShell({ title, body, pageClass = "" }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/public/styles.css" />
  </head>
  <body class="${pageClass}">
    ${body}
  </body>
</html>`;
}

export function renderSearchPage({ uiState }) {
  const isEng = uiState.major === "mechanical_engineering" || uiState.major === "electrical_engineering" || uiState.major === "general_engineering";
  const isCS = uiState.major === "computer_science";
  const isDesign = uiState.major === "design_creative";
  
  const body = `
    <div class="search-overlay">
      <div class="search-modal">
        <div class="search-header">
          <div class="search-brand">
            <div class="search-brand-icon">📚</div>
            MajorLogic Matchmaker
          </div>
          <button class="search-close">×</button>
        </div>
        
        <form action="/results" method="GET">
          <div class="search-body">
            <h1 class="search-title">Find Your Future. Start Here</h1>
            <p class="search-subtitle">Your 30-Second Laptop Matchmaker</p>
            
            <div class="search-row">
              <div>
                <h3 class="search-section-title">Quick Picks</h3>
                <div class="quick-picks" style="margin-bottom: 24px;">
                  <button type="button" class="quick-pick-btn ${isEng ? 'active' : ''}" onclick="selectMajor(this, 'mechanical_engineering')">
                    <span class="quick-pick-icon">⚙️</span>
                    <span>Engineering</span>
                    <span class="check-mark">${isEng ? '✓' : ''}</span>
                  </button>
                  <button type="button" class="quick-pick-btn ${isCS ? 'active' : ''}" onclick="selectMajor(this, 'computer_science')">
                    <span class="quick-pick-icon">&lt;/&gt;</span>
                    <span>Computer Sci</span>
                    <span class="check-mark">${isCS ? '✓' : ''}</span>
                  </button>
                  <button type="button" class="quick-pick-btn ${isDesign ? 'active' : ''}" onclick="selectMajor(this, 'design_creative')">
                    <span class="quick-pick-icon">🎨</span>
                    <span>Design/Arts</span>
                    <span class="check-mark">${isDesign ? '✓' : ''}</span>
                  </button>
                </div>
                <select id="majorSelect" name="major" style="display:none">
                  <option value="computer_science" ${uiState.major === 'computer_science' ? 'selected' : ''}>CS</option>
                  <option value="mechanical_engineering" ${isEng ? 'selected' : ''}>Eng</option>
                  <option value="design_creative" ${isDesign ? 'selected' : ''}>Design</option>
                </select>
                <script>
                  function selectMajor(btn, value) {
                    document.getElementById('majorSelect').value = value;
                    document.querySelectorAll('.quick-pick-btn').forEach(b => {
                       b.classList.remove('active');
                       b.querySelector('.check-mark').innerText = '';
                    });
                    btn.classList.add('active');
                    btn.querySelector('.check-mark').innerText = '✓';
                  }
                </script>

                <div>
                  <h3 class="search-section-title">AI Intuition</h3>
                  <textarea name="intent" class="ai-input" placeholder="E.g., 'heavy video editing,' 'long battery for lectures,' 'touch screen for notes.' Our AI gets it." style="min-height: 140px;">${escapeHtml(uiState.intent ?? "")}</textarea>
                </div>
              </div>
              
              <div>
                <div class="budget-panel" style="height: 100%;">
                  <h3 class="search-section-title" style="margin-bottom: 20px;">Budget & Preferences</h3>
                  
                  <!-- Budget -->
                  <div class="slider-wrapper" style="margin-bottom: 24px;">
                    <div style="text-align: center;">
                      <span class="budget-value" id="budgetDisplay">$${uiState.budgetUsd}</span>
                    </div>
                    <input type="range" name="budgetUsd" min="500" max="3000" step="50" value="${uiState.budgetUsd}" oninput="document.getElementById('budgetDisplay').innerText = '$' + this.value">
                    <div class="slider-labels">
                      <span>$500</span>
                      <span>$3000+</span>
                    </div>
                    <div class="toggle-row" style="margin-top: 12px; margin-bottom: 4px;">
                      <span>Stretch my budget 15%</span>
                      <input type="checkbox" name="stretchBudget" ${uiState.stretchBudget ? 'checked' : ''}>
                    </div>
                  </div>
                  
                  <!-- Portability -->
                  <div class="slider-wrapper" style="margin-bottom: 24px;">
                    <div class="slider-labels" style="margin-bottom: 8px;">
                      <span>Portability Score <span id="portDisplay" style="font-weight:700;color:var(--accent-purple)">${uiState.portabilityScore}/10</span></span>
                    </div>
                    <input type="range" name="portabilityScore" min="0" max="10" step="1" value="${uiState.portabilityScore}" oninput="document.getElementById('portDisplay').innerText = this.value + '/10'">
                    <div class="slider-labels">
                      <span>Desktop</span>
                      <span>Ultra-light</span>
                    </div>
                  </div>

                  <!-- Battery -->
                  <div class="slider-wrapper">
                    <div class="slider-labels" style="margin-bottom: 8px;">
                      <span>Battery Score <span id="battDisplay" style="font-weight:700;color:var(--accent-purple)">${uiState.batteryScore}/10</span></span>
                    </div>
                    <input type="range" name="batteryScore" min="0" max="10" step="1" value="${uiState.batteryScore}" oninput="document.getElementById('battDisplay').innerText = this.value + '/10'">
                    <div class="slider-labels">
                      <span>Plugged in</span>
                      <span>All day</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
            
          </div>
          
          <div class="analyze-panel">
            <button type="submit" class="btn-ai">
              <span>🧠</span> Analyze with AI
            </button>
          </div>
          
          <div class="search-body" style="padding-top: 0;">
            <div class="search-footer">
              <span>We do not earn ad revenue. Your privacy is protected.</span>
              <div>
                <a href="#">Terms</a>
                <a href="#">Privacy Policy</a>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
  
  return renderShell({ title: "MajorLogic - Matchmaker", body });
}

function metricText(card, index) {
  if (index === 0) return { performance: "Extreme", battery: "10h+", portability: "Light" };
  if (index === 1) return { performance: "Solid", battery: "8h+", portability: "Standard" };
  if (index === 2) return { performance: "High", battery: "6h", portability: "Heavy" };
  return { performance: "Good", battery: "Var.", portability: "Var." };
}

export function renderResultsPage({ state, result }) {
  if (!result || result.error) {
    return renderShell({ 
      title: "Error", 
      body: `<div class="container"><h1>Error</h1><p>${escapeHtml(result?.message || "Unknown error")}</p><a href="/search" class="btn-primary">Back</a></div>` 
    });
  }

  const cards = result.decision?.cards || [];
  const hero = cards.find(c => c.cardType === "hero") || cards[0];
  const alternatives = cards.filter(c => c !== hero);

  const heroImage = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"; // Placeholder premium laptop

  const body = `
    <div class="container">
      <header class="header">
        <a href="/search" class="brand">
          <div class="brand-icon">🧭</div>
          MajorLogic
        </a>
        <div class="trust-badges">
          <div class="trust-badge">No Ads.</div>
          <div class="trust-badge">No Commission.</div>
          <div class="trust-badge">Rule-Based.</div>
        </div>
      </header>
      
      <div class="results-layout">
        
        <!-- Hero Column -->
        <div class="hero-column">
          <h1 class="hero-heading">Trustworthy laptop<br>recommendations.</h1>
          <p class="hero-subheading">${cards.length} choices. No bias. Zero regret.</p>
          
          ${hero ? `
            <div class="hero-badge">
              <span class="icon">🥇</span> HERO
            </div>
            <h2 class="hero-title">${escapeHtml(hero.title)}</h2>
            <p class="hero-subtitle">Best for ${state.uiState.majorLabel}</p>
            
            <div class="hero-image-wrapper">
              <img src="${heroImage}" alt="${escapeHtml(hero.title)}" class="hero-image">
            </div>
            
            <div class="why-this">
              <h3 class="why-this-title">Why this?</h3>
              <ul class="why-list">
                ${hero.whyThis ? `<li>${escapeHtml(hero.whyThis)}</li>` : ''}
                <li>Top Pick for ${state.uiState.majorLabel}</li>
                <li>Excellent value within $${state.uiState.budgetUsd}</li>
              </ul>
            </div>
            
            ${hero.badNews ? `
              <div class="bad-news">
                <span class="bad-news-icon">⚠️</span>
                <span><strong>Bad News:</strong> ${escapeHtml(hero.badNews)}</span>
              </div>
            ` : ''}
            
            <div>
              <a href="#" class="btn-primary">
                🛒 Buy Now &rarr;
              </a>
            </div>
          ` : '<p>No matching laptops found.</p>'}
        </div>
        
        <!-- Alternatives Stack -->
        <div class="alt-stack">
          ${alternatives.map((card, idx) => {
            const labels = ["SMART BUDGET", "FUTURE PROOF", "NO COMMISSION", "ALTERNATIVE"];
            const icons = ["💰", "🔮", "⚖️", "✨"];
            const label = labels[idx] || labels[3];
            const icon = icons[idx] || icons[3];
            
            return `
              <div class="alt-card">
                <div class="alt-card-content">
                  <div class="alt-badge"><span class="icon">${icon}</span> ${label}</div>
                  <h3 class="alt-title">${escapeHtml(card.title)}</h3>
                  <p class="alt-subtitle">${escapeHtml(card.tradeoff || "Solid alternative option")}</p>
                  
                  ${card.badNews ? `
                    <div class="alt-bad-news">
                      <span style="color:#E25C5C">⚠️</span> <strong>Bad News:</strong> ${escapeHtml(card.badNews)}
                    </div>
                  ` : ''}
                  
                  <div>
                    <a href="#" class="btn-outline">🛒 Buy Now</a>
                  </div>
                </div>
                <div class="alt-image-wrapper">
                  <!-- Small thumb image -->
                  <img src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=300&q=80" alt="${escapeHtml(card.title)}" class="alt-image">
                </div>
              </div>
            `;
          }).join("")}
        </div>
        
      </div>
    </div>
  `;
  
  return renderShell({ title: "MajorLogic - Results", body });
}
