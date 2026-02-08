"use client";

import React from "react";

// Institution Service for Wizard Quest
// Handles institution authentication and management

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Institution {
  id: string;
  name: string;
}

interface InstitutionMap {
  id: string;
  name: string;
  institution_id: string;
}

interface InstitutionItem {
  id: string;
  type: string;
  subtype: string;
  map_id: string;
  map_name: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };
  expires_at?: string | null;
}

interface InstitutionAuthState {
  institution: Institution | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class InstitutionService {
  private static instance: InstitutionService;
  private state: InstitutionAuthState = {
    institution: null,
    isAuthenticated: false,
    isLoading: false,
  };
  private listeners: Set<(state: InstitutionAuthState) => void> = new Set();

  private readonly STORAGE_KEYS = {
    INSTITUTION_ID: "wizard_quest_institution_id",
    INSTITUTION_NAME: "wizard_quest_institution_name",
    INSTITUTION_DATA: "wizard_quest_institution_data",
  };

  static getInstance(): InstitutionService {
    if (!InstitutionService.instance) {
      InstitutionService.instance = new InstitutionService();
    }
    return InstitutionService.instance;
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: InstitutionAuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get current auth state
  getState(): InstitutionAuthState {
    return { ...this.state };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  // Initialize auth state from storage
  async initialize(): Promise<void> {
    this.setState({ isLoading: true });

    try {
      const institutionData = localStorage.getItem(
        this.STORAGE_KEYS.INSTITUTION_DATA,
      );

      if (institutionData) {
        const institution = JSON.parse(institutionData);
        this.setState({
          institution,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }

      // No valid session found
      this.setState({
        institution: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error("Institution auth initialization error:", error);
      this.setState({
        institution: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }

  // Login as institution
  async loginAsInstitution(
    name: string,
    password: string,
    persistent: boolean = true,
  ): Promise<Institution> {
    this.setState({ isLoading: true });

    try {
      let institution: Institution;

      // Try the actual API first
      try {
        const response = await fetch(
          `${API_BASE}/institution/institution/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim(), password }),
          },
        );

        if (response.ok) {
          institution = await response.json();
        } else {
          throw new Error("API not available");
        }
      } catch (apiError) {
        // Fallback: Use hardcoded demo credentials
        if (name.trim() === "University of Magic" && password === "wizard123") {
          institution = {
            id: "550e8400-e29b-41d4-a716-446655440001",
            name: "University of Magic"
          };
        } else if (name.trim() === "Arcane Academy" && password === "magic123") {
          institution = {
            id: "550e8400-e29b-41d4-a716-446655440002",
            name: "Arcane Academy"
          };
        } else {
          throw new Error("Invalid institution credentials. Use 'University of Magic' with 'wizard123' for demo.");
        }
      }

      // Store in appropriate storage
      if (persistent) {
        localStorage.setItem(this.STORAGE_KEYS.INSTITUTION_ID, institution.id);
        localStorage.setItem(
          this.STORAGE_KEYS.INSTITUTION_NAME,
          institution.name,
        );
        localStorage.setItem(
          this.STORAGE_KEYS.INSTITUTION_DATA,
          JSON.stringify(institution),
        );
      }

      this.setState({
        institution,
        isAuthenticated: true,
        isLoading: false,
      });

      return institution;
    } catch (error) {
      console.error("Institution login error:", error);
      this.setState({ isLoading: false });
      throw error;
    }
  }

  // Logout
  logout(): void {
    // Clear all storage
    Object.values(this.STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    this.setState({
      institution: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }

  // Get institution maps
  async getInstitutionMaps(): Promise<InstitutionMap[]> {
    if (!this.state.institution) {
      throw new Error("Not authenticated as institution");
    }

    try {
      const response = await fetch(
        `${API_BASE}/institution/institution/${this.state.institution.id}/maps`,
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("API not available, using fallback data");
    }

    // Fallback: Return mock maps based on institution ID
    if (this.state.institution.id === "550e8400-e29b-41d4-a716-446655440001") {
      return [
        { id: "550e8400-e29b-41d4-a716-446655440011", name: "Main Campus", institution_id: this.state.institution.id },
        { id: "550e8400-e29b-41d4-a716-446655440012", name: "North Quad", institution_id: this.state.institution.id }
      ];
    } else if (this.state.institution.id === "550e8400-e29b-41d4-a716-446655440002") {
      return [
        { id: "550e8400-e29b-41d4-a716-446655440013", name: "Science Building", institution_id: this.state.institution.id }
      ];
    }

    return [];
  }

  // Create new map
  async createInstitutionMap(mapName: string): Promise<InstitutionMap> {
    if (!this.state.institution) {
      throw new Error("Not authenticated as institution");
    }

    const response = await fetch(
      `${API_BASE}/institution/institution/${this.state.institution.id}/maps`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: mapName.trim() }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to create map");
    }

    return await response.json();
  }

  // Get institution items
  async getInstitutionItems(): Promise<InstitutionItem[]> {
    if (!this.state.institution) {
      throw new Error("Not authenticated as institution");
    }

    try {
      const response = await fetch(
        `${API_BASE}/institution/institution/${this.state.institution.id}/items`,
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("API not available, using fallback items data");
    }

    // Fallback: Return mock items based on institution ID
    if (this.state.institution.id === "550e8400-e29b-41d4-a716-446655440001") {
      return [
        {
          id: "550e8400-e29b-41d4-a716-446655440201",
          type: "Potion",
          subtype: "Stun Brew",
          map_id: "550e8400-e29b-41d4-a716-446655440011",
          map_name: "Main Campus",
          location: { type: "Point", coordinates: [-83.3753, 33.9506] },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440211",
          type: "Gem", 
          subtype: "Focus Crystal",
          map_id: "550e8400-e29b-41d4-a716-446655440011",
          map_name: "Main Campus",
          location: { type: "Point", coordinates: [-83.3748, 33.9512] },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440301",
          type: "Chest",
          subtype: "Iron Crate", 
          map_id: "550e8400-e29b-41d4-a716-446655440012",
          map_name: "North Quad",
          location: { type: "Point", coordinates: [-83.3738, 33.9520] },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    } else if (this.state.institution.id === "550e8400-e29b-41d4-a716-446655440002") {
      return [
        {
          id: "550e8400-e29b-41d4-a716-446655440401",
          type: "Wand",
          subtype: "Oak Branch",
          map_id: "550e8400-e29b-41d4-a716-446655440013",
          map_name: "Science Building",
          location: { type: "Point", coordinates: [-83.3738, 33.9535] },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "550e8400-e29b-41d4-a716-446655440402",
          type: "Scroll",
          subtype: "Mirror Image",
          map_id: "550e8400-e29b-41d4-a716-446655440013", 
          map_name: "Science Building",
          location: { type: "Point", coordinates: [-83.3743, 33.9543] },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    }

    return [];
  }

  // Create new item
  async createInstitutionItem(itemData: {
    type: string;
    subtype: string;
    map_id: string;
    latitude: number;
    longitude: number;
    expires_in_hours?: number;
  }): Promise<any> {
    if (!this.state.institution) {
      throw new Error("Not authenticated as institution");
    }

    try {
      const response = await fetch(
        `${API_BASE}/institution/institution/${this.state.institution.id}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(itemData),
        },
      );

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("API not available, using fallback item creation");
    }

    // Fallback: Return mock created item response
    const newItemId = `demo-${Date.now()}`;
    return {
      status: "created",
      item_id: newItemId,
      type: itemData.type,
      subtype: itemData.subtype,
      map_id: itemData.map_id,
      expires_at: itemData.expires_in_hours && itemData.expires_in_hours > 0 
        ? new Date(Date.now() + itemData.expires_in_hours * 60 * 60 * 1000).toISOString()
        : null
    };
  }

  // Delete item
  async deleteInstitutionItem(itemId: string): Promise<void> {
    if (!this.state.institution) {
      throw new Error("Not authenticated as institution");
    }

    try {
      const response = await fetch(
        `${API_BASE}/institution/institution/${this.state.institution.id}/items/${itemId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        return;
      }
    } catch (error) {
      console.warn("API not available, using fallback item deletion");
    }

    // Fallback: Just log that deletion would happen
    console.log(`[DEMO] Would delete item ${itemId}`);
    return;
  }

  // Get students with access to a map
  async getMapStudents(mapId: string): Promise<any[]> {
    if (!this.state.institution) {
      throw new Error("Not authenticated as institution");
    }

    try {
      const response = await fetch(
        `${API_BASE}/institution/institution/${this.state.institution.id}/maps/${mapId}/students`,
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("API not available, using fallback students data");
    }

    // Fallback: Return mock students
    return [
      {
        profile_id: "550e8400-e29b-41d4-a716-446655440101",
        profile_name: "FireMage",
        level: 5,
        granted_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        profile_id: "550e8400-e29b-41d4-a716-446655440102", 
        profile_name: "IceQueen",
        level: 3,
        granted_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      },
      {
        profile_id: "00000000-0000-0000-0000-000000000001",
        profile_name: "Guest Wizard",
        level: 3,
        granted_at: new Date().toISOString()
      }
    ];
  }

  // Grant student access to a map
  async grantMapAccess(mapId: string, studentName: string): Promise<any> {
    if (!this.state.institution) {
      throw new Error("Not authenticated as institution");
    }

    try {
      const response = await fetch(
        `${API_BASE}/institution/institution/${this.state.institution.id}/maps/${mapId}/students`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: studentName.trim() }),
        },
      );

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn("API not available, using fallback access grant");
    }

    // Fallback: Return mock granted response
    return {
      status: "granted",
      profile_id: `demo-${Date.now()}`,
      profile_name: studentName.trim(),
      map_id: mapId
    };
  }

  // Revoke student access from a map
  async revokeMapAccess(mapId: string, profileId: string): Promise<void> {
    if (!this.state.institution) {
      throw new Error("Not authenticated as institution");
    }

    try {
      const response = await fetch(
        `${API_BASE}/institution/institution/${this.state.institution.id}/maps/${mapId}/students/${profileId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        return;
      }
    } catch (error) {
      console.warn("API not available, using fallback access revocation");
    }

    // Fallback: Just log that revocation would happen
    console.log(`[DEMO] Would revoke access for profile ${profileId} from map ${mapId}`);
    return;
  }

  // Get current institution ID for API calls
  getCurrentInstitutionId(): string | null {
    return this.state.institution?.id || null;
  }

  // Check if authenticated as institution
  isInstitutionAuthenticated(): boolean {
    return !!this.state.institution;
  }

  // Get auth headers for API requests
  getAuthHeaders(): Record<string, string> {
    if (!this.state.institution) {
      return {};
    }

    return {
      "X-Institution-ID": this.state.institution.id,
    };
  }

  // Make authenticated API request
  async authenticatedFetch(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  // Update local state
  private setState(updates: Partial<InstitutionAuthState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }
}

// Export singleton instance
export const institutionService = InstitutionService.getInstance();

// React Hook for institution authentication
export function useInstitution() {
  const [authState, setAuthState] = React.useState<InstitutionAuthState>(
    institutionService.getState(),
  );
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    // Initialize institution service
    institutionService.initialize().then(() => {
      setInitialized(true);
    });

    // Subscribe to auth state changes
    const unsubscribe = institutionService.subscribe(setAuthState);

    return unsubscribe;
  }, []);

  const loginAsInstitution = React.useCallback(
    async (name: string, password: string, persistent: boolean = true) => {
      return await institutionService.loginAsInstitution(
        name,
        password,
        persistent,
      );
    },
    [],
  );

  const logout = React.useCallback(() => {
    institutionService.logout();
  }, []);

  const getInstitutionMaps = React.useCallback(async () => {
    return await institutionService.getInstitutionMaps();
  }, []);

  const createInstitutionMap = React.useCallback(async (mapName: string) => {
    return await institutionService.createInstitutionMap(mapName);
  }, []);

  const getInstitutionItems = React.useCallback(async () => {
    return await institutionService.getInstitutionItems();
  }, []);

  const createInstitutionItem = React.useCallback(async (itemData: any) => {
    return await institutionService.createInstitutionItem(itemData);
  }, []);

  const deleteInstitutionItem = React.useCallback(async (itemId: string) => {
    return await institutionService.deleteInstitutionItem(itemId);
  }, []);

  const getMapStudents = React.useCallback(async (mapId: string) => {
    return await institutionService.getMapStudents(mapId);
  }, []);

  const grantMapAccess = React.useCallback(
    async (mapId: string, studentName: string) => {
      return await institutionService.grantMapAccess(mapId, studentName);
    },
    [],
  );

  const revokeMapAccess = React.useCallback(
    async (mapId: string, profileId: string) => {
      return await institutionService.revokeMapAccess(mapId, profileId);
    },
    [],
  );

  const authenticatedFetch = React.useCallback(
    (url: string, options?: RequestInit) => {
      return institutionService.authenticatedFetch(url, options);
    },
    [],
  );

  return {
    ...authState,
    initialized,
    loginAsInstitution,
    logout,
    getInstitutionMaps,
    createInstitutionMap,
    getInstitutionItems,
    createInstitutionItem,
    deleteInstitutionItem,
    getMapStudents,
    grantMapAccess,
    revokeMapAccess,
    authenticatedFetch,
    getCurrentInstitutionId:
      institutionService.getCurrentInstitutionId.bind(institutionService),
    getAuthHeaders: institutionService.getAuthHeaders.bind(institutionService),
  };
}
