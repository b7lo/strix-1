// أداة قاعدة بيانات الاختبار (Test DB) — تعتمد PGlite (Postgres مضمّن يعمل في
// نفس العملية عبر WASM) بدل خادم Postgres خارجي، لأنه غير متوفّر في بيئة التطوير.
// PGlite هو Postgres حقيقي، فيدعم الدوال الخاصّة بـ Postgres التي يستخدمها معالج
// /stats مثل: date_trunc، now() - interval، cast(... as int)، ILIKE، والأنواع
// المعدودة (enums) — ما يجعل الاختبارات تمرّن منطق الاستعلام الحقيقي.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@workspace/db/schema";

export type TestDatabase = ReturnType<typeof drizzle<typeof schema>>;

export interface TestDbHandle {
  /** نسخة drizzle مربوطة بـ PGlite — تُمرَّر لمنطق الإحصائيات وأدوات البذر. */
  db: TestDatabase;
  /** عميل PGlite الأساسي — يُستخدم لإغلاق القاعدة بعد الاختبار. */
  client: PGlite;
  /** إغلاق قاعدة الاختبار وتحرير الموارد. */
  close: () => Promise<void>;
}

// ─── DDL: إنشاء الأنواع المعدودة والجداول مطابقةً لـ lib/db/src/schema/index.ts ───
const DDL = /* sql */ `
CREATE TYPE severity AS ENUM ('critical', 'severe', 'moderate', 'minor');
CREATE TYPE impact_zone AS ENUM (
  'front', 'front-left', 'front-right', 'rear', 'rear-left', 'rear-right',
  'side-left', 'side-right', 'unknown'
);
CREATE TYPE impact_direction AS ENUM (
  'front', 'rear', 'side-left', 'side-right', 'unknown'
);

CREATE TABLE accidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id varchar(160) NOT NULL,
  user_id uuid,
  "timestamp" timestamptz NOT NULL,
  latitude double precision,
  longitude double precision,
  peak_g_force double precision NOT NULL,
  impact_zone impact_zone NOT NULL,
  impact_direction impact_direction NOT NULL,
  speed_kmh integer NOT NULL,
  jerk_peak double precision NOT NULL,
  approach_angle double precision NOT NULL DEFAULT 0,
  severity severity NOT NULL,
  report_json jsonb NOT NULL,
  local_id varchar(100),
  matched_accident_id uuid,
  match_confidence integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fault_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_id uuid NOT NULL REFERENCES accidents(id) ON DELETE CASCADE,
  app_liability_user integer NOT NULL,
  app_liability_other integer NOT NULL,
  najm_liability_user integer,
  najm_liability_other integer,
  liability_difference integer,
  user_description varchar(1000),
  authority_source varchar(20),
  authority_other varchar(100),
  assessed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE false_alarms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_id uuid UNIQUE REFERENCES accidents(id) ON DELETE SET NULL,
  reason varchar(255) NOT NULL,
  details varchar(1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(200) NOT NULL,
  mobile varchar(40) NOT NULL,
  email varchar(200),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cross_verified_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_a_id uuid NOT NULL REFERENCES accidents(id),
  accident_b_id uuid NOT NULL REFERENCES accidents(id),
  verified_impact_zone_a varchar(50) NOT NULL DEFAULT 'unknown',
  verified_impact_zone_b varchar(50) NOT NULL DEFAULT 'unknown',
  verified_speed_a_kmh double precision NOT NULL DEFAULT 0,
  verified_speed_b_kmh double precision NOT NULL DEFAULT 0,
  first_contact_party varchar(20) NOT NULL DEFAULT 'UNKNOWN',
  consistency_status varchar(20) NOT NULL DEFAULT 'PARTIAL',
  consistency_flags jsonb DEFAULT '[]'::jsonb,
  liability_a_percent double precision NOT NULL DEFAULT 50,
  liability_b_percent double precision NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

/**
 * إنشاء قاعدة بيانات اختبار PGlite جديدة (في الذاكرة) مع كامل المخطّط.
 * كل استدعاء يعطي قاعدة معزولة تمامًا — مثالي للعزل بين الاختبارات.
 */
export async function createTestDb(): Promise<TestDbHandle> {
  const client = new PGlite();
  await client.exec(DDL);
  const db = drizzle(client, { schema });
  return {
    db,
    client,
    close: async () => {
      await client.close();
    },
  };
}
