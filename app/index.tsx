import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from './_layout';
import NavigationMenu from './components/NavigationMenu';
import { pb } from './utils/pb';

const { width: screenWidth } = Dimensions.get('window');

// Выносим карточку места в отдельный компонент
const PlaceCard = ({ item, onPress, isViewed }: { item: any; onPress: (id: string) => void; isViewed: boolean }) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const nextPhoto = (e: any) => {
    e.stopPropagation();
    if (item.photos && item.photos.length > 1) {
      setActivePhotoIndex((prev) => 
        prev === item.photos.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevPhoto = (e: any) => {
    e.stopPropagation();
    if (item.photos && item.photos.length > 1) {
      setActivePhotoIndex((prev) => 
        prev === 0 ? item.photos.length - 1 : prev - 1
      );
    }
  };

  return (
    <TouchableOpacity 
      style={styles.placeCard}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.photosContainer}>
        {item.photos && item.photos.length > 0 ? (
          <View style={styles.photoScrollContainer}>
            <Image 
              source={{ uri: pb.files.getURL(item, item.photos[activePhotoIndex]) }}
              style={styles.photo}
              resizeMode="cover"
            />
            
            {/* Индикатор просмотренного места */}
            {isViewed && (
              <View style={styles.viewedBadge}>
                <Text style={styles.viewedBadgeText}>👁️</Text>
              </View>
            )}
            
            {item.photos.length > 1 && (
              <>
                <TouchableOpacity style={styles.photoNavButtonLeft} onPress={prevPhoto}>
                  <Text style={styles.photoNavText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoNavButtonRight} onPress={nextPhoto}>
                  <Text style={styles.photoNavText}>›</Text>
                </TouchableOpacity>
                
                <View style={styles.photoIndicators}>
                  {item.photos.map((_: any, index: number) => (
                    <View
                      key={index}
                      style={[
                        styles.photoIndicator,
                        index === activePhotoIndex && styles.photoIndicatorActive
                      ]}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: '#72383D' }]}>
            <Text style={styles.photoPlaceholderText}>📸</Text>
            {/* Индикатор просмотренного места для placeholder */}
            {isViewed && (
              <View style={styles.viewedBadge}>
                <Text style={styles.viewedBadgeText}>👁️</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.placeInfo}>
        <Text style={styles.placeName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.placeDescription} numberOfLines={1}>{item.description}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {item.external_rating || 'Нет оценок'}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.expand?.category?.name || 'Другие места'}</Text>
          </View>
        </View>
        <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allPlaces, setAllPlaces] = useState<any[]>([]);
  const [viewedPlaces, setViewedPlaces] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Текущий статус авторизации на главной:', { 
      isValid: !!user, 
      user 
    });
    
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
      
      const result = await pb.collection('places').getList(1, 50, {
        expand: 'category',
        requestKey: 'home_places'
      });
      
      console.log('Загружено мест:', result.items.length);
      setAllPlaces(result.items);
    } catch (error: any) {
      console.error('Ошибка загрузки мест:', error);
      setLoadError(error.message || 'Не удалось загрузить данные');
    } finally {
      setIsLoading(false);
    }
  };

  const loadViewedPlaces = async () => {
    if (!user) return;
    
    try {
      const viewedRecords = await pb.collection('search_place').getFullList({
        filter: `user = "${user.id}"`,
        expand: 'place'
      });
      
      const viewedIds = new Set(viewedRecords.map(record => record.place));
      setViewedPlaces(viewedIds);
      console.log('Загружено просмотренных мест:', viewedIds.size);
    } catch (error) {
      console.error('Ошибка загрузки просмотренных мест:', error);
    }
  };

  // Функция для отметки места как просмотренного
  const markPlaceAsViewed = async (placeId: string) => {
    if (!user) return;

    try {
      // Проверяем, не было ли уже просмотрено это место
      const existingRecord = await pb.collection('search_place').getList(1, 1, {
        filter: `user = "${user.id}" && place = "${placeId}"`,
      });

      if (existingRecord.items.length === 0) {
        // Создаем новую запись о просмотренном месте
        await pb.collection('search_place').create({
          user: user.id,
          place: placeId,
        });
        
        // Обновляем локальное состояние
        setViewedPlaces(prev => new Set([...prev, placeId]));
        console.log('Место отмечено как просмотренное');
      }
    } catch (error) {
      console.error('Ошибка при отметке места:', error);
    }
  };

  const filteredPlaces = useMemo(() => {
    if (!searchQuery.trim()) return allPlaces;
    const query = searchQuery.toLowerCase().trim();
    return allPlaces.filter(place => 
      place.name?.toLowerCase().includes(query) ||
      place.address?.toLowerCase().includes(query) ||
      place.expand?.category?.name?.toLowerCase().includes(query)
    );
  }, [allPlaces, searchQuery]);

  const categories = useMemo(() => {
    const categoriesMap = new Map<string, any[]>();
    
    filteredPlaces.forEach((place) => {
      const categoryName = place.expand?.category?.name || 'Другие места';
      if (!categoriesMap.has(categoryName)) {
        categoriesMap.set(categoryName, []);
      }
      categoriesMap.get(categoryName)!.push(place);
    });

    return Array.from(categoriesMap.entries()).map(([name, places], index) => ({
      id: `category-${index}`,
      name: name,
      count: `${places.length} мест`,
      places: places
    }));
  }, [filteredPlaces]);

  const handlePlacePress = (placeId: string) => {
    // Отмечаем место как просмотренное
    markPlaceAsViewed(placeId);
    
    // Переходим на страницу описания
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
      onPress={handlePlacePress}
      isViewed={viewedPlaces.has(item.id)}
    />
  );

  const renderCategorySection = ({ item }: { item: any }) => (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.placesCount}>{item.count}</Text>
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
          <View style={styles.headerTop} />
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
          <View style={styles.headerTop} />
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
        <View style={styles.headerTop} />
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
          </View>
        }
      />

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
    backgroundColor: '#EFE9E1', // Новый цвет фона
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: {
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'white', // Новый цвет поисковой строки
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000', // Черный цвет текста
    fontFamily: 'Banshrift', // Новый шрифт
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'Banshrift', // Новый шрифт
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
    color: 'white', // Новый цвет
    flex: 1,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  placesCount: {
    fontSize: 14,
    color: 'white', // Черный цвет
    fontFamily: 'Banshrift', // Новый шрифт
  },
  placesList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  placeCard: {
    width: 280,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  photosContainer: {
    height: 160,
    position: 'relative',
  },
  photoScrollContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  // Стили для индикатора просмотренного места
  viewedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(114, 56, 61, 0.9)', // Новый цвет
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  viewedBadgeText: {
    fontSize: 12,
    color: 'white',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  photoNavButtonLeft: {
    position: 'absolute',
    left: 5,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  photoNavButtonRight: {
    position: 'absolute',
    right: 5,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  photoNavText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  photoIndicators: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  photoIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 2,
  },
  photoIndicatorActive: {
    backgroundColor: 'white',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photoPlaceholderText: {
    fontSize: 32,
    color: 'white',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  placeInfo: {
    padding: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#72383D', // Новый цвет
    marginBottom: 6,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  placeDescription: {
    fontSize: 14,
    color: '#000000', // Черный цвет
    marginBottom: 8,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    fontSize: 14,
    color: '#ffa500',
    fontWeight: '600',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  categoryBadge: {
    backgroundColor: '#72383D', // Новый цвет
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  address: {
    fontSize: 12,
    color: '#000000', // Черный цвет
    fontFamily: 'Banshrift', // Новый шрифт
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#72383D', // Новый цвет
    marginBottom: 8,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  errorDescription: {
    fontSize: 14,
    color: '#000000', // Черный цвет
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  retryButton: {
    backgroundColor: '#72383D', // Новый цвет
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#000000', // Черный цвет
    textAlign: 'center',
    fontFamily: 'Banshrift', // Новый шрифт
  },
});