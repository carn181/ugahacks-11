from databases import Database
from sqlalchemy import create_engine, MetaData
from app.core.config import settings

DATABASE_URL = settings.database_url

database = Database(DATABASE_URL)
metadata = MetaData()

engine = create_engine(DATABASE_URL)