ALTER TABLE journeys ADD COLUMN destination_lat DOUBLE PRECISION;
ALTER TABLE journeys ADD COLUMN destination_lng DOUBLE PRECISION;
ALTER TABLE journeys ADD COLUMN destination_address_text VARCHAR(255);
ALTER TABLE plan_legs ALTER COLUMN to_stop_id DROP NOT NULL;
