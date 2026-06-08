export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderShell({ title, body, pageClass = "", ogParams = null }) {
  const ogTitle = ogParams?.title ?? escapeHtml(title);
  const ogDesc = ogParams?.description ?? "Find your perfect college laptop in 30 seconds with MajorLogic.";
  const ogUrl = ogParams?.url ?? "https://majorlogic.ai/";
  const ogImage = "https://majorlogic.ai/public/og-image.jpg"; // Placeholder viral image
  
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    
    <!-- Open Graph for Viral Sharing -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDesc}" />
    <meta property="og:url" content="${ogUrl}" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${ogTitle}" />
    <meta name="twitter:description" content="${ogDesc}" />
    
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



