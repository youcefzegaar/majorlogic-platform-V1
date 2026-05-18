/**
 * Email Service — packages/email-service/src/index.js
 *
 * Sends emails via SMTP (nodemailer).
 * Config via env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 * Falls back to silent no-op if SMTP not configured (dev mode).
 */

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("[EmailService] No SMTP config found. Emails will be logged only.");
    return null;
  }

  const nodemailer = await import("nodemailer");
  transporter = nodemailer.default.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  return transporter;
}

async function send({ to, subject, html }) {
  const from = process.env.EMAIL_FROM ?? "MajorLogic <hello@majorlogic.ai>";
  const t = await getTransporter();

  if (!t) {
    console.log(`[EmailService] Would send to: ${to} | Subject: ${subject}`);
    return { simulated: true };
  }

  return t.sendMail({ from, to, subject, html });
}

// ── Templates ──────────────────────────────────────────────

export async function sendWelcomeEmail({ email, leadType, metadata = {} }) {
  const msgs = {
    save_results: {
      subject: "📚 Your MajorLogic Results Are Saved",
      body: `
        <h2>Your laptop shortlist is ready</h2>
        <p>We've saved your personalized results. Return anytime to review your top picks for <strong>${metadata.segment ?? "your major"}</strong>.</p>
        <p style="margin-top:24px;">
          <a href="https://majorlogic.ai/web/results" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">
            View My Results →
          </a>
        </p>
        <p style="color:#888;font-size:12px;margin-top:32px;">You're receiving this because you requested it. No spam, ever. <a href="#">Unsubscribe</a>.</p>
      `
    },
    price_alert: {
      subject: "🔔 Price Alert Confirmed — We're Watching",
      body: `
        <h2>We're on price watch for you!</h2>
        <p>As soon as <strong>${metadata.entityId ?? "your saved laptop"}</strong> drops in price, you'll be the first to know.</p>
        <p style="color:#888;font-size:12px;margin-top:32px;">Unsubscribe anytime. No spam, ever. <a href="#">Unsubscribe</a>.</p>
      `
    },
    interstitial_gate: {
      subject: "🛡️ Your 5-Step Laptop Inspection Guide",
      body: `
        <h2>Don't get a defective unit — use this checklist</h2>
        <ol>
          <li>Boot and check for dead pixels (all-white, all-black screen test)</li>
          <li>Test all USB ports and headphone jack</li>
          <li>Run battery calibration on first charge</li>
          <li>Check keyboard and trackpad for wobble</li>
          <li>Verify serial number on manufacturer website</li>
        </ol>
        <p style="color:#888;font-size:12px;margin-top:32px;">Happy with your purchase? Share MajorLogic with a classmate. <a href="#">Unsubscribe</a>.</p>
      `
    }
  };

  const template = msgs[leadType] ?? msgs.save_results;

  return send({
    to: email,
    subject: template.subject,
    html: `
      <!DOCTYPE html>
      <html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#1a1a2e;">
        <div style="margin-bottom:24px;">
          <strong style="font-size:20px;">🧭 MajorLogic</strong>
        </div>
        ${template.body}
      </body></html>
    `
  });
}

export async function sendNurtureEmail({ email, sequenceDay, metadata = {} }) {
  const segment = metadata.segment ?? "your major";
  const siteUrl = process.env.FRONTEND_URL ?? "https://majorlogic.tech";

  const templates = {
    3: {
      subject: "Still searching? Here's what changed this week",
      body: `
        <h2>Still looking for the right laptop?</h2>
        <p>A lot can change in a few days. Prices shift, new deals appear, and your priorities might too.</p>
        <p>Your personalized recommendation for <strong>${segment}</strong> is still saved — run a fresh analysis to see if anything has changed.</p>
        <p style="margin-top:24px;">
          <a href="${siteUrl}" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">
            Re-Run My Analysis →
          </a>
        </p>
        <p style="color:#888;font-size:12px;margin-top:32px;">You signed up for MajorLogic results. <a href="#">Unsubscribe</a>.</p>
      `
    },
    7: {
      subject: "Top 3 questions CS students ask before buying a laptop",
      body: `
        <h2>Three questions worth answering before you buy</h2>
        <ol style="line-height:2;">
          <li><strong>Is 16GB RAM enough for CS?</strong> — Yes for most, but if you run VMs or Docker containers daily, 32GB future-proofs you for 4+ years.</li>
          <li><strong>Does the GPU matter?</strong> — For pure software development: no. For ML/AI coursework: yes, look for an RTX 4060 or better.</li>
          <li><strong>MacBook vs Windows?</strong> — macOS has excellent UNIX tooling out of the box. Windows with WSL2 is now near-equivalent. Pick what your lab/employer uses.</li>
        </ol>
        <p>Our engine weighs all of this automatically based on your specific priorities.</p>
        <p style="margin-top:24px;">
          <a href="${siteUrl}" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">
            See My Recommendation →
          </a>
        </p>
        <p style="color:#888;font-size:12px;margin-top:32px;">You signed up for MajorLogic results. <a href="#">Unsubscribe</a>.</p>
      `
    }
  };

  const template = templates[sequenceDay];
  if (!template) return { skipped: true, reason: "unknown_sequence_day" };

  return send({
    to: email,
    subject: template.subject,
    html: `
      <!DOCTYPE html>
      <html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#1a1a2e;">
        <div style="margin-bottom:24px;">
          <strong style="font-size:20px;">🧭 MajorLogic</strong>
        </div>
        ${template.body}
      </body></html>
    `
  });
}

export async function sendPriceDropAlert({ email, entityId, oldPrice, newPrice, buyUrl }) {
  return send({
    to: email,
    subject: `🔥 Price Drop Alert — ${entityId} just got cheaper!`,
    html: `
      <!DOCTYPE html>
      <html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#1a1a2e;">
        <h2>Price Drop Detected!</h2>
        <p>The laptop you're watching just dropped from <s>$${oldPrice}</s> to <strong style="color:#16a34a;">$${newPrice}</strong>.</p>
        ${buyUrl ? `<p><a href="${buyUrl}" style="background:#7C3AED;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;">Buy Now →</a></p>` : ""}
        <p style="color:#888;font-size:12px;margin-top:32px;"><a href="#">Unsubscribe from price alerts</a></p>
      </body></html>
    `
  });
}
