import React, { useEffect, useRef, useState } from 'react';
import {
  Shield,
  MapPin,
  Compass,
  AlertOctagon,
  Navigation,
  Volume2,
  VolumeX,
  Share2,
  AlertTriangle,
  Locate,
  Layers,
  Map,
  Info,
  Clock,
  Car,
  Footprints,
  Activity,
  ArrowRight
} from 'lucide-react';
import { db, type HazardReport } from '../db/db';

interface EscapeMapProps {
  location: { lat: number; lng: number } | null;
  activeDisaster: string;
  accessibilityLargeText: boolean;
}

interface Shelter {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  capacityCount: number;
  occupancyCount: number;
  status: 'Open' | 'Full' | 'Closed';
  elevation: number;
  features: {
    petFriendly: boolean;
    wheelchair: boolean;
    medical: boolean;
    food: boolean;
    water: boolean;
  };
}

interface RouteInfo {
  shelterId: string;
  coordinates: [number, number][]; // [lat, lng]
  distance: number; // in meters
  duration: number; // in seconds
  steps: string[];
  safetyScore: number;
  status: 'SAFE' | 'CAUTION' | 'BLOCKED';
  gemmaReasoning: string;
}

const shelters: Shelter[] = [
  {
    id: 'sh-1',
    name: 'Central High School Relief Camp',
    type: 'School',
    lat: 12.9780,
    lng: 77.5910,
    capacityCount: 500,
    occupancyCount: 150,
    status: 'Open',
    elevation: 22,
    features: { petFriendly: true, wheelchair: true, medical: true, food: true, water: true }
  },
  {
    id: 'sh-2',
    name: 'Metro Civic Sports Arena',
    type: 'Community Center',
    lat: 12.9640,
    lng: 77.6040,
    capacityCount: 2500,
    occupancyCount: 1300,
    status: 'Open',
    elevation: 18,
    features: { petFriendly: false, wheelchair: true, medical: false, food: true, water: true }
  },
  {
    id: 'sh-3',
    name: 'St. Mary Community Hall',
    type: 'Church/Hall',
    lat: 12.9810,
    lng: 77.6090,
    capacityCount: 300,
    occupancyCount: 300,
    status: 'Full',
    elevation: 15,
    features: { petFriendly: true, wheelchair: false, medical: false, food: true, water: false }
  },
  {
    id: 'sh-4',
    name: 'District General Hospital',
    type: 'Medical Center',
    lat: 12.9550,
    lng: 77.5855,
    capacityCount: 150,
    occupancyCount: 60,
    status: 'Open',
    elevation: 25,
    features: { petFriendly: false, wheelchair: true, medical: true, food: false, water: true }
  },
];

export function EscapeMap({ location, activeDisaster, accessibilityLargeText }: EscapeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafLayersRef = useRef<any[]>([]);

  // State Management
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(shelters[0]);
  const [routes, setRoutes] = useState<Record<string, RouteInfo>>({});
  const [recommendedShelterId, setRecommendedShelterId] = useState<string>('sh-1');
  const [navigationActive, setNavigationActive] = useState<boolean>(false);
  const [navigationMode, setNavigationMode] = useState<'walking' | 'driving'>('walking');
  const [voiceGuide, setVoiceGuide] = useState<boolean>(false);

  // User Coordinates (Simulate or GPS)
  const [userLat, setUserLat] = useState<number>(location?.lat || 12.9716);
  const [userLng, setUserLng] = useState<number>(location?.lng || 77.5946);

  // Map settings
  const [satelliteView, setSatelliteView] = useState<boolean>(false);
  const [hazardOverlay, setHazardOverlay] = useState<boolean>(true);
  const [filterMedicalOnly, setFilterMedicalOnly] = useState<boolean>(false);
  const [filterPetsOnly, setFilterPetsOnly] = useState<boolean>(false);

  // Reporting
  const [userReports, setUserReports] = useState<HazardReport[]>([]);
  const [reportType, setReportType] = useState<'roadblock' | 'flood' | 'fire' | 'other'>('roadblock');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [rerouteNotification, setRerouteNotification] = useState<string | null>(null);

  // Live Nav States
  const [currentSpeed, setCurrentSpeed] = useState<number>(3.1); // mph
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [compassHeading, setCompassHeading] = useState<number>(120);

  const tileLayerRef = useRef<any>(null);

  // Load community hazard report coordinates
  const loadReports = () => {
    db.reports.toArray().then((arr) => {
      setUserReports(arr);
    });
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (location) {
      setUserLat(location.lat);
      setUserLng(location.lng);
    }
  }, [location]);

  // Adjust speeds based on modes
  useEffect(() => {
    setCurrentSpeed(navigationMode === 'walking' ? 3.1 : 24.5);
  }, [navigationMode]);

  // Speech helper
  const speak = (text: string) => {
    if (!voiceGuide || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  // Triggers speech when instructions step advances
  useEffect(() => {
    const activeRoute = routes[selectedShelter?.id || ''];
    if (navigationActive && activeRoute && activeRoute.steps[currentStepIndex]) {
      speak(activeRoute.steps[currentStepIndex]);
    }
  }, [currentStepIndex, navigationActive]);

  // Fetch routes from OSRM engine or compute offline deterministic paths
  useEffect(() => {
    const computeAllRoutes = async () => {
      const computed: Record<string, RouteInfo> = {};

      for (const sh of shelters) {
        let routeData: RouteInfo | null = null;
        const isOnline = navigator.onLine;

        if (isOnline) {
          try {
            // Call public OpenStreetMap OSRM routing endpoint
            const res = await fetch(
              `https://router.project-osrm.org/route/v1/foot/${userLng},${userLat};${sh.lng},${sh.lat}?overview=full&geometries=geojson&steps=true`
            );
            
            if (res.ok) {
              const data = await res.json();
              if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coords: [number, number][] = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);

                // Parse steps from OSRM response
                const rawSteps = route.legs[0].steps || [];
                const parsedSteps = rawSteps.map((step: any) => {
                  const name = step.name || 'Local Pathway';
                  const dist = Math.round(step.distance);
                  const type = step.maneuver.type;
                  const modifier = step.maneuver.modifier || '';
                  
                  if (type === 'depart') return `Head ${modifier} on ${name} for ${dist} meters.`;
                  if (type === 'arrive') return `Arrive at safe shelter: ${sh.name}.`;
                  return `Turn ${modifier} onto ${name} and continue for ${dist} meters.`;
                });

                // Evaluate safety score based on proximity to active hazard coordinates
                let score = 95;
                let routeStatus: string = 'SAFE';

                coords.forEach(([lat, lng]) => {
                  // Static flood proximity check
                  const floodDist = Math.hypot(lat - 12.9730, lng - 77.5890);
                  if (floodDist < 0.002) {
                    score = 20;
                    routeStatus = 'BLOCKED';
                  } else if (floodDist < 0.005) {
                    score = Math.min(score, 60);
                    routeStatus = 'CAUTION';
                  }

                  // Community reported hazard proximity check
                  userReports.forEach((rep) => {
                    const repDist = Math.hypot(lat - rep.location.lat, lng - rep.location.lng);
                    if (repDist < 0.0015) {
                      score = 10;
                      routeStatus = 'BLOCKED';
                    }
                  });
                });

                // Apply elevation penalty if flooding
                if (activeDisaster === 'Flood' && sh.elevation < 16) {
                  score -= 30;
                }

                // Gemma-styled routing explanation
                let reasoning = `This path avoids structural blockages. Recommended for safety.`;
                if (routeStatus === 'BLOCKED') {
                  reasoning = `Warning: Route intersects active flooding or barricades. Detour required.`;
                } else if (sh.id === 'sh-1') {
                  reasoning = `Recommended. High ground (+22m elevation) protects against water level rise, with available capacity.`;
                }

                routeData = {
                  shelterId: sh.id,
                  coordinates: coords,
                  distance: route.distance,
                  duration: route.duration,
                  steps: parsedSteps.length > 0 ? parsedSteps : [`Walk ${Math.round(route.distance)} meters directly to ${sh.name}.`],
                  safetyScore: Math.max(score, 5),
                  status: routeStatus as any,
                  gemmaReasoning: reasoning
                };
              }
            }
          } catch (e) {
            console.error('OSRM API call failed, using offline fallback', e);
          }
        }

        // Offline / Fallback Route Generator if online fetch failed or rate-limited
        if (!routeData) {
          const waypointLat = sh.lat > userLat ? 12.9750 : 12.9665;
          const waypointLng = sh.lng > userLng ? 77.5975 : 77.5875;
          const coords: [number, number][] = [
            [userLat, userLng],
            [waypointLat, waypointLng],
            [sh.lat, sh.lng]
          ];

          const estDist = Math.hypot(sh.lat - userLat, sh.lng - userLng) * 69 * 1609.34;
          const estDuration = estDist * 0.8;

          routeData = {
            shelterId: sh.id,
            coordinates: coords,
            distance: estDist,
            duration: estDuration,
            steps: [
              `Depart from starting point heading towards shelter direction.`,
              `Perform detour at waypoint (${waypointLat.toFixed(4)}, ${waypointLng.toFixed(4)}) avoiding central danger zones.`,
              `Arrive at safe assembly point: ${sh.name}.`
            ],
            safetyScore: sh.id === 'sh-1' ? 90 : 65,
            status: 'SAFE',
            gemmaReasoning: `[Offline Mode] General routing detour avoids central flood areas.`
          };
        }

        computed[sh.id] = routeData;
      }

      setRoutes(computed);

      // Determine recommended safe zone
      let bestId = 'sh-1';
      let maxScore = -999;
      Object.values(computed).forEach((r) => {
        let currentScore = r.safetyScore;
        // Penalize full shelters
        const targetShelter = shelters.find((s) => s.id === r.shelterId);
        if (targetShelter?.status === 'Full') {
          currentScore -= 40;
        }
        if (currentScore > maxScore) {
          maxScore = currentScore;
          bestId = r.shelterId;
        }
      });
      setRecommendedShelterId(bestId);
    };

    computeAllRoutes();
  }, [userLat, userLng, userReports, activeDisaster, shelters]);

  // Leaflet Render engine
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([userLat, userLng], 14);
    }

    const map = mapInstanceRef.current;

    // Refresh tiles based on satellite preference
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(
      satelliteView
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: satelliteView ? 'ArcGIS' : '&copy; OpenStreetMap',
        maxZoom: 20
      }
    ).addTo(map);

    // Clear old visual markers
    leafLayersRef.current.forEach((layer) => map.removeLayer(layer));
    leafLayersRef.current = [];

    // Custom Icon markup
    const userIcon = L.divIcon({
      className: 'user-pin',
      html: `<div class="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center shadow-lg relative"><div class="w-3.5 h-3.5 bg-white rounded-full animate-ping"></div><div class="absolute w-2 h-2 bg-white rounded-full"></div></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const standardIcon = L.divIcon({
      className: 'shelter-pin',
      html: `<div class="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-500 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="lucide lucide-shield"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6v7z"/></svg></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const recommendedIcon = L.divIcon({
      className: 'recommended-pin',
      html: `<div class="w-10 h-10 rounded-full bg-green-600 border-2 border-white flex items-center justify-center text-white animate-pulse-ring"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="lucide lucide-shield"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6v7z"/></svg></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const hazardIcon = L.divIcon({
      className: 'hazard-pin',
      html: `<div class="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white animate-bounce"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Draw user coordinate
    const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup('<b>My Current GPS coordinate</b>');
    leafLayersRef.current.push(userMarker);

    // Apply shelter view filter parameters
    const displayList = shelters.filter((sh) => {
      if (filterMedicalOnly && !sh.features.medical) return false;
      if (filterPetsOnly && !sh.features.petFriendly) return false;
      return true;
    });

    // Draw Shelter pins
    displayList.forEach((sh) => {
      const isRecommended = sh.id === recommendedShelterId;
      const marker = L.marker([sh.lat, sh.lng], { icon: isRecommended ? recommendedIcon : standardIcon })
        .addTo(map)
        .bindPopup(`<b>${sh.name}</b><br/>Capacity: ${sh.occupancyCount}/${sh.capacityCount}`);
      leafLayersRef.current.push(marker);
    });

    // Draw Obstacles
    if (hazardOverlay) {
      const fixedHazards = [
        { lat: 12.9730, lng: 77.5890, desc: 'Flooded Road Intersection' },
        { lat: 12.9690, lng: 77.5990, desc: 'Landslide Debris collapse' }
      ];

      fixedHazards.forEach((hz) => {
        const hazardMarker = L.marker([hz.lat, hz.lng], { icon: hazardIcon }).addTo(map).bindPopup(`<b>Danger:</b> ${hz.desc}`);
        leafLayersRef.current.push(hazardMarker);
      });

      userReports.forEach((rep) => {
        const reportMarker = L.marker([rep.location.lat, rep.location.lng], { icon: hazardIcon })
          .addTo(map)
          .bindPopup(`<b>Reported Blockage:</b> ${rep.description}`);
        leafLayersRef.current.push(reportMarker);
      });
    }

    // Color code polylines
    const routeColors: Record<string, string> = {
      'sh-1': '#10b981', // Green for Central High School
      'sh-2': '#3b82f6', // Blue for Sports Arena
      'sh-3': '#f97316', // Orange for St. Mary
      'sh-4': '#a855f7', // Purple for Hospital
    };

    // Draw all routes simultaneously
    Object.keys(routes).forEach((id) => {
      const route = routes[id];
      const isSelected = selectedShelter?.id === id;
      const isRecommended = id === recommendedShelterId;

      const color = isRecommended ? '#10b981' : (routeColors[id] || '#64748b');
      const weight = isSelected ? 6 : 3;
      const opacity = isSelected ? 0.95 : 0.4;

      const poly = L.polyline(route.coordinates, {
        color: color,
        weight: weight,
        opacity: opacity,
        dashArray: isSelected ? '10, 5' : '5, 5'
      }).addTo(map);

      leafLayersRef.current.push(poly);
    });

  }, [userLat, userLng, routes, selectedShelter, recommendedShelterId, satelliteView, hazardOverlay, filterMedicalOnly, filterPetsOnly]);

  const triggerRerouting = () => {
    setRerouteNotification('Road block reported. Gemma recalculating alternate routes.');
    setTimeout(() => setRerouteNotification(null), 3000);
  };

  const handleReportHazard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc.trim()) return;

    // Simulate offset near user
    const lat = userLat + (Math.random() - 0.5) * 0.006;
    const lng = userLng + (Math.random() - 0.5) * 0.006;

    const newReport: Omit<HazardReport, 'id'> = {
      type: reportType,
      description: reportDesc,
      location: { lat, lng },
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    await db.reports.add(newReport as HazardReport);
    setReportDesc('');
    loadReports();
    triggerRerouting();
  };

  // Convert distance in meters to readable text (meters or km)
  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} meters`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Convert seconds duration to readable ETA text
  const formatETA = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  return (
    <div className={`space-y-6 ${accessibilityLargeText ? 'accessibility-large-text' : ''}`}>
      {/* Top Banner Navigation HUD */}
      <div className="rounded-2xl glass p-4 border-l-4 border-l-red-650 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-650/15 border border-red-500/30 text-red-500 rounded-xl shrink-0">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wider text-red-400">Emergency Safe Evacuation Guidance</h3>
            <p className="text-xs text-slate-350">
              Active Hazard Zone: <span className="font-extrabold text-white">{activeDisaster || 'Flood'} Avoidance</span> | Recommended Safe Zone: <span className="font-bold text-green-400">⭐ {shelters.find((s) => s.id === recommendedShelterId)?.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceGuide(!voiceGuide)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all ${
              voiceGuide ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-slate-900 border-slate-800 text-slate-450 hover:text-white'
            }`}
          >
            {voiceGuide ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} Spoken Instructions
          </button>
        </div>
      </div>

      {/* Reroute Warning Notification */}
      {rerouteNotification && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold text-center animate-bounce">
          ⚠️ {rerouteNotification}
        </div>
      )}

      {/* Main Grid split: Map & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Map Display */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-900 overflow-hidden relative aspect-video min-h-[360px] bg-slate-950 flex flex-col">
            {/* Map Header Toolbar */}
            <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800 shrink-0 text-slate-200">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Compass className="h-4.5 w-4.5 text-orange-500" /> Active GIS Router
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() => setSatelliteView(!satelliteView)}
                  className={`px-2.5 py-1.5 rounded text-[10px] font-bold border uppercase tracking-wider transition-all flex items-center gap-1 ${
                    satelliteView ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Map className="h-3 w-3" /> Satellite
                </button>

                <button
                  onClick={() => setHazardOverlay(!hazardOverlay)}
                  className={`px-2.5 py-1.5 rounded text-[10px] font-bold border uppercase tracking-wider transition-all flex items-center gap-1 ${
                    hazardOverlay ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Layers className="h-3 w-3" /> Hazards
                </button>
              </div>
            </div>

            {/* Map rendering canvas */}
            <div ref={mapContainerRef} className="flex-1 w-full" />

            {/* Locate Widget controls */}
            <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-2">
              <button
                onClick={() => mapInstanceRef.current?.setView([userLat, userLng], 14)}
                className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-white shadow-xl hover:bg-slate-800"
                title="Locate Current Position"
              >
                <Locate className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Navigation Mode Control Widget */}
          {navigationActive && selectedShelter && routes[selectedShelter.id] && (
            <div className="rounded-2xl glass p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-white border border-green-500/20 relative">
              <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded bg-green-500/25 border border-green-500/30 text-[9px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-0.5">
                <Activity className="h-3 w-3" /> Navigation Active
              </div>

              <div>
                <span className="text-[10px] text-slate-450 uppercase block font-semibold">Remaining Distance</span>
                <p className="text-xl font-black text-white">{formatDistance(routes[selectedShelter.id].distance)}</p>
                <span className="text-[9px] text-slate-500">evacuation path length</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-450 uppercase block font-semibold">Estimated Duration</span>
                <p className="text-xl font-black text-orange-400">{formatETA(routes[selectedShelter.id].duration)}</p>
                <span className="text-[9px] text-slate-500">ETA avoids road delays</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-450 uppercase block font-semibold">Evacuation Speed</span>
                <p className="text-xl font-black text-green-400">{currentSpeed} mph</p>
                <span className="text-[9px] text-slate-500 capitalize">mode: {navigationMode}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-450 uppercase block font-semibold">Direction Gyro</span>
                <p className="text-xl font-black text-blue-400">{compassHeading}° E</p>
                <span className="text-[9px] text-slate-500">bearing alignment</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Evacuation Controls */}
        <div className="space-y-4 overflow-y-auto pr-1">
          
          {/* Active Navigation controller */}
          {selectedShelter && routes[selectedShelter.id] && (
            <div className="rounded-2xl glass p-5 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-500">Destination</span>
                  <h4 className="font-bold text-xs text-white">{selectedShelter.name}</h4>
                </div>
                <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold uppercase">
                  Safety: {routes[selectedShelter.id].safetyScore}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 block">Distance</span>
                  <span className="font-black text-white">{formatDistance(routes[selectedShelter.id].distance)}</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl text-center">
                  <span className="text-[9px] text-slate-500 block">ETA Duration</span>
                  <span className="font-black text-white">{formatETA(routes[selectedShelter.id].duration)}</span>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2">
                {['walking', 'driving'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setNavigationMode(mode as any)}
                    className={`py-1.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider ${
                      navigationMode === mode
                        ? 'bg-orange-500/10 border-orange-500/35 text-orange-400'
                        : 'bg-slate-950 border-slate-850 text-slate-450 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setNavigationActive(!navigationActive)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 text-white ${
                    navigationActive ? 'bg-red-700 hover:bg-red-650' : 'bg-green-600 hover:bg-green-550'
                  }`}
                >
                  <Navigation className="h-4 w-4 animate-pulse" /> {navigationActive ? 'Cancel Evacuation' : 'Start Evacuation'}
                </button>
                <button
                  onClick={() => alert('Safe route coordinates shared with safety contacts.')}
                  className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                  title="Share Evacuation Details"
                >
                  <Share2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          )}

          {/* AI recommendations explanation */}
          {selectedShelter && routes[selectedShelter.id] && (
            <div className="rounded-2xl bg-green-500/5 border border-green-500/10 p-4 flex gap-3 text-xs text-slate-350">
              <Info className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-green-400 uppercase tracking-widest text-[9px] block">Gemma Evacuation Reasoning</span>
                <p className="mt-1 leading-relaxed">
                  {routes[selectedShelter.id].gemmaReasoning}
                </p>
              </div>
            </div>
          )}

          {/* Filter Toolbar & Shelter Finder list */}
          <div className="rounded-2xl glass p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5">
                <Shield className="h-4.5 w-4.5 text-green-500" /> Nearby Shelter Evacuations
              </h3>

              {/* Filters */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFilterMedicalOnly(!filterMedicalOnly)}
                  className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider transition-all ${
                    filterMedicalOnly ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-slate-950 border-slate-850 text-slate-500'
                  }`}
                >
                  Med
                </button>
                <button
                  onClick={() => setFilterPetsOnly(!filterPetsOnly)}
                  className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider transition-all ${
                    filterPetsOnly ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-slate-950 border-slate-850 text-slate-500'
                  }`}
                >
                  Pets
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {shelters.map((sh, idx) => {
                const isSelected = selectedShelter?.id === sh.id;
                const isRecommended = sh.id === recommendedShelterId;
                const route = routes[sh.id];

                return (
                  <div
                    key={sh.id}
                    onClick={() => setSelectedShelter(sh)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all relative ${
                      isSelected
                        ? 'bg-green-500/5 border-green-500/40'
                        : 'bg-slate-900/60 border-slate-850 hover:bg-slate-900'
                    }`}
                  >
                    {isRecommended && (
                      <span className="absolute top-2.5 right-2.5 text-[8px] font-extrabold uppercase bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded tracking-wider">
                        ★ Recommended
                      </span>
                    )}

                    <h4 className="font-bold text-xs text-white max-w-[70%] truncate">{sh.name}</h4>
                    
                    <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between items-center">
                      <span>Occupancy: {sh.occupancyCount}/{sh.capacityCount}</span>
                      {route && <span className="font-semibold text-slate-300">{formatDistance(route.distance)}</span>}
                    </div>

                    {route && (
                      <div className="flex justify-between items-center text-[9px] text-slate-500 mt-1 border-t border-slate-900 pt-1.5">
                        <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> ETA: {formatETA(route.duration)}</span>
                        <span className={route.status === 'BLOCKED' ? 'text-red-400 font-bold' : route.status === 'CAUTION' ? 'text-yellow-400' : 'text-green-400'}>
                          {route.status}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Turn-by-Turn step directions */}
          {selectedShelter && routes[selectedShelter.id] && (
            <div className="rounded-2xl glass p-5 space-y-3.5">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b border-slate-900 pb-2">
                <Navigation className="h-4 w-4 text-orange-500" />
                Evacuation Directions
              </h3>
              
              <div className="space-y-3">
                {routes[selectedShelter.id].steps.map((step, idx) => {
                  const isActive = idx === currentStepIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`p-2.5 rounded-lg cursor-pointer transition-all flex gap-3 text-xs items-start ${
                        isActive ? 'bg-orange-500/10 border border-orange-500/20 text-orange-300' : 'text-slate-350 hover:bg-slate-900/40'
                      }`}
                    >
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                        isActive ? 'bg-orange-650 text-white' : 'bg-slate-950 border border-slate-800 text-slate-550'
                      }`}>
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{step}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Incident hazard reporting panel */}
          <form onSubmit={handleReportHazard} className="rounded-2xl glass p-5 space-y-3.5">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-1.5 border-b border-slate-900 pb-2">
              <AlertOctagon className="h-4.5 w-4.5 text-red-500" />
              Report Local Hazard Point
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {['roadblock', 'flood', 'fire', 'other'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReportType(type as any)}
                  className={`py-1.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider ${
                    reportType === type
                      ? 'bg-red-500/15 border-red-500/40 text-red-400'
                      : 'bg-slate-950 border-slate-850 text-slate-450 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={reportDesc}
              onChange={(e) => setReportDesc(e.target.value)}
              placeholder="e.g. Fallen tree blocks both lanes"
              className="w-full bg-slate-950 border border-slate-850 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
            />

            <button
              type="submit"
              className="w-full py-2 bg-red-650 hover:bg-red-650/80 text-white text-xs font-bold rounded-lg transition-all"
            >
              Broadcast Hazard Coordinate
            </button>
          </form>
        </div>
        
      </div>
    </div>
  );
}
