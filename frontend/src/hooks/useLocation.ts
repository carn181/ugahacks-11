import { useState, useEffect, useCallback } from 'react';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface LocationState {
  location: Location | null;
  error: string | null;
  loading: boolean;
}

export const useLocation = () => {
  const [state, setState] = useState<LocationState>({
    location: null,
    error: null,
    loading: true,
  });

  const updateLocation = useCallback((position: GeolocationPosition) => {
    const location: Location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: Date.now(),
    };

    setState({
      location,
      error: null,
      loading: false,
    });
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = 'Unknown error occurred';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied by user';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information is unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }

    setState({
      location: null,
      error: errorMessage,
      loading: false,
    });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        location: null,
        error: 'Geolocation is not supported by this browser',
        loading: false,
      });
      return;
    }

    // Get initial location
    navigator.geolocation.getCurrentPosition(
      updateLocation,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Accept location cached for up to 1 minute
      }
    );

    // Watch for location changes
    const watchId = navigator.geolocation.watchPosition(
      updateLocation,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000, // Accept location cached for up to 30 seconds for updates
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [updateLocation, handleError]);

  const requestLocation = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    navigator.geolocation.getCurrentPosition(
      updateLocation,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Force fresh location
      }
    );
  }, [updateLocation, handleError]);

  return {
    ...state,
    requestLocation,
  };
};

// Distance calculation utility
export const calculateDistance = (loc1: Location, loc2: Location): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (loc1.latitude * Math.PI) / 180;
  const φ2 = (loc2.latitude * Math.PI) / 180;
  const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Check if location is within radius
export const isWithinRadius = (userLocation: Location, itemLocation: Location, radiusMeters: number): boolean => {
  return calculateDistance(userLocation, itemLocation) <= radiusMeters;
};