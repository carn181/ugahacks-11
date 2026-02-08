from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from app.schemas.schemas import Profile, ProfileCreate
from app.database import database
import json
import uuid

router = APIRouter()

# Fixed guest user UUID - this matches the one in the SQL
GUEST_USER_ID = "00000000-0000-0000-0000-000000000001"

@router.get("/guest/login", response_model=Profile)
async def guest_login():
    """
    Returns the universal guest user profile.
    This allows users to try the app without registration.
    """
    query = """
    SELECT id, name, description, level, wins, losses, gems,
           ST_AsGeoJSON(location) as location
    FROM profiles
    WHERE id = :guest_id
    """
    
    from app.database import database
    result = await database.fetch_one(query, {"guest_id": GUEST_USER_ID})
    
    if not result:
        # Fallback: create guest user if not exists
        create_query = """
        INSERT INTO profiles (id, name, description, level, wins, losses, gems, location)
        VALUES (:id, :name, :description, :level, :wins, :losses, :gems, 
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
        ON CONFLICT (id) DO NOTHING
        RETURNING id, name, description, level, wins, losses, gems,
                  ST_AsGeoJSON(location) as location
        """
        
        result = await database.fetch_one(create_query, {
            "id": GUEST_USER_ID,
            "name": "Guest Wizard",
            "description": "A traveling mage exploring the realm",
            "level": 3,
            "wins": 5,
            "losses": 2,
            "gems": 100,
            "lng": -83.3753,
            "lat": 33.9510
        })
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create guest user")
    
    # Parse location from GeoJSON
    location = None
    if result["location"]:
        location_data = json.loads(result["location"])
        location = {
            "type": location_data["type"],
            "coordinates": location_data["coordinates"],
        }
    
    return Profile(
        id=result["id"],
        name=result["name"],
        description=result["description"],
        level=result["level"],
        wins=result["wins"],
        losses=result["losses"],
        gems=result["gems"],
        location=location,
    )

@router.post("/user/login", response_model=Profile)
async def user_login(user_data: Dict[str, str]):
    """
    Login or create a user with the given name.
    Returns the user profile.
    """
    wizard_name = user_data.get("name", "").strip()
    if not wizard_name:
        raise HTTPException(status_code=400, detail="Wizard name is required")
    
    # Try to find existing user
    query = """
    SELECT id, name, description, level, wins, losses, gems,
           ST_AsGeoJSON(location) as location
    FROM profiles
    WHERE name = :name
    """
    
    result = await database.fetch_one(query, {"name": wizard_name})
    
    if not result:
        # Create new user
        create_query = """
        INSERT INTO profiles (id, name, description, level, wins, losses, gems, location)
        VALUES (:id, :name, :description, :level, :wins, :losses, :gems, 
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))
        RETURNING id, name, description, level, wins, losses, gems,
                  ST_AsGeoJSON(location) as location
        """
        
        result = await database.fetch_one(create_query, {
            "id": str(uuid.uuid4()),
            "name": wizard_name,
            "description": f"A wizard learning the magical arts",
            "level": 1,
            "wins": 0,
            "losses": 0,
            "gems": 50,
            "lng": -83.3753,
            "lat": 33.9510
        })
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create or retrieve user")
    
    # Parse location from GeoJSON
    location = None
    if result["location"]:
        location_data = json.loads(result["location"])
        location = {
            "type": location_data["type"],
            "coordinates": location_data["coordinates"],
        }
    
    return Profile(
        id=result["id"],
        name=result["name"],
        description=result["description"],
        level=result["level"],
        wins=result["wins"],
        losses=result["losses"],
        gems=result["gems"],
        location=location,
    )

@router.post("/guest/reset")
async def reset_guest_data():
    """
    Reset guest user data to defaults.
    Useful for demo purposes to start fresh.
    """
    query = """
    UPDATE profiles 
    SET level = 3, wins = 5, losses = 2, gems = 100,
        location = ST_SetSRID(ST_MakePoint(-83.3753, 33.9510), 4326)
    WHERE id = :guest_id
    """
    
    from app.database import database
    await database.execute(query, {"guest_id": GUEST_USER_ID})
    
    # Reset inventory - remove current items and give starter items
    delete_items_query = """
    DELETE FROM items WHERE owner_id = :guest_id
    """
    await database.execute(delete_items_query, {"guest_id": GUEST_USER_ID})
    
    # Give starter items
    starter_items = [
        ("00000000-0000-0000-0000-000000000101", "Potion", "Stun Brew"),
        ("00000000-0000-0000-0000-000000000102", "Wand", "Oak Branch"),
        ("00000000-0000-0000-0000-000000000103", "Gem", "Focus Crystal"),
    ]
    
    for item_id, item_type, subtype in starter_items:
        insert_query = """
        INSERT INTO items (id, type, subtype, owner_id, location, expires_at)
        VALUES (:id, :type, :subtype, :owner_id, 
                ST_SetSRID(ST_MakePoint(-83.3753, 33.9510), 4326), NULL)
        ON CONFLICT (id) DO NOTHING
        """
        await database.execute(insert_query, {
            "id": item_id,
            "type": item_type,
            "subtype": subtype,
            "owner_id": GUEST_USER_ID
        })
    
    return {"status": "reset", "message": "Guest data reset to defaults"}