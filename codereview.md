# تقرير مراجعة الكود — Strix v2 (Delta Review)

**المقارنة:** النسخة الجديدة مقابل التقرير السابق | **التاريخ:** 2026-06-24

---

## ملخص: ماذا أُصلح؟

| المعرّف | المشكلة                                       | الحالة                        |
| ------- | --------------------------------------------- | ----------------------------- |
| C-1     | Global Mutable State في sensorUtils           | ⏳ **لم يُصلَح**              |
| C-2     | لا يوجد Auth Token على Strix API              | ✅ **مُصلَح**                 |
| C-3     | `report_json` يحمل GPS دقيق                   | ✅ **مُصلَح**                 |
| M-1     | خلل `getRandomPhrase`                         | ✅ **مُصلَح**                 |
| M-2     | `speedBeforeBraking` يستخدم peak بدل average  | ⏳ **لم يُصلَح**              |
| M-3     | `calculateCrossLiability` لا تعالج rear+rear  | ✅ **مُصلَح**                 |
| M-4     | `getPostCrashBuffer` تنسخ الـ buffer كاملاً   | ⏳ **لم يُصلَح**              |
| M-5     | `linkAccidents` يكتب report_json للطرف الثاني | ✅ **مُصلَح (جزئياً)**        |
| M-6     | كشف الدوار بدون شرط السرعة                    | ⏳ **لم يُصلَح**              |
| M-7     | XSS في SVG النصوص الديناميكية                 | ✅ **مُصلَح**                 |
| I-1     | Process Noise لا يتكيف مع نوع الطريق          | ✅ **مُصلَح**                 |
| I-2     | لا يوجد Offline Queue                         | ✅ **مُصلَح**                 |
| I-3     | `haversineDistance` مكررة                     | ✅ **مُصلَح** (`geoUtils.ts`) |
| I-5     | لا يوجد `unregisterBackgroundTask`            | ✅ **مُصلَح**                 |

**النتيجة: 9 من 14 مشكلة مُصلَحة ✅ — 4 لا تزال قائمة ⏳ — 1 مُصلَح جزئياً**

---

## ✅ ما أُصلح بشكل ممتاز

### C-2 — Auth Token ✅

```typescript
// الجديد — صحيح
const token = await AsyncStorage.getItem("@strix_auth_token");
if (token) headers["Authorization"] = `Bearer ${token}`;
```

ملاحظة: الـ token اختياري (`if (token)`) — إذا لم يكن موجوداً يُرسَل الطلب بدونه. هذا مقبول كـ graceful degradation لكن يجب توثيق متى يكون الـ endpoint مفتوحاً.

### C-3 — GPS Sanitization ✅

```typescript
function sanitizeReportForStorage(report: AccidentReport): AccidentReport {
  const sanitized = { ...report };
  if (typeof sanitized.latitude === "number")
    sanitized.latitude = Number(sanitized.latitude.toFixed(3));
  if (typeof sanitized.longitude === "number")
    sanitized.longitude = Number(sanitized.longitude.toFixed(3));
  return sanitized;
}
```

`toFixed(3)` = دقة ~111 متر. جيد للخصوصية. **لكن:** الـ sanitization لا تشمل `otherParty` إذا كانت تحتوي إحداثيات، ولا `advancedAnalysis` الذي قد يحتوي بيانات حساسة مضمّنة. الإطار صحيح لكن التغطية غير كاملة.

### M-5 — linkAccidents ✅ (جزئي)

```typescript
// الجديد — السطر معلّق بتعليق واضح
// if (otherReportUpdated) payload2.report_json = otherReportUpdated; // Prevent overwriting
```

الإصلاح صحيح. لكن `otherReportUpdated` و `ownReportUpdated` لا تزالان تُبنيان في الكود فوقه ولا تُستخدمان للطرف الثاني — يمكن تنظيف هذا الكود الميت.

### I-2 — Offline Queue ✅

التنفيذ صحيح مع deduplication وretry loop واضح. **ملاحظة واحدة:** `processOfflineQueue` لا تُستدعى تلقائياً عند استعادة الاتصال — يجب تشغيلها من `NetInfo` event أو عند startup التطبيق.

### I-1 — adaptToRoadType ✅

```typescript
adaptToRoadType(roadType: "smooth" | "normal" | "rough"): void {
  let processNoise = 0.008;
  if (roadType === "smooth") processNoise = 0.005;
  else if (roadType === "rough") processNoise = 0.02;
  // applies to kx, ky, kz
}
```

تنفيذ ممتاز ومتسق مع المنطق الموثّق.

---

## 🔴 C-1 — لا تزال قائمة: Global Mutable State

**الخطورة:** حرجة | **الملف:** `sensorUtils.ts`

لم يتغير شيء. جميع المتغيرات لا تزال module-level globals:

```typescript
let lastGForceMag = 0;
let currentSpeedKmh = 0;
const kalmanAccel = new KalmanFilter3D(0.008, 0.1);
const ringBuffer = new TimeWindowBuffer<RingSample>(1000);
```

هذا أهم مشكلة متبقية ويجب أن تكون الأولوية القادمة.

---

## 🟡 M-2 — لا تزال قائمة: `speedBeforeBraking` غير دقيقة

**الخطورة:** متوسطة | **الملف:** `sensorUtils.ts`

```typescript
// لا يزال نفس الكود
const speedBeforeBraking = speedKmh + peakDecel * 9.81 * durationSec * 3.6;
// peakDecel = أعلى قيمة، ليس المتوسط → يبالغ في تقدير السرعة قبل الفرملة
```

---

## 🟡 M-4 — لا تزال قائمة: `getPostCrashBuffer` تنسخ كل الـ buffer

**الخطورة:** متوسطة | **الملف:** `sensorUtils.ts`

```typescript
// لا يزال
return ringBuffer
  .toArray()
  .filter((s) => s.ts > crashTimestamp && s.ts <= endTs);
// toArray() ينسخ 1000 عنصر ثم filter — O(n) غير ضروري
```

---

## 🟡 M-6 — لا تزال قائمة: كشف الدوار بدون شرط السرعة

**الخطورة:** متوسطة | **الملف:** `advancedAnalysis.ts`

```typescript
// لا يزال بدون قيد السرعة
if (sustainedDuration >= ROUNDABOUT_MIN_DURATION_MS) {
  result.roadType = "roundabout"; // U-turn بسرعة 80 كم/س يُصنَّف دواراً!
}
```

---

## 🆕 ملاحظات جديدة على الكود المُضاف

### N-1 — `processOfflineQueue` لا تُشغَّل تلقائياً

**الخطورة:** منخفضة | **الملف:** `accidentSync.ts`

```typescript
export async function processOfflineQueue(): Promise<void> { ... }
```

الدالة موجودة لكن لا يوجد استدعاء تلقائي. يجب إضافة:

```typescript
// في App.tsx أو SessionContext
import NetInfo from "@react-native-community/netinfo";
NetInfo.addEventListener((state) => {
  if (state.isConnected) processOfflineQueue();
});
```

### N-2 — `sanitizeReportForStorage` لا تُعمِّق التنظيف

**الخطورة:** منخفضة | **الملف:** `accidentSync.ts`

```typescript
function sanitizeReportForStorage(report: AccidentReport): AccidentReport {
  const sanitized = { ...report }; // shallow copy فقط
  // otherParty?.latitude/longitude لا تُنظَّف
  // advancedAnalysis.roadContext.wasStationary لا تُنظَّف
}
```

### N-3 — `linkAccidents` فيها كود ميت

**الخطورة:** صفر (تنظيف فقط) | **الملف:** `accidentSync.ts`

```typescript
// هذا الكود يُبنى ولكن لا يُستخدم فعلياً
const otherReportUpdated: AccidentReport | undefined = otherReport ? { ... } : undefined;
// ثم يُمرَّر لـ linkAccidents التي تتجاهله
```

يمكن حذف بناء `otherReportUpdated` كاملاً أو إبقاؤه مع تعليق يوضّح أنه محجوز للمستقبل.

---

## الأولويات المتبقية

| المعرّف | الملف               | الخطورة   | الأولوية     |
| ------- | ------------------- | --------- | ------------ |
| C-1     | sensorUtils.ts      | 🔴 حرجة   | **1 — فوري** |
| M-2     | sensorUtils.ts      | 🟡 متوسطة | 2            |
| M-6     | advancedAnalysis.ts | 🟡 متوسطة | 3            |
| M-4     | sensorUtils.ts      | 🟡 متوسطة | 4            |
| N-1     | accidentSync.ts     | 🔵 منخفضة | 5            |
| N-2     | accidentSync.ts     | 🔵 منخفضة | 6            |
| N-3     | accidentSync.ts     | 🔵 تنظيف  | 7            |

---

## الحكم النهائي

**Request Changes → تقدم ممتاز** — 9 من 14 مشكلة أُصلحت في دفعة واحدة وهو معدل ممتاز. الملف الوحيد الذي لم يُلمَس هو `sensorUtils.ts` وهو يحتوي على C-1 الحرجة وM-2 وM-4. الجولة القادمة يجب أن تُركّز بالكامل على هذا الملف.
