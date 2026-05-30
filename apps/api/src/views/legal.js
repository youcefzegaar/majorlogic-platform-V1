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

export function renderOurStory() {
  // FOUNDER_STORY — Design reference: majorlogic-delivery/design-references/03-constitution-page_M12.html
  // M1_GATE: D2 proof ("flaw shown always even when AI fails") is present but gated — publish claim fully after M1 ships.
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>MajorLogic · لماذا نحن موجودون / Why we exist</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=Spline+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Amiri:ital@0;1&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#06080f;--surface:#0e1424;--surface-2:#121a2e;
    --line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.04);
    --ink:#eef2fb;--ink-2:#9aa6c0;--ink-3:#5e6b88;
    --ok:#34d399;--warn:#f5b454;--bad:#fb7185;--info:#56b6f2;--aura:#a78bfa;
    --en-serif:'Fraunces',Georgia,serif; --ar-serif:'Amiri',serif;
    --sans:'Spline Sans',system-ui,sans-serif; --mono:'IBM Plex Mono',monospace;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:
    radial-gradient(1100px 600px at 85% -10%,rgba(167,139,250,.07),transparent 60%),
    radial-gradient(900px 500px at -5% 105%,rgba(86,182,242,.05),transparent 60%),var(--bg);
    color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;line-height:1.65;min-height:100vh}
  .wrap{max-width:740px;margin:0 auto;padding:30px 22px 90px}

  .topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:46px}
  .brand{display:flex;align-items:center;gap:11px;text-decoration:none}
  .glyph{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:18px;
    background:linear-gradient(150deg,var(--aura),transparent 80%),var(--surface-2);border:1px solid rgba(167,139,250,.4)}
  .brand b{font-weight:600;font-size:16px;color:var(--ink)}
  .topbar-right{display:flex;align-items:center;gap:12px}
  .back{font-size:13px;color:var(--ink-3);text-decoration:none;font-family:var(--mono)}
  .back:hover{color:var(--ink)}
  .toggle{display:flex;gap:5px;background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:4px}
  .toggle button{font:inherit;font-size:12px;font-weight:600;color:var(--ink-3);background:none;border:0;padding:6px 12px;border-radius:6px;cursor:pointer;font-family:var(--mono)}
  .toggle button.on{background:rgba(167,139,250,.16);color:var(--ink);box-shadow:inset 0 0 0 1px rgba(167,139,250,.4)}

  .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--aura);margin-bottom:16px}
  h1{font-family:var(--en-serif);font-weight:600;font-size:clamp(30px,5.5vw,46px);line-height:1.15;letter-spacing:-.02em;margin-bottom:22px}
  [dir=rtl] h1,[dir=rtl] h2,[dir=rtl] .thesis,[dir=rtl] .story p{font-family:var(--ar-serif)}
  [dir=rtl] h1{letter-spacing:0;line-height:1.3}

  .story{margin-bottom:14px}
  .story p{font-size:17px;color:var(--ink-2);margin-bottom:16px}
  [dir=rtl] .story p{font-size:18.5px;line-height:1.95}
  .story em{color:var(--ink);font-style:italic}

  .thesis{margin:40px 0;padding:24px 26px;border-radius:16px;
    background:linear-gradient(160deg,var(--surface),var(--bg));border:1px solid rgba(167,139,250,.32);
    box-shadow:0 30px 70px -50px var(--aura);font-family:var(--en-serif);font-size:21px;line-height:1.5;color:var(--ink)}
  [dir=rtl] .thesis{font-size:22px;line-height:1.85}
  .thesis b{color:var(--aura);font-weight:600}

  .section-label{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);
    margin:54px 0 18px;display:flex;align-items:center;gap:12px}
  .section-label::after{content:"";flex:1;height:1px;background:var(--line)}

  .distortion{border:1px solid var(--line);border-radius:15px;padding:20px 22px;margin-bottom:14px;background:var(--surface);transition:.2s}
  .distortion:hover{border-color:rgba(167,139,250,.3)}
  .d-num{font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:.1em}
  .d-disease{font-family:var(--en-serif);font-size:19px;font-weight:600;color:var(--ink);margin:6px 0 10px;line-height:1.35}
  [dir=rtl] .d-disease{font-family:var(--ar-serif);font-size:20px}
  .d-stance{font-size:15px;color:var(--ink-2);margin-bottom:14px}
  [dir=rtl] .d-stance{font-size:16px;line-height:1.85}
  .d-proof{display:flex;gap:11px;align-items:flex-start;background:rgba(52,211,153,.05);border:1px solid rgba(52,211,153,.2);
    border-radius:10px;padding:11px 13px;font-size:13px;color:var(--ink-2);line-height:1.55}
  .d-proof .tag{font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ok);
    background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25);border-radius:5px;padding:3px 7px;white-space:nowrap;margin-top:1px}
  .d-proof code{font-family:var(--mono);font-size:11.5px;color:var(--info)}

  .note{margin:46px 0;padding:18px 20px;border-radius:13px;background:var(--surface-2);border:1px solid var(--line);
    font-size:14.5px;color:var(--ink-2);line-height:1.7}
  [dir=rtl] .note{font-size:15.5px}
  .note b{color:var(--ink)}

  .limits{border:1px solid rgba(245,180,84,.28);background:rgba(245,180,84,.05);border-radius:15px;padding:22px 24px;margin:24px 0}
  .limits h3{font-family:var(--mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--warn);margin-bottom:14px}
  .limits li{list-style:none;font-size:14.5px;color:var(--ink-2);padding:8px 0;border-top:1px solid var(--line-2);line-height:1.6}
  [dir=rtl] .limits li{font-size:15.5px}
  .limits li:first-child{border-top:0}
  .limits li b{color:var(--ink)}

  .audit{text-align:center;margin-top:54px;padding-top:30px;border-top:1px solid var(--line)}
  .audit .h{font-family:var(--en-serif);font-size:22px;font-weight:600;color:var(--ink);margin-bottom:8px}
  [dir=rtl] .audit .h{font-family:var(--ar-serif)}
  .audit .s{font-size:14px;color:var(--ink-3);margin-bottom:20px}
  .audit-links{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
  .audit-links a{font:inherit;font-size:13px;font-weight:600;color:var(--ink-2);text-decoration:none;
    background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:10px 15px;transition:.2s;
    display:inline-flex;align-items:center;gap:8px}
  .audit-links a:hover{color:var(--ink);border-color:rgba(167,139,250,.45)}
  .audit-links .mn{font-family:var(--mono);font-size:11px;color:var(--ink-3)}

  .signoff{text-align:center;margin-top:34px;font-family:var(--mono);font-size:11px;color:var(--ink-3);letter-spacing:.04em;line-height:1.8}
</style>
</head>
<body>
<div class="wrap">

  <div class="topbar">
    <a class="brand" href="/">
      <div class="glyph">🧭</div>
      <b>MajorLogic</b>
    </a>
    <div class="topbar-right">
      <a class="back" href="/" data-i="back">← العودة</a>
      <div class="toggle">
        <button id="ar" class="on" onclick="setLang('ar')">عربي</button>
        <button id="en" onclick="setLang('en')">EN</button>
      </div>
    </div>
  </div>

  <div class="eyebrow" data-i="eyebrow">لماذا نحن موجودون</div>
  <h1 data-i="h1">القرار ليس بحثاً عن الأفضل — بل فهماً لثمنه.</h1>

  <!-- FOUNDER_STORY -->
  <div class="story">
    <p data-i="s1">لم تبدأ القصة بحاسوب. بدأت بنمطٍ لاحظته في كل مرة احتجت أن أقرّر: شيءٌ أشتريه، دورةٌ ألتحق بها، حلٌّ أبحث عنه — أجد عشرات الخيارات، و<em>كلٌّ يبيع الوهم</em>. وهمُ «الأفضل»، وهمُ «بلا عيوب»، وهمُ أنّ الترتيب الذي أمامي محايد.</p>
    <p data-i="s2">لم تكن المشكلة قلّة المعلومات، بل غيابَ معيارٍ صادق وسط الضجيج. فسألتُ سؤالين بسيطين: <em>ما المعيار الذي يجعلني أختار هذا بدل ذاك؟</em> و<em>كيف أثق أنّ أحداً لم يَبِعني هذا الترتيب؟</em> ووراءهما سؤالٌ أعمق كان يقلقني فعلاً: <em>ما الذي لا يجعلني أندم لاحقاً؟</em></p>
    <p data-i="s3">لم أجد جواباً، فبدأتُ أبنيه. وكانت الطريق إليه مكلفة — تضحياتٌ حقيقية — حتى وصلتُ إلى الفكرة التي يقوم عليها كل شيء.</p>
  </div>

  <div class="thesis" data-i="thesis">القرار الجيّد ليس الذي بلا ثمن، بل الذي تدفع ثمنه وأنت تعرفه. الندم لا يأتي من التضحية، بل من اكتشافها بعد فوات الأوان. نحن نُريك الثمن قبل أن تدفعه — فـ<b>نقلّل ندمك، ولا ندّعي أنّنا نمنعه</b>. ومن يَعِدك بقرارٍ بلا ندم، يبيعك الوهم الذي جئنا لنحاربه.</div>

  <div class="section-label" data-i="distortions_label">أربعة أوهام يبيعها السوق — وكيف نقف في وجهها</div>

  <div class="distortion">
    <div class="d-num">01</div>
    <div class="d-disease" data-i="d1_disease">وهمُ «الأفضل المطلق».</div>
    <div class="d-stance" data-i="d1_stance">يبيعك السوق «الأفضل» كأنّه موجود. لا يوجد أفضل مطلق؛ يوجد المقايضة الصحيحة لنيّتك أنت. ما يناسب طالب هندسة يُرهق مصمّماً، وما يوفّر المال يكلّف في مكان آخر.</div>
    <div class="d-proof"><span class="tag" data-i="proof">البرهان</span><span data-i="d1_proof">محرّكنا لا يُخرج «قائمة العشرة الأوائل»، بل يُظهر <b>توزيع التضحيات</b>: ماذا تكسب وماذا تدفع في كل مسار، بالأرقام.</span></div>
  </div>

  <div class="distortion">
    <div class="d-num">02</div>
    <div class="d-disease" data-i="d2_disease">وهمُ «بلا عيوب».</div>
    <div class="d-stance" data-i="d2_stance">يُبرز السوق المحاسن ويدفن العيوب حتى تكتشفها نادماً بعد الشراء. قانوننا الأول: لا توصية بلا ثمنٍ مُعلَن.</div>
    <!-- M1_GATE: "flaw shown always even when AI fails" — deterministic fallback ships with M1 -->
    <div class="d-proof"><span class="tag" data-i="proof">البرهان</span><span data-i="d2_proof">نُظهر العيب <b>دائماً — حتى حين يسقط ذكاؤنا الاصطناعي</b>. مولّدٌ احتياطيّ حتميّ يضمن ظهور التضحية في كل حال. هذا التزامٌ لا يستطيع منافسٌ تقليده بمجرّد حُسن النيّة.</span></div>
  </div>

  <div class="distortion">
    <div class="d-num">03</div>
    <div class="d-disease" data-i="d3_disease">وهمُ «الترتيب المحايد».</div>
    <div class="d-stance" data-i="d3_stance">يرتّب السوق حسب مَن يدفع، ويسمّيه توصية. نحن نكسب عمولةً من بعض الروابط — ونقولها بصراحة — لكنّ المال لا يلمس الترتيب إطلاقاً.</div>
    <div class="d-proof"><span class="tag" data-i="proof">البرهان</span><span data-i="d3_proof">محرّك القرار <b>أعمى عن المال</b>: لا يملك حتى حقلاً للعمولة. نرتّب على الملاءمة، نُجمّد القرار ببصمةٍ (<code>irHash</code>)، ثم نُلصق الرابط التجاري <b>لاحقاً</b> عند التحويل. أيّ تلاعبٍ بالترتيب يُغيّر البصمة فيفضح نفسه.</span></div>
  </div>

  <div class="distortion">
    <div class="d-num">04</div>
    <div class="d-disease" data-i="d4_disease">وهمُ «الوفرة».</div>
    <div class="d-stance" data-i="d4_stance">يغرقك السوق بألف خيار ليبدو غنياً، فيتركك عاجزاً عن القرار. الوفرة الزائفة ليست خدمة، بل تهرّبٌ من المسؤولية.</div>
    <div class="d-proof"><span class="tag" data-i="proof">البرهان</span><span data-i="d4_proof">نحوّل الفوضى إلى <b>ثلاثة أو أربعة مسارات قرار</b> واضحة، كلٌّ بروحه وثمنه — لا قائمةً لا تنتهي.</span></div>
  </div>

  <div class="note" data-i="general"><b>وهذا أكبر من حاسوب.</b> اللابتوبات هي أوّل ميدانٍ نُثبت فيه الفكرة، لا نهايتها. ما تراه دستورٌ ثابت لهندسة القرار — يصلح لأيّ خيارٍ له ثمن — يعمل فوقه «حِزَم مجال» قابلة للاستبدال. المبادئ لا تتغيّر؛ الميدان وحده يتبدّل.</div>

  <div class="limits">
    <h3 data-i="limits_h">ما لا نضمنه — بصراحة</h3>
    <ul>
      <li data-i="lim1"><b>ذوقك الشخصي.</b> نُظهر الثمن؛ القبول قرارك أنت. قد ترى الثمن وتوافق ثم يتغيّر شعورك — وهذا ليس عيباً نملك إصلاحه.</li>
      <li data-i="lim2"><b>الأسعار تتغيّر.</b> نلتقط أفضل ما نعرفه لحظتَه، والسوق يتحرّك بعدنا.</li>
      <li data-i="lim3"><b>نكسب عمولة.</b> من بعض روابط الشراء، ونُفصح عنها — لأنّ إخفاءها يناقض كلّ ما سبق.</li>
      <li data-i="lim4"><b>بياناتنا محدودة.</b> نقول «حسب ما أخبرتَنا» و«حسب ما نعرفه»، لا «الحقيقة المطلقة».</li>
      <li data-i="lim5"><b>نقلّل الندم، لا نمنعه.</b> هذا أصدق وعدٍ نملكه — وأيّ وعدٍ أكبر منه وهمٌ جديد.</li>
    </ul>
  </div>

  <div class="audit">
    <div class="h" data-i="audit_h">لا تثق بنا. تحقّق منّا.</div>
    <div class="s" data-i="audit_s">لا نطلب ثقتك؛ نُسلّمك أدوات محاسبتنا.</div>
    <div class="audit-links">
      <a href="/disclosure" data-i="audit_l1">الإفصاح والنزاهة</a>
      <a href="/disclosure" data-i="audit_l2">كيف نبقى نزيهين</a>
      <a href="#" data-i="audit_l3">irHash <span class="mn">· بصمة كل قرار</span></a>
      <a href="/privacy" data-i="audit_l4">الخصوصية والمشاركة</a>
    </div>
    <div class="signoff" data-i="signoff">صِيغ هذا الدستور بوصفه قيداً ألزمنا به أنفسنا — قبل أن تصل.</div>
  </div>

</div>

<script>
const I = {
  ar:{
    back:'← العودة',
    eyebrow:'لماذا نحن موجودون',
    h1:'القرار ليس بحثاً عن الأفضل — بل فهماً لثمنه.',
    s1:'لم تبدأ القصة بحاسوب. بدأت بنمطٍ لاحظته في كل مرة احتجت أن أقرّر: شيءٌ أشتريه، دورةٌ ألتحق بها، حلٌّ أبحث عنه — أجد عشرات الخيارات، و<em>كلٌّ يبيع الوهم</em>. وهمُ «الأفضل»، وهمُ «بلا عيوب»، وهمُ أنّ الترتيب الذي أمامي محايد.',
    s2:'لم تكن المشكلة قلّة المعلومات، بل غيابَ معيارٍ صادق وسط الضجيج. فسألتُ سؤالين بسيطين: <em>ما المعيار الذي يجعلني أختار هذا بدل ذاك؟</em> و<em>كيف أثق أنّ أحداً لم يَبِعني هذا الترتيب؟</em> ووراءهما سؤالٌ أعمق كان يقلقني فعلاً: <em>ما الذي لا يجعلني أندم لاحقاً؟</em>',
    s3:'لم أجد جواباً، فبدأتُ أبنيه. وكانت الطريق إليه مكلفة — تضحياتٌ حقيقية — حتى وصلتُ إلى الفكرة التي يقوم عليها كل شيء.',
    thesis:'القرار الجيّد ليس الذي بلا ثمن، بل الذي تدفع ثمنه وأنت تعرفه. الندم لا يأتي من التضحية، بل من اكتشافها بعد فوات الأوان. نحن نُريك الثمن قبل أن تدفعه — فـ<b>نقلّل ندمك، ولا ندّعي أنّنا نمنعه</b>. ومن يَعِدك بقرارٍ بلا ندم، يبيعك الوهم الذي جئنا لنحاربه.',
    distortions_label:'أربعة أوهام يبيعها السوق — وكيف نقف في وجهها',
    proof:'البرهان',
    d1_disease:'وهمُ «الأفضل المطلق».',
    d1_stance:'يبيعك السوق «الأفضل» كأنّه موجود. لا يوجد أفضل مطلق؛ يوجد المقايضة الصحيحة لنيّتك أنت. ما يناسب طالب هندسة يُرهق مصمّماً، وما يوفّر المال يكلّف في مكان آخر.',
    d1_proof:'محرّكنا لا يُخرج «قائمة العشرة الأوائل»، بل يُظهر <b>توزيع التضحيات</b>: ماذا تكسب وماذا تدفع في كل مسار، بالأرقام.',
    d2_disease:'وهمُ «بلا عيوب».',
    d2_stance:'يُبرز السوق المحاسن ويدفن العيوب حتى تكتشفها نادماً بعد الشراء. قانوننا الأول: لا توصية بلا ثمنٍ مُعلَن.',
    d2_proof:'نُظهر العيب <b>دائماً — حتى حين يسقط ذكاؤنا الاصطناعي</b>. مولّدٌ احتياطيّ حتميّ يضمن ظهور التضحية في كل حال. هذا التزامٌ لا يستطيع منافسٌ تقليده بمجرّد حُسن النيّة.',
    d3_disease:'وهمُ «الترتيب المحايد».',
    d3_stance:'يرتّب السوق حسب مَن يدفع، ويسمّيه توصية. نحن نكسب عمولةً من بعض الروابط — ونقولها بصراحة — لكنّ المال لا يلمس الترتيب إطلاقاً.',
    d3_proof:'محرّك القرار <b>أعمى عن المال</b>: لا يملك حتى حقلاً للعمولة. نرتّب على الملاءمة، نُجمّد القرار ببصمةٍ (<code>irHash</code>)، ثم نُلصق الرابط التجاري <b>لاحقاً</b> عند التحويل. أيّ تلاعبٍ بالترتيب يُغيّر البصمة فيفضح نفسه.',
    d4_disease:'وهمُ «الوفرة».',
    d4_stance:'يغرقك السوق بألف خيار ليبدو غنياً، فيتركك عاجزاً عن القرار. الوفرة الزائفة ليست خدمة، بل تهرّبٌ من المسؤولية.',
    d4_proof:'نحوّل الفوضى إلى <b>ثلاثة أو أربعة مسارات قرار</b> واضحة، كلٌّ بروحه وثمنه — لا قائمةً لا تنتهي.',
    general:'<b>وهذا أكبر من حاسوب.</b> اللابتوبات هي أوّل ميدانٍ نُثبت فيه الفكرة، لا نهايتها. ما تراه دستورٌ ثابت لهندسة القرار — يصلح لأيّ خيارٍ له ثمن — يعمل فوقه «حِزَم مجال» قابلة للاستبدال. المبادئ لا تتغيّر؛ الميدان وحده يتبدّل.',
    limits_h:'ما لا نضمنه — بصراحة',
    lim1:'<b>ذوقك الشخصي.</b> نُظهر الثمن؛ القبول قرارك أنت. قد ترى الثمن وتوافق ثم يتغيّر شعورك — وهذا ليس عيباً نملك إصلاحه.',
    lim2:'<b>الأسعار تتغيّر.</b> نلتقط أفضل ما نعرفه لحظتَه، والسوق يتحرّك بعدنا.',
    lim3:'<b>نكسب عمولة.</b> من بعض روابط الشراء، ونُفصح عنها — لأنّ إخفاءها يناقض كلّ ما سبق.',
    lim4:'<b>بياناتنا محدودة.</b> نقول «حسب ما أخبرتَنا» و«حسب ما نعرفه»، لا «الحقيقة المطلقة».',
    lim5:'<b>نقلّل الندم، لا نمنعه.</b> هذا أصدق وعدٍ نملكه — وأيّ وعدٍ أكبر منه وهمٌ جديد.',
    audit_h:'لا تثق بنا. تحقّق منّا.',
    audit_s:'لا نطلب ثقتك؛ نُسلّمك أدوات محاسبتنا.',
    audit_l1:'الإفصاح والنزاهة', audit_l2:'كيف نبقى نزيهين', audit_l3:'· بصمة كل قرار', audit_l4:'الخصوصية والمشاركة',
    signoff:'صِيغ هذا الدستور بوصفه قيداً ألزمنا به أنفسنا — قبل أن تصل.'
  },
  en:{
    back:'← Back',
    eyebrow:'Why we exist',
    h1:"A decision isn't the search for the best — it's understanding its price.",
    s1:"It didn't start with a laptop. It started with a pattern I noticed every time I had to decide — something to buy, a course to take, a solution to find: dozens of options, and <em>each one selling an illusion</em>. The illusion of \"the best.\" The illusion of \"no flaws.\" The illusion that the ranking in front of me was neutral.",
    s2:"The problem was never too little information — it was the absence of an honest standard inside the noise. So I asked two simple questions: <em>what makes me choose this over that?</em> and <em>how do I trust no one sold me this ranking?</em> And behind them, the deeper one that actually worried me: <em>what will keep me from regretting this later?</em>",
    s3:"I found no answer, so I started building one. The road to it was costly — real sacrifices — until I reached the idea everything rests on.",
    thesis:"A good decision isn't one without a price — it's one whose price you pay knowingly. Regret doesn't come from the sacrifice; it comes from discovering it too late. We show you the price before you pay it — so we <b>reduce your regret; we don't claim to prevent it</b>. Anyone who promises a decision without regret is selling the very illusion we exist to fight.",
    distortions_label:'Four illusions the market sells — and how we stand against each',
    proof:'proof',
    d1_disease:'The "absolute best" illusion.',
    d1_stance:"The market sells you \"the best\" as if it existed. There is no absolute best — only the right trade-off for your intent. What fits an engineering student exhausts a designer; what saves money costs you elsewhere.",
    d1_proof:"Our engine doesn't produce a \"top-ten list\" — it shows the <b>distribution of sacrifice</b>: what you gain and what you pay on each path, in numbers.",
    d2_disease:'The "no flaws" illusion.',
    d2_stance:"The market spotlights the upsides and buries the flaws until you find them, regretting, after you've bought. Our first law: no recommendation without a stated price.",
    d2_proof:"We show the flaw <b>always — even when our AI fails</b>. A deterministic fallback guarantees the sacrifice appears no matter what. That's a commitment a competitor can't copy with good intentions alone.",
    d3_disease:'The "neutral ranking" illusion.',
    d3_stance:"The market ranks by who pays and calls it a recommendation. We do earn a commission on some links — and we say so plainly — but money never touches the ranking.",
    d3_proof:"The decision engine is <b>blind to money</b>: it doesn't even have a field for commission. We rank on fit, freeze the decision with a fingerprint (<code>irHash</code>), then attach the commercial link <b>afterward</b>, at redirect. Any tampering changes the fingerprint and exposes itself.",
    d4_disease:'The "abundance" illusion.',
    d4_stance:"The market drowns you in a thousand options to look rich, and leaves you unable to decide. False abundance isn't a service — it's an escape from responsibility.",
    d4_proof:"We turn the noise into <b>three or four clear decision paths</b>, each with its own character and its own price — not an endless list.",
    general:"<b>And this is bigger than a laptop.</b> Laptops are the first arena where we prove the idea, not its end. What you see is a stable constitution for decision engineering — fit for any choice with a price — with replaceable \"domain packs\" running on top. The principles don't change; only the arena does.",
    limits_h:"What we don't guarantee — plainly",
    lim1:"<b>Your personal taste.</b> We show the price; accepting it is your call. You may see the price, agree, then feel differently later — that's not a flaw we can fix.",
    lim2:"<b>Prices change.</b> We capture the best we know at the moment; the market moves after us.",
    lim3:"<b>We earn a commission.</b> On some purchase links, and we disclose it — because hiding it would contradict everything above.",
    lim4:"<b>Our data has limits.</b> We say \"based on what you told us\" and \"based on what we know,\" not \"the absolute truth.\"",
    lim5:"<b>We reduce regret; we don't prevent it.</b> That's the most honest promise we have — and any bigger promise is a new illusion.",
    audit_h:"Don't trust us. Verify us.",
    audit_s:"We don't ask for your trust — we hand you the tools to hold us accountable.",
    audit_l1:'Disclosure & integrity', audit_l2:'How we stay honest', audit_l3:"· every decision's fingerprint", audit_l4:'Privacy & sharing',
    signoff:'This constitution was written as a constraint we bound ourselves to — before you arrived.'
  }
};

function setLang(l){
  document.documentElement.lang=l;
  document.documentElement.dir=l==='ar'?'rtl':'ltr';
  document.getElementById('ar').classList.toggle('on',l==='ar');
  document.getElementById('en').classList.toggle('on',l==='en');
  const dict=I[l];
  document.querySelectorAll('[data-i]').forEach(el=>{
    const k=el.getAttribute('data-i');
    if(dict[k]!=null) el.innerHTML=dict[k];
  });
}
setLang('ar');
</script>
</body>
</html>`;
}
