import { readSql } from "../pool.js";

export class MigrationsRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async applyMigrations() {
    const migrationFiles = [
      "database/migrations/0001_platform_init.sql",
      "database/migrations/0002_platform_views.sql",
      "database/migrations/0003_catalog_ingestion.sql",
      "database/migrations/0004_catalog_publish_runs.sql",
      "database/migrations/0005_decision_catalog_trace.sql",
      "database/migrations/0006_telemetry.sql",
      "database/migrations/0007_growth_leads.sql",
      "database/migrations/0008_growth_leads_dedup.sql",
      "database/migrations/0009_affiliate_clicks.sql",
      "database/migrations/0010_affiliate_settings.sql",
      "database/migrations/0011_admin_users.sql",
      "database/migrations/0012_admin_users_security.sql",
      "database/migrations/0013_pipeline_orchestration.sql",
      "database/migrations/0014_generic_active_views.sql",
      "database/migrations/0015_external_acquisition_store.sql",
      "database/migrations/0016_performance_optimization_indices.sql",
      "database/migrations/0017_decision_governance_ledger.sql",
      "database/migrations/0020_user_feedback.sql",
      "database/migrations/0021_decision_interventions.sql",
      "database/migrations/0022_decision_logic.sql",
      "database/migrations/0023_admin_audit_log.sql",
      "database/migrations/0024_platform_integrations.sql",
      "database/seeds/0001_domain_registry.sql"
    ];

    console.log(`[Repository] Applying ${migrationFiles.length} migration files...`);
    for (const file of migrationFiles) {
      console.log(`[Repository] Executing ${file}...`);
      await this.pool.query(readSql(file));
    }
    console.log("[Repository] All migrations applied successfully.");
  }
}
