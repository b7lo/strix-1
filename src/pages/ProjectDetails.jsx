import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects } from '../contexts/ProjectsContext';

export default function ProjectDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { projects } = useProjects();
  
  const project = projects.find(p => p.slug === slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!project) {
    return (
      <div style={{ 
        minHeight: '100vh', display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)' 
      }}>
        <h2 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>المشروع غير موجود</p>
        <button onClick={() => navigate('/')} className="btn-p">العودة للرئيسية</button>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', paddingTop: '7rem' }}>
      <div className="orb orb1" style={{ width: '600px', height: '600px', opacity: 0.05 }}></div>
      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        
        <button 
          onClick={() => navigate(-1)} 
          className="btn-o" 
          style={{ marginBottom: '3rem', fontSize: '0.85rem' }}
        >
          ← العودة
        </button>

        <div className="reveal visible">
          <div style={{ 
            height: '450px', width: '100%', borderRadius: '20px', 
            overflow: 'hidden', border: '1px solid var(--border)',
            position: 'relative', marginBottom: '3rem'
          }}>
            <img 
              src={project.image} 
              alt={project.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <div style={{ 
              position: 'absolute', inset: 0, 
              background: 'linear-gradient(to top, var(--bg), transparent)',
              padding: '3rem', display: 'flex', alignItems: 'flex-end'
            }}>
              <div>
                <span className={`tpill ${project.type === 'shop' ? 'b-store' : project.type === 'tool' ? 'b-tool' : 'b-plat'}`} style={{ marginBottom: '1rem', display: 'inline-block' }}>
                  {project.category}
                </span>
                <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900 }}>{project.title}</h1>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '4rem', alignItems: 'start' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--accent)' }}>نظرة عامة</h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--text)', lineHeight: '2', whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                {project.description}
              </p>
            </div>
            
            <div className="srv-card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>تفاصيل المشروع</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '1px' }}>التقنيات</div>
                  <div className="proj-tech">
                    {project.tags?.split(',').map(tag => (
                      <span key={tag} className="tpill">{tag.trim()}</span>
                    ))}
                  </div>
                </div>
                {project.link && (
                  <a href={project.link} target="_blank" rel="noreferrer" className="btn-p" style={{ textAlign: 'center', width: '100%' }}>
                    زيارة المشروع الحية
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
