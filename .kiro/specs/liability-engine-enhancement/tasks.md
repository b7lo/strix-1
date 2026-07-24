# Implementation Plan: Liability Engine Enhancement (Axis 2 + Axis 3)

## حالة التنفيذ (نسخة مُعاد ضبطها — 2026-07-23)

> أُعيد ضبط الخطة بعد تدقيق `ENGINE_AUDIT_AND_FIX_PLAN.md` (A-6) الذي نفّذ جزءاً كبيراً
> من المتطلبات مسبقاً. ما يلي حالة فعلية مُتحقَّقة بـ typecheck + jest (148 اختباراً ناجحاً).

**مُنجَز مسبقاً (تدقيق A-6 / الأساسات):**
- ✅ ثوابت النموذج والسيناريوهات في `thresholds.ts` (المهمة 1.1).
- ✅ الحتمية: `pickPhrase(phrases, seed)` + `makeSeed` بدل `Math.random` (المهمة 1.2).
- ✅ مفاتيح i18n (العناوين + قوائم `dynamic.*` + `sysNotes`) موجودة بتكافؤ ar/en (المهمة 1.4).
- ✅ `rawFaultPercent` + `isConclusive` + `faultRange` + الصدق في الثقة + سقوف الأمان (Req 2/3/4/15).

**نُفِّذ في هذه الجولة:**
- ✅ `DynamicText`: 9 مساعدات حتمية للسيناريوهات الجديدة.
- ✅ `classifyNewScenario` (تُقيَّم قبل المحلّلات القديمة، تسقط لها عند عدم التطابق):
  `DOOR_OPENING_{L|R}`, `INTERSECTION_ROW_PRIORITY|NO_PRIORITY`, `U_TURN`,
  `LANE_MERGE_{L|R}`, `PARKING_MANEUVER`، و`CHAIN_COLLISION` كـ override لتعدّد الصدمات.
- ✅ وسيطان اختياريان `otherParty` و`crossVerified` (توافق خلفي — في نهاية التوقيع).
- ✅ دمج `otherParty.wasAccelerating` (Req 6.3) + مزج `crossVerified` VERIFIED/INCONSISTENT (Req 6.1/6.2).
- ✅ توصيل `otherParty` من `SessionContext`.
- ✅ اختبارات: خصائص P1/P2/P3/P4/P5/P6/P7/P9/P11/P12 (fast-check ≥200 تكرار) + أمثلة أكواد
  السيناريوهات + تفرّد الأكواد + تحويلية (otherParty/crossVerified) + تكافؤ i18n
  (`liability.props.test.ts`, `liability.scenarios.test.ts`). كما صُحّح مفتاح ناقص
  `auth.errors.appleSignInFailed` في `en.json`.

**مُقلَّم عمداً (تفادي الدقة الزائفة والعدّ المزدوج):**
- ◐ Axis 2: بدل إعادة كتابة كاملة (`computeRawFault`)، طُبِّقت **تعديلات محدودة** فوق المنطق
  الحالي. سياق المرور مدموج أصلاً في `advancedAnalysis.totalAdjustment` فلم يُكرَّر.
- ⏸ خصائص P8 (رتابة الثقة مع G) و P10 (رتابة المناورة) لم تُكتب بعد — يمكن إضافتها لاحقاً.

**مؤجَّل (قرار منتج — الأعلى أثراً):**
- ⏸ A-3: معايرة اتجاه السيارة الفعلية (Magnetometer + GPS course). بدونها تبقى السيناريوهات
  الجانبية (تقاطع/اندماج/U-turn) تقديرية والثقة تُخفَّض بصدق. البنية جاهزة (`setPhoneYawOffset`).
- ⏸ مزج `crossVerified` في المسار الخلفي بـ `SessionContext` (حالياً يستبدل النسبة كلياً).

---

## Overview

خطة تنفيذ تطوير `calculateLiability` في `artifacts/strix/lib/liabilityEngine.ts` عبر خطوات
تزايدية قابلة للاختبار (TypeScript). يبدأ العمل بالأساسات (ثوابت `THRESHOLDS`، جعل
`DynamicText` حتمياً كشرط مسبق لخصائص الحتمية/النقاء، ومفاتيح i18n) ثم إعادة تنظيم المحرك
إلى ثلاث طبقات نقية (Scenario_Classifier → Weighted_Evidence_Model → Snap & Range) مع
إضافة الوسيطين الاختياريين `otherParty`/`crossVerified` دون كسر التوقيع. بعدها تُبنى
اختبارات الخصائص (P1–P12) والاختبارات التحويلية (metamorphic) واختبارات الأمثلة/التكامل،
ثم مهمّة انحدار (regression) ونقطة تحقق نهائية.

كل الأوامر تُشغَّل من `Strix-Assets-main/artifacts/strix`. اختبارات الخصائص تُشغَّل عبر
`npx jest --runInBand`. المكتبة `fast-check ^4.8.0` مثبّتة.

> ملاحظة تشغيل: لا تُشغّل أوامر المراقبة (watch). استخدم `npm test` أو
> `npx jest --runInBand` لتنفيذ واحد.

## Tasks

- [ ] 1. الأساسات وشرط الحتمية المسبق (Foundations & Determinism Prerequisite)
  - [ ] 1.1 إضافة ثوابت نموذج الترجيح والسيناريوهات الجديدة إلى `THRESHOLDS`
    - تعديل `lib/thresholds.ts` بإضافة أوزان/عتبات: `EVIDENCE_BASE_NEUTRAL`,
      `W_SPEED_FRONT`, `W_SPEED_SIDE`, `W_LANE_CHANGE_SELF`, `W_UTURN_SELF`,
      `W_BRAKING_SELF`, `TC_ROUNDABOUT_PRIORITY_DELTA`, `TC_INTERSECTION_NOPRIORITY_DELTA`,
      `TC_INTERSECTION_PRIORITY_DELTA`, `TC_STATIONARY_DELTA`, `OTHER_PARTY_ACCEL_DELTA`,
      `CROSS_VERIFIED_BLEND_WEIGHT`, `REAR_STATIONARY_FAULT_CAP`, `STATIONARY_FAULT_CAP`,
      `U_TURN_YAW_RATE`, `U_TURN_MIN_DURATION_MS`, `SPEED_MANEUVER`, `DOOR_OPENING_MAX_G`,
      `CHAIN_MIN_IMPACTS`
    - الحفاظ على الكائن قابلاً للتعديل (ليس `as const`) كما هو الآن، والأنواع أرقام فقط
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.3, 8.1, 9.1, 10.1, 12.1, 15.1_

  - [ ] 1.2 جعل `DynamicText` حتمياً باستبدال `Math.random()` بـ `pickPhrase(phrases, seed)`
    - تعديل `lib/dynamicTextGenerator.ts`: إضافة `pickPhrase(phrases, seed)` التي تختار
      عبر `seed % phrases.length`، وإزالة `getRandomPhrase`/`Math.random()`
    - تمرير `seed` حتمي مشتق من مدخلات المحرك (مثل تجزئة `direction|zone|round(g)|round(speed)`)
      إلى دوال `DynamicText.*` (توقيعها يقبل `seed`)
    - **شرط مسبق إلزامي لخصائص الحتمية/النقاء (P3/P4) قبل كتابتها**
    - _Requirements: 13.2, 14.1, 14.2_

  - [ ] 1.3 اختبار وحدة لحتمية `pickPhrase`
    - `lib/__tests__/dynamicText.test.ts`: نفس `(phrases, seed)` يعيد نفس العبارة دائماً،
      و`seed` مختلف قد يعطي عبارة مختلفة ضمن نفس القائمة، وبلا استدعاء عشوائي
    - _Requirements: 13.2, 14.2_

  - [ ] 1.4 إضافة مفاتيح i18n الجديدة إلى `ar.json` و`en.json` مع تكافؤ (parity)
    - إضافة مفاتيح العناوين `liability.intersectionRowTitle`, `liability.laneMergeTitle`,
      `liability.uTurnTitle`, `liability.parkingManeuverTitle`, `liability.chainCollisionTitle`,
      `liability.doorOpeningTitle`, ومفتاح `liability.chainCollisionFactor` (مع `{{count}}`)
    - إضافة قوائم `dynamic.*` (returnObjects): `intersectionPriorityFactor`,
      `intersectionNoPriorityFactor`, `laneMergeSelfFactor`, `laneMergeOtherFactor`,
      `uTurnSelfFactor`, `parkingManeuverFactor`, `chainRearStationaryFactor`,
      `doorOpeningFactor`, `otherPartyAcceleratingFactor`، وملاحظة `sysNotes.crossVerifiedInconsistent`
    - نفس مجموعة المفاتيح موجودة في `ar.json` و`en.json` تماماً
    - _Requirements: 6.2, 7.2, 8.2, 9.2, 10.2, 11.2, 12.2, 13.1, 13.2_

  - [ ] 1.5 اختبار تكافؤ مفاتيح i18n (parity)
    - `lib/__tests__/liabilityI18nParity.test.ts`: كل مفاتيح `liability.*`/`dynamic.*`/`sysNotes.*`
      الجديدة موجودة في الملفين بلا نقص، وقوائم `dynamic.*` غير فارغة في اللغتين
    - _Requirements: 13.2_

- [ ] 2. إعادة تنظيم المحرك إلى طبقات نقية وإضافة الوسيطين الاختياريين
  - [ ] 2.1 إضافة الواجهات الداخلية والتطبيع النقي وضمان رتابة الثقة
    - في `lib/liabilityEngine.ts`: تعريف `ScenarioResult`, `ScenarioFlags`, `Contribution`,
      `NormalizedSignals`، وإضافة `sanitize(n) = Number.isFinite(n) ? n : 0` وتطبيع
      `g/speed/jerk` بالقصّ إلى صفر
    - ضمان أن `buildConfidenceDetails` رتيب في `g` (زيادة `peakGForce` لا تُخفّض `score`)
      وبقاء سقوف الصدق (unknown ≤ medium، uncalibrated ≤ medium) مع إضافة
      `sysNotes.directionUncalibrated` إلى العوامل
    - _Requirements: 3.5, 4.2, 4.5, 14.4, 15.2_

  - [ ] 2.2 تنفيذ `classifyScenario` يلفّ المحلّلات الحالية والـ overrides
    - في `lib/liabilityEngine.ts`: دالة `classifyScenario` نقية تستدعي
      `analyzeRear/analyzeFront/analyzeCornerFront/analyzeCornerRear/analyzeSide/unknown`
      وتُرجع `ScenarioResult` (code, titleKey, base anchor, factors, flags) وتطبّق
      overrides الحالية (rollover / roundabout-priority / scrape) دون تغيير سلوكها
    - تمرير النصوص عبر `DynamicText`/`i18n` بـ `seed` حتمي (من 1.2)
    - _Requirements: 13.2, 13.4_

  - [ ] 2.3 إضافة قواعد السيناريوهات الست الجديدة إلى `classifyScenario`
    - تقييم بترتيب أولوية (الأكثر تحديداً أولاً) ثم السقوط للحالات الحالية:
      `INTERSECTION_ROW_PRIORITY`/`INTERSECTION_ROW_NO_PRIORITY` (base 25/75)،
      `LANE_MERGE_{L|R}` (base 60)، `U_TURN` (base 65)، `PARKING_MANEUVER` (base 50)،
      `CHAIN_COLLISION` (مع عدد الصدمات في `factorsAr`)، `DOOR_OPENING_{L|R}` (base 20)
    - كل كود فريد ولا يتقاطع مع الأكواد الحالية؛ عنوان وعوامل و`plainSummaryAr` غير فارغة
    - اشتقاق الإشارات من الوسائط فقط (`roadContext`, gyro yaw, speed, impactCount, peakG)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 9.1, 9.2, 10.1, 10.2, 11.1, 11.2, 12.1, 12.2, 12.3, 13.1, 13.3, 13.4_

  - [ ] 2.4 تنفيذ `computeRawFault` (نموذج الترجيح + دمج الطرف الآخر/التحقق المتبادل + caps)
    - في `lib/liabilityEngine.ts`: تجميع المساهمات المرجّحة فوق `base` (سرعة، سياق مرور،
      فرملة، تأكيد تغيير المسار/الانعطاف، `advancedAnalysis.totalAdjustment`)، كل مساهمة
      داخل حارس `if (signal != null)` (الغائب = صفر)
    - دمج `crossVerified`: `VERIFIED` → مزج `(1-λ)*sensorRaw + λ*liability_a_percent`؛
      `INCONSISTENT` → استبعاد + إضافة `sysNotes.crossVerifiedInconsistent`؛ غير ذلك →
      إشارات الحساسات وحدها. تعديل `otherParty.wasAccelerating` نحو الطرف الآخر
    - تطبيق الـ caps: `isRear && stationary → ≤ REAR_STATIONARY_FAULT_CAP`،
      `stationary → ≤ STATIONARY_FAULT_CAP`، ثم `clamp(round(...), 0, 100)`
    - معاملة `otherParty`/`crossVerified` للقراءة فقط (بلا تطفير)
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 8.3, 9.3, 10.3, 11.3, 15.1, 15.4_

  - [ ] 2.5 تنفيذ snap+range وربط `calculateLiability` بالوسيطين الجديدين
    - إضافة `otherParty: OtherPartyAnalysis | null = null` و
      `crossVerified: CrossVerifiedAnalysis | null = null` في نهاية التوقيع فقط (توافق خلفي)
    - snap حتمي لـ `{0,25,50,75,100}` (كسر التعادل نحو الأدنى)، `otherFaultPercent = 100 - userFaultPercent`،
      حساب `isConclusive` و`faultRange` وربط كل حقول `LiabilityResult` دون تغيير بنيتها
    - إخراج أرقام finite دائماً (لا NaN/Infinity)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.3, 4.4, 14.1, 14.3, 14.4, 16.1, 16.2_

- [ ] 3. نقطة تحقق — التأكد من نجاح البناء والاختبارات القائمة
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. اختبارات الخصائص (Property-Based Tests, fast-check ≥100 runs)
  - [ ] 4.1 إنشاء مولّدات fast-check المشتركة (arbitraries)
    - `lib/__tests__/liabilityArbitraries.ts` (مستثنى من اكتشاف Jest): يولّد `direction`,
      `zone`, `peakGForce (0..16)`, `speedKmh (0..250)`, `jerkPeak (0..40)`, `braking|null`,
      `gyro|null`, `impactCount (1..5)`, `baselineG (0..1)`, `advancedAnalysis|null`,
      `directionCalibrated`, `otherParty|null`, `crossVerified|null` مع فروع null
    - _Requirements: 14.1, 14.4_

  - [ ] 4.2 اختبار الخاصية P1 — ثابت السلّم القانوني
    - `lib/__tests__/liability.invariants.props.test.ts`
    - **Property 1: Legal-Scale Invariant** — `userFaultPercent ∈ {0,25,50,75,100}` و
      `userFaultPercent + otherFaultPercent === 100`
    - الوسم: `// Feature: liability-engine-enhancement, Property 1`
    - _Properties: P1_ · _Requirements: 2.1, 2.2, 15.3_

  - [ ] 4.3 اختبار الخاصية P2 — الحدود والتناهي
    - `lib/__tests__/liability.invariants.props.test.ts`
    - **Property 2: Bounds & Finiteness** — `rawFaultPercent` صحيح في `[0,100]`،
      `confidenceDetails.score` صحيح في `[0,100]`، وكل المخرجات الرقمية finite
    - الوسم: `// Feature: liability-engine-enhancement, Property 2`
    - _Properties: P2_ · _Requirements: 1.1, 1.3, 3.5, 14.4_

  - [ ] 4.4 اختبار الخاصية P7 — اتساق النطاق
    - `lib/__tests__/liability.invariants.props.test.ts`
    - **Property 7: Range Consistency** — `faultRange[0] ≤ faultRange[1]`، وعند القطعية
      `faultRange === [userFaultPercent, userFaultPercent]`، وإلا `lo ≤ user ≤ hi` من السلّم
    - الوسم: `// Feature: liability-engine-enhancement, Property 7`
    - _Properties: P7_ · _Requirements: 3.2, 3.3, 3.4_

  - [ ] 4.5 اختبار الخاصية P11 — تكامل بنية السيناريو
    - `lib/__tests__/liability.invariants.props.test.ts`
    - **Property 11: Scenario Structural Completeness** — `scenarioCode`/`scenarioAr`/
      `plainSummaryAr` غير فارغة و`factorsAr` قائمة غير فارغة وكل الحقول مأهولة
    - الوسم: `// Feature: liability-engine-enhancement, Property 11`
    - _Properties: P11_ · _Requirements: 13.1, 1.5, 2.3, 3.1_

  - [ ] 4.6 اختبار الخاصية P3 — الحتمية
    - `lib/__tests__/liability.determinism.props.test.ts`
    - **Property 3: Determinism** — استدعاءان بنفس المدخلات يعطيان قيماً متطابقة لـ
      `userFaultPercent, otherFaultPercent, rawFaultPercent, confidence, severity,
      scenarioCode, isConclusive, faultRange` (بما فيها كسر التعادل)
    - الوسم: `// Feature: liability-engine-enhancement, Property 3`
    - _Properties: P3_ · _Requirements: 1.4, 2.4, 5.4, 14.1, 14.2_

  - [ ] 4.7 اختبار الخاصية P4 — نقاء الدالة وعدم التطفير
    - `lib/__tests__/liability.determinism.props.test.ts`
    - **Property 4: Purity / No Mutation** — نسخة عميقة من كل مدخل قبل الاستدعاء تساوي
      نفسه بعده (بما فيها `otherParty` و`crossVerified`)
    - الوسم: `// Feature: liability-engine-enhancement, Property 4`
    - _Properties: P4_ · _Requirements: 14.3, 6.5_

  - [ ] 4.8 اختبار الخاصية P5 — صدق الثقة عند الاتجاه المجهول
    - `lib/__tests__/liability.determinism.props.test.ts`
    - **Property 5: Honesty — Unknown Direction** — عند `direction === "unknown"`،
      `isConclusive === false`؛ والقطعية true فقط مع high + اتجاه معروف + معاير
    - الوسم: `// Feature: liability-engine-enhancement, Property 5`
    - _Properties: P5_ · _Requirements: 4.1, 4.3_

  - [ ] 4.9 اختبار الخاصية P6 — صدق الثقة عند عدم المعايرة
    - `lib/__tests__/liability.determinism.props.test.ts`
    - **Property 6: Honesty — Uncalibrated** — عند `directionCalibrated === false`،
      مستوى الثقة ليس `high`
    - الوسم: `// Feature: liability-engine-enhancement, Property 6`
    - _Properties: P6_ · _Requirements: 4.2_

  - [ ] 4.10 اختبار الخاصية P12 — تجاهل الإشارات الغائبة
    - `lib/__tests__/liability.determinism.props.test.ts`
    - **Property 12: Absent-Signal Handling** — إجبار null على
      `braking/gyro/advancedAnalysis/otherParty/crossVerified` يُنتج نتيجة صالحة بلا
      NaN/Infinity وتبقى ثوابت P1/P2/P7 محفوظة
    - الوسم: `// Feature: liability-engine-enhancement, Property 12`
    - _Properties: P12_ · _Requirements: 1.2, 5.5, 6.4_

  - [ ] 4.11 اختبار الخاصية P8 — رتابة الثقة مع القوة
    - `lib/__tests__/liability.monotonicity.props.test.ts`
    - **Property 8: Confidence Monotonicity in G** — مع تثبيت باقي المدخلات، زيادة
      `peakGForce` لا تُخفّض `confidenceDetails.score`
    - الوسم: `// Feature: liability-engine-enhancement, Property 8`
    - _Properties: P8_ · _Requirements: 15.2_

  - [ ] 4.12 اختبار الخاصية P9 — أمان الاصطدام الخلفي على مركبة واقفة
    - `lib/__tests__/liability.monotonicity.props.test.ts`
    - **Property 9: Rear-Stationary Safety** — اصطدام خلفي مؤكّد وسرعة < عتبة الوقوف →
      `userFaultPercent ≤ 25`؛ وأي حالة واقفة → `userFaultPercent ≤ 50`
    - الوسم: `// Feature: liability-engine-enhancement, Property 9`
    - _Properties: P9_ · _Requirements: 15.1, 10.3, 11.3_

  - [ ] 4.13 اختبار الخاصية P10 — رتابة تأكيد المناورة الذاتية
    - `lib/__tests__/liability.monotonicity.props.test.ts`
    - **Property 10: Self-Maneuver Monotonicity** — في اصطدام جانبي، تأكيد تغيير المسار/
      الانعطاف من المستخدم يُنتج `rawFaultPercent` ≥ الحالة الغامضة بنفس المدخلات الأخرى
    - الوسم: `// Feature: liability-engine-enhancement, Property 10`
    - _Properties: P10_ · _Requirements: 15.4, 8.3, 9.3_

- [ ] 5. الاختبارات التحويلية (Metamorphic — مدخلان يختلفان في إشارة واحدة)
  - [ ] 5.1 اختبار تحويلي لسياق المرور
    - `lib/__tests__/liability.metamorphic.test.ts`
    - `raw(roundabout, hasPriority=true) ≤ raw(false)`؛
      `raw(intersection, hasPriority=false) ≥ raw(true)`؛ `raw(wasStationary=true) ≤ raw(false)`
    - _Properties: P10 (نمط تفاضلي)_ · _Requirements: 5.1, 5.2, 5.3_

  - [ ] 5.2 اختبار تحويلي لسلوك الطرف الآخر
    - `lib/__tests__/liability.metamorphic.test.ts`
    - `raw(otherParty.wasAccelerating=true) ≤ raw(false)` بنفس باقي المدخلات
    - _Requirements: 6.3_

  - [ ] 5.3 اختبار تحويلي للتحقق المتبادل
    - `lib/__tests__/liability.metamorphic.test.ts`
    - مع `VERIFIED` يقع `raw` بين `sensorRaw` و`liability_a_percent` (ينجذب نحوه)؛ ومع
      `INCONSISTENT` فإن `raw(INCONSISTENT) === raw(null)` مع ملاحظة عدم الاتساق في `factorsAr`
    - _Requirements: 6.1, 6.2_

- [ ] 6. اختبارات الأمثلة والتكامل (Example / Integration)
  - [ ] 6.1 اختبار أكواد السيناريوهات الجديدة
    - `lib/__tests__/liability.scenarios.test.ts`: مدخلات تُنتج
      `INTERSECTION_ROW_*`, `LANE_MERGE_{L|R}`, `U_TURN`, `PARKING_MANEUVER`,
      `CHAIN_COLLISION` (مع العدد في `factorsAr`)، `DOOR_OPENING_{L|R}` (مميّز عن `SIDE_LOW_SPEED_*`)
    - _Requirements: 7.1, 7.3, 7.4, 8.1, 9.1, 10.1, 11.1, 11.2, 12.1, 12.3_

  - [ ] 6.2 اختبار تفرّد أكواد السيناريوهات (injective)
    - `lib/__tests__/liability.scenarios.test.ts`: تعداد مدخلات تمثيلية → لا كودان
      متمايزان يتشاركان نفس `scenarioCode`
    - _Requirements: 13.3_

  - [ ] 6.3 اختبار ربط i18n
    - `lib/__tests__/liability.integration.test.ts`: `scenarioAr === i18n.t(expectedKey)`
      للسيناريوهات الجديدة، ووجود `sysNotes.directionUncalibrated` في العوامل عند عدم المعايرة
    - _Requirements: 13.2, 4.5_

  - [ ] 6.4 اختبار بقاء التنويه الاستشاري
    - `lib/__tests__/liability.integration.test.ts`: النتيجة غير القاطعة تتضمّن
      `summaryApprox` في `plainSummaryAr`، وبقاء دلالة التنويه القانوني
    - _Requirements: 16.1, 16.2, 4.4_

  - [ ] 6.5 اختبار التوافق الخلفي للتوقيع
    - `lib/__tests__/liability.integration.test.ts`: استدعاء بالصيغة القديمة (11 وسيطاً)
      يترجم ويعمل وكل الحقول مأهولة دون تمرير `otherParty`/`crossVerified`
    - _Requirements: 2.5_

  - [ ] 6.6 اختبار توافق حقول التقرير/PDF
    - `lib/__tests__/liability.scenarios.test.ts`: النتيجة تحتوي كل الحقول التي يقرأها
      `SessionContext`/`pdfExport`/`report/[id]` (`rawFaultPercent`, `isConclusive`,
      `faultRange`, `confidenceDetails`, ...)
    - _Requirements: 2.3, 13.1_

- [ ] 7. انحدار وتوافق خلفي (Regression & Backward Compatibility)
  - [ ] 7.1 تشغيل السويتات القائمة والتأكد من ثبات أكواد legacy
    - تشغيل `npx jest --runInBand liabilityEngine.test.ts liabilityConfidence.test.ts`
      والتأكد من نجاحها، وأن أكواد legacy (`REAR_IMPACT`, `FRONT_IMPACT`, `CORNER_*`,
      `SIDE_*`, `UNKNOWN`, `ROLLOVER`, `ROUNDABOUT_PRIORITY_*`, `SCRAPE_*`) لم تتغيّر
    - تعديل الاختبارات فقط عند وجود تغيّر سلوكي مقصود وموثّق (وإلا يُصلَح المحرك)
    - _Requirements: 13.4, 2.5_

- [ ] 8. نقطة التحقق النهائية — كامل الاختبارات و typecheck باللون الأخضر
  - Ensure all tests pass, ask the user if questions arise. تشغيل `npm test` و
    `npm run typecheck` من `artifacts/strix` والتأكد من نجاحهما.

## Notes

- المهام المعلّمة بـ `*` اختيارية (اختبارات) ويمكن تخطّيها لتسريع MVP، لكنها موصى بها.
- شرط الحتمية (المهمة 1.2) إلزامي قبل تفعيل خاصيتي الحتمية/النقاء (4.6/4.7).
- كل اختبار خاصية يُشغَّل بـ `{ numRuns: 100 }` على الأقل ويحمل وسم
  `// Feature: liability-engine-enhancement, Property N`.
- بنية `LiabilityResult` تبقى دون تغيير؛ الإضافات وسيطان اختياريان في نهاية التوقيع فقط.
- كل مهمة تشير لمتطلبات محددة و—عند الانطباق—للخصائص المقابلة في وثيقة التصميم.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.4"] },
    { "id": 1, "tasks": ["1.3", "1.5", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["2.5"] },
    { "id": 6, "tasks": ["4.1"] },
    { "id": 7, "tasks": ["4.2", "4.6", "4.11", "5.1", "6.1", "6.3"] },
    { "id": 8, "tasks": ["4.3", "4.7", "4.12", "5.2", "6.2", "6.4"] },
    { "id": 9, "tasks": ["4.4", "4.8", "4.13", "5.3", "6.5"] },
    { "id": 10, "tasks": ["4.5", "4.9", "6.6"] },
    { "id": 11, "tasks": ["4.10"] },
    { "id": 12, "tasks": ["7.1"] }
  ]
}
```
