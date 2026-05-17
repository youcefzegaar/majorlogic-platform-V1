import { MigrationsRepository } from "./repositories/migrations.js";
import { RawIngestionRepository } from "./repositories/raw-ingestion.js";
import { CatalogRepository } from "./repositories/catalog.js";
import { DecisionRepository } from "./repositories/decision.js";
import { TelemetryRepository } from "./repositories/telemetry.js";
import { GrowthRepository } from "./repositories/growth.js";
import { CommercialRepository } from "./repositories/commercial.js";

export class PostgresPlatformRepository {
  constructor(pool) {
    this.pool = pool;
    this._migrations = new MigrationsRepository(pool);
    this._raw        = new RawIngestionRepository(pool);
    this._catalog    = new CatalogRepository(pool);
    this._decision   = new DecisionRepository(pool);
    this._telemetry  = new TelemetryRepository(pool);
    this._growth     = new GrowthRepository(pool);
    this._commercial = new CommercialRepository(pool);
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }

  async shutdown() {
    await this.pool.end();
  }

  // ── migrations ────────────────────────────────────────────────────────────────
  applyMigrations(...args)                { return this._migrations.applyMigrations(...args); }

  // ── raw ingestion ─────────────────────────────────────────────────────────────
  saveSourceObservations(...args)         { return this._raw.saveSourceObservations(...args); }
  getLatestSourceObservations(...args)    { return this._raw.getLatestSourceObservations(...args); }
  registerSources(...args)                { return this._raw.registerSources(...args); }
  createIngestionRun(...args)             { return this._raw.createIngestionRun(...args); }
  completeIngestionRun(...args)           { return this._raw.completeIngestionRun(...args); }

  // ── catalog ───────────────────────────────────────────────────────────────────
  getPublishedEntities(...args)           { return this._catalog.getPublishedEntities(...args); }
  getLatestPublishRun(...args)            { return this._catalog.getLatestPublishRun(...args); }
  createPublishRun(...args)               { return this._catalog.createPublishRun(...args); }
  completePublishRun(...args)             { return this._catalog.completePublishRun(...args); }
  publishEntities(...args)                { return this._catalog.publishEntities(...args); }
  getPublishedEntitySnapshot(...args)     { return this._catalog.getPublishedEntitySnapshot(...args); }
  createPipelineRun(...args)              { return this._catalog.createPipelineRun(...args); }
  updatePipelineRunStatus(...args)        { return this._catalog.updatePipelineRunStatus(...args); }
  createPipelineStage(...args)            { return this._catalog.createPipelineStage(...args); }
  updatePipelineStageStatus(...args)      { return this._catalog.updatePipelineStageStatus(...args); }

  // ── decision ──────────────────────────────────────────────────────────────────
  saveDecisionRun(...args)                { return this._decision.saveDecisionRun(...args); }
  getDecisionTrace(...args)               { return this._decision.getDecisionTrace(...args); }
  saveIntervention(...args)               { return this._decision.saveIntervention(...args); }
  getRecentInterventions(...args)         { return this._decision.getRecentInterventions(...args); }
  getAdminOverview(...args)               { return this._decision.getAdminOverview(...args); }
  getLatestDecisionDetails(...args)       { return this._decision.getLatestDecisionDetails(...args); }
  getDecisionLogic(...args)               { return this._decision.getDecisionLogic(...args); }
  saveDecisionLogic(...args)              { return this._decision.saveDecisionLogic(...args); }

  // ── telemetry ─────────────────────────────────────────────────────────────────
  saveTelemetryClick(...args)             { return this._telemetry.saveTelemetryClick(...args); }
  logAffiliateClick(...args)              { return this._telemetry.logAffiliateClick(...args); }
  saveFeedback(...args)                   { return this._telemetry.saveFeedback(...args); }
  saveReviewObservations(...args)         { return this._telemetry.saveReviewObservations(...args); }
  createAcquisitionRun(...args)           { return this._telemetry.createAcquisitionRun(...args); }
  completeAcquisitionRun(...args)         { return this._telemetry.completeAcquisitionRun(...args); }

  // ── growth ────────────────────────────────────────────────────────────────────
  saveGrowthArtifacts(...args)            { return this._growth.saveGrowthArtifacts(...args); }
  saveGrowthLead(...args)                 { return this._growth.saveGrowthLead(...args); }
  getGrowthLeads(...args)                 { return this._growth.getGrowthLeads(...args); }
  getGrowthLeadsFiltered(...args)         { return this._growth.getGrowthLeadsFiltered(...args); }
  getLeadStats(...args)                   { return this._growth.getLeadStats(...args); }
  saveGuardrailEvents(...args)            { return this._growth.saveGuardrailEvents(...args); }
  getGuardrailEvents(...args)             { return this._growth.getGuardrailEvents(...args); }

  // ── commercial ────────────────────────────────────────────────────────────────
  getAffiliateSettings(...args)           { return this._commercial.getAffiliateSettings(...args); }
  saveAffiliateTag(...args)               { return this._commercial.saveAffiliateTag(...args); }
  getAffiliateTagMap(...args)             { return this._commercial.getAffiliateTagMap(...args); }
  getAdminUser(...args)                   { return this._commercial.getAdminUser(...args); }
  createAdminUser(...args)                { return this._commercial.createAdminUser(...args); }
  updateAdminPassword(...args)            { return this._commercial.updateAdminPassword(...args); }
  updateLoginAttempts(...args)            { return this._commercial.updateLoginAttempts(...args); }
  resetLoginAttempts(...args)             { return this._commercial.resetLoginAttempts(...args); }
  getIntegrations(...args)                { return this._commercial.getIntegrations(...args); }
  getIntegrationBySlug(...args)           { return this._commercial.getIntegrationBySlug(...args); }
  saveIntegration(...args)                { return this._commercial.saveIntegration(...args); }
  addCustomIntegration(...args)           { return this._commercial.addCustomIntegration(...args); }
  setIntegrationTestResult(...args)       { return this._commercial.setIntegrationTestResult(...args); }
  deleteIntegrationCredentials(...args)   { return this._commercial.deleteIntegrationCredentials(...args); }
  deleteIntegration(...args)              { return this._commercial.deleteIntegration(...args); }
  logAuditEvent(...args)                  { return this._commercial.logAuditEvent(...args); }
  getAuditLog(...args)                    { return this._commercial.getAuditLog(...args); }
}
