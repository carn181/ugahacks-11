import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    database_url: str
    
    # Game settings
    max_collection_distance_meters: float = 10.0
    item_expiration_hours: int = 24
    default_map_radius_meters: float = 100.0
    
    class Config:
        env_file = ".env"


settings = Settings()