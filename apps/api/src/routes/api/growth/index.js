import { sendWelcomeEmail } from "../../../../../../packages/email-service/src/index.js";
import { getValidDomains } from "../../../registry.js";
import { createHmac, timingSafeEqual } from "node:crypto";

// Verifies a signed unsubscribe token produced by buildUnsubscribeUrl().
// Returns { email, leadType } on success, null on invalid/expired token.
function verifyUnsubToken(token) {
  try {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;
    const payload = token.slice(0, dot);
    const sig     = token.slice(dot + 1);
    const secret  = process.env.COOKIE_SECRET ?? "dev-fallback";
    const expected = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    const [email, leadType, expiresStr] = decoded.split(":");
    if (!email || !leadType || Date.now() > Number(expiresStr)) return null;
    return { email, leadType };
  } catch {
    return null;
  }
}

export default async function growthRoutes(fastify) {
  fastify.post("/:domain/growth/lead", {
    schema: {
      body: {
        type: "object",
        required: ["email", "leadType"],
        additionalProperties: false,
        properties: {
          email:          { type: "string", format: "email", maxLength: 254 },
          leadType:       { type: "string", enum: ["save_results", "price_alert", "interstitial_gate"] },
          optedIn:        { type: "boolean", default: false },
          decisionRunId:  { type: "string", maxLength: 100, nullable: true },
          trackingData:   { type: "object", additionalProperties: true, maxProperties: 20 },
        },
      },
    },
  }, async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    const { email, leadType, optedIn = false, trackingData = {}, decisionRunId: leadDecisionRunId = null } = request.body;
    const VALID_LEAD_TYPES = ["save_results", "price_alert", "interstitial_gate"];

    if (!email || !leadType) {
      return reply.status(400).send({ error: "missing_lead_fields", message: "email and leadType are required" });
    }
    if (!VALID_LEAD_TYPES.includes(leadType)) {
      return reply.status(400).send({ error: "invalid_lead_type", message: `leadType must be one of: ${VALID_LEAD_TYPES.join(", ")}` });
    }
    if (typeof email !== 'string' || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email) || email.length > 254) {
      return reply.status(400).send({ error: "invalid_email_format" });
    }

    try {
      const { getRepository } = await import("../../../db/repository.js");
      const repository = await getRepository();
      if (!repository) return reply.status(503).send({ error: "db_offline" });

      // For price_alert leads: look up current entity price and store as watched baseline
      let enrichedMetadata = { ...trackingData };
      if (leadType === "price_alert" && trackingData.entityId && !enrichedMetadata.watchedPriceUsd) {
        try {
          const entities = await repository.getPublishedEntities({ domainId: domain });
          const entity = entities.find(e => e.entityId === trackingData.entityId);
          const currentPrice = entity?.market?.bestOffer?.priceUsd;
          if (currentPrice != null) enrichedMetadata.watchedPriceUsd = currentPrice;
        } catch { /* non-fatal */ }
      }

      const lead = await repository.saveGrowthLead({ domainId: domain, email, leadType, metadata: enrichedMetadata, optedIn, decisionRunId: leadDecisionRunId });
      sendWelcomeEmail({ email, leadType, metadata: enrichedMetadata })
        .catch(err => request.log.error({ err }, "[Email] Failed to send welcome email"));

      const msg = lead.isDuplicate ? "Updated your preferences. Thanks!" : "Lead captured. Thank you!";
      return reply.send({ ok: true, leadId: lead.id, leadType, isDuplicate: lead.isDuplicate, message: msg });
    } catch (err) {
      request.log.error({ err }, "Lead capture failed");
      return reply.status(500).send({ error: "lead_capture_failed" });
    }
  });

  // CSV Export (HMAC token only — no static secret)
  fastify.get("/:domain/growth/leads/export", {
    config: {
      rateLimit: { max: 10, timeWindow: "1 hour" }
    }
  }, async (request, reply) => {
    const { domain } = request.params;
    if (!getValidDomains().has(domain)) return reply.status(400).send({ error: "invalid_domain" });
    const { leadType = null, token } = request.query;

    const exportSecret = process.env.ADMIN_EXPORT_SECRET;
    if (!exportSecret) return reply.status(503).send({ error: "export_not_configured" });

    let isAuthorized = false;
    if (token) {
      const dotIdx = token.indexOf(".");
      const expires = dotIdx > 0 ? token.slice(0, dotIdx) : null;
      const sig = dotIdx > 0 ? token.slice(dotIdx + 1) : null;
      const expiresInt = parseInt(expires, 10);
      if (expires && sig && !isNaN(expiresInt) && Date.now() < expiresInt) {
        const expected = createHmac("sha256", exportSecret)
          .update(expires).digest("hex");
        try {
          if (timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) isAuthorized = true;
        } catch { /* length mismatch — not authorized */ }
      }
    }

    if (!isAuthorized) return reply.status(401).send({ error: "unauthorized" });

    try {
      const { getRepository } = await import("../../../db/repository.js");
      const repository = await getRepository();
      if (!repository) return reply.status(503).send({ error: "db_offline" });

      const leads = await repository.getGrowthLeads({ domainId: domain, leadType });
      const header = "id,email,lead_type,opted_in,decision_run_id,entity_id,created_at";

      const csvField = (v) => {
        const s = String(v ?? "");
        if (/^[=+@\t-]/.test(s)) return `'${s}`;
        if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const rows = leads.map(l => {
        const meta = l.metadata || {};
        return [l.id, l.email, l.lead_type, l.opted_in, meta.decisionRunId ?? "", meta.entityId ?? "", l.created_at]
          .map(csvField).join(",");
      });

      return reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", `attachment; filename=leads-${domain}-${Date.now()}.csv`)
        .send([header, ...rows].join("\n"));
    } catch (err) {
      request.log.error({ err }, "Leads export failed");
      return reply.status(500).send({ error: "export_failed" });
    }
  });

  // Unsubscribe — verifies HMAC token, sets opted_in=false, returns HTML confirmation.
  // Linked from every outbound email footer (CAN-SPAM / GDPR compliance).
  fastify.get("/unsubscribe", {
    config: { rateLimit: { max: 20, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const { t: token } = request.query;
    const parsed = token ? verifyUnsubToken(token) : null;

    if (!parsed) {
      return reply
        .header("Content-Type", "text/html; charset=utf-8")
        .status(400)
        .send(unsubHtml("Invalid or expired link", "This unsubscribe link has expired or is invalid. Please contact us if you need help."));
    }

    try {
      const { getRepository } = await import("../../../db/repository.js");
      const repository = await getRepository();
      if (repository) {
        await repository.unsubscribeEmail({ email: parsed.email, leadType: parsed.leadType });
      }
    } catch (err) {
      request.log.warn({ err }, "[Unsubscribe] DB update failed — continuing");
    }

    return reply
      .header("Content-Type", "text/html; charset=utf-8")
      .send(unsubHtml("You've been unsubscribed", `<strong>${parsed.email}</strong> has been removed from <em>${parsed.leadType}</em> emails. You won't hear from us on this topic again.`));
  });
}

function unsubHtml(title, body) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title>
  <style>body{font-family:system-ui,sans-serif;max-width:520px;margin:80px auto;padding:32px;color:#1a1a2e;text-align:center}
  h1{font-size:1.4rem;margin-bottom:16px}p{color:#555;line-height:1.6}</style></head>
  <body><h1>${title}</h1><p>${body}</p>
  <p style="margin-top:40px"><a href="https://majorlogic.tech" style="color:#7C3AED">← Back to MajorLogic</a></p>
  </body></html>`;
}
