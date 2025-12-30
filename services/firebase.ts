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
  // Note: We avoid checking 'typeof process' explicitly to allow Vite's string replacement to work effectively.
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env.FIREBASE_API_KEY) {
     // @ts-ignore
     return process.env.FIREBASE_API_KEY;
  }

  // 3. Fallback for replacement injection if process.env object isn't present but direct string replacement happened
  // This looks weird but Vite might replace 'process.env.FIREBASE_API_KEY' with the string literal.
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
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.warn('Firestore persistence not supported by browser');
    }
  });
} catch (e) {
  console.log("Persistence initialization skipped");
}

export default app;