# تقرير تدقيق محرك Strix وخطة التنفيذ

> **الغرض من هذا الملف:** مراجعة هندسية كاملة لمحرك الحساسات + خوارزميات تحديد المسؤولية، تشخيص الأخطاء، وشرح كيف نطوّرها لنتائج أدق ومصداقية أعلى.
>
> **الجمهور المستهدف:** نموذج/مطوّر أقل خبرة سينفّذ الإصلاحات. لذلك كل بند مكتوب بصيغة "افعل كذا في الملف الفلاني بالطريقة التالية" مع أمثلة كود جاهزة.
>
> **تاريخ التدقيق:** 2026-06-25 — يغطّي محرك `sensorUtils v7.x`، `kalmanFilter v1.0`، `liabilityEngine v7.0`، `advancedAnalysis v7.x`، `crossVerification`، `otherPartyAnalysis`، و`SessionContext`.

---

## 0. قواعد صارمة للنموذج المنفّذ (اقرأها أولاً)

1. **لا تغيّر السلوك دون اختبار.** بعد كل إصلاح شغّل `pnpm jest` (أو `npx jest`) من مجلد `artifacts/strix` وتأكد أن الاختبارات تمر.
2. **نفّذ بالترتيب حسب الأولوية** الموضّح في الجدول (القسم 2). لا تقفز للتحسينات الكبيرة قبل إصلاح الأخطاء الحرجة.
3. **لا تحذف منطقاً موجوداً قبل أن تفهمه.** إن لم يكن سبب وجود كود واضحاً، اتركه وأضف تعليقاً `// TODO: تحقق` بدل حذفه.
4. **كل قيمة رقمية جديدة يجب أن تذهب إلى `lib/thresholds.ts`** وليس داخل الدوال (لا أرقام سحرية جديدة).
5. **حافظ على الواجهات (function signatures) العامة** قدر الإمكان حتى لا تكسر `SessionContext.tsx`. إن غيّرت توقيع دالة مُصدّرة، حدّث كل المستدعين.
6. **اكتب اختباراً واحداً على الأقل لكل إصلاح منطقي** (انظر القسم 5).
7. **لا تلمس مفاتيح أو أسرار** (`.env`). لا ترفع بيانات GPS دقيقة.
8. عند الشك، **قلّل الثقة المعروضة للمستخدم** بدل تضخيمها. المصداقية أهم من الرقم الجريء.

---

## 1. خريطة النظام وتدفق البيانات

```
expo-sensors Accelerometer (بوحدة g، يشمل الجاذبية)
        │  raw {x,y,z}
        ▼
applyHighPassFilter()  ── Kalman 3D ── طرح gravityEstimate ──► filtered (تسارع صافٍ بوحدة g)
        │
        ├─► calculateGForce() ──► gForce (مقدار التسارع الصافي)
        │
        ▼
recordSample()  ── يحدّث: AdaptiveBaseline, FrequencySeparator, Impulse tracking, RingBuffer
        │
        ▼
(في SessionContext) إذا gForce ≥ عتبة ──► analyzeImpact()
        │
        ├─ findPeakZone()         ──► zone (8 مناطق) + peakG + peakFiltered
        ├─ validateCrashWithGyro()──► قبول/رفض الحادث
        ├─ analyzeBraking()       ──► فرملة
        ├─ getGyroscopeSnapshot() ──► دوران/انقلاب
        ├─ runAdvancedAnalysis()  ──► 6 وحدات تعديل (-50..+50)
        ├─ analyzeOtherParty()    ──► تقدير الطرف الآخر (فيزياء)
        ▼
calculateLiability() ──► نسبة مسؤولية مقرّبة لـ [0,25,50,75,100] + ثقة + شدة
        ▼
report ──► (خلفية) رفع + مطابقة + crossVerification بين تقريرين
```

**الفكرة الأساسية للمصداقية:** كل القرار القانوني (نسبة المسؤولية) يعتمد على ثلاثة مدخلات حسّاسة جداً:
- **اتجاه/منطقة الصدمة** (front/rear/side…) ← من `detectImpactZone`.
- **قوة الصدمة `peakG`** ← من الإشارة المُفلترة.
- **الدوران (yaw) قبل/أثناء الصدمة** ← من الجيروسكوب.

أي خطأ في هذه الثلاثة يضرب مصداقية النظام كله. معظم الأخطاء الحرجة أدناه تقع فيها بالضبط.

---

## 2. ملخّص الأخطاء حسب الأولوية

| المعرّف | المشكلة | الملف | الخطورة | الأثر |
|--------|---------|-------|---------|-------|
| **A-1** | لا يوجد "بوّابة استقرار" قبل تفعيل كشف الحادث → إيجابيات كاذبة في أول ثوانٍ | `SessionContext.tsx` + `sensorUtils.ts` | 🔴 حرجة | حوادث وهمية فور بدء الجلسة |
| **A-2** | فلتر Kalman يُنعّم قمة الصدمة فيقلّل `peakG` الحقيقي | `sensorUtils.ts` / `kalmanFilter.ts` | 🔴 حرجة | تقليل الحساسية + أرقام قوة غير صادقة |
| **A-3** | تحديد اتجاه الصدمة مستحيل فيزيائياً دون معرفة اتجاه الجوال بالنسبة للسيارة | `sensorUtils.ts` (`mapToVehicleFrame`) | 🔴 حرجة | المنطقة/الاتجاه = تخمين → مسؤولية خاطئة |
| **A-4** | معدل العيّنات الحقيقي لا يُمرّر لمحركات الفلترة (Kalman/Freq/Baseline مثبّتة على 50Hz) | `sensorUtils.ts` | 🟠 عالية | الفلاتر معايرة غلط عند 20/100Hz |
| **A-5** | تطبيق `mapToVehicleFrame` على الجيروسكوب غير صحيح رياضياً (pitch/roll) | `sensorUtils.ts` | 🟠 عالية | كشف الانقلاب وroll غير موثوق |
| **A-6** | التقريب لـ [0,25,50,75,100] يُخفي عدم اليقين ولا يرتبط بالثقة | `liabilityEngine.ts` | 🟠 عالية | ثقة زائفة في رقم قانوني |
| **A-7** | `firstContact` يعتمد على ساعة الجوال المحلية (clock drift) | `crossVerification.ts` | 🟡 متوسطة | ظلم طرف عند فرق توقيت بسيط |
| **A-8** | تقدير سرعة الطرف الآخر بتكامل مقدار الإشارة (يبالغ) ويُعرض برقم دقيق مضلّل | `otherPartyAnalysis.ts` | 🟡 متوسطة | رقم "سرعة الآخر" غير قابل للدفاع |
| **A-9** | إغلاق الـ impulse عند 0.8g قد لا يحدث في المناورات → مدة صدمة ضخمة | `sensorUtils.ts` | 🟡 متوسطة | تصنيف نوع المركبة خاطئ |
| **A-10** | `speedBeforeBraking` يستخدم peak بدل average (من المراجعة السابقة، M-2) | `sensorUtils.ts` | 🟡 متوسطة | مبالغة في تقدير السرعة |
| **A-11** | `getPostCrashBuffer` تنسخ كامل الـ buffer ثم تفلتر (M-4) | `sensorUtils.ts` | 🔵 منخفضة | أداء/بطارية |
| **A-12** | غياب اختبارات لكل رياضيات الحساسات (frame, Kalman, baseline, braking, zone) | `lib/__tests__/` | 🟠 عالية | لا ضمان للمصداقية |

> ابدأ بـ **A-1 → A-2 → A-3 → A-4 → A-5 → A-6** ثم الباقي. A-12 (الاختبارات) نفّذها بالتوازي مع كل إصلاح.

---
## 3. تفاصيل الأخطاء وخطوات الإصلاح

### 🔴 A-1 — لا توجد بوّابة استقرار قبل كشف الحادث

**أين:** `context/SessionContext.tsx` في مستمع `Accelerometer.addListener`، و`lib/sensorUtils.ts`.

**التشخيص:**
- عند بدء الجلسة، `gravityEstimate` يبدأ بقيمة ثابتة `{x:0, y:-1, z:0}` ويتقارب نحو الجاذبية الحقيقية ببطء (alpha=0.05 ≈ أكثر من ثانية).
- خلال هذه الفترة، `filtered = smoothed - gravityEstimate` يحتوي خطأً كبيراً (قد يصل 1–2g أو أكثر حسب وضعية الجوال).
- مستمع التسارع يستدعي `analyzeImpact()` فوراً متى تجاوز `gForce` العتبة، **دون انتظار استقرار الـ baseline أو الجاذبية**.
- `AdaptiveBaseline.isSettled()` موجودة (5 ثوانٍ) لكنها غير مستخدمة كبوّابة للكشف.

**الأثر على المصداقية:** حوادث وهمية في أول 1–5 ثوانٍ من كل جلسة. هذا يدمّر ثقة المستخدم فوراً.

**الإصلاح (خطوة بخطوة):**

1. في `sensorUtils.ts` أضف دالة تكشف الجاهزية:
```typescript
// أضف قرب getDiagnostics()
const WARMUP_SAMPLES = 60; // ~1.2s @ 50Hz لتقارب الجاذبية
export function isEngineReady(): boolean {
  return sensorEngine.adaptiveBaseline.isSettled()
      && sensorEngine.ringBuffer.length >= WARMUP_SAMPLES;
}
```

2. في `SessionContext.tsx`، داخل مستمع التسارع، عدّل شرط التفعيل:
```typescript
const adaptiveThreshold = getAdjustedThreshold(thresholdRef.current);
// قبل: if (gForce >= adaptiveThreshold && !cooldown.current)
if (gForce >= adaptiveThreshold && !cooldown.current && isEngineReady()) {
  analyzeImpact();
}
```
> لا تنسَ استيراد `isEngineReady` ضمن قائمة الاستيراد من `@/lib/sensorUtils`.

3. (اختياري لكن مُستحسن) أضف للحالة المعروضة مؤشّر "جاري المعايرة…" أول 5 ثوانٍ حتى يفهم المستخدم سبب عدم بدء الكشف.

**معيار النجاح:** محاكاة عيّنات أول ثانية بقيم جاذبية أولية خاطئة → يجب ألّا يُستدعى `analyzeImpact` قبل `isEngineReady()===true`.

---

### 🔴 A-2 — Kalman يُنعّم قمة الصدمة (peakG غير صادق)

**أين:** `lib/sensorUtils.ts` (`applyHighPassFilter`, `findPeakZone`, `recordSample`) و`lib/kalmanFilter.ts` (`adaptToSpeed`).

**التشخيص:**
- الصدمة الحقيقية نبضة قصيرة جداً (50–150ms = 3–8 عيّنات عند 50Hz).
- يُطبَّق Kalman بضوضاء عملية منخفضة (`q=0.008`) **قبل** حساب `gForce` وكشف القمة. هذا فلتر تمرير منخفض فعّال → يقصّ ذروة النبضة.
- الأسوأ: `adaptToSpeed` يرفع ضوضاء القياس إلى 0.20 عند السرعات العالية = **تنعيم أقوى تحديداً وقت أعنف الحوادث**. هذا معكوس للمطلوب.
- النتيجة: `peakGForce` المُسجَّل أقل من الحقيقي بشكل منهجي. وبما أن الشدة (severity) وتقدير سرعة الطرف الآخر يعتمدان عليه، الأرقام كلها منحازة للأسفل وغير قابلة للدفاع أمام خبير تأمين.

**المبدأ الصحيح:** Kalman ممتاز لتتبّع الاتجاه/الجاذبية (إشارة بطيئة)، لكنه سيئ للحفاظ على النبضات اللحظية. يجب **فصل المسارين**:
- مسار "بطيء" مُنعّم لتقدير الجاذبية والـ baseline والوضعية.
- مسار "خام/شبه خام" للكشف عن القمة وقياس قوّتها.

**الإصلاح:**

1. في `recordSample`/`findPeakZone` احسب القمة من الإشارة **الخام منزوعة الجاذبية** (وليس مخرج Kalman). في `applyHighPassFilter` أعِد القيمتين:
```typescript
export interface FilteredReading { x: number; y: number; z: number; }

// بدّل الإرجاع ليشمل النسختين
export function applyHighPassFilter(raw: {x:number;y:number;z:number}): {
  smoothed: FilteredReading;  // للاتجاه/الوضعية
  impact: FilteredReading;    // للكشف عن القمة (خام - جاذبية)
} {
  updateGravityEstimate(raw);
  const k = sensorEngine.kalmanAccel.update(raw); // مسار بطيء
  const g = sensorEngine.gravityEstimate;
  return {
    smoothed: { x: k.x - g.x, y: k.y - g.y, z: k.z - g.z },
    impact:   { x: raw.x - g.x, y: raw.y - g.y, z: raw.z - g.z },
  };
}
```
2. في `SessionContext` استخدم `impact` لحساب `gForce` والكشف، و`smoothed` لأي تقدير اتجاهي بطيء:
```typescript
const { impact, smoothed } = applyHighPassFilter(raw);
const gForce = calculateGForce(impact.x, impact.y, impact.z);
recordSample(gForce, impact, raw); // خزّن impact في الـ RingBuffer
```
3. **اعكس منطق `adaptToSpeed`**: السرعة العالية لا يجب أن تزيد تنعيم نبضة الصدمة. إمّا:
   - احذف استدعاء `adaptToSpeed` من مسار الكشف، أو
   - طبّقه فقط على تقدير الجاذبية/الـ baseline لا على قياس القمة.
   عملياً: بما أن القمة صارت تُحسب من `impact` (الخام)، لم يعد `adaptToSpeed` يؤثر على القمة. أبقِه فقط لتنعيم `smoothed`.
4. للحد من الضوضاء العشوائية في الخام دون قتل النبضة، استخدم **متوسط/median على نافذة 3 عيّنات** بدل Kalman ثقيل (median-of-3 يزيل الـ spikes المفردة الكاذبة ويُبقي النبضة الحقيقية الممتدة 3+ عيّنات).

**معيار النجاح:** اختبار: ادفع نبضة اصطناعية (مثلاً 5g لعيّنتين ثم رجوع) ← يجب أن يقرأ `peakG ≥ 4.5g` (وليس ~2–3g كما الآن مع Kalman).

---

### 🔴 A-3 — اتجاه الصدمة غير قابل للتحديد دون معرفة وضعية الجوال نسبةً للسيارة

**أين:** `lib/sensorUtils.ts` → `mapToVehicleFrame`, `detectImpactZone`.

**التشخيص (الأهم على الإطلاق):**
- `mapToVehicleFrame` يحسب المحور الرأسي (vZ) بشكل صحيح عبر إسقاط على متجه الجاذبية. **لكن** يفترض ضمنياً أن محور الجهاز X = جانب السيارة وY = أمام/خلف السيارة.
- هذا الافتراض صحيح فقط إذا كان الجوال مثبّتاً ومحاذياً لاتجاه السيارة. أمّا "على المقعد/في حامل الأكواب" (كما تقول التعليقات) فاتجاه الجوال الأفقي (heading) **عشوائي**.
- من التسارع + الجاذبية وحدهما **لا يمكن** معرفة دوران الجوال حول المحور الرأسي (أي أين "أمام السيارة"). هذه معلومة غير قابلة للرصد فيزيائياً بهذه الحساسات.
- بالتالي تمييز front/rear/left/right في `detectImpactZone` = تخمين، والمسؤولية القانونية مبنية عليه بالكامل.

**الأثر على المصداقية:** أخطر نقطة. قد يعطي النظام "front 100%" لحادث خلفي لأن الجوال كان موجّهاً عكسياً. لا يمكن الدفاع عن هذا أمام نجم/التأمين.

**الإصلاح (يتطلب مصدراً لاتجاه السيارة):** نفّذ واحداً أو أكثر مما يلي بالترتيب:

1. **استخدم اتجاه الحركة من GPS (course) لتثبيت "أمام السيارة"** — الأبسط والأفضل عملياً:
   - من `expo-location` خزّن `loc.coords.heading` و`loc.coords.course` عند السرعات > 10 كم/س.
   - عند الحركة، اتجاه تسارع المركبة الطولي يجب أن يحاذي اتجاه التغيّر في heading/السرعة. استخدم ذلك لمعايرة دوران الجوال حول الرأسي (yaw offset) مرة كل جلسة.
   - خزّن `phoneYawOffset` وطبّقه داخل `mapToVehicleFrame` لتدوير (vX,vY) حول المحور الرأسي.
   ```typescript
   // داخل mapToVehicleFrame بعد حساب vX,vY الأوّليين
   const c = Math.cos(sensorEngine.phoneYawOffset);
   const s = Math.sin(sensorEngine.phoneYawOffset);
   const rX = vX * c - vY * s;
   const rY = vX * s + vY * c;
   return { vX: rX, vY: rY, vZ };
   ```
2. **(بديل/إضافة) دمج المغناطيسية (Magnetometer)** عبر `expo-sensors` للحصول على heading مطلق للجوال، ومقارنته بـ GPS course لحساب الإزاحة.
3. **إن تعذّر أي مصدر heading: كن صادقاً.** اضبط `direction='unknown'` واخفض الثقة إلى "low/medium" بدل ادّعاء اتجاه. لا تُصدر نسبة مسؤولية حاسمة (اجعلها 50/50 مع تنويه) عندما يكون الاتجاه غير معاير.

**قاعدة ذهبية للمصداقية:** أضف حقلاً `directionCalibrated: boolean` في التقرير. أي تقرير باتجاه غير معاير يجب أن يُعرض فيه تحذير صريح: "الاتجاه تقديري — الجوال غير مثبّت/معاير".

**معيار النجاح:** عند `phoneYawOffset` معروف، صدمة من اتجاه معروف في إطار السيارة تُعطي المنطقة الصحيحة بغضّ النظر عن دوران الجوال الابتدائي.

---

### 🟠 A-4 — معدل العيّنات الحقيقي لا يصل لمحركات الفلترة

**أين:** `lib/sensorUtils.ts` (`SensorEngine` constructor, `setSampleRate`) و`lib/kalmanFilter.ts` (`FrequencySeparator`, `AdaptiveBaseline`).

**التشخيص:**
- `FrequencySeparator` يحسب `alpha` من `sampleRateHz=50` ثابت.
- `AdaptiveBaseline` يحسب `settleThreshold = settleSeconds * 50`.
- `ringBuffer` سعته 1000 ثابتة.
- لكن المستخدم قد يختار 20 أو 100Hz من الإعدادات. عندها قطع التردد، ومدة الاستقرار، ونوافذ التباين كلها معايرة خطأ.

**الإصلاح:**
1. أعِد بناء المحركات المعتمدة على المعدل داخل `setSampleRate`:
```typescript
export function setSampleRate(hz: number): void {
  sensorEngine.sampleRateHz = Math.max(10, Math.min(100, hz));
  sensorEngine.ringBufferSize = BUFFER_DURATION_SEC * sensorEngine.sampleRateHz;
  // أعد بناء ما يعتمد على المعدل
  sensorEngine.freqSeparator = new FrequencySeparator(sensorEngine.sampleRateHz);
  sensorEngine.adaptiveBaseline = new AdaptiveBaseline(5, sensorEngine.sampleRateHz);
}
```
2. اجعل سعة `ringBuffer` كافية لأعلى معدل (مثلاً `BUFFER_DURATION_SEC * 100`)، أو أعِد إنشاءها بالحجم الصحيح في `setSampleRate`.
3. تأكد أن `setSampleRate` تُستدعى **قبل** أي عيّنة (هي كذلك في `startSession`).

**معيار النجاح:** عند 100Hz، `settleThreshold` يساوي 500 عيّنة لا 250، و`alpha` يتغيّر بالمعدل.

---

### 🟠 A-5 — إسقاط الجيروسكوب على إطار السيارة غير صحيح

**أين:** `lib/sensorUtils.ts` → `getGyroscopeSnapshot`, `getWindowedYaw` (تستخدم `mapToVehicleFrame` على عيّنة جيروسكوب).

**التشخيص:**
- `mapToVehicleFrame` صُمّمت لمتجه **تسارع خطّي** (تطرح/تُسقط على الجاذبية). تطبيقها على **سرعة زاوية** (rad/s) يخلط المعاني.
- معدل الـ Yaw (الدوران حول الرأسي) = إسقاط متجه السرعة الزاوية على متجه "الأعلى" = `dot(gyro, up)`. هذا الجزء (vZ) صحيح صدفةً.
- لكن pitch/roll (vX/vY) مشتقّان من أساس forward/lateral الذي يعاني نفس غموض الـ heading في A-3 → **كشف الانقلاب وroll غير موثوق**.

**الإصلاح:**
1. احسب yaw rate مباشرةً كإسقاط على الجاذبية المُطبّعة (بدون `mapToVehicleFrame`):
```typescript
function yawRateDegS(gyro: {x:number;y:number;z:number}): number {
  const g = sensorEngine.gravityEstimate;
  const m = Math.hypot(g.x, g.y, g.z) || 1;
  const dot = (gyro.x*g.x + gyro.y*g.y + gyro.z*g.z) / m; // rad/s حول الرأسي
  return Math.abs(dot) * (180/Math.PI);
}
```
2. لـ "الانقلاب" استخدم **مقدار السرعة الزاوية الأفقية** (المتعامدة مع الرأسي) بدل التمييز الوهمي pitch/roll:
```typescript
function horizontalRotRateDegS(gyro): number {
  const total = Math.hypot(gyro.x, gyro.y, gyro.z);
  const yaw = /* rad/s */ ...;
  const horiz = Math.sqrt(Math.max(0, total*total - yaw*yaw));
  return horiz * (180/Math.PI);
}
```
   واعتبر الانقلاب عند تجاوز عتبة أفقية مستدامة (مثلاً > 100°/s لعدة عيّنات) — دون ادّعاء أنه roll تحديداً مقابل pitch.
3. انقل العتبات الجديدة إلى `thresholds.ts`.

**معيار النجاح:** دوران اصطناعي حول المحور الرأسي فقط ← yawRate كبير، horizontalRot ≈ 0. والعكس.

---

### 🟠 A-6 — التقريب لـ [0,25,50,75,100] يُخفي عدم اليقين

**أين:** `lib/liabilityEngine.ts` (نهاية `calculateLiability`).

**التشخيص:**
- `rawFault` يُقرّب لأقرب من خمس قيم. هذا مطلوب قانونياً (نجم) — جيد. **لكن** المشكلة أنه يُعرض كرقم حاسم بغضّ النظر عن مستوى الثقة. rawFault=37 و63 قرب الحدود يقفزان بشكل غير مستقر.
- لا يوجد ربط بين `confidence.level` والرقم المعروض. تقرير بثقة "low" يظهر فيه "75%" بنفس جرأة تقرير بثقة "high".

**الإصلاح:**
1. احتفظ بـ `rawFault` غير المقرّب في النتيجة (حقل جديد `rawFaultPercent`) للشفافية الداخلية.
2. اربط العرض بالثقة:
   - ثقة `high` → اعرض النسبة المقرّبة الواحدة.
   - ثقة `medium` → اعرض **نطاقاً** (مثلاً "بين 50% و75%").
   - ثقة `low` أو `direction==='unknown'` → لا تُصدر نسبة حاسمة؛ اعرض "غير محدد — يتطلب مراجعة" أو 50/50 مع تنويه.
3. أضف هذا المنطق في `calculateLiability` قبل الإرجاع، وأضف حقولاً للتقرير: `rawFaultPercent`, `faultRange?: [number, number]`, `isConclusive: boolean`.

**معيار النجاح:** تقرير باتجاه `unknown` لا يُرجع `isConclusive=true` أبداً، ولا يدّعي نسبة قاطعة.

---

### 🟡 A-7 — `firstContact` يعتمد على ساعة الجوال المحلية

**أين:** `lib/crossVerification.ts` → `generateCrossVerifiedAnalysis`.

**التشخيص:** ساعات الهواتف غير متزامنة (قد تختلف ثوانٍ–دقائق). تحديد "من اصطدم أولاً" من `reportA.timestamp < reportB.timestamp` قد يظلم طرفاً. (نطاق التسامح الزمني صار 60s — جيد، لكن `firstContact` لا يزال هشّاً.)

**الإصلاح:**
1. لا تحدّد `firstContact` من الـ timestamp المحلي إلا إذا كان الفرق أكبر من هامش انجراف معقول (مثلاً > 5s) **وفي نفس الوقت** مدعوماً بدليل مادي (منطقة front عند طرف وrear عند الآخر).
2. أضف حقل `firstContactConfidence: "high"|"low"|"unknown"` واجعله `unknown` عند الاعتماد على timestamp وحده.
3. (مستقبلاً) زامن وقت الحادث مع وقت الخادم عند الرفع بدل ساعة الجهاز.

---

### 🟡 A-8 — تقدير سرعة الطرف الآخر بتكامل مقدار الإشارة

**أين:** `lib/otherPartyAnalysis.ts` → `estimateOtherSpeed`.

**التشخيص:**
- `deltaV` يُحسب بتكامل **مقدار** `gForce` (دائماً موجب) عبر العيّنات الـ impulsive. تكامل المقدار يضخّم الناتج (التذبذبات تتجمّع بدل أن تُلغي بعضها).
- الكتلة `myMass=1500` مثبّتة، والصيغة تقريبية جداً، ثم يُعرض الناتج كرقم "سرعة الطرف الآخر" بدقة 1 كم/س → إيحاء زائف بالدقة.

**الإصلاح:**
1. كامِل المركّبة الطولية ذات الإشارة (من `impact.y` في إطار السيارة) لا المقدار:
   `deltaV += vehicleY[i] * 9.81 * dt;` (مع مراعاة الإشارة).
2. لا تعرض رقماً مفرداً. اعرض **نطاقاً/فئة**: "منخفضة (<30)"، "متوسطة (30–70)"، "عالية (>70)".
3. اخفض `confidencePercent` لهذا التقدير، ووضّح في النص أنه "تقدير فيزيائي تقريبي".

---

### 🟡 A-9 — الـ impulse قد لا يُغلق

**أين:** `lib/sensorUtils.ts` → `recordSample` (تتبّع Impulse).

**التشخيص:** يبدأ الـ impulse عند `gForce>1.5` ويُغلق عند `gForce<0.8`. في مناورة مستمرة (دوران/طريق وعِر) قد يبقى فوق 0.8 طويلاً → `lastImpulseDurationMs` ضخم → تصنيف "مركبة ثقيلة" خطأ.

**الإصلاح:** أضف حدّاً أقصى لمدة الـ impulse (مثلاً 400ms) يُغلقه قسراً، أو أغلقه عند هبوط نسبي عن القمة (مثلاً < 40% من `impulsePeakG`). انقل القيم إلى `thresholds.ts`.

---

### 🟡 A-10 — `speedBeforeBraking` يستخدم peak بدل average

**أين:** `lib/sensorUtils.ts` → `analyzeBraking`. (مُشار إليها سابقاً M-2.)

**التشخيص:** الحقل المُرجَع `decelerationG` يستخدم `peakDecel`، وحساب `speedBeforeBraking` يستخدم `avgDecel` — تأكد من الاتساق. المبالغة في القمة تضخّم السرعة المقدّرة قبل الفرملة.

**الإصلاح:** استخدم `avgDecel` لإعادة بناء السرعة (هو الأصح فيزيائياً)، واحتفظ بـ `peakDecel` كمؤشّر شدّة فقط. وثّق ذلك بتعليق.

---

### 🔵 A-11 — `getPostCrashBuffer` تنسخ كامل الـ buffer

**أين:** `lib/sensorUtils.ts`. الآن تستخدم `TimeWindowBuffer.sliceByTimeRange` (محسّنة مقارنة بالنسخ الكامل القديم). **تحقّق** أنها فعلاً تستدعي `sliceByTimeRange` وليست تنسخ `toArray().filter`. إن وُجد أي مسار ينسخ الكل ثم يفلتر، استبدله بـ `sliceByTimeRange`.

---
## 4. كيف نطوّر الخوارزميات لنتائج أدق ومصداقية أعلى

هذه ليست إصلاحات أخطاء بل ترقيات ترفع جودة النظام بعد إغلاق أخطاء القسم 3.

### 4.1 دمج الحساسات (Sensor Fusion) — الأهم للمصداقية
- المشكلة الجذرية أن قراراً قانونياً يُبنى على حساس واحد (التسارع) في إطار مجهول.
- الحل: ادمج **GPS course + Magnetometer + Gyroscope (تكامل الزاوية)** لتقدير اتجاه السيارة واتجاه الجوال بثقة، مع فلتر تكميلي (complementary filter) أو Kalman اتجاهي مخصّص للزوايا.
- النتيجة: اتجاه/منطقة صدمة قابلة للدفاع، وهي أساس كل المسؤولية.

### 4.2 شفافية الثقة بدل ادّعائها
- لكل تقرير اعرض: مصادر البيانات المتوفّرة (GPS؟ جيروسكوب؟ اتجاه معاير؟)، ومستوى الثقة، وسبب الثقة.
- اربط النسبة القاطعة بالثقة (A-6). تقرير منخفض الثقة = "يحتاج مراجعة بشرية" لا رقم جريء.

### 4.3 إعدادات قابلة للمعايرة من الخادم (Remote Config)
- كل قيم `thresholds.ts` يجب أن تُحمَّل من الخادم مع قيم افتراضية محلية. هذا يسمح بمعايرة الحساسية دون تحديث المتجر (كما أشار تقرير `mostfixit.md`).

### 4.4 معايرة ميدانية وبيانات حقيقية
- أنشئ "وضع تسجيل" يحفظ العيّنات الخام (raw) مع تسمية يدوية (نوع الحادث الفعلي) لبناء مجموعة بيانات اختبار حقيقية (golden dataset).
- اضبط العتبات إحصائياً على هذه البيانات (ROC/precision-recall) بدل التخمين.

### 4.5 معالجة الحالة العامة (Global State — C-1 من المراجعة السابقة)
- `sensorEngine` نسخة مفردة عامة (singleton). مقبول لجلسة واحدة، لكنه يمنع الاختبار المتوازي والمحاكاة.
- الترقية: مرّر `SensorEngine` كـ instance عبر السياق (Context) بدل export عام، أو على الأقل أضف `createSensorEngine()` لتسهيل الاختبار.

### 4.6 توحيد توليد النصوص
- بعض الدوال تستخدم `DynamicText.*` وبعضها `i18n.t(...)` مباشرة. وحّد على نمط واحد (يُفضّل `DynamicText` كطبقة وحيدة فوق i18n) لتفادي نصوص مكسورة أو مختلطة اللغة.

### 4.7 تحسين منطق MUTUAL في التحقق المتقاطع
- في الحوادث الجانبية المزدوجة/المواجهة، السرعة ليست الحاسم بل "من انحرف عن مساره". ادمج `yawRate` من التقريرين، أو أضف حقل "Lane Departure" صريحاً، لتقرير مسؤولية أعدل (راجع `crossVerification.ts`).

---

## 5. خطة الاختبار (إلزامية مع كل إصلاح) — A-12

الوضع الحالي: فقط `liabilityEngine.test.ts` موجود، وهو يغذّي تحليلاً متقدماً مُحضّراً مسبقاً. **كل رياضيات الحساسات بلا اختبار.** هذا أكبر فجوة مصداقية.

### 5.1 ابنِ اختبارات وحدة جديدة في `lib/__tests__/`
أنشئ الملفات التالية:
- `sensorFrame.test.ts` — يختبر `mapToVehicleFrame`:
  - إدخال جاذبية معروفة + تسارع معروف ← مخرجات vX/vY/vZ متوقّعة.
  - بعد إصلاح A-3: مع `phoneYawOffset` معروف، المنطقة صحيحة رغم دوران الجوال.
- `peakDetection.test.ts` — بعد A-2: نبضة 5g لعيّنتين ← `peakG ≥ 4.5`.
- `adaptiveBaseline.test.ts` — استقرار بعد N عيّنة، تجاهل القفزات الكبيرة، تصنيف نوع الطريق.
- `frequencySeparator.test.ts` — إشارة جيبية مستمرة ← `isImpulsive=false`؛ نبضة مفردة ← `isImpulsive=true`.
- `braking.test.ts` — تسلسل تباطؤ ← `brakingDetected=true` بمدّة صحيحة.
- `gyro.test.ts` — بعد A-5: دوران رأسي صرف ← yaw كبير، أفقي ≈ 0.
- `crossVerification.test.ts` — أدوار STRIKER/STRUCK/MUTUAL وحالة rear+rear، وclock drift (A-7).

### 5.2 اختبارات قائمة على الخصائص (Property-Based Testing)
استخدم مكتبة `fast-check` لإثبات خصائص يجب أن تصمد لأي مدخل:
- **تماثل (Symmetry):** صدمة من اليمين بمقدار m تعطي زاوية معكوسة تماماً لصدمة من اليسار بنفس المقدار.
- **حياد التقريب:** ناتج `calculateLiability` دائماً ضمن `{0,25,50,75,100}` ومجموع الطرفين = 100 لأي مدخلات.
- **حدود مقيّدة:** `estimateOtherSpeed` دائماً ضمن [0, 250] لأي مدخلات (لا NaN/Infinity).
- **عدم التأثّر بالوحدة الثابتة:** إضافة جاذبية ثابتة لكل العيّنات لا يُغيّر `gForce` بعد نزع الجاذبية (بعد استقرار التقدير).
- **رتابة الثقة:** زيادة قوة G وثبات باقي العوامل لا تُخفض درجة الثقة.

> ⚠️ عند تشغيل اختبارات PBT بلّغ المستخدم أنها قد تأخذ وقتاً أطول من اختبارات الوحدة العادية.

مثال هيكل PBT:
```typescript
import fc from "fast-check";
import { calculateLiability } from "../liabilityEngine";

test("نسبة المسؤولية دائماً ضمن السلّم القانوني ومجموعها 100", () => {
  fc.assert(fc.property(
    fc.constantFrom("front","rear","side-left","side-right","unknown"),
    fc.double({ min: 0, max: 12, noNaN: true }),   // gForce
    fc.double({ min: 0, max: 200, noNaN: true }),  // speed
    (dir, g, speed) => {
      const r = calculateLiability(dir as any, g, speed);
      expect([0,25,50,75,100]).toContain(r.userFaultPercent);
      expect(r.userFaultPercent + r.otherFaultPercent).toBe(100);
    }
  ));
});
```

### 5.3 أوامر التشغيل (من مجلد `artifacts/strix`)
```bash
# تثبيت fast-check إن لزم
pnpm add -D fast-check
# تشغيل كل الاختبارات مرة واحدة (بدون watch)
npx jest --runInBand
```

---

## 6. قائمة تحقّق نهائية للنموذج المنفّذ

نفّذ بالترتيب، وضع ✅ بعد إتمام كل بند مع اجتياز اختباراته:

- [ ] A-1: بوّابة استقرار قبل الكشف + اختبار.
- [ ] A-2: فصل مسار القمة (impact) عن المُنعّم (smoothed) + اختبار النبضة.
- [ ] A-3: تثبيت اتجاه السيارة (GPS course/Magnetometer) + `directionCalibrated` + اختبار.
- [ ] A-4: تمرير المعدل الحقيقي وإعادة بناء المحركات + اختبار 100Hz.
- [ ] A-5: yaw/أفقي للجيروسكوب بشكل صحيح + اختبار.
- [ ] A-6: ربط النسبة بالثقة + `rawFaultPercent` + `isConclusive`.
- [ ] A-7: `firstContactConfidence` + شرط الدليل المادي.
- [ ] A-8: تكامل بإشارة + عرض نطاق بدل رقم دقيق.
- [ ] A-9: إغلاق قسري للـ impulse + اختبار.
- [ ] A-10: استخدام avg للـ speedBeforeBraking.
- [ ] A-11: التأكد من `sliceByTimeRange` (لا نسخ كامل).
- [ ] A-12: ملفات اختبار الحساسات + PBT تمر بالكامل.
- [ ] تشغيل `npx jest` نهائياً = كل الاختبارات خضراء.
- [ ] لا أرقام سحرية جديدة (كلها في `thresholds.ts`).

---

## 7. ملاحظات مرجعية

- الملفات الأساسية: `lib/sensorUtils.ts`, `lib/kalmanFilter.ts`, `lib/liabilityEngine.ts`, `lib/advancedAnalysis.ts`, `lib/crossVerification.ts`, `lib/otherPartyAnalysis.ts`, `lib/thresholds.ts`, `context/SessionContext.tsx`.
- الإعدادات الافتراضية الحالية: `crashThresholdG=2.0`, `sampleRateHz=50`, `gyroThreshold=80°/s`.
- وحدات الحساسات: `expo-sensors` Accelerometer **بوحدة g وتشمل الجاذبية** (لذلك نطرح الجاذبية يدوياً)؛ Gyroscope **بوحدة rad/s**.
- مراجعات سابقة ذات صلة: `codereview.md` (المجلد الجذري) و`lib/mostfixit.md` — هذا الملف يكمّلها ويصحّح أولوياتها (الأخطر A-2 وA-3 لم يُبرَزا فيها بوضوح).

> **الخلاصة:** المحرك مبنيّ بعناية ومنظّم جيداً، لكن مصداقيته مهدّدة بثلاث مشاكل جذرية: تنعيم القمة (A-2)، غموض اتجاه الجوال (A-3)، وغياب بوّابة الاستقرار (A-1). إصلاح هذه الثلاثة + بناء اختبارات الحساسات (A-12) ينقل النظام من "يعمل غالباً" إلى "قابل للدفاع أمام جهة قانونية".

---

## 8. حالة التنفيذ (تم تطبيقها على مراحل)

> نُفّذت الإصلاحات على مرحلتين مع تشغيل `tsc --noEmit` و`jest` بعد كل مرحلة. **النتيجة النهائية: typecheck نظيف + 28 اختباراً ناجحاً في 4 ملفات.**

### المرحلة 1 (المحرك الأساسي)
| البند | الحالة | ما تم فعله | الملفات |
|------|--------|-----------|---------|
| **A-1** | ✅ مُنفَّذ | أُضيفت `isEngineReady()` (تتطلب استقرار baseline + إحماء)، ورُبطت كبوّابة قبل `analyzeImpact` | `sensorUtils.ts`, `SessionContext.tsx` |
| **A-2** | ✅ مُنفَّذ | استُبدل Kalman الثقيل على مسار الكشف بـ **median-of-3** على الخام منزوع الجاذبية → يحفظ قمة الصدمة ويرفض السبايك المفرد | `sensorUtils.ts` |
| **A-4** | ✅ مُنفَّذ | `setSampleRate` يعيد بناء `FrequencySeparator` و`AdaptiveBaseline` بالمعدل الحقيقي؛ وُسّعت سعة `gyroHistory` إلى 700 (تكفي 6s@100Hz) | `sensorUtils.ts` |
| **A-5** | ✅ مُنفَّذ | yaw = إسقاط على الجاذبية، والأفقي = المقدار المتعامد؛ **وتصحيح وحدات** (kان يُخرج rad/s بينما المحرك يتوقّع deg/s — لذا كشف تغيير المسار كان شبه معطّل) | `sensorUtils.ts` |
| **A-6** | ✅ مُنفَّذ | أُضيف `rawFaultPercent` و`isConclusive` و`faultRange`؛ والثقة تُخفَّض عن "high" إذا الاتجاه غير معاير | `liabilityEngine.ts`, `SessionContext.tsx`, `types.ts` |
| **A-9** | ✅ مُنفَّذ | إغلاق الـ impulse عند هبوط مطلق/نسبي عن القمة أو تجاوز 400ms (يمنع تضخيم مدة الصدمة) | `sensorUtils.ts` |

### المرحلة 2 (المصداقية والتحقق)
| البند | الحالة | ما تم فعله | الملفات |
|------|--------|-----------|---------|
| **A-3** | ⚙️ جزئي (آمن) | أُضيفت بنية المعايرة: `phoneYawOffset` + تدوير في `mapToVehicleFrame` (هوية عند عدم المعايرة = صفر انحدار) + `setPhoneYawOffset` + `isDirectionCalibrated` + الصدق في الثقة (A-6). **المتبقّي:** ربط مصدر اتجاه فعلي (GPS course/Magnetometer) — قرار منتج، انظر أدناه | `sensorUtils.ts`, `liabilityEngine.ts` |
| **A-7** | ✅ مُنفَّذ | `firstContact` لا يُحدَّد إلا إذا تجاوز الفرق الزمني هامش الانجراف (`CLOCK_DRIFT_MARGIN_MS=5s`)، دون إفساد حالة التطابق | `crossVerification.ts`, `thresholds.ts` |
| **A-8** | ✅ مُنفَّذ | قُصر تكامل ΔV على نافذة 500ms حول الصدمة (كان يمسح كامل الـ buffer ≈ مبالغة)، وتقريب السرعة لأقرب 5 | `otherPartyAnalysis.ts` |
| **A-10** | ✅ مؤكَّد | `analyzeBraking` يستخدم بالفعل `avgDecel` لإعادة بناء السرعة (و`peakDecel` كمؤشّر شدّة فقط) — لا تغيير مطلوب | `sensorUtils.ts` |
| **A-11** | ✅ مؤكَّد | `getPostCrashBuffer` يستخدم بالفعل `sliceByTimeRange` (لا نسخ كامل) — لا تغيير مطلوب | `sensorUtils.ts` |
| **A-12** | ✅ مُنفَّذ | أُضيفت 3 ملفات اختبار جديدة (sensorEngine, liabilityConfidence, crossVerification) = 19 اختباراً جديداً + اختبار خصائص بالحلقات | `lib/__tests__/` |

### المتبقّي (قرارات منتج — لم تُنفَّذ تجنّباً للهلوسة)
1. **A-3 — مصدر اتجاه فعلي:** المعايرة الحقيقية تتطلب اشتراك `Magnetometer` + دمجه مع `GPS course` لحساب `phoneYawOffset`. هذه ميزة قائمة بذاتها (fusion) ولها مخاطرها الفيزيائية، ويجب أن تُبنى بقرار واضح (هل الجوال مثبّت أم لا). البنية جاهزة: فقط استدعِ `setPhoneYawOffset(rad)` من طبقة الاتجاه عند بنائها. حتى ذلك الحين، النظام **صادق**: يخفض الثقة ويعلّم `directionCalibrated=false`.
2. **القسم 4 (تحسينات الخوارزميات):** Remote Config، معايرة ميدانية، إزالة الـ singleton، توحيد النصوص، تحسين MUTUAL — ترقيات مستقبلية لم تُلمَس في هذه الجولة.

### كيف تتحقّق محلياً
```bash
cd artifacts/strix
npx tsc -p tsconfig.json --noEmit   # يجب أن يكون نظيفاً
npx jest --verbose                  # يجب أن تمر كل الاختبارات (28)
```
