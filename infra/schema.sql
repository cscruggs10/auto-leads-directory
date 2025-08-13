-- Drop existing tables if they exist
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS dealers CASCADE;
DROP TABLE IF EXISTS scraping_logs CASCADE;

-- Create dealers table
CREATE TABLE dealers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url VARCHAR(500),
    website_url VARCHAR(500),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    description TEXT,
    average_rating DECIMAL(2,1) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    scraping_enabled BOOLEAN DEFAULT true,
    scraping_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicles table
CREATE TABLE vehicles (
    vin VARCHAR(17) PRIMARY KEY,
    dealer_id INTEGER REFERENCES dealers(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    trim VARCHAR(100),
    body_style VARCHAR(50),
    exterior_color VARCHAR(50),
    interior_color VARCHAR(50),
    mileage INTEGER,
    engine VARCHAR(100),
    transmission VARCHAR(50),
    drivetrain VARCHAR(50),
    fuel_type VARCHAR(50),
    mpg_city INTEGER,
    mpg_highway INTEGER,
    price DECIMAL(10,2),
    down_payment_required DECIMAL(10,2),
    monthly_payment_estimate DECIMAL(10,2),
    photos JSONB DEFAULT '[]',
    features TEXT[],
    description TEXT,
    stock_number VARCHAR(50),
    is_available BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    views_count INTEGER DEFAULT 0,
    leads_count INTEGER DEFAULT 0,
    source_url VARCHAR(500),
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create leads table
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    vehicle_vin VARCHAR(17) REFERENCES vehicles(vin) ON DELETE SET NULL,
    dealer_id INTEGER REFERENCES dealers(id) ON DELETE SET NULL,
    
    -- Contact Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- Pre-qualification Information
    employment_status VARCHAR(50),
    monthly_income DECIMAL(10,2),
    down_payment_available DECIMAL(10,2),
    bankruptcy_status VARCHAR(50),
    credit_score_range VARCHAR(50),
    
    -- Additional Information
    preferred_contact_method VARCHAR(20),
    preferred_contact_time VARCHAR(50),
    comments TEXT,
    
    -- Lead Tracking
    lead_source VARCHAR(50) DEFAULT 'website',
    lead_type VARCHAR(50) DEFAULT 'price_request',
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    
    -- Delivery Status
    adf_xml TEXT,
    delivery_status VARCHAR(50) DEFAULT 'pending',
    delivery_attempts INTEGER DEFAULT 0,
    last_delivery_attempt TIMESTAMP WITH TIME ZONE,
    delivery_response TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- CRM Integration
    crm_lead_id VARCHAR(100),
    crm_sync_status VARCHAR(50),
    crm_synced_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create scraping logs table
CREATE TABLE scraping_logs (
    id SERIAL PRIMARY KEY,
    dealer_id INTEGER REFERENCES dealers(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    vehicles_found INTEGER DEFAULT 0,
    vehicles_added INTEGER DEFAULT 0,
    vehicles_updated INTEGER DEFAULT 0,
    vehicles_removed INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_vehicles_dealer_id ON vehicles(dealer_id);
CREATE INDEX idx_vehicles_year_make_model ON vehicles(year, make, model);
CREATE INDEX idx_vehicles_down_payment ON vehicles(down_payment_required);
CREATE INDEX idx_vehicles_is_available ON vehicles(is_available);
CREATE INDEX idx_vehicles_created_at ON vehicles(created_at DESC);

CREATE INDEX idx_leads_vehicle_vin ON leads(vehicle_vin);
CREATE INDEX idx_leads_dealer_id ON leads(dealer_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_delivery_status ON leads(delivery_status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

CREATE INDEX idx_scraping_logs_dealer_id ON scraping_logs(dealer_id);
CREATE INDEX idx_scraping_logs_status ON scraping_logs(status);
CREATE INDEX idx_scraping_logs_started_at ON scraping_logs(started_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_dealers_updated_at BEFORE UPDATE ON dealers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample dealers for Memphis, TN
INSERT INTO dealers (name, slug, website_url, city, state, description, scraping_config) VALUES
('Memphis Auto Sales', 'memphis-auto-sales', 'https://example.com/mas', 'Memphis', 'TN', 'Quality pre-owned vehicles with easy financing', '{"selector": ".vehicle-item", "paginate": true}'),
('Beale Street Motors', 'beale-street-motors', 'https://example.com/bsm', 'Memphis', 'TN', 'Buy Here Pay Here specialist serving Memphis', '{"selector": ".car-listing", "paginate": false}'),
('Riverside Auto Group', 'riverside-auto-group', 'https://example.com/rag', 'Memphis', 'TN', 'Affordable vehicles with low down payments', '{"selector": ".inventory-item", "paginate": true}');