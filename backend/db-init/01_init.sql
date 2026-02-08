 -- Initialization SQL for PostGIS and minimal schema
 CREATE EXTENSION IF NOT EXISTS postgis;
 CREATE EXTENSION IF NOT EXISTS "pgcrypto";

 -- Minimal schema to support the backend for initial testing
 CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  password_hash TEXT
 );

 CREATE TABLE maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  institution_id UUID REFERENCES institutions(id)
 );

 CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  level INT DEFAULT 1,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  gems INT DEFAULT 0,
  location geography(POINT)
 );

 CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('Potion','Gem','Chest','Wand','Scroll')),
  subtype TEXT,
  owner_id UUID REFERENCES profiles(id),
  map_id UUID REFERENCES maps(id),
  location geography(POINT),
  expires_at TIMESTAMP WITH TIME ZONE
 );

 CREATE TABLE battle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id UUID REFERENCES profiles(id),
  defender_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );

 CREATE INDEX idx_items_location ON items USING GIST(location);
 CREATE INDEX idx_profiles_location ON profiles USING GIST(location);
