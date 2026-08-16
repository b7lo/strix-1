# مهام تنفيذ تطوير خوارزميات Strix

**المصدر:** [`ALGORITHM_IMPROVEMENT_ROADMAP.md`](../../ALGORITHM_IMPROVEMENT_ROADMAP.md)  
**النطاق:** محرك الحساسات، اكتشاف الاصطدام، تحليل السيناريو، الثقة، المسؤولية والمطابقة.  
**المنهج:** تنفيذ تراكمي؛ لا تبدأ مرحلة قبل اجتياز بوابة المرحلة السابقة.

---

## قواعد العمل لمنع خلط التعديلات

1. لكل مرحلة فرع Git مستقل يبدأ من آخر نسخة مستقرة في `main`.
2. لا تجمع مرحلتين في Pull Request واحد.
3. كل PR يجب أن يحتوي على اختبارات تخص التغيير نفسه.
4. لا تغيّر العتبات والمنطق والبنية في PR واحد؛ افصلها ليسهل قياس السبب.
5. أي تغيير يبدل نتائج Replay يجب أن يرفق تقرير مقارنة قبل/بعد.
6. لا تبدأ المرحلة التالية حتى:
   - نجاح TypeScript.
   - نجاح جميع اختبارات Jest.
   - نجاح Replay regression الخاص بالمراحل المكتملة.
   - مراجعة `git diff --check`.
   - إنشاء tag للنسخة المستقرة عند نهاية المرحلة.
7. لا تستخدم بيانات ميدانية حساسة داخل Git؛ تحفظ fixtures بعد إخفاء الهوية والموقع.
8. أي عطل جديد يضيف fixture واختبار regression قبل إصلاحه.

## استراتيجية الفروع والإصدارات

| المرحلة | الفرع المقترح | Tag بعد الدمج |
|---|---|---|
| 0 | `chore/algorithm-baseline` | `algorithm-p0-baseline` |
| 1 | `feat/sensor-replay` | `algorithm-p1-replay` |
| 2 | `feat/time-normalization` | `algorithm-p2-time` |
| 3 | `feat/impact-state-machine` | `algorithm-p3-detection` |
| 4 | `feat/vehicle-frame-zones` | `algorithm-p4-direction` |
| 5 | `feat/confidence-liability` | `algorithm-p5-liability` |
| 6 | `feat/cross-verification-ops` | `algorithm-p6-operations` |
| 7 | `experiment/impact-ml` | لا يدمج افتراضيًا |

---

# Phase 0 — تثبيت خط الأساس وأدوات القياس

**الهدف:** تسجيل الوضع الحالي بالأرقام قبل تعديل الخوارزميات.  
**الاستقلالية:** هذه المرحلة لا تغير قرارات المحرك.  
**بوابة الخروج:** تقرير baseline محفوظ، وجميع أوامر التحقق تعمل من أمر واحد.

- [x] T001 إنشاء فرع `chore/algorithm-baseline` من tag `backup-engine-2026-08-16`
- [x] T002 توثيق أوامر التحقق الحالية في `artifacts/strix/specs/004-algorithm-improvement/quickstart.md`
- [x] T003 تعريف مقاييس `recall` و`precision` و`falseAlarmsPerHour` و`zoneAccuracy` و`ECE` في `artifacts/strix/lib/evaluation/types.ts`
- [x] T004 [P] إنشاء fixtures اصطناعية للحوادث الحالية في `artifacts/strix/lib/__fixtures__/algorithm-baseline/positive/`
- [x] T005 [P] إنشاء fixtures اصطناعية للمطبات والفرملة وسقوط الهاتف في `artifacts/strix/lib/__fixtures__/algorithm-baseline/negative/`
- [x] T006 إنشاء أداة حساب baseline من fixtures في `artifacts/strix/scripts/evaluate-algorithm.ts`
- [x] T007 إضافة script باسم `evaluate:algorithm` إلى `artifacts/strix/package.json`
- [x] T008 إضافة اختبارات صحة حساب المقاييس في `artifacts/strix/lib/__tests__/algorithmEvaluation.test.ts`
- [x] T009 تشغيل التقييم وحفظ النتيجة الأولى في `artifacts/strix/specs/004-algorithm-improvement/baselines/current.json`
- [x] T010 توثيق نوع الجهاز ومعدل العينات ومصدر كل fixture في `artifacts/strix/specs/004-algorithm-improvement/baselines/README.md`
- [x] T011 تشغيل `pnpm --filter @workspace/strix run typecheck` وجميع اختبارات Jest و`git diff --check`
- [x] T012 دمج المرحلة في `main` وإنشاء tag باسم `algorithm-p0-baseline`

### بوابة Phase 0

- يمكن تشغيل التقييم بأمر واحد.
- المقاييس حتمية لنفس المدخلات.
- لا يوجد تغيير غير مبرر في ناتج المحرك الحالي.

---

# Phase 1 — Sensor Recorder وReplay Runner

**User Story US1:** كمطور، أريد تسجيل جلسة حساسات وإعادة تشغيلها حتميًا حتى أقارن إصدارات المحرك دون قيادة جديدة.  
**يعتمد على:** Phase 0.  
**بوابة الخروج:** التسجيل نفسه ينتج النتيجة نفسها عند إعادة تشغيله عدة مرات.

## 1A — عقد البيانات والخصوصية

- [x] T013 [P] [US1] تعريف `SensorReplayV1` و`ReplaySample` و`ReplayMetadata` في `artifacts/strix/lib/replay/types.ts`
- [x] T014 [P] [US1] تعريف Zod schema لتسجيل Replay في `artifacts/strix/lib/replay/schema.ts`
- [x] T015 [P] [US1] إضافة اختبار قبول ورفض مخطط التسجيل في `artifacts/strix/lib/__tests__/replaySchema.test.ts`
- [x] T016 [US1] إضافة `schemaVersion` و`engineVersion` و`thresholdConfigVersion` إلى `SensorReplayV1` في `artifacts/strix/lib/replay/types.ts`
- [x] T017 [US1] تنفيذ إخفاء/تقريب الموقع عند التصدير في `artifacts/strix/lib/replay/privacy.ts`
- [x] T018 [US1] إضافة اختبارات عدم تسريب الموقع والمعرفات في `artifacts/strix/lib/__tests__/replayPrivacy.test.ts`

## 1B — التسجيل

- [x] T019 [US1] تنفيذ buffer تسجيل محدود الذاكرة في `artifacts/strix/lib/replay/recorder.ts`
- [x] T020 [US1] تسجيل accelerometer وgyroscope وGPS والجودة والمعايرة في `artifacts/strix/lib/replay/recorder.ts`
- [x] T021 [US1] دمج recorder اختياريًا باستخدام refs داخل `artifacts/strix/context/SessionContext.tsx`
- [x] T022 [US1] منع React state updates لكل عينة تسجيل في `artifacts/strix/context/SessionContext.tsx`
- [x] T023 [US1] تنفيذ تصدير JSON آمن في `artifacts/strix/lib/replay/exporter.ts`
- [x] T024 [US1] إضافة اختبار حد الذاكرة والجلسة الطويلة في `artifacts/strix/lib/__tests__/replayRecorder.test.ts`

## 1C — إعادة التشغيل

- [x] T025 [US1] تنفيذ clock افتراضي حتمي في `artifacts/strix/lib/replay/replayClock.ts`
- [x] T026 [US1] تنفيذ Replay Runner يمرر العينات في ترتيبها إلى المحرك في `artifacts/strix/lib/replay/player.ts`
- [x] T027 [US1] منع Replay Runner من استخدام `Date.now()` مباشرة في `artifacts/strix/lib/replay/player.ts`
- [x] T028 [US1] إضافة adapter موحد بين الجلسة الحية وReplay في `artifacts/strix/lib/sensorPipeline.ts`
- [x] T029 [US1] إضافة اختبار أن replay نفسه يعطي JSON نتيجة مطابقًا في `artifacts/strix/lib/__tests__/replayDeterminism.test.ts`
- [x] T030 [US1] إضافة اختبار reset بين تسجيلين متتاليين في `artifacts/strix/lib/__tests__/replayIsolation.test.ts`
- [x] T031 [US1] تحديث `artifacts/strix/scripts/evaluate-algorithm.ts` لقبول ملفات Replay
- [x] T032 [US1] حفظ ثلاثة تسجيلات مجهولة الهوية على الأقل في `artifacts/strix/lib/__fixtures__/replay/`
- [x] T033 [US1] توثيق إنشاء وتشغيل Replay في `artifacts/strix/specs/004-algorithm-improvement/replay-guide.md`
- [x] T034 [US1] تشغيل تقرير baseline على المسار الحي ومسار Replay والتأكد من التطابق
- [x] T035 [US1] تشغيل فحوص المرحلة ودمجها وإنشاء tag باسم `algorithm-p1-replay`

### بوابة Phase 1

- Replay حتمي وقابل لإعادة الإنتاج.
- التسجيل محدود الذاكرة ولا يحدث واجهة React لكل عينة.
- التصدير لا يتضمن موقعًا دقيقًا أو معرفات شخصية افتراضيًا.

---

# Phase 2 — توحيد الزمن ومعدل العينات

**User Story US2:** كمستخدم على أي هاتف، أريد أن تكون نتيجة المحرك ثابتة رغم اختلاف معدل العينات.  
**يعتمد على:** Phase 1.  
**بوابة الخروج:** نسخ `25Hz` و`50Hz` و`100Hz` من الإشارة نفسها تعطي قرارًا متسقًا.

## 2A — طبقة الزمن والجودة

- [x] T036 [P] [US2] تعريف `TimingQuality` و`SampleTiming` في `artifacts/strix/lib/timing/types.ts`
- [x] T037 [P] [US2] إضافة fixtures لمعدلات `20/25/50/100Hz` وفجوات زمنية في `artifacts/strix/lib/__fixtures__/timing/`
- [x] T038 [US2] تنفيذ حساب `dt` المحمي من الصفر والقيم السالبة في `artifacts/strix/lib/timing/sampleClock.ts`
- [x] T039 [US2] تنفيذ median rate وjitter وgap detection في `artifacts/strix/lib/timing/rateEstimator.ts`
- [x] T040 [US2] إضافة اختبارات timestamps مكررة وغير مرتبة في `artifacts/strix/lib/__tests__/sampleClock.test.ts`
- [x] T041 [US2] دمج جودة الزمن داخل `artifacts/strix/lib/dataQuality.ts`
- [x] T042 [US2] تخفيض جودة البيانات عند الفجوات والمعدل المنخفض في `artifacts/strix/lib/dataQuality.ts`

## 2B — إزالة الاعتماد على عدد العينات

- [x] T043 [US2] استبدال شروط الفرملة المبنية على sample count بمدة زمنية في `artifacts/strix/lib/sensorUtils.ts`
- [x] T044 [US2] استبدال شروط التسارع والانحراف المبنية على sample count بمدة زمنية في `artifacts/strix/lib/advancedAnalysis.ts`
- [x] T045 [US2] تمرير `dt` الفعلي إلى Kalman وEMA في `artifacts/strix/lib/kalmanFilter.ts`
- [x] T046 [US2] حساب jerk من فرق الزمن الفعلي في `artifacts/strix/lib/sensorUtils.ts`
- [x] T047 [US2] تحويل نوافذ ما قبل/بعد الاصطدام إلى time windows في `artifacts/strix/context/SessionContext.tsx`
- [x] T048 [US2] تحديث ring buffers للاستعلام بالزمن في `artifacts/strix/lib/sensorUtils.ts`

## 2C — إعادة أخذ العينات والتحقق

- [x] T049 [US2] تنفيذ resampler محدود الفجوات في `artifacts/strix/lib/timing/resampler.ts`
- [x] T050 [US2] منع interpolation عبر فجوة تتجاوز الحد الآمن في `artifacts/strix/lib/timing/resampler.ts`
- [x] T051 [US2] إضافة property tests لثبات التصنيف عبر معدلات العينات في `artifacts/strix/lib/__tests__/sampleRateInvariance.props.test.ts`
- [x] T052 [US2] إضافة اختبارات NaN وInfinity و`dt=0` في `artifacts/strix/lib/__tests__/sensorTimingSafety.test.ts`
- [x] T053 [US2] تشغيل Replay suite على `25/50/100Hz` وحفظ تقرير المقارنة في `artifacts/strix/specs/004-algorithm-improvement/reports/phase-2.json`
- [x] T054 [US2] توثيق الحدود الزمنية المختارة وأساسها في `artifacts/strix/specs/004-algorithm-improvement/timing-decisions.md`
- [x] T055 [US2] تشغيل فحوص المرحلة ودمجها وإنشاء tag باسم `algorithm-p2-time`

### بوابة Phase 2

- لا يوجد شرط سلوكي مهم يعتمد على عدد عينات ثابت.
- لا ينتج jerk غير منتهٍ.
- قرار الحدث والمنطقة متسق عبر معدلات العينات ضمن الحدود المحددة.

---

# Phase 3 — مسارا الإشارة وImpact State Machine

**User Story US3:** كسائق، أريد اكتشاف الحوادث الحقيقية مع رفض المطبات وسقوط الهاتف وإغلاق الباب.  
**يعتمد على:** Phase 2.  
**بوابة الخروج:** انخفاض false alarms دون نزول recall عن حد baseline المتفق عليه.

## 3A — فصل مسار الصدمة عن الحركة

- [x] T056 [P] [US3] تعريف `ImpactSignal` و`MotionSignal` في `artifacts/strix/lib/signal/types.ts`
- [x] T057 [P] [US3] إضافة fixtures لنبضات صدمة وتشبع وقيم شاذة في `artifacts/strix/lib/__fixtures__/signal/`
- [x] T058 [US3] تنفيذ مسار raw-minus-gravity السريع في `artifacts/strix/lib/signal/impactSignal.ts`
- [x] T059 [US3] تنفيذ مسار الحركة الناعم المعتمد على `dt` في `artifacts/strix/lib/signal/motionSignal.ts`
- [x] T060 [US3] تنفيذ Hampel/median اختياري قصير في `artifacts/strix/lib/signal/outlierFilter.ts`
- [x] T061 [US3] إضافة اختبار أن outlier filter لا يقص نبضة اصطدام متعددة العينات في `artifacts/strix/lib/__tests__/outlierFilter.test.ts`
- [x] T062 [US3] كشف تشبع accelerometer داخل `artifacts/strix/lib/signal/saturationDetector.ts`
- [x] T063 [US3] إضافة `accelerometerSaturated` وحد أدنى لـ peak G إلى `artifacts/strix/lib/dataQuality.ts`
- [x] T064 [US3] دمج المسارين في `artifacts/strix/lib/sensorPipeline.ts`

## 3B — آلة الحالات

- [x] T065 [P] [US3] تعريف حالات وأحداث وانتقالات الاصطدام في `artifacts/strix/lib/impact/types.ts`
- [x] T066 [US3] تنفيذ `IDLE → CANDIDATE` في `artifacts/strix/lib/impact/impactStateMachine.ts`
- [x] T067 [US3] تنفيذ بوابات القوة وشكل النبضة والجودة في `artifacts/strix/lib/impact/impactEvidence.ts`
- [x] T068 [US3] تنفيذ `CANDIDATE → CONFIRMED/REJECTED` في `artifacts/strix/lib/impact/impactStateMachine.ts`
- [x] T069 [US3] تنفيذ `POST_IMPACT` و`COOLDOWN` في `artifacts/strix/lib/impact/impactStateMachine.ts`
- [x] T070 [US3] فصل الاصطدام الثانوي عن حادث جديد في `artifacts/strix/lib/impact/impactStateMachine.ts`
- [x] T071 [US3] نقل قرار الكشف من `artifacts/strix/context/SessionContext.tsx` إلى `artifacts/strix/lib/impact/impactStateMachine.ts`
- [x] T072 [US3] إبقاء `SessionContext.tsx` مسؤولًا عن الاشتراك وتمرير البيانات فقط

## 3C — رفض الأحداث المشابهة

- [x] T073 [US3] تنفيذ خصائص المطبات والمحور الرأسي في `artifacts/strix/lib/impact/nonCrashClassifier.ts`
- [x] T074 [US3] تنفيذ خصائص سقوط/تحرك الهاتف في `artifacts/strix/lib/impact/nonCrashClassifier.ts`
- [x] T075 [US3] تنفيذ خصائص إغلاق الباب عند السكون في `artifacts/strix/lib/impact/nonCrashClassifier.ts`
- [x] T076 [US3] إضافة transition table tests في `artifacts/strix/lib/__tests__/impactStateMachine.test.ts`
- [x] T077 [US3] إضافة property test يمنع تأكيد الحدث مرتين في `artifacts/strix/lib/__tests__/impactStateMachine.props.test.ts`
- [x] T078 [US3] تشغيل جميع الحالات السلبية وحفظ مقارنة false alarms في `artifacts/strix/specs/004-algorithm-improvement/reports/phase-3-negative.json`
- [x] T079 [US3] تشغيل جميع الحوادث وحفظ مقارنة recall في `artifacts/strix/specs/004-algorithm-improvement/reports/phase-3-positive.json`
- [x] T080 [US3] مراجعة العتبات في PR مستقل بعد ثبات البنية وتوثيقها في `artifacts/strix/lib/thresholds.ts`
- [x] T081 [US3] تشغيل فحوص المرحلة ودمجها وإنشاء tag باسم `algorithm-p3-detection`

### بوابة Phase 3

- لا يسجل الحدث نفسه مرتين.
- الاصطدامات الثانوية محفوظة داخل الحادث نفسه.
- false alarms أقل من baseline والـ recall لا يقل عن الحد المعتمد.
- التشبع ظاهر كقيد جودة ولا يعرض peak G المشبع كقياس دقيق.

---

# Phase 4 — إطار السيارة واحتمالات منطقة الاصطدام

**User Story US4:** كمراجع حادث، أريد منطقة اصطدام مع درجة عدم يقين صادقة حتى لا يتغير السيناريو بسبب زاوية هاتف خاطئة.  
**يعتمد على:** Phase 3.  
**بوابة الخروج:** الاتجاهات الأربعة للهاتف تنتج إطار سيارة متسقًا، والمنطقة تخرج كتوزيع احتمالي.

## 4A — معايرة مستمرة

- [x] T082 [P] [US4] توسيع `VehicleFrameEstimate` بسن المعايرة والمصادر في `artifacts/strix/lib/vehicleFrameEstimator.ts`
- [x] T083 [P] [US4] إنشاء fixtures لاتجاهات الهاتف الأربعة في `artifacts/strix/lib/__fixtures__/vehicle-frame/`
- [x] T084 [US4] دمج GPS course مع الدقة والسرعة في `artifacts/strix/lib/vehicleFrameEstimator.ts`
- [x] T085 [US4] استبعاد فترات الانعطاف من المعايرة في `artifacts/strix/lib/vehicleFrameEstimator.ts`
- [x] T086 [US4] دعم rotation vector/quaternion عبر adapter في `artifacts/strix/lib/orientation/orientationAdapter.ts`
- [x] T087 [US4] إضافة المغناطيسية كدليل اختياري منخفض الأولوية في `artifacts/strix/lib/vehicleFrameEstimator.ts`
- [x] T088 [US4] تنفيذ كشف تحرك الهاتف في `artifacts/strix/lib/orientation/phoneMovementDetector.ts`
- [x] T089 [US4] إبطال المعايرة وإعادة بنائها عند تحرك الهاتف في `artifacts/strix/lib/vehicleFrameEstimator.ts`
- [x] T090 [US4] إضافة اختبارات التفاف الزوايا ±180° في `artifacts/strix/lib/__tests__/vehicleFrameAngles.test.ts`
- [x] T091 [US4] إضافة اختبارات تحرك الهاتف وإبطال المعايرة في `artifacts/strix/lib/__tests__/phoneMovementDetector.test.ts`

## 4B — احتمالات المناطق

- [x] T092 [US4] تعريف `ImpactZoneDistribution` في `artifacts/strix/lib/types.ts`
- [x] T093 [US4] تنفيذ حساب احتمالات المناطق من زاوية ونسبة المحاور في `artifacts/strix/lib/impact/zoneProbability.ts`
- [x] T094 [US4] توسيع الاحتمالات عند انخفاض ثقة المعايرة في `artifacts/strix/lib/impact/zoneProbability.ts`
- [x] T095 [US4] إبقاء `impactZone` الحالي كـ argmax للتوافق داخل `artifacts/strix/lib/sensorUtils.ts`
- [x] T096 [US4] تمرير توزيع المناطق إلى `artifacts/strix/lib/liabilityEngine.ts`
- [x] T097 [US4] عرض المنطقة البديلة عند تقارب الاحتمالات في `artifacts/strix/lib/reportView.ts`
- [x] T098 [US4] إضافة property tests لمجموع الاحتمالات في `artifacts/strix/lib/__tests__/zoneProbability.props.test.ts`
- [x] T099 [US4] إضافة boundary tests تمنع القفز الحاد قرب حدود المناطق في `artifacts/strix/lib/__tests__/zoneProbabilityBoundary.test.ts`
- [x] T100 [US4] تشغيل Replay للاتجاهات وحفظ zone confusion matrix في `artifacts/strix/specs/004-algorithm-improvement/reports/phase-4-zones.json`
- [x] T101 [US4] تشغيل فحوص المرحلة واعتماد اكتمالها للإصدار `algorithm-p4-direction`
    - فحوص TypeScript وJest وReplay و`git diff --check` ناجحة بتاريخ 2026-08-17.
    - اعتُمدت Phase 4 مكتملة بتأكيد المستخدم؛ عزل Git والـ tag خارج نطاق مستودع Strix الحالي.

### بوابة Phase 4

- اتجاه الهاتف لا يقلب اتجاه المركبة بعد معايرة صحيحة.
- تحرك الهاتف يخفض الثقة ويعيد المعايرة.
- احتمالات المناطق منتهية وغير سالبة ومجموعها 1.

---

# Phase 5 — فصل الثقة وإعادة بناء المسؤولية

**User Story US5:** كمراجع، أريد معرفة الفرق بين ثقة وقوع الحادث وثقة السيناريو والمسؤولية، مع تفسير كل نتيجة.  
**يعتمد على:** Phase 4.  
**بوابة الخروج:** لا توجد مسؤولية قطعية عندما تكون الأدلة الضرورية ضعيفة.

## 5A — نموذج الثقة

- [x] T102 [P] [US5] تعريف `DataQualityConfidence` و`EventConfidence` و`DirectionConfidence` و`ScenarioConfidence` و`LiabilityConfidence` في `artifacts/strix/lib/confidence/types.ts`
- [x] T103 [P] [US5] إضافة fixtures لدرجات ثقة متوقعة في `artifacts/strix/lib/__fixtures__/confidence/`
- [x] T104 [US5] نقل حساب جودة البيانات إلى `artifacts/strix/lib/confidence/dataQualityConfidence.ts`
- [x] T105 [US5] تنفيذ ثقة الحدث من أدلة State Machine في `artifacts/strix/lib/confidence/eventConfidence.ts`
- [x] T106 [US5] تنفيذ ثقة الاتجاه من المعايرة وتوزيع المناطق في `artifacts/strix/lib/confidence/directionConfidence.ts`
- [x] T107 [US5] تنفيذ ثقة السيناريو مع سقف يعتمد على الأدلة الضرورية في `artifacts/strix/lib/confidence/scenarioConfidence.ts`
- [x] T108 [US5] تنفيذ ثقة المسؤولية المحافظة في `artifacts/strix/lib/confidence/liabilityConfidence.ts`
- [x] T109 [US5] إضافة أسباب الرفع والخفض لكل درجة في `artifacts/strix/lib/confidence/types.ts`
- [x] T110 [US5] إضافة اختبارات الرتابة والمعايرة الأولية في `artifacts/strix/lib/__tests__/confidenceModel.props.test.ts`

## 5B — فصل السيناريو عن قواعد المسؤولية

- [x] T111 [US5] تعريف `ScenarioHypothesis` و`EvidenceItem` في `artifacts/strix/lib/scenario/types.ts`
- [x] T112 [US5] نقل استنتاج السيناريو من المسؤولية إلى `artifacts/strix/lib/scenario/scenarioInference.ts`
- [x] T113 [US5] إنشاء سجل قواعد معرف في `artifacts/strix/lib/liability/ruleRegistry.ts`
- [x] T114 [US5] إضافة معرف وشروط وأدلة مؤيدة ومعارضة لكل قاعدة في `artifacts/strix/lib/liability/rules/`
- [x] T115 [US5] إزالة تأثير نسبة السرعة المباشر غير الموثق من `lib/liability/src/crossVerification.ts`
- [x] T116 [US5] إعادة السرعة كدليل مخالفة مستقل عند توفر حد الطريق في `artifacts/strix/lib/liability/evidence.ts`
- [x] T117 [US5] الإبقاء على legal snap scale مع حفظ raw score في `artifacts/strix/lib/liabilityEngine.ts`
- [x] T118 [US5] جعل النتيجة غير قطعية عند تعارض السيناريوهات في `artifacts/strix/lib/liabilityEngine.ts`
- [x] T119 [US5] عرض القاعدة والأدلة والقيود في `artifacts/strix/lib/reportView.ts`
- [x] T120 [US5] إضافة اختبارات rear/front/side/lane-change لكل قاعدة في `artifacts/strix/lib/__tests__/liabilityRules.test.ts`
- [x] T121 [US5] إضافة property tests لمجموع المسؤولية والنطاق والحتمية في `artifacts/strix/lib/__tests__/liabilityRules.props.test.ts`
- [x] T122 [US5] حساب Brier/ECE الأولي وحفظه في `artifacts/strix/specs/004-algorithm-improvement/reports/phase-5-confidence.json`
- [x] T123 [US5] توثيق تعذر توفير مختص مروري، إبقاء القواعد غير معتمدة، ومنع المسؤولية القطعية حتى مراجعة مستقبلية في `artifacts/strix/specs/004-algorithm-improvement/liability-review.md`
    - القرار `DEFERRED_NO_REVIEWER`: ليس اعتمادًا قانونيًا؛ جميع القواعد تبقى `reviewed: false` وتعرض نطاقًا تقديريًا فقط.
- [x] T124 [US5] تشغيل فحوص المرحلة ودمجها وإنشاء tag باسم `algorithm-p5-liability`
    - فحوص TypeScript وJest (238 اختبارًا) وReplay و`git diff --check` ناجحة بتاريخ 2026-08-17.
    - المراجعة الخارجية مؤجلة بضابط آمن موثق في `T123`، وأغلقت المرحلة على فرع `feat/confidence-liability` مع استبعاد إعدادات نشر EAS غير المرتبطة.

### بوابة Phase 5

- الدرجات الخمس منفصلة ومفسرة.
- ضعف الاتجاه يحد ثقة السيناريو والمسؤولية.
- السرعة لا تقلب المتسبب وحدها دون قاعدة موثقة.
- كل ناتج مسؤولية مرتبط بمعرف قاعدة وأدلة.

---

# Phase 6 — مطابقة الطرفين والتشغيل والأداء

**User Story US6:** كمراجع حادث لطرفين، أريد مطابقة عالية الدقة ورفض التناقض الفيزيائي، مع تشغيل آمن للعتبات.  
**يعتمد على:** Phase 5.  
**بوابة الخروج:** precision المطابقة يحقق الهدف، وتحديث العتبات قابل للرجوع.

## 6A — المطابقة والاتساق الفيزيائي

- [ ] T125 [P] [US6] توسيع عقد المطابقة بجودة GPS واتجاه السير وتوقيت القمة في `lib/liability/src/types.ts`
- [ ] T126 [P] [US6] إضافة fixtures لحوادث متقاربة زمانيًا ومكانيًا في `lib/liability/src/__fixtures__/matching/`
- [ ] T127 [US6] إضافة تشابه توقيت القمم إلى `lib/liability/src/matching.ts`
- [ ] T128 [US6] إضافة توافق مناطق التماس المتبادلة إلى `lib/liability/src/matching.ts`
- [ ] T129 [US6] إضافة اتجاه السير ودقة GPS إلى `lib/liability/src/matching.ts`
- [ ] T130 [US6] تنفيذ hard contradictions في `lib/liability/src/crossVerification.ts`
- [ ] T131 [US6] منع غياب GPS من التعويض بزاوية واحدة فقط في `lib/liability/src/matching.ts`
- [ ] T132 [US6] إضافة اختبارات match precision/recall في `lib/liability/src/__tests__/matchingEvaluation.test.ts`
- [ ] T133 [US6] إضافة اختبارات التناقض الفيزيائي في `lib/liability/src/__tests__/physicalConsistency.test.ts`
- [ ] T134 [US6] دمج الحقول الجديدة في `artifacts/strix/lib/accidentSync.ts`

## 6B — Remote Config الآمن

- [ ] T135 [P] [US6] تعريف `ThresholdConfigEnvelope` وإصدار المخطط في `artifacts/strix/lib/remoteConfig.ts`
- [ ] T136 [US6] التحقق من العلاقات بين العتبات قبل التطبيق في `artifacts/strix/lib/remoteConfig.ts`
- [ ] T137 [US6] جعل تطبيق الإعداد ذريًا all-or-nothing في `artifacts/strix/lib/remoteConfig.ts`
- [ ] T138 [US6] حفظ إصدار العتبات في التقرير وReplay داخل `artifacts/strix/lib/types.ts`
- [ ] T139 [US6] إضافة fallback وrollback إلى آخر إعداد صالح في `artifacts/strix/lib/remoteConfig.ts`
- [ ] T140 [US6] إضافة اختبارات الإعداد الجزئي والفاسد في `artifacts/strix/lib/__tests__/remoteConfigSafety.test.ts`

## 6C — الأداء والبطارية

- [ ] T141 [P] [US6] إضافة قياس زمن P50/P95 لمعالجة العينة في `artifacts/strix/lib/performance/sensorProfiler.ts`
- [ ] T142 [P] [US6] إضافة اختبار ذاكرة منطقي لجلسة طويلة في `artifacts/strix/lib/__tests__/longSessionPerformance.test.ts`
- [ ] T143 [US6] إزالة نسخ المصفوفات الكبيرة من المسار الساخن في `artifacts/strix/lib/sensorUtils.ts`
- [ ] T144 [US6] استبدال العمليات التي تنشئ arrays مؤقتة داخل الحلقة في `artifacts/strix/lib/advancedAnalysis.ts`
- [ ] T145 [US6] فصل معدل تحديث الواجهة عن معدل الحساس في `artifacts/strix/context/SessionContext.tsx`
- [ ] T146 [US6] توثيق P50/P95 والذاكرة والبطارية في `artifacts/strix/specs/004-algorithm-improvement/reports/phase-6-performance.md`
- [ ] T147 [US6] تشغيل تقييم المطابقة والأداء وحفظ التقرير في `artifacts/strix/specs/004-algorithm-improvement/reports/phase-6.json`
- [ ] T148 [US6] تشغيل فحوص المرحلة ودمجها وإنشاء tag باسم `algorithm-p6-operations`

### بوابة Phase 6

- التناقض الفيزيائي يرفض المطابقة أو يخفضها بوضوح.
- غياب GPS لا ينتج مطابقة عالية من دليل ضعيف واحد.
- إعداد العتبات يطبق كاملًا أو لا يطبق.
- لا تنمو الذاكرة مع مدة الجلسة، وزمن معالجة العينة أقل من فترة العينة بهامش آمن.

---

# Phase 7 — تعلم آلي تجريبي واختياري

**User Story US7:** كفريق بحث، نريد تقييم نموذج صغير لتصنيف الحدث دون استبدال قواعد السلامة أو المسؤولية.  
**يعتمد على:** اكتمال Phases 0–6 ووجود dataset كافية.  
**قاعدة:** لا يدمج في `main` حتى يتفوق على baseline على test set مستقل.

- [ ] T149 [P] [US7] توثيق سياسة الوسم وتقسيم البيانات في `artifacts/strix/ml/DATASET.md`
- [ ] T150 [P] [US7] تعريف feature schema بإصدار في `artifacts/strix/ml/features.schema.json`
- [ ] T151 [US7] تنفيذ extractor للميزات دون بيانات مستقبلية في `artifacts/strix/ml/extract-features.ts`
- [ ] T152 [US7] تقسيم البيانات حسب الرحلة والسيارة والجهاز في `artifacts/strix/ml/split-dataset.ts`
- [ ] T153 [US7] تدريب baseline قابل للتفسير خارج التطبيق في `artifacts/strix/ml/train-baseline.py`
- [ ] T154 [US7] تقييم confusion matrix وMacro F1 والمعايرة في `artifacts/strix/ml/evaluate.py`
- [ ] T155 [US7] حفظ model card والقيود في `artifacts/strix/ml/MODEL_CARD.md`
- [ ] T156 [US7] تنفيذ adapter تشغيل تجريبي في `artifacts/strix/lib/ml/impactClassifier.ts`
- [ ] T157 [US7] تشغيل النموذج في shadow mode دون تغيير القرار في `artifacts/strix/lib/sensorPipeline.ts`
- [ ] T158 [US7] إضافة fallback كامل إلى القواعد عند فشل النموذج في `artifacts/strix/lib/ml/impactClassifier.ts`
- [ ] T159 [US7] مقارنة النموذج والقواعد على test set في `artifacts/strix/specs/004-algorithm-improvement/reports/phase-7-ml.json`
- [ ] T160 [US7] إجراء مراجعة go/no-go موثقة في `artifacts/strix/specs/004-algorithm-improvement/ml-decision.md`

### بوابة Phase 7

- لا يوجد data leakage بين التدريب والاختبار.
- النموذج يعمل في shadow mode أولًا.
- فشل النموذج لا يعطل المحرك القاعدي.
- المسؤولية تبقى قواعد قابلة للتفسير ولا يصدرها النموذج مباشرة.

---

# Phase 8 — الإغلاق والتوثيق النهائي

- [ ] T161 تحديث `artifacts/strix/ALGORITHM_IMPROVEMENT_ROADMAP.md` بحالة كل مرحلة
- [ ] T162 [P] تحديث مخطط تدفق المحرك في `artifacts/strix/specs/004-algorithm-improvement/architecture.md`
- [ ] T163 [P] تحديث دليل الاختبارات الميدانية في `artifacts/strix/specs/004-algorithm-improvement/field-test-guide.md`
- [ ] T164 إضافة جدول إصدارات المحرك والعتبات والنموذج في `artifacts/strix/specs/004-algorithm-improvement/version-matrix.md`
- [ ] T165 تشغيل TypeScript لكل الحزم المتأثرة وإصلاح الأخطاء المرتبطة بالتطوير
- [ ] T166 تشغيل جميع اختبارات Jest وReplay وproperty tests
- [ ] T167 تشغيل `git diff --check` وفحص الأسرار والملفات الحساسة
- [ ] T168 إنشاء تقرير نهائي قبل/بعد في `artifacts/strix/specs/004-algorithm-improvement/final-report.md`
- [ ] T169 إنشاء tag إصدار نهائي بعد موافقة المراجعة

---

# الاعتماد بين المراحل

```text
Phase 0 Baseline
    ↓
Phase 1 Recorder/Replay
    ↓
Phase 2 Timing
    ↓
Phase 3 Detection State Machine
    ↓
Phase 4 Vehicle Frame + Zone Probabilities
    ↓
Phase 5 Confidence + Liability
    ↓
Phase 6 Matching + Operations + Performance
    ↓
Phase 7 ML Experiment (اختياري)
    ↓
Phase 8 Finalization
```

## أعمال يمكن تنفيذها بالتوازي

- داخل Phase 0: fixtures الإيجابية والسلبية.
- داخل Phase 1: schema والخصوصية قبل دمج recorder.
- داخل Phase 2: fixtures الزمنية وتعريف الأنواع.
- داخل Phase 3: fixtures الإشارة وتعريف state types.
- داخل Phase 4: fixtures الاتجاه وتوسيع الأنواع.
- داخل Phase 5: fixtures الثقة وتعريف الأنواع.
- داخل Phase 6: عقود المطابقة، إعداد العتبات، وأداة قياس الأداء في ملفات منفصلة.
- Phase 7 لا يبدأ بالتوازي مع تغيير تعريفات البيانات الأساسية؛ يحتاج dataset مستقرة.

---

# تقسيم Pull Requests المقترح

لمنع PRs ضخمة، تقسم المرحلة الواحدة عند الحاجة:

| PR | النطاق |
|---|---|
| P1-A | Replay contracts + privacy |
| P1-B | Recorder |
| P1-C | Player + determinism |
| P2-A | Timing quality |
| P2-B | Time-based algorithms |
| P2-C | Resampling + invariance tests |
| P3-A | Dual signal paths |
| P3-B | State machine |
| P3-C | Non-crash rejection + threshold calibration |
| P4-A | Vehicle frame calibration |
| P4-B | Phone movement invalidation |
| P4-C | Zone probabilities |
| P5-A | Confidence dimensions |
| P5-B | Scenario inference separation |
| P5-C | Liability rules + calibration |
| P6-A | Matching and physical consistency |
| P6-B | Safe remote config |
| P6-C | Performance and battery |

---

# تعريف الإنجاز لكل Task

لا تعتبر المهمة مكتملة إلا إذا:

- نُفذ الكود في المسار المحدد.
- أضيف أو حدث الاختبار المرتبط.
- نجحت الاختبارات السابقة والجديدة.
- لم ترتفع الإنذارات الكاذبة أو تنخفض الحساسية دون توثيق وموافقة.
- حُدث التقرير أو القرار الهندسي عند تغيير السلوك.
- لا توجد أسرار أو بيانات موقع دقيقة في commit.
- commit صغير وواضح ويمكن التراجع عنه مستقلًا.

---

# نطاق MVP المقترح

الـ MVP الأول هو **Phases 0–3 فقط**:

1. قياس baseline.
2. التسجيل وإعادة التشغيل.
3. توحيد الزمن.
4. State Machine ومسارا الإشارة.

هذه المراحل تعطي أكبر تحسن عملي في ثبات الكشف وتقليل الإنذارات الكاذبة، وتؤسس لقياس المراحل اللاحقة دون خلط المسؤولية أو التعلم الآلي مبكرًا.
