/**
 * NeoRide Backend API Deployment Verification Script
 * This script checks if your Vercel-deployed API is working correctly
 */

const https = require('https');
const fs = require('fs');

// Configuration - Replace with your actual Vercel deployment URL
let VERCEL_URL = 'https://your-vercel-deployment-url.vercel.app';

// Try to read the URL from a config file if it exists
try {
  if (fs.existsSync('./deployment-config.json')) {
    const config = JSON.parse(fs.readFileSync('./deployment-config.json', 'utf8'));
    if (config.vercelUrl) {
      VERCEL_URL = config.vercelUrl;
    }
  }
} catch (error) {
  console.error('Error reading config file:', error.message);
}

const ENDPOINTS = [
  '/',
  '/api/health',
  '/api/debug',
  '/api/stats'
];

console.log('🧪 Verifying NeoRide Backend API Deployment...');
console.log(`🔗 Testing endpoints on ${VERCEL_URL}`);
console.log('-----------------------------------');

// Function to make a GET request to an endpoint
function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${VERCEL_URL}${endpoint}`;
    
    const req = https.get(url, (res) => {
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
    
    req.setTimeout(10000);
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
      
      // For health check, verify MongoDB connection
      if (endpoint === '/api/health' && result.data) {
        const connected = result.data.connected;
        if (connected) {
          console.log('   💾 MongoDB connection: ✅ Connected');
        } else {
          console.log('   💾 MongoDB connection: ❌ Not connected');
          console.log(`   Error: ${result.data.error || 'Unknown error'}`);
        }
      }
      
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
    console.log('\n🎉 All tests passed! Your API deployment is working correctly.');
    
    // Check MongoDB connection specifically
    const healthResult = results.find(r => r.endpoint === '/api/health');
    if (healthResult && healthResult.data && healthResult.data.connected) {
      console.log('💾 MongoDB connection is working properly.');
    } else {
      console.log('⚠️ MongoDB connection may have issues. Check the health endpoint for details.');
    }
    
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.');
  }
  
  // Environment variables reminder
  console.log('\n' + '='.repeat(50));
  console.log('🔧 CRITICAL: Make sure these are set in Vercel Dashboard:');
  console.log('');
  console.log('MONGODB_URI = mongodb+srv://avikmodak83:Avik%402005@cluster0.vvhbnvm.mongodb.net/NeoRide?retryWrites=true&w=majority&appName=Cluster0');
  console.log('NODE_ENV = production');
  console.log('');
  console.log('⚠️  Add these to ALL environments: Production, Preview, Development');
  console.log('='.repeat(50));
}

// Run the tests
runTests();