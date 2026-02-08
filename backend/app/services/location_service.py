from typing import Optional

from databases import Database


class LocationService:
    def __init__(self, db: Database):
        self.db = db

    async def update_owned_items_location(
        self, player_id, latitude: float, longitude: float
    ):
        """Update all items owned by a player to match the player's location"""
        query = """
        UPDATE items
        SET location = ST_SetSRID(ST_MakePoint(CAST(:longitude AS float8), CAST(:latitude AS float8)), 4326)
        WHERE owner_id = :player_id
        """

        await self.db.execute(
            query,
            {"longitude": longitude, "latitude": latitude, "player_id": player_id},
        )

    async def calculate_distance(
        self, item_id, player_latitude: float, player_longitude: float
    ) -> Optional[float]:
        """Calculate distance between an item and player in meters"""
        query = """
        SELECT ST_Distance(
            location::geography,
            ST_SetSRID(ST_MakePoint(CAST(:longitude AS float8), CAST(:latitude AS float8)), 4326)::geography
        ) as distance
        FROM items
        WHERE id = :item_id
        """

        result = await self.db.fetch_one(
            query,
            {
                "longitude": player_longitude,
                "latitude": player_latitude,
                "item_id": item_id,
            },
        )

        return result["distance"] if result else None
