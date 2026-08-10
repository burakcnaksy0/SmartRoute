-- Alter users to add preferences and settings columns
ALTER TABLE users ADD COLUMN map_provider VARCHAR(50) DEFAULT 'Google Haritalar';
ALTER TABLE users ADD COLUMN distance_unit VARCHAR(50) DEFAULT 'Kilometre';
ALTER TABLE users ADD COLUMN language VARCHAR(50) DEFAULT 'Türkçe';
ALTER TABLE users ADD COLUMN departure_alerts BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN service_disruptions BOOLEAN DEFAULT FALSE;
