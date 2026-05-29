/**
 * Decision Profile Utilities
 *
 * Pure functions — no React, no side effects.
 * Transforms UI state into API-compatible profile shapes.
 */

const IMAGE_REGISTRY = {
  'thinkpad-p1':  '/laptops/thinkpad-p1-gen-6.png',
  'zephyrus-g14': '/laptops/asus-zephyrus-g14.png',
  'macbook-air':  '/laptops/macbook-air-15.png',
  'macbook-pro':  '/laptops/macbook-pro-14.png',
  'dell-inspiron':'/laptops/dell-inspiron-14.png',
  'acer-nitro':   '/laptops/acer-nitro-v-15.png',
  'thinkpad-t14': '/laptops/lenovo-thinkpad-t14.png',
  'lenovo-loq':   '/laptops/lenovo-loq-15.png',
  'proart':       '/laptops/asus-proart-p16.png',
  'omnibook':     '/laptops/hp-omnibook-x.png',
  'swift-go':     '/laptops/acer-swift-go-14.png',
  'surface':      '/laptops/surface-laptop-7.png',
  'msi-pulse':    '/laptops/msi-pulse-16.png',
};

export function resolveImage(entityId) {
  const id = entityId.toLowerCase();
  const match = Object.keys(IMAGE_REGISTRY).find(k => id.includes(k));
  return match ? IMAGE_REGISTRY[match] : '/laptops/dell-inspiron-14.png';
}

/**
 * Converts any value to a valid slider integer [0, 100].
 * Guards against NaN from undefined/missing priority fields.
 */
export function toSlider(v, fallback = 50) {
  const n = Number(v);
  return isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
}

/**
 * Returns a human-readable stability description for the decision integrity state.
 */
export function buildStabilityDescription(score, relaxed, status, lang) {
  const isAr = lang === 'ar';
  if (status === 'COGNITIVE_COLLAPSE') {
    return isAr
      ? 'لا يمكن اتخاذ قرار عقلاني في ظل هذه القيود الصارمة.'
      : 'No rational decision possible within these constraints.';
  }
  if (relaxed) {
    return isAr
      ? 'تم تخفيف أحد القيود للعثور على نتائج. تم تقليل استقرار القرار.'
      : 'One constraint was relaxed to find results. Stability reduced.';
  }
  if (score >= 80) {
    return isAr
      ? 'تمت تلبية جميع القيود الأساسية. ملف التضحيات يتوافق تماماً مع أولوياتك.'
      : 'All core constraints met. Sacrifice profile aligns with your priorities.';
  }
  if (score >= 60) {
    return isAr
      ? 'تم رصد تسوية طفيفة. يرجى مراجعة التنازلات والمقايضات بعناية.'
      : 'Mild compromise detected. Review the trade-offs carefully.';
  }
  return isAr
    ? 'تم تخفيف قيود هامة. يرجى التفكير في تعديل متطلباتك.'
    : 'Significant constraints relaxed. Consider adjusting your requirements.';
}

/**
 * Transforms UI form inputs into an API-compatible decision profile.
 */
export function buildProfile({ major, lang, budgetMax, priorities, goal }) {
  const perf = toSlider(priorities.performance, 70);
  return {
    major,
    locale: lang,
    budgetUsd: budgetMax,
    preferences: {
      performance: perf,
      portability: toSlider(priorities.portability),
      battery:     toSlider(priorities.battery),
      display:     major === 'design' ? 85 : 50,
      resale:      toSlider(priorities.resale, 50),
    },
    sliders: {
      performance:     perf,
      virtual_machines: Math.round(perf * 0.85),
      video_4k:         Math.round(perf * 0.70),
      gaming:           Math.round(perf * 0.75),
      portability:      toSlider(priorities.portability),
    },
    context: {
      acceptsOpenBox:     true,
      acceptsRefurbished: true,
      financingAllowed:   true,
    },
    productIntent: {
      performancePreference: 'safe_balanced',
      osPreference:          'windows_preferred',
      screenSize:            '14_16',
      naturalLanguageIntent: goal || (lang === 'ar'
        ? 'أحتاج لابتوب للبرمجة والاستخدام اليومي.'
        : 'I need a laptop for programming and daily use.'),
    },
  };
}
