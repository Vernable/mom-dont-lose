import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import NavigationMenu from './components/NavigationMenu';
//bot.tsx
type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

export default function BotScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Привет! Я ваш помощник. Чем могу помочь?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = () => {
    if (inputText.trim() === '') return;

    // Добавляем сообщение пользователя
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    // Добавляем ответ бота
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: 'Это тестовый ответ бота. В реальном приложении здесь будет AI-помощник.',
      isUser: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
    setInputText('');
  };

  const renderMessage = ({ item }: { item: Message }) => (
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
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Чат-бот</Text>
        <Text style={styles.subtitle}>Задайте вопрос о местах в городе</Text>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Введите ваше сообщение..."
          placeholderTextColor="#999"
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, !inputText && styles.sendButtonDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>

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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderColor: '#AC9C8D'
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#72383D', // Новый цвет сообщений пользователя
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white', // Белый цвет сообщений бота
    borderWidth: 1,
    borderColor: '#AC9C8D', // Новый цвет границы
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  userMessageText: {
    color: 'white',
  },
  botMessageText: {
    color: '#000000', // Черный цвет текста бота
  },
  timestamp: {
    fontSize: 10,
    opacity: 0.6,
    color: 'white',
    fontFamily: 'Banshrift', // Новый шрифт
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white', // Белый цвет фона ввода
    borderTopWidth: 1,
    borderTopColor: '#AC9C8D', // Новый цвет границы
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#AC9C8D', // Новый цвет границы
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    color: '#000000', // Черный цвет текста
    fontFamily: 'Banshrift', // Новый шрифт
  },
  sendButton: {
    backgroundColor: '#72383D', // Новый цвет кнопки отправки
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Banshrift', // Новый шрифт
  },
});