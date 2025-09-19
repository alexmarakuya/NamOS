import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TeamMember } from '../types';

interface AuthContextType {
  user: TeamMember | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on app load
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const savedUser = localStorage.getItem('auth_user');
        const sessionExpiry = localStorage.getItem('auth_expiry');
        
        if (savedUser && sessionExpiry) {
          const expiryTime = parseInt(sessionExpiry);
          const currentTime = Date.now();
          
          if (currentTime < expiryTime) {
            // Session is still valid
            setUser(JSON.parse(savedUser));
          } else {
            // Session expired, clear storage
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_expiry');
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_expiry');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simple authentication - check against team members
      // In a real app, this would be a secure API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Set session expiry (24 hours from now)
        const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
        
        // Save to localStorage
        localStorage.setItem('auth_user', JSON.stringify(userData));
        localStorage.setItem('auth_expiry', expiryTime.toString());
        
        setUser(userData);
        return true;
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Invalid credentials');
        return false;
      }
    } catch (error) {
      // For now, we'll do a simple client-side check
      // This is NOT secure and should be replaced with proper backend authentication
      console.warn('API not available, using client-side authentication (NOT SECURE)');
      
      // Simple hardcoded check for demo purposes
      const demoUsers = [
        { username: 'alex', password: 'admin123', userData: { id: '1', slack_username: 'alex', full_name: 'Alex', email: 'alex@alexduffner.com', role: 'admin', is_active: true } },
        { username: 'pjsilver', password: 'dev123', userData: { id: '2', slack_username: 'pjsilver', full_name: 'PJ Silver', email: 'pj@example.com', role: 'developer', is_active: true } }
      ];
      
      const foundUser = demoUsers.find(u => u.username === username && u.password === password);
      
      if (foundUser) {
        const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
        localStorage.setItem('auth_user', JSON.stringify(foundUser.userData));
        localStorage.setItem('auth_expiry', expiryTime.toString());
        setUser(foundUser.userData as TeamMember);
        return true;
      } else {
        setError('Invalid username or password');
        return false;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_expiry');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
