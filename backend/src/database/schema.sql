-- Auto Leads Directory Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Dealers table
CREATE TABLE IF NOT EXISTS dealers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  website_url TEXT,
  logo_url TEXT,
  average_rating DECIMAL(2,1) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  description TEXT,
  vehicle_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  scraping_enabled BOOLEAN DEFAULT false,
  scraping_config JSONB DEFAULT '{}',
  license_number VARCHAR(100),
  business_hours JSONB,
  services JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  vin VARCHAR(17) UNIQUE NOT NULL,
  dealer_id INTEGER REFERENCES dealers(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  make VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  trim VARCHAR(100),
  mileage INTEGER,
  price DECIMAL(10,2),
  down_payment_required DECIMAL(10,2),
  photos JSONB DEFAULT '[]',
  exterior_color VARCHAR(50),
  interior_color VARCHAR(50),
  transmission VARCHAR(100),
  engine VARCHAR(200),
  fuel_type VARCHAR(50),
  drivetrain VARCHAR(20),
  body_type VARCHAR(50),
  doors INTEGER,
  cylinders INTEGER,
  mpg_city INTEGER,
  mpg_highway INTEGER,
  features JSONB DEFAULT '[]',
  condition VARCHAR(20) DEFAULT 'used',
  accident_history BOOLEAN DEFAULT false,
  service_records JSONB DEFAULT '[]',
  source_url TEXT,
  stock_number VARCHAR(100),
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_certified BOOLEAN DEFAULT false,
  days_on_lot INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  lead_count INTEGER DEFAULT 0,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT uuid_generate_v4(),
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  dealer_id INTEGER REFERENCES dealers(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  preferred_contact VARCHAR(20) DEFAULT 'phone',
  monthly_income DECIMAL(10,2),
  employment_status VARCHAR(50),
  credit_score_range VARCHAR(20),
  down_payment_amount DECIMAL(10,2),
  trade_in_vehicle BOOLEAN DEFAULT false,
  trade_in_details JSONB,
  financing_preapproved BOOLEAN DEFAULT false,
  message TEXT,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  referrer_url TEXT,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'new',
  priority INTEGER DEFAULT 1,
  assigned_to VARCHAR(255),
  follow_up_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead activities table
CREATE TABLE IF NOT EXISTS lead_activities (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  activity_data JSONB DEFAULT '{}',
  performed_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scraping logs table
CREATE TABLE IF NOT EXISTS scraping_logs (
  id SERIAL PRIMARY KEY,
  dealer_id INTEGER REFERENCES dealers(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  vehicles_found INTEGER DEFAULT 0,
  vehicles_added INTEGER DEFAULT 0,
  vehicles_updated INTEGER DEFAULT 0,
  vehicles_removed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  dealer_id INTEGER REFERENCES dealers(id) ON DELETE CASCADE,
  lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  review_text TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  response_text TEXT,
  response_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vehicles_dealer_id ON vehicles(dealer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model);
CREATE INDEX IF NOT EXISTS idx_vehicles_year ON vehicles(year);
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles(price);
CREATE INDEX IF NOT EXISTS idx_vehicles_available ON vehicles(is_available);
CREATE INDEX IF NOT EXISTS idx_vehicles_featured ON vehicles(is_featured);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at);

CREATE INDEX IF NOT EXISTS idx_dealers_slug ON dealers(slug);
CREATE INDEX IF NOT EXISTS idx_dealers_city_state ON dealers(city, state);
CREATE INDEX IF NOT EXISTS idx_dealers_active ON dealers(is_active);

CREATE INDEX IF NOT EXISTS idx_leads_dealer_id ON leads(dealer_id);
CREATE INDEX IF NOT EXISTS idx_leads_vehicle_id ON leads(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE INDEX IF NOT EXISTS idx_scraping_logs_dealer_id ON scraping_logs(dealer_id);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_status ON scraping_logs(status);

CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_entity ON analytics(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_dealers_updated_at BEFORE UPDATE ON dealers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();