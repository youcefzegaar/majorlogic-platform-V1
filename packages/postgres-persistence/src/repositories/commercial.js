import { encryptCredentials, decryptCredentials, maskCredentials } from "../crypto.js";

export class CommercialRepository {
  constructor(pool) {
    this.pool = pool;
  }

  // ─────────────────────────────────────────────
  // Affiliate Settings CRUD
  // ─────────────────────────────────────────────

  async getAffiliateSettings() {
    const result = await this.pool.query(
      `SELECT id, seller, seller_display_name, affiliate_tag, affiliate_param_key, is_active, notes, updated_at
       FROM ml_commercial.affiliate_settings
       ORDER BY seller ASC`
    );
    return result.rows;
  }

  async saveAffiliateTag({ seller, affiliateTag, isActive = true, notes = null }) {
    await this.pool.query(
      `INSERT INTO ml_commercial.affiliate_settings
         (seller, affiliate_tag, is_active, notes, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (seller) DO UPDATE SET
         affiliate_tag = EXCLUDED.affiliate_tag,
         is_active     = EXCLUDED.is_active,
         notes         = COALESCE(EXCLUDED.notes, ml_commercial.affiliate_settings.notes),
         updated_at    = now()`,
      [seller, affiliateTag, isActive, notes]
    );
  }

  // Cache affiliate map for the /go/ gateway (refreshed per request, could be cached server-side)
  async getAffiliateTagMap() {
    const rows = await this.getAffiliateSettings();
    const map = {};
    for (const row of rows) {
      if (row.is_active && row.affiliate_tag) {
        map[row.seller] = {
          tag: row.affiliate_tag,
          paramKey: row.affiliate_param_key ?? 'tag'
        };
      }
    }
    return map;
  }

  // ─────────────────────────────────────────────
  // Admin Users
  // ─────────────────────────────────────────────

  async getAdminUser(username) {
    const result = await this.pool.query(
      `SELECT id, username, password_hash, failed_login_attempts, locked_until, last_login_at
       FROM ml_commercial.admin_users WHERE username = $1 LIMIT 1`,
      [username]
    );
    return result.rows[0] || null;
  }

  async createAdminUser(username, passwordHash) {
    await this.pool.query(
      `INSERT INTO ml_commercial.admin_users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
      [username, passwordHash]
    );
  }

  async updateAdminPassword(username, newPasswordHash) {
    await this.pool.query(
      `UPDATE ml_commercial.admin_users SET password_hash = $2, updated_at = now(),
       failed_login_attempts = 0, locked_until = NULL WHERE username = $1`,
      [username, newPasswordHash]
    );
  }

  async updateLoginAttempts(username, attempts, lockedUntil) {
    await this.pool.query(
      `UPDATE ml_commercial.admin_users
       SET failed_login_attempts = $2, locked_until = $3
       WHERE username = $1`,
      [username, attempts, lockedUntil]
    );
  }

  async resetLoginAttempts(username) {
    await this.pool.query(
      `UPDATE ml_commercial.admin_users
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now()
       WHERE username = $1`,
      [username]
    );
  }

  // ─────────────────────────────────────────────
  // Platform Integrations (Secrets Manager)
  // ─────────────────────────────────────────────

  async getIntegrations() {
    const result = await this.pool.query(
      `SELECT id, slug, category, name, description, icon_emoji, config,
              credentials, is_active, last_tested_at, last_test_ok, updated_at
       FROM ml_commercial.platform_integrations ORDER BY category, name`
    );
    return result.rows.map(row => {
      const plain = decryptCredentials(row.credentials);
      return { ...row, credentials: maskCredentials(plain), has_credentials: Object.keys(plain).length > 0 };
    });
  }

  async getIntegrationBySlug(slug) {
    const result = await this.pool.query(
      `SELECT * FROM ml_commercial.platform_integrations WHERE slug = $1`, [slug]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    const plain = decryptCredentials(row.credentials);
    return { ...row, credentials: plain }; // full credentials for server-side use only
  }

  async saveIntegration(slug, { credentials, config, is_active, name, description }) {
    const encCreds = credentials ? encryptCredentials(credentials) : null;
    await this.pool.query(
      `UPDATE ml_commercial.platform_integrations
       SET credentials   = COALESCE($2::jsonb, credentials),
           config        = COALESCE($3::jsonb, config),
           is_active     = COALESCE($4, is_active),
           name          = COALESCE($5, name),
           description   = COALESCE($6, description),
           updated_at    = now()
       WHERE slug = $1`,
      [
        slug,
        encCreds ? JSON.stringify(encCreds) : null,
        config   ? JSON.stringify(config)   : null,
        is_active ?? null,
        name        ?? null,
        description ?? null
      ]
    );
  }

  async addCustomIntegration({ slug, name, description, category, icon_emoji, credentials, config }) {
    const encCreds = credentials ? encryptCredentials(credentials) : {};
    await this.pool.query(
      `INSERT INTO ml_commercial.platform_integrations
         (slug, category, name, description, icon_emoji, credentials, config)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
       ON CONFLICT (slug) DO UPDATE
         SET credentials = EXCLUDED.credentials, config = EXCLUDED.config,
             name = EXCLUDED.name, updated_at = now()`,
      [slug, category ?? 'custom', name, description ?? '', icon_emoji ?? '🔗',
       JSON.stringify(encCreds), JSON.stringify(config ?? {})]
    );
  }

  async setIntegrationTestResult(slug, ok) {
    await this.pool.query(
      `UPDATE ml_commercial.platform_integrations
       SET last_tested_at = now(), last_test_ok = $2, updated_at = now()
       WHERE slug = $1`,
      [slug, ok]
    );
  }

  async deleteIntegrationCredentials(slug) {
    await this.pool.query(
      `UPDATE ml_commercial.platform_integrations
       SET credentials = '{}'::jsonb, is_active = false, updated_at = now()
       WHERE slug = $1`,
      [slug]
    );
  }

  async deleteIntegration(slug) {
    await this.pool.query(
      `DELETE FROM ml_commercial.platform_integrations WHERE slug = $1`,
      [slug]
    );
  }

  // ─────────────────────────────────────────────
  // Admin Audit Log
  // ─────────────────────────────────────────────

  async logAuditEvent({ username, action, resource = null, details = {}, ip = null, status = 'success' }) {
    await this.pool.query(
      `INSERT INTO ml_commercial.admin_audit_log (username, action, resource, details, ip_address, status)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
      [username, action, resource, JSON.stringify(details), ip, status]
    );
  }

  async getAuditLog({ limit = 100, offset = 0, username, action, from, to }) {
    // Whitelist of allowed filter columns — prevents SQL injection if callers
    // ever pass field names dynamically. Values are always parameterized ($N).
    const ALLOWED_FILTER_FIELDS = ['username', 'action', 'created_at'];

    const conditions = [];
    const params = [];
    let idx = 1;

    if (username) {
      if (!ALLOWED_FILTER_FIELDS.includes('username')) throw new Error('Invalid filter field: username');
      conditions.push(`username = $${idx++}`); params.push(username);
    }
    if (action) {
      if (!ALLOWED_FILTER_FIELDS.includes('action')) throw new Error('Invalid filter field: action');
      conditions.push(`action = $${idx++}`);   params.push(action);
    }
    if (from) {
      if (!ALLOWED_FILTER_FIELDS.includes('created_at')) throw new Error('Invalid filter field: created_at');
      conditions.push(`created_at >= $${idx++}`); params.push(from);
    }
    if (to) {
      if (!ALLOWED_FILTER_FIELDS.includes('created_at')) throw new Error('Invalid filter field: created_at');
      conditions.push(`created_at <= $${idx++}`); params.push(to);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT id, username, action, resource, details, ip_address, status, created_at
         FROM ml_commercial.admin_audit_log ${where}
         ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
        [...params, limit, offset]
      ),
      this.pool.query(
        `SELECT COUNT(*) as total FROM ml_commercial.admin_audit_log ${where}`,
        params
      )
    ]);

    return { rows: dataResult.rows, total: parseInt(countResult.rows[0].total) };
  }

  // ─────────────────────────────────────────────
  // Domain Ownership Configs
  // ─────────────────────────────────────────────

  async getOwnershipConfig(domainSlug) {
    const result = await this.pool.query(
      `SELECT config, preset_key, updated_at, updated_by
       FROM ml_commercial.domain_ownership_configs
       WHERE domain_slug = $1 LIMIT 1`,
      [domainSlug]
    );
    if (!result.rows.length) return null;
    const row = result.rows[0];
    return { ...row.config, _presetKey: row.preset_key, _updatedAt: row.updated_at, _updatedBy: row.updated_by };
  }

  async saveOwnershipConfig(domainSlug, config, updatedBy = 'admin') {
    const cleanConfig = { ...config };
    delete cleanConfig._presetKey;
    delete cleanConfig._updatedAt;
    delete cleanConfig._updatedBy;
    await this.pool.query(
      `INSERT INTO ml_commercial.domain_ownership_configs
         (domain_slug, preset_key, config, updated_at, updated_by)
       VALUES ($1, $2, $3, now(), $4)
       ON CONFLICT (domain_slug) DO UPDATE SET
         preset_key = EXCLUDED.preset_key,
         config     = EXCLUDED.config,
         updated_at = now(),
         updated_by = EXCLUDED.updated_by`,
      [domainSlug, config.presetKey ?? null, JSON.stringify(cleanConfig), updatedBy]
    );
  }
}
