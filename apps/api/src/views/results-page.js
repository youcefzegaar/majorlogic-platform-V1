import { escapeHtml, renderShell } from "./templates.js";

export function renderResultsPage({ state, result, requestUrl = "" }) {
  if (!result || result.error) {
    return renderShell({ 
      title: "Error", 
      body: `<div class="container"><h1>Error</h1><p>${escapeHtml(result?.message || "Unknown error")}</p><a href="/search" class="btn-primary">Back</a></div>` 
    });
  }

  const cards = result.decision?.cards || [];
  const hero = cards.find(c => c.cardType === "hero") || cards[0];
  const alternatives = cards.filter(c => c !== hero);
  const decisionRunId = result.decision?.decisionRunId ?? "";
  const domain = "laptop-student-us";

  // Build affiliate UTM link for hero
  function buildBuyUrl(entityId, cardType) {
    const base = `https://www.amazon.com/s?k=${encodeURIComponent(entityId)}`;
    return `${base}&tag=majorlogic-20&utm_source=majorlogic&utm_medium=recommendation&utm_campaign=${cardType}&utm_content=${entityId}`;
  }

  const heroImage = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80";

  const body = `
    <div class="container">
      <header class="header">
        <a href="/search" class="brand">
          <div class="brand-icon">🧭</div>
          MajorLogic
        </a>
        <div class="trust-badges">
          <div class="trust-badge">No Ads.</div>
          <div class="trust-badge">Specs-Based.</div>
          <div class="trust-badge" style="background:#1a3a1a;color:#4ade80;border-color:#16a34a;" title="We earn a small commission on some links. It never changes our recommendations.">✅ Affiliate Disclosed.</div>
        </div>
      </header>

      <!-- ✉️ Net 1: Save Results Bar -->
      <div id="save-bar" style="background:linear-gradient(90deg,#1a1a2e,#2a1a4e);border-radius:12px;padding:14px 20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div style="color:#c4b5fd;font-size:14px;">📚 <strong>Don't lose these results!</strong> Send your shortlist to your inbox.</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="save-email" type="email" placeholder="Your university email" style="padding:8px 14px;border-radius:8px;border:1px solid #7C3AED;background:#0d0d1a;color:#fff;font-size:14px;width:240px;">
          <button onclick="captureLeadSave()" style="background:#7C3AED;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-weight:700;cursor:pointer;">Save 📨</button>
        </div>
        <div id="save-msg" style="color:#4ade80;font-size:13px;display:none;">✅ Saved! Check your inbox.</div>
      </div>

      <!-- 🗣️ Viral Share Widget -->
      <div style="background:#1e1e38;border:1px dashed #7C3AED;border-radius:12px;padding:16px;margin-bottom:32px;text-align:center;">
        <h3 style="color:#fff;margin:0 0 8px;font-size:16px;">🔥 Share your custom results</h3>
        <p style="color:#9ca3af;font-size:13px;margin:0 0 16px;">Help a classmate find their perfect laptop. They'll see the exact recommendations tailored to your inputs.</p>
        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
          <button onclick="copyResultsUrl()" style="background:#374151;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600;">📋 Copy Link <span id="share-check" style="display:none;color:#4ade80;margin-left:4px;">✅</span></button>
          <button onclick="shareWhatsApp()" style="background:#25D366;color:#111;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:700;">📱 WhatsApp</button>
          <button onclick="shareTwitter()" style="background:#1DA1F2;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:700;">🐦 Twitter</button>
        </div>
      </div>

      <div class="results-layout">
        
        <!-- Hero Column -->
        <div class="hero-column">
          <h1 class="hero-heading">Trustworthy laptop<br>recommendations.</h1>
          <p class="hero-subheading">${cards.length} choices. No bias. Zero regret.</p>
          
          ${hero ? `
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
              <div class="hero-badge" style="background: linear-gradient(135deg, #FFD700, #FFA500); color: #000; border: none; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3); font-weight: 800; letter-spacing: 1px;">
                <span class="icon">🏆</span> BEST MATCH
              </div>
              <div style="background:${hero.transparency?.isAffiliate ? 'rgba(33,110,225,0.08)' : 'rgba(16,163,74,0.1)'}; color:${hero.transparency?.isAffiliate ? '#216EE1' : '#16A34A'}; padding:4px 12px; border-radius:99px; font-size:0.8rem; font-weight:700; border:1px solid ${hero.transparency?.isAffiliate ? 'rgba(33,110,225,0.2)' : 'rgba(16,163,74,0.3)'}; display:flex; align-items:center; gap:6px;" title="${hero.transparency?.isAffiliate ? 'We earn a commission if you buy this.' : 'Zero commission. Purely independent.'}">
                ${hero.transparency?.badge ?? '🛡️'} ${hero.transparency?.label ?? 'Independent'}
              </div>
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
            
            <!-- 🚪 Net 3: Interstitial Gate on Buy Button -->
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <button onclick="openInterstitial('${escapeHtml(hero.entityId ?? hero.title)}','/go/laptop-student-us/${encodeURIComponent(hero.entityId ?? hero.title)}?seller=Amazon')"
                class="btn-primary" id="hero-buy-btn" style="cursor:pointer;">
                🛒 Buy Now &rarr;
              </button>
              <!-- 🔔 Net 2: Price Alert Bell -->
              <button onclick="openPriceAlert('${escapeHtml(hero.entityId ?? hero.title)}')"
                style="background:transparent;border:1px solid #2563EB;color:#93C5FD;border-radius:8px;padding:10px 16px;cursor:pointer;font-size:14px;">
                🔔 Alert me if price drops
              </button>
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
            const buyUrl = buildBuyUrl(card.entityId ?? card.title, card.cardType ?? label.toLowerCase());
            
            return `
              <div class="alt-card">
                <div class="alt-card-content">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <div class="alt-badge"><span class="icon">${icon}</span> ${label}</div>
                  <div style="color:${card.transparency?.isAffiliate ? '#94A3B8' : '#16A34A'}; font-size:0.75rem; font-weight:600; display:flex; align-items:center; gap:4px;">
                    ${card.transparency?.badge ?? ''} ${card.transparency?.label ?? ''}
                  </div>
                </div>
                <h3 class="alt-title">${escapeHtml(card.title)}</h3>
                  <p class="alt-subtitle">${escapeHtml(card.tradeoff || "Solid alternative option")}</p>
                  
                  ${card.badNews ? `
                    <div class="alt-bad-news">
                      <span style="color:#E25C5C">⚠️</span> <strong>Bad News:</strong> ${escapeHtml(card.badNews)}
                    </div>
                  ` : ''}
                  
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="openInterstitial('${escapeHtml(card.entityId ?? card.title)}','${buyUrl}')" class="btn-outline" style="cursor:pointer;">🛒 Buy Now</button>
                    <button onclick="openPriceAlert('${escapeHtml(card.entityId ?? card.title)}')" style="background:transparent;border:1px solid #374151;color:#9CA3AF;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:12px;">🔔</button>
                  </div>
                </div>
                <div class="alt-image-wrapper">
                  <img src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=300&q=80" alt="${escapeHtml(card.title)}" class="alt-image">
                </div>
              </div>
            `;
          }).join("")}
        </div>
        
      </div>
    </div>

    <!-- 🔔 Price Alert Modal -->
    <div id="price-modal" style="display:none;position:fixed;inset:0;background:#000a;z-index:9999;align-items:center;justify-content:center;">
      <div style="background:#1a1a2e;border:1px solid #7C3AED;border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🔔</div>
        <h3 style="color:#fff;margin-bottom:8px;">Price Drop Alert</h3>
        <p id="price-modal-name" style="color:#c4b5fd;margin-bottom:20px;font-size:14px;"></p>
        <p style="color:#888;font-size:13px;margin-bottom:16px;">We'll email you the moment this laptop drops in price. No spam, ever.</p>
        <input id="price-email" type="email" placeholder="your@email.com" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #7C3AED;background:#0d0d1a;color:#fff;font-size:14px;margin-bottom:12px;box-sizing:border-box;">
        <div style="display:flex;gap:10px;">
          <button onclick="submitPriceAlert()" style="flex:1;background:#2563EB;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:700;cursor:pointer;">Notify Me 🔔</button>
          <button onclick="closeModals()" style="flex:1;background:transparent;color:#888;border:1px solid #374151;border-radius:8px;padding:10px;cursor:pointer;">No thanks</button>
        </div>
        <div id="price-msg" style="color:#4ade80;font-size:13px;margin-top:12px;display:none;">✅ You'll be the first to know!</div>
      </div>
    </div>

    <!-- 🚪 Interstitial Gate Modal -->
    <div id="interstitial-modal" style="display:none;position:fixed;inset:0;background:#000a;z-index:9999;align-items:center;justify-content:center;">
      <div style="background:#1a1a2e;border:1px solid #16a34a;border-radius:16px;padding:32px;max-width:420px;width:90%;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🛡️</div>
        <h3 style="color:#fff;margin-bottom:8px;">One more thing before you go...</h3>
        <p style="color:#c4b5fd;font-size:14px;margin-bottom:16px;">Get our <strong>5-Step Laptop Inspection Checklist</strong> — so you know the unit you receive is flawless.</p>
        <input id="gate-email" type="email" placeholder="your@email.com" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid #16a34a;background:#0d0d1a;color:#fff;font-size:14px;margin-bottom:12px;box-sizing:border-box;">
        <div style="display:flex;gap:10px;">
          <button onclick="submitGate()" style="flex:1;background:#16a34a;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:700;cursor:pointer;">Send Checklist &amp; Go 🛒</button>
          <button onclick="skipGate()" style="flex:1;background:transparent;color:#888;border:1px solid #374151;border-radius:8px;padding:10px;cursor:pointer;font-size:13px;">No thanks, go directly</button>
        </div>
        <div id="gate-msg" style="color:#4ade80;font-size:13px;margin-top:12px;display:none;">📨 Sending guide... redirecting in 2s</div>
      </div>
    </div>

    <!-- 📣 Ethical Affiliate Disclosure Footer -->
    <div style="background:#0a1a0a;border-top:1px solid #16a34a22;padding:20px 32px;margin-top:32px;">
      <p style="color:#6b7280;font-size:12px;max-width:900px;margin:0 auto;line-height:1.6;">
        <strong style="color:#4ade80;">🛡️ Radical Transparency:</strong>
        MajorLogic is built on an **Independent Decision Engine**. 
        Products are ranked 100% based on technical specifications and student fit. 
        Some links are affiliate links (labeled as "Verified Partner" 🤝), but **Zero-Commission products** (labeled as "Pure Recommendation" 💎) are treated with the exact same mathematical weight.
        <a href="/disclosure" target="_blank" style="color:#7C3AED;">How our algorithm stays bias-free →</a>
      </p>
      <div style="max-width:900px;margin:16px auto 0;display:flex;gap:16px;font-size:12px;">
        <a href="/privacy" target="_blank" style="color:#9ca3af;text-decoration:none;">Privacy Policy</a>
        <a href="/terms" target="_blank" style="color:#9ca3af;text-decoration:none;">Terms of Use</a>
      </div>
    </div>

    <!-- Client-side Lead Capture JS -->
    <script>
      const DOMAIN = "${domain}";
      const DECISION_RUN_ID = "${decisionRunId}";
      let _buyUrl = "";
      let _entityId = "";

      function closeModals() { document.getElementById("price-modal").style.display = "none"; document.getElementById("interstitial-modal").style.display = "none"; }

      // Net 1: Save Results
      async function captureLeadSave() {
        const email = document.getElementById("save-email").value;
        if (!email) return;
        await sendLead(email, "save_results", { decisionRunId: DECISION_RUN_ID, segment: "${escapeHtml(result.decision?.segment ?? '')}" }, true);
        document.getElementById("save-msg").style.display = "block";
        document.getElementById("save-email").disabled = true;
      }

      // Net 2: Price Alert
      function openPriceAlert(entityId) {
        _entityId = entityId;
        document.getElementById("price-modal-name").innerText = entityId;
        document.getElementById("price-modal").style.display = "flex";
      }
      async function submitPriceAlert() {
        const email = document.getElementById("price-email").value;
        if (!email) return;
        await sendLead(email, "price_alert", { entityId: _entityId, decisionRunId: DECISION_RUN_ID }, true);
        document.getElementById("price-msg").style.display = "block";
        setTimeout(closeModals, 2000);
      }

      // Net 3: Interstitial Gate
      function openInterstitial(entityId, buyUrl) {
        _entityId = entityId;
        _buyUrl = buyUrl;
        document.getElementById("interstitial-modal").style.display = "flex";
      }
      async function submitGate() {
        const email = document.getElementById("gate-email").value;
        if (!email) return;
        document.getElementById("gate-msg").style.display = "block";
        await sendLead(email, "interstitial_gate", { entityId: _entityId, decisionRunId: DECISION_RUN_ID, clickType: "buy_now_clicked" }, false);
        // Also fire telemetry click
        fetch("/api/v1/" + DOMAIN + "/telemetry/click", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ decisionRunId: DECISION_RUN_ID, entityId: _entityId, clickType: "buy_now_clicked" }) });
        setTimeout(() => { window.open(_buyUrl, "_blank"); closeModals(); }, 2000);
      }
      function skipGate() {
        // Telemetry: skipped gate
        fetch("/api/v1/" + DOMAIN + "/telemetry/click", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ decisionRunId: DECISION_RUN_ID, entityId: _entityId, clickType: "buy_skipped_gate" }) });
        window.open(_buyUrl, "_blank");
        closeModals();
      }

      async function sendLead(email, leadType, trackingData, optedIn) {
        try {
          await fetch("/api/v1/" + DOMAIN + "/growth/lead", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, leadType, optedIn, trackingData })
          });
        } catch(e) { console.warn("Lead capture failed:", e); }
      }

      // 🗣️ Viral Share Loop
      function copyResultsUrl() {
        navigator.clipboard.writeText(window.location.href).then(() => {
          document.getElementById('share-check').style.display = 'inline';
          setTimeout(() => document.getElementById('share-check').style.display = 'none', 3000);
          sendShareTelemetry("copy_link");
        });
      }
      function shareWhatsApp() {
        window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent("I just found my perfect laptop recommendation on MajorLogic! Check out my results: " + window.location.href), '_blank');
        sendShareTelemetry("whatsapp");
      }
      function shareTwitter() {
        window.open('https://twitter.com/intent/tweet?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent("Check out my custom laptop recommendation from MajorLogic 💻🔥 "), '_blank');
        sendShareTelemetry("twitter");
      }
      function sendShareTelemetry(platform) {
        fetch("/api/v1/" + DOMAIN + "/telemetry/click", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ decisionRunId: DECISION_RUN_ID, entityId: "share_action", clickType: "shared_" + platform }) });
      }
    </script>
  `;
  
  // Prepare computed OG Params for Viral Loop
  const heroTitle = hero ? escapeHtml(hero.title) : "My Perfect Laptop";
  const majorName = state.uiState.majorLabel || "my college major";
  const ogParams = {
    title: `Top Laptop for ${majorName} | MajorLogic`,
    description: `MajorLogic's AI just matched me with the ${heroTitle} as the best laptop for my budget. See my full results!`,
    url: requestUrl
  };

  return renderShell({ title: "MajorLogic - Your Results", body, ogParams });
}
