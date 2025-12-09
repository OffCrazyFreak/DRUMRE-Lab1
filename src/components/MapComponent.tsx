"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { GeocodedStore } from "@/types/store";

interface MapComponentProps {
  stores: GeocodedStore[];
  center?: [number, number];
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onCenterChange?: (center: [number, number]) => void;
}

export default function MapComponent({
  stores,
  center,
  zoom = 6,
  onZoomChange,
  onCenterChange,
}: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const userLocationMarker = useRef<maplibregl.Marker | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    14.7978, 45.4039,
  ]); // Delnice, Croatia
  const [mapZoom, setMapZoom] = useState<number>(zoom);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          setUserLocation(userCoords);
          setMapCenter(userCoords);
          setMapZoom(13); // Zoom in when user location is available
        },
        (error) => {
          console.log("Geolocation error:", error);
          setMapZoom(6); // Keep default zoom when no location
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setMapZoom(6); // Keep default zoom when geolocation not supported
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: center || mapCenter,
      zoom: center ? zoom : mapZoom,
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    // Add event listeners for zoom and center changes
    if (onZoomChange) {
      map.current.on("zoomend", () => {
        onZoomChange(map.current!.getZoom());
      });
    }
    if (onCenterChange) {
      map.current.on("moveend", () => {
        const center = map.current!.getCenter();
        onCenterChange([center.lng, center.lat]);
      });
    }

    // Add user location marker if available
    if (userLocation) {
      // Create pulsating circle effect
      const pulsingDot = {
        width: 100,
        height: 100,
        data: new Uint8Array(100 * 100 * 4),
        context: null as CanvasRenderingContext2D | null,

        onAdd: function (this: any) {
          const canvas = document.createElement("canvas");
          canvas.width = this.width;
          canvas.height = this.height;
          this.context = canvas.getContext("2d");
        },

        render: function (this: any) {
          const duration = 1000;
          const t = (performance.now() % duration) / duration;

          const radius = (size: number) =>
            size * Math.sqrt(0.5 - Math.pow(t - 0.5, 2));
          const outerRadius = radius(25);
          const innerRadius = radius(15);

          const context = this.context;
          if (!context) return false;

          context.clearRect(0, 0, this.width, this.height);

          // Outer circle
          context.beginPath();
          context.arc(
            this.width / 2,
            this.height / 2,
            outerRadius,
            0,
            Math.PI * 2
          );
          context.fillStyle = "rgba(0, 123, 255, " + (1 - t) + ")";
          context.fill();

          // Inner circle
          context.beginPath();
          context.arc(
            this.width / 2,
            this.height / 2,
            innerRadius,
            0,
            Math.PI * 2
          );
          context.fillStyle = "rgba(0, 123, 255, 0.8)";
          context.fill();

          this.data = context.getImageData(0, 0, this.width, this.height).data;

          map.current?.triggerRepaint();
          return true;
        },
      };

      map.current.on("load", () => {
        map.current?.addImage("pulsing-dot", pulsingDot, { pixelRatio: 2 });

        map.current?.addSource("user-location", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: userLocation,
                },
                properties: {},
              },
            ],
          },
        });

        map.current?.addLayer({
          id: "user-location-layer",
          type: "symbol",
          source: "user-location",
          layout: {
            "icon-image": "pulsing-dot",
            "icon-allow-overlap": true,
          },
        });
      });
    }

    return () => {
      map.current?.remove();
    };
  }, [center, mapCenter, mapZoom, userLocation]);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add markers for each store
    stores.forEach((store) => {
      if (store.lat && store.lon) {
        // Create a custom marker element
        const el = document.createElement("div");
        el.className = "store-marker";
        el.style.width = "30px";
        el.style.height = "30px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = "#ef4444";
        el.style.border = "2px solid white";
        el.style.cursor = "pointer";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

        // Create popup
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${store.chain_code.toUpperCase()} - ${
          store.code
        }</h3>
            <p style="margin: 0; font-size: 14px;">${store.type}</p>
            <p style="margin: 0; font-size: 14px;">${store.address}</p>
            <p style="margin: 0; font-size: 14px; color: #666;">${
              store.city
            }, ${store.zipcode}</p>
          </div>
        `);

        // Create and add marker
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([store.lon, store.lat])
          .setPopup(popup)
          .addTo(map.current!);

        markers.current.push(marker);
      }
    });
  }, [stores]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full min-h-[500px] rounded-lg overflow-hidden border border-gray-200"
    />
  );
}
