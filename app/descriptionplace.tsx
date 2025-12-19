import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from './_layout';
import NavigationMenu from './components/NavigationMenu';
import { openInYandexMaps, openWithCoordinates } from './utils/maps';
import { pb } from './utils/pb';
import { fetchYandexRating } from './utils/yandexService';

const { width: screenWidth } = Dimensions.get('window');

export default function DescriptionPlace() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // Состояния для фотографий
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  
  // Состояния для избранного
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [currentFavorite, setCurrentFavorite] = useState<any>(null);
  
  // Состояния для данных места
  const [place, setPlace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Состояния для Яндекс рейтинга
  const [yandexRating, setYandexRating] = useState<{rating: number, reviews: number} | null>(null);
  const [isLoadingRating, setIsLoadingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  
  // Состояния для информации о ценах
  const [showPriceInfoModal, setShowPriceInfoModal] = useState(false);

  // Загрузка рейтинга из Яндекс
  const loadYandexRating = useCallback(async (yandexMapId: string) => {
    if (!yandexMapId) {
      console.log('⚠️ Нет yandex_map_id для загрузки рейтинга');
      setYandexRating(null);
      setRatingError('Нет ID Яндекс карт');
      return;
    }
    
    console.log('🎯 Запуск loadYandexRating для ID:', yandexMapId);
    setIsLoadingRating(true);
    setRatingError(null);
    
    try {
      const ratingData = await fetchYandexRating(yandexMapId);
      console.log('📊 Результат fetchYandexRating:', ratingData);
      
      setYandexRating(ratingData);
      
      if (ratingData) {
        console.log('✅ Рейтинг получен успешно');
        
        // Обновляем в PocketBase (опционально)
        try {
          await pb.collection('places').update(params.id as string, {
            external_rating: ratingData.rating.toFixed(1)
          });
          console.log('💾 Рейтинг сохранен в БД');
        } catch (updateError) {
          console.log('⚠️ Не удалось сохранить в БД:', updateError);
        }
      } else {
        console.log('❌ Рейтинг не найден');
        setRatingError('Рейтинг не найден в Яндекс Картах');
      }
      
    } catch (error: any) {
      console.error('🔥 Ошибка загрузки рейтинга:', error);
      setRatingError(error.message || 'Ошибка загрузки');
    } finally {
      setIsLoadingRating(false);
    }
  }, [params.id]);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadPlace();
  }, [params.id, user]);

  // Обновление рейтинга по интервалу
  useEffect(() => {
    if (!place?.yandex_map_id) return;
    
    const interval = setInterval(() => {
      loadYandexRating(place.yandex_map_id);
    }, 5 * 60 * 1000); // Каждые 5 минут
    
    return () => clearInterval(interval);
  }, [place?.yandex_map_id]);

  // Загрузка данных места
  const loadPlace = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      console.log('Загрузка места с ID:', params.id);
      
      // Загружаем место из PocketBase
      const record = await pb.collection('places').getOne(params.id as string, {
        expand: 'category'
      });
      setPlace(record);
      
      // Загружаем Яндекс рейтинг, если есть ID
      if (record.yandex_map_id) {
        await loadYandexRating(record.yandex_map_id);
      } else {
        console.log('У места нет yandex_map_id, пропускаем загрузку рейтинга');
      }
      
      // Проверяем избранное для пользователя
      if (user) {
        await checkIfFavorite();
      }
      
      console.log('Данные места загружены:', {
        name: record.name,
        yandex_map_id: record.yandex_map_id,
        external_rating: record.external_rating
      });
      
    } catch (error: any) {
      console.error('Ошибка загрузки места:', error);
      setLoadError(error.message || 'Не удалось загрузить информацию о месте');
      Alert.alert('Ошибка', 'Не удалось загрузить информацию о месте');
    } finally {
      setIsLoading(false);
    }
  };

  // Проверка избранного
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
      } else {
        setCurrentFavorite(null);
      }
    } catch (error: any) {
      console.error('Ошибка проверки избранного:', error);
      setCurrentFavorite(null);
    }
  };

  // Навигация назад
  const handleBack = () => {
    router.back();
  };

  // Модальное окно избранного
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

  // Добавление в избранное
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
      } else {
        await pb.collection('favorites').create({
          user: user.id,
          place: params.id,
          status: status
        });
      }

      await checkIfFavorite();
      setShowFavoriteModal(false);
      Alert.alert('Успех', 'Место добавлено в избранное!');
      
    } catch (error: any) {
      console.error('Ошибка добавления в избранное:', error);
      Alert.alert('Ошибка', 'Не удалось добавить в избранное');
    }
  };

  // Удаление из избранного
  const removeFromFavorites = async () => {
    try {
      if (!user) {
        Alert.alert('Ошибка', 'Пользователь не авторизован');
        return;
      }

      if (currentFavorite) {
        await pb.collection('favorites').delete(currentFavorite.id);
        setCurrentFavorite(null);
        Alert.alert('Успех', 'Место удалено из избранного!');
      }
      setShowFavoriteModal(false);
    } catch (error: any) {
      console.error('Ошибка удаления из избранного:', error);
      Alert.alert('Ошибка', 'Не удалось удалить из избранного');
    }
  };

  // Текст статуса избранного
  const getStatusText = (status: string) => {
    switch (status) {
      case 'visited': return 'Посещал(а)';
      case 'want_to_visit': return 'Хочу посетить';
      case 'favorite': return 'Любимое место';
      default: return 'В избранном';
    }
  };

  // Навигация по фото
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

  // Звонок
  const handleCall = () => {
    if (!place?.phone) return;
    
    const phoneNumber = place.phone.replace(/[\s\-()]/g, '');
    
    Alert.alert(
      'Позвонить',
      `Вы хотите позвонить по номеру:\n${place.phone}`,
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Позвонить',
          onPress: () => {
            Linking.openURL(`tel:${phoneNumber}`);
          },
        },
      ]
    );
  };

  // Открытие карты
  const handleOpenMap = () => {
    if (!place) return;
    
    if (place.coordinates && place.coordinates.lat && place.coordinates.lon) {
      openWithCoordinates(place.coordinates.lat, place.coordinates.lon);
    } else if (place.address) {
      openInYandexMaps(place.address);
    } else {
      Alert.alert('Ошибка', 'Адрес не указан');
    }
  };

  // Открытие сайта
  const handleOpenWebsite = () => {
    if (!place?.website) return;
    
    let url = place.website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    Alert.alert(
      'Открыть сайт',
      `Перейти на сайт:\n${place.website}`,
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Открыть',
          onPress: () => {
            Linking.openURL(url).catch(err => {
              console.error('Ошибка открытия сайта:', err);
              Alert.alert('Ошибка', 'Не удалось открыть сайт');
            });
          },
        },
      ]
    );
  };

  // Информация о ценовом уровне
  const getPriceLevelInfo = (priceLevel: string) => {
    if (!priceLevel) {
      return {
        emoji: '🏷️',
        title: 'Не указано',
        description: 'Ценовая категория не указана'
      };
    }

    return {
      emoji: '💰',
      title: priceLevel,
      description: `Ценовая категория: ${priceLevel}\n\nУказана администрацией заведения`
    };
  };

  // Рендеринг информации о ценах
  const renderPriceInfo = () => {
    if (!place?.price_level) {
      return (
        <View style={styles.priceSection}>
          <Text style={styles.sectionTitle}>Цены</Text>
          <View style={styles.priceNotAvailable}>
            <Text style={styles.priceNotAvailableText}>Информация о ценах не указана</Text>
          </View>
        </View>
      );
    }

    const priceInfo = getPriceLevelInfo(place.price_level);
    
    return (
      <View style={styles.priceSection}>
        <Text style={styles.sectionTitle}>Цены</Text>
        <TouchableOpacity 
          style={styles.priceSticker}
          onPress={() => setShowPriceInfoModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.priceStickerEmoji}>{priceInfo.emoji}</Text>
          <View style={styles.priceStickerTextContainer}>
            <Text style={styles.priceStickerTitle}>Ценовая категория</Text>
            <Text style={styles.priceStickerValue}>{place.price_level}</Text>
            <Text style={styles.priceStickerSubtitle}>Нажмите для подробностей</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Рендеринг рейтинга
  const renderRating = () => {
    console.log('📊 Рендер рейтинга:', {
      isLoadingRating,
      yandexRating,
      placeExternalRating: place?.external_rating,
      ratingError
    });

    if (isLoadingRating) {
      return (
        <View style={styles.rating}>
          <ActivityIndicator size="small" color="#856404" />
          <Text style={styles.ratingText}>Загрузка оценки...</Text>
        </View>
      );
    }

    if (yandexRating) {
      return (
        <View style={styles.rating}>
          <View style={styles.yandexRatingContainer}>
            <Text style={styles.ratingText}>
              ⭐ {yandexRating.rating.toFixed(1)}
              <Text style={styles.ratingSource}> (Яндекс Карты)</Text>
            </Text>
            {yandexRating.reviews > 0 && (
              <Text style={styles.reviewsCount}>{yandexRating.reviews} отзывов</Text>
            )}
          </View>
        </View>
      );
    }

    if (place.external_rating) {
      return (
        <View style={styles.rating}>
          <Text style={styles.ratingText}>⭐ {place.external_rating}</Text>
          <Text style={styles.ratingSource}> (Сохраненная оценка)</Text>
        </View>
      );
    }

    // Нет рейтинга
    return (
      <View style={[styles.rating, styles.noRating]}>
        <Text style={styles.ratingText}>⭐ Нет оценок</Text>
        {place.yandex_map_id && ratingError && (
          <Text style={styles.ratingErrorText}>{ratingError}</Text>
        )}
        {place.yandex_map_id && (
          <TouchableOpacity 
            style={styles.refreshRatingButton}
            onPress={() => place.yandex_map_id && loadYandexRating(place.yandex_map_id)}
          >
            <Text style={styles.refreshRatingText}>Обновить</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Повторная загрузка
  const handleRetry = () => {
    loadPlace();
  };

  // Загрузка
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
          <ActivityIndicator size="large" color="#72383D" />
          <Text style={styles.loadingText}>Загрузка места...</Text>
        </View>
        <NavigationMenu />
      </View>
    );
  }

  // Ошибка загрузки
  if (loadError && !place) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.favoriteButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ошибка загрузки</Text>
          <Text style={styles.errorDescription}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Повторить попытку</Text>
          </TouchableOpacity>
        </View>
        <NavigationMenu />
      </View>
    );
  }

  // Место не найдено
  if (!place) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.favoriteButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Место не найдено</Text>
          <Text style={styles.errorDescription}>Запрашиваемое место не существует или было удалено</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
            <Text style={styles.retryButtonText}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
        <NavigationMenu />
      </View>
    );
  }

  const priceInfo = getPriceLevelInfo(place.price_level);

  return (
    <View style={styles.container}>
      {/* Шапка */}
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

      {/* Основной контент */}
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Фотосекция */}
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

        {/* Информационная секция */}
        <View style={styles.infoSection}>
          <Text style={styles.placeName}>{place.name}</Text>
          
          {/* Рейтинг и категория */}
          <View style={styles.ratingCategory}>
            {renderRating()}
            
            <View style={styles.category}>
              <Text style={styles.categoryText}>{place.expand?.category?.name || 'Другие места'}</Text>
            </View>
          </View>

          {/* Статус избранного */}
          {currentFavorite && (
            <View style={styles.favoriteStatus}>
              <Text style={styles.favoriteStatusText}>
                {getStatusText(currentFavorite.status)}
              </Text>
            </View>
          )}

          {/* Адрес */}
          <View style={styles.address}>
            <Text style={styles.addressText}>📍 {place.address}</Text>
          </View>

          {/* Кнопки действий */}
          <View style={styles.actionButtons}>
            {place.phone && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleCall}
              >
                <Text style={styles.actionButtonIcon}>📞</Text>
                <Text style={styles.actionButtonText}>Позвонить</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleOpenMap}
            >
              <Text style={styles.actionButtonIcon}>🗺️</Text>
              <Text style={styles.actionButtonText}>Открыть в картах</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Описание */}
        {place.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Описание</Text>
            <Text style={styles.descriptionText}>{place.description}</Text>
          </View>
        )}

        {/* Цены */}
        {renderPriceInfo()}

        {/* Веб-сайт */}
        {place.website && (
          <TouchableOpacity 
            style={styles.websiteSection}
            onPress={handleOpenWebsite}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>Веб-сайт</Text>
            <View style={styles.websiteContainer}>
              <Text style={styles.websiteIcon}>🌐</Text>
              <Text style={styles.websiteText}>{place.website}</Text>
              <Text style={styles.websiteHint}>Нажмите, чтобы открыть</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Часы работы */}
        {place.working_hours && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Часы работы</Text>
            <Text style={styles.hoursText}>{place.working_hours}</Text>
          </View>
        )}

        {/* Отступ для навигационного меню */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Модальное окно избранного */}
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

      {/* Модальное окно информации о ценах */}
      <Modal
        visible={showPriceInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPriceInfoModal(false)}
      >
        <View style={styles.priceModalOverlay}>
          <View style={styles.priceModalContent}>
            <Text style={styles.priceModalEmoji}>{priceInfo.emoji}</Text>
            <Text style={styles.priceModalTitle}>{priceInfo.title}</Text>
            <Text style={styles.priceModalDescription}>{priceInfo.description}</Text>
            <TouchableOpacity 
              style={styles.priceModalCloseButton}
              onPress={() => setShowPriceInfoModal(false)}
            >
              <Text style={styles.priceModalCloseButtonText}>Понятно</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <NavigationMenu />
    </View>
  );
}

// СТИЛИ
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFE9E1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#72383D',
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
    fontFamily: 'Banshrift',
  },
  favoriteButton: {
    padding: 8,
    backgroundColor: '#AC9C8D',
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
  scrollContent: {
    paddingBottom: 100,
  },
  photosSection: {
    backgroundColor: 'white',
    position: 'relative',
  },
  mainPhoto: {
    width: screenWidth,
    height: 250,
    backgroundColor: '#72383D',
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
    fontFamily: 'Banshrift',
  },
  photoPlaceholder: {
    fontSize: 80,
    color: 'white',
    textAlign: 'center',
    lineHeight: 250,
    fontFamily: 'Banshrift',
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
    backgroundColor: '#72383D',
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
    color: '#72383D',
    marginBottom: 12,
    lineHeight: 28,
    fontFamily: 'Banshrift',
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    fontFamily: 'Banshrift',
  },
  noRating: {
    flexWrap: 'wrap',
  },
  ratingErrorText: {
    fontSize: 10,
    color: '#d32f2f',
    marginTop: 2,
    fontFamily: 'Banshrift',
  },
  yandexRatingContainer: {
    alignItems: 'flex-start',
  },
  ratingSource: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'normal',
    fontFamily: 'Banshrift',
  },
  reviewsCount: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    fontFamily: 'Banshrift',
  },
  refreshRatingButton: {
    backgroundColor: '#72383D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  refreshRatingText: {
    fontSize: 10,
    color: 'white',
    fontFamily: 'Banshrift',
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
    fontFamily: 'Banshrift',
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
    fontFamily: 'Banshrift',
  },
  address: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#72383D',
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 18,
    fontFamily: 'Banshrift',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#AC9C8D',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Banshrift',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
  },
  priceSection: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#72383D',
    marginBottom: 12,
    fontFamily: 'Banshrift',
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#000000',
    fontFamily: 'Banshrift',
  },
  hoursText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 22,
    fontFamily: 'Banshrift',
  },
  priceSticker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  priceStickerEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  priceStickerTextContainer: {
    flex: 1,
  },
  priceStickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#72383D',
    marginBottom: 2,
    fontFamily: 'Banshrift',
  },
  priceStickerValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
    fontFamily: 'Banshrift',
  },
  priceStickerSubtitle: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Banshrift',
  },
  priceNotAvailable: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  priceNotAvailableText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Banshrift',
    textAlign: 'center',
  },
  websiteSection: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
  },
  websiteContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  websiteIcon: {
    fontSize: 32,
    marginBottom: 8,
    textAlign: 'center',
  },
  websiteText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'Banshrift',
  },
  websiteHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Banshrift',
  },
  bottomSpacer: {
    height: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#72383D',
    fontFamily: 'Banshrift',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#72383D',
    marginBottom: 8,
    fontFamily: 'Banshrift',
  },
  errorDescription: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Banshrift',
  },
  retryButton: {
    backgroundColor: '#72383D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
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
    color: '#72383D',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Banshrift',
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
    color: '#000000',
    fontWeight: '500',
    fontFamily: 'Banshrift',
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
    fontFamily: 'Banshrift',
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
    color: '#000000',
    fontWeight: '500',
    fontFamily: 'Banshrift',
  },
  priceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  priceModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  priceModalEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  priceModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#72383D',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Banshrift',
  },
  priceModalDescription: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    fontFamily: 'Banshrift',
  },
  priceModalCloseButton: {
    backgroundColor: '#AC9C8D',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  priceModalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Banshrift',
  },
});