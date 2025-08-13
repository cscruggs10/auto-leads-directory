// Vercel serverless function entry point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://frontend-k5mu0m3oc-corey-scruggs-projects.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mock API endpoints for demo
app.get('/api/v1/vehicles', (req, res) => {
  const mockVehicles = {
    success: true,
    data: [
      {
        vin: '1HGBH41JXMN109186',
        year: 2018,
        make: 'Honda',
        model: 'Civic',
        mileage: 45000,
        price: 16500,
        images: ['/images/honda-civic-2018.jpg'],
        dealer_id: 1,
        features: ['Automatic', 'AC', 'Power Windows'],
        description: 'Clean title, well maintained vehicle'
      },
      {
        vin: '1FTFW1ET5DFA10312',
        year: 2019,
        make: 'Ford',
        model: 'F-150',
        mileage: 52000,
        price: 24900,
        images: ['/images/ford-f150-2019.jpg'],
        dealer_id: 2,
        features: ['4WD', 'Extended Cab', 'Towing Package'],
        description: 'Work ready truck with towing capacity'
      }
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1
    }
  };
  
  res.json(mockVehicles);
});

app.get('/api/v1/dealers', (req, res) => {
  const mockDealers = {
    success: true,
    data: [
      {
        id: 1,
        name: 'Memphis Auto Sales',
        address: '1234 Main St, Memphis, TN 38103',
        phone: '(901) 555-0123',
        website: 'https://memphisautosales.com',
        hours: 'Mon-Sat: 9AM-7PM, Sun: 12PM-5PM',
        rating: 4.2,
        vehicle_count: 150
      },
      {
        id: 2,
        name: 'Quick Credit Motors',
        address: '5678 Union Ave, Memphis, TN 38104',
        phone: '(901) 555-0456',
        website: 'https://quickcreditmotors.com',
        hours: 'Mon-Fri: 9AM-8PM, Sat: 9AM-6PM, Sun: Closed',
        rating: 3.9,
        vehicle_count: 85
      }
    ],
    pagination: {
      page: 1,
      limit: 12,
      total: 2,
      totalPages: 1
    }
  };
  
  res.json(mockDealers);
});

app.post('/api/v1/leads', (req, res) => {
  // Mock lead submission
  const leadData = req.body;
  
  const confirmationNumber = 'AL' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  res.json({
    success: true,
    data: {
      id: Math.floor(Math.random() * 10000),
      confirmation_number: confirmationNumber,
      message: 'Lead submitted successfully'
    }
  });
});

app.get('/api/v1/vehicles/:vin', (req, res) => {
  const { vin } = req.params;
  
  const mockVehicle = {
    success: true,
    data: {
      vin: vin,
      year: 2018,
      make: 'Honda',
      model: 'Civic',
      mileage: 45000,
      price: 16500,
      images: ['/images/honda-civic-2018.jpg'],
      dealer_id: 1,
      features: ['Automatic', 'AC', 'Power Windows'],
      description: 'Clean title, well maintained vehicle',
      dealer: {
        id: 1,
        name: 'Memphis Auto Sales',
        address: '1234 Main St, Memphis, TN 38103',
        phone: '(901) 555-0123'
      }
    }
  };
  
  res.json(mockVehicle);
});

// Export for Vercel
module.exports = app;