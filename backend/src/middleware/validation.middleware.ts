import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './error.middleware';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
};

// Lead validation schemas
export const leadSchema = Joi.object({
  vehicle_vin: Joi.string().length(17).required(),
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[\d\s\-\(\)\+]+$/).min(10).max(20).required(),
  employment_status: Joi.string().valid('full_time', 'part_time', 'self_employed', 'unemployed', 'retired').required(),
  down_payment_available: Joi.number().min(0).max(50000).required(),
  bankruptcy_status: Joi.string().valid('none', 'discharged', 'active').required(),
  credit_score_range: Joi.string().valid('300-500', '500-600', '600-700', '700+').optional(),
  preferred_contact_method: Joi.string().valid('phone', 'email', 'text').optional(),
  preferred_contact_time: Joi.string().optional(),
  comments: Joi.string().max(1000).optional(),
  utm_source: Joi.string().optional(),
  utm_medium: Joi.string().optional(),
  utm_campaign: Joi.string().optional(),
});

// Vehicle search validation schema
export const vehicleSearchSchema = Joi.object({
  region: Joi.string().optional(),
  year_min: Joi.number().min(1990).max(new Date().getFullYear() + 1).optional(),
  year_max: Joi.number().min(1990).max(new Date().getFullYear() + 1).optional(),
  make: Joi.string().optional(),
  model: Joi.string().optional(),
  down_payment_max: Joi.number().min(0).max(50000).optional(),
  mileage_max: Joi.number().min(0).max(500000).optional(),
  page: Joi.number().min(1).optional(),
  limit: Joi.number().min(1).max(100).optional(),
  sort: Joi.string().valid('price_asc', 'price_desc', 'year_desc', 'year_asc', 'mileage_asc', 'mileage_desc').optional(),
});

// Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Basic XSS prevention - strip HTML tags from string inputs
  const sanitizeString = (str: string): string => {
    return str.replace(/<[^>]*>/g, '').trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query) as any;
  }

  next();
};