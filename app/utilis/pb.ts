import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'http://192.168.1.10:8090';
console.log('PocketBase URL:', POCKETBASE_URL);

export const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

export default pb;