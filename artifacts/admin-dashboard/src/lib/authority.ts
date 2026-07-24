import type { AuthoritySource } from "../types/dashboard";

/** اسم الجهة المسؤولة عن التقييم الرسمي بالعربية. */
export function authorityLabel(source: AuthoritySource, other?: string | null): string {
  switch (source) {
    case "najm":
      return "نجم";
    case "saudi_traffic":
      return "المرور السعودي";
    case "other":
      return other && other.trim() ? other.trim() : "جهة أخرى";
    default:
      return "الجهة الرسمية";
  }
}
