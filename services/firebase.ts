import { initializeApp } from "firebase/app";
import { getFirestore, enableNetwork, disableNetwork } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('Firebase initialized successfully');
  } else {
    console.error('Firebase configuration is incomplete');
    throw new Error('Firebase configuration is incomplete');
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  throw error;
}

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

// Export the initialized services
export { auth };
export default db;