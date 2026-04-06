import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectsProvider } from './contexts/ProjectsContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';

import Home from './pages/Home';
import ProjectDetails from './pages/ProjectDetails';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

import './index.css';

const Layout = () => (
  <>
    <Navbar />
    <main style={{ minHeight: '100vh' }}>
      <Outlet />
    </main>
    <Footer />
  </>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/access/v2/login" replace />;
  return children;
};

/* Secret path as requested */
const SECRET_LOGIN_PATH = "/access/v2/login";
const SECRET_DASHBOARD_PATH = "/access/v2/dashboard";

function App() {
  return (
    <Router>
      <AuthProvider>
        <ProjectsProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="project/:slug" element={<ProjectDetails />} />
            </Route>
            
            {/* Secret Backend Routes */}
            <Route path={SECRET_LOGIN_PATH} element={<Login />} />
            <Route 
              path={SECRET_DASHBOARD_PATH} 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            {/* Redirect /login and /dashboard to 404 or home to keep them hidden */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
          </Routes>
        </ProjectsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
