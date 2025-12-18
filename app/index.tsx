import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
      
      // Теперь загружаем категории отдельно для каждого места
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
      
    } catch (error: any) {
      console.error('❌ ОШИБКА ЗАГРУЗКИ МЕСТ:', error);
      setLoadError(`Ошибка загрузки: ${error.message || 'Неизвестная ошибка'}`);
      
      // Пробуем самый простой запрос
      try {
        const simpleResult = await pb.collection('places').getList(1, 20);
        setAllPlaces(simpleResult.items);
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

  // Сортируем по рейтингу
  const sortedPlaces = useMemo(() => {
    return [...filteredPlaces].sort((a, b) => {
      const ratingA = a.external_rating ? parseFloat(a.external_rating) : 0;
      const ratingB = b.external_rating ? parseFloat(b.external_rating) : 0;
      return ratingB - ratingA;
    });
  }, [filteredPlaces]);

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

  const renderPlaceCard = ({ item }: { item: any }) => (
    <PlaceCard 
      item={item} 
      onPress={() => handlePlacePress(item.id)}
      isViewed={viewedPlaces.has(item.id)}
    />
  );

  const renderCategorySection = ({ item }: { item: any }) => (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <View style={styles.categoryHeaderRight}>
          <Text style={styles.placesCount}>{item.count}</Text>
          {/* Показываем лучший рейтинг в категории */}
          {item.places[0]?.external_rating && parseFloat(item.places[0].external_rating) > 0 && (
            <View style={styles.topRatingBadge}>
              <Text style={styles.topRatingText}>★ {parseFloat(item.places[0].external_rating).toFixed(1)}</Text>
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
          <Text style={styles.loadingText}>Загрузка мест...</Text>
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