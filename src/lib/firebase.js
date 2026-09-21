// Firebase setup. If no keys are in .env the app runs in "local demo mode"
// (see store.js) so the team can work before Firebase is configured.
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

export const app = firebaseEnabled ? initializeApp(config) : null;

// Persistent local cache = Firestore's built-in offline mode. Writes made with
// no network are kept on the phone and uploaded automatically when it returns.
export const db = firebaseEnabled
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    })
  : null;

export const auth = firebaseEnabled ? getAuth(app) : null;
