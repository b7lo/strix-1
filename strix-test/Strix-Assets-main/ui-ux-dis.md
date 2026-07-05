# Strix — Brand Identity System

**Version:** 1.0  
**Last Updated:** June 2026  
**Platform:** iOS Mobile Application  
**Language Support:** Arabic (RTL) · English (LTR)

---

## 1. Brand Essence

| Attribute       | Value                                                     |
| --------------- | --------------------------------------------------------- |
| **Personality** | موثوق · ذكي · سريع الاستجابة · محترف                      |
| **Tone**        | جدّي عند الضرورة، هادئ في الحالات الطبيعية                |
| **Feel**        | Premium · Tech-forward · Trustworthy · Urgent when needed |
| **Design Mode** | Dark Mode Primary · Light Mode Secondary                  |

---

## 2. Logo

### الشعار الأساسي

```
المكوّن الخطي (الـ M الفنية) + كلمة "Strix"
```

### قواعد الاستخدام

- **الإصدار الأخضر على أبيض** — للاستخدامات الرسمية والوثائق
- **الإصدار الأسود على أخضر** — للتطبيقات الترويجية والأيقونة الرئيسية
- **الإصدار الأبيض على أسود/داكن** — للواجهة الداكنة (Dark Mode)
- **الحد الأدنى للحجم:** 120px عرض رقمياً · 3cm طباعة
- **المساحة الحرة حول الشعار:** لا تقل عن 16px من كل جهة

### محظورات

- ❌ لا تغيّر ألوان الشعار خارج الألوان المعتمدة
- ❌ لا تشوّه أو تدوّر الشعار
- ❌ لا تضع الشعار على خلفيات منخفضة التباين
- ❌ لا تضيف ظلالاً أو تأثيرات على الشعار

---

## 3. Color Palette — لوحة الألوان

### الألوان الأساسية

| الاسم            | HEX       | RGB          | الاستخدام                           |
| ---------------- | --------- | ------------ | ----------------------------------- |
| **Strix Green**  | `#1DB768` | 29, 183, 104 | اللون الرئيسي — CTA، أيقونات، تمييز |
| **Deep Green**   | `#0d8a49` | 13, 138, 73  | Hover states، تدرجات، أزرار ضغط     |
| **Forest Green** | `#07532c` | 7, 83, 44    | خلفيات داكنة معتمة، تباين عالٍ      |

### الألوان المحايدة

| الاسم          | HEX       | الاستخدام                                    |
| -------------- | --------- | -------------------------------------------- |
| **Pure White** | `#FFFFFF` | نصوص رئيسية (Dark Mode)، خلفيات (Light Mode) |
| **Off White**  | `#F5F8F5` | خلفيات ثانوية، بطاقات                        |
| **Light Gray** | `#E8EDE8` | فواصل، حدود                                  |
| **Mid Gray**   | `#8A9A8A` | نصوص ثانوية، placeholder                     |
| **Dark Gray**  | `#2A2E2A` | خلفية ثانوية (Dark Mode)                     |
| **Deep Black** | `#111411` | الخلفية الرئيسية (Dark Mode)                 |

### ألوان الحالات (State Colors)

| الحالة             | HEX       | الاستخدام                  |
| ------------------ | --------- | -------------------------- |
| **Critical Red**   | `#FF3B30` | تنبيهات طارئة، حوادث شديدة |
| **Warning Orange** | `#FF9500` | تحذيرات، شدة متوسطة        |
| **Safe Green**     | `#1DB768` | حالة آمنة، شدة خفيفة       |
| **Info Blue**      | `#007AFF` | معلومات، تأكيد iOS         |
| **Neutral Gray**   | `#8E8E93` | غير فعّال، معلّق           |

### التدرجات (Gradients)

```css
/* التدرج الرئيسي — Primary Gradient */
background: linear-gradient(135deg, #1db768 0%, #07532c 100%);

/* تدرج الطوارئ — Emergency Gradient */
background: linear-gradient(135deg, #ff3b30 0%, #8b0000 100%);

/* تدرج الخلفية الداكنة — Dark Surface Gradient */
background: linear-gradient(180deg, #111411 0%, #1a1f1a 100%);
```

---

## 4. Typography — الطباعة

### الخط الرئيسي

**Inter** — خط سانس سيريف عالمي، ممتاز للقراءة في الشاشات الصغيرة

```
الأوزان المستخدمة:
- Inter Regular (400)    → نصوص جسم الصفحة
- Inter Medium (500)     → نصوص ثانوية مميزة
- Inter SemiBold (600)   → عناوين فرعية، ليبلات
- Inter Bold (700)       → عناوين رئيسية، أرقام مهمة
- Inter ExtraBold (800)  → شاشات الطوارئ، countdown
```

### الخط العربي

**IBM Plex Arabic** أو **Cairo** — للمحتوى العربي

```
الأوزان المستخدمة:
- Regular (400) → نصوص عادية
- SemiBold (600) → عناوين
- Bold (700)     → تمييز، طوارئ
```

### التسلسل الهرمي للأحجام

```
Display     → 34px / Bold   / LS: -0.4px  → عنوان شاشة الطوارئ
Title 1     → 28px / Bold   / LS: -0.3px  → عنوان الشاشة الرئيسية
Title 2     → 22px / Bold   / LS: -0.2px  → عناوين الأقسام
Headline    → 17px / SemiBold / LS: -0.1px → عناوين البطاقات
Body        → 15px / Regular / LS: 0       → النصوص الأساسية
Callout     → 14px / Regular / LS: 0       → ملاحظات، تفاصيل
Subheadline → 13px / Medium  / LS: 0       → ليبلات ثانوية
Footnote    → 12px / Regular / LS: 0.1px  → معلومات إضافية
Caption     → 11px / Regular / LS: 0.15px → تسميات الأيقونات
Micro       → 10px / Medium  / LS: 0.2px  → شارات، tags
```

---

## 5. Spacing & Grid — الشبكة والمسافات

### نظام المسافات (8pt Grid)

```
4px   → XS — مسافة داخل عناصر صغيرة
8px   → SM — مسافة بين العناصر المتجاورة
12px  → MD — padding بطاقات صغيرة
16px  → LG — padding عام للشاشة (الأفضل)
20px  → XL — فواصل أقسام
24px  → 2XL → مسافة بين الأقسام الكبيرة
32px  → 3XL → margins رئيسية
40px  → 4XL → مسافة بين شاشات onboarding
```

### حواشي الشاشة (Safe Areas)

```
Horizontal padding  → 16px (أدنى) · 20px (مثالي)
Top (below status bar) → 16px
Bottom (above home indicator) → 34px (iPhone X+)
```

---

## 6. Border Radius — نصف القطر

```
4px   → Micro — شارات صغيرة جداً
8px   → Small  — chips، tags صغيرة
12px  → Medium — بطاقات، حقول إدخال
16px  → Large  — بطاقات كبيرة
20px  → XLarge — صفائح bottom sheet
28px  → Full Card → بطاقات ضخمة
50%   → Circular → أزرار دائرية، أفاتار
```

---

## 7. Elevation & Shadows — الظلال والارتفاع

```css
/* Level 1 — بطاقات ثانوية */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);

/* Level 2 — بطاقات أساسية */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);

/* Level 3 — Bottom Sheets, Modals */
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

/* Level 4 — FABs, Urgent Alerts */
box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);

/* Green Glow — للعناصر النشطة */
box-shadow: 0 4px 20px rgba(29, 183, 104, 0.35);

/* Red Glow — لشاشات الطوارئ */
box-shadow: 0 4px 20px rgba(255, 59, 48, 0.45);
```

---

## 8. Iconography — نظام الأيقونات

### المكتبة الموصى بها

**SF Symbols 5** (iOS Native) أو **Tabler Icons** (للمنصات المتقاطعة)

### قواعد الاستخدام

| الحجم    | الاستخدام                        |
| -------- | -------------------------------- |
| **16px** | أيقونات داخل النصوص، حقول البحث  |
| **20px** | أيقونات شريط التنقل السفلي       |
| **24px** | أيقونات البطاقات والأقسام        |
| **32px** | أيقونات الإجراءات، quick actions |
| **48px** | أيقونات شاشة Onboarding          |
| **64px** | أيقونات حالات فارغة، تأكيدات     |

### الأسلوب البصري

- **الوزن:** Outline (افتراضي) · Filled (للحالة المفعّلة فقط)
- **السُمك:** 1.5px Stroke
- **Corner:** مستدير دائماً

---

## 9. Motion & Animation — الحركة والانتقالات

### مبادئ الحركة

```
المبدأ الأول  → Purposeful   — كل حركة لها هدف وظيفي
المبدأ الثاني → Responsive   — الاستجابة تبدأ في أقل من 100ms
المبدأ الثالث → Contextual   — سرعة الحركة تعكس أهميتها
```

### توقيتات الانتقال

```css
/* انتقالات سريعة — تأكيدات، hover */
transition: all 150ms ease-out;

/* انتقالات عادية — تنقل بين الشاشات */
transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);

/* انتقالات بطيئة — ظهور مودالات، bottom sheets */
transition: all 450ms cubic-bezier(0.34, 1.56, 0.64, 1);

/* نبض — للعناصر النشطة مثل الرادار */
animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

/* تنبيه طارئ — نبض أسرع */
animation: urgentPulse 0.8s ease-in-out infinite;
```

---

## 10. Component Specifications — مواصفات المكونات

### الأزرار (Buttons)

```
Primary Button:
  Height: 52px
  Background: #1DB768
  Text: White · 17px · SemiBold
  Border Radius: 14px
  Padding: 0 24px

Destructive Button (Emergency):
  Height: 64px
  Background: #FF3B30
  Text: White · 17px · Bold
  Border Radius: 18px
  Box Shadow: 0 8px 24px rgba(255, 59, 48, 0.4)

Ghost Button:
  Height: 52px
  Background: rgba(255,255,255,0.08)
  Border: 1.5px solid rgba(255,255,255,0.15)
  Text: White · 17px · Medium
  Border Radius: 14px

Icon FAB (Floating Action):
  Size: 56x56px
  Border Radius: 18px
  Background: #1DB768
  Icon: 24px White
  Shadow: Level 4
```

### البطاقات (Cards)

```
Standard Card:
  Background: #1A1F1A (Dark) / #FFFFFF (Light)
  Border Radius: 16px
  Padding: 16px
  Border: 0.5px solid rgba(255,255,255,0.06) [Dark]

Telemetry Card:
  Background: #1E241E
  Border Radius: 12px
  Padding: 12px
  Min Width: (screen - 48px) / 2

Alert Card (Urgent):
  Background: #1A0000
  Border: 1.5px solid #FF3B30
  Border Radius: 16px
  Shadow: Red Glow
```

### حقول الإدخال (Text Fields)

```
Height: 52px
Background: rgba(255,255,255,0.06) [Dark]
Border: 1.5px solid rgba(255,255,255,0.10)
Border (Focused): 1.5px solid #1DB768
Border Radius: 12px
Padding: 0 16px
Text: 15px · Regular · White
Placeholder: 15px · Regular · #8A9A8A
```

### الشارات (Badges)

```
Critical:  Background #FF3B30 · Text White · 10px Bold
Severe:    Background #FF9500 · Text White · 10px Bold
Minor:     Background #1DB768 · Text White · 10px Bold
Neutral:   Background rgba(255,255,255,0.1) · Text #8A9A8A
```

### شريط التنقل السفلي (Tab Bar)

```
Height: 83px (includes home indicator area)
Background: rgba(20, 25, 20, 0.95)
Blur: backdrop-filter: blur(20px)
Border Top: 0.5px solid rgba(255,255,255,0.08)
Active Item Color: #1DB768
Inactive Item Color: #8E8E93
Icon Size: 24px
Label Size: 10px
```

---

## 11. Dark Mode Guidelines — الوضع الداكن

### طبقات الخلفية

```
Layer 0 (Base)      → #0A0D0A  — الخلفية الرئيسية للشاشة
Layer 1 (Surface)   → #111411  — خلفية البطاقات الأولى
Layer 2 (Elevated)  → #1A1F1A  — بطاقات مرفوعة، قوائم
Layer 3 (Overlay)   → #222822  — مودالات، bottom sheets
```

### نسب الشفافية للنصوص

```
Primary Text    → #FFFFFF · Opacity 100%
Secondary Text  → #FFFFFF · Opacity 60%
Tertiary Text   → #FFFFFF · Opacity 35%
Disabled Text   → #FFFFFF · Opacity 20%
```

---

## 12. Accessibility — إمكانية الوصول

### نسب التباين المطلوبة (WCAG AA)

```
نص عادي     → 4.5:1 minimum
نص كبير     → 3.0:1 minimum
عناصر UI    → 3.0:1 minimum
```

### فحص الألوان الرئيسية

```
#1DB768 على #111411 → نسبة 6.8:1 ✅ (تجاوز AA)
#FFFFFF على #111411 → نسبة 18.2:1 ✅
#FF3B30 على #111411 → نسبة 5.1:1 ✅
```

### اشتراطات إضافية

- ✅ جميع الأزرار الإجرائية لا يقل حجمها عن **44×44px** (حد Apple)
- ✅ دعم Dynamic Type (قابلية تغيير حجم الخط من إعدادات iOS)
- ✅ دعم VoiceOver مع aria-labels واضحة
- ✅ لا تعتمد على اللون وحده لنقل المعلومات (أضف أيقونات أو نص)
- ✅ كل الأيقونات التفاعلية بحاجة لـ accessibilityLabel

---

## 13. RTL Support — دعم العربية

### قواعد عامة

```
- اتجاه النص: RTL افتراضياً للعربية
- الأيقونات الاتجاهية (سهم للأمام/الخلف) تُعكس في RTL
- الأيقونات الغير اتجاهية (قلب، نجمة، منزل) لا تُعكس
- الشبكة والتخطيط يُقلب بالكامل
- التواريخ والأرقام تبقى LTR داخل سياق RTL
```

### استثناءات RTL

```
❌ لا تعكس: الشعار، الساعات، الخرائط، الأرقام التقنية
✅ تعكس: التخطيط العام، الأسهم الملاحية، الـ padding الجانبية
```

---

## 14. App Icon Guidelines — أيقونة التطبيق

```
المقاسات المطلوبة لـ iOS:
  1024×1024px → App Store
  180×180px   → iPhone @3x
  120×120px   → iPhone @2x
  87×87px     → Spotlight @3x
  60×60px     → Spotlight @2x

الخلفية: #1DB768 (اللون الأخضر الرئيسي)
الشعار: الـ M الفنية بالأبيض أو الأسود
Border Radius: iOS يطبّق الـ radius تلقائياً (لا تضيفه يدوياً)
```

---

## 15. Design Tokens Summary — الكود المرجعي

```json
{
  "color": {
    "brand": {
      "primary": "#1DB768",
      "dark": "#0d8a49",
      "deep": "#07532c"
    },
    "state": {
      "critical": "#FF3B30",
      "warning": "#FF9500",
      "safe": "#1DB768",
      "info": "#007AFF"
    },
    "background": {
      "base": "#0A0D0A",
      "surface": "#111411",
      "elevated": "#1A1F1A",
      "overlay": "#222822"
    },
    "text": {
      "primary": "#FFFFFF",
      "secondary": "rgba(255,255,255,0.6)",
      "tertiary": "rgba(255,255,255,0.35)",
      "accent": "#1DB768"
    }
  },
  "typography": {
    "fontFamily": {
      "latin": "Inter",
      "arabic": "IBM Plex Arabic"
    },
    "scale": {
      "display": 34,
      "title1": 28,
      "title2": 22,
      "headline": 17,
      "body": 15,
      "subheadline": 13,
      "footnote": 12,
      "caption": 11
    }
  },
  "spacing": {
    "xs": 4,
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 20,
    "2xl": 24,
    "3xl": 32,
    "4xl": 40
  },
  "radius": {
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 20,
    "full": 9999
  }
}
```

---

_Strix Brand Identity v1.0 — جميع التحديثات تتم عبر نظام التصميم المركزي_
