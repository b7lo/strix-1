import React from 'react';
import { Gauge, Zap, Hand, Navigation, Crosshair, ListChecks } from 'lucide-react';

const recorded = [
  { icon: <Gauge size={18} />, label: 'السرعة' },
  { icon: <Zap size={18} />, label: 'قوة الاصطدام' },
  { icon: <Hand size={18} />, label: 'الفرملة' },
  { icon: <Navigation size={18} />, label: 'اتجاه الحركة' },
  { icon: <Crosshair size={18} />, label: 'نقطة الاصطدام' },
  { icon: <ListChecks size={18} />, label: 'تفاصيل ثانية تفهم اللي صار' },
];

const reasons = [
  {
    title: 'ليش سوّينا ستركس؟',
    desc: 'لأن كثير من الحوادث مو مشكلتها الحادث نفسه… مشكلتها اللي يصير بعده. كل واحد يروي القصة بطريقته، ومع الوقت تنسى التفاصيل. وقتها وجود بيانات واضحة أفضل من أي نقاش.',
  },
  {
    title: 'ما نقول لك صدّقنا…',
    desc: 'خلّ البيانات تتكلم. ستركس ما يختار طرف، ولا يكتب قصة. هو بس يسجّل اللي صار ويحوّله إلى معلومات واضحة بين يديك.',
  },
  {
    title: 'ليه الناس متحمسين له؟',
    desc: 'لأن أغلبنا يسوق كل يوم، وكلنا نتمنى ما نحتاجه. لكن إذا احتجناه… نبي شيء يكون جاهز قبل لا نفكر فيه.',
  },
];

export default function BrandStory() {
  return (
    <section className="story-section" id="story">
      <div className="story-inner-col">
        {/* Opening */}
        <div className="story-lead-center reveal">
          <span className="section-eyebrow">قصتنا</span>
          <h2 className="section-title">
            إذا صار حادث…<br />
            <span className="accent">آخر شيء بتفكر فيه هو جوالك.</span>
          </h2>
          <p className="story-paragraph">
            بتكون تحاول تطمّن على نفسك وتستوعب اللي صار. وبين كل هذا، تبدأ الأسئلة تلاحقك…
          </p>
          <ul className="story-questions">
            <li>مين الغلطان؟</li>
            <li>كم كانت السرعة؟</li>
            <li>هل فرملت قبل الاصطدام؟</li>
            <li>وش اللي صار بالضبط؟</li>
          </ul>
        </div>

        {/* Strix role highlight */}
        <div className="story-highlight reveal reveal-delay-1">
          <h3 className="story-highlight-title">هنا يبدأ دور ستركس</h3>
          <p className="story-highlight-text">
            من قبل لا يصير الحادث، ستركس يكون شغّال بهدوء في الخلفية. ولو صار شيء، يحفظ أهم
            تفاصيل الرحلة تلقائياً، ويبدأ يحلّلها ويطلّع لك تقرير مرتّب يساعدك تعرف وش اللي صار.
          </p>
          <div className="story-nots">
            <span className="story-not">بدون كاميرات</span>
            <span className="story-not">بدون أجهزة تركّبها بالسيارة</span>
            <span className="story-not strong">كل اللي تحتاجه… جوالك</span>
          </div>
        </div>

        {/* What it records */}
        <div className="story-records reveal reveal-delay-1">
          <h3 className="story-records-title">وش يسجّل؟</h3>
          <p className="story-records-sub">قبل الحادث بثوانٍ، وأثناءه، وبعده — كلها في تقرير واحد مرتّب وسهل تقراه.</p>
          <div className="story-records-grid">
            {recorded.map((r, i) => (
              <div key={i} className="record-chip">
                <span className="record-chip-icon">{r.icon}</span>
                <span>{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reasons */}
        <div className="story-reasons">
          {reasons.map((r, i) => (
            <div key={i} className={`story-reason reveal reveal-delay-${i + 1}`}>
              <h3 className="story-reason-title">{r.title}</h3>
              <p className="story-reason-desc">{r.desc}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="story-note reveal">
          <span className="story-note-eyebrow">قبل ما تسجّل…</span>
          <p className="story-note-q">هل ستركس يمنع الحوادث؟</p>
          <p className="story-note-a">
            لا. نتمنى ما تحتاجه أبداً. لكن إذا صار شيء، هدفنا يكون عندك معلومات أوضح
            تساعدك تفهم اللي صار.
          </p>
        </div>
      </div>
    </section>
  );
}
