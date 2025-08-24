import { Router } from 'express';
import pool from '../config/database';

const router = Router();

/**
 * @route GET /api/v1/simple/load-car-choice
 * @desc Load Car Choice vehicles from CSV data
 * @access Admin
 */
router.get('/load-car-choice', async (req, res) => {
  try {
    console.log('🚀 Loading Car Choice inventory from CSV...');
    
    // Get Car Choice dealer ID
    const dealerResult = await pool.query('SELECT id FROM dealers WHERE name = $1', ['Car Choice']);
    if (dealerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Car Choice dealer not found' });
    }
    const dealerId = dealerResult.rows[0].id;
    
    // Clear existing Car Choice vehicles
    await pool.query('DELETE FROM vehicles WHERE dealer_id = $1', [dealerId]);
    
    // All 73 vehicles from your CSV file
    const vehicles = [
      "2018 Mitsubishi Outlander Sport SE 2.4 AWC CVT",
      "2014 Porsche Panamera 4dr HB",
      "2019 Mercedes-Benz GLA-Class 4d SUV GLA250 4Matic",
      "2015 Audi A6 4d Sedan 2.0T Premium+",
      "2019 Audi Q7 SE Premium Plus 55 TFSI quattro",
      "2017 Buick Cascada 2d Convertible Premium",
      "2012 Toyota Highlander FWD 4dr I4 (Natl)",
      "2017 Genesis G90 3.3T Premium AWD",
      "2006 Bentley Continental Flying Spur 4d Sedan",
      "2012 Toyota Tundra 4WD Double Cab 4.6L",
      "2019 Ford Taurus 4d Sedan FWD Limited",
      "2019 Genesis G70 2.0T Advanced AWD",
      "2014 Toyota Tacoma 2WD Access Cab I4 MT (Natl)",
      "2018 Honda Accord Sedan 4d LX 1.5L",
      "2017 Jaguar F-PACE 4d SUV AWD 35t Prestige",
      "2020 Mercedes-Benz GLE-Class 4d SUV GLE350 4matic",
      "2018 Mercedes-Benz GLE-Class 4d SUV Coupe GLE43 AMG 4matic",
      "2016 Land Rover Range Rover Sport 4d SUV 3.0L SC SE",
      "2020 Jeep Gladiator Sport S 4x4",
      "2016 Cadillac XTS 4d Sedan Luxury",
      "2017 FIAT 124 Spider Lusso Convertible",
      "2015 Mercedes-Benz S-Class 4d Sedan S550",
      "2015 Mercedes-Benz E-Class 4dr Sdn E 350 RWD",
      "2019 Chevrolet Silverado 1500 4WD Crew Cab 147",
      "2016 Chevrolet Tahoe 4d SUV RWD LTZ",
      "2023 Chevrolet Express Cargo Van RWD 2500 135",
      "2013 Chevrolet Camaro 2d Coupe LT2",
      "2015 Cadillac CTS 4d Sedan 2.0L Turbo Luxury",
      "2012 Ford Taurus 4d Sedan Limited",
      "2017 Land Rover Range Rover Sport 4d SUV 3.0L SC SE",
      "2019 Chevrolet Impala 4d Sedan LT w/1LT V6",
      "2016 Chevrolet Trax 4d SUV FWD LTZ",
      "2017 Chevrolet Camaro 2d Coupe SS1",
      "2007 Dodge Nitro 4d SUV 2WD R/T",
      "2021 Chevrolet Tahoe 4WD 4dr Z71",
      "2018 Honda Accord Sedan 4d Sport 1.5L CVT",
      "2017 Maserati Levante 4d Sport Utility",
      "2014 Ford Mustang 2dr Cpe V6",
      "2020 Subaru Crosstrek 4d SUV 2.0i Limited",
      "2018 Land Rover Range Rover Evoque 5 Door SE",
      "2018 Chrysler Pacifica 4d Wagon Touring L Plus",
      "2024 Cadillac Escalade 4WD 4dr Sport Platinum",
      "2018 Ram 1500 4WD Crew Cab SLT",
      "2019 Mercedes-Benz C-Class 4d Sedan C300",
      "2018 Land Rover Range Rover Velar 4d SUV 4WD P250 SE R-Dynamic",
      "2018 Nissan Maxima Platinum 3.5L",
      "2018 Land Rover Range Rover 4d SUV 5.0L SC",
      "2014 Chevrolet Silverado 1500 4WD Double Cab 143.5",
      "2017 INFINITI QX50 4d SUV AWD",
      "2018 Toyota RAV4 XLE FWD (Natl)",
      "2011 Chevrolet MALIBU SEDAN",
      "2015 Mazda CX-5 FWD 4dr Auto Sport",
      "2016 GMC Yukon XL 4d SUV 4WD Denali",
      "2014 Subaru Forester 4d SUV i Limited",
      "2016 Land Rover Range Rover Sport 4WD 4dr V8",
      "2023 Toyota RAV4 LE FWD",
      "2021 Jeep Gladiator Freedom 4x4 *Ltd Avail*",
      "2019 Jeep Wrangler Unlimited Sport S 4x4",
      "2016 Lincoln MKZ 4d Sedan FWD Black Label EcoBoost",
      "2016 Land Rover Range Rover Sport 4WD 4dr V6 HSE",
      "2022 Toyota Camry SE Auto",
      "2008 Porsche Cayman 2d Coupe",
      "2003 Nissan Xterra 4d SUV 4WD XE AT",
      "2017 Toyota Tundra 4WD SR5 CrewMax 5.5' Bed 5.7L FFV (Natl)",
      "2017 Nissan Rogue 2017.5 FWD SL",
      "2006 Freightliner SPRINTER",
      "2018 Toyota Corolla LE CVT (Natl)",
      "2021 Ford Bronco Sport Big Bend 4x4",
      "2023 Ford Bronco 2 Door 4x4",
      "2014 Ford F-150 2WD SuperCrew",
      "2020 BMW X5 sDrive40i Sports Activity Vehicle",
      "2020 Nissan Altima 4d Sedan FWD 2.5L Platinum",
      "2016 GMC Yukon 4d SUV RWD SLT"
    ];
    
    let processed = 0;
    
    for (let i = 0; i < vehicles.length; i++) {
      const vehicleInfo = vehicles[i];
      
      // Parse year, make, model
      const yearMatch = vehicleInfo.match(/^(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;
      
      const remaining = vehicleInfo.substring(4).trim();
      const makeMatch = remaining.match(/^(\w+)/);
      const make = makeMatch ? makeMatch[1] : 'Unknown';
      
      const model = remaining.substring(make.length).trim() || 'Unknown';
      
      if (year && make) {
        const vin = `CC${year}${make.substring(0, 3).toUpperCase()}${String(i + 1).padStart(6, '0')}`;
        
        await pool.query(`
          INSERT INTO vehicles (
            vin, year, make, model, dealer_id, title, is_active, 
            is_available, condition, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [vin, year, make, model, dealerId, vehicleInfo, true, true, 'used']);
        
        processed++;
      }
    }
    
    const countResult = await pool.query('SELECT COUNT(*) FROM vehicles WHERE dealer_id = $1', [dealerId]);
    
    res.json({
      success: true,
      message: `Loaded ${processed} Car Choice vehicles from CSV`,
      totalVehicles: parseInt(countResult.rows[0].count)
    });
    
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ error: 'Load failed', details: error.message });
  }
});

export default router;