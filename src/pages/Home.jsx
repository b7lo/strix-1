import React, { useEffect, useRef } from 'react';
import { useProjects } from '../contexts/ProjectsContext';

export default function Home() {
  const { projects } = useProjects();
  const revealRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, i * 70);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    revealRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [projects]);

  const addToRefs = (el) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* HERO SECTION */}
      <section className="hero">
        <div className="orb orb1"></div>
        <div className="orb orb2"></div>
        <div className="hero-tag" ref={addToRefs}>// مطور برمجي · فري لانسر · حائل، السعودية</div>
        <h1 className="hero-name" ref={addToRefs}>مرحباً، أنا<br /><span className="hl">عوض</span></h1>
        <p className="hero-sub" ref={addToRefs}>أبني منصات رقمية متكاملة — من متاجر إلكترونية وأنظمة تشفير، إلى حلول برمجية مخصصة تحقق أهدافك.</p>
        <div className="hero-cta" ref={addToRefs}>
          <a href="#projects" className="btn-p">استعرض أعمالي</a>
          <a href="#contact" className="btn-o">تواصل معي</a>
        </div>
        <div className="hero-stats" ref={addToRefs}>
          <div><div className="stat-n">4+</div><div className="stat-l">مشاريع منشورة</div></div>
          <div><div className="stat-n">100%</div><div className="stat-l">عمل مستقل</div></div>
          <div><div className="stat-n">∞</div><div className="stat-l">شغف برمجي</div></div>
        </div>
        <div className="scroll-ind" ref={addToRefs}>
          <div className="scroll-line"></div>
          <span>مرر</span>
        </div>
      </section>

      {/* PROJECTS SECTION */}
      <section id="projects">
        <div className="sec-hdr reveal" ref={addToRefs}>
          <span className="sec-num">01</span>
          <h2 className="sec-title">الأعمال</h2>
          <div className="sec-line"></div>
        </div>
        <div className="proj-grid">
          {projects.map((proj) => (
            <div key={proj.id} className="proj-card reveal" ref={addToRefs}>
              <div className={`proj-vis ${proj.type === 'shop' ? 'pv2' : proj.type === 'tool' ? 'pv4' : 'pv1'}`}>
                <div className={`proj-glow ${proj.type === 'shop' ? 'g-gold' : proj.type === 'tool' ? 'g-blue' : 'g-purple'}`} style={{ top: '-60px', left: '-60px' }}></div>
                <div className="proj-ico">
                  {/* Using custom SVGs based on project type as shown in user's design */}
                  {proj.type === 'shop' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f0c060" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                  ) : proj.type === 'tool' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#88aaff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="8" y1="13" x2="16" y2="13" />
                      <line x1="8" y1="17" x2="13" y2="17" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#b08fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 3h6v2.5S17 7 17 10v10a1 1 0 01-1 1H8a1 1 0 01-1-1V10c0-3 2-4.5 2-4.5V3z" />
                      <path d="M9 3c0-1 1.5-2 3-2s3 1 3 2" />
                      <line x1="10" y1="14" x2="14" y2="14" /><line x1="10" y1="17" x2="14" y2="17" />
                    </svg>
                  )}
                </div>
                <span className={`proj-badge ${proj.type === 'shop' ? 'b-store' : proj.type === 'tool' ? 'b-tool' : 'b-plat'}`}>
                  {proj.category || 'مشاريع'}
                </span>
              </div>
              <div className="proj-body">
                <h3 className="proj-title">{proj.title}</h3>
                <p className="proj-desc">{proj.description}</p>
                <div className="proj-foot">
                  <div className="proj-tech">
                    {proj.tags?.split(',').map(tag => (
                      <span key={tag} className="tpill">{tag.trim()}</span>
                    ))}
                  </div>
                  <a className="proj-link" href={proj.link} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    زيارة
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TECH STACK SECTION */}
      <section id="stack" style={{ background: 'linear-gradient(180deg, transparent, rgba(0, 212, 255, 0.015), transparent)' }}>
        <div className="sec-hdr reveal" ref={addToRefs}>
          <span className="sec-num">02</span>
          <h2 className="sec-title">التقنيات</h2>
          <div className="sec-line"></div>
        </div>
        <div className="stack-grid">
          {[
            { name: 'JavaScript', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg' },
            { name: 'PHP', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg' },
            { name: 'React', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg' },
            { name: 'WordPress', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/wordpress/wordpress-plain.svg', invert: true },
            { name: 'Docker', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
            { name: 'HTML5', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg' },
            { name: 'CSS3', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg' },
            { name: 'MySQL', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg' },
            { name: 'Git', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg' },
            { name: 'Linux', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg' },
            { name: 'Nginx', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nginx/nginx-original.svg' },
          ].map((tech) => (
            <div key={tech.name} className="tech-card reveal" ref={addToRefs}>
              <img src={tech.src} alt={tech.name} style={tech.invert ? { filter: 'brightness(0) invert(1) opacity(0.85)' } : {}} />
              <span>{tech.name}</span>
            </div>
          ))}
          {/* Custom Branded Techs from User Template */}
          <div className="tech-card reveal" ref={addToRefs}>
            <svg width="38" height="38" viewBox="0 0 80 80" fill="none">
              <rect width="80" height="80" rx="14" fill="#5B5BD6" />
              <path d="M18 30h44l-5 26H23L18 30z" fill="white" opacity="0.95" />
              <path d="M18 30l5-14h34l5 14" fill="none" stroke="white" strokeWidth="3.5" strokeLinejoin="round" />
              <line x1="30" y1="38" x2="30" y2="48" stroke="#5B5BD6" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="40" y1="38" x2="40" y2="48" stroke="#5B5BD6" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="50" y1="38" x2="50" y2="48" stroke="#5B5BD6" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span>سلة</span>
          </div>
          <div className="tech-card reveal" ref={addToRefs}>
            <svg width="38" height="38" viewBox="0 0 80 80" fill="none">
              <rect width="80" height="80" rx="14" fill="#FF6B35" />
              <path d="M18 24h44L18 56h44" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>زد</span>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section id="services">
        <div className="sec-hdr reveal" ref={addToRefs}>
          <span className="sec-num">03</span>
          <h2 className="sec-title">الخدمات</h2>
          <div className="sec-line"></div>
        </div>
        <div className="srv-grid">
          {[
            { 
              name: 'تطوير المواقع', 
              desc: 'بناء مواقع احترافية بأحدث التقنيات — WordPress، React، HTML/CSS، مع تصميم متجاوب على كل الشاشات.',
              ico: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            },
            { 
              name: 'المتاجر الإلكترونية', 
              desc: 'إنشاء متاجر WooCommerce وسلة وزد متكاملة مع بوابات الدفع وإدارة المنتجات والطلبات.',
              ico: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6"/></svg>
            },
            { 
              name: 'إدارة الخوادم', 
              desc: 'إعداد وإدارة خوادم Linux، نشر التطبيقات بـ Docker، ضبط Nginx وSSL، وضمان استمرارية التشغيل.',
              ico: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            }
          ].map(srv => (
            <div key={srv.name} className="srv-card reveal" ref={addToRefs}>
              <div className="srv-ico">{srv.ico}</div>
              <h3 className="srv-name">{srv.name}</h3>
              <p className="srv-desc">{srv.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact">
        <div className="sec-hdr reveal" ref={addToRefs}>
          <span className="sec-num">04</span>
          <h2 className="sec-title">التواصل</h2>
          <div className="sec-line"></div>
        </div>
        <div className="ct-wrap">
          <div className="ct-info reveal" ref={addToRefs}>
            <h3>خلينا نبني شيء مميز معاً</h3>
            <p>مستعد لاستقبال مشاريعك الجديدة، أسئلتك، أو حتى مجرد سلام. تواصل معي عبر أي قناة تناسبك.</p>
            <div className="ct-list">
              <a href="mailto:awdh1000@icloud.com" className="ct-item">
                <div className="ct-ico ci-em"><svg viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
                <div><div className="ct-lbl">الإيميل</div><div className="ct-val">awdh1000@icloud.com</div></div>
              </a>
              <a href="tel:+966534779554" className="ct-item">
                <div className="ct-ico ci-ph"><svg viewBox="0 0 24 24" fill="none" stroke="#b08fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.37a16 16 0 006.72 6.72l1.73-1.73a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></div>
                <div><div className="ct-lbl">الهاتف / واتساب</div><div className="ct-val" dir="ltr">+966 534 779 554</div></div>
              </a>
            </div>
          </div>
          <div className="ct-form reveal" ref={addToRefs}>
            <h3>أرسل رسالة</h3>
            <div className="fg"><label>الاسم</label><input type="text" id="fn" placeholder="اسمك الكريم" /></div>
            <div className="fg"><label>الإيميل</label><input type="email" id="fe" placeholder="بريدك الإلكتروني" /></div>
            <div className="fg"><label>الرسالة</label><textarea id="fm" placeholder="صف مشروعك أو استفسارك..."></textarea></div>
            <button className="ct-btn">إرسال الرسالة ✦</button>
          </div>
        </div>
      </section>
    </div>
  );
}
