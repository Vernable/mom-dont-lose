import { Stack, useRouter, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { pb } from './utils/pb';

// Типы для авторизации
type User = {
  id: string;
  email: string;
  name: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  avatar?: string;
  verified?: boolean;
  created?: string;
  updated?: string;
  is_admin?: boolean;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (newUserData: Partial<User>) => void;
  resetPassword: (email: string) => Promise<boolean>;
};

// Создаем контекст
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  updateUser: () => {},
  resetPassword: async () => false,
});

// Хук для использования авторизации
export const useAuth = () => useContext(AuthContext);

// Компонент для защиты роутов
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const currentRoute = segments[0];
    if (!user && currentRoute !== 'welcome' && currentRoute !== 'auth') {
      router.replace('/welcome');
    } else if (user && (currentRoute === 'welcome' || currentRoute === 'auth')) {
      router.replace('/');
    }
  }, [user, segments, isLoading]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (pb.authStore.isValid && pb.authStore.model) {
        const userId = pb.authStore.model.id;
        const freshUser = await pb.collection('users').getOne(userId);
        setUser({
          id: freshUser.id,
          email: freshUser.email,
          name: freshUser.firstname || freshUser.username || freshUser.email,
          firstname: freshUser.firstname,
          lastname: freshUser.lastname,
          username: freshUser.username,
          avatar: freshUser.avatar,
          verified: freshUser.verified,
          created: freshUser.created,
          updated: freshUser.updated,
          is_admin: freshUser.is_admin === true,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      pb.authStore.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const authData = await pb.collection('users').authWithPassword(email.trim().toLowerCase(), password);
      const freshUser = await pb.collection('users').getOne(authData.record.id);
      setUser({
        id: freshUser.id,
        email: freshUser.email,
        name: freshUser.firstname || freshUser.username || freshUser.email,
        firstname: freshUser.firstname,
        lastname: freshUser.lastname,
        username: freshUser.username,
        avatar: freshUser.avatar,
        verified: freshUser.verified,
        created: freshUser.created,
        updated: freshUser.updated,
        is_admin: freshUser.is_admin === true,
      });
      return true;
    } catch (error) {
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      await pb.collection('users').create({
        email: email.trim().toLowerCase(),
        password: password,
        passwordConfirm: password,
        firstname: name.trim(),
        emailVisibility: true,
      });
      return await login(email, password);
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  const updateUser = (newUserData: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...newUserData } : null));
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      await pb.collection('users').requestPasswordReset(email);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser, resetPassword }}>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="index" />
          <Stack.Screen name="bot" />
          <Stack.Screen name="maps" />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="descriptionplace" />
        </Stack>
      </AuthGuard>
    </AuthContext.Provider>
  );
}