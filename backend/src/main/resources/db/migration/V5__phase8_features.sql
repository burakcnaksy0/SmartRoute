-- Alter users to add weights for preference learning
ALTER TABLE users ADD COLUMN weight_time DECIMAL(3, 2) DEFAULT 0.50;
ALTER TABLE users ADD COLUMN weight_cost DECIMAL(3, 2) DEFAULT 0.50;

-- Create vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(255) NOT NULL,
    brand VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    model_year INT NOT NULL,
    fuel_type VARCHAR(50) NOT NULL,
    fuel_consumption_l_per_100km DECIMAL(10, 2),
    energy_consumption_kwh_per_100km DECIMAL(10, 2),
    tank_capacity_liters DECIMAL(10, 2),
    battery_capacity_kwh DECIMAL(10, 2),
    usable_range_km INT,
    charging_connector_type VARCHAR(100),
    average_charging_speed_kw DECIMAL(10, 2),
    emission_class VARCHAR(50),
    toll_class VARCHAR(50),
    height_cm INT,
    width_cm INT,
    length_cm INT,
    weight_kg INT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Alter journeys to add vehicle and completion details
ALTER TABLE journeys ADD COLUMN vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL;
ALTER TABLE journeys ADD COLUMN actual_distance_meters INT;
ALTER TABLE journeys ADD COLUMN actual_duration_seconds INT;
ALTER TABLE journeys ADD COLUMN completed_at TIMESTAMP;
ALTER TABLE journeys ADD COLUMN completion_status VARCHAR(50);

-- Alter journey_plans to add energy cost and EV charging details
ALTER TABLE journey_plans ADD COLUMN estimated_energy_cost DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE journey_plans ADD COLUMN requires_charging_stop BOOLEAN DEFAULT FALSE;
ALTER TABLE journey_plans ADD COLUMN charging_stop_count INT DEFAULT 0;

-- Create charging_stops table
CREATE TABLE charging_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES journey_plans(id) ON DELETE CASCADE,
    after_leg_order INT NOT NULL,
    station_place_id VARCHAR(255),
    estimated_charging_minutes INT NOT NULL,
    estimated_soc_arrival_percent INT NOT NULL
);

-- Create route_feedbacks table
CREATE TABLE route_feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    selected_plan_label VARCHAR(50) NOT NULL,
    rejected_plan_labels VARCHAR(500),
    actual_duration_seconds INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create trip_expenses table
CREATE TABLE trip_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL UNIQUE REFERENCES journeys(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    entry_method VARCHAR(50) NOT NULL,
    odometer_start_km INT,
    odometer_end_km INT,
    actual_fuel_liters DECIMAL(10, 2),
    actual_energy_kwh DECIMAL(10, 2),
    actual_fuel_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    actual_toll_cost DECIMAL(10, 2),
    estimated_fuel_cost_at_planning DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    variance_percent DECIMAL(10, 2),
    receipt_photo_url VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for the new tables
CREATE INDEX idx_vehicles_user ON vehicles(user_id);
CREATE INDEX idx_route_feedbacks_user ON route_feedbacks(user_id);
CREATE INDEX idx_trip_expenses_journey ON trip_expenses(journey_id);
