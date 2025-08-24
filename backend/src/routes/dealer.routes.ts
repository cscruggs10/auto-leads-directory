import { Router, Request, Response } from 'express';
import { 
  getDealers, 
  getDealerById,
  getDealerBySlug,
  getDealersByRegion 
} from '../controllers/dealer.controller';
import { sanitizeInput } from '../middleware/validation.middleware';
import pool from '../config/database';

const router = Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

// GET /api/v1/dealers/execute-sql - Execute the Car Choice SQL
router.get('/execute-sql', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Executing Car Choice SQL...');
    
    // Create table and insert data
    await pool.query(`
      -- Create table structure for Car Choice CSV data
      CREATE TABLE IF NOT EXISTS car_choice_inventory (
        id SERIAL PRIMARY KEY,
        position INTEGER NOT NULL,
        vehicle_info VARCHAR(255) NOT NULL,
        image_url TEXT,
        dealer_id INTEGER NOT NULL DEFAULT 4,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_dealer FOREIGN KEY (dealer_id) REFERENCES dealers(id)
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_car_choice_position ON car_choice_inventory(position);
      CREATE INDEX IF NOT EXISTS idx_car_choice_dealer ON car_choice_inventory(dealer_id);
    `);
    
    // Clear existing data
    await pool.query('DELETE FROM car_choice_inventory');
    
    // Insert all 73 vehicles
    const insertQuery = `
      INSERT INTO car_choice_inventory (position, vehicle_info, image_url) VALUES
      (1, '2018 Mitsubishi Outlander Sport SE 2.4 AWC CVT', 'https://media.chromedata.com/autoBuilderData/stockPhotos/26779.jpg'),
      (2, '2014 Porsche Panamera 4dr HB', 'https://media.chromedata.com/autoBuilderData/stockPhotos/22395.jpg'),
      (3, '2019 Mercedes-Benz GLA-Class 4d SUV GLA250 4Matic', 'https://media.chromedata.com/autoBuilderData/stockPhotos/28835.jpg'),
      (4, '2015 Audi A6 4d Sedan 2.0T Premium+', 'https://media.chromedata.com/autoBuilderData/stockPhotos/21748.jpg'),
      (5, '2019 Audi Q7 SE Premium Plus 55 TFSI quattro', 'https://media.chromedata.com/autoBuilderData/stockPhotos/28775.jpg'),
      (6, '2017 Buick Cascada 2d Convertible Premium', 'https://media.chromedata.com/autoBuilderData/stockPhotos/22439.jpg'),
      (7, '2012 Toyota Highlander FWD 4dr I4 (Natl)', 'https://media.chromedata.com/autoBuilderData/stockPhotos/14207.jpg'),
      (8, '2017 Genesis G90 3.3T Premium AWD', 'https://media.chromedata.com/autoBuilderData/stockPhotos/25192.jpg'),
      (9, '2006 Bentley Continental Flying Spur 4d Sedan', 'https://media.chromedata.com/autoBuilderData/stockPhotos/9184.jpg'),
      (10, '2012 Toyota Tundra 4WD Double Cab 4.6L', 'https://media.chromedata.com/autoBuilderData/stockPhotos/14229.jpg'),
      (11, '2019 Ford Taurus 4d Sedan FWD Limited', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (12, '2019 Genesis G70 2.0T Advanced AWD', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (13, '2014 Toyota Tacoma 2WD Access Cab I4 MT (Natl)', 'https://media.chromedata.com/autoBuilderData/stockPhotos/17421.jpg'),
      (14, '2018 Honda Accord Sedan 4d LX 1.5L', 'https://media.chromedata.com/autoBuilderData/stockPhotos/27888.jpg'),
      (15, '2017 Jaguar F-PACE 4d SUV AWD 35t Prestige', 'https://media.chromedata.com/autoBuilderData/stockPhotos/23227.jpg'),
      (16, '2020 Mercedes-Benz GLE-Class 4d SUV GLE350 4matic', 'https://media.chromedata.com/autoBuilderData/stockPhotos/29585.jpg'),
      (17, '2018 Mercedes-Benz GLE-Class 4d SUV Coupe GLE43 AMG 4matic', 'https://media.chromedata.com/autoBuilderData/stockPhotos/27044.jpg'),
      (18, '2016 Land Rover Range Rover Sport 4d SUV 3.0L SC SE', 'https://media.chromedata.com/autoBuilderData/stockPhotos/27665.jpg'),
      (19, '2020 Jeep Gladiator Sport S 4x4', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (20, '2016 Cadillac XTS 4d Sedan Luxury', 'https://media.chromedata.com/autoBuilderData/stockPhotos/23263.jpg'),
      (21, '2017 FIAT 124 Spider Lusso Convertible', 'https://media.chromedata.com/autoBuilderData/stockPhotos/24108.jpg'),
      (22, '2015 Mercedes-Benz S-Class 4d Sedan S550', 'https://media.chromedata.com/autoBuilderData/stockPhotos/21057.jpg'),
      (23, '2015 Mercedes-Benz E-Class 4dr Sdn E 350 RWD', ''),
      (24, '2019 Chevrolet Silverado 1500 4WD Crew Cab 147', 'https://media.chromedata.com/autoBuilderData/stockPhotos/28564.jpg'),
      (25, '2016 Chevrolet Tahoe 4d SUV RWD LTZ', 'https://media.chromedata.com/autoBuilderData/stockPhotos/17728.jpg'),
      (26, '2023 Chevrolet Express Cargo Van RWD 2500 135', 'https://media.chromedata.com/autoBuilderData/stockPhotos/39575.jpg'),
      (27, '2013 Chevrolet Camaro 2d Coupe LT2', 'https://media.chromedata.com/autoBuilderData/stockPhotos/14732.jpg'),
      (28, '2015 Cadillac CTS 4d Sedan 2.0L Turbo Luxury', 'https://media.chromedata.com/autoBuilderData/stockPhotos/19916.jpg'),
      (29, '2012 Ford Taurus 4d Sedan Limited', 'https://media.chromedata.com/autoBuilderData/stockPhotos/14660.jpg'),
      (30, '2017 Land Rover Range Rover Sport 4d SUV 3.0L SC SE', 'https://media.chromedata.com/autoBuilderData/stockPhotos/27841.jpg'),
      (31, '2019 Chevrolet Impala 4d Sedan LT w/1LT V6', 'https://media.chromedata.com/autoBuilderData/stockPhotos/15197.jpg'),
      (32, '2016 Chevrolet Trax 4d SUV FWD LTZ', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (33, '2017 Chevrolet Camaro 2d Coupe SS1', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (34, '2007 Dodge Nitro 4d SUV 2WD R/T', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (35, '2021 Chevrolet Tahoe 4WD 4dr Z71', 'https://media.chromedata.com/autoBuilderData/stockPhotos/31901.jpg'),
      (36, '2018 Honda Accord Sedan 4d Sport 1.5L CVT', 'https://media.chromedata.com/autoBuilderData/stockPhotos/27889.jpg'),
      (37, '2017 Maserati Levante 4d Sport Utility', 'https://media.chromedata.com/autoBuilderData/stockPhotos/24534.jpg'),
      (38, '2014 Ford Mustang 2dr Cpe V6', ''),
      (39, '2020 Subaru Crosstrek 4d SUV 2.0i Limited', 'https://media.chromedata.com/autoBuilderData/stockPhotos/31118.jpg'),
      (40, '2018 Land Rover Range Rover Evoque 5 Door SE', ''),
      (41, '2018 Chrysler Pacifica 4d Wagon Touring L Plus', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (42, '2024 Cadillac Escalade 4WD 4dr Sport Platinum', 'https://media.chromedata.com/autoBuilderData/stockPhotos/31895.jpg'),
      (43, '2018 Ram 1500 4WD Crew Cab SLT', 'https://media.chromedata.com/autoBuilderData/stockPhotos/27052.jpg'),
      (44, '2019 Mercedes-Benz C-Class 4d Sedan C300', 'https://media.chromedata.com/autoBuilderData/stockPhotos/29301.jpg'),
      (45, '2018 Land Rover Range Rover Velar 4d SUV 4WD P250 SE R-Dynamic', 'https://media.chromedata.com/autoBuilderData/stockPhotos/26446.jpg'),
      (46, '2018 Nissan Maxima Platinum 3.5L', 'https://media.chromedata.com/autoBuilderData/stockPhotos/27670.jpg'),
      (47, '2018 Land Rover Range Rover 4d SUV 5.0L SC', 'https://media.chromedata.com/autoBuilderData/stockPhotos/27984.jpg'),
      (48, '2014 Chevrolet Silverado 1500 4WD Double Cab 143.5', 'https://media.chromedata.com/autoBuilderData/stockPhotos/15988.jpg'),
      (49, '2017 INFINITI QX50 4d SUV AWD', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (50, '2018 Toyota RAV4 XLE FWD (Natl)', 'https://media.chromedata.com/autoBuilderData/stockPhotos/26958.jpg'),
      (51, '2011 Chevrolet MALIBU SEDAN', ''),
      (52, '2015 Mazda CX-5 FWD 4dr Auto Sport', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (53, '2016 GMC Yukon XL 4d SUV 4WD Denali', 'https://media.chromedata.com/autoBuilderData/stockPhotos/17722.jpg'),
      (54, '2014 Subaru Forester 4d SUV i Limited', 'https://media.chromedata.com/autoBuilderData/stockPhotos/22755.jpg'),
      (55, '2016 Land Rover Range Rover Sport 4WD 4dr V8', ''),
      (56, '2023 Toyota RAV4 LE FWD', 'https://media.chromedata.com/autoBuilderData/stockPhotos/60080.jpg'),
      (57, '2021 Jeep Gladiator Freedom 4x4 *Ltd Avail*', 'https://media.chromedata.com/autoBuilderData/stockPhotos/32358.jpg'),
      (58, '2019 Jeep Wrangler Unlimited Sport S 4x4', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (59, '2016 Lincoln MKZ 4d Sedan FWD Black Label EcoBoost', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (60, '2016 Land Rover Range Rover Sport 4WD 4dr V6 HSE', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (61, '2022 Toyota Camry SE Auto', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (62, '2008 Porsche Cayman 2d Coupe', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (63, '2003 Nissan Xterra 4d SUV 4WD XE AT', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (64, '2017 Toyota Tundra 4WD SR5 CrewMax 5.5'' Bed 5.7L FFV (Natl)', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (65, '2017 Nissan Rogue 2017.5 FWD SL', 'https://media.chromedata.com/autoBuilderData/stockPhotos/25348.jpg'),
      (66, '2006 Freightliner SPRINTER', ''),
      (67, '2018 Toyota Corolla LE CVT (Natl)', 'https://media.chromedata.com/autoBuilderData/stockPhotos/26563.jpg'),
      (68, '2021 Ford Bronco Sport Big Bend 4x4', 'https://media.chromedata.com/autoBuilderData/stockPhotos/32348.jpg'),
      (69, '2023 Ford Bronco 2 Door 4x4', ''),
      (70, '2014 Ford F-150 2WD SuperCrew', ''),
      (71, '2020 BMW X5 sDrive40i Sports Activity Vehicle', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (72, '2020 Nissan Altima 4d Sedan FWD 2.5L Platinum', 'https://www.shopcarchoice.com/cssLib/onepix.png'),
      (73, '2016 GMC Yukon 4d SUV RWD SLT', 'https://www.shopcarchoice.com/cssLib/onepix.png')
    `;
    
    await pool.query(insertQuery);
    
    const countResult = await pool.query('SELECT COUNT(*) FROM car_choice_inventory');
    
    return res.json({ 
      success: true, 
      message: 'Car Choice database created and populated',
      totalRecords: parseInt(countResult.rows[0].count)
    });
    
  } catch (error) {
    console.error('SQL execution error:', error);
    return res.status(500).json({ error: 'SQL execution failed', details: error.message });
  }
});

// GET /api/v1/dealers/create-vehicle-listings - Create Car Choice vehicle listings directly
router.get('/create-vehicle-listings', async (req: Request, res: Response) => {
  try {
    console.log('🚗 Creating Car Choice vehicle listings...');
    
    // Clear existing Car Choice vehicles
    await pool.query('DELETE FROM vehicles WHERE dealer_id = 4');
    
    // Car Choice inventory data from CSV
    const inventory = [
      { position: 1, vehicle_info: '2018 Mitsubishi Outlander Sport SE 2.4 AWC CVT', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/26779.jpg' },
      { position: 2, vehicle_info: '2014 Porsche Panamera 4dr HB', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/22395.jpg' },
      { position: 3, vehicle_info: '2019 Mercedes-Benz GLA-Class 4d SUV GLA250 4Matic', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/28835.jpg' },
      { position: 4, vehicle_info: '2015 Audi A6 4d Sedan 2.0T Premium+', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/21748.jpg' },
      { position: 5, vehicle_info: '2019 Audi Q7 SE Premium Plus 55 TFSI quattro', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/28775.jpg' },
      { position: 6, vehicle_info: '2017 Buick Cascada 2d Convertible Premium', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/22439.jpg' },
      { position: 7, vehicle_info: '2012 Toyota Highlander FWD 4dr I4 (Natl)', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/14207.jpg' },
      { position: 8, vehicle_info: '2017 Genesis G90 3.3T Premium AWD', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/25192.jpg' },
      { position: 9, vehicle_info: '2006 Bentley Continental Flying Spur 4d Sedan', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/9184.jpg' },
      { position: 10, vehicle_info: '2012 Toyota Tundra 4WD Double Cab 4.6L', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/14229.jpg' },
      { position: 11, vehicle_info: '2019 Ford Taurus 4d Sedan FWD Limited', image_url: '' },
      { position: 12, vehicle_info: '2019 Genesis G70 2.0T Advanced AWD', image_url: '' },
      { position: 13, vehicle_info: '2014 Toyota Tacoma 2WD Access Cab I4 MT (Natl)', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/17421.jpg' },
      { position: 14, vehicle_info: '2018 Honda Accord Sedan 4d LX 1.5L', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/27888.jpg' },
      { position: 15, vehicle_info: '2017 Jaguar F-PACE 4d SUV AWD 35t Prestige', image_url: 'https://media.chromedata.com/autoBuilderData/stockPhotos/23227.jpg' }
    ];
    
    let processed = 0;
    
    for (const item of inventory) {
      const { position, vehicle_info, image_url } = item;
      
      // Parse vehicle info
      const yearMatch = vehicle_info.match(/^(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;
      
      const remaining = vehicle_info.substring(4).trim();
      const makeMatch = remaining.match(/^(\w+)/);
      const make = makeMatch ? makeMatch[1] : 'Unknown';
      
      const model = remaining.substring(make.length).trim() || 'Unknown';
      
      if (year && make) {
        const vin = `CC${year}${make.substring(0, 3).toUpperCase()}${String(position).padStart(6, '0')}`;
        
        // Insert vehicle
        await pool.query(`
          INSERT INTO vehicles (
            vin, year, make, model, dealer_id, title, 
            is_active, is_available, condition, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [vin, year, make, model, 4, vehicle_info, true, true, 'used']);
        
        // Skip images for now to avoid table issues
        
        processed++;
      }
    }
    
    // Get final count
    const vehicleCount = await pool.query('SELECT COUNT(*) FROM vehicles WHERE dealer_id = 4');
    
    return res.json({
      success: true,
      message: `Created ${processed} vehicle listings for Car Choice`,
      totalVehicles: parseInt(vehicleCount.rows[0].count)
    });
    
  } catch (error) {
    console.error('Vehicle listing creation error:', error);
    return res.status(500).json({ error: 'Failed to create vehicle listings', details: error.message });
  }
});

// GET /api/v1/dealers - Get all dealers
router.get('/', getDealers);

// GET /api/v1/dealers/region/:region - Get dealers by region
router.get('/region/:region', getDealersByRegion);

// GET /api/v1/dealers/slug/:slug - Get dealer by slug
router.get('/slug/:slug', getDealerBySlug);

// GET /api/v1/dealers/:id - Get specific dealer
router.get('/:id', getDealerById);

export default router;