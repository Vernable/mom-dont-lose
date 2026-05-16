import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { pb } from './utils/pb';
import { useAuth } from './_layout';
import NavigationMenu from './components/NavigationMenu';
import { PlaceCard } from './components/PlaceCard';

const { width: screenWidth } = Dimensions.get('window');

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth(); // Теперь useAuth импортирован
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isFavoritesPublic, setIsFavoritesPublic] = useState(false);
  const [viewedPlaces, setViewedPlaces] = useState<Set<string>>(new Set());

  // Загрузка просмотренных мест текущего пользователя
  const loadViewedPlaces = async () => {
    if (!user) return;
    
    try {
      const viewedRecords = await pb.collection('search_place').getFullList({
        filter: `user = "${user.id}"`,
      });
      
      const viewedIds = new Set(viewedRecords.map(record => record.place));
      setViewedPlaces(viewedIds);
      console.log('Загружено просмотренных мест:', viewedIds.size);
    } catch (error) {
      console.error('Ошибка загрузки просмотренных мест:', error);
    }
  };

  useEffect(() => {
    if (id) {
      loadUserProfile();
    }
    if (user) {
      loadViewedPlaces();
    }
  }, [id, user]);

  const loadUserProfile = async () => {
    try {
      console.log('📥 Загружаем профиль пользователя для просмотра:', id);
      const profile = await pb.collection('users').getOne(id as string);
      setUserProfile(profile);
      
      const publicStatus = (profile as any).is_public === true;
      setIsFavoritesPublic(publicStatus);
      console.log('✅ Профиль загружен, is_public:', publicStatus);
      
      if (publicStatus) {
        await loadUserFavorites(id as string);
      } else {
        console.log('⚠️ Список избранных мест скрыт пользователем');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить профиль');
      setIsLoading(false);
    }
  };

  const loadUserFavorites = async (userId: string) => {
    try {
      console.log('📦 Загружаем избранные места для пользователя:', userId);
      
      const favoritesResult = await pb.collection('favorites').getList(1, 100, {
        filter: `user = "${userId}" && place != null`,
      });
      
      console.log('📦 Найдено записей в favorites:', favoritesResult.items.length);
      
      if (favoritesResult.items.length === 0) {
        setFavorites([]);
        setIsLoading(false);
        return;
      }
      
      const placesPromises = favoritesResult.items.map(async (item: any) => {
        if (!item.place) return null;
        try {
          const place = await pb.collection('places').getOne(item.place, {
            expand: 'category',
          });
          
          let ratingValue = null;
          if (place.yandex_map_id) {
            try {
              if (place.external_rating) {
                ratingValue = parseFloat(place.external_rating);
              }
            } catch (err) {}
          }
          
          return { ...place, ratingValue };
        } catch (err) {
          console.error(`Ошибка загрузки места ${item.place}:`, err);
          return null;
        }
      });
      
      const places = await Promise.all(placesPromises);
      const uniquePlaces = Array.from(
        new Map(places.filter(p => p !== null).map(p => [p.id, p])).values()
      );
      
      setFavorites(uniquePlaces);
      console.log('📦 Загружено уникальных избранных мест:', uniquePlaces.length);
      
    } catch (error) {
      console.error('Ошибка загрузки избранных мест:', error);
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarUrl = (avatar: string) => {
    if (!avatar || !userProfile) return null;
    try {
      return pb.files.getURL(userProfile, avatar);
    } catch (error) {
      return null;
    }
  };

  const handlePlacePress = (placeId: string) => {
    router.push(`/descriptionplace?id=${placeId}`);
  };

  const handleGoBack = () => {
    router.back();
  };

  const categorizedFavorites = useMemo(() => {
    const categoriesMap = new Map<string, any[]>();
    
    favorites.forEach((place) => {
      const categoryName = place.expand?.category?.name || 'Другие места';
      if (!categoriesMap.has(categoryName)) {
        categoriesMap.set(categoryName, []);
      }
      categoriesMap.get(categoryName)!.push(place);
    });
    
    return Array.from(categoriesMap.entries())
      .map(([name, places]) => ({
        id: `category-${name}`,
        name: name,
        count: places.length,
        places: places
      }))
      .sort((a, b) => b.places.length - a.places.length);
  }, [favorites]);

  const renderFavoriteCard = ({ item }: { item: any }) => {
    const ratingValue = item.ratingValue || 
                       (item.external_rating ? parseFloat(item.external_rating) : null);
    
    return (
      <PlaceCard 
        item={item} 
        onPress={() => handlePlacePress(item.id)}
        isViewed={viewedPlaces.has(item.id)}
        ratingValue={ratingValue}
        yandexMapId={item.yandex_map_id}
      />
    );
  };

  const renderCategorySection = ({ item }: { item: any }) => {
    let topRating = 0;
    item.places.forEach((place: any) => {
      const rating = place.ratingValue || 
                    (place.external_rating ? parseFloat(place.external_rating) : 0);
      if (rating > topRating) {
        topRating = rating;
      }
    });

    return (
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.categoryHeaderRight}>
            <Text style={styles.placesCount}>{item.count}</Text>
            {topRating > 0 && (
              <View style={styles.topRatingBadge}>
                <Text style={styles.topRatingText}>★ {topRating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
        <FlatList
          data={item.places}
          renderItem={renderFavoriteCard}
          keyExtractor={(place) => place.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.placesList}
          snapToInterval={280}
          decelerationRate="fast"
        />
      </View>
    );
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

  const totalFavorites = favorites.length;

  return (
    <View style={styles.container}>
      {/* Шапка с кнопкой назад */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backButtonHeader} onPress={handleGoBack}>
          <Text style={styles.backButtonHeaderText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Профиль</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Фото профиля */}
        <View style={styles.profileHeader}>
          <Image
            source={userProfile.avatar ? { uri: getAvatarUrl(userProfile.avatar) } : require('../assets/images/zaglushka.jpg')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{userProfile.firstname || userProfile.username || 'Пользователь'}</Text>
          <Text style={styles.username}>@{userProfile.username || 'username'}</Text>
        </View>

        {isFavoritesPublic && totalFavorites > 0 && (
          <View style={styles.favoritesContainer}>
            <View style={styles.favoritesHeader}>
              <Text style={styles.favoritesTitle}>⭐ Избранные места</Text>
              <Text style={styles.favoritesCount}>{totalFavorites}</Text>
            </View>
            <FlatList
              data={categorizedFavorites}
              renderItem={renderCategorySection}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
              scrollEnabled={false}
            />
          </View>
        )}

        {isFavoritesPublic && totalFavorites === 0 && (
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
  scrollContent: { paddingBottom: 100 },
  
  // Шапка с кнопкой назад
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#72383D',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButtonHeader: {
    padding: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonHeaderText: {
    fontSize: 28,
    color: '#EFE9E1',
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EFE9E1',
    fontFamily: 'Banshrift',
  },
  headerPlaceholder: {
    width: 44,
  },
  
  // Профиль
  profileHeader: { 
    alignItems: 'center', 
    paddingTop: 30,
    paddingBottom: 25,
    backgroundColor: '#EFE9E1',
    borderBottomWidth: 1,
    borderBottomColor: '#E0D5C8',
  },
  avatar: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    marginBottom: 12, 
    borderWidth: 3, 
    borderColor: '#72383D' 
  },
  name: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#72383D', 
    fontFamily: 'Banshrift', 
    marginBottom: 4 
  },
  username: { 
    fontSize: 15, 
    color: '#72383D', 
    opacity: 0.65, 
    fontFamily: 'Banshrift' 
  },
  
  favoritesContainer: { marginTop: 16 },
  favoritesHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 16, 
    paddingBottom: 12
  },
  favoritesTitle: { fontSize: 18, fontWeight: 'bold', color: '#72383D', fontFamily: 'Banshrift' },
  favoritesCount: { fontSize: 15, color: '#72383D', fontWeight: '600', fontFamily: 'Banshrift' },
  categoriesList: { paddingBottom: 20 },
  
  categorySection: { marginBottom: 24 },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#72383D',
    marginBottom: 12,
  },
  categoryName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: 'white', 
    fontFamily: 'Banshrift',
    flex: 1,
    marginRight: 10,
  },
  categoryHeaderRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  placesCount: { 
    fontSize: 13, 
    color: 'white', 
    fontFamily: 'Banshrift', 
    opacity: 0.85,
    fontWeight: '500',
  },
  topRatingBadge: { 
    backgroundColor: '#FFB300', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 12 
  },
  topRatingText: { 
    fontSize: 11, 
    color: '#72383D', 
    fontWeight: 'bold', 
    fontFamily: 'Banshrift' 
  },
  placesList: { 
    paddingLeft: 16, 
    paddingRight: 16 
  },
  
  privateMessage: { alignItems: 'center', padding: 50, marginTop: 40 },
  privateIcon: { fontSize: 56, marginBottom: 12 },
  privateText: { fontSize: 15, color: '#72383D', textAlign: 'center', fontFamily: 'Banshrift', opacity: 0.7 },
  
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 18, color: '#72383D', fontFamily: 'Banshrift', marginBottom: 20 },
  backButton: { backgroundColor: '#72383D', padding: 12, borderRadius: 8 },
  backButtonText: { color: 'white', fontSize: 16, fontFamily: 'Banshrift' },
});