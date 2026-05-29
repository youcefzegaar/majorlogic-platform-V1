/**
 * Decision Conflict Detector
 *
 * Pure function — no React, no imports needed.
 * Detects tensions between user priorities and returns a list of insight objects.
 * Ported from domains/laptop-student-us/insights.js.
 */

export function detectConflicts(profile, lang) {
  const isAr = lang === 'ar';
  const insights = [];
  const { sliders, preferences, major, budgetUsd } = profile;
  if (!sliders || !preferences) return insights;

  const demandingMajors = ['engineering', 'design', 'ai'];
  if (demandingMajors.includes(major) && budgetUsd < 850) {
    insights.push({
      id: 'econ_major_bottleneck', type: 'conflict',
      gravity: 0.95, confidence: 0.91, trend: 'stable', sample_period: '2024-2026',
      dimensions: ['budget', 'major'],
      title: isAr ? 'عائق اقتصادي' : 'Economic Bottleneck',
      description: isAr
        ? `تخصصك (${major.toUpperCase()}) يتطلب عادةً قدرة معالجة عالية. بميزانية ${budgetUsd}$، الكتالوج محدود بأجهزة الفئة الاقتصادية — وهذا يعني شبه يقين بالتنازل في العمر الافتراضي أو الأداء الذروي.`
        : `Your major (${major.toUpperCase()}) typically requires significant processing power. At $${budgetUsd}, the catalog is constrained to economy-tier devices — almost certain compromise in longevity or peak performance.`,
    });
  }
  if (sliders.performance > 75 && sliders.portability > 75) {
    insights.push({
      id: 'phys_limit_perf_port', type: 'conflict',
      gravity: 0.82, confidence: 0.76, trend: 'weakening', sample_period: '2024-2026',
      dimensions: ['performance', 'portability'],
      title: isAr ? 'تعارض الأداء والمحمولية' : 'Performance–Portability Tension',
      description: isAr
        ? 'في معظم أجهزة x86 الحالية، الأداء العالي لا يزال مرتبطاً بهيكل أثقل بسبب متطلبات التبريد. تصميمات ARM ووبرات البخار بدأت تتحدى هذا — لكن في السوق السائدة لا تزال مقايضة حقيقية.'
        : 'In most current x86 laptops, high performance still correlates with heavier chassis due to cooling. ARM-based and vapor-chamber designs are beginning to challenge this — but in the mainstream market it remains a real trade-off.',
    });
  }
  if (sliders.performance > 80 && preferences.battery > 70) {
    insights.push({
      id: 'power_tax_perf_batt', type: 'conflict',
      gravity: 0.78, confidence: 0.84, trend: 'stable', sample_period: '2024-2026',
      dimensions: ['performance', 'battery'],
      title: isAr ? 'تعارض الأداء والبطارية' : 'Performance–Battery Trade-off',
      description: isAr
        ? 'المكونات عالية الأداء تستهلك طاقة أكبر بكثير. الجمع بين بطارية تدوم يوماً كاملاً وأداء ذروي يتطلب إما بطارية أكبر (تزيد الوزن) أو تحديد سقف للأداء تحت الضغط.'
        : 'High-performance components draw significantly more power. Combining all-day battery with peak performance typically requires either a larger battery (adding weight) or performance caps under load.',
    });
  }
  if (['cs', 'ai'].includes(major) && sliders.virtual_machines >= 70 && sliders.performance >= 75) {
    insights.push({
      id: 'harmony_cs_setup', type: 'harmony',
      gravity: 0.90, confidence: 0.88, trend: 'stable', sample_period: '2024-2026',
      dimensions: ['major', 'performance'],
      title: isAr ? 'توافق استراتيجي' : 'Strategic Alignment',
      description: isAr
        ? 'مستوى الأداء وتخصيصات الأجهزة الافتراضية لديك يتطابقان بشكل وثيق مع ما تتطلبه أعمال CS/AI فعلياً — ملف مُعاير بدقة مع مخاطر منخفضة للإفراط أو التقصير في المواصفات.'
        : 'Your performance and VM allocation closely match what CS/AI workloads actually demand — a well-calibrated profile with low risk of over- or under-speccing.',
    });
  }
  if (budgetUsd > 1400 && preferences.battery > 60 && sliders.portability > 60 && sliders.performance <= 70) {
    insights.push({
      id: 'harmony_premium_ultra', type: 'harmony',
      gravity: 0.85, confidence: 0.82, trend: 'stable', sample_period: '2024-2026',
      dimensions: ['budget', 'portability'],
      title: isAr ? 'مسار استثمار ذكي' : 'Smart Investment Path',
      description: isAr
        ? 'ميزانية مرتفعة موجهة نحو البطارية والمحمولية (بدلاً من الأداء الذروي) تتوافق جيداً مع الأجهزة الخفيفة المتميزة — أجهزة ذات عمر طويل وقيمة إعادة بيع مرتفعة في هذه الفئة السعرية.'
        : 'High budget focused on battery and portability (rather than peak performance) is well-aligned with premium ultrabooks — devices with strong longevity and high resale retention in this price tier.',
    });
  }
  if (['general', 'medical'].includes(major) && sliders.performance > 85 && budgetUsd > 1500) {
    insights.push({
      id: 'risk_overkill', type: 'risk',
      gravity: 0.70, confidence: 0.75, trend: 'stable', sample_period: '2024-2026',
      dimensions: ['major', 'budget'],
      title: isAr ? 'احتمال عدم التوافق في الموارد' : 'Potential Resource Mismatch',
      description: isAr
        ? 'استناداً لأعمال هذا التخصص المعتادة، هذا المستوى من الأداء يتجاوز الاحتياجات الفعلية الملاحظة. توجيه الميزانية نحو جودة الشاشة أو المحمولية سيوفر قيمة يومية أكبر على الأرجح.'
        : 'Based on typical workloads for this major, this performance level exceeds observed needs. Budget redirected toward display quality or portability would likely deliver more day-to-day value.',
    });
  }
  return insights;
}
