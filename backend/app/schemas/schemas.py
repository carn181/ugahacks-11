from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class ItemType(str, Enum):
    POTION = "Potion"
    GEM = "Gem"
    CHEST = "Chest"
    WAND = "Wand"
    SCROLL = "Scroll"


class ProfileCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    level: Optional[int] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    gems: Optional[int] = None


class LocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    player_id: UUID


class Profile(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    level: int
    wins: int
    losses: int
    gems: int
    location: Optional[dict] = None

    class Config:
        from_attributes = True


class ItemCreate(BaseModel):
    type: ItemType
    subtype: str
    map_id: Optional[UUID] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class Item(BaseModel):
    id: UUID
    type: ItemType
    subtype: str
    owner_id: Optional[UUID]
    map_id: Optional[UUID]
    location: Optional[dict]
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class ItemCollect(BaseModel):
    item_id: UUID
    player_latitude: float = Field(..., ge=-90, le=90)
    player_longitude: float = Field(..., ge=-180, le=180)
    player_id: UUID


class ItemUse(BaseModel):
    item_id: UUID
    player_id: UUID


class InstitutionCreate(BaseModel):
    name: str
    password: str


class Institution(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class MapCreate(BaseModel):
    name: str
    institution_id: UUID


class Map(BaseModel):
    id: UUID
    name: str
    institution_id: UUID

    class Config:
        from_attributes = True


class BattleReport(BaseModel):
    attacker_id: UUID
    defender_id: UUID
    winner_id: UUID


class BattleLog(BaseModel):
    id: UUID
    attacker_id: UUID
    defender_id: UUID
    winner_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ProximityQuery(BaseModel):
    map_id: UUID
    player_latitude: float = Field(..., ge=-90, le=90)
    player_longitude: float = Field(..., ge=-180, le=180)
    radius_meters: float = Field(default=100.0, gt=0)