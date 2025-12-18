// utils/maps.ts
import { Linking, Alert, Platform } from 'react-native';

/**
 * Открывает адрес в Яндекс Картах
 */
export const openInYandexMaps = async (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  
  // URL для Яндекс Карт
  const yandexMapsUrl = `yandexmaps://maps.yandex.ru/?text=${encodedAddress}`;
  
  // URL для веб-версии (если приложение не установлено)
  const webUrl = `https://maps.yandex.ru/?text=${encodedAddress}`;

  try {
    // Проверяем, установлено ли приложение Яндекс Карт
    const canOpenYandexMaps = await Linking.canOpenURL(yandexMapsUrl);
    
    if (canOpenYandexMaps) {
      // Показываем диалог подтверждения
      Alert.alert(
        'Открыть в картах',
        'Открыть адрес в Яндекс.Картах?',
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
                console.error('Ошибка открытия Яндекс Карт:', error);
                // Если не получилось, открываем веб-версию
                await Linking.openURL(webUrl);
              }
            },
          },
        ]
      );
    } else {
      // Если Яндекс Карты не установлены, открываем в браузере
      Alert.alert(
        'Яндекс.Карты не установлены',
        'Открыть адрес в браузере?',
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
    console.error('Ошибка проверки возможности открытия:', error);
    // В случае ошибки открываем веб-версию
    await Linking.openURL(webUrl);
  }
};

/**
 * Открывает карту с координатами
 */
export const openWithCoordinates = async (lat: number, lon: number, zoom: number = 15) => {
  const yandexMapsUrl = `yandexmaps://maps.yandex.ru/?ll=${lon},${lat}&z=${zoom}`;
  const webUrl = `https://maps.yandex.ru/?ll=${lon},${lat}&z=${zoom}`;

  try {
    const canOpenYandexMaps = await Linking.canOpenURL(yandexMapsUrl);
    
    if (canOpenYandexMaps) {
      Alert.alert(
        'Открыть в картах',
        'Открыть место в Яндекс.Картах?',
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
                console.error('Ошибка открытия Яндекс Карт:', error);
                await Linking.openURL(webUrl);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Яндекс.Карты не установлены',
        'Открыть карту в браузере?',
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
    await Linking.openURL(webUrl);
  }
};

/**
 * Строит маршрут от текущего местоположения
 */
export const buildRouteFromCurrentLocation = async (lat: number, lon: number) => {
  const yandexNaviUrl = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lon}`;
  const webUrl = `https://maps.yandex.ru/?rtext=~${lat},${lon}`;

  try {
    const canOpenYandexNavi = await Linking.canOpenURL(yandexNaviUrl);
    
    if (canOpenYandexNavi) {
      Alert.alert(
        'Построить маршрут',
        'Построить маршрут в Яндекс.Навигаторе?',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Построить',
            onPress: async () => {
              try {
                await Linking.openURL(yandexNaviUrl);
              } catch (error) {
                console.error('Ошибка открытия Яндекс.Навигатора:', error);
                await Linking.openURL(webUrl);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Яндекс.Навигатор не установлен',
        'Построить маршрут в браузере?',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Построить',
            onPress: async () => {
              await Linking.openURL(webUrl);
            },
          },
        ]
      );
    }
  } catch (error) {
    console.error('Ошибка:', error);
    await Linking.openURL(webUrl);
  }
};