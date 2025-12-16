
import PocketBase from 'pocketbase';

// Используйте ваш IP из ipconfig
const POCKETBASE_URL = 'http://10.157.123.175:8090';

export const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

console.log(`Подключение к PocketBase по адресу: ${POCKETBASE_URL}`);
export default pb;