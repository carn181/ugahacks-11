-- Mock Data for Wizard Go Testing & Demo
-- Idempotent: uses ON CONFLICT DO NOTHING
-- Run this script in your PostgreSQL database after setting up the schema

-- Insert Test Institutions
INSERT INTO institutions (id, name, password_hash) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'University of Magic', sha256('wizard123')),
('550e8400-e29b-41d4-a716-446655440002', 'Arcane Academy', sha256('magic123'))
ON CONFLICT (id) DO NOTHING;

-- Insert Test Maps
INSERT INTO maps (id, name, institution_id) VALUES
('550e8400-e29b-41d4-a716-446655440011', 'Main Campus', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440012', 'North Quad', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440013', 'Science Building', '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (id) DO NOTHING;

-- Insert Test Players
INSERT INTO profiles (id, name, description, level, wins, losses, gems, location) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'FireMage', 'A powerful fire wizard', 5, 12, 3, 150, ST_SetSRID(ST_MakePoint(-83.3753, 33.9510), 4326)),
('550e8400-e29b-41d4-a716-446655440102', 'IceQueen', 'Master of ice spells', 3, 8, 2, 85, ST_SetSRID(ST_MakePoint(-83.3748, 33.9508), 4326)),
('550e8400-e29b-41d4-a716-446655440103', 'ShadowNinja', 'Stealthy dark wizard', 7, 20, 5, 220, ST_SetSRID(ST_MakePoint(-83.3760, 33.9512), 4326)),
('550e8400-e29b-41d4-a716-446655440104', 'NatureDruid', 'Guardian of the forest', 4, 10, 4, 120, ST_SetSRID(ST_MakePoint(-83.3745, 33.9515), 4326)),
('550e8400-e29b-41d4-a716-446655440105', 'StormCaller', 'Commands the winds', 6, 15, 3, 180, ST_SetSRID(ST_MakePoint(-83.3758, 33.9505), 4326))
ON CONFLICT (id) DO NOTHING;

-- Insert Test Items on Maps (UGA MLC Grounds area)
INSERT INTO items (id, type, subtype, map_id, location, expires_at) VALUES
('550e8400-e29b-41d4-a716-446655440201', 'Potion', 'Stun Brew', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3753, 33.9506), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440202', 'Potion', 'Stun Brew', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3750, 33.9509), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440203', 'Potion', 'Stun Brew', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3756, 33.9510), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440211', 'Gem', 'Focus Crystal', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3748, 33.9512), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440212', 'Gem', 'Focus Crystal', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3760, 33.9512), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440213', 'Gem', 'Focus Crystal', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3753, 33.9512), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440221', 'Chest', 'Iron Crate', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3745, 33.9516), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440222', 'Chest', 'Iron Crate', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3762, 33.9516), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440231', 'Wand', 'Oak Branch', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3750, 33.9510), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440232', 'Wand', 'Oak Branch', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3756, 33.9503), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440241', 'Scroll', 'Mirror Image', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3742, 33.9503), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440242', 'Scroll', 'Mirror Image', '550e8400-e29b-41d4-a716-446655440011', ST_SetSRID(ST_MakePoint(-83.3766, 33.9510), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440301', 'Potion', 'Stun Brew', '550e8400-e29b-41d4-a716-446655440012', ST_SetSRID(ST_MakePoint(-83.3738, 33.9520), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440302', 'Gem', 'Focus Crystal', '550e8400-e29b-41d4-a716-446655440012', ST_SetSRID(ST_MakePoint(-83.3743, 33.9528), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440303', 'Chest', 'Iron Crate', '550e8400-e29b-41d4-a716-446655440012', ST_SetSRID(ST_MakePoint(-83.3732, 33.9520), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440401', 'Potion', 'Stun Brew', '550e8400-e29b-41d4-a716-446655440013', ST_SetSRID(ST_MakePoint(-83.3738, 33.9535), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440402', 'Wand', 'Oak Branch', '550e8400-e29b-41d4-a716-446655440013', ST_SetSRID(ST_MakePoint(-83.3743, 33.9543), 4326), NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440403', 'Scroll', 'Mirror Image', '550e8400-e29b-41d4-a716-446655440013', ST_SetSRID(ST_MakePoint(-83.3732, 33.9543), 4326), NOW() + INTERVAL '24 hours')
ON CONFLICT (id) DO NOTHING;

-- Insert items owned by players
INSERT INTO items (id, type, subtype, owner_id, location, expires_at) VALUES
('550e8400-e29b-41d4-a716-446655440501', 'Potion', 'Stun Brew', '550e8400-e29b-41d4-a716-446655440101', ST_SetSRID(ST_MakePoint(-83.3753, 33.9510), 4326), NULL),
('550e8400-e29b-41d4-a716-446655440502', 'Wand', 'Oak Branch', '550e8400-e29b-41d4-a716-446655440101', ST_SetSRID(ST_MakePoint(-83.3753, 33.9510), 4326), NULL),
('550e8400-e29b-41d4-a716-446655440503', 'Gem', 'Focus Crystal', '550e8400-e29b-41d4-a716-446655440102', ST_SetSRID(ST_MakePoint(-83.3748, 33.9508), 4326), NULL),
('550e8400-e29b-41d4-a716-446655440504', 'Chest', 'Iron Crate', '550e8400-e29b-41d4-a716-446655440103', ST_SetSRID(ST_MakePoint(-83.3760, 33.9512), 4326), NULL),
('550e8400-e29b-41d4-a716-446655440505', 'Scroll', 'Mirror Image', '550e8400-e29b-41d4-a716-446655440104', ST_SetSRID(ST_MakePoint(-83.3745, 33.9515), 4326), NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert some battle history
INSERT INTO battle_logs (id, attacker_id, defender_id, winner_id, created_at) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440101', NOW() - INTERVAL '2 hours'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440103', NOW() - INTERVAL '1 hour'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440104', NOW() - INTERVAL '30 minutes'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440101', NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_location_gist ON items USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_profiles_location_gist ON profiles USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_items_map_id ON items (map_id);
CREATE INDEX IF NOT EXISTS idx_items_owner_id ON items (owner_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_attacker ON battle_logs (attacker_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_defender ON battle_logs (defender_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_created ON battle_logs (created_at);

-- Trigger for automatic item location updates (idempotent)
CREATE OR REPLACE FUNCTION update_owned_items_location()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE items
    SET location = NEW.location
    WHERE owner_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_owned_items ON profiles;
CREATE TRIGGER trigger_update_owned_items
    AFTER UPDATE OF location ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_owned_items_location();
