const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ========== Middleware ==========
// Configure CORS to allow requests from all origins (for Vercel deployment)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ========== MongoDB Setup ==========
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/NeoRide';

// Enable command buffering for better reliability in serverless environments
mongoose.set('bufferCommands', true);

// MongoDB Connection with improved error handling for Vercel
let cachedDb = null;
let connectionAttempts = 0;
const MAX_ATTEMPTS = 3;

async function connectToDatabase() {
  // If we already have a connection and it's ready, use it
  if (cachedDb && mongoose.connection.readyState === 1) {
    console.log('Using cached database connection');
    return cachedDb;
  }
  
  // If we've tried too many times, throw an error
  if (connectionAttempts >= MAX_ATTEMPTS) {
    throw new Error(`Failed to connect to MongoDB after ${MAX_ATTEMPTS} attempts`);
  }
  
  connectionAttempts++;
  console.log(`Connecting to MongoDB... (Attempt ${connectionAttempts}/${MAX_ATTEMPTS})`);
  
  // Check if MongoDB URI is set
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is not set!');
    throw new Error('MongoDB URI is not configured. Please set MONGODB_URI environment variable.');
  }
  
  console.log('MongoDB URI is configured');
  
  // Set mongoose options for better reliability
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // Increased timeout
    socketTimeoutMS: 45000,
    family: 4 // Force IPv4
  };

  try {
    // Disconnect if there's an existing connection in a bad state
    if (mongoose.connection.readyState !== 0) {
      console.log(`Closing existing MongoDB connection (state: ${mongoose.connection.readyState})`);
      await mongoose.disconnect();
    }
    
    // Connect to MongoDB
    const client = await mongoose.connect(MONGODB_URI, options);
    cachedDb = client;
    console.log('✅ Connected to MongoDB successfully');
    
    // Reset connection attempts on success
    connectionAttempts = 0;
    
    // Add connection event listeners
    mongoose.connection.on('disconnected', () => {
      console.log('❌ MongoDB disconnected');
      cachedDb = null;
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      cachedDb = null;
    });
    
    return client;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    cachedDb = null;
    
    // If we haven't reached max attempts, try again after a delay
    if (connectionAttempts < MAX_ATTEMPTS) {
      console.log(`Will retry connection in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return connectToDatabase(); // Recursive retry
    }
    
    throw error;
  }
}

// Connect to MongoDB at startup
console.log('Initiating MongoDB connection at startup...');
connectToDatabase()
  .then(() => console.log('Initial MongoDB connection established'))
  .catch(err => console.error('Failed to establish initial MongoDB connection:', err));

// Mongoose error listener
mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose runtime error:', err);
});

// ========== Schemas & Models ==========

// Customer Schema
const customerSchema = new mongoose.Schema({
  supabaseId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  profileImageUrl: String,
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  preferences: {
    notifications: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: true },
    emailUpdates: { type: Boolean, default: true }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  paymentMethods: [{
    type: { type: String, enum: ['card', 'wallet', 'cash'] },
    isDefault: Boolean,
    details: mongoose.Schema.Types.Mixed
  }],
  rideHistory: [{
    rideId: String,
    date: Date,
    rating: Number,
    feedback: String
  }],
  totalRides: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 }
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);

// Driver Schema
const driverSchema = new mongoose.Schema({
  supabaseId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  licenseNumber: { type: String, required: true, unique: true },
  vehicleModel: { type: String, required: true },
  vehiclePlate: { type: String, required: true, unique: true },
  profileImageUrl: String,
  vehicleImageUrl: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'suspended', 'rejected'],
    default: 'pending'
  },
  isAvailable: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  totalRides: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  vehicle: {
    make: String,
    model: String,
    year: Number,
    color: String,
    plateNumber: String,
    type: { type: String, enum: ['sedan', 'suv', 'hatchback', 'luxury', 'economy'], default: 'sedan' },
    capacity: { type: Number, default: 4 }
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    address: String,
    lastUpdated: { type: Date, default: Date.now }
  },
  workingHours: {
    monday: { start: String, end: String, isWorking: Boolean },
    tuesday: { start: String, end: String, isWorking: Boolean },
    wednesday: { start: String, end: String, isWorking: Boolean },
    thursday: { start: String, end: String, isWorking: Boolean },
    friday: { start: String, end: String, isWorking: Boolean },
    saturday: { start: String, end: String, isWorking: Boolean },
    sunday: { start: String, end: String, isWorking: Boolean }
  },
  rideHistory: [{
    rideId: String,
    customerId: String,
    date: Date,
    earnings: Number,
    rating: Number,
    feedback: String
  }],
  reviews: [{
    customerId: String,
    rating: Number,
    comment: String,
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

driverSchema.index({ location: '2dsphere' });
const Driver = mongoose.model('Driver', driverSchema);

// ========== Routes ==========

// Health check endpoint with detailed MongoDB connection status
app.get('/api/health', async (req, res) => {
  try {
    // Check if mongoose connection is established
    if (mongoose.connection.readyState !== 1) {
      // Connection not established yet, try to connect
      console.log('MongoDB connection not established. Current state:', mongoose.connection.readyState);
      console.log('Attempting to connect to MongoDB...');
      
      try {
        await connectToDatabase();
        console.log('Connection established during health check');
      } catch (connError) {
        console.error('Failed to connect during health check:', connError);
        return res.status(500).json({ 
          status: 'error',
          message: 'Database connection failed during health check',
          connected: false,
          mongoState: mongoose.connection.readyState,
          error: connError.message,
          mongodbUri: process.env.MONGODB_URI ? 'URI is set (hidden)' : 'URI is not set',
          timestamp: new Date()
        });
      }
    }
    
    // Now test the connection with ping
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      return res.status(200).json({ 
        status: 'success',
        message: 'API is running with MongoDB connected',
        connected: true,
        mongoState: mongoose.connection.readyState,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date()
      });
    } else {
      // Connection exists but can't access db
      return res.status(500).json({ 
        status: 'error',
        message: 'MongoDB connection exists but database is not accessible',
        connected: false,
        mongoState: mongoose.connection.readyState,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({ 
      status: 'error',
      message: 'Database connection failed',
      connected: false,
      mongoState: mongoose.connection.readyState,
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Debug endpoint to check environment variables and connection status
app.get('/api/debug', async (req, res) => {
  // Get MongoDB connection status
  const mongoStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  
  // Check if we can access the database
  let dbAccessible = false;
  let collections = [];
  let dbError = null;
  
  if (mongoStatus === 1) {
    try {
      // Try to list collections to verify database access
      collections = await mongoose.connection.db.listCollections().toArray();
      collections = collections.map(c => c.name);
      dbAccessible = true;
    } catch (error) {
      dbError = error.message;
    }
  }
  
  // Get environment information
  const envInfo = {
    nodeEnv: process.env.NODE_ENV || 'Not set',
    mongodbUri: process.env.MONGODB_URI ? 
      `Set (starts with: ${process.env.MONGODB_URI.substring(0, 20)}...)` : 
      'Not set',
    port: process.env.PORT || 3001,
    vercel: process.env.VERCEL === '1' ? 'Running on Vercel' : 'Not on Vercel',
    now: process.env.NOW_REGION ? `Vercel Region: ${process.env.NOW_REGION}` : 'Not on Vercel',
    version: process.version
  };
  
  // Return comprehensive debug information
  res.status(200).json({
    api: {
      status: 'running',
      timestamp: new Date(),
      uptime: `${Math.floor(process.uptime())} seconds`
    },
    mongodb: {
      connectionStatus: statusMap[mongoStatus] || 'Unknown',
      statusCode: mongoStatus,
      accessible: dbAccessible,
      collections: dbAccessible ? collections : [],
      error: dbError,
      connectionAttempts
    },
    environment: envInfo,
    memory: process.memoryUsage()
  });
});

// Create Customer
app.post('/api/customers', async (req, res) => {
  try {
    console.log('📥 Received customer creation request:', JSON.stringify(req.body));
    
    // Ensure database connection before proceeding
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, attempting to connect...');
      await connectToDatabase();
    }
    
    // Validate required fields
    if (!req.body.supabaseId || !req.body.email || !req.body.fullName) {
      console.error('❌ Missing required fields for customer creation');
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['supabaseId', 'email', 'fullName'],
        received: Object.keys(req.body)
      });
    }
    
    const customerData = {
      ...req.body,
      email: req.body.email.toLowerCase(),
      preferences: {
        notifications: true,
        smsAlerts: true,
        emailUpdates: true
      },
      paymentMethods: [{ type: 'cash', isDefault: true }],
      totalRides: 0,
      averageRating: 0
    };

    console.log('🔄 Processing customer data with supabaseId:', customerData.supabaseId);
    
    const customer = new Customer(customerData);
    const savedCustomer = await customer.save();

    console.log('✅ Customer created successfully:', {
      id: savedCustomer._id,
      supabaseId: savedCustomer.supabaseId,
      email: savedCustomer.email
    });
    
    res.status(201).json(savedCustomer);
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: 'Customer already exists', 
        field: Object.keys(error.keyPattern)[0]
      });
    }
    
    // Check for validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationErrors
      });
    }
    
    res.status(400).json({ error: error.message });
  }
});

// Customer Read / Update / Delete
app.get('/api/customers/:supabaseId', async (req, res) => {
  try {
    const customer = await Customer.findOne({ supabaseId: req.params.supabaseId });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:supabaseId', async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { supabaseId: req.params.supabaseId },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/customers/:supabaseId', async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ supabaseId: req.params.supabaseId });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Driver
app.post('/api/drivers', async (req, res) => {
  try {
    console.log('📥 Received driver creation request:', JSON.stringify(req.body));
    
    // Ensure database connection before proceeding
    if (mongoose.connection.readyState !== 1) {
      console.log('Database not connected, attempting to connect...');
      await connectToDatabase();
    }
    
    // Validate required fields
    if (!req.body.supabaseId || !req.body.email || !req.body.fullName || !req.body.vehicleModel || !req.body.vehiclePlate) {
      console.error('❌ Missing required fields for driver creation');
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['supabaseId', 'email', 'fullName', 'vehicleModel', 'vehiclePlate'],
        received: Object.keys(req.body)
      });
    }
    
    const vehicleParts = req.body.vehicleModel.split(' ');
    const make = vehicleParts[0] || 'Unknown';
    const model = vehicleParts.slice(1).join(' ') || 'Unknown';

    const driverData = {
      ...req.body,
      email: req.body.email.toLowerCase(),
      vehiclePlate: req.body.vehiclePlate.toUpperCase(),
      status: 'pending',
      isAvailable: false,
      isOnline: false,
      rating: 0,
      totalRides: 0,
      totalEarnings: 0,
      vehicle: {
        make,
        model,
        year: new Date().getFullYear(),
        color: 'Unknown',
        plateNumber: req.body.vehiclePlate.toUpperCase(),
        type: 'sedan',
        capacity: 4
      },
      location: {
        type: 'Point',
        coordinates: [0, 0],
        lastUpdated: new Date()
      },
      workingHours: {
        monday: { start: '09:00', end: '17:00', isWorking: true },
        tuesday: { start: '09:00', end: '17:00', isWorking: true },
        wednesday: { start: '09:00', end: '17:00', isWorking: true },
        thursday: { start: '09:00', end: '17:00', isWorking: true },
        friday: { start: '09:00', end: '17:00', isWorking: true },
        saturday: { start: '09:00', end: '17:00', isWorking: false },
        sunday: { start: '09:00', end: '17:00', isWorking: false }
      }
    };

    console.log('🔄 Processing driver data with supabaseId:', driverData.supabaseId);
    
    const driver = new Driver(driverData);
    const savedDriver = await driver.save();

    console.log('✅ Driver created successfully:', {
      id: savedDriver._id,
      supabaseId: savedDriver.supabaseId,
      email: savedDriver.email,
      vehiclePlate: savedDriver.vehiclePlate
    });
    
    res.status(201).json(savedDriver);
  } catch (error) {
    console.error('❌ Error creating driver:', error);
    
    // Check for duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: 'Driver already exists or duplicate information', 
        field: Object.keys(error.keyPattern)[0]
      });
    }
    
    // Check for validation error
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationErrors
      });
    }
    
    res.status(400).json({ error: error.message });
  }
});

// Driver Read / Update / Delete
app.get('/api/drivers/:supabaseId', async (req, res) => {
  try {
    const driver = await Driver.findOne({ supabaseId: req.params.supabaseId });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/drivers/:supabaseId', async (req, res) => {
  try {
    const driver = await Driver.findOneAndUpdate(
      { supabaseId: req.params.supabaseId },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/drivers/:supabaseId', async (req, res) => {
  try {
    const driver = await Driver.findOneAndDelete({ supabaseId: req.params.supabaseId });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    res.json({ message: 'Driver deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stats Route
app.get('/api/stats', async (req, res) => {
  try {
    const [totalCustomers, totalDrivers, approvedDrivers, pendingDrivers] = await Promise.all([
      Customer.countDocuments(),
      Driver.countDocuments(),
      Driver.countDocuments({ status: 'approved' }),
      Driver.countDocuments({ status: 'pending' })
    ]);

    res.json({ totalCustomers, totalDrivers, approvedDrivers, pendingDrivers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Root route for API verification
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'NeoRide Backend API is running',
    endpoints: {
      health: '/api/health',
      debug: '/api/debug',
      customers: '/api/customers',
      drivers: '/api/drivers',
      stats: '/api/stats'
    },
    timestamp: new Date()
  });
});

// 404 Fallback with more detailed error
app.use('*', (req, res) => {
  console.log('❌ Route not found:', req.originalUrl);
  res.status(404).json({ 
    error: 'Route not found',
    requestedPath: req.originalUrl,
    availableRoutes: [
      '/api/health',
      '/api/debug',
      '/api/customers',
      '/api/drivers',
      '/api/stats'
    ],
    timestamp: new Date()
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 NeoRide Backend API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Debug info: http://localhost:${PORT}/api/debug`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log MongoDB connection status
  const mongoStatus = mongoose.connection.readyState;
  const statusMap = {
    0: '❌ Disconnected',
    1: '✅ Connected',
    2: '🔄 Connecting',
    3: '🔄 Disconnecting'
  };
  console.log(`💾 MongoDB Status: ${statusMap[mongoStatus] || 'Unknown'}`);
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

// For Vercel serverless deployment
module.exports = app;