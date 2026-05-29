export function renderLegalPage(title, contentHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${title} | MajorLogic</title>
  <meta name="robots" content="noindex, follow">
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background:#0d0d1a; color:#e0e0e0; margin:0; line-height: 1.6; }
    .container { max-width:800px; margin:0 auto; padding:40px 20px; }
    a { color:#c4b5fd; text-decoration:none; }
    a:hover { text-decoration:underline; }
    h1 { color:#fff; font-size:32px; margin-bottom: 24px; }
    h2 { color:#7C3AED; font-size:22px; margin-top: 32px; margin-bottom: 12px; }
    p { color:#9ca3af; margin-bottom: 16px; }
    nav { margin-bottom: 40px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <nav>
      <a href="/">← Back to MajorLogic</a>
    </nav>
    <main>
      <h1>${title}</h1>
      <p style="font-size: 13px; color: #6b7280;">Last Updated: April 2026</p>
      ${contentHtml}
    </main>
  </div>
</body>
</html>`;
}

export function renderPrivacyPolicy() {
  const content = `
    <h2>1. Introduction</h2>
    <p>Welcome to MajorLogic. We respect your privacy and are committed to protecting any personal data you share with us. This policy applies to our platform, including our interactive search tool and programmatic guides.</p>
    
    <h2>2. Data We Collect</h2>
    <p>We may collect your email address when you explicitly opt-in to save your results or subscribe to notifications. We also collect non-personally identifiable telemetry data (like anonymous click tracking on out-bound affiliate links).</p>
    
    <h2>3. How We Use Your Data</h2>
    <p>Your email address is strictly used to send the results or alerts you requested. We do not sell your personal data to third-party marketers. Anonymous click data is used to optimize our recommendation engine.</p>

    <h2>4. Third-Party Links</h2>
    <p>Our website contains links to third-party retailers (e.g., Amazon, Best Buy). Clicking these links may allow third parties to collect or share data about you. We do not control these third-party sites and are not responsible for their privacy statements.</p>

    <h2>5. Your Rights</h2>
    <p>If you wish to access, update, or delete your personal data (such as your email preferences), please contact us directly. We comply with GDPR and CCPA requirements for data erasure.</p>
  `;
  return renderLegalPage("Privacy Policy", content);
}

export function renderTermsOfUse() {
  const content = `
    <h2>1. Acceptance of Terms</h2>
    <p>By using MajorLogic, you agree to these Terms of Use. Our platform provides algorithm-driven laptop recommendations based on specifications and aggregated data.</p>

    <h2>2. No Professional Guarantee</h2>
    <p>While our engine analyzes thousands of data points objectively, the recommendations are for informational purposes only. We do not guarantee that a specific product will perfectly meet your exact subjective needs, nor do we warranty any products purchased through our links.</p>

    <h2>3. Intellectual Property</h2>
    <p>The "Decision Engine", algorithms, and programmatic ranking systems are the intellectual property of MajorLogic. You may not scrape, reverse-engineer, or duplicate our systems.</p>

    <h2>4. Pricing and Availability</h2>
    <p>Prices and availability change constantly on third-party retailer sites. While our system updates frequently, the price displayed on our platform may differ from the final price on the retailer's site. The retailer's price is the final binding price.</p>
  `;
  return renderLegalPage("Terms of Use", content);
}

export function renderDisclosure() {
  const content = `
    <h2>FTC Affiliate Disclosure</h2>
    <p>To keep this platform free for students, MajorLogic participates in affiliate marketing programs, including the Amazon Services LLC Associates Program. When you click a link and make a purchase, we may earn a small commission at no extra cost to you.</p>

    <h2>How we stay honest: the two-rankings system</h2>
    <p>We operate two completely separate rankings, and they never mix:</p>

    <div style="background:#1a1a2e;border-left:4px solid #7C3AED;padding:20px 24px;border-radius:8px;margin:20px 0;font-family:'Courier New',monospace;font-size:13px;line-height:1.8;color:#d1d5db;">
      Step 1 — LAPTOP RANKING (money-blind)<br/>
      &nbsp;&nbsp;Input: your major, budget, priorities<br/>
      &nbsp;&nbsp;Scoring: technical specs, review signals, sacrifice vector<br/>
      &nbsp;&nbsp;Commercial fields: <span style="color:#f87171;">NEVER SEEN</span> by the engine<br/>
      &nbsp;&nbsp;Output: ranked laptops + irHash (tamper-proof fingerprint)<br/>
      <br/>
      ↓ decision frozen here — irHash seals the ranking<br/>
      <br/>
      Step 2 — STORE RANKING (price-first, trust-second)<br/>
      &nbsp;&nbsp;Input: ranked laptops from Step 1 (unchanged)<br/>
      &nbsp;&nbsp;Ranking: lowest price first, then vendor trust score<br/>
      &nbsp;&nbsp;Affiliate: tiebreaker #6 — only breaks ties between equal offers<br/>
      &nbsp;&nbsp;Output: purchase links attached <em>after</em> ranking is final
    </div>

    <h2>What this means in plain English</h2>
    <ul style="color:#9ca3af;padding-left:20px;">
      <li style="margin-bottom:10px;"><strong style="color:#e0e0e0;">Which laptop</strong> we recommend is decided entirely by how well it fits your stated priorities. Affiliate status plays zero role.</li>
      <li style="margin-bottom:10px;"><strong style="color:#e0e0e0;">Which store</strong> links to: we rank by price first, then vendor trust. An affiliate relationship only breaks ties between otherwise identical offers.</li>
      <li style="margin-bottom:10px;"><strong style="color:#e0e0e0;">Non-affiliate items win regularly.</strong> If the best-priced, most-trusted seller has no affiliate relationship with us, that link appears first.</li>
      <li style="margin-bottom:10px;"><strong style="color:#e0e0e0;">Determinism as proof.</strong> The irHash fingerprint in every decision lets you verify that the same inputs always produce the same ranking — commercial status is irrelevant to the computation.</li>
    </ul>

    <h2>What "Platform trust" tiers mean</h2>
    <p>Cards may show a "Platform trust" label (high / standard / basic). These are <em>our internal vendor trust scores</em> — computed from seller history, condition certification, and price fairness. They are not external certifications or endorsements from Amazon, eBay, or any retailer.</p>

    <h2>Precise language we commit to</h2>
    <p>We will not say "money doesn't affect ranking" as a blanket claim — because for store selection, price and affiliate status are tiebreakers. What we can say precisely, and stand behind:</p>
    <blockquote style="border-left:3px solid #7C3AED;padding:12px 16px;margin:16px 0;color:#d1d5db;font-style:italic;">
      "Which laptop we recommend is determined solely by your priorities and our decision engine. Affiliate relationships never influence which device ranks first."
    </blockquote>

    <h2>FTC compliance</h2>
    <p>In accordance with the FTC's guidelines on endorsements and testimonials (16 C.F.R. §255), we disclose this material connection on every page where affiliate links appear.</p>
  `;
  return renderLegalPage("How We Stay Honest — Affiliate Disclosure", content);
}
