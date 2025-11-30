import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Modal, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import NavigationMenu from './components/NavigationMenu';
import { pb } from './utilis/pb';
import { useAuth } from './_layout';

const { width: screenWidth } = Dimensions.get('window');

export default function DescriptionPlace() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [currentFavorite, setCurrentFavorite] = useState<any>(null);
  const [place, setPlace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Текущий статус авторизации на странице места:', { 
      isValid: !!user, 
      user 
    });
    
    loadPlace();
    if (user) {
      console.log('Проверяем избранное для пользователя:', user.id);
      checkIfFavorite();
    } else {
      console.log('Пользователь не авторизован, избранное не проверяем');
      setCurrentFavorite(null);
    }
  }, [params.id, user]);

  const loadPlace = async () => {
    try {
      const record = await pb.collection('places').getOne(params.id as string, {
        expand: 'category'
      });
      setPlace(record);
    } catch (error) {
      console.error('Ошибка загрузки места:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    try {
      if (!user) {
        setCurrentFavorite(null);
        return;
      }

      const favorites = await pb.collection('favorites').getList(1, 1, {
        filter: `user = "${user.id}" && place = "${params.id}"`
      });
      
      if (favorites.items.length > 0) {
        setCurrentFavorite(favorites.items[0]);
        console.log('Найдено избранное:', favorites.items[0]);
      } else {
        setCurrentFavorite(null);
        console.log('Избранное не найдено');
      }
    } catch (error: any) {
      console.error('Ошибка проверки избранного:', error);
      setCurrentFavorite(null);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const toggleFavoriteModal = () => {
    if (!user) {
      Alert.alert(
        'Требуется авторизация',
        'Войдите в аккаунт, чтобы добавлять места в избранное',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Войти', onPress: () => router.push('/auth') }
        ]
      );
      return;
    }
    setShowFavoriteModal(!showFavoriteModal);
  };

  const addToFavorites = async (status: string) => {
    try {
      if (!user) {
        Alert.alert('Ошибка', 'Пользователь не авторизован');
        return;
      }

      if (currentFavorite) {
        await pb.collection('favorites').update(currentFavorite.id, {
          status: status
        });
        console.log('Избранное обновлено');
      } else {
        await pb.collection('favorites').create({
          user: user.id,
          place: params.id,
          status: status
        });
        console.log('Добавлено в избранное');
      }

      // Обновляем состояние после успешного добавления
      await checkIfFavorite();
      setShowFavoriteModal(false);
      
      // Показываем уведомление об успехе
      Alert.alert('Успех', 'Место добавлено в избранное!');
      
    } catch (error: any) {
      console.error('Ошибка добавления в избранное:', error);
      Alert.alert('Ошибка', 'Не удалось добавить в избранное');
    }
  };

  const removeFromFavorites = async () => {
    try {
      if (!user) {
        Alert.alert('Ошибка', 'Пользователь не авторизован');
        return;
      }

      if (currentFavorite) {
        await pb.collection('favorites').delete(currentFavorite.id);
        setCurrentFavorite(null);
        console.log('Удалено из избранного');
        Alert.alert('Успех', 'Место удалено из избранного!');
      }
      setShowFavoriteModal(false);
    } catch (error: any) {
      console.error('Ошибка удаления из избранного:', error);
      Alert.alert('Ошибка', 'Не удалось удалить из избранного');
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'visited': return 'Посещал(а)';
      case 'want_to_visit': return 'Хочу посетить';
      case 'favorite': return 'Любимое место';
      default: return 'В избранном';
    }
  };

  const nextPhoto = () => {
    if (place?.photos) {
      setActivePhotoIndex((prev) => 
        prev === place.photos.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevPhoto = () => {
    if (place?.photos) {
      setActivePhotoIndex((prev) => 
        prev === 0 ? place.photos.length - 1 : prev - 1
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.favoriteButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>Загрузка места...</Text>
        </View>
        <NavigationMenu />
      </View>
    );
  }

  if (!place) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.favoriteButton} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>Место не найдено</Text>
        </View>
        <NavigationMenu />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavoriteModal}>
          <Text style={styles.favoriteButtonText}>
            {currentFavorite ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.photosSection}>
          {place.photos && place.photos.length > 0 ? (
            <>
              <TouchableOpacity style={styles.photoNavButtonLeft} onPress={prevPhoto}>
                <Text style={styles.photoNavText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoNavButtonRight} onPress={nextPhoto}>
                <Text style={styles.photoNavText}>›</Text>
              </TouchableOpacity>
              <Image 
                source={{ uri: pb.files.getURL(place, place.photos[activePhotoIndex]) }}
                style={styles.mainPhoto}
                resizeMode="cover"
              />
              <View style={styles.photoIndicators}>
                {place.photos.map((_: any, index: number) => (
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
          ) : (
            <>
              <View style={styles.mainPhoto}>
                <Text style={styles.photoPlaceholder}>🏛️</Text>
              </View>
              <View style={styles.photoIndicators}>
                <View style={[styles.photoIndicator, styles.photoIndicatorActive]} />
              </View>
            </>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.placeName}>{place.name}</Text>
          
          <View style={styles.ratingCategory}>
            <View style={styles.rating}>
              <Text style={styles.ratingText}>⭐ {place.external_rating || 'Нет оценок'}</Text>
            </View>
            <View style={styles.category}>
              <Text style={styles.categoryText}>{place.expand?.category?.name || 'Другие места'}</Text>
            </View>
          </View>

          {currentFavorite && (
            <View style={styles.favoriteStatus}>
              <Text style={styles.favoriteStatusText}>
                {getStatusText(currentFavorite.status)}
              </Text>
            </View>
          )}

          <View style={styles.address}>
            <Text style={styles.addressText}>📍 {place.address}</Text>
          </View>
        </View>

        {place.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Описание</Text>
            <Text style={styles.descriptionText}>{place.description}</Text>
          </View>
        )}

        {place.phone && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Контактный телефон</Text>
            <Text style={styles.contactText}>{place.phone}</Text>
          </View>
        )}

        {place.website && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Веб-сайт</Text>
            <Text style={styles.contactText}>{place.website}</Text>
          </View>
        )}

        {place.price_level && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ценовой уровень</Text>
            <View style={[
              styles.priceBadge,
              place.price_level?.toLowerCase().includes('эконом') && styles.priceBadgeEconomy,
              place.price_level?.toLowerCase().includes('средн') && styles.priceBadgeStandard,
              (place.price_level?.toLowerCase().includes('премиум') || place.price_level?.toLowerCase().includes('высок')) && styles.priceBadgePremium
            ]}>
              <Text style={styles.priceBadgeText}>{place.price_level}</Text>
              <Text style={styles.priceBadgeIcon}>
                {place.price_level?.toLowerCase().includes('эконом') && '💰'}
                {place.price_level?.toLowerCase().includes('средн') && '💵'}
                {(place.price_level?.toLowerCase().includes('премиум') || place.price_level?.toLowerCase().includes('высок')) && '💎'}
              </Text>
            </View>
          </View>
        )}

        {place.working_hours && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Часы работы</Text>
            <Text style={styles.hoursText}>{place.working_hours}</Text>
          </View>
        )}

        <View style={styles.actionsSection}>
          {place.phone && (
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>📞 Позвонить</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>🗺️ Открыть в картах</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Модальное окно выбора статуса */}
      <Modal
        visible={showFavoriteModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {currentFavorite ? 'Изменить статус' : 'Добавить в избранное'}
            </Text>
            
            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => addToFavorites('visited')}
            >
              <Text style={styles.modalOptionEmoji}>✅</Text>
              <Text style={styles.modalOptionText}>Посещал(а)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => addToFavorites('want_to_visit')}
            >
              <Text style={styles.modalOptionEmoji}>📅</Text>
              <Text style={styles.modalOptionText}>Хочу посетить</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={() => addToFavorites('favorite')}
            >
              <Text style={styles.modalOptionEmoji}>❤️</Text>
              <Text style={styles.modalOptionText}>Любимое место</Text>
            </TouchableOpacity>

            {currentFavorite && (
              <TouchableOpacity 
                style={styles.removeOption}
                onPress={removeFromFavorites}
              >
                <Text style={styles.removeOptionText}>🗑️ Удалить из избранного</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={toggleFavoriteModal}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  favoriteButton: {
    padding: 8,
    backgroundColor: '#AC9C8D', // Новый цвет кнопки избранного
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  photosSection: {
    backgroundColor: 'white',
    position: 'relative',
  },
  mainPhoto: {
    width: screenWidth,
    height: 250,
    backgroundColor: '#72383D', // Новый цвет фона
  },
  photoNavButtonLeft: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  photoNavButtonRight: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -20 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  photoNavText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  photoPlaceholder: {
    fontSize: 80,
    color: 'white',
    textAlign: 'center',
    lineHeight: 250,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  photoIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  photoIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  photoIndicatorActive: {
    backgroundColor: '#72383D', // Новый цвет активного индикатора
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  placeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#72383D', // Новый цвет названия
    marginBottom: 12,
    lineHeight: 28,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  ratingCategory: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  rating: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  category: {
    backgroundColor: '#d1ecf1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0c5460',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  favoriteStatus: {
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  favoriteStatusText: {
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  address: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#72383D', // Новый цвет границы
  },
  addressText: {
    fontSize: 14,
    color: '#000000', // Черный цвет текста
    lineHeight: 18,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#72383D', // Новый цвет заголовка
    marginBottom: 12,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000000', // Черный цвет текста
    fontFamily: 'Banshrift', // Новый шрифт
  },
  contactText: {
    fontSize: 16,
    color: '#000000', // Черный цвет текста
    lineHeight: 22,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  hoursText: {
    fontSize: 16,
    color: '#000000', // Черный цвет текста
    lineHeight: 22,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8fd19e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  priceBadgeEconomy: {
    backgroundColor: '#8fd19e',
  },
  priceBadgeStandard: {
    backgroundColor: '#ffd54f',
  },
  priceBadgePremium: {
    backgroundColor: '#ff8a65',
  },
  priceBadgeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  priceBadgeIcon: {
    fontSize: 18,
  },
  actionsSection: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
    marginBottom: 80,
  },
  primaryButton: {
    backgroundColor: '#72383D', // Новый цвет кнопки
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#72383D', // Новый цвет границы
  },
  secondaryButtonText: {
    color: '#72383D', // Новый цвет текста
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Стили для модального окна
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#72383D', // Новый цвет заголовка
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  modalOptionEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000000', // Черный цвет текста
    fontWeight: '500',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  removeOption: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  removeOptionText: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: '500',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  cancelButton: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#000000', // Черный цвет текста
    fontWeight: '500',
    fontFamily: 'Banshrift', // Новый шрифт
  },
});