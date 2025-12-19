import { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { pb } from '../utils/pb';

interface PlaceCardProps {
  item: any;
  onPress: (id: string) => void;
  isViewed: boolean;
  ratingValue: number | null;  // ← ДОБАВЬ ЭТО
  yandexMapId?: string;        // ← ДОБАВЬ ЭТО
}

export const PlaceCard = ({ item, onPress, isViewed, ratingValue, yandexMapId }: PlaceCardProps) => {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const nextPhoto = (e: any) => {
    e.stopPropagation();
    if (item.photos && item.photos.length > 1) {
      setActivePhotoIndex((prev) => 
        prev === item.photos.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevPhoto = (e: any) => {
    e.stopPropagation();
    if (item.photos && item.photos.length > 1) {
      setActivePhotoIndex((prev) => 
        prev === 0 ? item.photos.length - 1 : prev - 1
      );
    }
  };

  const formatRating = () => {
    if (ratingValue === null || ratingValue === undefined) return '';
    return `${ratingValue.toFixed(1)}★`;
  };

  // Для отладки
  console.log('PlaceCard:', {
    name: item.name,
    yandexMapId,
    ratingValue,
    externalRating: item.external_rating
  });

  return (
    <TouchableOpacity 
      style={styles.placeCard}
      onPress={() => onPress(item.id)}
    >
      <View style={styles.photosContainer}>
        {item.photos && item.photos.length > 0 ? (
          <View style={styles.photoScrollContainer}>
            <Image 
              source={{ uri: pb.files.getURL(item, item.photos[activePhotoIndex]) }}
              style={styles.photo}
              resizeMode="cover"
            />
            
            {/* Индикатор просмотренного места */}
            {isViewed && (
              <View style={styles.viewedBadge}>
                <Text style={styles.viewedBadgeText}>👁️</Text>
              </View>
            )}
            
            {/* Бейдж рейтинга - ПОКАЗЫВАЕМ ЕСЛИ ЕСТЬ ratingValue */}
            {ratingValue !== null && ratingValue !== undefined && ratingValue > 0 && (
              <View style={[
                styles.ratingBadge,
                ratingValue === 0 && styles.ratingBadgeZero
              ]}>
                <Text style={styles.ratingBadgeText}>{formatRating()}</Text>
              </View>
            )}
            
            {/* Если есть yandex_map_id, но нет рейтинга - можно показать другой значок */}
            {yandexMapId && (ratingValue === null || ratingValue === undefined || ratingValue === 0) && (
              <View style={styles.loadingRatingBadge}>
                <Text style={styles.loadingRatingBadgeText}>★ ?</Text>
              </View>
            )}
            
            {item.photos.length > 1 && (
              <>
                <TouchableOpacity style={styles.photoNavButtonLeft} onPress={prevPhoto}>
                  <Text style={styles.photoNavText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoNavButtonRight} onPress={nextPhoto}>
                  <Text style={styles.photoNavText}>›</Text>
                </TouchableOpacity>
                
                <View style={styles.photoIndicators}>
                  {item.photos.map((_: any, index: number) => (
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
            )}
          </View>
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: '#72383D' }]}>
            <Text style={styles.photoPlaceholderText}>📸</Text>
            {/* Индикатор просмотренного места для placeholder */}
            {isViewed && (
              <View style={styles.viewedBadge}>
                <Text style={styles.viewedBadgeText}>👁️</Text>
              </View>
            )}
            {/* Бейдж рейтинга для placeholder */}
            {ratingValue !== null && ratingValue !== undefined && ratingValue > 0 && (
              <View style={[
                styles.ratingBadge,
                ratingValue === 0 && styles.ratingBadgeZero
              ]}>
                <Text style={styles.ratingBadgeText}>{formatRating()}</Text>
              </View>
            )}
            {/* Если есть yandex_map_id, но нет рейтинга */}
            {yandexMapId && (ratingValue === null || ratingValue === undefined || ratingValue === 0) && (
              <View style={styles.loadingRatingBadge}>
                <Text style={styles.loadingRatingBadgeText}>★ ?</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.placeInfo}>
        <Text style={styles.placeName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.placeDescription} numberOfLines={1}>{item.description}</Text>
        <View style={styles.ratingContainer}>
          {/* ТОЛЬКО КАТЕГОРИЯ */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.expand?.category?.name || 'Другие места'}</Text>
          </View>
        </View>
        <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  placeCard: {
    width: 280,
    backgroundColor: 'white',
    borderRadius: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  photosContainer: {
    height: 160,
    position: 'relative',
  },
  photoScrollContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  viewedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(114, 56, 61, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  viewedBadgeText: {
    fontSize: 12,
    color: 'white',
    fontFamily: 'Banshrift',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  ratingBadgeZero: {
    backgroundColor: 'rgba(128, 128, 128, 0.9)',
  },
  ratingBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
  loadingRatingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(100, 100, 100, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  loadingRatingBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
  photoNavButtonLeft: {
    position: 'absolute',
    left: 5,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  photoNavButtonRight: {
    position: 'absolute',
    right: 5,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  photoNavText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Banshrift',
  },
  photoIndicators: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  photoIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 2,
  },
  photoIndicatorActive: {
    backgroundColor: 'white',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photoPlaceholderText: {
    fontSize: 32,
    color: 'white',
    fontFamily: 'Banshrift',
  },
  placeInfo: {
    padding: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#72383D',
    marginBottom: 6,
    fontFamily: 'Banshrift',
  },
  placeDescription: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
    fontFamily: 'Banshrift',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#72383D',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
    fontFamily: 'Banshrift',
  },
  address: {
    fontSize: 12,
    color: '#000000',
    fontFamily: 'Banshrift',
  },
});