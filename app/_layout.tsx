import { Stack, useRouter, useSegments } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { pb } from './utils/pb';

// Типы для авторизации с is_admin
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
  is_admin?: boolean; // ✅ ДОБАВЛЕНО
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
    console.log('🔐 AuthGuard - user:', user?.email, 'isLoading:', isLoading);
    
    if (isLoading) return;

    const currentRoute = segments[0];
    console.log('📍 Current route:', currentRoute);
    
    // Если нет пользователя и не на welcome/auth, редиректим на welcome
    if (!user && currentRoute !== 'welcome' && currentRoute !== 'auth') {
      console.log('🔄 Redirecting to welcome - no user');
      router.replace('/welcome');
    } 
    // Если есть пользователь и на welcome/auth, редиректим на главную
    else if (user && (currentRoute === 'welcome' || currentRoute === 'auth')) {
      console.log('🔄 Redirecting to home - user exists');
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
      console.log('🔍 Проверка авторизации...');
      
      if (pb.authStore.isValid && pb.authStore.model) {
        const userId = pb.authStore.model.id;
        
        // ✅ ЯВНО ЗАГРУЖАЕМ СВЕЖИЕ ДАННЫЕ ИЗ БД
        const freshUser = await pb.collection('users').getOne(userId);
        console.log('✅ Загружен свежий пользователь из БД:', freshUser);
        
        const currentUser = {
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
          is_admin: freshUser.is_admin || false, // ✅ ДОБАВЛЕНО
        };
        
        console.log('👤 Установка пользователя:', currentUser);
        setUser(currentUser);
      } else {
        console.log('❌ Нет валидной сессии');
        setUser(null);
      }
    } catch (error: any) {
      console.error('🔥 Ошибка проверки авторизации:', error.message);
      pb.authStore.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('🏁 Проверка авторизации завершена');
    }
  };

  // Функция входа
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log(`🔐 Попытка входа для: ${email}`);
      
      const authData = await pb.collection('users').authWithPassword(
        email.trim().toLowerCase(),
        password
      );
      
      // ✅ ЯВНО ЗАГРУЖАЕМ СВЕЖИЕ ДАННЫЕ ПОСЛЕ ВХОДА
      const freshUser = await pb.collection('users').getOne(authData.record.id);
      
      const newUser = {
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
        is_admin: freshUser.is_admin || false,
      };
      
      setUser(newUser);
      return true;
      
    } catch (error: any) {
      console.error('❌ Ошибка входа:', error.message);
      return false;
    }
  };

  // Функция регистрации
  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      console.log(`📝 Регистрация пользователя: ${email}`);
      
      const userData = await pb.collection('users').create({
        email: email.trim().toLowerCase(),
        password: password,
        passwordConfirm: password,
        firstname: name.trim(),
        emailVisibility: true,
      });

      console.log('✅ Успешная регистрация, создан пользователь:', userData.id);
      
      const authData = await pb.collection('users').authWithPassword(
        email.trim().toLowerCase(),
        password
      );
      
      const newUser = {
        id: authData.record.id,
        email: authData.record.email,
        name: authData.record.firstname || authData.record.email,
        firstname: authData.record.firstname,
        verified: authData.record.verified,
        created: authData.record.created,
        updated: authData.record.updated,
        is_admin: false,
      };
      
      setUser(newUser);
      return true;
      
    } catch (error: any) {
      console.error('❌ Ошибка регистрации:', error.message);
      return false;
    }
  };

  // Функция выхода
  const logout = () => {
    console.log('🚪 Выход из системы...');
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

  // Функция восстановления пароля
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      await pb.collection('users').requestPasswordReset(email);
      return true;
    } catch (error: any) {
      console.error('❌ Ошибка восстановления пароля:', error.message);
      return false;
    }
  };

  const authContextValue: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    resetPassword,
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