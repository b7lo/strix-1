-- Migration: harden handle_new_user execute privileges
-- الميزة: المصادقة وملف المستخدم (User Authentication & Profile)
-- المهمة 1.5 (إصلاح advisor): منع استدعاء handle_new_user كـ RPC عبر REST.
-- المتطلبات: 4.1، 3.3 (تحصين أمني للدالة)

-- ============================================================================
-- تحصين أمني: دالة handle_new_user هي دالة trigger فقط (SECURITY DEFINER).
-- كشفها كـ RPC (/rest/v1/rpc/handle_new_user) لأدوار anon/authenticated يمثّل
-- سطح هجوم غير ضروري (advisors 0028 / 0029). سحب صلاحية EXECUTE يمنع الاستدعاء
-- عبر الـ API دون أن يكسر تنفيذ الـ trigger — لأن إطلاق الـ trigger لا يعتمد على
-- صلاحية EXECUTE الخاصة بالمستخدم الحالي.
-- ============================================================================
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
