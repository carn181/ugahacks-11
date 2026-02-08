from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import database
from app.schemas.schemas import Item, LocationUpdate, Profile, ProfileUpdate
from app.services.location_service import LocationService

router = APIRouter()


@router.get("/player/{player_id}", response_model=Profile)
async def get_player(player_id: UUID):
    query = """
    SELECT id, name, description, level, wins, losses, gems,
           ST_AsGeoJSON(location) as location
    FROM profiles
    WHERE id = :player_id
    """

    result = await database.fetch_one(query, {"player_id": player_id})

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Player not found"
        )

    # Parse location from GeoJSON
    location = None
    if result["location"]:
        import json

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


@router.get("/player/{player_id}/inventory", response_model=List[Item])
async def get_player_inventory(player_id: UUID):
    # Ensure player exists before returning inventory
    player_exists = await database.fetch_one(
        "SELECT 1 FROM profiles WHERE id = :player_id", {"player_id": player_id}
    )
    if not player_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Player not found"
        )

    query = """
    SELECT id, type, subtype, owner_id, map_id,
           ST_AsGeoJSON(location) as location,
           expires_at
    FROM items
    WHERE owner_id = :player_id

    """

    results = await database.fetch_all(query, {"player_id": player_id})

    items = []
    for result in results:
        location = None
        if result["location"]:
            import json

            location_data = json.loads(result["location"])
            location = {
                "type": location_data["type"],
                "coordinates": location_data["coordinates"],
            }

        items.append(
            Item(
                id=result["id"],
                type=result["type"],
                subtype=result["subtype"],
                owner_id=result["owner_id"],
                map_id=result["map_id"],
                location=location,
                expires_at=result["expires_at"],
            )
        )

    return items


@router.patch("/player/sync")
async def sync_player_location(sync_data: LocationUpdate):
    location_service = LocationService(database)

    # Validate player exists
    player_id = sync_data.player_id
    player_exists = await database.fetch_one(
        "SELECT 1 FROM profiles WHERE id = :player_id", {"player_id": player_id}
    )
    if not player_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Player not found"
        )

    # Update player location
    update_query = """
    UPDATE profiles
    SET location = ST_SetSRID(ST_MakePoint(CAST(:longitude AS float8), CAST(:latitude AS float8)), 4326)
    WHERE id = :player_id
    """

    await database.execute(
        update_query,
        {
            "longitude": sync_data.longitude,
            "latitude": sync_data.latitude,
            "player_id": player_id,
        },
    )

    # Update all owned items to match player location
    await location_service.update_owned_items_location(
        player_id, sync_data.latitude, sync_data.longitude
    )

    return {
        "status": "synced",
        "location": {"lat": sync_data.latitude, "lng": sync_data.longitude},
    }
