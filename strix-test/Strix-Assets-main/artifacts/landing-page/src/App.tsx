import React from 'react';
import Hero from './components/Hero.tsx';
import Features from './components/Features.tsx';
import LeadForm from './components/LeadForm.tsx';

function Header() {
  return (
    <header className="py-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="text-xl font-bold tracking-tight">ستريكس</span>
        </div>
        
        <nav className="hidden md:flex gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">المميزات</a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">كيف يعمل</a>
          <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">الأسئلة الشائعة</a>
        </nav>
        
        <div>
          <a href="#join" className="btn btn-primary py-2 px-4 text-sm">التسجيل المبكر</a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="py-12 bg-primary text-primary-foreground">
      <div className="container grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold border border-white/20">
              S
            </div>
            <span className="text-xl font-bold tracking-tight">ستريكس</span>
          </div>
          <p className="text-primary-foreground/70 max-w-sm mb-6 text-sm">
            نظام تقني متطور يهدف إلى أتمتة وتوثيق حوادث المركبات باستخدام تقنيات دمج الحساسات والذكاء الاصطناعي، لدعم الشفافية في تقدير الأضرار.
          </p>
        </div>
        
        <div>
          <h4 className="font-bold mb-4">روابط سريعة</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li><a href="#features" className="hover:text-white transition-colors">المميزات والتقنيات</a></li>
            <li><a href="#how-it-works" className="hover:text-white transition-colors">آلية العمل</a></li>
            <li><a href="#join" className="hover:text-white transition-colors">انضم لقائمة الانتظار</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold mb-4">تواصل معنا</h4>
          <ul className="space-y-2 text-sm text-primary-foreground/70">
            <li>الرياض، المملكة العربية السعودية</li>
            <li>info@strix-app.com</li>
          </ul>
        </div>
      </div>
      
      <div className="container pt-8 border-t border-white/10 text-center text-sm text-primary-foreground/50">
        <p>© 2026 ستريكس. جميع الحقوق محفوظة.</p>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <LeadForm />
      </main>
      <Footer />
    </div>
  );
}
