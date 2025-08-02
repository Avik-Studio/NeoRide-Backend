const http = require('http');

// Configuration
const API_HOST = 'localhost';
const API_PORT = 3001;
const ENDPOINTS = [
  '/',
  '/api/health',
  '/api/debug',
  '/api/stats'
];

console.log('🧪 Testing NeoRide Backend API...');
console.log(`🔗 Testing endpoints on http://${API_HOST}:${API_PORT}`);
console.log('-----------------------------------');

// Function to make a GET request to an endpoint
function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: endpoint,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            endpoint,
            status: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            endpoint,
            status: res.statusCode,
            error: 'Invalid JSON response',
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({
        endpoint,
        status: 'ERROR',
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.abort();
      resolve({
        endpoint,
        status: 'TIMEOUT',
        error: 'Request timed out'
      });
    });
    
    req.end();
  });
}

// Test all endpoints
async function runTests() {
  const results = [];
  
  for (const endpoint of ENDPOINTS) {
    console.log(`🔍 Testing endpoint: ${endpoint}`);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.status === 200) {
      console.log(`✅ ${endpoint} - Status: ${result.status}`);
    } else {
      console.log(`❌ ${endpoint} - Status: ${result.status} - Error: ${result.error || 'Unknown error'}`);
    }
    console.log('-----------------------------------');
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  const successful = results.filter(r => r.status === 200).length;
  console.log(`✅ Successful: ${successful}/${ENDPOINTS.length}`);
  console.log(`❌ Failed: ${ENDPOINTS.length - successful}/${ENDPOINTS.length}`);
  
  if (successful === ENDPOINTS.length) {
    console.log('\n🎉 All tests passed! Your API is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.');
  }
}

// Run the tests
runTests();