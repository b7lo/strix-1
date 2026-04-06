import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProjects } from '../contexts/ProjectsContext';
import { Plus, Edit2, Trash2, LogOut, Settings, ExternalLink, Shield } from 'lucide-react';

export default function Dashboard() {
  const { logout } = useAuth();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('projects');
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    type: 'plat', // 'plat', 'shop', 'tool'
    category: 'منصة',
    link: '',
    tags: ''
  });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEdit = (project) => {
    setFormData({
      ...project,
      tags: project.tags || ''
    });
    setEditingId(project.id);
    setActiveTab('add');
    window.scrollTo(0, 0);
  };

  const handleDelete = (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المشروع؟')) {
      deleteProject(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      updateProject(editingId, formData);
    } else {
      addProject(formData);
    }
    setFormData({ title: '', description: '', image: '', type: 'plat', category: 'منصة', link: '', tags: '' });
    setEditingId(null);
    setActiveTab('projects');
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', padding: '2rem' }}>
      <div className="container" style={{ maxWidth: '1000px', paddingTop: '2rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '45px', height: '45px', borderRadius: '10px', background: 'rgba(0, 212, 255, 0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
              <Shield size={24} color="var(--accent)" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>لوحة التحكم</h1>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>إدارة معرض الأعمال والبيانات</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/" className="btn-o" style={{ fontSize: '0.85rem' }}>الموقع</Link>
            <button onClick={handleLogout} className="btn-o" style={{ fontSize: '0.85rem', borderColor: '#ff4d4d', color: '#ff4d4d' }}>
              <LogOut size={16} style={{ marginLeft: '0.5rem' }} /> خروج
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <button 
            onClick={() => setActiveTab('projects')}
            style={{ 
              background: 'transparent', border: 'none', color: activeTab === 'projects' ? 'var(--accent)' : 'var(--muted)',
              fontWeight: 700, cursor: 'pointer', padding: '0.5rem 1rem', borderBottom: activeTab === 'projects' ? '2px solid var(--accent)' : 'none'
            }}
          >
            المشاريع الحالية
          </button>
          <button 
            onClick={() => { setActiveTab('add'); setEditingId(null); setFormData({ title: '', description: '', image: '', type: 'plat', category: 'منصة', link: '', tags: '' }); }}
            style={{ 
              background: 'transparent', border: 'none', color: activeTab === 'add' ? 'var(--accent)' : 'var(--muted)',
              fontWeight: 700, cursor: 'pointer', padding: '0.5rem 1rem', borderBottom: activeTab === 'add' ? '2px solid var(--accent)' : 'none'
            }}
          >
            {editingId ? 'تعديل مشروع' : 'إضافة جديد'}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'projects' && (
          <div style={{ display: 'grid', gap: '1.2rem' }}>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                لم يتم إضافة أي مشاريع بعد.
              </div>
            ) : (
              projects.map(project => (
                <div key={project.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  background: 'var(--surface)', padding: '1.2rem', borderRadius: '12px', 
                  border: '1px solid var(--border)', flexWrap: 'wrap', gap: '1.5rem' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                    <div style={{ 
                      width: '100px', height: '65px', borderRadius: '8px', overflow: 'hidden', 
                      background: 'var(--surface2)', border: '1px solid var(--border)' 
                    }}>
                      <img src={project.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>{project.title}</h4>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span className={`tpill ${project.type === 'shop' ? 'b-store' : project.type === 'tool' ? 'b-tool' : 'b-plat'}`} style={{ fontSize: '0.6rem' }}>
                          {project.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    <button onClick={() => handleEdit(project)} className="btn-o" style={{ padding: '0.6rem' }}>
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(project.id)} className="btn-o" style={{ padding: '0.6rem', color: '#ff4d4d', borderColor: 'rgba(255, 77, 77, 0.2)' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="ct-form" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '2.5rem', color: 'var(--text)' }}>{editingId ? 'تعديل بيانات المشروع' : 'إضافة مشروع جديد'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="fg">
                  <label>عنوان المشروع</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="اسم المشروع" />
                </div>
                <div className="fg">
                  <label>رابط المشروع</label>
                  <input type="url" value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="https://..." />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="fg">
                  <label>نوع التصميم (داخلي)</label>
                  <select 
                    style={{ width: '100%', padding: '0.85rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)' }}
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="plat">منصة (نهدي)</option>
                    <option value="shop">متجر (ذهبي)</option>
                    <option value="tool">أداة (أزرق)</option>
                  </select>
                </div>
                <div className="fg">
                  <label>مسمى الفئة (التاج)</label>
                  <input type="text" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="مثال: منصة، متجر، أداة" />
                </div>
              </div>

              <div className="fg">
                <label>رابط الصورة</label>
                <input type="url" required value={formData.image} onChange={e => setFormData({...formData, image: e.target.value})} placeholder="https://..." />
              </div>

              <div className="fg">
                <label>التقنيات (مفصولة بفاصلة)</label>
                <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="React, CSS, Node.js" />
              </div>

              <div className="fg">
                <label>الوصف</label>
                <textarea required rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="تكلم عن المشروع باختصار..."></textarea>
              </div>

              <button type="submit" className="ct-btn" style={{ width: '100%', marginTop: '1rem' }}>
                {editingId ? 'حفظ التعديلات النظامية' : 'إضافة المشروع إلى المعرض'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
