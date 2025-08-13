import { Router } from 'express';
import { 
  getDealers, 
  getDealerById,
  getDealerBySlug,
  getDealersByRegion 
} from '../controllers/dealer.controller';
import { sanitizeInput } from '../middleware/validation.middleware';

const router = Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

// GET /api/v1/dealers - Get all dealers
router.get('/', getDealers);

// GET /api/v1/dealers/region/:region - Get dealers by region
router.get('/region/:region', getDealersByRegion);

// GET /api/v1/dealers/slug/:slug - Get dealer by slug
router.get('/slug/:slug', getDealerBySlug);

// GET /api/v1/dealers/:id - Get specific dealer
router.get('/:id', getDealerById);

export default router;