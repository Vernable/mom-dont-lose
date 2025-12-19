
import PocketBase from 'pocketbase';

// Используйте ваш IP из ipconfig
//const POCKETBASE_URL = 'http://10.157.123.175:8090';
// Используйте ваш IP из ipconfig

//const POCKETBASE_URL = 'http://192.168.0.107:8090';  // ← Изменил с 10.157.123.175 на 192.168.0.107
// Используйте ваш текущий IP из ipconfig
const POCKETBASE_URL = 'http://192.168.0.107:8090'; // ← Правильный IP

export const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

console.log(`Подключение к PocketBase по адресу: ${POCKETBASE_URL}`);
export default pb;   


