import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../lib/types';
import { account } from '../lib/config';
import { getCurrentUser } from '../lib/api';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkAuthUser: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (value: boolean) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  checkAuthUser: async () => false,
  setUser: () => {},
  setIsAuthenticated: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuthUser = async () => {
    setIsLoading(true);
    try {
      const currentAccount = await account.get();
      if (!currentAccount) {
        setIsAuthenticated(false);
        setUser(null);
        return false;
      }

      const userDoc = await getCurrentUser();
      if (userDoc) {
        const userData = {
          $id: userDoc.$id,
          userId: userDoc.userId,
          name: userDoc.name,
          email: userDoc.email,
          password: userDoc.password,
          bio: userDoc.bio,
          imageId: userDoc.imageId
        };
        setUser(userData);
        setIsAuthenticated(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthUser();

    const intervalId = setInterval(() => {
      checkAuthUser();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    checkAuthUser,
    setUser,
    setIsAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useUserContext = () => useContext(AuthContext);