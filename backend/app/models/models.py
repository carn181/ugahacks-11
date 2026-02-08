from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography
import uuid

Base = declarative_base()


class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, unique=True, nullable=False)
    description = Column(Text)
    level = Column(Integer, default=1)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    gems = Column(Integer, default=0)
    location = Column(Geography(geometry_type='POINT', srid=4326))
    
    # Relationships
    owned_items = relationship("Item", back_populates="owner", foreign_keys="Item.owner_id")
    battle_attacks = relationship("BattleLog", back_populates="attacker", foreign_keys="BattleLog.attacker_id")
    battle_defends = relationship("BattleLog", back_populates="defender", foreign_keys="BattleLog.defender_id")
    battle_wins = relationship("BattleLog", back_populates="winner", foreign_keys="BattleLog.winner_id")


class Institution(Base):
    __tablename__ = "institutions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text)
    
    # Relationships
    maps = relationship("Map", back_populates="institution")


class Map(Base):
    __tablename__ = "maps"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    institution_id = Column(UUID(as_uuid=True), ForeignKey("institutions.id"))
    
    # Relationships
    institution = relationship("Institution", back_populates="maps")
    items = relationship("Item", back_populates="map", foreign_keys="Item.map_id")


class Item(Base):
    __tablename__ = "items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String, CheckConstraint("type IN ('Potion', 'Gem', 'Chest', 'Wand', 'Scroll')"), nullable=False)
    subtype = Column(Text)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    map_id = Column(UUID(as_uuid=True), ForeignKey("maps.id"))
    location = Column(Geography(geometry_type='POINT', srid=4326))
    expires_at = Column(DateTime(timezone=True))
    
    # Relationships
    owner = relationship("Profile", back_populates="owned_items", foreign_keys=[owner_id])
    map = relationship("Map", back_populates="items", foreign_keys=[map_id])


class BattleLog(Base):
    __tablename__ = "battle_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attacker_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    defender_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    winner_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id"))
    created_at = Column(DateTime(timezone=True))
    
    # Relationships
    attacker = relationship("Profile", back_populates="battle_attacks", foreign_keys=[attacker_id])
    defender = relationship("Profile", back_populates="battle_defends", foreign_keys=[defender_id])
    winner = relationship("Profile", back_populates="battle_wins", foreign_keys=[winner_id])