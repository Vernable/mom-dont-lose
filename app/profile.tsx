import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, FlatList, RefreshControl } from 'react-native';
import { useAuth } from './_layout';
import NavigationMenu from './components/NavigationMenu';
import { pb } from './utils/pb';

interface Notification {
  id: string;
  user: string;
  from_user: string | {
    id: string;
    username: string;
    firstname: string;
    avatar?: string;
  };
  type: 'like_review' | 'like_comment' | 'reply_review' | 'review_approved' | 'review_rejected';
  review_id?: string;
  comment_id?: string;
  is_read: boolean;
  created: string;
  expand?: {
    from_user: {
      id: string;
      username: string;
      firstname: string;
      avatar?: string;
    };
  };
  comment?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ===== ДЛЯ МОДЕРАЦИИ =====
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [showModeration, setShowModeration] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ===== ПРИНУДИТЕЛЬНАЯ ЗАГРУЗКА СВЕЖИХ ДАННЫХ ПОЛЬЗОВАТЕЛЯ =====
  const loadFreshUserData = async () => {
    if (!user) return false;
    try {
      const freshUser = await pb.collection('users').getOne(user.id);
      console.log('🔄 Загружены свежие данные пользователя:', freshUser);
      console.log('👑 is_admin из БД:', freshUser.is_admin);
      
      const isAdminNow = freshUser.is_admin === true;
      setIsAdmin(isAdminNow);
      
      // Обновляем глобальное состояние
      if (updateUser) {
        updateUser({ ...user, is_admin: isAdminNow });
      }
      
      return isAdminNow;
    } catch (error) {
      console.error('Ошибка загрузки свежих данных:', error);
      return false;
    }
  };

  // ===== ЗАГРУЗКА ОТЗЫВОВ НА МОДЕРАЦИЮ =====
  const loadPendingReviews = async () => {
    if (!user) return;
    // Проверяем is_admin из свежего состояния
    const adminStatus = await loadFreshUserData();
    if (!adminStatus) {
      console.log('❌ Пользователь не является админом');
      return;
    }
    try {
      console.log('📥 Загрузка отзывов на модерацию для админа...');
      const result = await pb.collection('reviews').getList(1, 100, {
        filter: 'status = "pending"',
        expand: 'user,place',
        sort: '-created',
      });
      console.log('📥 Загружено отзывов на модерацию:', result.items.length);
      setPendingReviews(result.items);
    } catch (error) {
      console.error('Ошибка загрузки отзывов на модерацию:', error);
    }
  };

  // ===== МОДЕРАЦИЯ ОТЗЫВА =====
  const moderateReview = async (reviewId: string, status: 'approved' | 'rejected', comment?: string) => {
    if (!user) return;
    const adminStatus = await loadFreshUserData();
    if (!adminStatus) {
      Alert.alert('Ошибка', 'У вас нет прав для модерации');
      return;
    }
    try {
      await pb.collection('reviews').update(reviewId, {
        status: status,
        moderation_comment: comment || '',
      });

      const review = pendingReviews.find(r => r.id === reviewId);
      if (review) {
        await pb.collection('notifications').create({
          user: review.user,
          from_user: user.id,
          type: status === 'approved' ? 'review_approved' : 'review_rejected',
          review_id: reviewId,
          is_read: false,
          comment: comment || (status === 'approved' ? '✅ Ваш отзыв опубликован' : '❌ Ваш отзыв отклонен'),
        });
        console.log('✅ Уведомление отправлено пользователю');
      }

      Alert.alert('Успех', `Отзыв ${status === 'approved' ? 'опубликован' : 'отклонен'}`);
      loadPendingReviews();
    } catch (error) {
      console.error('Ошибка модерации:', error);
      Alert.alert('Ошибка', 'Не удалось обработать отзыв');
    }
  };

  useEffect(() => {
    if (user) {
      loadFreshUserData();
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const result = await pb.collection('notifications').getList(1, 50, {
        filter: `user = "${user.id}"`,
        expand: 'from_user',
        sort: '-created',
      });
      console.log('📥 Загружено уведомлений:', result.items.length);
      setNotifications(result.items as any);
    } catch (error: any) {
      console.error('Ошибка загрузки уведомлений:', error);
    }
  };

  const refreshNotifications = async () => {
    setRefreshing(true);
    await loadNotifications();
    const adminStatus = await loadFreshUserData();
    if (adminStatus) {
      await loadPendingReviews();
    }
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await pb.collection('notifications').update(notificationId, { is_read: true });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Ошибка отметки прочитанного:', error);
    }
  };

  const getFromUserId = (notification: Notification): string | null => {
    if (notification.expand?.from_user?.id) {
      return notification.expand.from_user.id;
    }
    if (typeof notification.from_user === 'object' && notification.from_user !== null && 'id' in notification.from_user) {
      return notification.from_user.id;
    }
    if (typeof notification.from_user === 'string') {
      return notification.from_user;
    }
    return null;
  };

  const getFromUserName = (notification: Notification): string => {
    if (notification.expand?.from_user?.firstname) {
      return notification.expand.from_user.firstname;
    }
    if (notification.expand?.from_user?.username) {
      return notification.expand.from_user.username;
    }
    if (typeof notification.from_user === 'object' && notification.from_user !== null) {
      return notification.from_user.firstname || notification.from_user.username || 'Пользователь';
    }
    return 'Пользователь';
  };

  const getFromUserAvatar = (notification: Notification): string | null => {
    if (notification.expand?.from_user?.avatar) {
      return notification.expand.from_user.avatar;
    }
    if (typeof notification.from_user === 'object' && notification.from_user !== null && notification.from_user.avatar) {
      return notification.from_user.avatar;
    }
    return null;
  };

  const handleNotificationPress = async (notification: Notification) => {
    await markAsRead(notification.id);
    const userId = getFromUserId(notification);
    if (!userId) {
      Alert.alert('Ошибка', 'Не удалось определить пользователя');
      return;
    }
    router.push(`/userprofile?id=${userId}`);
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'like_review':
        return 'лайкнул(а) ваш отзыв';
      case 'like_comment':
        return 'лайкнул(а) ваш комментарий';
      case 'reply_review':
        return 'ответил(а) на ваш отзыв';
      case 'review_approved':
        return '✅ Ваш отзыв опубликован';
      case 'review_rejected':
        return '❌ Ваш отзыв отклонен';
      default:
        return 'взаимодействовал(а) с вашим контентом';
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Выход из аккаунта',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Выйти', style: 'destructive', onPress: () => logout() }
      ]
    );
  };

  const handleViewedPlaces = () => {
    router.push('/viewedplaces');
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Необходимо разрешение на доступ к галерее');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Необходимо разрешение на доступ к камере');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const deleteAvatar = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const updatedUser = await pb.collection('users').update(user.id, { avatar: null });
      if (updateUser) {
        updateUser(updatedUser);
      }
      Alert.alert('Успех', 'Аватар удален');
    } catch (error: any) {
      console.error('Ошибка удаления аватара:', error);
      Alert.alert('Ошибка', 'Не удалось удалить аватар');
    } finally {
      setIsLoading(false);
    }
  };

  const showImagePickerOptions = () => {
    const options: any[] = [
      { text: 'Камера', onPress: takePhoto },
      { text: 'Галерея', onPress: pickImage },
    ];
    if (user?.avatar) {
      options.push({
        text: 'Удалить аватар',
        onPress: deleteAvatar,
        style: 'destructive',
      });
    }
    options.push({ text: 'Отмена', style: 'cancel' });
    Alert.alert('Сменить аватар', 'Выберите действие', options);
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);
      const updatedUser = await pb.collection('users').update(user.id, formData);
      if (updateUser) {
        updateUser(updatedUser);
      }
      Alert.alert('Успех', 'Аватар обновлен');
    } catch (error: any) {
      console.error('Ошибка загрузки аватара:', error);
      Alert.alert('Ошибка', 'Не удалось обновить аватар');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarUrl = (record: any, avatar: string) => {
    if (!avatar) return null;
    try {
      return pb.files.getURL(record, avatar);
    } catch (error) {
      return null;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={styles.container}>
      {user ? (
        <View style={styles.profileContent}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={refreshNotifications} colors={['#72383D']} />
            }
          >
            <View style={styles.header}>
              <Text style={styles.headerUsername}>@{user.username || 'username'}</Text>
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => {
                  refreshNotifications();
                  setNotificationsModalVisible(true);
                }}
              >
                <Text style={styles.notificationIcon}>🔔</Text>
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.profileRow}>
              <TouchableOpacity
                style={styles.photoContainer}
                onPress={showImagePickerOptions}
                disabled={isLoading}
              >
                <Image
                  source={user.avatar ? { uri: getAvatarUrl(user, user.avatar) } : require('../assets/images/zaglushka.jpg')}
                  style={styles.profilePhoto}
                  resizeMode="cover"
                />
                <View style={styles.cameraIconContainer}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
                {isLoading && (
                  <View style={styles.loadingOverlay}>
                    <Text style={styles.loadingText}>Загрузка...</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.firstname || user.username || 'Пользователь'}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setIsInfoExpanded(!isInfoExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>Информация профиля</Text>
                <Text style={styles.chevron}>{isInfoExpanded ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              {isInfoExpanded && (
                <View style={styles.sectionContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Имя</Text>
                    <Text style={styles.infoValue}>{user.firstname || 'Не указано'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Имя пользователя</Text>
                    <Text style={styles.infoValue}>{user.username || 'Не указано'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user.email}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Дата регистрации</Text>
                    <Text style={styles.infoValue}>
                      {user.created ? new Date(user.created).toLocaleDateString('ru-RU') : 'Дата не указана'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setIsActionsExpanded(!isActionsExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionTitle}>Действия</Text>
                <Text style={styles.chevron}>{isActionsExpanded ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              {isActionsExpanded && (
                <View style={styles.sectionContent}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push('/editprofile')}
                  >
                    <Text style={styles.actionButtonText}>✏️ Редактировать профиль</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleViewedPlaces}
                  >
                    <Text style={styles.actionButtonText}>👁️ История</Text>
                  </TouchableOpacity>

                  {/* ===== КНОПКА МОДЕРАЦИИ ===== */}
                  {isAdmin && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#72383D' }]}
                      onPress={() => {
                        loadPendingReviews();
                        setShowModeration(true);
                      }}
                    >
                      <Text style={styles.actionButtonText}>🔍 Отзывы на модерацию ({pendingReviews.length})</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.logoutButton]}
                    onPress={handleLogout}
                  >
                    <Text style={[styles.actionButtonText, styles.logoutButtonText]}>🚪 Выйти</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      ) : (
        <View style={styles.guestContent}>
          <Text style={styles.guestText}>Вы не авторизованы</Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.authButtonText}>Войти / Зарегистрироваться</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Модальное окно уведомлений */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={notificationsModalVisible}
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Уведомления</Text>
              <View style={{ flexDirection: 'row', gap: 15 }}>
                <TouchableOpacity onPress={refreshNotifications}>
                  <Text style={{ fontSize: 20, color: '#72383D' }}>🔄</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setNotificationsModalVisible(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const userName = getFromUserName(item);
                const userAvatar = getFromUserAvatar(item);
                return (
                  <TouchableOpacity
                    style={[styles.notificationItem, !item.is_read && styles.unreadNotification]}
                    onPress={() => handleNotificationPress(item)}
                  >
                    <Image
                      source={userAvatar ? { uri: getAvatarUrl({ avatar: userAvatar }, userAvatar) } : require('../assets/images/zaglushka.jpg')}
                      style={styles.notificationAvatar}
                    />
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationText}>
                        <Text style={styles.notificationUserName}>{userName}</Text>
                        {' '}{getNotificationText(item)}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {new Date(item.created).toLocaleString('ru-RU')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>Нет уведомлений</Text>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ===== МОДАЛЬНОЕ ОКНО МОДЕРАЦИИ ===== */}
      <Modal
        visible={showModeration}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModeration(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { minHeight: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Модерация отзывов</Text>
              <TouchableOpacity onPress={() => setShowModeration(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            {pendingReviews.length === 0 ? (
              <Text style={styles.emptyText}>Нет отзывов на модерацию</Text>
            ) : (
              <FlatList
                data={pendingReviews}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewUserName}>
                      {item.expand?.user?.firstname || item.expand?.user?.username || 'Пользователь'}
                    </Text>
                    <Text style={styles.reviewComment}>{item.comment}</Text>
                    <Text style={styles.reviewRating}>⭐ {item.rating}</Text>
                    <Text style={styles.reviewPlace}>📍 {item.expand?.place?.name || 'Место'}</Text>
                    <View style={styles.moderationButtons}>
                      <TouchableOpacity
                        style={[styles.moderationButton, styles.approveButton]}
                        onPress={() => moderateReview(item.id, 'approved')}
                      >
                        <Text style={styles.moderationButtonText}>✅ Одобрить</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.moderationButton, styles.rejectButton]}
                        onPress={() => {
                          Alert.prompt(
                            'Причина отказа',
                            'Введите причину отказа:',
                            [
                              { text: 'Отмена', style: 'cancel' },
                              {
                                text: 'Отклонить',
                                onPress: (value?: string) => {
                                  moderateReview(item.id, 'rejected', value || 'Не прошло модерацию');
                                }
                              }
                            ],
                            'plain-text'
                          );
                        }}
                      >
                        <Text style={styles.moderationButtonText}>❌ Отклонить</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 10 }]}
              onPress={() => setShowModeration(false)}
            >
              <Text style={styles.cancelButtonText}>Закрыть</Text>
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
    backgroundColor: '#EFE9E1',
  },
  profileContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  headerUsername: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#72383D',
    fontFamily: 'Banshrift',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#EFE9E1',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginRight: 20,
    borderWidth: 3,
    borderColor: '#72383D',
    position: 'relative',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#AC9C8D',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  cameraIcon: {
    fontSize: 16,
    fontFamily: 'Banshrift',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  loadingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#72383D',
    fontFamily: 'Banshrift',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#72383D',
    fontFamily: 'Banshrift',
    opacity: 0.7,
  },
  section: {
    backgroundColor: '#EFE9E1',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#EFE9E1',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#72383D',
    fontFamily: 'Banshrift',
  },
  chevron: {
    fontSize: 16,
    color: '#72383D',
    fontFamily: 'Banshrift',
  },
  sectionContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#72383D',
    flex: 1,
    fontFamily: 'Banshrift',
  },
  infoValue: {
    fontSize: 16,
    color: '#72383D',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Banshrift',
  },
  actionButton: {
    backgroundColor: '#72383D',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
  logoutButton: {
    backgroundColor: '#72383D',
    marginTop: 8,
    marginBottom: 0,
  },
  logoutButtonText: {
    color: 'white',
    fontFamily: 'Banshrift',
  },
  bottomSpacer: {
    height: 80,
  },
  guestContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 100,
  },
  guestText: {
    fontSize: 18,
    color: '#72383D',
    marginBottom: 20,
    fontFamily: 'Banshrift',
  },
  authButton: {
    backgroundColor: '#72383D',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  authButtonText: {
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
    backgroundColor: '#EFE9E1',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#72383D',
    fontFamily: 'Banshrift',
  },
  closeButton: {
    fontSize: 24,
    color: '#72383D',
    fontFamily: 'Banshrift',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  unreadNotification: {
    backgroundColor: '#F5F0EB',
  },
  notificationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#72383D',
    fontFamily: 'Banshrift',
    marginBottom: 4,
  },
  notificationUserName: {
    fontWeight: 'bold',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Banshrift',
  },
  emptyText: {
    textAlign: 'center',
    padding: 40,
    color: '#999',
    fontFamily: 'Banshrift',
  },
  reviewItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#72383D',
    fontFamily: 'Banshrift',
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Banshrift',
    marginVertical: 4,
  },
  reviewRating: {
    fontSize: 14,
    color: '#FFB300',
    fontFamily: 'Banshrift',
  },
  reviewPlace: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Banshrift',
    marginBottom: 8,
  },
  moderationButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  moderationButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  moderationButtonText: {
    color: 'white',
    fontFamily: 'Banshrift',
    fontSize: 14,
    fontWeight: 'bold',
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
});