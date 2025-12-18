// utils/yandexService.ts (исправленная версия)
import { parseYandexRatingFromHTML } from './yandexParser';

export const fetchYandexRating = async (yandexMapId: string): Promise<{rating: number, reviews: number} | null> => {
  console.log('🚀 Начинаем поиск рейтинга для ID:', yandexMapId);
  
  // Способ 1: Пробуем парсить HTML (более надежно)
  console.log('🔄 Пробуем парсинг HTML...');
  const htmlRating = await parseYandexRatingFromHTML(yandexMapId);
  
  if (htmlRating) {
    console.log('✅ Успешно получен рейтинг из HTML');
    return htmlRating;
  }
  
  console.log('❌ Парсинг HTML не дал результатов');
  
  // Способ 2: Пробуем API (менее надежно)
  console.log('🔄 Пробуем API Яндекс...');
  try {
    const apiUrl = `https://yandex.ru/maps/api/business?oid=${yandexMapId}`;
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('API ответ:', data);
      
      if (data?.data?.rating) {
        return {
          rating: data.data.rating,
          reviews: data.data.reviews || 0
        };
      }
    }
  } catch (apiError) {
    console.log('API запрос не удался:', apiError);
  }
  
  console.log('❌ Все методы не сработали');
  return null;
};