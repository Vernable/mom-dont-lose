import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { pb } from './utils/pb';
import NavigationMenu from './components/NavigationMenu';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isFavoritesPublic, setIsFavoritesPublic] = useState(false);

  useEffect(() => {
    if (id) {
      loadUserProfile();
    }
  }, [id]);

  const loadUserProfile = async () => {
    try {
      console.log('📥 Загружаем профиль пользователя для просмотра:', id);
      const profile = await pb.collection('users').getOne(id as string);
      setUserProfile(profile);
      const publicStatus = profile.is_favorites_public === true;
      setIsFavoritesPublic(publicStatus);
      console.log('✅ Профиль загружен, is_favorites_public:', publicStatus);
      
      if (publicStatus) {
        try {
          const favoritesResult = await pb.collection('favorites').getList(1, 100, {
            filter: `user = "${id}" && place != null`,
            expand: 'place',
          });
          const favs = favoritesResult.items.map(item => item.expand?.place).filter(Boolean);
          setFavorites(favs);
          console.log('📦 Загружено избранных мест:', favs.length);
        } catch (error) {
          console.error('Ошибка загрузки избранных мест:', error);
        }
      } else {
        console.log('⚠️ Список избранных мест скрыт пользователем');
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить профиль');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarUrl = (avatar: string) => {
    if (!avatar) return null;
    try {
      return pb.files.getURL(userProfile, avatar);
    } catch (error) {
      return null;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#72383D" />
        <Text style={styles.loadingText}>Загрузка профиля...</Text>
        <NavigationMenu />
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Пользователь не найден</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Назад</Text>
          </TouchableOpacity>
        </View>
        <NavigationMenu />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <Image
            source={userProfile.avatar ? { uri: getAvatarUrl(userProfile.avatar) } : require('../assets/images/zaglushka.jpg')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{userProfile.firstname || userProfile.username || 'Пользователь'}</Text>
          <Text style={styles.username}>@{userProfile.username || 'username'}</Text>
        </View>

        {isFavoritesPublic && favorites.length > 0 && (
          <View style={styles.favoritesSection}>
            <Text style={styles.favoritesTitle}>⭐ Избранные места:</Text>
            {favorites.map((place: any) => (
              <TouchableOpacity
                key={place.id}
                style={styles.favoriteItem}
                onPress={() => router.push(`/descriptionplace?id=${place.id}`)}
              >
                <Text style={styles.favoriteName}>{place.name}</Text>
                <Text style={styles.favoriteAddress}>{place.address}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isFavoritesPublic && favorites.length === 0 && (
          <View style={styles.privateMessage}>
            <Text style={styles.privateIcon}>📭</Text>
            <Text style={styles.privateText}>У пользователя пока нет избранных мест</Text>
          </View>
        )}

        {!isFavoritesPublic && (
          <View style={styles.privateMessage}>
            <Text style={styles.privateIcon}>🔒</Text>
            <Text style={styles.privateText}>Пользователь скрыл список избранных мест</Text>
          </View>
        )}
      </ScrollView>
      <NavigationMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFE9E1' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EFE9E1' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#72383D', fontFamily: 'Banshrift' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  profileHeader: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, borderWidth: 3, borderColor: '#72383D' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#72383D', fontFamily: 'Banshrift', marginBottom: 5 },
  username: { fontSize: 16, color: '#72383D', opacity: 0.7, fontFamily: 'Banshrift' },
  favoritesSection: { marginTop: 20 },
  favoritesTitle: { fontSize: 18, fontWeight: 'bold', color: '#72383D', marginBottom: 15, fontFamily: 'Banshrift' },
  favoriteItem: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, marginBottom: 10 },
  favoriteName: { fontSize: 16, fontWeight: 'bold', color: '#72383D', fontFamily: 'Banshrift' },
  favoriteAddress: { fontSize: 12, color: '#666', marginTop: 4, fontFamily: 'Banshrift' },
  privateMessage: { alignItems: 'center', padding: 40 },
  privateIcon: { fontSize: 48, marginBottom: 10 },
  privateText: { fontSize: 14, color: '#72383D', textAlign: 'center', fontFamily: 'Banshrift' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#72383D', fontFamily: 'Banshrift', marginBottom: 20 },
  backButton: { backgroundColor: '#72383D', padding: 12, borderRadius: 8 },
  backButtonText: { color: 'white', fontSize: 16, fontFamily: 'Banshrift' },
});