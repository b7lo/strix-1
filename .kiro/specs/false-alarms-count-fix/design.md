# تصميم إصلاح الخلل: احتساب البلاغات الكاذبة (false-alarms-count-fix)

## Overview

نقطة النهاية `GET /api/dashboard/stats` في
`artifacts/api-server/src/routes/dashboard.ts` تحسب الإحصائيات المشتقة من الحوادث
(`totalAccidents`، `totalMatchedAccidents`، `averageGForce`، `accidentsBySeverity`،
`accidentsByImpactZone`، `accidentsByDay`) عبر استعلامات `COUNT/AVG/GROUP BY` على جدول
`accidents` بأكمله، دون استبعاد الصفوف التي لها صف مقابل في جدول `false_alarms`
(المرتبط عبر `false_alarms.accident_id = accidents.id`). في الوقت نفسه، تُحسب
`totalFalseAlarms` من جدول `false_alarms`. النتيجة: كل حادث مصنّف كبلاغ كاذب يُحتسب
مرّتين (احتساب مزدوج) — مرّة ضمن الحوادث ومرّة ضمن البلاغات الكاذبة — ما يضخّم أرقام
الحوادث في اللوحة.

**نهج الإصلاح (Fix Approach):** إضافة مُرشِّح استبعاد للبلاغات الكاذبة إلى الاستعلامات
الستة المشتقة من الحوادث فقط. الأسلوب المُختار هو `LEFT JOIN` على `false_alarms` مع شرط
`WHERE false_alarms.id IS NULL` (أو ما يكافئه `NOT EXISTS`)، بحيث تُستبعد أي صفوف حوادث
لها بلاغ كاذب مقابل. تبقى `totalFalseAlarms` والإحصائيات غير المشتقة من الحوادث
(`totalAssessments`، `totalLeads`، `averageNajmDifference`) دون تغيير، وكذلك نقاط النهاية
الأخرى (`/accidents`، `/false-alarms`).

الإصلاح مُوجَّه وأدنى ما يمكن (targeted & minimal): يقتصر على دالة معالج `GET /stats`
دون المساس بمنطق أو مخطّط قاعدة البيانات.

## Glossary

- **Bug_Condition (C)**: شرط الخلل — الحادث `X` له صف مقابل في جدول `false_alarms`
  (`EXISTS(SELECT 1 FROM false_alarms WHERE accident_id = X.id)`)، ومع ذلك يُحتسب ضمن
  إحصائيات الحوادث.
- **Property (P)**: السلوك المرغوب — الحادث المطابق لشرط الخلل يُستبعد من كل الإحصائيات
  المشتقة من الحوادث ويُحتسب فقط ضمن `totalFalseAlarms`.
- **Preservation**: الحوادث غير الكاذبة (`¬C`) والإحصائيات المستقلة عن تصنيف البلاغ الكاذب
  يجب أن تبقى قيمها كما هي تمامًا قبل الإصلاح.
- **stats handler**: معالج `router.get("/stats", ...)` في
  `artifacts/api-server/src/routes/dashboard.ts` الذي يجمّع كل الإحصائيات ويعيدها كـ JSON.
- **accident-derived stats (الإحصائيات المشتقة من الحوادث)**: `totalAccidents`،
  `totalMatchedAccidents`، `averageGForce`، `accidentsBySeverity`،
  `accidentsByImpactZone`، `accidentsByDay`.
- **`false_alarms.accident_id`**: مفتاح خارجي فريد (`unique`) يربط البلاغ الكاذب بالحادث
  (`onDelete: set null`)؛ وجود صف بقيمة `accident_id` مطابقة هو ما يحدّد شرط الخلل.
- **F / F'**: `F` دالة حساب الإحصائيات قبل الإصلاح، و`F'` بعد الإصلاح.

## Bug Details

### Bug Condition

يتحقّق الخلل عندما يكون هناك حادث `X` في جدول `accidents` له صف مقابل في جدول
`false_alarms` عبر `false_alarms.accident_id = X.id`. الاستعلامات المشتقة من الحوادث في
معالج `/stats` لا تستبعد هذه الصفوف، فتُدخِلها في العدّ/المتوسط/التجميع، بينما يُحتسب الصف
نفسه أيضًا ضمن `totalFalseAlarms` — أي احتساب مزدوج.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type AccidentRow
  OUTPUT: boolean

  RETURN EXISTS(
    SELECT 1 FROM false_alarms fa
    WHERE fa.accident_id = X.id
  )
END FUNCTION
```

### Examples

- **مثال 1 (العدّاد الأساسي):** حادث واحد `A` له صف في `false_alarms`.
  - المتوقع: `totalAccidents = 0`، `totalFalseAlarms = 1`.
  - الفعلي (الخلل): `totalAccidents = 1`، `totalFalseAlarms = 1` (احتساب مزدوج).
- **مثال 2 (الحوادث المشتركة):** حادث كاذب `B` له `matched_accident_id` غير فارغ.
  - المتوقع: لا يُحتسب ضمن `totalMatchedAccidents`.
  - الفعلي (الخلل): يُحتسب ضمن `totalMatchedAccidents`.
- **مثال 3 (التجميعات والمتوسط):** حادث كاذب `C` بشدّة `severity=high` و`peak_g_force=9.0`.
  - المتوقع: لا يُحسب في `accidentsBySeverity[high]` ولا في `averageGForce`.
  - الفعلي (الخلل): يرفع عدّاد `high` ويدخل في متوسط قوة G.
- **مثال حدّي (Edge case):** مجموعة حوادث كلها كاذبة (كل `accidents` لها صفوف في
  `false_alarms`).
  - المتوقع: `totalAccidents = 0` وكل التجميعات فارغة و`averageGForce = 0`، بينما
    `totalFalseAlarms = N`.

## Expected Behavior

### Preservation Requirements

**السلوكيات التي يجب ألّا تتغيّر (Unchanged Behaviors):**
- احتساب الحوادث غير الكاذبة (التي لا تملك صفًا في `false_alarms`) ضمن `totalAccidents`
  وكل الإحصائيات المشتقة من الحوادث كما كان تمامًا.
- احتساب `totalFalseAlarms` من كل صفوف جدول `false_alarms` دون تغيير.
- احتساب الإحصائيات غير المشتقة من الحوادث (`totalAssessments`، `totalLeads`،
  `averageNajmDifference`) دون تغيير.
- عرض نقاط النهاية الأخرى (`GET /api/dashboard/accidents`،
  `GET /api/dashboard/false-alarms`، `GET /api/dashboard/accidents/:id`،
  `/assessments`، `/matched`، `/leads`) مع مؤشّر `isFalseAlarm` دون تغيير في المحتوى.

**النطاق (Scope):**
كل المدخلات التي لا تحقّق شرط الخلل (`¬C`) يجب أن تكون غير متأثّرة بالإصلاح إطلاقًا،
ويشمل ذلك:
- الحوادث الحقيقية التي لا يوجد لها صف في `false_alarms`.
- استعلامات ونتائج نقاط النهاية الأخرى غير `/stats`.
- الإحصائيات المستقلة عن الحوادث والبلاغات الكاذبة.

**ملاحظة:** السلوك الصحيح المطلوب للمدخلات التي تحقّق شرط الخلل مُعرَّف في قسم
Correctness Properties (الخاصية 1)، بينما يركّز هذا القسم على ما يجب ألّا يتغيّر.

## Hypothesized Root Cause

بناءً على تحليل الكود في `dashboard.ts`، السبب الجذري الأرجح:

1. **غياب مُرشِّح الاستبعاد في استعلامات الحوادث**: الاستعلامات الستة المشتقة من الحوادث
   في معالج `/stats` تبني `FROM accidentsTable` مباشرة دون أي `JOIN` أو `WHERE` يستبعد
   الصفوف المرتبطة بجدول `false_alarms`. وعلى النقيض، فإن نقطة النهاية `/accidents`
   تستخدم بالفعل `leftJoin(falseAlarmsTable, ...)` لحساب `isFalseAlarm`، ما يؤكّد توفّر
   العلاقة اللازمة لكنها غير مُستغلّة في `/stats`.

2. **معاملة البلاغ الكاذب كفئة متداخلة بدل فئة مستقلة**: التصميم الحالي يترك الحادث في جدول
   `accidents` بعد تصنيفه كبلاغ كاذب (لا يُحذف)، فيظهر في كلا الإحصائيتين. لم يُتّخذ قرار
   صريح باستبعاده من إحصائيات الحوادث.

3. **استعلامات مستقلة غير متّسقة**: `totalAccidents` و`totalFalseAlarms` تُحسبان من
   جدولين منفصلين باستعلامين منفصلين دون ربط منطقي بينهما يمنع التداخل.

السبب الأكثر ترجيحًا هو (1): يكفي إضافة مُرشِّح استبعاد للبلاغات الكاذبة إلى الاستعلامات
الستة لإزالة الاحتساب المزدوج.

## Correctness Properties

Property 1: Bug Condition — استبعاد البلاغات الكاذبة من إحصائيات الحوادث

_For any_ حادث يحقّق شرط الخلل (`isBugCondition` يُرجِع `true`، أي له صف مقابل في
`false_alarms`)، يجب على معالج `/stats` بعد الإصلاح (F') ألّا يحتسب هذا الحادث ضمن
`totalAccidents` ولا `totalMatchedAccidents`، وألّا يُدخِل قيمته في `averageGForce` ولا
في التجميعات `accidentsBySeverity` و`accidentsByImpactZone` و`accidentsByDay`، مع بقائه
محتسبًا ضمن `totalFalseAlarms` فقط (لا احتساب مزدوج).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — عدم تغيّر الحوادث غير الكاذبة والإحصائيات الأخرى

_For any_ مدخل لا يحقّق شرط الخلل (`isBugCondition` يُرجِع `false`)، يجب أن يُنتج الكود
بعد الإصلاح (F') النتيجة نفسها التي ينتجها الكود قبل الإصلاح (F)، بحيث تبقى مساهمة الحوادث
غير الكاذبة في كل الإحصائيات المشتقة كما كانت، وتبقى `totalFalseAlarms` و`totalAssessments`
و`totalLeads` و`averageNajmDifference` ومحتوى نقاط النهاية الأخرى دون تغيير.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

بافتراض صحّة تحليل السبب الجذري:

**File**: `artifacts/api-server/src/routes/dashboard.ts`

**Function**: معالج `router.get("/stats", ...)`

**التغييرات المحدّدة (Specific Changes):**

1. **إضافة مُرشِّح استبعاد قابل لإعادة الاستخدام**: تعريف شرط استبعاد موحّد يُطبَّق على كل
   استعلامات الحوادث، عبر `LEFT JOIN` على `falseAlarmsTable` مع شرط
   `WHERE ${falseAlarmsTable.id} IS NULL`، أو عبر `NOT EXISTS`:
   ```
   sql`NOT EXISTS (SELECT 1 FROM false_alarms fa WHERE fa.accident_id = ${accidentsTable.id})`
   ```
   يُفضَّل أسلوب `NOT EXISTS` لأنه لا يتطلّب `JOIN` ويقلّل احتمال تكرار الصفوف في التجميعات.

2. **`totalAccidents`**: إضافة شرط الاستبعاد إلى استعلام العدّ على `accidentsTable`.

3. **`totalMatchedAccidents`**: دمج شرط الاستبعاد مع الشرط القائم
   `isNotNull(accidentsTable.matchedAccidentId)` عبر `and(...)`.

4. **`averageGForce`**: إضافة شرط الاستبعاد إلى استعلام `avg(peakGForce)`.

5. **`accidentsBySeverity` و`accidentsByImpactZone`**: إضافة شرط الاستبعاد قبل
   `groupBy` في الاستعلامين.

6. **`accidentsByDay`**: دمج شرط الاستبعاد مع الشرط الزمني القائم
   (`timestamp >= now() - interval '30 days'`) عبر `and(...)`.

**ما لا يُلمَس (No Change):** استعلامات `totalFalseAlarms`، `totalAssessments`،
`totalLeads`، `averageNajmDifference`، وكل نقاط النهاية الأخرى في الملف تبقى كما هي.

## Testing Strategy

### Validation Approach

نتبع نهجًا من مرحلتين: أولًا نُظهِر أمثلة مضادّة (counterexamples) توضّح الخلل على الكود
غير المُصلَح، ثم نتحقّق من أن الإصلاح يعمل بشكل صحيح ويحافظ على السلوك القائم. يُوصى بأن
تعمل الاختبارات على قاعدة بيانات اختبار (test DB) مع بيانات مُبذَّرة (seeded) تتضمّن مزيجًا
من الحوادث الكاذبة وغير الكاذبة.

### Exploratory Bug Condition Checking

**Goal**: إظهار أمثلة مضادّة تُثبت الخلل قبل تنفيذ الإصلاح، وتأكيد أو دحض تحليل السبب
الجذري. إن دُحِض، نُعيد صياغة الفرضية.

**Test Plan**: بذر قاعدة الاختبار بحادث واحد له صف مقابل في `false_alarms`، ثم استدعاء
`GET /api/dashboard/stats` على الكود غير المُصلَح ورصد قيم الإحصائيات.

**Test Cases**:
1. **totalAccidents Test**: بذر حادث كاذب واحد فقط، والتوقّع أن `totalAccidents = 0`
   (سيفشل على الكود غير المُصلَح ويعطي `1`).
2. **totalMatchedAccidents Test**: بذر حادث كاذب له `matched_accident_id`، والتوقّع
   استبعاده (سيفشل على الكود غير المُصلَح).
3. **averageGForce / التجميعات Test**: بذر حادث كاذب بقيمة `peak_g_force` وشدّة معلومة،
   والتوقّع عدم دخوله في المتوسط والتجميعات (سيفشل على الكود غير المُصلَح).
4. **Edge Case Test**: بذر مجموعة حوادث كلها كاذبة، والتوقّع `totalAccidents = 0` وتجميعات
   فارغة (سيفشل على الكود غير المُصلَح).

**Expected Counterexamples**:
- `totalAccidents` و`totalFalseAlarms` يعطيان القيمة نفسها للحادث الكاذب (احتساب مزدوج).
- الأسباب المحتملة: غياب مُرشِّح الاستبعاد في استعلامات الحوادث، معاملة البلاغ الكاذب كفئة
  متداخلة، استعلامات مستقلة غير متّسقة.

### Fix Checking

**Goal**: التحقّق من أنه لكل مدخل يحقّق شرط الخلل، ينتج الكود المُصلَح السلوك المتوقّع.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  stats := computeDashboardStats_fixed()
  ASSERT X NOT counted IN stats.totalAccidents
  ASSERT X NOT counted IN stats.totalMatchedAccidents
  ASSERT X NOT included IN stats.averageGForce
  ASSERT X NOT included IN stats.accidentsBySeverity
  ASSERT X NOT included IN stats.accidentsByImpactZone
  ASSERT X NOT included IN stats.accidentsByDay
  ASSERT X counted IN stats.totalFalseAlarms
END FOR
```

### Preservation Checking

**Goal**: التحقّق من أنه لكل مدخل لا يحقّق شرط الخلل، ينتج الكود المُصلَح النتيجة نفسها
التي ينتجها الكود الأصلي.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT computeDashboardStats_original(X) = computeDashboardStats_fixed(X)
END FOR

ASSERT F.totalFalseAlarms      = F'.totalFalseAlarms
ASSERT F.totalAssessments      = F'.totalAssessments
ASSERT F.totalLeads            = F'.totalLeads
ASSERT F.averageNajmDifference = F'.averageNajmDifference
```

**Testing Approach**: يُوصى بالاختبار المبني على الخصائص (Property-Based Testing) للتحقّق
من الحفاظ على السلوك لأنه:
- يولّد حالات اختبار كثيرة تلقائيًا عبر مجال المدخلات (خلائط عشوائية من الحوادث الكاذبة
  وغير الكاذبة).
- يلتقط الحالات الحدّية التي قد تفوتها اختبارات الوحدة اليدوية.
- يوفّر ضمانًا قويًا بأن السلوك لم يتغيّر لكل المدخلات غير الكاذبة.

**Test Plan**: رصد سلوك الكود غير المُصلَح لمجموعة حوادث لا تتضمّن أي بلاغ كاذب، ثم كتابة
اختبارات مبنية على الخصائص تؤكّد بقاء النتائج نفسها بعد الإصلاح.

**Test Cases**:
1. **Non-False-Alarm Preservation**: توليد مجموعة حوادث بلا بلاغات كاذبة، والتحقّق أن كل
   الإحصائيات المشتقة من الحوادث مطابقة قبل الإصلاح وبعده.
2. **totalFalseAlarms Preservation**: التحقّق أن `totalFalseAlarms` يساوي عدد صفوف
   `false_alarms` قبل الإصلاح وبعده.
3. **Independent Stats Preservation**: التحقّق أن `totalAssessments`، `totalLeads`،
   `averageNajmDifference` لم تتغيّر.
4. **Other Endpoints Preservation**: التحقّق أن `/accidents` و`/false-alarms` لا تزال
   تُرجِع الصفوف نفسها مع مؤشّر `isFalseAlarm`.

### Unit Tests

- اختبار `totalAccidents` مع مزيج من الحوادث الكاذبة وغير الكاذبة (التحقّق من العدّ الصحيح).
- اختبار `totalMatchedAccidents` مع حوادث كاذبة لها `matched_accident_id`.
- اختبار `averageGForce` والتجميعات مع استبعاد الحوادث الكاذبة.
- اختبار الحالات الحدّية: كل الحوادث كاذبة، لا حوادث كاذبة، جدول فارغ.

### Property-Based Tests

- توليد مجموعات عشوائية من الحوادث مع تعليم مجموعة فرعية عشوائية كبلاغات كاذبة، والتحقّق
  من أن مجموع الحوادث المستبعدة يساوي عدد الحوادث الكاذبة (خاصية الاحتساب الأحادي).
- توليد تكوينات عشوائية والتحقّق من أن `totalAccidents + (الحوادث الكاذبة المرتبطة) `
  متّسق، وأن الإحصائيات المشتقة لا تشمل أي حادث كاذب.
- توليد سيناريوهات عشوائية للحوادث غير الكاذبة والتحقّق من ثبات النتائج (Preservation).

### Integration Tests

- اختبار التدفّق الكامل لـ `GET /api/dashboard/stats` على قاعدة اختبار مبذّرة والتحقّق من
  كل حقول الاستجابة.
- اختبار الاتّساق بين `totalAccidents` و`totalFalseAlarms` و`/accidents` و`/false-alarms`
  (عدم وجود تداخل في العدّ).
- اختبار أن تغيير حالة حادث إلى بلاغ كاذب (إضافة صف في `false_alarms`) ينقله من عدّاد
  الحوادث إلى عدّاد البلاغات الكاذبة دون احتساب مزدوج.
