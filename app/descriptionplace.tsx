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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from './_layout';
import NavigationMenu from './components/NavigationMenu';
import { openInYandexMaps, openWithCoordinates } from './utils/maps';
import { pb } from './utils/pb';
import { fetchYandexRating } from './utils/yandexService';
import * as ImagePicker from 'expo-image-picker';

const { width: screenWidth } = Dimensions.get('window');

interface ReviewType {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  user: string;
  place: string;
  rating: number;
  comment: string;
  photos?: string[];
  likes?: number;
  dislikes?: number;
  liked_by?: string[];
  disliked_by?: string[];
  parent_id?: string;
  reply_to_user_name?: string;
  datecreate?: string;
  userName?: string;
  userAvatar?: string | null;
  hasUserLiked?: boolean;
  hasUserDisliked?: boolean;
  replies?: ReviewType[];
}

const AppRatingStars = ({ rating, size = 36 }: { rating: number; size?: number }) => {
  const rounded = Math.round(rating);
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          style={{
            fontSize: size,
            color: star <= rounded ? '#FFB300' : '#E0E0E0',
            fontFamily: 'Banshrift',
            textShadowColor: star <= rounded ? 'rgba(0,0,0,0.1)' : 'transparent',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 1,
          }}
        >
          ★
        </Text>
      ))}
    </View>
  );
};

const StarRating = ({ rating, onRatingChange, size = 20, interactive = true }: any) => {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => interactive && onRatingChange?.(star)}
          disabled={!interactive}
          style={{ 
            backgroundColor: 'transparent',
            padding: 2,
          }}
        >
          <Text 
            style={{ 
              fontSize: size, 
              color: star <= rating ? '#FFB300' : '#D1D5DB',
              fontWeight: star <= rating ? 'bold' : 'normal',
              textShadowColor: star <= rating ? 'rgba(0,0,0,0.1)' : 'transparent',
              textShadowOffset: { width: 0.5, height: 0.5 },
              textShadowRadius: 1,
            }}
          >
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const getDeclension = (count: number, one: string, few: string, many: string) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

export default function DescriptionPlace() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [currentFavorite, setCurrentFavorite] = useState<any>(null);
  const [place, setPlace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [yandexRating, setYandexRating] = useState<{ rating: number; reviews: number } | null>(null);
  const [isLoadingRating, setIsLoadingRating] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [showPriceInfoModal, setShowPriceInfoModal] = useState(false);

  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [reviewsVisible, setReviewsVisible] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewPhotos, setNewReviewPhotos] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [likingReviewId, setLikingReviewId] = useState<string | null>(null);

  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyingToReview, setReplyingToReview] = useState<ReviewType | null>(null);
  const [replyText, setReplyText] = useState('');

  const getTotalCommentsCount = (reviewsList: ReviewType[]): number => {
    let count = reviewsList.length;
    reviewsList.forEach(review => {
      if (review.replies && review.replies.length > 0) {
        count += review.replies.length;
      }
    });
    return count;
  };

  const avgUserRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  // Функция для перехода в профиль пользователя
  const handleUserPress = (userId: string) => {
    if (!userId) return;
    console.log('👤 Нажатие на пользователя:', userId);
    if (user && userId === user.id) {
      router.push('/profile');
    } else {
      router.push(`/userprofile?id=${userId}`);
    }
  };

  // Функция создания уведомления
  const createNotification = async (toUserId: string, fromUserId: string, type: string, reviewId?: string, commentId?: string) => {
    console.log('🔔🔔🔔 createNotification ВЫЗВАНА! 🔔🔔🔔');
    console.log('   toUserId:', toUserId);
    console.log('   fromUserId:', fromUserId);
    console.log('   type:', type);
    console.log('   reviewId:', reviewId);
    console.log('   commentId:', commentId);
    
    if (toUserId === fromUserId) {
      console.log('⚠️ Уведомление самому себе - пропускаем');
      return;
    }
    
    if (!toUserId || !fromUserId) {
      console.log('❌ Ошибка: toUserId или fromUserId пустые');
      return;
    }
    
    try {
      const notificationData = {
        user: toUserId,
        from_user: fromUserId,
        type: type,
        review_id: reviewId || '',
        comment_id: commentId || '',
        is_read: false,
      };
      console.log('📤 Отправляем в PocketBase:', JSON.stringify(notificationData));
      
      const result = await pb.collection('notifications').create(notificationData);
      console.log('✅✅✅ Уведомление УСПЕШНО создано! ID:', result.id);
    } catch (error: any) {
      console.error('❌❌❌ ОШИБКА создания уведомления:', error);
      console.error('Статус ошибки:', error.status);
      console.error('Данные ошибки:', error.data);
    }
  };

  const loadYandexRating = useCallback(async (yandexMapId: string) => {
    if (!yandexMapId) {
      setYandexRating(null);
      setRatingError('Нет ID Яндекс карт');
      return;
    }
    setIsLoadingRating(true);
    setRatingError(null);
    try {
      const ratingData = await fetchYandexRating(yandexMapId);
      setYandexRating(ratingData);
      if (ratingData) {
        try {
          await pb.collection('places').update(params.id as string, {
            external_rating: ratingData.rating.toFixed(1),
          });
        } catch (updateError) {}
      }
    } catch (error: any) {
      setRatingError(error.message || 'Ошибка загрузки');
    } finally {
      setIsLoadingRating(false);
    }
  }, [params.id]);

  const loadReviews = useCallback(async () => {
    if (!params.id) return;
    try {
      const result = await pb.collection('reviews').getList(1, 100);
      const placeReviews = result.items.filter((review) => review.place === params.id);
      
      const reviewsWithUsers = await Promise.all(
        placeReviews.map(async (review) => {
          let userData = null;
          let avatarUrl = null;
          try {
            userData = await pb.collection('users').getOne(review.user);
            if (userData?.avatar) avatarUrl = pb.files.getURL(userData, userData.avatar);
          } catch (err) {}
          return {
            ...review,
            userName: userData?.username || userData?.email || 'Пользователь',
            userAvatar: avatarUrl,
            likes: review.likes || 0,
            dislikes: review.dislikes || 0,
            liked_by: review.liked_by || [],
            disliked_by: review.disliked_by || [],
            hasUserLiked: review.liked_by?.includes(user?.id) || false,
            hasUserDisliked: review.disliked_by?.includes(user?.id) || false,
            replies: [],
            parent_id: review.parent_id || undefined,
          };
        })
      );
      
      const mainReviews = reviewsWithUsers.filter((r: any) => !r.parent_id) as any as ReviewType[];
      const replies = reviewsWithUsers.filter((r: any) => r.parent_id) as any as ReviewType[];
      
      replies.forEach((reply: ReviewType) => {
        const parent = mainReviews.find((p: ReviewType) => p.id === reply.parent_id);
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(reply);
        }
      });
      
      setReviews(mainReviews);
    } catch (error: any) {
      console.error('Ошибка загрузки отзывов:', error);
    }
  }, [params.id, user?.id]);

  const handleLike = async (review: ReviewType) => {
    if (!user) {
      Alert.alert('Авторизация', 'Войдите чтобы оценить отзыв');
      return;
    }
    if (likingReviewId) return;
    setLikingReviewId(review.id);
    try {
      const current = await pb.collection('reviews').getOne(review.id);
      
      let liked_by = current.liked_by || [];
      let disliked_by = current.disliked_by || [];
      let likes = current.likes || 0;
      let dislikes = current.dislikes || 0;
      
      const alreadyLiked = liked_by.includes(user.id);
      const alreadyDisliked = disliked_by.includes(user.id);
      
      let wasLiked = false;
      
      if (alreadyLiked) {
        liked_by = liked_by.filter((id: string) => id !== user.id);
        likes = likes - 1;
      } else {
        liked_by.push(user.id);
        likes = likes + 1;
        wasLiked = true;
        if (alreadyDisliked) {
          disliked_by = disliked_by.filter((id: string) => id !== user.id);
          dislikes = dislikes - 1;
        }
      }
      
      if (likes < 0) likes = 0;
      if (dislikes < 0) dislikes = 0;
      
      await pb.collection('reviews').update(review.id, {
        likes: likes,
        dislikes: dislikes,
        liked_by: liked_by,
        disliked_by: disliked_by
      });
      
      console.log('📊 Лайк обработан, wasLiked =', wasLiked);
      console.log('📊 review.user =', review.user);
      console.log('📊 user.id =', user.id);
      console.log('📊 review.parent_id =', review.parent_id);
      
      if (wasLiked) {
        const notificationType = review.parent_id ? 'like_comment' : 'like_review';
        console.log('🔔 ДОЛЖНЫ отправить уведомление типа:', notificationType);
        await createNotification(
          review.user, 
          user.id, 
          notificationType, 
          review.parent_id ? undefined : review.id, 
          review.parent_id ? review.id : undefined
        );
      } else {
        console.log('⚠️ Лайк был снят, уведомление не отправляем');
      }
      
      setReviews(prevReviews => {
        const updateRecursive = (items: ReviewType[]): ReviewType[] => {
          return items.map(item => {
            if (item.id === review.id) {
              return {
                ...item,
                likes: likes,
                dislikes: dislikes,
                liked_by: liked_by,
                disliked_by: disliked_by,
                hasUserLiked: liked_by.includes(user.id),
                hasUserDisliked: disliked_by.includes(user.id)
              };
            }
            if (item.replies && item.replies.length > 0) {
              return { ...item, replies: updateRecursive(item.replies) };
            }
            return item;
          });
        };
        return updateRecursive(prevReviews);
      });
      
    } catch (error: any) {
      console.error('Ошибка:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось поставить оценку');
    } finally {
      setLikingReviewId(null);
    }
  };

  const handleDislike = async (review: ReviewType) => {
    if (!user) {
      Alert.alert('Авторизация', 'Войдите чтобы оценить отзыв');
      return;
    }
    if (likingReviewId) return;
    setLikingReviewId(review.id);
    try {
      const current = await pb.collection('reviews').getOne(review.id);
      
      let liked_by = current.liked_by || [];
      let disliked_by = current.disliked_by || [];
      let likes = current.likes || 0;
      let dislikes = current.dislikes || 0;
      
      const alreadyLiked = liked_by.includes(user.id);
      const alreadyDisliked = disliked_by.includes(user.id);
      
      if (alreadyDisliked) {
        disliked_by = disliked_by.filter((id: string) => id !== user.id);
        dislikes = dislikes - 1;
      } else {
        disliked_by.push(user.id);
        dislikes = dislikes + 1;
        if (alreadyLiked) {
          liked_by = liked_by.filter((id: string) => id !== user.id);
          likes = likes - 1;
        }
      }
      
      if (likes < 0) likes = 0;
      if (dislikes < 0) dislikes = 0;
      
      await pb.collection('reviews').update(review.id, {
        likes: likes,
        dislikes: dislikes,
        liked_by: liked_by,
        disliked_by: disliked_by
      });
      
      setReviews(prevReviews => {
        const updateRecursive = (items: ReviewType[]): ReviewType[] => {
          return items.map(item => {
            if (item.id === review.id) {
              return {
                ...item,
                likes: likes,
                dislikes: dislikes,
                liked_by: liked_by,
                disliked_by: disliked_by,
                hasUserLiked: liked_by.includes(user.id),
                hasUserDisliked: disliked_by.includes(user.id)
              };
            }
            if (item.replies && item.replies.length > 0) {
              return { ...item, replies: updateRecursive(item.replies) };
            }
            return item;
          });
        };
        return updateRecursive(prevReviews);
      });
      
    } catch (error: any) {
      console.error('Ошибка:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось поставить оценку');
    } finally {
      setLikingReviewId(null);
    }
  };

  const submitReply = async () => {
    if (!user) {
      Alert.alert('Авторизация', 'Войдите чтобы ответить');
      return;
    }
    if (!replyText.trim()) {
      Alert.alert('Ошибка', 'Введите текст ответа');
      return;
    }
    try {
      const newReply = await pb.collection('reviews').create({
        user: user.id,
        place: params.id,
        comment: replyText,
        rating: 0,
        parent_id: replyingToReview?.id,
        reply_to_user_name: replyingToReview?.userName,
      });
      
      console.log('📝 Ответ создан, replyingToReview =', replyingToReview);
      
      if (replyingToReview) {
        console.log('🔔 ДОЛЖНЫ отправить уведомление об ответе');
        console.log('📤 Кому:', replyingToReview.user, 'От кого:', user.id);
        await createNotification(replyingToReview.user, user.id, 'reply_review', replyingToReview.id, undefined);
      } else {
        console.log('⚠️ replyingToReview = null, уведомление не отправляем');
      }
      
      Alert.alert('Успех', 'Ответ добавлен');
      setReplyModalVisible(false);
      setReplyText('');
      setReplyingToReview(null);
      await loadReviews();
    } catch (error: any) {
      console.error('Ошибка при ответе:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось отправить ответ');
    }
  };

  const pickReviewPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Нужно разрешение на доступ к фото');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setNewReviewPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeReviewPhoto = (index: number) => {
    setNewReviewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const submitReview = async () => {
    if (!user) {
      Alert.alert('Ошибка', 'Войдите чтобы оставить отзыв');
      return;
    }
    if (!newReviewComment.trim()) {
      Alert.alert('Ошибка', 'Напишите текст отзыва');
      return;
    }
    setIsSubmittingReview(true);
    try {
      if (editingReview) {
        await pb.collection('reviews').update(editingReview.id, {
          rating: newReviewRating,
          comment: newReviewComment,
        });
        Alert.alert('Успех', 'Отзыв обновлен');
      } else {
        await pb.collection('reviews').create({
          user: user.id,
          place: params.id,
          rating: newReviewRating,
          comment: newReviewComment,
          likes: 0,
          dislikes: 0,
          liked_by: [],
          disliked_by: [],
        });
        Alert.alert('Успех', 'Отзыв добавлен');
      }
      await loadReviews();
      resetReviewModal();
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось сохранить отзыв');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const resetReviewModal = () => {
    setShowReviewModal(false);
    setEditingReview(null);
    setNewReviewRating(5);
    setNewReviewComment('');
    setNewReviewPhotos([]);
  };

  const editReview = (review: ReviewType) => {
    setEditingReview(review);
    setNewReviewRating(review.rating);
    setNewReviewComment(review.comment);
    setShowReviewModal(true);
  };

  const deleteReview = async (reviewId: string) => {
    Alert.alert('Удаление', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await pb.collection('reviews').delete(reviewId);
            await loadReviews();
            Alert.alert('Успех', 'Отзыв удален');
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось удалить отзыв');
          }
        },
      },
    ]);
  };

  const loadPlace = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const record = await pb.collection('places').getOne(params.id as string, { expand: 'category' });
      setPlace(record);
      if (record.yandex_map_id) await loadYandexRating(record.yandex_map_id);
      if (user) await checkIfFavorite();
    } catch (error: any) {
      console.error(error);
      setLoadError(error.message || 'Не удалось загрузить информацию о месте');
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
        filter: `user = "${user.id}" && place = "${params.id}"`,
      });
      setCurrentFavorite(favorites.items.length > 0 ? favorites.items[0] : null);
    } catch (error) {
      setCurrentFavorite(null);
    }
  };

  useEffect(() => {
    loadPlace();
    loadReviews();
  }, [params.id]);

  const handleBack = () => router.back();
  const toggleFavoriteModal = () => {
    if (!user) {
      Alert.alert('Требуется авторизация', 'Войдите в аккаунт, чтобы добавлять места в избранное', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Войти', onPress: () => router.push('/auth') },
      ]);
      return;
    }
    setShowFavoriteModal(!showFavoriteModal);
  };
  const addToFavorites = async (status: string) => {
    if (!user) return;
    try {
      if (currentFavorite) {
        await pb.collection('favorites').update(currentFavorite.id, { status });
      } else {
        await pb.collection('favorites').create({ user: user.id, place: params.id, status });
      }
      await checkIfFavorite();
      setShowFavoriteModal(false);
      Alert.alert('Успех', 'Место добавлено в избранное!');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось добавить в избранное');
    }
  };
  const removeFromFavorites = async () => {
    if (!user || !currentFavorite) return;
    try {
      await pb.collection('favorites').delete(currentFavorite.id);
      setCurrentFavorite(null);
      Alert.alert('Успех', 'Место удалено из избранного!');
      setShowFavoriteModal(false);
    } catch (error) {
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
    if (place?.photos) setActivePhotoIndex((prev) => (prev === place.photos.length - 1 ? 0 : prev + 1));
  };
  const prevPhoto = () => {
    if (place?.photos) setActivePhotoIndex((prev) => (prev === 0 ? place.photos.length - 1 : prev - 1));
  };
  const handleCall = () => {
    if (!place?.phone) return;
    const phoneNumber = place.phone.replace(/[\s\-()]/g, '');
    Alert.alert('Позвонить', `Вы хотите позвонить по номеру:\n${place.phone}`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Позвонить', onPress: () => Linking.openURL(`tel:${phoneNumber}`) },
    ]);
  };
  const handleOpenMap = () => {
    if (!place) return;
    if (place.coordinates?.lat && place.coordinates?.lon) openWithCoordinates(place.coordinates.lat, place.coordinates.lon);
    else if (place.address) openInYandexMaps(place.address);
    else Alert.alert('Ошибка', 'Адрес не указан');
  };
  const handleOpenWebsite = () => {
    if (!place?.website) return;
    let url = place.website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
    Alert.alert('Открыть сайт', `Перейти на сайт:\n${place.website}`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Открыть', onPress: () => Linking.openURL(url).catch(() => Alert.alert('Ошибка', 'Не удалось открыть сайт')) },
    ]);
  };
  const openYandexReviews = () => {
    if (!place?.yandex_map_id) {
      Alert.alert('Ошибка', 'ID Яндекс Карт не найден');
      return;
    }
    Alert.alert('Отзывы в Яндекс.Картах', 'Перейти к отзывам на Яндекс.Картах?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Перейти',
        onPress: () => {
          const url = `https://yandex.ru/maps/org/${place.yandex_map_id}/reviews/`;
          Linking.openURL(url).catch(() => Alert.alert('Ошибка', 'Не удалось открыть страницу'));
        },
      },
    ]);
  };
  const getPriceLevelInfo = (priceLevel: string) => {
    if (!priceLevel) return { emoji: '🏷️', title: 'Не указано', description: 'Ценовая категория не указана' };
    return { emoji: '💰', title: priceLevel, description: `Ценовая категория: ${priceLevel}\n\nУказана администрацией заведения` };
  };
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
        <TouchableOpacity style={styles.priceSticker} onPress={() => setShowPriceInfoModal(true)} activeOpacity={0.7}>
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
  const renderYandexRating = () => (
    <TouchableOpacity onPress={openYandexReviews} activeOpacity={0.7}>
      {isLoadingRating ? (
        <View style={styles.yandexRatingContainer}>
          <ActivityIndicator size="small" color="#856404" />
          <Text style={styles.yandexRatingText}> Загрузка рейтинга...</Text>
        </View>
      ) : yandexRating ? (
        <View style={styles.yandexRatingContainer}>
          <Text style={styles.yandexRatingLabel}>Рейтинг на Яндекс.Картах:</Text>
          <View style={styles.yandexRatingRow}>
            <Text style={styles.yandexRatingValue}>⭐ {yandexRating.rating.toFixed(1)}</Text>
            <Text style={styles.yandexRatingCount}>
              ({yandexRating.reviews} {getDeclension(yandexRating.reviews, 'отзыв', 'отзыва', 'отзывов')})
            </Text>
          </View>
          <Text style={styles.yandexRatingHint}>Нажмите, чтобы посмотреть отзывы на Яндекс.Картах</Text>
        </View>
      ) : place?.external_rating ? (
        <View style={styles.yandexRatingContainer}>
          <Text style={styles.yandexRatingLabel}>Рейтинг на Яндекс.Картах:</Text>
          <Text style={styles.yandexRatingValue}>⭐ {place.external_rating}</Text>
          <Text style={styles.yandexRatingHint}>Нажмите, чтобы посмотреть отзывы</Text>
        </View>
      ) : (
        <View style={styles.yandexRatingContainer}>
          <Text style={styles.yandexRatingLabel}>Рейтинг на Яндекс.Картах:</Text>
          <Text style={styles.yandexRatingValue}>⭐ Нет данных</Text>
          {place?.yandex_map_id && <Text style={styles.yandexRatingHint}>Нажмите, чтобы посмотреть отзывы</Text>}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderReviewItem = (item: ReviewType, isReply = false) => {
    const likesCount = item.likes || 0;
    const dislikesCount = item.dislikes || 0;
    
    return (
    <View key={item.id} style={[styles.reviewItem, isReply && styles.replyItem]}>
      <View style={styles.reviewHeader}>
        <TouchableOpacity 
          style={styles.reviewUserInfo}
          onPress={() => handleUserPress(item.user)}
          activeOpacity={0.7}
        >
          <Image
            source={item.userAvatar ? { uri: item.userAvatar } : require('../assets/images/zaglushka.jpg')}
            style={styles.reviewAvatar}
          />
          <View>
            <Text style={styles.reviewUserName}>{item.userName}</Text>
            {!isReply && <StarRating rating={item.rating} size={14} interactive={false} />}
          </View>
        </TouchableOpacity>
        {user && item.user === user.id && !isReply && (
          <View style={styles.reviewActions}>
            <TouchableOpacity onPress={() => editReview(item)}>
              <Text style={styles.reviewActionText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteReview(item.id)}>
              <Text style={styles.reviewActionText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {isReply && item.reply_to_user_name && (
        <Text style={styles.replyToLabel}>Ответ пользователю @{item.reply_to_user_name}</Text>
      )}
      <Text style={styles.reviewComment}>{item.comment}</Text>
      {item.photos && item.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewPhotosContainer}>
          {item.photos.map((photo: string, idx: number) => (
            <Image key={idx} source={{ uri: pb.files.getURL(item, photo) }} style={styles.reviewPhoto} />
          ))}
        </ScrollView>
      )}
      <View style={styles.reviewFooter}>
        <View style={styles.reviewLikes}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => handleLike(item)}
            disabled={likingReviewId === item.id}
          >
            <Text style={[styles.likeButtonText, item.hasUserLiked && styles.likeButtonActive]}>
              👍 {likesCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => handleDislike(item)}
            disabled={likingReviewId === item.id}
          >
            <Text style={[styles.likeButtonText, item.hasUserDisliked && styles.dislikeButtonActive]}>
              👎 {dislikesCount}
            </Text>
          </TouchableOpacity>
          {user && (
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => {
                setReplyingToReview(item);
                setReplyText('');
                setReplyModalVisible(true);
              }}
            >
              <Text style={styles.replyButtonText}>💬 Ответить</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.reviewDate}>
          {item.datecreate
            ? new Date(item.datecreate).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })
            : item.created
            ? new Date(item.created).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })
            : 'Дата не указана'}
        </Text>
      </View>
      {!isReply && item.replies && item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {item.replies.map((reply: ReviewType) => renderReviewItem(reply, true))}
        </View>
      )}
    </View>
  )};

  const renderReviewsSection = () => {
    const totalComments = getTotalCommentsCount(reviews);
    return (
    <View style={styles.reviewsSection}>
      <TouchableOpacity style={styles.reviewsHeader} onPress={() => setReviewsVisible(!reviewsVisible)}>
        <View style={styles.reviewsHeaderLeft}>
          <Text style={styles.sectionTitle}>📝 Отзывы</Text>
          <Text style={styles.reviewsCount}>{totalComments}</Text>
        </View>
        <Text style={styles.reviewsToggleIcon}>{reviewsVisible ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {reviewsVisible && (
        <>
          {reviews.length === 0 ? (
            <View style={styles.noReviewsContainer}>
              <Text style={styles.noReviewsText}>Отзывов пока нет. Будьте первым!</Text>
            </View>
          ) : (
            reviews.map((item) => renderReviewItem(item))
          )}
          <TouchableOpacity
            style={styles.addReviewButton}
            onPress={() => {
              if (!user) {
                Alert.alert('Авторизация', 'Войдите чтобы оставить отзыв', [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Войти', onPress: () => router.push('/auth') },
                ]);
                return;
              }
              resetReviewModal();
              setShowReviewModal(true);
            }}
          >
            <Text style={styles.addReviewButtonText}>✍️ Написать отзыв</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )};

  const renderReviewModal = () => (
    <Modal visible={showReviewModal} transparent animationType="slide" onRequestClose={resetReviewModal}>
      <View style={styles.modalOverlay}>
        <View style={styles.reviewModalContent}>
          <ScrollView>
            <Text style={styles.modalTitle}>{editingReview ? 'Редактировать' : 'Написать отзыв'}</Text>
            <View style={styles.reviewModalRating}>
              <Text style={styles.reviewModalLabel}>Оценка:</Text>
              <StarRating rating={newReviewRating} onRatingChange={setNewReviewRating} size={32} />
            </View>
            <Text style={styles.reviewModalLabel}>Отзыв:</Text>
            <TextInput
              style={styles.reviewModalInput}
              multiline
              numberOfLines={4}
              placeholder="Расскажите о впечатлениях..."
              value={newReviewComment}
              onChangeText={setNewReviewComment}
            />
            <Text style={styles.reviewModalLabel}>Фото:</Text>
            <ScrollView horizontal style={styles.reviewPhotoPicker}>
              {newReviewPhotos.map((photo, index) => (
                <View key={index} style={styles.reviewPhotoPickerItem}>
                  <Image source={{ uri: photo }} style={styles.reviewPhotoPickerImage} />
                  <TouchableOpacity style={styles.reviewPhotoPickerRemove} onPress={() => removeReviewPhoto(index)}>
                    <Text style={styles.reviewPhotoPickerRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.reviewPhotoPickerAdd} onPress={pickReviewPhotos}>
                <Text style={styles.reviewPhotoPickerAddText}>+</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.reviewModalButtons}>
              <TouchableOpacity style={[styles.reviewModalButton, styles.reviewModalCancelButton]} onPress={resetReviewModal}>
                <Text style={styles.reviewModalCancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reviewModalButton, styles.reviewModalSubmitButton]} onPress={submitReview} disabled={isSubmittingReview}>
                <Text style={styles.reviewModalSubmitButtonText}>{isSubmittingReview ? '...' : editingReview ? 'Сохранить' : 'Отправить'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderReplyModal = () => (
    <Modal visible={replyModalVisible} transparent animationType="slide" onRequestClose={() => setReplyModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.reviewModalContent}>
          <Text style={styles.modalTitle}>Ответить на отзыв</Text>
          <TextInput
            style={styles.reviewModalInput}
            multiline
            numberOfLines={4}
            placeholder="Ваш ответ..."
            value={replyText}
            onChangeText={setReplyText}
          />
          <View style={styles.reviewModalButtons}>
            <TouchableOpacity style={[styles.reviewModalButton, styles.reviewModalCancelButton]} onPress={() => setReplyModalVisible(false)}>
              <Text style={styles.reviewModalCancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.reviewModalButton, styles.reviewModalSubmitButton]} onPress={submitReply}>
              <Text style={styles.reviewModalSubmitButtonText}>Ответить</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderPriceModal = () => {
    const priceInfo = getPriceLevelInfo(place?.price_level);
    return (
      <Modal visible={showPriceInfoModal} transparent animationType="fade" onRequestClose={() => setShowPriceInfoModal(false)}>
        <View style={styles.priceModalOverlay}>
          <View style={styles.priceModalContent}>
            <ScrollView style={styles.priceModalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.priceModalScrollContent}>
                <Text style={styles.priceModalEmoji}>{priceInfo.emoji}</Text>
                <Text style={styles.priceModalTitle}>{priceInfo.title}</Text>
                <Text style={styles.priceModalDescription}>{priceInfo.description}</Text>
                <TouchableOpacity style={styles.priceModalCloseButton} onPress={() => setShowPriceInfoModal(false)}>
                  <Text style={styles.priceModalCloseButtonText}>Понятно</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const handleRetry = () => loadPlace();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter} />
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

  if (loadError && !place) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter} />
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

  if (!place) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter} />
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.categoryBadge}>{place.expand?.category?.name || 'Другие места'}</Text>
        </View>
        <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavoriteModal}>
          <Text style={styles.favoriteButtonText}>{currentFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                  <View key={index} style={[styles.photoIndicator, index === activePhotoIndex && styles.photoIndicatorActive]} />
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

        {reviews.length > 0 && (
          <View style={styles.userRatingRow}>
            <AppRatingStars rating={avgUserRating} size={36} />
            <Text style={styles.userRatingValue}>{avgUserRating.toFixed(1)}</Text>
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.placeName}>{place.name}</Text>
          {renderYandexRating()}
          {currentFavorite && (
            <View style={styles.favoriteStatus}>
              <Text style={styles.favoriteStatusText}>{getStatusText(currentFavorite.status)}</Text>
            </View>
          )}
          <View style={styles.address}>
            <Text style={styles.addressText}>📍 {place.address}</Text>
          </View>
          <View style={styles.actionButtons}>
            {place.phone && (
              <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
                <Text style={styles.actionButtonIcon}>📞</Text>
                <Text style={styles.actionButtonText}>Позвонить</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionButton} onPress={handleOpenMap}>
              <Text style={styles.actionButtonIcon}>🗺️</Text>
              <Text style={styles.actionButtonText}> Маршрут </Text>
            </TouchableOpacity>
          </View>
        </View>

        {place.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Описание</Text>
            <Text style={styles.descriptionText}>{place.description}</Text>
          </View>
        )}

        {renderPriceInfo()}

        {place.website && (
          <TouchableOpacity style={styles.websiteSection} onPress={handleOpenWebsite} activeOpacity={0.7}>
            <Text style={styles.sectionTitle}>Веб-сайт</Text>
            <View style={styles.websiteContainer}>
              <Text style={styles.websiteIcon}>🌐</Text>
              <Text style={styles.websiteText}>{place.website}</Text>
              <Text style={styles.websiteHint}>Нажмите, чтобы открыть</Text>
            </View>
          </TouchableOpacity>
        )}

        {place.working_hours && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Часы работы</Text>
            <Text style={styles.hoursText}>{place.working_hours}</Text>
          </View>
        )}

        {renderReviewsSection()}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={showFavoriteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{currentFavorite ? 'Изменить статус' : 'Добавить в избранное'}</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => addToFavorites('visited')}>
              <Text style={styles.modalOptionEmoji}>✅</Text>
              <Text style={styles.modalOptionText}>Посещал(а)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => addToFavorites('want_to_visit')}>
              <Text style={styles.modalOptionEmoji}>📅</Text>
              <Text style={styles.modalOptionText}>Хочу посетить</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => addToFavorites('favorite')}>
              <Text style={styles.modalOptionEmoji}>❤️</Text>
              <Text style={styles.modalOptionText}>Любимое место</Text>
            </TouchableOpacity>
            {currentFavorite && (
              <TouchableOpacity style={styles.removeOption} onPress={removeFromFavorites}>
                <Text style={styles.removeOptionText}>🗑️ Удалить из избранного</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={toggleFavoriteModal}>
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {renderPriceModal()}
      {renderReviewModal()}
      {renderReplyModal()}
      <NavigationMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFE9E1' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#72383D', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { padding: 8 },
  backButtonText: { color: 'white', fontSize: 24, fontWeight: 'bold', fontFamily: 'Banshrift' },
  headerCenter: { flex: 1, alignItems: 'center' },
  categoryBadge: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Banshrift', textAlign: 'center' },
  favoriteButton: { padding: 8, backgroundColor: '#AC9C8D', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  favoriteButtonText: { fontSize: 20 },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  photosSection: { backgroundColor: 'white', position: 'relative' },
  mainPhoto: { width: screenWidth, height: 250, backgroundColor: '#72383D' },
  photoNavButtonLeft: { position: 'absolute', left: 10, top: '50%', transform: [{ translateY: -20 }], backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  photoNavButtonRight: { position: 'absolute', right: 10, top: '50%', transform: [{ translateY: -20 }], backgroundColor: 'rgba(0,0,0,0.5)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  photoNavText: { color: 'white', fontSize: 24, fontWeight: 'bold', fontFamily: 'Banshrift' },
  photoPlaceholder: { fontSize: 80, color: 'white', textAlign: 'center', lineHeight: 250, fontFamily: 'Banshrift' },
  photoIndicators: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 12 },
  photoIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc', marginHorizontal: 4 },
  photoIndicatorActive: { backgroundColor: '#72383D' },
  userRatingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: 'white', paddingVertical: 12 },
  userRatingValue: { fontSize: 20, fontWeight: 'bold', color: '#72383D', fontFamily: 'Banshrift' },
  infoSection: { backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  placeName: { fontSize: 24, fontWeight: 'bold', color: '#72383D', marginBottom: 12, lineHeight: 28, fontFamily: 'Banshrift' },
  favoriteStatus: { backgroundColor: '#e8f5e8', padding: 8, borderRadius: 8, marginBottom: 12, alignSelf: 'flex-start' },
  favoriteStatusText: { fontSize: 14, color: '#2e7d32', fontWeight: '500', fontFamily: 'Banshrift' },
  address: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#72383D', marginBottom: 16 },
  addressText: { fontSize: 14, color: '#000000', lineHeight: 18, fontFamily: 'Banshrift' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#AC9C8D', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, gap: 8 },
  actionButtonIcon: { fontSize: 18 },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: 'white', fontFamily: 'Banshrift' },
  section: { backgroundColor: 'white', padding: 16, marginTop: 8 },
  priceSection: { backgroundColor: 'white', padding: 16, marginTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#72383D', marginBottom: 12, fontFamily: 'Banshrift' },
  descriptionText: { fontSize: 16, lineHeight: 22, color: '#000000', fontFamily: 'Banshrift' },
  hoursText: { fontSize: 16, color: '#000000', lineHeight: 22, fontFamily: 'Banshrift' },
  priceSticker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  priceStickerEmoji: { fontSize: 32, marginRight: 16 },
  priceStickerTextContainer: { flex: 1 },
  priceStickerTitle: { fontSize: 14, fontWeight: 'normal', color: '#72383D', marginBottom: 2, fontFamily: 'Banshrift' },
  priceStickerValue: { fontSize: 16, fontWeight: 'normal', color: '#000000', marginBottom: 4, fontFamily: 'Banshrift' },
  priceStickerSubtitle: { fontSize: 11, color: '#666', fontFamily: 'Banshrift' },
  priceNotAvailable: { backgroundColor: '#f8f9fa', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center' },
  priceNotAvailableText: { fontSize: 16, color: '#666', fontFamily: 'Banshrift', textAlign: 'center' },
  websiteSection: { backgroundColor: 'white', padding: 16, marginTop: 8 },
  websiteContainer: { backgroundColor: '#f8f9fa', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  websiteIcon: { fontSize: 32, marginBottom: 8, textAlign: 'center' },
  websiteText: { fontSize: 16, color: '#000000', textAlign: 'center', marginBottom: 4, fontFamily: 'Banshrift' },
  websiteHint: { fontSize: 14, color: '#666', textAlign: 'center', fontFamily: 'Banshrift' },
  bottomSpacer: { height: 80 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#72383D', fontFamily: 'Banshrift' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 20, fontWeight: 'bold', color: '#72383D', marginBottom: 8, fontFamily: 'Banshrift' },
  errorDescription: { fontSize: 16, color: '#000000', textAlign: 'center', marginBottom: 20, fontFamily: 'Banshrift' },
  retryButton: { backgroundColor: '#72383D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', fontFamily: 'Banshrift' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#72383D', textAlign: 'center', marginBottom: 20, fontFamily: 'Banshrift' },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f8f9fa', borderRadius: 12, marginBottom: 12 },
  modalOptionEmoji: { fontSize: 20, marginRight: 12 },
  modalOptionText: { fontSize: 16, color: '#000000', fontWeight: '500', fontFamily: 'Banshrift' },
  removeOption: { padding: 16, backgroundColor: '#ffebee', borderRadius: 12, marginBottom: 12, alignItems: 'center' },
  removeOptionText: { fontSize: 16, color: '#d32f2f', fontWeight: '500', fontFamily: 'Banshrift' },
  cancelButton: { padding: 16, backgroundColor: '#f8f9fa', borderRadius: 12, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { fontSize: 16, color: '#000000', fontWeight: '500', fontFamily: 'Banshrift' },
  priceModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  priceModalContent: { backgroundColor: 'white', borderRadius: 20, width: '100%', maxWidth: 350, maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  priceModalScroll: { maxHeight: '100%' },
  priceModalScrollContent: { padding: 24, alignItems: 'center' },
  priceModalEmoji: { fontSize: 48, marginBottom: 16 },
  priceModalTitle: { fontSize: 20, fontWeight: 'normal', color: '#72383D', marginBottom: 12, textAlign: 'center', fontFamily: 'Banshrift' },
  priceModalDescription: { fontSize: 16, fontWeight: 'normal', color: '#000000', textAlign: 'center', lineHeight: 22, marginBottom: 24, fontFamily: 'Banshrift' },
  priceModalCloseButton: { backgroundColor: '#AC9C8D', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, width: '100%', alignItems: 'center' },
  priceModalCloseButtonText: { fontSize: 16, fontWeight: 'normal', color: 'white', fontFamily: 'Banshrift' },
  yandexRatingContainer: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#72383D', marginBottom: 12 },
  yandexRatingLabel: { fontSize: 14, fontWeight: '500', color: '#72383D', marginBottom: 4, fontFamily: 'Banshrift' },
  yandexRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yandexRatingValue: { fontSize: 16, fontWeight: 'bold', color: '#FFB300', fontFamily: 'Banshrift' },
  yandexRatingCount: { fontSize: 12, color: '#666', fontFamily: 'Banshrift' },
  yandexRatingText: { fontSize: 14, fontWeight: '500', color: '#000000', fontFamily: 'Banshrift' },
  yandexRatingHint: { fontSize: 10, color: '#999', marginTop: 4, fontFamily: 'Banshrift' },
  reviewsSection: { backgroundColor: 'white', padding: 16, marginTop: 8 },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewsCount: { 
    color: '#72383D', 
    fontSize: 16, 
    fontWeight: 'bold', 
    fontFamily: 'Banshrift', 
    marginLeft: 4 
  },
  reviewsToggleIcon: { fontSize: 16, color: '#72383D', fontFamily: 'Banshrift' },
  noReviewsContainer: { backgroundColor: '#f8f9fa', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  noReviewsText: { fontSize: 14, color: '#666', textAlign: 'center', fontFamily: 'Banshrift' },
  reviewItem: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 12, marginBottom: 12 },
  replyItem: { 
    marginLeft: 20, 
    backgroundColor: '#efefef', 
    marginTop: 6, 
    marginBottom: 6,
  },
  replyToLabel: { fontSize: 12, color: '#72383D', marginBottom: 4, fontFamily: 'Banshrift', fontWeight: 'bold' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewUserInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20 },
  reviewUserName: { fontSize: 14, fontWeight: '600', color: '#72383D', fontFamily: 'Banshrift', marginBottom: 4 },
  reviewActions: { flexDirection: 'row', gap: 12 },
  reviewActionText: { fontSize: 16 },
  reviewComment: { fontSize: 14, color: '#000000', lineHeight: 20, fontFamily: 'Banshrift', marginBottom: 8 },
  reviewPhotosContainer: { flexDirection: 'row', marginBottom: 8 },
  reviewPhoto: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
  reviewFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewLikes: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  likeButton: { paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#e0e0e0', borderRadius: 20 },
  likeButtonText: { fontSize: 12, fontFamily: 'Banshrift' },
  likeButtonActive: { color: '#4caf50', fontWeight: 'bold' },
  dislikeButtonActive: { color: '#f44336', fontWeight: 'bold' },
  replyButton: { paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#AC9C8D', borderRadius: 20 },
  replyButtonText: { fontSize: 12, color: 'white', fontFamily: 'Banshrift' },
  reviewDate: { 
    fontSize: 11, 
    color: '#999', 
    fontFamily: 'Banshrift',
    textAlign: 'right',
  },
  repliesContainer: { marginTop: 8, borderLeftWidth: 2, borderLeftColor: '#ddd', paddingLeft: 8 },
  addReviewButton: { backgroundColor: '#AC9C8D', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  addReviewButtonText: { fontSize: 16, color: 'white', fontWeight: '600', fontFamily: 'Banshrift' },
  reviewModalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  reviewModalRating: { alignItems: 'center', marginBottom: 20 },
  reviewModalLabel: { fontSize: 16, fontWeight: '500', color: '#72383D', marginBottom: 8, fontFamily: 'Banshrift' },
  reviewModalInput: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, fontSize: 14, fontFamily: 'Banshrift', minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  reviewPhotoPicker: { flexDirection: 'row', marginBottom: 20 },
  reviewPhotoPickerItem: { position: 'relative', marginRight: 10 },
  reviewPhotoPickerImage: { width: 80, height: 80, borderRadius: 10 },
  reviewPhotoPickerRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: '#d32f2f', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  reviewPhotoPickerRemoveText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  reviewPhotoPickerAdd: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  reviewPhotoPickerAddText: { fontSize: 32, color: '#999' },
  reviewModalButtons: { flexDirection: 'row', gap: 12 },
  reviewModalButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  reviewModalCancelButton: { backgroundColor: '#f0f0f0' },
  reviewModalCancelButtonText: { fontSize: 16, color: '#666', fontFamily: 'Banshrift' },
  reviewModalSubmitButton: { backgroundColor: '#72383D' },
  reviewModalSubmitButtonText: { fontSize: 16, color: 'white', fontWeight: '600', fontFamily: 'Banshrift' },
});