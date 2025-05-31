-- Create Keycloak database
CREATE DATABASE keycloak;

-- Enable PostGIS extension
\c openmaas;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- Create schemas for different services
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS transit;
CREATE SCHEMA IF NOT EXISTS booking;
CREATE SCHEMA IF NOT EXISTS payment;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Create basic tables for users schema
CREATE TABLE IF NOT EXISTS users.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(255) UNIQUE NOT NULL, -- Keycloak user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create basic tables for transit schema (GTFS)
CREATE TABLE IF NOT EXISTS transit.agencies (
    agency_id VARCHAR(255) PRIMARY KEY,
    agency_name VARCHAR(255) NOT NULL,
    agency_url VARCHAR(255),
    agency_timezone VARCHAR(50),
    agency_lang VARCHAR(10),
    agency_phone VARCHAR(50),
    agency_fare_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transit.stops (
    stop_id VARCHAR(255) PRIMARY KEY,
    stop_code VARCHAR(50),
    stop_name VARCHAR(255) NOT NULL,
    stop_desc TEXT,
    stop_lat DECIMAL(10,8) NOT NULL,
    stop_lon DECIMAL(11,8) NOT NULL,
    zone_id VARCHAR(255),
    stop_url VARCHAR(255),
    location_type INTEGER DEFAULT 0,
    parent_station VARCHAR(255),
    stop_timezone VARCHAR(50),
    wheelchair_boarding INTEGER DEFAULT 0,
    location GEOGRAPHY(POINT, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX idx_stops_location ON transit.stops USING GIST(location);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON transit.agencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stops_updated_at BEFORE UPDATE ON transit.stops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();