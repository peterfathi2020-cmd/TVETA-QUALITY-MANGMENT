import dotenv from 'dotenv';
dotenv.config({ override: true });

console.log("PROJECT_ID:", process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT);
console.log("VITE_FIREBASE_PROJECT_ID:", process.env.VITE_FIREBASE_PROJECT_ID);
console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
