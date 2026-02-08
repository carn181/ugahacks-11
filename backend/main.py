from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.routers import players, items, battles, maps, auth
from app.database import database


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    yield
    await database.disconnect()


app = FastAPI(
    title="Wizard Go Backend",
    description="Location-based AR combat game backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router, prefix="/api", tags=["players"])
app.include_router(items.router, prefix="/api", tags=["items"])
app.include_router(battles.router, prefix="/api", tags=["battles"])
app.include_router(maps.router, prefix="/api", tags=["maps"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])


@app.get("/")
async def root():
    return {"message": "Wizard Go Backend API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}