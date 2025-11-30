import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import NavigationMenu from './components/NavigationMenu';
import { pb } from './utilis/pb';
import { useAuth } from './_layout';

const { width: screenWidth } = Dimensions.get('window');

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFavorites = async () => {
    try {
      console.log('=== ОТЛАДКА ===');
      console.log('ID пользователя из контекста:', user?.id);
      console.log('Email пользователя:', user?.email);
      
      // Получим текущего пользователя из PocketBase чтобы сравнить ID
      if (pb.authStore.model) {
        console.log('ID пользователя из authStore:', pb.authStore.model.id);
        console.log('Email пользователя из authStore:', pb.authStore.model.email);
      }
      
      // Запрос с ID из authStore (более надежно)
      const currentUserId = pb.authStore.model?.id;
      const result = await pb.collection('favorites').getList(1, 50, {
        filter: `user = "${currentUserId}"`
      });
      
      console.log('Найдено избранных записей:', result.items.length);
      console.log('Записи:', result.items);
      
      const favoritesWithPlaces = await Promise.all(
        result.items.map(async (fav) => {
          try {
            const place = await pb.collection('places').getOne(fav.place, {
              expand: 'category'
            });
            return {
              ...fav,
              expand: {
                place: place
              }
            };
          } catch (error) {
            console.error('Ошибка загрузки места:', fav.place, error);
            return fav;
          }
        })
      );
      
      setFavorites(favoritesWithPlaces);
    } catch (error) {
      console.error('Ошибка загрузки избранного:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setIsLoading(false);
      setFavorites([]);
    }
  }, [user]);

  const removeFromFavorites = async (favoriteId: string) => {
    try {
      await pb.collection('favorites').delete(favoriteId);
      // Обновляем список после удаления
      setFavorites(favorites.filter(fav => fav.id !== favoriteId));
      console.log('Удалено из избранного:', favoriteId);
    } catch (error) {
      console.error('Ошибка удаления из избранного:', error);
    }
  };

  const handlePlacePress = (placeId: string) => {
    router.push({
      pathname: '/descriptionplace',
      params: { id: placeId }
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'visited': return 'Посещал(а)';
      case 'want_to_visit': return 'Хочу посетить';
      case 'favorite': return 'Любимое место';
      default: return 'В избранном';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'visited': return '✅';
      case 'want_to_visit': return '📅';
      case 'favorite': return '❤️';
      default: return '⭐';
    }
  };

  const filteredFavorites = favorites.filter(fav => {
    if (activeTab === 'all') return true;
    return fav.status === activeTab;
  });

  const getTabCount = (status: string) => {
    if (status === 'all') return favorites.length;
    return favorites.filter(fav => fav.status === status).length;
  };

  const renderFavoriteItem = ({ item }: { item: any }) => {
    const place = item.expand?.place;
    
    if (!place) {
      console.log('Place не найден для избранного:', item.id);
      return null;
    }

    return (
      <TouchableOpacity 
        style={styles.favoriteItem}
        onPress={() => handlePlacePress(place.id)}
      >
        <View style={styles.itemImage}>
          {place.photos && place.photos.length > 0 ? (
            <Image 
              source={{ uri: pb.files.getURL(place, place.photos[0]) }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.itemImageText}>🏛️</Text>
          )}
        </View>
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {place.name}
          </Text>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {getStatusEmoji(item.status)} {getStatusText(item.status)}
            </Text>
          </View>
          
          <View style={styles.itemDetails}>
            <Text style={styles.itemCategory}>
              {place.expand?.category?.name || 'Другие места'}
            </Text>
            <Text style={styles.itemRating}>
              ⭐ {place.external_rating || 'Нет оценок'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => removeFromFavorites(item.id)}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const tabs = [
    { id: 'all', name: 'Все', emoji: '⭐' },
    { id: 'visited', name: 'Посещал', emoji: '✅' },
    { id: 'want_to_visit', name: 'Хочу посетить', emoji: '📅' },
    { id: 'favorite', name: 'Любимые', emoji: '❤️' },
  ];

  // Если пользователь не авторизован
  if (!user && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header} />
        
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🔐</Text>
          <Text style={styles.emptyStateTitle}>Требуется авторизация</Text>
          <Text style={styles.emptyStateText}>
            Войдите в аккаунт, чтобы просматривать избранные места
          </Text>
          <TouchableOpacity 
            style={styles.authButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.authButtonText}>Войти в аккаунт</Text>
          </TouchableOpacity>
        </View>

        <NavigationMenu />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header} />

      {/* Табы */}
      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.tabTextActive
            ]}>
              {tab.emoji} {tab.name} ({getTabCount(tab.id)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>Загрузка избранных...</Text>
        </View>
      ) : filteredFavorites.length > 0 ? (
        <FlatList
          data={filteredFavorites}
          renderItem={renderFavoriteItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>
            {activeTab === 'visited' ? '✅' : 
             activeTab === 'want_to_visit' ? '📅' : 
             activeTab === 'favorite' ? '❤️' : '⭐'}
          </Text>
          <Text style={styles.emptyStateTitle}>
            {activeTab === 'visited' ? 'Нет посещенных мест' : 
             activeTab === 'want_to_visit' ? 'Нет мест для посещения' : 
             activeTab === 'favorite' ? 'Нет любимых мест' : 'Нет избранных мест'}
          </Text>
          <Text style={styles.emptyStateText}>
            {activeTab === 'visited' ? 'Отмечайте посещенные места в карточке места' : 
             activeTab === 'want_to_visit' ? 'Добавляйте места в список желаний' : 
             activeTab === 'favorite' ? 'Добавляйте места в любимые' : 'Добавляйте места в избранное, чтобы вернуться к ним позже'}
          </Text>
        </View>
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
    backgroundColor: '#72383D', // Новый цвет хедера
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#AC9C8D', // Новый цвет табов
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabActive: {
    backgroundColor: '#72383D', // Новый цвет активного таба
  },
  tabText: {
    fontSize: 12,
    color: '#000000', // Черный цвет текста
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  tabTextActive: {
    color: 'white', // Белый цвет активного текста
    fontFamily: 'Banshrift', // Новый шрифт
  },
  listContent: {
    padding: 16,
  },
  favoriteItem: {
    flexDirection: 'row',
    backgroundColor: 'white', // Белый цвет карточек
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 60,
    height: 60,
    backgroundColor: '#72383D', // Новый цвет фона изображения
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  itemImageText: {
    fontSize: 20,
    color: 'white',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#72383D', // Новый цвет названия
    marginBottom: 4,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  statusContainer: {
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#000000', // Черный цвет текста
    fontWeight: '500',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCategory: {
    fontSize: 14,
    color: '#000000', // Черный цвет текста
    fontFamily: 'Banshrift', // Новый шрифт
  },
  itemRating: {
    fontSize: 14,
    color: '#ffa500',
    fontWeight: '600',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#72383D', // Новый цвет кнопки удаления
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#72383D', // Новый цвет заголовка
    marginBottom: 8,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  emptyStateText: {
    fontSize: 16,
    color: '#000000', // Черный цвет текста
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButton: {
    backgroundColor: '#72383D', // Новый цвет кнопки
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Banshrift', // Новый шрифт
  },
});