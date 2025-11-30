import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, createContext, useContext, useState } from 'react';
import PocketBase from 'pocketbase';
import { Platform } from 'react-native';

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
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
};

// Создаем контекст
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  logout: () => {},
});

// Хук для использования авторизации
export const useAuth = () => useContext(AuthContext);

// PocketBase клиент - используем ваш IP
const POCKETBASE_URL = 'http://192.168.1.10:8090';
console.log('PocketBase URL:', POCKETBASE_URL);

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

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
      console.log('Checking PocketBase connection...');
      
      // Проверяем подключение к PocketBase
      const health = await pb.health.check();
      console.log('PocketBase health:', health);
      
      if (pb.authStore.isValid) {
        console.log('Token found, refreshing...');
        await pb.collection('users').authRefresh();
        const userData = pb.authStore.model;
        
        if (userData) {
          console.log('User found:', userData.email);
          setUser({
            id: userData.id,
            email: userData.email,
            name: userData.firstname || userData.username || userData.email,
            firstname: userData.firstname,
            lastname: userData.lastname,
            username: userData.username,
            avatar: userData.avatar,
            verified: userData.verified,
            created: userData.created,
            updated: userData.updated
          });
        }
      } else {
        console.log('No valid token found');
      }
    } catch (error) {
      console.log('PocketBase connection error:', error);
      pb.authStore.clear();
    } finally {
      setIsLoading(false);
    }
  };

  // Функция входа
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login for:', email);
      
      const authData = await pb.collection('users').authWithPassword(email, password);
      
      console.log('Login successful:', authData.record.email);
      
      const userData = authData.record;
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.firstname || userData.username || userData.email,
        firstname: userData.firstname,
        lastname: userData.lastname,
        username: userData.username,
        avatar: userData.avatar,
        verified: userData.verified,
        created: userData.created,
        updated: userData.updated
      });
      
      return true;
    } catch (error: any) {
      console.error('Login error:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
      
      return false;
    }
  };

  // Функция регистрации
  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      console.log('Attempting registration for:', email);
      
      // Создаем пользователя
      const userData = await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        firstname: name,
        emailVisibility: true
      });

      console.log('Registration successful, logging in...');

      // Автоматически логиним пользователя после регистрации
      const authData = await pb.collection('users').authWithPassword(email, password);
      
      setUser({
        id: userData.id,
        email: userData.email,
        name: userData.firstname || userData.email,
        firstname: userData.firstname,
        verified: userData.verified,
        created: userData.created,
        updated: userData.updated
      });
      
      return true;
    } catch (error: any) {
      console.error('Registration error:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
      
      return false;
    }
  };

  // Функция выхода
  const logout = () => {
    console.log('Logging out...');
    pb.authStore.clear();
    setUser(null);
  };

  const authContextValue: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={authContextValue}>
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