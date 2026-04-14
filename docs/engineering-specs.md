# الوثائق التنفيذية الهندسية — MajorLogic

هذا المستند يحول الوثائق التعريفية السابقة إلى مواصفات تنفيذية هندسية لكل طبقة رئيسية في MajorLogic، مع اعتماد مبدأين حاكمين:
1. الفصل الصارم بين المعرفة والقرار والتنفيذ التجاري.
2. قابلية التوسع متعددة المجالات، بحيث لا يبقى التصميم محصورًا في لابتوبات الطلاب، بل يمكن نقله لاحقًا إلى مجالات شراء معقدة أخرى مثل:
   - السيارات
   - العقارات
   - العتاد الطبي
   - الكاميرات والمعدات الإبداعية
   - المعدات المهنية عالية الكلفة

---

## المبدأ المعماري العابر للمجالات (0)

### 1.0 الفرضية العامة
لا ينبغي أن يُبنى MajorLogic كمنصة خاصة بفئة منتجات واحدة، بل كنظام قرار عام لعمليات الشراء المعقدة، مع دومينات متخصصة فوق نواة مشتركة.

### 2.0 القاعدة التنظيمية
- كل ما هو عام عبر المجالات يوضع في `packages/core`.
- كل ما هو خاص بالمجال يوضع في `packages/domain` أو `rulesets/schemas/taxonomies`.

### 3.0 الطبقات التي يجب أن تبقى عامة قدر الإمكان
1. Published Catalog Contracts
2. Decision Engine Core
3. Card Selection Framework
4. Purchase Routing Framework
5. Ownership Strategy Framework
6. Trust & Integrity Framework
7. Governance Framework

### 4.0 الطبقات التي تتحمل الجزء الأكبر من تخصيص الدومين
- Catalog Generator
- Domain taxonomies
- Academic / Regulatory / Contextual fit logic
- Review intelligence dictionaries
- Ownership economics models
- Merchant / seller / market policy rules

### 5.0 نموذج التوسع المقترح
بدل بناء منطق جديد بالكامل لكل مجال، يعتمد MajorLogic على الصيغة التالية:
`Generic Buying Framework + Domain Knowledge Generator + Domain Ruleset + Domain Fit/Compliance Layer = Specialized Decision System`

### 6.0 أمثلة على الإشارات الخاصة بكل مجال
**لابتوبات:**
performance, battery, portability, display, academic fit, upgradeability
**سيارات:**
reliability, maintenance cost, fuel efficiency / EV range, safety, resale strength, ownership cost, regulatory / insurance context
**عقارات:**
livability, legal clarity, neighborhood risk, financing burden, future liquidity, maintenance exposure
**عتاد طبي:**
clinical fit, regulatory approval status, serviceability, training burden, downtime risk, total lifecycle cost

### 7.0 النتيجة المعمارية
هذا يعني أن كل وثيقة طبقية أدناه ستحتوي على: نواة عامة - نقاط تخصيص Domain Extension Points.

---

## 1) Catalog Generator Layer — المواصفات التنفيذية

### 1.1 الغرض التنفيذي
يحول السوق الخام إلى حقيقة منشورة قابلة للقرار، مع الحفاظ على بناء نظام إنتاج معرفة domain-aware على مستوى الحقول freshness و confidence و traceability.

### 1.2 القرار المعماري الأساسي
هذه الطبقة يجب أن تُبنى كمنظومة مولدات دومينية متعددة فوق بنية مشتركة، لا كمولد واحد hardcoded للابتوبات.

### 1.3 البنية البرمجية المقترحة
```text
/apps
 /catalog-worker
/packages
 /catalog-core
 /catalog-identity
 /catalog-normalization
 /catalog-validation
 /catalog-publish
 /catalog-domain-laptops
 /catalog-domain-cars
 /catalog-domain-real-estate
 /catalog-domain-medical-equipment
 /catalog-domain-cameras
/rulesets/domains
 /laptop-student-us
 /cars-consumer-us
 ...
```

### 1.4 الحدود العامة مقابل الخاصة
**عام في core:**
acquisition interfaces, observation storage, identity framework, normalization framework, field resolution framework, publish gating framework, confidence composition framework
**خاص بالدومين:**
attribute dictionaries, variant identity heuristics, fit baselines, review taxonomies, anomaly rules, publish thresholds

### 1.5 العقود الداخلية القياسية
يجب أن يمر كل observation بالمراحل التالية: 1. acquisition 2. staging 3. identity 4. normalization 5. domain enrichment 6. validation / truth resolution 7. publication.

### 1.6 الواجهة العامة للـ domain plugin
يجب أن يُعرف كل domain package واجهات مثل: `get_domain_schema()`, `get_identity_rules()`, `get_normalizers()`, `get_fit_generators()`, الخ.

### 1.7 النموذج البياني القابل للتوسع
**جداول عامة:**
`source_observations`, `source_assets`, `items`, `item_aliases`, `item_variants`, `observation_variant_links`, `normalized_observations`, `field_resolution`, `validation_events`, `review_queue`, `published_variants`, `published_variant_signals`, `published_variant_fit`
**جداول دومينية اختيارية:**
`laptop_academic_baselines`, `car_ownership_profiles`, `real_estate_location_signals`, الخ.

### 1.8 قرار تصميم مهم
يجب ألا يبقى اسم الجدول مقترنًا بالأكاديميا فقط؛ في التصميم العام، الأفضل أن يصبح `published_variant_fit_contexts`.

### 1.9 عقد النشر العام
يجب أن يُسّلم كل variant منشور: identity stable, normalized attributes, derived classes/signals, fit contexts, risk signals, review summary, market snapshot, freshness, confidence, domain type, policy version.

### 1.11 مخاطر التوسع
- תضخم الـ schema العامة بخصائص لا تخص كل المجالات.
- خلط fit contexts في جدول واحد بلا versioning واضح.
- فرض taxonomies لابتوبات على السيارات أو العقارات.

### 1.12 القرار التنفيذي
يجب أن تعتمد النواة العامة على `domain`, `context_type`, `field_group`, `field_name` بدلاً من استخدام أعمدة hardcoded.

### 1.13 معايير القبول التنفيذية
- إضافة دومين جديد دون كسر دومين قائم.
- عدم تعديل decision core عند إضافة attributes خاصة بدومين جديد.

---

## 2) Published Catalog Layer — المواصفات التنفيذية

### 2.1 الغرض التنفيذي
تمثيل الحقيقة وتثبيت contract decision-facing لاستهلاك محرك القرار لكل دومين.

### 2.2 القرار المعماري
يعتمد النظام على Generic base contract + Domain overlays بدلاً من view واحدة جامدة.

### 2.3 بنية العقود
**Base Contract:**
`variant_id, item_id, domain, canonical_title, price_amount, price_currency, market_state, confidence_score, freshness_score, risk_summary, top_cons, fit_contexts_json, signals_json, published_at, policy_version`
**Domain Overlay Examples:**
- **Laptops:** `battery_score, portability_score, academic_fit`
- **Cars:** `reliability_score, safety_score, fuel_efficiency_score, ownership_cost_band`

### 2.4 التنظيم البرمجي
`/database/views/base, /database/views/domains/laptops, ...`

### 2.6 قواعد التوسع
- لا يقرأ decision engine من published tables الخام إذا كان يمكنه القراءة من fixed views.
- لا يحق للدومين الجديد كسر base contract.

---

## 3) Decision Engine Layer — المواصفات التنفيذية

### 3.1 الغرض التنفيذي
محرك قرار عام لعمليات الشراء المعقدة يستهلك published contracts وتطبيق domain-specific ruleset.

### 3.2 القرار المعماري الحاكم
يُبنى المحرك كـ framework قرار عام + ruleset لكل دومين، بدلاً من formulas هاردكود للابتوبات.

### 3.3 البنية البرمجية المقترحة
```text
/packages/decision-core
/packages/decision-input
/packages/decision-ranking
...
```

### 3.5 user profile العام
يُترجم ملف المستخدم إلى: `domain, context_budget, tolerance_risk, priority_vector, must_have_constraints, soft_preferences, ownership_horizon, contextual_usage`.

### 3.7 abstraction layer للإشارات
يتعامل المحرك مع إشارات مجردة من نوع `suitability, reliability, lifecycle cost, mobility, safety, compliance, flexibility, future resilience`. وتُترك لطبقة المجالات عملية التحويل mapping.

### 3.10 الجداول الأساسية
`ruleset_versions, search_requests, computed_scores, decision_logs, decision_explanations_seed`.

### 3.12 قواعد منع التلوث
- ممنوع raw parsing داخل المحرك.
- ممنوع source trust resolution داخل المحرك.
- ممنوع affiliate economics داخل المحرك.

---

## 4) Card Selection & Result Packaging Layer — المواصفات التنفيذية

### 4.1 الغرض التنفيذي
تحويل ranked candidates إلى مجموعة قرارية صغيرة (الأربع بطاقات).

### 4.3 نموذج الأدوار العام
بدل اعتبار الأدوار أسماء جامدة، يتم تعريفها كـ selection archetypes (مثل: `fit_overall_best, best_value, future_resilient, independent_pick`).

### 4.8 role policy design
يحدد كل دومين قواعده الخاصة لكل archetype.

### 4.9 explanation schema
يجب أن تحتوي كل بطاقة على: `why_this, top_factors, tradeoff, bad_news, confidence_note, fit_context`.

---

## 5) Purchase Link & Affiliate Routing Layer — المواصفات التنفيذية

### 5.1 الغرض التنفيذي
فصل القرار عن التنفيذ التجاري وتوجيه المستخدم لأفضل رابط شراء دون تغيير الترتيب الأصلي.

### 5.2 قرار التعميم الأساسي
ينبغي تسمية الطبقة داخلياً كـ **Commercial Routing Layer** لأن أسطح البيع تختلف بين لابتوبات وسيارات (مثلاً زر "التواصل مع المعرض" في السيارات).

### 5.6 surface abstraction
يُسجل كل surface كـ `surface_type, partner_type, primary_action, commercial_relation, trust_state, freshness_state, disclosure_state`.

---

## 6) Ownership Strategy Layer — المواصفات التنفيذية

### 6.1 الغرض التنفيذي
توفير استراتيجية الدورة الكاملة وتفضيلات الملكية.

### 6.3 لماذا هذا مهم للتوسع؟
اقتراح الملكية يختلف بين سيارات (تمويل، تأجير) ולابتوبات (جديد، مجدد). يمكن إضافة إرشاد تأجير أو تقسيط بناءً على الميزانية.

### 6.8 outputs العامة
طبيعة التوصية، شرح سبب التوصية المحددة (شراء نقدًا أم تمويل)، وحساب تكاليف الدورة.

---

## 7) Trust & Integrity Layer — المواصفات التنفيذية

### 7.1 الغرض التنفيذي
حارس المنصة الذي يتأكد من سلامة الحقيقة وقرارات الإفصاح. يشمل (Data Integrity, Decision Integrity, Commercial Integrity, Disclosure Integrity).

### 7.3 domain-specific trust rules
قواعد الثقة تختلف بناءً على سوق الشراء (مثال: السيارات يشمل فحص موثوقية البائع والتمويل).

---

## 8) Growth & Distribution Layer — المواصفات التنفيذية

### 8.1 الغرض التنفيذي
تحويل artifacts القرار إلى أدوات SEO وصفحات ومشاركة آمنة (landing pages, share cards).

---

## 9) Strategic Integrity & Governance Layer — المواصفات التنفيذية

### 9.1 الغرض التنفيذي
وضع قيود ومعايير اعتماد للمجالات الجديدة قبل التوسع.

### 9.4 maturity gates للدومين الجديد
- Feasibility Knowledge
- Feasibility Decision
- Feasibility Ownership
- Commercial Integrity Feasibility

---

## 10) خارطة التنفيذ العملية المقترحة

لتحقيق هذا، يجب تنفيذ **naming refactor** للطبقات والمصطلحات المرتبطة باللابتوبات فقط لتكون متعددة الدومين. (مثل تغيير `card_purchase_routes` إلى `card_commercial_routes`).

## 11) الخلاصة التنفيذية
يُبنى **MajorLogic** كنظام قابل للتوسع إلى مجالات شراء معقدة متعددة من دون تجاوز المبادئ الأصلية.
الحقيقة المنشورة قبل القرار.
القرار قبل التجاري.
الامتلاك بعد القرار.
الثقة فوق جميع الطبقات.
