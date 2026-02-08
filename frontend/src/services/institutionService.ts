"use client";

import React from 'react';

// Institution Service for Wizard Quest
// Handles institution authentication and management

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
    INSTITUTION_ID: 'wizard_quest_institution_id',
    INSTITUTION_NAME: 'wizard_quest_institution_name',
    INSTITUTION_DATA: 'wizard_quest_institution_data',
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
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  // Initialize auth state from storage
  async initialize(): Promise<void> {
    this.setState({ isLoading: true });
    
    try {
      const institutionData = localStorage.getItem(this.STORAGE_KEYS.INSTITUTION_DATA);
      
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
      console.error('Institution auth initialization error:', error);
      this.setState({
        institution: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }

  // Login as institution
  async loginAsInstitution(name: string, password: string, persistent: boolean = true): Promise<Institution> {
    this.setState({ isLoading: true });
    
    try {
      const response = await fetch('/api/institution/institution/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Institution login failed');
      }

      const institution = await response.json();
      
      // Store in appropriate storage
      if (persistent) {
        localStorage.setItem(this.STORAGE_KEYS.INSTITUTION_ID, institution.id);
        localStorage.setItem(this.STORAGE_KEYS.INSTITUTION_NAME, institution.name);
        localStorage.setItem(this.STORAGE_KEYS.INSTITUTION_DATA, JSON.stringify(institution));
      }
      
      this.setState({
        institution,
        isAuthenticated: true,
        isLoading: false,
      });
      
      return institution;
    } catch (error) {
      console.error('Institution login error:', error);
      this.setState({ isLoading: false });
      throw error;
    }
  }

  // Logout
  logout(): void {
    // Clear all storage
    Object.values(this.STORAGE_KEYS).forEach(key => {
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
      throw new Error('Not authenticated as institution');
    }

    const response = await fetch(`/api/institution/institution/${this.state.institution.id}/maps`);
    if (!response.ok) {
      throw new Error('Failed to fetch institution maps');
    }

    return await response.json();
  }

  // Create new map
  async createInstitutionMap(mapName: string): Promise<InstitutionMap> {
    if (!this.state.institution) {
      throw new Error('Not authenticated as institution');
    }

    const response = await fetch(`/api/institution/institution/${this.state.institution.id}/maps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: mapName.trim() }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create map');
    }

    return await response.json();
  }

  // Get institution items
  async getInstitutionItems(): Promise<InstitutionItem[]> {
    if (!this.state.institution) {
      throw new Error('Not authenticated as institution');
    }

    const response = await fetch(`/api/institution/institution/${this.state.institution.id}/items`);
    if (!response.ok) {
      throw new Error('Failed to fetch institution items');
    }

    return await response.json();
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
      throw new Error('Not authenticated as institution');
    }

    const response = await fetch(`/api/institution/institution/${this.state.institution.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to create item');
    }

    return await response.json();
  }

  // Delete item
  async deleteInstitutionItem(itemId: string): Promise<void> {
    if (!this.state.institution) {
      throw new Error('Not authenticated as institution');
    }

    const response = await fetch(`/api/institution/institution/${this.state.institution.id}/items/${itemId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete item');
    }
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
      'X-Institution-ID': this.state.institution.id,
    };
  }

  // Make authenticated API request
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
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
  const [authState, setAuthState] = React.useState<InstitutionAuthState>(institutionService.getState());
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

  const loginAsInstitution = React.useCallback(async (name: string, password: string, persistent: boolean = true) => {
    return await institutionService.loginAsInstitution(name, password, persistent);
  }, []);

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

  const authenticatedFetch = React.useCallback((url: string, options?: RequestInit) => {
    return institutionService.authenticatedFetch(url, options);
  }, []);

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
    authenticatedFetch,
    getCurrentInstitutionId: institutionService.getCurrentInstitutionId.bind(institutionService),
    isInstitutionAuthenticated: institutionService.isInstitutionAuthenticated.bind(institutionService),
    getAuthHeaders: institutionService.getAuthHeaders.bind(institutionService),
  };
}