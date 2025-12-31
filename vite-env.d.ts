declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    GEMINI_API_KEY: string;
    FIREBASE_API_KEY: string;
    VITE_FIREBASE_API_KEY: string;
    NODE_ENV: string;
    [key: string]: string | undefined;
  }
}
