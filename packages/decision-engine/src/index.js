/**
 * @deprecated — ARCHIVED
 *
 * هذا الملف لا يُستخدم في مسار الإنتاج.
 *
 * المسار الرسمي الموحد هو:
 *   executeUniversalPipeline (packages/platform-core)
 *     → DecisionOrchestrator (packages/decision-orchestrator)
 *       → DecisionKernel (packages/decision-kernel)
 *
 * سبب الإبقاء: مرجع تاريخي لمنطق الـ domain-pack المباشر.
 * لا تستدعِ هذا الملف في كود إنتاجي جديد.
 *
 * للإزالة الكاملة: احذف هذه الحزمة بعد التأكد من عدم وجود
 * أي استدعاء لها خارج مجلد /tests.
 */

export function runDecisionEngine() {
  throw new Error(
    '[decision-engine] DEPRECATED: Use executeUniversalPipeline from platform-core instead.'
  );
}
