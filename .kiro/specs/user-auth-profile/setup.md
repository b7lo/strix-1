# إعداد المصادقة الخارجي — Supabase Auth + Sign in with Apple

<!-- خطوات الإعداد خارج الكود لتشغيل ميزة المصادقة وملف المستخدم -->

هذا الدليل يغطّي الإعداد اللازم في لوحات التحكم الخارجية (Supabase + Apple)
لتشغيل ميزة `user-auth-profile`. الكود جاهز؛ هذه الخطوات تُفعّل المزوّدات.

## 1. Supabase Auth

### مزوّد البريد (Email)
1. Dashboard → Authentication → Providers → **Email**: فعّله.
2. فعّل **Confirm email** (تأكيد البريد إلزامي — القرار 3).
3. Authentication → URL Configuration:
   - أضِف Redirect URL: `strix://auth-callback`.
4. للإنتاج: اضبط **SMTP مخصّص** (Project Settings → Auth → SMTP) لتفادي حدود
   البريد الافتراضية.

### مزوّد Apple
1. Dashboard → Authentication → Providers → **Apple**: فعّله.
2. أدخِل:
   - **Services ID** (معرّف الخدمة من Apple Developer).
   - **Team ID**، **Key ID**، ومحتوى مفتاح `.p8`.
3. تأكّد أن **Client IDs** يتضمّن `com.strix.app` (bundle identifier للتطبيق)
   حتى يُقبل تدفّق iOS الأصلي عبر `signInWithIdToken`.

## 2. Apple Developer

1. **App ID** (`com.strix.app`): فعّل خاصية **Sign in with Apple**.
2. أنشئ **Services ID** واربطه بالنطاق/الـ App ID.
3. أنشئ مفتاح **Sign in with Apple Key** (`.p8`) واحفظ Key ID + Team ID.
4. في التطبيق: `app.json` مضبوط مسبقاً بـ `ios.usesAppleSignIn: true`
   وإضافة `expo-apple-authentication`. أعد بناء التطبيق (dev/prod client)
   حتى تظهر الأهلية (entitlement). لا يعمل تدفّق Apple في Expo Go/المحاكي.

## 3. متغيّرات البيئة

### التطبيق (strix/.env) — عامة فقط
راجع `strix/.env.example`:
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIX_API_URL` (لحذف الحساب عبر `/api/account`)
- `EXPO_PUBLIC_STRIX_INGEST_KEY`

### الخادم (api-server/.env) — سرّي، على Coolify فقط
راجع `api-server/.env.example`:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (لحذف الحساب — لا تُكشف للتطبيق أبداً).

> ⚠️ **أمان**: مفتاح `service_role` يمنح صلاحيات كاملة تتجاوز RLS. يُضبط في
> بيئة الخادم فقط، ولا يُوضع في التطبيق أو الريبو (خاصية الأمان 4 / المتطلب 5.5).

## 4. تحقّق يدوي (E2E) — جهاز حقيقي

1. **تسجيل بالبريد**: أنشئ حساباً → استلم بريد التأكيد → فعّل → سجّل الدخول.
2. **منع الدخول قبل التأكيد**: حاول الدخول قبل التأكيد → رسالة "أكّد بريدك".
3. **دخول Apple**: على iOS حقيقي → إكمال الملف (الميلاد/المدينة/الهاتف) → الرئيسية.
4. **تعديل الملف**: الإعدادات → تعديل الملف الشخصي → احفظ → تأكيد.
5. **حذف الحساب**: الإعدادات → حذف الحساب → تأكيد → العودة لشاشة الدخول والتأكّد
   من زوال بيانات المستخدم (accidents المرتبطة به) عبر لوحة التحكم.
