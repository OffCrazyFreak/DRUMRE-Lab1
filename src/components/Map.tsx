"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { GeocodedStore } from "@/types/store";
import {
  createMarkerIcon,
  createPulsingDot,
  addStoreMarkerLayers,
  addStoreClickHandlers,
} from "@/lib/map/utils";

interface MapProps {
  stores: GeocodedStore[];
  center?: [number, number];
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onCenterChange?: (center: [number, number]) => void;
}

export default function Map({
  stores,
  center,
  zoom = 6,
  onZoomChange,
  onCenterChange,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!mapContainer.current || initialized.current) return;

    const initialCenter: [number, number] = center || [14.7978, 45.4039];
    const initialZoom = center ? zoom : 6;

    // Create map instance
    const mapInstance = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: initialCenter,
      zoom: initialZoom,
    });

    map.current = mapInstance;

    // Add navigation controls
    mapInstance.addControl(new maplibregl.NavigationControl(), "top-right");

    // Add event listeners
    if (onZoomChange) {
      mapInstance.on("zoomend", () => onZoomChange(mapInstance.getZoom()));
    }
    if (onCenterChange) {
      mapInstance.on("moveend", () => {
        const center = mapInstance.getCenter();
        onCenterChange([center.lng, center.lat]);
      });
    }

    // Setup map on load
    mapInstance.on("load", () => {
      initialized.current = true;

      // Get user location
      if (navigator.geolocation && !center) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords: [number, number] = [
              position.coords.longitude,
              position.coords.latitude,
            ];

            // Add pulsating dot for user location
            const pulsingDot = createPulsingDot(mapInstance);
            mapInstance.addImage("pulsing-dot", pulsingDot, { pixelRatio: 2 });

            mapInstance.addSource("user-location", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: coords },
                    properties: {},
                  },
                ],
              },
            });

            mapInstance.addLayer({
              id: "user-location-layer",
              type: "symbol",
              source: "user-location",
              layout: {
                "icon-image": "pulsing-dot",
                "icon-allow-overlap": true,
              },
            });

            // Fly to user location
            mapInstance.flyTo({ center: coords, zoom: 13 });
          },
          (error) => console.log("Geolocation error:", error),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }

      // Add store marker icon
      const markerIcon = createMarkerIcon();
      const img = new Image(24, 24);
      img.onload = () => {
        mapInstance.addImage("store-marker", img);
      };
      img.src = markerIcon;

      // Add stores source
      mapInstance.addSource("stores", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 20,
      });

      // Add store layers and handlers
      addStoreMarkerLayers(mapInstance);
      addStoreClickHandlers(mapInstance);
    });

    return () => {
      mapInstance.remove();
    };
  }, []);

  // Update stores data
  useEffect(() => {
    if (!map.current || !initialized.current) return;

    const mapInstance = map.current;
    const source = mapInstance.getSource("stores") as maplibregl.GeoJSONSource;

    if (!source) return;

    const features: GeoJSON.Feature[] = stores.map((store) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [store.lon, store.lat],
      },
      properties: {
        chain_code: store.chain_code,
        code: store.code,
        type: store.type,
        address: store.address,
        city: store.city,
        zipcode: store.zipcode,
        original_lon: store.lon,
        original_lat: store.lat,
      },
    }));

    // Group features by exact coordinates and add jitter for overlapping points
    const coordGroups: { [key: string]: GeoJSON.Feature<GeoJSON.Point>[] } = {};
    features.forEach((feature) => {
      const coords = (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number
      ];
      const key = `${coords[0]},${coords[1]}`;
      if (!coordGroups[key]) {
        coordGroups[key] = [];
      }
      coordGroups[key].push(feature as GeoJSON.Feature<GeoJSON.Point>);
    });

    // Apply jitter to overlapping points
    Object.values(coordGroups).forEach((group) => {
      if (group.length > 1) {
        // Convert degrees to approximate meters for small offsets
        // ~111,000 meters per degree latitude, ~111,000 * cos(lat) per degree longitude
        const baseLat = (group[0].geometry.coordinates as [number, number])[1];
        const metersPerDegreeLat = 111000;
        const metersPerDegreeLon = 111000 * Math.cos((baseLat * Math.PI) / 180);

        // Maximum jitter distance in meters (adjust as needed)
        const maxJitterMeters = 10;

        group.forEach((feature, index) => {
          if (index > 0) {
            // Don't jitter the first point
            // Use deterministic jitter based on store properties for consistency
            const props = feature.properties as any;
            const seed = `${props.chain_code}-${props.code}`
              .split("")
              .reduce((a, b) => {
                a = (a << 5) - a + b.charCodeAt(0);
                return a & a;
              }, 0);

            // Simple seeded random function
            const seededRandom = (seed: number) => {
              const x = Math.sin(seed) * 10000;
              return x - Math.floor(x);
            };

            // Generate deterministic angle and distance
            const angle = seededRandom(seed) * 2 * Math.PI;
            const distance = seededRandom(seed + 1) * maxJitterMeters;

            // Convert back to degrees
            const deltaLat = (distance * Math.sin(angle)) / metersPerDegreeLat;
            const deltaLon = (distance * Math.cos(angle)) / metersPerDegreeLon;

            const coords = feature.geometry.coordinates as [number, number];
            coords[0] += deltaLon;
            coords[1] += deltaLat;
          }
        });
      }
    });

    source.setData({
      type: "FeatureCollection",
      features: features,
    });
  }, [stores]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full min-h-[500px] rounded-lg overflow-hidden border border-gray-200"
    />
  );
}
