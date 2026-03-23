// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "117606791356982682326",
  authDomain: "cards-ecommerce-9f829.firebaseapp.com",
  projectId: "cards-ecommerce-9f829",
  storageBucket: "cards-ecommerce-9f829.firebasestorage.app",
  messagingSenderId: "117606791356", // You might need to add this
  appId: "1:117606791356:web:117606791356" // You might need to add this
};

// Check if all required config values are present
const requiredConfig = ['apiKey', 'authDomain', 'projectId'];
const missingConfig = requiredConfig.filter(key => !firebaseConfig[key]);

if (missingConfig.length > 0) {
  console.error('❌ Missing Firebase configuration:', missingConfig);
  throw new Error('Firebase configuration is incomplete');
}

// Initialize Firebase
console.log('🚀 Initializing Firebase...');
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth and get a reference to the service
const auth = getAuth(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Optional: Add scopes if needed
googleProvider.addScope('email');
googleProvider.addScope('profile');

console.log('✅ Firebase initialized successfully');

export { auth, googleProvider };
export default app;