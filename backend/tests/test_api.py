import pytest
from httpx import AsyncClient


class TestPlayers:
    """Test player-related endpoints"""
    
    async def test_get_player_success(self, client: AsyncClient, sample_player):
        """Test getting a player by ID"""
        response = await client.get(f"/api/player/{sample_player['id']}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_player["id"])
        assert data["name"] == sample_player["name"]
        assert data["level"] == sample_player["level"]
        assert data["wins"] == sample_player["wins"]
        assert data["losses"] == sample_player["losses"]
        assert data["gems"] == sample_player["gems"]
    
    async def test_get_player_not_found(self, client: AsyncClient):
        """Test getting a non-existent player"""
        from uuid import uuid4
        fake_id = str(uuid4())
        
        response = await client.get(f"/api/player/{fake_id}")
        assert response.status_code == 404
        assert "Player not found" in response.json()["detail"]
    
    async def test_get_player_inventory_empty(self, client: AsyncClient, sample_player):
        """Test getting inventory for player with no items"""
        response = await client.get(f"/api/player/{sample_player['id']}/inventory")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    async def test_sync_player_location(self, client: AsyncClient, sample_player):
        """Test syncing player location"""
        location_data = {
            "latitude": 37.7849,
            "longitude": -122.4094,
            "player_id": sample_player["id"]  # This would normally come from auth
        }
        
        response = await client.patch("/api/player/sync", json=location_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "synced"
        assert data["location"]["lat"] == location_data["latitude"]
        assert data["location"]["lng"] == location_data["longitude"]
    
    async def test_sync_player_location_no_auth(self, client: AsyncClient):
        """Test syncing location without authentication"""
        location_data = {
            "latitude": 37.7849,
            "longitude": -122.4094
        }
        
        response = await client.patch("/api/player/sync", json=location_data)
        assert response.status_code == 401


class TestItems:
    """Test item-related endpoints"""
    
    async def test_get_nearby_items_success(self, client: AsyncClient, sample_map, sample_item):
        """Test getting nearby items"""
        response = await client.get(
            f"/api/map/{sample_map['id']}/proximity",
            params={
                "latitude": 37.7749,
                "longitude": -122.4194,
                "radius": 100.0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Check the sample item is in the results
        item_ids = [item["id"] for item in data]
        assert str(sample_item["id"]) in item_ids
    
    async def test_get_nearby_items_out_of_range(self, client: AsyncClient, sample_map, sample_item):
        """Test getting nearby items with radius too small"""
        response = await client.get(
            f"/api/map/{sample_map['id']}/proximity",
            params={
                "latitude": 40.0,  # Far away
                "longitude": -122.0,
                "radius": 10.0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
    
    async def test_collect_item_success(self, client: AsyncClient, sample_player, sample_item):
        """Test collecting an item successfully"""
        collect_data = {
            "item_id": sample_item["id"],
            "player_latitude": 37.7749,
            "player_longitude": -122.4194,
            "player_id": sample_player["id"]
        }
        
        response = await client.post("/api/items/collect", json=collect_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "collected"
        assert data["item_id"] == sample_item["id"]
    
    async def test_collect_item_not_found(self, client: AsyncClient, sample_player):
        """Test collecting a non-existent item"""
        from uuid import uuid4
        fake_item_id = str(uuid4())
        
        collect_data = {
            "item_id": fake_item_id,
            "player_latitude": 37.7749,
            "player_longitude": -122.4194,
            "player_id": sample_player["id"]
        }
        
        response = await client.post("/api/items/collect", json=collect_data)
        assert response.status_code == 404
        assert "Item not found" in response.json()["detail"]
    
    async def test_collect_item_too_far(self, client: AsyncClient, sample_player, sample_item):
        """Test collecting an item that's too far away"""
        collect_data = {
            "item_id": sample_item["id"],
            "player_latitude": 40.0,  # Far away
            "player_longitude": -122.0,
            "player_id": sample_player["id"]
        }
        
        response = await client.post("/api/items/collect", json=collect_data)
        assert response.status_code == 400
        assert "too far away" in response.json()["detail"]
    
    async def test_spawn_item(self, client: AsyncClient, sample_map):
        """Test spawning a new item"""
        spawn_data = {
            "type": "Gem",
            "subtype": "Focus Crystal",
            "map_id": sample_map["id"],
            "latitude": 37.7749,
            "longitude": -122.4194
        }
        
        response = await client.post("/api/items/spawn", json=spawn_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "spawned"
        assert "item_id" in data


class TestBattles:
    """Test battle-related endpoints"""
    
    async def test_report_battle_success(self, client: AsyncClient, sample_player):
        """Test reporting a battle result"""
        from uuid import uuid4
        defender_id = str(uuid4())
        
        # First create the defender
        await client.post("/api/player", json={
            "id": defender_id,
            "name": "DefenderWizard"
        })
        
        battle_data = {
            "attacker_id": sample_player["id"],
            "defender_id": defender_id,
            "winner_id": sample_player["id"]
        }
        
        response = await client.post("/api/battle/report", json=battle_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "recorded"
        assert "battle_id" in data
    
    async def test_report_battle_invalid_winner(self, client: AsyncClient, sample_player):
        """Test reporting a battle with invalid winner"""
        from uuid import uuid4
        defender_id = str(uuid4())
        fake_winner_id = str(uuid4())
        
        battle_data = {
            "attacker_id": sample_player["id"],
            "defender_id": defender_id,
            "winner_id": fake_winner_id
        }
        
        response = await client.post("/api/battle/report", json=battle_data)
        assert response.status_code == 400
        assert "Winner must be either attacker or defender" in response.json()["detail"]
    
    async def test_get_player_battles(self, client: AsyncClient, sample_player):
        """Test getting battles for a player"""
        response = await client.get(f"/api/player/{sample_player['id']}/battles")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestMaps:
    """Test map-related endpoints"""
    
    async def test_get_maps_empty(self, client: AsyncClient):
        """Test getting maps when none exist"""
        response = await client.get("/api/maps")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_create_institution(self, client: AsyncClient):
        """Test creating a new institution"""
        institution_data = {
            "name": "Test Magic Academy",
            "password": "secret123"
        }
        
        response = await client.post("/api/institutions", json=institution_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == institution_data["name"]
        assert "id" in data
    
    async def test_create_map(self, client: AsyncClient, sample_map):
        """Test creating a new map"""
        map_data = {
            "name": "New Test Campus",
            "institution_id": sample_map["institution_id"]
        }
        
        response = await client.post("/api/maps", json=map_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == map_data["name"]
        assert data["institution_id"] == map_data["institution_id"]
        assert "id" in data