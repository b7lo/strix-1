import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, History, Users, BarChart3, Database, FileText } from 'lucide-react';

const features = [
  {
    icon: <ShieldCheck size={28} className="text-secondary" />,
    title: "رصد الحوادث الذكي",
    description: "تحليل دقيق لنقاط التصادم عبر 16 منطقة مختلفة في المركبة لتحديد الأضرار بدقة متناهية."
  },
  {
    icon: <History size={28} className="text-accent" />,
    title: "تحليل ما قبل الاصطدام",
    description: "تسجيل وتحليل بيانات القيادة لآخر 10 ثوانٍ (الفرملة، السرعة، الانحراف) لتوضيح التسلسل الزمني."
  },
  {
    icon: <FileText size={28} className="text-primary" />,
    title: "تقرير فني وكروكي آلي",
    description: "إصدار تقرير شامل مع رسم توضيحي لمكان وزاوية الاصطدام ومسار المركبات اعتماداً على الحساسات."
  },
  {
    icon: <Users size={28} className="text-secondary" />,
    title: "نظام المعرف الموحد",
    description: "ربط أطراف الحادث تلقائياً في النظام بناءً على تقاطع الموقع الجغرافي وتطابق وقت الاصطدام بالثانية."
  },
  {
    icon: <Database size={28} className="text-accent" />,
    title: "تخزين سحابي آمن",
    description: "تأسيس قاعدة بيانات متكاملة لحفظ كافة التقارير وبيانات الحساسات لضمان الرجوع إليها بأمان تام."
  },
  {
    icon: <BarChart3 size={28} className="text-primary" />,
    title: "تحليل الدقة المستمر",
    description: "محرك ثقة يتعلم باستمرار لتطوير دقة التحليل ومقارنتها مع التقارير الرسمية مثل نجم."
  }
];

export default function Features() {
  return (
    <section className="py-24 bg-background" id="features">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-title mb-4">تقنيات متقدمة لتوثيق لا يقبل الشك</h2>
          <p className="text-body">
            تم بناء ستريكس باستخدام أحدث تقنيات دمج الحساسات والذكاء الاصطناعي لتقديم بيانات دقيقة وموثوقة تدعم مطالباتك.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="card"
            >
              <div className="mb-6 p-3 bg-muted inline-block rounded-2xl border border-border">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
