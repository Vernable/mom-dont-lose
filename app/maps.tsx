import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import NavigationMenu from './components/NavigationMenu';

const { width: screenWidth } = Dimensions.get('window');
//maps.tsx
export default function MapsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Карты</Text>
        <Text style={styles.subtitle}>Просматривайте места на карте</Text>
      </View>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>🗺️</Text>
        <Text style={styles.mapPlaceholderTitle}>Карта</Text>
        <Text style={styles.mapPlaceholderDescription}>
          Здесь будет переход на приложение карт 
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton}>
          <Text style={styles.controlButtonText}>📍 Моё местоположение</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton}>
          <Text style={styles.controlButtonText}>🔍 Поиск на карте</Text>
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
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#AC9C8D', // Новый цвет плейсхолдера карты
    margin: 16,
    borderRadius: 12,
  },
  mapPlaceholderText: {
    fontSize: 64,
    marginBottom: 16,
  },
  mapPlaceholderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#72383D', // Новый цвет заголовка
    marginBottom: 8,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  mapPlaceholderDescription: {
    fontSize: 16,
    color: '#000000', // Черный цвет текста
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: 'Banshrift', // Новый шрифт
  },
  controls: {
    padding: 16,
    backgroundColor: 'white', // Белый цвет фона контролов
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  controlButton: {
    backgroundColor: '#72383D', // Новый цвет кнопок
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Banshrift', // Новый шрифт
  },
});