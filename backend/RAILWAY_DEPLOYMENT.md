# Wizard Go Backend - Railway.app Deployment

## Overview
This backend is optimized for deployment on Railway.app with PostgreSQL + PostGIS for spatial queries.

## Railway Setup

### 1. Database Configuration
- Add a PostgreSQL service to your Railway project
- Enable PostGIS extension: Run in PostgreSQL console:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 2. Environment Variables
Set these in your Railway project settings:

```bash
# Supabase Configuration (if using Supabase for auth)
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# Game Settings (optional)
MAX_COLLECTION_DISTANCE_METERS=10.0
ITEM_EXPIRATION_HOURS=24
DEFAULT_MAP_RADIUS_METERS=100.0
```

### 3. Deployment Process
1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Python project
3. Ensure `requirements.txt` is in the root
4. Set the start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Database Setup

Run this SQL in your PostgreSQL console to set up the schema:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE institutions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  password_hash text
);

CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name text UNIQUE,
  description text,
  level int DEFAULT 1,
  wins int DEFAULT 0,
  losses int DEFAULT 0,
  gems int DEFAULT 0,
  location geography(POINT)
);

CREATE TABLE maps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  institution_id uuid REFERENCES institutions(id)
);

CREATE TABLE items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text CHECK (type IN ('Potion', 'Gem', 'Chest', 'Wand', 'Scroll')),
  subtype text,
  owner_id uuid REFERENCES profiles(id),
  map_id uuid REFERENCES maps(id),
  location geography(POINT),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours')
);

CREATE TABLE battle_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attacker_id uuid REFERENCES profiles(id),
  defender_id uuid REFERENCES profiles(id),
  winner_id uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Spatial Indexes for Performance
CREATE INDEX idx_items_location ON items USING GIST (location);
CREATE INDEX idx_profiles_location ON profiles USING GIST (location);

-- Trigger to automatically update owned item locations when player moves
CREATE OR REPLACE FUNCTION update_owned_items_location()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items 
    SET location = NEW.location 
    WHERE owner_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_owned_items
    AFTER UPDATE OF location ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_owned_items_location();
```

## Health Check
The backend includes a `/health` endpoint that Railway can use for health checks.

## Scaling
- Start with 1x instance (free tier sufficient for development)
- Scale horizontally as user base grows
- Consider read replicas for heavy read loads

## Monitoring
- Railway provides built-in metrics and logs
- Monitor database connection pool usage
- Set up alerts for error rates