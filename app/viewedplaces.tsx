import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './_layout';
import { pb } from './utilis/pb';
import NavigationMenu from './components/NavigationMenu';

export default function ViewedPlacesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [viewedPlaces, setViewedPlaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadViewedPlaces();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const loadViewedPlaces = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Загружаем записи о просмотренных местах с расширенной информацией о местах
      const viewedRecords = await pb.collection('search_place').getFullList({
        filter: `user = "${user.id}"`,
        expand: 'place,place.category',
        sort: '-created'
      });

      // Извлекаем информацию о местах из расширенных данных
      const places = viewedRecords
        .filter(record => record.expand?.place) // Проверяем что expand и place существуют
        .map(record => ({
          ...record.expand!.place, // Используем non-null assertion так как мы уже отфильтровали
          viewedAt: record.created
        }));

      setViewedPlaces(places);
      console.log('Загружено просмотренных мест:', places.length);
    } catch (error) {
      console.error('Ошибка загрузки просмотренных мест:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить просмотренные места');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlacePress = (placeId: string) => {
    router.push({
      pathname: '/descriptionplace',
      params: { id: placeId }
    });
  };

  const handleBack = () => {
    router.back();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Просмотренные места</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.guestContent}>
          <Text style={styles.guestText}>Вы не авторизованы</Text>
          <Text style={styles.guestSubtext}>Войдите в аккаунт чтобы видеть историю просмотренных мест</Text>
        </View>
        <NavigationMenu />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Просмотренные места</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#72383D" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      ) : viewedPlaces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Пока ничего нет</Text>
          <Text style={styles.emptyText}>
            Места, которые вы посмотрите на главной странице, появятся здесь
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.placesList}>
            {viewedPlaces.map((place) => (
              <TouchableOpacity
                key={place.id}
                style={styles.placeCard}
                onPress={() => handlePlacePress(place.id)}
              >
                <View style={styles.placeImageContainer}>
                  {place.photos && place.photos.length > 0 ? (
                    <Image
                      source={{ uri: pb.files.getURL(place, place.photos[0]) }}
                      style={styles.placeImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeImagePlaceholder}>
                      <Text style={styles.placeImagePlaceholderText}>📸</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.placeInfo}>
                  <Text style={styles.placeName} numberOfLines={2}>
                    {place.name}
                  </Text>
                  <Text style={styles.placeDescription} numberOfLines={2}>
                    {place.description}
                  </Text>
                  <View style={styles.placeMeta}>
                    <Text style={styles.placeCategory}>
                      {place.expand?.category?.name || 'Другие места'}
                    </Text>
                    <Text style={styles.placeRating}>
                      ⭐ {place.external_rating || 'Нет оценок'}
                    </Text>
                  </View>
                  <Text style={styles.viewedDate}>
                    Просмотрено: {formatDate(place.viewedAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}

      <NavigationMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFE9E1', // Новый цвет фона
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#72383D', // Новый цвет хедера
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#000000', // Черный цвет
    fontFamily: 'Banshrift', // Новый шрифт
  },
  guestContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  guestText: {
    fontSize: 18,
    color: '#000000', // Черный цвет
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  guestSubtext: {
    fontSize: 14,
    color: '#000000', // Черный цвет
    textAlign: 'center',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#72383D', // Новый цвет
    marginBottom: 8,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  emptyText: {
    fontSize: 14,
    color: '#000000', // Черный цвет
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  placesList: {
    padding: 16,
  },
  placeCard: {
    backgroundColor: '#EFE9E1', // Новый цвет карточки
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  placeImageContainer: {
    height: 160,
  },
  placeImage: {
    width: '100%',
    height: '100%',
  },
  placeImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#72383D', // Новый цвет
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeImagePlaceholderText: {
    fontSize: 32,
    color: 'white',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  placeInfo: {
    padding: 16,
  },
  placeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#72383D', // Новый цвет
    marginBottom: 8,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  placeDescription: {
    fontSize: 14,
    color: '#000000', // Черный цвет
    marginBottom: 12,
    lineHeight: 20,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  placeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeCategory: {
    fontSize: 12,
    color: '#72383D', // Новый цвет текста
    backgroundColor: '#AC9C8D', // Новый цвет фона кружочка
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  placeRating: {
    fontSize: 14,
    color: '#ffa500',
    fontWeight: '600',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  viewedDate: {
    fontSize: 12,
    color: '#000000', // Черный цвет
    fontFamily: 'Banshrift', // Новый шрифт
  },
  bottomSpacer: {
    height: 80,
  },
});