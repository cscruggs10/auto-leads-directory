-- Create table structure for Car Choice CSV data
-- Based on CSV columns: Position, Vehicle Info, Image

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

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_car_choice_position ON car_choice_inventory(position);
CREATE INDEX IF NOT EXISTS idx_car_choice_dealer ON car_choice_inventory(dealer_id);