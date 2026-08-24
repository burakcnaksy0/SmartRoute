-- Ensure explanation_text column is TEXT type (not VARCHAR(255))
-- This fixes the "value too long for type character varying(255)" error
-- when storing detailed fuel cost breakdowns and Smart Refuel recommendations.
ALTER TABLE journey_plans ALTER COLUMN explanation_text TYPE TEXT;
