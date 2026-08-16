# Sensor Recorder & Replay Runner Guide

## الهدف

يسجل النظام أحداث الحساسات المرتبة زمنيًا في ذاكرة محدودة، ثم يعيد تشغيلها عبر `SensorPipeline` نفسه بصورة حتمية. التسجيل تشخيصي واختياري ولا يكتب إلى القرص تلقائيًا.

## تفعيل التسجيل الحي

أضف إلى ملف `.env` المحلي غير المتتبع:

```text
EXPO_PUBLIC_STRIX_SENSOR_RECORDING=true
```

ثم أعد تشغيل Expo مع تنظيف cache. عند بدء جلسة، ينشأ `SensorRecorder`. عند إيقافها، تحفظ آخر نسخة في الذاكرة داخل `SessionContext`.

واجهات السياق:

- `getLastReplay()` تعيد الكائن الخام داخل التطبيق.
- `exportLastReplayJson()` تعيد JSON آمنًا يخفي الموقع والوقت المطلق افتراضيًا.

لا توجد كتابة تلقائية أو رفع شبكي للتسجيلات.

## صيغة SensorReplayV1

يحمل التسجيل:

- `schemaVersion`.
- `engineVersion`.
- `thresholdConfigVersion`.
- metadata للجهاز والمنصة ومعدل العينات.
- أحداث accelerometer وgyroscope وlocation.
- حالة المعايرة وجودة المحرك.
- قرارات candidate/rejected/confirmed.

كل توقيت داخل `samples` هو `tMs` نسبي أحادي التزايد، وليس timestamp مطلقًا.

## الخصوصية

السلوك الافتراضي لـ `exportReplayJson`:

- حذف latitude وlongitude.
- تصفير `startedAtMs`.
- تحويل session ID إلى معرف مجهول.

يمكن تضمين موقع مقرب صراحة لأغراض اختبار معتمدة:

```typescript
exportReplayJson(replay, {
  includeLocation: true,
  coordinateDecimals: 3,
});
```

لا ترفع ملفات ميدانية إلى Git قبل المراجعة وإزالة الهوية والموافقة اللازمة.

## تشغيل fixture

من جذر المستودع:

```bash
pnpm --filter @workspace/strix run evaluate:algorithm -- \
  --replay lib/__fixtures__/replay/front-impact.json
```

يعرض الأمر:

- عدد العينات المعالجة.
- المدة الافتراضية.
- عدد الأحداث حسب النوع.
- تسلسل قرارات الكشف.

Replay لا ينتظر الوقت الحقيقي؛ يستخدم `VirtualReplayClock`.

## إضافة تسجيل جديد

1. تحقق منه باستخدام `sensorReplayV1Schema`.
2. تأكد أن `tMs` مرتب تصاعديًا.
3. صدّره عبر `exportReplayJson`.
4. احذف الموقع الدقيق والمعرفات.
5. أضف وصفًا يوضح السيناريو والمصدر والجهاز.
6. أضف اختبار regression يشرح السلوك المتوقع.

## حدود Phase 1

- Phase 1 يثبت التسجيل، المخطط، الخصوصية، الترتيب والحتمية.
- تحويل جميع الحسابات إلى زمن فعلي يتم في Phase 2.
- State Machine الجديدة وتنقية المطبات تنفذ في Phase 3.
- البيانات الميدانية لا تعد جزءًا من المستودع افتراضيًا.
