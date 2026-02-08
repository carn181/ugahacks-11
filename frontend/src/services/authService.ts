"use client";

import React from 'react';

// Authentication Service for Wizard Quest
// Handles both guest and authenticated user sessions

interface UserProfile {
  id: string;
  name: string;
  description: string;
  level: number;
  wins: number;
  losses: number;
  gems: number;
  location?: {
    type: string;
    coordinates: [number, number];
  };
}

interface AuthState {
  user: UserProfile | null;
  isGuest: boolean;
  isLoading: boolean;
}

class AuthService {
  private static instance: AuthService;
  private state: AuthState = {
    user: null,
    isGuest: false,
    isLoading: false,
  };
  private listeners: Set<(state: AuthState) => void> = new Set();

  private readonly GUEST_USER_ID = '00000000-0000-0000-0000-000000000001';
  private readonly STORAGE_KEYS = {
    USER_ID: 'wizard_quest_user_id',
    IS_GUEST: 'wizard_quest_is_guest',
    USER_DATA: 'wizard_quest_user_data',
  };

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Subscribe to auth state changes
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get current auth state
  getState(): AuthState {
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
      const userId = localStorage.getItem(this.STORAGE_KEYS.USER_ID) || 
                     sessionStorage.getItem(this.STORAGE_KEYS.USER_ID);
      const isGuest = (localStorage.getItem(this.STORAGE_KEYS.IS_GUEST) || 
                       sessionStorage.getItem(this.STORAGE_KEYS.IS_GUEST)) === 'true';

      if (userId) {
        const userProfile = await this.fetchUserProfile(userId);
        if (userProfile) {
          this.setState({
            user: userProfile,
            isGuest,
            isLoading: false,
          });
          return;
        }
      }

      // No valid session found
      this.setState({
        user: null,
        isGuest: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.setState({
        user: null,
        isGuest: false,
        isLoading: false,
      });
    }
  }

  // Login as guest
  async loginAsGuest(persistent: boolean = false): Promise<UserProfile> {
    this.setState({ isLoading: true });
    
    try {
      const { apiClient } = await import('./apiClient');
      const guestProfile = await apiClient.loginGuest() as UserProfile;
      
      // Store in appropriate storage
      const storage = persistent ? localStorage : sessionStorage;
      storage.setItem(this.STORAGE_KEYS.USER_ID, guestProfile.id);
      storage.setItem(this.STORAGE_KEYS.IS_GUEST, 'true');
      storage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(guestProfile));
      
      this.setState({
        user: guestProfile,
        isGuest: true,
        isLoading: false,
      });
      
      return guestProfile;
    } catch (error) {
      console.error('Guest login error:', error);
      this.setState({ isLoading: false });
      throw error;
    }
  }

  // Login as registered user
  async loginAsUser(wizardName: string, persistent: boolean = true): Promise<UserProfile> {
    this.setState({ isLoading: true });
    
    try {
      const { apiClient } = await import('./apiClient');
      const userProfile = await apiClient.loginUser(wizardName.trim()) as UserProfile;
      
      // Store in appropriate storage
      const storage = persistent ? localStorage : sessionStorage;
      storage.setItem(this.STORAGE_KEYS.USER_ID, userProfile.id);
      storage.setItem(this.STORAGE_KEYS.IS_GUEST, 'false');
      storage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(userProfile));
      
      this.setState({
        user: userProfile,
        isGuest: false,
        isLoading: false,
      });
      
      return userProfile;
    } catch (error) {
      console.error('User login error:', error);
      this.setState({ isLoading: false });
      throw error;
    }
  }

  // Logout
  logout(): void {
    // Clear all storage
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    this.setState({
      user: null,
      isGuest: false,
      isLoading: false,
    });
  }

  // Reset guest data
  async resetGuestData(): Promise<UserProfile> {
    if (!this.state.isGuest || !this.state.user) {
      throw new Error('Cannot reset guest data: not in guest mode');
    }

    try {
      const { apiClient } = await import('./apiClient');
      await apiClient.resetGuest();
      
      // Refresh user data
      const updatedProfile = await this.fetchUserProfile(this.GUEST_USER_ID);
      if (updatedProfile) {
        const storage = localStorage.getItem(this.STORAGE_KEYS.USER_ID) ? localStorage : sessionStorage;
        storage.setItem(this.STORAGE_KEYS.USER_DATA, JSON.stringify(updatedProfile));
        
        this.setState({
          user: updatedProfile,
          isGuest: true,
          isLoading: false,
        });
        
        return updatedProfile;
      }
      
      throw new Error('Failed to refresh guest data');
    } catch (error) {
      console.error('Guest reset error:', error);
      throw error;
    }
  }

  // Fetch user profile from API
  private async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { apiClient } = await import('./apiClient');
      return await apiClient.getPlayer(userId) as UserProfile | null;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }

  // Get current user ID for API calls
  getCurrentUserId(): string | null {
    return this.state.user?.id || null;
  }

  // Check if user is authenticated (guest or registered)
  isAuthenticated(): boolean {
    return !!this.state.user;
  }

  // Check if current user is guest
  isGuestUser(): boolean {
    return this.state.isGuest;
  }

  // Get API headers for authenticated requests
  getAuthHeaders(): Record<string, string> {
    if (!this.state.user) {
      return {};
    }
    
    return {
      'X-User-ID': this.state.user.id,
      'X-Is-Guest': this.state.isGuest.toString(),
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
  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// React Hook for authentication
export function useAuth() {
  const [authState, setAuthState] = React.useState<AuthState>(authService.getState());
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    // Initialize auth service
    authService.initialize().then(() => {
      setInitialized(true);
    });

    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe(setAuthState);

    return unsubscribe;
  }, []);

  const loginAsGuest = React.useCallback(async (persistent: boolean = false) => {
    return await authService.loginAsGuest(persistent);
  }, []);

  const loginAsUser = React.useCallback(async (wizardName: string, persistent: boolean = true) => {
    return await authService.loginAsUser(wizardName, persistent);
  }, []);

  const logout = React.useCallback(() => {
    authService.logout();
  }, []);

  const resetGuestData = React.useCallback(async () => {
    return await authService.resetGuestData();
  }, []);

  const authenticatedFetch = React.useCallback((url: string, options?: RequestInit) => {
    return authService.authenticatedFetch(url, options);
  }, []);

  return {
    ...authState,
    initialized,
    loginAsGuest,
    loginAsUser,
    logout,
    resetGuestData,
    authenticatedFetch,
    getCurrentUserId: authService.getCurrentUserId.bind(authService),
    isAuthenticated: authService.isAuthenticated.bind(authService),
    isGuestUser: authService.isGuestUser.bind(authService),
    getAuthHeaders: authService.getAuthHeaders.bind(authService),
  };
}