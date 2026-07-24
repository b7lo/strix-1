// ملف إعداد Vitest — يعمل قبل تحميل ملفات الاختبار.
//
// وحدة @workspace/db (lib/db/src/index.ts) تتحقّق من وجود DATABASE_URL عند
// الاستيراد وترمي خطأً إن لم يوجد، ثم تُنشئ pg.Pool. إنشاء الـ Pool كسول
// (lazy) ولا يتّصل فعليًا حتى أوّل استعلام. الاختبارات لا تستخدم هذا الاتّصال
// إطلاقًا — فهي تمرّر قاعدة اختبار PGlite مستقلّة — لكننا نضبط قيمة وهمية حتى
// لا يفشل الاستيراد.
process.env.DATABASE_URL ??=
  "postgres://test:test@127.0.0.1:5432/strix_test";
process.env.NODE_ENV ??= "test";
