import { Router } from 'express';
import { 
  triggerScraping,
  getScrapingStatus,
  getScrapingLogs 
} from '../controllers/scraper.controller';
import { sanitizeInput } from '../middleware/validation.middleware';

const router = Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

// POST /api/v1/scraper/trigger - Manually trigger scraping (protected in production)
router.post('/trigger', triggerScraping);

// GET /api/v1/scraper/status - Get current scraping status
router.get('/status', getScrapingStatus);

// GET /api/v1/scraper/logs - Get scraping logs
router.get('/logs', getScrapingLogs);

export default router;