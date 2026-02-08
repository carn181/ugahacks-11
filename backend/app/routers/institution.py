from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.schemas import Profile, Institution, ItemCreate
from app.database import database
import json
import uuid

router = APIRouter()

@router.post("/institution/login", response_model=Institution)
async def institution_login(credentials: Dict[str, str]):
    """
    Authenticate institution with name and password.
    Returns institution profile.
    """
    name = credentials.get("name", "").strip()
    password = credentials.get("password", "")
    
    if not name or not password:
        raise HTTPException(status_code=400, detail="Institution name and password are required")
    
    # Try to find existing institution
    query = """
    SELECT id, name
    FROM institutions
    WHERE name = :name AND password_hash = sha256(:password)
    """
    
    result = await database.fetch_one(query, {"name": name, "password": password})
    
    if not result:
        raise HTTPException(status_code=401, detail="Invalid institution credentials")
    
    return Institution(
        id=result["id"],
        name=result["name"]
    )

@router.get("/institution/{institution_id}/maps")
async def get_institution_maps(institution_id: str):
    """
    Get all maps for an institution.
    """
    query = """
    SELECT id, name, institution_id
    FROM maps
    WHERE institution_id = :institution_id
    """
    
    results = await database.fetch_all(query, {"institution_id": institution_id})
    
    maps = []
    for result in results:
        maps.append({
            "id": result["id"],
            "name": result["name"],
            "institution_id": result["institution_id"]
        })
    
    return maps

@router.post("/institution/{institution_id}/maps")
async def create_institution_map(institution_id: str, map_data: Dict[str, str]):
    """
    Create a new map for an institution.
    """
    map_name = map_data.get("name", "").strip()
    if not map_name:
        raise HTTPException(status_code=400, detail="Map name is required")
    
    # Verify institution exists
    institution_check = await database.fetch_one(
        "SELECT 1 FROM institutions WHERE id = :institution_id",
        {"institution_id": institution_id}
    )
    
    if not institution_check:
        raise HTTPException(status_code=404, detail="Institution not found")
    
    query = """
    INSERT INTO maps (id, name, institution_id)
    VALUES (:id, :name, :institution_id)
    RETURNING id, name, institution_id
    """
    
    result = await database.fetch_one(query, {
        "id": str(uuid.uuid4()),
        "name": map_name,
        "institution_id": institution_id
    })
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create map")
    
    return {
        "id": result["id"],
        "name": result["name"],
        "institution_id": result["institution_id"]
    }

@router.get("/institution/{institution_id}/items")
async def get_institution_items(institution_id: str):
    """
    Get all items placed by an institution across all their maps.
    """
    query = """
    SELECT i.id, i.type, i.subtype, i.map_id, 
           ST_AsGeoJSON(i.location) as location,
           i.expires_at, m.name as map_name
    FROM items i
    JOIN maps m ON i.map_id = m.id
    WHERE m.institution_id = :institution_id AND i.owner_id IS NULL
    ORDER BY m.name, i.created_at DESC
    """
    
    results = await database.fetch_all(query, {"institution_id": institution_id})
    
    items = []
    for result in results:
        location = None
        if result["location"]:
            location_data = json.loads(result["location"])
            location = {
                "type": location_data["type"],
                "coordinates": location_data["coordinates"],
            }
        
        items.append({
            "id": result["id"],
            "type": result["type"],
            "subtype": result["subtype"],
            "map_id": result["map_id"],
            "map_name": result["map_name"],
            "location": location,
            "expires_at": result["expires_at"]
        })
    
    return items

@router.post("/institution/{institution_id}/items")
async def create_institution_item(institution_id: str, item_data: Dict[str, Any]):
    """
    Create a new item at specific coordinates on a map.
    """
    required_fields = ["type", "subtype", "map_id", "latitude", "longitude"]
    for field in required_fields:
        if field not in item_data:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    # Verify map belongs to institution
    map_check = await database.fetch_one(
        "SELECT 1 FROM maps WHERE id = :map_id AND institution_id = :institution_id",
        {"map_id": item_data["map_id"], "institution_id": institution_id}
    )
    
    if not map_check:
        raise HTTPException(status_code=403, detail="Map does not belong to this institution")
    
    # Set expiration (24 hours from now or custom)
    expires_in_hours = item_data.get("expires_in_hours", 24)
    
    query = """
    INSERT INTO items (id, type, subtype, map_id, location, expires_at)
    VALUES (:id, :type, :subtype, :map_id, 
            ST_SetSRID(ST_MakePoint(CAST(:longitude AS float8), CAST(:latitude AS float8)), 4326),
            CASE WHEN :expires_in_hours > 0 
                 THEN NOW() + INTERVAL '1 hour' * :expires_in_hours 
                 ELSE NULL END)
    RETURNING id, type, subtype, map_id, expires_at
    """
    
    result = await database.fetch_one(query, {
        "id": str(uuid.uuid4()),
        "type": item_data["type"],
        "subtype": item_data["subtype"],
        "map_id": item_data["map_id"],
        "longitude": item_data["longitude"],
        "latitude": item_data["latitude"],
        "expires_in_hours": expires_in_hours
    })
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create item")
    
    return {
        "status": "created",
        "item_id": result["id"],
        "type": result["type"],
        "subtype": result["subtype"],
        "map_id": result["map_id"],
        "expires_at": result["expires_at"]
    }

@router.delete("/institution/{institution_id}/items/{item_id}")
async def delete_institution_item(institution_id: str, item_id: str):
    """
    Delete an item placed by an institution.
    """
    # Verify item belongs to institution's map
    verify_query = """
    SELECT i.id
    FROM items i
    JOIN maps m ON i.map_id = m.id
    WHERE i.id = :item_id AND m.institution_id = :institution_id
    """
    
    item_check = await database.fetch_one(verify_query, {
        "item_id": item_id,
        "institution_id": institution_id
    })
    
    if not item_check:
        raise HTTPException(status_code=404, detail="Item not found or not owned by institution")
    
    # Delete the item
    await database.execute("DELETE FROM items WHERE id = :item_id", {"item_id": item_id})
    
    return {"status": "deleted", "item_id": item_id}