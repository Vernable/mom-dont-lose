import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useState } from 'react';
import NavigationMenu from './components/NavigationMenu';

const { width: screenWidth } = Dimensions.get('window');

// Мок данные для театра
const placeData = {
  id: '1',
  name: 'Башкирский государственный театр оперы и балета',
  category: 'Театр',
  rating: 4.8,
  address: '450077, Россия, г. Уфа, ул. Ленина, 5/1',
  description: 'Башкирский государственный театр оперы и балета открылся 14 декабря 1938 оперой «Прекрасная мельничиха» Д. Памзиелло. Газиз Альмухаметов и Файзи Гаскаров — яркие представители первого поколения деятелей искусства Башкортостана направили студентов для обучения в национальных студиях при Ленинградском хореографическом училище и Московской консерватории. Первая балетная премьера театра — «Коппелия» Л. Делиба состоялась в 1940 году, а в 1944 году - первый башкирский балет «Журавлиная песнь».',
  priceLevel: [
    { type: 'Эконом', price: '300–800 ₽', description: 'балкон, дальние ряды' },
    { type: 'Стандарт', price: '800–2 000 ₽', description: 'партер, бельэтаж, средние ряды' },
    { type: 'Премиум', price: '2 000–4 000 ₽', description: 'первые ряды партера, центральные места' }
  ],
  workingHours: {
    boxOffice: {
      days: 'Пн-Пт: 10:00 - 19:00',
      weekend: 'Сб-Вс: 10:00 - 18:00',
      notes: 'Перерыв: 14:00 - 15:00, в дни спектаклей работает до начала представления'
    },
    performances: {
      evening: 'Вечерние спектакли: 18:00 или 19:00',
      matinee: 'Дневные спектакли: 12:00 или 13:00'
    }
  },
  photos: [
    require('../assets/images/botik.jpg'),
    require('../assets/images/botik.jpg'),
    require('../assets/images/botik.jpg')
  ]
};

export default function DescriptionPlace() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  // В реальном приложении здесь был бы fetch данных по ID из params
  const place = placeData;

  const handleBack = () => {
    router.back();
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Место</Text>
        <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
          <Text style={styles.favoriteButtonText}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Фотографии */}
        <View style={styles.photosSection}>
          <View style={styles.mainPhoto}>
            <Text style={styles.photoPlaceholder}>🏛️</Text>
          </View>
          <View style={styles.photoIndicators}>
            {[1, 2, 3].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.photoIndicator,
                  index === activePhotoIndex && styles.photoIndicatorActive
                ]}
              />
            ))}
          </View>
        </View>

        {/* Основная информация */}
        <View style={styles.infoSection}>
          <Text style={styles.placeName}>{place.name}</Text>
          
          <View style={styles.ratingCategory}>
            <View style={styles.rating}>
              <Text style={styles.ratingText}>⭐ {place.rating}</Text>
            </View>
            <View style={styles.category}>
              <Text style={styles.categoryText}>{place.category}</Text>
            </View>
          </View>

          <View style={styles.address}>
            <Text style={styles.addressText}>📍 {place.address}</Text>
          </View>
        </View>

        {/* Описание */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Описание</Text>
          <Text style={styles.descriptionText}>{place.description}</Text>
        </View>

        {/* Цены */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ценовой уровень</Text>
          {place.priceLevel.map((item, index) => (
            <View key={index} style={styles.priceItem}>
              <View style={styles.priceHeader}>
                <Text style={styles.priceType}>{item.type}</Text>
                <Text style={styles.priceValue}>{item.price}</Text>
              </View>
              <Text style={styles.priceDescription}>{item.description}</Text>
            </View>
          ))}
        </View>

        {/* Часы работы */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Часы работы</Text>
          
          <View style={styles.hoursCategory}>
            <Text style={styles.hoursCategoryTitle}>Касса</Text>
            <Text style={styles.hoursText}>{place.workingHours.boxOffice.days}</Text>
            <Text style={styles.hoursText}>{place.workingHours.boxOffice.weekend}</Text>
            <Text style={styles.hoursNotes}>{place.workingHours.boxOffice.notes}</Text>
          </View>

          <View style={styles.hoursCategory}>
            <Text style={styles.hoursCategoryTitle}>Спектакли</Text>
            <Text style={styles.hoursText}>{place.workingHours.performances.evening}</Text>
            <Text style={styles.hoursText}>{place.workingHours.performances.matinee}</Text>
          </View>
        </View>

        {/* Кнопки действий */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>📞 Позвонить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>🗺️ Открыть в картах</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <NavigationMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#511515',
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  favoriteButton: {
    padding: 8,
  },
  favoriteButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  photosSection: {
    backgroundColor: 'white',
  },
  mainPhoto: {
    width: screenWidth,
    height: 250,
    backgroundColor: '#511515',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: {
    fontSize: 80,
    color: 'white',
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
    backgroundColor: '#511515',
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
    color: '#511515',
    marginBottom: 12,
    lineHeight: 28,
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
  },
  address: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#511515',
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#511515',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
  },
  priceItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#511515',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  priceDescription: {
    fontSize: 14,
    color: '#666',
  },
  hoursCategory: {
    marginBottom: 16,
  },
  hoursCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#511515',
    marginBottom: 8,
  },
  hoursText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 2,
    lineHeight: 20,
  },
  hoursNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
  },
  actionsSection: {
    backgroundColor: 'white',
    padding: 16,
    marginTop: 8,
    marginBottom: 80,
  },
  primaryButton: {
    backgroundColor: '#511515',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#511515',
  },
  secondaryButtonText: {
    color: '#511515',
    fontSize: 16,
    fontWeight: '600',
  },
});