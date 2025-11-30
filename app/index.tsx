import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import NavigationMenu from './components/NavigationMenu';
import PocketBase from 'pocketbase';

const { width: screenWidth } = Dimensions.get('window');

const pb = new PocketBase('http://192.168.1.10:8090');

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [allPlaces, setAllPlaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPlaces = async () => {
    try {
      const result = await pb.collection('places').getList(1, 50, {
        expand: 'category'
      });
      console.log('Загружено мест:', result.items.length);
      setAllPlaces(result.items);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    loadPlaces();
  }, []);

  const handlePlacePress = (placeId: string) => {
    router.push({
      pathname: '/descriptionplace',
      params: { id: placeId }
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const renderPlaceCard = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity 
      style={styles.placeCard}
      onPress={() => handlePlacePress(item.id)}
    >
      <View style={styles.photosContainer}>
        {item.photos && item.photos.length > 0 ? (
          <Image 
            source={{ uri: pb.files.getUrl(item, item.photos[0]) }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: '#511515' }]}>
            <Text style={styles.photoPlaceholderText}>📸</Text>
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
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск по названию или адресу..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#511515" />
          <Text style={styles.loadingText}>Загрузка мест...</Text>
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
            placeholderTextColor="#999"
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
      />

      <NavigationMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#511515',
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
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#666',
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
    backgroundColor: 'white',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#511515',
    flex: 1,
  },
  placesCount: {
    fontSize: 14,
    color: '#666',
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
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 32,
    color: 'white',
  },
  placeInfo: {
    padding: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#511515',
    marginBottom: 6,
  },
  placeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
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
  },
  categoryBadge: {
    backgroundColor: '#511515',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
  address: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});