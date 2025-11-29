import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import NavigationMenu from './components/NavigationMenu';

const { width: screenWidth } = Dimensions.get('window');

// Мок-данные для категорий и мест
const mockData = [
  {
    id: '1',
    name: 'Культурный и познавательный досуг',
    count: '6 мест',
    places: [
      {
        id: '1',
        name: 'Башкирский государственный театр оперы и балета',
        description: 'Национальный театр Башкортостана',
        address: '450077, Россия, г. Уфа, ул. Ленина, 5/1',
        category: 'Театр',
        rating: 4.8,
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg']
      },
      {
        id: '2', 
        name: 'Башкирский государственный художественный музей',
        description: 'Коллекция башкирского и русского искусства',
        address: '450076, Россия, г. Уфа, ул. Гоголя, 27',
        category: 'Музей',
        rating: 4.6,
        photos: ['photo1.jpg', 'photo2.jpg']
      },
      {
        id: '3',
        name: 'Уфимский планетарий',
        description: 'Астрономические шоу и образовательные программы',
        address: '450077, Россия, г. Уфа, проспект Октября, 79/1',
        category: 'Планетарий',
        rating: 4.7,
        photos: ['photo1.jpg']
      }
    ]
  },
  {
    id: '2',
    name: 'Активный отдых и спорт',
    count: '6 мест', 
    places: [
      {
        id: '4',
        name: 'Спортивно-оздоровительный комплекс «Юность»',
        description: 'Ледовая арена и спортивные залы',
        address: 'Уфа, ул. Набережная реки Белой, 122',
        category: 'Спорткомплекс',
        rating: 4.7,
        photos: ['photo1.jpg', 'photo2.jpg']
      },
      {
        id: '5',
        name: 'Горнолыжный комплекс «Олимпик-парк»',
        description: 'Горнолыжные трассы и сноуборд-парк',
        address: 'Уфа, пос. Нагаево, ул. Горнолыжная, 1',
        category: 'Горнолыжный курорт',
        rating: 4.9,
        photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg']
      }
    ]
  },
  {
    id: '3',
    name: 'Парки и отдых на природе',
    count: '8 мест',
    places: [
      {
        id: '6',
        name: 'Парк культуры и отдыха им. М. Гафури',
        description: 'Центральный парк города Уфы',
        address: '450008, Россия, г. Уфа, ул. Заки Валиди, 37',
        category: 'Парк',
        rating: 4.5,
        photos: ['photo1.jpg']
      },
      {
        id: '7',
        name: 'Ботанический сад Уфы',
        description: 'Экзотические растения и ландшафтный дизайн',
        address: '450077, Россия, г. Уфа, ул. Менделеева, 195',
        category: 'Ботанический сад',
        rating: 4.8,
        photos: ['photo1.jpg', 'photo2.jpg']
      }
    ]
  }
];

// Заглушки для изображений
const getPlaceholderImage = (index: number) => {
  const colors = ['#511515', '#4A1212', '#3A0D0D', '#2A0909'];
  return colors[index % colors.length];
};

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handlePlacePress = (placeId: string) => {
  router.push({
    pathname: '/descriptionplace',
    params: { id: placeId }
  });
};
  const renderPlaceCard = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity 
      style={styles.placeCard}
      onPress={() => handlePlacePress(item.id)}
    >
      {/* Галерея фотографий */}
      <View style={styles.photosContainer}>
        {item.photos && item.photos.length > 0 ? (
          <View style={[styles.photoPlaceholder, { backgroundColor: getPlaceholderImage(index) }]}>
            <Text style={styles.photoPlaceholderText}>📸</Text>
            {item.photos.length > 1 && (
              <View style={styles.photosCountBadge}>
                <Text style={styles.photosCountText}>+{item.photos.length - 1}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: '#e0e0e0' }]}>
            <Text style={styles.photoPlaceholderText}>🏞️</Text>
          </View>
        )}
      </View>

      {/* Информация о месте */}
      <View style={styles.placeInfo}>
        <Text style={styles.placeName} numberOfLines={2}>
          {item.name}
        </Text>
        
        <Text style={styles.placeDescription} numberOfLines={1}>
          {item.description}
        </Text>
        
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {item.rating}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        </View>

        <Text style={styles.address} numberOfLines={2}>
          {item.address}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderCategorySection = ({ item }: { item: any }) => (
    <View style={styles.categorySection}>
      {/* Заголовок категории */}
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.placesCount}>{item.count}</Text>
      </View>

      {/* Горизонтальный скролл мест */}
      <FlatList
        data={item.places}
        renderItem={renderPlaceCard}
        keyExtractor={(place) => place.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.placesList}
        snapToAlignment="start"
        decelerationRate="fast"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Шапка с поиском */}
      <View style={styles.header}>
        <Text style={styles.title}>Поиск мест...</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Введите название места..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.searchButton}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Вертикальный скролл категорий */}
      <FlatList
        data={mockData}
        renderItem={renderCategorySection}
        keyExtractor={(category) => category.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
        snapToAlignment="start"
        decelerationRate="fast"
      />

      {/* Навигационное меню */}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    padding: 8,
  },
  searchButtonText: {
    fontSize: 18,
    color: '#511515',
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontWeight: '500',
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
  photosCountBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  photosCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  placeInfo: {
    padding: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#511515',
    marginBottom: 6,
    lineHeight: 20,
  },
  placeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
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
    lineHeight: 16,
  },
});