# Wizard Go Backend

A location-based, turn-based AR combat game backend built with FastAPI and PostgreSQL + PostGIS.

## Features

- **Location-based Gameplay**: Uses PostGIS for geospatial queries and proximity detection
- **Item Management**: Spawn, collect, and use magical items with spatial validation
- **Battle System**: Track combat results and update player statistics
- **Real-time Sync**: Automatic location updates for owned items via database triggers
- **Institution/Maps**: Multi-tenant support for different campuses or game areas
- **Comprehensive Testing**: Full test suite with pytest and httpx.AsyncClient
- **Easy Deployment**: Railway.app ready with proper configuration

## Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL with PostGIS extension
- Supabase account (for auth, optional)

### Installation

1. Clone and navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual values
```

5. Set up the database:
```bash
# Run the SQL from RAILWAY_DEPLOYMENT.md in your PostgreSQL console
# Don't forget: CREATE EXTENSION IF NOT EXISTS postgis;
```

6. Run the server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### API Documentation
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Key Endpoints

### Players
- `GET /api/player/{id}` - Get player stats and inventory
- `PATCH /api/player/sync` - Update player GPS location
- `GET /api/player/{id}/inventory` - Get player's items

### Items
- `GET /api/map/{map_id}/proximity` - Get nearby items
- `POST /api/items/collect` - Collect an item (proximity validated)
- `POST /api/items/use` - Use an item
- `POST /api/items/spawn` - Spawn new item on map

### Battles
- `POST /api/battle/report` - Record battle results
- `GET /api/player/{id}/battles` - Get player battle history

### Maps/Institutions
- `GET /api/institutions` - List institutions
- `POST /api/institutions` - Create institution
- `GET /api/maps` - List maps
- `POST /api/maps` - Create map

## Architecture

### Database Schema
- **profiles**: Player data with location (PostGIS Point)
- **items**: Game items with spatial data and ownership
- **battle_logs**: Combat history and statistics
- **institutions**: Multi-tenant organizations
- **maps**: Game areas linked to institutions

### Spatial Features
- **Proximity Detection**: 10-meter collection radius
- **Location Sync**: Automatic owned item location updates
- **Spatial Indexes**: Optimized for performance

### Game Mechanics
- **Item Types**: Potion, Gem, Chest, Wand, Scroll
- **Consumables**: Status effects (Stun, Critical Hit, Dodge)
- **Equipment**: Persistent buffs and currency
- **Level System**: Automatic progression based on wins

## Testing

Run the test suite:
```bash
pytest
```

Run with coverage:
```bash
pytest --cov=app
```

The tests cover:
- All API endpoints
- Spatial validation
- Item collection logic
- Battle reporting
- Error handling

## Deployment

### Railway.app
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Railway will auto-detect and deploy the FastAPI app

See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for detailed instructions.

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SUPABASE_URL`: Supabase project URL (optional)
- `SUPABASE_KEY`: Supabase anon key (optional)
- `MAX_COLLECTION_DISTANCE_METERS`: Collection radius (default: 10.0)

## Development

### Adding New Features

1. **New Item Types**: Add to `ItemType` enum in schemas
2. **New Endpoints**: Create in appropriate router file
3. **Database Changes**: Update models and create migration
4. **Game Logic**: Implement in service classes

### Code Structure
```
backend/
├── app/
│   ├── core/config.py         # Configuration
│   ├── models/models.py       # SQLAlchemy models
│   ├── schemas/schemas.py     # Pydantic schemas
│   ├── routers/               # API endpoints
│   ├── services/              # Business logic
│   └── database.py           # Database connection
├── tests/                     # Test suite
├── main.py                   # FastAPI app
└── requirements.txt          # Dependencies
```

## Security Considerations

- Proximity validation prevents teleportation cheating
- Input validation on all endpoints
- Authentication required for sensitive operations
- Rate limiting recommended for production

## Performance

- Spatial indexes on location columns
- Connection pooling via databases library
- Efficient PostGIS queries
- Proper indexing for foreign keys

## Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass before submitting

## License

This project follows the license specified in the main repository.