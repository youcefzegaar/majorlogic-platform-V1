/**
 * SEO Page Template — apps/api/src/views/seo-page.js
 *
 * يُولّد HTML كاملة لكل صفحة /laptops/:major/:budget
 * محسّنة لـ Google مع Schema.org + FAQ + Internal Links.
 */

import { escapeHtml } from "./templates.js";
import { getPublicBaseUrl } from "../config/validate-env.js";

// ── FAQ content per major ──────────────────────────────────────────────────

const MAJOR_FAQS = {
  "computer-science": [
    { q: "How much RAM do I need for computer science?", a: "At least 16GB for compiling, running Docker containers, and virtual machines. 32GB is ideal for AI/ML workflows." },
    { q: "Do CS students need a dedicated GPU?", a: "Only if you plan on machine learning or game development. For most CS coursework, integrated graphics is sufficient." },
    { q: "What's the best OS for CS students?", a: "Linux or Windows 11 Pro are preferred for most CS tasks. macOS offers great Unix compatibility for terminal work." },
    { q: "How much storage do I need?", a: "512GB minimum, 1TB recommended if you'll be storing datasets, VMs, or multiple project environments." }
  ],
  engineering: [
    { q: "Do engineering students need a dedicated GPU?", a: "Yes, especially for CAD software like SolidWorks, ANSYS, or Autodesk. A mid-range dGPU significantly improves rendering." },
    { q: "What CPU is best for engineering simulations?", a: "Modern Intel Core i7 or AMD Ryzen 7+ with high core counts. Thermal performance matters more than raw clock speed." },
    { q: "Is a 15-inch screen necessary for engineering?", a: "Larger screens help with CAD work, but portability matters. Many engineers pair a 14-inch laptop with an external monitor." },
    { q: "Should engineering students buy a Mac or Windows?", a: "Windows is strongly preferred — most engineering software (ANSYS, SolidWorks, MATLAB) runs natively only on Windows." }
  ],
  design: [
    { q: "Do design students need an OLED display?", a: "Highly recommended. OLED offers 100% DCI-P3 color accuracy which is essential for photo editing and UI/UX design." },
    { q: "How much VRAM do I need for Adobe Premiere?", a: "4GB minimum, 8GB recommended for 4K video editing. Adobe's Mercury Playback Engine leverages GPU heavily." },
    { q: "Is a MacBook better for design than Windows?", a: "Macs are popular for design due to color accuracy and Adobe suite optimization, but premium Windows ultrabooks are equally competitive in 2026." },
    { q: "What display resolution should design students look for?", a: "At minimum 1920×1200 (WUXGA). For professional work, look for 2560×1600 or higher with factory calibration." }
  ],
  medical: [
    { q: "What specifications do medical students need?", a: "Long battery (8+ hours for hospital rounds), lightweight (under 1.5kg), fast SSD for large medical imaging files, and a reliable display." },
    { q: "How long should a medical student laptop battery last?", a: "Ideally 10+ hours. Medical students often cannot find outlets during clinical rotations." },
    { q: "Do medical students need a dedicated GPU?", a: "No. Medical software and textbooks require strong CPU and fast storage — a dedicated GPU is not typically needed." },
    { q: "Is an iPad a replacement for a laptop for medical school?", a: "No — most medical school platforms require full Windows or macOS. An iPad is a companion device, not a replacement." }
  ],
  general: [
    { q: "What's a good all-around college laptop?", a: "Look for 16GB RAM, 512GB SSD, 8+ hours battery, and a 1080p or higher IPS display. These specs handle virtually any coursework." },
    { q: "Should I buy a new or refurbished laptop for college?", a: "Refurbished from certified sellers can save 20-30%. For a 4-year investment, certified refurbished is often better value." },
    { q: "How much should a college student spend on a laptop?", a: "Budget $700-$1,200 for a laptop that will last 4 years. Going too cheap means replacing it halfway through your degree." },
    { q: "Does the brand matter for college laptops?", a: "Reliability data matters more than brand. Lenovo ThinkPad, Apple MacBook, and Dell XPS consistently rank highest in student satisfaction surveys." }
  ]
};

const RELATED_MAJORS = {
  "computer-science": ["engineering", "general"],
  engineering:        ["computer-science", "design"],
  design:             ["general", "medical"],
  medical:            ["general", "computer-science"],
  general:            ["computer-science", "design"]
};

const BUDGET_TIERS_META = {
  "under-800":  { label: "Under $800",   prev: null,          next: "under-1200" },
  "under-1200": { label: "Under $1,200", prev: "under-800",   next: "under-1500" },
  "under-1500": { label: "Under $1,500", prev: "under-1200",  next: "under-2000" },
  "under-2000": { label: "Under $2,000", prev: "under-1500",  next: "any-budget" },
  "any-budget": { label: "Any Budget",   prev: "under-2000",  next: null }
};

const SELLER_ICONS = { Amazon: "🛒", "Best Buy": "💙", "B&H": "📷", "Apple": "🍎", "Dell": "💻" };

// ── Main renderer ─────────────────────────────────────────────────────────

export function renderSeoPage(pageData) {
  const { meta, cards, commercialRoutes, major, budget } = pageData;
  const faqs        = MAJOR_FAQS[major] ?? MAJOR_FAQS.general;
  const related     = RELATED_MAJORS[major] ?? [];
  const budgetMeta  = BUDGET_TIERS_META[budget] ?? {};

  // Schema.org ItemList for structured data
  const schemaItems = cards.slice(0, 3).map((card, i) => {
    const route = commercialRoutes.find(r => r.entityId === card.entityId);
    const offer = route?.bestOffer;
    return {
      "@type": "ListItem",
      "position": i + 1,
      "name": card.title,
      "description": card.whyThis ?? "",
      "url": offer ? `${getPublicBaseUrl()}/go/laptop-student-us/${encodeURIComponent(card.entityId ?? card.title)}` : "",
      "offers": offer ? {
        "@type": "Offer",
        "price": offer.priceUsd,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "seller": { "@type": "Organization", "name": offer.seller }
      } : undefined
    };
  }).filter(Boolean);

  const faqSchema = {
    "@type": "FAQPage",
    "mainEntity": faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a }
    }))
  };

  const relatedBudgetLinks = Object.entries(BUDGET_TIERS_META)
    .filter(([k]) => k !== budget)
    .map(([k, v]) => `<a href="/laptops/${major}/${k}" style="display:inline-block;background:#1a1a2e;border:1px solid #2d2d4e;border-radius:8px;padding:6px 14px;color:#c4b5fd;font-size:13px;text-decoration:none;">${v.label}</a>`)
    .join("");

  const relatedMajorLinks = related.map(m => {
    const meta2 = { "computer-science":"💻 CS","engineering":"⚙️ Engineering","design":"🎨 Design","medical":"🩺 Medical","general":"📚 General" };
    return `<a href="/laptops/${m}" style="display:inline-block;background:#1a1a2e;border:1px solid #2d2d4e;border-radius:8px;padding:6px 14px;color:#c4b5fd;font-size:13px;text-decoration:none;">${meta2[m] ?? m}</a>`;
  }).join("");

  const cardHtml = cards.map((card, idx) => {
    const route      = commercialRoutes.find(r => r.entityId === card.entityId);
    const bestOffer  = route?.bestOffer;
    const allOffers  = route?.allOffers ?? [];
    const rank       = ["🥇 Top Pick", "🥈 Runner-Up", "🥉 Best Budget", "⚡ Alternative"][idx] ?? "✨ Also Great";
    const gatewayUrl = `/go/laptop-student-us/${encodeURIComponent(card.entityId ?? card.title)}${bestOffer ? `?seller=${encodeURIComponent(bestOffer.seller)}` : ""}`;

    const offerList = allOffers.slice(0, 3).map(o => {
      const icon = SELLER_ICONS[o.seller] ?? "🏪";
      const bestMark = o.isBestDeal ? `<span style="background:#14532d;color:#4ade80;padding:1px 6px;border-radius:99px;font-size:10px;font-weight:700;">BEST DEAL</span>` : "";
      const conditionBadge = o.condition !== "new" ? `<span style="background:#3b1f00;color:#fb923c;padding:1px 6px;border-radius:99px;font-size:10px;">${o.condition}</span>` : "";
      return `
        <a href="/go/laptop-student-us/${encodeURIComponent(card.entityId ?? card.title)}?seller=${encodeURIComponent(o.seller)}"
           style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#0d0d1a;border:1px solid #2d2d4e;border-radius:8px;text-decoration:none;color:#e0e0e0;font-size:13px;gap:8px;">
          <span>${icon} ${escapeHtml(o.seller)} ${conditionBadge} ${bestMark}</span>
          <strong style="color:${o.isBestDeal ? '#4ade80' : '#c4b5fd'};">$${o.priceUsd.toLocaleString()}</strong>
        </a>`;
    }).join("");

    return `
    <article itemscope itemtype="https://schema.org/Product"
      style="background:#12122a;border:1px solid #2d2d4e;border-radius:16px;padding:28px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
        <div style="flex:1;min-width:240px;">
          <div style="font-size:14px;font-weight:700;color:#7C3AED;margin-bottom:8px;">${rank}</div>
          <h2 itemprop="name" style="font-size:22px;font-weight:800;color:#fff;margin:0 0 6px;">${escapeHtml(card.title)}</h2>
          ${card.whyThis ? `<p itemprop="description" style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 16px;">${escapeHtml(card.whyThis)}</p>` : ""}
          ${card.badNews ? `
            <div style="background:#1c0a0a;border:1px solid #7f1d1d;border-radius:8px;padding:10px 14px;margin-bottom:16px;">
              <span style="color:#f87171;font-size:13px;">⚠️ <strong>Note:</strong> ${escapeHtml(card.badNews)}</span>
            </div>` : ""}
          <a href="/search?major=${major}&budget=${bestOffer?.priceUsd ?? ''}#personalize"
            style="display:inline-block;background:transparent;border:1px solid #7C3AED;color:#c4b5fd;border-radius:8px;padding:8px 16px;font-size:13px;text-decoration:none;margin-bottom:16px;">
            🎯 Personalize for my situation →
          </a>
        </div>

        <div style="min-width:220px;width:260px;">
          <div style="font-size:12px;color:#6b7280;margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Available at</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${offerList || `<a href="${escapeHtml(gatewayUrl)}" style="background:#7C3AED;color:#fff;border:none;border-radius:8px;padding:12px 20px;font-weight:700;text-align:center;text-decoration:none;display:block;">🛒 See Best Price</a>`}
          </div>
        </div>
      </div>
    </article>`;
  }).join("");

  const faqHtml = faqs.map(f => `
    <details style="background:#12122a;border:1px solid #2d2d4e;border-radius:8px;padding:16px;margin-bottom:8px;">
      <summary style="cursor:pointer;font-weight:700;color:#e2d9f3;font-size:15px;list-style:none;">
        ❓ ${escapeHtml(f.q)}
      </summary>
      <p style="color:#9ca3af;font-size:14px;line-height:1.7;margin:12px 0 0;">${escapeHtml(f.a)}</p>
    </details>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(meta.h1)} | MajorLogic</title>
  <meta name="description" content="${escapeHtml(meta.description)}"/>
  <link rel="canonical" href="${getPublicBaseUrl()}${meta.canonical}"/>

  <!-- Open Graph -->
  <meta property="og:type"        content="website"/>
  <meta property="og:title"       content="${escapeHtml(meta.h1)}"/>
  <meta property="og:description" content="${escapeHtml(meta.description)}"/>
  <meta property="og:url"         content="${getPublicBaseUrl()}${meta.canonical}"/>
  <meta property="og:site_name"   content="MajorLogic"/>

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary"/>
  <meta name="twitter:title"       content="${escapeHtml(meta.h1)}"/>
  <meta name="twitter:description" content="${escapeHtml(meta.description)}"/>

  <!-- Schema.org -->
  <script type="application/ld+json">
  ${JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList",
    "name": meta.h1, "description": meta.description,
    "url": `${getPublicBaseUrl()}${meta.canonical}`,
    "itemListElement": schemaItems }, null, 2)}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify({ "@context": "https://schema.org", ...faqSchema }, null, 2)}
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="/public/styles.css"/>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background:#0d0d1a; color:#e0e0e0; margin:0; }
    .container { max-width:900px; margin:0 auto; padding:32px 20px; }
    nav a { color:#7C3AED; margin-right:16px; text-decoration:none; font-size:14px; }
  </style>
</head>
<body>

<div class="container">
  <!-- Breadcrumb Nav -->
  <nav aria-label="breadcrumb" style="margin-bottom:24px;">
    <a href="/">🧭 MajorLogic</a>
    <span style="color:#555;">›</span>
    <a href="/laptops/${major}" style="margin:0 8px;">Laptops for ${escapeHtml(meta.majorLabel ?? major)}</a>
    ${budget !== "any-budget" ? `<span style="color:#555;">›</span> <span style="color:#888;margin-left:8px;">${escapeHtml(budgetMeta.label ?? budget)}</span>` : ""}
  </nav>

  <!-- Hero -->
  <header style="margin-bottom:32px;">
    <h1 style="font-size:clamp(24px,4vw,38px);font-weight:800;color:#fff;line-height:1.2;margin:0 0 12px;">
      ${escapeHtml(meta.h1)}
    </h1>
    <p style="color:#9ca3af;font-size:16px;line-height:1.6;max-width:680px;margin:0 0 20px;">
      ${escapeHtml(meta.description)}
    </p>

    <!-- Trust Badges -->
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
      <span style="background:#1a1a2e;border:1px solid #2d2d4e;border-radius:99px;padding:4px 14px;font-size:12px;">🤖 Algorithm-Based</span>
      <span style="background:#1a1a2e;border:1px solid #2d2d4e;border-radius:99px;padding:4px 14px;font-size:12px;">✅ Affiliate Disclosed</span>
      <span style="background:#1a1a2e;border:1px solid #2d2d4e;border-radius:99px;padding:4px 14px;font-size:12px;">📅 Updated ${new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}</span>
      <span style="background:#1a1a2e;border:1px solid #2d2d4e;border-radius:99px;padding:4px 14px;font-size:12px;">🔍 ${cards.length} Models Analyzed</span>
    </div>

    <!-- CTA: Use the interactive tool -->
    <a href="/search" style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#7C3AED,#5b21b6);color:#fff;border-radius:12px;padding:14px 24px;font-weight:700;font-size:15px;text-decoration:none;">
      🎯 Get My Personalized Recommendation
      <span style="font-size:12px;opacity:0.8;">→ takes 30 seconds</span>
    </a>
  </header>

  <!-- Budget Tier Nav -->
  <div style="margin-bottom:28px;">
    <div style="font-size:13px;color:#6b7280;margin-bottom:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Filter by Budget</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">${relatedBudgetLinks}</div>
  </div>

  <!-- Main Cards -->
  <section aria-label="Laptop Recommendations">
    ${cardHtml}
  </section>

  <!-- FAQ Section -->
  <section style="margin-top:48px;" aria-label="Frequently Asked Questions">
    <h2 style="font-size:22px;font-weight:700;color:#fff;margin-bottom:16px;">
      ❓ FAQs for ${escapeHtml(meta.h1Suffix ?? "Students")}
    </h2>
    ${faqHtml}
  </section>

  <!-- Related Majors -->
  <section style="margin-top:40px;">
    <h2 style="font-size:18px;font-weight:700;color:#fff;margin-bottom:12px;">📚 Guides for Other Majors</h2>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">${relatedMajorLinks}</div>
  </section>

  <!-- Affiliate Disclosure Footer -->
  <footer style="background:#0a1a0a;border:1px solid #16a34a22;border-radius:12px;padding:16px 20px;margin-top:40px;">
    <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0;">
      <strong style="color:#4ade80;">💚 Affiliate Disclosure:</strong>
      Some links on this page earn MajorLogic a small commission if you buy — at no extra cost to you.
      <strong>This commission never influences our rankings</strong>, which are determined by an independent algorithm evaluating specs, value, and fitness for your major.
      <a href="/disclosure" style="color:#7C3AED;margin-left:4px;">Read our full disclosure →</a>
    </p>
    <div style="margin-top:12px;display:flex;gap:16px;font-size:12px;">
      <a href="/privacy" style="color:#9ca3af;text-decoration:none;">Privacy Policy</a>
      <a href="/terms" style="color:#9ca3af;text-decoration:none;">Terms of Use</a>
    </div>
  </footer>
</div>

</body>
</html>`;
}
