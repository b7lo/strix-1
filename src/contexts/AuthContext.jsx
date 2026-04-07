import { useState, useContext } from 'react';
import { AuthContext } from './contextRegistry';

const API_URL = '/api';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('awadh_auth') === 'true');

  const login = async (password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('awadh_auth', 'true');
        return { success: true };
      } else {
        return { success: false, message: data.message || 'كلمة المرور غير صحيحة' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'فشل الاتصال بالخادم' };
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('awadh_auth');
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        return { success: true };
      } else {
        return { success: false, message: data.message || 'كلمة المرور الحالية غير صحيحة' };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'فشل الاتصال بالخادم' };
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};
