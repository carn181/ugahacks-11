from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from uuid import UUID

from app.database import database
from app.schemas.schemas import Map, MapCreate, Institution, InstitutionCreate

router = APIRouter()


@router.get("/institutions", response_model=List[Institution])
async def get_institutions():
    query = """
    SELECT id, name 
    FROM institutions 
    ORDER BY name
    """
    
    results = await database.fetch_all(query)
    
    institutions = []
    for result in results:
        institutions.append(Institution(
            id=result["id"],
            name=result["name"]
        ))
    
    return institutions


@router.post("/institutions", response_model=Institution)
async def create_institution(institution_data: InstitutionCreate):
    # Check if institution name already exists
    existing_query = "SELECT id FROM institutions WHERE name = :name"
    existing = await database.fetch_one(existing_query, {"name": institution_data.name})
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution with this name already exists"
        )
    
    # Hash password (simple hash for demo - use bcrypt in production)
    import hashlib
    password_hash = hashlib.sha256(institution_data.password.encode()).hexdigest()
    
    insert_query = """
    INSERT INTO institutions (name, password_hash)
    VALUES (:name, :password_hash)
    RETURNING id, name
    """
    
    result = await database.fetch_one(insert_query, {
        "name": institution_data.name,
        "password_hash": password_hash
    })
    
    return Institution(
        id=result["id"],
        name=result["name"]
    )


@router.get("/maps", response_model=List[Map])
async def get_maps(institution_id: UUID = None):
    if institution_id:
        query = """
        SELECT id, name, institution_id 
        FROM maps 
        WHERE institution_id = :institution_id
        ORDER BY name
        """
        results = await database.fetch_all(query, {"institution_id": institution_id})
    else:
        query = """
        SELECT id, name, institution_id 
        FROM maps 
        ORDER BY name
        """
        results = await database.fetch_all(query)
    
    maps = []
    for result in results:
        maps.append(Map(
            id=result["id"],
            name=result["name"],
            institution_id=result["institution_id"]
        ))
    
    return maps


@router.post("/maps", response_model=Map)
async def create_map(map_data: MapCreate):
    # Check if institution exists
    institution_query = "SELECT id FROM institutions WHERE id = :institution_id"
    institution = await database.fetch_one(institution_query, {
        "institution_id": map_data.institution_id
    })
    
    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )
    
    insert_query = """
    INSERT INTO maps (name, institution_id)
    VALUES (:name, :institution_id)
    RETURNING id, name, institution_id
    """
    
    result = await database.fetch_one(insert_query, {
        "name": map_data.name,
        "institution_id": map_data.institution_id
    })
    
    return Map(
        id=result["id"],
        name=result["name"],
        institution_id=result["institution_id"]
    )


@router.get("/maps/{map_id}/stats")
async def get_map_stats(map_id: UUID):
    # Get item counts
    items_query = """
    SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN owner_id IS NULL THEN 1 END) as available_items,
        COUNT(CASE WHEN owner_id IS NOT NULL THEN 1 END) as collected_items,
        COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_items
    FROM items 
    WHERE map_id = :map_id
    """
    
    items_stats = await database.fetch_one(items_query, {"map_id": map_id})
    
    # Get player activity (unique players who collected items on this map)
    players_query = """
    SELECT COUNT(DISTINCT owner_id) as active_players
    FROM items 
    WHERE map_id = :map_id AND owner_id IS NOT NULL
    """
    
    players_stats = await database.fetch_one(players_query, {"map_id": map_id})
    
    return {
        "map_id": map_id,
        "items": {
            "total": items_stats["total_items"],
            "available": items_stats["available_items"],
            "collected": items_stats["collected_items"],
            "expired": items_stats["expired_items"]
        },
        "active_players": players_stats["active_players"]
    }


@router.get("/maps/{map_id}/leaderboard")
async def get_map_leaderboard(map_id: UUID, limit: int = 10):
    query = """
    SELECT 
        p.id,
        p.name,
        p.level,
        p.wins,
        p.losses,
        COUNT(i.id) as items_collected
    FROM profiles p
    LEFT JOIN items i ON p.id = i.owner_id AND i.map_id = :map_id
    WHERE EXISTS (
        SELECT 1 FROM items collected 
        WHERE collected.owner_id = p.id AND collected.map_id = :map_id
    )
    GROUP BY p.id, p.name, p.level, p.wins, p.losses
    ORDER BY items_collected DESC, p.wins DESC, p.level DESC
    LIMIT :limit
    """
    
    return await database.fetch_all(query, {
        "map_id": map_id,
        "limit": limit
    })