from databases import Database
from sqlalchemy import MetaData, create_engine

from app.core.config import settings

DATABASE_URL = settings.database_url.replace("postgres://", "postgresql://", 1)

database = Database(DATABASE_URL)
metadata = MetaData()

engine = create_engine(DATABASE_URL)
