-- Guest User SQL for Wizard Go
-- Add this to your mock data or create a separate migration

-- Insert Guest User with fixed UUID for easy reference
INSERT INTO profiles (id, name, description, level, wins, losses, gems, location) VALUES
('00000000-0000-0000-0000-000000000001', 'Guest Wizard', 'A traveling mage exploring the realm', 3, 5, 2, 100, ST_SetSRID(ST_MakePoint(-83.3753, 33.9510), 4326))
ON CONFLICT (id) DO NOTHING;

-- Give the guest user some starting items
INSERT INTO items (id, type, subtype, owner_id, location, expires_at) VALUES
('00000000-0000-0000-0000-000000000101', 'Potion', 'Stun Brew', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(-83.3753, 33.9510), 4326), NULL),
('00000000-0000-0000-0000-000000000102', 'Wand', 'Oak Branch', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(-83.3753, 33.9510), 4326), NULL),
('00000000-0000-0000-0000-000000000103', 'Gem', 'Focus Crystal', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(-83.3753, 33.9510), 4326), NULL)
ON CONFLICT (id) DO NOTHING;