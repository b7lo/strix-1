import { useState, useContext } from 'react';
import { AuthContext } from './contextRegistry';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [hasPassword, setHasPassword] = useState(() => !!localStorage.getItem('awadh_password'));
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('awadh_auth') === 'true');

  const login = (password) => {
    const savedPwd = localStorage.getItem('awadh_password');
    if (!savedPwd) {
      localStorage.setItem('awadh_password', password);
      setHasPassword(true);
      setIsAuthenticated(true);
      sessionStorage.setItem('awadh_auth', 'true');
      return { success: true, message: 'تم تعيين كلمة المرور لأول مرة بنجاح!' };
    } else {
      if (savedPwd === password) {
        setIsAuthenticated(true);
        sessionStorage.setItem('awadh_auth', 'true');
        return { success: true };
      } else {
        return { success: false, message: 'كلمة المرور غير صحيحة' };
      }
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('awadh_auth');
  };

  const changePassword = (oldPassword, newPassword) => {
    const savedPwd = localStorage.getItem('awadh_password');
    if (savedPwd === oldPassword) {
      localStorage.setItem('awadh_password', newPassword);
      return { success: true };
    }
    return { success: false, message: 'كلمة المرور القديمة غير صحيحة' };
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, hasPassword, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};
