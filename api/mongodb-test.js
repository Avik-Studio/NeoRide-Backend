// Simple MongoDB connection test for Vercel serverless function
const mongoose = require('mongoose');

module.exports = async (req, res) => {
  // Get MongoDB URI from environment
  const MONGODB_URI = process.env.MONGODB_URI;
  
  // Basic response with environment info
  const envInfo = {
    nodeEnv: process.env.NODE_ENV || 'Not set',
    mongodbUri: MONGODB_URI ? 'Set (hidden)' : 'Not set',
    vercel: process.env.VERCEL === '1' ? 'Running on Vercel' : 'Not on Vercel',
    region: process.env.VERCEL_REGION || 'Unknown',
    timestamp: new Date()
  };
  
  if (!MONGODB_URI) {
    return res.status(500).json({
      status: 'error',
      message: 'MONGODB_URI environment variable is not set',
      environment: envInfo
    });
  }
  
  // Connection options
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000
  };
  
  try {
    // Connect to MongoDB
    console.log('Attempting direct MongoDB connection...');
    const connection = await mongoose.connect(MONGODB_URI, options);
    
    // Check connection status
    const connected = mongoose.connection.readyState === 1;
    
    if (connected) {
      // Try to ping the database
      await mongoose.connection.db.admin().ping();
      
      // Close connection
      await mongoose.connection.close();
      
      return res.status(200).json({
        status: 'success',
        message: 'Successfully connected to MongoDB',
        connected: true,
        environment: envInfo
      });
    } else {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to establish MongoDB connection',
        connected: false,
        connectionState: mongoose.connection.readyState,
        environment: envInfo
      });
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // Try to close connection if it exists
    try {
      if (mongoose.connection) {
        await mongoose.connection.close();
      }
    } catch (closeError) {
      console.error('Error closing connection:', closeError);
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'MongoDB connection error',
      error: error.message,
      environment: envInfo
    });
  }
};