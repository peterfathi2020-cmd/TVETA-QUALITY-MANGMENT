
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Retrieve API Key safely handling different environment configurations
const getFirebaseApiKey = () => {
  // 1. Try accessing via import.meta.env (Standard Vite) with safety check
  // Cast import.meta to any to avoid TypeScript errors if vite types are missing
  const meta = import.meta as any;
  if (meta && meta.env && meta.env.VITE_FIREBASE_API_KEY) {
    return meta.env.VITE_FIREBASE_API_KEY;
  }
  
  // 2. Try accessing via process.env (injected via define in vite.config.ts)
  // We use a direct check for the variable that Vite replaces at build time.
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env.FIREBASE_API_KEY) {
     // @ts-ignore
     return process.env.FIREBASE_API_KEY;
  }

  // 3. Fallback for replacement injection if process.env object isn't present but direct string replacement happened
  try {
     // @ts-ignore
     return process.env.FIREBASE_API_KEY;
  } catch {
     return undefined;
  }
};

const apiKey = getFirebaseApiKey() || "DUMMY_KEY_PLEASE_REPLACE_WITH_REAL_ONE";

// --- هام: قم بوضع بيانات مشروع Firebase الخاص بك هنا للربط الفعلي ---
// يمكنك الحصول عليها من: Firebase Console -> Project Settings -> General -> Your apps
const firebaseConfig = {
  apiKey: apiKey,
  authDomain: "tveta-quality.firebaseapp.com",
  projectId: "tveta-quality",
  storageBucket: "tveta-quality.firebasestorage.app",
  messagingSenderId: "826481498410",
  appId: "1:826481498410:web:0ab80195ae6510cc12a653",
  measurementId: "G-BG2T6510JC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Enable Offline Persistence (Real Cloud Feature)
// This keeps the app working if internet cuts off, then syncs when back online
// Wrapped in an async IIFE to handle errors without blocking app initialization
(async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log("Firestore persistence enabled");
  } catch (err: any) {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        // This is expected behavior, not a critical error.
        console.warn('Firestore persistence limited: Multiple tabs open. App will work in online mode in this tab.');
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore persistence not supported by this browser');
    }
  }
})();

export default app;
