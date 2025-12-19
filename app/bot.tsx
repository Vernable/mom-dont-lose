import { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import NavigationMenu from './components/NavigationMenu';
import { pb } from './utils/pb';

const BOT_IMAGE = require('../assets/images/bot.png');

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  places?: Place[];
};

type Place = {
  id: string;
  name: string;
  category: string;
  place_type?: string;
  description: string;
  address: string;
  external_rating?: number;
  photos?: string[];
};

export default function BotScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '👋 Привет! Я ваш персональный гид по городу!\n\nЯ могу помочь:\n• Найти интересные места\n• Порекомендовать места по категориям\n• Показать популярные места\n• Дать рекомендации\n\nЧто вас интересует?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [placeTypes, setPlaceTypes] = useState<string[]>(['ресторан', 'кафе', 'парк', 'музей', 'отель']);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initializeConversation();
    loadPlaceTypes();
  }, []);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadPlaceTypes = async () => {
    try {
      const places = await pb.collection('places').getList(1, 100);
      const uniqueTypes = [...new Set(places.items.map(p => p.place_type).filter(Boolean))] as string[];
      if (uniqueTypes.length > 0) {
        setPlaceTypes(uniqueTypes);
      }
    } catch (error) {
      console.log('Не удалось загрузить типы мест');
    }
  };

  const initializeConversation = async () => {
    try {
      const authData = pb.authStore.model;
      if (!authData) {
        console.log('Работаем в локальном режиме');
        return;
      }

      try {
        const existingConversations = await pb
          .collection('bot_conversations')
          .getList(1, 1, {
            filter: `user = "${authData.id}" && is_active = true`,
            sort: '-created',
          });

        if (existingConversations.items.length > 0) {
          const conv = existingConversations.items[0];
          setConversationId(conv.id);
          
          if (conv.conversation_history && Array.isArray(conv.conversation_history)) {
            const savedMessages: Message[] = conv.conversation_history.map((msg: any, index: number) => ({
              id: `${conv.id}_${index}`,
              text: msg.content || msg.text || '',
              isUser: msg.role === 'user',
              timestamp: new Date(msg.timestamp || conv.created),
            }));
            
            if (savedMessages.length > 0) {
              setMessages(savedMessages);
            }
          }
        } else {
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const data = {
            user: authData.id,
            session_id: sessionId,
            title: 'Диалог с гидом',
            conversation_history: [{
              role: 'assistant',
              content: '👋 Привет! Я ваш персональный гид по городу!\n\nЯ могу помочь:\n• Найти интересные места\n• Порекомендовать места по категориям\n• Показать популярные места\n• Дать рекомендации\n\nЧто вас интересует?',
              timestamp: new Date().toISOString(),
            }],
            preferences: {},
            recommendations: {},
            is_active: true,
          };

          const record = await pb.collection('bot_conversations').create(data);
          setConversationId(record.id);
        }
      } catch (error) {
        console.log('Работаем без сохранения в базу');
      }
    } catch (error) {
      console.error('Ошибка инициализации:', error);
    }
  };

  const saveMessage = async (message: Message) => {
    try {
      const authData = pb.authStore.model;
      if (!authData || !conversationId) return;

      try {
        const conversation = await pb
          .collection('bot_conversations')
          .getOne(conversationId);

        const history = conversation.conversation_history || [];
        history.push({
          role: message.isUser ? 'user' : 'assistant',
          content: message.text,
          timestamp: message.timestamp.toISOString(),
        });

        await pb.collection('bot_conversations').update(conversationId, {
          conversation_history: history,
        });
      } catch (error) {
        console.log('Не удалось сохранить в PocketBase');
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    }
  };

  const searchPlaces = async (query: string): Promise<Place[]> => {
    try {
      const safeQuery = query.replace(/"/g, '');
      
      const places = await pb.collection('places').getList(1, 10, {
        filter: `name ~ "${safeQuery}" || description ~ "${safeQuery}" || category ~ "${safeQuery}" || place_type ~ "${safeQuery}"`,
        sort: '-external_rating',
        expand: 'category',
      });
      
      return places.items.map((item: any) => ({
        id: item.id,
        name: item.name || 'Название не указано',
        category: item.expand?.category?.name || item.category || 'Без категории',
        place_type: item.place_type || '',
        description: item.description || 'Описание отсутствует',
        address: item.address || 'Адрес не указан',
        external_rating: item.external_rating ? parseFloat(item.external_rating) : undefined,
        photos: item.photos || [],
      }));
    } catch (error) {
      console.error('Ошибка поиска мест:', error);
      return [];
    }
  };

  const searchPlacesByType = async (placeType: string): Promise<Place[]> => {
    try {
      const places = await pb.collection('places').getList(1, 10, {
        filter: `place_type = "${placeType}"`,
        sort: '-external_rating',
        expand: 'category',
      });
      
      return places.items.map((item: any) => ({
        id: item.id,
        name: item.name || 'Название не указано',
        category: item.expand?.category?.name || item.category || 'Без категории',
        place_type: item.place_type || '',
        description: item.description || 'Описание отсутствует',
        address: item.address || 'Адрес не указан',
        external_rating: item.external_rating ? parseFloat(item.external_rating) : undefined,
        photos: item.photos || [],
      }));
    } catch (error) {
      console.error('Ошибка поиска по типу:', error);
      return [];
    }
  };

  const getPopularPlaces = async (): Promise<Place[]> => {
    try {
      const places = await pb.collection('places').getList(1, 10, {
        sort: '-external_rating',
        filter: 'external_rating != ""',
        expand: 'category',
      });
      
      if (places.items.length === 0) {
        const allPlaces = await pb.collection('places').getList(1, 10, {
          sort: '-created',
          expand: 'category',
        });
        
        return allPlaces.items.map((item: any) => ({
          id: item.id,
          name: item.name || 'Название не указано',
          category: item.expand?.category?.name || item.category || 'Без категории',
          place_type: item.place_type || '',
          description: item.description || 'Описание отсутствует',
          address: item.address || 'Адрес не указан',
          external_rating: item.external_rating ? parseFloat(item.external_rating) : undefined,
          photos: item.photos || [],
        }));
      }
      
      return places.items.map((item: any) => ({
        id: item.id,
        name: item.name || 'Название не указано',
        category: item.expand?.category?.name || item.category || 'Без категории',
        place_type: item.place_type || '',
        description: item.description || 'Описание отсутствует',
        address: item.address || 'Адрес не указан',
        external_rating: item.external_rating ? parseFloat(item.external_rating) : undefined,
        photos: item.photos || [],
      }));
    } catch (error) {
      console.error('Ошибка получения популярных мест:', error);
      return [];
    }
  };

  // Просто ищем прямое совпадение с place_type из базы
  const detectPlaceType = (query: string): string | null => {
    const queryLower = query.toLowerCase();
    
    // Ищем прямое совпадение с типами мест из базы
    for (const type of placeTypes) {
      const typeLower = type.toLowerCase();
      
      // Проверяем полное совпадение
      if (queryLower === typeLower) {
        return type;
      }
      
      // Проверяем частичное совпадение
      if (queryLower.includes(typeLower)) {
        return type;
      }
      
      // Проверяем множественное число (простое правило)
      if (typeLower.endsWith('а') && queryLower.includes(typeLower.slice(0, -1) + 'ы')) {
        return type;
      }
      
      if (typeLower.endsWith('й') && queryLower.includes(typeLower.slice(0, -1) + 'и')) {
        return type;
      }
    }
    
    return null;
  };

  // Функция для правильного склонения слов
  const declension = (count: number, words: [string, string, string]): string => {
    const cases = [2, 0, 1, 1, 1, 2];
    return words[
      count % 100 > 4 && count % 100 < 20 
        ? 2 
        : cases[Math.min(count % 10, 5)]
    ];
  };

  // Функция для правильного склонения типов мест во множественное число
  const getPluralPlaceType = (placeType: string): string => {
    const typeLower = placeType.toLowerCase();
    
    // Специальные случаи
    if (typeLower === 'парк') {
      return 'парки';
    }
    
    if (typeLower === 'музей') {
      return 'музеи';
    }
    
    if (typeLower === 'кафе') {
      return 'кафе'; // Несклоняемое
    }
    
    if (typeLower === 'ресторан') {
      return 'рестораны';
    }
    
    if (typeLower === 'отель') {
      return 'отели';
    }
    
    if (typeLower === 'театр') {
      return 'театры';
    }
    
    if (typeLower === 'магазин') {
      return 'магазины';
    }
    
    if (typeLower === 'бар') {
      return 'бары';
    }
    
    if (typeLower === 'кинотеатр') {
      return 'кинотеатры';
    }
    
    if (typeLower === 'достопримечательность') {
      return 'достопримечательности';
    }
    
    // Общие правила (на случай новых типов)
    if (typeLower.endsWith('а')) {
      return typeLower.slice(0, -1) + 'ы';
    }
    
    if (typeLower.endsWith('й')) {
      return typeLower.slice(0, -1) + 'и';
    }
    
    if (typeLower.endsWith('ь')) {
      return typeLower.slice(0, -1) + 'и';
    }
    
    if (typeLower.endsWith('я')) {
      return typeLower.slice(0, -1) + 'и';
    }
    
    // По умолчанию добавляем "ы"
    return typeLower + 'ы';
  };

  const generateBotResponse = async (userMessage: string): Promise<{text: string, places?: Place[]}> => {
    const userMessageLower = userMessage.toLowerCase();
    
    if (userMessageLower.includes('привет') || userMessageLower.includes('здравствуй')) {
      return { text: 'Рад вас видеть! Как я могу помочь с поиском интересных мест сегодня?' };
    }
    
    if (userMessageLower.includes('помощь') || userMessageLower.includes('что ты умеешь')) {
      return { text: '📋 **Что я могу:**\n1. Найти места по названию\n2. Рекомендовать по категориям\n3. Показать популярные места\n4. Подбирать по вашим предпочтениям\n\nПросто напишите, что ищете!' };
    }
    
    // Проверяем, ввел ли пользователь конкретный тип места
    const detectedType = detectPlaceType(userMessage);
    
    if (detectedType) {
      // Если введен конкретный тип места
      const places = await searchPlacesByType(detectedType);
      
      if (places.length > 0) {
        const placeWord = declension(places.length, ['место', 'места', 'мест']);
        
        let title;
        if (places.length === 1) {
          title = `🏷️ **Лучший ${detectedType} в городе:**`;
        } else {
          const pluralType = getPluralPlaceType(detectedType);
          title = `🏷️ **Лучшие ${pluralType} в городе:**`;
        }
        
        return {
          text: `${title}\n\nНашёл ${places.length} ${placeWord}:`,
          places: places
        };
      } else {
        return { text: `К сожалению, в категории "${detectedType}" пока нет мест в базе.` };
      }
    }
    
    // Обычный поиск по названию или описанию
    if (userMessageLower.includes('найди') || userMessageLower.includes('ищи') || userMessageLower.includes('поиск') || 
        userMessageLower.includes('где') || userMessageLower.includes('посоветуй') || userMessageLower.includes('рекомендуй')) {
      
      const searchQuery = userMessage.replace(/найди|ищи|поиск|где|посоветуй|рекомендуй|мне|пожалуйста|/gi, '').trim();
      
      if (searchQuery && searchQuery.length > 2) {
        const places = await searchPlaces(searchQuery);
        
        if (places.length > 0) {
          const placeWord = declension(places.length, ['место', 'места', 'мест']);
          return {
            text: `🔍 Нашел ${places.length} ${placeWord} по запросу "${searchQuery}":`,
            places: places
          };
        } else {
          return { text: `По запросу "${searchQuery}" ничего не найдено. Попробуйте другой запрос.` };
        }
      }
    }
    
    if (userMessageLower.includes('популярные') || userMessageLower.includes('топ') || userMessageLower.includes('лучшие') || 
        userMessageLower.includes('рейтинг') || userMessageLower.includes('высокий рейтинг')) {
      
      const places = await getPopularPlaces();
      
      if (places.length > 0) {
        const placeWord = declension(places.length, ['место', 'места', 'мест']);
        return {
          text: `🏆 **Самые популярные места города:**\n\nНашёл ${places.length} ${placeWord}:`,
          places: places
        };
      } else {
        return { text: 'В базе данных пока нет мест.' };
      }
    }
    
    if (userMessageLower.includes('спасибо') || userMessageLower.includes('благодарю')) {
      return { text: 'Всегда рад помочь! 😊 Если нужна еще помощь - обращайтесь!' };
    }
    
    if (userMessageLower.includes('пока') || userMessageLower.includes('до свидания') || userMessageLower.includes('досвидания')) {
      return { text: 'До новых встреч! Буду рад помочь снова. 👋' };
    }
    
    const defaultResponses = [
      'Интересный вопрос! Я могу помочь найти конкретные места или дать рекомендации по категориям.',
      'Понял ваш вопрос! Я специализируюсь на поиске мест в городе. Попробуйте спросить о кафе, парках или музеях.',
      'Хотите найти конкретное место или получить рекомендации?',
      'Могу помочь найти места по названию, категории или показать самые популярные.',
      'Попробуйте ввести конкретный запрос, например: "кафе", "рестораны", "музеи", или "популярные места".',
    ];
    
    return { text: defaultResponses[Math.floor(Math.random() * defaultResponses.length)] };
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '' || isLoading) return;

    const userMessageText = inputText.trim();
    setInputText('');
    setIsLoading(true);

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      text: userMessageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    await saveMessage(userMessage);

    try {
      const botResponse = await generateBotResponse(userMessageText);
      
      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        text: botResponse.text,
        isUser: false,
        timestamp: new Date(),
        places: botResponse.places,
      };

      setMessages(prev => [...prev, botMessage]);
      await saveMessage(botMessage);
    } catch (error) {
      console.error('Ошибка генерации ответа:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        text: 'Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getEmojiForType = (type: string): string => {
    const emojiMap: Record<string, string> = {
      'ресторан': '🍽️',
      'кафе': '☕',
      'бар': '🍸',
      'парк': '🌳',
      'музей': '🏛️',
      'кинотеатр': '🎬',
      'театр': '🎭',
      'магазин': '🛍️',
      'отель': '🏨',
      'достопримечательность': '🗺️',
    };
    return emojiMap[type.toLowerCase()] || '📍';
  };

  // Навигация к детальной странице места
  const navigateToPlaceDetails = (placeId: string) => {
    router.push({
      pathname: '/descriptionplace',
      params: { id: placeId }
    });
  };

  const renderPlaceCard = (place: Place) => {
    const photoUrl = place.photos && place.photos.length > 0 
      ? pb.files.getURL({ id: place.id, collectionId: 'places' }, place.photos[0])
      : null;

    return (
      <TouchableOpacity 
        key={place.id}
        style={styles.placeCard}
        activeOpacity={0.7}
        onPress={() => navigateToPlaceDetails(place.id)}
      >
        {photoUrl ? (
          <Image 
            source={{ uri: photoUrl }}
            style={styles.placeImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeImage, styles.placeImagePlaceholder]}>
            <Text style={styles.placeImagePlaceholderText}>
              {place.place_type ? getEmojiForType(place.place_type) : '📍'}
            </Text>
          </View>
        )}
        
        <View style={styles.placeCardContent}>
          <Text style={styles.placeName} numberOfLines={2}>
            {place.name}
          </Text>
          
          <View style={styles.placeInfoRow}>
            <Text style={styles.placeCategory} numberOfLines={1}>
              {place.category}
            </Text>
            {place.external_rating && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>⭐ {place.external_rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.placeAddress} numberOfLines={2}>
            {place.address}
          </Text>
          
          {place.description && (
            <Text style={styles.placeDescription} numberOfLines={3}>
              {place.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const messageDate = item.timestamp.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
    
    const messageTime = item.timestamp.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.messageWrapper}>
        <Text style={styles.messageDate}>{messageDate}</Text>
        
        <View style={[
          styles.messageRow,
          item.isUser ? styles.userMessageRow : styles.botMessageRow
        ]}>
          {!item.isUser && (
            <Image 
              source={BOT_IMAGE} 
              style={styles.botAvatar}
              resizeMode="cover"
            />
          )}
          
          <View style={[
            styles.messageContainer,
            item.isUser ? styles.userMessage : styles.botMessage
          ]}>
            <Text style={[
              styles.messageText,
              item.isUser ? styles.userMessageText : styles.botMessageText
            ]}>
              {item.text}
            </Text>
            
            {item.places && item.places.length > 0 && (
              <View style={styles.placesContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.placesContent}
                >
                  {item.places.map(place => renderPlaceCard(place))}
                </ScrollView>
              </View>
            )}
            
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTimeText,
                item.isUser ? styles.userMessageTime : styles.botMessageTime
              ]}>
                {messageTime}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const quickButtons = placeTypes.slice(0, 4).map(type => ({
    label: type,
    emoji: getEmojiForType(type)
  }));
  quickButtons.unshift({ label: 'Популярные места', emoji: '🏆' });

  const renderInputField = () => (
    <View style={styles.inputContainer}>
      <View style={styles.suggestionsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsContent}
        >
          {quickButtons.map((button, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.suggestionButton}
              onPress={() => setInputText(button.label)}
              disabled={isLoading}
            >
              <Text style={styles.suggestionText}>
                {button.emoji} {button.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Введите сообщение..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
          editable={!isLoading}
          onSubmitEditing={handleSendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton, 
            (!inputText.trim() || isLoading) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => {
          if (flatListRef.current) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 50);
          }
        }}
        ListFooterComponent={<View style={styles.footerSpacer} />}
        keyboardShouldPersistTaps="handled"
      />
      
      {/* Фиксированный блок ввода */}
      <View style={styles.fixedInputContainer}>
        {renderInputField()}
      </View>
      
      <NavigationMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFE9E1',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 180,
  },
  footerSpacer: {
    height: 20,
  },
  fixedInputContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    backgroundColor: '#AC9C8D', // Одинаковый фон с кнопками
    borderTopWidth: 1,
    borderTopColor: '#72383D',
    paddingBottom: 10,
    shadowColor: '#72383D',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 5,
  },
  inputContainer: {
    backgroundColor: '#AC9C8D', // Одинаковый фон с кнопками
  },
  suggestionsContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#AC9C8D', // Одинаковый фон с кнопками
  },
  suggestionsContent: {
    paddingRight: 12,
  },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#72383D',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 120,
    fontSize: 16,
    color: '#EFE9E1', // Светлый текст для читаемости
    fontFamily: 'Banshrift',
    backgroundColor: '#AC9C8D', // Одинаковый фон с кнопками
    minHeight: 48,
  },
  sendButton: {
    backgroundColor: '#72383D',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#72383D', // Такая же бордовая граница
  },
  sendButtonDisabled: {
    backgroundColor: '#8A7A6B',
    borderColor: '#72383D', // Такая же бордовая граница
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    color: '#EFE9E1', // Светлый текст
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
  suggestionButton: {
    backgroundColor: '#AC9C8D', // Одинаковый фон с полем ввода
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#72383D', // Такая же бордовая граница
    shadowColor: '#72383D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestionText: {
    fontSize: 14,
    color: '#EFE9E1', // Светлый текст
    fontFamily: 'Banshrift',
    fontWeight: '600',
  },
  messageWrapper: {
    marginBottom: 20,
  },
  messageDate: {
    textAlign: 'center',
    color: '#72383D',
    fontSize: 13,
    marginBottom: 16,
    fontFamily: 'Banshrift',
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  botMessageRow: {
    alignSelf: 'flex-start',
  },
  userMessageRow: {
    alignSelf: 'flex-end',
  },
  botAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  messageContainer: {
    borderRadius: 22,
    padding: 16,
    maxWidth: '78%',
    minWidth: 60,
    shadowColor: '#72383D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  userMessage: {
    backgroundColor: '#72383D',
    borderBottomRightRadius: 6,
    borderTopRightRadius: 6,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },
  botMessage: {
    backgroundColor: '#FAF9F7',
    borderBottomLeftRadius: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    borderWidth: 1.5,
    borderColor: '#72383D', // Такая же бордовая граница
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Banshrift',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  userMessageText: {
    color: '#EFE9E1', // Светлый текст
  },
  botMessageText: {
    color: '#72383D',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  messageTimeText: {
    fontSize: 11,
    fontFamily: 'Banshrift',
    letterSpacing: 0.2,
  },
  userMessageTime: {
    color: 'rgba(239,233,225,0.85)', // Полупрозрачный светлый
  },
  botMessageTime: {
    color: 'rgba(114,56,61,0.7)',
  },
  placesContainer: {
    marginTop: 14,
    marginHorizontal: -6,
  },
  placesContent: {
    paddingRight: 6,
  },
  placeCard: {
    width: 220,
    backgroundColor: '#FAF9F7',
    borderRadius: 16,
    marginRight: 14,
    shadowColor: '#72383D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#72383D', // Такая же бордовая граница
  },
  placeImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#AC9C8D', // Одинаковый фон с кнопками
  },
  placeImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EFE9E1',
  },
  placeImagePlaceholderText: {
    fontSize: 44,
    color: '#72383D',
  },
  placeCardContent: {
    padding: 14,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#72383D',
    marginBottom: 6,
    fontFamily: 'Banshrift',
    lineHeight: 20,
  },
  placeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeCategory: {
    fontSize: 12,
    color: '#72383D',
    fontFamily: 'Banshrift',
    flex: 1,
    marginRight: 10,
    opacity: 0.9,
  },
  ratingBadge: {
    backgroundColor: '#EFE9E1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#72383D', // Такая же бордовая граница
  },
  ratingText: {
    fontSize: 12,
    color: '#72383D',
    fontFamily: 'Banshrift',
    fontWeight: '700',
  },
  placeAddress: {
    fontSize: 12,
    color: '#72383D',
    fontFamily: 'Banshrift',
    marginBottom: 6,
    lineHeight: 16,
    opacity: 0.9,
  },
  placeDescription: {
    fontSize: 12,
    color: '#72383D',
    fontFamily: 'Banshrift',
    lineHeight: 16,
    opacity: 0.8,
  },
});