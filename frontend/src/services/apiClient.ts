// API utility for making authenticated requests to the backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response.text() as unknown as T;
  }

  // Player endpoints
  async getPlayer(playerId: string) {
    return this.request(`/player/${playerId}`);
  }

  async getPlayerInventory(playerId: string) {
    return this.request(`/player/${playerId}/inventory`);
  }

  async syncPlayerLocation(playerId: string, latitude: number, longitude: number) {
    return this.request('/player/sync', {
      method: 'PATCH',
      body: JSON.stringify({
        player_id: playerId,
        latitude,
        longitude,
      }),
    });
  }

  // Item endpoints
  async getItemsNearPlayer(mapId: string, latitude: number, longitude: number, radius: number = 100) {
    const params = new URLSearchParams({
      map_id: mapId,
      player_latitude: latitude.toString(),
      player_longitude: longitude.toString(),
      radius_meters: radius.toString(),
    });
    return this.request(`/items/nearby?${params}`);
  }

  async collectItem(itemId: string, playerId: string, playerLatitude: number, playerLongitude: number) {
    return this.request('/items/collect', {
      method: 'POST',
      body: JSON.stringify({
        item_id: itemId,
        player_id: playerId,
        player_latitude: playerLatitude,
        player_longitude: playerLongitude,
      }),
    });
  }

  async useItem(itemId: string, playerId: string) {
    return this.request('/items/use', {
      method: 'POST',
      body: JSON.stringify({
        item_id: itemId,
        player_id: playerId,
      }),
    });
  }

  // Map endpoints
  async getMaps() {
    return this.request('/maps');
  }

  async getMap(mapId: string) {
    return this.request(`/maps/${mapId}`);
  }

  // Battle endpoints
  async initiateBattle(attackerId: string, defenderId: string, latitude: number, longitude: number) {
    return this.request('/battles/initiate', {
      method: 'POST',
      body: JSON.stringify({
        attacker_id: attackerId,
        defender_id: defenderId,
        latitude,
        longitude,
      }),
    });
  }

  async getBattleLogs(playerId: string) {
    return this.request(`/battles/logs/${playerId}`);
  }

  // Authentication endpoints
  async loginGuest() {
    return this.request('/auth/guest/login');
  }

  async resetGuest() {
    return this.request('/auth/guest/reset', {
      method: 'POST',
    });
  }

  async loginUser(wizardName: string) {
    return this.request('/auth/user/login', {
      method: 'POST',
      body: JSON.stringify({ name: wizardName }),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export a utility function for use in components
export function createAuthenticatedApi(userId: string, isGuest: boolean = false) {
  return {
    ...apiClient,
    request: async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const url = `${API_BASE_URL}${endpoint}`;
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
        'X-User-ID': userId,
        'X-Is-Guest': isGuest.toString(),
      };

      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return response.text() as unknown as T;
    },
  };
}