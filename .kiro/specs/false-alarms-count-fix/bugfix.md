# وثيقة متطلبات إصلاح الخلل (Bugfix Requirements)

## Introduction

في لوحة تحكم المشرف (Strix Admin Dashboard)، تُحتسب الحوادث المُصنّفة كبلاغات كاذبة
(الإنذارات الكاذبة) ضمن عدّاد "إجمالي الحوادث" وضمن كل الإحصائيات المشتقة من الحوادث،
بالإضافة إلى احتسابها ضمن "الإنذارات الكاذبة". هذا يؤدي إلى احتساب مزدوج (double counting)
ويضخّم أرقام الحوادث الفعلية في اللوحة.

مصدر الخلل هو نقطة النهاية `GET /api/dashboard/stats` في الخادم
(`artifacts/api-server/src/routes/dashboard.ts`)، حيث تُحسب الإحصائيات المشتقة من الحوادث
عبر `COUNT/AVG/GROUP BY` على جدول `accidents` كاملاً دون استبعاد الصفوف المرتبطة بجدول
`false_alarms` (المرتبط عبر `false_alarms.accident_id = accidents.id`).

المطلوب: أن تُعامل البلاغات الكاذبة كفئة مستقلة فقط، فلا تُحتسب ضمن "إجمالي الحوادث"
ولا ضمن أي إحصائية مشتقة من الحوادث في اللوحة، مع إبقاء احتسابها ضمن "الإنذارات الكاذبة"
كما هو.

**نطاق الإصلاح المتفق عليه:** استبعاد البلاغات الكاذبة من عدّاد "إجمالي الحوادث" ومن جميع
الإحصائيات المشتقة من الحوادث (توزيع الشدة، مناطق الاصطدام، النشاط الزمني لآخر 30 يوم،
متوسط قوة G، والحوادث المشتركة).

## Bug Analysis

### Current Behavior (Defect)

السلوك الحالي (الخلل):

عند وجود حادث مرتبط بصف في جدول `false_alarms`، تحتسبه اللوحة كحادث حقيقي في الإحصائيات:

1.1 WHEN يوجد حادث مصنّف كبلاغ كاذب (له صف في `false_alarms`) THEN the system يحتسبه ضمن عدّاد "إجمالي الحوادث" (`totalAccidents`)

1.2 WHEN يوجد حادث مصنّف كبلاغ كاذب وله `matched_accident_id` THEN the system يحتسبه ضمن عدّاد "الحوادث المشتركة" (`totalMatchedAccidents`)

1.3 WHEN يوجد حادث مصنّف كبلاغ كاذب THEN the system يُدخِل قيمته ضمن متوسط قوة G (`averageGForce`) وضمن التجميعات المشتقة من الحوادث (`accidentsBySeverity`، `accidentsByImpactZone`، `accidentsByDay`)

1.4 WHEN يوجد حادث مصنّف كبلاغ كاذب THEN the system يحتسبه في آنٍ واحد ضمن "إجمالي الحوادث" وضمن "الإنذارات الكاذبة" (احتساب مزدوج)

### Expected Behavior (Correct)

السلوك المتوقع (الصحيح):

2.1 WHEN يوجد حادث مصنّف كبلاغ كاذب (له صف في `false_alarms`) THEN the system SHALL يستبعده من عدّاد "إجمالي الحوادث" (`totalAccidents`)

2.2 WHEN يوجد حادث مصنّف كبلاغ كاذب وله `matched_accident_id` THEN the system SHALL يستبعده من عدّاد "الحوادث المشتركة" (`totalMatchedAccidents`)

2.3 WHEN يوجد حادث مصنّف كبلاغ كاذب THEN the system SHALL يستبعد قيمته من متوسط قوة G (`averageGForce`) ومن التجميعات المشتقة من الحوادث (`accidentsBySeverity`، `accidentsByImpactZone`، `accidentsByDay`)

2.4 WHEN يوجد حادث مصنّف كبلاغ كاذب THEN the system SHALL يحتسبه فقط ضمن "الإنذارات الكاذبة" (`totalFalseAlarms`) دون أي احتساب مزدوج ضمن إحصائيات الحوادث

### Unchanged Behavior (Regression Prevention)

السلوك الذي يجب ألّا يتغيّر (منع الانحدار):

3.1 WHEN يوجد حادث غير مصنّف كبلاغ كاذب (لا يملك صفًا في `false_alarms`) THEN the system SHALL CONTINUE TO احتسابه ضمن "إجمالي الحوادث" وضمن كل الإحصائيات المشتقة من الحوادث كما كان

3.2 WHEN تُحسب "الإنذارات الكاذبة" (`totalFalseAlarms`) THEN the system SHALL CONTINUE TO احتساب جميع صفوف جدول `false_alarms` كما هو دون تغيير

3.3 WHEN تُحسب الإحصائيات غير المشتقة من الحوادث (`totalAssessments`، `totalLeads`، `averageNajmDifference`) THEN the system SHALL CONTINUE TO احتسابها كما هي دون تغيير

3.4 WHEN يُعرض جدول التفاصيل للحوادث (`GET /api/dashboard/accidents`) أو قائمة البلاغات الكاذبة (`GET /api/dashboard/false-alarms`) THEN the system SHALL CONTINUE TO عرض الصفوف مع مؤشّر `isFalseAlarm` كما هو دون تغيير في المحتوى

## اشتقاق شرط الخلل (Bug Condition Derivation)

### دالة شرط الخلل — isBugCondition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type AccidentRow
  OUTPUT: boolean

  // الحادث يُعدّ ضمن شرط الخلل إذا كان له صف مقابل في جدول false_alarms
  RETURN EXISTS(
    SELECT 1 FROM false_alarms fa
    WHERE fa.accident_id = X.id
  )
END FUNCTION
```

### خاصية التحقق من الإصلاح — Fix Checking

```pascal
// Property: Fix Checking — البلاغات الكاذبة مستبعدة من إحصائيات الحوادث
FOR ALL X WHERE isBugCondition(X) DO
  stats ← computeDashboardStats'()   // بعد الإصلاح (F')
  ASSERT X NOT counted IN stats.totalAccidents
  ASSERT X NOT counted IN stats.totalMatchedAccidents
  ASSERT X NOT included IN stats.averageGForce
  ASSERT X NOT included IN stats.accidentsBySeverity
  ASSERT X NOT included IN stats.accidentsByImpactZone
  ASSERT X NOT included IN stats.accidentsByDay
  ASSERT X counted IN stats.totalFalseAlarms
END FOR
```

### خاصية الحفاظ على السلوك — Preservation Checking

```pascal
// Property: Preservation Checking — الحوادث غير الكاذبة والإحصائيات الأخرى دون تغيير
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)   // مساهمة الحادث في كل الإحصائيات تبقى كما كانت قبل الإصلاح
END FOR

// الإحصائيات المستقلة عن تصنيف البلاغ الكاذب تبقى ثابتة
ASSERT F.totalFalseAlarms   = F'.totalFalseAlarms
ASSERT F.totalAssessments   = F'.totalAssessments
ASSERT F.totalLeads         = F'.totalLeads
ASSERT F.averageNajmDifference = F'.averageNajmDifference
```

**التعريفات:**
- **F**: دالة حساب الإحصائيات قبل الإصلاح (الكود الحالي في `/api/dashboard/stats`).
- **F'**: دالة حساب الإحصائيات بعد الإصلاح.
- **Counterexample (مثال يوضّح الخلل):** حادث واحد `A` له صف في `false_alarms`. حاليًا:
  `totalAccidents = 1` و`totalFalseAlarms = 1` (احتساب مزدوج). المتوقع بعد الإصلاح:
  `totalAccidents = 0` و`totalFalseAlarms = 1`.
