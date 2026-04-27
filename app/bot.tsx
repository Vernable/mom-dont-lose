import React, { useState, useEffect, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
  Image,
  ImageBackground,
  Alert,
  Linking,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import NavigationMenu from './components/NavigationMenu';
import { pb } from './utils/pb';

const { width: screenWidth } = Dimensions.get('window');
const BOT_IMAGE = require('../assets/images/bot.png');
const BACKGROUND_IMAGE = require('../assets/images/фон.jpg');

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  places?: any[];
  lastSearchQuery?: string;
  lastSearchType?: string;
  lastSearchCategory?: string;
  currentIndex?: number;
  allPlacesCache?: any[];
};

const declOfNum = (n: number, titles: [string, string, string]): string => {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[n % 100 > 4 && n % 100 < 20 ? 2 : cases[Math.min(n % 10, 5)]];
};

export default function BotScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '👋 Привет! Я гид по городу.\n\n• Найти место по названию\n• Показать рестораны, кафе, музеи...\n• Популярные места\n• Случайное место\n\nЧто вас интересует?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
  const [favoritePlaces, setFavoritePlaces] = useState<Map<string, any>>(new Map());
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [currentPlaceId, setCurrentPlaceId] = useState<string | null>(null);

  useEffect(() => {
    initialize();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const loadFavorites = async () => {
    const user = pb.authStore.model;
    if (!user) return;
    try {
      const favorites = await pb.collection('favorites').getFullList({
        filter: `user = "${user.id}"`,
      });
      const favMap = new Map();
      favorites.forEach((f: any) => favMap.set(f.place, f));
      setFavoritePlaces(favMap);
    } catch (error) {
      console.log('Ошибка загрузки избранного:', error);
    }
  };

  const openFavoriteModal = (placeId: string) => {
    const user = pb.authStore.model;
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
    setCurrentPlaceId(placeId);
    setShowFavoriteModal(true);
  };

  const addToFavorites = async (status: string) => {
    const user = pb.authStore.model;
    if (!user || !currentPlaceId) return;

    try {
      const existing = favoritePlaces.get(currentPlaceId);
      if (existing) {
        await pb.collection('favorites').update(existing.id, { status });
        favoritePlaces.set(currentPlaceId, { ...existing, status });
      } else {
        const newFav = await pb.collection('favorites').create({
          user: user.id,
          place: currentPlaceId,
          status: status,
        });
        favoritePlaces.set(currentPlaceId, newFav);
      }
      setFavoritePlaces(new Map(favoritePlaces));
      setShowFavoriteModal(false);
    } catch (error) {
      console.error('Ошибка добавления в избранное:', error);
      Alert.alert('Ошибка', 'Не удалось добавить в избранное');
    }
  };

  const removeFromFavorites = async () => {
    const user = pb.authStore.model;
    if (!user || !currentPlaceId) return;

    try {
      const existing = favoritePlaces.get(currentPlaceId);
      if (existing) {
        await pb.collection('favorites').delete(existing.id);
        favoritePlaces.delete(currentPlaceId);
        setFavoritePlaces(new Map(favoritePlaces));
      }
      setShowFavoriteModal(false);
      Alert.alert('Успех', 'Место удалено из избранного!');
    } catch (error) {
      console.error('Ошибка удаления из избранного:', error);
      Alert.alert('Ошибка', 'Не удалось удалить из избранного');
    }
  };

  const getFavoriteStatus = (placeId: string) => {
    const fav = favoritePlaces.get(placeId);
    if (!fav) return null;
    switch (fav.status) {
      case 'visited': return 'Посещал(а)';
      case 'want_to_visit': return 'Хочу посетить';
      case 'favorite': return 'Любимое место';
      default: return 'В избранном';
    }
  };

  const initialize = async () => {
    const user = pb.authStore.model;
    if (!user) return;
    try {
      const existing = await pb.collection('bot_conversations').getList(1, 1, {
        filter: `user = "${user.id}" && is_active = true`,
      });
      if (existing.items.length) {
        const conv = existing.items[0];
        setConversationId(conv.id);
        if (conv.conversation_history && conv.conversation_history.length) {
          const saved = conv.conversation_history.map((msg: any, i: number) => ({
            id: `${conv.id}_${i}`,
            text: msg.content,
            isUser: msg.role === 'user',
            timestamp: new Date(msg.timestamp),
            places: msg.places || undefined,
            lastSearchQuery: msg.lastSearchQuery,
          }));
          if (saved.length) {
            setMessages(saved);
            return;
          }
        }
      }
      const newConv = await pb.collection('bot_conversations').create({
        user: user.id,
        session_id: `s_${Date.now()}`,
        title: 'Диалог с гидом',
        conversation_history: [{ role: 'assistant', content: messages[0].text, places: null, timestamp: new Date().toISOString() }],
        is_active: true,
      });
      setConversationId(newConv.id);
    } catch (e) {}
  };

  const saveMessage = async (msg: Message) => {
    if (!conversationId) return;
    try {
      const conv = await pb.collection('bot_conversations').getOne(conversationId);
      const history = conv.conversation_history || [];
      history.push({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text,
        places: msg.places || null,
        lastSearchQuery: msg.lastSearchQuery,
        timestamp: msg.timestamp.toISOString(),
      });
      await pb.collection('bot_conversations').update(conversationId, { conversation_history: history });
    } catch (e) {}
  };

  const getAIResponse = (text: string): string | null => {
    const lower = text.toLowerCase().trim();
    if (lower.includes('привет') || lower.includes('здравствуй')) {
      return '👋 И тебе привет! Чем могу помочь?';
    }
    if (lower.includes('пока') || lower.includes('до свидания')) {
      return '👋 До новых встреч! Всегда рада помочь.';
    }
    if (lower.includes('спасибо') || lower.includes('благодарю')) {
      return '😊 Пожалуйста! Обращайтесь ещё.';
    }
    if (lower.includes('помощь')) {
      return '📋 Что я умею:\n\n1. 🔍 Найти место по названию\n2. 🏷️ Найти места по типу (рестораны, кафе, музеи, театры, пабы)\n3. 🏆 Показать популярные места\n4. 🎲 Случайное место\n5. 🗑️ Очистить историю\n6. ❤️ Избранное (нажмите на сердечко)';
    }
    return null;
  };

  const searchByType = async (type: string): Promise<any[]> => {
    try {
      const variations = [
        type.toLowerCase(),
        type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
        type.toUpperCase(),
        type,
      ];
      
      let allItems: any[] = [];
      
      for (const variant of variations) {
        try {
          const res = await pb.collection('places').getList(1, 50, {
            filter: `place_type ~ "${variant}"`,
            sort: '-external_rating',
            expand: 'category',
          });
          allItems = [...allItems, ...res.items];
        } catch (e) {}
      }
      
      const uniqueItems = allItems.filter((item, index, self) => 
        index === self.findIndex((i: any) => i.id === item.id)
      );
      
      if (uniqueItems.length === 0) {
        const res = await pb.collection('places').getList(1, 50, {
          filter: `name ~ "${type}" || name ~ "${type.toLowerCase()}" || name ~ "${type.charAt(0).toUpperCase() + type.slice(1)}"`,
          sort: '-external_rating',
          expand: 'category',
        });
        return res.items.map((i: any) => ({ 
          ...i, 
          category: i.expand?.category?.name || i.category || 'Без категории' 
        }));
      }
      
      const sorted = uniqueItems.sort((a, b) => {
        const ratingA = a.external_rating ? parseFloat(a.external_rating) : 0;
        const ratingB = b.external_rating ? parseFloat(b.external_rating) : 0;
        return ratingB - ratingA;
      });
      
      return sorted.map((i: any) => ({ 
        ...i, 
        category: i.expand?.category?.name || i.category || 'Без категории' 
      }));
    } catch (e) {
      console.error('Ошибка поиска по типу:', e);
      return [];
    }
  };

  const getPopular = async (): Promise<any[]> => {
    try {
      const res = await pb.collection('places').getList(1, 50, {
        sort: '-external_rating',
        filter: 'external_rating > 0',
        expand: 'category',
      });
      if (res.items.length === 0) {
        const all = await pb.collection('places').getList(1, 50, { sort: '-created', expand: 'category' });
        return all.items.map((i: any) => ({ ...i, category: i.expand?.category?.name || i.category }));
      }
      return res.items.map((i: any) => ({ ...i, category: i.expand?.category?.name || i.category }));
    } catch (e) {
      return [];
    }
  };

  const searchByName = async (query: string): Promise<any[]> => {
    try {
      const res = await pb.collection('places').getList(1, 50, {
        filter: `name ~ "${query}"`,
        sort: '-external_rating',
        expand: 'category',
      });
      return res.items.map((i: any) => ({ ...i, category: i.expand?.category?.name || i.category }));
    } catch (e) {
      return [];
    }
  };

  const getRandomPlace = async (count: number = 20): Promise<any[]> => {
    const all = await pb.collection('places').getList(1, 100, { expand: 'category' });
    if (!all.items.length) return [];
    const shuffled = [...all.items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count).map((i: any) => ({ 
      ...i, 
      category: i.expand?.category?.name || i.category || 'Без категории' 
    }));
  };

  const send = async (text: string, retryQuery?: string) => {
    const queryToSend = retryQuery || text;
    if (!queryToSend.trim() || isLoading) return;
    setIsLoading(true);

    if (!retryQuery) {
      const userMsg: Message = {
        id: `u_${Date.now()}`,
        text: text,
        isUser: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
      await saveMessage(userMsg);
      setInputText('');
    }

    const aiAnswer = getAIResponse(queryToSend);
    if (aiAnswer) {
      const botMsg: Message = {
        id: `b_${Date.now()}`,
        text: aiAnswer,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      await saveMessage(botMsg);
      setIsLoading(false);
      return;
    }

    let allPlaces: any[] = [];
    let searchType = '';
    let category = '';
    const lower = queryToSend.toLowerCase();

    if (lower === 'рестораны' || lower === 'ресторан') {
      allPlaces = await searchByType('ресторан');
      searchType = 'type';
      category = 'ресторан';
    } else if (lower === 'кафе') {
      allPlaces = await searchByType('кафе');
      searchType = 'type';
      category = 'кафе';
    } else if (lower === 'музеи' || lower === 'музей') {
      allPlaces = await searchByType('музей');
      searchType = 'type';
      category = 'музей';
    } else if (lower === 'парки' || lower === 'парк') {
      allPlaces = await searchByType('парк');
      searchType = 'type';
      category = 'парк';
    } else if (lower === 'театры' || lower === 'театр') {
      allPlaces = await searchByType('театр');
      searchType = 'type';
      category = 'театр';
    } else if (lower === 'пабы' || lower === 'паб' || lower === 'бар') {
      allPlaces = await searchByType('паб');
      searchType = 'type';
      category = 'паб';
    } else if (lower.includes('популярн') || lower.includes('топ') || lower.includes('лучш')) {
      allPlaces = await getPopular();
      searchType = 'popular';
    } else if (lower.includes('случайное') || lower.includes('не знаю')) {
      allPlaces = await getRandomPlace(20);
      searchType = 'random';
    } else {
      allPlaces = await searchByName(queryToSend);
      if (allPlaces.length === 0) {
        const typePlaces = await searchByType(queryToSend);
        if (typePlaces.length > 0) {
          allPlaces = typePlaces;
          searchType = 'type';
          category = queryToSend;
        } else {
          searchType = 'name';
        }
      } else {
        searchType = 'name';
      }
    }

    if (allPlaces.length === 0) {
      const responseText = `😔 Ничего не нашла по "${queryToSend}". Попробуйте поискать в Яндекс.Картах?`;
      const botMsg: Message = {
        id: `b_${Date.now()}`,
        text: responseText,
        isUser: false,
        timestamp: new Date(),
        lastSearchQuery: queryToSend,
      };
      setMessages(prev => [...prev, botMsg]);
      await saveMessage(botMsg);
      setIsLoading(false);
      return;
    }

    const responseText = `🔍 Нашла ${allPlaces.length} ${declOfNum(allPlaces.length, ['место', 'места', 'мест'])}:`;
    
    const shownPlaces = allPlaces.slice(0, 5);
    const remainingPlaces = allPlaces.slice(5);

    const botMsg: Message = {
      id: `b_${Date.now()}`,
      text: responseText,
      isUser: false,
      timestamp: new Date(),
      places: shownPlaces,
      lastSearchQuery: queryToSend,
      lastSearchType: searchType,
      lastSearchCategory: category,
      currentIndex: 5,
      allPlacesCache: remainingPlaces,
    };
    setMessages(prev => [...prev, botMsg]);
    await saveMessage(botMsg);
    setIsLoading(false);
  };

  const loadMoreOptions = async (message: Message) => {
    if (isLoading) return;
    setIsLoading(true);

    const remainingPlaces = message.allPlacesCache || [];
    
    if (remainingPlaces.length === 0) {
      const botMsg: Message = {
        id: `b_${Date.now()}`,
        text: `😔 Больше мест по запросу "${message.lastSearchQuery}" не найдено. Попробуйте поискать в Яндекс.Картах?`,
        isUser: false,
        timestamp: new Date(),
        lastSearchQuery: message.lastSearchQuery,
      };
      setMessages(prev => [...prev, botMsg]);
      await saveMessage(botMsg);
      setIsLoading(false);
      return;
    }

    const newShownPlaces = remainingPlaces.slice(0, 5);
    const newRemainingPlaces = remainingPlaces.slice(5);
    
    const responseText = `🔍 Нашла ещё ${newShownPlaces.length} ${declOfNum(newShownPlaces.length, ['место', 'места', 'мест'])}:`;

    const botMsg: Message = {
      id: `b_${Date.now()}`,
      text: responseText,
      isUser: false,
      timestamp: new Date(),
      places: newShownPlaces,
      lastSearchQuery: message.lastSearchQuery,
      lastSearchType: message.lastSearchType,
      lastSearchCategory: message.lastSearchCategory,
      currentIndex: (message.currentIndex || 5) + 5,
      allPlacesCache: newRemainingPlaces,
    };
    setMessages(prev => [...prev, botMsg]);
    await saveMessage(botMsg);
    setIsLoading(false);
  };

  const sendBotGreeting = () => {
    const greetingText = '👋 Привет! Я гид по городу.\n\n• Найти место по названию\n• Показать рестораны, кафе, музеи...\n• Популярные места\n• Случайное место\n\nЧто вас интересует?';
    const botMsg: Message = {
      id: `b_${Date.now()}`,
      text: greetingText,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, botMsg]);
    saveMessage(botMsg);
  };

  const clearHistory = () => {
    Alert.alert('Очистить историю', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Очистить',
        style: 'destructive',
        onPress: async () => {
          const welcome = {
            id: `w_${Date.now()}`,
            text: '👋 Привет! Я гид по городу.\n\n• Найти место по названию\n• Показать рестораны, кафе, музеи...\n• Популярные места\n• Случайное место\n\nЧто вас интересует?',
            isUser: false,
            timestamp: new Date(),
          };
          setMessages([welcome]);
          if (conversationId) {
            await pb.collection('bot_conversations').update(conversationId, {
              conversation_history: [{ role: 'assistant', content: welcome.text, places: null, timestamp: welcome.timestamp.toISOString() }],
            });
          }
          Alert.alert('✅ Очищено');
        },
      },
    ]);
  };

  const PlaceCardComponent = ({ place }: { place: any }) => {
    const [photoIndex, setPhotoIndex] = useState(0);
    const isFavorite = favoritePlaces.has(place.id);
    const favoriteStatus = getFavoriteStatus(place.id);
    const photoUrls = (place.photos || []).map((photoName: string) => {
      try {
        return pb.files.getURL(place, photoName);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    const hasPhotos = photoUrls.length > 0;

    const nextPhoto = () => {
      setPhotoIndex((prev) => (prev + 1) % photoUrls.length);
    };
    const prevPhoto = () => {
      setPhotoIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length);
    };

    return (
      <View style={styles.placeCardWrapper}>
        <TouchableOpacity 
          style={styles.placeCard}
          onPress={() => router.push({ pathname: '/descriptionplace', params: { id: place.id } })}
          activeOpacity={0.7}
        >
          <View style={styles.imageContainer}>
            {hasPhotos ? (
              <>
                <Image source={{ uri: photoUrls[photoIndex] }} style={styles.placeImage} resizeMode="cover" />
                {photoUrls.length > 1 && (
                  <View style={styles.imageNav}>
                    <TouchableOpacity style={styles.navButton} onPress={prevPhoto} activeOpacity={0.7}>
                      <Text style={styles.navButtonText}>◀</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navButton} onPress={nextPhoto} activeOpacity={0.7}>
                      <Text style={styles.navButtonText}>▶</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.placeImage, styles.noImage]}>
                <Text style={styles.noImageText}>📍</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.favoriteButton} 
              onPress={() => openFavoriteModal(place.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.favoriteButtonText}>
                {isFavorite ? '❤️' : '🤍'}
              </Text>
            </TouchableOpacity>
            {favoriteStatus ? (
              <View style={styles.favoriteStatusBadge}>
                <Text style={styles.favoriteStatusText}>{favoriteStatus}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{place.name}</Text>
            <Text style={styles.cardCategory}>{place.category}</Text>
            {place.external_rating ? (
              <Text style={styles.cardRating}>⭐ {parseFloat(place.external_rating).toFixed(1)}</Text>
            ) : null}
            <Text style={styles.cardAddress}>{place.address}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isBot = !item.isUser;
    const timeStr = item.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const showYandex = isBot && !item.places && item.text.includes('Яндекс.Картах');
    const showMoreButton = isBot && item.places && item.places.length > 0;

    return (
      <View style={styles.messageWrapper}>
        <View style={[styles.messageRow, isBot ? styles.botRow : styles.userRow]}>
          <View style={[styles.messageBubble, isBot ? styles.botBubble : styles.userBubble]}>
            <Text style={[styles.messageText, isBot ? styles.botText : styles.userText]}>{item.text}</Text>
            {item.places && item.places.length > 0 ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalList}
                  contentContainerStyle={styles.horizontalListContent}
                >
                  {item.places.map((place: any) => (
                    <PlaceCardComponent key={place.id} place={place} />
                  ))}
                </ScrollView>
                <TouchableOpacity 
                  style={styles.moreButton} 
                  onPress={() => loadMoreOptions(item)}
                >
                  <Text style={styles.moreButtonText}>🔄 Ещё варианты</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {showYandex ? (
              <TouchableOpacity
                style={styles.yandexButton}
                onPress={() => Linking.openURL(`https://yandex.ru/maps/?text=${encodeURIComponent(item.lastSearchQuery || '')}`)}
              >
                <Text style={styles.yandexButtonText}>🗺️ Поискать в Яндекс.Картах</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.messageTime, isBot ? styles.botTime : styles.userTime]}>{timeStr}</Text>
          </View>
        </View>
      </View>
    );
  };

  const quickButtons = [
    { label: 'Популярные места', emoji: '🏆' },
    { label: 'Рестораны', emoji: '🍽️' },
    { label: 'Кафе', emoji: '☕' },
    { label: 'Музеи', emoji: '🏛️' },
    { label: 'Пабы', emoji: '🍺' },
    { label: 'Случайное место', emoji: '🎲' },
    { label: 'Помощь', emoji: '❓' },
  ];

  return (
    <ImageBackground source={BACKGROUND_IMAGE} style={styles.container} resizeMode="cover">
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={sendBotGreeting} activeOpacity={0.7}>
          <Image source={BOT_IMAGE} style={styles.headerAvatar} />
          <Text style={styles.headerTitle}>Городской гид</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
          <Text style={styles.clearButtonText}>🗑️ Очистить</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item: Message) => item.id}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.inputArea}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions}>
          {quickButtons.map((b, i) => (
            <TouchableOpacity key={i} style={styles.suggestionButton} onPress={() => send(b.label)} disabled={isLoading}>
              <Text style={styles.suggestionText}>{b.emoji} {b.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Введите сообщение..."
            placeholderTextColor="#72383D"
            multiline
            editable={!isLoading}
            onSubmitEditing={() => send(inputText)}
          />
          <TouchableOpacity style={styles.sendButton} onPress={() => send(inputText)} disabled={isLoading}>
            {isLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.sendButtonText}>➤</Text>}
          </TouchableOpacity>
        </View>
      </View>
      <NavigationMenu />

      <Modal
        visible={showFavoriteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFavoriteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {favoritePlaces.has(currentPlaceId || '') ? 'Изменить статус' : 'Добавить в избранное'}
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

            {favoritePlaces.has(currentPlaceId || '') ? (
              <TouchableOpacity 
                style={styles.removeOption}
                onPress={removeFromFavorites}
              >
                <Text style={styles.removeOptionText}>🗑️ Удалить из избранного</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowFavoriteModal(false)}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(114,56,61,0.85)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EFE9E1',
    fontFamily: 'Banshrift',
  },
  clearButton: {
    backgroundColor: '#FAF9F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#72383D',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#72383D',
    fontFamily: 'Banshrift',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 280,
  },
  inputArea: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingTop: 12,
    paddingBottom: 8,
  },
  suggestions: {
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
  },
  suggestionButton: {
    backgroundColor: '#AC9C8D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#72383D',
  },
  suggestionText: {
    fontSize: 14,
    color: '#EFE9E1',
    fontFamily: 'Banshrift',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#72383D',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#72383D',
    fontFamily: 'Banshrift',
    backgroundColor: '#FAF9F7',
    minHeight: 44,
  },
  sendButton: {
    backgroundColor: '#72383D',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sendButtonText: {
    color: '#EFE9E1',
    fontSize: 18,
    fontWeight: 'bold',
  },

  messageWrapper: {
    marginBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 10,
  },
  botRow: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  userRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  messageBubble: {
    borderRadius: 22,
    padding: 12,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#72383D',
    borderBottomRightRadius: 6,
  },
  botBubble: {
    backgroundColor: '#FAF9F7',
    borderWidth: 1,
    borderColor: '#72383D',
    borderBottomLeftRadius: 6,
    marginRight: 20,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Banshrift',
    lineHeight: 22,
  },
  userText: {
    color: '#EFE9E1',
  },
  botText: {
    color: '#72383D',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 5,
    textAlign: 'right',
    fontFamily: 'Banshrift',
    opacity: 0.7,
  },
  userTime: {
    color: '#EFE9E1',
  },
  botTime: {
    color: '#72383D',
  },

  horizontalList: {
    flexGrow: 0,
    marginTop: 12,
  },
  horizontalListContent: {
    gap: 12,
    paddingRight: 16,
  },

  placeCardWrapper: {
    marginRight: 12,
    width: screenWidth - 100,
  },
  placeCard: {
    backgroundColor: '#FAF9F7',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#72383D',
  },
  imageContainer: {
    position: 'relative',
  },
  placeImage: {
    width: screenWidth - 100,
    height: 150,
    resizeMode: 'cover',
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFE9E1',
  },
  noImageText: {
    fontSize: 42,
    color: '#72383D',
  },
  imageNav: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  navButton: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'transparent',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButtonText: {
    fontSize: 24,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  favoriteStatusBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  favoriteStatusText: {
    fontSize: 10,
    color: '#fff',
    fontFamily: 'Banshrift',
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#72383D',
    fontFamily: 'Banshrift',
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 12,
    color: '#72383D',
    fontFamily: 'Banshrift',
    marginBottom: 2,
  },
  cardRating: {
    fontSize: 12,
    color: '#72383D',
    fontFamily: 'Banshrift',
    marginBottom: 2,
  },
  cardAddress: {
    fontSize: 11,
    color: '#72383D',
    fontFamily: 'Banshrift',
  },

  moreButton: {
    backgroundColor: '#72383D',
    paddingVertical: 10,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 12,
  },
  moreButtonText: {
    color: '#EFE9E1',
    fontFamily: 'Banshrift',
    fontSize: 14,
    fontWeight: '600',
  },
  yandexButton: {
    backgroundColor: '#AC9C8D',
    paddingVertical: 10,
    borderRadius: 30,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#72383D',
  },
  yandexButtonText: {
    color: '#72383D',
    fontFamily: 'Banshrift',
    fontWeight: 'bold',
    fontSize: 14,
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
});