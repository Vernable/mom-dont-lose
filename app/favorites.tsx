import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Image, Share, StyleSheet, Text, TouchableOpacity, View, Switch, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from './_layout';
import NavigationMenu from './components/NavigationMenu';
import { pb } from './utils/pb';

export default function FavoritesScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [favoriteRecordId, setFavoriteRecordId] = useState<string | null>(null);

  const loadUserSettings = async () => {
    if (!user) return;
    try {
      const result = await pb.collection('favorites').getList(1, 1, {
        filter: `user = "${user.id}" && place = null`
      });
      
      if (result.items.length > 0) {
        const favRecord = result.items[0];
        setFavoriteRecordId(favRecord.id);
        const publicStatus = favRecord.is_public === true;
        setIsPublic(publicStatus);
      } else {
        const newRecord = await pb.collection('favorites').create({
          user: user.id,
          is_public: false
        });
        setFavoriteRecordId(newRecord.id);
        setIsPublic(false);
      }
    } catch (error) {
      console.log('Ошибка загрузки настроек:', error);
    }
  };

  const togglePublicStatus = async () => {
    if (!user || isUpdating || !favoriteRecordId) return;
    setIsUpdating(true);
    
    const newStatus = !isPublic;
    
    try {
      const updatedRecord = await pb.collection('favorites').update(favoriteRecordId, {
        is_public: newStatus
      });
      
      setIsPublic(newStatus);
      
      Alert.alert(
        '✅ Настройки обновлены',
        newStatus ? '🌍 Ваш список избранного теперь виден другим' : '🔒 Ваш список избранного теперь приватный'
      );
    } catch (error: any) {
      console.error('❌ Ошибка:', error);
      Alert.alert('❌ Ошибка', error.message || 'Не удалось изменить статус');
    } finally {
      setIsUpdating(false);
    }
  };

  const shareProfile = async () => {
    if (!user) return;
    
    const profileUrl = `https://mom-dont-lose.app/userprofile/${user.id}`;
    const shareMessage = `🗺️ Посмотрите избранные места пользователя ${user.firstname || user.username || 'Мама не теряй'}!\n\n${profileUrl}`;
    
    try {
      await Share.share({
        message: shareMessage,
        url: profileUrl,
        title: `Избранные места ${user.firstname || user.username}`,
      });
    } catch (error) {
      console.error('Ошибка шаринга:', error);
      Alert.alert('Ошибка', 'Не удалось поделиться');
    }
  };

  const loadFavorites = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      
      const result = await pb.collection('favorites').getList(1, 100, {
        filter: `user = "${user.id}" && place != null`,
        expand: 'place'
      });
      
      const favoritesWithPlaces = result.items
        .filter((item: any) => item.place && item.expand?.place)
        .map((item: any) => ({
          ...item,
          expand: {
            place: item.expand?.place
          }
        }));
      
      setFavorites(favoritesWithPlaces);
    } catch (error: any) {
      console.error('Ошибка загрузки избранного:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadFavorites();
      loadUserSettings();
    } else {
      setIsLoading(false);
      setFavorites([]);
    }
  }, [user]);

  const removeFromFavorites = async (favoriteId: string) => {
    Alert.alert('Удалить', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await pb.collection('favorites').delete(favoriteId);
            setFavorites(favorites.filter(fav => fav.id !== favoriteId));
            Alert.alert('Успех', 'Место удалено из избранного');
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось удалить');
          }
        }
      }
    ]);
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

  // Простой рендер для проверки
  const renderFavoriteItem = ({ item, index }: { item: any, index: number }) => {
    const place = item.expand?.place;
    
    if (!place) return null;

    return (
      <TouchableOpacity 
        key={item.id}
        style={styles.favoriteItem}
        onPress={() => handlePlacePress(place.id)}
        activeOpacity={0.7}
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
          <Text style={styles.itemName} numberOfLines={2}>{place.name}</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{getStatusEmoji(item.status)} {getStatusText(item.status)}</Text>
          </View>
          <View style={styles.itemDetails}>
            <Text style={styles.itemCategory}>{place.expand?.category?.name || 'Другие места'}</Text>
            <Text style={styles.itemRating}>⭐ {place.external_rating || 'Нет оценок'}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.removeButton} onPress={() => removeFromFavorites(item.id)}>
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

  if (!user && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>⭐ Избранное</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🔐</Text>
          <Text style={styles.emptyStateTitle}>Требуется авторизация</Text>
          <Text style={styles.emptyStateText}>Войдите в аккаунт, чтобы просматривать избранные места</Text>
          <TouchableOpacity style={styles.authButton} onPress={() => router.push('/auth')}>
            <Text style={styles.authButtonText}>Войти в аккаунт</Text>
          </TouchableOpacity>
        </View>
        <NavigationMenu />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>⭐ Избранное</Text>
          <TouchableOpacity style={styles.shareButton} onPress={shareProfile}>
            <Text style={styles.shareButtonText}>📤 Поделиться</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.privacyCard}>
          <View style={styles.privacyLeft}>
            <View style={styles.privacyIconContainer}>
              <Text style={styles.privacyIcon}>{isPublic ? '🌍' : '🔒'}</Text>
            </View>
            <View style={styles.privacyTextContainer}>
              <Text style={styles.privacyTitle}>{isPublic ? 'Публичный список' : 'Приватный список'}</Text>
              <Text style={styles.privacyDescription}>
                {isPublic ? 'Ваши избранные места видны другим' : 'Только вы видите ваши избранные места'}
              </Text>
            </View>
          </View>
          <Switch
            value={isPublic}
            onValueChange={togglePublicStatus}
            disabled={isUpdating}
            trackColor={{ false: '#D1D5DB', true: '#72383D' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.tabsContainer}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]} onPress={() => setActiveTab(tab.id)}>
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.emoji} {tab.name} ({getTabCount(tab.id)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#72383D" />
          <Text style={styles.loadingText}>Загрузка избранных...</Text>
        </View>
      ) : filteredFavorites.length > 0 ? (
        <FlatList 
          data={filteredFavorites} 
          renderItem={renderFavoriteItem} 
          keyExtractor={(item, index) => item.id || index.toString()} 
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          removeClippedSubviews={false}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>⭐</Text>
          <Text style={styles.emptyStateTitle}>Нет избранных мест</Text>
          <Text style={styles.emptyStateText}>Добавляйте места в избранное, чтобы вернуться к ним позже</Text>
        </ScrollView>
      )}

      <NavigationMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFE9E1' },
  header: { backgroundColor: '#72383D', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#EFE9E1', fontFamily: 'Banshrift' },
  shareButton: { backgroundColor: '#AC9C8D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  shareButtonText: { fontSize: 13, color: '#EFE9E1', fontFamily: 'Banshrift', fontWeight: '600' },
  privacyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#AC9C8D', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  privacyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  privacyIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFE9E1', justifyContent: 'center', alignItems: 'center' },
  privacyIcon: { fontSize: 20 },
  privacyTextContainer: { gap: 2 },
  privacyTitle: { fontSize: 14, fontWeight: 'bold', color: '#72383D', fontFamily: 'Banshrift' },
  privacyDescription: { fontSize: 11, color: '#72383D', fontFamily: 'Banshrift', opacity: 0.8 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#AC9C8D', paddingHorizontal: 16, paddingVertical: 8 },
  tab: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center', borderRadius: 8, marginHorizontal: 2 },
  tabActive: { backgroundColor: '#72383D' },
  tabText: { fontSize: 12, color: '#000000', fontWeight: '500', textAlign: 'center', fontFamily: 'Banshrift' },
  tabTextActive: { color: '#FFFFFF' },
  listContent: { padding: 16, paddingBottom: 100 },
  favoriteItem: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 12, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3,
    minHeight: 90,
  },
  itemImage: { width: 70, height: 70, backgroundColor: '#72383D', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  itemImageText: { fontSize: 28, color: '#FFFFFF', fontFamily: 'Banshrift' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#72383D', marginBottom: 4, fontFamily: 'Banshrift' },
  statusContainer: { marginBottom: 4 },
  statusText: { fontSize: 12, color: '#666666', fontWeight: '500', fontFamily: 'Banshrift' },
  itemDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCategory: { fontSize: 12, color: '#888888', fontFamily: 'Banshrift' },
  itemRating: { fontSize: 12, color: '#FBB040', fontWeight: '600', fontFamily: 'Banshrift' },
  removeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#72383D', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  removeButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', fontFamily: 'Banshrift' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyStateEmoji: { fontSize: 64, marginBottom: 16 },
  emptyStateTitle: { fontSize: 20, fontWeight: 'bold', color: '#72383D', marginBottom: 8, fontFamily: 'Banshrift', textAlign: 'center' },
  emptyStateText: { fontSize: 14, color: '#666666', textAlign: 'center', lineHeight: 20, fontFamily: 'Banshrift' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#72383D', fontFamily: 'Banshrift' },
  authButton: { backgroundColor: '#72383D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  authButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', fontFamily: 'Banshrift' },
});