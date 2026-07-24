// اختبار حذف الحساب — المتطلبات 5.2، 5.4، 5.5، 5.6 (خاصية الذرّية 2).
//
// نختبر منطق المعالج `handleDeleteAccount` عبر حقن عميل Supabase وهمي (بلا شبكة):
//  - رفض الطلب دون توكن (401).
//  - رفض توكن غير صالح (401).
//  - النجاح: يستدعي deleteUser بمعرّف المستخدم الصحيح ويعيد 200.
//  - فشل الحذف: يعيد 500 دون حذف جزئي (لا يُستدعى إلا حذف واحد ذرّي على الخادم).
//
// كما نتحقّق من الحلقة الأخيرة في سلسلة الحذف التسلسلي (accident → fault_assessments)
// عبر PGlite — وهي ما يعتمد عليه حذف الحساب بعد إزالة صفوف accidents المرتبطة
// بالمستخدم (FK: accidents.user_id → auth.users ON DELETE CASCADE، مؤكّد في الترحيل).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  handleDeleteAccount,
  extractBearer,
} from "../src/routes/account";
import type { SupabaseAdminLike } from "../src/lib/supabaseAdmin";
import { createTestDb, type TestDbHandle } from "./helpers/testDb";
import { seedAccident, seedAssessment, markFalseAlarm } from "./helpers/seed";
import { faultAssessmentsTable, falseAlarmsTable } from "@workspace/db/schema";

const USER_ID = "11111111-1111-1111-1111-111111111111";

/** يبني عميل service role وهمياً بسلوك قابل للضبط. */
function makeMockAdmin(opts: {
  user?: { id: string } | null;
  getUserError?: string | null;
  deleteError?: string | null;
  onDelete?: (id: string) => void;
}): SupabaseAdminLike {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: opts.user ?? null },
        error: opts.getUserError ? { message: opts.getUserError } : null,
      })),
      admin: {
        deleteUser: vi.fn(async (id: string) => {
          opts.onDelete?.(id);
          return {
            data: null,
            error: opts.deleteError ? { message: opts.deleteError } : null,
          };
        }),
      },
    },
  };
}

describe("extractBearer", () => {
  it("extracts the token from a Bearer header", () => {
    expect(extractBearer("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });
  it("returns empty string for missing/invalid headers", () => {
    expect(extractBearer(undefined)).toBe("");
    expect(extractBearer("Basic xyz")).toBe("");
    expect(extractBearer(123 as unknown)).toBe("");
  });
});

describe("handleDeleteAccount", () => {
  it("rejects requests without a token (401)", async () => {
    const admin = makeMockAdmin({ user: { id: USER_ID } });
    const result = await handleDeleteAccount(() => admin, undefined, true);
    expect(result.status).toBe(401);
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("returns 503 when the service is not configured", async () => {
    const admin = makeMockAdmin({ user: { id: USER_ID } });
    const result = await handleDeleteAccount(() => admin, "Bearer token", false);
    expect(result.status).toBe(503);
  });

  it("rejects an invalid/expired token (401) and does not delete", async () => {
    const admin = makeMockAdmin({ user: null, getUserError: "invalid token" });
    const result = await handleDeleteAccount(() => admin, "Bearer bad", true);
    expect(result.status).toBe(401);
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes the authenticated user and returns 200", async () => {
    const deleted: string[] = [];
    const admin = makeMockAdmin({
      user: { id: USER_ID },
      onDelete: (id) => deleted.push(id),
    });
    const result = await handleDeleteAccount(() => admin, `Bearer good`, true);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ success: true });
    // حذف واحد بالمعرّف الصحيح (المتطلب 5.2).
    expect(deleted).toEqual([USER_ID]);
  });

  it("returns 500 without partial deletion when deleteUser fails (Property 2)", async () => {
    const admin = makeMockAdmin({
      user: { id: USER_ID },
      deleteError: "db error",
    });
    const result = await handleDeleteAccount(() => admin, "Bearer good", true);
    expect(result.status).toBe(500);
    expect(result.body).toHaveProperty("error");
    // حاول الحذف مرّة واحدة فقط (لا محاولات جزئية متعدّدة).
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledTimes(1);
  });
});

describe("account deletion cascade (DB layer)", () => {
  let handle: TestDbHandle;
  beforeEach(async () => {
    handle = await createTestDb();
  });
  afterEach(async () => {
    await handle.close();
  });

  it("cascades accident removal to fault_assessments and nulls false_alarms link", async () => {
    // نحاكي سلسلة الحذف التي تلي إزالة صفوف المستخدم من accidents.
    const accident = await seedAccident(handle.db, { deviceId: "user-device" });
    await seedAssessment(handle.db, accident.id, { liabilityDifference: 10 });
    await markFalseAlarm(handle.db, accident.id, { reason: "test" });

    // إزالة الحادث (كما لو حُذف تسلسلياً مع المستخدم).
    await handle.db.delete((await import("@workspace/db/schema")).accidentsTable);

    const assessments = await handle.db.select().from(faultAssessmentsTable);
    const falseAlarms = await handle.db
      .select()
      .from(falseAlarmsTable);

    // تقييم المسؤولية يُحذف تسلسلياً (ON DELETE CASCADE).
    expect(assessments).toHaveLength(0);
    // البلاغ الكاذب يبقى لكن يُفصل ربطه (ON DELETE SET NULL).
    expect(falseAlarms).toHaveLength(1);
    expect(falseAlarms[0].accidentId).toBeNull();
  });
});
