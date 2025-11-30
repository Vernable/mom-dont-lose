import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useAuth } from './_layout';
import NavigationMenu from './components/NavigationMenu';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { pb } from './utilis/pb';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleViewedPlaces = () => {
    // Здесь можно добавить навигацию на экран просмотренных мест
    Alert.alert('Просмотренные места', 'Функция в разработке');
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Необходимо разрешение на доступ к галерее');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Необходимо разрешение на доступ к камере');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const deleteAvatar = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Удаляем аватар пользователя в PocketBase
      const updatedUser = await pb.collection('users').update(user.id, {
        'avatar': null
      });

      // Обновляем данные в контексте аутентификации
      if (updateUser) {
        updateUser(updatedUser);
      }

      Alert.alert('Успех', 'Аватар удален');
    } catch (error: any) {
      console.error('Ошибка удаления аватара:', error);
      Alert.alert('Ошибка', 'Не удалось удалить аватар');
    } finally {
      setIsLoading(false);
    }
  };

  const showImagePickerOptions = () => {
    const options: {
      text: string;
      onPress?: () => void | Promise<void>;
      style?: 'default' | 'cancel' | 'destructive';
    }[] = [
      {
        text: 'Камера',
        onPress: takePhoto,
      },
      {
        text: 'Галерея',
        onPress: pickImage,
      },
    ];

    // Добавляем опцию удаления только если аватар существует
    if (user?.avatar) {
      options.push({
        text: 'Удалить аватар',
        onPress: deleteAvatar,
        style: 'destructive',
      });
    }

    options.push({
      text: 'Отмена',
      style: 'cancel',
    });

    Alert.alert(
      'Сменить аватар',
      'Выберите действие',
      options
    );
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Создаем FormData для загрузки файла
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      // Обновляем аватар пользователя в PocketBase
      const updatedUser = await pb.collection('users').update(user.id, formData);

      // Обновляем данные в контексте аутентификации
      if (updateUser) {
        updateUser(updatedUser);
      }

      Alert.alert('Успех', 'Аватар обновлен');
    } catch (error: any) {
      console.error('Ошибка загрузки аватара:', error);
      Alert.alert('Ошибка', 'Не удалось обновить аватар');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {user ? (
        <View style={styles.profileContent}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Фото профиля по центру */}
            <View style={styles.photoSection}>
              <TouchableOpacity 
                style={styles.photoContainer}
                onPress={showImagePickerOptions}
                disabled={isLoading}
              >
                <Image 
                  source={user.avatar ? { uri: pb.files.getUrl(user, user.avatar) } : require('../assets/images/zaglushka.jpg')}
                  style={styles.profilePhoto}
                  resizeMode="cover"
                />
                <View style={styles.cameraIconContainer}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
                {isLoading && (
                  <View style={styles.loadingOverlay}>
                    <Text style={styles.loadingText}>Загрузка...</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.userUsername}>@{user.username || 'username'}</Text>
            </View>

            {/* Информация профиля */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Информация профиля</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Имя</Text>
                <Text style={styles.infoValue}>
                  {user.firstname || 'Не указано'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Имя пользователя</Text>
                <Text style={styles.infoValue}>
                  {user.username || 'Не указано'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user.email}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Статус</Text>
                <Text style={styles.infoValue}>✓ Подтвержден</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Дата регистрации</Text>
                <Text style={styles.infoValue}>
                  {user.created ? new Date(user.created).toLocaleDateString('ru-RU') : '23.11.2025'}
                </Text>
              </View>
            </View>

            {/* Разделитель */}
            <View style={styles.divider} />

            {/* Действия */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Действия</Text>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/editprofile')}
              >
                <Text style={styles.actionButtonText}>✏️ Редактировать профиль</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleViewedPlaces}
              >
                <Text style={styles.actionButtonText}>👁️ Недавно просмотренные места</Text>
              </TouchableOpacity>

              {/* Кнопка выхода в разделе Действия */}
              <TouchableOpacity 
                style={[styles.actionButton, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Text style={[styles.actionButtonText, styles.logoutButtonText]}>🚪 Выйти из приложения</Text>
              </TouchableOpacity>
            </View>

            {/* Дополнительный отступ снизу для навигационного меню */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      ) : (
        <View style={styles.guestContent}>
          <Text style={styles.guestText}>Вы не авторизованы</Text>
          <TouchableOpacity 
            style={styles.authButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.authButtonText}>Войти / Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      )}

      <NavigationMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  profileContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100,
  },
  photoSection: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#511515',
    position: 'relative',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#511515',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  cameraIcon: {
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  loadingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userUsername: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#511515',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#511515',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  actionButton: {
    backgroundColor: '#511515',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    marginTop: 8,
  },
  logoutButtonText: {
    color: 'white',
  },
  bottomSpacer: {
    height: 80,
  },
  guestContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 100,
  },
  guestText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  authButton: {
    backgroundColor: '#511515',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});