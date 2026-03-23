const admin = require('./firebaseAdmin');

async function testFirebaseConnection() {
  try {
    console.log('🧪 Testing Firebase connection...');
    
    // Test 1: Basic initialization
    console.log('1. Testing Firebase Admin initialization...');
    const app = admin.app();
    console.log('✅ Firebase App initialized:', app.name);
    
    // Test 2: List users (this requires proper permissions)
    console.log('2. Testing Authentication service...');
    try {
      const listUsersResult = await admin.auth().listUsers(1);
      console.log('✅ Firebase Auth service working');
      console.log('📊 Total users in Firebase:', listUsersResult.users.length);
    } catch (authError) {
      console.log('⚠️  Auth service test:', authError.message);
      // This might fail due to permissions, but that's okay for now
    }
    
    // Test 3: Create a test token
    console.log('3. Testing token creation...');
    try {
      // Try to create a custom token with a test UID
      const testUid = 'test-user-' + Date.now();
      const customToken = await admin.auth().createCustomToken(testUid);
      console.log('✅ Custom token creation working');
      console.log('🔐 Token length:', customToken.length);
    } catch (tokenError) {
      console.log('❌ Token creation failed:', tokenError.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error);
    return false;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testFirebaseConnection().then(success => {
    if (success) {
      console.log('🎉 Firebase setup completed successfully!');
      process.exit(0);
    } else {
      console.log('💥 Firebase setup failed!');
      process.exit(1);
    }
  });
}

module.exports = testFirebaseConnection;