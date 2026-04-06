import { useState, useEffect, useContext } from 'react';
import { ProjectsContext } from './contextRegistry';

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
};

const defaultProjects = [
  {
    id: '1',
    title: 'تطبيق متجر إلكتروني',
    slug: 'ecommerce-app',
    description: 'تطبيق متجر إلكتروني متكامل مبني باستخدام React للمنصة الأمامية و Node.js في الخلفية. يتميز بلوحة تحكم متقدمة، نظام سلة تسوق حديث، وتجربة مستخدم سلسة.',
    image: 'https://images.unsplash.com/photo-1557821552-17105153ce9a?w=800&q=80',
    type: 'متجر إلكتروني',
    link: 'https://github.com'
  },
  {
    id: '2',
    title: 'منصة تعليمية',
    slug: 'lms-platform',
    description: 'منصة لتقديم الدورات التعليمية عن بعد، مصممة بأحدث التقنيات مع دعم للـ Dark Mode وميزات التفاعل في الوقت الفعلي.',
    image: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=800&q=80',
    type: 'منصة',
    link: 'https://github.com'
  }
];

export const ProjectsProvider = ({ children }) => {
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('awadh_projects');
    if (saved) return JSON.parse(saved);
    return defaultProjects;
  });

  useEffect(() => {
    localStorage.setItem('awadh_projects', JSON.stringify(projects));
  }, [projects]);

  const generateSlug = (title) => {
    if (!title) return `project-${Date.now()}`;
    return title
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF-]/g, '') // Keep Arabic, Letters, Digits, Spaces, Hyphens
      .replace(/\s+/g, '-') // Spaces to hyphens
      .replace(/-+/g, '-'); // Collapse multiple hyphens
  };

  const addProject = (project) => {
    const newProject = {
      ...project,
      id: Date.now().toString(),
      slug: generateSlug(project.title),
    };
    setProjects([newProject, ...projects]);
  };

  const updateProject = (id, updatedProject) => {
    setProjects(projects.map((p) => 
      p.id === id ? { ...updatedProject, id, slug: generateSlug(updatedProject.title) } : p
    ));
  };

  const deleteProject = (id) => {
    setProjects(projects.filter((p) => p.id !== id));
  };

  return (
    <ProjectsContext.Provider value={{ projects, addProject, updateProject, deleteProject }}>
      {children}
    </ProjectsContext.Provider>
  );
};
