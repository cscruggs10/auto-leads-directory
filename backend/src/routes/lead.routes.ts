import { Router } from 'express';
import { 
  createLead,
  getLeadById,
  getLeadStats 
} from '../controllers/lead.controller';
import { validate, leadSchema, sanitizeInput } from '../middleware/validation.middleware';

const router = Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

// POST /api/v1/leads - Create new lead
router.post('/', validate(leadSchema), createLead);

// GET /api/v1/leads/stats - Get lead statistics (protected route in production)
router.get('/stats', getLeadStats);

// GET /api/v1/leads/:id - Get specific lead (protected route in production)
router.get('/:id', getLeadById);

export default router;