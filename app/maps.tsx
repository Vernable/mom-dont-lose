import { useState } from 'react';
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import NavigationMenu from './components/NavigationMenu';
import { openInYandexMaps } from './utils/maps';

const { width: screenWidth } = Dimensions.get('window');

export default function MapsScreen() {
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Функция для открытия Яндекс.Карт
  const handleOpenYandexMaps = async () => {
    try {
      const yandexMapsUrl = `yandexmaps://maps.yandex.ru/`;
      const webUrl = `https://maps.yandex.ru/`;

      const canOpen = await Linking.canOpenURL(yandexMapsUrl);
      
      if (canOpen) {
        Alert.alert(
          'Открыть Яндекс.Карты',
          'Перейти в приложение Яндекс.Карты?',
          [
            {
              text: 'Отмена',
              style: 'cancel',
            },
            {
              text: 'Открыть',
              onPress: async () => {
                try {
                  await Linking.openURL(yandexMapsUrl);
                } catch (error) {
                  console.error('Ошибка открытия:', error);
                  await Linking.openURL(webUrl);
                }
              },
            },
          ]
        );
      } else {
        // Если приложение не установлено, открываем веб-версию
        Alert.alert(
          'Яндекс.Карты',
          'Открыть веб-версию Яндекс.Карт?',
          [
            {
              text: 'Отмена',
              style: 'cancel',
            },
            {
              text: 'Открыть',
              onPress: async () => {
                await Linking.openURL(webUrl);
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Ошибка:', error);
      await Linking.openURL('https://maps.yandex.ru/');
    }
  };

  // Функция для открытия модального окна поиска
  const handleSearchOnMap = () => {
    setSearchModalVisible(true);
  };

  // Функция для выполнения поиска
  const handleSearchSubmit = async () => {
    if (searchQuery.trim()) {
      await openInYandexMaps(searchQuery.trim());
      setSearchModalVisible(false);
      setSearchQuery('');
    }
  };

  // Функция для отмены поиска
  const handleSearchCancel = () => {
    setSearchModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {/* Убрал header с заголовком */}
      
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Открывайте места в Яндекс.Картах</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={handleOpenYandexMaps}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonEmoji}>🗺️</Text>
            <Text style={styles.buttonTitle}>Открыть Яндекс.Карты</Text>
            <Text style={styles.buttonDescription}>
              Запустите приложение Яндекс.Карты для просмотра карт и навигации
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={handleSearchOnMap}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonEmoji}>🔍</Text>
            <Text style={styles.buttonTitle}>Поиск на карте</Text>
            <Text style={styles.buttonDescription}>
              Найдите адрес или место на карте
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            ⚡ Для работы функций необходимо установить приложение "Яндекс.Карты" из магазина приложений
          </Text>
        </View>
      </View>

      {/* Модальное окно для поиска */}
      <Modal
        visible={searchModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleSearchCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Поиск на карте</Text>
            <Text style={styles.modalSubtitle}>Введите адрес или название места:</Text>
            
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Например: Москва, Красная площадь"
              placeholderTextColor="#999"
              autoFocus={true}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleSearchCancel}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.searchButton]}
                onPress={handleSearchSubmit}
                disabled={!searchQuery.trim()}
              >
                <Text style={styles.searchButtonText}>Искать</Text>
              </TouchableOpacity>
            </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60, // Добавил отступ сверху
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000', // Черный цвет
    textAlign: 'center',
    fontFamily: 'Banshrift',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
  button: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButton: {
    borderWidth: 2,
    borderColor: '#72383D',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#AC9C8D',
  },
  buttonEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000', // Черный цвет
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Banshrift',
  },
  buttonDescription: {
    fontSize: 14,
    color: '#000000', // Черный цвет
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Banshrift',
    opacity: 0.8,
  },
  note: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxWidth: 400,
  },
  noteText: {
    fontSize: 12,
    color: '#000000', // Черный цвет
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Banshrift',
    opacity: 0.7,
  },
  // Стили для модального окна поиска
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#72383D',
    marginBottom: 8,
    fontFamily: 'Banshrift',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#000000', // Черный цвет
    marginBottom: 20,
    fontFamily: 'Banshrift',
    textAlign: 'center',
  },
  searchInput: {
    borderWidth: 2,
    borderColor: '#72383D',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Banshrift',
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    color: '#000000', // Черный цвет
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchButton: {
    backgroundColor: '#72383D',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000', // Черный цвет
    fontFamily: 'Banshrift',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Banshrift',
  },
});