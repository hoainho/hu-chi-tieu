import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  initializeFirestore,
  enableNetwork, 
  disableNetwork, 
  connectFirestoreEmulator
} from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Your web app's Firebase configuration
// IMPORTANT: Replace these placeholder values with your own Firebase project's configuration
// Go to your Firebase project settings > General > Your apps > Firebase SDK snippet > Config
const firebaseConfig = {
  apiKey: "AIzaSyBoB0wT6P8__yOjMqUyquxrl4kMdqtDWWE",
  authDomain: "finance-management-34286.firebaseapp.com",
  projectId: "finance-management-34286",
  storageBucket: "finance-management-34286.appspot.com",
  messagingSenderId: "231226585615",
  appId: "1:231226585615:web:7b5eed14c22c08de00e97a",
  measurementId: "G-QL8SGJN0K2"
};


/**
 * Checks if the Firebase configuration has been updated from its placeholder values.
 * @returns {boolean} True if the config seems to be set, false otherwise.
 */
export const isFirebaseConfigured = (): boolean => {
  // Check if all required fields are present and not placeholder values
  return firebaseConfig.apiKey !== "YOUR_API_KEY" && 
         firebaseConfig.projectId !== "YOUR_PROJECT_ID" &&
         firebaseConfig.apiKey.length > 0 &&
         firebaseConfig.projectId.length > 0;
};

// Initialize Firebase App
let app;
let db;
let auth;

try {
  if (isFirebaseConfigured()) {
    console.log('Initializing Firebase...');
    app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized');
    
    // Initialize Firestore with cache settings (replaces deprecated enableIndexedDbPersistence)
    try {
      db = initializeFirestore(app, {
        localCache: {
          kind: 'persistent'
        }
      });
      console.log('Firestore initialized with persistent cache');
    } catch (firestoreError) {
      console.warn('Failed to initialize Firestore with cache, falling back to default:', firestoreError);
      db = getFirestore(app);
    }
    
    auth = getAuth(app);
    console.log('Firebase auth initialized');
    console.log('Firebase initialized successfully');
  } else {
    console.error('Firebase configuration is incomplete');
    throw new Error('Firebase configuration is incomplete');
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  // Don't throw error, set auth to null so app can handle it gracefully
  auth = null;
  db = null;
}

// Initialize offline persistence
export const initializeOfflineSupport = async () => {
  if (!db) {
    console.warn('Database not initialized, skipping offline support');
    return;
  }

  try {
    // Use new cache settings instead of deprecated enableIndexedDbPersistence
    // This is handled in initializeFirestore with cache settings
    console.log('Offline persistence enabled via cache settings');
    
    // Handle online/offline events
    const handleOnline = () => {
      console.log('App came online, enabling network');
      enableNetwork(db).catch(console.error);
    };
    
    const handleOffline = () => {
      console.log('App went offline, disabling network');
      disableNetwork(db).catch(console.error);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial network state
    if (!navigator.onLine) {
      await disableNetwork(db);
    }
    
  } catch (error) {
    console.warn('Offline persistence failed:', error);
    // This is expected if multiple tabs are open
    if (error instanceof Error && error.message.includes('already enabled')) {
      console.log('Offline persistence already enabled in another tab');
    }
  }
};

// Network management functions
export const enableFirestoreNetwork = async () => {
  if (db) {
    try {
      await enableNetwork(db);
      console.log('Firestore network enabled');
    } catch (error) {
      console.error('Failed to enable Firestore network:', error);
    }
  }
};

export const disableFirestoreNetwork = async () => {
  if (db) {
    try {
      await disableNetwork(db);
      console.log('Firestore network disabled');
    } catch (error) {
      console.error('Failed to disable Firestore network:', error);
    }
  }
};

// Development emulator connection
export const connectToEmulators = () => {
  if (process.env.NODE_ENV === 'development' && !window.location.hostname.includes('localhost')) {
    return; // Only connect to emulators in development on localhost
  }
  
  try {
    if (db && !db._delegate._databaseId.projectId.includes('demo-')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('Connected to Firestore emulator');
    }
    
    if (auth && !auth.config.apiKey.includes('demo-')) {
      connectAuthEmulator(auth, 'http://localhost:9099');
      console.log('Connected to Auth emulator');
    }
  } catch (error) {
    console.warn('Failed to connect to emulators:', error);
  }
};

// Export the initialized services
export { auth };
export default db;