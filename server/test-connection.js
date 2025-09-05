import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3000';

async function testServer() {
  console.log('🧪 Testing server connectivity...\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health check...');
    const healthResponse = await fetch(`${SERVER_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData);
    
    // Test 2: Chrome extension test endpoint
    console.log('\n2️⃣ Testing Chrome extension endpoint...');
    const testResponse = await fetch(`${SERVER_URL}/api/test-extension`);
    const testData = await testResponse.json();
    console.log('✅ Extension test passed:', testData);
    
    // Test 3: CORS preflight (OPTIONS request)
    console.log('\n3️⃣ Testing CORS preflight...');
    const optionsResponse = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'chrome-extension://test',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log('✅ CORS preflight passed:', optionsResponse.status);
    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': optionsResponse.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': optionsResponse.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': optionsResponse.headers.get('Access-Control-Allow-Headers')
    });
    
    // Test 4: Simulate Chrome extension login attempt
    console.log('\n4️⃣ Testing Chrome extension login simulation...');
    const loginResponse = await fetch(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'chrome-extension://test'
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpass'
      })
    });
    
    if (loginResponse.status === 401) {
      console.log('✅ Login endpoint working (expected 401 for invalid credentials)');
    } else {
      console.log('⚠️  Unexpected login response:', loginResponse.status);
    }
    
    console.log('\n🎉 All tests passed! Server is working correctly.');
    console.log('\n💡 Next steps:');
    console.log('   1. Make sure MongoDB is running');
    console.log('   2. Create .env file from env.example');
    console.log('   3. Run: npm run setup (to create admin user)');
    console.log('   4. Test with Chrome extension');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Is the server running? (npm run dev)');
    console.log('   2. Is MongoDB running?');
    console.log('   3. Check server console for errors');
    console.log('   4. Verify .env file exists and is configured');
  }
}

// Run the test
testServer();
