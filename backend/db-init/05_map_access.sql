-- Map Access Control: many-to-many between profiles and maps
CREATE TABLE IF NOT EXISTS map_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, map_id)
);

CREATE INDEX IF NOT EXISTS idx_map_access_profile ON map_access(profile_id);
CREATE INDEX IF NOT EXISTS idx_map_access_map ON map_access(map_id);

-- Seed: Grant mock players access to maps
INSERT INTO map_access (profile_id, map_id) VALUES
-- All 5 mock players + guest get Main Campus
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440011'),
('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440011'),
('00000000-0000-0000-0000-000000000001', '550e8400-e29b-41d4-a716-446655440011'),
-- FireMage and IceQueen also get North Quad
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440012'),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440012')
ON CONFLICT (profile_id, map_id) DO NOTHING;
