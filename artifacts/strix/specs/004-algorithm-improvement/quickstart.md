# Phase 0 Quickstart — Algorithm Baseline

## المتطلبات

- Node.js وpnpm وفق إعدادات المستودع.
- تثبيت الاعتمادات من جذر المستودع باستخدام `pnpm install`.

## تشغيل فحص TypeScript للتطبيق

```bash
cd /home/b7lo/strix-test/Strix-Assets-main
pnpm --filter @workspace/strix run typecheck
```

## تشغيل اختبارات Strix

```bash
cd /home/b7lo/strix-test/Strix-Assets-main
pnpm --filter @workspace/strix exec jest --runInBand
```

## تشغيل تقييم الخوارزمية

لعرض النتيجة دون تعديل الملفات:

```bash
cd /home/b7lo/strix-test/Strix-Assets-main
pnpm --filter @workspace/strix run evaluate:algorithm
```

لتحديث baseline المحفوظ عمدًا:

```bash
cd /home/b7lo/strix-test/Strix-Assets-main
pnpm --filter @workspace/strix run evaluate:algorithm -- --write
```

لا يستخدم `--write` داخل الاختبارات الاعتيادية. يجب مراجعة فرق `current.json` قبل اعتماده لأن تغيره يعني تغير سلوك المحرك أو fixtures.

## التحقق قبل Pull Request

```bash
cd /home/b7lo/strix-test/Strix-Assets-main
pnpm --filter @workspace/strix run typecheck
pnpm --filter @workspace/strix exec jest --runInBand
pnpm --filter @workspace/strix run evaluate:algorithm
git diff --check
```

## تفسير المقاييس

- `precision`: نسبة التنبيهات المكتشفة التي كانت حوادث متوقعة.
- `recall`: نسبة الحوادث المتوقعة التي اكتشفها المحرك.
- `falseAlarmsPerHour`: عدد الإيجابيات الكاذبة مقسومًا على مجموع مدة الحالات السلبية بالساعات.
- `zoneAccuracy`: دقة المنطقة، ويحسب عدم اكتشاف الحادث كمنطقة غير صحيحة.
- `ece`: يبقى `null` في Phase 0 حتى تتوفر احتمالات وثقة مراجعة قابلة للمعايرة.

## تنبيه

نتيجة fixtures الاصطناعية ليست تقديرًا لأداء المنتج في الشارع. الغرض منها تثبيت regression baseline حتمي فقط. الأرقام الميدانية تحتاج تسجيلات متنوعة مجهولة الهوية ومراجعة بشرية.
