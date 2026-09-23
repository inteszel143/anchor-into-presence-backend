import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import serviceAccountJson from './serviceAccountKey.json';
// Cast the imported JSON as ServiceAccount
const serviceAccount = serviceAccountJson as ServiceAccount;

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const messaging = getMessaging();
