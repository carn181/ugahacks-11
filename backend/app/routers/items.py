from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID
from datetime import datetime, timedelta

from app.database import database
from app.schemas.schemas import Item, ItemCreate, ItemCollect, ItemUse
from app.services.item_service import ItemService
from app.core.config import settings

router = APIRouter()


@router.get("/map/{map_id}/proximity", response_model=List[Item])
async def get_nearby_items(map_id: UUID, latitude: float, longitude: float, radius: float = 100.0):
    query = """
    SELECT id, type, subtype, owner_id, map_id, 
           ST_AsGeoJSON(location) as location,
           expires_at
    FROM items 
    WHERE map_id = :map_id 
    AND owner_id IS NULL
    AND expires_at > NOW()
    AND ST_DWithin(
        location::geography,
        ST_GeomFromText('POINT(:longitude :latitude)', 4326)::geography,
        :radius
    )
    ORDER BY ST_Distance(
        location::geography,
        ST_GeomFromText('POINT(:longitude :latitude)', 4326)::geography
    )
    """
    
    results = await database.fetch_all(query, {
        "map_id": map_id,
        "longitude": longitude,
        "latitude": latitude,
        "radius": radius
    })
    
    items = []
    for result in results:
        location = None
        if result["location"]:
            import json
            location_data = json.loads(result["location"])
            location = {
                "type": location_data["type"],
                "coordinates": location_data["coordinates"]
            }
        
        items.append(Item(
            id=result["id"],
            type=result["type"],
            subtype=result["subtype"],
            owner_id=result["owner_id"],
            map_id=result["map_id"],
            location=location,
            expires_at=result["expires_at"]
        ))
    
    return items


@router.post("/items/collect")
async def collect_item(collect_data: ItemCollect):
    item_service = ItemService(database)
    
    # Check if item exists and is collectible
    item_query = """
    SELECT id, type, subtype, owner_id, map_id,
           ST_AsGeoJSON(location) as location,
           expires_at
    FROM items 
    WHERE id = :item_id
    """
    
    item = await database.fetch_one(item_query, {"item_id": collect_data.item_id})
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )
    
    if item["owner_id"] is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item already owned"
        )
    
    if item["expires_at"] and item["expires_at"] < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item has expired"
        )
    
    # Check proximity (within 10 meters)
    is_within_range = await item_service.check_proximity(
        collect_data.item_id,
        collect_data.player_latitude,
        collect_data.player_longitude,
        settings.max_collection_distance_meters
    )
    
    if not is_within_range:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item too far away to collect"
        )
    
    player_id = collect_data.player_id
    
    # Transfer ownership
    update_query = """
    UPDATE items 
    SET owner_id = :player_id,
        location = ST_GeomFromText('POINT(:longitude :latitude)', 4326)
    WHERE id = :item_id
    """
    
    await database.execute(update_query, {
        "player_id": player_id,
        "longitude": collect_data.player_longitude,
        "latitude": collect_data.player_latitude,
        "item_id": collect_data.item_id
    })
    
    return {"status": "collected", "item_id": collect_data.item_id}


@router.post("/items/use")
async def use_item(use_data: ItemUse):
    player_id = use_data.player_id
    
    # Check if item exists and is owned by player
    item_query = """
    SELECT id, type, subtype, owner_id
    FROM items 
    WHERE id = :item_id AND owner_id = :player_id
    """
    
    item = await database.fetch_one(item_query, {
        "item_id": use_data.item_id,
        "player_id": player_id
    })
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found or not owned by player"
        )
    
    # Apply item effects based on type and subtype
    effect_applied = await apply_item_effect(player_id, item)
    
    if not effect_applied:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot use this item"
        )
    
    # Remove the item after use
    delete_query = "DELETE FROM items WHERE id = :item_id"
    await database.execute(delete_query, {"item_id": use_data.item_id})
    
    return {"status": "used", "item_id": use_data.item_id, "effect": item["subtype"]}


@router.post("/items/spawn")
async def spawn_item(item_data: ItemCreate):
    query = """
    INSERT INTO items (type, subtype, map_id, location, expires_at)
    VALUES (:type, :subtype, :map_id, 
            ST_GeomFromText('POINT(:longitude :latitude)', 4326),
            NOW() + INTERVAL '24 hours')
    RETURNING id
    """
    
    result = await database.fetch_one(query, {
        "type": item_data.type,
        "subtype": item_data.subtype,
        "map_id": item_data.map_id,
        "longitude": item_data.longitude,
        "latitude": item_data.latitude
    })
    
    return {"status": "spawned", "item_id": result["id"]}


async def apply_item_effect(player_id: UUID, item: dict) -> bool:
    """Apply item effects based on type and subtype"""
    try:
        if item["type"] == "Chest" and item["subtype"] == "Iron Crate":
            # Give random gems (5-15)
            import random
            gems_awarded = random.randint(5, 15)
            
            update_gems = """
            UPDATE profiles 
            SET gems = gems + :gems_awarded
            WHERE id = :player_id
            """
            await database.execute(update_gems, {
                "gems_awarded": gems_awarded,
                "player_id": player_id
            })
            
            return True
        
        # Other item effects would be implemented here
        # For now, we'll just consume them
        
        return True
    except Exception:
        return False