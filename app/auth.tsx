import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useAuth } from './_layout';

export default function AuthScreen() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  // Функция проверки сложности пароля
  const validatePasswordStrength = (pwd: string): { isValid: boolean; errors: string[] } => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumbers = /\d/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    
    const errorsList = [];
    if (pwd.length < minLength) errorsList.push(`минимум ${minLength} символов`);
    if (!hasUpperCase) errorsList.push('хотя бы одну заглавную букву (A-Z)');
    if (!hasLowerCase) errorsList.push('хотя бы одну строчную букву (a-z)');
    if (!hasNumbers) errorsList.push('хотя бы одну цифру (0-9)');
    if (!hasSpecialChar) errorsList.push('хотя бы один спецсимвол (!@#$%^&* и т.д.)');
    
    return {
      isValid: errorsList.length === 0,
      errors: errorsList
    };
  };

  // Валидация email
  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  // Обработка изменения полей с очисткой ошибок
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
  };

  const handleAuth = async () => {
    // Очищаем предыдущие ошибки
    setErrors({});
    
    // Базовая валидация
    const newErrors: { email?: string; password?: string; name?: string } = {};
    
    if (!email) {
      newErrors.email = 'Введите email';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Введите корректный email (пример: name@domain.com)';
    }
    
    if (!password) {
      newErrors.password = 'Введите пароль';
    } else if (!isLogin) {
      // Только для регистрации проверяем сложность
      const strength = validatePasswordStrength(password);
      if (!strength.isValid) {
        newErrors.password = `Пароль должен содержать:\n${strength.errors.map(e => `• ${e}`).join('\n')}`;
      }
    } else if (password.length < 6) {
      newErrors.password = 'Пароль должен содержать минимум 6 символов';
    }
    
    if (!isLogin && !name) {
      newErrors.name = 'Введите ваше имя';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      let success = false;
      
      if (isLogin) {
        success = await login(email.trim().toLowerCase(), password);
        if (success) {
          router.back();
        } else {
          Alert.alert('Ошибка входа', 'Неверный email или пароль. Пожалуйста, проверьте введённые данные.');
        }
      } else {
        success = await register(email.trim().toLowerCase(), password, name.trim());
        if (success) {
          Alert.alert('Успешно!', 'Аккаунт создан. Теперь вы можете войти.', [
            {
              text: 'OK',
              onPress: () => {
                setIsLogin(true);
                setEmail('');
                setPassword('');
                setName('');
                setErrors({});
              }
            }
          ]);
        } else {
          Alert.alert('Ошибка регистрации', 'Не удалось создать аккаунт. Возможно, пользователь с таким email уже существует.');
        }
      }
      
    } catch (error: any) {
      console.error('Auth error:', error);
      
      let errorMessage = 'Произошла ошибка при авторизации';
      if (error?.response?.data?.email?.message?.includes('already exists')) {
        errorMessage = 'Пользователь с таким email уже существует';
      } else if (error?.message?.includes('Invalid login')) {
        errorMessage = 'Неверный email или пароль';
      }
      
      Alert.alert('Ошибка', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Ошибка', 'Введите ваш email для восстановления пароля');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Ошибка', 'Введите корректный email');
      return;
    }

    setIsLoading(true);
    try {
      // Здесь будет вызов resetPassword, если добавишь в useAuth
      Alert.alert('Проверьте почту', 'Инструкции по восстановлению пароля отправлены на ваш email');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отправить запрос на восстановление пароля');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isLogin ? 'Вход в аккаунт' : 'Регистрация'}
      </Text>
      
      <View style={styles.form}>
        {!isLogin && (
          <>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Ваше имя"
              placeholderTextColor="#999"
              value={name}
              onChangeText={handleNameChange}
              editable={!isLoading}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </>
        )}
        
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.passwordInput, errors.password && styles.inputError]}
            placeholder="Пароль"
            placeholderTextColor="#999"
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry={!showPassword}
            editable={!isLoading}
          />
          <TouchableOpacity 
            style={styles.eyeButton} 
            onPress={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleAuth}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.footerLinks}>
          <TouchableOpacity 
            style={styles.switchButton}
            onPress={() => {
              setIsLogin(!isLogin);
              setErrors({});
              setPassword('');
            }}
            disabled={isLoading}
          >
            <Text style={styles.switchButtonText}>
              {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </Text>
          </TouchableOpacity>
          
          {isLogin && (
            <TouchableOpacity 
              style={styles.forgotButton}
              onPress={handleForgotPassword}
              disabled={isLoading}
            >
              <Text style={styles.forgotButtonText}>Забыли пароль?</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
        disabled={isLoading}
      >
        <Text style={styles.backButtonText}>← Назад</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFE9E1',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
    color: '#72383D',
  },
  form: {
    width: '100%',
    maxWidth: 320,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
    color: '#000000',
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 4,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#000000',
    borderWidth: 0,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeButtonText: {
    fontSize: 20,
    color: '#72383D',
  },
  button: {
    backgroundColor: '#72383D',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 8,
    height: 54,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerLinks: {
    width: '100%',
    alignItems: 'center',
  },
  switchButton: {
    padding: 12,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#72383D',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotButton: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  forgotButtonText: {
    color: '#72383D',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  backButton: {
    marginTop: 20,
    padding: 10,
  },
  backButtonText: {
    color: '#72383D',
    fontSize: 16,
  },
});