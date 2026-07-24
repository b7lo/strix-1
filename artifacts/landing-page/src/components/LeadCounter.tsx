import React, { useEffect, useState } from 'react';
import { getLeadsCount } from '../lib/leads';

/**
 * عدّاد العملاء المسجّلين — يعرض العدد الحقيقي من Supabase (دالة leads_count الآمنة).
 * يستمع لحدث 'strix:lead-registered' ليُحدّث العدد فورًا بعد أي تسجيل جديد.
 *
 * ملاحظة أمانة: يعرض العدد الحقيقي. يمكن إضافة أساس تسويقي اختياري عبر
 * VITE_LEADS_BASE_COUNT (يُجمع على العدد الحقيقي) — استخدمه بوعي لأن تضخيم
 * الأرقام قد يضلّل المستخدمين.
 */

const BASE = Number(import.meta.env.VITE_LEADS_BASE_COUNT ?? 0) || 0;

function formatArabic(n: number): string {
  try {
    return new Intl.NumberFormat('ar-SA').format(n);
  } catch {
    return String(n);
  }
}

interface LeadCounterProps {
  className?: string;
}

export default function LeadCounter({ className }: LeadCounterProps) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const c = await getLeadsCount();
      if (alive && c !== null) setCount(c);
    };
    load();
    const onRegistered = () => load();
    window.addEventListener('strix:lead-registered', onRegistered);
    return () => {
      alive = false;
      window.removeEventListener('strix:lead-registered', onRegistered);
    };
  }, []);

  // لا نعرض شيئًا إذا تعذّر جلب العدد (بدل عرض رقم مزيّف)
  if (count === null) return null;

  const total = count + BASE;

  return (
    <div className={className}>
      <span className="lead-counter-value">{formatArabic(total)}</span>
      <span className="lead-counter-label"> عميل مسجّل</span>
    </div>
  );
}
