/**
 * قائمة مدن المملكة العربية السعودية (عربي + إنجليزي) لاستخدامها في منتقي المدينة.
 *
 * `id` قيمة ثابتة تُخزَّن في الملف الشخصي (لا تتأثر باللغة). `ar`/`en` للعرض.
 * القائمة تغطّي عواصم المناطق والمدن الرئيسية والمحافظات الأكثر شيوعاً.
 */
export interface SaudiCity {
  id: string;
  ar: string;
  en: string;
}

export const SAUDI_CITIES: SaudiCity[] = [
  { id: "riyadh", ar: "الرياض", en: "Riyadh" },
  { id: "jeddah", ar: "جدة", en: "Jeddah" },
  { id: "mecca", ar: "مكة المكرمة", en: "Mecca" },
  { id: "medina", ar: "المدينة المنورة", en: "Medina" },
  { id: "dammam", ar: "الدمام", en: "Dammam" },
  { id: "khobar", ar: "الخبر", en: "Al Khobar" },
  { id: "dhahran", ar: "الظهران", en: "Dhahran" },
  { id: "taif", ar: "الطائف", en: "Taif" },
  { id: "buraidah", ar: "بريدة", en: "Buraidah" },
  { id: "unaizah", ar: "عنيزة", en: "Unaizah" },
  { id: "tabuk", ar: "تبوك", en: "Tabuk" },
  { id: "hail", ar: "حائل", en: "Hail" },
  { id: "abha", ar: "أبها", en: "Abha" },
  { id: "khamis_mushait", ar: "خميس مشيط", en: "Khamis Mushait" },
  { id: "najran", ar: "نجران", en: "Najran" },
  { id: "jazan", ar: "جازان", en: "Jazan" },
  { id: "al_bahah", ar: "الباحة", en: "Al Bahah" },
  { id: "sakaka", ar: "سكاكا", en: "Sakaka" },
  { id: "arar", ar: "عرعر", en: "Arar" },
  { id: "qatif", ar: "القطيف", en: "Qatif" },
  { id: "jubail", ar: "الجبيل", en: "Jubail" },
  { id: "hofuf", ar: "الهفوف", en: "Hofuf" },
  { id: "mubarraz", ar: "المبرز", en: "Al Mubarraz" },
  { id: "ahsa", ar: "الأحساء", en: "Al Ahsa" },
  { id: "yanbu", ar: "ينبع", en: "Yanbu" },
  { id: "al_kharj", ar: "الخرج", en: "Al Kharj" },
  { id: "al_qunfudhah", ar: "القنفذة", en: "Al Qunfudhah" },
  { id: "hafar_al_batin", ar: "حفر الباطن", en: "Hafar Al Batin" },
  { id: "al_qatif", ar: "سيهات", en: "Sayhat" },
  { id: "rabigh", ar: "رابغ", en: "Rabigh" },
  { id: "al_majmaah", ar: "المجمعة", en: "Al Majmaah" },
  { id: "zulfi", ar: "الزلفي", en: "Az Zulfi" },
  { id: "al_dawadmi", ar: "الدوادمي", en: "Ad Dawadmi" },
  { id: "wadi_al_dawasir", ar: "وادي الدواسر", en: "Wadi Al Dawasir" },
  { id: "bisha", ar: "بيشة", en: "Bisha" },
  { id: "sabya", ar: "صبيا", en: "Sabya" },
  { id: "abu_arish", ar: "أبو عريش", en: "Abu Arish" },
  { id: "al_lith", ar: "الليث", en: "Al Lith" },
  { id: "qurayyat", ar: "القريات", en: "Qurayyat" },
  { id: "rafha", ar: "رفحاء", en: "Rafha" },
  { id: "al_ula", ar: "العلا", en: "Al Ula" },
  { id: "duba", ar: "ضباء", en: "Duba" },
  { id: "umluj", ar: "أملج", en: "Umluj" },
  { id: "al_wajh", ar: "الوجه", en: "Al Wajh" },
  { id: "badr", ar: "بدر", en: "Badr" },
  { id: "khaybar", ar: "خيبر", en: "Khaybar" },
  { id: "al_rass", ar: "الرس", en: "Ar Rass" },
  { id: "al_bukayriyah", ar: "البكيرية", en: "Al Bukayriyah" },
  { id: "al_mithnab", ar: "المذنب", en: "Al Mithnab" },
  { id: "shaqra", ar: "شقراء", en: "Shaqra" },
  { id: "afif", ar: "عفيف", en: "Afif" },
  { id: "al_quwayiyah", ar: "القويعية", en: "Al Quwayiyah" },
  { id: "hotat_bani_tamim", ar: "حوطة بني تميم", en: "Hotat Bani Tamim" },
  { id: "dhurma", ar: "ضرماء", en: "Dhurma" },
  { id: "al_muzahimiyah", ar: "المزاحمية", en: "Al Muzahimiyah" },
  { id: "thadiq", ar: "ثادق", en: "Thadiq" },
  { id: "baljurashi", ar: "بلجرشي", en: "Baljurashi" },
  { id: "al_namas", ar: "النماص", en: "An Namas" },
  { id: "mahayil", ar: "محايل عسير", en: "Mahayil Asir" },
  { id: "sarat_abidah", ar: "سراة عبيدة", en: "Sarat Abidah" },
  { id: "tanumah", ar: "تنومة", en: "Tanumah" },
  { id: "dhahran_al_janub", ar: "ظهران الجنوب", en: "Dhahran Al Janub" },
  { id: "turaif", ar: "طريف", en: "Turaif" },
  { id: "dawmat_al_jandal", ar: "دومة الجندل", en: "Dumat Al Jandal" },
  { id: "farasan", ar: "فرسان", en: "Farasan" },
  { id: "samtah", ar: "صامطة", en: "Samtah" },
  { id: "ras_tanura", ar: "رأس تنورة", en: "Ras Tanura" },
  { id: "nairyah", ar: "النعيرية", en: "An Nairyah" },
  { id: "khafji", ar: "الخفجي", en: "Al Khafji" },
  { id: "buqayq", ar: "بقيق", en: "Buqayq" },
  { id: "other", ar: "أخرى", en: "Other" },
];

/** يُرجِع اسم المدينة للعرض حسب اللغة، أو المعرّف نفسه إن لم يوجد (توافق خلفي). */
export function cityLabel(id: string | null | undefined, locale: "ar" | "en"): string {
  if (!id) return "";
  const found = SAUDI_CITIES.find((c) => c.id === id);
  if (found) return locale === "ar" ? found.ar : found.en;
  return id; // قيمة قديمة مكتوبة يدوياً — تُعرض كما هي
}
