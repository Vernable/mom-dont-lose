
import PocketBase from 'pocketbase';


//const POCKETBASE_URL = 'http://10.157.123.175:8090';
//const POCKETBASE_URL = 'http:// 192.168.0.105:8090';
 
//const POCKETBASE_URL = 'http://192.168.0.107:8090'; 
0
//const POCKETBASE_URL = 'http://192.168.0.107:8090';
//const POCKETBASE_URL = 'http://172.19.65.175:8090';
const POCKETBASE_URL = 'http://192.168.1.55:8090';
export const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

console.log(`Подключение к PocketBase по адресу: ${POCKETBASE_URL}`);
export default pb;   


