-- Migration: add user_id column to accidents
-- الميزة: المصادقة وملف المستخدم (User Authentication & Profile)
-- المهمة 1.3: إضافة عمود `user_id` لجدول `accidents`
-- المتطلبات: 5.3 (حذف حوادث المستخدم تسلسلياً)، 7.1 (ربط الحادث بالمستخدم)، 7.4 (توافق المخطط)

-- ============================================================================
-- 1) عمود user_id على جدول accidents
-- ============================================================================
-- يربط الحادث بالمستخدم المصادَق في auth.users. العمود NULLABLE عمداً للحفاظ على
-- التوافق مع الحوادث القديمة المرتبطة بالجهاز فقط (device-only) قبل إضافة المصادقة.
-- ON DELETE CASCADE يضمن حذف حوادث المستخدم تسلسلياً عند حذف حسابه (المتطلب 5.3).
alter table public.accidents
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

comment on column public.accidents.user_id is
  'المستخدم المالك للحادث (auth.users.id)؛ NULLABLE للتوافق مع الحوادث القديمة المرتبطة بالجهاز فقط.';

-- ============================================================================
-- 2) فهرس على user_id لتسريع الاستعلامات المُصفّاة حسب المستخدم (RLS/المزامنة)
-- ============================================================================
create index if not exists accidents_user_id_idx on public.accidents (user_id);
