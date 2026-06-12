import { sendWelcomeEmail } from "../../../../../../packages/email-service/src/index.js";
import { getValidDomains } from "../../../registry.js";
import { createHmac, timingSafeEqual } from "node:crypto";

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
}
