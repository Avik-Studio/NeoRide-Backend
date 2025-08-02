/**
 * MongoDB Direct Connection Test
 * This script tests the connection to MongoDB directly without going through the API
 * Run this with: node test-mongodb.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Get MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://avikmodak83:Avik%402005@cluster0.vvhbnvm.mongodb.net/NeoRide?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔍 Testing Direct MongoDB Connection\n');
console.log(`MongoDB URI: ${MONGODB_URI.substring(0, 20)}...`);

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4 // Force IPv4
};

// Connect to MongoDB
console.log('Attempting to connect to MongoDB...');

mongoose.connect(MONGODB_URI, options)
  .then(async () => {
    console.log('✅ Successfully connected to MongoDB!');
    
    // Get connection status
    console.log(`Connection state: ${mongoose.connection.readyState}`);
    
    // Test database operations
    console.log('\nTesting database operations...');
    
    try {
      // Check if we can ping the database
      await mongoose.connection.db.admin().ping();
      console.log('✅ Database ping successful');
      
      // List collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`✅ Found ${collections.length} collections:`);
      collections.forEach(collection => {
        console.log(`   - ${collection.name}`);
      });
      
      // Create a test schema and model
      const testSchema = new mongoose.Schema({
        name: String,
        createdAt: { type: Date, default: Date.now }
      });
      
      const TestModel = mongoose.model('ConnectionTest', testSchema);
      
      // Create a test document
      const testDoc = new TestModel({ name: 'Connection Test' });
      await testDoc.save();
      console.log('✅ Successfully created test document');
      
      // Find the test document
      const foundDoc = await TestModel.findOne({ name: 'Connection Test' });
      console.log(`✅ Successfully retrieved test document: ${foundDoc.name}`);
      
      // Delete the test document
      await TestModel.deleteOne({ _id: foundDoc._id });
      console.log('✅ Successfully deleted test document');
      
      console.log('\n🎉 All MongoDB operations successful!');
    } catch (error) {
      console.error('❌ Error during database operations:', error);
    }
    
    // Close the connection
    await mongoose.connection.close();
    console.log('\nConnection closed');
  })
  .catch(error => {
    console.error('❌ Failed to connect to MongoDB:', error);
    
    // Provide troubleshooting tips
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if your MongoDB Atlas cluster is running');
    console.log('2. Verify that your IP address is whitelisted in MongoDB Atlas');
    console.log('3. Ensure your connection string is correct');
    console.log('4. Check if your MongoDB user has the correct permissions');
    console.log('5. Try adding 0.0.0.0/0 to your IP whitelist in MongoDB Atlas');
  })
  .finally(() => {
    console.log('\nTest completed');
  });

// Also create a function to test the API (can be run separately)
async function testAPI() {
  console.log('\n\n🧪 Testing NeoRide API Integration...\n');
  
  const API_BASE_URL = 'http://localhost:3001/api';
  
  try {
    // Test Health Check
    console.log('Testing API Health Check...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData.message);
    console.log('   Connected:', healthData.connected);
    console.log('   Timestamp:', healthData.timestamp);
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('   Make sure the backend server is running: npm start');
  }
}

// Uncomment to also test the API
// setTimeout(testAPI, 1000);