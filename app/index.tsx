import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from './_layout';
import NavigationMenu from './components/NavigationMenu';
import { PlaceCard } from './components/PlaceCard';
import { pb } from './utils/pb';
import { fetchYandexRating } from './utils/yandexService';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allPlaces, setAllPlaces] = useState<any[]>([]);
  const [viewedPlaces, setViewedPlaces] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [ratings, setRatings] = useState<Record<string, { rating: number, reviews: number }>>({});

  // Функция загрузки рейтинга из Яндекса
  const loadYandexRating = useCallback(async (yandexMapId: string, placeId: string) => {
    if (!yandexMapId) {
      console.log(`⚠️ Нет yandex_map_id для места ${placeId}`);
      return null;
    }
    
    console.log(`🎯 Загружаем рейтинг для ${placeId}: ${yandexMapId}`);
    
    try {
      const ratingData = await fetchYandexRating(yandexMapId);
      console.log(`📊 Результат рейтинга для ${placeId}:`, ratingData);
      
      if (ratingData) {
        // Сохраняем рейтинг в состоянии
        setRatings(prev => ({
          ...prev,
          [placeId]: ratingData
        }));
        
        // Обновляем в PocketBase (опционально)
        try {
          await pb.collection('places').update(placeId, {
            external_rating: ratingData.rating.toFixed(1)
          });
          console.log(`💾 Рейтинг сохранен в БД для ${placeId}`);
        } catch (updateError) {
          console.log(`⚠️ Не удалось сохранить в БД для ${placeId}:`, updateError);
        }
        
        return ratingData;
      } else {
        console.log(`❌ Рейтинг не найден для ${placeId}`);
        return null;
      }
    } catch (error: any) {
      console.error(`🔥 Ошибка загрузки рейтинга для ${placeId}:`, error);
      return null;
    }
  }, []);

  // Загрузка рейтингов для всех мест с yandex_map_id
  const loadAllRatings = useCallback(async (places: any[]) => {
    const ratingPromises = places
      .filter(place => place.yandex_map_id)
      .map(async (place) => {
        // Если уже есть external_rating в БД, используем его
        if (place.external_rating) {
          try {
            const rating = parseFloat(place.external_rating);
            if (!isNaN(rating)) {
              setRatings(prev => ({
                ...prev,
                [place.id]: { rating, reviews: 0 }
              }));
              return;
            }
          } catch (e) {
            console.log(`Ошибка парсинга external_rating для ${place.id}`);
          }
        }
        
        // Иначе загружаем из Яндекса
        return loadYandexRating(place.yandex_map_id, place.id);
      });
    
    await Promise.all(ratingPromises);
  }, [loadYandexRating]);

  useEffect(() => {
    loadPlaces();
    if (user) {
      loadViewedPlaces();
    }
  }, [user]);

  const loadPlaces = async () => {
    try {
      console.log('Начинаем загрузку мест...');
      setIsLoading(true);
      setLoadError(null);
      
      const result = await pb.collection('places').getList(1, 200);
      
      console.log('✅ Загружено мест:', result.items.length);
      
      // Загружаем категории отдельно для каждого места
      const placesWithCategories = await Promise.all(
        result.items.map(async (place) => {
          if (place.category) {
            try {
              const category = await pb.collection('categories').getOne(place.category);
              return {
                ...place,
                expand: { category }
              };
            } catch (error) {
              console.log(`Не удалось загрузить категорию для места ${place.id}`);
              return {
                ...place,
                expand: { category: null }
              };
            }
          }
          return place;
        })
      );
      
      setAllPlaces(placesWithCategories);
      
      // Загружаем рейтинги для всех мест
      await loadAllRatings(placesWithCategories);
      
    } catch (error: any) {
      console.error('❌ ОШИБКА ЗАГРУЗКИ МЕСТ:', error);
      setLoadError(`Ошибка загрузки: ${error.message || 'Неизвестная ошибка'}`);
      
      // Пробуем самый простой запрос
      try {
        const simpleResult = await pb.collection('places').getList(1, 20);
        setAllPlaces(simpleResult.items);
        await loadAllRatings(simpleResult.items);
        setLoadError(null);
      } catch (simpleError) {
        console.error('Простой запрос тоже не работает:', simpleError);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setRatings({}); // Сбрасываем рейтинги
    loadPlaces();
    if (user) {
      loadViewedPlaces();
    }
  };

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

  const markPlaceAsViewed = async (placeId: string) => {
    if (!user) return;

    try {
      const existingRecord = await pb.collection('search_place').getList(1, 1, {
        filter: `user = "${user.id}" && place = "${placeId}"`,
      });

      if (existingRecord.items.length === 0) {
        await pb.collection('search_place').create({
          user: user.id,
          place: placeId,
        });
        
        setViewedPlaces(prev => new Set([...prev, placeId]));
      }
    } catch (error) {
      console.error('Ошибка при отметке места:', error);
    }
  };

  const filteredPlaces = useMemo(() => {
    if (!searchQuery.trim()) return allPlaces;
    const query = searchQuery.toLowerCase().trim();
    return allPlaces.filter(place => 
      (place.name && place.name.toLowerCase().includes(query)) ||
      (place.address && place.address.toLowerCase().includes(query)) ||
      (place.expand?.category?.name && place.expand.category.name.toLowerCase().includes(query))
    );
  }, [allPlaces, searchQuery]);

  // Сортируем по рейтингу (используем ratings или external_rating)
  const sortedPlaces = useMemo(() => {
    return [...filteredPlaces].sort((a, b) => {
      // Получаем рейтинг из состояния или из БД
      const ratingA = ratings[a.id]?.rating || 
                     (a.external_rating ? parseFloat(a.external_rating) : 0);
      const ratingB = ratings[b.id]?.rating || 
                     (b.external_rating ? parseFloat(b.external_rating) : 0);
      return ratingB - ratingA;
    });
  }, [filteredPlaces, ratings]);

  // ГРУППИРУЕМ ПО КАТЕГОРИЯМ
  const categories = useMemo(() => {
    const categoriesMap = new Map<string, any[]>();
    
    sortedPlaces.forEach((place) => {
      const categoryName = place.expand?.category?.name || 'Другие места';
      if (!categoriesMap.has(categoryName)) {
        categoriesMap.set(categoryName, []);
      }
      categoriesMap.get(categoryName)!.push(place);
    });

    // Сортируем категории по количеству мест
    return Array.from(categoriesMap.entries())
      .map(([name, places], index) => ({
        id: `category-${index}`,
        name: name,
        count: `${places.length} мест`,
        places: places
      }))
      .sort((a, b) => b.places.length - a.places.length);
  }, [sortedPlaces]);

  const handlePlacePress = (placeId: string) => {
    markPlaceAsViewed(placeId);
    router.push({
      pathname: '/descriptionplace',
      params: { id: placeId }
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const renderPlaceCard = ({ item }: { item: any }) => {
    // Получаем рейтинг для этой карточки
    const placeRating = ratings[item.id];
    const ratingValue = placeRating?.rating || 
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
    // Находим лучший рейтинг в категории
    let topRating = 0;
    item.places.forEach((place: any) => {
      const rating = ratings[place.id]?.rating || 
                    (place.external_rating ? parseFloat(place.external_rating) : 0);
      if (rating > topRating) {
        topRating = rating;
      }
    });

    return (
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryName}>{item.name}</Text>
          <View style={styles.categoryHeaderRight}>
            <Text style={styles.placesCount}>{item.count}</Text>
            {/* Показываем лучший рейтинг в категории */}
            {topRating > 0 && (
              <View style={styles.topRatingBadge}>
                <Text style={styles.topRatingText}>★ {topRating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
        <FlatList
          data={item.places}
          renderItem={renderPlaceCard}
          keyExtractor={(place) => place.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.placesList}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск по названию или адресу..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#666"
            />
            {searchQuery ? (
              <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#72383D" />
          <Text style={styles.loadingText}>Загрузка мест и рейтингов...</Text>
        </View>
        <NavigationMenu />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск по названию или адресу..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#666"
            />
            {searchQuery ? (
              <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ошибка загрузки</Text>
          <Text style={styles.errorDescription}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPlaces}>
            <Text style={styles.retryButtonText}>Повторить</Text>
          </TouchableOpacity>
        </View>
        <NavigationMenu />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по названию или адресу..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666"
          />
          {searchQuery ? (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategorySection}
        keyExtractor={(category) => category.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Места не найдены</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Text style={styles.refreshButtonText}>Обновить</Text>
            </TouchableOpacity>
          </View>
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <NavigationMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFE9E1',
  },
  header: {
    backgroundColor: '#EFE9E1',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    fontFamily: 'Banshrift',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'Banshrift',
  },
  categoriesList: {
    paddingBottom: 80,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#72383D',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    fontFamily: 'Banshrift',
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placesCount: {
    fontSize: 14,
    color: 'white',
    fontFamily: 'Banshrift',
  },
  topRatingBadge: {
    backgroundColor: '#ffa500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  topRatingText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
  placesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#000000',
    fontFamily: 'Banshrift',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#72383D',
    marginBottom: 8,
    fontFamily: 'Banshrift',
  },
  errorDescription: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Banshrift',
  },
  retryButton: {
    backgroundColor: '#72383D',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
  refreshButton: {
    backgroundColor: '#72383D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Banshrift',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    fontFamily: 'Banshrift',
  },
});