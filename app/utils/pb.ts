import PocketBase from 'pocketbase';
import { Platform } from 'react-native';

// ============================================
// НАСТРОЙКИ
// ============================================
const POCKETBASE_URL = 'https://pocketbase-production-e951.up.railway.app';

// ============================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ ЛОГИРОВАНИЯ
// ============================================
let connectionStatus = 'не проверено';
let superusersExist = null;

// ============================================
// ИНИЦИАЛИЗАЦИЯ POCKETBASE
// ============================================
console.log('\n🔷🔷🔷 ИНИЦИАЛИЗАЦИЯ POCKETBASE 🔷🔷🔷');
console.log(`📅 Время: ${new Date().toLocaleString()}`);
console.log(`📱 Платформа: ${Platform.OS}`);
console.log(`🌐 URL: ${POCKETBASE_URL}`);
console.log(`🔧 Режим разработки: ${__DEV__ ? 'Да' : 'Нет'}`);

export const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

// ============================================
// ФУНКЦИЯ 1: ПРОВЕРКА ПОДКЛЮЧЕНИЯ К СЕРВЕРУ
// ============================================
export const testServerConnection = async () => {
  console.log('\n📡 ФУНКЦИЯ: testServerConnection()');
  console.log(`🔗 Полный URL: ${POCKETBASE_URL}/api/health`);
  
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${POCKETBASE_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    const endTime = Date.now();
    
    console.log(`⏱️ Время ответа: ${endTime - startTime} мс`);
    console.log(`📊 HTTP статус: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅✅✅ СЕРВЕР ДОСТУПЕН! ✅✅✅');
      console.log(`📦 Ответ сервера:`, data);
      connectionStatus = 'доступен';
      return { success: true, data, status: response.status };
    } else {
      console.log(`❌ Сервер вернул ошибку: ${response.status}`);
      connectionStatus = `ошибка ${response.status}`;
      return { success: false, error: `HTTP ${response.status}`, status: response.status };
    }
  } catch (err) {
    const error = err as Error;
    const endTime = Date.now();
    console.error(`❌❌❌ ОШИБКА ПОДКЛЮЧЕНИЯ ❌❌❌`);
    console.error(`⏱️ Время до ошибки: ${endTime - startTime} мс`);
    console.error(`🔴 Тип ошибки: ${error.name}`);
    console.error(`🔴 Сообщение: ${error.message}`);
    
    if (error.name === 'AbortError') {
      console.error('⏰ Таймаут! Сервер не отвечает на запрос.');
      connectionStatus = 'таймаут';
    } else if (error.message.includes('Network request failed')) {
      console.error('🌐 Сетевая ошибка!');
      console.error('💡 Возможные причины:');
      console.error('   1. Railway сервер не запущен или спит');
      console.error('   2. Неправильный URL');
      console.error('   3. Нет интернета на устройстве/эмуляторе');
      console.error('   4. Брандмауэр блокирует соединение');
      connectionStatus = 'сетевая ошибка';
    } else {
      connectionStatus = `ошибка: ${error.message}`;
    }
    
    return { success: false, error: error.message, name: error.name };
  }
};

// ============================================
// ФУНКЦИЯ 2: ПРОВЕРКА НАЛИЧИЯ БАЗЫ ДАННЫХ
// ============================================
export const checkDatabase = async () => {
  console.log('\n🗄️ ФУНКЦИЯ: checkDatabase()');
  
  try {
    const response = await fetch(`${POCKETBASE_URL}/api/collections`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log(`📊 Статус запроса коллекций: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      const collections = data.items || [];
      console.log(`📚 Найдено коллекций: ${collections.length}`);
      if (collections.length > 0) {
        console.log(`📋 Список коллекций:`, collections.map((c: { name: string }) => c.name).join(', '));
      }
      return { success: true, collections: collections };
    } else {
      console.log(`❌ Не удалось получить коллекции: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (err) {
    const error = err as Error;
    console.error(`❌ Ошибка при проверке БД: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// ============================================
// ФУНКЦИЯ 3: ПРОВЕРКА СУЩЕСТВУЮЩИХ ПОЛЬЗОВАТЕЛЕЙ
// ============================================
export const checkExistingUsers = async () => {
  console.log('\n👤 ФУНКЦИЯ: checkExistingUsers()');
  
  const testCredentials = [
    { email: 'admin@momdontlose.com', password: 'admin123' },
    { email: 'admin@railway.com', password: 'test123' },
    { email: 'melkaya.elka26@yandex.ru', password: '859Ri.52' },
  ];
  
  for (const cred of testCredentials) {
    try {
      console.log(`🔑 Пробуем войти как: ${cred.email}`);
      const result = await pb.admins.authWithPassword(cred.email, cred.password);
      console.log(`✅ Вход выполнен! Пользователь существует: ${cred.email}`);
      superusersExist = true;
      return { success: true, email: cred.email };
    } catch (err) {
      const error = err as Error;
      console.log(`❌ Не удалось войти как ${cred.email}: ${error.message}`);
    }
  }
  
  try {
    const response = await fetch(`${POCKETBASE_URL}/api/admins`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    console.log(`📊 Статус запроса админов: ${response.status}`);
    if (response.status === 200) {
      const data = await response.json();
      console.log(`📊 Количество админов: ${data.items?.length || 0}`);
    }
  } catch (err) {
    const error = err as Error;
    console.log(`❌ Не удалось получить список админов: ${error.message}`);
  }
  
  superusersExist = false;
  return { success: false };
};

// ============================================
// ФУНКЦИЯ 4: ПОЛНАЯ ДИАГНОСТИКА
// ============================================
export const runFullDiagnostic = async () => {
  console.log('\n🔬🔬🔬 ПОЛНАЯ ДИАГНОСТИКА 🔬🔬🔬');
  console.log(`🕐 Время диагностики: ${new Date().toLocaleString()}`);
  console.log(`🌐 URL хоста: ${POCKETBASE_URL}\n`);
  
  console.log('【 ШАГ 1/3 】Проверка соединения с сервером...');
  const connection = await testServerConnection();
  if (!connection.success) {
    console.log('\n❌❌❌ ДИАГНОСТИКА НЕ УДАЛАСЬ: НЕТ СОЕДИНЕНИЯ С СЕРВЕРОМ ❌❌❌');
    console.log(`💡 РЕЗУЛЬТАТ: Приложение не может связаться с PocketBase по адресу ${POCKETBASE_URL}`);
    return { success: false, stage: 'connection' };
  }
  
  console.log('\n【 ШАГ 2/3 】Проверка наличия базы данных...');
  const database = await checkDatabase();
  if (!database.success) {
    console.log('\n⚠️ ДИАГНОСТИКА: СЕРВЕР ДОСТУПЕН, НО БАЗА ДАННЫХ НЕ НАЙДЕНА');
    return { success: false, stage: 'database', connection: connection };
  }
  
  console.log('\n【 ШАГ 3/3 】Проверка существующих пользователей...');
  const users = await checkExistingUsers();
  
  console.log('\n🔬🔬🔬 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ 🔬🔬🔬');
  console.log(`✅ Соединение с сервером: ${connection.success ? 'ДА' : 'НЕТ'}`);
  console.log(`✅ База данных (коллекции): ${database.success ? `ДА (${database.collections?.length} коллекций)` : 'НЕТ'}`);
  console.log(`✅ Существующие пользователи: ${users.success ? `ДА (${users.email})` : 'НЕТ'}`);
  
  if (connection.success && database.success && users.success) {
    console.log('\n🎉🎉🎉 ВСЁ РАБОТАЕТ! 🎉🎉🎉');
  } else if (connection.success && database.success && !users.success) {
    console.log('\n⚠️⚠️⚠️ НЕТ СУПЕРПОЛЬЗОВАТЕЛЕЙ ⚠️⚠️⚠️');
  } else if (connection.success && !database.success) {
    console.log('\n⚠️⚠️⚠️ БАЗА ДАННЫХ ПУСТА ⚠️⚠️⚠️');
  }
  
  return {
    success: connection.success && database.success && users.success,
    connection: connection.success,
    database: database.success,
    users: users.success,
    collectionsCount: database.collections?.length || 0,
    existingUser: users.email || null,
  };
};

// ============================================
// АВТОМАТИЧЕСКИЙ ЗАПУСК ДИАГНОСТИКИ
// ============================================
setTimeout(() => {
  runFullDiagnostic().then(result => {
    console.log('\n🏁 Диагностика завершена.');
  });
}, 2000);

console.log('✅ PocketBase инициализирован, диагностика запустится через 2 секунды\n');

export default pb;