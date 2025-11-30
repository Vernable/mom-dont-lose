import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAuth } from './_layout';
import NavigationMenu from './components/NavigationMenu';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
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
              <View style={styles.photoContainer}>
                <Image 
                  source={user.avatar ? { uri: user.avatar } : require('../assets/images/zaglushka.jpg')}
                  style={styles.profilePhoto}
                  resizeMode="cover"
                />
              </View>
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
              
              <TouchableOpacity style={styles.actionItem}>
                <View style={styles.actionCheckbox} />
                <Text style={styles.actionText}>Недавно просмотренные места</Text>
              </TouchableOpacity>

              {/* Кнопка выхода в разделе Действия */}
              <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
                <View style={styles.actionCheckbox} />
                <Text style={styles.actionText}>Выйти из приложения</Text>
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
    paddingBottom: 100, // Большой отступ снизу для навигационного меню
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
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
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
  // Добавленные стили для actionButton
  actionButton: {
    backgroundColor: '#511515',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
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
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#511515',
    borderRadius: 4,
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  bottomSpacer: {
    height: 80, // Дополнительный отступ
  },
  guestContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 100, // Отступ для гостевого режима
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