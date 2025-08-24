import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import vehicleRoutes from './routes/vehicle.routes';
import dealerRoutes from './routes/dealer.routes';
import leadRoutes from './routes/lead.routes';
import adminRoutes from './routes/admin.routes';
import simpleRoutes from './routes/simple.routes';
// import scraperRoutes from './routes/scraper.routes';
import { errorHandler } from './middleware/error.middleware';
// import { setupCronJobs } from './services/cron.service';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

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
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://frontend-7d4mck485-corey-scruggs-projects.vercel.app',
  'https://frontend-eqno5gq5d-corey-scruggs-projects.vercel.app',
  'https://frontend-owtmxpjmu-corey-scruggs-projects.vercel.app',
  'https://frontend-ec6yiaciq-corey-scruggs-projects.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter limit for lead submissions
  message: 'Too many lead submissions, please try again later.',
});

app.use('/api/', limiter);
app.use('/api/v1/leads', leadLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const pool = (await import('./config/database')).default;
    
    // Check database connection
    const dbResult = await pool.query('SELECT COUNT(*) FROM dealers');
    const dealerCount = parseInt(dbResult.rows[0].count);
    
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasApiKey: !!process.env.BROWSE_AI_API_KEY,
      hasDatabase: true,
      dealerCount: dealerCount,
      migrationsRun: dealerCount > 0
    });
  } catch (error) {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      hasApiKey: !!process.env.BROWSE_AI_API_KEY,
      hasDatabase: false,
      error: 'Database connection failed'
    });
  }
});

// Manual Car Choice data insertion
app.get('/load-car-choice', async (req: Request, res: Response) => {
  try {
    const pool = (await import('./config/database')).default;
    
    // Clear existing Car Choice vehicles
    await pool.query('DELETE FROM vehicles WHERE dealer_id = 4');
    
    // Insert all 73 vehicles from CSV
    await pool.query(`
      INSERT INTO vehicles (vin, year, make, model, dealer_id, title, is_active, is_available, condition, created_at, updated_at) VALUES
      ('CC2018MIT000001', 2018, 'Mitsubishi', 'Outlander Sport SE 2.4 AWC CVT', 4, '2018 Mitsubishi Outlander Sport SE 2.4 AWC CVT', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2014POR000002', 2014, 'Porsche', 'Panamera 4dr HB', 4, '2014 Porsche Panamera 4dr HB', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2019MER000003', 2019, 'Mercedes-Benz', 'GLA-Class 4d SUV GLA250 4Matic', 4, '2019 Mercedes-Benz GLA-Class 4d SUV GLA250 4Matic', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2015AUD000004', 2015, 'Audi', 'A6 4d Sedan 2.0T Premium+', 4, '2015 Audi A6 4d Sedan 2.0T Premium+', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2019AUD000005', 2019, 'Audi', 'Q7 SE Premium Plus 55 TFSI quattro', 4, '2019 Audi Q7 SE Premium Plus 55 TFSI quattro', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2017BUI000006', 2017, 'Buick', 'Cascada 2d Convertible Premium', 4, '2017 Buick Cascada 2d Convertible Premium', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2012TOY000007', 2012, 'Toyota', 'Highlander FWD 4dr I4 (Natl)', 4, '2012 Toyota Highlander FWD 4dr I4 (Natl)', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2017GEN000008', 2017, 'Genesis', 'G90 3.3T Premium AWD', 4, '2017 Genesis G90 3.3T Premium AWD', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2006BEN000009', 2006, 'Bentley', 'Continental Flying Spur 4d Sedan', 4, '2006 Bentley Continental Flying Spur 4d Sedan', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2012TOY000010', 2012, 'Toyota', 'Tundra 4WD Double Cab 4.6L', 4, '2012 Toyota Tundra 4WD Double Cab 4.6L', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2019FOR000011', 2019, 'Ford', 'Taurus 4d Sedan FWD Limited', 4, '2019 Ford Taurus 4d Sedan FWD Limited', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2019GEN000012', 2019, 'Genesis', 'G70 2.0T Advanced AWD', 4, '2019 Genesis G70 2.0T Advanced AWD', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2014TOY000013', 2014, 'Toyota', 'Tacoma 2WD Access Cab I4 MT (Natl)', 4, '2014 Toyota Tacoma 2WD Access Cab I4 MT (Natl)', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2018HON000014', 2018, 'Honda', 'Accord Sedan 4d LX 1.5L', 4, '2018 Honda Accord Sedan 4d LX 1.5L', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2017JAG000015', 2017, 'Jaguar', 'F-PACE 4d SUV AWD 35t Prestige', 4, '2017 Jaguar F-PACE 4d SUV AWD 35t Prestige', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2020MER000016', 2020, 'Mercedes-Benz', 'GLE-Class 4d SUV GLE350 4matic', 4, '2020 Mercedes-Benz GLE-Class 4d SUV GLE350 4matic', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2018MER000017', 2018, 'Mercedes-Benz', 'GLE-Class 4d SUV Coupe GLE43 AMG 4matic', 4, '2018 Mercedes-Benz GLE-Class 4d SUV Coupe GLE43 AMG 4matic', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2016LAN000018', 2016, 'Land Rover', 'Range Rover Sport 4d SUV 3.0L SC SE', 4, '2016 Land Rover Range Rover Sport 4d SUV 3.0L SC SE', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2020JEE000019', 2020, 'Jeep', 'Gladiator Sport S 4x4', 4, '2020 Jeep Gladiator Sport S 4x4', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2016CAD000020', 2016, 'Cadillac', 'XTS 4d Sedan Luxury', 4, '2016 Cadillac XTS 4d Sedan Luxury', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2017FIA000021', 2017, 'FIAT', '124 Spider Lusso Convertible', 4, '2017 FIAT 124 Spider Lusso Convertible', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2015MER000022', 2015, 'Mercedes-Benz', 'S-Class 4d Sedan S550', 4, '2015 Mercedes-Benz S-Class 4d Sedan S550', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2015MER000023', 2015, 'Mercedes-Benz', 'E-Class 4dr Sdn E 350 RWD', 4, '2015 Mercedes-Benz E-Class 4dr Sdn E 350 RWD', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2019CHE000024', 2019, 'Chevrolet', 'Silverado 1500 4WD Crew Cab 147', 4, '2019 Chevrolet Silverado 1500 4WD Crew Cab 147', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2016CHE000025', 2016, 'Chevrolet', 'Tahoe 4d SUV RWD LTZ', 4, '2016 Chevrolet Tahoe 4d SUV RWD LTZ', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2023CHE000026', 2023, 'Chevrolet', 'Express Cargo Van RWD 2500 135', 4, '2023 Chevrolet Express Cargo Van RWD 2500 135', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2013CHE000027', 2013, 'Chevrolet', 'Camaro 2d Coupe LT2', 4, '2013 Chevrolet Camaro 2d Coupe LT2', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2015CAD000028', 2015, 'Cadillac', 'CTS 4d Sedan 2.0L Turbo Luxury', 4, '2015 Cadillac CTS 4d Sedan 2.0L Turbo Luxury', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2012FOR000029', 2012, 'Ford', 'Taurus 4d Sedan Limited', 4, '2012 Ford Taurus 4d Sedan Limited', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2017LAN000030', 2017, 'Land Rover', 'Range Rover Sport 4d SUV 3.0L SC SE', 4, '2017 Land Rover Range Rover Sport 4d SUV 3.0L SC SE', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2019CHE000031', 2019, 'Chevrolet', 'Impala 4d Sedan LT w/1LT V6', 4, '2019 Chevrolet Impala 4d Sedan LT w/1LT V6', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2016CHE000032', 2016, 'Chevrolet', 'Trax 4d SUV FWD LTZ', 4, '2016 Chevrolet Trax 4d SUV FWD LTZ', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2017CHE000033', 2017, 'Chevrolet', 'Camaro 2d Coupe SS1', 4, '2017 Chevrolet Camaro 2d Coupe SS1', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2007DOD000034', 2007, 'Dodge', 'Nitro 4d SUV 2WD R/T', 4, '2007 Dodge Nitro 4d SUV 2WD R/T', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2021CHE000035', 2021, 'Chevrolet', 'Tahoe 4WD 4dr Z71', 4, '2021 Chevrolet Tahoe 4WD 4dr Z71', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2018HON000036', 2018, 'Honda', 'Accord Sedan 4d Sport 1.5L CVT', 4, '2018 Honda Accord Sedan 4d Sport 1.5L CVT', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2017MAS000037', 2017, 'Maserati', 'Levante 4d Sport Utility', 4, '2017 Maserati Levante 4d Sport Utility', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2014FOR000038', 2014, 'Ford', 'Mustang 2dr Cpe V6', 4, '2014 Ford Mustang 2dr Cpe V6', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2020SUB000039', 2020, 'Subaru', 'Crosstrek 4d SUV 2.0i Limited', 4, '2020 Subaru Crosstrek 4d SUV 2.0i Limited', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2018LAN000040', 2018, 'Land Rover', 'Range Rover Evoque 5 Door SE', 4, '2018 Land Rover Range Rover Evoque 5 Door SE', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2018CHR000041', 2018, 'Chrysler', 'Pacifica 4d Wagon Touring L Plus', 4, '2018 Chrysler Pacifica 4d Wagon Touring L Plus', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2024CAD000042', 2024, 'Cadillac', 'Escalade 4WD 4dr Sport Platinum', 4, '2024 Cadillac Escalade 4WD 4dr Sport Platinum', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2018RAM000043', 2018, 'Ram', '1500 4WD Crew Cab SLT', 4, '2018 Ram 1500 4WD Crew Cab SLT', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2019MER000044', 2019, 'Mercedes-Benz', 'C-Class 4d Sedan C300', 4, '2019 Mercedes-Benz C-Class 4d Sedan C300', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2018LAN000045', 2018, 'Land Rover', 'Range Rover Velar 4d SUV 4WD P250 SE R-Dynamic', 4, '2018 Land Rover Range Rover Velar 4d SUV 4WD P250 SE R-Dynamic', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2018NIS000046', 2018, 'Nissan', 'Maxima Platinum 3.5L', 4, '2018 Nissan Maxima Platinum 3.5L', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2018LAN000047', 2018, 'Land Rover', 'Range Rover 4d SUV 5.0L SC', 4, '2018 Land Rover Range Rover 4d SUV 5.0L SC', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2014CHE000048', 2014, 'Chevrolet', 'Silverado 1500 4WD Double Cab 143.5', 4, '2014 Chevrolet Silverado 1500 4WD Double Cab 143.5', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2017INF000049', 2017, 'INFINITI', 'QX50 4d SUV AWD', 4, '2017 INFINITI QX50 4d SUV AWD', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2018TOY000050', 2018, 'Toyota', 'RAV4 XLE FWD (Natl)', 4, '2018 Toyota RAV4 XLE FWD (Natl)', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2011CHE000051', 2011, 'Chevrolet', 'MALIBU SEDAN', 4, '2011 Chevrolet MALIBU SEDAN', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2015MAZ000052', 2015, 'Mazda', 'CX-5 FWD 4dr Auto Sport', 4, '2015 Mazda CX-5 FWD 4dr Auto Sport', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2016GMC000053', 2016, 'GMC', 'Yukon XL 4d SUV 4WD Denali', 4, '2016 GMC Yukon XL 4d SUV 4WD Denali', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2014SUB000054', 2014, 'Subaru', 'Forester 4d SUV i Limited', 4, '2014 Subaru Forester 4d SUV i Limited', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2016LAN000055', 2016, 'Land Rover', 'Range Rover Sport 4WD 4dr V8', 4, '2016 Land Rover Range Rover Sport 4WD 4dr V8', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2023TOY000056', 2023, 'Toyota', 'RAV4 LE FWD', 4, '2023 Toyota RAV4 LE FWD', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2021JEE000057', 2021, 'Jeep', 'Gladiator Freedom 4x4 *Ltd Avail*', 4, '2021 Jeep Gladiator Freedom 4x4 *Ltd Avail*', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2019JEE000058', 2019, 'Jeep', 'Wrangler Unlimited Sport S 4x4', 4, '2019 Jeep Wrangler Unlimited Sport S 4x4', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2016LIN000059', 2016, 'Lincoln', 'MKZ 4d Sedan FWD Black Label EcoBoost', 4, '2016 Lincoln MKZ 4d Sedan FWD Black Label EcoBoost', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2016LAN000060', 2016, 'Land Rover', 'Range Rover Sport 4WD 4dr V6 HSE', 4, '2016 Land Rover Range Rover Sport 4WD 4dr V6 HSE', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2022TOY000061', 2022, 'Toyota', 'Camry SE Auto', 4, '2022 Toyota Camry SE Auto', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2008POR000062', 2008, 'Porsche', 'Cayman 2d Coupe', 4, '2008 Porsche Cayman 2d Coupe', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2003NIS000063', 2003, 'Nissan', 'Xterra 4d SUV 4WD XE AT', 4, '2003 Nissan Xterra 4d SUV 4WD XE AT', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2017TOY000064', 2017, 'Toyota', 'Tundra 4WD SR5 CrewMax 5.5 Bed 5.7L FFV (Natl)', 4, '2017 Toyota Tundra 4WD SR5 CrewMax 5.5 Bed 5.7L FFV (Natl)', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2017NIS000065', 2017, 'Nissan', 'Rogue 2017.5 FWD SL', 4, '2017 Nissan Rogue 2017.5 FWD SL', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2006FRE000066', 2006, 'Freightliner', 'SPRINTER', 4, '2006 Freightliner SPRINTER', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2018TOY000067', 2018, 'Toyota', 'Corolla LE CVT (Natl)', 4, '2018 Toyota Corolla LE CVT (Natl)', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2021FOR000068', 2021, 'Ford', 'Bronco Sport Big Bend 4x4', 4, '2021 Ford Bronco Sport Big Bend 4x4', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2023FOR000069', 2023, 'Ford', 'Bronco 2 Door 4x4', 4, '2023 Ford Bronco 2 Door 4x4', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2014FOR000070', 2014, 'Ford', 'F-150 2WD SuperCrew', 4, '2014 Ford F-150 2WD SuperCrew', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2020BMW000071', 2020, 'BMW', 'X5 sDrive40i Sports Activity Vehicle', 4, '2020 BMW X5 sDrive40i Sports Activity Vehicle', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2020NIS000072', 2020, 'Nissan', 'Altima 4d Sedan FWD 2.5L Platinum', 4, '2020 Nissan Altima 4d Sedan FWD 2.5L Platinum', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('CC2016GMC000073', 2016, 'GMC', 'Yukon 4d SUV RWD SLT', 4, '2016 GMC Yukon 4d SUV RWD SLT', true, true, 'used', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (vin) DO NOTHING
    `);
    
    const count = await pool.query('SELECT COUNT(*) FROM vehicles WHERE dealer_id = 4');
    
    res.json({ 
      success: true,
      message: 'Car Choice vehicles loaded from CSV',
      vehicleCount: parseInt(count.rows[0].count)
    });
    
  } catch (error) {
    console.error('Error loading Car Choice vehicles:', error);
    res.status(500).json({ error: 'Failed to load vehicles', details: error.message });
  }
});

// API routes
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/dealers', dealerRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/simple', simpleRoutes);
// app.use('/api/v1/scraper', scraperRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  
  // Run migrations if requested OR if Car Choice has no vehicles
  if (process.env.RUN_MIGRATIONS === 'true') {
    console.log('🚀 Running database migrations...');
    try {
      const { runMigrations } = await import('./database/migrate');
      await runMigrations();
      console.log('✅ Database migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  } else {
    // Check if Car Choice has vehicles, if not add them
    try {
      const pool = (await import('./config/database')).default;
      const carChoiceCount = await pool.query('SELECT COUNT(*) FROM vehicles WHERE dealer_id = 4');
      const count = parseInt(carChoiceCount.rows[0].count);
      
      if (count === 0) {
        console.log('🚗 Car Choice has no vehicles, adding them now...');
        const { seedCarChoiceVehicles } = await import('./database/migrate');
        await seedCarChoiceVehicles();
        console.log('✅ Car Choice vehicles added successfully');
      }
    } catch (error) {
      console.error('❌ Car Choice vehicle check failed:', error);
    }
  }
  
  // Setup cron jobs for scraping if enabled
  // if (process.env.SCRAPING_ENABLED === 'true') {
  //   setupCronJobs();
  // }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;