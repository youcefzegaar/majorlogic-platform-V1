// Profile validation: entityFitsProfile, isWithinBudget, meetsMinimumFitContext

export function entityFitsProfile(entity, profile) {
  if (!entity.fitStates[profile.major]) return false;

  // Tiered Trust System: Only Tier 1, 2 & 3 allowed in v1 production
  const tier = entity.market?.sellerTier ?? 4;
  if (tier > 3) return false;

  // Budget gate: only include devices within budget range
  const price = entity.market?.bestOffer?.priceUsd ?? 9999;
  if (profile.budgetUsd && price > profile.budgetUsd * 1.15) return false; // 15% tolerance
  return true;
}

export function isWithinBudget(entity, profile) {
  const price = entity.market?.bestOffer?.priceUsd ?? 9999;
  return price <= (profile.budgetUsd || 9999) * 1.15;
}

/**
 * Layer 5 Delegate — Pre-Publish Fit Gate
 *
 * يُحدد إذا كانت observation تستحق الدخول للكتالوج المنشور.
 *
 * القاعدة: يجب أن يجتاز المنتج الحدَّ الأدنى "official" لتخصص واحد على الأقل.
 * إذا فشل في جميع التخصصات → يُحذف. المحرك لن يراه أصلاً.
 *
 * يُعيد: { passed: boolean, failedSegments: string[] }
 * ← هذا الشكل الموسّع يتيح لـ filterByFitContexts التوثيق الكامل.
 */
export function meetsMinimumFitContext(observation, fitContexts) {
  const specs = observation.specs;
  if (!specs) return { passed: false, failedSegments: Object.keys(fitContexts) };

  const failedSegments = [];

  for (const [segment, baseline] of Object.entries(fitContexts)) {
    const official = baseline.official ?? {};
    const meetsRam     = !official.minRamGb     || (specs.ramGb     >= official.minRamGb);
    const meetsStorage = !official.minStorageGb  || (specs.storageGb >= official.minStorageGb);
    const meetsGpu     = !official.needsDedicatedGpu || (specs.gpuClass !== "integrated");

    if (meetsRam && meetsStorage && meetsGpu) {
      // يكفي اجتياز تخصص واحد للقبول في الكتالوج
      return { passed: true, failedSegments };
    }
    failedSegments.push(segment);
  }

  return { passed: false, failedSegments };
}
