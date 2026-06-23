/**
 * ═══════════════════════════════════════════════════════════════════
 * Strix Geo Utilities — v1.0
 * ═══════════════════════════════════════════════════════════════════
 * 
 * مجموعة من الوظائف المساعدة للعمليات الهندسية والجغرافية.
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * حساب المسافة بين نقطتين جغرافيتين (Latitude, Longitude) بالأمتار
 * باستخدام معادلة Haversine.
 * 
 * @param lat1 خط عرض النقطة الأولى
 * @param lon1 خط طول النقطة الأولى
 * @param lat2 خط عرض النقطة الثانية
 * @param lon2 خط طول النقطة الثانية
 * @returns المسافة بالأمتار
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3; // نصف قطر الأرض بالمتر
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
