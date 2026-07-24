-- Migration: RLS policies for profiles and accidents
-- الميزة: المصادقة وملف المستخدم (User Authentication & Profile)
-- المهمة 1.4: كتابة سياسات RLS
-- المتطلبات: 4.5، 4.7 (عزل بيانات المستخدم)، 5 (حذف الحساب / ملكية البيانات)

-- ============================================================================
-- ملاحظة عامة حول service_role (مهمّة)
-- ============================================================================
-- مفتاح service_role في Supabase يتجاوز (bypass) كل سياسات RLS تلقائياً.
-- لذلك المسارات الخادمية ذات الصلاحية الأوسع تبقى تعمل دون أن تكسرها السياسات أدناه:
--   • مسار حذف الحساب (DELETE /api/account في api-server) عبر auth.admin.deleteUser.
--   • مسار المطابقة بين المستخدمين (cross-user matching) الذي يقرأ/يكتب حوادث
--     مستخدمين مختلفين، ويُدار خادمياً بصلاحية service_role.
-- السياسات أدناه تحكم فقط وصول العميل عبر توكن المستخدم (authenticated/anon)،
-- ولا تؤثر إطلاقاً على أي عملية تُنفَّذ بمفتاح service_role.

-- ============================================================================
-- 1) جدول profiles — تفعيل RLS + سياسات القراءة/التعديل للمالك فقط
-- ============================================================================
-- الافتراض بعد التفعيل هو "المنع" ما لم تسمح سياسة صراحةً.
alter table public.profiles enable row level security;

-- ملاحظة أداء: نغلّف auth.uid() داخل (select ...) ليُقيَّم مرة واحدة (initplan)
-- بدل إعادة تقييمه لكل صف — يتفادى تحذير advisor (auth_rls_initplan).

-- SELECT: يقرأ المستخدم صفّه فقط (auth.uid() = id).
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- UPDATE: يعدّل المستخدم صفّه فقط، ولا يستطيع تغيير المعرّف لغيره
-- (using للصف الحالي، with check للصف بعد التعديل).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ملاحظة: لا توجد سياسة INSERT للعميل عمداً.
-- إدراج صف profiles يتم حصراً عبر trigger handle_new_user (SECURITY DEFINER)
-- عند إنشاء المستخدم في auth.users، وليس عبر العميل مباشرةً.

-- ============================================================================
-- 2) جدول accidents — تفعيل RLS + سياسات ملكية المستخدم لصفوفه
-- ============================================================================
-- الافتراض بعد التفعيل هو "المنع" ما لم تسمح سياسة صراحةً.
alter table public.accidents enable row level security;

-- ملاحظة توافقية:
--   بعد المهمة 7.1 تنتقل المزامنة لاستخدام توكن المستخدم ويُرسَل user_id مع الحادث،
--   فيصبح لكل حادث جديد مالك واضح تحكمه السياسات أدناه. الحوادث القديمة ذات
--   user_id = NULL (المرتبطة بالجهاز فقط) لا تطابق auth.uid()، فلا تكون مرئية عبر
--   العميل — وهذا مقصود بما أن المصادقة أصبحت إلزامية (د1). أي معالجة لتلك الصفوف
--   القديمة أو مسار المطابقة بين المستخدمين يتم خادمياً عبر service_role (يتجاوز RLS).

-- SELECT: يقرأ المستخدم حوادثه فقط.
drop policy if exists "accidents_select_own" on public.accidents;
create policy "accidents_select_own"
  on public.accidents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- INSERT: يُدرج المستخدم حوادث تخصّه فقط (user_id = auth.uid()).
drop policy if exists "accidents_insert_own" on public.accidents;
create policy "accidents_insert_own"
  on public.accidents
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- UPDATE: يعدّل المستخدم حوادثه فقط (قبل وبعد التعديل).
drop policy if exists "accidents_update_own" on public.accidents;
create policy "accidents_update_own"
  on public.accidents
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- DELETE: يحذف المستخدم حوادثه فقط.
drop policy if exists "accidents_delete_own" on public.accidents;
create policy "accidents_delete_own"
  on public.accidents
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
