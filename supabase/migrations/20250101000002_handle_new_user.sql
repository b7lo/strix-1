-- Migration: handle_new_user trigger
-- الميزة: المصادقة وملف المستخدم (User Authentication & Profile)
-- المهمة 1.2: إنشاء دالة + trigger لإنشاء صف `profiles` تلقائياً عند إنشاء المستخدم
-- المتطلبات: 4.1 (إنشاء صف profiles عند إنشاء الحساب)، 3.3 (إنشاء ملف مستخدم Apple)

-- ============================================================================
-- 1) دالة handle_new_user (SECURITY DEFINER)
-- ============================================================================
-- تُشغَّل بعد إدراج مستخدم جديد في auth.users فتُنشئ صفاً مقابلاً في
-- public.profiles بمعرّف المستخدم وبريده.
--
-- ملاحظة حول التوفيق مع قيود 1.1 (تسوية القيود):
--   جدول profiles (المهمة 1.1) يفرض NOT NULL على full_name / birth_date / city /
--   phone، بينما لا تتوفّر هذه الحقول لحظة إنشاء الحساب (خاصة عبر Apple). لتفادي
--   فشل الـ trigger مع الحفاظ على قيود التصميم كما هي (design.md يعرّفها NOT NULL)،
--   نُدرج قيماً افتراضية آمنة "فارغة المعنى":
--     - نصوص فارغة '' للحقول النصية الإلزامية (full_name, city, phone).
--     - تاريخ ميلاد افتراضي '1900-01-01' يحقّق قيد العمر ≥ 18
--       (profiles_age_min_18) دون أن يمثّل قيمة حقيقية.
--   يبقى إكمال الحقول الحقيقية لاحقاً عبر UPDATE (تسجيل البريد) أو شاشة "إكمال
--   الملف" (Apple)، ويعتمد التطبيق على فراغ الحقول النصية للكشف عن نقص الملف.
--
-- الأمان: SECURITY DEFINER لتجاوز RLS (الإدراج يتم عبر الـ trigger لا عبر العميل)،
-- مع ضبط search_path صراحةً لمنع اختطاف المسار (search_path hijacking).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, birth_date, city, phone)
  values (
    new.id,
    new.email,
    '',            -- full_name: placeholder، يُكمَّل لاحقاً
    '1900-01-01',  -- birth_date: افتراضي آمن يحقّق قيد العمر ≥ 18
    '',            -- city: placeholder، يُكمَّل لاحقاً
    ''             -- phone: placeholder، يُكمَّل لاحقاً
  )
  on conflict (id) do nothing;  -- تحصين ضد التكرار (idempotent)

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'تُنشئ صف profiles تلقائياً عند إنشاء مستخدم في auth.users؛ تُدرج id والبريد وقيماً افتراضية للحقول الإلزامية تُكمَّل لاحقاً.';

-- ============================================================================
-- 2) ربط الدالة كـ trigger على auth.users بعد الإدراج
-- ============================================================================
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
