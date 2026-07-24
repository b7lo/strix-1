# Strix Project - Full Technical Documentation

Welcome to the Strix App development environment. This comprehensive document contains all necessary instructions for running, building, understanding the core architecture, and maintaining the Strix application.

*مرحباً بك في بيئة تطوير تطبيق Strix. تحتوي هذه الوثيقة الشاملة على كافة التعليمات اللازمة لتشغيل التطبيق، بناءه، فهم هيكلته المعمارية، وصيانته.*

---

## 🎯 1. Project Overview (نبذة عن المشروع)

**Strix** is an advanced, high-fidelity car accident detection, forensic analysis, and reporting application. It leverages raw hardware sensors to detect collisions automatically, accurately assesses legal liability based on impact vectors, and generates professional-grade forensic reports (Croquis) seamlessly.

تطبيق **Strix** هو منصة احترافية متقدمة لاكتشاف حوادث السيارات وتحليلها الجنائي وإصدار التقارير. يعتمد التطبيق على قراءة حساسات الهاتف المدمجة للكشف عن التصادمات تلقائياً، تقييم المسؤولية القانونية (نسبة الخطأ) بناءً على زوايا وقوة الاصطدام، وتوليد تقارير كروكي جنائية بدقة عالية.

---

## 🏗 2. Core Features & Architecture (الهيكلة والميزات الأساسية)

The project has evolved significantly and now includes several highly specialized, custom-built internal engines located in the `artifacts/strix/lib/` directory:

### A. 8-Zone Accident Detection Engine (محرك اكتشاف الحوادث ثماني الاتجاهات)
- **Files:** `sensorUtils.ts`, `kalmanFilter.ts`
- **Logic:** Upgraded from a legacy 16-zone logic to a robust 8-zone mapping system for maximum hardware compatibility and precision. It leverages Apple's Core Motion logic to interpret G-forces and rotation, mapping gyroscope axes perfectly to prevent inaccurate rotation calculations and eliminate false positives.

### B. Liability & Collision Analysis (تحديد المسؤولية وتحليل الاصطدام)
- **Files:** `liabilityEngine.ts`, `advancedAnalysis.ts`, `otherPartyAnalysis.ts`
- **Logic:** An automated legal liability engine that calculates fault percentages based on multi-party crash data and a peak-based collision detection window, ensuring alignment with professional traffic liability standards.

### C. Forensic Reporting & Mapping (التقارير الجنائية وتكامل الخرائط)
- **Files:** `croquisGenerator.ts`
- **Logic:** A visual accident sketch system that generates forensic croquis. Integrated seamlessly with `react-native-maps` and `expo-location` to securely pin collision coordinates and provide highly accurate geographic context for traffic incidents.

### D. Auto-Shrink PDF Export (تصدير التقارير بصيغة PDF)
- **Files:** `pdfExport.ts`
- **Logic:** A customized ATS and forensic-compatible PDF generator built using Puppeteer and Expo APIs. Features a dynamic "Auto-Shrink" scaling capability that dynamically fits all accident data onto a strictly formatted, single A4 page.

### E. Bilingual & RTL Localization (دعم اللغتين والتخطيط من اليمين لليسار)
- **Files:** `i18n/`
- **Logic:** Full Arabic and English bilingual support. The interface dynamically handles LTR/RTL layouts natively, ensuring text data-binding and formatting automatically adjust to the user's preferred locale.

---

## 💻 3. Tech Stack (التقنيات المستخدمة)

- **Framework:** React Native with Expo (SDK 54) & Expo Router.
- **Hardware Integration:** `expo-sensors`, `expo-location` (Core Motion).
- **Mapping & UI:** `react-native-maps`, TailwindCSS/NativeWind, `expo-glass-effect`.
- **Export & Share:** `expo-print`, `expo-sharing`.
- **Database & Sync:** Supabase (`accidentSync.ts`).
- **State Management:** React Query, AsyncStorage.

---

## 🚀 4. How to Run the Project (طريقة تشغيل المشروع)

To start the development server, run the following command in the terminal:

```bash
cd artifacts/strix
npm run dev
# or
npx expo start
```

### Viewing the App (معاينة التطبيق):
- **iOS:** Download the "Expo Go" app from the App Store, open your Camera, and scan the QR code that appears in the terminal.
- **Android:** Download the "Expo Go" app from the Google Play Store and scan the QR code directly from the Expo app.
- **Web:** Press `w` in the terminal to open the app in a web browser.

---

## 📦 5. Installing Dependencies (تثبيت الحزم)

If you add a new library or clone this project, make sure to install dependencies:

```bash
cd artifacts/strix
npm install
```

---

## 🌐 6. Supabase Integration (قاعدة البيانات)

This project is connected to **Supabase** for secure backend data synchronization. Ensure your `.env` file contains the correct credentials:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 🏗 7. Building for Production (رفع التطبيق للمتجر)

To build the app for Apple App Store (TestFlight) or Google Play, we use EAS (Expo Application Services). 

*(Note: Ensure all dev artifacts and crash simulators are removed before running production builds to comply with App Store standards).*

```bash
cd artifacts/strix
npm install -g eas-cli
eas login
eas build --profile production
```

*(Note: Apple Developer Account is required for iOS builds).*

---

## 🤖 8. SpecKit & AI Assistants (المساعد الذكي وأدوات التخطيط)

This project has been heavily integrated with **SpecKit** to streamline development and planning through AI agents. To use these powerful workflow tools in your chat interface, prefix the commands with the `$` symbol:

- `$speckit-constitution` - Establish project principles
- `$speckit-specify` - Create baseline specification
- `$speckit-plan` - Create implementation plan
- `$speckit-tasks` - Generate actionable tasks
- `$speckit-implement` - Execute implementation

---
*هذا الملف هو الوثيقة التقنية الرسمية والمحدثة لمشروع Strix، ويحتوي على كافة التفاصيل الهندسية والأوامر الخاصة ببيئة التطوير وإعدادات أدوات الذكاء الاصطناعي.*
