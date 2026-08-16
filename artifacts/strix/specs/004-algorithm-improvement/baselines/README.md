# Algorithm Baseline Fixtures

## baseline الحالي

- الملف: `current.json`
- إصدار المخطط: `1`
- إصدار المحرك: `strix-sensor-engine-v7.3-baseline`
- معدل fixtures الحالي: `50Hz`
- المصدر: synthetic فقط
- الجهاز: `generic-synthetic`
- نوع المركبة: passenger car افتراضية

## الحالات الإيجابية

| Fixture | السيناريو | المنطقة المتوقعة | المصدر |
|---|---|---|---|
| `synthetic-front-crash-50hz` | اصطدام أمامي | front | synthetic |
| `synthetic-rear-crash-50hz` | اصطدام خلفي | rear | synthetic |
| `synthetic-side-right-crash-50hz` | اصطدام جانبي أيمن | side-right | synthetic |

## الحالات السلبية

| Fixture | السيناريو | المدة المستخدمة في المقياس | المصدر |
|---|---|---:|---|
| `synthetic-smooth-drive-50hz` | قيادة ناعمة | 60 ثانية | synthetic |
| `synthetic-hard-braking-50hz` | فرملة قوية | 60 ثانية | synthetic |
| `synthetic-single-pothole-50hz` | حفرة مفردة | 60 ثانية | synthetic |
| `synthetic-phone-drop-50hz` | سقوط هاتف | 60 ثانية | synthetic |

## القيود

1. البيانات الاصطناعية تتحقق من الحتمية والأسلاك البرمجية وليست بديلًا عن البيانات الميدانية.
2. `falseAlarmsPerHour` حساس جدًا لمدة الحالات السلبية؛ لا يستخدم كتقدير إنتاجي قبل جمع ساعات قيادة فعلية.
3. الحالات الحالية واضحة وغير حدية، لذلك قد تظهر precision وrecall كاملتين.
4. لا توجد حاليًا معايرة ECE لأن fixtures لا تحمل احتمالات مراجعة بشرية.
5. لا يضاف تسجيل ميداني إلى Git قبل إزالة الموقع الدقيق والمعرفات والحصول على الموافقات اللازمة.

## إضافة fixture

كل fixture يجب أن يحتوي على:

- معرف فريد.
- source ونوع الجهاز والمركبة والطريق.
- sample rate والمدة.
- النتيجة المتوقعة بعد مراجعة.
- وصف يوضح سبب إضافته.

أي عطل إنتاجي يجب أن يضيف fixture regression قبل إصلاح المنطق.
