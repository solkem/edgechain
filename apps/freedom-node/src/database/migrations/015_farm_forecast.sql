CREATE TABLE IF NOT EXISTS farm_forecast_locations (
  farmer_id UUID NOT NULL,
  farm_id UUID NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  PRIMARY KEY (farmer_id, farm_id),
  FOREIGN KEY (farmer_id, farm_id) REFERENCES farm_memberships(farmer_id, farm_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS farm_forecast_briefings (
  briefing_id UUID PRIMARY KEY,
  farmer_id UUID NOT NULL,
  farm_id UUID NOT NULL,
  briefing JSONB NOT NULL,
  rain_observed BOOLEAN,
  observed_at TIMESTAMPTZ,
  FOREIGN KEY (farmer_id, farm_id) REFERENCES farm_memberships(farmer_id, farm_id) ON DELETE CASCADE
);
