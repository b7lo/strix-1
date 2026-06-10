# Strix Admin Dashboard — خطة التنفيذ الكاملة

## 1. الهدف

بناء لوحة تحكم إدارية (Admin Dashboard) تظهر كل إحصائيات الحوادث:
- متوسط الفرق بين التطبيق ونجم
- عدد الحوادث غير الحقيقية (false alarms)
- عدد الحوادث الكلي
- الحوادث مع التواريخ والفرز
- رقم ID الحادث
- الحوادث المشتركة (matched / dual-party)
- مقارنة نسب الخطأ (التطبيق vs نجم)

---

## 2. هيكل المشروع

```
Strix-Assets-main/
├── artifacts/
│   ├── api-server/src/routes/
│   │   ├── index.ts              # ← أضف dashboardRouter
│   │   └── dashboard.ts          # NEW: API endpoints للوحة
│   └── mockup-sandbox/src/
│       ├── App.tsx               # ← أضف routing للـ Dashboard
│       ├── components/
│       │   ├── mockups/
│       │   │   ├── DashboardHome.tsx        # الصفحة الرئيسية
│       │   │   ├── DashboardAccidents.tsx   # جدول الحوادث
│       │   │   ├── DashboardAssessments.tsx # جدول مقارنة نجم
│       │   │   ├── DashboardMatched.tsx     # الحوادث المشتركة
│       │   │   ├── DashboardFalseAlarms.tsx # الحوادث غير الحقيقية
│       │   │   ├── StatsCards.tsx           # بطاقات الإحصائيات
│       │   │   └── Charts.tsx               # الرسوم البيانية
│       │   └── ui/ (shadcn — موجود)
│       ├── lib/
│       │   └── dashboard-api.ts          # NEW: API calls
│       └── types/
│           └── dashboard.ts            # NEW: TypeScript types
└── lib/db/src/schema/
    └── index.ts               # ← أضف جداول fault_assessments + false_alarms
```

---

## 3. قاعدة البيانات — إضافات

### 3.1 جدول `fault_assessments` (مقارنة نجم)

```sql
CREATE TABLE fault_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_id UUID NOT NULL REFERENCES accidents(id) ON DELETE CASCADE,
  app_liability_user INTEGER NOT NULL CHECK (app_liability_user IN (0, 25, 50, 75, 100)),
  app_liability_other INTEGER NOT NULL CHECK (app_liability_other IN (0, 25, 50, 75, 100)),
  najm_liability_user INTEGER CHECK (najm_liability_user IN (0, 25, 50, 75, 100)),
  najm_liability_other INTEGER CHECK (najm_liability_other IN (0, 25, 50, 75, 100)),
  liability_difference INTEGER,
  user_description TEXT,
  assessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 جدول `false_alarms` (حوادث غير حقيقية)

```sql
CREATE TABLE false_alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_id UUID REFERENCES accidents(id) ON DELETE SET NULL,
  device_id VARCHAR(160) NOT NULL,
  peak_g_force DOUBLE PRECISION,
  reported_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);
```

### 3.3 تحديث `lib/db/src/schema/index.ts`

أضف جدولين جدد بنفس نمط Drizzle ORP:
- `faultAssessmentsTable`
- `falseAlarmsTable`

---

## 4. API Endpoints — Backend

**ملف جديد**: `api-server/src/routes/dashboard.ts`

### `GET /api/dashboard/stats`
إحصائيات عامة:

```typescript
// Response
{
  totalAccidents: number;           // COUNT(*) FROM accidents
  totalFalseAlarms: number;        // COUNT(*) FROM false_alarms
  totalMatchedAccidents: number;   // COUNT(*) WHERE matched_accident_id IS NOT NULL
  totalAssessments: number;        // COUNT(*) FROM fault_assessments
  averageNajmDifference: number | null;  // AVG(liability_difference) FROM fault_assessments
  averageGForce: number;           // AVG(peak_g_force)
  accidentsBySeverity: { severity: string; count: number }[];
  accidentsByImpactZone: { zone: string; count: number }[];
  accidentsByDay: { date: string; count: number }[];  // آخر 30 يوم
}
```

### `GET /api/dashboard/accidents?page=1&limit=20&sortBy=timestamp&sortOrder=desc&search=&severity=`
قائمة الحوادث مع Pagination وفرز وبحث:

```typescript
// Response
{
  data: {
    id: string;
    deviceId: string;
    timestamp: string;
    latitude: number | null;
    longitude: number | null;
    peakGForce: number;
    impactZone: string;
    impactDirection: string;
    speedKmh: number;
    severity: string;
    matchedAccidentId: string | null;
    matchConfidence: number | null;
    hasAssessment: boolean;
    liabilityDifference: number | null;
    isFalseAlarm: boolean;
  }[];
  total: number;
  page: number;
  limit: number;
}
```

### `GET /api/dashboard/assessments?page=1&limit=20`
قائمة تقييمات نجم:

```typescript
{
  data: {
    id: string;
    accidentId: string;
    appLiabilityUser: number;
    appLiabilityOther: number;
    najmLiabilityUser: number | null;
    najmLiabilityOther: number | null;
    liabilityDifference: number | null;
    userDescription: string | null;
    assessedAt: string;
    accidentTimestamp: string;
    accidentSeverity: string;
  }[];
  total: number;
  averageDifference: number | null;
}
```

### `GET /api/dashboard/matched?page=1&limit=20`
الحوادث المشتركة:

```typescript
{
  data: {
    id: string;
    deviceId: string;
    timestamp: string;
    matchedAccidentId: string;
    matchConfidence: number;
    severity: string;
    impactZone: string;
  }[];
  total: number;
}
```

### `GET /api/dashboard/false-alarms?page=1&limit=20`
الحوادث غير الحقيقية:

```typescript
{
  data: {
    id: string;
    accidentId: string | null;
    deviceId: string;
    peakGForce: number | null;
    reportedAt: string;
    reason: string | null;
  }[];
  total: number;
}
```

---

## 5. الواجهة الأمامية — المكونات

### 5.1 الصفحة الرئيسية (`DashboardHome.tsx`)

```
┌─────────────────────────────────────────────────┐
│  [الإحصائيات]   [الحوادث]   [نجم]   [مشتركة]    │  ← Tabs/Sidebar
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│  │ 128  │ │  12  │ │  8   │ │ 4.2% │            │
│  │حادث  │ │غير   │ │مشترك │ │متوسط │            │
│  │      │ │حقيقي │ │      │ │الفرق │            │
│  └──────┘ └──────┘ └──────┘ └──────┘            │
│                                                   │
│  ┌──────────────────────────────────────┐        │
│  │  📈 الحوادث خلال آخر 30 يوم          │        │
│  │  [Line Chart — Recharts]            │        │
│  └──────────────────────────────────────┘        │
│                                                   │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  🥧 الشدة    │  │  🥧 مناطق   │              │
│  │  [Pie Chart] │  │  [Pie Chart]│              │
│  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────┘
```

**مكونات shadcn/ui المستخدمة**:
- `Card`, `CardHeader`, `CardContent`, `CardTitle` → للبطاقات
- `Tabs` للتنقل بين الأقسام
- `Badge` للوسوم
- `ScrollArea` للمحتوى الطويل

**الرسوم البيانية** (Recharts):
- `<LineChart>` للحوادث خلال 30 يوم
- `<PieChart>` لتوزيع الشدة ومناطق الاصطدام
- `<BarChart>` لمقارنة التطبيق vs نجم

### 5.2 جدول الحوادث (`DashboardAccidents.tsx`)

استخدم `@tanstack/react-table` (موجود في dependencies) مع shadcn `<Table>`:

| ID الحادث | التاريخ | السرعة | G-Force | منطقة الاصطدام | الشدة | مطابق؟ | تقييم نجم؟ | الفرق |
|-----------|---------|--------|---------|----------------|-------|--------|------------|-------|
| a1b2...   | 2026-06-01 | 45 | 3.2 | front | severe | ✅ | ✅ | 25% |
| c3d4...   | 2026-05-28 | 30 | 2.1 | rear | minor | ❌ | ❌ | — |

- فرز على كل الأعمدة
- فلتر بالتاريخ، الشدة، البحث
- Pagination أسفل الجدول

### 5.3 جدول تقييمات نجم (`DashboardAssessments.tsx`)

| ID الحادث | نسبة التطبيق | نسبة نجم | الفرق | الوصف | التاريخ |
|-----------|-------------|---------|-------|-------|---------|
| a1b2...   | 75% / 25%   | 50% / 50% | +25% | تصادم خلفي | 2026-06-01 |

- متوسط الفرق يظهر أعلى الجدول كـ Stat Card
- تلوين حسب حجم الفرق: 0% أخضر، 25% أصفر، 50%+ أحمر

### 5.4 الحوادث المشتركة (`DashboardMatched.tsx`)

| ID الحادث | ID الطرف الآخر | نسبة الثقة | الشدة | منطقة الاصطدام |
|-----------|---------------|-----------|-------|----------------|
| a1b2...   | x9y8...       | 92%       | severe | front |

### 5.5 الحوادث غير الحقيقية (`DashboardFalseAlarms.tsx`)

| ID | الجهاز | G-Force | السبب | التاريخ |
|----|--------|---------|-------|---------|
| ... | device_123 | 1.8 | اهتزاز أثناء الوقوف | 2026-06-01 |

---

## 6. المكتبات المستخدمة (موجودة فعلاً)

- `recharts` — الرسوم البيانية
- `@tanstack/react-table` — الجداول المتقدمة
- `@radix-ui/react-tabs` — التبويبات
- `tailwindcss` + `tailwind-animate` — التنسيق
- `lucide-react` — الأيقونات (موجودة مع shadcn)
- `date-fns` — تنسيق التواريخ

---

## 7. Routing في mockup-sandbox

أضف في `App.tsx` دعم الـ Dashboard:

```
/preview/DashboardAccidents    → جدول الحوادث
/preview/DashboardAssessments  → جدول تقييمات نجم
/preview/DashboardMatched      → الحوادث المشتركة
/preview/DashboardHome         → الصفحة الرئيسية (كلشي معاً)
/preview/DashboardFalseAlarms  → الحوادث غير الحقيقية
/preview/StatsCards            → بطاقات الإحصائيات
```

كل كومبوننت Dashboard يشتغل منفرد كـ Preview، وفي نفس الوقت ممكن يجمعها `DashboardHome`.

---

## 8. الأولويات (ترتيب التنفيذ)

1. **P0**: تحديث قاعدة البيانات (جداول `fault_assessments` و `false_alarms`)
2. **P0**: API endpoints (`GET /api/dashboard/*`)
3. **P1**: `StatsCards.tsx` + `DashboardHome.tsx` (الصفحة الرئيسية + بطاقات)
4. **P1**: `DashboardAccidents.tsx` (جدول الحوادث)
5. **P2**: `DashboardAssessments.tsx` (جدول تقييمات نجم)
6. **P2**: `DashboardMatched.tsx` (الحوادث المشتركة)
7. **P3**: `DashboardFalseAlarms.tsx` (الحوادث غير الحقيقية)
8. **P3**: `Charts.tsx` (الرسوم البيانية المستقلة)

---

## 9. اختبار الصحة

- كل API endpoint يشتغل ويعيد بيانات صحيحة
- الجداول تظهر البيانات مع Pagination
- الأزرار والفرز تشتغل
- الألوان والأيقونات ظاهرة صح
- الصفحة تستجيب للشاشات المختلفة (Responsive)
