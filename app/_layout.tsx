import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, createContext, useContext, useState } from 'react';
import { Platform } from 'react-native';
import { pb } from './utilis/pb'; // Импортируем общий экземпляр

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
  updateUser: (newUserData: Partial<User>) => void; // Добавляем updateUser в тип
};

// Создаем контекст
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  updateUser: () => {}, // Добавляем пустую функцию по умолчанию
});

// Хук для использования авторизации
export const useAuth = () => useContext(AuthContext);

// Компонент для защиты роутов
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log('AuthGuard - user:', user, 'isLoading:', isLoading);
    
    if (isLoading) return;

    const currentRoute = segments[0];
    console.log('Current route:', currentRoute);
    
    if (!user && currentRoute !== 'welcome' && currentRoute !== 'auth') {
      console.log('Redirecting to welcome - no user');
      router.replace('/welcome');
    } else if (user && (currentRoute === 'welcome' || currentRoute === 'auth')) {
      console.log('Redirecting to home - user exists');
      router.replace('/');
    }
  }, [user, segments, isLoading]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking PocketBase connection...');
      
      // Проверяем подключение к PocketBase
      const health = await pb.health.check();
      console.log('PocketBase health:', health);
      
      console.log('Current auth state:', {
        isValid: pb.authStore.isValid,
        token: pb.authStore.token ? 'exists' : 'null',
        model: pb.authStore.model ? pb.authStore.model.email : 'null'
      });

      if (pb.authStore.isValid && pb.authStore.model) {
        console.log('User found in authStore:', pb.authStore.model.email);
        const userData = pb.authStore.model;
        
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
      } else {
        console.log('No valid auth session found');
        setUser(null);
      }
    } catch (error) {
      console.log('PocketBase connection error:', error);
      pb.authStore.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('Auth check completed, user:', user);
    }
  };

  // Функция входа
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login for:', email);
      
      const authData = await pb.collection('users').authWithPassword(email, password);
      
      console.log('Login successful:', authData.record.email);
      
      const userData = authData.record;
      const newUser = {
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
      };
      
      console.log('Setting user state:', newUser);
      setUser(newUser);
      
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
      
      const newUser = {
        id: userData.id,
        email: userData.email,
        name: userData.firstname || userData.email,
        firstname: userData.firstname,
        verified: userData.verified,
        created: userData.created,
        updated: userData.updated
      };
      
      console.log('Setting user state after registration:', newUser);
      setUser(newUser);
      
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

  // Функция обновления данных пользователя
  const updateUser = (newUserData: Partial<User>) => {
    setUser(prevUser => {
      if (!prevUser) return prevUser;
      return {
        ...prevUser,
        ...newUserData
      };
    });
  };

  const authContextValue: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateUser // Добавляем функцию в значение контекста
  };

  console.log('RootLayout render - user:', user, 'isLoading:', isLoading);

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