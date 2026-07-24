# Design Document

<!-- وثيقة التصميم — المصادقة وملف المستخدم (Authentication & User Profile) -->

## Overview

نضيف مصادقة إلزامية لتطبيق Strix عبر **Supabase Auth** بطريقتين: البريد + كلمة
المرور، وSign in with Apple. بعد الدخول، لكل مستخدم **ملف شخصي** في جدول `profiles`،
وتُربط الحوادث الجديدة بمعرّف المستخدم. يوفّر النظام حذف حساب نهائياً (cascade) عبر
عملية آمنة على الخادم (service role).

يبني هذا التصميم على البنية الحالية:
- تطبيق Expo/React Native (strix) — واجهة المستخدم والجلسة.
- api-server (Express + Drizzle) — عمليات الخادم الحسّاسة (حذف الحساب).
- Supabase (Postgres + Auth + RLS) — المصادقة والتخزين.

### مبادئ التصميم

- **الأمان أولاً**: مفاتيح service role تبقى على الخادم فقط. الوصول للبيانات محكوم بـ RLS.
- **أقل تغيير ممكن**: نعيد استخدام `expo-secure-store` و`scheme: strix` الموجودين.
- **توافق تدريجي**: لا نكسر تدفّق مزامنة الحوادث الحالي؛ ننقله للمصادقة بأمان.

## Architecture

```
┌─────────────────────────────┐
│      تطبيق Strix (Expo)      │
│                             │
│  AuthContext ── supabase-js │◄── جلسة (JWT) في SecureStore
│     │                       │
│     ├── Email/Password ──────────────┐
│     ├── Apple (expo-apple-auth) ──────┤
│     ├── Profile CRUD (RLS)            │
│     └── Delete Account ──────┐        │
└──────────────────────────────┼────────┼──────────┘
                               │        │
                    (service   │        │ (anon + user JWT)
                     role)     ▼        ▼
              ┌──────────────────┐   ┌────────────────────────┐
              │    api-server    │   │      Supabase          │
              │  DELETE /account │──►│  Auth + Postgres + RLS │
              │  (service_role)  │   │  profiles / accidents  │
              └──────────────────┘   └────────────────────────┘
```

### القرارات التقنية الرئيسية

1. **عميل `@supabase/supabase-js`** في التطبيق لإدارة المصادقة والجلسة وتجديد
   التوكن تلقائياً، مع مُخزِّن مخصّص يعتمد `expo-secure-store` لحفظ الجلسة بأمان.
2. **Apple** عبر `expo-apple-authentication` (تدفّق أصلي) ثم تمرير `identityToken`
   إلى `supabase.auth.signInWithIdToken`.
3. **الملف الشخصي** جدول `profiles` منفصل مرتبط بـ `auth.users(id)`، تُنشأ صفوفه
   عبر trigger عند إنشاء المستخدم، وتُحكم بـ RLS (كل مستخدم صفّه فقط).
4. **حذف الحساب** عبر مسار في api-server يستخدم `service_role` (الوحيد القادر على
   حذف `auth.users`)، مع حذف تسلسلي (ON DELETE CASCADE) لكل بيانات المستخدم.
5. **ربط الحوادث**: إضافة عمود `user_id` إلى `accidents` وتحويل مزامنة التطبيق
   لاستخدام توكن المستخدم بدل anon key فقط، ليعمل RLS على مستوى المالك.

## Data Models

### جدول `profiles` (جديد)

| العمود | النوع | القيود |
|--------|------|--------|
| `id` | `uuid` | PK، FK إلى `auth.users(id)` ON DELETE CASCADE |
| `full_name` | `text` | NOT NULL |
| `birth_date` | `date` | NOT NULL، CHECK: العمر ≥ 18 |
| `city` | `text` | NOT NULL |
| `phone` | `text` | NOT NULL |
| `email` | `text` | يُملأ من `auth.users.email` (قد يكون Apple relay) |
| `created_at` | `timestamptz` | DEFAULT now() |
| `updated_at` | `timestamptz` | DEFAULT now()، trigger للتحديث |

قيد العمر (تحقق على مستوى قاعدة البيانات كطبقة أخيرة):
```sql
CHECK (birth_date <= (CURRENT_DATE - INTERVAL '18 years'))
```

### تعديل جدول `accidents`

- إضافة عمود `user_id uuid` مع `REFERENCES auth.users(id) ON DELETE CASCADE`.
- يبقى `device_id` للتوافق ولربط الجلسات الحالية.
- عند الحذف: حذف حساب المستخدم يحذف حوادثه، وبفضل الـ FK الحالية تُحذف
  `fault_assessments`, `false_alarms`, و`cross_verified_analyses` المرتبطة تسلسلياً.

### سياسات RLS

- `profiles`: `SELECT/UPDATE` مسموح فقط WHERE `auth.uid() = id`. `INSERT` عبر
  trigger (SECURITY DEFINER) لا عبر العميل.
- `accidents`: تحديث السياسات ليقرأ/يكتب المستخدم صفوفه (`auth.uid() = user_id`)،
  مع الإبقاء على مسار المطابقة بين المستخدمين (يُدار عبر الخادم بصلاحية أوسع عند اللزوم).

## Components and Interfaces

### 1. عميل Supabase (`lib/supabaseClient.ts`) — جديد
- ينشئ `createClient` بمُخزِّن `expo-secure-store`، مع `autoRefreshToken` و`persistSession`.

### 2. `AuthContext` (`context/AuthContext.tsx`) — جديد
- يوفّر: `session`, `user`, `signUpEmail`, `signInEmail`, `signInApple`,
  `signOut`, `resetPassword`, `deleteAccount`, `loading`.
- يستمع لـ `supabase.auth.onAuthStateChange` لتحديث الحالة والتوجيه.

### 3. شاشات المصادقة (`app/(auth)/`) — جديدة
- `sign-in.tsx`, `sign-up.tsx` (مع حقول الملف الإلزامية وتحقق سياسة كلمة المرور),
  `forgot-password.tsx`, `complete-profile.tsx` (لإكمال الملف بعد Apple).
- حارس تنقّل (auth guard) في `app/_layout.tsx`: يوجّه غير المسجّل لـ `(auth)`،
  والمسجّل بملف ناقص لـ `complete-profile`.
- أداة تحقق كلمة المرور (`lib/passwordPolicy.ts`): ≥8 أحرف + كبير + صغير + رقم.

### 4. شاشة الملف الشخصي (`app/(tabs)/profile.tsx` أو ضمن الإعدادات)
- عرض/تعديل الحقول، زر تسجيل الخروج، زر **حذف الحساب** (مع تأكيد).

### 5. مسار حذف الحساب في api-server (`DELETE /api/account`) — جديد
- يتحقق من توكن المستخدم (JWT من Supabase)، يستخرج `user.id`.
- يستخدم `service_role` لاستدعاء `auth.admin.deleteUser(userId)` → يشغّل cascade.
- يعيد 200 عند النجاح، ولا يحذف جزئياً عند الفشل (معاملة/تحقق).

### 6. تعديل `accidentSync.ts`
- استخدام توكن الوصول للمستخدم (`session.access_token`) بدل `SUPABASE_ANON_KEY`
  في ترويسة `Authorization` عند توفّر جلسة، وإرسال `user_id` مع الحادث.

## تدفّقات رئيسية (Key Flows)

### التسجيل بالبريد
1. المستخدم يعبّئ البريد/كلمة المرور + حقول الملف → تحقق عميل (عمر ≥ 18، صيغ صحيحة).
2. `supabase.auth.signUp` → إرسال بريد تأكيد.
3. بعد التأكيد وأول دخول → trigger أنشأ صف `profiles`، نكمّل الحقول عبر `UPDATE`.

### الدخول عبر Apple
1. `expo-apple-authentication` → `identityToken` (+ الاسم أول مرة فقط).
2. `supabase.auth.signInWithIdToken({ provider: 'apple', token })`.
3. بعد نجاح الدخول، يفحص التطبيق اكتمال الملف؛ إذا كانت الحقول الإلزامية ناقصة
   → توجيه إجباري لشاشة **"إكمال الملف"** (تاريخ الميلاد، المدينة، الهاتف) مع تحقق
   العمر ≥ 18، ثم التوجيه للرئيسية.

### حذف الحساب
1. المستخدم يضغط "حذف الحساب" → مربّع تأكيد صريح.
2. التطبيق يستدعي `DELETE /api/account` بتوكن المستخدم.
3. الخادم يتحقق من التوكن ويحذف عبر service role → cascade.
4. التطبيق يمسح الجلسة المحلية ويعود لشاشة الدخول.

## Security — الأمان

- `SUPABASE_SERVICE_ROLE_KEY` يُضاف كمتغيّر بيئة في **api-server (Coolify)** فقط،
  ولا يظهر إطلاقاً في التطبيق أو الريبو.
- RLS مفعّل على `profiles` و`accidents`؛ الافتراض "منع" ما لم تسمح سياسة.
- تخزين الجلسة في `expo-secure-store` (Keychain/Keystore) لا في AsyncStorage.
- تأكيد صريح قبل الحذف، وتحقق من التوكن على الخادم قبل أي حذف.

## المتطلبات الخارجية (External Setup)

- **Supabase Dashboard**: تفعيل مزوّد Email (مع تأكيد البريد)، تفعيل مزوّد Apple
  (Services ID + Team ID + Key ID + `.p8`)، ضبط Redirect URL لـ `strix://`، وSMTP
  مخصّص للإنتاج.
- **Apple Developer**: App ID مع Sign in with Apple، Services ID، مفتاح `.p8`.
- **حزم جديدة**: `@supabase/supabase-js`, `expo-apple-authentication`.

## Correctness Properties

### Property 1: عزل بيانات المستخدمين
كل مستخدم لا يستطيع قراءة أو تعديل ملف أو حوادث مستخدم آخر (يُضمن عبر RLS).
**Validates: Requirements 4.7**

### Property 2: ذرّية حذف الحساب
حذف الحساب إمّا يكتمل بالكامل (الحساب + الملف + الحوادث) أو لا يحدث إطلاقاً (لا حذف جزئي).
**Validates: Requirements 5.2, 5.3, 5.6**

### Property 3: فرض حد العمر
لا يُسمح بإنشاء حساب أو حفظ ملف لعمر < 18 (تحقق في العميل + قيد قاعدة البيانات).
**Validates: Requirements 1.6, 4.5**

### Property 4: سرّية مفتاح الخدمة
لا يُخزَّن مفتاح `service_role` إلا على الخادم؛ لا يظهر في التطبيق أو الريبو أبداً.
**Validates: Requirements 5.5**

### Property 5: أمان تخزين الجلسة
الجلسة تُخزَّن حصراً في تخزين آمن (SecureStore) وليس في تخزين عادي.
**Validates: Requirements 6.4**

## Error Handling

- **أخطاء المصادقة**: رسائل عامة دون كشف أي الحقلين خاطئ (للدخول)، ورسائل واضحة
  لسياسة كلمة المرور والعمر (للتسجيل).
- **فشل حذف الحساب**: يُعاد خطأ ويبقى الحساب سليماً؛ لا حذف جزئي.
- **فشل الشبكة أثناء المزامنة**: يُحفظ محلياً ويُعاد لاحقاً (يُعاد استخدام قائمة الأوفلاين الحالية).
- **انتهاء الجلسة**: محاولة تجديد تلقائي، وعند الفشل توجيه لشاشة الدخول دون فقد بيانات محلية.
- **إلغاء تدفّق Apple**: عودة صامتة لشاشة الدخول دون رسالة خطأ.

## Testing Strategy

- **وحدة**: تحقق العمر (≥18)، تحقق صيغ الهاتف/التاريخ، منطق `AuthContext`.
- **تكامل**: مسار حذف الحساب في api-server (باستخدام قاعدة اختبار PGlite + محاكاة
  service role)، وتأكيد الحذف التسلسلي للحوادث المرتبطة.
- **RLS**: اختبارات SQL تتأكد أن مستخدماً لا يقرأ/يعدّل ملف غيره.
- **يدوي/E2E**: تدفّق Apple على جهاز حقيقي (لا يعمل في المحاكي/Expo Go)، تأكيد البريد.

## المخاطر والاعتبارات (Risks)

- **Apple Private Relay**: قد يكون البريد مُرحّلاً؛ لا نعتمد على البريد كمعرّف فريد
  بشري، نعتمد `auth.uid()`.
- **تعارض مخطط Drizzle مع مخطط Supabase**: عند إضافة `user_id`، نحدّث كلا التعريفين
  (migration SQL + Drizzle schema) لتفادي انحراف.
- **الحوادث الحالية بدون `user_id`**: تبقى صالحة (العمود nullable)، والجديدة تُربط.
- **إلزام المصادقة**: قد يؤثر على مستخدمين حاليين؛ يُطرح مع نسخة/تنبيه مناسب.

## القرارات المعتمدة للتصميم (Resolved Decisions)

1. **مكان الملف الشخصي**: ضمن شاشة الإعدادات الحالية (`app/(tabs)/settings.tsx`)
   كخيار "الملف الشخصي" يفتح شاشة فرعية للعرض/التعديل، مع أزرار تسجيل الخروج وحذف الحساب.
2. **إكمال الملف بعد Apple**: بعد نجاح دخول Apple، إذا كانت حقول الملف الإلزامية
   ناقصة (تاريخ الميلاد، المدينة، الهاتف)، يُوجَّه المستخدم إجبارياً لشاشة **"إكمال
   الملف"** ولا يصل للتطبيق قبل تعبئتها والتحقق من العمر ≥ 18.
3. **تأكيد البريد إلزامي**: لا يُسمح بالدخول لمستخدم البريد قبل تأكيد بريده.
4. **سياسة كلمة المرور**: 8 أحرف كحد أدنى، تحتوي على حرف كبير وحرف صغير ورقم على
   الأقل. يُطبَّق التحقق في العميل + على مستوى Supabase Auth.

### تفاصيل شاشة الإعدادات (الملف الشخصي)

- قسم "الحساب" داخل الإعدادات يعرض: الاسم، البريد، ورابط "تعديل الملف الشخصي".
- شاشة تعديل الملف: الاسم، تاريخ الميلاد (منتقي تاريخ)، المدينة، رقم الهاتف.
- أسفل الشاشة: زر "تسجيل الخروج" وزر "حذف الحساب" (بلون تحذيري + تأكيد صريح).

### شاشة إكمال الملف (`app/(auth)/complete-profile.tsx`)

- تظهر بعد أول دخول Apple (أو أي حساب بحقول ناقصة).
- تجمع الحقول الإلزامية وتتحقق من العمر، ثم تحدّث صف `profiles` قبل التوجيه للرئيسية.
