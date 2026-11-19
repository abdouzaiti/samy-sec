import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { adminAccountsService } from '../services/supabaseService';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  updateSessionUser: (updates: Partial<User>) => void;
  isLoading: boolean;
  activeRole: 'director' | 'secretary';
  switchRole: (role: 'director' | 'secretary') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<'director' | 'secretary'>('director');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUserStr = localStorage.getItem('user');
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && (savedUser.role === 'director' || savedUser.role === 'secretary')) {
          const normalizedUser: User = savedUser.uid === '1' && savedUser.displayName === 'Directeur Mohamed'
            ? { ...savedUser, email: 'director@samyacademy.dz', displayName: 'Director' }
            : savedUser;
          setUser(normalizedUser);
          setActiveRole(normalizedUser.role);
          localStorage.setItem('user', JSON.stringify(normalizedUser));
        } else {
          localStorage.removeItem('user');
        }
      } catch {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const account = await adminAccountsService.authenticate(username, password);
      if (!account) {
        throw new Error('Invalid credentials');
      }
      const loggedUser: User = {
        uid: account.id,
        username: account.username,
        email: account.email || `${account.username}@samyacademy.dz`,
        displayName: account.displayName,
        phone: account.phone || '',
        role: account.role
      };
      setUser(loggedUser);
      setActiveRole(loggedUser.role);
      localStorage.setItem('user', JSON.stringify(loggedUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const updateSessionUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const switchRole = (role: 'director' | 'secretary') => {
    setActiveRole(role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateSessionUser, isLoading, activeRole, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

