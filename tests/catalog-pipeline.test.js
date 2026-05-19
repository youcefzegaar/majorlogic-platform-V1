/**
 * catalog-pipeline.test.js
 *
 * اختبار شامل لمسار مولد الكتالوج (Layers 1-8).
 * يعمل على بيانات حقيقية من source-observations.generated.json
 * ويتحقق من صحة كل طبقة بشكل مستقل ثم من المسار الكامل.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import { acquireAndStage }                       from "../packages/catalog-core/src/index.js";
import { resolveIdentities }                     from "../packages/catalog-identity/src/index.js";
import { normalizeObservations, filterMinimumViable } from "../packages/catalog-normalization/src/index.js";
import { resolveAndValidateCatalog } from "../packages/catalog-validation/src/index.js";
import { runCatalogPipeline, generatePublishedCatalog } from "../packages/catalog-publish/src/index.js";
import { laptopStudentUsDomainPack }             from "../domains/laptop-student-us/domain-pack.js";

function loadJson(url) {
  return JSON.parse(fs.readFileSync(url, "utf8"));
}

const RAW_OBSERVATIONS_PATH = new URL(
  "../domains/laptop-student-us/generated/source-observations.generated.json",
  import.meta.url
);

const FIT_CONTEXTS_PATH = new URL(
  "../rulesets/domains/laptop-student-us/fit-contexts.json",
  import.meta.url
);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     → ${err.message}`);
    failed++;
  }
}

// ─── البيانات ────────────────────────────────────────────────────────────────
const sourceObservations = loadJson(RAW_OBSERVATIONS_PATH);
const fitContexts        = loadJson(FIT_CONTEXTS_PATH);
const domainContext      = { fitContexts };

console.log("\n📦 Catalog Pipeline Test Suite\n");

// ─── Layer 1+2: Acquisition + Staging ────────────────────────────────────────
console.log("Layer 1+2: Acquisition + Staging (catalog-core)");

const { rawObservations, stagingResult } = acquireAndStage({
  sourceRecords: sourceObservations,
  domainPack: laptopStudentUsDomainPack,
  meta: { sourceId: "test_run", acquiredAt: "2026-04-10T00:00:00Z" }
});

test("يجب أن تُعيد acquireAndStage نفس عدد السجلات", () => {
  assert.equal(rawObservations.length, sourceObservations.length,
    `Expected ${sourceObservations.length} observations, got ${rawObservations.length}`);
});

test("يجب أن تتضمن كل observation بيانات الاستحواذ (_acquisition)", () => {
  const missing = rawObservations.filter((obs) => !obs._acquisition);
  assert.equal(missing.length, 0, "Some observations are missing _acquisition metadata");
});

test("stagingResult يجب أن يعكس بيانات الـ run", () => {
  assert.equal(stagingResult.sourceId, "test_run");
  assert.equal(stagingResult.totalAcquired, sourceObservations.length);
  assert.equal(stagingResult.domainId, "laptop-student-us");
});

// ─── Layer 4: Normalization ───────────────────────────────────────────────────
console.log("\nLayer 4: Normalization (catalog-normalization)");

const { normalized, errors: normErrors } = normalizeObservations({
  rawObservations,
  domainPack: laptopStudentUsDomainPack
});

test("يجب أن تُعيد normalizeObservations observations مُطبّعة", () => {
  assert.ok(normalized.length > 0, "No normalized observations returned");
});

test("أخطاء التطبيع يجب أن تكون صفراً على بيانات صحيحة", () => {
  assert.equal(normErrors.length, 0,
    `Normalization errors: ${JSON.stringify(normErrors)}`);
});

const { valid: viable } = filterMinimumViable(normalized);

test("filterMinimumViable يجب أن يُمرّر جميع السجلات الصحيحة", () => {
  assert.ok(viable.length > 0, "All observations were rejected by minimum-viable filter");
});

test("السجلات المقبولة يجب أن تمتلك اسم وسعر موجب", () => {
  const invalid = viable.filter((obs) => {
    const hasName  = Boolean(obs.title ?? obs.itemName);
    const offers   = obs.offers ?? [];
    const hasPrice = obs.market?.bestOffer?.priceUsd > 0
      || offers.some((o) => o.priceUsd > 0);
    return !hasName || !hasPrice;
  });
  assert.equal(invalid.length, 0,
    `${invalid.length} viable observations have missing name or price`);
});

// ─── Layer 3: Identity Resolution ────────────────────────────────────────────
console.log("\nLayer 3: Identity Resolution (catalog-identity)");

const { entities, totalObservations, uniqueEntities } = resolveIdentities(viable, {
  fingerprintFn: laptopStudentUsDomainPack.buildEntityFingerprint.bind(laptopStudentUsDomainPack)
});

test("resolveIdentities يجب أن يُعيد كيانات مجمّعة", () => {
  assert.ok(entities.length > 0, "No entities returned from identity resolution");
});

test("uniqueEntities يجب أن يكون <= totalObservations", () => {
  assert.ok(uniqueEntities <= totalObservations,
    `uniqueEntities (${uniqueEntities}) > totalObservations (${totalObservations})`);
});

test("كل كيان يجب أن يمتلك entityId وobservations غير فارغة", () => {
  const broken = entities.filter((e) => !e.entityId || !e.observations?.length);
  assert.equal(broken.length, 0, `${broken.length} entities are broken`);
});

// ─── Layer 7: Truth Resolution + Quality Gates ────────────────────────────────
console.log("\nLayer 7: Truth Resolution (catalog-validation)");

const { resolved: validatedEntities } = resolveAndValidateCatalog(entities, {
  qualityGates: { minConfidence: 0.50, minObservations: 1 },
  resolveFieldsFn: laptopStudentUsDomainPack.resolveEntityFields.bind(laptopStudentUsDomainPack)
});

test("resolveAndValidateCatalog يجب أن يُعيد كيانات متحقق منها", () => {
  assert.ok(validatedEntities.length > 0, "No entities passed validation");
});

test("الكيانات المتحقق منها يجب أن تمتلك confidence >= 0.50", () => {
  const failing = validatedEntities.filter((e) => e.confidence < 0.50);
  assert.equal(failing.length, 0,
    `${failing.length} validated entities have confidence < 0.50`);
});

test("trustSignals يجب أن يكون موجوداً في كل كيان محلول", () => {
  const missing = validatedEntities.filter((e) => !e.trustSignals);
  assert.equal(missing.length, 0, "Some entities are missing trustSignals");
});

// ─── Layer 8: Full Pipeline (runCatalogPipeline) ──────────────────────────────
console.log("\nLayer 8: Full Pipeline Orchestration (catalog-publish)");

const { publishedEntities, pipelineReport } = runCatalogPipeline({
  sourceRecords: sourceObservations,
  domainPack: laptopStudentUsDomainPack,
  domainContext,
  meta: { sourceId: "pipeline_test", acquiredAt: "2026-04-10T00:00:00Z" },
  qualityGates: { minConfidence: 0.50, minObservations: 1 }
});

test("runCatalogPipeline يجب أن يُنتج كيانات منشورة", () => {
  assert.ok(publishedEntities.length > 0, "No entities were published by the pipeline");
});

test("كل كيان منشور يجب أن يمتلك entityId وtitle وmarket", () => {
  const broken = publishedEntities.filter((e) => !e.entityId || !e.title || !e.market);
  assert.equal(broken.length, 0,
    `${broken.length} published entities are missing required fields`);
});

test("كل كيان منشور يجب أن يمتلك fitStates لسياقات التخصص", () => {
  const missing = publishedEntities.filter((e) => !e.fitStates || !Object.keys(e.fitStates).length);
  assert.equal(missing.length, 0,
    `${missing.length} published entities are missing fitStates`);
});

test("pipelineReport يجب أن يعكس الأعداد الصحيحة", () => {
  assert.ok(pipelineReport.publishedCount > 0, "pipelineReport shows zero published entities");
  assert.ok(pipelineReport.totalAcquired === undefined || pipelineReport.stagingResult?.totalAcquired > 0);
});

test("publishedCount == publishedEntities.length (اتساق التقرير)", () => {
  assert.equal(pipelineReport.publishedCount, publishedEntities.length,
    `Report says ${pipelineReport.publishedCount} but actual is ${publishedEntities.length}`);
});

// ─── التوافق مع الإصدار القديم (Legacy Compatibility) ────────────────────────
console.log("\nLegacy Compatibility (generatePublishedCatalog)");

const legacyPublished = generatePublishedCatalog({
  observations: sourceObservations,
  domainPack: laptopStudentUsDomainPack,
  domainContext
});

test("generatePublishedCatalog (legacy) يجب أن تستمر بالعمل دون أخطاء", () => {
  assert.ok(legacyPublished.length > 0, "Legacy catalog generation returned zero entities");
});

test("مخرجات legacy تطابق عدد المدخلات", () => {
  assert.equal(legacyPublished.length, sourceObservations.length);
});

// ─── النتيجة النهائية ─────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(56)}`);
if (failed === 0) {
  console.log(`PASS: catalog pipeline test suite (${passed} checks passed)\n`);
} else {
  console.log(`FAIL: ${failed} check(s) failed — ${passed} passed\n`);
  process.exit(1);
}
