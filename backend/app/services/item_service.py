from typing import Optional

from databases import Database


class ItemService:
    def __init__(self, db: Database):
        self.db = db

    async def check_proximity(
        self,
        item_id,
        player_latitude: float,
        player_longitude: float,
        max_distance: float,
    ) -> bool:
        """Check if player is within max_distance meters of the item"""
        query = """
        SELECT ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint(CAST(:longitude AS float8), CAST(:latitude AS float8)), 4326)::geography,
            :max_distance
        ) as within_range
        FROM items
        WHERE id = :item_id
        """

        result = await self.db.fetch_one(
            query,
            {
                "longitude": player_longitude,
                "latitude": player_latitude,
                "max_distance": max_distance,
                "item_id": item_id,
            },
        )

        return result["within_range"] if result else False

    async def spawn_random_item(
        self, map_id, item_type: str, subtype: str, latitude: float, longitude: float
    ):
        """Spawn a new item on the map"""
        query = """
        INSERT INTO items (type, subtype, map_id, location, expires_at)
        VALUES (:type, :subtype, :map_id,
                ST_SetSRID(ST_MakePoint(CAST(:longitude AS float8), CAST(:latitude AS float8)), 4326),
                NOW() + INTERVAL '24 hours')
        RETURNING id
        """

        result = await self.db.fetch_one(
            query,
            {
                "type": item_type,
                "subtype": subtype,
                "map_id": map_id,
                "longitude": longitude,
                "latitude": latitude,
            },
        )

        return result["id"]

    async def cleanup_expired_items(self):
        """Remove expired items from the database"""
        query = """
        DELETE FROM items
        WHERE expires_at <= NOW() AND owner_id IS NULL
        """

        result = await self.db.execute(query)
        return result
