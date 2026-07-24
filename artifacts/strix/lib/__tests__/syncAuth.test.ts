/**
 * اختبارات أدوات مصادقة المزامنة — المتطلبات 7.1، 7.2.
 * تتحقّق من إرسال التوكن الصحيح وربط user_id، مع عدم كسر مسار غير المصادَق.
 */
import { buildSupabaseAuthHeaders, withUserId } from "@/lib/syncAuth";

describe("buildSupabaseAuthHeaders", () => {
  const ANON = "anon-key-123";

  it("uses the user access token in Authorization when a session exists", () => {
    const headers = buildSupabaseAuthHeaders(ANON, "user-access-token");
    expect(headers.apikey).toBe(ANON);
    expect(headers.Authorization).toBe("Bearer user-access-token");
  });

  it("falls back to the anon key when no session (offline/guest path)", () => {
    const headers = buildSupabaseAuthHeaders(ANON, null);
    expect(headers.apikey).toBe(ANON);
    expect(headers.Authorization).toBe(`Bearer ${ANON}`);
  });
});

describe("withUserId", () => {
  const base = { local_id: "abc", device_id: "dev-1", severity: "minor" };

  it("attaches user_id when an authenticated user is present", () => {
    const record = withUserId(base, "user-uuid-1");
    expect(record).toMatchObject({ ...base, user_id: "user-uuid-1" });
  });

  it("does not attach user_id for the unauthenticated path", () => {
    const record = withUserId(base, null);
    expect(record).not.toHaveProperty("user_id");
    expect(record).toEqual(base);
  });

  it("does not mutate the original record", () => {
    withUserId(base, "user-uuid-1");
    expect(base).not.toHaveProperty("user_id");
  });
});
