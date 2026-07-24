# Requirements Document

## Introduction

هذه الوثيقة تحدد متطلبات تطوير **محرك تقدير المسؤولية** (`liabilityEngine.ts`) في تطبيق Strix — تطبيق React Native (Expo) يكتشف حوادث السيارات عبر حساسات الجوال ويقدّر نسبة المسؤولية (fault liability). التطوير يغطّي محورين متفق عليهما من خطة العمل:

- **المحور الثاني (Axis 2 — نموذج أدلّة أكثر ديناميكية وواقعية):** استبدال نِسب الخطأ الأولية الثابتة (seed) المُصنّفة يدوياً (0/50/75...) بنموذج **ترجيح أدلّة (weighted / probabilistic evidence model)** يدمج عدة إشارات (اتجاه/منطقة الصدمة، السرعة، سياق الطريق، سلوك الطرف الآخر، الجيروسكوب، الفرملة، أحداث ما قبل/بعد الصدمة) في **درجة خطأ خام متدرّجة (graduated raw fault score)**، مع تعميق استخدام **سياق المرور (Traffic Context)** ودمج **التحقق المتبادل (crossVerification)** مباشرة في الترجيح، مع الحفاظ على التوافق الخلفي.

- **المحور الثالث (Axis 3 — تغطية سيناريوهات جديدة):** إضافة سيناريوهات غير مغطّاة حالياً: التقاطع بأولوية المرور (intersection right-of-way)، الاندماج/الدخول في مسار (lane merge)، الانعطاف الكامل U-turn، الوقوف والمناورة (parking/maneuvering)، الاصطدام المتسلسل متعدد المركبات (chain collision)، وفتح الباب (door-opening). كل سيناريو جديد يُنتج `scenarioCode` وعنواناً عربياً وخلاصة مبسّطة وعوامل تفسيرية، متسقة مع البنية الحالية.

يبقى المحرك **دالة نقية قابلة للاختبار (pure function)** بلا حالة عامة، ويظل تقديره **استشارياً وليس حكماً قانونياً** (يجب بقاء التنويه/الإخلاء).

## Glossary

- **Liability_Engine**: المحرك الرئيسي `calculateLiability` الذي يقبل مدخلات الحساسات ويُرجع `LiabilityResult`.
- **Evidence_Weighting_Model**: نموذج ترجيح الأدلّة الجديد الذي يدمج الإشارات المتعددة في `rawFaultPercent` متدرّج (0–100).
- **Scenario_Classifier**: المكوّن الذي يحدد `scenarioCode` والعنوان العربي والخلاصة والعوامل بناءً على المدخلات.
- **Traffic_Context_Analyzer**: منطق قراءة سياق الطريق (roundabout / intersection / highway / urban) والأولوية (`hasPriority`) من `AdvancedAnalysisResult.roadContext`.
- **Cross_Verification_Input**: كائن `CrossVerifiedAnalysis` الاختياري القادم من `crossVerification.ts` عند توفّر تقرير الطرف الآخر.
- **Other_Party_Input**: كائن `OtherPartyAnalysis` الاختياري القادم من `otherPartyAnalysis.ts`.
- **Raw_Fault_Score**: `rawFaultPercent` — نسبة خطأ خام متدرّجة (عدد صحيح 0–100) قبل التقريب للسلّم القانوني.
- **Legal_Snap_Scale**: مجموعة القيم المسموحة قانونياً (نجم): `{0, 25, 50, 75, 100}`.
- **Snapped_Fault**: `userFaultPercent` — أقرب قيمة في `Legal_Snap_Scale` إلى `Raw_Fault_Score`.
- **Confidence_Range**: `faultRange` — نطاق `[lo, hi]` من `Legal_Snap_Scale` يُعرض عند عدم القطعية.
- **Conclusive_Result**: نتيجة `isConclusive = true`، تعني ثقة عالية + اتجاه معروف + اتجاه معاير.
- **Direction_Calibrated**: العلم `directionCalibrated` الذي يشير إلى معايرة اتجاه الجوال نسبةً للسيارة.
- **Confidence_Details**: `ConfidenceDetails` = `{ level, score, factors }`.
- **Najm**: الجهة المرورية الرسمية التي تعتمد سلّم النِسب `{0,25,50,75,100}`.
- **Advisory_Disclaimer**: التنويه بأن النتيجة تقدير استشاري وليست حكماً قانونياً.

## Requirements

### Requirement 1: نموذج ترجيح الأدلّة (Weighted Evidence Model)

**User Story:** بصفتي مستخدماً تعرّض لحادث، أريد أن تُبنى نسبة الخطأ من دمج مرجّح لعدة أدلّة (اتجاه/منطقة، سرعة، سياق طريق، سلوك الطرف الآخر، جيروسكوب، فرملة، أحداث ما قبل/بعد الصدمة) بدلاً من نِسب ثابتة مُصنّفة يدوياً، حتى تكون التقديرات أقرب للواقع.

#### Acceptance Criteria

1. THE Evidence_Weighting_Model SHALL compute a Raw_Fault_Score as an integer in the inclusive range 0 to 100 by combining the weighted contributions of impact zone, impact direction, speed, traffic context, other-party behavior, gyroscope, braking, and pre/post-crash events.
2. WHERE an evidence signal is absent (null input), THE Evidence_Weighting_Model SHALL assign that signal a contribution of zero and compute the Raw_Fault_Score from the remaining available signals.
3. THE Evidence_Weighting_Model SHALL clamp the Raw_Fault_Score to the inclusive range 0 to 100 before any further processing.
4. WHEN identical inputs are supplied to the Liability_Engine, THE Liability_Engine SHALL produce an identical Raw_Fault_Score across repeated invocations.
5. THE Liability_Engine SHALL expose the Raw_Fault_Score in the `rawFaultPercent` field of the returned `LiabilityResult`.

### Requirement 2: التقريب للسلّم القانوني مع الحفاظ على التوافق الخلفي

**User Story:** بصفتي مسؤول امتثال، أريد أن تبقى النسبة النهائية ضمن سلّم نجم المعتمد `{0,25,50,75,100}` مع بقاء حقول التقرير الحالية مأهولة، حتى يظل النظام متوافقاً مع الأنظمة المرورية والشاشات القائمة.

#### Acceptance Criteria

1. THE Liability_Engine SHALL set `userFaultPercent` to the value in Legal_Snap_Scale nearest to the Raw_Fault_Score.
2. THE Liability_Engine SHALL set `otherFaultPercent` equal to 100 minus `userFaultPercent`.
3. THE Liability_Engine SHALL populate every field of the existing `LiabilityResult` structure: `userFaultPercent`, `otherFaultPercent`, `confidence`, `severity`, `scenarioAr`, `scenarioCode`, `descriptionAr`, `plainSummaryAr`, `factorsAr`, `confidenceDetails`, `rawFaultPercent`, `isConclusive`, and `faultRange`.
4. WHEN two adjacent values of Legal_Snap_Scale are equidistant from the Raw_Fault_Score, THE Liability_Engine SHALL select the same deterministic value on every invocation with identical inputs.
5. THE Liability_Engine SHALL maintain the existing public function signature such that all current callers continue to compile without modification.

### Requirement 3: عرض النتيجة الخام والنطاق ومستوى الثقة (الشفافية)

**User Story:** بصفتي مستخدماً، أريد أن أرى النسبة المقرّبة إلى جانب الدرجة الخام ونطاق الثقة، حتى أفهم مدى يقين النظام بدل رقم واحد قد يوحي بدقة زائفة.

#### Acceptance Criteria

1. THE Liability_Engine SHALL return the Raw_Fault_Score, the Snapped_Fault, and the Confidence_Range together in a single `LiabilityResult`.
2. WHEN a result is Conclusive_Result, THE Liability_Engine SHALL set `faultRange` to `[userFaultPercent, userFaultPercent]`.
3. IF a result is not a Conclusive_Result, THEN THE Liability_Engine SHALL set `faultRange` to a range `[lo, hi]` drawn from Legal_Snap_Scale where `lo` is less than or equal to `userFaultPercent` and `hi` is greater than or equal to `userFaultPercent`.
4. THE Liability_Engine SHALL set `faultRange[0]` less than or equal to `faultRange[1]` for every result.
5. THE Confidence_Details `score` SHALL be an integer in the inclusive range 0 to 100.

### Requirement 4: الصدق في الثقة (Honesty) عند غياب الاتجاه أو المعايرة

**User Story:** بصفتي جهة مراجعة، أريد ألّا يدّعي النظام ثقة عالية أو نتيجة قاطعة عندما يكون اتجاه الصدمة مجهولاً أو غير معاير، حتى تبقى مصداقية التقرير محفوظة.

#### Acceptance Criteria

1. IF the impact direction is `unknown`, THEN THE Liability_Engine SHALL set `isConclusive` to false.
2. IF `directionCalibrated` is false, THEN THE Liability_Engine SHALL set the `confidence` level to a value no higher than `medium`.
3. THE Liability_Engine SHALL set `isConclusive` to true only when the confidence level is `high`, the impact direction is not `unknown`, and `directionCalibrated` is true.
4. IF a result is not a Conclusive_Result, THEN THE Liability_Engine SHALL append the approximation notice to `plainSummaryAr`.
5. WHERE `directionCalibrated` is false, THE Liability_Engine SHALL append an uncalibrated-direction note to `confidenceDetails.factors`.

### Requirement 5: تعميق سياق المرور في قرار المسؤولية (Traffic Context)

**User Story:** بصفتي مستخدماً، أريد أن يؤثّر سياق الطريق (دوار، تقاطع، أولوية المرور) في تقدير المسؤولية، حتى تعكس النتيجة قواعد المرور الفعلية.

#### Acceptance Criteria

1. WHERE the Traffic_Context_Analyzer reports `roadType` equal to `roundabout` and the user holds priority (`hasPriority` true), THE Evidence_Weighting_Model SHALL reduce the Raw_Fault_Score relative to the same scenario without priority.
2. WHERE the Traffic_Context_Analyzer reports `roadType` equal to `intersection` and the user does not hold priority (`hasPriority` false), THE Evidence_Weighting_Model SHALL increase the Raw_Fault_Score relative to the same scenario with priority.
3. WHERE the Traffic_Context_Analyzer reports `wasStationary` true, THE Evidence_Weighting_Model SHALL reduce the Raw_Fault_Score relative to the same scenario with the user in motion.
4. THE Traffic_Context_Analyzer SHALL derive road context only from the provided `AdvancedAnalysisResult` input and SHALL NOT read any global or external state.
5. WHERE no `AdvancedAnalysisResult` is provided, THE Evidence_Weighting_Model SHALL compute the Raw_Fault_Score using the remaining signals without a traffic-context adjustment.

### Requirement 6: دمج التحقق المتبادل وتحليل الطرف الآخر في الترجيح

**User Story:** بصفتي مستخدماً، أريد أن يُدمج تحليل الطرف الآخر والتحقق المتبادل بين تقريرين مباشرةً في ترجيح المسؤولية، حتى تكون النتيجة أكثر عدلاً عند توفّر بيانات الطرفين.

#### Acceptance Criteria

1. WHERE a Cross_Verification_Input with `consistency_status` equal to `VERIFIED` is provided, THE Evidence_Weighting_Model SHALL incorporate the cross-verified liability into the Raw_Fault_Score.
2. IF a Cross_Verification_Input has `consistency_status` equal to `INCONSISTENT`, THEN THE Evidence_Weighting_Model SHALL exclude the cross-verified liability from the Raw_Fault_Score and SHALL append an inconsistency note to `factorsAr`.
3. WHERE an Other_Party_Input reports `wasAccelerating` true, THE Evidence_Weighting_Model SHALL adjust the Raw_Fault_Score toward the other party (reduce the user's fault) relative to the same scenario without that signal.
4. WHERE neither a Cross_Verification_Input nor an Other_Party_Input is provided, THE Evidence_Weighting_Model SHALL compute the Raw_Fault_Score from sensor-derived signals alone.
5. THE Liability_Engine SHALL treat Cross_Verification_Input and Other_Party_Input as read-only and SHALL NOT mutate them.

### Requirement 7: سيناريو التقاطع بأولوية المرور (Intersection Right-of-Way)

**User Story:** بصفتي مستخدماً تعرّض لحادث عند تقاطع، أريد أن يصنّف النظام الحادث كتقاطع بأولوية مرور، حتى تعكس النتيجة من كان يملك الأحقية.

#### Acceptance Criteria

1. WHEN the Traffic_Context_Analyzer reports `roadType` equal to `intersection` and the impact direction is a side impact, THE Scenario_Classifier SHALL assign a scenario code identifying an intersection right-of-way scenario.
2. THE Scenario_Classifier SHALL produce an Arabic title, a plain-language summary (`plainSummaryAr`), and explanatory factors (`factorsAr`) for the intersection right-of-way scenario.
3. WHERE the user holds priority at the intersection, THE Scenario_Classifier SHALL produce factors indicating the other party violated right-of-way.
4. WHERE the user does not hold priority at the intersection, THE Scenario_Classifier SHALL produce factors indicating the user entered without right-of-way.

### Requirement 8: سيناريو الاندماج/الدخول في مسار (Lane Merge)

**User Story:** بصفتي مستخدماً، أريد أن يميّز النظام حادث الاندماج أو الدخول في مسار، حتى تُنسب المسؤولية للطرف الذي دخل المسار.

#### Acceptance Criteria

1. WHEN a side impact occurs with a confirmed lane-change yaw signal above the calibrated threshold, THE Scenario_Classifier SHALL assign a scenario code identifying a lane-merge scenario.
2. THE Scenario_Classifier SHALL produce an Arabic title, a `plainSummaryAr`, and `factorsAr` for the lane-merge scenario.
3. WHERE the gyroscope confirms the user performed the merging maneuver, THE Evidence_Weighting_Model SHALL increase the Raw_Fault_Score relative to a merge attributed to the other party.

### Requirement 9: سيناريو الانعطاف الكامل (U-turn)

**User Story:** بصفتي مستخدماً، أريد أن يكتشف النظام حادث الانعطاف الكامل (U-turn)، حتى تُقدّر المسؤولية بناءً على من نفّذ الانعطاف.

#### Acceptance Criteria

1. WHEN a sustained high yaw-rate rotation consistent with a U-turn is present together with the impact, THE Scenario_Classifier SHALL assign a scenario code identifying a U-turn scenario.
2. THE Scenario_Classifier SHALL produce an Arabic title, a `plainSummaryAr`, and `factorsAr` for the U-turn scenario.
3. WHERE the gyroscope indicates the user executed the U-turn, THE Evidence_Weighting_Model SHALL increase the Raw_Fault_Score relative to a U-turn executed by the other party.

### Requirement 10: سيناريو الوقوف والمناورة (Parking / Maneuvering)

**User Story:** بصفتي مستخدماً، أريد أن يميّز النظام حوادث الوقوف والمناورة بالسرعة المنخفضة، حتى تُقدّر المسؤولية بما يناسب المناورات البطيئة.

#### Acceptance Criteria

1. WHEN an impact occurs while the speed is below the stationary-speed threshold and the maneuvering context is present, THE Scenario_Classifier SHALL assign a scenario code identifying a parking/maneuvering scenario.
2. THE Scenario_Classifier SHALL produce an Arabic title, a `plainSummaryAr`, and `factorsAr` for the parking/maneuvering scenario.
3. WHILE the user is stationary at impact, THE Evidence_Weighting_Model SHALL keep the user's fault below or equal to the shared-fault midpoint of 50.

### Requirement 11: سيناريو الاصطدام المتسلسل متعدد المركبات (Chain Collision)

**User Story:** بصفتي مستخدماً، أريد أن يكتشف النظام الاصطدام المتسلسل متعدد المركبات، حتى تُفسَّر تعدد الصدمات في التقرير.

#### Acceptance Criteria

1. WHEN the impact count is greater than 1 and multiple impact directions are recorded, THE Scenario_Classifier SHALL assign a scenario code identifying a chain-collision scenario.
2. THE Scenario_Classifier SHALL produce an Arabic title, a `plainSummaryAr`, and `factorsAr` for the chain-collision scenario, including the number of detected impacts.
3. WHERE the first impact on the user was to the rear while stationary, THE Evidence_Weighting_Model SHALL keep the other party's fault dominant for the chain-collision scenario.

### Requirement 12: سيناريو فتح الباب (Door-Opening)

**User Story:** بصفتي مستخدماً، أريد أن يميّز النظام حادث فتح الباب، حتى تُنسب المسؤولية بشكل صحيح في هذه الحالة منخفضة السرعة.

#### Acceptance Criteria

1. WHEN a low-magnitude side impact occurs while the speed is at or below the stationary-speed threshold with no lane-change signal, THE Scenario_Classifier SHALL assign a scenario code identifying a door-opening scenario.
2. THE Scenario_Classifier SHALL produce an Arabic title, a `plainSummaryAr`, and `factorsAr` for the door-opening scenario.
3. THE Scenario_Classifier SHALL keep the door-opening scenario distinct from the existing low-speed side scenario by using a dedicated scenario code.

### Requirement 13: اتساق بنية السيناريوهات الجديدة مع القائمة

**User Story:** بصفتي مطوّراً يستهلك مخرجات المحرك، أريد أن تتبع كل السيناريوهات الجديدة نفس بنية السيناريوهات الحالية، حتى تعمل شاشات التقرير وتوليد الـ PDF والكروكي دون تغييرات.

#### Acceptance Criteria

1. THE Scenario_Classifier SHALL produce a non-empty `scenarioCode`, a non-empty `scenarioAr`, a non-empty `plainSummaryAr`, and a non-empty `factorsAr` list for every scenario, whether existing or newly added.
2. THE Scenario_Classifier SHALL emit each Arabic scenario string through the existing i18n / DynamicText layer rather than as an inline literal.
3. THE Scenario_Classifier SHALL assign a unique `scenarioCode` to each distinct scenario so that no two distinct scenarios share the same code.
4. THE Liability_Engine SHALL continue to classify all existing scenarios (rear direct, front direct, front-corner L/R, rear-corner L/R, the five side sub-cases, unknown, and the rollover / roundabout-priority / scrape overrides) after the new scenarios are added.

### Requirement 14: الحتمية ونقاء الدالة (Determinism & Purity)

**User Story:** بصفتي مهندس اختبار، أريد أن يبقى المحرك دالة نقية حتمية بلا حالة عامة، حتى أستطيع اختباره بالخصائص (property-based testing) بثبات.

#### Acceptance Criteria

1. WHEN the Liability_Engine is invoked twice with identical inputs, THE Liability_Engine SHALL return equal values for `userFaultPercent`, `otherFaultPercent`, `rawFaultPercent`, `confidence`, `severity`, `scenarioCode`, `isConclusive`, and `faultRange`.
2. THE Liability_Engine SHALL compute its result solely from its input parameters and SHALL NOT read or write module-level mutable state, wall-clock time, or random values.
3. THE Liability_Engine SHALL NOT mutate any of its input parameters.
4. THE Liability_Engine SHALL return numeric outputs that are finite (no NaN and no Infinity) for every combination of in-range inputs.

### Requirement 15: ثوابت الأمان والرتابة (Safety & Monotonicity Invariants)

**User Story:** بصفتي مستخدماً، أريد أن يحترم النظام قواعد منطقية ثابتة (مثل بقاء مسؤولية الطرف الآخر مهيمنة في اصطدام خلفي مؤكّد على مركبة واقفة)، حتى تكون النتائج قابلة للدفاع.

#### Acceptance Criteria

1. WHEN a confirmed rear impact occurs while the user's speed is below the stationary-speed threshold, THE Liability_Engine SHALL set `userFaultPercent` to a value less than or equal to 25.
2. WHILE all other inputs are held constant, increasing `peakGForce` SHALL NOT decrease the Confidence_Details `score`.
3. THE Liability_Engine SHALL always produce `userFaultPercent` as a member of Legal_Snap_Scale and `userFaultPercent + otherFaultPercent` equal to 100 for every input.
4. WHEN a confirmed lane-change by the user is detected in a side impact, THE Evidence_Weighting_Model SHALL produce a Raw_Fault_Score greater than or equal to the Raw_Fault_Score for the ambiguous side scenario with otherwise identical inputs.

### Requirement 16: بقاء التنويه الاستشاري (Advisory Disclaimer)

**User Story:** بصفتي مسؤولاً قانونياً، أريد أن يظل التقرير موضّحاً أن النتيجة تقدير استشاري وليست حكماً قانونياً، حتى لا يُساء استخدامها.

#### Acceptance Criteria

1. THE Liability_Engine SHALL preserve the Advisory_Disclaimer semantics such that the report continues to present the fault estimate as advisory and not as a legal judgment.
2. WHERE a result is not a Conclusive_Result, THE Liability_Engine SHALL communicate the approximate nature of the estimate through `plainSummaryAr`.

## Correctness Properties (Property-Based Testing)

هذه الخصائص مرشّحة لاختبارات fast-check (المكتبة مثبّتة: `fast-check ^4.8.0`) لأن سلوك المحرك يتغيّر بشكل ذي معنى مع المدخلات، والدالة نقية ومنخفضة الكلفة (in-memory). تُشغَّل من مجلد `artifacts/strix` عبر `npx jest --runInBand`.

- **P1 — ثابت السلّم القانوني (Invariant):** لأي مدخلات صالحة، `userFaultPercent ∈ {0,25,50,75,100}` و `userFaultPercent + otherFaultPercent === 100`. (Req 2.1، 2.2، 15.3)
- **P2 — حدود الدرجة الخام (Invariant):** لأي مدخلات، `0 ≤ rawFaultPercent ≤ 100` وكل المخرجات الرقمية finite (لا NaN/Infinity). (Req 1.1، 1.3، 14.4)
- **P3 — الحتمية (Idempotence/Determinism):** استدعاءان بنفس المدخلات يُنتجان نتيجة متطابقة الحقول. (Req 14.1)
- **P4 — نقاء الدالة (Metamorphic):** نسخ عميق للمدخلات قبل الاستدعاء يبقى مطابقاً بعده (لا mutation). (Req 14.3)
- **P5 — صدق الثقة عند المجهول (Metamorphic):** لأي مدخلات باتجاه `unknown`، `isConclusive === false`. (Req 4.1)
- **P6 — صدق الثقة عند عدم المعايرة (Metamorphic):** عند `directionCalibrated === false`، مستوى الثقة ليس `high`. (Req 4.2)
- **P7 — اتساق النطاق (Invariant):** لأي مدخلات، `faultRange[0] ≤ faultRange[1]`، وعند القطعية `faultRange === [userFaultPercent, userFaultPercent]`. (Req 3.2، 3.3، 3.4)
- **P8 — رتابة الثقة مع القوة (Monotonicity):** مع تثبيت باقي المدخلات، زيادة `peakGForce` لا تُخفّض `confidenceDetails.score`. (Req 15.2)
- **P9 — أمان الاصطدام الخلفي على مركبة واقفة (Invariant):** لاصطدام خلفي مؤكّد وسرعة أقل من عتبة الوقوف، `userFaultPercent ≤ 25`. (Req 15.1)
- **P10 — رتابة تأكيد تغيير المسار (Monotonicity):** تأكيد تغيير المسار من المستخدم في اصطدام جانبي ينتج `rawFaultPercent` أكبر أو يساوي حالة الجانبي الغامض بنفس المدخلات الأخرى. (Req 15.4)
- **P11 — تكامل بنية السيناريو (Invariant):** لأي مدخلات، `scenarioCode` و`scenarioAr` و`plainSummaryAr` غير فارغة و`factorsAr` قائمة غير فارغة. (Req 13.1)
- **P12 — تجاهل الإشارات الغائبة (Metamorphic):** حذف إشارة اختيارية (null) لا يُنتج NaN/Infinity ويظل ضمن كل الثوابت أعلاه. (Req 1.2، 5.5، 6.4)

**ملاحظة:** خصائص "خارج نطاق PBT" تُختبر بأمثلة أو تكامل، مثل: التوافق مع أنواع/حقول شاشات التقرير (integration)، وربط i18n بمفاتيح موجودة (unit example)، وبقاء التنويه الاستشاري (unit example).
