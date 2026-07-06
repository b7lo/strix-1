/**
 * مصادقة لوحة التحكم (جهة العميل): تخزين التوكن + تسجيل الدخول/الخروج + fetch موثّق.
 * التوكن يُصدره الخادم (POST /api/auth/login) ويُرسل كـ Bearer في كل طلب.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/dashboard";
// جذر الـ API (نزيل لاحقة /dashboard للوصول لـ /auth)
const API_ROOT = API_BASE.replace(/\/dashboard\/?$/, "");
const TOKEN_KEY = "strix_admin_token";

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(token: string): void {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* ignore */ }
}
export function clearToken(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}
export function isAuthed(): boolean {
  return Boolean(getToken());
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_ROOT}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("بيانات الدخول غير صحيحة");
    if (res.status === 429) throw new Error("محاولات كثيرة، حاول لاحقًا");
    throw new Error("تعذّر تسجيل الدخول");
  }
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("استجابة غير صالحة من الخادم");
  setToken(data.token);
}

export function logout(): void {
  clearToken();
  window.dispatchEvent(new CustomEvent("strix:unauthorized"));
}

/**
 * fetch موثّق: يضيف ترويسة Authorization، وعند 401 يمسح التوكن ويطلق حدث
 * الخروج ليعيد الواجهة لشاشة الدخول.
 */
export async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent("strix:unauthorized"));
  }
  return res;
}
