/**
 * ═══════════════════════════════════════════════════════════════════
 * @workspace/liability — الأنواع المشتركة
 * ═══════════════════════════════════════════════════════════════════
 *
 * هذه الحزمة هي المصدر الوحيد للحقيقة (single source of truth) لمنطق
 * مطابقة الحوادث وحساب المسؤولية المتقاطعة. يستوردها كلٌّ من:
 *   - خادم الـ API (api-server) — المرجع الذي يطابِق ويحسب ويحفظ.
 *   - تطبيق strix — لمسار Supabase الاحتياطي فقط (سلوك مطابق تمامًا).
 *
 * الأنواع هنا نسخة أدنى (subset) من أنواع التطبيق حتى تكون محايدة للمنصّة
 * (بلا أي اعتماد على React Native / Node). أي نوع أغنى في التطبيق يبقى
 * قابلاً للتمرير هنا بفضل الكتابة البنيوية (structural typing).
 */
/** منطقة الاصطدام على المركبة. */
export type ImpactZone = "front" | "front-left" | "front-right" | "rear" | "rear-left" | "rear-right" | "side-left" | "side-right" | "unknown";
/**
 * المدخل الأدنى المطلوب لحساب المسؤولية المتقاطعة لطرف واحد.
 * أي `AccidentReport` كامل في التطبيق يفي بهذا الشكل بنيويًا.
 */
export interface CrossReport {
    id: string;
    impactZone: ImpactZone;
    /** طابع زمني بالمِلّي ثانية (epoch). */
    timestamp: number;
    latitude?: number | null;
    longitude?: number | null;
    /** السرعة لحظة الاصطدام (كم/س). */
    speedKmh?: number | null;
    /** السرعة قبل الاصطدام مباشرة (كم/س) — تُفضّل عند توفّرها. */
    preCrashSpeedKmh?: number | null;
    /** تحليل الفرملة — يكفي وجود العلم `brakingDetected`. */
    braking?: {
        brakingDetected: boolean;
    } | null;
}
/** نتيجة المطابقة الثنائية (التحقق المتبادل) بين مركبتين. */
export interface CrossVerifiedAnalysis {
    id: string;
    accident_a_id: string;
    accident_b_id: string;
    verified_impact_zone_a: ImpactZone;
    verified_impact_zone_b: ImpactZone;
    verified_speed_a_kmh: number;
    verified_speed_b_kmh: number;
    first_contact_party: "A" | "B" | "UNKNOWN";
    consistency_status: "VERIFIED" | "INCONSISTENT" | "PARTIAL";
    consistency_flags: string[];
    liability_a_percent: number;
    liability_b_percent: number;
    created_at: number;
}
/** مدخلات قرار المطابقة (هل التقريران لنفس الحادث؟). */
export interface MatchInput {
    timestamp: number;
    latitude?: number | null;
    longitude?: number | null;
    /** زاوية الاقتراب بالدرجات (0..360). */
    approachAngle: number;
}
/** ناتج تسجيل المطابقة. */
export interface MatchScore {
    /** هل تجاوزت الثقة الحدّ الأدنى المقبول؟ */
    isMatch: boolean;
    /** درجة الثقة (0..98). */
    confidence: number;
    /** المسافة بالأمتار (0 إذا لا يوجد GPS لدى الطرفين). */
    distanceMeters: number;
    /** فرق الوقت المطلق بالمِلّي ثانية. */
    timeDiffMs: number;
    /** هل زاويتا الاقتراب متقاربتان (ضمن العتبة)؟ */
    anglesAligned: boolean;
}
//# sourceMappingURL=types.d.ts.map