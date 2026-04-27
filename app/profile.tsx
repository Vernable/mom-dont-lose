import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from './_layout';
import NavigationMenu from './components/NavigationMenu';
import { pb } from './utils/pb';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Выход из аккаунта',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: () => logout() }
      ]
    );
  };

  const handleViewedPlaces = () => {
    router.push('/viewedplaces');
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

      const updatedUser = await pb.collection('users').update(user.id, {
        'avatar': null
      });

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

      const formData = new FormData();
      formData.append('avatar', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);

      const updatedUser = await pb.collection('users').update(user.id, formData);

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
            {/* Username сверху */}
            <View style={styles.header}>
              <Text style={styles.headerUsername}>@{user.username || 'username'}</Text>
            </View>

            {/* Фото профиля слева и имя справа */}
            <View style={styles.profileRow}>
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

              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.firstname || user.username || 'Пользователь'}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
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

              <TouchableOpacity 
                style={[styles.actionButton, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Text style={[styles.actionButtonText, styles.logoutButtonText]}>🚪 Выйти из приложения</Text>
              </TouchableOpacity>
            </View>

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
    backgroundColor: '#EFE9E1',
  },
  profileContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  headerUsername: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#72383D',
    fontFamily: 'Banshrift',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#EFE9E1',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginRight: 20,
    borderWidth: 3,
    borderColor: '#72383D',
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
    backgroundColor: '#AC9C8D',
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
    fontFamily: 'Banshrift',
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
    borderRadius: 50,
  },
  loadingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#72383D',
    fontFamily: 'Banshrift',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#72383D',
    fontFamily: 'Banshrift',
    opacity: 0.7,
  },
  section: {
    backgroundColor: '#EFE9E1',
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
    color: '#72383D',
    marginBottom: 20,
    fontFamily: 'Banshrift',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#72383D',
    flex: 1,
    fontFamily: 'Banshrift',
  },
  infoValue: {
    fontSize: 16,
    color: '#72383D',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Banshrift',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  actionButton: {
    backgroundColor: '#72383D',
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
    fontFamily: 'Banshrift',
  },
  logoutButton: {
    backgroundColor: '#72383D',
    marginTop: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontFamily: 'Banshrift',
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
    color: '#72383D',
    marginBottom: 20,
    fontFamily: 'Banshrift',
  },
  authButton: {
    backgroundColor: '#72383D',
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
    fontFamily: 'Banshrift',
  },
});