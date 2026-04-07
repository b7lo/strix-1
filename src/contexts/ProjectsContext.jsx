import { useState, useEffect, useContext } from 'react';
import { ProjectsContext } from './contextRegistry';

const API_URL = 'http://localhost:5000/api';

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
};

export const ProjectsProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${API_URL}/projects`);
        const data = await response.json();
        
        // Initial Sync: If localStorage has projects and DB is empty, sync them
        const savedLocal = localStorage.getItem('awadh_projects');
        if (data.length === 0 && savedLocal) {
          const localProjects = JSON.parse(savedLocal);
          if (localProjects.length > 0) {
            await fetch(`${API_URL}/projects/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projects: localProjects }),
            });
            // Refetch after sync
            const refetch = await fetch(`${API_URL}/projects`);
            const newData = await refetch.json();
            setProjects(newData);
            localStorage.removeItem('awadh_projects'); // Clean up
            return;
          }
        }
        
        setProjects(data);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const generateSlug = (title) => {
    if (!title) return `project-${Date.now()}`;
    return title
      .trim()
      .toLowerCase()
      .replace(/[^\w\s\u0600-\u06FF-]/g, '') // Keep Arabic, Letters, Digits, Spaces, Hyphens
      .replace(/\s+/g, '-') // Spaces to hyphens
      .replace(/-+/g, '-'); // Collapse multiple hyphens
  };

  const addProject = async (project) => {
    const newProject = {
      ...project,
      id: Date.now().toString(),
      slug: generateSlug(project.title),
    };
    
    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
      if (response.ok) {
        setProjects([newProject, ...projects]);
      }
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  const updateProject = async (id, updatedProject) => {
    const projectToUpdate = { 
      ...updatedProject, 
      id, 
      slug: generateSlug(updatedProject.title) 
    };
    
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectToUpdate),
      });
      if (response.ok) {
        setProjects(projects.map((p) => (p.id === id ? projectToUpdate : p)));
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const deleteProject = async (id) => {
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  return (
    <ProjectsContext.Provider value={{ projects, addProject, updateProject, deleteProject, loading }}>
      {children}
    </ProjectsContext.Provider>
  );
};
