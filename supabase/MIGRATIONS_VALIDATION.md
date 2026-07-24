# التحقق من الترحيلات والمخطط — المهمة 1.5

<!-- Feature: user-auth-profile — Task 1.5: توليد migration رسمي والتحقق من المخطط -->
<!-- المتطلبات: 7.4 (الحفاظ على سلامة/توافق مخطط الحوادث عند إضافة ربط المستخدم) -->

## الحالة: تم التطبيق والتحقق فعلياً عبر Supabase MCP ✅

المشروع المستضاف: `strix_db` (project ref: `qdfgdevinilqxbdmnees`) — Postgres 17،
الحالة ACTIVE_HEALTHY. طُبّقت الترحيلات وتحقّقنا منها مباشرةً عبر أدوات Supabase MCP.

## الترحيلات المطبّقة (مسجّلة في سجل الترحيل)

| # | الاسم | الوصف |
|---|-------|-------|
| 1 | `create_profiles` | جدول `profiles` + قيد العمر ≥ 18 + trigger لـ `updated_at` (بمسار بحث ثابت) |
| 2 | `handle_new_user` | دالة/trigger إنشاء صف `profiles` عند إنشاء المستخدم (SECURITY DEFINER, search_path ثابت) |
| 3 | `add_user_id_to_accidents` | عمود `accidents.user_id` (FK→auth.users, cascade, nullable) + فهرس `accidents_user_id_idx` |
| 4 | `rls_policies_profiles_accidents` | تفعيل RLS + سياسات الملكية لـ `profiles` و`accidents` (بـ `(select auth.uid())`) |
| 5 | `harden_handle_new_user` | سحب EXECUTE عن `handle_new_user` (منع استدعائها كـ RPC) — إصلاح advisor |

الملفات المصدر في `supabase/migrations/` (بأسماء `20250101000001..05_*.sql`) مطابقة
للمحتوى المطبّق. تحقّق بنية جدول `profiles`: الأعمدة والأنواع وقيود NOT NULL مطابقة
للتصميم (`email` وحده nullable).

## نتائج get_advisors بعد التطبيق

### تم إصلاحه (من ترحيلاتنا)

- **0028/0029 — `handle_new_user` قابلة للاستدعاء كـ RPC** من `anon`/`authenticated`:
  أُصلح بترحيل `harden_handle_new_user` (سحب EXECUTE). أعيد الفحص → **اختفى التحذير**.
- **0011 — `function_search_path_mutable`**: دالّتانا (`set_updated_at`,
  `handle_new_user`) تضبطان search_path صراحةً، فلا تظهران في التقرير.
- **auth_rls_initplan**: سياساتنا تستخدم `(select auth.uid())` فلا تُقيَّم لكل صف.

### ملاحظة أداء ناتجة عن التعايش مع سياسات قديمة (مقبولة بالتصميم)

- `multiple_permissive_policies` على `accidents`: سياساتنا الجديدة (owner-based)
  تتعايش مع سياسات المطابقة القديمة (anon / matching). هذا متوقّع لأن التصميم يطلب
  **الإبقاء على مسار المطابقة**. تحسينها لاحقاً عند تحويل المطابقة بالكامل لـ service_role.
- `unused_index` على `accidents_user_id_idx`: طبيعي — الفهرس جديد ولم يُستخدم بعد.

### خارج نطاق هذه الميزة (موجود مسبقاً — لم نلمسه)

تحذيرات على جداول/دوال سابقة لا علاقة لميزتنا بها، يُنصح بمراجعتها في مهمة أمان منفصلة:
- `update_updated_at_column` (search_path mutable) — دالة قديمة مختلفة عن `set_updated_at`.
- `rls_policy_always_true` على `accidents`/`leads`/`false_alarms`/`fault_assessments`/`cross_verified_analyses` (سياسات anon قديمة بـ `USING/WITH CHECK (true)`).
- `leads_count`, `rls_auto_enable` (SECURITY DEFINER قابلة للاستدعاء كـ RPC).

## ملاحظة توافق (RLS على accidents)

بعد تفعيل سياسات الملكية، الصفوف القديمة ذات `user_id = NULL` غير مرئية للعميل عبر
توكن المستخدم (تبقى مرئية عبر `service_role`). هذا مقصود بما أن المصادقة إلزامية (د1)،
وتُربط الحوادث الجديدة بالمستخدم بعد المهمة 7.1.

## للمزامنة عبر CLI لاحقاً (اختياري)

الترحيلات مطبّقة عبر MCP ومسجّلة. لمن يريد مزامنة سجل الترحيل محلياً عبر CLI:

```bash
supabase link --project-ref qdfgdevinilqxbdmnees
supabase migration list        # مقارنة المحلي بالبعيد
supabase db pull               # سحب أي فروقات كترحيل جديد
```
