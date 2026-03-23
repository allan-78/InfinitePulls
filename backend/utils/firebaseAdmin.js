const admin = require('firebase-admin');
const path = require('path');

// Load environment variables from backend/config/.env
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

console.log('🔧 Checking Firebase configuration...');

// Debug: Check if environment variables are loaded
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Loaded' : '❌ Missing');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ Loaded' : '❌ Missing');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ Loaded (' + process.env.FIREBASE_PRIVATE_KEY.length + ' chars)' : '❌ Missing');

// Check if all required environment variables are present
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY_ID', 
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_CLIENT_ID',
  'FIREBASE_CLIENT_CERT_URL'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing Firebase environment variables:', missingVars);
  throw new Error('Firebase configuration is incomplete');
}

// Fix private key formatting
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!privateKey || !privateKey.includes('BEGIN PRIVATE KEY')) {
  console.error('❌ Invalid private key format');
  throw new Error('Firebase private key is malformed');
}

// Initialize Firebase Admin with service account
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

try {
  console.log('🚀 Initializing Firebase Admin...');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  console.error('Error details:', error);
  throw error;
}

module.exports = admin;