import { Router } from 'express';
import { 
  getVehicles, 
  getVehicleByVIN, 
  searchVehicles,
  getFeaturedVehicles,
  getVehiclesByDealer 
} from '../controllers/vehicle.controller';
import { sanitizeInput } from '../middleware/validation.middleware';

const router = Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

// GET /api/v1/vehicles - Get all vehicles with filtering
router.get('/', getVehicles);

// GET /api/v1/vehicles/search - Advanced search
router.get('/search', searchVehicles);

// GET /api/v1/vehicles/featured - Get featured vehicles
router.get('/featured', getFeaturedVehicles);

// GET /api/v1/vehicles/dealer/:dealerId - Get vehicles by dealer
router.get('/dealer/:dealerId', getVehiclesByDealer);

// GET /api/v1/vehicles/:vin - Get specific vehicle by VIN
router.get('/:vin', getVehicleByVIN);

export default router;