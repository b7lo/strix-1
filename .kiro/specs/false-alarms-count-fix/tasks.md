# Implementation Plan

## Overview

يعالج هذا المخطط خلل الاحتساب المزدوج للبلاغات الكاذبة في معالج
`GET /api/dashboard/stats` (`artifacts/api-server/src/routes/dashboard.ts`)، باتّباع
منهجية إصلاح الخلل الاستكشافية: أولًا نكتب اختبار شرط الخلل لإظهار الأمثلة المضادّة
(counterexamples) على الكود غير المُصلَح، ثم نكتب اختبارات الحفاظ على السلوك ونتأكّد من
نجاحها على الكود غير المُصلَح، ثم ننفّذ الإصلاح (إضافة مُرشِّح استبعاد للبلاغات الكاذبة
إلى الاستعلامات الستة المشتقة من الحوادث)، وأخيرًا نتحقّق من إصلاح الخلل (Fix Checking)
وعدم حدوث انحدار (Preservation Checking).

- **شرط الخلل C(X):** `isBugCondition(X) = EXISTS(SELECT 1 FROM false_alarms fa WHERE fa.accident_id = X.id)` — الحادث له صف مقابل في جدول `false_alarms`.
- **الخاصية P:** الحادث المطابق لشرط الخلل يُستبعد من كل الإحصائيات المشتقة من الحوادث (`totalAccidents`، `totalMatchedAccidents`، `averageGForce`، `accidentsBySeverity`، `accidentsByImpactZone`، `accidentsByDay`) ويُحتسب فقط ضمن `totalFalseAlarms`.
- **الحفاظ ¬C(X):** الحوادث غير الكاذبة والإحصائيات المستقلة (`totalFalseAlarms`، `totalAssessments`، `totalLeads`، `averageNajmDifference`) ونقاط النهاية الأخرى تبقى دون تغيير (F = F').

> **بيئة الاختبار:** لا يوجد حاليًا إطار اختبار مُهيّأ في `artifacts/api-server`. تتطلّب
> المهمة 0 تهيئة إطار اختبار قياسي (مثل `vitest`) مع أداة اختبار مبني على الخصائص
> (`fast-check`)، وقاعدة بيانات اختبار (test DB) مبذّرة تتضمّن مزيجًا من الحوادث الكاذبة
> وغير الكاذبة. شغّل الاختبارات بوضع التنفيذ الواحد (`vitest --run`) وليس وضع المراقبة.

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 0,
      "description": "Test tooling and seeded test database setup",
      "tasks": ["0"]
    },
    {
      "wave": 1,
      "description": "Exploration and preservation tests before the fix (independent of each other)",
      "tasks": ["1", "2"],
      "dependsOn": ["0"]
    },
    {
      "wave": 2,
      "description": "Fix implementation and re-run of Property 1 / Property 2 tests",
      "tasks": ["3"],
      "dependsOn": ["1", "2"]
    },
    {
      "wave": 3,
      "description": "Checkpoint - full suite green",
      "tasks": ["4"],
      "dependsOn": ["3"]
    }
  ]
}
```

قواعد الترتيب:
- المهمة 1 (Bug Condition) والمهمة 2 (Preservation) يجب كتابتهما وتشغيلهما **قبل** أي كود إصلاح (المهمة 3+).
- اختبار المهمة 1 يجب أن **يفشل** على الكود غير المُصلَح (يُثبت الخلل)، واختبارات المهمة 2 يجب أن **تنجح** على الكود غير المُصلَح (خط الأساس الواجب الحفاظ عليه).
- يعتمد الإصلاح (المهمة 3) على المهمتين 1 و2. المهمّتان 3.2 و3.3 تُعيدان تشغيل **نفس** اختبارات المهمتين 1 و2.

## Tasks

- [x] 0. تهيئة إطار الاختبار وقاعدة بيانات الاختبار المبذّرة
  - تهيئة إطار اختبار قياسي (مثل `vitest`) في `artifacts/api-server`، مع تثبيت `fast-check` كاعتماد تطويري للاختبار المبني على الخصائص.
  - تهيئة قاعدة بيانات اختبار (test DB) وأداة بذر (seeding) تسمح بإدراج حوادث في `accidents` وربط مجموعة فرعية منها بصفوف في `false_alarms` عبر `false_alarms.accident_id = accidents.id`.
  - توفير أداة مساعدة لاستدعاء معالج `GET /api/dashboard/stats` (أو استخراج منطقه) وقراءة استجابة JSON في الاختبارات.
  - _Requirements: 2.1, 3.1_

- [-] 1. كتابة اختبار شرط الخلل الاستكشافي (Bug Condition Exploration Test)
  - **Property 1: Bug Condition** - استبعاد البلاغات الكاذبة من إحصائيات الحوادث
  - **مهم:** اكتب هذا الاختبار المبني على الخصائص **قبل** تنفيذ الإصلاح.
  - **حرِج:** يجب أن **يفشل** هذا الاختبار على الكود غير المُصلَح — الفشل يؤكّد وجود الخلل.
  - **لا تحاول إصلاح الاختبار أو الكود عند فشله في هذه المرحلة.**
  - **ملاحظة:** يُرمِّز هذا الاختبار السلوك المتوقّع، وسيُستخدَم لاحقًا للتحقّق من الإصلاح عندما ينجح بعد التنفيذ.
  - **الهدف:** إظهار أمثلة مضادّة تُثبت الاحتساب المزدوج (double counting).
  - **نهج PBT المُوجَّه (Scoped PBT):** بما أنّ الخلل حتمي (استعلامات قاعدة بيانات)، وجّه الخاصية إلى حالات فشل ملموسة عبر بذر قاعدة الاختبار بحوادث كاذبة (لكل منها صف مقابل في `false_alarms`).
  - بذر حادث كاذب واحد فقط ثم استدعاء `GET /api/dashboard/stats`، والتأكيد أن `totalAccidents = 0` و`totalFalseAlarms = 1` (شرط الخلل: `isBugCondition(X) = EXISTS(SELECT 1 FROM false_alarms fa WHERE fa.accident_id = X.id)`).
  - التأكيد لكل حادث يحقّق شرط الخلل: أنه غير محتسَب في `totalAccidents` و`totalMatchedAccidents`، وغير داخل في `averageGForce` و`accidentsBySeverity` و`accidentsByImpactZone` و`accidentsByDay`، ومحتسَب فقط في `totalFalseAlarms` (مطابقة Expected Behavior في التصميم).
  - تغطية حالة `totalMatchedAccidents` (حادث كاذب له `matched_accident_id`) وحالة التجميعات/المتوسط (حادث كاذب بشدّة و`peak_g_force` معلومين).
  - تغطية الحالة الحدّية: مجموعة حوادث كلها كاذبة — والتوقّع `totalAccidents = 0` وتجميعات فارغة و`averageGForce = 0` بينما `totalFalseAlarms = N`.
  - تشغيل الاختبار على الكود **غير المُصلَح**.
  - **النتيجة المتوقّعة:** الاختبار **يفشل** (هذا صحيح — يُثبت وجود الخلل).
  - توثيق الأمثلة المضادّة المرصودة (مثال: حادث كاذب واحد يعطي `totalAccidents = 1` و`totalFalseAlarms = 1` معًا) لفهم السبب الجذري.
  - تُعتبر المهمة مكتملة عند كتابة الاختبار وتشغيله وتوثيق الفشل.
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [~] 2. كتابة اختبارات الحفاظ على السلوك (Preservation Property Tests) — قبل تنفيذ الإصلاح
  - **Property 2: Preservation** - عدم تغيّر الحوادث غير الكاذبة والإحصائيات الأخرى
  - **مهم:** اتّبع منهجية الرصد أولًا (observation-first): شغّل الكود غير المُصلَح لمدخلات لا تحقّق شرط الخلل (`¬C`)، وارصد المخرجات الفعلية، ثم اكتب اختبارات تؤكّد تلك المخرجات عبر مجال المدخلات.
  - **يُوصى بالاختبار المبني على الخصائص (Property-Based Testing)** لأنّ الحفاظ على السلوك خاصّية شاملة ("لكل المدخلات غير الكاذبة")؛ توليد حالات كثيرة تلقائيًا يلتقط الحالات الحدّية ويوفّر ضمانًا أقوى.
  - رصد سلوك الكود غير المُصلَح لمجموعة حوادث بلا أي بلاغ كاذب، ثم كتابة خاصّية: لكل المدخلات التي لا تحقّق شرط الخلل، تبقى `totalAccidents` وكل الإحصائيات المشتقة من الحوادث (`totalMatchedAccidents`، `averageGForce`، `accidentsBySeverity`، `accidentsByImpactZone`، `accidentsByDay`) مطابقة قبل الإصلاح وبعده (F = F').
  - توليد مجموعات عشوائية من الحوادث مع تعليم مجموعة فرعية عشوائية كبلاغات كاذبة، والتحقّق أنّ عدد الحوادث المستبعدة يساوي عدد الحوادث الكاذبة المرتبطة (خاصّية الاحتساب الأحادي)، مع بقاء مساهمة الحوادث غير الكاذبة ثابتة.
  - التأكيد أنّ `totalFalseAlarms` يساوي عدد صفوف `false_alarms`، وأنّ `totalAssessments` و`totalLeads` و`averageNajmDifference` لم تتغيّر (إحصائيات مستقلة عن تصنيف البلاغ الكاذب).
  - التأكيد أنّ نقطتي النهاية `GET /api/dashboard/accidents` و`GET /api/dashboard/false-alarms` تُرجِعان الصفوف نفسها مع مؤشّر `isFalseAlarm` دون تغيير في المحتوى.
  - تشغيل الاختبارات على الكود **غير المُصلَح**.
  - **النتيجة المتوقّعة:** الاختبارات **تنجح** (تؤكّد السلوك الأساسي الواجب الحفاظ عليه).
  - تُعتبر المهمة مكتملة عند كتابة الاختبارات وتشغيلها ونجاحها على الكود غير المُصلَح.
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. إصلاح احتساب البلاغات الكاذبة في معالج `GET /api/dashboard/stats`

  - [~] 3.1 تنفيذ الإصلاح
    - الملف: `artifacts/api-server/src/routes/dashboard.ts` — الدالة: معالج `router.get("/stats", ...)`.
    - تعريف مُرشِّح استبعاد موحّد قابل لإعادة الاستخدام للبلاغات الكاذبة، ويُفضَّل أسلوب `NOT EXISTS`: ``sql`NOT EXISTS (SELECT 1 FROM false_alarms fa WHERE fa.accident_id = ${accidentsTable.id})` `` (بديل مكافئ: `LEFT JOIN falseAlarmsTable` مع ``where(sql`${falseAlarmsTable.id} IS NULL`)``).
    - `totalAccidents`: إضافة شرط الاستبعاد إلى استعلام العدّ على `accidentsTable`.
    - `totalMatchedAccidents`: دمج شرط الاستبعاد مع الشرط القائم `isNotNull(accidentsTable.matchedAccidentId)` عبر `and(...)`.
    - `averageGForce`: إضافة شرط الاستبعاد إلى استعلام `avg(peakGForce)`.
    - `accidentsBySeverity` و`accidentsByImpactZone`: إضافة شرط الاستبعاد قبل `groupBy` في الاستعلامين.
    - `accidentsByDay`: دمج شرط الاستبعاد مع الشرط الزمني القائم (`timestamp >= now() - interval '30 days'`) عبر `and(...)`.
    - عدم المساس بـ `totalFalseAlarms` و`totalAssessments` و`totalLeads` و`averageNajmDifference`، ولا بأيّ نقطة نهاية أخرى في الملف.
    - _Bug_Condition: isBugCondition(X) = EXISTS(SELECT 1 FROM false_alarms fa WHERE fa.accident_id = X.id) (من التصميم)_
    - _Expected_Behavior: استبعاد X من كل الإحصائيات المشتقة من الحوادث واحتسابه فقط ضمن totalFalseAlarms (Property 1 في التصميم)_
    - _Preservation: Preservation Requirements من التصميم (الحوادث غير الكاذبة والإحصائيات المستقلة ونقاط النهاية الأخرى دون تغيير)_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [~] 3.2 التحقّق من أنّ اختبار شرط الخلل الاستكشافي أصبح ناجحًا
    - **Property 1: Expected Behavior** - استبعاد البلاغات الكاذبة من إحصائيات الحوادث
    - **مهم:** أعِد تشغيل **نفس** الاختبار من المهمة 1 — لا تكتب اختبارًا جديدًا.
    - يُرمِّز اختبار المهمة 1 السلوك المتوقّع؛ نجاحه يؤكّد تحقّق Fix Checking لكل مدخل يحقّق شرط الخلل.
    - **النتيجة المتوقّعة:** الاختبار **ينجح** (يؤكّد إصلاح الخلل وإزالة الاحتساب المزدوج).
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [~] 3.3 التحقّق من أنّ اختبارات الحفاظ على السلوك ما زالت ناجحة
    - **Property 2: Preservation** - عدم تغيّر الحوادث غير الكاذبة والإحصائيات الأخرى
    - **مهم:** أعِد تشغيل **نفس** الاختبارات من المهمة 2 — لا تكتب اختبارات جديدة.
    - **النتيجة المتوقّعة:** الاختبارات **تنجح** (تؤكّد عدم حدوث انحدار — Preservation Checking).
    - التأكيد أنّ كل الاختبارات ما زالت ناجحة بعد الإصلاح (لا انحدار).
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [~] 4. نقطة تحقّق (Checkpoint) — التأكّد من نجاح كل الاختبارات
  - تشغيل مجموعة الاختبارات كاملة والتأكّد من نجاحها جميعًا (اختبار شرط الخلل + اختبارات الحفاظ على السلوك).
  - التأكّد من عدم وجود تداخل في العدّ بين `totalAccidents` و`totalFalseAlarms` و`/accidents` و`/false-alarms`.
  - تنظيف أي ملفات مؤقتة أُنشئت أثناء الاستكشاف.
  - في حال ظهور أي إشكال أو نتيجة غير متوقّعة، توقّف واسأل المستخدم.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

## Notes

- **F / F':** `F` دالة حساب الإحصائيات قبل الإصلاح (الكود الحالي في `/api/dashboard/stats`)، و`F'` بعد الإصلاح.
- **Counterexample:** حادث واحد `A` له صف في `false_alarms`. حاليًا `totalAccidents = 1` و`totalFalseAlarms = 1` (احتساب مزدوج). المتوقّع بعد الإصلاح: `totalAccidents = 0` و`totalFalseAlarms = 1`.
- **الإحصائيات المشتقة من الحوادث** (تُطبَّق عليها مُرشِّح الاستبعاد): `totalAccidents`، `totalMatchedAccidents`، `averageGForce`، `accidentsBySeverity`، `accidentsByImpactZone`، `accidentsByDay`.
- **ما لا يُلمَس** (لا تغيير): `totalFalseAlarms`، `totalAssessments`، `totalLeads`، `averageNajmDifference`، وكل نقاط النهاية الأخرى (`/accidents`، `/false-alarms`، `/accidents/:id`، `/assessments`، `/matched`، `/leads`).
- **السبب الجذري الأرجح:** غياب مُرشِّح الاستبعاد في استعلامات الحوادث الستة داخل `/stats`، بينما تستخدم `/accidents` بالفعل `leftJoin(falseAlarmsTable, ...)` — ما يؤكّد توفّر العلاقة اللازمة لكنها غير مُستغلّة في `/stats`.
