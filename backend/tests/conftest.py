import pytest
import asyncio
from httpx import AsyncClient
from main import app
from app.database import database, metadata
from sqlalchemy import create_engine, MetaData, text
from app.core.config import settings


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_database():
    """Setup test database connection"""
    # Use a separate test database
    test_db_url = settings.database_url.replace("/wizard_go", "/wizard_go_test")
    
    # Create test database if it doesn't exist
    engine = create_engine(test_db_url)
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.commit()
    
    # Connect to test database
    test_database = Database(test_db_url)
    await test_database.connect()
    
    # Create tables
    from app.models.models import Base
    Base.metadata.create_all(bind=engine)
    
    yield test_database
    
    # Cleanup
    await test_database.disconnect()


@pytest.fixture
async def client(test_database):
    """Create test client with database override"""
    # Override the database connection
    from app import routers
    original_db = database
    
    # This is a simplified approach - in a real implementation,
    # you'd use dependency injection to override the database
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    # Restore original database
    await original_db.connect()


@pytest.fixture
async def sample_player(test_database):
    """Create a sample player for testing"""
    from uuid import uuid4
    
    player_id = str(uuid4())
    
    query = """
    INSERT INTO profiles (id, name, level, wins, losses, gems, location)
    VALUES (:id, :name, :level, :wins, :losses, :gems, 
            ST_GeomFromText('POINT(:longitude :latitude)', 4326))
    RETURNING id, name, level, wins, losses, gems
    """
    
    result = await test_database.fetch_one(query, {
        "id": player_id,
        "name": "TestWizard",
        "level": 5,
        "wins": 3,
        "losses": 1,
        "gems": 50,
        "longitude": -122.4194,
        "latitude": 37.7749
    })
    
    return {
        "id": result["id"],
        "name": result["name"],
        "level": result["level"],
        "wins": result["wins"],
        "losses": result["losses"],
        "gems": result["gems"]
    }


@pytest.fixture
async def sample_map(test_database):
    """Create a sample map for testing"""
    from uuid import uuid4
    
    institution_id = str(uuid4())
    map_id = str(uuid4())
    
    # Create institution first
    await test_database.execute(
        "INSERT INTO institutions (id, name, password_hash) VALUES (:id, :name, :hash)",
        {"id": institution_id, "name": "Test University", "hash": "test_hash"}
    )
    
    # Create map
    query = """
    INSERT INTO maps (id, name, institution_id)
    VALUES (:id, :name, :institution_id)
    RETURNING id, name, institution_id
    """
    
    result = await test_database.fetch_one(query, {
        "id": map_id,
        "name": "Test Campus",
        "institution_id": institution_id
    })
    
    return {
        "id": result["id"],
        "name": result["name"],
        "institution_id": result["institution_id"]
    }


@pytest.fixture
async def sample_item(test_database, sample_map):
    """Create a sample item for testing"""
    from uuid import uuid4
    
    item_id = str(uuid4())
    
    query = """
    INSERT INTO items (id, type, subtype, map_id, location, expires_at)
    VALUES (:id, :type, :subtype, :map_id, 
            ST_GeomFromText('POINT(:longitude :latitude)', 4326),
            NOW() + INTERVAL '24 hours')
    RETURNING id, type, subtype, map_id
    """
    
    result = await test_database.fetch_one(query, {
        "id": item_id,
        "type": "Potion",
        "subtype": "Stun Brew",
        "map_id": sample_map["id"],
        "longitude": -122.4194,
        "latitude": 37.7749
    })
    
    return {
        "id": result["id"],
        "type": result["type"],
        "subtype": result["subtype"],
        "map_id": result["map_id"]
    }