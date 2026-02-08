import hashlib
import json
import uuid
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import database
from app.schemas.schemas import Institution, ItemCreate, Profile

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
        raise HTTPException(
            status_code=400, detail="Institution name and password are required"
        )

    # Hash password in Python to avoid SQL parameter casting issues
    password_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()

    query = """
    SELECT id, name
    FROM institutions
    WHERE name = :name AND password_hash = :password_hash
    """

    result = await database.fetch_one(
        query, {"name": name, "password_hash": password_hash}
    )

    if not result:
        raise HTTPException(status_code=401, detail="Invalid institution credentials")

    return Institution(id=result["id"], name=result["name"])


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
        maps.append(
            {
                "id": result["id"],
                "name": result["name"],
                "institution_id": result["institution_id"],
            }
        )

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
        {"institution_id": institution_id},
    )

    if not institution_check:
        raise HTTPException(status_code=404, detail="Institution not found")

    query = """
    INSERT INTO maps (id, name, institution_id)
    VALUES (:id, :name, :institution_id)
    RETURNING id, name, institution_id
    """

    result = await database.fetch_one(
        query,
        {"id": str(uuid.uuid4()), "name": map_name, "institution_id": institution_id},
    )

    if not result:
        raise HTTPException(status_code=500, detail="Failed to create map")

    return {
        "id": result["id"],
        "name": result["name"],
        "institution_id": result["institution_id"],
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
    ORDER BY m.name, i.type
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

        items.append(
            {
                "id": result["id"],
                "type": result["type"],
                "subtype": result["subtype"],
                "map_id": result["map_id"],
                "map_name": result["map_name"],
                "location": location,
                "expires_at": result["expires_at"],
            }
        )

    return items


@router.post("/institution/{institution_id}/items")
async def create_institution_item(institution_id: str, item_data: Dict[str, Any]):
    """
    Create a new item at specific coordinates on a map.
    """
    required_fields = ["type", "subtype", "map_id", "latitude", "longitude"]
    for field in required_fields:
        if field not in item_data:
            raise HTTPException(
                status_code=400, detail=f"Missing required field: {field}"
            )

    # Verify map belongs to institution
    map_check = await database.fetch_one(
        "SELECT 1 FROM maps WHERE id = :map_id AND institution_id = :institution_id",
        {"map_id": item_data["map_id"], "institution_id": institution_id},
    )

    if not map_check:
        raise HTTPException(
            status_code=403, detail="Map does not belong to this institution"
        )

    # Set expiration (24 hours from now or custom)
    expires_in_hours = item_data.get("expires_in_hours", 24)

    query = """
    INSERT INTO items (id, type, subtype, map_id, location, expires_at)
    VALUES (:id, :type, :subtype, :map_id,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326),
            CASE WHEN :expires_in_hours > 0
                 THEN NOW() + make_interval(hours => :expires_in_hours)
                 ELSE NULL END)
    RETURNING id, type, subtype, map_id, expires_at
    """

    result = await database.fetch_one(
        query,
        {
            "id": str(uuid.uuid4()),
            "type": item_data["type"],
            "subtype": item_data["subtype"],
            "map_id": item_data["map_id"],
            "longitude": float(item_data["longitude"]),
            "latitude": float(item_data["latitude"]),
            "expires_in_hours": int(expires_in_hours),
        },
    )

    if not result:
        raise HTTPException(status_code=500, detail="Failed to create item")

    return {
        "status": "created",
        "item_id": result["id"],
        "type": result["type"],
        "subtype": result["subtype"],
        "map_id": result["map_id"],
        "expires_at": result["expires_at"],
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

    item_check = await database.fetch_one(
        verify_query, {"item_id": item_id, "institution_id": institution_id}
    )

    if not item_check:
        raise HTTPException(
            status_code=404, detail="Item not found or not owned by institution"
        )

    # Delete the item
    await database.execute(
        "DELETE FROM items WHERE id = :item_id", {"item_id": item_id}
    )

    return {"status": "deleted", "item_id": item_id}


@router.get("/institution/{institution_id}/maps/{map_id}/students")
async def get_map_students(institution_id: str, map_id: str):
    """
    Get all students with access to a specific map.
    """
    # Verify map belongs to institution
    map_check = await database.fetch_one(
        "SELECT 1 FROM maps WHERE id = :map_id AND institution_id = :institution_id",
        {"map_id": map_id, "institution_id": institution_id},
    )
    if not map_check:
        raise HTTPException(
            status_code=404, detail="Map not found or not owned by institution"
        )

    query = """
    SELECT p.id, p.name, p.level, ma.granted_at
    FROM map_access ma
    JOIN profiles p ON ma.profile_id = p.id
    WHERE ma.map_id = :map_id
    ORDER BY p.name
    """
    results = await database.fetch_all(query, {"map_id": map_id})

    students = []
    for r in results:
        students.append(
            {
                "profile_id": r["id"],
                "profile_name": r["name"],
                "level": r["level"],
                "granted_at": r["granted_at"],
            }
        )
    return students


@router.post("/institution/{institution_id}/maps/{map_id}/students")
async def grant_map_access(
    institution_id: str, map_id: str, student_data: Dict[str, str]
):
    """
    Grant a student access to a map. Accepts { "name": "WizardName" }.
    """
    # Verify map belongs to institution
    map_check = await database.fetch_one(
        "SELECT 1 FROM maps WHERE id = :map_id AND institution_id = :institution_id",
        {"map_id": map_id, "institution_id": institution_id},
    )
    if not map_check:
        raise HTTPException(
            status_code=404, detail="Map not found or not owned by institution"
        )

    profile_name = student_data.get("name", "").strip()
    if not profile_name:
        raise HTTPException(status_code=400, detail="Student name is required")

    profile = await database.fetch_one(
        "SELECT id, name FROM profiles WHERE name = :name",
        {"name": profile_name},
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    query = """
    INSERT INTO map_access (profile_id, map_id)
    VALUES (:profile_id, :map_id)
    ON CONFLICT (profile_id, map_id) DO NOTHING
    RETURNING id
    """
    result = await database.fetch_one(
        query, {"profile_id": profile["id"], "map_id": map_id}
    )

    return {
        "status": "granted" if result else "already_granted",
        "profile_id": profile["id"],
        "profile_name": profile["name"],
        "map_id": map_id,
    }


@router.delete("/institution/{institution_id}/maps/{map_id}/students/{profile_id}")
async def revoke_map_access(institution_id: str, map_id: str, profile_id: str):
    """
    Revoke a student's access to a map.
    """
    # Verify map belongs to institution
    map_check = await database.fetch_one(
        "SELECT 1 FROM maps WHERE id = :map_id AND institution_id = :institution_id",
        {"map_id": map_id, "institution_id": institution_id},
    )
    if not map_check:
        raise HTTPException(
            status_code=404, detail="Map not found or not owned by institution"
        )

    await database.execute(
        "DELETE FROM map_access WHERE profile_id = :profile_id AND map_id = :map_id",
        {"profile_id": profile_id, "map_id": map_id},
    )

    return {"status": "revoked", "profile_id": profile_id, "map_id": map_id}
