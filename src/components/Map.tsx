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
    initialized.current = true;

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
        clusterRadius: 50,
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
      },
    }));

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
