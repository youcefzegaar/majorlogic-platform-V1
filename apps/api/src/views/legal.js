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
    <p>At MajorLogic, transparency and trust are our fundamental principles. To keep this platform free for students, we participate in affiliate marketing programs.</p>

    <h2>How Our Affiliate Links Work</h2>
    <p>When you click on links to various merchants on this site and make a purchase, this can result in this site earning a commission. Affiliate programs include, but are not limited to, the Amazon Services LLC Associates Program.</p>

    <h2>Our Promise to You: Unbiased Algorithms</h2>
    <p>Our underlying Decision Engine computes scores based on hundreds of technical specifications (CPU, RAM, Thermal performance, etc.). <strong>Commissions do not influence our rankings.</strong> An item's rank is mathematically determined by its fitness for your specific college major and budget. We often recommend products with zero commission if they are the best fit for your needs.</p>
    
    <p>If you have any questions about how our affiliate system works, please feel free to reach out.</p>
  `;
  return renderLegalPage("Affiliate Disclosure", content);
}
