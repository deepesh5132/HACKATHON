import { useState, useEffect } from 'react';

export interface LocationState {
  loaded: boolean;
  coordinates: { lat: number; lng: number } | null;
  error?: { code: number; message: string };
  accuracy?: number;
}

export function useGeolocation(watch: boolean = false): LocationState {
  const [location, setLocation] = useState<LocationState>({
    loaded: false,
    coordinates: null,
  });

  const onSuccess = (position: GeolocationPosition) => {
    setLocation({
      loaded: true,
      coordinates: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
      accuracy: position.coords.accuracy,
    });
  };

  const onError = (error: GeolocationPositionError) => {
    setLocation({
      loaded: true,
      coordinates: null,
      error: {
        code: error.code,
        message: error.message,
      },
    });
  };

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocation({
        loaded: true,
        coordinates: null,
        error: {
          code: 0,
          message: 'Geolocation not supported by this browser.',
        },
      });
      return;
    }

    let watcherId: number | null = null;

    if (watch) {
      watcherId = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
      });
    }

    return () => {
      if (watcherId !== null) {
        navigator.geolocation.clearWatch(watcherId);
      }
    };
  }, [watch]);

  return location;
}
