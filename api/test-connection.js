// Direct MongoDB connection test for Vercel serverless function
const mongoose = require('mongoose');

module.exports = async (req, res) => {
  // Get MongoDB URI from environment
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    return res.status(500).json({
      error: 'MONGODB_URI environment variable is not set',
      timestamp: new Date()
    });
  }
  
  // Connection options
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4 // Force IPv4
  };
  
  try {
    // Connect to MongoDB
    console.log('Attempting to connect to MongoDB from serverless function...');
    await mongoose.connect(MONGODB_URI, options);
    
    // Check connection status
    const connected = mongoose.connection.readyState === 1;
    
    if (connected) {
      // Try to ping the database
      await mongoose.connection.db.admin().ping();
      
      // List collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      // Close connection
      await mongoose.connection.close();
      
      return res.status(200).json({
        status: 'success',
        message: 'Successfully connected to MongoDB',
        connected: true,
        collections: collectionNames,
        timestamp: new Date()
      });
    } else {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to establish MongoDB connection',
        connected: false,
        connectionState: mongoose.connection.readyState,
        timestamp: new Date()
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
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
      timestamp: new Date()
    });
  }
};