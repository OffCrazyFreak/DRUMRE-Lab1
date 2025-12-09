"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { GeocodedStore } from "@/types/store";

interface OptimizedMapComponentProps {
  stores: GeocodedStore[];
  center?: [number, number];
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onCenterChange?: (center: [number, number]) => void;
}

// Create a custom marker icon as base64 data URL
function createMarkerIcon(): string {
  const canvas = document.createElement("canvas");
  const size = 24;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Draw circle with magenta fill
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 5, 0, Math.PI * 2);
  ctx.fillStyle = "magenta";
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  return canvas.toDataURL();
}

export default function OptimizedMapComponent({
  stores,
  center,
  zoom = 6,
  onZoomChange,
  onCenterChange,
}: OptimizedMapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersLoaded = useRef(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Get user location
    let initialCenter: [number, number] = center || [14.7978, 45.4039];
    let initialZoom = center ? zoom : 6;

    if (navigator.geolocation && !center) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (map.current) {
            map.current.flyTo({
              center: [position.coords.longitude, position.coords.latitude],
              zoom: 13,
            });
          }
        },
        (error) => console.log("Geolocation error:", error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: initialCenter,
      zoom: initialZoom,
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

    map.current.on("load", () => {
      if (!map.current) return;

      // Add marker image
      const markerIcon = createMarkerIcon();
      const img = new Image(24, 24);
      img.onload = () => {
        if (map.current && !markersLoaded.current) {
          map.current.addImage("store-marker", img);
          markersLoaded.current = true;
        }
      };
      img.src = markerIcon;

      // Add empty GeoJSON source for stores
      map.current.addSource("stores", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Add layer for clusters
      map.current.addLayer({
        id: "clusters",
        type: "circle",
        source: "stores",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#51bbd6",
            10,
            "#f1f075",
            30,
            "#f28cb1",
          ],
          "circle-radius": ["step", ["get", "point_count"], 15, 10, 20, 30, 25],
        },
      });

      // Add layer for cluster count labels
      map.current.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "stores",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      // Add layer for individual stores
      map.current.addLayer({
        id: "unclustered-point",
        type: "symbol",
        source: "stores",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": "store-marker",
          "icon-size": 1,
          "icon-allow-overlap": false,
        },
      });

      // Add click handler for clusters
      map.current.on("click", "clusters", async (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        if (!features.length || !map.current) return;

        const clusterId = features[0].properties?.cluster_id;
        if (clusterId == null) return;

        const source = map.current.getSource(
          "stores"
        ) as maplibregl.GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);

        map.current.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom: zoom,
        });
      });

      // Add click handler for individual stores
      map.current.on("click", "unclustered-point", (e) => {
        const coordinates = (
          e.features![0].geometry as any
        ).coordinates.slice();
        const props = e.features![0].properties;

        new maplibregl.Popup()
          .setLngLat(coordinates)
          .setHTML(
            `
            <div style="padding: 8px;">
              <h3 style="font-weight: bold; margin-bottom: 4px;">${props.chain_code.toUpperCase()} - ${
              props.code
            }</h3>
              <p style="margin: 0; font-size: 14px;">${props.type}</p>
              <p style="margin: 0; font-size: 14px;">${props.address}</p>
              <p style="margin: 0; font-size: 14px; color: #666;">${
                props.city
              }, ${props.zipcode}</p>
            </div>
          `
          )
          .addTo(map.current!);
      });

      // Change cursor on hover
      map.current.on("mouseenter", "clusters", () => {
        map.current!.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "clusters", () => {
        map.current!.getCanvas().style.cursor = "";
      });
      map.current.on("mouseenter", "unclustered-point", () => {
        map.current!.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", "unclustered-point", () => {
        map.current!.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [center, zoom]);

  // Update stores when data changes
  useEffect(() => {
    if (!map.current || !markersLoaded.current) return;

    const source = map.current.getSource("stores") as maplibregl.GeoJSONSource;
    if (!source) return;

    // Convert stores to GeoJSON features
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
