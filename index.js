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

// (Optional but recommended) Disable command buffering to catch issues early
mongoose.set('bufferCommands', false);

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    connected: mongoose.connection.readyState === 1,
    message: 'MongoDB API is running',
    timestamp: new Date().toISOString()
  });
});

// Create Customer
app.post('/api/customers', async (req, res) => {
  try {
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

    const customer = new Customer(customerData);
    const savedCustomer = await customer.save();

    console.log('✅ Customer created:', savedCustomer._id);
    res.status(201).json(savedCustomer);
  } catch (error) {
    console.error('❌ Error creating customer:', error);
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

    const driver = new Driver(driverData);
    const savedDriver = await driver.save();

    console.log('✅ Driver created:', savedDriver._id);
    res.status(201).json(savedDriver);
  } catch (error) {
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

// 404 Fallback
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 NeoRide Backend API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
}

// For Vercel serverless deployment
module.exports = app;