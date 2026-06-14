import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { initializeFirestore } from "firebase/firestore";

const fallbackFirebaseConfig = {
  apiKey: "AIzaSyAAxQ3vrQ6Sfsh9ZRutQn0xz9WofMvFgGE",
  authDomain: "kanokna.web.app",
  projectId: "window-door-store-20260215",
  storageBucket: "window-door-store-20260215.firebasestorage.app",
  messagingSenderId: "1036410179381",
  appId: "1:1036410179381:web:c542a5fd73c5913317467c"
} as const;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? fallbackFirebaseConfig.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fallbackFirebaseConfig.authDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? fallbackFirebaseConfig.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? fallbackFirebaseConfig.storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? fallbackFirebaseConfig.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? fallbackFirebaseConfig.appId
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const functions = getFunctions(app);
// Optional fields are common in our calculator payloads; ignoreUndefinedProperties prevents writes from failing
// when some nested keys are intentionally omitted.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
