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
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (newUserData: Partial<User>) => void;
};

// Создаем контекст
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  updateUser: () => {},
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
      
      // Проверяем подключение к PocketBase
      console.log('🌐 Проверка подключения к PocketBase...');
      
      // Проверяем текущее состояние авторизации
      console.log('📊 Текущее состояние authStore:', {
        isValid: pb.authStore.isValid,
        hasToken: !!pb.authStore.token,
        hasModel: !!pb.authStore.model,
        modelEmail: pb.authStore.model?.email || 'нет'
      });

      if (pb.authStore.isValid && pb.authStore.model) {
        console.log('✅ Пользователь найден в authStore:', pb.authStore.model.email);
        const userData = pb.authStore.model;
        
        const currentUser = {
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
      
      // Очищаем старую сессию
      pb.authStore.clear();
      
      // Пробуем войти
      const authData = await pb.collection('users').authWithPassword(
        email.trim().toLowerCase(),
        password
      );
      
      console.log('✅ Успешный вход:', {
        id: authData.record.id,
        email: authData.record.email,
        username: authData.record.username
      });
      
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
      
      console.log('👤 Установка состояния пользователя:', newUser);
      setUser(newUser);
      
      Alert.alert('Успех', 'Вход выполнен успешно!');
      return true;
      
    } catch (error: any) {
      console.error('❌ Ошибка входа:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
      
      let errorMessage = 'Ошибка входа';
      
      if (error.status === 400) {
        errorMessage = 'Неверный email или пароль';
      } else if (error.status === 0) {
        errorMessage = 'Нет соединения с сервером. Проверьте: \n1. Запущен ли PocketBase\n2. Правильный ли URL в pb.ts\n3. Подключение к интернету';
      } else {
        errorMessage = error.message || 'Неизвестная ошибка';
      }
      
      Alert.alert('Ошибка входа', errorMessage);
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
        username: name.trim(),
        emailVisibility: true
      });

      console.log('✅ Успешная регистрация, вход...');

      // Авторизуем нового пользователя
      const authData = await pb.collection('users').authWithPassword(
        email.trim().toLowerCase(),
        password
      );
      
      const newUser = {
        id: userData.id,
        email: userData.email,
        name: userData.firstname || userData.email,
        firstname: userData.firstname,
        verified: userData.verified,
        created: userData.created,
        updated: userData.updated
      };
      
      console.log('👤 Установка состояния пользователя после регистрации:', newUser);
      setUser(newUser);
      
      Alert.alert('Успех', 'Регистрация выполнена успешно!');
      return true;
      
    } catch (error: any) {
      console.error('❌ Ошибка регистрации:', {
        message: error.message,
        status: error.status,
        data: error.data
      });
      
      let errorMessage = 'Ошибка регистрации';
      
      if (error.data?.email?.code === 'validation_invalid_email') {
        errorMessage = 'Неверный формат email';
      } else if (error.data?.email?.code === 'validation_not_unique') {
        errorMessage = 'Пользователь с таким email уже существует';
      } else if (error.data?.password) {
        errorMessage = 'Слишком короткий пароль (минимум 8 символов)';
      } else if (error.status === 0) {
        errorMessage = 'Нет соединения с сервером';
      } else {
        errorMessage = error.message || 'Неизвестная ошибка';
      }
      
      Alert.alert('Ошибка регистрации', errorMessage);
      return false;
    }
  };

  // Функция выхода
  const logout = () => {
    console.log('🚪 Выход из системы...');
    pb.authStore.clear();
    setUser(null);
    Alert.alert('Успех', 'Вы вышли из системы');
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
    updateUser
  };

  console.log('📱 RootLayout рендер - user:', user?.email, 'isLoading:', isLoading);

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