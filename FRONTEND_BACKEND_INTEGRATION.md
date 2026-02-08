# Frontend + Backend Integration Guide

This guide will help you set up and test the complete Wizard Go integration with backend API and mock data.

## 🚀 Quick Setup

### 1. Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database connection string
   ```

5. **Set up database with mock data:**
   ```bash
   # Run this SQL in your PostgreSQL database:
   psql -d your_database_name -f mock_data.sql
   ```

6. **Start backend server:**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### 2. Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env.local
   ```

3. **Start frontend development server:**
   ```bash
   npm run dev
   ```

## 🌐 Testing the Integration

### Access Points:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Test Flow:

1. **Visit Stats Page**: http://localhost:3000/game/stats
   - Shows player stats from backend
   - Displays wins, losses, gems, level

2. **Visit Inventory**: http://localhost:3000/game/inventory-backend
   - Shows items owned by player
   - Can use items (calls backend API)

3. **Visit AR Mode**: http://localhost:3000/game/AR-backend
   - Fetches nearby items from backend (20m radius)
   - Shows only items within 20 meters
   - Can collect items (calls backend API)

## 📱 AR Features

### Location-based Filtering:
- Only shows items within 20 meters of current GPS location
- Backend filters by proximity using PostGIS spatial queries
- Frontend displays nearby items with 3D models

### Item Collection:
- Items appear as 3D objects in AR view
- Lock-on system when within pickup range (5m)
- Collection calls backend `/items/collect` endpoint
- 10-meter proximity validation enforced by backend

### Mock Data:
The database includes:
- **5 Test Players** with different stats
- **20+ Items** scattered across 3 maps
- **Battle History** for testing
- **Institutions** and maps for multi-tenant support

## 🔧 API Endpoints Used

### Player Stats:
```typescript
await wizardAPI.getPlayer(playerId);
```

### Player Inventory:
```typescript
await wizardAPI.getPlayerInventory(playerId);
```

### Nearby Items (AR):
```typescript
await wizardAPI.getNearbyItems(mapId, location, 20); // 20m radius
```

### Collect Item:
```typescript
await wizardAPI.collectItem(itemId, playerId, playerLocation);
```

### Use Item:
```typescript
await wizardAPI.useItem(itemId, playerId);
```

## 🗺️ Mock Data Locations

The mock data uses San Francisco coordinates:
- **Main Campus**: ~-122.4194, 37.7749
- **North Quad**: ~-122.4164, 37.7779  
- **Science Building**: ~-122.4164, 37.7799

For testing location-based features, you can:
1. Use browser dev tools to mock GPS location
2. Test on mobile device with actual GPS
3. Modify mock_data.sql with your local coordinates

## 🐛 Troubleshooting

### Backend Not Connecting:
```bash
# Check if backend is running
curl http://localhost:8000/health

# Should return: {"status": "healthy"}
```

### CORS Issues:
- Backend allows all origins in development
- Check console for CORS errors
- Verify NEXT_PUBLIC_API_URL in frontend .env.local

### Database Connection:
- Verify PostgreSQL is running
- Check connection string in .env
- Ensure PostGIS extension is enabled

### AR Not Working:
- Ensure HTTPS on localhost (may need mkcert)
- Check camera permissions
- Verify location permissions
- Use touch controls if gyroscope unavailable

## 🚀 Production Deployment

### Backend (Railway.app):
1. Push code to GitHub
2. Connect repository to Railway
3. Set environment variables in Railway dashboard
4. Deploy automatically on push

### Frontend (Vercel/Netlify):
1. Set NEXT_PUBLIC_API_URL to deployed backend URL
2. Deploy frontend to your preferred platform
3. Ensure CORS is configured for production

## 📊 Monitoring

### Backend Health:
- Access `/health` endpoint
- Monitor Railway logs
- Check database connection pool

### Frontend Debugging:
- Browser console for API errors
- Network tab for HTTP requests
- AR console logs for 3D rendering issues

## 🎯 Demo Script

1. **Show Stats**: Display player wins, level, gems
2. **Show Inventory**: Display collected items with rarity
3. **Enter AR**: Walk around to find items (20m radius)
4. **Collect Items**: Move within 5m to collect
5. **Use Items**: Use consumables for effects
6. **Real-time Updates**: See inventory changes immediately

This integration provides a complete AR gaming experience with spatial validation, real-time updates, and comprehensive backend integration!