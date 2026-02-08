// API Configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Types
export interface Location {
  latitude: number;
  longitude: number;
}

export interface Player {
  id: string;
  name: string;
  description?: string;
  level: number;
  wins: number;
  losses: number;
  gems: number;
  location?: Location;
}

export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Item {
  id: string;
  type: "Potion" | "Gem" | "Chest" | "Wand" | "Scroll";
  subtype: string;
  owner_id?: string;
  map_id?: string;
  location?: GeoJSONPoint;
  expires_at?: string;
}

export interface Institution {
  id: string;
  name: string;
}

export interface Map {
  id: string;
  name: string;
  institution_id: string;
}

export interface BattleReport {
  attacker_id: string;
  defender_id: string;
  winner_id: string;
}

export interface BattleLog {
  id: string;
  attacker_id: string;
  defender_id: string;
  winner_id: string;
  created_at: string;
}

// API Service Class
class WizardGoAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Player APIs
  async getPlayer(playerId: string): Promise<Player> {
    return this.request<Player>(`/player/${playerId}`);
  }

  async getPlayerInventory(playerId: string): Promise<Item[]> {
    return this.request<Item[]>(`/player/${playerId}/inventory`);
  }



  async syncPlayerLocation(
    playerId: string,
    location: Location,
  ): Promise<{ status: string; location: Location }> {
    return this.request<{ status: string; location: Location }>(
      "/player/sync",
      {
        method: "PATCH",
        body: JSON.stringify({
          ...location,
          player_id: playerId,
        }),
      },
    );
  }

  // Item APIs
  async getNearbyItems(
    mapId: string,
    location: Location,
    radius: number = 20,
  ): Promise<Item[]> {
    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radius: radius.toString(),
    });

    return this.request<Item[]>(`/map/${mapId}/proximity?${params}`);
  }

  async collectItem(
    itemId: string,
    playerId: string,
    location: Location,
  ): Promise<{ status: string; item_id: string }> {
    return this.request<{ status: string; item_id: string }>("/items/collect", {
      method: "POST",
      body: JSON.stringify({
        item_id: itemId,
        player_id: playerId,
        player_latitude: location.latitude,
        player_longitude: location.longitude,
      }),
    });
  }

  async useItem(
    itemId: string,
    playerId: string,
  ): Promise<{ status: string; item_id: string; effect: string }> {
    return this.request<{ status: string; item_id: string; effect: string }>(
      "/items/use",
      {
        method: "POST",
        body: JSON.stringify({
          item_id: itemId,
          player_id: playerId,
        }),
      },
    );
  }

  async spawnItem(
    mapId: string,
    type: string,
    subtype: string,
    location: Location,
  ): Promise<{ status: string; item_id: string }> {
    return this.request<{ status: string; item_id: string }>("/items/spawn", {
      method: "POST",
      body: JSON.stringify({
        type,
        subtype,
        map_id: mapId,
        ...location,
      }),
    });
  }

  // Battle APIs
  async reportBattle(
    battleReport: BattleReport,
  ): Promise<{ status: string; battle_id: string }> {
    return this.request<{ status: string; battle_id: string }>(
      "/battle/report",
      {
        method: "POST",
        body: JSON.stringify(battleReport),
      },
    );
  }

  async getPlayerBattles(
    playerId: string,
    limit: number = 50,
  ): Promise<BattleLog[]> {
    return this.request<BattleLog[]>(
      `/player/${playerId}/battles?limit=${limit}`,
    );
  }

  async getRecentBattles(limit: number = 20): Promise<any[]> {
    return this.request<any[]>(`/battle/recent?limit=${limit}`);
  }

  // Map & Institution APIs
  async getInstitutions(): Promise<Institution[]> {
    return this.request<Institution[]>("/institutions");
  }

  async createInstitution(
    name: string,
    password: string,
  ): Promise<Institution> {
    return this.request<Institution>("/institutions", {
      method: "POST",
      body: JSON.stringify({ name, password }),
    });
  }

  async getMaps(institutionId?: string): Promise<Map[]> {
    const params = institutionId ? `?institution_id=${institutionId}` : "";
    return this.request<Map[]>(`/maps${params}`);
  }

  async createMap(name: string, institutionId: string): Promise<Map> {
    return this.request<Map>("/maps", {
      method: "POST",
      body: JSON.stringify({
        name,
        institution_id: institutionId,
      }),
    });
  }

  async getMapStats(mapId: string): Promise<any> {
    return this.request<any>(`/maps/${mapId}/stats`);
  }

  async getMapLeaderboard(mapId: string, limit: number = 10): Promise<any[]> {
    return this.request<any[]>(`/maps/${mapId}/leaderboard?limit=${limit}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const rootUrl = this.baseUrl.replace(/\/api$/, "");
    const res = await fetch(`${rootUrl}/health`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}) as any);
      throw new Error(
        detail?.detail || `HTTP ${res.status}: ${res.statusText}`,
      );
    }
    return res.json();
  }
}

// Create singleton instance
export const wizardAPI = new WizardGoAPI();

// Export individual functions for convenience
export const {
  getPlayer,
  getPlayerInventory,
  syncPlayerLocation,
  getNearbyItems,
  collectItem,
  useItem,
  spawnItem,
  reportBattle,
  getPlayerBattles,
  getRecentBattles,
  getInstitutions,
  createInstitution,
  getMaps,
  createMap,
  getMapStats,
  getMapLeaderboard,
  healthCheck,
} = wizardAPI;

export default wizardAPI;
