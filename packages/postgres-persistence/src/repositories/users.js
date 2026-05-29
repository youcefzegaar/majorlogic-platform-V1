/**
 * UsersRepository — ML Users schema (accounts, sessions, saved decisions, price alerts)
 *
 * All queries are parameterized. Methods return null when a row is not found
 * rather than throwing.
 */

export class UsersRepository {
  constructor(pool) {
    this.pool = pool;
  }

  // ─────────────────────────────────────────────
  // Users
  // ─────────────────────────────────────────────

  async createUser({ email, passwordHash, displayName = null, locale = "en" }) {
    const result = await this.pool.query(
      `INSERT INTO ml_users.users (email, password_hash, display_name, locale)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, display_name, locale, verified_at, created_at, updated_at`,
      [email, passwordHash, displayName, locale]
    );
    return result.rows[0] || null;
  }

  async getUserByEmail(email) {
    const result = await this.pool.query(
      `SELECT id, email, password_hash, display_name, locale, verified_at, created_at, updated_at
       FROM ml_users.users
       WHERE email = $1
       LIMIT 1`,
      [email]
    );
    return result.rows[0] || null;
  }

  async getUserById(id) {
    const result = await this.pool.query(
      `SELECT id, email, display_name, locale, verified_at, created_at, updated_at
       FROM ml_users.users
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }

  // ─────────────────────────────────────────────
  // Sessions
  // ─────────────────────────────────────────────

  async createUserSession({ userId, tokenHash, expiresAt, ipAddress = null, userAgent = null }) {
    const result = await this.pool.query(
      `INSERT INTO ml_users.user_sessions (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, created_at, expires_at`,
      [userId, tokenHash, expiresAt, ipAddress, userAgent]
    );
    return result.rows[0] || null;
  }

  /**
   * Returns the user row (not the session row) if the session is valid and not expired.
   */
  async getUserBySessionToken(tokenHash) {
    const result = await this.pool.query(
      `SELECT u.id, u.email, u.display_name, u.locale, u.verified_at, u.created_at, u.updated_at
       FROM ml_users.user_sessions s
       JOIN ml_users.users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    return result.rows[0] || null;
  }

  async deleteUserSession(tokenHash) {
    await this.pool.query(
      `DELETE FROM ml_users.user_sessions WHERE token_hash = $1`,
      [tokenHash]
    );
  }

  async deleteExpiredSessions() {
    const result = await this.pool.query(
      `DELETE FROM ml_users.user_sessions WHERE expires_at < NOW()`
    );
    return result.rowCount;
  }

  // ─────────────────────────────────────────────
  // Saved Decisions
  // ─────────────────────────────────────────────

  async saveDecision({ userId, domain, irHash = null, title, profileSnapshot, decisionSnapshot, notes = null }) {
    const result = await this.pool.query(
      `INSERT INTO ml_users.saved_decisions
         (user_id, domain, ir_hash, title, profile_snapshot, decision_snapshot, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, domain, ir_hash, title, notes, created_at`,
      [userId, domain, irHash, title, JSON.stringify(profileSnapshot), JSON.stringify(decisionSnapshot), notes]
    );
    return result.rows[0] || null;
  }

  async listDecisions(userId, { limit = 20, offset = 0 } = {}) {
    const result = await this.pool.query(
      `SELECT id, user_id, domain, ir_hash, title, notes, created_at
       FROM ml_users.saved_decisions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  async getDecision(id, userId) {
    const result = await this.pool.query(
      `SELECT id, user_id, domain, ir_hash, title, profile_snapshot, decision_snapshot, notes, created_at
       FROM ml_users.saved_decisions
       WHERE id = $1
         AND user_id = $2
       LIMIT 1`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  async deleteDecision(id, userId) {
    const result = await this.pool.query(
      `DELETE FROM ml_users.saved_decisions
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rowCount > 0;
  }

  // ─────────────────────────────────────────────
  // Price Alerts
  // ─────────────────────────────────────────────

  async upsertPriceAlert({ userId, entityId, domain = "laptop-student-us", targetPrice = null, currentPrice = null }) {
    const result = await this.pool.query(
      `INSERT INTO ml_users.price_alerts (user_id, entity_id, domain, target_price, current_price, active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (user_id, entity_id) DO UPDATE SET
         active        = TRUE,
         domain        = EXCLUDED.domain,
         target_price  = EXCLUDED.target_price,
         current_price = EXCLUDED.current_price
       RETURNING id, user_id, entity_id, domain, target_price, current_price, active, created_at`,
      [userId, entityId, domain, targetPrice, currentPrice]
    );
    return result.rows[0] || null;
  }

  async listPriceAlerts(userId) {
    const result = await this.pool.query(
      `SELECT id, user_id, entity_id, domain, target_price, current_price, active, created_at
       FROM ml_users.price_alerts
       WHERE user_id = $1
         AND active = TRUE
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async deletePriceAlert(id, userId) {
    const result = await this.pool.query(
      `UPDATE ml_users.price_alerts
       SET active = FALSE
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rowCount > 0;
  }

  // ─────────────────────────────────────────────
  // Shared Links
  // ─────────────────────────────────────────────

  async createSharedLink({ token, decisionId = null, userId, irHash = null, snapshot, title, domain = "laptop-student-us", expiresAt }) {
    const result = await this.pool.query(
      `INSERT INTO ml_users.shared_links
         (token, decision_id, user_id, ir_hash, snapshot, title, domain, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, token, decision_id, user_id, ir_hash, title, domain, revoked, created_at, expires_at`,
      [token, decisionId || null, userId, irHash || null, JSON.stringify(snapshot), title, domain, expiresAt]
    );
    return result.rows[0] || null;
  }

  async getSharedLinkByToken(token) {
    const result = await this.pool.query(
      `SELECT id, token, decision_id, user_id, ir_hash, snapshot, title, domain, revoked, created_at, expires_at
       FROM ml_users.shared_links
       WHERE token = $1
         AND NOT revoked
         AND expires_at > NOW()
       LIMIT 1`,
      [token]
    );
    return result.rows[0] || null;
  }

  async revokeSharedLink(decisionId, userId) {
    const result = await this.pool.query(
      `UPDATE ml_users.shared_links
       SET revoked = TRUE
       WHERE decision_id = $1 AND user_id = $2`,
      [decisionId, userId]
    );
    return result.rowCount > 0;
  }
}
