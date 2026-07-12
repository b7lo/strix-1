import React from 'react';
import { Eye, HeartHandshake, Sparkles } from 'lucide-react';

const pillars = [
  {
    icon: <Eye size={22} />,
    title: 'شاهدٌ لا ينحاز',
    desc: 'في لحظة الحادث، تختلط الروايات وتضيع الحقيقة. ستركس يبقى الطرف المحايد الذي يوثّق ما جرى فعلاً، بالأرقام لا بالانطباعات.',
  },
  {
    icon: <HeartHandshake size={22} />,
    title: 'صُنع ليحمي حقّك',
    desc: 'لم نبنِ ستركس لجمع البيانات، بل لنمنحك سنداً تقنياً يقف إلى جانبك أمام شركات التأمين والجهات المختصة بثقة وشفافية.',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'ذكاءٌ يعمل بصمت',
    desc: 'لا أزرار تضغطها في لحظة الذعر. ستركس يعمل في الخلفية، يترقّب الطريق، ويتحرك في الجزء من الثانية الذي يفصل بين حادثٍ موثّق وحادثٍ ضائع.',
  },
];

export default function BrandStory() {
  return (
    <section className="story-section" id="story">
      <div className="story-inner">
        <div className="story-lead reveal">
          <span className="section-eyebrow">قصتنا</span>
          <h2 className="section-title">
            وُلد ستركس من سؤالٍ واحد:<br />
            <span className="accent">من يشهد لك حين لا شاهد؟</span>
          </h2>
          <p className="story-paragraph">
            على طرقنا، تقع آلاف الحوادث يومياً، وفي كل مرة تتحول القصة إلى كلمةٍ ضد كلمة.
            من المخطئ؟ من كان مسرعاً؟ من فرمل في الوقت المناسب؟ الإجابات تضيع بين الصدمة
            والفوضى، وتُترك الحقوق للحظّ والتفاوض.
          </p>
          <p className="story-paragraph">
            آمنّا بأن التقنية التي تحملها في جيبك قادرة على إنصافك. فحوّلنا مستشعرات هاتفك
            إلى نظام رصدٍ ذكي يرى ما لا تراه العين، ويتذكّر ما تنساه اللحظة، ويتحدث بلغةٍ
            واحدة يفهمها الجميع: <strong>الدليل.</strong>
          </p>
        </div>

        <div className="story-pillars">
          {pillars.map((p, i) => (
            <div key={i} className={`story-pillar reveal reveal-delay-${i + 1}`}>
              <div className="story-pillar-icon">{p.icon}</div>
              <div>
                <h3 className="story-pillar-title">{p.title}</h3>
                <p className="story-pillar-desc">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
