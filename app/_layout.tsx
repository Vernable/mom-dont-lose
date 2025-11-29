import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, createContext, useContext, useState } from 'react';

// Типы для авторизации
type User = {
  id: string;
  email: string;
  name: string;
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

// Моковые пользователи
const mockUsers = [
  {
    id: '1',
    email: 'user@test.com',
    password: 'password123',
    name: 'Тестовый Пользователь'
  },
  {
    id: '2', 
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Администратор'
  }
];

// Компонент для защиты роутов
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const currentRoute = segments[0];
    
    console.log('Auth check:', { user: !!user, currentRoute });
    
    // Если пользователь не авторизован и пытается получить доступ не к welcome/auth
    if (!user && currentRoute !== 'welcome' && currentRoute !== 'auth') {
      console.log('Redirecting to welcome');
      router.replace('/welcome');
    } 
    // Если пользователь авторизован и находится на welcome/auth
    else if (user && (currentRoute === 'welcome' || currentRoute === 'auth')) {
      console.log('Redirecting to home');
      router.replace('/');
    }
  }, [user, segments, isLoading]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Проверяем авторизацию при загрузке (имитация проверки токена)
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    // Имитация загрузки данных пользователя
    setTimeout(() => {
      // В реальном приложении здесь была бы проверка токена
      // Для демо оставляем пользователя неавторизованным
      setIsLoading(false);
    }, 1000);
  };

  // Функция входа
  const login = async (email: string, password: string): Promise<boolean> => {
    // Имитация загрузки
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Поиск пользователя в мок данных
    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const userData: User = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name
      };
      setUser(userData);
      return true;
    }
    
    return false;
  };

  // Функция регистрации
  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    // Имитация загрузки
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Проверяем, нет ли уже пользователя с таким email
    const userExists = mockUsers.find(u => u.email === email);
    if (userExists) {
      return false;
    }
    
    // Создаем нового пользователя
    const newUser: User = {
      id: Date.now().toString(),
      email,
      name
    };
    
    // В реальном приложении здесь был бы запрос к API
    setUser(newUser);
    return true;
  };

  // Функция выхода
  const logout = () => {
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