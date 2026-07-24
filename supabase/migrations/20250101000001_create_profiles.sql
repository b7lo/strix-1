-- Migration: create profiles table
-- الميزة: المصادقة وملف المستخدم (User Authentication & Profile)
-- المهمة 1.1: إنشاء جدول `profiles` مرتبط بـ auth.users مع قيد العمر ≥ 18
-- والمتطلبات: 4.1، 4.6، د3، د4

-- ============================================================================
-- 1) جدول profiles
-- ============================================================================
-- كل صف مرتبط بمستخدم في auth.users عبر id (نفس المعرّف)، ويُحذف تسلسلياً
-- عند حذف المستخدم (ON DELETE CASCADE) — يدعم متطلب حذف الحساب النهائي.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  birth_date  date not null,
  city        text not null,
  phone       text not null,
  -- يُملأ من auth.users.email (قد يكون بريد Apple Private Relay المُرحَّل)
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- قيد العمر: الحد الأدنى 18 سنة (طبقة تحقق أخيرة على مستوى قاعدة البيانات)
  constraint profiles_age_min_18 check (birth_date <= (current_date - interval '18 years'))
);

comment on table public.profiles is 'الملف الشخصي للمستخدم المصادَق، مرتبط بـ auth.users(id).';
comment on column public.profiles.email is 'البريد من مزوّد الدخول؛ قد يكون بريد Apple Private Relay مُرحَّلاً.';
comment on constraint profiles_age_min_18 on public.profiles is 'يفرض أن يكون عمر المستخدم 18 سنة أو أكثر.';

-- ============================================================================
-- 2) دالة + trigger لتحديث updated_at عند كل تعديل للصف
-- ============================================================================
-- ملاحظة أمان: نضبط search_path صراحةً (فارغاً) لتفادي تحذير advisor
-- (function_search_path_mutable) ومنع اختطاف المسار؛ now() تابعة لـ pg_catalog
-- المتاح دوماً فلا تتأثر الدالة.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();
