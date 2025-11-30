import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import NavigationMenu from './components/NavigationMenu';
import PocketBase from 'pocketbase';

const { width: screenWidth } = Dimensions.get('window');
const pb = new PocketBase('http://192.168.1.10:8090');

export default function DescriptionPlace() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [place, setPlace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlace();
  }, [params.id]);

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

  const handleBack = () => {
    router.back();
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
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
          <Text style={styles.headerTitle}>Загрузка...</Text>
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
          <Text style={styles.headerTitle}>Ошибка</Text>
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
        <Text style={styles.headerTitle}>Место</Text>
        <TouchableOpacity style={styles.favoriteButton} onPress={toggleFavorite}>
          <Text style={styles.favoriteButtonText}>{isFavorite ? '❤️' : '🤍'}</Text>
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
    position: 'relative',
  },
  mainPhoto: {
    width: screenWidth,
    height: 250,
    backgroundColor: '#511515',
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
  },
  photoPlaceholder: {
    fontSize: 80,
    color: 'white',
    textAlign: 'center',
    lineHeight: 250,
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
  contactText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  hoursText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});