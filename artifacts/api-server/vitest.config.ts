import { defineConfig } from "vitest/config";

// إعداد Vitest لخادم الـ API.
// - نستخدم بيئة node.
// - نُحمِّل ملف إعداد يضبط متغيّرات البيئة اللازمة (DATABASE_URL وهمي) قبل
//   تحميل أي وحدة تستورد @workspace/db، حتى لا يرمي استيرادها خطأً.
// - نضيف شرط الحزم "workspace" ليتوافق مع customConditions في tsconfig.base.json
//   عند حلّ حزم @workspace/* المرتبطة عبر pnpm.
export default defineConfig({
  resolve: {
    conditions: ["workspace"],
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    // اختبارات قاعدة البيانات المبنيّة على الخصائص قد تكون أبطأ من المعتاد.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
