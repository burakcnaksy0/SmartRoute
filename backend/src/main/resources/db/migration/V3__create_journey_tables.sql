-- Create journeys table
CREATE TABLE journeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    start_lat DOUBLE PRECISION NOT NULL,
    start_lng DOUBLE PRECISION NOT NULL,
    start_address_text VARCHAR(255),
    planned_departure_time TIMESTAMP,
    deadline_time TIMESTAMP,
    raw_nlp_input TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create journey_stops table
CREATE TABLE journey_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    sequence_order INT NOT NULL,
    optimized_order INT,
    place_name VARCHAR(255) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    visit_duration_minutes INT NOT NULL,
    time_window_start TIMESTAMP,
    time_window_end TIMESTAMP,
    priority VARCHAR(50) NOT NULL,
    stop_type VARCHAR(50) NOT NULL
);

-- Create journey_plans table
CREATE TABLE journey_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    plan_label VARCHAR(50) NOT NULL,
    total_duration_seconds INT NOT NULL,
    total_distance_meters INT NOT NULL,
    total_toll_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_fuel_cost_estimate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    traffic_risk_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    overall_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    eta_confidence_percent INT,
    is_selected BOOLEAN NOT NULL DEFAULT FALSE,
    explanation_text TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create plan_legs table
CREATE TABLE plan_legs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES journey_plans(id) ON DELETE CASCADE,
    from_stop_id UUID REFERENCES journey_stops(id) ON DELETE SET NULL,
    to_stop_id UUID NOT NULL REFERENCES journey_stops(id) ON DELETE CASCADE,
    leg_order INT NOT NULL,
    distance_meters INT NOT NULL,
    duration_seconds INT NOT NULL,
    polyline_encoded TEXT NOT NULL,
    toll_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

-- Create indexes
CREATE INDEX idx_journeys_user_created ON journeys(user_id, created_at DESC);
CREATE INDEX idx_journey_stops_journey ON journey_stops(journey_id);
CREATE INDEX idx_journey_plans_journey ON journey_plans(journey_id);
CREATE INDEX idx_plan_legs_plan ON plan_legs(plan_id);
