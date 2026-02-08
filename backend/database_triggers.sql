-- PostgreSQL Trigger for Automatic Location Updates
-- This file contains the SQL for the spatial trigger mentioned in Claude.md

-- Create the trigger function to update owned item locations when player moves
CREATE OR REPLACE FUNCTION update_owned_items_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all items owned by this player to match the player's new location
    UPDATE items 
    SET location = NEW.location 
    WHERE owner_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_update_owned_items
    AFTER UPDATE OF location ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_owned_items_location();

-- Optional: Create a trigger function for cascading deletes
CREATE OR REPLACE FUNCTION cleanup_player_items()
RETURNS TRIGGER AS $$
BEGIN
    -- Either delete owned items or make them available on the map again
    UPDATE items 
    SET owner_id = NULL, 
        expires_at = NOW() + INTERVAL '24 hours'
    WHERE owner_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the cascade trigger (optional - uncomment if needed)
-- CREATE TRIGGER trigger_cleanup_player_items
--     AFTER DELETE ON profiles
--     FOR EACH ROW
--     EXECUTE FUNCTION cleanup_player_items();